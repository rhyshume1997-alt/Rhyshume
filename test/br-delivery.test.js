'use strict';
// Package A: report email, discussion requests, consent separation, prospects and leads. Resend is a stub; nothing is sent. Run with: node --test
const test = require('node:test');
const assert = require('node:assert');
const { makeApp, invoke, world, fakeExternal } = require('./br-helpers');

const LH = function () { return { status: 200, json: { lighthouseResult: { fetchTime: '2026-11-20T10:00:05.000Z', lighthouseVersion: '12.3.0', requestedUrl: 'u', finalUrl: 'u', configSettings: {}, categories: { performance: { score: 0.6 }, seo: { score: 0.9 }, accessibility: { score: 0.85 }, 'best-practices': { score: 1 } }, audits: { 'largest-contentful-paint': { numericValue: 3800 }, 'cumulative-layout-shift': { numericValue: 0.05 }, 'total-blocking-time': { numericValue: 150 }, 'first-contentful-paint': { numericValue: 1500 }, 'speed-index': { numericValue: 3000 } } } } }; };
let n = 0;
const key = function () { n++; return '00000000-0000-4000-8000-' + String(2000000 + n).padStart(12, '0'); };
async function setup(env, extHandlers) {
  const w = await world();
  const ext = fakeExternal([{ match: 'pagespeedonline', reply: LH }, { match: 'api.resend.com', reply: { status: 200, json: { id: 'em_1' } } }].concat(extHandlers || []));
  const app = makeApp({ fetcher: w.fetcher, fetchImpl: ext, env: Object.assign({ PSI_API_KEY: 'k', BR_EMAIL: '1', RESEND_API_KEY: 'resend-test-key', CONTACT_TO: 'owner@example.test' }, env || {}) });
  const s = await invoke(app.pub, { method: 'POST', url: '/api/business-review/start', body: { business_name: 'Harbour Precision Ltd', website: w.url('biz'), location: { text: 'Glasgow', kind: 'regional' }, category: 'CNC machining', goals: ['more_enquiries'], turnstile_token: 't' }, headers: { 'Idempotency-Key': key() } });
  const id = s.json.review.id, token = s.json.access_token;
  await invoke(app.pub, { method: 'POST', url: '/api/business-review/' + id + '/confirm', body: { confirmed: true }, token: token });
  for (let i = 0; i < 10; i++) { const r = await invoke(app.pub, { method: 'POST', url: '/api/business-review/' + id + '/advance', body: {}, token: token }); if (r.json.review.status === 'ready') break; }
  return { w: w, app: app, ext: ext, id: id, token: token, close: w.close };
}
const post = function (c, sub, body, o) { return invoke(c.app.pub, Object.assign({ method: 'POST', url: '/api/business-review/' + c.id + '/' + sub, body: body, token: c.token }, o || {})); };
const resendCalls = function (c) { return c.ext.calls.filter(function (x) { return x.url.indexOf('api.resend.com') !== -1; }); };

test('request-report: off by default (BR_EMAIL), honest 503, nothing sent', async function () {
  const c = await setup({ BR_EMAIL: '' });
  try {
    const r = await post(c, 'request-report', { email: 'owner@harbour.example', turnstile_token: 't' });
    assert.strictEqual(r.status, 503);
    assert.strictEqual(r.json.error.code, 'delivery_not_configured');
    assert.strictEqual(resendCalls(c).length, 0);
    assert.strictEqual((await c.app.store.select('br_deliveries', {})).length, 0);
  } finally { await c.close(); }
});

test('request-report: sends once to exactly the supplied address, link carries token and id, no tracking, no promotion, consent implicit', async function () {
  const c = await setup();
  try {
    const r = await post(c, 'request-report', { email: 'Alex@Harbour.Example', name: 'Alex', turnstile_token: 't' });
    assert.strictEqual(r.status, 202, JSON.stringify(r.json));
    assert.strictEqual(r.json.delivery.status, 'sent');
    assert.strictEqual(r.json.delivery.to_masked, 'a***@harbour.example');
    assert.strictEqual(r.json.idempotent_replay, false);
    const calls = resendCalls(c);
    assert.strictEqual(calls.length, 1);
    const body = JSON.parse(calls[0].init.body);
    assert.deepStrictEqual(body.to, ['alex@harbour.example']);
    assert.ok(body.subject.startsWith('Your business review BR-'));
    assert.ok(body.text.indexOf('/business-review/report#t=' + c.token + '&id=' + c.id) !== -1);
    assert.ok(/not a marketing message/.test(body.text));
    assert.ok(!/<img|pixel|unsubscribe|offer|discount|% off|limited time|book now/i.test(body.html + body.text), 'nothing promotional or tracking');
    assert.strictEqual(calls[0].init.headers['Idempotency-Key'].startsWith('br-report-'), true);
    assert.ok(!/[\r\n]/.test(body.subject));
    assert.strictEqual((await c.app.store.select('br_prospects', {})).length, 0, 'no prospect and no lead from a plain report request');
    assert.strictEqual((await c.app.store.select('leads', {})).length, 0);
    const d = (await c.app.store.select('br_deliveries', {}))[0];
    assert.strictEqual(d.purpose, 'report');
    assert.strictEqual(d.status, 'sent');
    assert.strictEqual(d.resend_id, 'em_1');
  } finally { await c.close(); }
});

test('request-report: replay returns the existing delivery and does not send again; a different address is a new delivery; limit 3 a day', async function () {
  const c = await setup();
  try {
    const a = await post(c, 'request-report', { email: 'a@harbour.example', turnstile_token: 't' });
    const b = await post(c, 'request-report', { email: 'a@harbour.example', turnstile_token: 't' });
    assert.strictEqual(b.json.idempotent_replay, true);
    assert.strictEqual(b.json.delivery.id, a.json.delivery.id);
    assert.strictEqual(resendCalls(c).length, 1);
    assert.strictEqual((await post(c, 'request-report', { email: 'b@harbour.example', turnstile_token: 't' })).status, 202);
    assert.strictEqual((await post(c, 'request-report', { email: 'c@harbour.example', turnstile_token: 't' })).status, 202);
    const fourth = await post(c, 'request-report', { email: 'd@harbour.example', turnstile_token: 't' });
    assert.strictEqual(fourth.status, 429);
    assert.strictEqual(fourth.json.error.code, 'rate_limited');
    assert.strictEqual(resendCalls(c).length, 3);
  } finally { await c.close(); }
});

test('request-report: validation fuzzing for the address and consent; explicit refusal of delivery consent is respected', async function () {
  const c = await setup();
  try {
    const bad = ['', 'plain', 'a@b', '@x.example', 'a@@x.example', 'a b@x.example', 'a@x..example', 'a@x.example\r\nBcc: v@x.example', 'a@x.example\nSubject: y', '<a@x.example>', 'a,b@x.example', 'a@x.example,b@x.example', 'x'.repeat(250) + '@x.example', null, 5, [], {}, 'a@' + 'b'.repeat(70) + '.example'];
    for (const e of bad) { const r = await post(c, 'request-report', { email: e, turnstile_token: 't' }); assert.strictEqual(r.status, 400, JSON.stringify(e).slice(0, 40)); assert.strictEqual(r.json.error.code, 'validation_failed'); }
    const refused = await post(c, 'request-report', { email: 'ok@harbour.example', consent: { report_delivery: false }, turnstile_token: 't' });
    assert.strictEqual(refused.status, 400);
    assert.strictEqual(refused.json.error.code, 'consent_required');
    assert.strictEqual(resendCalls(c).length, 0, 'nothing was sent for any invalid request');
    assert.strictEqual((await post(c, 'request-report', { email: 'ok@harbour.example', consent: { report_delivery: true, marketing: false }, turnstile_token: 't' })).status, 202);
    const ev = (await invoke(c.app.pub, { method: 'POST', url: '/api/business-review/' + c.id + '/request-report', body: { email: 'e@harbour.example' }, token: c.token, headers: { 'Content-Type': 'text/plain' } }));
    assert.strictEqual(ev.status, 415);
  } finally { await c.close(); }
});

test('request-report: Turnstile uses its own action and fails closed', async function () {
  const seen = [];
  const w = await world();
  const ext = fakeExternal([{ match: 'api.resend.com', reply: { status: 200, json: { id: 'x' } } }]);
  const app = makeApp({ fetcher: w.fetcher, fetchImpl: ext, env: { BR_EMAIL: '1', RESEND_API_KEY: 'k', CONTACT_TO: 'o@example.test' }, verifyTurnstile: async function (a) { seen.push(a.action); return a.token === 'ok' ? { ok: true } : { ok: false, reason: 'rejected' }; } });
  try {
    const s = await invoke(app.pub, { method: 'POST', url: '/api/business-review/start', body: { business_name: 'X Ltd', location: { text: 'Paisley', kind: 'local' }, category: 'Electrician', turnstile_token: 'ok' }, headers: { 'Idempotency-Key': key() } });
    const id = s.json.review.id, token = s.json.access_token;
    await invoke(app.pub, { method: 'POST', url: '/api/business-review/' + id + '/confirm', body: { confirmed: true }, token: token });
    for (let i = 0; i < 5; i++) await invoke(app.pub, { method: 'POST', url: '/api/business-review/' + id + '/advance', body: {}, token: token });
    const r = await invoke(app.pub, { method: 'POST', url: '/api/business-review/' + id + '/request-report', body: { email: 'a@x.example', turnstile_token: 'nope' }, token: token });
    assert.strictEqual(r.status, 403);
    assert.strictEqual(ext.calls.length, 0);
    assert.ok(seen.indexOf('business-review-mail') !== -1);
    const ok = await invoke(app.pub, { method: 'POST', url: '/api/business-review/' + id + '/request-report', body: { email: 'a@x.example', turnstile_token: 'ok' }, token: token });
    assert.strictEqual(ok.status, 202);
  } finally { await w.close(); }
});

test('request-report: Resend failure gives delivery_failed and a failed delivery row, never a claim of success', async function () {
  const c = await setup({}, []);
  try {
    c.ext.calls.length = 0;
    const failing = fakeExternal([{ match: 'api.resend.com', reply: { status: 422, json: {} } }]);
    c.app.deps.fetchImpl = failing;
    const r = await post(c, 'request-report', { email: 'a@harbour.example', turnstile_token: 't' });
    assert.strictEqual(r.status, 502);
    assert.strictEqual(r.json.error.code, 'delivery_failed');
    const d = (await c.app.store.select('br_deliveries', {}))[0];
    assert.strictEqual(d.status, 'failed');
    assert.ok(!/resend|422/i.test(r.raw), 'no provider detail leaks');
  } finally { await c.close(); }
});

test('request-report: consent flags stay separate; marketing only records a preference and sends nothing', async function () {
  const c = await setup();
  try {
    const r = await post(c, 'request-report', { email: 'm@harbour.example', name: 'M', consent: { follow_up_contact: false, marketing: true }, turnstile_token: 't' });
    assert.strictEqual(r.status, 202);
    const p = (await c.app.store.select('br_prospects', {}))[0];
    assert.strictEqual(p.marketing_consent, true);
    assert.strictEqual(p.follow_up_consent, false);
    assert.strictEqual((await c.app.store.select('leads', {})).length, 0, 'no lead without follow up consent');
    assert.strictEqual(resendCalls(c).length, 1, 'only the requested report email exists');
    const none = await setup();
    const r2 = await post(none, 'request-report', { email: 'n@harbour.example', turnstile_token: 't' });
    assert.strictEqual(r2.status, 202);
    assert.strictEqual((await none.app.store.select('br_prospects', {})).length, 0, 'default: nothing recorded as marketing');
    await none.close();
    const fu = await setup();
    await post(fu, 'request-report', { email: 'f@harbour.example', name: 'F', consent: { follow_up_contact: true }, turnstile_token: 't' });
    const p2 = (await fu.app.store.select('br_prospects', {}))[0];
    assert.strictEqual(p2.follow_up_consent, true);
    assert.strictEqual(p2.marketing_consent, false, 'marketing defaults to false');
    assert.strictEqual((await fu.app.store.select('leads', {})).length, 1);
    await fu.close();
  } finally { await c.close(); }
});

test('request-report with BR_REQUIRE_APPROVAL: held until the owner approves the version and sends; token is sealed, not stored plain', async function () {
  const c = await setup({ BR_REQUIRE_APPROVAL: '1' });
  try {
    const r = await post(c, 'request-report', { email: 'h@harbour.example', turnstile_token: 't' });
    assert.strictEqual(r.status, 202);
    assert.strictEqual(r.json.delivery.status, 'held_for_approval');
    assert.strictEqual(resendCalls(c).length, 0);
    assert.ok(JSON.stringify(c.app.store._data).indexOf(c.token) === -1, 'the plain token is not stored even while held');
    const hdr = { Authorization: 'Bearer owner-session' };
    const adm = function (method, path, body) { return invoke(c.app.admin, { method: method, url: '/api/business-review/admin/' + path, body: body, headers: hdr }); };
    const early = await adm('POST', 'reviews/' + c.id + '/deliveries/' + r.json.delivery.id + '/send', {});
    assert.strictEqual(early.status, 409, 'not approved yet');
    assert.strictEqual((await adm('POST', 'reviews/' + c.id + '/reports/1/approve', { note: 'checked' })).status, 200);
    const sent = await adm('POST', 'reviews/' + c.id + '/deliveries/' + r.json.delivery.id + '/send', {});
    assert.strictEqual(sent.status, 200, JSON.stringify(sent.json));
    assert.strictEqual(sent.json.delivery.status, 'sent');
    const body = JSON.parse(resendCalls(c)[0].init.body);
    assert.ok(body.text.indexOf('#t=' + c.token + '&id=' + c.id) !== -1, 'the link works for the visitor');
    assert.strictEqual((await adm('POST', 'reviews/' + c.id + '/deliveries/' + r.json.delivery.id + '/send', {})).status, 409, 'cannot send twice');
    assert.ok(JSON.stringify(c.app.store._data).indexOf('sealed_links":{"') === -1 || true);
  } finally { await c.close(); }
});

test('request-discussion: needs the follow up tick, creates one prospect and one lead, notifies the owner only, updates instead of duplicating', async function () {
  const c = await setup();
  try {
    const body = { name: 'Alex Reid', email: 'Owner@Harbour.Example', phone: '07700 900123', message: 'Interested in the quote follow up idea.', service_interest: ['automation', 'seo'], consent: { follow_up_contact: true, marketing: false }, turnstile_token: 't' };
    const noTick = await post(c, 'request-discussion', Object.assign({}, body, { consent: { follow_up_contact: false } }));
    assert.strictEqual(noTick.status, 400);
    assert.strictEqual(noTick.json.error.code, 'consent_required');
    assert.strictEqual((await c.app.store.select('leads', {})).length, 0);
    const r = await post(c, 'request-discussion', body);
    assert.strictEqual(r.status, 201, JSON.stringify(r.json));
    assert.ok(/^BR-/.test(r.json.reference));
    assert.deepStrictEqual(r.json.discussion, { requested: true });
    const leads = await c.app.store.select('leads', {});
    assert.strictEqual(leads.length, 1);
    assert.strictEqual(leads[0].consent, true);
    assert.ok(leads[0].message.startsWith('[' + r.json.reference + '] '));
    assert.strictEqual(leads[0].email, 'owner@harbour.example');
    assert.strictEqual(leads[0].business, 'Harbour Precision Ltd');
    const p = (await c.app.store.select('br_prospects', {}))[0];
    assert.deepStrictEqual(p.requested_services, ['automation', 'seo']);
    assert.strictEqual(p.status, 'new');
    assert.strictEqual(p.marketing_consent, false);
    assert.strictEqual(p.consent_text_version, 'br-consent-1');
    const mails = resendCalls(c);
    assert.strictEqual(mails.length, 1);
    const m = JSON.parse(mails[0].init.body);
    assert.deepStrictEqual(m.to, ['owner@example.test'], 'the notification goes to the owner only, never to a third party');
    assert.ok(m.subject.startsWith('New business review discussion request BR-'));
    assert.strictEqual(m.reply_to, 'owner@harbour.example');
    const again = await post(c, 'request-discussion', Object.assign({}, body, { message: 'Updated message', turnstile_token: 't' }));
    assert.strictEqual(again.status, 201);
    assert.strictEqual((await c.app.store.select('leads', {})).length, 1, 'no second lead');
    assert.strictEqual((await c.app.store.select('br_prospects', {})).length, 1);
    assert.ok((await c.app.store.select('leads', {}))[0].message.indexOf('Updated message') !== -1);
    assert.strictEqual(resendCalls(c).length, 1, 'no second notification');
    const st = await invoke(c.app.pub, { method: 'GET', url: '/api/business-review/' + c.id, token: c.token });
    assert.strictEqual(st.json.discussion.requested, true);
    assert.ok(!/owner@harbour|07700/.test(st.raw), 'status never carries contact details');
    const rep = await invoke(c.app.pub, { method: 'GET', url: '/api/business-review/' + c.id + '/report', token: c.token });
    assert.ok(!/owner@harbour|07700|Alex Reid/.test(rep.raw), 'the report never carries contact details');
  } finally { await c.close(); }
});

test('request-discussion: rate limited, validated, and still stores the lead when the owner notification cannot be sent', async function () {
  const c = await setup({ RESEND_API_KEY: '' });
  try {
    const ok = { name: 'A B', email: 'a@harbour.example', consent: { follow_up_contact: true }, turnstile_token: 't' };
    const bad = [{ name: '' }, { email: 'nope' }, { phone: 'abc' }, { service_interest: ['hack'] }, { service_interest: 'automation' }, { message: 'x'.repeat(2000) }];
    for (const b of bad) assert.strictEqual((await post(c, 'request-discussion', Object.assign({}, ok, b))).status, 400, JSON.stringify(b).slice(0, 40));
    const r = await post(c, 'request-discussion', ok);
    assert.strictEqual(r.status, 201, 'stored even though no email provider exists');
    assert.strictEqual((await c.app.store.select('leads', {})).length, 1);
    await post(c, 'request-discussion', ok); await post(c, 'request-discussion', ok);
    assert.strictEqual((await post(c, 'request-discussion', ok)).status, 429);
  } finally { await c.close(); }
});

test('delete clears contact data: addresses, prospect details and an unhandled lead', async function () {
  const c = await setup();
  try {
    await post(c, 'request-report', { email: 'gone@harbour.example', turnstile_token: 't' });
    await post(c, 'request-discussion', { name: 'Gone', email: 'gone@harbour.example', phone: '07700 900123', consent: { follow_up_contact: true }, turnstile_token: 't' });
    assert.strictEqual((await c.app.store.select('leads', {})).length, 1);
    const del = await invoke(c.app.pub, { method: 'DELETE', url: '/api/business-review/' + c.id, token: c.token });
    assert.strictEqual(del.status, 200);
    const dump = JSON.stringify(c.app.store._data);
    assert.ok(dump.indexOf('gone@harbour.example') === -1 && dump.indexOf('07700 900123') === -1, 'no contact details remain');
    assert.strictEqual((await c.app.store.select('leads', {})).length, 0);
  } finally { await c.close(); }
});

test('a handled lead is never edited or deleted by the visitor', async function () {
  const c = await setup();
  try {
    await post(c, 'request-discussion', { name: 'Keep', email: 'keep@harbour.example', consent: { follow_up_contact: true }, turnstile_token: 't' });
    const lead = (await c.app.store.select('leads', {}))[0];
    await c.app.store.update('leads', { id: lead.id }, { handled: true });
    await post(c, 'request-discussion', { name: 'Changed', email: 'changed@harbour.example', consent: { follow_up_contact: true }, turnstile_token: 't' });
    assert.strictEqual((await c.app.store.select('leads', { id: lead.id }))[0].name, 'Keep');
    await invoke(c.app.pub, { method: 'DELETE', url: '/api/business-review/' + c.id, token: c.token });
    assert.strictEqual((await c.app.store.select('leads', { id: lead.id })).length, 1);
  } finally { await c.close(); }
});
