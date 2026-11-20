'use strict';
// Unit tests for client access (Option B). Supabase Auth, the REST API, Cloudflare and Resend are STUBS (a small stateful fake). Fictional client only.
const test = require('node:test');
const assert = require('node:assert');
const lib = require('../api/_lib/client-access');
const pw = require('../api/_lib/client-password');

const OWNER = 'owner@example.test', SKEY = 'SERVICE_ROLE_SECRET_VALUE', WID = '11111111-1111-4111-8111-111111111111';
const env = { CLIENT_OWNER_EMAIL: OWNER, SUPABASE_SERVICE_ROLE_KEY: SKEY, RESEND_API_KEY: 're_SECRET', TURNSTILE_SECRET_KEY: 'ts_secret' };

function fake(opts) {
  opts = opts || {};
  const st = { users: {}, accounts: [], logs: [], calls: [], mails: [], rate: {}, n: 0, failAccountInsert: false, rateFail: false };
  const jwt = {}; // access token -> user id
  st.addUser = (email, password, app) => { const id = '00000000-0000-4000-8000-' + String(++st.n).padStart(12, '0'); st.users[id] = { id, email, password, app_metadata: app || {}, email_confirmed_at: 'x' }; return id; };
  st.tokenFor = (id) => { const t = 'tok.' + id; jwt[t] = id; return t; };
  st.addUser(OWNER, 'x', {}); // the owner
  const json = (status, body) => ({ ok: status < 300, status, text: async () => body === undefined ? '' : JSON.stringify(body), json: async () => body });
  st.fetch = async (url, o) => {
    url = String(url); o = o || {}; const body = o.body && typeof o.body === 'string' && o.body[0] === '{' || (o.body && o.body[0] === '[') ? JSON.parse(o.body) : (o.body instanceof URLSearchParams ? Object.fromEntries(o.body) : o.body);
    st.calls.push({ url, method: o.method || 'GET', body, headers: o.headers || {} });
    const path = url.replace(/^https:\/\/[^/]+/, ''), method = o.method || 'GET', hdr = o.headers || {};
    if (url.startsWith('https://challenges.cloudflare.com')) return json(200, { success: opts.turnstile !== false, hostname: 'www.rhyshume.co.uk', action: 'client-login' });
    if (url === 'https://api.resend.com/emails') { st.mails.push(body); return json(200, { id: 'em' }); }
    const bearer = String(hdr.Authorization || '').replace('Bearer ', '');
    if (path === '/auth/v1/user') { const id = jwt[bearer]; return id ? json(200, st.users[id]) : json(401, {}); }
    if (path.startsWith('/auth/v1/token')) { const u = Object.values(st.users).find(x => x.email === body.email && x.password === body.password); return u ? json(200, { access_token: 'x' }) : json(400, {}); }
    if (path.startsWith('/auth/v1/logout')) return json(204);
    const isSvc = bearer === SKEY; if (!isSvc) return json(401, {});
    let m;
    if (path === '/auth/v1/admin/users' && method === 'POST') { if (Object.values(st.users).some(u => u.email === body.email)) return json(422, { msg: 'exists' }); const id = st.addUser(body.email, body.password, body.app_metadata); return json(200, { id }); }
    if ((m = /^\/auth\/v1\/admin\/users\/([0-9a-f-]+)$/.exec(path))) { const u = st.users[m[1]]; if (!u) return json(404, {}); if (method === 'GET') return json(200, Object.assign({ last_sign_in_at: '2026-11-20T09:00:00Z' }, u)); if (method === 'DELETE') { delete st.users[m[1]]; return json(200, {}); } if (method === 'PUT') { if (body.password) u.password = body.password; if (body.ban_duration) u.ban = body.ban_duration; if (body.app_metadata) { for (const [k, v] of Object.entries(body.app_metadata)) { if (v === null) delete u.app_metadata[k]; else u.app_metadata[k] = v; } } return json(200, u); } }
    if (path === '/rest/v1/rpc/client_rate_hit') { if (st.rateFail) return json(500, {}); const k = body.p_bucket; st.rate[k] = (st.rate[k] || 0) + 1; return json(200, { allowed: st.rate[k] <= body.p_max, hits: st.rate[k], retry_after_s: 30 }); }
    if (path === '/rest/v1/client_access_log' && method === 'POST') { st.logs.push(body); return json(201); }
    if (path.startsWith('/rest/v1/client_accounts')) {
      if (method === 'POST') { if (st.failAccountInsert) return json(409, {}); st.accounts.push(Object.assign({ id: 'acc' + (st.accounts.length + 1), status: 'active', created_at: 'now', disabled_at: null, password_changed_at: null }, body)); return json(201); }
      const q = new URL('https://x' + path).searchParams;
      let rows = st.accounts.filter(a => Object.entries(Object.fromEntries(q)).every(([k, v]) => !/^eq\./.test(v) || String(a[k]) === decodeURIComponent(v.slice(3))));
      if (method === 'GET') return json(200, rows.slice(0, 1).map(a => Object.assign({}, a)));
      if (method === 'PATCH') { rows.forEach(a => Object.assign(a, body)); return json(204); }
      if (method === 'DELETE') { st.accounts = st.accounts.filter(a => !rows.includes(a)); return json(204); }
    }
    return json(404, {});
  };
  return st;
}
const owner = st => st.tokenFor(Object.keys(st.users)[0]);
const O = (st, body, e, extra) => lib.ownerHandle({ token: owner(st), body }, Object.assign({ env: e || env, fetchImpl: st.fetch, randomInt: undefined }, extra || {}));

test('temporary password: 16 characters, no look-alikes, all classes, from crypto.randomInt, spread evenly', () => {
  const seen = new Set(), freq = {}; let used = 0;
  for (let i = 0; i < 4000; i++) { const p = pw.generateTemp(n => { used++; return require('node:crypto').randomInt(n); }); assert.strictEqual(p.length, 16); assert.ok(/^[ACDEFGHJKMNPQRTUVWXYabcdefghjkmnpqrtuvwxy34679]{16}$/.test(p)); assert.ok(!/[0O1lIiSo5Z28B]/.test(p)); assert.ok(/[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p)); seen.add(p); for (const c of p) freq[c] = (freq[c] || 0) + 1; }
  assert.strictEqual(seen.size, 4000); assert.ok(used >= 64000);
  const exp = 4000 * 16 / pw.ALPHABET.length; for (const c of pw.ALPHABET) assert.ok(freq[c] > exp * 0.75 && freq[c] < exp * 1.35, c + ' ' + freq[c]); // digits run a little high: the at-least-one-digit rule is applied by redrawing, which keeps every valid password equally likely
  assert.ok(Math.log2(pw.ALPHABET.length) * 16 > 85);
});
test('new password rules', () => {
  const r = (p, e) => pw.checkNew(p, e || 'maple@example.test');
  assert.ok(r('quiet river lantern').ok); assert.ok(r('Tr4veller-Plum-Hat').ok);
  assert.ok(r('short1A').reasons.includes('short')); assert.ok(r('x'.repeat(129)).reasons.includes('long'));
  for (const p of ['password1234', 'Password123!', 'qwertyuiop12', '123456789012', 'welcome2026', 'aaaaaaaaaaaa', 'abcdefghijkl', 'abababababab']) assert.ok(!r(p).ok, p);
  assert.ok(r('MapleIsGreat99').reasons.includes('email')); assert.ok(!r(undefined).ok); assert.ok(!r(12345678901234).ok);
});
test('fails closed without the service role key: nothing is called, honest state', async () => {
  const st = fake(); const e = { CLIENT_OWNER_EMAIL: OWNER, RESEND_API_KEY: 'k' };
  const c = await O(st, { action: 'config' }, e); assert.deepStrictEqual(c.body, { ok: true, login_setup: false, missing: ['SUPABASE_SERVICE_ROLE_KEY'], mail: true });
  for (const a of ['create', 'reset', 'disable', 'delete', 'status', 'email_info']) { const r = await O(st, { action: a, workbook_id: WID, email: 'maple@example.test' }, e); assert.strictEqual(r.status, 503, a); assert.strictEqual(r.body.code, 'not_set_up'); }
  assert.ok(!st.calls.some(x => x.url.includes('/admin/') || x.url.includes('client_accounts')));
  const ch = await lib.changeHandle({ token: 't', body: { new_password: 'a long enough one', turnstile: 'x' }, ip: '1.1.1.1' }, { env: { SUPABASE_SERVICE_ROLE_KEY: '', TURNSTILE_SECRET_KEY: 'x' }, fetchImpl: st.fetch });
  assert.strictEqual(ch.status, 503);
});
test('owner only: no token, junk, client token, other user', async () => {
  const st = fake(); const cid = st.addUser('maple@example.test', 'p', { role: 'client' }), oid = st.addUser('someone@example.test', 'p', {});
  for (const [t, code] of [['', 401], ['junk', 401], [st.tokenFor(cid), 403], [st.tokenFor(oid), 403]]) { const r = await lib.ownerHandle({ token: t, body: { action: 'create', workbook_id: WID, email: 'a@example.test' } }, { env, fetchImpl: st.fetch }); assert.strictEqual(r.status, code); }
  assert.ok(!st.calls.some(x => x.url.includes('/admin/')));
});
test('create: validation', async () => {
  const st = fake();
  for (const b of [{ workbook_id: 'nope', email: 'a@example.test' }, { workbook_id: WID, email: 'bad' }, { workbook_id: WID, email: 'a@example.test\nb@example.test' }, { workbook_id: WID, email: OWNER }, { workbook_id: WID, email: ' OWNER@Example.test ' }, { workbook_id: WID, email: 'a@example.test', email_password: true }, { workbook_id: 5, email: 'a@example.test' }]) {
    const r = await O(st, Object.assign({ action: 'create' }, b)); assert.ok(r.status === 400, JSON.stringify(b) + ' ' + r.status);
  }
  assert.ok(!st.calls.some(x => x.url.includes('/admin/users') && x.method === 'POST'));
});
test('create: auth user with the right flags, account row, temp password returned once, never stored or logged', async () => {
  const st = fake(); const logs = []; const ol = console.log, oe = console.error; console.log = (...a) => logs.push(a.join(' ')); console.error = (...a) => logs.push(a.join(' '));
  let r, s2; const T0 = Date.now(); globalThis.__T0 = T0; try { r = await O(st, { action: 'create', workbook_id: WID, email: ' Maple@Example.test ', business: 'Maple Street Bakery' }, env, { now: T0 }); s2 = await O(st, { action: 'status', workbook_id: WID }); } finally { console.log = ol; console.error = oe; }
  assert.strictEqual(r.status, 200); const p = r.body.temp_password; assert.ok(/^[A-Za-z0-9]{16}$/.test(p));
  const cu = st.calls.find(x => x.url.endsWith('/auth/v1/admin/users') && x.method === 'POST');
  assert.strictEqual(cu.body.email, 'maple@example.test'); assert.strictEqual(cu.body.email_confirm, true); assert.strictEqual(cu.headers.Authorization, 'Bearer ' + SKEY);
  assert.deepStrictEqual(cu.body.app_metadata, { role: 'client', must_change_password: true, workbook_id: WID, temp_expires_at: new Date(globalThis.__T0 + 7 * 86400000).toISOString() });
  assert.ok(!('user_metadata' in cu.body));
  assert.strictEqual(st.accounts.length, 1); assert.strictEqual(st.accounts[0].must_change_password, true); assert.strictEqual(st.accounts[0].email, 'maple@example.test');
  const everywhere = JSON.stringify([st.accounts, st.logs, s2.body, logs]) + JSON.stringify(st.calls.filter(c => !c.url.endsWith('/auth/v1/admin/users')).map(c => c.body));
  assert.ok(!everywhere.includes(p), 'temp password leaked outside the one response'); assert.ok(!everywhere.includes(SKEY)); assert.ok(!JSON.stringify(logs).includes('maple@example.test'));
  assert.strictEqual(st.logs[0].action, 'create'); assert.strictEqual(s2.body.state, 'must_change'); assert.ok(!('temp_password' in s2.body));
  assert.strictEqual(st.mails.length, 0);
});
test('create: second login for the same client refused; unusable address gives a generic answer; failed row insert removes the auth user', async () => {
  const st = fake(); await O(st, { action: 'create', workbook_id: WID, email: 'maple@example.test' });
  assert.strictEqual((await O(st, { action: 'create', workbook_id: WID, email: 'other@example.test' })).status, 409);
  const st2 = fake(); st2.addUser('taken@example.test', 'p', {}); const g = await O(st2, { action: 'create', workbook_id: WID, email: 'taken@example.test' }); assert.deepStrictEqual(g.body, { ok: false, code: 'cannot_create' });
  const g2 = await O(st2, { action: 'create', workbook_id: WID, email: OWNER }); assert.deepStrictEqual(g2.body, { ok: false, code: 'cannot_create' });
  const st3 = fake(); st3.failAccountInsert = true; const f = await O(st3, { action: 'create', workbook_id: WID, email: 'a@example.test' }); assert.strictEqual(f.status, 409);
  assert.ok(!Object.values(st3.users).some(u => u.email === 'a@example.test'), 'orphan auth user left behind');
});
test('rate limits fail closed, including when the counter breaks', async () => {
  const st = fake(); st.rateFail = true; assert.strictEqual((await O(st, { action: 'create', workbook_id: WID, email: 'a@example.test' })).status, 429); assert.ok(!st.calls.some(x => x.url.endsWith('/admin/users')));
  const s2 = fake(); for (let i = 0; i < 10; i++) await O(s2, { action: 'create', workbook_id: '2222222' + i + '-1111-4111-8111-111111111111', email: 'a' + i + '@example.test' });
  assert.strictEqual((await O(s2, { action: 'create', workbook_id: '33333333-1111-4111-8111-111111111111', email: 'z@example.test' })).status, 429);
});
test('emails: login instructions never hold the password or the private link; the password email is separate and needs an explicit risk acknowledgement and is logged', async () => {
  const st = fake(); const r = await O(st, { action: 'create', workbook_id: WID, email: 'maple@example.test', business: 'Maple Street Bakery', send_info: true });
  assert.strictEqual(r.body.info_sent, true); assert.strictEqual(st.mails.length, 1); const m = st.mails[0];
  assert.ok(!m.text.includes(r.body.temp_password) && !m.html.includes(r.body.temp_password)); assert.ok(!/c-09b37e50c043baaa|#t=/.test(m.text + m.html)); assert.ok(m.text.includes('https://www.rhyshume.co.uk/client/') && /not contain it/.test(m.text) && /What is stored/.test(m.text));
  assert.deepStrictEqual(m.to, ['maple@example.test']);
  const st2 = fake(); const r2 = await O(st2, { action: 'create', workbook_id: WID, email: 'maple@example.test', send_info: true, email_password: true, acknowledged_risk: true });
  assert.strictEqual(st2.mails.length, 2); const [a, b] = st2.mails; assert.ok(!a.text.includes(r2.body.temp_password) && b.text.includes(r2.body.temp_password)); assert.ok(!/https?:\/\//.test(b.text) && !b.html.includes('href'));
  assert.ok(st2.logs.some(l => l.action === 'email_password_warning') && !JSON.stringify(st2.logs).includes(r2.body.temp_password));
  const st3 = fake(); const r3 = await O(st3, { action: 'create', workbook_id: WID, email: 'a@example.test', send_info: true }, { CLIENT_OWNER_EMAIL: OWNER, SUPABASE_SERVICE_ROLE_KEY: SKEY });
  assert.strictEqual(r3.status, 200); assert.strictEqual(r3.body.info_sent, false); assert.strictEqual(r3.body.info_error, 'mail_not_configured');
});
test('reset: new password, flags back, session epoch bumped, old password gone; disable; delete; all logged', async () => {
  const st = fake(); const c = await O(st, { action: 'create', workbook_id: WID, email: 'maple@example.test' });
  const uid = Object.values(st.users).find(u => u.email === 'maple@example.test').id; st.users[uid].app_metadata.must_change_password = false; st.accounts[0].must_change_password = false; st.accounts[0].temp_expires_at = null;
  const r = await O(st, { action: 'reset', workbook_id: WID }, env, { now: 2000000000000 });
  assert.strictEqual(r.status, 200); assert.notStrictEqual(r.body.temp_password, c.body.temp_password); assert.strictEqual(st.users[uid].password, r.body.temp_password);
  assert.strictEqual(st.users[uid].app_metadata.must_change_password, true); assert.strictEqual(st.accounts[0].must_change_password, true); assert.strictEqual(st.accounts[0].session_epoch, new Date(2000000000000).toISOString());
  const d = await O(st, { action: 'disable', workbook_id: WID }); assert.strictEqual(d.status, 200); assert.strictEqual(st.accounts[0].status, 'disabled'); assert.ok(st.users[uid].ban);
  const s = await O(st, { action: 'status', workbook_id: WID }); assert.strictEqual(s.body.state, 'disabled'); assert.ok(s.body.last_sign_in_at);
  const x = await O(st, { action: 'delete', workbook_id: WID }); assert.strictEqual(x.status, 200); assert.ok(!st.users[uid]); assert.strictEqual(st.accounts.length, 0);
  assert.deepStrictEqual(st.logs.map(l => l.action), ['create', 'reset', 'disable', 'delete']); assert.ok(st.logs.every(l => l.actor === OWNER && l.workbook_id === WID));
  assert.strictEqual((await O(st, { action: 'reset', workbook_id: WID })).status, 404);
  assert.strictEqual((await O(st, { action: 'nope', workbook_id: WID })).status, 400);
});
test('state labels: none, active, must change, expired, disabled', () => {
  const now = Date.now(); const s = lib.stateOf;
  assert.strictEqual(s(null, now), 'none'); assert.strictEqual(s({ status: 'active', must_change_password: false }, now), 'active');
  assert.strictEqual(s({ status: 'active', must_change_password: true, temp_expires_at: new Date(now + 1000).toISOString() }, now), 'must_change');
  assert.strictEqual(s({ status: 'active', must_change_password: true, temp_expires_at: new Date(now - 1000).toISOString() }, now), 'expired');
  assert.strictEqual(s({ status: 'disabled', must_change_password: false }, now), 'disabled');
});
// ---- forced change
async function setupClient(st, temp) {
  const c = await O(st, { action: 'create', workbook_id: WID, email: 'maple@example.test' }); const u = Object.values(st.users).find(x => x.email === 'maple@example.test');
  return { temp: c.body.temp_password, uid: u.id, tok: st.tokenFor(u.id) };
}
const C = (st, tok, body, extra) => lib.changeHandle({ token: tok, body: Object.assign({ turnstile: 'cf' }, body), ip: '203.0.113.9' }, Object.assign({ env, fetchImpl: st.fetch }, extra || {}));
const NOW3 = Date.now() + 5000;
test('forced change: succeeds, clears the flag in the auth user and the account row in one step, bumps the epoch, logs', async () => {
  const st = fake(); const c = await setupClient(st);
  const r = await C(st, c.tok, { new_password: 'quiet river lantern' }, { now: NOW3 });
  assert.deepStrictEqual(r, { status: 200, body: { ok: true } });
  assert.strictEqual(st.users[c.uid].password, 'quiet river lantern'); assert.strictEqual(st.users[c.uid].app_metadata.must_change_password, false); assert.ok(!('temp_expires_at' in st.users[c.uid].app_metadata)); assert.strictEqual(st.users[c.uid].app_metadata.role, 'client');
  const a = st.accounts[0]; assert.strictEqual(a.must_change_password, false); assert.strictEqual(a.temp_expires_at, null); assert.strictEqual(a.session_epoch, new Date(NOW3).toISOString());
  assert.ok(st.calls.some(x => x.url.includes('/auth/v1/logout?scope=global'))); assert.ok(st.logs.some(l => l.action === 'change_password'));
  assert.ok(!JSON.stringify([st.logs, st.accounts]).includes('quiet river lantern'));
  assert.strictEqual((await C(st, c.tok, { new_password: 'another long passphrase' })).status, 409, 'not a general password changer');
});
test('forced change: refused cases (nothing changes)', async () => {
  const st = fake(); const c = await setupClient(st); const before = JSON.stringify([st.users, st.accounts]);
  const cases = [
    ['no turnstile token', () => lib.changeHandle({ token: c.tok, body: { new_password: 'quiet river lantern' }, ip: '1.1.1.1' }, { env, fetchImpl: st.fetch }), 403],
    ['turnstile rejected', () => C(fake2(st, { turnstile: false }), c.tok, { new_password: 'quiet river lantern' }), 403],
    ['no access token', () => C(st, '', { new_password: 'quiet river lantern' }), 401],
    ['junk access token', () => C(st, 'junk', { new_password: 'quiet river lantern' }), 401],
    ['owner token (not a client)', () => C(st, owner(st), { new_password: 'quiet river lantern' }), 403],
    ['too short', () => C(st, c.tok, { new_password: 'Short1!' }), 400],
    ['common', () => C(st, c.tok, { new_password: 'Password123!' }), 400],
    ['same as the temporary password', () => C(st, c.tok, { new_password: c.temp + 'ab' === 'x' ? '' : c.temp }), 400],
    ['not a string', () => C(st, c.tok, { new_password: { a: 1 } }), 400],
    ['temporary password expired', () => C(st, c.tok, { new_password: 'quiet river lantern' }, { now: Date.now() + 8 * 86400000 }), 403]
  ];
  for (const [n, f, code] of cases) { const r = await f(); assert.strictEqual(r.status, code, n + ' ' + JSON.stringify(r.body)); }
  assert.strictEqual(JSON.stringify([st.users, st.accounts]), before);
  st.accounts[0].status = 'disabled'; assert.strictEqual((await C(st, c.tok, { new_password: 'quiet river lantern' })).status, 403);
  st.accounts[0].status = 'active'; st.accounts[0].email = 'changed@example.test'; assert.strictEqual((await C(st, c.tok, { new_password: 'quiet river lantern' })).status, 403);
  const other = st.addUser('other@example.test', 'p', { role: 'client' }); assert.strictEqual((await C(st, st.tokenFor(other), { new_password: 'quiet river lantern' })).status, 403);
  const rr = await C(st, c.tok, { new_password: 'Short1!' }); assert.ok(!('temp_password' in rr.body));
});
function fake2(st, o) { const f = fake(o); Object.assign(f, { users: st.users, accounts: st.accounts, logs: st.logs, rate: st.rate }); return f; }
test('forced change: rate limited per user and per address, fails closed when the counter fails', async () => {
  const st = fake(); const c = await setupClient(st); let last;
  for (let i = 0; i < 9; i++) last = await C(st, c.tok, { new_password: 'Short1!' }); assert.strictEqual(last.status, 429);
  const s2 = fake(); const c2 = await setupClient(s2); s2.rateFail = true; assert.strictEqual((await C(s2, c2.tok, { new_password: 'quiet river lantern' })).status, 429);
});
test('no service role key, turnstile secret, token, password or address in any response', async () => {
  const st = fake(); const c = await setupClient(st); const rs = [];
  rs.push(await C(st, c.tok, { new_password: 'Short1!' })); rs.push(await C(st, 'junk', { new_password: 'x' })); rs.push(await O(st, { action: 'status', workbook_id: WID }));
  rs.push(await lib.ownerHandle({ token: 'junk', body: {} }, { env, fetchImpl: st.fetch }));
  const all = JSON.stringify(rs); for (const s of [SKEY, 'ts_secret', 're_SECRET', c.tok, c.temp]) assert.ok(!all.includes(s), s);
});
test('http wrappers: POST only, JSON only, no CORS headers, no-store', async () => {
  const h1 = require('../api/client-access'), h2 = require('../api/client-change-password');
  for (const h of [h1, h2]) {
    const mk = (method, headers, body) => { const hh = {}; let status = 0; const { EventEmitter } = require('node:events'); const req = new EventEmitter(); Object.assign(req, { method, headers: headers || {}, body, destroy() {} }); return { req, res: { setHeader: (k, v) => { hh[k.toLowerCase()] = v; }, set statusCode(v) { status = v; }, end() {} }, get: () => ({ hh, status }) }; };
    let c = mk('GET'); await h(c.req, c.res); assert.strictEqual(c.get().status, 405);
    c = mk('POST', { 'content-type': 'text/plain' }, {}); await h(c.req, c.res); assert.strictEqual(c.get().status, 415);
    c = mk('POST', { 'content-type': 'application/json' }, { action: 'create' }); await h(c.req, c.res); const g = c.get(); assert.ok(g.status >= 400); assert.ok(!Object.keys(g.hh).some(k => k.startsWith('access-control'))); assert.strictEqual(g.hh['cache-control'], 'private, no-store');
  }
});
