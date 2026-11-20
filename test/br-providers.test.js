'use strict';
// Package A: provider gate, PageSpeed, discovery, AI visibility boundary and caps. Everything is stubbed; no real service is called.
const test = require('node:test');
const assert = require('node:assert');
const { createMemoryStore } = require('../api/_lib/br/db');
const { loadConfig } = require('../api/_lib/br/config');
const { callProvider, providerStatuses, registry } = require('../api/_lib/br/providers/index');
const psi = require('../api/_lib/br/providers/psi');
const places = require('../api/_lib/br/providers/places');
const discovery = require('../api/_lib/br/discovery');
const aiv = require('../api/_lib/br/ai-visibility');
const { buildRow } = require('../api/_lib/br/evidence');
const { generateQuestions } = require('../api/_lib/br/questions');
const { fakeExternal } = require('./br-helpers');

const NOW = new Date('2026-11-20T10:00:00Z');
function env(extra) { return Object.assign({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'svc', BR_SALT: 's' }, extra || {}); }
function deps(e, ext) {
  const store = createMemoryStore({ now: function () { return NOW; } });
  return { store: store, cfg: loadConfig(env(e)), registry: registry(), fetchImpl: ext || fakeExternal([]), now: function () { return NOW; } };
}
async function review(d, o) {
  return d.store.insert('br_reviews', Object.assign({ ref: 'BR-AAAAAAAA', business_name: 'Harbour Precision Ltd', website_url: 'https://harbour.example/', website_host: 'harbour.example', location_text: 'Glasgow', location_kind: 'regional', category: 'CNC machining', input_hash: 'h', visitor_hash: 'v', token_hash: '\\x' + Math.random().toString(16).slice(2), token_expires_at: '2026-12-20T00:00:00Z', purge_after: '2027-02-20T00:00:00Z' }, o || {}));
}
function lighthouse(over) {
  const o = over || {};
  return { status: 200, json: { lighthouseResult: { fetchTime: '2026-11-20T10:00:05.000Z', lighthouseVersion: '12.3.0', requestedUrl: 'https://harbour.example/', finalUrl: 'https://www.harbour.example/',
    configSettings: { formFactor: 'mobile', throttlingMethod: 'simulate', locale: 'en-GB' }, runWarnings: [],
    categories: { performance: { score: o.perf === undefined ? 0.61 : o.perf }, seo: { score: 0.92 }, accessibility: { score: 0.88 }, 'best-practices': { score: 1 } },
    audits: { 'largest-contentful-paint': { numericValue: 3820.4 }, 'cumulative-layout-shift': { numericValue: 0.12 }, 'total-blocking-time': { numericValue: 310 }, 'first-contentful-paint': { numericValue: 1900 }, 'speed-index': { numericValue: 4100 }, 'server-response-time': { numericValue: 400 } } },
    loadingExperience: { metrics: {} }, secretEcho: 'SHOULD-NOT-BE-STORED' } };
}
const PSI_OK = [{ match: 'googleapis.com/pagespeedonline', reply: function () { return lighthouse(); } }];
const call = function (d, o) { return callProvider(d, Object.assign({ id: 'pagespeed', operation: 'run_pagespeed', request: { url: 'https://harbour.example/', strategy: 'mobile' }, idempotencyKey: 'k1', cacheTtlS: 86400 }, o)); };

test('psi: without a key it is not_configured, makes no network call and never uses the shared pool', async function () {
  const ext = fakeExternal(PSI_OK);
  const d = deps({}, ext);
  const rv = await review(d);
  const r = await call(d, { reviewId: rv.id });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.state, 'not_configured');
  assert.strictEqual(ext.calls.length, 0);
  const rows = await d.store.select('br_provider_calls', {});
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].status, 'unavailable');
  const drafts = psi.failureDrafts('not_configured', { url: 'https://harbour.example/', observedAt: NOW.toISOString() });
  drafts.forEach(function (x) { const row = buildRow(rv.id, x); assert.strictEqual(row.evidence_state, 'not_tested'); assert.strictEqual(row.value, null); assert.strictEqual(row.reason_code, 'not_configured'); });
});

test('psi: BR_PSI=0 is a kill switch; zero daily calls is exhausted', async function () {
  const ext = fakeExternal(PSI_OK);
  assert.strictEqual((await call(deps({ PSI_API_KEY: 'k', BR_PSI: '0' }, ext))).state, 'disabled');
  assert.strictEqual((await call(deps({ PSI_API_KEY: 'k', BR_PSI_DAILY_CALLS: '0' }, ext))).state, 'budget_exhausted');
  assert.strictEqual(ext.calls.length, 0);
});

test('psi: a successful call stores only the trimmed summary, never the key, and yields verified evidence with the test settings', async function () {
  const ext = fakeExternal(PSI_OK);
  const d = deps({ PSI_API_KEY: 'AIza-test-key-123' }, ext);
  const rv = await review(d);
  const r = await call(d, { reviewId: rv.id });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(ext.calls.length, 1);
  assert.ok(ext.calls[0].url.indexOf('strategy=mobile') !== -1 && ext.calls[0].url.indexOf('locale=en-GB') !== -1);
  ['performance', 'seo', 'accessibility', 'best-practices'].forEach(function (c) { assert.ok(ext.calls[0].url.indexOf('category=' + c) !== -1, c); });
  const stored = JSON.stringify(await d.store.select('br_provider_calls', {}));
  assert.ok(stored.indexOf('AIza-test-key-123') === -1, 'the key is not stored');
  assert.ok(stored.indexOf('SHOULD-NOT-BE-STORED') === -1, 'the full response is not stored');
  assert.strictEqual(r.data.scores.performance, 61);
  assert.strictEqual(r.data.metrics.lcp_ms, 3820.4);
  const drafts = psi.toDrafts(r.data, { url: 'https://harbour.example/', providerCallId: r.call_id, observedAt: NOW.toISOString() });
  const lcp = drafts.find(function (x) { return x.metric_key === 'psi.mobile.lcp_ms'; });
  assert.strictEqual(lcp.state, 'verified_public_observation');
  assert.strictEqual(lcp.value, 3820.4);
  assert.strictEqual(lcp.method.settings.strategy, 'mobile');
  assert.strictEqual(lcp.method.settings.lighthouse_version, '12.3.0');
  assert.strictEqual(lcp.observed_at, '2026-11-20T10:00:05.000Z');
  assert.strictEqual(lcp.inputs.final_url, 'https://www.harbour.example/');
  assert.strictEqual(lcp.source.provider_call_id, r.call_id);
});

test('psi: a missing individual value becomes unavailable, never a default', function () {
  const data = psi.trim(lighthouse({ perf: null }).json);
  const drafts = psi.toDrafts(data, { url: 'u', observedAt: NOW.toISOString() });
  const perf = drafts.find(function (x) { return x.metric_key === 'psi.mobile.performance_score'; });
  assert.strictEqual(perf.state, 'unavailable');
  assert.strictEqual(perf.reason_code, 'provider_error');
  assert.strictEqual(perf.value, undefined);
});

test('psi: idempotency key replays without calling again; identical request is served from the 24 hour cache; different key and url calls again', async function () {
  const ext = fakeExternal(PSI_OK);
  const d = deps({ PSI_API_KEY: 'k' }, ext);
  const rv = await review(d);
  await call(d, { reviewId: rv.id });
  const again = await call(d, { reviewId: rv.id });
  assert.strictEqual(again.replay, true);
  assert.strictEqual(ext.calls.length, 1);
  const rv2 = await review(d, { ref: 'BR-BBBBBBBB' });
  const cached = await call(d, { reviewId: rv2.id, idempotencyKey: 'k-other' });
  assert.strictEqual(cached.ok, true);
  assert.strictEqual(cached.cached, true);
  assert.strictEqual(ext.calls.length, 1, 'cache served the second review');
  const other = await call(d, { reviewId: rv2.id, idempotencyKey: 'k3', request: { url: 'https://other.example/', strategy: 'mobile' } });
  assert.strictEqual(other.cached, false);
  assert.strictEqual(ext.calls.length, 2);
});

test('psi: daily call cap is a hard stop in the database counter', async function () {
  const ext = fakeExternal(PSI_OK);
  const d = deps({ PSI_API_KEY: 'k', BR_PSI_DAILY_CALLS: '2' }, ext);
  const rv = await review(d);
  const out = [];
  for (let i = 0; i < 4; i++) out.push(await call(d, { reviewId: rv.id, idempotencyKey: 'k' + i, request: { url: 'https://s' + i + '.example/', strategy: 'mobile' } }));
  assert.deepStrictEqual(out.map(function (x) { return x.ok; }), [true, true, false, false]);
  assert.strictEqual(out[2].state, 'budget_exhausted');
  assert.strictEqual(ext.calls.length, 2);
});

test('psi: errors are recorded once and never retried; no value comes out of a failure', async function () {
  for (const reply of [{ status: 429, json: {} }, { status: 500, json: {} }, { status: 400, json: {} }, { status: 200, json: { nothing: true } }]) {
    const ext = fakeExternal([{ match: 'pagespeedonline', reply: reply }]);
    const d = deps({ PSI_API_KEY: 'k' }, ext);
    const rv = await review(d);
    const r = await call(d, { reviewId: rv.id });
    assert.strictEqual(r.ok, false);
    assert.ok(r.code);
    assert.strictEqual(r.data, undefined);
    assert.strictEqual(ext.calls.length, 1);
    const again = await call(d, { reviewId: rv.id });
    assert.strictEqual(again.ok, false);
    assert.strictEqual(ext.calls.length, 1, 'no retry with the same key');
    const row = (await d.store.select('br_provider_calls', {}))[0];
    assert.strictEqual(row.status, 'error');
  }
  const thrower = async function () { throw new Error('socket hang up'); };
  const d2 = deps({ PSI_API_KEY: 'k' }, thrower);
  const rv2 = await review(d2);
  const r2 = await call(d2, { reviewId: rv2.id });
  assert.strictEqual(r2.ok, false);
});

test('provider gate: a call left in started state blocks a duplicate for 90 s and is then marked interrupted, never repeated', async function () {
  const ext = fakeExternal(PSI_OK);
  const d = deps({ PSI_API_KEY: 'k' }, ext);
  const rv = await review(d);
  await d.store.insert('br_provider_calls', { review_id: rv.id, provider: 'pagespeed', operation: 'run_pagespeed', idempotency_key: 'k1', request_hash: 'x', status: 'started', started_at: NOW.toISOString() });
  assert.strictEqual((await call(d, { reviewId: rv.id })).code, 'in_progress');
  d.now = function () { return new Date(NOW.getTime() + 120000); };
  assert.strictEqual((await call(d, { reviewId: rv.id })).code, 'interrupted');
  assert.strictEqual(ext.calls.length, 0);
});

test('places: off by default; needs flag, key and a daily cap in pence; sends a field mask; stores no more than needed', async function () {
  const reply = { status: 200, json: { places: [{ id: 'p1', displayName: { text: 'Clyde Components' }, websiteUri: 'https://clydecomponents.example', primaryType: 'machine_shop', types: ['machine_shop'], location: { latitude: 55.86, longitude: -4.25 }, rating: 4.6, userRatingCount: 12, extra: 'dropped' }] } };
  const ext = fakeExternal([{ match: 'places.googleapis.com', reply: reply }]);
  const q = { id: 'google_places', operation: 'text_search', request: { text_query: 'cnc machining Glasgow' }, idempotencyKey: 'p1' };
  assert.strictEqual((await callProvider(deps({}, ext), q)).state, 'disabled');
  assert.strictEqual((await callProvider(deps({ BR_DISCOVERY: '1' }, ext), q)).state, 'not_configured');
  assert.strictEqual((await callProvider(deps({ BR_DISCOVERY: '1', GOOGLE_PLACES_API_KEY: 'g' }, ext), q)).state, 'budget_exhausted');
  assert.strictEqual(ext.calls.length, 0, 'nothing was called in any unconfigured state');
  const d = deps({ BR_DISCOVERY: '1', GOOGLE_PLACES_API_KEY: 'g', BR_PLACES_DAILY_CAP_PENCE: '8' }, ext);
  const r1 = await callProvider(d, q), r2 = await callProvider(d, Object.assign({}, q, { idempotencyKey: 'p2', request: { text_query: 'two' } })), r3 = await callProvider(d, Object.assign({}, q, { idempotencyKey: 'p3', request: { text_query: 'three' } }));
  assert.deepStrictEqual([r1.ok, r2.ok, r3.ok], [true, true, false], 'cap of 8 pence at 4 pence a call allows two');
  assert.strictEqual(ext.calls[0].init.headers['X-Goog-FieldMask'], places.FIELD_MASK);
  assert.strictEqual(r1.data.places[0].name, 'Clyde Components');
  assert.strictEqual(JSON.stringify(r1.data).indexOf('dropped'), -1);
});

test('discovery selection (test fixture places, not real data): direct competitors only, with reasons, at most 3, fewer is fine, none is fine', function () {
  const P = function (name, site, type, lat, lng) { return { place_id: 'id-' + name, name: name, website: site, primary_type: type, types: [type], lat: lat, lng: lng }; };
  const list = [P('Clyde CNC Machining', 'https://clydecnc.example', 'machine_shop', 55.87, -4.26), P('Nearby CNC Machining Two', 'https://cnc2.example', 'machine_shop', 55.9, -4.3), P('Far CNC Machining', 'https://farcnc.example', 'machine_shop', 51.5, -0.12),
    P('Yell CNC Machining listing', 'https://www.yell.com/biz/x', 'machine_shop', 55.86, -4.25), P('No Site CNC Machining', null, 'machine_shop', 55.86, -4.25), P('Harbour CNC Machining', 'https://www.harbour.example', 'machine_shop', 55.86, -4.25),
    P('Bakery', 'https://bakery.example', 'bakery', 55.86, -4.25), P('Third CNC Machining', 'https://cnc3.example', 'machine_shop', 55.8, -4.2), P('Fourth CNC Machining', 'https://cnc4.example', 'machine_shop', 55.82, -4.2), P('Fifth CNC Machining', 'https://cnc5.example', 'machine_shop', 55.83, -4.2)];
  const out = discovery.select(list, { category: 'CNC machining', location: { text: 'Glasgow', kind: 'local' }, ownHost: 'harbour.example', origin: 'google_places', collectedAt: NOW.toISOString(), center: { lat: 55.86, lng: -4.25 } });
  const names = out.rows.map(function (r) { return r.name; });
  assert.ok(!names.includes('Far CNC Machining'), 'outside the local radius');
  ['Yell CNC Machining listing', 'No Site CNC Machining', 'Harbour CNC Machining', 'Bakery'].forEach(function (n) { assert.ok(!names.includes(n), n); });
  const selected = out.rows.filter(function (r) { return r.status === 'selected'; });
  assert.strictEqual(selected.length, 3);
  assert.ok(out.rows.length <= 7);
  selected.forEach(function (r) {
    assert.ok(r.source_ref && r.collected_at && r.origin === 'google_places');
    assert.ok(r.relevance.basis.indexOf('category_match') !== -1);
    assert.ok(r.data_expires_at && new Date(r.data_expires_at) - new Date(r.collected_at) === 30 * 86400000);
  });
  const national = discovery.select([list[2]], { category: 'CNC machining', location: { text: 'UK', kind: 'national' }, ownHost: 'x.example', origin: 'google_places', collectedAt: NOW.toISOString(), center: null });
  assert.strictEqual(national.rows.length, 1, 'no radius is assumed for a national search');
  assert.strictEqual(discovery.select([], { category: 'c', location: { text: 'x', kind: 'local' }, origin: 'google_places', collectedAt: NOW.toISOString() }).rows.length, 0);
});

test('discovery run: unavailable provider reports its state and never returns candidates', async function () {
  const d = deps({}, fakeExternal([]));
  const rv = await review(d);
  const r = await discovery.run(d, rv);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.state, 'disabled');
});

test('question set is deterministic, versioned and sized 8 to 12', function () {
  const a = generateQuestions({ category: 'CNC machining', location: { text: 'Glasgow', kind: 'regional' } });
  const b = generateQuestions({ category: 'CNC machining', location: { text: 'Glasgow', kind: 'regional' } });
  assert.deepStrictEqual(a, b);
  assert.ok(a.length >= 8 && a.length <= 12);
  assert.ok(a.every(function (q) { return q.question_set === 'qs-1' && /^q\d+$/.test(q.question_id) && q.question_text.indexOf('Glasgow') !== -1; }));
  assert.ok(generateQuestions({ category: 'Electrician', location: { text: 'Paisley', kind: 'national' } })[0].question_text.indexOf('UK') !== -1);
  assert.deepStrictEqual(generateQuestions({ category: '', location: { text: 'x', kind: 'local' } }), []);
});

// ---- AI visibility (all with an injected fake adapter, clearly test only)
function aiDeps(extraEnv, adapter) {
  const d = deps(Object.assign({ BR_AI_VISIBILITY: '1', BR_AI_DAILY_CAP_PENCE: '500' }, extraEnv || {}), fakeExternal([]));
  d.registry = registry({ ai_anthropic: Object.assign({ id: 'ai_anthropic', kind: 'ai_search', label: 'Test adapter', toolName: 'web_search', model: 'test-model', status: function () { return { state: 'available', reason: null }; } }, adapter) });
  return d;
}
const goodAnswer = function (text, named) { return async function (req) { return { ok: true, data: { answer_text: text || 'Clyde Components and Harbour Precision are options.', citations: [{ url: 'https://harbour.example/page', title: 'P' }], search_queries: ['q'], model_reported: 'test-model-1', tool: 'web_search' }, cost_pence: 2 }; }; };

test('ai: unconfigured tools are honest: awaiting a supported test, no runs, no values', async function () {
  const d = deps({ BR_AI_VISIBILITY: '1', BR_AI_DAILY_CAP_PENCE: '500' }, fakeExternal([]));
  const rv = await review(d);
  const qs = generateQuestions({ category: rv.category, location: { text: 'Glasgow', kind: 'regional' } });
  const plan = aiv.plan(d, { tools: ['ai_anthropic'], runs: 3, questions: qs });
  assert.strictEqual(plan.within_caps, false);
  assert.ok(plan.cap_reasons.indexOf('provider_not_configured:ai_anthropic') !== -1);
  const out = await aiv.execute(d, { review: rv, tools: ['ai_anthropic'], runs: 1, questions: qs.slice(0, 2), competitors: [] });
  assert.strictEqual(out.ok, 0);
  assert.ok(out.unavailable >= 1);
  const runs = await d.store.select('br_ai_runs', {});
  assert.ok(runs.every(function (r) { return r.status === 'unavailable' && r.answer_text === null; }));
  assert.deepStrictEqual(aiv.reportSection({ runs: [] }), { state: 'awaiting_supported_test', note: 'Awaiting a supported test.', questions: [], summary: [] });
});

test('ai: default config has the daily cap at 0 and the feature off', function () {
  const cfg = loadConfig({});
  assert.strictEqual(cfg.ai.enabled, false);
  assert.strictEqual(cfg.ai.dailyCapPence, 0);
  assert.strictEqual(cfg.discovery.enabled, false);
  assert.strictEqual(cfg.email.enabled, false);
  assert.strictEqual(cfg.psi.key, '');
});

test('ai: dry run plan states calls, cost range and cap reasons and spends nothing', function () {
  const d = aiDeps({ BR_AI_MAX_CALLS_PER_REVIEW: '36', BR_AI_MAX_PENCE_PER_REVIEW: '150' }, { run: goodAnswer() });
  const qs = generateQuestions({ category: 'CNC machining', location: { text: 'Glasgow', kind: 'regional' } });
  const ok = aiv.plan(d, { tools: ['ai_anthropic'], runs: 3, questions: qs });
  assert.strictEqual(ok.calls, 30);
  assert.strictEqual(ok.within_caps, true);
  assert.deepStrictEqual(ok.estimate_pence, { low: 30, high: 150 });
  const tooMany = aiv.plan(d, { tools: ['ai_anthropic'], runs: 3, questions: qs.concat(qs).slice(0, 12) });
  assert.ok(tooMany.cap_reasons.indexOf('over_calls_per_review') !== -1 || tooMany.cap_reasons.indexOf('over_cost_per_review') !== -1);
  assert.ok(aiv.plan(d, { tools: ['ai_anthropic', 'ai_openai', 'ai_gemini'], runs: 3, questions: qs }).cap_reasons.indexOf('too_many_tools') !== -1);
  assert.ok(aiv.plan(d, { tools: ['ai_anthropic'], runs: 4, questions: qs }).cap_reasons.indexOf('runs_out_of_range') !== -1);
  const zero = aiDeps({ BR_AI_DAILY_CAP_PENCE: '0' }, { run: goodAnswer() });
  assert.ok(aiv.plan(zero, { tools: ['ai_anthropic'], runs: 3, questions: qs }).cap_reasons.indexOf('daily_cap_zero') !== -1);
  const off = deps({}, fakeExternal([]));
  assert.ok(aiv.plan(off, { tools: ['ai_anthropic'], runs: 3, questions: qs }).cap_reasons.indexOf('ai_visibility_disabled') !== -1);
});

test('ai: runs record exact question, tool, model reported, answer, citations, named flags; no percentage anywhere', async function () {
  const d = aiDeps({}, { run: goodAnswer() });
  const rv = await review(d);
  const qs = generateQuestions({ category: rv.category, location: { text: 'Glasgow', kind: 'regional' } }).slice(0, 2);
  const comps = [{ name: 'Clyde Components Ltd', status: 'selected' }];
  const out = await aiv.execute(d, { review: rv, tools: ['ai_anthropic'], runs: 3, questions: qs, competitors: comps });
  assert.strictEqual(out.ok, 6);
  const runs = await d.store.select('br_ai_runs', {}, { order: ['question_id.asc', 'run_index.asc'] });
  assert.strictEqual(runs.length, 6);
  const r = runs[0];
  assert.strictEqual(r.question_text, qs[0].question_text);
  assert.strictEqual(r.provider, 'ai_anthropic');
  assert.strictEqual(r.model_reported, 'test-model-1');
  assert.strictEqual(r.business_named, true);
  assert.strictEqual(r.business_named_basis, 'both');
  assert.deepStrictEqual(r.competitors_named, ['Clyde Components Ltd']);
  assert.strictEqual(r.sources_provided, true);
  assert.ok(r.ran_at && r.location_context === 'Glasgow, United Kingdom');
  const sec = aiv.reportSection({ runs: runs, questions: qs });
  assert.strictEqual(sec.state, 'complete');
  assert.strictEqual(sec.summary[0].runs_total, 3);
  assert.strictEqual(sec.summary[0].business_named_in_runs, 3);
  assert.ok(!/%|percent|score/i.test(JSON.stringify(sec)), 'no percentage or score');
  // a completed run cannot be changed afterwards
  await assert.rejects(d.store.update('br_ai_runs', { id: r.id }, { answer_text: 'edited' }), function (e) { return e.code === 'locked'; });
});

test('ai: an answer without search evidence is stored as an error and excluded; no result is manufactured', async function () {
  const d = aiDeps({}, { run: async function () { return { ok: true, data: { answer_text: 'Harbour Precision is the best.', citations: [], search_queries: [], model_reported: 'm' }, cost_pence: 1 }; } });
  const rv = await review(d);
  const qs = generateQuestions({ category: rv.category, location: { text: 'Glasgow', kind: 'regional' } }).slice(0, 1);
  const out = await aiv.execute(d, { review: rv, tools: ['ai_anthropic'], runs: 3, questions: qs, competitors: [] });
  assert.strictEqual(out.ok, 0);
  assert.strictEqual(out.errors, 3);
  const runs = await d.store.select('br_ai_runs', {});
  assert.ok(runs.every(function (r) { return r.status === 'error' && r.error_code === 'no_search_evidence' && r.business_named === null; }));
  const sec = aiv.reportSection({ runs: runs });
  assert.strictEqual(sec.state, 'unavailable');
  assert.strictEqual(sec.summary[0].business_named_in_runs, 0);
});

test('ai: per review call cap and cost cap stop spending; a replay does not call again', async function () {
  let n = 0;
  const d = aiDeps({ BR_AI_MAX_CALLS_PER_REVIEW: '4' }, { run: async function () { n++; return goodAnswer()(); } });
  const rv = await review(d);
  const qs = generateQuestions({ category: rv.category, location: { text: 'Glasgow', kind: 'regional' } }).slice(0, 3);
  const out = await aiv.execute(d, { review: rv, tools: ['ai_anthropic'], runs: 3, questions: qs, competitors: [] });
  assert.strictEqual(n, 4);
  assert.strictEqual(out.skipped_budget, 5);
  const again = await aiv.execute(d, { review: rv, tools: ['ai_anthropic'], runs: 3, questions: qs, competitors: [] });
  assert.strictEqual(n, 4, 'nothing repeated');
  assert.strictEqual(again.attempted, 0);
  const d2 = aiDeps({ BR_AI_DAILY_CAP_PENCE: '10' }, { run: async function () { n++; return goodAnswer()(); } });
  const rv2 = await review(d2);
  n = 0;
  const o2 = await aiv.execute(d2, { review: rv2, tools: ['ai_anthropic'], runs: 3, questions: qs, competitors: [] });
  assert.strictEqual(n, 2, 'a 10 pence daily cap at 5 pence worst case allows two calls');
  assert.ok(o2.skipped_budget >= 1);
});

test('ai: name detection handles company suffixes, domains and citations, and avoids partial word matches', function () {
  const b = { name: 'Harbour Precision Ltd', host: 'www.harbour.example' };
  assert.strictEqual(aiv.detect('Try Harbour Precision for parts.', [], b).basis, 'text_match');
  assert.strictEqual(aiv.detect('No mention.', [{ url: 'https://www.harbour.example/x' }], b).basis, 'citation_match');
  assert.strictEqual(aiv.detect('See harbour.example', [], b).named, true);
  assert.strictEqual(aiv.detect('The harbourprecisions group', [], b).named, false);
  assert.strictEqual(aiv.detect('', [], b).basis, 'none');
  assert.deepStrictEqual(aiv.competitorsIn('Clyde Components & others', ['Clyde Components Ltd', 'Other Co']), ['Clyde Components Ltd']);
});

test('provider statuses never contain a key or secret value', async function () {
  const d = deps({ PSI_API_KEY: 'SECRET-PSI-KEY', GOOGLE_PLACES_API_KEY: 'SECRET-PLACES', RESEND_API_KEY: 'SECRET-RESEND', TURNSTILE_SECRET_KEY: 'SECRET-TS', BR_EMAIL: '1' }, fakeExternal([]));
  const list = await providerStatuses(d);
  const text = JSON.stringify(list);
  ['SECRET-PSI-KEY', 'SECRET-PLACES', 'SECRET-RESEND', 'SECRET-TS', 'svc'].forEach(function (s) { assert.ok(text.indexOf(s) === -1 || s === 'svc' && !/"svc"/.test(text), s); });
  const ids = list.map(function (p) { return p.id; });
  ['own_fetch', 'pagespeed', 'google_places', 'osm', 'ai_anthropic', 'ai_openai', 'ai_gemini', 'ai_perplexity', 'resend', 'turnstile'].forEach(function (i) { assert.ok(ids.indexOf(i) !== -1, i); });
  assert.strictEqual(list.find(function (p) { return p.id === 'pagespeed'; }).state, 'available');
  assert.strictEqual(list.find(function (p) { return p.id === 'ai_anthropic'; }).state, 'not_configured');
});
