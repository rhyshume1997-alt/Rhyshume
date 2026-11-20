'use strict';
/*
POST /api/client-change-password  (a signed in client with a pending password change). Public route, so Turnstile is required.
Inputs : { new_password, turnstile } with Authorization: Bearer <the client's access token>. Outputs: { ok } or { ok:false, code, reasons? }.
Logic and every check are in api/_lib/client-access.js (changeHandle): the browser is not trusted for anything.
Must not change: Turnstile required, no CORS headers, no-store, body cap.
*/
const lib = require('./_lib/client-access');
function ipOf(req) { const f = String((req.headers && req.headers['x-forwarded-for']) || '').split(',')[0].trim(); return f || (req.socket && req.socket.remoteAddress) || 'unknown'; }
function readBody(req) {
  return new Promise(function (resolve) {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    let n = 0, s = '';
    req.on('data', function (c) { n += c.length; if (n > 4096) { resolve(null); req.destroy(); } else s += c; });
    req.on('end', function () { try { resolve(JSON.parse(s)); } catch (e) { resolve(null); } });
    req.on('error', function () { resolve(null); });
  });
}
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('X-Robots-Tag', 'noindex, nofollow'); res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const send = function (st, b) { res.statusCode = st; res.end(JSON.stringify(b)); };
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(405, { ok: false, code: 'method' }); }
  if (String((req.headers && req.headers['content-type']) || '').indexOf('application/json') !== 0) return send(415, { ok: false, code: 'bad_request' });
  const m = /^Bearer ([A-Za-z0-9._-]+)$/.exec(String((req.headers && req.headers.authorization) || ''));
  const body = await readBody(req);
  if (!body || typeof body !== 'object') return send(400, { ok: false, code: 'bad_request' });
  const r = await lib.changeHandle({ token: m ? m[1] : '', body: body, ip: ipOf(req) });
  return send(r.status, r.body);
};
