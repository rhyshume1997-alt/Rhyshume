/* End to end test of the grant meeting, with a FICTIONAL client only (Maple Street Fabrication).
   Usage: NODE_PATH=$(npm root -g) node tools/workbook-meeting/e2e-grant.js <built workbook html> [screenshot dir] [axe.min.js path]
   Opened from a file with the network switched off. Mouse and keyboard, stop rule, over the cap, going back, autosave and reload,
   JSON round trip, Grant screens, hand edits, client pack has no internal notes, three widths, axe, no console errors. */
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const WB = path.resolve(process.argv[2] || 'w-82503121e7fdf54e/index.html'); const SHOTS = process.argv[3] ? path.resolve(process.argv[3]) : '';
const AXE = process.argv[4] ? path.resolve(process.argv[4]) : '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const TMP = fs.mkdtempSync('/tmp/grant-e2e-');
const log = []; let fails = 0; const ok = (n, v, x) => { if (!v) fails++; log.push((v ? 'PASS ' : 'FAIL ') + n + (x && !v ? ' (' + x + ')' : '')); };
const PRIV = 'PRIVATE-NOTE-GRANT-ALPHA margin forty percent';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 820 }, acceptDownloads: true }); await ctx.setOffline(true);
  let pg = await ctx.newPage(); const errs = []; let promptText = 'Maple Street Fabrication (made up)'; const dialogs = [];
  const hook = p => { p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    p.on('dialog', async d => { dialogs.push(d.type() + ': ' + d.message().slice(0, 300)); if (d.type() === 'prompt') await d.accept(promptText); else await d.accept(); }); };
  hook(pg); const net = []; pg.on('request', r => { if (!/^(file|data|blob):/.test(r.url())) net.push(r.url()); });
  const shot = async n => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, n + '.png') }); };
  const st = () => pg.evaluate(() => JSON.parse(JSON.stringify(S, (k, v) => (k === 'ui' || k === 'pb') ? undefined : v)));
  const cur = () => pg.evaluate(() => gmSteps()[GM().step].id);
  const next = async () => { await pg.click('.mf2 [data-act=gnext]'); await pg.waitForTimeout(60); };
  const jump = async id => { await pg.evaluate(i => ACTS2.gjump(null, { id: i }), id); await pg.waitForTimeout(60); };
  const fill = async (k, v) => { await pg.fill('[data-k="' + k + '"]', v); };
  const yn = async v => { await pg.click('.mq .mseg button[data-v=' + v + ']'); await pg.waitForTimeout(40); };
  const gotoScreen = async id => { await pg.evaluate(i => { S.screen = i; render(); }, id); await pg.waitForTimeout(80); };
  const download = async sel => { const [d] = await Promise.all([pg.waitForEvent('download'), pg.click(sel)]); const f = path.join(TMP, d.suggestedFilename()); await d.saveAs(f); return f; };

  await pg.goto('file://' + WB); await pg.waitForTimeout(1200);
  ok('opens from a file with no network and no errors', errs.length === 0, errs.join('|'));
  // ---- entry: hub choice
  await pg.click('.meetstart'); await pg.waitForTimeout(250);
  ok('the meeting hub offers a clear choice of Website project or Grant', (await pg.locator('#gkind .gcard').count()) === 2 && /Website project/.test(await pg.textContent('#gkind')) && /East Dunbartonshire Digital Support Grant/.test(await pg.textContent('#gkind')));
  await shot('01-hub-choice');
  ok('a new client is not a funding application by default, so the Grant screens are hidden', await pg.evaluate(() => !S.client.modes.funding && !visible().some(s => s.id === 'gmeeting')));
  ok('the Grant group has a Grant meeting screen in the sidebar once the client is a funding application', await pg.evaluate(() => { S.client.modes.funding = true; S.client.packId = GM_PACK_ID; ensurePackState(); const v = visible().some(s => s.id === 'gmeeting'); S.client.modes.funding = false; return v; }));
  await pg.click('#gkind [data-act=gnew]'); await pg.waitForTimeout(500);
  let s = await st();
  ok('starting a grant meeting sets funding mode and the East Dunbartonshire pack', s.client.modes.funding === true && s.client.packId === 'edc-lgf-digital' && s.client.business === promptText);
  ok('it opens full screen, practice labelled, with a skip link, nav and aria-live', (await pg.locator('.gshell').count()) === 1 && /Practice/.test(await pg.textContent('.mh')) && (await pg.locator('a.skip').count()) === 1 && (await pg.locator('nav[aria-label="Grant meeting stages"] li').count()) === 7 && (await pg.locator('.mflash[aria-live=polite]').count()) === 1 && (await pg.locator('#gmlive[aria-live=polite]').count()) === 1);
  const total = await pg.evaluate(() => gmSteps().length);
  ok('one question at a time: a single heading, one question body, Back Next Save and progress', (await pg.locator('h1').count()) === 1 && (await pg.locator('.mq').count()) === 1 && /Next/.test(await pg.textContent('.mf2')) && /Save/.test(await pg.textContent('.mf2')) && /questions answered/.test(await pg.textContent('.mprog')), total + ' steps');
  ok('Help for Rhys has ask, good answer, listen for and do not promise on every step', await pg.evaluate(() => gmSteps().every(x => { GM().step = gmSteps().indexOf(x); const h = gmHelp(x); return /Ask/.test(h) && /A good answer sounds like/.test(h) && /Listen out for/.test(h) && /Do not promise/.test(h) && !/Ask the question as written and let them answer/.test(h); })));
  await pg.evaluate(() => { GM().step = 0; render(); });
  await shot('02-stage1-name');
  // ---- stage 1 by keyboard
  ok('stage 1 starts with the business name already typed', (await pg.inputValue('[data-k="client.business"]')) === promptText);
  await next();
  await pg.focus('[data-k="client.contact"]'); await pg.keyboard.type('Sam Maple'); await pg.keyboard.press('Tab'); await pg.keyboard.type('sam@example.test'); await pg.keyboard.press('Tab'); await pg.keyboard.type('07700 900123');
  for (let i = 0; i < 8; i++) { await pg.keyboard.press('Tab'); if (await pg.evaluate(() => document.activeElement && document.activeElement.dataset.act === 'gnext')) break; }
  ok('keyboard Tab reaches the Next button', await pg.evaluate(() => document.activeElement.dataset.act) === 'gnext');
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(100);
  ok('Enter on Next moves on and puts focus on the question heading', (await cur()) === 'baddr' && await pg.evaluate(() => document.activeElement.id) === 'gstep');
  s = await st(); ok('contact answers are in the existing Client fields', s.client.contact === 'Sam Maple' && s.client.email === 'sam@example.test' && s.client.phone === '07700 900123');
  await fill('client.address', '12 Test Road, G66 1AA'); await fill('client.town', 'Kirkintilloch'); await next();
  const y = new Date().getFullYear() - 3;
  await fill('gmeet.b.since', y + '-03'); await pg.waitForTimeout(100);
  ok('trading since shows the months and checks against the rule from the pack', /months of trading/.test(await pg.textContent('[data-live=gmsince]')) && (await pg.locator('[data-live=gmsince] .g-green').count()) === 1);
  await next(); await pg.click('.mseg button[data-v=ltd]'); await pg.waitForTimeout(40);
  ok('legal form recorded', (await st()).gmeet.b.legal === 'ltd'); await next();
  // ---- stage 2: every rule from the pack
  const rules = await pg.evaluate(() => PACKS.find(p => p.id === 'edc-lgf-digital').eligibility.map(q => q.id));
  ok('stage 2 has one question for every eligibility rule in the pack', await pg.evaluate(r => r.every(id => gmSteps().some(x => x.id === 'e-' + id)), rules) && rules.length === 7, rules.join());
  // layout does not shift when an answer is given
  const box = async sel => pg.evaluate(q => { const r = document.querySelector(q).getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width)]; }, sel);
  const h1a = await box('#gstep'), na = await box('.gnav'), fa = await box('.mf2');
  await pg.keyboard.press('Tab'); await pg.focus('.mq .mseg button[data-v=yes]'); await pg.keyboard.press('Space'); await pg.waitForTimeout(80);
  ok('answering by keyboard (Space on Yes) records the answer', (await st()).elig.area === 'yes');
  ok('no layout shift above the answer: heading, nav and footer stay put', JSON.stringify(h1a) === JSON.stringify(await box('#gstep')) && JSON.stringify(na) === JSON.stringify(await box('.gnav')) && JSON.stringify(fa) === JSON.stringify(await box('.mf2')));
  ok('a green outcome is shown with a label, not colour alone', /Fine so far/.test(await pg.textContent('.gout')) && (await pg.locator('.gout.g-green').count()) === 1);
  ok('the aria-live region announces the outcome', /Fine so far/.test(await pg.textContent('#gmlive')));
  await shot('03-elig-green');
  await next();
  await yn('yes'); await next(); await yn('yes'); await next(); await yn('no'); await next(); await yn('yes'); await next(); await yn('no'); await next(); await yn('yes');
  ok('rules with the good answer no (council debt) accept no as fine', (await st()).elig.debt === 'no');
  ok('the first-time question is a note, not a stop', await pg.evaluate(() => gmRuleMsg(PACKS[0].eligibility.find(q => q.id === 'first'), 'yes').lvl) === 'green');
  await next();
  ok('turnover step comes from the pack rule', (await cur()) === 'eturn');
  await fill('turnover.recent', '180000'); await fill('turnover.last', '150000'); await pg.waitForTimeout(100);
  ok('turnover shows the cautious maximum as the lower of the cap and the turnover limit', /2,500/.test(await pg.textContent('[data-live=gmmax]')) && /ask the council|confirm with the council/i.test(await pg.textContent('[data-live=gmmax]')));
  await next();
  ok('eligible result is green, honest and not a promise', (await pg.locator('.gout.g-green').count()) >= 1 && /not a decision/.test(await pg.textContent('.mq')) && /does not guarantee an award/.test(await pg.textContent('.mq')) && !/you will (get|receive)/i.test(await pg.textContent('.mq')));
  await shot('04-result-green');
  await next();
  // ---- stage 3
  ok('project step lists the council list and says Google profile, domain and email are not on it', /Not on that list/.test(await pg.textContent('.mq')) && /Google profile/.test(await pg.textContent('.mq')));
  await pg.click('.mchoice[data-want=website]'); await pg.waitForTimeout(60); await fill('gmeet.p.extra', 'Google profile set up and domain and email'); await next();
  await fill('crit.impact.a.now', 'we take orders by phone and in the workshop and write them in a diary'); await next();
  await fill('crit.impact.a.limit', 'customers cannot send drawings or ask for a price outside working hours'); await next();
  await fill('crit.impact.a.after', 'customers can send a drawing and get a reply the next working day'); await next();
  while ((await cur()) !== 'palc') await next();
  await pg.click('.mseg button[data-v=no]'); await next();
  ok('the digital impact statement is built from their own words', (await cur()) === 'statement' && /write them in a diary/.test(await pg.inputValue('textarea[data-draft="gmimpact:statement"]')) && /Maple Street Fabrication/.test(await pg.inputValue('textarea[data-draft="gmimpact:statement"]')) && /Limited company/.test(await pg.inputValue('textarea[data-draft="gmimpact:statement"]')));
  const stmt = await pg.inputValue('textarea[data-draft="gmimpact:statement"]');
  ok('missing parts of the statement show as a visible gap, nothing is invented', /\[to fill:/.test(stmt) === false || /\[to fill: /.test(stmt));
  await shot('05-statement');
  await pg.fill('textarea[data-draft="gmimpact:statement"]', stmt + '\n\nPRIVATE-HAND-EDIT-MARK kept by hand'); await pg.waitForTimeout(80);
  await next();
  // ---- stage 4 costs
  await fill('quote.scope', 'A new website for the workshop with an enquiry form'); await next();
  ok('cost lines come from the price book and are matched to the council list', (await cur()) === 'clines' && (await pg.locator('.gline').count()) > 10 && /Matches what the council pays for/.test(await pg.textContent('.mq')));
  await shot('06-cost-lines');
  await pg.click('.gline [data-id=tsite]'); await pg.waitForTimeout(80);
  s = await st(); const ql = s.quote2.lines.find(l => l.plId === 'tsite'); const gl = s.quote.lines.find(l => l.gm === (ql || {}).id);
  ok('ticking a price book line adds it to the quote with the price book price', !!ql && ql.price === '1500' && ql.cat === 'web');
  ok('and writes it through to the existing Grant costs lines', !!gl && gl.amt === '1500' && gl.cat === 'web' && /Website for a local trade/.test(gl.desc));
  await pg.click('.gline [data-id=tgoogle]'); await pg.waitForTimeout(80);
  const c1 = await pg.evaluate(() => { const c = calc(); return { elig: c.elig, unsure: c.unsure, grant: c.grant, capped: c.capped }; });
  ok('a line not on the council list counts as not sure, not claimable, grant share is correct', c1.elig === 1500 && c1.unsure === 150 && c1.grant === 1500 && !c1.capped, JSON.stringify(c1));
  await shot('07-cost-lines-on');
  await next(); await next();
  ok('totals use the existing Grant costs totals and flag the unsure line', (await cur()) === 'ctotals' && /The client pays suppliers up front/.test(await pg.textContent('.mq')) && /not on the council list|ask the council/i.test(await pg.textContent('[data-live=gmcostflags]')));
  await shot('08-cost-totals');
  await next();
  await fill('crit.value.a.buy', 'A website with an enquiry form'); await next(); await fill('crit.value.a.size', 'It fits a six person workshop'); await next(); await fill('crit.value.a.price', 'We quoted on 1 November'); await next();
  await fill('quote.held', 'One quote, from us'); await next(); await fill('crit.value.a.apart', 'Hosting and domain are paid yearly by the business'); await next();
  await fill('gmeet.notes.price', PRIV); await next();
  // ---- stage 5
  const evs = await pg.evaluate(() => PACKS.find(p => p.id === 'edc-lgf-digital').evidence.map(e => e.id));
  for (const id of evs) { ok('evidence step ' + id + ' is its own question', (await cur()) === 'ev-' + id); if (id === 'bank') ok('bank statements are marked sensitive and say send it to the council, not here', /Sensitive/.test(await pg.textContent('.mq')) && /council themselves/.test(await pg.textContent('.mq'))); await fill('evid.' + id + '.holder', 'Sam Maple'); await fill('evid.' + id + '.by', '2026-12-05'); if (id === 'reg') await pg.click('.mseg button[data-v=asked]'); await next(); }
  ok('the extra readiness step shows', (await cur()) === 'prep'); await next();
  // ---- stage 6
  ok('dates step shows the pack dates and a check-with-the-council flag', (await cur()) === 'ddead' && /31 December 2026/.test(await pg.textContent('.mq')) && (await pg.locator('.gflag').count()) >= 1 && /changes its dates/.test(await pg.textContent('.mq')));
  await shot('09-dates');
  await pg.check('[data-k="gmeet.ack.dates"]'); await next();
  await fill('plan.build', '4'); await fill('plan.start', '2027-01-04'); await fill('plan.submit', '2026-11-27'); await pg.waitForTimeout(100);
  ok('deadline planning reuses the existing Dates logic', /approval letter|finish/i.test(await pg.textContent('[data-live=deadplan]')));
  await next();
  ok('the rule that nothing is started or paid until approved is stated', /Do not|can't be claimed|cannot be claimed|before the approval/i.test(await pg.textContent('.gout')));
  await pg.check('[data-k="gmeet.ack.nospend"]'); await next();
  await fill('crit.deliver.a.who', 'Rhys Hume, a Glasgow web designer'); await next(); await fill('crit.deliver.a.steps', 'Design in January, build to the end of January'); await next(); await fill('crit.deliver.a.risk', 'Late content, we agree dates'); await next(); await fill('crit.deliver.a.cash', 'They pay first and claim back'); await next();
  await fill('owners.client', 'Send the registration proof and accounts'); await fill('owners.us', 'Send the quote and draft the answers'); await fill('dates.quoteSent', '2026-11-24'); await fill('dates.submitted', '2026-11-30'); await next();
  ok('review screen shows stages, the result and the check with the council list', (await cur()) === 'dreview' && /Eligibility: looks able to apply/.test(await pg.textContent('.mq')) && (await pg.locator('.mrv').count()) >= 7);
  await pg.check('[data-k="gmeet.reviewed"]'); await shot('10-review'); await next();
  // ---- send pack
  ok('Send pack is the final screen', (await cur()) === 'send' && /Finish and save/.test(await pg.textContent('.mf2')));
  const ids = await pg.$$eval('.gpack', e => e.map(x => x.dataset.pack)); ok('it has the six client parts', ids.join() === 'summary,answers,evidence,quote,statement,next', ids.join());
  ok('every part has Copy and Print', (await pg.locator('.gpack [data-act=gcopy]').count()) === 6 && (await pg.locator('.gpack [data-act=gprint]').count()) === 6);
  await shot('11-send-pack');
  const items = await pg.evaluate(() => gmPackItems().map(x => ({ id: x.id, text: x.text, html: x.html })));
  const all = items.map(x => x.text + x.html).join('\n');
  ok('the client pack holds the business, answers, itemised quote and statement', /Maple Street Fabrication/.test(all) && /write them in a diary/.test(all) && /Website for a local trade/.test(all) && /QUOTE/.test(items.find(x => x.id === 'quote').html) && /PRIVATE-HAND-EDIT-MARK/.test(items.find(x => x.id === 'statement').text));
  ok('the quote is the existing headed quote page and carries no bank details', /qname/.test(items.find(x => x.id === 'quote').html) && !/Sort code/.test(all));
  ok('the client pack contains NO internal notes, price notes or internal record', !all.includes('PRIVATE-NOTE-GRANT-ALPHA') && !/INTERNAL, Rhys only/.test(all) && !/margin forty/.test(all));
  ok('the client pack never promises an award', !/you will (get|receive)|(?<!not )guaranteed|you are eligible/i.test(all) && /not guaranteed|does not guarantee/.test(all));
  ok('no em dashes in the client pack', !/—/.test(all));
  const internal = await pg.evaluate(() => gmInternal().text);
  ok('the internal record has reasoning, notes, assumptions, flagged unknowns and price notes', /Eligibility reasoning/.test(internal) && internal.includes('PRIVATE-NOTE-GRANT-ALPHA') && /Assumptions/.test(internal) && /Flagged unknowns/.test(internal) && /Check with the council|council changes its dates/.test(internal));
  ok('the internal record is on screen but marked never to send', /Never send this/.test(await pg.textContent('.gint')) && (await pg.locator('.gpack:has-text("PRIVATE-NOTE")').count()) === 0);
  await pg.evaluate(() => { window.__printed = []; window.print = () => window.__printed.push(document.getElementById('printArea').innerHTML); });
  await pg.click('.gpack[data-pack=quote] [data-act=gprint]'); await pg.waitForTimeout(150);
  ok('Print uses the print area and prints the quote', (await pg.evaluate(() => window.__printed.length)) === 1 && await pg.evaluate(() => /Website for a local trade/.test(window.__printed[0]) && /QUOTE/.test(window.__printed[0])));
  await pg.click('[data-act=gprintall]'); await pg.waitForTimeout(150);
  ok('Print the whole pack prints every part and no internal note', await pg.evaluate(() => { const h = window.__printed[1]; return /Grant meeting summary/.test(h) && /Digital impact statement/.test(h) && !/PRIVATE-NOTE/.test(h); }));
  await pg.click('.gpack[data-pack=summary] [data-act=gcopy]'); await pg.waitForTimeout(150);
  ok('Copy gives feedback', /Copied/.test(await pg.textContent('.gpack[data-pack=summary] [data-act=gcopy]')));
  // exports
  const fc = await download('[data-act=gexp][data-kind=client]'); const clientJson = fs.readFileSync(fc, 'utf8');
  ok('client JSON export holds no private notes and says so', !clientJson.includes('PRIVATE-NOTE') && JSON.parse(clientJson).kind === 'client' && JSON.parse(clientJson).app === 'rdh-grant-meeting-record' && /private notes and price notes are left out/.test(clientJson));
  const fi = await download('[data-act=gexp][data-kind=internal]'); const internalJson = fs.readFileSync(fi, 'utf8');
  ok('internal JSON export keeps the notes', internalJson.includes('PRIVATE-NOTE-GRANT-ALPHA') && JSON.parse(internalJson).fields['elig'].area === 'yes');
  ok('no password or bank detail fields are exported', !/password|sort code|account number/i.test(internalJson));
  // ---- the Grant group screens reflect the answers
  await pg.click('.mf2 [data-act=gfinish]'); await pg.waitForTimeout(250);
  s = await st(); ok('finishing saves the record and returns to the Grant meeting screen', s.gmeet.status === 'saved' && s.gmeet.open === false && s.screen === 'gmeeting');
  await gotoScreen('elig'); ok('Can they get it shows the same answers', (await pg.locator('.seg button.on').allTextContents()).filter(x => x === 'Yes').length >= 4 && (await pg.inputValue('[data-k="turnover.recent"]')) === '180000');
  await gotoScreen('evid'); ok('Proof to collect shows the holders and dates from the meeting', (await pg.inputValue('[data-k="evid.reg.holder"]')) === 'Sam Maple' && (await pg.inputValue('[data-k="evid.reg.by"]')) === '2026-12-05');
  await gotoScreen('proj'); ok('Grant answers show their words and the drafts are built from them', /write them in a diary/.test(await pg.locator('textarea[data-k="crit.impact.a.now"]').inputValue()) && /diary/.test(await pg.inputValue('textarea[data-draft="crit:impact"]')));
  await gotoScreen('cost'); ok('Grant costs show the synced lines and totals', (await pg.inputValue('[data-k="quote.lines.0.amt"]')) === '1500' && /Grant you can ask for/.test(await pg.textContent('[data-live=totals]')) && (await pg.inputValue('[data-k="quote.scope"]')).includes('enquiry form'));
  await gotoScreen('dead'); ok('Dates shows the plan from the meeting', (await pg.inputValue('[data-k="plan.build"]')) === '4' && (await pg.inputValue('[data-k="plan.submit"]')) === '2026-11-27');
  await gotoScreen('final'); ok('Copy and print has the grant cost and answers text', /Website for a local trade/.test(await pg.textContent('.copyblock[data-sec=cost]')) && /write them in a diary/.test(await pg.textContent('.copyblock[data-sec=c-impact]')));
  await gotoScreen('qpage'); ok('the Quote page shows the itemised quote', /Website for a local trade/.test(await pg.textContent('.qp')) && /Maple Street Fabrication/.test(await pg.textContent('.qp')));
  await pg.evaluate(() => { S.docs.tab = 'grantans'; S.screen = 'docs'; render(); }); await pg.waitForTimeout(100);
  ok('Files to send, the grant answers document, carries the answers', /write them in a diary/.test(await pg.textContent('.doc')));
  await gotoScreen('close'); ok('Still to do lists the open question from the unsure cost line', /Grant meeting: ask the council whether/.test(await pg.textContent('main')));
  // ---- hand edits are not overwritten
  await gotoScreen('cost'); await pg.fill('[data-k="quote.lines.0.amt"]', '1400'); await pg.fill('[data-k="quote.lines.0.desc"]', 'Website, hand edited'); await pg.waitForTimeout(60);
  await pg.fill('[data-k="elig.sme"]', '').catch(() => { });
  await pg.evaluate(() => { S.elig.sme = 'unsure'; render(); });
  await gotoScreen('gmeeting'); await pg.click('[data-act=gresume]'); await pg.waitForTimeout(250);
  await jump('clines'); await pg.click('.gline [data-id=tauto]'); await pg.waitForTimeout(100); await pg.click('.gline [data-id=tauto]'); await pg.waitForTimeout(100);
  await pg.fill('[data-k="quote2.lines.0.price"]', '1600'); await pg.waitForTimeout(100);
  s = await st(); const hl = s.quote.lines.find(x => x.gm);
  ok('a Grant costs line edited by hand is not overwritten when the meeting changes the quote', hl && hl.amt === '1400' && hl.desc === 'Website, hand edited', JSON.stringify(hl));
  ok('the meeting does not add a duplicate of a hand edited line', s.quote.lines.filter(x => x.gm === hl.gm).length === 1 && s.quote.lines.length === 2);
  await jump('statement'); ok('the digital impact statement edited by hand is kept when answers change', /PRIVATE-HAND-EDIT-MARK/.test(await pg.inputValue('textarea[data-draft="gmimpact:statement"]')));
  await jump('e-sme'); ok('an answer changed on the Grant screen shows in the meeting (one field, no drift)', (await pg.locator('.mseg button.on[data-v=unsure]').count()) === 1);
  await pg.evaluate(() => { S.elig.sme = 'yes'; render(); });
  // ---- back and edit
  await jump('bcontact'); await fill('client.contact', 'Sam Maple-Jones'); await pg.click('.mf2 [data-act=gback]'); await pg.waitForTimeout(80);
  ok('Back goes to the previous question', (await cur()) === 'bname'); await next();
  ok('an edit made after going back is kept', (await pg.inputValue('[data-k="client.contact"]')) === 'Sam Maple-Jones' && (await st()).client.contact === 'Sam Maple-Jones');
  const sumNow = await pg.evaluate(() => gmPackItems()[0].text); ok('and the client summary picks it up', /Sam Maple-Jones/.test(sumNow));
  // ---- autosave and reload resume
  await jump('ctotals'); await pg.waitForTimeout(100); await pg.reload(); await pg.waitForTimeout(1000);
  ok('after a reload the grant meeting resumes at the same question', (await pg.locator('.gshell').count()) === 1 && (await cur()) === 'ctotals' && (await st()).client.contact === 'Sam Maple-Jones');
  ok('the saved client list on this computer holds the grant meeting', await pg.evaluate(() => meetLocalList().some(r => r.kind === 'grant' && /Maple Street/.test(r.business))));
  // ---- JSON round trip
  await pg.click('[data-act=gexit]'); await pg.waitForTimeout(150);
  await pg.evaluate(() => { localStorage.clear(); }); await pg.reload(); await pg.waitForTimeout(900);
  ok('a fresh workbook has no client', (await st()).client.business === '' && !(await st()).gmeet.started);
  await pg.evaluate(() => { S.client.modes.funding = true; S.client.packId = GM_PACK_ID; ensurePackState(); render(); }); /* a new client is no longer a funding application by default, so mark it as one first, as starting a grant meeting does */
  await gotoScreen('gmeeting'); const [fcx] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-act=gimport]')]); await fcx.setFiles(fi); await pg.waitForTimeout(400);
  s = await st();
  ok('internal JSON import restores answers, costs, statement and notes', s.client.business === promptText && s.elig.area === 'yes' && s.crit.impact.a.now.includes('diary') && s.quote2.lines.length >= 1 && s.quote.lines.length >= 1 && s.gmeet.notes.price === PRIV && /PRIVATE-HAND-EDIT-MARK/.test(s.drafts['gmimpact:statement'].text) && s.client.modes.funding && s.client.packId === 'edc-lgf-digital');
  await pg.evaluate(() => { localStorage.clear(); }); await pg.reload(); await pg.waitForTimeout(900);
  await pg.evaluate(() => { S.client.modes.funding = true; S.client.packId = GM_PACK_ID; ensurePackState(); render(); }); /* as above: mark the new client as a funding application first */
  await gotoScreen('gmeeting'); const [fcy] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-act=gimport]')]); await fcy.setFiles(fc); await pg.waitForTimeout(400);
  s = await st(); ok('client JSON import restores answers but no private notes', s.elig.area === 'yes' && !JSON.stringify(s).includes('PRIVATE-NOTE-GRANT-ALPHA') && s.client.business === promptText);
  // ---- the website meeting still starts from the same hub
  await pg.click('.meetstart'); await pg.waitForTimeout(200);
  ok('the website meeting is still offered and still has its own start button', (await pg.locator('#gkind [data-act=mstartnew], #gkind [data-act=mresume]').count()) === 1 && (await pg.locator('.mcta .mbig').count()) === 1);
  ok('when the client already has this grant on, it is offered directly on the hub and on the Client screen', /START GRANT MEETING WITH THIS CLIENT|RESUME GRANT MEETING/.test(await pg.textContent('#gkind')));
  await pg.evaluate(() => { S.screen = 'setup'; render(); }); ok('banner on the Client screen offers the grant meeting', (await pg.locator('.gbanner [data-act]').count()) === 1);
  // ---- scenario B: probably ineligible
  promptText = 'Elm Lane Joinery (made up)';
  await pg.click('.meetstart'); await pg.click('#gkind [data-act=gnew]'); await pg.waitForTimeout(400);
  await jump('e-trading'); await yn('no'); await pg.waitForTimeout(60);
  ok('a rule answered badly shows a red stop panel with the pack message', (await pg.locator('.gout.g-red').count()) === 1 && /Probably not eligible/.test(await pg.textContent('.gout')) && /Stop and check/.test(await pg.textContent('.gout')) && /12 months|ask/i.test(await pg.textContent('.gout')));
  await shot('12-stop-red');
  await jump('eresult');
  ok('the result says honestly the business is probably not eligible and tells Rhys not to hold out hope', (await pg.locator('.gout.g-red').count()) >= 1 && /probably not eligible/i.test(await pg.textContent('.mq')) && /Do not hold out hope/.test(await pg.textContent('.mq')));
  ok('Next is blocked on a red result until Rhys confirms', await pg.locator('.mf2 [data-act=gnext]').isDisabled());
  await shot('13-result-red');
  await pg.check('[data-k="gmeet.ack.stop"]'); await pg.waitForTimeout(80);
  ok('after confirming, Next is allowed', !(await pg.locator('.mf2 [data-act=gnext]').isDisabled()));
  ok('the red result is recorded in the internal record and not in the client wording', await pg.evaluate(() => /Stop and check/.test(gmInternal().text) && !/INTERNAL/.test(gmPackItems()[0].text)));
  // ---- scenario C: over the cap
  promptText = 'Birch Road Engineering (made up)';
  await pg.click('[data-act=gexit]'); await pg.waitForTimeout(100); await pg.click('#gkind [data-act=gnew]'); await pg.waitForTimeout(400);
  await pg.evaluate(() => { S.client.types = ['website']; render(); }); await jump('clines');
  await pg.click('.gline [data-id=tsite]'); await pg.click('.gline [data-id=site1]'); await pg.waitForTimeout(100);
  const c3 = await pg.evaluate(() => { const c = calc(); return { elig: c.elig, grant: c.grant, capped: c.capped, keep: c.keep }; });
  ok('over the cap: the grant stops at the scheme maximum and the client pays the rest', c3.elig === 3700 && c3.grant === 2500 && c3.capped && c3.keep === 1200, JSON.stringify(c3));
  ok('over the cap is flagged red in the flow', (await pg.locator('.gout.g-red').count()) >= 1 && /Over the cap/.test(await pg.textContent('[data-live=gmcostflags]')) && /Do not pad/.test(await pg.textContent('[data-live=gmcostflags]')));
  await shot('14-over-cap');
  await jump('eturn').catch(() => { }); await fill('turnover.recent', '9000'); await jump('ctotals');
  ok('a small turnover flags the grant as more than 10% of turnover', /more than 10% of recent turnover/i.test(await pg.textContent('[data-live=gmcostflags]')));
  // ---- widths
  for (const w of [390, 768, 1440]) {
    await pg.setViewportSize({ width: w, height: 800 }); let bad = [];
    const n = await pg.evaluate(() => gmSteps().length);
    for (let i = 0; i < n; i++) { await pg.evaluate(k => { GM().step = k; render(); }, i); const o = await pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, id: gmSteps()[GM().step].id })); if (o.sw > o.cw + 1) bad.push(o.id + ':' + o.sw + '>' + o.cw); }
    ok('no horizontal overflow at ' + w + ' wide on any of the ' + n + ' steps', bad.length === 0, bad.join(' '));
    await pg.evaluate(() => { GM().step = gmSteps().findIndex(x => x.id === 'clines'); render(); }); await shot('w' + w + '-lines');
    await pg.evaluate(() => { GM().step = gmSteps().length - 1; render(); }); await shot('w' + w + '-send');
    await pg.evaluate(() => { GM().step = gmSteps().findIndex(x => x.id === 'e-trading'); render(); }); await shot('w' + w + '-elig');
    const small = await pg.evaluate(() => [...document.querySelectorAll('.mf2 button, .mseg button, .gtog')].filter(b => { const r = b.getBoundingClientRect(); return r.width && r.height < 44; }).length); ok('touch targets are at least 44 pixels tall at ' + w, small === 0, small + ' small');
  }
  await pg.setViewportSize({ width: 1366, height: 820 });
  // ---- axe
  if (AXE) {
    for (const w of [390, 1440]) { await pg.setViewportSize({ width: w, height: 900 });
      for (const id of ['bname', 'e-trading', 'eresult', 'clines', 'ctotals', 'ev-bank', 'ddead', 'dreview', 'send']) {
        await pg.evaluate(i => { const k = gmSteps().findIndex(x => x.id === i); GM().step = Math.max(0, k); render(); }, id); await pg.addScriptTag({ path: AXE }).catch(() => { });
        const r = await pg.evaluate(() => axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'best-practice'] })); const v = r.violations.filter(x => !['region', 'landmark-one-main', 'page-has-heading-one', 'landmark-no-duplicate-main'].includes(x.id));
        ok('axe: ' + id + ' at ' + w + ' has no violations', v.length === 0, v.map(x => x.id + ' ' + x.nodes.map(n => n.target.join(' ')).slice(0, 2).join(' | ')).join('; ')); } }
  } else ok('axe skipped (no path given)', true);
  await pg.setViewportSize({ width: 1366, height: 820 });
  ok('no console errors or page errors during the whole run', errs.length === 0, errs.slice(0, 3).join('|'));
  ok('no network request was made by the page (only the file itself)', net.length === 0, net.slice(0, 3).join('|'));
  await b.close();
  fs.writeFileSync(path.join(TMP, 'result.txt'), log.join('\n'));
  console.log(log.join('\n')); console.log('\nTOTAL ' + log.length + ' checks, ' + (log.length - fails) + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(log.join('\n')); console.error('CRASH', e); process.exit(2); });
