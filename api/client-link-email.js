'use strict';
/*
POST /api/client-link-email  (owner only). Thin wrapper: all logic and rules are in api/_lib/client-link-mail.js.
Inputs : JSON body up to 4 KB, Authorization: Bearer <owner access token>. Outputs: JSON, never cached, no CORS headers (same origin only).
Must not change: no Access-Control headers, POST only, body size cap.
*/
const mail = require('./_lib/client-link-mail');

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
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const send = function (status, body) { res.statusCode = status; res.end(JSON.stringify(body)); };
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(405, { ok: false, code: 'method' }); }
  const ct = String((req.headers && req.headers['content-type']) || '');
  if (ct.indexOf('application/json') !== 0) return send(415, { ok: false, code: 'bad_request' });
  const auth = String((req.headers && req.headers.authorization) || '');
  const token = /^Bearer ([A-Za-z0-9._-]+)$/.exec(auth);
  const body = await readBody(req);
  const r = await mail.handle({ token: token ? token[1] : '', body: body });
  return send(r.status, r.body);
};
