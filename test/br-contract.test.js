'use strict';
// Package A: real responses are validated against the shared contract fixtures (test/fixtures/business-review) and the enumerations. Run with: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { makeApp, invoke, world, fakeExternal } = require('./br-helpers');

const FX = function (n) { return JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'business-review', n + '.json'), 'utf8')); };
const ENUM = {
  evidence_state: ['verified_public_observation', 'verified_authenticated_account_data', 'customer_supplied', 'reasonable_inference', 'not_tested', 'unavailable'],
  status: ['awaiting_confirmation', 'queued', 'running', 'ready', 'failed', 'expired', 'cancelled'], completeness: ['pending', 'complete', 'partial'], level: ['reduced', 'standard', 'full'],
  step: ['site_fetch', 'site_analysis', 'psi_business', 'competitor_discovery', 'competitor_fetch', 'psi_competitors', 'local_search', 'ai_visibility', 'automation_map', 'report_build'],
  stepState: ['pending', 'running', 'done', 'skipped', 'unavailable', 'failed'], tier: ['high', 'medium', 'low'], issue: ['technical_issue', 'commercial_hypothesis', 'opportunity'],
  service: ['websites', 'seo', 'ai_visibility', 'automation', 'engineering', 'care_plan', 'none'], origin: ['google_places', 'osm', 'visitor_nominated', 'owner_added'], compStatus: ['candidate', 'selected', 'rejected'],
  compState: ['discovered', 'nominated', 'none_available', 'unavailable', 'owner_selected'], aiState: ['awaiting_supported_test', 'partial', 'complete', 'unavailable'], delivery: ['queued', 'held_for_approval', 'sent', 'failed', 'cancelled'],
  evCategory: ['technical', 'local', 'ai_visibility', 'customer_supplied', 'automation']
};
const SKIP = { fixture: 1, fixture_note: 1 };

function shape(expected, actual, p, errors) {
  if (expected === null || expected === undefined) return;
  const te = Array.isArray(expected) ? 'array' : typeof expected;
  const ta = actual === null ? 'null' : Array.isArray(actual) ? 'array' : typeof actual;
  if (te !== ta) { errors.push(p + ': expected ' + te + ' got ' + ta); return; }
  if (te === 'array') {
    if (!expected.length || !actual.length) return;
    // at least one real element must have the fixture element's shape (arrays can mix kinds, for example evidence rows)
    let firstErrors = null;
    for (let i = 0; i < actual.length; i++) { const e = []; shape(expected[0], actual[i], p + '[' + i + ']', e); if (!e.length) return; if (!firstErrors) firstErrors = e; }
    firstErrors.forEach(function (x) { errors.push(x); });
    return;
  }
  if (te === 'object') Object.keys(expected).forEach(function (k) { if (SKIP[k] && p === '$') return; if (!(k in actual)) { errors.push(p + '.' + k + ' missing'); return; } shape(expected[k], actual[k], p + '.' + k, errors); });
}
const check = function (name, actual) { const errors = []; shape(FX(name), actual, '$', errors); assert.deepStrictEqual(errors, [], name + ': ' + errors.join('; ')); };
const inEnum = function (v, list, what) { assert.ok(list.indexOf(v) !== -1, what + ' = ' + v); };

const LH = function () { return { status: 200, json: { lighthouseResult: { fetchTime: '2026-11-20T10:00:05.000Z', lighthouseVersion: '12.3.0', requestedUrl: 'u', finalUrl: 'u', configSettings: { formFactor: 'mobile', throttlingMethod: 'simulate' }, runWarnings: [], categories: { performance: { score: 0.6 }, seo: { score: 0.9 }, accessibility: { score: 0.85 }, 'best-practices': { score: 1 } }, audits: { 'largest-contentful-paint': { numericValue: 3800 }, 'cumulative-layout-shift': { numericValue: 0.05 }, 'total-blocking-time': { numericValue: 150 }, 'first-contentful-paint': { numericValue: 1500 }, 'speed-index': { numericValue: 3000 } } } } }; };
let n = 0;
const key = function () { n++; return '00000000-0000-4000-8000-' + String(4000000 + n).padStart(12, '0'); };

function checkReportEnums(r) {
  r.evidence_index.forEach(function (e) { inEnum(e.evidence_state, ENUM.evidence_state, 'evidence_state'); inEnum(e.category, ENUM.evCategory, 'category'); assert.ok((e.value === null) === (e.evidence_state === 'not_tested' || e.evidence_state === 'unavailable')); if (e.value === null) assert.ok(e.reason_code); });
  r.recommendations.forEach(function (x, i) { inEnum(x.priority.tier, ENUM.tier, 'tier'); inEnum(x.issue_type, ENUM.issue, 'issue_type'); inEnum(x.service.key, ENUM.service, 'service'); assert.strictEqual(x.priority.rank, i + 1); });
  r.key_findings.forEach(function (k) { inEnum(k.evidence_state, ENUM.evidence_state, 'kf state'); });
  inEnum(r.competitors.state, ENUM.compState, 'competitors.state'); inEnum(r.ai_visibility.state, ENUM.aiState, 'ai state'); inEnum(r.completeness, ENUM.completeness, 'completeness');
  r.competitors.items.forEach(function (c) { inEnum(c.origin, ENUM.origin, 'origin'); assert.strictEqual(c.status, 'selected'); });
  r.comparison.rows.forEach(function (row) { inEnum(row.business.evidence_state, ENUM.evidence_state, 'row state'); });
  assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(r.generated_at));
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(r.business.review_date));
}

test('contract: start, status, report, capabilities and error responses match the fixtures and enumerations', async function () {
  const w = await world();
  const ext = fakeExternal([{ match: 'pagespeedonline', reply: LH }]);
  const app = makeApp({ fetcher: w.fetcher, fetchImpl: ext, env: { PSI_API_KEY: 'k' } });
  try {
    const caps = await invoke(app.pub, { method: 'GET', url: '/api/business-review/capabilities' });
    check('capabilities-minimal', caps.json);
    const val = await invoke(app.pub, { method: 'POST', url: '/api/business-review/start', body: { business_name: '', category: '', location: { text: 'a' }, turnstile_token: 't' }, headers: { 'Idempotency-Key': key() } });
    check('error-validation', val.json);
    const bad = await invoke(app.pub, { method: 'POST', url: '/api/business-review/start', body: { business_name: 'X', website: 'http://127.0.0.1', category: 'x', location: { text: 'a' }, turnstile_token: 't' }, headers: { 'Idempotency-Key': key() } });
    check('error-url-not-allowed', bad.json);
    const s = await invoke(app.pub, { method: 'POST', url: '/api/business-review/start', body: { business_name: 'Harbour Precision Ltd', website: w.url('biz'), location: { text: 'Glasgow', kind: 'regional' }, category: 'CNC machining', goals: ['more_enquiries'], turnstile_token: 't' }, headers: { 'Idempotency-Key': key() } });
    check('start-201', s.json);
    inEnum(s.json.review.status, ENUM.status, 'status');
    const id = s.json.review.id, token = s.json.access_token;
    const conf = await invoke(app.pub, { method: 'POST', url: '/api/business-review/' + id + '/confirm', body: { confirmed: true, competitor_nomination: { name: 'Rival Components', website: w.url('rival') } }, token: token });
    ['review', 'steps', 'next_after_ms', 'report_available', 'report_version', 'competitors', 'delivery', 'discussion'].forEach(function (k) { assert.ok(k in conf.json, 'confirm response has ' + k); });
    const mid = await invoke(app.pub, { method: 'POST', url: '/api/business-review/' + id + '/advance', body: {}, token: token });
    check('status-running', mid.json);
    mid.json.steps.forEach(function (st) { inEnum(st.key, ENUM.step, 'step'); inEnum(st.state, ENUM.stepState, 'step state'); assert.ok(st.label.length > 3); });
    let last = mid;
    for (let i = 0; i < 10 && last.json.review.status !== 'ready'; i++) last = await invoke(app.pub, { method: 'POST', url: '/api/business-review/' + id + '/advance', body: {}, token: token });
    check('status-ready-partial', last.json);
    inEnum(last.json.review.completeness, ENUM.completeness, 'completeness');
    assert.ok(last.json.competitors.length === 1);
    const rep = await invoke(app.pub, { method: 'GET', url: '/api/business-review/' + id + '/report', token: token });
    check('report-with-competitor', rep.json);
    checkReportEnums(rep.json.report);
    // no website and no competitor
    const s2 = await invoke(app.pub, { method: 'POST', url: '/api/business-review/start', body: { business_name: 'Mairi Ross Electrical', location: { text: 'Paisley', kind: 'local' }, category: 'Electrician', goals: ['more_enquiries', 'google_visibility'], turnstile_token: 't' }, headers: { 'Idempotency-Key': key() } });
    await invoke(app.pub, { method: 'POST', url: '/api/business-review/' + s2.json.review.id + '/confirm', body: { confirmed: true }, token: s2.json.access_token });
    for (let i = 0; i < 6; i++) await invoke(app.pub, { method: 'POST', url: '/api/business-review/' + s2.json.review.id + '/advance', body: {}, token: s2.json.access_token });
    const rep2 = await invoke(app.pub, { method: 'GET', url: '/api/business-review/' + s2.json.review.id + '/report', token: s2.json.access_token });
    check('report-no-website', rep2.json);
    checkReportEnums(rep2.json.report);
    assert.strictEqual(rep2.json.report.business.assessment_level, 'reduced');
    check('report-ai-awaiting', rep.json);
    assert.strictEqual(rep.json.report.ai_visibility.state, 'awaiting_supported_test');
    assert.strictEqual(rep2.json.report.ai_visibility.state, 'awaiting_supported_test');
    const list = await invoke(app.admin, { method: 'GET', url: '/api/business-review/admin/reviews', headers: { Authorization: 'Bearer owner-session' } });
    check('admin-review', { ok: true, contract_version: '1.0', review: list.json.reviews[0], prospect: { status: 'new', follow_up_consent: true, marketing_consent: false, requested_services: [], workbook_id: null }, ai_visibility_state: list.json.reviews[0].ai_visibility_state, provider_failures: list.json.reviews[0].provider_failures, incomplete: list.json.reviews[0].incomplete });
    // every response carries the envelope headers
    [caps, val, s, rep, list].forEach(function (r) { assert.strictEqual(r.headers['cache-control'], 'no-store'); assert.strictEqual(r.headers['x-robots-tag'], 'noindex, nofollow, noarchive'); assert.strictEqual(r.headers['referrer-policy'], 'no-referrer'); assert.ok(/application\/json; charset=utf-8/.test(r.headers['content-type'])); });
    [val, bad].forEach(function (r) { assert.strictEqual(r.json.ok, false); assert.strictEqual(r.json.contract_version, '1.0'); });
  } finally { await w.close(); }
});

test('contract: error codes map to the documented HTTP statuses', function () {
  const { STATUS } = require('../api/_lib/br/http');
  const doc = { validation_failed: 400, bad_json: 400, unsupported_media_type: 415, payload_too_large: 413, turnstile_failed: 403, turnstile_unavailable: 503, rate_limited: 429, daily_limit: 503, url_not_allowed: 400, unresolvable: 422, site_unreachable: 422, blocked_by_robots: 422, not_found: 404, expired: 410, step_in_progress: 409, wrong_state: 409, consent_required: 400, provider_unavailable: 503, budget_exhausted: 503, delivery_not_configured: 503, delivery_failed: 502, pdf_unavailable: 501, unauthenticated: 401, forbidden: 403, conflict: 409, internal: 500 };
  Object.keys(doc).forEach(function (k) { assert.strictEqual(STATUS[k], doc[k], k); });
});

test('contract: fixtures parse, are marked as fixtures, and production code never imports them', function () {
  const dir = path.join(__dirname, 'fixtures', 'business-review');
  const files = fs.readdirSync(dir);
  assert.strictEqual(files.length, 10);
  files.forEach(function (f) { const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); assert.strictEqual(j.fixture, true, f); assert.ok(/fictional|demonstration/i.test(j.fixture_note), f); });
  const walk = function (d) { return fs.readdirSync(d, { withFileTypes: true }).reduce(function (a, e) { const p = path.join(d, e.name); return a.concat(e.isDirectory() ? walk(p) : [p]); }, []); };
  walk(path.join(__dirname, '..', 'api')).filter(function (f) { return f.endsWith('.js'); }).forEach(function (f) { assert.ok(!/fixtures/.test(fs.readFileSync(f, 'utf8')), f + ' must not reference fixtures'); });
});
