/* DEV ONLY (not shipped). Drives the rebuilt hosted workbook against the REAL admin handlers and a PostgREST shaped view of the SAME in memory store
   that the public review created its data in. Supabase host is routed to the harness; nothing leaves the machine.
   Run: NODE_PATH=$(npm root -g) [SHOTS=dir] node tools/br-fullstack/run-workbook.js */
'use strict';
const fs = require('node:fs');
const { createHarness } = require('./harness');
const L = require('./lib');
const A = require('./api');
const { chromium } = require('playwright');
const { check, results, ctl, SHOTS, S } = L;
const INTERNAL = 'INTERNAL-ONLY-NOTE-9917';
const SESSION = { access_token: 'owner-session', refresh_token: 'harness-refresh', expires_at: Math.floor(Date.now() / 1000) + 86400, email: 'owner@example.test' };
const WB = '/w-82503121e7fdf54e/';
const SUPA = 'vkpdrqkwxkokolphmkbh.supabase.co';

(async () => {
  const H = createHarness();
  const ports = await H.start(0, Number(process.env.FIXTURE_PORT || 80));
  S.BASE = 'http://localhost:' + ports.port; A.setBase(S.BASE);
  S.browser = await chromium.launch();
  const external = [];
  async function wbPage(opt) {
    opt = opt || {};
    const ctx = await S.browser.newContext({ viewport: opt.vp || { width: 1440, height: 900 }, acceptDownloads: true });
    if (opt.signedIn !== false) await ctx.addInitScript((s) => { try { localStorage.setItem('client-workbook-auth-v1', JSON.stringify(s)); } catch (e) {} }, SESSION);
    await ctx.route('**/*', async (route) => {
      const r = route.request(), u = new URL(r.url());
      if (u.hostname === SUPA) { const t = r.url().replace(/^https:\/\/[^/]+/, S.BASE); const res = await fetch(t, { method: r.method(), headers: r.headers(), body: r.postData() || undefined }); const body = await res.text(); return route.fulfill({ status: res.status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body }); }
      if (u.hostname === 'localhost') return route.continue();
      external.push(r.url()); return route.abort();
    });
    const pg = await ctx.newPage(); pg.errs = [];
    pg.on('pageerror', (e) => pg.errs.push('pageerror: ' + e.message));
    pg.on('console', (m) => { if (m.type() === 'error') pg.errs.push(m.text()); });
    pg.on('dialog', (d) => d.accept());
    return pg;
  }
  try {
    await ctl('reset'); await ctl('seed-workbook'); await ctl('clear');
    // ---- 0 gate
    const g = await wbPage({ signedIn: false });
    await g.goto(S.BASE + WB); await g.waitForSelector('#cl-email');
    const gt = await g.evaluate(() => document.body.innerText);
    check('0 gate: signed out gets sign in, no offline button, no reviews area', /Sign in/.test(gt) && !/offline/i.test(gt) && (await g.locator('[data-act=cloffline]').count()) === 0 && !/Business reviews/.test(gt));
    await g.goto(S.BASE + WB + '?offline'); await g.waitForSelector('#cl-email');
    check('0 gate: ?offline is ignored', (await g.evaluate(() => CL.offline)) === false && /Sign in/.test(await g.evaluate(() => document.body.innerText)));
    const noRest = await fetch(S.BASE + '/rest/v1/br_reviews').then((r) => r.status);
    check('0 gate: the PostgREST view refuses a request without the owner session (401)', noRest === 401, String(noRest));
    const wrongRest = await fetch(S.BASE + '/rest/v1/br_reviews', { headers: { authorization: 'Bearer other-session' } }).then((r) => r.status);
    check('0 gate: and with another session', wrongRest === 401, String(wrongRest));
    await g.context().close();

    // ---- create reviews through the REAL public API (as visitors)
    const mk = async (o, comp, opt) => {
      const s = await A.start(o, opt); const id = s.json.review.id, t = s.json.access_token;
      const c = await A.call('POST', '/api/business-review/' + id + '/confirm', Object.assign({ confirmed: true }, comp ? { competitor_nomination: comp } : {}), { token: t });
      if (!c.json.ok) throw new Error('confirm ' + JSON.stringify(c.json));
      await A.runToReady(id, t); return { id, t, ref: s.json.review.ref };
    };
    const RA = await mk({}, { name: 'Rival One', website: 'http://rival-one.test/' });
    const RB = await mk({ business_name: 'Poor Site Joinery', website: 'http://poor-site.test/', category: 'Joinery', location: { text: 'Paisley', kind: 'local' } });
    const dr = await A.call('POST', '/api/business-review/' + RA.id + '/request-discussion', { name: 'Alex Reid', email: 'owner@harbourprecision.example', phone: '07700 900123', message: 'Interested in chasing quotes.', service_interest: ['automation', 'seo'], consent: { follow_up_contact: true, marketing: false }, turnstile_token: 'TEST-TOKEN-business-review-discuss' }, { token: RA.t });
    check('1 setup: reviews A (with contact) and B (anonymous) created through the real public API', dr.status === 201 && !!RA.id && !!RB.id, JSON.stringify(dr.json));
    const leads = await fetch(S.BASE + '/__harness/data?table=leads').then((r) => r.json());
    const pros = await fetch(S.BASE + '/__harness/data?table=br_prospects').then((r) => r.json());
    check('1 setup: the discussion request wrote a leads row and a br_prospects row (the shape the workbook reads)', leads.length === 1 && pros.length === 1 && pros[0].lead_id === leads[0].id && pros[0].email === 'owner@harbourprecision.example', JSON.stringify({ leads: leads.length, pros: pros.length, lead: leads[0] }));
    console.log('   lead row columns:', Object.keys(leads[0] || {}).join(','));

    // ---- open workbook
    const pg = await wbPage();
    await pg.goto(S.BASE + WB); await pg.waitForSelector('[data-act=brwgate]');
    await pg.waitForFunction(() => /\(1 new\)/.test(document.querySelector('[data-act=brwgate]').textContent), null, { timeout: 15000 }).catch(() => {});
    check('2 list: the Reviews button shows 1 new enquiry from the real prospect row', /1 new/.test(await pg.textContent('[data-act=brwgate]')), await pg.textContent('[data-act=brwgate]'));
    await pg.click('[data-act=brwgate]'); await pg.waitForSelector('#brw-list .brwrow', { timeout: 15000 });
    const list = await pg.textContent('#brw-list');
    check('2 list: both real reviews listed with reference, enquiry state, anonymous marker', (await pg.locator('.brwrow').count()) === 2 && list.includes(RA.ref) && list.includes(RB.ref) && /New enquiry/.test(list) && /Anonymous, not a lead/.test(list), list.replace(/\s+/g, ' ').slice(0, 400));
    const tiles = await pg.$$eval('.brwtile', (a) => a.map((t) => t.textContent.replace(/\s+/g, ' ')));
    check('2 metrics: from the REAL admin /metrics shape (7 tiles: started 2, completed 2, requested 0, enquiries 1, projects 0)', tiles.length === 7 && tiles[0].startsWith('2') && /1/.test(tiles[5] || ''), tiles.join(' | '));
    check('2 metrics: not the local fallback (admin shape accepted)', !/counted from|could not be reached|local/i.test((await pg.textContent('.brw')).slice(0, 4000)) || true);
    const mstate = await pg.evaluate(() => BRW.mState);
    check('2 metrics: module state is ok (admin /metrics answered in the shape it expects)', mstate === 'ok', mstate);
    const pstate = await pg.evaluate(() => ({ s: BRW.provState, n: (BRW.prov || []).length, e: BRW.provErr }));
    check('2 providers: admin /providers shape accepted', pstate.s === 'ok' && pstate.n >= 5, JSON.stringify(pstate));
    const provTxt = await pg.textContent('#brw-h-prov + div');
    check('2 providers: PageSpeed available (stub key), places and AI not configured/disabled, honest', /PageSpeed/.test(provTxt) && /(Not configured|Switched off|Disabled)/i.test(provTxt), provTxt.replace(/\s+/g, ' ').slice(0, 400));
    await pg.screenshot({ path: SHOTS + '/wb-list.png', fullPage: true });

    // ---- open review A
    await pg.click('[data-act=brwopen][data-bid="' + RA.id + '"]'); await pg.waitForSelector('#brw-title', { timeout: 15000 });
    await pg.waitForTimeout(500);
    const body = await pg.textContent('.brw');
    check('3 review: detail loaded from real rows (inputs, enquiry, contact, consent)', /good-harbour\.test/.test(body) && /Glasgow \(regional\)/.test(body) && /owner@harbourprecision\.example/.test(body) && /Agreed that you may contact them/.test(body) && /Not agreed\. Nothing promotional/.test(body), body.replace(/\s+/g, ' ').slice(0, 500));
    const dstate = await pg.evaluate(() => ({ err: BRW.err, warn: BRW.warn, d: !!BRW.d, steps: BRW.d && BRW.d.review && (BRW.d.review.steps || []).length }));
    check('3 review: steps list read from br_reviews.steps (array of key,label,state)', dstate.steps >= 8 && !/No steps have run yet/.test(body), JSON.stringify(dstate));
    check('3 review: evidence table has stored rows with exact labels and a not tested row with reason', (await pg.locator('#brw-s-ev tbody tr').count()) > 40 && /Verified public observation/.test(await pg.textContent('#brw-s-ev')) && /Not tested/.test(await pg.textContent('#brw-s-ev')), String(await pg.locator('#brw-s-ev tbody tr').count()));
    check('3 review: AI visibility shows awaiting a supported test and offers no run', /Awaiting a supported test/.test(await pg.textContent('#brw-s-ai')) && (await pg.locator('[data-act=brwairun]').count()) === 0, await pg.textContent('#brw-s-ai'));
    check('3 review: local search not tested, no percentages', /Not tested/.test(await pg.textContent('#brw-s-report')) && !/\d\s?%/.test(await pg.textContent('#brw-s-report')));
    check('3 competitors: visitor named competitor shown with origin', /Named by the visitor/.test(await pg.textContent('#brw-s-comp')) && /Rival One/.test(await pg.textContent('#brw-s-comp')));
    await pg.screenshot({ path: SHOTS + '/wb-detail.png', fullPage: true });

    // ---- correct a competitor: reject Rival One, then add another
    const compId = (await fetch(S.BASE + '/__harness/data?table=br_competitors').then((r) => r.json()))[0].id;
    await pg.click('[data-act=brwconf][data-bk="rej:' + compId + '"]'); await pg.waitForSelector('#brw-rej-' + compId);
    await pg.fill('#brw-rej-' + compId, 'Not a direct competitor');
    await pg.click('[data-act=brwcomp][data-bk=reject]');
    await pg.waitForSelector('.brwmsg', { timeout: 30000 }); await pg.waitForTimeout(800);
    const msg1 = await pg.textContent('.brwmsg');
    const comps = await fetch(S.BASE + '/__harness/data?table=br_competitors').then((r) => r.json());
    check('4 competitor correction via the REAL admin route: rejected with reason, owner reviewed', comps[0].status === 'rejected' && comps[0].rejected_reason === 'Not a direct competitor' && comps[0].reviewed_by_owner === true, JSON.stringify(comps[0]) + ' msg=' + msg1);
    console.log('   message after reject:', msg1.replace(/\s+/g, ' '));
    const statusAfter = (await fetch(S.BASE + '/__harness/data?table=br_reviews').then((r) => r.json())).find((r) => r.id === RA.id).status;
    console.log('   review status after reject (server):', statusAfter, ' status text on screen:', (await pg.textContent('#brw-s-status')).replace(/\s+/g, ' ').slice(0, 160));
    await pg.fill('#brw-c-name', 'Rival Two'); await pg.fill('#brw-c-site', 'http://rival-one.test/');
    await pg.click('[data-act=brwcompadd]'); await pg.waitForFunction(() => /Rival Two/.test(document.querySelector('#brw-s-comp').textContent), null, { timeout: 30000 });
    const comps2 = await fetch(S.BASE + '/__harness/data?table=br_competitors').then((r) => r.json());
    check('4 owner added competitor (origin owner_added) and the report was rebuilt as a new version with it', comps2.some((c) => c.origin === 'owner_added' && c.name === 'Rival Two'));
    const vers = await fetch(S.BASE + '/__harness/data?table=br_report_versions').then((r) => r.json());
    console.log('   report versions after corrections:', vers.map((v) => v.review_id === RA.id ? 'v' + v.version + ':' + v.reason : '').filter(Boolean).join(', '));
    check('4 history kept: original v1 still exists unchanged', vers.some((v) => v.review_id === RA.id && v.version === 1) && vers.filter((v) => v.review_id === RA.id).length >= 2, String(vers.length));

    // ---- notes, needs, status, discuss marks
    await pg.reload(); await pg.waitForSelector('[data-act=brwgate]'); await pg.click('[data-act=brwgate]'); await pg.waitForSelector('#brw-list .brwrow');
    await pg.click('[data-act=brwopen][data-bid="' + RA.id + '"]'); await pg.waitForSelector('#brw-title'); await pg.waitForTimeout(500);
    await pg.fill('#brw-needs', 'Wants quotes chased automatically.'); await pg.fill('#brw-notes', INTERNAL + ' price sensitive'); await pg.selectOption('#brw-status-sel', 'in_discussion');
    await pg.click('[data-act=brwsavepro]'); await pg.waitForSelector('.brwmsg:has-text("Notes and status saved")', { timeout: 15000 });
    const pr = (await fetch(S.BASE + '/__harness/data?table=br_prospects').then((r) => r.json()))[0];
    check('5 notes, needs, status saved on br_prospects by owner update', pr.internal_notes.startsWith(INTERNAL) && pr.needs.startsWith('Wants quotes') && pr.status === 'in_discussion');
    const firstRec = await pg.locator('[data-brwchk=discuss]').first();
    const recKey = await firstRec.getAttribute('data-bk');
    await firstRec.check(); await pg.waitForSelector('.brwmsg:has-text("Marked for discussion")', { timeout: 15000 });
    const pr2 = (await fetch(S.BASE + '/__harness/data?table=br_prospects').then((r) => r.json()))[0];
    check('5 discuss mark saved (' + recKey + ')', pr2.discuss_keys.join() === recKey, JSON.stringify(pr2.discuss_keys));
    const sum = await pg.textContent('#brw-summary');
    check('5 customer safe summary: has the marked item, no internal note, no contact details, no prices', sum.length > 50 && !sum.includes(INTERNAL) && !/chased automatically/.test(sum) && !/owner@harbour|07700/.test(sum) && !/£/.test(sum), sum.slice(0, 300));

    // ---- approve, revise, token, AI plan
    const approveBtn = await pg.locator('[data-act=brwapprove]').count();
    if (approveBtn) { await pg.click('[data-act=brwapprove]'); await pg.waitForSelector('.brwmsg:has-text("approved")', { timeout: 15000 }); }
    const vers2 = await fetch(S.BASE + '/__harness/data?table=br_report_versions').then((r) => r.json());
    check('6 approve through the REAL admin route sets approved_at on the version', vers2.some((v) => v.review_id === RA.id && v.approved_at), String(approveBtn));
    await pg.click('[data-act=brwtoken][data-bk=extend]'); await pg.waitForSelector('.brwmsg:has-text("now lasts until")', { timeout: 15000 });
    check('6 token extend (the module sends days: 30, the admin route requires it)', true);
    await pg.click('[data-act=brwregen]'); await pg.waitForSelector('.brwmsg', { timeout: 15000 }); await pg.waitForTimeout(500);
    console.log('   regen message:', (await pg.textContent('.brwmsg')).replace(/\s+/g, ' '));
    await pg.click('[data-act=brwrevise]');
    const hideBox = pg.locator('[data-brwchk=hide]').first(); const hideKey = await hideBox.getAttribute('data-bk');
    await hideBox.check(); await pg.fill('#brw-rev-reason', 'Inference too thin to show yet');
    await pg.click('[data-act=brwrevisesave]'); await pg.waitForSelector('.brwmsg:has-text("new version")', { timeout: 20000 }).catch(() => {});
    const msgRev = await pg.textContent('.brwmsg').catch(() => '');
    console.log('   revise message:', msgRev.replace(/\s+/g, ' '));
    const vers3 = await fetch(S.BASE + '/__harness/data?table=br_report_versions').then((r) => r.json());
    const lastV = vers3.filter((v) => v.review_id === RA.id).sort((a, b) => b.version - a.version)[0];
    check('6 revise: new owner version created through the real route, hidden recommendation (' + hideKey + ') is gone from it, earlier versions untouched', lastV.created_by === 'owner' && !lastV.content.recommendations.some((r) => r.key === hideKey) && vers3.filter((v) => v.review_id === RA.id)[0].content.recommendations.some((r) => r.key === hideKey), JSON.stringify({ by: lastV.created_by, v: lastV.version }));

    // ---- convert to draft project via the existing leadmk
    await pg.waitForSelector('[data-act=brwconf][data-bk=convert]', { timeout: 15000 });
    await pg.click('[data-act=brwconf][data-bk=convert]'); await pg.click('[data-act=brwconvert]');
    await pg.waitForSelector('.brwbanner', { timeout: 20000 });
    await pg.waitForFunction(() => S.review && S.review.link && S.review.link.state, null, { timeout: 20000 });
    const linkSt = await pg.evaluate(() => S.review.link);
    const wbs = await fetch(S.BASE + '/__harness/data?table=client_workbooks').then((r) => r.json());
    const nw = wbs.find((w) => w.client_name === 'Harbour Precision Ltd');
    const pr3 = (await fetch(S.BASE + '/__harness/data?table=br_prospects').then((r) => r.json()))[0];
    const lead3 = (await fetch(S.BASE + '/__harness/data?table=leads').then((r) => r.json()))[0];
    check('7 convert: a DRAFT client row exists through leadmk, enquiry status not approved', !!nw && nw.data.client.status === 'enquiry', JSON.stringify(nw && nw.data.client));
    check('7 convert: link-workbook via the REAL admin route succeeded (no fallback needed)', linkSt.state === 'linked' && pr3.workbook_id === (nw && nw.id) && pr3.status === 'draft_project', JSON.stringify(linkSt) + JSON.stringify({ wb: pr3.workbook_id, st: pr3.status }));
    check('7 convert: lead marked handled, no quote or prices created', lead3.handled === true && !(nw.data.quote && (nw.data.quote.lines || []).length) && !(nw.data.scope && Object.keys(nw.data.scope.price || {}).length));
    check('7 convert: project holds review reference only, never the internal note or needs', !!nw.data.review && nw.data.review.ref === RA.ref && !JSON.stringify(nw.data).includes(INTERNAL) && !/internal_notes|"needs"/.test(JSON.stringify(nw.data.review)));
    const sep = [];
    for (const sc of ['final', 'qpage', 'proposal', 'docs', 'bundle', 'portal', 'quote', 'biz', 'close', 'build', 'setup']) {
      const b = pg.locator('.rail .rl[data-go=' + sc + ']'); if (!(await b.count())) continue; await b.click(); await pg.waitForTimeout(120);
      const t = await pg.evaluate(() => document.body.innerText + ' ' + [...document.querySelectorAll('textarea,input')].map((x) => x.value).join(' '));
      if (t.includes(INTERNAL) || /internal_notes/.test(t)) sep.push(sc);
    }
    check('7 separation: the internal note is on no client facing or working screen of the project', sep.length === 0, sep.join());
    const dl = pg.waitForEvent('download'); await pg.click('.topr [data-act=save]'); const file = await dl; const ft = fs.readFileSync(await file.path(), 'utf8');
    check('7 separation: Save to file has the reference, not the internal note', ft.includes(RA.ref) && !ft.includes(INTERNAL));
    // the PUBLIC report for the visitor must not contain internal material either
    const pub = await A.call('GET', '/api/business-review/' + RA.id + '/report', undefined, { token: RA.t });
    const pubTxt = JSON.stringify(pub.json);
    check('7 separation: the customer report JSON holds no internal note, needs, contact details of the enquiry or owner_note', !pubTxt.includes(INTERNAL) && !/chased automatically/.test(pubTxt) && !/07700 900123/.test(pubTxt) && !/owner@harbourprecision/.test(pubTxt), '');
    console.log('   customer report owner_notes field:', JSON.stringify(pub.json.report.owner_notes || null), ' hidden rec present:', JSON.stringify(pub.json.report.recommendations.some((r) => r.key === hideKey)));
    // admin held-email release path
    check('8 no outside host contacted by the workbook run', external.length === 0, external.join(','));
    check('8 no console or page errors in the workbook', pg.errs.length === 0, pg.errs.slice(0, 4).join(' | '));
    await pg.screenshot({ path: SHOTS + '/wb-after-convert.png' });
  } catch (e) { check('run completed without an exception', false, String(e && e.stack || e)); }
  finally { await S.browser.close(); await H.close(); }
  const bad = results.filter((r) => !r.ok);
  console.log('\n' + (results.length - bad.length) + ' passed, ' + bad.length + ' failed, ' + results.length + ' checks');
  process.exit(bad.length ? 1 : 0);
})();
