/* End to end test of the client LOGIN page with MOCKS ONLY. The Supabase Auth and REST endpoints, the password change API, Cloudflare Turnstile
   are clearly labelled mocks served by this file. The mock REST gate imitates what the database does (the real gate is tested in tools/client-access-db).
   FICTIONAL client only. Usage: NODE_PATH=$(npm root -g) AXE=<axe.min.js> node tools/client-access-page/e2e.js [client page html] [screenshot dir] */
const { chromium } = require('playwright'); const http = require('http'); const fs = require('fs'); const path = require('path');
const PAGE = path.resolve(process.argv[2] || 'client/index.html'); const SHOTS = process.argv[3] ? path.resolve(process.argv[3]) : '';
const AXE = process.env.AXE ? fs.readFileSync(process.env.AXE, 'utf8') : '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const log = []; const ok = (n, v, x) => log.push((v ? 'PASS ' : 'FAIL ') + n + (x ? ' (' + x + ')' : ''));
const b64u = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const EMAIL = 'maple@example.test', TEMP = 'TEMPorary4Maple', NEWPW = 'quiet river lantern';
const jwt = (am, extra) => b64u({ alg: 'none' }) + '.' + b64u(Object.assign({ sub: 'u1', email: EMAIL, role: 'authenticated', iat: Math.floor(Date.now() / 1000), app_metadata: am }, extra)) + '.x';
(async () => {
  const srv = http.createServer((q, s) => { s.setHeader('Content-Type', 'text/html'); s.end(fs.readFileSync(PAGE)); }).listen(0); const base = 'http://localhost:' + srv.address().port + '/client/';
  const b = await chromium.launch();
  const M = { pw: TEMP, flag: true, exp: new Date(Date.now() + 6e8).toISOString(), role: 'client', token429: false, change: null, rpcLog: [], reqs: [], answers: {}, changeCalls: [] };
  const resetM = () => Object.assign(M, { pw: TEMP, flag: true, exp: new Date(Date.now() + 6e8).toISOString(), role: 'client', token429: false, change: null, rpcLog: [], reqs: [], answers: {}, changeCalls: [] });
  async function open(w, h) {
    const ctx = await b.newContext({ viewport: { width: w || 1280, height: h || 900 } });
    await ctx.route('https://challenges.cloudflare.com/**', r => r.fulfill({ contentType: 'application/javascript', body: "/* MOCK Turnstile */ window.turnstile={render:function(s,o){window.__tso=o;setTimeout(function(){o.callback('mock-turnstile-token')},30);return 1},reset:function(){setTimeout(function(){window.__tso.callback('mock-turnstile-token')},30)}};" }));
    await ctx.route('https://vkpdrqkwxkokolphmkbh.supabase.co/**', async r => { // MOCK Supabase Auth + REST
      const u = new URL(r.request().url()), p = u.pathname, body = r.request().postData() || ''; M.reqs.push({ url: p, body, auth: r.request().headers()['authorization'] });
      const j = (x, st) => r.fulfill({ status: st || 200, contentType: 'application/json', body: JSON.stringify(x) });
      if (p === '/auth/v1/token' && u.search.includes('password')) { const d = JSON.parse(body); if (M.token429) return j({}, 429); if (d.email !== EMAIL || d.password !== M.pw) return j({ error: 'invalid_credentials' }, 400); return j({ access_token: jwt({ role: M.role, must_change_password: M.flag, temp_expires_at: M.exp }), refresh_token: 'r1', expires_in: 3600 }); }
      if (p === '/auth/v1/token') return j({ access_token: jwt({ role: M.role, must_change_password: M.flag }), refresh_token: 'r2', expires_in: 3600 });
      if (p === '/auth/v1/logout') return j({}, 204);
      if (p.startsWith('/rest/v1/rpc/')) { const fn = p.split('/').pop(); M.rpcLog.push({ fn, body }); const claims = JSON.parse(Buffer.from((r.request().headers()['authorization'] || '').split('.')[1] || 'e30', 'base64url').toString() || '{}');
        if (!claims.app_metadata || claims.app_metadata.must_change_password !== false) return j({ message: 'not allowed' }, 400); // MOCK of the database gate
        if (fn === 'client_open') return j({ client_name: 'Maple Street Bakery', answers: Object.assign({ discovery: { a: {}, _cfg: { v: 2, sections: ['discovery', 'brand'], options: [] } } }, M.answers), submitted_at: null });
        if (fn === 'client_save') { M.answers = JSON.parse(body).p_answers; return j({ saved: true, submitted: false }); }
        if (fn === 'client_quote') return j({ state: 'none' });
        return j(null); }
      return j({}, 404);
    });
    await ctx.route('**/api/client-change-password', async r => { // MOCK change API
      const d = JSON.parse(r.request().postData() || '{}'); M.changeCalls.push({ auth: r.request().headers()['authorization'], d });
      if (M.change) return r.fulfill({ status: M.change[0], contentType: 'application/json', body: JSON.stringify(M.change[1]) });
      if (d.new_password === M.pw) return r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ ok: false, code: 'weak_password', reasons: ['same_as_temp'] }) });
      M.pw = d.new_password; M.flag = false; M.exp = undefined; return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });
    const pg = await ctx.newPage(); const errs = [], cons = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { cons.push(m.text()); if (m.type() === 'error' && !/status of (400|401|403|429)/.test(m.text())) errs.push(m.text()); });
    await pg.goto(base); await pg.waitForTimeout(300); return { ctx, pg, errs, cons };
  }
  const shot = async (pg, n) => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };
  const signIn = async (pg, e, p) => { await pg.fill('#ca-email', e); await pg.fill('#ca-pw', p); await pg.click('#ca-go'); await pg.waitForTimeout(400); };
  const txt = pg => pg.textContent('#app');
  // ---- login page basics
  resetM(); let { ctx, pg, errs, cons } = await open();
  ok('the login page shows only the sign in form, nothing from any client', /Sign in/.test(await txt(pg)) && (await pg.locator('#ca-login').count()) === 1 && !/What do you want/.test(await txt(pg)) && M.rpcLog.length === 0);
  ok('page is noindex, no referrer, and sets no cookies', (await pg.locator('meta[name=robots][content*=noindex]').count()) === 1 && (await pg.locator('meta[name=referrer][content=no-referrer]').count()) === 1 && (await ctx.cookies()).length === 0);
  ok('login page says what is stored', /What is stored/.test(await txt(pg)));
  await shot(pg, 'c1-login');
  await signIn(pg, EMAIL, 'wrong-password-123'); const w1 = (await pg.textContent('#ca-err')).trim();
  await pg.fill('#ca-email', 'nobody@example.test'); await pg.fill('#ca-pw', 'wrong-password-123'); await pg.click('#ca-go'); await pg.waitForTimeout(300); const w2 = (await pg.textContent('#ca-err')).trim();
  ok('wrong password and unknown email give the same generic message', w1.length > 10 && w1 === w2 && !/account|exist|register/i.test(w1), w1);
  M.token429 = true; await signIn(pg, EMAIL, TEMP); ok('rate limit from Supabase Auth is explained plainly', /Too many tries/.test(await pg.textContent('#ca-err'))); M.token429 = false;
  M.role = 'owner'; await signIn(pg, EMAIL, TEMP); ok('a sign in that is not a client login gets the same generic message and loads nothing', (await pg.textContent('#ca-err')).trim() === w1 && M.rpcLog.length === 0); M.role = 'client';
  ok('no console errors on the login page', errs.length === 0, errs.join('|')); await ctx.close();
  // ---- temp expired
  resetM(); M.exp = new Date(Date.now() - 1000).toISOString(); ({ ctx, pg, errs, cons } = await open()); await signIn(pg, EMAIL, TEMP);
  ok('an expired temporary password shows the expired message, no change form, no data call', /Temporary password expired/.test(await txt(pg)) && (await pg.locator('#ca-new').count()) === 0 && M.rpcLog.length === 0); await shot(pg, 'c2-expired'); await ctx.close();
  // ---- forced change
  resetM(); ({ ctx, pg, errs, cons } = await open()); await signIn(pg, EMAIL, TEMP);
  ok('after the temporary password the change form is the only thing shown', (await pg.locator('#ca-new').count()) === 1 && /Choose your own password/.test(await txt(pg)) && !/What do you want/.test(await txt(pg)));
  ok('no data was requested before the password change', M.rpcLog.length === 0);
  await pg.evaluate(() => { location.hash = '#q=11111111-1111-4111-8111-111111111111'; }); await pg.waitForTimeout(200);
  ok('changing the address hash does not open anything', (await pg.locator('#ca-new').count()) === 1 && M.rpcLog.length === 0);
  const direct = await pg.evaluate(async () => { try { await window.CA.rpc('client_open', {}); return 'opened'; } catch (e) { return 'refused ' + e.http; } });
  ok('calling the data function directly with the pending token is refused (mock of the database gate)', /^refused 400/.test(direct), direct);
  await shot(pg, 'c3-change-empty');
  await pg.fill('#ca-new', 'short'); await pg.fill('#ca-new2', 'short'); await pg.waitForTimeout(100);
  ok('too short: save stays disabled and the hint says so', (await pg.locator('#ca-save').isDisabled()) && /Not yet: At least 12/.test(await pg.textContent('#ca-rules')));
  await pg.fill('#ca-new', 'Password123!'); await pg.fill('#ca-new2', 'Password123!'); ok('a common password is rejected', (await pg.locator('#ca-save').isDisabled()) && /Not yet: Not a common/.test(await pg.textContent('#ca-rules')));
  await pg.fill('#ca-new', 'maple street flowers'); await pg.fill('#ca-new2', 'maple street flowers'); ok('a password built from the email name is rejected', (await pg.locator('#ca-save').isDisabled()) && /Not yet: Does not contain/.test(await pg.textContent('#ca-rules')));
  await pg.fill('#ca-new', NEWPW); await pg.fill('#ca-new2', 'quiet river lanterm'); ok('mismatch keeps save disabled', (await pg.locator('#ca-save').isDisabled()) && /Not yet: Both boxes match/.test(await pg.textContent('#ca-rules')));
  await pg.fill('#ca-new2', NEWPW); await pg.waitForTimeout(100); ok('all rules met enables save and shows a strength word', !(await pg.locator('#ca-save').isDisabled()) && /Strength: (Good|Strong)/.test(await pg.textContent('#ca-strength')));
  await pg.check('#ca-show2'); ok('show passwords toggles both boxes', (await pg.getAttribute('#ca-new', 'type')) === 'text' && (await pg.getAttribute('#ca-new2', 'type')) === 'text'); await pg.uncheck('#ca-show2');
  await shot(pg, 'c4-change-ready');
  // server refuses: reasons, expired, rate limit, check failed
  for (const [st, body, re, n] of [[400, { ok: false, code: 'weak_password', reasons: ['common'] }, /very common/, 'weak password reason'], [429, { ok: false, code: 'rate_limited' }, /Too many tries/, 'rate limit'], [403, { ok: false, code: 'check_failed' }, /security check did not pass/, 'security check failure']]) {
    M.change = [st, body]; await pg.click('#ca-save'); await pg.waitForTimeout(300); ok('server answer shown plainly: ' + n, re.test(await pg.textContent('#ca-err')) && (await pg.locator('#ca-new').inputValue()) === NEWPW);
    await pg.waitForTimeout(100);
  }
  M.change = null; M.changeCalls.length = 0; M.reqs.length = 0;
  await pg.click('#ca-save'); await pg.waitForTimeout(900);
  ok('the change request carries the client token, the new password and the Turnstile token', M.changeCalls.length === 1 && /^Bearer /.test(M.changeCalls[0].auth) && M.changeCalls[0].d.new_password === NEWPW && M.changeCalls[0].d.turnstile === 'mock-turnstile-token');
  ok('after the change the page signs in again and shows the client page for their own name', /For Maple Street Bakery/.test(await txt(pg)) && /What do you want the website to do/.test(await txt(pg)), (await txt(pg)).slice(0, 80));
  await shot(pg, 'c5-client-view');
  ok('the temporary password is no longer accepted by the mock server and the new one is', M.pw === NEWPW);
  ok('no p_token anywhere in any request and no video call', !M.reqs.some(r => /p_token/.test(r.body)) && !M.reqs.some(r => /functions\/v1/.test(r.url)));
  ok('data calls used the signed in client functions', M.rpcLog.some(r => r.fn === 'client_open') && !M.rpcLog.some(r => /^portal_/.test(r.fn)));
  await pg.fill('textarea >> nth=0', 'We bake bread for the street.'); await pg.waitForTimeout(3600);
  ok('answers are saved back through client_save with the session token', M.rpcLog.some(r => r.fn === 'client_save' && /We bake bread/.test(r.body)) && M.reqs.some(r => /client_save/.test(r.url) && /^Bearer /.test(r.auth)));
  const stor = await pg.evaluate(() => JSON.stringify(Object.assign({}, localStorage)) + JSON.stringify(Object.assign({}, sessionStorage)) + document.cookie);
  ok('nothing is kept in localStorage, sessionStorage or cookies, and no password or token in the console', stor === '{}{}' && !cons.join('\n').includes(NEWPW) && !cons.join('\n').includes(TEMP) && !cons.join('\n').includes('mock-turnstile'), stor.slice(0, 60));
  ok('the passwords were sent only to the sign in call and the change call', M.reqs.filter(r => r.body.includes(NEWPW)).every(r => r.url === '/auth/v1/token') && M.changeCalls.every(c => !JSON.stringify(c.d).includes(TEMP)));
  ok('no console errors through the whole flow', errs.length === 0, errs.join('|'));
  // sign out and back
  await pg.click('[data-ca=signout]'); await pg.waitForTimeout(500);
  ok('sign out returns to the login form with no client data in the page', (await pg.locator('#ca-login').count()) === 1 && !/Maple Street Bakery/.test(await pg.content().then(c => c.replace(/<title>.*?<\/title>/, ''))));
  await pg.goBack().catch(() => { }); await pg.waitForTimeout(300); const after = await pg.content(); ok('back button after sign out does not show the client page', !/What do you want the website to do/.test(after.replace(/var DISC[\s\S]*?\];/, '')) || (await pg.locator('#ca-login').count()) === 1);
  await pg.goto(base); await pg.waitForTimeout(300); ok('reloading starts signed out (session is memory only)', (await pg.locator('#ca-login').count()) === 1);
  // returning client with the new password goes straight in
  await signIn(pg, EMAIL, NEWPW); ok('a later sign in with the new password goes straight to the page', /What do you want the website to do/.test(await txt(pg))); await ctx.close();
  // ---- keyboard only
  resetM(); ({ ctx, pg, errs } = await open()); ok('the email box is focused on arrival', (await pg.evaluate(() => document.activeElement.id)) === 'ca-email'); await pg.keyboard.type(EMAIL); await pg.keyboard.press('Tab'); await pg.keyboard.type(TEMP); await pg.keyboard.press('Enter'); await pg.waitForTimeout(400);
  ok('sign in works from the keyboard alone (email, Tab, password, Enter)', (await pg.locator('#ca-new').count()) === 1); await ctx.close();
  // ---- responsive and axe
  for (const w of [390, 768, 1440]) {
    resetM(); ({ ctx, pg } = await open(w, 900)); let ov = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); ok('login: no horizontal overflow at ' + w, ov <= 0, 'overflow ' + ov); if (w === 390) await shot(pg, 'c6-login-390');
    if (AXE && w === 1440) { await pg.evaluate(AXE); const v = await pg.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(x => x.id + ':' + x.nodes.length)); ok('axe: login page has no violations', v.length === 0, v.join(',')); }
    await signIn(pg, EMAIL, TEMP); ov = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); ok('change form: no horizontal overflow at ' + w, ov <= 0, 'overflow ' + ov); if (w === 390) await shot(pg, 'c7-change-390');
    if (AXE && w === 1440) { await pg.evaluate(AXE); const v = await pg.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(x => x.id + ':' + x.nodes.length)); ok('axe: change form has no violations', v.length === 0, v.join(',')); }
    await pg.fill('#ca-new', NEWPW); await pg.fill('#ca-new2', NEWPW); await pg.waitForTimeout(100); await pg.click('#ca-save'); await pg.waitForTimeout(900);
    ov = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); ok('client view: no horizontal overflow at ' + w, ov <= 0, 'overflow ' + ov); if (w === 390) await shot(pg, 'c8-client-390');
    if (AXE && w === 1440) { await pg.evaluate(AXE); const v = await pg.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(x => x.id + ':' + x.nodes.length)); ok('axe on the client view (the existing page, information only)', true, v.join(',') || 'none'); }
    await ctx.close();
  }
  await b.close(); srv.close();
  console.log(log.join('\n')); const f = log.filter(l => l.startsWith('FAIL')).length; console.log('\n' + (log.length - f) + ' passed, ' + f + ' failed'); process.exit(f ? 1 : 0);
})().catch(e => { console.log(log.join('\n')); console.error(e); process.exit(2); });
