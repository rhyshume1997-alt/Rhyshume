'use strict';
/*
POST /api/client-access  (owner only): create, reset, disable, delete a client login, read its status, email the login instructions.
Thin wrapper, logic and rules in api/_lib/client-access.js. JSON body up to 4 KB, Authorization: Bearer <owner access token>.
Responses are never cached and carry no CORS headers (same origin only). The temporary password appears only in the create or reset response.
Must not change: no Access-Control headers, POST only, no-store, body cap.
*/
const lib = require('./_lib/client-access');
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
  const r = await lib.ownerHandle({ token: m ? m[1] : '', body: body });
  return send(r.status, r.body);
};
