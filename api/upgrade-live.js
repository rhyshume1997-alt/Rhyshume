'use strict';

/*
  POST /api/upgrade-live
  The instant "Upgrade my site" button on /upgrade. A prospect types their website address, and this builds
  the concept right there and sends it back as JSON, so the page can show it in front of them.

  What it does, in order:
    1. Checks the request (rate limit per visitor, honeypot, Turnstile, a clean public website address).
    2. Asks the Google Sheet (tools/upgrade-sheet.gs) for permission: one build per website, a few per
       visitor per day and a daily total. If the Sheet cannot be reached or says no, nothing is built
       and no API money is spent.
    3. Reads their site (public pages only, every address and every redirect checked), asks Claude to write
       the new copy with the same engine and checks as the Build preview Action (tools/preview.js), and
       returns the page. No screenshots or Lighthouse here, so the before and after is the list of changes.
    4. Tells the Sheet how it went.

  Environment variables (Vercel, Project Settings, Environment Variables):
    ANTHROPIC_API_KEY      required  the key for the capped "previews" workspace
    TURNSTILE_SECRET_KEY   required  the same Turnstile secret the contact form uses
    UPGRADE_SHEET_URL      required  the Apps Script web app URL (ends in /exec)
    UPGRADE_SHEET_SECRET   required  the same long random string as SHARED_SECRET in the Apps Script
    UPGRADE_LIVE_OFF       optional  set to 1 to switch the instant button off at once
    ANTHROPIC_MODEL        optional  defaults to the same model as the Build preview Action
*/

const crypto = require('node:crypto');
const dns = require('node:dns').promises;
let lookup = function (host, opts) { return dns.lookup(host, opts); }; // swapped in tests, so they need no network
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const antispam = require('./_lib/antispam');
const upgrade = require('./upgrade');
const preview = require('../tools/preview');
const rich = require('../tools/concept-rich');

const TURNSTILE_ACTION = 'upgrade';
const TURNSTILE_HOSTNAMES = ['rhyshume.co.uk', 'www.rhyshume.co.uk'];
const MAX_BODY_BYTES = 16 * 1024;
const BUDGET_MS = 100 * 1000;        // the whole build, start to finish
const SITE_FETCH_MS = 10 * 1000;     // each page or stylesheet of their site
const MAX_REDIRECTS = 4;
const ANTHROPIC_HOST = 'api.anthropic.com';

// Per visitor, in memory. Slows a script hammering one warm instance. The real limits live in the Sheet.
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

// A one way fingerprint of the visitor, so the Sheet can count builds per visitor without storing the address.
function visitorId(ip) {
  const salt = process.env.UPGRADE_SHEET_SECRET || '';
  return crypto.createHash('sha256').update(salt + '|' + ip).digest('hex').slice(0, 16);
}

function json(res, status, body) {
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

// ---------------------------------------------------------------- safe fetching of the prospect's site

const BLOCKED = new net.BlockList();
[
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4]
].forEach(function (r) { BLOCKED.addSubnet(r[0], r[1], 'ipv4'); });
[['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8], ['64:ff9b::', 96], ['2001:db8::', 32]].forEach(function (r) { BLOCKED.addSubnet(r[0], r[1], 'ipv6'); });

function ipIsPublic(address) {
  let a = address;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(a); // IPv4 inside IPv6
  if (mapped) a = mapped[1];
  const family = net.isIP(a);
  if (!family) return false;
  return !BLOCKED.check(a, family === 4 ? 'ipv4' : 'ipv6');
}

async function assertHostIsPublic(url) {
  const u = new URL(url);
  if (!/^https?:$/.test(u.protocol)) throw new Error('Only http and https addresses are allowed.');
  if (u.username || u.password) throw new Error('Addresses with a login in them are not allowed.');
  if (u.port && u.port !== '80' && u.port !== '443') throw new Error('Only the normal web ports are allowed.');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host)) {
    if (!ipIsPublic(host)) throw new Error('That address is not a public website.');
    return;
  }
  let found;
  try { found = await lookup(host, { all: true }); } catch (e) { throw new Error('That address does not exist.'); }
  if (!found.length || !found.every(function (f) { return ipIsPublic(f.address); })) throw new Error('That address is not a public website.');
}

// A fetch for the engine to use. Their site: every hop's host is checked, redirects are followed by hand,
// each request has its own time limit and the whole build has a deadline. Anthropic: straight through, same deadline.
function makeFetch(deadline, realFetch) {
  const doFetch = realFetch || fetch;
  return async function safeFetch(url, init) {
    init = init || {};
    const remaining = deadline - Date.now();
    if (remaining < 2000) throw new Error('The build ran out of time.');
    const host = new URL(url).hostname;
    if (host === ANTHROPIC_HOST) {
      return doFetch(url, Object.assign({}, init, { signal: AbortSignal.timeout(remaining) }));
    }
    let current = url;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      await assertHostIsPublic(current);
      const left = deadline - Date.now();
      if (left < 2000) throw new Error('The build ran out of time.');
      const res = await doFetch(current, Object.assign({}, init, { redirect: 'manual', signal: AbortSignal.timeout(Math.min(SITE_FETCH_MS, left)) }));
      if (res.status >= 300 && res.status < 400 && res.headers && res.headers.get('location')) {
        current = new URL(res.headers.get('location'), current).toString();
        continue;
      }
      return res;
    }
    throw new Error('Too many redirects.');
  };
}

// ---------------------------------------------------------------- the Google Sheet

async function callSheet(payload) {
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, 25000);
  try {
    const res = await fetch(process.env.UPGRADE_SHEET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ secret: process.env.UPGRADE_SHEET_SECRET }, payload)),
      redirect: 'follow',
      signal: controller.signal
    });
    if (!res.ok) return { ok: false, reason: 'sheet_http_' + res.status };
    const data = await res.json();
    return data && typeof data === 'object' ? data : { ok: false, reason: 'sheet_bad_reply' };
  } catch (e) {
    console.error('upgrade-live: sheet call threw: ' + (e && e.name) + ' ' + (e && e.message) + ' ' + (e && e.cause && (e.cause.code || e.cause.message)) + ' urlset=' + Boolean(process.env.UPGRADE_SHEET_URL) + ' urllen=' + String(process.env.UPGRADE_SHEET_URL || '').length);
    return { ok: false, reason: 'sheet_unreachable' };
  } finally {
    clearTimeout(timer);
  }
}

// The richer page: the firm's own colours, animation, three.js hero, React quote form. If anything about it fails,
// the plain concept page (made stand-alone) is shown instead, so a visitor always sees something.
function richHtml(result) {
  try { return rich.renderRich(result.content, result.brand); }
  catch (e) { console.error('upgrade-live: rich page failed, using the plain concept: ' + (e && e.message)); return standAlone(result.html); }
}

// ---------------------------------------------------------------- making the page stand alone

// The concept page links the site's stylesheets by address. Inside the frame there is no site to load them
// from, so they are put into the page itself. Fonts are pointed at the live site (the browser falls back if it refuses).
let cssCache = null;
function readCss() {
  if (cssCache) return cssCache;
  const read = function (rel) { return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'); };
  cssCache = (read('styles.css') + '\n' + read('preview/preview.css')).replace(/url\((['"]?)\/fonts\//g, 'url($1https://www.rhyshume.co.uk/fonts/');
  return cssCache;
}

function standAlone(html) {
  const css = readCss();
  return html
    .replace(/<link rel="preload"[^>]*>\s*/g, '')
    .replace(/<link rel="stylesheet" href="\/styles\.css">\s*/, '')
    .replace(/<link rel="stylesheet" href="\/preview\/preview\.css">/, function () { return '<style>' + css + '</style>'; });
}

// ---------------------------------------------------------------- the handler

const MESSAGES = {
  too_many: 'That is a few too many tries. Please wait a few minutes.',
  off: 'The upgrade button is switched off for now. Email rhys@rhyshume.co.uk and I will send you a concept.',
  check_failed: 'The security check did not go through. Please try again.',
  bad_website: 'That does not look like a website address. Try something like yourfirm.co.uk.',
  already: 'A concept has already been made for that website, or today’s builds are full. Email rhys@rhyshume.co.uk and I will send it over.',
  unreadable: 'I could not read that website. It may block automatic visitors. Email rhys@rhyshume.co.uk and I will build it by hand.',
  failed: 'Something went wrong. Email rhys@rhyshume.co.uk and I will build it by hand.'
};

function fail(res, status, code) {
  return json(res, status, { ok: false, error: code, message: MESSAGES[code] || MESSAGES.failed });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false });
  }
  if (process.env.UPGRADE_LIVE_OFF === '1') return fail(res, 503, 'off');

  const ip = clientIp(req);
  if (rateLimited(ip)) return fail(res, 429, 'too_many');

  let fields;
  try {
    if (String(req.headers['content-type'] || '').indexOf('application/x-www-form-urlencoded') === -1) throw { status: 415 };
    fields = await readBody(req);
  } catch (err) {
    return fail(res, (err && err.status) || 400, 'failed');
  }

  // Honeypot: a bot that fills the hidden field gets a polite refusal and nothing is built.
  if (oneLine(fields.company_website, 200)) return fail(res, 400, 'failed');

  const missing = ['ANTHROPIC_API_KEY', 'TURNSTILE_SECRET_KEY', 'UPGRADE_SHEET_URL', 'UPGRADE_SHEET_SECRET'].filter(function (n) { return !process.env[n]; });
  if (missing.length) {
    console.error('upgrade-live: missing env var(s): ' + missing.join(', ')); // names only, never values
    return fail(res, 500, 'failed');
  }

  const check = await antispam.verifyTurnstile({
    secret: process.env.TURNSTILE_SECRET_KEY,
    token: fields['cf-turnstile-response'],
    ip: ip,
    expectedAction: TURNSTILE_ACTION,
    allowedHostnames: TURNSTILE_HOSTNAMES
  });
  if (!check.ok) {
    console.warn('upgrade-live: security check refused, reason ' + check.reason);
    return fail(res, check.reason === 'unavailable' ? 503 : 403, 'check_failed');
  }

  const site = upgrade.cleanWebsite(fields.website);
  if (!site) return fail(res, 400, 'bad_website');
  const email = oneLine(fields.email, 200).toLowerCase();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Permission from the Sheet before any API money is spent. Fails closed.
  const claim = await callSheet({
    action: 'claim',
    website: site.url,
    domain: site.domain,
    email: emailOk ? email : '',
    marketing: emailOk && fields.marketing === 'yes' ? 'yes' : 'no',
    visitor: visitorId(ip)
  });
  if (!claim.ok) {
    if (claim.reason === 'duplicate' || claim.reason === 'daily_limit' || claim.reason === 'visitor_limit') return fail(res, 429, 'already');
    console.error('upgrade-live: the Sheet refused or could not be reached, reason ' + claim.reason);
    return fail(res, 502, 'failed');
  }

  const deadline = Date.now() + BUDGET_MS;
  const slug = 'live-' + crypto.randomBytes(5).toString('hex');
  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'upgrade-'));
  try {
    const result = await preview.run({
      url: site.url,
      slug: slug,
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL || undefined,
      fetchImpl: makeFetch(deadline),
      outRoot: outRoot,
      measure: false
    });
    await callSheet({ action: 'finish', domain: site.domain, visitor: visitorId(ip), status: 'Built' });
    console.log('upgrade-live: built a concept for ' + site.domain);
    return json(res, 200, {
      ok: true,
      host: site.host,
      url: site.url,
      html: richHtml(result),
      points: result.points,
      warnings: result.warnings.filter(function (w) { return !/screenshot|competitor/i.test(w); })
    });
  } catch (e) {
    const reason = String(e && e.message ? e.message : e).slice(0, 200);
    console.error('upgrade-live: build failed for ' + site.domain + ': ' + reason);
    await callSheet({ action: 'finish', domain: site.domain, visitor: visitorId(ip), status: 'Failed', note: reason });
    const unreadable = /Could not fetch|not an HTML|does not exist|not a public|Too many redirects|ran out of time/i.test(reason);
    return fail(res, unreadable ? 422 : 500, unreadable ? 'unreadable' : 'failed');
  } finally {
    try { fs.rmSync(outRoot, { recursive: true, force: true }); } catch (e) { /* the temp folder is cleared when the instance recycles */ }
  }
};

module.exports.setLookup = function (fn) { lookup = fn; };
module.exports.standAlone = standAlone;
module.exports.makeFetch = makeFetch;
module.exports.ipIsPublic = ipIsPublic;
module.exports.assertHostIsPublic = assertHostIsPublic;
