'use strict';
/*
Business review: HTTP envelope helpers.
Inputs : Node style req/res objects (Vercel functions).
Outputs: JSON responses in the CONTRACT.md envelope with the mandatory no-store and noindex headers.
Must not change: the envelope shape, the header set, the 32 KB body limit, or the rule that messages never carry internal detail.
*/
const { CONTRACT_VERSION } = require('./config');

const MAX_BODY = 32 * 1024;

class ApiError extends Error {
  constructor(status, code, message, extra) {
    super(message || code);
    this.status = status;
    this.code = code;
    this.publicMessage = message || 'Something went wrong.';
    this.extra = extra || {};
  }
}

const DEFAULT_MESSAGES = {
  validation_failed: 'Please check the highlighted fields.',
  bad_json: 'That request could not be read.',
  unsupported_media_type: 'The request must be sent as JSON.',
  payload_too_large: 'That request is too large.',
  turnstile_failed: 'The bot check did not pass. Please try again.',
  turnstile_unavailable: 'The bot check is unavailable right now. Please try again shortly.',
  rate_limited: 'Too many requests. Please wait a little and try again.',
  daily_limit: 'The free review has reached its daily limit. Please try again tomorrow.',
  url_not_allowed: 'That website address cannot be checked. Use the public address of your business website, without a port or login details.',
  unresolvable: 'That website address could not be found.',
  site_unreachable: 'That website could not be read.',
  blocked_by_robots: 'That website asks automated tools not to read it.',
  not_found: 'Not found.',
  expired: 'This review link has expired.',
  step_in_progress: 'The review is already running. Please wait a moment.',
  wrong_state: 'That cannot be done at this stage of the review.',
  consent_required: 'Consent is needed to do that.',
  provider_unavailable: 'That check is not available right now.',
  budget_exhausted: 'The budget for that check has been used up for today.',
  delivery_not_configured: 'Emailing the report is not switched on yet. You can print or save this page instead.',
  delivery_failed: 'The email could not be sent. Please try again later.',
  pdf_unavailable: 'A PDF is not available. Use the print view.',
  unauthenticated: 'Please sign in.',
  forbidden: 'You do not have access to that.',
  conflict: 'That conflicts with the current state.',
  internal: 'Something went wrong on our side. Please try again.',
  method_not_allowed: 'That method is not allowed.',
  storage_unavailable: 'The review service is not available right now. Please try again later.'
};
const STATUS = {
  validation_failed: 400, bad_json: 400, unsupported_media_type: 415, payload_too_large: 413, turnstile_failed: 403,
  turnstile_unavailable: 503, rate_limited: 429, daily_limit: 503, url_not_allowed: 400, unresolvable: 422,
  site_unreachable: 422, blocked_by_robots: 422, not_found: 404, expired: 410, step_in_progress: 409, wrong_state: 409,
  consent_required: 400, provider_unavailable: 503, budget_exhausted: 503, delivery_not_configured: 503,
  delivery_failed: 502, pdf_unavailable: 501, unauthenticated: 401, forbidden: 403, conflict: 409, internal: 500,
  method_not_allowed: 405, storage_unavailable: 503
};

function err(code, extra, message) {
  return new ApiError(STATUS[code] || 500, code, message || DEFAULT_MESSAGES[code] || DEFAULT_MESSAGES.internal, extra);
}

function setHeaders(res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

function sendJson(res, status, body) {
  setHeaders(res);
  res.statusCode = status;
  res.end(JSON.stringify(body));
}

function sendOk(res, payload, status) {
  sendJson(res, status || 200, Object.assign({ ok: true, contract_version: CONTRACT_VERSION }, payload || {}));
}

function sendError(res, e) {
  let apiErr = e;
  if (!(e instanceof ApiError)) apiErr = err('internal');
  const error = Object.assign({ code: apiErr.code, message: apiErr.publicMessage }, apiErr.extra || {});
  if (apiErr.status === 429 && error.retry_after_s != null) res.setHeader('Retry-After', String(error.retry_after_s));
  sendJson(res, apiErr.status, { ok: false, contract_version: CONTRACT_VERSION, error: error });
}

function header(req, name) {
  const v = req.headers && req.headers[name.toLowerCase()];
  return Array.isArray(v) ? v[0] : v;
}

// Reads a JSON object body. 415 unless Content-Type is application/json, 413 over the limit, 400 on bad JSON.
// allowEmpty: an absent body is treated as {}.
async function readJsonBody(req, opts) {
  const o = opts || {};
  const max = o.maxBytes || MAX_BODY;
  const ct = String(header(req, 'content-type') || '').toLowerCase();
  const declared = parseInt(header(req, 'content-length') || '0', 10);
  if (declared > max) throw err('payload_too_large');
  let raw = null;
  let parsed;
  try { parsed = req.body; } catch (e) { parsed = undefined; }
  if (parsed !== undefined && parsed !== null && !(typeof parsed === 'string') && !Buffer.isBuffer(parsed)) {
    if (!/^application\/json(\s*;|$)/.test(ct)) throw err('unsupported_media_type');
    if (typeof parsed !== 'object' || Array.isArray(parsed)) throw err('bad_json');
    if (Buffer.byteLength(JSON.stringify(parsed)) > max) throw err('payload_too_large');
    return parsed;
  }
  if (typeof parsed === 'string') raw = Buffer.from(parsed, 'utf8');
  else if (Buffer.isBuffer(parsed)) raw = parsed;
  else if (typeof req.on === 'function') {
    raw = await new Promise(function (resolve, reject) {
      const chunks = [];
      let size = 0;
      let done = false;
      req.on('data', function (d) {
        if (done) return;
        size += d.length;
        if (size > max) { done = true; reject(err('payload_too_large')); return; }
        chunks.push(d);
      });
      req.on('end', function () { if (!done) { done = true; resolve(Buffer.concat(chunks)); } });
      req.on('error', function () { if (!done) { done = true; reject(err('bad_json')); } });
    });
  } else raw = Buffer.alloc(0);
  if (raw.length > max) throw err('payload_too_large');
  if (raw.length === 0) {
    if (o.allowEmpty) return {};
    throw err('bad_json');
  }
  if (!/^application\/json(\s*;|$)/.test(ct)) throw err('unsupported_media_type');
  let obj;
  try { obj = JSON.parse(raw.toString('utf8')); } catch (e) { throw err('bad_json'); }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw err('bad_json');
  return obj;
}

const IP_RE = /^[0-9a-fA-F:.]{2,45}$/;
function clientIp(req) {
  const fwd = header(req, 'x-forwarded-for');
  let ip = fwd ? String(fwd).split(',')[0].trim() : '';
  if (!ip) ip = (req.socket && req.socket.remoteAddress) || '';
  return IP_RE.test(ip) ? ip : 'unknown';
}

function bearer(req) {
  const h = String(header(req, 'authorization') || '');
  const m = /^Bearer\s+([A-Za-z0-9._~+\/=-]{1,4096})$/.exec(h.trim());
  return m ? m[1] : null;
}

module.exports = { ApiError, err, sendJson, sendOk, sendError, readJsonBody, clientIp, bearer, header, DEFAULT_MESSAGES, STATUS, MAX_BODY };
