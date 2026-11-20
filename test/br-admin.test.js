'use strict';
// Package A: admin routes (owner only). Run with: node --test
const test = require('node:test');
const assert = require('node:assert');
const { makeApp, invoke, world, fakeExternal } = require('./br-helpers');

const LH = function () { return { status: 200, json: { lighthouseResult: { fetchTime: '2026-11-20T10:00:05.000Z', lighthouseVersion: '12.3.0', requestedUrl: 'u', finalUrl: 'u', configSettings: {}, categories: { performance: { score: 0.6 }, seo: { score: 0.9 }, accessibility: { score: 0.85 }, 'best-practices': { score: 1 } }, audits: { 'largest-contentful-paint': { numericValue: 3800 }, 'cumulative-layout-shift': { numericValue: 0.05 }, 'total-blocking-time': { numericValue: 150 }, 'first-contentful-paint': { numericValue: 1500 }, 'speed-index': { numericValue: 3000 } } } } }; };
let n = 0;
const key = function () { n++; return '00000000-0000-4000-8000-' + String(3000000 + n).padStart(12, '0'); };
const OWNER = { Authorization: 'Bearer owner-session' };
async function setup(env, appOpts) {
  const w = await world();
  const ext = fakeExternal([{ match: 'pagespeedonline', reply: LH }, { match: 'api.resend.com', reply: { status: 200, json: { id: 'em' } } }]);
  const app = makeApp(Object.assign({ fetcher: w.fetcher, fetchImpl: ext, env: Object.assign({ PSI_API_KEY: 'k' }, env || {}) }, appOpts || {}));
  const s = await invoke(app.pub, { method: 'POST', url: '/api/business-review/start', body: { business_name: 'Harbour Precision Ltd', website: w.url('biz'), location: { text: 'Glasgow', kind: 'regional' }, category: 'CNC machining', goals: ['more_enquiries'], turnstile_token: 't' }, headers: { 'Idempotency-Key': key() } });
  const id = s.json.review.id, token = s.json.access_token;
  await invoke(app.pub, { method: 'POST', url: '/api/business-review/' + id + '/confirm', body: { confirmed: true, competitor_nomination: { name: 'Rival Components', website: w.url('rival') } }, token: token });
  for (let i = 0; i < 10; i++) { const r = await invoke(app.pub, { method: 'POST', url: '/api/business-review/' + id + '/advance', body: {}, token: token }); if (r.json.review.status === 'ready') break; }
  return { w: w, app: app, ext: ext, id: id, token: token, close: w.close };
}
const adm = function (c, method, path, body, hdr) { return invoke(c.app.admin, { method: method, url: '/api/business-review/admin/' + path, body: body, headers: hdr === undefined ? OWNER : hdr }); };

test('admin: authentication is owner only; no session 401, another person 403, unset owner email fails closed', async function () {
  const c = await setup();
  try {
    const paths = ['metrics', 'providers', 'reviews', 'reviews/' + c.id];
    for (const p of paths) {
      assert.strictEqual((await adm(c, 'GET', p, undefined, {})).status, 401, p);
      assert.strictEqual((await adm(c, 'GET', p, undefined, { Authorization: 'Bearer garbage' })).status, 401, p);
      const other = await adm(c, 'GET', p, undefined, { Authorization: 'Bearer other-session' });
      assert.strictEqual(other.status, 403, p);
      assert.strictEqual(other.json.error.code, 'forbidden');
      assert.strictEqual((await adm(c, 'GET', p)).status, 200, p);
    }
    assert.strictEqual((await adm(c, 'GET', 'reviews', undefined, { Authorization: 'Bearer ' + c.token })).status, 401, 'a visitor review token is not an owner session');
    const noOwner = await setup({ BR_OWNER_EMAIL: '' });
    assert.strictEqual((await adm(noOwner, 'GET', 'metrics')).status, 403);
    await noOwner.close();
    assert.strictEqual((await adm(c, 'GET', 'nonsense')).status, 404);
    // case insensitive email match, and the real Supabase check is called with the token and never with the service key as bearer
    const probe = fakeExternal([{ match: 'supabase.co/auth/v1/user', reply: { status: 200, json: { email: 'OWNER@example.test' } } }]);
    const { ownerFromToken } = require('../api/_lib/br/admin');
    const who = await ownerFromToken({ cfg: c.app.deps.cfg, fetchImpl: probe }, 'user-jwt');
    assert.deepStrictEqual(who, { ok: true, email: 'owner@example.test' });
    assert.strictEqual(probe.calls[0].init.headers.Authorization, 'Bearer user-jwt');
    assert.strictEqual((await ownerFromToken({ cfg: c.app.deps.cfg, fetchImpl: fakeExternal([{ match: 'auth/v1/user', reply: { status: 401, json: {} } }]) }, 'x')).ok, false);
  } finally { await c.close(); }
});

test('admin: list, detail, metrics and providers show real rows and no secrets', async function () {
  const c = await setup({ SUPABASE_SERVICE_ROLE_KEY: 'SERVICE-SECRET-VALUE', RESEND_API_KEY: 'RESEND-SECRET' });
  try {
    const list = await adm(c, 'GET', 'reviews?status=ready&q=harbour');
    assert.strictEqual(list.status, 200);
    assert.strictEqual(list.json.reviews.length, 1);
    const row = list.json.reviews[0];
    assert.strictEqual(row.id, c.id);
    assert.strictEqual(row.incomplete, false);
    assert.strictEqual(row.provider_failures, 0);
    assert.strictEqual(row.ai_visibility_state, 'awaiting_supported_test');
    assert.strictEqual((await adm(c, 'GET', 'reviews?q=zzzz')).json.reviews.length, 0);
    assert.strictEqual((await adm(c, 'GET', 'reviews?status=bogus')).status, 400);
    assert.strictEqual((await adm(c, 'GET', 'reviews?q=' + row.ref)).json.reviews.length, 1);
    const d = await adm(c, 'GET', 'reviews/' + c.id);
    assert.strictEqual(d.status, 200);
    assert.ok(d.json.evidence.length > 20);
    assert.ok(d.json.evidence.every(function (e) { return e.source && e.observed_at && e.metric_key && e.label; }));
    assert.strictEqual(d.json.competitors.length, 1);
    assert.strictEqual(d.json.reports.length, 1);
    assert.ok(d.json.provider_calls.some(function (p) { return p.provider === 'pagespeed'; }));
    assert.ok(!JSON.stringify(d.json.provider_calls).includes('lighthouse'), 'call responses are not exposed');
    const m = await adm(c, 'GET', 'metrics?days=30');
    assert.strictEqual(m.json.metrics.reviews_started, 1);
    assert.strictEqual(m.json.metrics.reviews_completed, 1);
    assert.strictEqual(m.json.metrics.reports_requested, 0);
    assert.ok(m.json.notes[0].indexOf('Anonymous reviews are not leads') === 0);
    const p = await adm(c, 'GET', 'providers');
    assert.ok(p.json.providers.length >= 10);
    const text = JSON.stringify(p.json) + JSON.stringify(d.json) + JSON.stringify(m.json);
    ['SERVICE-SECRET-VALUE', 'RESEND-SECRET'].forEach(function (s) { assert.ok(text.indexOf(s) === -1, s); });
    assert.strictEqual((await adm(c, 'GET', 'reviews/not-a-uuid')).status, 404);
  } finally { await c.close(); }
});

test('admin: competitor actions re-queue, rebuild as a new version, and keep history; rejected ones are visible to the owner only', async function () {
  const c = await setup();
  try {
    const d0 = await adm(c, 'GET', 'reviews/' + c.id);
    const comp = d0.json.competitors[0];
    const rej = await adm(c, 'POST', 'reviews/' + c.id + '/competitors', { action: 'reject', competitor_id: comp.id, reason: 'Not a direct competitor' });
    assert.strictEqual(rej.status, 200, JSON.stringify(rej.json));
    assert.strictEqual(rej.json.review_status, 'ready', 'the owner action ran the steps and the review is ready again');
    const rep = (await invoke(c.app.pub, { method: 'GET', url: '/api/business-review/' + c.id + '/report', token: c.token })).json.report;
    assert.strictEqual(rep.version, 2);
    assert.strictEqual(rep.reason, 'competitors_changed');
    assert.strictEqual(rep.competitors.items.length, 0);
    assert.ok(!JSON.stringify(rep).includes('Rival Components'), 'a rejected competitor is not shown to the visitor');
    const v1 = (await invoke(c.app.pub, { method: 'GET', url: '/api/business-review/' + c.id + '/report?version=1', token: c.token })).json.report;
    assert.strictEqual(v1.competitors.items.length, 1, 'the delivered first version is unchanged');
    const detail = await adm(c, 'GET', 'reviews/' + c.id);
    assert.strictEqual(detail.json.competitors[0].status, 'rejected');
    assert.strictEqual(detail.json.competitors[0].rejected_reason, 'Not a direct competitor');
    const add = await adm(c, 'POST', 'reviews/' + c.id + '/competitors', { action: 'add', name: 'Poor Co', website: c.w.url('poor') });
    assert.strictEqual(add.status, 200);
    const rep3 = (await invoke(c.app.pub, { method: 'GET', url: '/api/business-review/' + c.id + '/report', token: c.token })).json.report;
    assert.strictEqual(rep3.version, 3);
    assert.strictEqual(rep3.competitors.state, 'owner_selected');
    assert.strictEqual(rep3.competitors.items[0].name, 'Poor Co');
    assert.strictEqual((await adm(c, 'POST', 'reviews/' + c.id + '/competitors', { action: 'add', name: 'Bad', website: 'http://127.0.0.1' })).status, 400);
    assert.strictEqual((await adm(c, 'POST', 'reviews/' + c.id + '/competitors', { action: 'nope' })).status, 400);
    assert.strictEqual((await adm(c, 'POST', 'reviews/' + c.id + '/competitors', { action: 'select', competitor_id: '11111111-1111-4111-8111-111111111111' })).status, 404);
    const sel = await adm(c, 'POST', 'reviews/' + c.id + '/competitors', { action: 'select', competitor_id: comp.id });
    assert.strictEqual(sel.status, 200);
    const log = await c.app.store.select('br_admin_log', {});
    assert.ok(log.length >= 3 && log.every(function (l) { return l.actor === 'owner@example.test'; }));
    assert.ok(!JSON.stringify(log).includes('harbour'), 'admin log holds no contact details');
  } finally { await c.close(); }
});

test('admin: regenerate is idempotent from stored evidence and makes no provider calls; revise creates a new owner version and never edits the old one', async function () {
  const c = await setup();
  try {
    const before = c.ext.calls.length;
    const rg = await adm(c, 'POST', 'reviews/' + c.id + '/regenerate', { reason: 'check' });
    assert.strictEqual(rg.status, 200);
    assert.strictEqual(rg.json.report_version, 1, 'unchanged evidence gives the same version, not a new one');
    assert.strictEqual(rg.json.created, false);
    assert.strictEqual(c.ext.calls.length, before, 'no provider calls');
    assert.strictEqual((await adm(c, 'POST', 'reviews/' + c.id + '/regenerate', {})).status, 400, 'a reason is required');
    const v1raw = JSON.stringify((await c.app.store.select('br_report_versions', { review_id: c.id }))[0].content);
    const recs = (await invoke(c.app.pub, { method: 'GET', url: '/api/business-review/' + c.id + '/report', token: c.token })).json.report.recommendations;
    assert.ok(recs.length > 0);
    const rv = await adm(c, 'POST', 'reviews/' + c.id + '/reports/1/revise', { reason: 'Hide one, add a note', overrides: { recommendations: [{ key: recs[0].key, hide: true }, { key: recs[1].key, owner_note: 'Worth discussing first.' }], finding_notes: ['Checked by hand.'] } });
    assert.strictEqual(rv.status, 201, JSON.stringify(rv.json));
    assert.strictEqual(rv.json.report_version, 2);
    const v2 = (await invoke(c.app.pub, { method: 'GET', url: '/api/business-review/' + c.id + '/report', token: c.token })).json.report;
    assert.strictEqual(v2.created_by, 'owner');
    assert.ok(!v2.recommendations.some(function (r) { return r.key === recs[0].key; }));
    assert.strictEqual(v2.recommendations[0].owner_note, 'Worth discussing first.');
    assert.deepStrictEqual(v2.recommendations.map(function (r) { return r.priority.rank; }), v2.recommendations.map(function (_, i) { return i + 1; }));
    assert.deepStrictEqual(v2.owner_notes, ['Checked by hand.']);
    const stored = await c.app.store.select('br_report_versions', { review_id: c.id }, { order: ['version.asc'] });
    assert.strictEqual(JSON.stringify(stored[0].content), v1raw, 'version 1 content is byte for byte unchanged');
    await assert.rejects(c.app.store.update('br_report_versions', { id: stored[0].id }, { content: { x: 1 } }), function (e) { return e.code === 'locked'; });
    await assert.rejects(c.app.store.delete('br_report_versions', { id: stored[0].id }), function (e) { return e.code === 'locked'; });
    assert.strictEqual(stored[0].status, 'superseded');
    // a later system rebuild keeps the owner's overrides
    const ro = await adm(c, 'POST', 'reviews/' + c.id + '/reports/1/revise', { reason: 'same again', overrides: { recommendations: [{ key: recs[0].key, hide: true }, { key: recs[1].key, owner_note: 'Worth discussing first.' }], finding_notes: ['Checked by hand.'] } });
    assert.strictEqual(ro.json.report_version, 2, 'identical revision creates nothing new');
    assert.strictEqual((await adm(c, 'POST', 'reviews/' + c.id + '/reports/9/revise', { reason: 'x', overrides: {} })).status, 404);
    const junk = await adm(c, 'POST', 'reviews/' + c.id + '/reports/1/revise', { reason: 'junk', overrides: { recommendations: [{ key: '<script>', hide: true }, 5, null], finding_notes: [1, {}] } });
    assert.ok(junk.status === 200 || junk.status === 201);
  } finally { await c.close(); }
});

test('admin: approve is recorded and repeatable; token extend and revoke work; link-workbook sets the prospect', async function () {
  const c = await setup();
  try {
    assert.strictEqual((await adm(c, 'POST', 'reviews/' + c.id + '/reports/1/approve', { note: 'ok' })).status, 200);
    const first = (await c.app.store.select('br_report_versions', { review_id: c.id }))[0].approved_at;
    assert.ok(first);
    await adm(c, 'POST', 'reviews/' + c.id + '/reports/1/approve', {});
    assert.strictEqual((await c.app.store.select('br_report_versions', { review_id: c.id }))[0].approved_at, first);
    assert.strictEqual((await adm(c, 'POST', 'reviews/' + c.id + '/reports/7/approve', {})).status, 404);
    const ex = await adm(c, 'POST', 'reviews/' + c.id + '/token', { action: 'extend', days: 60 });
    assert.strictEqual(ex.json.expires_at, '2027-01-19T10:00:00Z');
    assert.strictEqual((await adm(c, 'POST', 'reviews/' + c.id + '/token', { action: 'extend', days: 0 })).status, 400);
    assert.strictEqual((await adm(c, 'POST', 'reviews/' + c.id + '/token', { action: 'extend', days: 500 })).status, 400);
    assert.strictEqual((await adm(c, 'POST', 'reviews/' + c.id + '/token', { action: 'revoke' })).status, 200);
    assert.strictEqual((await invoke(c.app.pub, { method: 'GET', url: '/api/business-review/' + c.id, token: c.token })).status, 404, 'revoked');
    await adm(c, 'POST', 'reviews/' + c.id + '/token', { action: 'extend', days: 5 });
    assert.strictEqual((await invoke(c.app.pub, { method: 'GET', url: '/api/business-review/' + c.id, token: c.token })).status, 200, 'extend restores access');
    assert.strictEqual((await adm(c, 'POST', 'reviews/' + c.id + '/link-workbook', { workbook_id: '22222222-2222-4222-8222-222222222222' })).status, 404, 'no prospect yet');
    await invoke(c.app.pub, { method: 'POST', url: '/api/business-review/' + c.id + '/request-discussion', body: { name: 'A B', email: 'a@harbour.example', consent: { follow_up_contact: true }, turnstile_token: 't' }, token: c.token });
    assert.strictEqual((await adm(c, 'POST', 'reviews/' + c.id + '/link-workbook', { workbook_id: 'bad' })).status, 400);
    assert.strictEqual((await adm(c, 'POST', 'reviews/' + c.id + '/link-workbook', { workbook_id: '22222222-2222-4222-8222-222222222222' })).status, 200);
    const p = (await c.app.store.select('br_prospects', {}))[0];
    assert.strictEqual(p.status, 'draft_project');
    assert.strictEqual(p.workbook_id, '22222222-2222-4222-8222-222222222222');
    const m = await adm(c, 'GET', 'metrics');
    assert.strictEqual(m.json.metrics.projects_created, 1);
    assert.strictEqual(m.json.metrics.discussion_requests, 1);
  } finally { await c.close(); }
});

test('admin: AI run dry run costs nothing, shows the plan, and a real run is refused while the feature is off or unconfigured', async function () {
  const c = await setup();
  try {
    const before = c.ext.calls.length;
    const dry = await adm(c, 'POST', 'reviews/' + c.id + '/ai-visibility/run', { tools: ['ai_anthropic'], runs: 3, dry_run: true });
    assert.strictEqual(dry.status, 200);
    assert.strictEqual(dry.json.plan.within_caps, false);
    ['ai_visibility_disabled', 'daily_cap_zero', 'provider_not_configured:ai_anthropic'].forEach(function (r) { assert.ok(dry.json.plan.cap_reasons.indexOf(r) !== -1, r); });
    assert.strictEqual(dry.json.plan.calls, 30);
    const implicit = await adm(c, 'POST', 'reviews/' + c.id + '/ai-visibility/run', { tools: ['ai_anthropic'], runs: 3 });
    assert.ok(implicit.json.plan, 'omitting dry_run is a dry run');
    const real = await adm(c, 'POST', 'reviews/' + c.id + '/ai-visibility/run', { tools: ['ai_anthropic'], runs: 3, dry_run: false });
    assert.ok([503].indexOf(real.status) !== -1, JSON.stringify(real.json));
    assert.ok(['budget_exhausted', 'provider_unavailable'].indexOf(real.json.error.code) !== -1);
    assert.strictEqual(c.ext.calls.length, before, 'no external call of any kind');
    assert.strictEqual((await c.app.store.select('br_ai_runs', {})).length, 0);
    const rep = (await invoke(c.app.pub, { method: 'GET', url: '/api/business-review/' + c.id + '/report', token: c.token })).json.report;
    assert.strictEqual(rep.ai_visibility.state, 'awaiting_supported_test');
  } finally { await c.close(); }
});

test('admin: with a test adapter the AI run records runs, adds a report version, and the report shows counts without any percentage', async function () {
  const { registry } = require('../api/_lib/br/providers/index');
  const reg = registry({ ai_anthropic: { id: 'ai_anthropic', kind: 'ai_search', label: 'Test adapter', toolName: 'web_search', model: 'test', status: function () { return { state: 'available', reason: null }; },
    run: async function () { return { ok: true, data: { answer_text: 'Harbour Precision and Rival Components can help.', citations: [{ url: 'https://example.test/x', title: 't' }], search_queries: ['q'], model_reported: 'test-1', tool: 'web_search' }, cost_pence: 2 }; } } });
  const c = await setup({ BR_AI_VISIBILITY: '1', BR_AI_DAILY_CAP_PENCE: '1000', BR_AI_MAX_PENCE_PER_REVIEW: '300' }, { registry: reg });
  try {
    const run = await adm(c, 'POST', 'reviews/' + c.id + '/ai-visibility/run', { tools: ['ai_anthropic'], runs: 3, dry_run: false });
    assert.strictEqual(run.status, 200, JSON.stringify(run.json));
    assert.strictEqual(run.json.remaining_calls, 0);
    assert.strictEqual((await c.app.store.select('br_ai_runs', {})).length, 30);
    const rep = (await invoke(c.app.pub, { method: 'GET', url: '/api/business-review/' + c.id + '/report', token: c.token })).json.report;
    assert.strictEqual(rep.reason, 'ai_run_added');
    assert.strictEqual(rep.ai_visibility.state, 'complete');
    assert.strictEqual(rep.ai_visibility.summary.length, 10);
    assert.strictEqual(rep.ai_visibility.summary[0].business_named_in_runs, 3);
    assert.ok(!/%|percent/i.test(JSON.stringify(rep.ai_visibility)));
    assert.strictEqual(rep.business.assessment_level, 'full');
    const v1 = (await invoke(c.app.pub, { method: 'GET', url: '/api/business-review/' + c.id + '/report?version=1', token: c.token })).json.report;
    assert.strictEqual(v1.ai_visibility.state, 'awaiting_supported_test', 'history unchanged');
    const again = await adm(c, 'POST', 'reviews/' + c.id + '/ai-visibility/run', { tools: ['ai_anthropic'], runs: 3, dry_run: false });
    assert.strictEqual((await c.app.store.select('br_ai_runs', {})).length, 30, 'a repeat does not buy the same runs again');
    void again;
  } finally { await c.close(); }
});

test('admin: sweep accepts the cron secret or the owner, finishes stale reviews honestly and purges expired data', async function () {
  const c = await setup();
  try {
    const stuck = await invoke(c.app.pub, { method: 'POST', url: '/api/business-review/start', body: { business_name: 'Stuck Ltd', website: c.w.url('poor'), location: { text: 'Paisley', kind: 'local' }, category: 'Plumber', turnstile_token: 't' }, headers: { 'Idempotency-Key': key() }, ip: '198.51.100.88' });
    await invoke(c.app.pub, { method: 'POST', url: '/api/business-review/' + stuck.json.review.id + '/confirm', body: { confirmed: true }, token: stuck.json.access_token });
    assert.strictEqual((await adm(c, 'POST', 'sweep', {}, {})).status, 401);
    assert.strictEqual((await adm(c, 'POST', 'sweep', {}, { Authorization: 'Bearer wrong' })).status, 401);
    assert.strictEqual((await adm(c, 'POST', 'sweep', {}, { Authorization: 'Bearer other-session' })).status, 403);
    c.app.clock.t = new Date(c.app.clock.t.getTime() + 30 * 3600 * 1000);
    const sw = await adm(c, 'POST', 'sweep', {}, { Authorization: 'Bearer test-cron-secret' });
    assert.strictEqual(sw.status, 200, JSON.stringify(sw.json));
    assert.strictEqual(sw.json.finished_stale, 1);
    const rv = (await c.app.store.select('br_reviews', { id: stuck.json.review.id }))[0];
    assert.strictEqual(rv.status, 'ready');
    assert.strictEqual(rv.completeness, 'partial');
    const rep = (await invoke(c.app.pub, { method: 'GET', url: '/api/business-review/' + stuck.json.review.id + '/report', token: stuck.json.access_token })).json.report;
    assert.ok(rep.evidence_index.every(function (e) { return e.evidence_state !== 'verified_public_observation' || e.value !== null; }));
    c.app.clock.t = new Date(c.app.clock.t.getTime() + 100 * 86400000);
    const purge = await adm(c, 'GET', 'sweep');
    assert.strictEqual(purge.status, 200);
    assert.ok(purge.json.purge.reviews_deleted >= 2);
    assert.strictEqual((await c.app.store.select('br_evidence', {})).length, 0, 'evidence went with the purged reviews');
  } finally { await c.close(); }
});
