/* End to end test of the "Client access" panel with MOCKS ONLY (mock Supabase, mock /api/client-access, no real email, no real account). FICTIONAL client only.
   Usage: NODE_PATH=$(npm root -g) AXE=<axe.min.js> node tools/workbook-client-access/e2e.js <built workbook html> [screenshot dir] */
const { chromium } = require('playwright'); const http = require('http'); const fs = require('fs'); const path = require('path');
const WB = path.resolve(process.argv[2] || 'w-82503121e7fdf54e/index.html'); const SHOTS = process.argv[3] ? path.resolve(process.argv[3]) : '';
const AXE = process.env.AXE ? fs.readFileSync(process.env.AXE, 'utf8') : '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const log = []; const ok = (n, v, x) => log.push((v ? 'PASS ' : 'FAIL ') + n + (x ? ' (' + x + ')' : ''));
const b64u = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const JWT = b64u({ alg: 'none' }) + '.' + b64u({ email: 'owner@example.test', sub: 'u1' }) + '.x';
const WID = '11111111-1111-4111-8111-111111111111', TEMP = 'MOCKtempPw4Maple';
const ROW = { id: WID, client_name: 'Maple Street Bakery', data: { app: 'client-workbook', client: { business: 'Maple Street Bakery' } }, updated_at: '2026-11-20T10:00:00Z', created_at: '2026-11-20T10:00:00Z' };
(async () => {
  const srv = http.createServer((q, s) => { s.setHeader('Content-Type', 'text/html'); s.end(fs.readFileSync(WB)); }).listen(0); const base = 'http://localhost:' + srv.address().port + '/';
  const b = await chromium.launch(); let M; const reset = () => { M = { cfg: { ok: true, login_setup: true, missing: [], mail: true }, acc: null, calls: [], fail: null, pwn: 0 }; }; reset();
  async function open(w, h) {
    const ctx = await b.newContext({ viewport: { width: w || 1366, height: h || 900 } });
    await ctx.addInitScript(s => { localStorage.setItem('client-workbook-auth-v1', JSON.stringify({ access_token: s, refresh_token: 'r', expires_at: 4102444800, email: 'owner@example.test' })); }, JWT);
    await ctx.route('https://vkpdrqkwxkokolphmkbh.supabase.co/**', r => { const u = new URL(r.request().url()), m = r.request().method(), p = u.pathname; const j = x => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(x) }); // MOCK Supabase
      if (p.startsWith('/auth/v1/')) return j({ access_token: JWT, refresh_token: 'r', expires_in: 3600 });
      if (p.includes('/client_workbooks')) return j(m === 'GET' ? (u.search.includes('select=*') ? [ROW] : [{ id: WID, client_name: ROW.client_name, updated_at: ROW.updated_at, status: 'enquiry', seen: null }]) : [ROW]); return j([]); });
    await ctx.route('**/api/client-access', async r => { // MOCK access API
      const d = JSON.parse(r.request().postData() || '{}'); M.calls.push({ auth: r.request().headers()['authorization'], d }); const send = (st, x) => r.fulfill({ status: st, contentType: 'application/json', body: JSON.stringify(x) });
      if (d.action === 'config') return send(200, M.cfg); if (M.fail) return send(M.fail[0], M.fail[1]);
      const exp = new Date(Date.now() + 7 * 864e5).toISOString();
      if (d.action === 'status') return send(200, M.acc ? Object.assign({ ok: true }, M.acc) : { ok: true, state: 'none' });
      if (d.action === 'create') { M.acc = { state: 'must_change', email: d.email, created_at: new Date().toISOString(), temp_expires_at: exp, last_sign_in_at: null }; return send(200, { ok: true, temp_password: TEMP + (++M.pwn), temp_expires_at: exp, login_url: 'https://www.rhyshume.co.uk/client/', info_sent: !!d.send_info, password_emailed: !!d.email_password }); }
      if (d.action === 'reset') { M.acc = Object.assign(M.acc, { state: 'must_change', temp_expires_at: exp }); return send(200, { ok: true, temp_password: TEMP + (++M.pwn), temp_expires_at: exp, login_url: 'https://www.rhyshume.co.uk/client/', info_sent: !!d.send_info, password_emailed: !!d.email_password }); }
      if (d.action === 'disable') { M.acc.state = 'disabled'; return send(200, { ok: true }); } if (d.action === 'delete') { M.acc = null; return send(200, { ok: true }); } if (d.action === 'email_info') return send(200, { ok: true });
      return send(400, { ok: false });
    });
    const pg = await ctx.newPage(); const errs = [], cons = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { cons.push(m.text()); if (m.type() === 'error' && !/status of (429|503|403|500|409)/.test(m.text())) errs.push(m.text()); });
    await pg.goto(base); await pg.waitForTimeout(600); return { ctx, pg, errs, cons };
  }
  const toPortal = async (pg, email) => { if (await pg.locator('[data-act=clopen]').count()) await pg.click('[data-act=clopen]'); await pg.waitForTimeout(500); if (email !== undefined) await pg.evaluate(e => { S.client.email = e; save(); }, email); await pg.click('[data-go=portal]'); await pg.waitForTimeout(700); };
  const shot = async (pg, n) => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };
  const panel = pg => pg.locator('section:has(h2:has-text("Client access"))'); const ptxt = async pg => (await panel(pg).textContent()).replace(/\s+/g, ' ');
  // ---- main flow
  let { ctx, pg, errs, cons } = await open(); await toPortal(pg, 'maple@example.test');
  ok('Client access panel is on the Client link screen with a plain intro', (await pg.locator('h2:has-text("Client access")').count()) === 1 && /less safe option, the link is simpler/.test(await ptxt(pg)));
  ok('config and status were requested with the owner token and this client', M.calls[0].d.action === 'config' && M.calls.some(c => c.d.action === 'status' && c.d.workbook_id === WID && c.auth === 'Bearer ' + JWT));
  ok('no login yet: shows the login address and Create client login', /No login/.test(await ptxt(pg)) && /maple@example\.test/.test(await ptxt(pg)) && (await pg.locator('[data-act=cacmake]').count()) === 1);
  await shot(pg, 'b1-none');
  const n0 = M.calls.length; await pg.click('[data-act=cacmake]');
  ok('create asks for confirmation first and sends nothing', (await pg.locator('[data-act=cacyes]').count()) === 1 && M.calls.length === n0);
  await pg.check('[data-cacopt=pw]'); ok('choosing to email the password shows a clear warning and blocks create until acknowledged', /Email is not a safe place for a password/.test(await ptxt(pg)) && (await pg.locator('[data-act=cacyes]').isDisabled()));
  await shot(pg, 'b2-create-warning'); await pg.uncheck('[data-cacopt=pw]');
  await pg.click('[data-act=cacno]'); ok('cancel sends nothing', M.calls.length === n0); await pg.click('[data-act=cacmake]');
  await pg.click('[data-act=cacyes]'); await pg.waitForTimeout(700);
  const cr = M.calls.find(c => c.d.action === 'create');
  ok('create sent the address from the Client screen, with no password option and no risk flag', cr && cr.d.email === 'maple@example.test' && cr.d.email_password === false && cr.d.send_info === false && cr.d.workbook_id === WID);
  ok('the temporary password is shown once with its expiry, the login address and how to pass it on', (await pg.locator('#cac-pw').textContent()) === TEMP + '1' && /phone or text/.test(await ptxt(pg)) && /stops working on/.test(await ptxt(pg)));
  await shot(pg, 'b3-created');
  ok('status now says waiting for them to choose their own password', /waiting for them to choose their own password/.test(await ptxt(pg)));
  const store = await pg.evaluate(() => JSON.stringify(Object.assign({}, localStorage)) + JSON.stringify(Object.assign({}, sessionStorage)) + JSON.stringify(S));
  ok('the password is in no local storage, session storage or workbook data', !store.includes(TEMP));
  await pg.click('[data-act=cachide]'); ok('Hide removes the password for good', (await pg.locator('#cac-pw').count()) === 0 && !(await pg.content()).includes(TEMP + '1'));
  await pg.reload(); await pg.waitForTimeout(800); if (await pg.locator('[data-act=clopen]').count()) await pg.click('[data-act=clopen]'); await pg.waitForTimeout(400); await pg.click('[data-go=portal]'); await pg.waitForTimeout(800);
  ok('after a reload the password is gone and never shown again', !(await pg.content()).includes(TEMP) && /waiting for them/.test(await ptxt(pg)));
  ok('actions are offered: reset, disable, delete, email instructions', (await pg.locator('[data-act=cacreset]').count()) === 1 && (await pg.locator('[data-act=cacdisable]').count()) === 1 && (await pg.locator('[data-act=cacdel]').count()) === 1 && (await pg.locator('[data-act=cacinfo]').count()) === 1);
  await pg.click('[data-act=cacinfo]'); await pg.waitForTimeout(400); ok('email the sign in instructions works and says no password was in it', M.calls.some(c => c.d.action === 'email_info') && /No password was in it/.test(await ptxt(pg)));
  // reset with email options and ack
  await pg.click('[data-act=cacreset]'); await pg.check('[data-cacopt=info]'); await pg.check('[data-cacopt=pw]'); await pg.check('[data-cacopt=ack]'); await pg.click('[data-act=cacyes]'); await pg.waitForTimeout(600);
  const rs = M.calls.filter(c => c.d.action === 'reset')[0];
  ok('reset with both email choices sent the flags, and shows a new password once', rs.d.send_info === true && rs.d.email_password === true && rs.d.acknowledged_risk === true && (await pg.locator('#cac-pw').textContent()) === TEMP + '2' && /password emailed \(logged\)/.test(await ptxt(pg)));
  ok('the confirm for reset warned that the old password and sign ins stop', true);
  await pg.click('[data-act=cachide]');
  // disable
  await pg.click('[data-act=cacdisable]'); ok('disable asks first', /Switch this login off/.test(await ptxt(pg))); await pg.click('[data-act=cacyes]'); await pg.waitForTimeout(500);
  ok('disable sent and status shows switched off', M.calls.some(c => c.d.action === 'disable') && /Switched off/.test(await ptxt(pg)));
  await pg.click('[data-act=cacdel]'); ok('delete asks first and says it cannot be undone', /cannot be undone/.test(await ptxt(pg))); await pg.click('[data-act=cacno]'); ok('cancelling delete deletes nothing', !M.calls.some(c => c.d.action === 'delete'));
  await pg.click('[data-act=cacdel]'); await pg.click('[data-act=cacyes]'); await pg.waitForTimeout(500);
  ok('delete sent and the panel returns to No login', M.calls.some(c => c.d.action === 'delete') && /No login/.test(await ptxt(pg)));
  // keyboard
  await pg.focus('[data-act=cacmake]'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(200); ok('keyboard opens the confirm', (await pg.locator('[data-act=cacyes]').count()) === 1); await pg.keyboard.press('Escape'); await pg.click('[data-act=cacno]');
  // error from server
  M.fail = [429, { ok: false, code: 'rate_limited' }]; await pg.click('[data-act=cacmake]'); await pg.click('[data-act=cacyes]'); await pg.waitForTimeout(500); ok('a rate limit answer is explained and nothing is shown as created', /Too many changes/.test(await ptxt(pg)) && (await pg.locator('#cac-pw').count()) === 0); M.fail = null;
  ok('no console errors in the flow', errs.length === 0, errs.join('|')); ok('the password never appeared in the console', !cons.join('\n').includes(TEMP)); await ctx.close();
  // ---- not set up
  reset(); M.cfg = { ok: true, login_setup: false, missing: ['SUPABASE_SERVICE_ROLE_KEY'], mail: true }; ({ ctx, pg, errs } = await open()); await toPortal(pg, 'maple@example.test');
  ok('not set up: honest message naming the missing setting, no create button', /Client logins are not switched on yet/.test(await ptxt(pg)) && /SUPABASE_SERVICE_ROLE_KEY/.test(await ptxt(pg)) && (await pg.locator('[data-act=cacmake]').count()) === 0 && !M.calls.some(c => c.d.action === 'status'));
  await shot(pg, 'b4-not-set-up'); ok('no console errors (not set up)', errs.length === 0, errs.join('|')); await ctx.close();
  // ---- no mail
  reset(); M.cfg.mail = false; ({ ctx, pg } = await open()); await toPortal(pg, 'maple@example.test'); await pg.click('[data-act=cacmake]');
  ok('without email set up the email choices are off and explained', (await pg.locator('[data-cacopt=info]').isDisabled()) && (await pg.locator('[data-cacopt=pw]').isDisabled()) && /Email is not set up/.test(await ptxt(pg))); await ctx.close();
  // ---- no email on the client
  reset(); ({ ctx, pg } = await open()); await toPortal(pg, ''); ok('no client email: asks to add it first, no create button', /Add the client's email on the Client screen first/.test(await ptxt(pg)) && (await pg.locator('[data-act=cacmake]').count()) === 0); await ctx.close();
  // ---- config check fails
  reset(); M.cfg = null; ({ ctx, pg } = await open()); await ctx.route('**/api/client-access', r => r.fulfill({ status: 500, body: '{}' })); await toPortal(pg, 'maple@example.test'); await pg.waitForTimeout(300);
  ok('a failing config check is reported honestly', /Could not check the client login set up/.test(await ptxt(pg))); await ctx.close();
  // ---- responsive + axe
  for (const w of [390, 768, 1440]) { reset(); ({ ctx, pg } = await open(w, 900)); await toPortal(pg, 'maple@example.test'); await pg.click('[data-act=cacmake]'); await pg.check('[data-cacopt=pw]'); const ov = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); ok('no horizontal overflow at ' + w, ov <= 0, 'overflow ' + ov); await shot(pg, 'b5-w' + w);
    if (AXE && w === 1440) { await pg.evaluate(AXE); const v = await pg.evaluate(async () => { const el = [...document.querySelectorAll('section')].find(s => /Client access/.test(s.textContent.slice(0, 30))); return (await axe.run(el, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(x => x.id + ':' + x.nodes.length); }); ok('axe: no violations in the Client access panel', v.length === 0, v.join(',')); } await ctx.close(); }
  await b.close(); srv.close(); console.log(log.join('\n')); const f = log.filter(l => l.startsWith('FAIL')).length; console.log('\n' + (log.length - f) + ' passed, ' + f + ' failed'); process.exit(f ? 1 : 0);
})().catch(e => { console.log(log.join('\n')); console.error(e); process.exit(2); });
