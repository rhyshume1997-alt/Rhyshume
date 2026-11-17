/*
  POST /api/enquiry
  Server side of the Marpet Fabrications enquiry form (contact.html). Vercel-style Node serverless
  function: default export handler(req, res). No npm dependencies, Node 18+ (global fetch).

  Environment variables (names only, values live in the host's settings, never in the repo):
    MARPET_RESEND_API_KEY        required  Resend API key
    MARPET_ENQUIRY_TO            required  where enquiries go (comma separate for more than one)
    MARPET_ENQUIRY_FROM          required  sender on a domain verified in Resend
    MARPET_TURNSTILE_SECRET_KEY  required  Cloudflare Turnstile secret key
    MARPET_TURNSTILE_HOSTNAMES   optional  comma separated hostnames the Turnstile token must come from

  Fails closed: if any required variable is missing nothing is verified or sent and the answer is
  503 not_configured. Turnstile is never skipped.

  Order of checks: method, body, honeypot, configuration, time trap, field validation, Turnstile, send.
  Validation runs before Turnstile because a Turnstile token can only be redeemed once; a visitor who
  mistypes their email should not have to redo the challenge server side for nothing.

  Logging: codes only. Never message bodies, names, email addresses or secret values.
*/

/**
 * @typedef {Object} Req
 * @property {string} [method]
 * @property {Record<string, string | string[] | undefined>} headers
 * @property {unknown} [body]
 * @property {(event: string, listener: (arg?: any) => void) => unknown} [on]
 * @property {{ remoteAddress?: string }} [socket]
 */

/**
 * @typedef {Object} Res
 * @property {number} statusCode
 * @property {(name: string, value: string) => unknown} setHeader
 * @property {(body?: string) => unknown} end
 */

/**
 * @typedef {Object} EnquiryValue
 * @property {string} name
 * @property {string} company
 * @property {string} email
 * @property {string} tel
 * @property {string} service
 * @property {string} message
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} ok
 * @property {Record<string, string>} errors
 * @property {EnquiryValue} value
 */

/**
 * @typedef {Object} SpamVerdict
 * @property {boolean} spam        reject (or, for the honeypot, pretend success) and send nothing
 * @property {boolean} honeypot    the hidden field was filled in
 * @property {boolean} suspicious  not fatal, but the email is marked [SPAM REVIEW]
 * @property {string | null} reason  'honeypot' | 'too_fast' | 'too_old' | 'bad_ts' | 'missing_ts' | 'clock_skew' | null
 */

/**
 * @typedef {Object} Config
 * @property {string} resendKey
 * @property {string[]} to
 * @property {string} from
 * @property {string} turnstileSecret
 * @property {string[]} hostnames
 */

/** The options in the form's "What do you need?" select. Anything else is rejected. */
export const SERVICES = Object.freeze([
  'Conveyor systems',
  'Production lines',
  'Industrial pipework',
  'Access platforms',
  'Catering fabrication',
  'Dentistry equipment',
  'General fabrication',
  'Something else'
]);

export const MAX_BODY_BYTES = 20 * 1024;
export const MIN_ELAPSED_MS = 3 * 1000;
export const MAX_ELAPSED_MS = 24 * 60 * 60 * 1000;
/** A visitor's clock may run ahead of the server's. Up to this far ahead is only "suspicious". */
export const CLOCK_SKEW_MS = 10 * 60 * 1000;
export const MAX_LINKS = 3;
export const QUARANTINE_PREFIX = '[SPAM REVIEW] ';

const PAGE = '/contact.html';
const HASH = '#enquiry-status';
const TURNSTILE_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const RESEND_URL = 'https://api.resend.com/emails';
const UPSTREAM_TIMEOUT_MS = 8000;

const EMAIL_RE = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/;
const TEL_RE = /^[\d\s+()-]+$/;
const LINK_RE = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;

/** @returns {Record<string, string | undefined>} */
function env() {
  const p = /** @type {any} */ (globalThis).process;
  return (p && p.env) || {};
}

/**
 * Field values can arrive as anything when the body is JSON. Only strings and numbers count.
 * @param {unknown} value
 * @returns {string}
 */
function str(value) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

/**
 * Multi-line text: control characters removed (tab and newline kept), line endings normalised, trimmed.
 * @param {unknown} value
 * @returns {string}
 */
function cleanMulti(value) {
  return str(value)
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f\u2028\u2029]/g, '')
    .trim();
}

/**
 * Single-line text, safe to put in an email header: CR, LF and every other control character
 * become a space, runs of whitespace collapse, ends trimmed.
 * @param {unknown} value
 * @returns {string}
 */
export function oneLine(value) {
  return str(value).replace(/[\u0000-\u001f\u007f\u0085\u2028\u2029]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, function (c) {
    return /** @type {Record<string, string>} */ ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
  });
}

/**
 * @param {string} text
 * @returns {number}
 */
export function countLinks(text) {
  const found = String(text || '').match(LINK_RE);
  return found ? found.length : 0;
}

/**
 * Checks and tidies the visible form fields. Pure: no network, no environment.
 * @param {Record<string, unknown>} fields
 * @param {readonly string[]} [services]  allowed values for "service" (defaults to SERVICES)
 * @returns {ValidationResult}
 */
export function validate(fields, services) {
  const f = fields && typeof fields === 'object' ? fields : {};
  const allowed = services || SERVICES;
  /** @type {Record<string, string>} */
  const errors = {};
  /** @type {EnquiryValue} */
  const value = {
    name: oneLine(f.name),
    company: oneLine(f.company),
    email: oneLine(f.email),
    tel: oneLine(f.tel),
    service: oneLine(f.service),
    message: cleanMulti(f.message)
  };

  if (!value.name) errors.name = 'Please give your name.';
  else if (value.name.length < 2) errors.name = 'That name is too short.';
  else if (value.name.length > 100) errors.name = 'That name is too long (100 characters at most).';

  if (value.company.length > 120) errors.company = 'That company name is too long (120 characters at most).';

  if (!value.email) errors.email = 'Please give your email address.';
  else if (value.email.length > 254) errors.email = 'That email address is too long.';
  else if (!EMAIL_RE.test(value.email)) errors.email = 'That email address does not look right.';

  if (value.tel) {
    if (value.tel.length > 40) errors.tel = 'That phone number is too long.';
    else if (!TEL_RE.test(value.tel) || !/\d/.test(value.tel)) errors.tel = 'That phone number does not look right.';
  }

  if (value.service && allowed.indexOf(value.service) === -1) errors.service = 'Please choose one of the listed options.';

  if (!value.message) errors.message = 'Please tell us about the job.';
  else if (value.message.length < 10) errors.message = 'Please tell us a little more about the job (10 characters at least).';
  else if (value.message.length > 5000) errors.message = 'That message is too long (5000 characters at most).';

  return { ok: Object.keys(errors).length === 0, errors: errors, value: value };
}

/**
 * Honeypot and time trap. Pure: no network, no environment.
 *   website  hidden field, must be empty
 *   ts       time the form was rendered, in ms since the epoch
 * @param {Record<string, unknown>} fields
 * @param {number} [now]  current time in ms (defaults to Date.now())
 * @returns {SpamVerdict}
 */
export function isSpam(fields, now) {
  const f = fields && typeof fields === 'object' ? fields : {};
  const at = typeof now === 'number' ? now : Date.now();

  if (str(f.website).trim()) return { spam: true, honeypot: true, suspicious: true, reason: 'honeypot' };

  const raw = str(f.ts).trim();
  if (!raw) return { spam: false, honeypot: false, suspicious: true, reason: 'missing_ts' };
  if (!/^\d{1,16}$/.test(raw)) return { spam: true, honeypot: false, suspicious: true, reason: 'bad_ts' };

  const elapsed = at - Number(raw);
  if (elapsed < -CLOCK_SKEW_MS) return { spam: true, honeypot: false, suspicious: true, reason: 'bad_ts' };
  if (elapsed < 0) return { spam: false, honeypot: false, suspicious: true, reason: 'clock_skew' };
  if (elapsed < MIN_ELAPSED_MS) return { spam: true, honeypot: false, suspicious: true, reason: 'too_fast' };
  if (elapsed > MAX_ELAPSED_MS) return { spam: true, honeypot: false, suspicious: true, reason: 'too_old' };
  return { spam: false, honeypot: false, suspicious: false, reason: null };
}

/**
 * @param {Req} req
 * @returns {boolean}
 */
function wantsJson(req) {
  return String((req.headers && req.headers.accept) || '').toLowerCase().indexOf('application/json') !== -1;
}

/**
 * @param {Res} res
 * @param {number} status
 * @param {Record<string, unknown>} body
 */
function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

/**
 * JSON for callers that ask for it, otherwise a 303 back to the contact page.
 * The redirect target is built from fixed strings and a code from this file, never from the request.
 * @param {Req} req
 * @param {Res} res
 * @param {number} status
 * @param {string | null} code  null for success
 * @param {Record<string, string>} [errors]
 */
function reply(req, res, status, code, errors) {
  if (wantsJson(req)) {
    /** @type {Record<string, unknown>} */
    const body = code ? { ok: false, code: code } : { ok: true };
    if (code && errors) body.errors = errors;
    return json(res, status, body);
  }
  res.statusCode = 303;
  res.setHeader('Location', PAGE + (code ? '?error=' + encodeURIComponent(code) : '?sent=1') + HASH);
  res.setHeader('Cache-Control', 'no-store');
  res.end();
}

/**
 * @param {number} status
 * @param {string} code
 * @returns {{ status: number, code: string }}
 */
function fail(status, code) {
  return { status: status, code: code };
}

/**
 * @param {string} text
 * @param {boolean} isJson
 * @returns {Record<string, unknown>}
 */
function parseBody(text, isJson) {
  if (isJson) {
    let parsed;
    try { parsed = JSON.parse(text); } catch (e) { throw fail(400, 'bad_request'); }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw fail(400, 'bad_request');
    return parsed;
  }
  /** @type {Record<string, unknown>} */
  const fields = {};
  new URLSearchParams(text).forEach(function (value, key) {
    if (!Object.prototype.hasOwnProperty.call(fields, key)) fields[key] = value;
  });
  return fields;
}

/**
 * @param {string} text
 * @returns {number}
 */
function byteLength(text) {
  return new TextEncoder().encode(text).length;
}

/**
 * Reads the form fields. The host may have parsed the body already (req.body as an object),
 * left it as a string or bytes, or left the stream unread.
 * @param {Req} req
 * @returns {Promise<Record<string, unknown>>}
 */
async function readFields(req) {
  const type = String((req.headers && req.headers['content-type']) || '').toLowerCase();
  const isJson = type.indexOf('application/json') !== -1;
  if (!isJson && type.indexOf('application/x-www-form-urlencoded') === -1) throw fail(415, 'unsupported_media_type');

  const declared = Number((req.headers && req.headers['content-length']) || 0);
  if (declared > MAX_BODY_BYTES) throw fail(413, 'too_large');

  let body;
  try { body = req.body; } catch (e) { body = undefined; }

  if (typeof body === 'string') {
    if (byteLength(body) > MAX_BODY_BYTES) throw fail(413, 'too_large');
    return parseBody(body, isJson);
  }
  if (body instanceof Uint8Array) {
    if (body.length > MAX_BODY_BYTES) throw fail(413, 'too_large');
    return parseBody(new TextDecoder().decode(body), isJson);
  }
  if (body && typeof body === 'object') {
    if (Array.isArray(body)) throw fail(400, 'bad_request');
    let size;
    try { size = byteLength(JSON.stringify(body)); } catch (e) { throw fail(400, 'bad_request'); }
    if (size > MAX_BODY_BYTES) throw fail(413, 'too_large');
    return /** @type {Record<string, unknown>} */ (body);
  }
  if (typeof req.on !== 'function') throw fail(400, 'bad_request');

  const on = req.on.bind(req);
  const text = await new Promise(function (resolve, reject) {
    /** @type {Uint8Array[]} */
    const chunks = [];
    let size = 0;
    let done = false;
    on('data', function (d) {
      if (done) return;
      const chunk = typeof d === 'string' ? new TextEncoder().encode(d) : /** @type {Uint8Array} */ (d);
      size += chunk.length;
      if (size > MAX_BODY_BYTES) { done = true; reject(fail(413, 'too_large')); return; }
      chunks.push(chunk);
    });
    on('end', function () {
      if (done) return;
      done = true;
      const all = new Uint8Array(size);
      let offset = 0;
      chunks.forEach(function (c) { all.set(c, offset); offset += c.length; });
      resolve(new TextDecoder().decode(all));
    });
    on('error', function () {
      if (done) return;
      done = true;
      reject(fail(400, 'bad_request'));
    });
  });
  return parseBody(text, isJson);
}

/**
 * Reads the configuration. Returns the names (never values) of anything required that is missing.
 * @returns {{ config: Config, missing: string[] }}
 */
function readConfig() {
  const e = env();
  const list = function (/** @type {string | undefined} */ v) {
    return String(v || '').split(',').map(function (s) { return oneLine(s); }).filter(Boolean);
  };
  const config = {
    resendKey: String(e.MARPET_RESEND_API_KEY || '').trim(),
    to: list(e.MARPET_ENQUIRY_TO),
    from: oneLine(e.MARPET_ENQUIRY_FROM),
    turnstileSecret: String(e.MARPET_TURNSTILE_SECRET_KEY || '').trim(),
    hostnames: list(e.MARPET_TURNSTILE_HOSTNAMES).map(function (h) { return h.toLowerCase(); })
  };
  const missing = [];
  if (!config.resendKey) missing.push('MARPET_RESEND_API_KEY');
  if (!config.to.length) missing.push('MARPET_ENQUIRY_TO');
  if (!config.from) missing.push('MARPET_ENQUIRY_FROM');
  if (!config.turnstileSecret) missing.push('MARPET_TURNSTILE_SECRET_KEY');
  return { config: config, missing: missing };
}

/**
 * @param {Req} req
 * @returns {string}
 */
function clientIp(req) {
  const fwd = req.headers && req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || '';
}

/** @returns {AbortSignal | undefined} */
function timeout() {
  return typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
    ? AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
    : undefined;
}

/**
 * Asks Cloudflare whether the Turnstile token is genuine.
 * @param {Config} config
 * @param {string} token
 * @param {string} ip
 * @returns {Promise<{ ok: boolean, reason: string, codes: string[] }>}
 *   reason: 'ok' | 'missing_token' | 'rejected' | 'hostname' | 'unavailable'
 */
async function verifyTurnstile(config, token, ip) {
  if (!token || token.length > 2048) return { ok: false, reason: 'missing_token', codes: [] };
  const form = new URLSearchParams();
  form.set('secret', config.turnstileSecret);
  form.set('response', token);
  if (ip) form.set('remoteip', ip);

  /** @type {any} */
  let data;
  try {
    const r = await fetch(TURNSTILE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      signal: timeout()
    });
    if (!r.ok) return { ok: false, reason: 'unavailable', codes: ['http_' + r.status] };
    data = await r.json();
  } catch (e) {
    return { ok: false, reason: 'unavailable', codes: [] };
  }

  /** @type {string[]} */
  const codes = data && Array.isArray(data['error-codes'])
    ? data['error-codes'].map(function (/** @type {unknown} */ c) { return String(c).replace(/[^a-z0-9_-]/gi, '').slice(0, 40); })
    : [];
  if (!data || data.success !== true) return { ok: false, reason: 'rejected', codes: codes };
  if (config.hostnames.length && config.hostnames.indexOf(String(data.hostname || '').toLowerCase()) === -1) {
    return { ok: false, reason: 'hostname', codes: codes };
  }
  return { ok: true, reason: 'ok', codes: codes };
}

/**
 * Builds the Resend payload. Everything that ends up in a header has been through oneLine().
 * @param {Config} config
 * @param {EnquiryValue} v
 * @param {string[]} flags  reasons the enquiry is marked for review (empty for a normal one)
 * @returns {{ from: string, to: string[], reply_to: string, subject: string, text: string, html: string }}
 */
export function buildEmail(config, v, flags) {
  const who = v.company ? v.name + ' (' + v.company + ')' : v.name;
  const subject = (flags.length ? QUARANTINE_PREFIX : '') +
    oneLine('Website enquiry: ' + (v.service || 'General') + ' - ' + who).slice(0, 200);

  /** @type {[string, string][]} */
  const rows = [
    ['Name', v.name],
    ['Company', v.company || 'Not given'],
    ['Email', v.email],
    ['Phone', v.tel || 'Not given'],
    ['What they need', v.service || 'Not chosen']
  ];
  const note = flags.length
    ? 'SPAM REVIEW: this enquiry was flagged (' + flags.join(', ') + '). Check it before replying.'
    : '';

  const text = (note ? note + '\n\n' : '') +
    rows.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n') +
    '\n\nMessage:\n' + v.message +
    '\n\nReply to this email to reach them.';

  const html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a">' +
    (note ? '<p style="color:#9b2c2c"><b>' + escapeHtml(note) + '</b></p>' : '') +
    '<table cellpadding="6" style="border-collapse:collapse">' +
    rows.map(function (r) {
      return '<tr><td style="color:#555;vertical-align:top"><b>' + escapeHtml(r[0]) + '</b></td><td>' + escapeHtml(r[1]) + '</td></tr>';
    }).join('') +
    '</table>' +
    '<p><b>Message</b><br>' + escapeHtml(v.message).replace(/\n/g, '<br>') + '</p>' +
    '<p style="color:#555">Reply to this email to reach them.</p></div>';

  return { from: config.from, to: config.to, reply_to: v.email, subject: subject, text: text, html: html };
}

/**
 * @param {Config} config
 * @param {Record<string, unknown>} payload
 * @returns {Promise<{ ok: boolean, status: number }>}
 */
async function resendSend(config, payload) {
  try {
    const r = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + config.resendKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: timeout()
    });
    return { ok: r.ok === true, status: Number(r.status) || 0 };
  } catch (e) {
    return { ok: false, status: 0 };
  }
}

/**
 * @param {Req} req
 * @param {Res} res
 * @returns {Promise<void>}
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, code: 'method_not_allowed' });
  }

  /** @type {Record<string, unknown>} */
  let fields;
  try {
    fields = await readFields(req);
  } catch (err) {
    const e = /** @type {any} */ (err);
    return reply(req, res, (e && e.status) || 400, (e && e.code) || 'bad_request');
  }

  // Honeypot and time trap.
  const verdict = isSpam(fields, Date.now());

  // A bot that filled the hidden field gets a normal-looking success. Nothing is verified or sent.
  if (verdict.honeypot) {
    console.warn('enquiry: dropped, honeypot');
    return reply(req, res, 200, null);
  }

  // Fail closed: without every required setting nothing is verified and nothing is sent.
  const { config, missing } = readConfig();
  if (missing.length) {
    console.error('enquiry: not_configured, missing ' + missing.join(', ')); // names only
    return reply(req, res, 503, 'not_configured');
  }

  if (verdict.spam) {
    console.warn('enquiry: refused, ' + verdict.reason);
    return reply(req, res, 403, 'spam');
  }

  const checked = validate(fields, SERVICES);
  if (!checked.ok) {
    return reply(req, res, 400, 'validation', checked.errors);
  }

  // Turnstile. The widget in the page does nothing on its own; this server check is the protection.
  const check = await verifyTurnstile(config, str(fields['cf-turnstile-response']).trim(), clientIp(req));
  if (!check.ok) {
    console.warn('enquiry: turnstile ' + check.reason + (check.codes.length ? ', codes ' + check.codes.join(' ') : ''));
    if (check.reason === 'unavailable') return reply(req, res, 502, 'turnstile_unavailable');
    return reply(req, res, 403, 'turnstile_failed');
  }

  // Not fatal, but worth a second look: marked [SPAM REVIEW] and still delivered.
  /** @type {string[]} */
  const flags = [];
  if (verdict.suspicious && verdict.reason) flags.push(verdict.reason);
  if (countLinks(checked.value.message) > MAX_LINKS) flags.push('many_links');

  const sent = await resendSend(config, buildEmail(config, checked.value, flags));
  if (!sent.ok) {
    console.error('enquiry: send_failed, resend status ' + sent.status);
    return reply(req, res, 502, 'send_failed');
  }

  // Success is only reported once Resend has accepted the email.
  console.log('enquiry: sent' + (flags.length ? ', flagged ' + flags.join(' ') : ''));
  return reply(req, res, 200, null);
}
