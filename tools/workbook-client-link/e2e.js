/* End to end test of "Email the link" with MOCKS ONLY. Nothing here talks to Supabase, Resend or the live site; FICTIONAL client only.
   Usage: NODE_PATH=$(npm root -g) AXE=<path to axe.min.js> node tools/workbook-client-link/e2e.js <built workbook html> [screenshot dir]
   The workbook is served from a local http server, Supabase auth and REST and /api/client-link-email are answered by clearly labelled mocks. */
const { chromium } = require('playwright'); const http = require('http'); const fs = require('fs'); const path = require('path');
const WB = path.resolve(process.argv[2] || 'w-82503121e7fdf54e/index.html'); const SHOTS = process.argv[3] ? path.resolve(process.argv[3]) : '';
const AXE = process.env.AXE ? fs.readFileSync(process.env.AXE, 'utf8') : '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const log = []; const ok = (n, v, x) => log.push((v ? 'PASS ' : 'FAIL ') + n + (x ? ' (' + x + ')' : ''));
const b64u = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const JWT = b64u({ alg: 'none' }) + '.' + b64u({ email: 'owner@example.test', sub: 'u1' }) + '.x';
const TOKEN = 'b'.repeat(24).replace(/b/g, '3f'); // 48 hex characters
const WID = '11111111-1111-4111-8111-111111111111';
const ROW = { id: WID, client_name: 'Maple Street Bakery', data: { app: 'client-workbook', client: { business: 'Maple Street Bakery' } }, updated_at: '2026-11-20T10:00:00Z', created_at: '2026-11-20T10:00:00Z' };
(async () => {
  const srv = http.createServer((q, s) => { s.setHeader('Content-Type', 'text/html'); s.end(fs.readFileSync(WB)); }).listen(0); const base = 'http://localhost:' + srv.address().port + '/';
  const b = await chromium.launch();
  const mode = { status: { ok: true, mail: true }, send: [200, { ok: true }], statusHttp: 200 }; const apiCalls = [];
  async function open(w, h) {
    const ctx = await b.newContext({ viewport: { width: w || 1366, height: h || 900 } });
    await ctx.addInitScript(s => { if (!sessionStorage.getItem('noseed') && !localStorage.getItem('client-workbook-auth-v1') && !window.__noauth) localStorage.setItem('client-workbook-auth-v1', JSON.stringify({ access_token: s.jwt, refresh_token: 'r', expires_at: 4102444800, email: 'owner@example.test' })); }, { jwt: JWT });
    await ctx.route('https://vkpdrqkwxkokolphmkbh.supabase.co/**', r => { // MOCK Supabase
      const u = new URL(r.request().url()), m = r.request().method(), p = u.pathname; const j = (x, st) => r.fulfill({ status: st || 200, contentType: 'application/json', body: JSON.stringify(x) });
      if (p.startsWith('/auth/v1/')) return j({ access_token: JWT, refresh_token: 'r', expires_in: 3600 });
      if (p.endsWith('/rpc/portal_create')) return j(TOKEN);
      if (p.includes('/client_workbooks')) return j(m === 'GET' ? (u.search.includes('select=*') ? [ROW] : [{ id: WID, client_name: ROW.client_name, updated_at: ROW.updated_at, status: 'enquiry', seen: null }]) : [ROW]);
      if (p.includes('/client_portals')) return j(mode.portal ? [{ active: true, created_at: '2026-11-20T10:00:00Z', last_opened_at: null, submitted_at: null }] : []);
      return j([]);
    });
    await ctx.route('**/api/client-link-email', async r => { // MOCK mail API
      const req = r.request(), body = JSON.parse(req.postData() || '{}'); apiCalls.push({ auth: req.headers()['authorization'], body });
      if (body.action === 'status') return r.fulfill({ status: mode.statusHttp, contentType: 'application/json', body: JSON.stringify(mode.status) });
      return r.fulfill({ status: mode.send[0], contentType: 'application/json', body: JSON.stringify(mode.send[1]) });
    });
    const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource: the server responded with a status of (429|503|502|403|500)/.test(m.text())) errs.push(m.text()); }); // the deliberate mock 4xx and 5xx answers are expected to be logged by the browser
    await pg.goto(base); await pg.waitForTimeout(700); return { ctx, pg, errs };
  }
  const toPortal = async (pg, email) => {
    await pg.click('[data-act=clopen]'); await pg.waitForTimeout(500);
    if (email) await pg.evaluate(e => { S.client.email = e; save(); }, email);
    await pg.click('[data-go=portal]'); await pg.waitForTimeout(600);
  };
  const shot = async (pg, n) => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };
  // ---- main flow
  let { ctx, pg, errs } = await open();
  ok('signed in owner sees the client list', (await pg.locator('[data-act=clopen]').count()) === 1);
  await toPortal(pg, 'maple@example.test');
  ok('Email the link panel is on the Client link screen', (await pg.locator('h2:has-text("Email the link")').count()) === 1);
  ok('before a link exists it asks to make the link first and offers no send button', /Make the link first/.test(await pg.textContent('body')) && (await pg.locator('[data-act=clmask]').count()) === 0);
  ok('mail status was asked of the server with the owner token', apiCalls[0] && apiCalls[0].body.action === 'status' && apiCalls[0].auth === 'Bearer ' + JWT);
  await pg.click('[data-act=pcreate]'); await pg.waitForTimeout(700);
  ok('link is shown once after creating it', (await pg.locator('#p-link').count()) === 1 && (await pg.textContent('#p-link')).includes('#t=' + TOKEN));
  ok('send button and the client email are shown', (await pg.locator('[data-act=clmask]').count()) === 1 && /maple@example\.test/.test(await pg.textContent('h2:has-text("Email the link") + *') + await pg.locator('section:has(h2:has-text("Email the link"))').textContent()));
  await shot(pg, '01-panel-ready');
  const n0 = apiCalls.length; await pg.click('[data-act=clmask]');
  ok('pressing send asks for confirmation and sends nothing yet', (await pg.locator('[data-act=clmyes]').count()) === 1 && apiCalls.length === n0);
  await shot(pg, '02-confirm');
  await pg.click('[data-act=clmno]'); ok('cancel sends nothing', apiCalls.length === n0 && (await pg.locator('[data-act=clmyes]').count()) === 0);
  await pg.click('[data-act=clmask]'); await pg.click('[data-act=clmyes]'); await pg.waitForTimeout(500);
  const sent = apiCalls[apiCalls.length - 1];
  ok('confirmed send posts to the server with the owner token, the address, the link and the business name only', sent.body.action === 'send' && sent.body.to === 'maple@example.test' && sent.body.link.endsWith('/c-09b37e50c043baaa/#t=' + TOKEN) && sent.body.business === 'Maple Street Bakery' && Object.keys(sent.body).sort().join() === 'action,business,link,to' && sent.auth === 'Bearer ' + JWT);
  ok('success message names the address and the button now says Send it again', /Sent to maple@example\.test/.test(await pg.textContent('[role=status]')) && /Send it again/.test(await pg.textContent('[data-act=clmask]')));
  await shot(pg, '03-sent');
  const store = await pg.evaluate(() => JSON.stringify(Object.assign({}, localStorage)) + JSON.stringify(Object.assign({}, sessionStorage)));
  ok('the link token is in no local or session storage', !store.includes(TOKEN));
  ok('the saved workbook data has no link and no token', !JSON.stringify(await pg.evaluate(() => S)).includes(TOKEN));
  // rate limited and failures
  for (const [code, body, re] of [[429, { ok: false, code: 'rate_limited', retry_after_s: 20 }, /Too many sends/], [503, { ok: false, code: 'mail_not_configured' }, /not switched on/], [502, { ok: false, code: 'mail_failed' }, /Nothing was sent/], [403, { ok: false, code: 'forbidden' }, /not signed in as the owner/]]) {
    mode.send = [code, body]; await pg.click('[data-act=clmask]'); await pg.click('[data-act=clmyes]'); await pg.waitForTimeout(300);
    ok('server answer ' + code + ' shows an honest message', re.test(await pg.textContent('main')));
  }
  mode.send = [200, { ok: true }];
  // keyboard
  await pg.click('[data-act=clmask]'); await pg.focus('[data-act=clmyes]'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(300);
  ok('the confirm and send work from the keyboard', /Sent to/.test(await pg.textContent('[role=status]')));
  ok('no console errors in the flow', errs.length === 0, errs.join('|'));
  // reload loses the token
  await pg.reload(); await pg.waitForTimeout(800); if (await pg.locator('[data-act=clopen]').count()) await pg.click('[data-act=clopen]'); await pg.waitForTimeout(400); await pg.click('[data-go=portal]'); await pg.waitForTimeout(600);
  ok('after a reload the link is gone and cannot be sent', (await pg.locator('#p-link').count()) === 0 && (await pg.locator('[data-act=clmask]').count()) === 0);
  await ctx.close();
  // ---- not configured
  mode.status = { ok: true, mail: false, missing: ['RESEND_API_KEY'] };
  ({ ctx, pg, errs } = await open()); await toPortal(pg, 'maple@example.test'); await pg.click('[data-act=pcreate]'); await pg.waitForTimeout(600);
  ok('mail not set up: honest message and no send button, link still shown to copy', /Email sending is not switched on yet/.test(await pg.textContent('main')) && (await pg.locator('[data-act=clmask]').count()) === 0 && (await pg.locator('#p-link').count()) === 1);
  await shot(pg, '04-not-configured'); ok('no console errors (not configured)', errs.length === 0, errs.join('|')); await ctx.close();
  // ---- status call fails
  mode.status = {}; mode.statusHttp = 500;
  ({ ctx, pg, errs } = await open()); await toPortal(pg, 'maple@example.test');
  ok('status check failing is reported honestly', /Could not check the email set up/.test(await pg.textContent('main'))); await ctx.close();
  mode.statusHttp = 200; mode.status = { ok: true, mail: true };
  // ---- no email address
  ({ ctx, pg, errs } = await open()); await toPortal(pg, ''); await pg.click('[data-act=pcreate]'); await pg.waitForTimeout(600);
  ok('no client email: tells Rhys to add it on the Client screen, no send button', /no valid email address/.test(await pg.textContent('main')) && (await pg.locator('[data-act=clmask]').count()) === 0);
  await pg.evaluate(() => { S.client.email = 'not an email'; render(); });
  ok('a malformed email is not sendable', (await pg.locator('[data-act=clmask]').count()) === 0);
  await pg.click('section:has(h2:has-text("Email the link")) [data-go=setup]'); await pg.waitForTimeout(300);
  ok('the button goes to the Client screen', /The client/.test(await pg.textContent('main'))); await ctx.close();
  // ---- script injection in name and address is escaped
  ({ ctx, pg, errs } = await open()); await toPortal(pg, 'a"><img src=x onerror=window.__x=1>@example.test'); await pg.click('[data-act=pcreate]'); await pg.waitForTimeout(600);
  ok('hostile email text is escaped on screen', (await pg.evaluate(() => window.__x)) === undefined && (await pg.locator('section img[src=x]').count()) === 0); await ctx.close();
  // ---- responsive + axe
  for (const w of [390, 768, 1440]) {
    ({ ctx, pg, errs } = await open(w, 900)); await toPortal(pg, 'maple@example.test'); await pg.click('[data-act=pcreate]'); await pg.waitForTimeout(600); await pg.click('[data-act=clmask]');
    const ov = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok('no horizontal overflow at ' + w, ov <= 0, 'overflow ' + ov); await shot(pg, 'w' + w);
    if (AXE && w === 1440) { await pg.evaluate(AXE); const r = await pg.evaluate(() => axe.run(document.querySelector('section:has(h2)') ? 'main' : 'body', { runOnly: ['wcag2a', 'wcag2aa'] })); const mine = await pg.evaluate(async () => { const el = [...document.querySelectorAll('section')].find(s => /Email the link/.test(s.textContent.slice(0, 40))); return (await axe.run(el, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(v => v.id + ':' + v.nodes.length); });
      ok('axe: no violations in the Email the link panel', mine.length === 0, mine.join(',')); ok('axe on the whole client link screen (info)', true, r.violations.map(v => v.id + ':' + v.nodes.length).join(',') || 'none'); }
    await ctx.close();
  }
  // ---- hosted sign in unchanged
  { const c2 = await b.newContext(); const p2 = await c2.newPage(); await p2.route('https://vkpdrqkwxkokolphmkbh.supabase.co/**', r => r.fulfill({ status: 401, body: '{}' }));
    await p2.goto(base + '?offline'); await p2.waitForTimeout(600); const t = await p2.textContent('#main');
    ok('hosted sign in page: no offline button and ?offline is ignored', /Sign in/.test(t) && (await p2.evaluate(() => CL.on && !CL.offline)) && !/Work offline/i.test(t) && (await p2.locator('[data-act=cloffline]').count()) === 0); await c2.close(); }
  await b.close(); srv.close();
  console.log(log.join('\n')); const f = log.filter(l => l.startsWith('FAIL')).length; console.log('\n' + (log.length - f) + ' passed, ' + f + ' failed'); process.exit(f ? 1 : 0);
})().catch(e => { console.log(log.join("\n")); console.error(e); process.exit(2); });
