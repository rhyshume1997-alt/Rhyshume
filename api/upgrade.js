'use strict';

/*
  POST /api/upgrade
  The "Upgrade my site" form (/upgrade). Checks the request, then saves it as a row in Rhys's Google Sheet
  through the Apps Script web app in tools/upgrade-sheet.gs. Nothing is built here: Rhys ticks Approve in the Sheet first.

  Environment variables (Vercel, Project Settings, Environment Variables):
    TURNSTILE_SECRET_KEY   required  the same Turnstile secret the contact form uses. Fails closed without it.
    UPGRADE_SHEET_URL      required  the Apps Script web app URL (ends in /exec)
    UPGRADE_SHEET_SECRET   required  a long random string, the same one saved as SHARED_SECRET in the Apps Script

  Order of checks: rate limit per IP, honeypot, Turnstile, website and email rules, then the Sheet,
  which enforces one request per email, one per website and a daily total.
*/

const antispam = require('./_lib/antispam');

const PAGE = '/upgrade';
const TURNSTILE_ACTION = 'upgrade';
const TURNSTILE_HOSTNAMES = ['rhyshume.co.uk', 'www.rhyshume.co.uk'];
const MAX_BODY_BYTES = 16 * 1024;

const SENT = '?sent=1#sent';
const NOT_SENT = '?error=1#not-sent';
const CHECK_FAILED = '?error=1#check-failed';
const ALREADY = '?error=1#already';
const MISMATCH = '?error=1#email-mismatch';

// Free and personal mail providers. The email has to be on the firm's own domain.
const FREE_MAIL = /^(gmail|googlemail|hotmail|outlook|live|msn|yahoo|ymail|aol|icloud|me|mac|proton|protonmail|pm|gmx|mail|btinternet|btopenworld|sky|talktalk|virginmedia|ntlworld|blueyonder|tiscali|zoho|yandex)\./i;

// Per IP, in memory. Slows a script hammering one warm instance. The real limits live in the Sheet.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 3;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(function (t) { return now - t < RATE_WINDOW_MS; });
  if (recent.length >= RATE_MAX) { hits.set(ip, recent); return true; }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 2000) hits.clear();
  return false;
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function wantsJson(req) {
  return String(req.headers.accept || '').indexOf('application/json') !== -1;
}

function send(req, res, status, body, redirectTo) {
  if (!wantsJson(req) && redirectTo) {
    res.statusCode = 303;
    res.setHeader('Location', redirectTo);
    res.setHeader('Cache-Control', 'no-store');
    res.end();
    return;
  }
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function oneLine(value, max) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

function toFields(text) {
  const fields = {};
  new URLSearchParams(text).forEach(function (value, key) { if (!(key in fields)) fields[key] = value; });
  return fields;
}

function readBody(req) {
  let parsed;
  try { parsed = req.body; } catch (e) { parsed = undefined; }
  if (parsed && typeof parsed === 'object' && !Buffer.isBuffer(parsed)) return Promise.resolve(parsed);
  if (typeof parsed === 'string' || Buffer.isBuffer(parsed)) return Promise.resolve(toFields(String(parsed)));
  return new Promise(function (resolve, reject) {
    const chunks = [];
    let size = 0;
    let done = false;
    req.on('data', function (d) {
      if (done) return;
      size += d.length;
      if (size > MAX_BODY_BYTES) { done = true; reject({ status: 413 }); return; }
      chunks.push(d);
    });
    req.on('end', function () { if (!done) { done = true; resolve(toFields(Buffer.concat(chunks).toString('utf8'))); } });
    req.on('error', function () { if (!done) { done = true; reject({ status: 400 }); } });
  });
}

// Turns what they typed into https://host/ for a real public domain, or null.
// No IP addresses, no localhost or internal names, no ports, no logins in the address.
function cleanWebsite(raw) {
  let text = oneLine(raw, 300);
  if (!text) return null;
  if (!/^https?:\/\//i.test(text)) text = 'https://' + text;
  let u;
  try { u = new URL(text); } catch (e) { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (u.username || u.password || u.port) return null;
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  if (!/^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(host)) return null;
  if (/(^|\.)(localhost|local|internal|lan|home|test|example|invalid)$/.test(host)) return null;
  return { url: 'https://' + host + '/', host: host, domain: host.replace(/^www\./, '') };
}

// The email domain must be the website's domain, or the website must be on a subdomain of it, or the other way round.
function emailMatches(email, domain) {
  const at = email.lastIndexOf('@');
  if (at < 1) return false;
  const ed = email.slice(at + 1).toLowerCase().replace(/^www\./, '');
  if (FREE_MAIL.test(ed)) return false;
  return ed === domain || domain.endsWith('.' + ed) || ed.endsWith('.' + domain);
}

async function saveToSheet(row) {
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, 10000);
  try {
    // Apps Script answers a POST with a redirect to the result, which fetch follows.
    const res = await fetch(process.env.UPGRADE_SHEET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ secret: process.env.UPGRADE_SHEET_SECRET }, row)),
      redirect: 'follow',
      signal: controller.signal
    });
    if (!res.ok) return { ok: false, reason: 'sheet_http_' + res.status };
    const data = await res.json();
    return data && typeof data === 'object' ? data : { ok: false, reason: 'sheet_bad_reply' };
  } catch (e) {
    return { ok: false, reason: 'sheet_unreachable' };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(req, res, 405, { ok: false }, PAGE);
  }

  const ip = clientIp(req);
  if (rateLimited(ip)) return send(req, res, 429, { ok: false, error: 'too_many' }, PAGE + ALREADY);

  let fields;
  try {
    if (String(req.headers['content-type'] || '').indexOf('application/x-www-form-urlencoded') === -1) throw { status: 415 };
    fields = await readBody(req);
  } catch (err) {
    return send(req, res, (err && err.status) || 400, { ok: false }, PAGE + NOT_SENT);
  }

  // Honeypot: bots that fill the hidden field see success and nothing is saved.
  if (oneLine(fields.company_website, 200)) return send(req, res, 200, { ok: true }, PAGE + SENT);

  const check = await antispam.verifyTurnstile({
    secret: process.env.TURNSTILE_SECRET_KEY,
    token: fields['cf-turnstile-response'],
    ip: ip,
    expectedAction: TURNSTILE_ACTION,
    allowedHostnames: TURNSTILE_HOSTNAMES
  });
  if (!check.ok) {
    if (check.reason === 'not_configured') console.error('upgrade: missing env var(s): TURNSTILE_SECRET_KEY');
    else console.warn('upgrade: security check refused, reason ' + check.reason);
    const down = check.reason === 'not_configured' || check.reason === 'unavailable';
    return send(req, res, down ? 503 : 403, { ok: false, error: 'check_failed' }, PAGE + CHECK_FAILED);
  }

  const site = cleanWebsite(fields.website);
  const email = oneLine(fields.email, 200).toLowerCase();
  if (!site || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return send(req, res, 400, { ok: false, error: 'bad_fields' }, PAGE + NOT_SENT);
  }
  if (!emailMatches(email, site.domain)) {
    return send(req, res, 400, { ok: false, error: 'email_mismatch' }, PAGE + MISMATCH);
  }

  const missing = ['UPGRADE_SHEET_URL', 'UPGRADE_SHEET_SECRET'].filter(function (n) { return !process.env[n]; });
  if (missing.length) {
    console.error('upgrade: missing env var(s): ' + missing.join(', ')); // names only, never values
    return send(req, res, 500, { ok: false }, PAGE + NOT_SENT);
  }

  const saved = await saveToSheet({
    website: site.url,
    domain: site.domain,
    email: email,
    marketing: fields.marketing === 'yes' ? 'yes' : 'no'
  });
  if (saved.ok) {
    console.log('upgrade: request saved for ' + site.domain);
    return send(req, res, 200, { ok: true }, PAGE + SENT);
  }
  if (saved.reason === 'duplicate' || saved.reason === 'daily_limit') {
    return send(req, res, 429, { ok: false, error: saved.reason }, PAGE + ALREADY);
  }
  console.error('upgrade: the Sheet refused or could not be reached, reason ' + saved.reason);
  return send(req, res, 502, { ok: false }, PAGE + NOT_SENT);
};

module.exports.cleanWebsite = cleanWebsite;
module.exports.emailMatches = emailMatches;
