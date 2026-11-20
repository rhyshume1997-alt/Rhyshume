'use strict';
/* DEV ONLY (not shipped). Small client for the harness: calls the REAL handlers over HTTP. */
let BASE = process.env.BASE || 'http://localhost:4300';
let n = 0;
async function call(method, p, body, o) {
  const op = o || {};
  n++; const h = Object.assign({ 'X-Forwarded-For': op.ip || '198.18.' + (Math.floor(n / 250) % 250) + '.' + (n % 250 + 1) }, op.headers || {});
  if (op.token) h.Authorization = 'Bearer ' + op.token;
  let payload;
  if (body !== undefined) { payload = typeof body === 'string' ? body : JSON.stringify(body); if (!op.noCt) h['Content-Type'] = op.ct || 'application/json'; }
  const r = await fetch((op.base || BASE) + p, { method: method, headers: h, body: payload, redirect: 'manual' });
  const raw = await r.text(); let json = null; try { json = JSON.parse(raw); } catch (e) { /* not json */ }
  return { status: r.status, json: json, raw: raw, headers: r.headers };
}
function startBody(o) {
  const x = Object.assign({ business_name: 'Harbour Precision Ltd', website: 'http://good-harbour.test/', location: { text: 'Glasgow', kind: 'regional' }, category: 'CNC machining', goals: ['more_enquiries'], turnstile_token: 'TEST-TOKEN-business-review' }, o || {});
  Object.keys(x).forEach(function (k) { if (x[k] === undefined) delete x[k]; });
  return x;
}
let k = 0;
async function start(o, opt) {
  const op = Object.assign({ headers: { 'Idempotency-Key': 'harness-key-' + Date.now() + '-' + (++k) + '-abcdef' } }, opt || {});
  if (opt && opt.headers) op.headers = Object.assign({ 'Idempotency-Key': 'harness-key-' + Date.now() + '-' + (k) + '-abcdef' }, opt.headers);
  return call('POST', '/api/business-review/start', startBody(o), op);
}
async function runToReady(id, token, opt) {
  let last;
  for (let i = 0; i < 20; i++) {
    last = await call('POST', '/api/business-review/' + id + '/advance', {}, Object.assign({ token: token }, opt || {}));
    if (!last.json || !last.json.ok) return last;
    if (last.json.review.status === 'ready' || last.json.review.status === 'failed') return last;
  }
  return last;
}
module.exports = { call, start, startBody, runToReady, setBase: function (b) { BASE = b; } };
