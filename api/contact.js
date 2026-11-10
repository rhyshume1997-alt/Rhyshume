'use strict';

/*
  POST /api/contact
  Takes the contact form (/contact) and the council digital grants form (/council-digital-grants),
  sent as application/x-www-form-urlencoded, and emails the enquiry to Rhys with Resend.

  Environment variables (set in Vercel, Project Settings, Environment Variables):
    RESEND_API_KEY  required  API key from resend.com
    CONTACT_TO      required  where enquiries go. Intended value: rhyshume1997@gmail.com (comma separate for more than one)
    CONTACT_FROM    optional  sender on a domain verified in Resend, e.g. "Rhys Hume <hello@rhyshume.co.uk>" (the default)
    TURNSTILE_SECRET_KEY  required  secret key of the Cloudflare Turnstile widget for rhyshume.co.uk (mark Sensitive in Vercel).
                                    Without it the form refuses every send (fails closed).
    CONTACT_QUARANTINE_TO optional  where suspected sales pitches are emailed for review, marked [SPAM REVIEW].
                                    If it is not set they come to CONTACT_TO instead, so nothing is lost.

  Order of checks: rate limit, honeypot, Turnstile, field validation, spam score, send.
  Spam helpers live in api/_lib (antispam.js is shared across sites and not edited here, contact-words.js is this site's word list).
*/

const antispam = require('./_lib/antispam');
const contactWords = require('./_lib/contact-words');

// rhyshume.co.uk is the domain verified in Resend. Resend rejects a from address on any other domain.
const DEFAULT_FROM = 'Rhys Hume <hello@rhyshume.co.uk>';
const MAX_BODY_BYTES = 64 * 1024;

// Both forms use one Turnstile widget, with data-action="contact" in the page.
const TURNSTILE_ACTION = 'contact';
const TURNSTILE_HOSTNAMES = ['rhyshume.co.uk', 'www.rhyshume.co.uk'];
const QUARANTINE_THRESHOLD = 4;

// The two forms. Each sets a hidden field "form" to one of these keys. The subject and the
// page the visitor goes back to come from here, never from the request.
const FORMS = {
  contact: {
    page: '/contact',
    subject: 'New enquiry from rhyshume.co.uk',
    fields: [
      ['name', 'Name', 100, true],
      ['company', 'Company', 120, true],
      ['email', 'Email', 200, true],
      ['phone', 'Phone', 30, false],
      ['service', 'What do you need?', 60, true],
      ['message', 'Message', 5000, true, 'multi']
    ]
  },
  grants: {
    page: '/council-digital-grants',
    subject: 'New grants enquiry from rhyshume.co.uk',
    fields: [
      ['name', 'Name', 100, true],
      ['company', 'Company', 120, true],
      ['email', 'Email', 200, true],
      ['phone', 'Phone', 30, false],
      ['council_area', 'Council area', 60, true],
      ['what_you_want_built', 'What you want built', 5000, true, 'multi']
    ]
  }
};

// Basic rate limit, per IP, kept in memory. Vercel keeps warm instances for a while, so this slows down
// a script hammering one instance. For anything stronger use Vercel's firewall rate limiting.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(function (t) { return now - t < RATE_WINDOW_MS; });
  if (recent.length >= RATE_MAX) { hits.set(ip, recent); return true; }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 2000) {
    hits.forEach(function (list, key) {
      if (!list.some(function (t) { return now - t < RATE_WINDOW_MS; })) hits.delete(key);
    });
  }
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

// Form posts get a 303 back to the page: ?sent=1#sent only once Resend has accepted the email, otherwise ?error=1#not-sent.
// The hash shows the matching note (CSS :target, no JS).
// fetch callers asking for JSON get JSON.
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

function clean(value, max) {
  return String(value == null ? '' : value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max);
}

function oneLine(value, max) {
  return clean(value, max).replace(/[\r\n]+/g, ' ');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

// Vercel may have parsed the body already (req.body); otherwise read the stream. Built-ins only.
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
      if (size > MAX_BODY_BYTES) {
        done = true;
        reject({ status: 413, message: 'That message is too long.' });
        return;
      }
      chunks.push(d);
    });
    req.on('end', function () {
      if (done) return;
      done = true;
      resolve(toFields(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', function () {
      if (done) return;
      done = true;
      reject({ status: 400, message: 'That request could not be read.' });
    });
  });
}

function toFields(text) {
  const fields = {};
  new URLSearchParams(text).forEach(function (value, key) {
    if (!(key in fields)) fields[key] = value;
  });
  return fields;
}

function validate(form, fields) {
  const errors = {};
  const rows = [];
  const data = {};
  form.fields.forEach(function (f) {
    const key = f[0], label = f[1], max = f[2], required = f[3], multi = f[4] === 'multi';
    const value = multi ? clean(fields[key], max) : oneLine(fields[key], max);
    data[key] = value;
    if (required && !value) errors[key] = label + ' is missing.';
    rows.push([label, value || 'Not given', multi]);
  });
  if (data.name && data.name.length < 2) errors.name = 'Please give your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'That email address does not look right.';
  if (data.phone && !/^[\d\s+()\-.]{6,30}$/.test(data.phone)) errors.phone = 'That phone number does not look right.';
  return { errors: errors, data: data, rows: rows };
}

function enquiryEmail(rows) {
  const singles = rows.filter(function (r) { return !r[2]; });
  const multis = rows.filter(function (r) { return r[2]; });
  const text = singles.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n') +
    multis.map(function (r) { return '\n\n' + r[0] + ':\n' + r[1]; }).join('') +
    '\n\nReply to this email to reach them.';
  const html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#0b2a5b">' +
    '<table cellpadding="6" style="border-collapse:collapse">' +
    singles.map(function (r) { return '<tr><td style="color:#56688a;vertical-align:top"><b>' + escapeHtml(r[0]) + '</b></td><td>' + escapeHtml(r[1]) + '</td></tr>'; }).join('') +
    '</table>' +
    multis.map(function (r) { return '<p><b>' + escapeHtml(r[0]) + '</b><br>' + escapeHtml(r[1]).replace(/\r?\n/g, '<br>') + '</p>'; }).join('') +
    '<p style="color:#56688a">Reply to this email to reach them.</p></div>';
  return { text: text, html: html };
}

const SENT = '?sent=1#sent';
const NOT_SENT = '?error=1#not-sent';
const CHECK_FAILED = '?error=1#check-failed';

const FALLBACK = 'call 07908 041480 or email rhyshume1997@gmail.com';

// The security check did not pass. Fails closed: nothing is emailed.
// 503 when the check itself is down or not set up (the visitor can do nothing about it), 403 when this attempt was refused.
function refuseCheck(req, res, form, check) {
  const down = check.reason === 'not_configured' || check.reason === 'unavailable';
  if (check.reason === 'not_configured') {
    console.error('contact: missing env var(s): TURNSTILE_SECRET_KEY'); // name only, never the value
  } else {
    console.warn('contact: security check refused, reason ' + check.reason +
      (check.codes && check.codes.length ? ', codes ' + check.codes.join(' ') : ''));
  }
  if (down) {
    return send(req, res, 503, { ok: false, error: 'The form can’t send right now. Please ' + FALLBACK + '.' }, form.page + CHECK_FAILED);
  }
  return send(req, res, 403, { ok: false, error: 'The security check didn’t go through. Please try again, or ' + FALLBACK + '.' }, form.page + CHECK_FAILED);
}

// Held enquiries get a note at the top of the review email saying why.
function quarantineBanner(verdict, separate) {
  const where = separate
    ? 'This was held back and NOT sent to your normal enquiries inbox.'
    : 'CONTACT_QUARANTINE_TO is not set, so this came to the normal enquiries inbox.';
  const text = 'SPAM REVIEW: scored ' + verdict.score + ' (' + verdict.reasons.join('; ') + '). ' + where +
    ' If it is a real customer, reply to them. The sender saw the normal thank you and was sent no confirmation.';
  return { text: text + '\n\n', html: '<p style="color:#9b2c2c"><b>' + escapeHtml(text) + '</b></p>' };
}

async function resendSend(payload) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch (e) { /* ignore */ }
    throw new Error('Resend ' + res.status + ' ' + detail);
  }
  let id = '';
  try { id = (await res.json()).id || ''; } catch (e) { /* ignore */ }
  return id;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(req, res, 405, { ok: false, error: 'Please use the contact form.' }, '/contact');
  }

  const ip = clientIp(req);
  if (rateLimited(ip)) {
    return send(req, res, 429, { ok: false, error: 'You’ve sent a few messages in a short time. Please wait a few minutes and try again.' }, '/contact' + NOT_SENT);
  }

  let fields;
  try {
    const type = String(req.headers['content-type'] || '');
    if (type.indexOf('application/x-www-form-urlencoded') === -1) throw { status: 415, message: 'Please use the contact form.' };
    fields = await readBody(req);
  } catch (err) {
    return send(req, res, (err && err.status) || 400, { ok: false, error: (err && err.message) || 'That request could not be read.' }, '/contact' + NOT_SENT);
  }

  const form = FORMS[oneLine(fields.form, 20)] || FORMS.contact;

  // Spam: a hidden field people never see. Bots that fill it get a normal-looking success and nothing is sent
  if (clean(fields.company_website, 200)) {
    return send(req, res, 200, { ok: true }, form.page + SENT);
  }

  // Turnstile: proves a real browser sent the form. The widget alone does nothing, this server check is what protects it.
  const check = await antispam.verifyTurnstile({
    secret: process.env.TURNSTILE_SECRET_KEY,
    token: fields['cf-turnstile-response'],
    ip: ip,
    expectedAction: TURNSTILE_ACTION,
    allowedHostnames: TURNSTILE_HOSTNAMES
  });
  if (!check.ok) return refuseCheck(req, res, form, check);

  const checked = validate(form, fields);
  if (Object.keys(checked.errors).length) {
    return send(req, res, 400, { ok: false, errors: checked.errors, error: 'Some details need another look.' }, form.page + NOT_SENT);
  }

  const to = String(process.env.CONTACT_TO || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  const missing = [];
  if (!process.env.RESEND_API_KEY) missing.push('RESEND_API_KEY');
  if (!to.length) missing.push('CONTACT_TO');
  if (missing.length) {
    // Names only, never values.
    console.error('contact: missing env var(s): ' + missing.join(', '));
    return send(req, res, 500, { ok: false, error: 'The form isn’t working right now.' }, form.page + NOT_SENT);
  }

  const d = checked.data;
  let mail = enquiryEmail(checked.rows);
  let target = to;
  let subject = form.subject + ' – ' + d.company;

  // Spam score. A suspected sales pitch is emailed for review, not dropped, and the sender still sees the normal thank you.
  // The sender is never emailed (this function sends no confirmation), so a pitch gets nothing back.
  const verdict = contactWords.classifyEnquiry(antispam, {
    name: d.name,
    company: d.company,
    message: d.message || d.what_you_want_built,
    service: d.service || d.council_area
  }, { threshold: QUARANTINE_THRESHOLD });
  if (verdict.quarantine) {
    // antispam.quarantineTarget reads QUOTE_QUARANTINE_TO, so this site's clearer name is passed in under that key.
    const held = antispam.quarantineTarget({ QUOTE_QUARANTINE_TO: process.env.CONTACT_QUARANTINE_TO }, to);
    const banner = quarantineBanner(verdict, held.separate);
    target = held.to;
    subject = antispam.quarantineSubject(subject, verdict);
    mail = { text: banner.text + mail.text, html: banner.html + mail.html };
  }

  let id;
  try {
    id = await resendSend({
      from: String(process.env.CONTACT_FROM || '').trim() || DEFAULT_FROM,
      to: target,
      reply_to: d.email,
      subject: subject,
      text: mail.text,
      html: mail.html
    });
  } catch (err) {
    console.error('contact: Resend send failed:', err && err.stack ? err.stack : err);
    return send(req, res, 502, { ok: false, error: 'Your message didn’t send.' }, form.page + NOT_SENT);
  }

  console.log('contact: ' + (verdict.quarantine ? 'held for review (score ' + verdict.score + ') via Resend' : 'sent via Resend') + ', id ' + id + ', form ' + (fields.form === 'grants' ? 'grants' : 'contact'));
  return send(req, res, 200, { ok: true }, form.page + SENT);
};
