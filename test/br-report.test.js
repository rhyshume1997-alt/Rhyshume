'use strict';
// Package A: report builder and evidence integrity. Reports come from stored evidence only. Run with: node --test
const test = require('node:test');
const assert = require('node:assert');
const report = require('../api/_lib/br/report');
const steps = require('../api/_lib/br/steps');
const { recordEvidence, recordMany, buildRow, toApiEvidence, activeEvidence } = require('../api/_lib/br/evidence');
const { createMemoryStore } = require('../api/_lib/br/db');
const { loadConfig } = require('../api/_lib/br/config');
const { evRows, makeApp, invoke, world, fakeExternal } = require('./br-helpers');
const metrics = require('../api/_lib/br/metrics');

const RV = { id: '6c9b8e2a-6a77-4c0a-9a41-1d2f7b0d3f10', ref: 'BR-7K2M9QX4', business_name: 'Harbour Precision Ltd', website_url: 'https://harbour.example/', website_host: 'harbour.example', location_text: 'Glasgow', location_kind: 'regional', category: 'CNC machining', goals: ['more_enquiries'], assessment_level: 'standard', completeness: 'partial', created_at: '2026-11-20T10:15:02Z', confirmed_at: '2026-11-20T10:16:10Z', token_expires_at: '2026-12-20T10:15:02Z', steps: [] };
const COMP = { id: '5a0c2f1e-7b3d-4a9c-9d2e-1f3a5b7c9d0e', review_id: RV.id, name: 'Clyde Components Ltd', website_url: 'https://clyde.example/', website_host: 'clyde.example', origin: 'visitor_nominated', collected_at: '2026-11-20T10:16:10Z', status: 'selected', position: 1, relevance: { basis: ['nominated_by_visitor'] }, created_at: '2026-11-20T10:16:10Z' };
const PSI_SRC = { kind: 'pagespeed_insights', name: 'Google PageSpeed Insights API v5 (Lighthouse 12.3.0)', url: 'https://x/' };
function rows(overrides) {
  return evRows([
    { metric_key: 'https.enabled', value: true }, { metric_key: 'page.status', value: 200 }, { metric_key: 'sitemap.present', value: false }, { metric_key: 'page.viewport.present', value: true },
    { metric_key: 'psi.mobile.lcp_ms', value: 3820, source: PSI_SRC, observed_at: '2026-11-20T10:16:52Z' }, { metric_key: 'psi.mobile.cls', value: 0.05, source: PSI_SRC },
    { metric_key: 'psi.mobile.performance_score', value: 60, source: PSI_SRC }, { metric_key: 'psi.mobile.seo_score', value: 92, source: PSI_SRC },
    { metric_key: 'psi.mobile.lcp_ms', value: 2100, competitor_id: COMP.id, source: PSI_SRC, observed_at: '2026-11-20T10:17:30Z' }, { metric_key: 'psi.mobile.cls', value: 0.2, competitor_id: COMP.id, source: PSI_SRC },
    { metric_key: 'psi.mobile.performance_score', value: 62, competitor_id: COMP.id, source: PSI_SRC }, { metric_key: 'psi.mobile.seo_score', value: 80, competitor_id: COMP.id, source: PSI_SRC },
    { metric_key: 'sitemap.present', value: true, competitor_id: COMP.id }, { metric_key: 'https.enabled', value: true, competitor_id: COMP.id },
    { metric_key: 'local.gbp.profile', state: 'not_tested', reason_code: 'no_supported_source', source: { kind: 'no_source', name: 'No supported source connected' } },
    { metric_key: 'psi.mobile.tbt_ms', state: 'unavailable', reason_code: 'timeout', competitor_id: COMP.id, source: PSI_SRC }
  ].concat(overrides || []));
}
const build = function (o) { return report.build(Object.assign({ review: RV, evidence: rows(), competitors: [COMP], opportunities: [], aiRuns: [], questions: [], version: 1, reason: 'initial', createdBy: 'system', now: new Date('2026-11-20T10:19:30Z'), reportId: '4b6f8a2c-1d3e-4f5a-8b7c-9d0e1f2a3b4c', previous: [] }, o || {})); };

test('report: regenerating from the same stored evidence gives an identical report and hash', function () {
  const a = build(), b = build();
  assert.deepStrictEqual(a, b);
  assert.strictEqual(report.contentHash(a), report.contentHash(b));
  const later = build({ now: new Date('2027-01-01T00:00:00Z'), reportId: 'ffffffff-1d3e-4f5a-8b7c-9d0e1f2a3b4c', version: 5, reason: 'regenerated' });
  assert.strictEqual(report.contentHash(later), report.contentHash(a), 'time, id, version and reason are not part of the content hash');
  const shuffled = build({ evidence: rows().reverse() });
  assert.deepStrictEqual(shuffled, a, 'evidence order does not matter');
  const changed = build({ evidence: rows([{ metric_key: 'page.title.present', value: false }]) });
  assert.notStrictEqual(report.contentHash(changed), report.contentHash(a));
});

test('report: comparison rows exist only where something was measured; states appear honestly; numbers come from evidence', function () {
  const r = build();
  const keys = r.comparison.rows.map(function (x) { return x.metric_key; });
  assert.ok(keys.indexOf('psi.mobile.lcp_ms') !== -1 && keys.indexOf('sitemap.present') !== -1);
  assert.ok(keys.indexOf('psi.mobile.tbt_ms') === -1, 'a value that is unavailable on both sides is not a comparison row');
  assert.ok(!keys.some(function (k) { return k.indexOf('local.') === 0 || k.indexOf('ai.') === 0; }));
  const lcp = r.comparison.rows.find(function (x) { return x.metric_key === 'psi.mobile.lcp_ms'; });
  assert.strictEqual(lcp.business.display, '3.8 s');
  assert.strictEqual(lcp.competitors[0].display, '2.1 s');
  assert.strictEqual(lcp.finding, 'Clyde Components Ltd was faster in this test.');
  assert.strictEqual(lcp.observed_at, '2026-11-20T10:16:52Z');
  assert.ok(lcp.source && lcp.what_it_means && lcp.could_improve && lcp.limitations.length);
  const cls = r.comparison.rows.find(function (x) { return x.metric_key === 'psi.mobile.cls'; });
  assert.strictEqual(cls.finding, 'Clyde Components Ltd had more layout movement in this test.');
  const perf = r.comparison.rows.find(function (x) { return x.metric_key === 'psi.mobile.performance_score'; });
  assert.strictEqual(perf.finding, 'Clyde Components Ltd was similar in this test.', 'under 5 points is similar');
  const seo = r.comparison.rows.find(function (x) { return x.metric_key === 'psi.mobile.seo_score'; });
  assert.strictEqual(seo.finding, 'Clyde Components Ltd scored lower in this test.');
  const sm = r.comparison.rows.find(function (x) { return x.metric_key === 'sitemap.present'; });
  assert.strictEqual(sm.finding, 'Clyde Components Ltd has this and your site does not.');
  const tbt = r.technical.groups.find(function (g) { return g.key === 'speed'; }).rows.find(function (x) { return x.metric_key === 'psi.mobile.tbt_ms'; });
  assert.strictEqual(tbt, undefined, 'business tbt was never recorded, so no row');
  const kf = r.key_findings[0];
  assert.strictEqual(kf.text, 'Clyde Components Ltd loaded its home page faster in the mobile test recorded on 20 Nov 2026 (2.1 s against 3.8 s for your page).');
  assert.strictEqual(kf.evidence_state, 'verified_public_observation');
  kf.evidence_ids.forEach(function (id) { assert.ok(r.evidence_index.some(function (e) { return e.id === id; })); });
  const text = JSON.stringify(r).toLowerCase();
  ['stealing', 'losing customers to', 'because of', 'outrank'].forEach(function (b) { assert.ok(text.indexOf(b) === -1, b); });
});

test('report: nothing is shown for a competitor that is not selected; no competitor means no comparison table', function () {
  const none = build({ competitors: [] });
  assert.strictEqual(none.comparison.rows.length, 0);
  assert.strictEqual(none.competitors.state, 'none_available');
  assert.strictEqual(none.competitors.items.length, 0);
  const rejected = build({ competitors: [Object.assign({}, COMP, { status: 'rejected' })] });
  assert.strictEqual(rejected.comparison.rows.length, 0);
  assert.ok(!JSON.stringify(rejected).includes('Clyde Components'), 'a rejected competitor never reaches the report');
  assert.ok(!JSON.stringify(rejected.technical).includes(COMP.id));
});

test('report: unmeasured items show their state and reason, never a value', function () {
  const r = build({ evidence: rows([{ metric_key: 'page.title.present', state: 'not_tested', reason_code: 'blocked_by_robots' }, { metric_key: 'page.h1.count', state: 'unavailable', reason_code: 'timeout' }]) });
  const rowsAll = [].concat.apply([], r.technical.groups.map(function (g) { return g.rows; }));
  const t = rowsAll.find(function (x) { return x.metric_key === 'page.title.present'; });
  assert.strictEqual(t.business.evidence_state, 'not_tested');
  assert.strictEqual(t.business.display, 'Not tested');
  assert.strictEqual(t.business.reason_code, 'blocked_by_robots');
  assert.ok(/asks automated tools not to read/.test(t.business.note));
  assert.strictEqual(rowsAll.find(function (x) { return x.metric_key === 'page.h1.count'; }).business.display, 'Unavailable');
  assert.strictEqual(r.local_search.state, 'not_tested');
  assert.strictEqual(r.local_search.reason_code, 'no_supported_source');
  assert.strictEqual(r.local_search.rows.length, 0);
  assert.strictEqual(r.ai_visibility.state, 'awaiting_supported_test');
});

test('report: structure, disclaimers, sources and test settings follow the contract; contact details never appear', function () {
  const r = build();
  ['report_id', 'review_ref', 'version', 'status', 'created_by', 'reason', 'generated_at', 'generator_version', 'completeness', 'expires_at', 'business', 'methodology', 'competitors', 'key_findings', 'comparison', 'technical', 'local_search', 'ai_visibility', 'recommendations', 'automation', 'next_steps', 'disclaimers', 'changes_from_previous', 'evidence_index'].forEach(function (k) { assert.ok(k in r, k); });
  assert.strictEqual(r.business.review_date, '2026-11-20');
  assert.strictEqual(r.generator_version, 'br-gen-1.0.0');
  assert.ok(r.disclaimers.length >= 3 && r.disclaimers.some(function (d) { return /does not promise rankings, enquiries or returns/.test(d); }) && r.disclaimers.some(function (d) { return /Nothing here is a quote/.test(d); }));
  assert.ok(r.methodology.sources.some(function (s) { return s.kind === 'pagespeed_insights'; }) && r.methodology.sources.some(function (s) { return s.kind === 'own_fetch'; }));
  assert.strictEqual(r.methodology.test_settings.psi.runs_per_url, 1);
  assert.strictEqual(r.methodology.test_settings.crawl.user_agent, 'RhysHumeReviewBot/1.0');
  assert.ok(r.methodology.disclaimer.indexOf('not Google ranking scores') !== -1);
  assert.strictEqual(r.next_steps[0].label, 'Discuss my results');
  r.next_steps.forEach(function (n) { assert.ok(['/contact?from=business-review', '/seo-and-ai-visibility', '/websites', '/automation', '/engineering', '/contact'].indexOf(n.href) !== -1); });
  assert.ok(!/[\w.+-]+@[\w-]+\.[\w.]+/.test(JSON.stringify(r)));
  assert.ok(!/ISO\s?\d|ISO 9001|ISO 13485|certified|compliant/i.test(JSON.stringify(r)), 'no standards claims');
  assert.ok(!/—|–|…/.test(JSON.stringify(r)));
  assert.strictEqual(r.status, 'published');
});

test('report: no evidence at all still builds an honest empty report', function () {
  const r = build({ evidence: [], competitors: [] });
  assert.strictEqual(r.comparison.rows.length, 0);
  assert.strictEqual(r.technical.groups.length, 0);
  assert.strictEqual(r.key_findings.length, 0);
  assert.ok(r.methodology.summary.indexOf('could not be read') !== -1);
  assert.strictEqual(r.methodology.sources.length, 0);
});

test('report: methodology never claims PageSpeed when only a failure was recorded', function () {
  const r = build({ evidence: evRows([{ metric_key: 'psi.mobile.lcp_ms', state: 'not_tested', reason_code: 'not_configured', source: PSI_SRC }, { metric_key: 'page.status', value: 200 }]), competitors: [] });
  assert.ok(r.methodology.summary.indexOf('PageSpeed') === -1);
  assert.strictEqual(r.methodology.test_settings.psi, undefined);
});

// ---- integrity with the store: history never changes
async function seeded() {
  const store = createMemoryStore({ now: function () { return new Date('2026-11-20T10:00:00Z'); } });
  const rv = await store.insert('br_reviews', { ref: 'BR-AAAAAAAA', business_name: 'Harbour Precision Ltd', website_url: 'https://harbour.example/', website_host: 'harbour.example', location_text: 'Glasgow', location_kind: 'regional', category: 'CNC machining', goals: ['more_enquiries'], input_hash: 'h', visitor_hash: 'v', token_hash: '\\xaa', token_expires_at: '2026-12-20T00:00:00Z', purge_after: '2027-02-20T00:00:00Z', steps: [], inputs: {} });
  return { store: store, rv: rv, deps: { store: store, cfg: loadConfig({}), now: function () { return new Date('2026-11-20T10:19:30Z'); } } };
}
const SRC = { kind: 'own_fetch', name: 'Public pages fetched directly', url: 'https://harbour.example/' };
const D = function (key, value, o) { return Object.assign({ metric_key: key, state: 'verified_public_observation', value: value, observed_at: '2026-11-20T10:16:19Z', source: SRC, method: { summary: 'm' }, inputs: { requested_url: 'https://harbour.example/' } }, o || {}); };

test('integrity: evidence is append only; a replay changes nothing; a different result is a new row and the old one is superseded, not edited', async function () {
  const { store, rv } = await seeded();
  const a = await recordEvidence(store, rv.id, D('page.status', 200));
  assert.strictEqual(a.created, true);
  const again = await recordEvidence(store, rv.id, D('page.status', 200));
  assert.strictEqual(again.created, false);
  assert.strictEqual((await store.select('br_evidence', {})).length, 1);
  const changed = await recordEvidence(store, rv.id, D('page.status', 503, { observed_at: '2026-11-20T11:00:00Z' }));
  assert.strictEqual(changed.created, true);
  const all = await store.select('br_evidence', {}, { order: ['created_at.asc'] });
  assert.strictEqual(all.length, 2);
  assert.strictEqual(all[0].value.v, 200, 'the old measurement is untouched');
  assert.strictEqual(all[0].superseded_by, changed.row.id);
  assert.strictEqual((await activeEvidence(store, rv.id)).length, 1);
  assert.strictEqual((await activeEvidence(store, rv.id))[0].value.v, 503);
  await assert.rejects(store.update('br_evidence', { id: all[0].id }, { value: { type: 'number', v: 1 } }), function (e) { return e.code === 'locked'; });
  await assert.rejects(store.update('br_evidence', { id: all[0].id }, { evidence_state: 'not_tested' }), function (e) { return e.code === 'locked'; });
  await assert.rejects(store.update('br_evidence', { id: all[0].id }, { source: { kind: 'x', name: 'y' } }), function (e) { return e.code === 'locked'; });
  await assert.rejects(store.delete('br_evidence', { id: all[0].id }), function (e) { return e.code === 'locked'; });
});

test('integrity: the evidence rules refuse invalid rows (value with not_tested, missing reason, no source, no time, unknown metric, authenticated data)', function () {
  assert.throws(function () { buildRow('r', D('page.status', 200, { state: 'not_tested', reason_code: 'x' })); }, /value cannot be stored/);
  assert.throws(function () { buildRow('r', { metric_key: 'page.status', state: 'unavailable', observed_at: '2026-11-20T10:00:00Z', source: SRC }); }, /reason_code/);
  assert.throws(function () { buildRow('r', D('page.status', 200, { source: null })); }, /source/);
  assert.throws(function () { buildRow('r', D('page.status', 200, { source: { kind: 'a' } })); }, /source/);
  assert.throws(function () { buildRow('r', D('page.status', 200, { observed_at: undefined })); }, /observed_at/);
  assert.throws(function () { buildRow('r', D('page.status', 200, { observed_at: 'not a date' })); }, /observed_at/);
  assert.throws(function () { buildRow('r', D('made.up.metric', 1)); }, /unknown metric/);
  assert.throws(function () { buildRow('r', D('page.status', 200, { state: 'verified_authenticated_account_data' })); }, /not produced in this release/);
  assert.throws(function () { buildRow('r', D('page.status', undefined)); }, /value is required/);
  assert.throws(function () { buildRow('r', D('page.status', 1, { state: 'guessed' })); }, /bad state/);
  const inf = buildRow('r', D('content.service_pages.estimate', 3, { state: 'reasonable_inference' }));
  assert.ok(inf.limitations.some(function (l) { return /inference/i.test(l); }));
  const cust = buildRow('r', D('customer.goals', ['more_enquiries'], { state: 'customer_supplied' }));
  assert.ok(cust.limitations.some(function (l) { return /supplied by you/i.test(l); }));
  const nt = buildRow('r', { metric_key: 'local.rating', state: 'not_tested', reason_code: 'no_supported_source', observed_at: '2026-11-20T10:00:00Z', source: { kind: 'no_source', name: 'n' } });
  assert.strictEqual(nt.value, null);
});

test('integrity: reports are immutable versions; new evidence or recommendations create new versions and old versions stay byte for byte', async function () {
  const { store, rv, deps } = await seeded();
  await recordMany(store, rv.id, [D('https.enabled', true), D('page.status', 200), D('page.title.present', false)]);
  const v1 = await steps.buildAndStoreReport(deps, rv, { reason: 'initial' });
  assert.strictEqual(v1.created, true);
  const before = JSON.stringify((await store.select('br_report_versions', {}))[0].content);
  const noChange = await steps.buildAndStoreReport(deps, rv, { reason: 'regenerated' });
  assert.strictEqual(noChange.created, false, 'unchanged evidence creates no new version');
  assert.strictEqual((await store.select('br_report_versions', {})).length, 1);
  await recordEvidence(store, rv.id, D('page.title.present', true, { observed_at: '2026-11-20T12:00:00Z' }));
  const v2 = await steps.buildAndStoreReport(deps, rv, { reason: 'regenerated' });
  assert.strictEqual(v2.created, true);
  assert.strictEqual(v2.version, 2);
  const stored = await store.select('br_report_versions', {}, { order: ['version.asc'] });
  assert.strictEqual(JSON.stringify(stored[0].content), before, 'version 1 is unchanged');
  assert.strictEqual(stored[0].status, 'superseded');
  assert.ok(stored[0].content.recommendations.some(function (x) { return x.key === 'missing_title'; }), 'the old version still has its old recommendation');
  assert.ok(!stored[1].content.recommendations.some(function (x) { return x.key === 'missing_title'; }));
  assert.deepStrictEqual(stored[1].content.changes_from_previous.map(function (c) { return c.version; }), [1, 2]);
  // evidence ids cited by version 1 still exist (superseded, not deleted)
  const ids = new Set((await store.select('br_evidence', {})).map(function (e) { return e.id; }));
  stored[0].evidence_ids.forEach(function (id) { assert.ok(ids.has(id)); });
  assert.deepStrictEqual(stored[0].content.evidence_index.map(function (e) { return e.id; }).sort(), stored[0].evidence_ids.slice().sort());
});

test('integrity: a full run records a source, timestamp, method and inputs for every evidence row, competitors included, and substitutes nothing', async function () {
  const w = await world();
  const ext = fakeExternal([{ match: 'pagespeedonline', reply: { status: 500, json: {} } }]);
  const app = makeApp({ fetcher: w.fetcher, fetchImpl: ext, env: { PSI_API_KEY: 'k' } });
  try {
    const s = await invoke(app.pub, { method: 'POST', url: '/api/business-review/start', body: { business_name: 'X Ltd', website: w.url('biz'), location: { text: 'Glasgow', kind: 'local' }, category: 'CNC machining', turnstile_token: 't' }, headers: { 'Idempotency-Key': '00000000-0000-4000-8000-000000009001' } });
    const id = s.json.review.id, token = s.json.access_token;
    await invoke(app.pub, { method: 'POST', url: '/api/business-review/' + id + '/confirm', body: { confirmed: true, competitor_nomination: { name: 'Rival', website: w.url('rival') } }, token: token });
    let last;
    for (let i = 0; i < 12; i++) { last = await invoke(app.pub, { method: 'POST', url: '/api/business-review/' + id + '/advance', body: {}, token: token }); if (last.json.review.status === 'ready') break; }
    const ev = await app.store.select('br_evidence', {});
    assert.ok(ev.length > 40);
    assert.ok(ev.some(function (e) { return e.competitor_id; }), 'competitor evidence exists');
    ev.forEach(function (e) {
      assert.ok(e.source && e.source.kind && e.source.name, e.metric_key + ' source');
      assert.ok(!Number.isNaN(new Date(e.observed_at).getTime()), e.metric_key + ' time');
      assert.ok(e.method && typeof e.method === 'object');
      assert.ok(e.inputs && typeof e.inputs === 'object');
      if (e.evidence_state === 'not_tested' || e.evidence_state === 'unavailable') { assert.strictEqual(e.value, null, e.metric_key); assert.ok(e.reason_code, e.metric_key); }
      else assert.ok(e.value !== null, e.metric_key);
    });
    const psiRows = ev.filter(function (e) { return e.metric_key.indexOf('psi.') === 0; });
    assert.ok(psiRows.length > 0 && psiRows.every(function (e) { return e.evidence_state === 'unavailable' && e.value === null && e.reason_code === 'provider_error'; }), 'PageSpeed failed, so no speed number exists anywhere');
    const rep = (await invoke(app.pub, { method: 'GET', url: '/api/business-review/' + id + '/report', token: token })).json.report;
    assert.ok(!rep.comparison.rows.some(function (r) { return r.metric_key.indexOf('psi.') === 0; }));
    assert.strictEqual(rep.completeness, 'partial');
    const comp = rep.comparison.rows.map(function (r) { return r.competitors.map(function (c) { return c.evidence_id; }); });
    comp.forEach(function (list) { list.forEach(function (eid) { const row = ev.find(function (e) { return e.id === eid; }); assert.ok(row && row.competitor_id && row.source && row.observed_at); }); });
    assert.strictEqual(ext.calls.filter(function (c) { return c.url.indexOf('pagespeedonline') !== -1; }).length, 2, 'one attempt each, no retries');
  } finally { await w.close(); }
});

test('metrics catalogue: every key has a label, meaning and limitation; wording avoids banned punctuation and words', function () {
  Object.keys(metrics.METRICS).forEach(function (k) {
    const m = metrics.METRICS[k];
    assert.ok(m.label && m.what_it_means && Array.isArray(m.limitations) && m.limitations.length >= 0 && typeof m.display === 'function', k);
    const t = m.label + m.what_it_means + m.limitations.join('');
    assert.ok(!/—|–|…|\.\.\.|seamless|showcase|delve|cutting.edge/i.test(t), k);
  });
  assert.strictEqual(metrics.fmtDate('2026-11-20T10:00:00Z'), '20 Nov 2026');
});
