'use strict';
// Unit tests for the owner-only "email the client link" route. Mail provider and Supabase are STUBS. Fictional client only.
const test = require('node:test');
const assert = require('node:assert');
const m = require('../api/_lib/client-link-mail');
const handler = require('../api/client-link-email');

const OWNER = 'owner@example.test';
const TOK = 'a'.repeat(48);
const LINK = 'https://www.rhyshume.co.uk/c-09b37e50c043baaa/#t=' + TOK;
const env = Object.assign({ CLIENT_OWNER_EMAIL: OWNER, RESEND_API_KEY: 're_SECRET_KEY_VALUE', CONTACT_FROM: 'Rhys Hume <hello@rhyshume.co.uk>' });
const good = { action: 'send', to: 'maple@example.test', link: LINK, business: 'Maple Street Bakery' };

function stub(userOverrides, calls) {
  return async function (url, o) {
    calls.push({ url: String(url), o });
    if (String(url).endsWith('/auth/v1/user')) {
      const auth = o.headers.Authorization;
      if (auth === 'Bearer owner-token') return { ok: true, json: async () => Object.assign({ email: OWNER, email_confirmed_at: '2026-01-01', app_metadata: {} }, userOverrides) };
      if (auth === 'Bearer client-token') return { ok: true, json: async () => ({ email: 'maple@example.test', email_confirmed_at: 'x', app_metadata: { role: 'client' } }) };
      return { ok: false, status: 401, json: async () => ({}) };
    }
    if (String(url) === 'https://api.resend.com/emails') return { ok: true, json: async () => ({ id: 'em_1' }) };
    throw new Error('unexpected ' + url);
  };
}
const run = (body, token, e, calls, ov) => m.handle({ token, body }, { env: e || env, fetchImpl: stub(ov, calls || []) });
test.beforeEach(() => m.rateReset());

test('owner can send, email goes to the one recipient with the link, nothing else', async () => {
  const calls = []; const r = await run(good, 'owner-token', env, calls);
  assert.strictEqual(r.status, 200); assert.deepStrictEqual(r.body, { ok: true });
  const sent = calls.find(c => c.url.includes('resend')); const p = JSON.parse(sent.o.body);
  assert.deepStrictEqual(p.to, ['maple@example.test']); assert.ok(p.text.includes(LINK) && p.html.includes(LINK));
  assert.strictEqual(sent.o.headers.Authorization, 'Bearer re_SECRET_KEY_VALUE');
});
test('fails closed: no owner address configured', async () => {
  const calls = []; const r = await run(good, 'owner-token', { RESEND_API_KEY: 'k' }, calls);
  assert.strictEqual(r.status, 503); assert.ok(!calls.some(c => c.url.includes('resend')));
});
test('CONTACT_TO is only trusted as owner when it is a single address', () => {
  assert.strictEqual(m.config({ CONTACT_TO: 'a@example.test' }).owner, 'a@example.test');
  assert.strictEqual(m.config({ CONTACT_TO: 'a@example.test,b@example.test' }).owner, '');
  assert.strictEqual(m.config({ CLIENT_OWNER_EMAIL: ' Owner@Example.TEST ' }).owner, 'owner@example.test');
});
test('no token, bad token, client token, other person: nothing sent', async () => {
  for (const [t, code] of [['', 401], ['bad', 401], ['client-token', 403]]) {
    const calls = []; const r = await run(good, t, env, calls);
    assert.strictEqual(r.status, code, t); assert.ok(!calls.some(c => c.url.includes('resend')));
  }
  const calls = []; const r = await run(good, 'owner-token', env, calls, { email: 'someone@example.test' });
  assert.strictEqual(r.status, 403); assert.ok(!calls.some(c => c.url.includes('resend')));
});
test('owner lookalikes are refused: case difference accepted only as same address, plus, dots, spaces, unicode', async () => {
  for (const e of ['owner+x@example.test', 'o.wner@example.test', 'owner@example.test.evil', 'оwner@example.test']) {
    const r = await run(good, 'owner-token', env, [], { email: e });
    assert.notStrictEqual(r.status, 200, e);
  }
  assert.strictEqual((await run(good, 'owner-token', env, [], { email: ' OWNER@example.test ' })).status, 200);
});
test('unconfirmed or anonymous users are refused', async () => {
  assert.strictEqual((await run(good, 'owner-token', env, [], { email_confirmed_at: null })).status, 401);
  assert.strictEqual((await run(good, 'owner-token', env, [], { is_anonymous: true })).status, 401);
});
test('role client in app_metadata is refused even with the owner address', async () => {
  assert.strictEqual((await run(good, 'owner-token', env, [], { app_metadata: { role: 'client' } })).status, 403);
});
test('mail not configured: honest 503 and status reports it, nothing sent', async () => {
  const e2 = { CLIENT_OWNER_EMAIL: OWNER }; const calls = [];
  const s = await run({ action: 'status' }, 'owner-token', e2, calls); assert.deepStrictEqual(s.body, { ok: true, mail: false, missing: ['RESEND_API_KEY'] });
  const r = await run(good, 'owner-token', e2, calls); assert.strictEqual(r.status, 503); assert.strictEqual(r.body.code, 'mail_not_configured');
  assert.ok(!calls.some(c => c.url.includes('resend')));
  assert.deepStrictEqual((await run({ action: 'status' }, 'owner-token', env, [])).body, { ok: true, mail: true, missing: [] });
});
test('status is owner only', async () => assert.strictEqual((await run({ action: 'status' }, '', env, [])).status, 401));
test('validation: recipient and link', async () => {
  const bad = [{ to: 'a@b' }, { to: 'a@example.test,b@example.test' }, { to: 'a@example.test\nBcc: x@y.test' }, { to: 'x'.repeat(250) + '@example.test' }, { to: '' }, { to: 5 }];
  for (const b of bad) assert.strictEqual((await run(Object.assign({}, good, b), 'owner-token')).status, 400, JSON.stringify(b).slice(0, 40));
  const links = ['http://www.rhyshume.co.uk/c-09b37e50c043baaa/#t=' + TOK, 'https://evil.example/c-09b37e50c043baaa/#t=' + TOK, 'https://www.rhyshume.co.uk.evil.test/c-09b37e50c043baaa/#t=' + TOK,
    'https://www.rhyshume.co.uk/c-09b37e50c043baaa/#t=' + 'a'.repeat(47), LINK + '\n', LINK + 'x', 'https://www.rhyshume.co.uk/other/#t=' + TOK, 'https://rhyshume.co.uk/c-09b37e50c043baaa/?x=1#t=' + TOK, 'https://www.rhyshume.co.uk/c-09b37e50c043baaa/#t=' + 'G'.repeat(48), 7, null];
  for (const l of links) { const r = await run(Object.assign({}, good, { link: l }), 'owner-token'); assert.strictEqual(r.status, 400, String(l)); assert.strictEqual(r.body.code, 'bad_link'); }
  assert.strictEqual((await run({ action: 'nope' }, 'owner-token')).status, 400);
  assert.strictEqual((await run(null, 'owner-token')).status, 400);
});
test('rate limit: 30 second cooldown, 5 per recipient per hour, 20 per hour overall', async () => {
  let t = 1000000; const d = () => ({ env, fetchImpl: stub({}, []), now: t });
  assert.strictEqual((await m.handle({ token: 'owner-token', body: good }, d())).status, 200);
  const again = await m.handle({ token: 'owner-token', body: good }, d()); assert.strictEqual(again.status, 429); assert.ok(again.body.retry_after_s <= 30);
  for (let i = 0; i < 4; i++) { t += 31000; assert.strictEqual((await m.handle({ token: 'owner-token', body: good }, d())).status, 200); }
  t += 31000; assert.strictEqual((await m.handle({ token: 'owner-token', body: good }, d())).status, 429);
  m.rateReset(); t += 4000000;
  for (let i = 0; i < 20; i++) { t += 31000; assert.strictEqual((await m.handle({ token: 'owner-token', body: Object.assign({}, good, { to: 'p' + i + '@example.test' }) }, d())).status, 200, 'send ' + i); }
  t += 31000; assert.strictEqual((await m.handle({ token: 'owner-token', body: Object.assign({}, good, { to: 'z@example.test' }) }, d())).status, 429);
});
test('provider failure gives a generic error, no provider detail', async () => {
  const f = async url => String(url).endsWith('/auth/v1/user') ? { ok: true, json: async () => ({ email: OWNER, email_confirmed_at: 'x' }) } : { ok: false, status: 422, json: async () => ({ message: 'secret detail' }) };
  const r = await m.handle({ token: 'owner-token', body: good }, { env, fetchImpl: f });
  assert.strictEqual(r.status, 502); assert.deepStrictEqual(r.body, { ok: false, code: 'mail_failed' });
});
test('email content: plain, transactional, says who and what, no tracking, no marketing, no password', () => {
  const e = m.buildEmail({ to: 'x@example.test', link: LINK, business: 'Maple Street Bakery <b>' });
  assert.ok(/Rhys Hume/.test(e.text) && /private page/.test(e.text) && /not marketing/.test(e.text) && /What is stored/.test(e.text));
  assert.ok(!/unsubscribe|track|pixel|<img|password:|temporary password/i.test(e.html + e.text.replace('There is no account and no password.', '')));
  assert.ok(!e.html.includes('<b>') && e.html.includes('&lt;b&gt;'));
  assert.ok(!/\r|\n/.test(e.subject)); assert.strictEqual((e.html.match(/<a /g) || []).length, 1);
});
test('no secret or address or token appears in logs or responses', async () => {
  const logs = []; const ol = console.log, oe = console.error; console.log = (...a) => logs.push(a.join(' ')); console.error = (...a) => logs.push(a.join(' '));
  try {
    const ok = await run(good, 'owner-token'); m.rateReset();
    const nm = await run(good, 'owner-token', { CLIENT_OWNER_EMAIL: OWNER }); m.rateReset();
    const f = async url => String(url).endsWith('/auth/v1/user') ? { ok: true, json: async () => ({ email: OWNER, email_confirmed_at: 'x' }) } : { ok: false, status: 500, json: async () => ({}) };
    const fail = await m.handle({ token: 'owner-token', body: good }, { env, fetchImpl: f });
    const all = logs.join('\n') + JSON.stringify([ok, nm, fail]);
    for (const s of ['re_SECRET_KEY_VALUE', TOK, 'maple@example.test', 'owner-token']) assert.ok(!all.includes(s), s);
  } finally { console.log = ol; console.error = oe; }
});
test('http wrapper: POST only, JSON only, no CORS headers, no-store, bearer required', async () => {
  const mk = (method, headers, body) => { const h = {}; let status = 0, out = ''; const { EventEmitter } = require('node:events'); const req = new EventEmitter(); req.method = method; req.headers = headers || {}; req.body = body; req.destroy = () => {};
    return { req, res: { setHeader: (k, v) => { h[k.toLowerCase()] = v; }, set statusCode(v) { status = v; }, end: s => { out = s; } }, get: () => ({ h, status, out }) }; };
  let c = mk('GET'); await handler(c.req, c.res); assert.strictEqual(c.get().status, 405);
  c = mk('POST', { 'content-type': 'text/plain' }, {}); await handler(c.req, c.res); assert.strictEqual(c.get().status, 415);
  c = mk('POST', { 'content-type': 'application/json' }, good); await handler(c.req, c.res);
  const g = c.get(); assert.ok([401, 503].includes(g.status)); assert.ok(!Object.keys(g.h).some(k => k.startsWith('access-control'))); assert.strictEqual(g.h['cache-control'], 'private, no-store');
});
