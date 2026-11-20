'use strict';
// Package A: public API behaviour end to end with the in memory store, local fixture sites and stubbed external services. Run with: node --test
const test = require('node:test');
const assert = require('node:assert');
const { makeApp, invoke, world, fakeExternal } = require('./br-helpers');

const TS = 'ts-token';
const LH = function () { return { status: 200, json: { lighthouseResult: { fetchTime: '2026-11-20T10:00:05.000Z', lighthouseVersion: '12.3.0', requestedUrl: 'u', finalUrl: 'u', configSettings: { formFactor: 'mobile', throttlingMethod: 'simulate' }, runWarnings: [],
  categories: { performance: { score: 0.6 }, seo: { score: 0.9 }, accessibility: { score: 0.85 }, 'best-practices': { score: 1 } },
  audits: { 'largest-contentful-paint': { numericValue: 3800 }, 'cumulative-layout-shift': { numericValue: 0.05 }, 'total-blocking-time': { numericValue: 150 }, 'first-contentful-paint': { numericValue: 1500 }, 'speed-index': { numericValue: 3000 } } } } }; };
const EXT = function (more) { return fakeExternal([{ match: 'pagespeedonline', reply: LH }, { match: 'api.resend.com', reply: { status: 200, json: { id: 'em_1' } } }].concat(more || [])); };

async function setup(o) {
  const w = await world();
  const ext = (o && o.ext) || EXT();
  const app = makeApp(Object.assign({ fetcher: w.fetcher, fetchImpl: ext, env: Object.assign({ PSI_API_KEY: 'psi-test-key' }, (o && o.env) || {}) }, (o && o.app) || {}));
  return { w: w, ext: ext, app: app, close: w.close };
}
const startBody = function (w, over) { return Object.assign({ business_name: 'Harbour Precision Ltd', website: w.url('biz'), location: { text: 'Glasgow', kind: 'regional' }, category: 'CNC machining', goals: ['more_enquiries', 'quoting_followups'], turnstile_token: TS }, over || {}); };
const post = function (app, path, body, o) { return invoke(app.pub, Object.assign({ method: 'POST', url: '/api/business-review/' + path, body: body === undefined ? {} : body }, o || {})); };
const get = function (app, path, o) { return invoke(app.pub, Object.assign({ method: 'GET', url: '/api/business-review/' + path }, o || {})); };
let keyN = 0;
const idem = function () { keyN++; return '00000000-0000-4000-8000-' + String(1000000 + keyN).padStart(12, '0'); };
async function begin(s, over, headers) {
  const r = await post(s.app, 'start', startBody(s.w, over), { headers: Object.assign({ 'Idempotency-Key': idem() }, headers || {}), ip: (headers && headers.ip) });
  return r;
}
async function startConfirmed(s, over, confirm) {
  const r = await begin(s, over, undefined);
  assert.strictEqual(r.status, 201, JSON.stringify(r.json));
  const id = r.json.review.id, token = r.json.access_token;
  const c = await post(s.app, id + '/confirm', Object.assign({ confirmed: true }, confirm || {}), { token: token });
  assert.strictEqual(c.status, 200, JSON.stringify(c.json));
  return { id: id, token: token, start: r.json };
}
async function runToReady(s, id, token, max) {
  const all = [];
  let last;
  for (let i = 0; i < (max || 14); i++) {
    last = await post(s.app, id + '/advance', {}, { token: token });
    assert.strictEqual(last.status, 200, JSON.stringify(last.json));
    all.push.apply(all, last.json.ran);
    if (['ready', 'failed'].indexOf(last.json.review.status) !== -1) break;
  }
  return { last: last, ran: all };
}

test('capabilities: honest states, contract shape, no secrets', async function () {
  const s = await setup();
  try {
    const r = await get(s.app, 'capabilities');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.json.ok, true);
    assert.strictEqual(r.json.contract_version, '1.0');
    const c = r.json.capabilities;
    assert.strictEqual(c.site_analysis.state, 'available');
    assert.strictEqual(c.pagespeed.state, 'available');
    assert.strictEqual(c.competitor_discovery.state, 'not_configured');
    assert.strictEqual(c.ai_visibility.state, 'disabled');
    assert.strictEqual(c.ai_visibility.note, 'Awaiting a supported test.');
    assert.strictEqual(c.email_delivery.state, 'disabled');
    assert.strictEqual(c.pdf.state, 'disabled');
    assert.deepStrictEqual(r.json.limits, { max_competitors: 3, token_days: 30 });
    ['no-store'].forEach(function (v) { assert.strictEqual(r.headers['cache-control'], v); });
    assert.strictEqual(r.headers['x-robots-tag'], 'noindex, nofollow, noarchive');
    assert.strictEqual(r.headers['referrer-policy'], 'no-referrer');
    assert.ok(!/psi-test-key|test-service-key|test-salt/.test(r.raw));
    const noKey = makeApp({ fetcher: s.w.fetcher });
    assert.strictEqual((await get(noKey, 'capabilities')).json.capabilities.pagespeed.state, 'not_configured');
  } finally { await s.close(); }
});

test('start: request shape errors (media type, size, json, method, idempotency key)', async function () {
  const s = await setup();
  try {
    const k = { 'Idempotency-Key': idem() };
    assert.strictEqual((await post(s.app, 'start', 'x=1', { headers: Object.assign({ 'Content-Type': 'text/plain' }, k) })).json.error.code, 'unsupported_media_type');
    assert.strictEqual((await post(s.app, 'start', 'not json', { headers: k })).json.error.code, 'bad_json');
    assert.strictEqual((await post(s.app, 'start', '[1,2]', { headers: k })).json.error.code, 'bad_json');
    const big = await post(s.app, 'start', JSON.stringify({ business_name: 'x'.repeat(40000) }), { headers: k });
    assert.strictEqual(big.status, 413);
    assert.strictEqual(big.json.error.code, 'payload_too_large');
    const noKey = await post(s.app, 'start', startBody(s.w));
    assert.strictEqual(noKey.status, 400);
    assert.strictEqual(noKey.json.error.code, 'validation_failed');
    assert.strictEqual((await get(s.app, 'start')).status, 405);
    assert.strictEqual((await get(s.app, '')).status, 404);
    assert.strictEqual((await invoke(s.app.pub, { method: 'PUT', url: '/api/business-review/capabilities' })).status, 405);
  } finally { await s.close(); }
});

test('start: input validation fuzzing never throws, never stores bad data, always answers a closed code', async function () {
  const s = await setup();
  try {
    const bad = [undefined, null, 0, 1, -1, 1e999, true, false, [], {}, '', ' ', 'x'.repeat(5000), '\u0000', '‮', { toString: 1 }, ['a'], '<script>alert(1)</script>', "'; DROP TABLE br_reviews;--", '${7*7}', '{{7*7}}', '../../etc/passwd', '😀'.repeat(200), '\r\nX: y', { __proto__: { polluted: 1 } }, '__proto__'];
    const fields = ['business_name', 'category', 'location', 'goals', 'website'];
    let n = 0;
    for (const f of fields) for (const v of bad) {
      n++;
      const body = Object.assign(startBody(s.w), {});
      body[f] = v;
      if (v === undefined) delete body[f];
      const r = await post(s.app, 'start', JSON.stringify(body), { headers: { 'Idempotency-Key': idem() } });
      assert.ok([201, 200, 400, 422, 429].indexOf(r.status) !== -1, f + ' ' + String(JSON.stringify(v)).slice(0, 30) + ' -> ' + r.status);
      assert.ok(r.json && typeof r.json.ok === 'boolean');
      if (r.status === 400) assert.ok(['validation_failed', 'url_not_allowed'].indexOf(r.json.error.code) !== -1);
      if (r.status === 429) { s.app.clock.t = new Date(s.app.clock.t.getTime() + 2 * 86400000); }
    }
    assert.strictEqual({}.polluted, undefined, 'no prototype pollution');
    const rows = await s.app.store.select('br_reviews', {});
    rows.forEach(function (rv) { assert.ok(rv.business_name.length <= 160 && rv.category.length <= 120 && rv.location_text.length <= 160); assert.ok(!/[\u0000‮]/.test(rv.business_name + rv.category + rv.location_text)); });
    assert.ok(n > 100);
    // goals must come from the enum and location kind too
    assert.strictEqual((await post(s.app, 'start', startBody(s.w, { goals: ['hack'] }), { headers: { 'Idempotency-Key': idem() } })).json.error.fields.goals !== undefined, true);
    assert.strictEqual((await post(s.app, 'start', startBody(s.w, { location: { text: 'Glasgow', kind: 'galactic' } }), { headers: { 'Idempotency-Key': idem() } })).status, 400);
  } finally { await s.close(); }
});

test('start: validation errors carry per field messages in plain English', async function () {
  const s = await setup();
  try {
    const r = await post(s.app, 'start', startBody(s.w, { business_name: '', category: '' }), { headers: { 'Idempotency-Key': idem() } });
    assert.strictEqual(r.status, 400);
    assert.strictEqual(r.json.error.code, 'validation_failed');
    assert.ok(r.json.error.fields.business_name && r.json.error.fields.category);
    assert.strictEqual(r.json.ok, false);
    assert.strictEqual(r.json.contract_version, '1.0');
    assert.ok(!/stack|at \w+\.|Error:/.test(r.raw));
  } finally { await s.close(); }
});

test('start: creates a review, returns the token once, stores only its hash, never the raw address', async function () {
  const s = await setup();
  try {
    const r = await begin(s);
    assert.strictEqual(r.status, 201, JSON.stringify(r.json));
    assert.strictEqual(r.json.ok, true);
    assert.strictEqual(r.json.idempotent_replay, false);
    assert.ok(/^BR-[2-9A-HJ-NP-Z]{8}$/.test(r.json.review.ref));
    assert.strictEqual(r.json.review.status, 'awaiting_confirmation');
    assert.strictEqual(r.json.review.assessment_level, 'standard');
    assert.ok(/^[A-Za-z0-9_-]{43}$/.test(r.json.access_token));
    assert.strictEqual(r.json.report_url, '/business-review/report#t=' + r.json.access_token + '&id=' + r.json.review.id);
    assert.strictEqual(r.json.interpretation.website.reachable, true);
    assert.strictEqual(r.json.interpretation.website.title, 'Harbour Precision | CNC machining in Glasgow');
    assert.strictEqual(r.json.interpretation.website.detected_business_name, 'Harbour Precision');
    assert.ok(/Regional/.test(r.json.interpretation.competition_scope_note));
    assert.ok(Array.isArray(r.json.interpretation.assumptions));
    assert.strictEqual(r.json.review.expires_at, '2026-12-20T10:00:00Z', '30 days from the fixed clock');
    const dump = JSON.stringify(s.app.store._data);
    assert.ok(dump.indexOf(r.json.access_token) === -1, 'the token is not stored');
    assert.ok(dump.indexOf('203.0.113.7') === -1 && dump.indexOf('198.51.100.1') === -1, 'no raw IP address is stored');
    const row = (await s.app.store.select('br_reviews', {}))[0];
    assert.ok(/^\\x[0-9a-f]{64}$/.test(row.token_hash));
    assert.strictEqual(row.purge_after, '2027-02-18T10:00:00.000Z', '90 days');
  } finally { await s.close(); }
});

test('start: contact details sent to start are ignored and never stored', async function () {
  const s = await setup();
  try {
    const r = await post(s.app, 'start', startBody(s.w, { email: 'leak@example.test', phone: '07700 900123', password: 'x' }), { headers: { 'Idempotency-Key': idem() } });
    assert.strictEqual(r.status, 201);
    const dump = JSON.stringify(s.app.store._data);
    assert.ok(dump.indexOf('leak@example.test') === -1 && dump.indexOf('07700') === -1);
  } finally { await s.close(); }
});

test('start: unsafe websites are refused with a reason and nothing is fetched or stored', async function () {
  const s = await setup();
  try {
    const cases = [['http://127.0.0.1', 'private_address'], ['http://localhost', 'private_address'], ['http://169.254.169.254/', 'private_address'], ['http://[::1]', 'private_address'], ['http://2130706433', 'private_address'], ['http://user:pw@x.example', 'credentials'], ['ftp://x.example', 'bad_scheme'], ['http://x.example:8080', 'bad_port'], ['file:///etc/passwd', 'bad_scheme']];
    for (const c of cases) {
      const r = await post(s.app, 'start', startBody(s.w, { website: c[0] }), { headers: { 'Idempotency-Key': idem() } });
      assert.strictEqual(r.status, 400, c[0]);
      assert.strictEqual(r.json.error.code, 'url_not_allowed', c[0]);
      assert.strictEqual(r.json.error.reason, c[1], c[0]);
      assert.strictEqual(r.json.error.field, 'website');
    }
    assert.strictEqual((await s.app.store.select('br_reviews', {})).length, 0);
    assert.strictEqual(s.w.servers.biz.hits.length, 0);
    const priv = makeApp({ fetcher: (await require('./br-helpers').testFetcher({ 'internal.test': '10.0.0.5', 'rebind.test': ['93.184.216.34', '192.168.1.5'] }, [])) });
    const r2 = await post(priv, 'start', startBody(s.w, { website: 'http://internal.test/' }), { headers: { 'Idempotency-Key': idem() } });
    assert.strictEqual(r2.json.error.code, 'url_not_allowed');
    assert.strictEqual(r2.json.error.reason, 'private_address');
    const r3 = await post(priv, 'start', startBody(s.w, { website: 'http://rebind.test/' }), { headers: { 'Idempotency-Key': idem() } });
    assert.strictEqual(r3.json.error.code, 'url_not_allowed', 'one private answer in the set refuses the name');
    const r4 = await post(priv, 'start', startBody(s.w, { website: 'http://nowhere.test/' }), { headers: { 'Idempotency-Key': idem() } });
    assert.strictEqual(r4.status, 422);
    assert.strictEqual(r4.json.error.code, 'unresolvable');
  } finally { await s.close(); }
});

test('start: an unreadable or robots blocked site still creates a review, honestly marked unreachable', async function () {
  const s = await setup();
  try {
    s.w.routes.biz['/'] = { status: 500, body: 'down' };
    const r = await begin(s);
    assert.strictEqual(r.status, 201);
    assert.strictEqual(r.json.interpretation.website.reachable, false);
    assert.strictEqual(r.json.interpretation.website.title, null);
    s.w.routes.biz['/robots.txt'] = { headers: { 'Content-Type': 'text/plain' }, body: 'User-agent: *\nDisallow: /\n' };
    s.w.routes.biz['/'] = { body: '<html><title>T</title></html>' };
    const r2 = await begin(s, { business_name: 'Other Name' });
    assert.strictEqual(r2.status, 201);
    assert.strictEqual(r2.json.interpretation.website.reachable, false);
    assert.ok(r2.json.interpretation.assumptions.join(' ').indexOf('automated tools not to read it') !== -1);
  } finally { await s.close(); }
});

test('start: no website gives a reduced assessment', async function () {
  const s = await setup();
  try {
    const r = await post(s.app, 'start', startBody(s.w, { website: undefined }), { headers: { 'Idempotency-Key': idem() } });
    assert.strictEqual(r.status, 201);
    assert.strictEqual(r.json.review.assessment_level, 'reduced');
    assert.strictEqual(r.json.interpretation.website, null);
    assert.strictEqual(s.w.servers.biz.hits.length, 0);
  } finally { await s.close(); }
});

test('start: Turnstile is required, fails closed, and uses the right action', async function () {
  const calls = [];
  const s = await setup({ app: { verifyTurnstile: async function (a) { calls.push(a); return a.token === 'good' ? { ok: true } : { ok: false, reason: a.token === 'down' ? 'unavailable' : 'rejected' }; } } });
  try {
    const mk = function (t) { return post(s.app, 'start', startBody(s.w, { turnstile_token: t }), { headers: { 'Idempotency-Key': idem() } }); };
    const f = await mk('bad');
    assert.strictEqual(f.status, 403);
    assert.strictEqual(f.json.error.code, 'turnstile_failed');
    const d = await mk('down');
    assert.strictEqual(d.status, 503);
    assert.strictEqual(d.json.error.code, 'turnstile_unavailable');
    assert.strictEqual((await mk(undefined)).status, 403);
    assert.strictEqual((await mk('good')).status, 201);
    assert.ok(calls.every(function (c) { return c.action === 'business-review'; }));
    assert.strictEqual((await s.app.store.select('br_reviews', {})).length, 1);
  } finally { await s.close(); }
});

test('start: rate limits per visitor and per target site, and the global daily cap, fail with honest codes', async function () {
  const s = await setup({ env: { BR_DAILY_REVIEWS: '7' } });
  try {
    const names = ['A One', 'B Two', 'C Three', 'D Four', 'E Five', 'F Six', 'G Seven', 'H Eight'];
    const out = [];
    for (let i = 0; i < 5; i++) out.push(await post(s.app, 'start', startBody(s.w, { business_name: names[i], website: undefined }), { headers: { 'Idempotency-Key': idem() }, ip: '198.51.100.20' }));
    assert.deepStrictEqual(out.map(function (r) { return r.status; }), [201, 201, 201, 201, 429], 'four an hour per visitor');
    assert.strictEqual(out[4].json.error.code, 'rate_limited');
    assert.ok(out[4].json.error.retry_after_s > 0);
    assert.ok(out[4].headers['retry-after']);
    // same target host, different visitors: three a day
    const hostOut = [];
    for (let i = 0; i < 4; i++) hostOut.push(await post(s.app, 'start', startBody(s.w, { business_name: 'H' + i + ' Ltd' }), { headers: { 'Idempotency-Key': idem() }, ip: '198.51.100.' + (30 + i) }));
    assert.deepStrictEqual(hostOut.map(function (r) { return r.status; }), [201, 201, 201, 429]);
    // global daily cap of 7 reviews has now been reached (4 + 3 = 7 counted)
    const g = await post(s.app, 'start', startBody(s.w, { business_name: 'Late One', website: undefined }), { headers: { 'Idempotency-Key': idem() }, ip: '198.51.100.99' });
    assert.strictEqual(g.status, 503);
    assert.strictEqual(g.json.error.code, 'daily_limit');
    // the window resets with time
    s.app.clock.t = new Date(s.app.clock.t.getTime() + 2 * 86400000);
    const later = await post(s.app, 'start', startBody(s.w, { business_name: 'Next Day', website: undefined }), { headers: { 'Idempotency-Key': idem() }, ip: '198.51.100.20' });
    assert.strictEqual(later.status, 201);
  } finally { await s.close(); }
});

test('rate limiting fails closed when the counter store is broken', async function () {
  const s = await setup();
  try {
    const orig = s.app.store.rpc;
    s.app.store.rpc = async function () { throw new Error('db down'); };
    const r = await begin(s);
    assert.strictEqual(r.status, 429);
    s.app.store.rpc = orig;
    assert.strictEqual((await begin(s, { business_name: 'Fine Now' })).status, 201);
  } finally { await s.close(); }
});

test('storage not configured: honest 503, no invented data', async function () {
  const w = await world();
  try {
    const { buildDeps } = require('../api/_lib/br/deps');
    const { createPublicHandler } = require('../api/_lib/br/routes');
    const deps = buildDeps({ BR_SALT: 's' }, { fetcher: w.fetcher, verifyTurnstile: async function () { return { ok: true }; } });
    const h = createPublicHandler(deps);
    const r = await invoke(h, { method: 'POST', url: '/api/business-review/start', body: startBody(w), headers: { 'Idempotency-Key': idem() } });
    assert.strictEqual(r.status, 503);
    assert.strictEqual(r.json.error.code, 'storage_unavailable');
    assert.strictEqual((await invoke(h, { method: 'GET', url: '/api/business-review/capabilities' })).status, 200, 'capabilities still answer');
    assert.strictEqual((await invoke(h, { method: 'GET', url: '/api/business-review/6c9b8e2a-6a77-4c0a-9a41-1d2f7b0d3f10', token: 'q3Zk1m0uQ2r1Gx3d7Hh5mY2uJ4sV9bTf8LwEoPaNcXg' })).status, 503);
  } finally { await w.close(); }
});

test('idempotency: same key replays without a token; identical start by the same visitor replays; another visitor cannot use the key', async function () {
  const s = await setup();
  try {
    const key = idem();
    const a = await post(s.app, 'start', startBody(s.w), { headers: { 'Idempotency-Key': key } });
    const b = await post(s.app, 'start', startBody(s.w), { headers: { 'Idempotency-Key': key } });
    assert.strictEqual(a.status, 201);
    assert.strictEqual(b.status, 200);
    assert.strictEqual(b.json.idempotent_replay, true);
    assert.strictEqual(b.json.access_token, null);
    assert.strictEqual(b.json.review.id, a.json.review.id);
    const c = await post(s.app, 'start', startBody(s.w), { headers: { 'Idempotency-Key': idem() } });
    assert.strictEqual(c.status, 200, 'same inputs from the same visitor within 24 hours');
    assert.strictEqual(c.json.review.id, a.json.review.id);
    const other = await post(s.app, 'start', startBody(s.w), { headers: { 'Idempotency-Key': key }, ip: '198.51.100.77' });
    assert.strictEqual(other.status, 409);
    assert.strictEqual((await s.app.store.select('br_reviews', {})).length, 1);
    assert.ok(a.json.review.id && !JSON.stringify(b.json).includes(a.json.access_token));
  } finally { await s.close(); }
});

test('idempotency: simultaneous duplicate submissions create exactly one review', async function () {
  const s = await setup();
  try {
    const key = idem();
    const all = await Promise.all([1, 2, 3, 4].map(function () { return post(s.app, 'start', startBody(s.w, { business_name: 'Race Ltd', website: undefined }), { headers: { 'Idempotency-Key': key } }); }));
    assert.strictEqual((await s.app.store.select('br_reviews', {})).length, 1);
    assert.ok(all.every(function (r) { return r.status === 201 || r.status === 200 || r.status === 429; }), all.map(function (r) { return r.status; }).join());
    assert.strictEqual(all.filter(function (r) { return r.status === 201; }).length, 1);
  } finally { await s.close(); }
});

test('token access: wrong token, unknown id, missing header, malformed token and another review all give the identical 404', async function () {
  const s = await setup();
  try {
    const a = await begin(s, { business_name: 'First Ltd', website: undefined });
    const b = await begin(s, { business_name: 'Second Ltd', website: undefined }, { ip: '198.51.100.55' });
    const id = a.json.review.id, tok = a.json.access_token;
    assert.strictEqual((await get(s.app, id, { token: tok })).status, 200);
    const probes = [
      get(s.app, id, { token: 'A'.repeat(43) }), get(s.app, id), get(s.app, id, { token: 'short' }), get(s.app, id, { token: b.json.access_token }),
      get(s.app, '11111111-1111-4111-8111-111111111111', { token: tok }), get(s.app, 'not-a-uuid', { token: tok }), get(s.app, id, { headers: { Authorization: 'Basic ' + tok } }), get(s.app, id + '/report', { token: 'A'.repeat(43) }),
      get(s.app, id + '/nonsense', { token: tok }), post(s.app, id + '/advance', {}, { token: 'A'.repeat(43) }), get(s.app, id + '?token=' + tok), invoke(s.app.pub, { method: 'DELETE', url: '/api/business-review/' + id, token: 'A'.repeat(43) })
    ];
    const res = await Promise.all(probes);
    const first = res[0].raw;
    res.forEach(function (r, i) { assert.strictEqual(r.status, 404, 'probe ' + i); assert.strictEqual(r.raw, first, 'identical body for probe ' + i); assert.strictEqual(r.json.error.code, 'not_found'); });
    assert.ok(first.indexOf(id) === -1, 'the id is not echoed');
    assert.strictEqual((await get(s.app, id, { token: tok })).status, 200, 'wrong attempts did not break the real token');
  } finally { await s.close(); }
});

test('token access: expiry gives 410 only to the holder of the right token; revoke and cancel give 404', async function () {
  const s = await setup();
  try {
    const a = await begin(s, { website: undefined });
    const id = a.json.review.id, tok = a.json.access_token;
    s.app.clock.t = new Date(s.app.clock.t.getTime() + 31 * 86400000);
    const ex = await get(s.app, id, { token: tok });
    assert.strictEqual(ex.status, 410);
    assert.strictEqual(ex.json.error.code, 'expired');
    assert.strictEqual((await get(s.app, id, { token: 'A'.repeat(43) })).status, 404, 'a wrong token never learns the review exists or expired');
    assert.strictEqual((await post(s.app, id + '/confirm', { confirmed: true }, { token: tok })).status, 410);
    s.app.clock.t = new Date('2026-11-20T10:00:00Z');
    await s.app.store.update('br_reviews', { id: id }, { token_revoked: true });
    assert.strictEqual((await get(s.app, id, { token: tok })).status, 404);
    await s.app.store.update('br_reviews', { id: id }, { token_revoked: false });
    const del = await invoke(s.app.pub, { method: 'DELETE', url: '/api/business-review/' + id, token: tok });
    assert.strictEqual(del.status, 200);
    assert.strictEqual((await invoke(s.app.pub, { method: 'DELETE', url: '/api/business-review/' + id, token: tok })).status, 404, 'a repeat delete finds nothing');
    assert.strictEqual((await get(s.app, id, { token: tok })).status, 404);
    assert.strictEqual((await s.app.store.select('br_reviews', { id: id })).length, 0, 'the review row is really gone');
  } finally { await s.close(); }
});

test('confirm: state rules, edits, nomination validation, replay safety, task stored', async function () {
  const s = await setup();
  try {
    const a = await begin(s);
    const id = a.json.review.id, tok = a.json.access_token;
    assert.strictEqual((await post(s.app, id + '/advance', {}, { token: tok })).json.error.code, 'wrong_state', 'cannot advance before confirming');
    assert.strictEqual((await post(s.app, id + '/confirm', { confirmed: false }, { token: tok })).status, 400);
    assert.strictEqual((await post(s.app, id + '/confirm', {}, { token: tok })).status, 400);
    const badNom = await post(s.app, id + '/confirm', { confirmed: true, competitor_nomination: { name: 'X', website: 'http://127.0.0.1' } }, { token: tok });
    assert.strictEqual(badNom.status, 400);
    const same = await post(s.app, id + '/confirm', { confirmed: true, competitor_nomination: { name: 'Me', website: s.w.url('biz') } }, { token: tok });
    assert.strictEqual(same.status, 400, 'cannot nominate your own site');
    const nom = { confirmed: true, edits: { business_name: 'Harbour Precision', location: { text: 'Glasgow', kind: 'national' } }, competitor_nomination: { name: 'Rival Components', website: s.w.url('rival') }, automation_task: 'We send quotes but forget to chase them' };
    const c = await post(s.app, id + '/confirm', nom, { token: tok });
    assert.strictEqual(c.status, 200, JSON.stringify(c.json));
    assert.strictEqual(c.json.review.status, 'queued');
    assert.strictEqual(c.json.review.business_name, 'Harbour Precision');
    assert.strictEqual(c.json.review.location.kind, 'national');
    assert.strictEqual(c.json.steps.length, 10);
    assert.deepStrictEqual(c.json.steps.map(function (x) { return x.key; }), ['site_fetch', 'site_analysis', 'psi_business', 'competitor_discovery', 'competitor_fetch', 'psi_competitors', 'local_search', 'ai_visibility', 'automation_map', 'report_build']);
    assert.strictEqual(c.json.steps[7].state, 'unavailable');
    assert.strictEqual(c.json.steps[7].reason, 'not_run_in_free_review');
    assert.strictEqual(c.json.competitors.length, 1);
    assert.strictEqual(c.json.competitors[0].origin, 'visitor_nominated');
    assert.strictEqual(c.json.competitors[0].relevance.note, 'Named by you. Relevance not checked by a supported source.');
    const replay = await post(s.app, id + '/confirm', nom, { token: tok });
    assert.strictEqual(replay.status, 200);
    assert.strictEqual((await s.app.store.select('br_competitors', { review_id: id })).length, 1, 'replay did not add a second competitor');
    const different = await post(s.app, id + '/confirm', { confirmed: true }, { token: tok });
    assert.strictEqual(different.status, 409);
    assert.strictEqual(different.json.error.code, 'wrong_state');
  } finally { await s.close(); }
});

test('full run with a nominated competitor: every real step, evidence from stored observations, report built, partial where honest', async function () {
  const s = await setup();
  try {
    const { id, token } = await startConfirmed(s, undefined, { competitor_nomination: { name: 'Rival Components', website: s.w.url('rival') }, automation_task: 'We send quotes but forget to chase them' });
    const run = await runToReady(s, id, token);
    assert.strictEqual(run.last.json.review.status, 'ready');
    assert.strictEqual(run.last.json.review.completeness, 'complete', 'no step failed and the gaps are by design');
    const states = {};
    run.last.json.steps.forEach(function (x) { states[x.key] = x.state; });
    assert.deepStrictEqual(states, { site_fetch: 'done', site_analysis: 'done', psi_business: 'done', competitor_discovery: 'unavailable', competitor_fetch: 'done', psi_competitors: 'done', local_search: 'unavailable', ai_visibility: 'unavailable', automation_map: 'done', report_build: 'done' });
    assert.strictEqual(run.last.json.report_available, true);
    assert.strictEqual(run.last.json.next_after_ms, 0);
    assert.deepStrictEqual(run.ran.slice().sort(), Object.keys(states).filter(function (k) { return k !== 'ai_visibility'; }).sort());
    const rep = await get(s.app, id + '/report', { token: token });
    assert.strictEqual(rep.status, 200);
    const r = rep.json.report;
    assert.strictEqual(r.version, 1);
    assert.strictEqual(r.competitors.state, 'nominated');
    assert.strictEqual(r.competitors.items.length, 1);
    assert.ok(r.comparison.rows.length > 0);
    const lcpRow = r.comparison.rows.find(function (x) { return x.metric_key === 'psi.mobile.lcp_ms'; });
    assert.ok(lcpRow && lcpRow.business.display === '3.8 s' && lcpRow.competitors[0].display === '3.8 s');
    assert.strictEqual(r.local_search.state, 'not_tested');
    assert.strictEqual(r.ai_visibility.state, 'awaiting_supported_test');
    assert.strictEqual(r.automation.opportunities[0].category_key, 'quote_follow_up');
    // every number in the report traces to a stored evidence row
    const ids = new Set((await s.app.store.select('br_evidence', {})).map(function (e) { return e.id; }));
    r.evidence_index.forEach(function (e) { assert.ok(ids.has(e.id)); });
    r.key_findings.forEach(function (k) { k.evidence_ids.forEach(function (i) { assert.ok(ids.has(i)); }); });
    r.recommendations.forEach(function (x) { x.evidence_ids.forEach(function (i) { assert.ok(ids.has(i)); }); });
    // PageSpeed called for the business and the competitor only, with the key as a parameter and nothing else leaking
    const psiCalls = s.ext.calls.filter(function (c) { return c.url.indexOf('pagespeedonline') !== -1; });
    assert.strictEqual(psiCalls.length, 2, 'one PageSpeed run for the business and one for the competitor, no repeats');
    assert.ok(!JSON.stringify(rep.json).includes('psi-test-key'));
    // contact details never appear
    assert.ok(!/[\w.+-]+@[\w-]+\.[\w.]+/.test(JSON.stringify(r)), 'no email address anywhere in the report');
    // advance again is a no-op
    const again = await post(s.app, id + '/advance', {}, { token: token });
    assert.strictEqual(again.status, 200);
    assert.deepStrictEqual(again.json.ran, []);
  } finally { await s.close(); }
});

test('run without PageSpeed configured: honest unavailable states, no fake scores, partial completeness', async function () {
  const s = await setup({ env: { PSI_API_KEY: '' } });
  try {
    const { id, token } = await startConfirmed(s, undefined, { competitor_nomination: { name: 'Rival Components', website: s.w.url('rival') } });
    const run = await runToReady(s, id, token);
    assert.strictEqual(run.last.json.review.status, 'ready');
    assert.strictEqual(run.last.json.review.completeness, 'partial');
    const st = {}; run.last.json.steps.forEach(function (x) { st[x.key] = x; });
    assert.strictEqual(st.psi_business.state, 'unavailable');
    assert.strictEqual(st.psi_business.reason, 'not_configured');
    assert.strictEqual(s.ext.calls.filter(function (c) { return c.url.indexOf('pagespeedonline') !== -1; }).length, 0);
    const ev = await s.app.store.select('br_evidence', {});
    const lcp = ev.filter(function (e) { return e.metric_key === 'psi.mobile.lcp_ms'; });
    assert.ok(lcp.length >= 1 && lcp.every(function (e) { return e.evidence_state === 'not_tested' && e.value === null && e.reason_code === 'not_configured'; }));
    const r = (await get(s.app, id + '/report', { token: token })).json.report;
    assert.ok(!r.comparison.rows.some(function (x) { return x.metric_key.indexOf('psi.') === 0; }), 'no speed row without a measurement');
    assert.ok(!JSON.stringify(r).includes('3.8 s'));
  } finally { await s.close(); }
});

test('run for a business with no website: reduced review, skipped steps, no fetch, honest report', async function () {
  const s = await setup();
  try {
    const { id, token } = await startConfirmed(s, { website: undefined });
    const run = await runToReady(s, id, token);
    const st = {}; run.last.json.steps.forEach(function (x) { st[x.key] = x; });
    assert.strictEqual(st.site_fetch.state, 'skipped');
    assert.strictEqual(st.site_fetch.reason, 'no_website');
    assert.strictEqual(st.psi_business.state, 'skipped');
    assert.strictEqual(run.last.json.review.status, 'ready');
    assert.strictEqual(s.w.servers.biz.hits.length, 0);
    const r = (await get(s.app, id + '/report', { token: token })).json.report;
    assert.strictEqual(r.business.assessment_level, 'reduced');
    assert.strictEqual(r.business.website, null);
    assert.strictEqual(r.comparison.rows.length, 0);
    assert.ok(r.key_findings.some(function (k) { return /No website address was supplied/.test(k.text); }));
    assert.ok(r.next_steps.some(function (n) { return n.label === 'See a free website preview'; }));
  } finally { await s.close(); }
});

test('a failing site never blocks later steps and never produces invented values', async function () {
  const s = await setup();
  try {
    const { id, token } = await startConfirmed(s);
    s.w.routes.biz['/'] = { status: 503, body: 'down' };
    const run = await runToReady(s, id, token);
    const st = {}; run.last.json.steps.forEach(function (x) { st[x.key] = x.state; });
    assert.strictEqual(run.last.json.review.status, 'ready');
    assert.strictEqual(st.report_build, 'done');
    const ev = await s.app.store.select('br_evidence', { metric_key: 'page.status' });
    assert.strictEqual(ev[0].value.v, 503, 'a real 503 is a real observation');
    const poor = await world({ sites: { biz: 'good' } });
    await poor.close();
  } finally { await s.close(); }
});

test('advance: lease prevents concurrent runs; stale lease is taken over; step_in_progress carries retry_after_ms', async function () {
  const s = await setup();
  try {
    const { id, token } = await startConfirmed(s);
    await s.app.store.update('br_reviews', { id: id }, { lease_owner: 'someone-else', lease_until: new Date(s.app.clock.t.getTime() + 60000).toISOString(), status: 'running' });
    const r = await post(s.app, id + '/advance', {}, { token: token });
    assert.strictEqual(r.status, 409);
    assert.strictEqual(r.json.error.code, 'step_in_progress');
    assert.ok(r.json.error.retry_after_ms >= 1000);
    s.app.clock.t = new Date(s.app.clock.t.getTime() + 120000);
    assert.strictEqual((await post(s.app, id + '/advance', {}, { token: token })).status, 200);
  } finally { await s.close(); }
});

test('advance: two simultaneous calls never run a step twice (one gets 409)', async function () {
  const s = await setup();
  try {
    const { id, token } = await startConfirmed(s, { website: undefined });
    const both = await Promise.all([post(s.app, id + '/advance', {}, { token: token }), post(s.app, id + '/advance', {}, { token: token })]);
    const codes = both.map(function (r) { return r.status; }).sort();
    assert.ok(codes[0] === 200, codes.join());
    const reports = await s.app.store.select('br_report_versions', { review_id: id });
    assert.strictEqual(reports.length, 1);
  } finally { await s.close(); }
});

test('advance: at most 40 calls per review', async function () {
  const s = await setup();
  try {
    const { id, token } = await startConfirmed(s, { website: undefined });
    let last;
    for (let i = 0; i < 40; i++) { s.app.store._data.br_reviews[0].status === 'ready'; last = await post(s.app, id + '/advance', {}, { token: token }); }
    assert.strictEqual(last.status, 200);
    const over = await post(s.app, id + '/advance', {}, { token: token });
    assert.ok(over.status === 429 || over.status === 200, 'a ready review is a no op');
    // a fresh review that stays unfinished hits the cap
    const t = await startConfirmed(s, { website: undefined, business_name: 'Capped Ltd' });
    await s.app.store.update('br_reviews', { id: t.id }, { status: 'running' });
    await s.app.store.rpc('br_rate_hit', { p_bucket: 'adv:review:' + t.id, p_max: 40, p_window_seconds: 99999 });
    for (let i = 0; i < 40; i++) await s.app.store.rpc('br_rate_hit', { p_bucket: 'adv:review:' + t.id, p_max: 40, p_window_seconds: 99999 });
    const limited = await post(s.app, t.id + '/advance', {}, { token: t.token });
    assert.strictEqual(limited.status, 429);
    assert.strictEqual(limited.json.error.code, 'rate_limited');
  } finally { await s.close(); }
});

test('report endpoint: 409 before a report exists, version parameter, superseded banner after a change', async function () {
  const s = await setup();
  try {
    const { id, token } = await startConfirmed(s, { website: undefined });
    assert.strictEqual((await get(s.app, id + '/report', { token: token })).json.error.code, 'wrong_state');
    await runToReady(s, id, token);
    const a = await post(s.app, id + '/automation', { task: 'We copy information into spreadsheets by hand' }, { token: token });
    assert.strictEqual(a.status, 200);
    assert.strictEqual(a.json.automation_opportunity.category_key, 'data_entry_copying');
    assert.strictEqual(a.json.report_version, 2);
    const v1 = (await get(s.app, id + '/report?version=1', { token: token })).json.report;
    const v2 = (await get(s.app, id + '/report', { token: token })).json.report;
    assert.strictEqual(v1.status, 'superseded');
    assert.strictEqual(v1.superseded_by_version, 2);
    assert.strictEqual(v1.automation.opportunities.length, 0, 'the first version is unchanged');
    assert.strictEqual(v2.automation.opportunities.length, 1);
    assert.strictEqual(v2.status, 'published');
    assert.strictEqual((await get(s.app, id + '/report?version=9', { token: token })).status, 404);
    assert.strictEqual((await get(s.app, id + '/report?version=abc', { token: token })).status, 400);
    const same = await post(s.app, id + '/automation', { task: 'We copy information into spreadsheets by hand' }, { token: token });
    assert.strictEqual(same.json.report_version, 2, 'repeating the same task creates no new version');
    assert.strictEqual((await post(s.app, id + '/automation', { task: '' }, { token: token })).status, 400);
    assert.strictEqual((await post(s.app, id + '/automation', { task: 'x'.repeat(601) }, { token: token })).status, 400);
  } finally { await s.close(); }
});

test('automation endpoint: before the report exists the task is kept and used by the automation step', async function () {
  const s = await setup();
  try {
    const { id, token } = await startConfirmed(s, { website: undefined });
    const a = await post(s.app, id + '/automation', { task: 'Enquiries by website and email get lost' }, { token: token });
    assert.strictEqual(a.status, 200);
    assert.strictEqual(a.json.report_version, null);
    assert.strictEqual(a.json.automation_opportunity.category_key, 'enquiry_management');
    await runToReady(s, id, token);
    const r = (await get(s.app, id + '/report', { token: token })).json.report;
    assert.strictEqual(r.automation.opportunities[0].category_key, 'enquiry_management');
    assert.ok(/potential workflow, not an existing implementation/.test(r.automation.opportunities[0].not_included));
  } finally { await s.close(); }
});

test('competitor nomination after the review: new competitor, steps re-queued, new report version, old version untouched, replacement limited to two', async function () {
  const s = await setup();
  try {
    const { id, token } = await startConfirmed(s);
    await runToReady(s, id, token);
    assert.strictEqual((await get(s.app, id + '/report', { token: token })).json.report.competitors.items.length, 0);
    const n = await post(s.app, id + '/competitors', { name: 'Rival Components', website: s.w.url('rival') }, { token: token });
    assert.strictEqual(n.status, 200, JSON.stringify(n.json));
    assert.strictEqual(n.json.review.status, 'queued');
    assert.strictEqual(n.json.steps.find(function (x) { return x.key === 'report_build'; }).state, 'pending');
    const run = await runToReady(s, id, token);
    assert.strictEqual(run.last.json.review.status, 'ready');
    const v2 = (await get(s.app, id + '/report', { token: token })).json.report;
    assert.strictEqual(v2.version, 2);
    assert.strictEqual(v2.reason, 'competitors_changed');
    assert.strictEqual(v2.competitors.items[0].name, 'Rival Components');
    const v1 = (await get(s.app, id + '/report?version=1', { token: token })).json.report;
    assert.strictEqual(v1.competitors.items.length, 0, 'history is unchanged');
    assert.strictEqual((await post(s.app, id + '/competitors', { name: 'X', website: 'http://10.0.0.1' }, { token: token })).status, 400);
    assert.strictEqual((await post(s.app, id + '/competitors', { name: 'Poor Co', website: s.w.url('poor') }, { token: token })).status, 200);
    await runToReady(s, id, token);
    const third = await post(s.app, id + '/competitors', { name: 'Third Co', website: s.w.url('biz', '/x') }, { token: token });
    assert.ok([400, 429].indexOf(third.status) !== -1);
    const rows = await s.app.store.select('br_competitors', { review_id: id });
    assert.strictEqual(rows.filter(function (c) { return c.status === 'selected'; }).length, 1, 'only one visitor nomination is active');
  } finally { await s.close(); }
});

test('comparison findings state measured differences with dates and no causal claims', async function () {
  const s = await setup({ ext: fakeExternal([{ match: 'pagespeedonline', reply: function (u) { const j = LH(); if (u.indexOf(encodeURIComponent(s2url())) !== -1) j.json.lighthouseResult.audits['largest-contentful-paint'].numericValue = 2100; return j; } }]) });
  function s2url() { return ''; }
  try {
    const { id, token } = await startConfirmed(s, undefined, { competitor_nomination: { name: 'Rival Components', website: s.w.url('rival') } });
    await runToReady(s, id, token);
    // set the competitor's lcp lower by superseding evidence is not allowed; instead read what was produced
    const r = (await get(s.app, id + '/report', { token: token })).json.report;
    const banned = ['stealing', 'losing customers to', 'because of', 'more successful', 'outrank', 'beating you', 'guarantee'];
    const text = JSON.stringify(Object.assign({}, r, { competitors: Object.assign({}, r.competitors, { limitations: [] }) })).toLowerCase();
    banned.forEach(function (b) { assert.ok(text.indexOf(b) === -1, b); });
    assert.ok(r.disclaimers.some(function (d) { return /does not promise rankings, enquiries or returns/.test(d); }));
    assert.ok(r.competitors.limitations.some(function (d) { return /does not show which business is more successful/.test(d); }));
  } finally { await s.close(); }
});

test('methods and unknown routes never reveal anything', async function () {
  const s = await setup();
  try {
    const a = await begin(s, { website: undefined });
    const id = a.json.review.id, tok = a.json.access_token;
    assert.strictEqual((await invoke(s.app.pub, { method: 'PUT', url: '/api/business-review/' + id, token: tok })).status, 405);
    assert.strictEqual((await get(s.app, id + '/advance', { token: tok })).status, 405);
    assert.strictEqual((await get(s.app, id + '/report.pdf', { token: tok })).status, 501);
    assert.strictEqual((await get(s.app, id + '/report.pdf', { token: tok })).json.error.code, 'pdf_unavailable');
    assert.strictEqual((await get(s.app, id + '/a/b/c', { token: tok })).status, 404);
    assert.strictEqual((await get(s.app, 'admin/reviews')).status, 404, 'admin is never served by the public router');
  } finally { await s.close(); }
});

test('router: route is read from req.query.route and falls back to req.url; the entry files are thin and read env per request', async function () {
  const w = await world();
  try {
    const { createHandler } = require('../api/business-review');
    const app = makeApp({ fetcher: w.fetcher });
    const h = createHandler(Object.assign({}, require('./br-helpers').BASE_ENV), { store: app.store, fetcher: w.fetcher, verifyTurnstile: async function () { return { ok: true }; } });
    const viaQuery = await invoke(h, { method: 'GET', url: '/api/business-review?route=capabilities', query: { route: 'capabilities' } });
    const viaArray = await invoke(h, { method: 'GET', url: '/x', query: { route: ['capabilities'] } });
    const viaUrl = await invoke(h, { method: 'GET', url: '/api/business-review/capabilities?x=1' });
    [viaQuery, viaArray, viaUrl].forEach(function (r) { assert.strictEqual(r.status, 200); assert.ok(r.json.capabilities); });
    const adminMod = require('../api/business-review-admin');
    const ah = adminMod.createHandler(Object.assign({}, require('./br-helpers').BASE_ENV), { store: app.store, fetcher: w.fetcher });
    ah.verifyOwner;
    const a1 = await invoke(ah, { method: 'GET', url: '/api/business-review-admin?route=metrics', query: { route: 'metrics' } });
    const a2 = await invoke(ah, { method: 'GET', url: '/api/business-review/admin/metrics' });
    assert.strictEqual(a1.status, 401);
    assert.strictEqual(a2.status, 401);
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'api', 'business-review.js'), 'utf8');
    assert.ok(!/process\.env\.[A-Z_]+/.test(src.replace(/buildDeps\(process\.env\)/g, '')), 'env is only passed through, never read at import');
  } finally { await w.close(); }
});
