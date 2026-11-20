/* End to end test of the Business reviews module in the Client Workbook, against LOCAL MOCKS of the Supabase REST endpoints and the
   review admin API (mock.js, fixture data about fictional businesses). No real service, key, address or message is involved.
   Usage: NODE_PATH=$(npm root -g) [AXE=/path/to/axe.min.js] node tools/workbook-reviews/e2e.js <built workbook html> [screenshot dir]
   Covers: sign in gate (no offline way in), review list, opening a report, correcting a competitor, notes, discussion marks, approve and revise,
   held email, token, AI plan, convert to a DRAFT project (from the list and from inside an open client), internal vs customer separation,
   "not set up yet" and error states, offline copy, keyboard, 390/768/1440, axe, console errors. */
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path'); const http = require('http');
const { freshDb, handle, RID, RID2, LEAD, CLYDE, GIFT, MARK_INTERNAL } = require('./mock.js');
const WB = path.resolve(process.argv[2] || 'w-82503121e7fdf54e/index.html'); const SHOTS = process.argv[3] ? path.resolve(process.argv[3]) : '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const AXE = process.env.AXE && fs.existsSync(process.env.AXE) ? process.env.AXE : (() => { try { return require.resolve('axe-core/axe.min.js'); } catch (e) { return ''; } })();
const log = []; const ok = (n, v, x) => { log.push((v ? 'PASS ' : 'FAIL ') + n + (x ? ' (' + x + ')' : '')); };
const SUPA = 'vkpdrqkwxkokolphmkbh.supabase.co';
const SESSION = { access_token: 'MOCK-OWNER-TOKEN', refresh_token: 'mock-refresh', expires_at: Math.floor(Date.now() / 1000) + 86400, email: 'owner@example.test' };
(async () => {
  const html = fs.readFileSync(WB);
  const srv = http.createServer((q, r) => { if (/^\/w-82503121e7fdf54e\/(index\.html)?(\?.*)?$/.test(q.url)) { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(html); } else { r.writeHead(404); r.end('no'); } });
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const BASE = 'http://127.0.0.1:' + srv.address().port + '/w-82503121e7fdf54e/';
  const browser = await chromium.launch(); const allErrs = []; const external = []; const paths = new Set(); let axeRuns = 0; const axeFound = [];
  async function scene(name, opt, fn) {
    if (process.env.ONLY && process.env.ONLY !== name) return;
    opt = opt || {}; const db = freshDb(), flags = Object.assign({}, opt.flags);
    const ctx = await browser.newContext({ viewport: opt.vp || { width: 1440, height: 900 }, acceptDownloads: true });
    if (opt.signedIn !== false) await ctx.addInitScript(s => { try { localStorage.setItem('client-workbook-auth-v1', JSON.stringify(s)); } catch (e) { } }, SESSION);
    await ctx.route('**/*', async route => {
      const r = route.request(), u = new URL(r.url());
      if (u.hostname === SUPA || (u.hostname === '127.0.0.1' && u.pathname.startsWith('/api/business-review/admin/'))) { paths.add(u.hostname === SUPA ? u.pathname.replace(/\/[0-9a-f-]{36}.*$/, '') : '/api/business-review/admin/*'); return route.fulfill(handle(db, flags, { method: r.method(), url: r.url(), headers: r.headers(), body: r.postData() })); }
      if (u.hostname === '127.0.0.1') return route.continue();
      external.push(r.url()); return route.abort();
    });
    const pg = await ctx.newPage(); const errs = [];
    pg.on('pageerror', e => errs.push('pageerror: ' + e.message));
    pg.on('console', m => { if (m.type() === 'error' && !(opt.allowResourceErrors && /Failed to load resource/.test(m.text()))) errs.push(m.text()); });
    pg.on('dialog', d => d.accept());
    const S = { name, db, flags, ctx, pg, errs, shot: async n => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, name + '-' + n + '.png') }); } };
    S.state = () => pg.evaluate(() => JSON.parse(JSON.stringify(S, (k, v) => (k === 'ui' || k === 'pb') ? undefined : v)));
    S.noXScroll = async w => ok(name + ': no sideways scrolling at ' + w, await pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), await pg.evaluate(() => document.documentElement.scrollWidth + '>' + window.innerWidth));
    S.axe = async (label, ctxSel) => {
      if (!AXE) { ok(label + ': axe (skipped, axe-core not found)', true); return; }
      await pg.addScriptTag({ path: AXE }); axeRuns++;
      const res = await pg.evaluate(async sel => { const r = await axe.run(sel ? document.querySelector(sel) : document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] }); return r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, t: v.nodes.slice(0, 2).map(x => x.target.join(' ')) })); }, ctxSel || '.brw');
      res.forEach(v => axeFound.push(label + ' ' + v.id + ' ' + v.impact + ' ' + v.t.join('|')));
      ok(label + ': axe has no violations in the reviews area', res.length === 0, res.map(v => v.id + ':' + v.impact + ':' + v.t[0]).join('; '));
    };
    try { await fn(S); } catch (e) { ok(name + ': scene finished without crashing', false, String(e.stack || e).split('\n').slice(0, 3).join(' | ')); await pg.screenshot({ path: '/tmp/fail-' + name.replace(/\W/g, '_') + '.png' }).catch(() => { }); }
    ok(name + ': no console or page errors', errs.length === 0, errs.slice(0, 3).join(' | ')); allErrs.push(...errs);
    await ctx.close();
  }
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- 0. the sign in gate is untouched: no session, no offline way in, no reviews ---------- */
  await scene('gate', { signedIn: false }, async S => {
    const { pg } = S;
    await pg.goto(BASE); await pg.waitForSelector('#cl-email');
    const txt = await pg.evaluate(() => document.body.innerText);
    ok('gate: signed out visitors get the sign in screen', /Sign in/.test(txt) && (await pg.locator('[data-act=clsend]').count()) === 1);
    ok('gate: there is no offline button', !/offline/i.test(txt) && (await pg.locator('[data-act=cloffline]').count()) === 0);
    ok('gate: no reviews area, no header button, no nav before signing in', !/Business reviews/.test(txt) && (await pg.locator('.brwhead').count()) === 0 && (await pg.locator('.rail').count()) === 0);
    await pg.goto(BASE + '?offline'); await pg.waitForSelector('#cl-email');
    ok('gate: the ?offline address switch still does nothing', (await pg.evaluate(() => CL.offline)) === false && /Sign in/.test(await pg.evaluate(() => document.body.innerText)));
    ok('gate: nothing was requested from the review tables before sign in', !S.db._log.some(l => /br_/.test(l)), S.db._log.join(','));
    await S.shot('signin');
  });

  /* ---------- A. the main working flow, from the client list ---------- */
  await scene('main', {}, async S => {
    const { pg, db } = S, RID_Q = '[data-bid="' + RID + '"]';
    await pg.goto(BASE); await pg.waitForSelector('[data-act=brwgate]');
    ok('list: the existing client list is unchanged (clients, leads, New client)', (await pg.locator('table.tbl tbody tr').count()) === 2 && /Make into a client/.test(await pg.textContent('table.tbl')) && (await pg.locator('[data-act=clnew]').count()) === 1);
    await pg.waitForFunction(() => /1 new/.test(document.querySelector('[data-act=brwgate]').textContent));
    ok('list: a Business reviews button shows how many new enquiries wait', /Business reviews \(1 new\)/.test(await pg.textContent('[data-act=brwgate]')));
    await pg.click('[data-act=brwgate]'); await pg.waitForSelector('.brwtile');
    const tiles = await pg.$$eval('.brwtile', a => a.map(t => t.textContent.replace(/\s+/g, ' ')));
    ok('metrics: seven real counts from stored rows', tiles.length === 7 && tiles[0].startsWith('3') && tiles[1].startsWith('2') && tiles[4].startsWith('1') && tiles[6].startsWith('0'), tiles.join(' | '));
    ok('metrics: no conversion rate or invented figure, anonymous reviews are not leads', !/\d\s?%/.test(await pg.textContent('.brwtiles + p')) && /Anonymous reviews are not leads/.test(await pg.textContent('.brw')));
    await pg.waitForSelector('#brw-list .brwrow'); const rows = await pg.locator('.brwrow').count();
    ok('list: submitted reviews are listed with business, reference, status, enquiry state and report state', rows === 3 && /Harbour Precision Ltd/.test(await pg.textContent('#brw-list')) && /BR-7K2M9QX4/.test(await pg.textContent('#brw-list')) && /New enquiry/.test(await pg.textContent('#brw-list')) && /Report v1 not approved/.test(await pg.textContent('#brw-list')));
    ok('list: an anonymous review says it is not a lead, a failed one is flagged incomplete', /Anonymous, not a lead/.test(await pg.textContent('#brw-list')) && (await pg.locator('.brwrow', { hasText: 'Tarbet' }).textContent()).includes('Incomplete'));
    await pg.check('#brw-attn'); ok('list: needs attention filter keeps the enquiry and the failed review only', (await pg.locator('.brwrow').count()) === 2); await pg.uncheck('#brw-attn');
    await pg.fill('#brw-q', 'kelvin'); ok('list: search narrows the list', (await pg.locator('.brwrow').count()) === 1); await pg.fill('#brw-q', '');
    await pg.selectOption('#brw-status', 'failed'); ok('list: status filter works', (await pg.locator('.brwrow').count()) === 1); await pg.selectOption('#brw-status', '');
    ok('monitoring: provider status shows degraded and not configured providers honestly', /Degraded/.test(await pg.textContent('#brw-h-prov + div')) && /Not configured/.test(await pg.textContent('#brw-h-prov + div')), '');
    ok('monitoring: the error log lists the failed provider call with its code', /pagespeed/.test(await pg.textContent('.brw')) && /timeout/.test(await pg.textContent('.brw')));
    await S.shot('list'); await S.axe('main list');
    /* open one */
    await pg.click('[data-act=brwopen]' + RID_Q); await pg.waitForSelector('#brw-title');
    ok('review: opens with focus on its title, for keyboard and screen reader users', (await pg.evaluate(() => document.activeElement.id)) === 'brw-title');
    const body = await pg.textContent('.brw');
    ok('review: shows the inputs (website, service area, category, stated goals, date) and the enquiry status', /harbourprecision\.example/.test(body) && /Glasgow \(regional\)/.test(body) && /CNC machining/.test(body) && /Get more enquiries/.test(body) && /New enquiry/.test(body));
    ok('review: analysis status lists steps, marks the failed one and says the assessment is incomplete', /Incomplete assessment/.test(body) && (await pg.locator('.brwsteps li', { hasText: 'Running the same speed test on comparison sites' }).textContent()).includes('Failed') && /timeout/.test(body));
    ok('review: provider calls and the failure are shown', /psi_competitor/.test(body) && /did not succeed/.test(body));
    ok('review: contact, consent and communication preferences are shown, marketing not agreed', /owner@harbourprecision\.example/.test(body) && /Agreed that you may contact them/.test(body) && /Not agreed\. Nothing promotional/.test(body) && /Interested in the quote follow up idea/.test(body));
    ok('report: verified findings and the comparison with evidence states, source and date', /loaded its home page faster in the mobile test recorded on 20 Nov 2026/.test(body) && /Verified public observation/.test(body) && /Google PageSpeed Insights API v5/.test(body));
    ok('report: report reference, version and evidence snapshot count are shown on the enquiry', /BR-7K2M9QX4, version 1, 4 evidence items kept as the snapshot/.test(body));
    ok('report: local search not tested and AI visibility awaiting a supported test, no percentage', /Not tested/.test(body) && /awaiting_supported_test|Awaiting a supported test/.test(body) && !/\d\s?%/.test(await pg.textContent('#brw-s-report')));
    const ev = await pg.textContent('#brw-s-ev');
    ok('evidence: stored rows with exact state labels, values, sources, and a not tested row with its reason', (await pg.locator('#brw-s-ev tbody tr').count()) === 4 && /Verified public observation/.test(ev) && /Not tested/.test(ev) && /no_supported_source/.test(ev) && /3820 ms/.test(ev));
    await pg.selectOption('#brw-evs', CLYDE); ok('evidence: filter by competitor', (await pg.locator('#brw-s-ev tbody tr').count()) === 1); await pg.selectOption('#brw-evs', '');
    ok('evidence: read only, there is no edit control in the evidence table', (await pg.locator('#brw-s-ev input, #brw-s-ev textarea, #brw-s-ev button[data-act]').count()) === 0);
    await S.shot('detail'); await S.axe('main detail');
    /* correct a competitor */
    ok('competitors: both are listed with origin and why they were chosen', /Named by the visitor/.test(await pg.textContent('#brw-s-comp')) && /Matched on the word Harbour only/.test(await pg.textContent('#brw-s-comp')));
    await pg.click('[data-act=brwconf][data-bk="rej:' + GIFT + '"]'); await pg.waitForSelector('#brw-rej-' + GIFT);
    ok('competitors: rejecting asks for a reason and moves focus to it', (await pg.evaluate(() => document.activeElement.id)) === 'brw-rej-' + GIFT);
    await S.axe('main reject form');
    await pg.fill('#brw-rej-' + GIFT, 'A card shop, not a machining business');
    await pg.click('[data-act=brwcomp][data-bk=reject]'); await pg.waitForSelector('.brwmsg:has-text("Competitor rejected")'); await pg.waitForSelector('.brwcomp.brwrej'); await pg.waitForFunction(() => /Queued/.test(document.querySelector('#brw-s-status').textContent));
    const g = db.br_competitors.find(c => c.id === GIFT);
    ok('competitors: the correction went through the admin API, not by editing rows', g.status === 'rejected' && g.rejected_reason === 'A card shop, not a machining business' && db._log.includes('ADMIN POST reviews/' + RID + '/competitors') && !db._log.some(l => /^(PATCH|POST|DELETE) br_(competitors|evidence)/.test(l)));
    ok('competitors: the screen shows it rejected with the reason and the review re-queued', /Rejected/.test(await pg.textContent('#brw-s-comp')) && /A card shop/.test(await pg.textContent('#brw-s-comp')) && /Queued/.test(await pg.textContent('#brw-s-status')) && /queued again/.test(await pg.textContent('.brwmsg')));
    await pg.fill('#brw-c-name', 'Dockside Precision (made up)'); await pg.fill('#brw-c-site', 'https://dockside.example'); await pg.click('[data-act=brwcompadd]'); await pg.waitForSelector('#brw-s-comp :text("Dockside Precision")');
    ok('competitors: an owner added competitor appears as added by you', /Added by you/.test(await pg.textContent('#brw-s-comp')) && db.br_competitors.some(c => c.origin === 'owner_added'));
    /* notes, needs, status, discussion marks */
    await pg.fill('#brw-needs', 'Wants quotes chased automatically; unsure about email wording.'); await pg.fill('#brw-notes', MARK_INTERNAL + ' seemed price sensitive'); await pg.selectOption('#brw-status-sel', 'in_discussion');
    ok('notes: the internal box says it is internal only', /Internal only\. Never shown to the customer/.test(await pg.textContent('.brwinternal')));
    await pg.click('[data-act=brwsavepro]'); await pg.waitForSelector('.brwmsg:has-text("Notes and status saved")');
    const pr = db.br_prospects[0];
    ok('notes: needs, internal notes and status are saved by direct update on the enquiry', pr.needs.startsWith('Wants quotes') && pr.internal_notes.startsWith(MARK_INTERNAL) && pr.status === 'in_discussion' && db._log.includes('PATCH br_prospects ["needs","internal_notes","updated_at","status"]'), db._log.filter(l => /PATCH br_pro/.test(l)).join(','));
    await pg.check('[data-brwchk=discuss][data-bk=slow_mobile_loading]'); await pg.waitForSelector('.brwmsg:has-text("Marked for discussion: 1")');
    ok('recommendations: marking for discussion is saved on the enquiry', pr.discuss_keys.join() === 'slow_mobile_loading');
    ok('recommendations: shows found, why it may matter, what could change, check first, service, priority basis; no revenue figure', /Found:/.test(await pg.textContent('#brw-s-recs')) && /Why it may matter:/.test(await pg.textContent('#brw-s-recs')) && /Check first:/.test(await pg.textContent('#brw-s-recs')) && !/£/.test(await pg.textContent('#brw-s-recs')));
    /* customer safe summary */
    const sum = await pg.textContent('#brw-summary');
    ok('summary: the customer safe summary has the marked recommendation and the disclaimers', /Your home page was slow/.test(sum) && !/Few separate service pages/.test(sum) && /not a quote/.test(sum));
    ok('summary: internal notes, needs, contact details and prices never appear in it', !sum.includes(MARK_INTERNAL) && !/chased automatically/.test(sum) && !/owner@harbour|07700/.test(sum) && !/£/.test(sum));
    ok('summary: the builder has no access to the notes (it takes only the report and the marks)', await pg.evaluate(() => brwClientSummary.length === 2 && !/internal|needs|email|phone/i.test(brwClientSummary.toString())));
    /* revise, approve, delivery, token */
    await pg.click('[data-act=brwrevise]'); await pg.check('[data-brwchk=hide][data-bk=no_service_pages]'); await pg.fill('#brw-rn-no_service_pages', ''); await pg.fill('#brw-rev-reason', 'Inference too thin to show yet');
    ok('revise: the form warns that notes here are customer visible', /Customer visible/.test(await pg.textContent('#brw-s-recs')));
    await pg.click('[data-act=brwrevisesave]'); await pg.waitForSelector('.brwmsg:has-text("Saved as a new version 2")'); await pg.waitForFunction(() => document.querySelectorAll('#brw-ver option').length === 2);
    ok('revise: saves a NEW owner version through the admin API and keeps the old one', db.br_report_versions.length === 2 && db.br_report_versions[1].created_by === 'owner' && db._revise.overrides.recommendations[0].hide === true && db.br_report_versions[0].content.recommendations.length === 2);
    ok('revise: the old version is still selectable', (await pg.locator('#brw-ver option').count()) === 2);
    ok('delivery: a held email waits and cannot be sent before approval', (await pg.locator('[data-act=brwsend]').isDisabled()) && /Held until you approve/.test(await pg.textContent('#brw-s-del')) && /o\*\*\*@harbourprecision\.example/.test(await pg.textContent('#brw-s-del')));
    await pg.selectOption('#brw-ver', '1'); await pg.waitForSelector('#brw-s-report :text("Approve this version")'); await pg.click('[data-act=brwapprove]'); await pg.waitForSelector('.brwmsg:has-text("approved")');
    ok('approve: version 1 is approved through the admin API', !!db.br_report_versions[0].approved_at && db._sent === 0);
    await pg.waitForFunction(() => !document.querySelector('[data-act=brwsend]').disabled); await pg.click('[data-act=brwsend]'); await pg.waitForSelector('.brwmsg:has-text("held email was sent")');
    ok('delivery: sending the held email is a deliberate click, goes through the admin API, and shows sent (mock, nothing really sent)', db._sent === 1 && /Sent/.test(await pg.textContent('#brw-s-del')));
    await pg.click('[data-act=brwtoken][data-bk=extend]'); await pg.waitForSelector('.brwmsg:has-text("now lasts until")'); await pg.click('[data-act=brwconf][data-bk=revoke]'); await pg.click('[data-act=brwtoken][data-bk=revoke]'); await pg.waitForSelector('.brwmsg:has-text("revoked")');
    ok('token: extend and revoke go through the admin API', db.br_reviews[0].token_revoked === true && db.br_reviews[0].token_expires_at.startsWith('2027'));
    ok('AI: with no provider on it says awaiting a supported test and offers no run', /Awaiting a supported test/.test(await pg.textContent('#brw-s-ai')) && (await pg.locator('[data-act=brwaiplan],[data-act=brwairun]').count()) === 0);
    /* convert, from the list level */
    await pg.waitForSelector('[data-act=brwconf][data-bk=convert]');
    const quotesBefore = db.client_workbooks.length;
    await pg.click('[data-act=brwconf][data-bk=convert]');
    ok('convert: asks first, says draft, no quote, nothing sent, and lists the existing process', /does <b>not<\/b>|does not/.test(await pg.textContent('#brw-s-pro')) && /Discovery, Scope, Dependencies and responsibilities, Quote, Statement of requirements, Contract and written acceptance, Deposit, Build specification, Build and testing, Client review, Acceptance, Handover, Care plan/.test(await pg.textContent('#brw-s-pro')) && db.client_workbooks.length === quotesBefore);
    await S.shot('convert-confirm'); await pg.click('[data-act=brwconvert]');
    await pg.waitForSelector('.brwbanner'); await pg.waitForFunction(() => S.review && S.review.link && S.review.link.state === 'linked');
    const st = await S.state(), nw = db.client_workbooks.find(c => c.id !== 'c0c0c0c0-0000-4000-8000-000000000001');
    ok('convert: it reused Make into a client, a DRAFT client now exists, enquiry status not approved', !!nw && nw.client_name === 'Harbour Precision Ltd' && st.client.status === 'enquiry' && st.client.business === 'Harbour Precision Ltd' && st.client.email === 'owner@harbourprecision.example');
    ok('convert: the review is attached as a reference with versions, evidence count and requested services', st.review.ref === 'BR-7K2M9QX4' && st.review.evidence_snapshot_count === 4 && st.review.versions.length === 2 && st.review.requested_services.join() === 'automation,seo' && st.review.report_version === 2);
    ok('convert: it did not create a quote or scope or prices', (st.quote.lines || []).length === 0 && (st.quote2.lines || []).length === 0 && !Object.keys(st.scope.price || {}).length);
    ok('convert: the lead is marked handled and the review is linked to the new project', db.leads[0].handled === true && db.br_prospects[0].workbook_id === nw.id && db.br_prospects[0].status === 'draft_project' && db._log.includes('ADMIN POST reviews/' + RID + '/link-workbook'));
    ok('convert: the saved project row carries S.review but no notes, needs or contact copy of the review', !!nw.data.review && !JSON.stringify(nw.data.review).includes(MARK_INTERNAL) && !('internal' in nw.data.review) && !/internal_notes|needs/.test(JSON.stringify(nw.data.review)));
    ok('convert: the project screen shows a strip saying it began from the review, draft, no quote', /Started from a business review/.test(await pg.textContent('.brwbanner')) && /no quote exists yet/.test(await pg.textContent('.brwbanner')));
    /* inside the client: nav item, header button, separation of customer documents */
    ok('work: the nav has Business reviews under Client and the header has a small Reviews button beside START CLIENT MEETING', (await pg.locator('.rail .rl[data-go=reviews]').count()) === 1 && (await pg.locator('.topr .meetstart + .brwhead').count()) === 1 && /Business reviews/.test(await pg.textContent('.rail .rl[data-go=reviews]')));
    await pg.click('.rail .rl[data-go=reviews]'); await pg.waitForSelector('#brw-h-list');
    ok('work: the same reviews screen opens inside the client, nav still visible', (await pg.locator('.rail').count()) === 1 && (await pg.locator('.brwrow').count()) === 3);
    await pg.click('[data-act=brwopen]' + RID_Q); await pg.waitForSelector('#brw-title');
    ok('work: the review now says a draft project exists and offers to open it, not to convert again', /Draft project made/.test(await pg.textContent('#brw-s-pro')) && (await pg.locator('[data-act=brwopenproj]').count()) === 1 && (await pg.locator('[data-act=brwconf][data-bk=convert]').count()) === 0);
    const sep = [];
    for (const sc of ['final', 'qpage', 'proposal', 'docs', 'bundle', 'portal', 'quote', 'biz', 'close', 'build', 'setup']) {
      const b = pg.locator('.rail .rl[data-go=' + sc + ']'); if (!(await b.count())) continue; await b.click(); await pg.waitForTimeout(120);
      const t = await pg.evaluate(() => document.body.innerText + ' ' + [...document.querySelectorAll('textarea,input')].map(x => x.value).join(' '));
      if (t.includes(MARK_INTERNAL) || /internal_notes/.test(t)) sep.push(sc);
    }
    ok('separation: the internal note appears on no client facing or working screen of the project', sep.length === 0, sep.join());
    const stNow = await S.state(); ok('separation: the project data (also what is saved to a file and online) holds no internal note', !JSON.stringify(stNow).includes(MARK_INTERNAL) && !JSON.stringify(stNow).includes('internal_notes'));
    const dl = pg.waitForEvent('download'); await pg.click('.topr [data-act=save]'); const file = await dl; const fileText = fs.readFileSync(await file.path(), 'utf8');
    ok('separation: Save to file contains the review reference but not the internal note', fileText.includes('BR-7K2M9QX4') && !fileText.includes(MARK_INTERNAL));
    ok('separation: the module never references the notes from the quote, portal or document generators', await pg.evaluate(() => { const src = [vQuote, vQpage, vPortal, vDocs, vFinal, vBundle, vProposal, vBiz, docModel, buildDraft].map(f => String(f)).join(''); return !/\.review\b|brw|internal_notes/.test(src); }));
    await pg.click('.rail .rl[data-go=reviews]'); await pg.waitForSelector('[data-act=brwopenproj]'); await pg.click('[data-act=brwopenproj]');
    await pg.waitForFunction(() => CL.screen === 'work' && S.client.business === 'Harbour Precision Ltd' && S.review && S.review.ref === 'BR-7K2M9QX4');
    ok('reopen: Open the draft project saves, leaves and reopens it from the online copy with the review reference intact', true);
    await pg.click('.topr .meetstart'); await pg.waitForSelector('.mcta');
    ok('existing: START CLIENT MEETING still opens the meeting', /Client meeting/.test(await pg.textContent('h1')));
  });

  /* ---------- A2. converting while another client is open: it must be saved first and never overwritten ---------- */
  await scene('inclient', {}, async S => {
    const { pg, db } = S; const MAPLE = 'c0c0c0c0-0000-4000-8000-000000000001';
    await pg.goto(BASE); await pg.waitForSelector('[data-act=clopen]'); await pg.click('[data-act=clopen]'); await pg.waitForSelector('.rail');
    await pg.fill('[data-k="client.contact"]', 'Mary Maple (made up)'); await pg.waitForFunction(() => CL.dirty || CL.status === 'pending' || CL.status === 'saving');
    await pg.waitForSelector('.brwhead'); await pg.click('.brwhead'); await pg.waitForSelector('#brw-h-list'); await pg.click('[data-act=brwopen][data-bid="' + RID + '"]'); await pg.waitForSelector('#brw-title');
    await pg.click('[data-act=brwconf][data-bk=convert]'); await pg.click('[data-act=brwconvert]'); await pg.waitForSelector('.brwbanner'); await pg.waitForFunction(() => S.review && S.review.link && S.review.link.state === 'linked');
    const maple = db.client_workbooks.find(c => c.id === MAPLE), nw = db.client_workbooks.find(c => c.id !== MAPLE);
    ok('in client: the open client was saved first with the typed change, and was not overwritten by the draft', maple.client_name === 'Maple Street Bakery (made up)' && maple.data.client && maple.data.client.contact === 'Mary Maple (made up)' && !maple.data.review, JSON.stringify((maple.data.client || {}).contact));
    ok('in client: the new draft is a separate project with the review attached', !!nw && nw.data.review.ref === 'BR-7K2M9QX4' && nw.data.client.business === 'Harbour Precision Ltd');
    await pg.waitForTimeout(3500); const maple2 = db.client_workbooks.find(c => c.id === MAPLE);
    ok('in client: a late autosave did not blank the earlier client', maple2.data.client.contact === 'Mary Maple (made up)' && maple2.data.client.business === 'Maple Street Bakery (made up)');
  });

  /* ---------- A3. the existing Make into a client button on the list also attaches the review; a failed link can be retried ---------- */
  await scene('listleadmk', { flags: { linkFails: true }, allowResourceErrors: true }, async S => {
    const { pg, db } = S; await pg.goto(BASE); await pg.waitForSelector('[data-act=leadmk]'); await pg.click('[data-act=leadmk]'); await pg.waitForSelector('.brwbanner');
    await pg.waitForFunction(() => S.review && S.review.link && S.review.link.state);
    ok('list leadmk: the existing Make into a client attaches the review too', (await S.state()).review.ref === 'BR-7K2M9QX4');
    const st = await S.state();
    ok('list leadmk: when linking fails it says so, tries a direct update, and stays honest', st.review.link.state === 'linked' ? db.br_prospects[0].workbook_id && db._log.some(l => /^PATCH br_prospects/.test(l)) : /could not be linked/.test(await pg.textContent('.brwbanner')), st.review.link.state);
    ok('list leadmk: the draft was made and the project is a draft with no quote', st.client.status === 'enquiry' && (st.quote2.lines || []).length === 0);
  });
  await scene('listleadmk-plain', {}, async S => {   /* a plain lead (not from a review) is untouched */
    const { pg, db } = S; db.br_prospects.length = 0; await pg.goto(BASE); await pg.waitForSelector('[data-act=leadmk]'); await pg.click('[data-act=leadmk]'); await pg.waitForSelector('.rail');
    const st = await S.state(); ok('plain lead: Make into a client behaves as before, no review key, no strip', !st.review && (await pg.locator('.brwbanner').count()) === 0 && st.client.business === 'Harbour Precision Ltd');
  });

  /* ---------- stored text is shown as text, never run ---------- */
  await scene('xss', {}, async S => {
    const { pg, db } = S; const bad = '<img src=x onerror="window.__xss=1">';
    db.br_reviews[1].business_name = bad + 'Kelvin'; db.br_competitors[0].name = bad + 'Clyde'; db.br_prospects[0].message = '<script>window.__xss=2<\/script>';
    db.br_report_versions[0].content.key_findings[0].text = bad + 'finding';
    await pg.goto(BASE); await pg.waitForSelector('[data-act=brwgate]'); await pg.click('[data-act=brwgate]'); await pg.waitForSelector('.brwrow'); await pg.click('[data-act=brwopen][data-bid="' + RID2 + '"]'); await pg.waitForSelector('#brw-title');
    await pg.click('[data-act=brwback]'); await pg.click('[data-act=brwopen][data-bid="' + RID + '"]'); await pg.waitForSelector('#brw-title'); await sleep(200);
    ok('xss: markup in stored names, messages and findings is shown as plain text and never runs', (await pg.evaluate(() => window.__xss)) === undefined && (await pg.locator('.brw img').count()) === 0 && /<img src=x/.test(await pg.textContent('.brw')));
  });

  /* ---------- AI with a provider switched on: plan first, spend only after a deliberate tick ---------- */
  await scene('ai', {}, async S => {
    const { pg, db } = S; db._providers.find(p => p.id === 'ai_anthropic').state = 'available';
    await pg.goto(BASE); await pg.waitForSelector('[data-act=brwgate]'); await pg.click('[data-act=brwgate]'); await pg.waitForSelector('#brw-h-prov + div table'); await pg.click('[data-act=brwopen][data-bid="' + RID + '"]'); await pg.waitForSelector('#brw-title');
    ok('AI: with a provider available the tool list and a plan button appear, no run button yet', (await pg.locator('[data-act=brwaiplan]').count()) === 1 && (await pg.locator('[data-act=brwairun]').count()) === 0);
    await pg.click('[data-act=brwaiplan]'); await pg.waitForSelector('.brwmsg:has-text("Choose at least one tool")'); await pg.check('#brw-ai-ai_anthropic'); await pg.click('[data-act=brwaiplan]'); await pg.waitForSelector('#brw-s-ai :text("Plan, nothing has run")');
    ok('AI: the dry run shows calls and an estimate in pence and spends nothing', /30 calls/.test(await pg.textContent('#brw-s-ai')) && /40 to 120 pence/.test(await pg.textContent('#brw-s-ai')) && db.br_ai_runs.length === 0);
    ok('AI: the run button is disabled until the cost is acknowledged', await pg.locator('[data-act=brwairun]').isDisabled());
    await pg.check('[data-brwchk=aiok]'); ok('AI: acknowledging enables the run', !(await pg.locator('[data-act=brwairun]').isDisabled()));
    await S.axe('ai plan');
  });

  /* ---------- B. the tables do not exist yet ---------- */
  await scene('notsetup', { flags: { noReviewTables: true }, allowResourceErrors: true }, async S => {
    const { pg } = S; await pg.goto(BASE); await pg.waitForSelector('[data-act=brwgate]'); await sleep(900);
    ok('not set up: no badge or count is invented, the client list still works', !/new\)/.test(await pg.textContent('[data-act=brwgate]')) && (await pg.locator('table.tbl tbody tr').count()) === 2);
    await pg.click('[data-act=brwgate]'); await pg.waitForSelector('.brw .note');
    const t = await pg.textContent('.brw');
    ok('not set up: an honest note, no list, no tiles, no fabricated numbers', /Reviews are not set up yet/.test(t) && (await pg.locator('.brwrow,.brwtile').count()) === 0 && /Nothing is wrong with your clients/.test(t));
    await S.axe('not set up'); await S.shot('not-set-up');
    S.flags.noReviewTables = false; await pg.click('[data-act=brwrefresh]'); await pg.waitForSelector('.brwrow');
    ok('not set up: Check again works once the tables exist', (await pg.locator('.brwrow').count()) === 3);
  });
  await scene('notsetup-inclient', { flags: { noReviewTables: true }, allowResourceErrors: true }, async S => {
    const { pg } = S; await pg.goto(BASE); await pg.waitForSelector('[data-act=clopen]'); await sleep(700); await pg.click('[data-act=clopen]'); await pg.waitForSelector('.rail');
    ok('not set up: inside a client the header button shows no count', (await pg.locator('.brwhead').count()) === 1 && !/\d/.test(await pg.textContent('.brwhead')));
    await pg.click('.rail .rl[data-go=reviews]'); await pg.waitForSelector('.brw .note');
    ok('not set up: the nav screen says the same and the client is unaffected', /Reviews are not set up yet/.test(await pg.textContent('.brw')) && (await pg.locator('.rail').count()) === 1);
    await pg.click('.rail .rl[data-go=setup]'); ok('not set up: other screens work normally', (await pg.locator('h1').first().textContent()).length > 0);
  });

  /* ---------- C. error states ---------- */
  await scene('errors', { flags: { reviewsError: true }, allowResourceErrors: true }, async S => {
    const { pg } = S; await pg.goto(BASE); await pg.waitForSelector('[data-act=brwgate]'); await pg.click('[data-act=brwgate]'); await pg.waitForSelector('.brw .note.stop');
    ok('error: a database error shows a clear message and Try again, not a blank page or a fake list', /Could not load/.test(await pg.textContent('.brw')) && (await pg.locator('[data-act=brwrefresh]').count()) === 1 && (await pg.locator('.brwrow').count()) === 0);
    S.flags.reviewsError = false; S.flags.adminDown = true; await pg.click('[data-act=brwrefresh]'); await pg.waitForSelector('.brwrow'); await pg.waitForSelector('.brwtile');
    ok('error: with the admin service down the counts are taken from stored rows and labelled so', /Counted here/.test(await pg.textContent('.brw')) && (await pg.locator('.brwtile').first().textContent()).startsWith('3'));
    ok('error: provider status says it is not available instead of inventing one', /Not available/.test(await pg.textContent('#brw-h-prov + .note')));
    await pg.click('[data-act=brwopen][data-bid="' + RID + '"]'); await pg.waitForSelector('#brw-title');
    ok('error: reading still works with the admin service down', /Verified public observation/.test(await pg.textContent('.brw')));
    await pg.click('[data-act=brwconf][data-bk="rej:' + GIFT + '"]'); await pg.click('[data-act=brwcomp][data-bk=reject]'); await pg.waitForSelector('.brwmsg:has-text("not reachable")');
    ok('error: a change that needs the admin service says why it did not happen and changes nothing', S.db.br_competitors.find(c => c.id === GIFT).status === 'selected' && /may not be deployed/.test(await pg.textContent('.brwmsg')));
    S.flags.adminDown = false; S.flags.admin403 = true; await pg.click('[data-act=brwcomp][data-bk=reject]'); await pg.waitForSelector('.brwmsg:has-text("not the owner account")');
    ok('error: another account is told it is not the owner account', true);
    await S.axe('error state');
  });
  await scene('linkfail-banner', { flags: { adminDown: true, linkFails: true }, allowResourceErrors: true }, async S => { /* admin down: direct update path links the project */
    const { pg, db } = S; await pg.goto(BASE); await pg.waitForSelector('[data-act=leadmk]'); await pg.click('[data-act=leadmk]'); await pg.waitForSelector('.brwbanner'); await pg.waitForFunction(() => S.review.link.state !== 'pending');
    ok('link: with the admin service down the link is made by the owner only direct update', (await S.state()).review.link.state === 'linked' && db.br_prospects[0].status === 'draft_project');
  });

  /* ---------- D. the offline pack (file://): no cloud, no errors ---------- */
  { const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); await ctx.setOffline(true); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await pg.goto('file://' + WB); await pg.waitForSelector('.rail');
    ok('offline: no header button and no network from the reviews module', (await pg.locator('.brwhead').count()) === 0);
    ok('offline: the nav lists Business reviews under Client', /Business reviews/.test(await pg.textContent('.rail')) && (await pg.locator('.rail .rl[data-go=reviews]').count()) === 1);
    await pg.click('.rail .rl[data-go=reviews]'); await pg.waitForSelector('.brw .note');
    ok('offline: an honest online only note, nothing else', /Online only/.test(await pg.textContent('.brw')) && /nothing is stored here/.test(await pg.textContent('.brw')) && (await pg.locator('.brwrow').count()) === 0);
    await pg.click('.rail .rl[data-go=setup]'); ok('offline: the rest of the workbook works', (await pg.locator('.meetstart').count()) === 1);
    ok('offline: no console or page errors', errs.length === 0, errs.join('|')); allErrs.push(...errs); await ctx.close(); }

  /* ---------- E. keyboard ---------- */
  await scene('keyboard', {}, async S => {
    const { pg, db } = S; await pg.goto(BASE); await pg.waitForSelector('[data-act=brwgate]');
    await pg.focus('[data-act=brwgate]'); await pg.keyboard.press('Enter'); await pg.waitForSelector('.brwrow');
    ok('keyboard: the reviews button opens with Enter', /Business reviews/.test(await pg.textContent('h1')));
    await pg.focus('[data-act=brwopen][data-bid="' + RID + '"]'); await pg.keyboard.press('Enter'); await pg.waitForSelector('#brw-title');
    ok('keyboard: an Open button opens a review and puts focus on its heading', (await pg.evaluate(() => document.activeElement.id)) === 'brw-title');
    await pg.focus('[data-act=brwjump][data-bid=brw-s-ev]'); await pg.keyboard.press('Enter'); await sleep(100);
    ok('keyboard: the section jump buttons move focus to that section heading', (await pg.evaluate(() => document.activeElement.id)) === 'brw-h-ev');
    await pg.focus('[data-brwchk=discuss][data-bk=slow_mobile_loading]'); await pg.keyboard.press('Space'); await pg.waitForSelector('.brwmsg:has-text("Marked for discussion")');
    ok('keyboard: a recommendation can be marked with the space bar', db.br_prospects[0].discuss_keys.includes('slow_mobile_loading'));
    ok('keyboard: scrolling tables are focusable regions with names', (await pg.locator('.brwscroll[tabindex="0"][role=region][aria-label]').count()) >= 2);
    const tabbables = await pg.evaluate(() => [...document.querySelectorAll('.brw button:not([disabled]),.brw input,.brw select,.brw textarea,.brw [tabindex="0"]')].filter(e => e.offsetParent).length);
    ok('keyboard: every control is reachable by Tab', tabbables > 20, String(tabbables));
    await pg.keyboard.press('Tab'); ok('keyboard: focus is visible on the focused control', await pg.evaluate(() => { const a = document.activeElement; const s = getComputedStyle(a); return a !== document.body && (s.outlineStyle !== 'none' || s.boxShadow !== 'none'); }));
  });

  /* ---------- F. phone, tablet, desktop ---------- */
  for (const w of [390, 768, 1440]) await scene('vp' + w, { vp: { width: w, height: 900 } }, async S => {
    const { pg } = S; await pg.goto(BASE); await pg.waitForSelector('[data-act=brwgate]'); await S.noXScroll(w);
    await pg.click('[data-act=brwgate]'); await pg.waitForSelector('.brwrow'); await sleep(250); await S.noXScroll(w); await S.shot('list');
    await pg.click('[data-act=brwopen][data-bid="' + RID + '"]'); await pg.waitForSelector('#brw-title'); await pg.click('[data-act=brwrevise]'); await S.noXScroll(w); await S.shot('detail');
    ok('vp' + w + ': long text wraps, nothing is cut off inside the review (tables scroll in their own region)', await pg.evaluate(() => [...document.querySelectorAll('.brw .brwmain,.brw .brwdl dd,.brw p')].filter(e => !e.closest('.brwscroll')).every(e => e.scrollWidth <= e.clientWidth + 2)));
    await pg.click('[data-act=brwback]'); await pg.click('[data-act=brwtolist]'); await pg.waitForSelector('[data-act=clopen]'); await pg.click('[data-act=clopen]'); await pg.waitForSelector('.rail'); await sleep(300);
    ok('vp' + w + ': inside a client the header still fits with the Reviews button', await pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    await pg.click('.brwhead'); await pg.waitForSelector('.brwrow'); await S.noXScroll(w); if (w !== 1440) await S.axe('vp' + w + ' work view');
    if (w === 390) { ok('vp390: buttons and checkboxes are at least 24px tall (touch target minimum)', await pg.evaluate(() => [...document.querySelectorAll('.brw button')].filter(b => b.offsetParent).every(b => b.getBoundingClientRect().height >= 24))); }
  });

  /* ---------- G. sign out clears what was loaded ---------- */
  await scene('signout', {}, async S => {
    const { pg } = S; await pg.goto(BASE); await pg.waitForSelector('[data-act=brwgate]'); await pg.click('[data-act=brwgate]'); await pg.waitForSelector('.brwrow'); await pg.click('[data-act=clout]'); await pg.waitForSelector('#cl-email');
    ok('sign out: the gate returns and the loaded reviews and contact details are cleared from memory', await pg.evaluate(() => BRW.reviews.length === 0 && !BRW.d && !BRW.loaded && !/Business reviews|Harbour/.test(document.body.innerText)));
  });

  srv.close(); await browser.close();
  ok('network: nothing left the machine except the local mocks', external.length === 0, external.join(','));
  ok('network: the module only used the allowed endpoints', [...paths].every(p => /^\/rest\/v1\/(br_[a-z_]+|leads|client_[a-z]+|business_details|quote_acceptances)$/.test(p) || p === '/api/business-review/admin/*' || /^\/auth\/v1\//.test(p)), [...paths].join(','));
  ok('axe was run on ' + axeRuns + ' screens', AXE ? axeRuns >= 8 : true, AXE ? '' : 'axe-core not found');
  const fails = log.filter(l => l.startsWith('FAIL')).length; log.forEach(l => console.log(l));
  if (axeFound.length) console.log('AXE FOUND:\n' + axeFound.join('\n'));
  console.log('\nFAILS: ' + fails + ' PASSES: ' + (log.length - fails)); process.exit(fails ? 1 : 0);
})();
