'use strict';
// Package A: replays, crashes, duplicate and concurrent work never duplicate evidence, reports or paid calls. Run with: node --test
const test = require('node:test');
const assert = require('node:assert');
const { makeApp, invoke, world, fakeExternal } = require('./br-helpers');
const { recordEvidence } = require('../api/_lib/br/evidence');
const { callProvider, registry } = require('../api/_lib/br/providers/index');
const { loadConfig } = require('../api/_lib/br/config');
const { createMemoryStore } = require('../api/_lib/br/db');
const steps = require('../api/_lib/br/steps');
const V = require('../api/_lib/br/validate');

const LH = function () { return { status: 200, json: { lighthouseResult: { fetchTime: '2026-11-20T10:00:05.000Z', lighthouseVersion: '12.3.0', requestedUrl: 'u', finalUrl: 'u', configSettings: {}, categories: { performance: { score: 0.6 }, seo: { score: 0.9 }, accessibility: { score: 0.85 }, 'best-practices': { score: 1 } }, audits: { 'largest-contentful-paint': { numericValue: 3800 }, 'cumulative-layout-shift': { numericValue: 0.05 }, 'total-blocking-time': { numericValue: 150 }, 'first-contentful-paint': { numericValue: 1500 }, 'speed-index': { numericValue: 3000 } } } } }; };
let n = 0;
const key = function () { n++; return '00000000-0000-4000-8000-' + String(5000000 + n).padStart(12, '0'); };
async function ready() {
  const w = await world();
  const ext = fakeExternal([{ match: 'pagespeedonline', reply: LH }]);
  const app = makeApp({ fetcher: w.fetcher, fetchImpl: ext, env: { PSI_API_KEY: 'k' } });
  const s = await invoke(app.pub, { method: 'POST', url: '/api/business-review/start', body: { business_name: 'X Ltd', website: w.url('biz'), location: { text: 'Glasgow', kind: 'local' }, category: 'CNC machining', turnstile_token: 't' }, headers: { 'Idempotency-Key': key() } });
  const id = s.json.review.id, token = s.json.access_token;
  await invoke(app.pub, { method: 'POST', url: '/api/business-review/' + id + '/confirm', body: { confirmed: true, competitor_nomination: { name: 'Rival', website: w.url('rival') } }, token: token });
  for (let i = 0; i < 12; i++) { const r = await invoke(app.pub, { method: 'POST', url: '/api/business-review/' + id + '/advance', body: {}, token: token }); if (r.json.review.status === 'ready') break; }
  return { w: w, app: app, ext: ext, id: id, token: token, close: w.close };
}

test('re-running every step after a crash duplicates no evidence, no provider call and no report version', async function () {
  const c = await ready();
  try {
    const evBefore = (await c.app.store.select('br_evidence', {})).length;
    const callsBefore = (await c.app.store.select('br_provider_calls', {})).length;
    const fetchBefore = c.ext.calls.length;
    const hitsBefore = c.w.servers.biz.hits.length + c.w.servers.rival.hits.length;
    const rv = (await c.app.store.select('br_reviews', {}))[0];
    // simulate: the review died before saving any step state
    await c.app.store.update('br_reviews', { id: c.id }, { status: 'running', completed_at: null, steps: rv.steps.map(function (s) { return s.key === 'ai_visibility' ? s : Object.assign({}, s, { state: 'pending', finished_at: null, started_at: null, reason: null, message: '' }); }), lease_until: null });
    const run = await invoke(c.app.pub, { method: 'POST', url: '/api/business-review/' + c.id + '/advance', body: {}, token: c.token });
    assert.strictEqual(run.status, 200);
    for (let i = 0; i < 6 && run.json.review.status !== 'ready'; i++) await invoke(c.app.pub, { method: 'POST', url: '/api/business-review/' + c.id + '/advance', body: {}, token: c.token });
    assert.strictEqual((await c.app.store.select('br_evidence', {})).length, evBefore, 'evidence rows are not duplicated');
    assert.strictEqual((await c.app.store.select('br_provider_calls', {})).length, callsBefore, 'no new provider call rows');
    assert.strictEqual(c.ext.calls.length, fetchBefore, 'PageSpeed is not called again');
    assert.strictEqual(c.w.servers.biz.hits.length + c.w.servers.rival.hits.length, hitsBefore, 'the sites are not crawled again (the stored crawl is reused)');
    assert.strictEqual((await c.app.store.select('br_report_versions', {})).length, 1, 'unchanged evidence gives no new report version');
    assert.strictEqual((await c.app.store.select('br_reviews', {}))[0].status, 'ready');
  } finally { await c.close(); }
});

test('a lease left by a crashed worker expires and the review resumes; its step states survive', async function () {
  const w = await world();
  const app = makeApp({ fetcher: w.fetcher, env: { PSI_API_KEY: '' } });
  try {
    const s = await invoke(app.pub, { method: 'POST', url: '/api/business-review/start', body: { business_name: 'X Ltd', location: { text: 'Glasgow', kind: 'local' }, category: 'Plumber', turnstile_token: 't' }, headers: { 'Idempotency-Key': key() } });
    const id = s.json.review.id, token = s.json.access_token;
    await invoke(app.pub, { method: 'POST', url: '/api/business-review/' + id + '/confirm', body: { confirmed: true }, token: token });
    await app.store.update('br_reviews', { id: id }, { status: 'running', lease_owner: 'dead-worker', lease_until: new Date(app.clock.t.getTime() + 70000).toISOString() });
    assert.strictEqual((await invoke(app.pub, { method: 'POST', url: '/api/business-review/' + id + '/advance', body: {}, token: token })).json.error.code, 'step_in_progress');
    app.clock.t = new Date(app.clock.t.getTime() + 71000);
    const r = await invoke(app.pub, { method: 'POST', url: '/api/business-review/' + id + '/advance', body: {}, token: token });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.json.review.status, 'ready');
  } finally { await w.close(); }
});

test('concurrent identical evidence writes produce one row; concurrent report builds produce one version', async function () {
  const store = createMemoryStore();
  const rv = await store.insert('br_reviews', { ref: 'BR-CCCCCCCC', business_name: 'X', location_text: 'Y', category: 'Z', input_hash: 'h', visitor_hash: 'v', token_hash: '\\xcc', token_expires_at: '2027-01-01T00:00:00Z', purge_after: '2027-03-01T00:00:00Z', steps: [], inputs: {} });
  const d = { metric_key: 'page.status', state: 'verified_public_observation', value: 200, observed_at: '2026-11-20T10:00:00Z', source: { kind: 'own_fetch', name: 'n' } };
  await Promise.all([1, 2, 3, 4, 5].map(function () { return recordEvidence(store, rv.id, d); }));
  assert.strictEqual((await store.select('br_evidence', {})).length, 1);
  const deps = { store: store, cfg: loadConfig({}), now: function () { return new Date('2026-11-20T11:00:00Z'); } };
  const results = await Promise.all([1, 2, 3].map(function () { return steps.buildAndStoreReport(deps, rv, { reason: 'initial' }); }));
  assert.strictEqual((await store.select('br_report_versions', {})).length, 1);
  assert.ok(results.every(function (r) { return r.version === 1; }));
});

test('two simultaneous calls with the same key reach the provider once and spend once', async function () {
  const store = createMemoryStore();
  const ext = fakeExternal([{ match: 'pagespeedonline', reply: async function () { await new Promise(function (r) { setTimeout(r, 30); }); return LH(); } }]);
  const d = { store: store, cfg: loadConfig({ PSI_API_KEY: 'k', BR_PSI_DAILY_CALLS: '5' }), registry: registry(), fetchImpl: ext };
  const call = function () { return callProvider(d, { id: 'pagespeed', operation: 'run_pagespeed', request: { url: 'https://a.example/', strategy: 'mobile' }, idempotencyKey: 'same-key', cacheTtlS: 0 }); };
  const out = await Promise.all([call(), call(), call()]);
  assert.strictEqual(ext.calls.length, 1);
  assert.strictEqual(out.filter(function (r) { return r.ok && !r.replay; }).length, 1);
  assert.strictEqual((await store.select('br_budget', {}))[0].calls, 1, 'the budget was spent once');
});

test('budget counter: atomic spend stops exactly at the cap, refuses oversize amounts and never spends on refusal', async function () {
  const store = createMemoryStore();
  const spend = function (p, c) { return store.rpc('br_budget_spend', { p_provider: 'x', p_pence: p, p_daily_cap_pence: c }); };
  assert.strictEqual(await spend(4, 10), true);
  assert.strictEqual(await spend(4, 10), true);
  assert.strictEqual(await spend(4, 10), false);
  assert.strictEqual((await store.select('br_budget', {}))[0].pence_used, 8);
  assert.strictEqual(await spend(2, 10), true);
  assert.strictEqual(await spend(1, 10), false);
  assert.strictEqual(await spend(1, 0), false, 'a cap of zero means off');
  assert.strictEqual(await spend(-1, 10), false);
  assert.strictEqual(await spend(11, 10), false);
  const results = await Promise.all(Array.from({ length: 20 }, function () { return store.rpc('br_budget_spend', { p_provider: 'y', p_pence: 1, p_daily_cap_pence: 7 }); }));
  assert.strictEqual(results.filter(Boolean).length, 7);
});

test('rate counter: fixed window, atomic hits, reset after the window', async function () {
  let t = new Date('2026-11-20T10:00:00Z');
  const store = createMemoryStore({ now: function () { return t; } });
  const hit = function () { return store.rpc('br_rate_hit', { p_bucket: 'b', p_max: 3, p_window_seconds: 60 }); };
  assert.deepStrictEqual((await Promise.all([hit(), hit(), hit(), hit()])).map(function (r) { return r.allowed; }).sort(), [false, true, true, true]);
  const blocked = await hit();
  assert.strictEqual(blocked.allowed, false);
  assert.ok(blocked.retry_after_s > 0 && blocked.retry_after_s <= 60);
  t = new Date(t.getTime() + 61000);
  assert.strictEqual((await hit()).allowed, true);
  await assert.rejects(store.rpc('br_rate_hit', { p_bucket: 'b', p_max: 0, p_window_seconds: 60 }));
});

test('input validators survive hostile strings in bounded time and never throw', function () {
  const nasty = ['a'.repeat(100000), '@'.repeat(100000), ('a.'.repeat(5000)) + 'b@' + 'c.'.repeat(5000), '"'.repeat(5000), ' '.repeat(100000) + 'x', 'x@' + 'a-'.repeat(3000) + '.com', '\u0000'.repeat(1000), '😀'.repeat(50000), '<'.repeat(100000), '%'.repeat(100000), '\r\n'.repeat(1000)];
  const t0 = Date.now();
  nasty.forEach(function (s) {
    assert.doesNotThrow(function () {
      V.validEmail(s);
      V.validateStart({ business_name: s, category: s, location: { text: s, kind: 'local' }, goals: [s], website: s });
      V.validateRequestReport({ email: s, name: s });
      V.validateDiscussion({ name: s, email: s, phone: s, message: s, service_interest: [s], consent: { follow_up_contact: true } });
      V.validateTask({ task: s });
      V.validateConfirm({ confirmed: true, edits: { business_name: s, website: s }, competitor_nomination: { name: s, website: s }, automation_task: s });
    });
  });
  assert.ok(Date.now() - t0 < 5000, 'validators are linear time: ' + (Date.now() - t0) + ' ms');
  assert.strictEqual(V.validEmail('a@b.co'), true);
  assert.strictEqual(V.maskEmail('alex@x.example'), 'a***@x.example');
});
