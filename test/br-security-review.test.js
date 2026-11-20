'use strict';
// Security review fixes: real delete, owner delete, leads only through functions, BR_SALT required, per recipient mail limits. Run with: node --test
const test = require('node:test');
const assert = require('node:assert');
const { makeApp, invoke, world, fakeExternal } = require('./br-helpers');
const { storageConfigured, loadConfig } = require('../api/_lib/br/config');
const { createSupabaseStore } = require('../api/_lib/br/db');

const OWNER = { Authorization: 'Bearer owner-session' };
const LH = { status: 200, json: { lighthouseResult: { fetchTime: '2026-11-20T10:00:05.000Z', lighthouseVersion: '12.3.0', requestedUrl: 'u', finalUrl: 'u', configSettings: {}, categories: { performance: { score: 0.5 } }, audits: {} } } };
let n = 0;
const key = function () { n++; return '00000000-0000-4000-8000-' + String(7000000 + n).padStart(12, '0'); };
async function setup(env) {
  const w = await world();
  const ext = fakeExternal([{ match: 'pagespeedonline', reply: LH }, { match: 'api.resend.com', reply: { status: 200, json: { id: 'em' } } }]);
  const app = makeApp({ fetcher: w.fetcher, fetchImpl: ext, env: Object.assign({ PSI_API_KEY: 'k', BR_EMAIL: '1', RESEND_API_KEY: 'r', CONTACT_TO: 'o@example.test' }, env || {}) });
  const start = async function (name, ip) {
    const s = await invoke(app.pub, { method: 'POST', url: '/api/business-review/start', body: Object.assign({ business_name: name, location: { text: 'Glasgow', kind: 'regional' }, category: 'CNC', goals: ['more_enquiries'], turnstile_token: 't' }, ip ? {} : { website: w.url('biz') }), headers: { 'Idempotency-Key': key() }, ip: ip || '203.0.113.9' });
    if (!s.json.review) throw new Error('start failed ' + s.status + ' ' + JSON.stringify(s.json));
    const id = s.json.review.id, token = s.json.access_token;
    await invoke(app.pub, { method: 'POST', url: '/api/business-review/' + id + '/confirm', body: { confirmed: true, competitor_nomination: { name: 'Rival', website: w.url('rival') } }, token: token });
    for (let i = 0; i < 10; i++) { const r = await invoke(app.pub, { method: 'POST', url: '/api/business-review/' + id + '/advance', body: {}, token: token }); if (r.json.review.status === 'ready') break; }
    return { id: id, token: token };
  };
  return { w: w, app: app, start: start, close: w.close };
}

test('visitor delete really deletes: review row, evidence, reports, provider snapshots and contact details', async function () {
  const c = await setup();
  try {
    const r = await c.start('Delete Me Ltd');
    await invoke(c.app.pub, { method: 'POST', url: '/api/business-review/' + r.id + '/request-discussion', body: { name: 'Gone', email: 'gone@harbour.example', consent: { follow_up_contact: true }, turnstile_token: 't' }, token: r.token });
    const d = c.app.store._data;
    assert.ok(d.br_evidence.length > 0 && d.br_provider_calls.length > 0 && d.br_report_versions.length > 0);
    assert.strictEqual((await invoke(c.app.pub, { method: 'DELETE', url: '/api/business-review/' + r.id, token: r.token })).status, 200);
    ['br_reviews', 'br_evidence', 'br_provider_calls', 'br_report_versions', 'br_prospects', 'br_deliveries', 'br_competitors', 'br_ai_runs', 'br_automation_opportunities'].forEach(function (t) { assert.strictEqual(d[t].length, 0, t + ' is empty'); });
    assert.strictEqual(d.leads.length, 0);
    assert.ok(JSON.stringify(d).indexOf('Delete Me Ltd') === -1 && JSON.stringify(d).indexOf('gone@harbour.example') === -1);
  } finally { await c.close(); }
});

test('owner can delete any review (test records) through the admin route; others cannot; the log survives without the review link', async function () {
  const c = await setup();
  try {
    const r = await c.start('Test Record Ltd');
    const del = function (hdr) { return invoke(c.app.admin, { method: 'DELETE', url: '/api/business-review/admin/reviews/' + r.id, headers: hdr }); };
    assert.strictEqual((await del({})).status, 401);
    assert.strictEqual((await del({ Authorization: 'Bearer other-session' })).status, 403);
    assert.strictEqual((await del({ Authorization: 'Bearer ' + r.token })).status, 401, 'a visitor token is not an owner session');
    assert.strictEqual((await c.app.store.select('br_reviews', { id: r.id })).length, 1);
    assert.strictEqual((await del(OWNER)).status, 200);
    assert.strictEqual(c.app.store._data.br_reviews.length, 0);
    assert.strictEqual(c.app.store._data.br_evidence.length, 0);
    const log = c.app.store._data.br_admin_log.filter(function (x) { return x.action === 'delete_review'; });
    assert.strictEqual(log.length, 1);
    assert.strictEqual(log[0].review_id, null);
    assert.strictEqual((await del(OWNER)).status, 404);
  } finally { await c.close(); }
});

test('leads are reached only through br_lead_put and br_lead_drop (the live service role has no table access to leads)', async function () {
  const calls = [];
  const st = createSupabaseStore({ url: 'https://x.supabase.co', serviceKey: 'k', fetchImpl: async function (u) { calls.push(u); return { ok: true, status: 200, text: async function () { return '[]'; }, json: async function () { return []; } }; } });
  for (const op of ['insert', 'select', 'update', 'delete']) {
    await assert.rejects(function () { return op === 'insert' ? st.insert('leads', { a: 1 }) : st[op]('leads', { id: 'x' }, { a: 1 }); }, function (e) { return e.code === 'store_error'; });
  }
  assert.strictEqual(calls.length, 0);
  await st.rpc('br_lead_put', {}); await st.rpc('br_lead_drop', {});
  assert.ok(calls[0].endsWith('/rest/v1/rpc/br_lead_put') && calls[1].endsWith('/rest/v1/rpc/br_lead_drop'));
  await assert.rejects(function () { return st.rpc('purge_everything', {}); });
});

test('BR_SALT is required: unset or short means storage is not configured (fail closed)', function () {
  const base = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' };
  assert.strictEqual(storageConfigured(loadConfig(base)), false);
  assert.strictEqual(storageConfigured(loadConfig(Object.assign({ BR_SALT: 'short' }, base))), false);
  assert.strictEqual(storageConfigured(loadConfig(Object.assign({ BR_SALT: 'x'.repeat(24) }, base))), true);
});

test('email bombing: one third party address gets at most 3 report emails a day across different reviews', async function () {
  const c = await setup();
  try {
    let sent = 0, limited = 0;
    for (let i = 0; i < 5; i++) {
      const r = await c.start('Bomb ' + i + ' Ltd', '198.51.100.' + (10 + i));
      const res = await invoke(c.app.pub, { method: 'POST', url: '/api/business-review/' + r.id + '/request-report', body: { email: 'victim@example.test', turnstile_token: 't', consent: {} }, token: r.token });
      if (res.status === 202) sent++; else if (res.status === 429) limited++;
    }
    assert.strictEqual(sent, 3);
    assert.strictEqual(limited, 2);
  } finally { await c.close(); }
});
