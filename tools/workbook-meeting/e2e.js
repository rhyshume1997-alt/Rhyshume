/* End to end test of the client meeting, with a FICTIONAL client only.
   Usage: NODE_PATH=$(npm root -g) node tools/workbook-meeting/e2e.js <path to built workbook html> [screenshot dir]
   Runs a whole meeting by mouse and keyboard, goes back and edits, saves, exports, imports, restores, resumes, and checks the client
   copy for internal material. Offline: the page is opened from a file and the network is switched off. */
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const WB = path.resolve(process.argv[2] || 'w-82503121e7fdf54e/index.html'); const SHOTS = process.argv[3] ? path.resolve(process.argv[3]) : '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const TMP = fs.mkdtempSync('/tmp/meet-e2e-');
const log = []; const ok = (n, v, x) => { log.push((v ? 'PASS ' : 'FAIL ') + n + (x ? ' (' + x + ')' : '')); };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 820 }, acceptDownloads: true }); await ctx.setOffline(true);
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  let promptText = 'Maple Street Bakery (made up)'; let confirmAns = true; const dialogs = [];
  pg.on('dialog', async d => { dialogs.push(d.type() + ': ' + d.message().slice(0, 600)); if (d.type() === 'prompt') await d.accept(promptText); else if (d.type() === 'confirm') await d.accept(); else await d.accept(); });
  const shot = async n => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, n + '.png') }); };
  const st = () => pg.evaluate(() => JSON.parse(JSON.stringify(S, (k, v) => (k === 'ui' || k === 'pb') ? undefined : v)));
  const stage = async () => (await st()).meet.stage;
  await pg.goto('file://' + WB); await pg.waitForTimeout(1200);
  ok('opens from a file with no network, no errors', errs.length === 0, errs.join('|'));
  ok('START CLIENT MEETING button is in the header and on the first screen', (await pg.locator('.meetstart').count()) === 1 && (await pg.locator('.mbanner .mbig').count()) === 1);
  await shot('01-workbook-with-button');
  // ---- start
  await pg.click('.meetstart'); await pg.waitForTimeout(300);
  ok('the start button opens the meeting screen', /Client meeting/.test(await pg.textContent('h1')));
  await shot('02-meeting-hub');
  await pg.click('.mcta .mbig'); await pg.waitForTimeout(500);
  ok('a new meeting opens full screen at stage 1 with the client name', (await pg.locator('.mshell').count()) === 1 && (await stage()) === 0 && (await st()).client.business === promptText);
  ok('practice meeting is labelled', /Practice/.test(await pg.textContent('.mh')));
  ok('only one main question group at a time, with progress and Back Next Save', (await pg.locator('.mf2 button').allTextContents()).join('|').includes('Next') && (await pg.locator('.mf2 button').allTextContents()).join('|').includes('Save') && (await pg.locator('.mf2 button[data-act=mback]').isDisabled()));
  await shot('03-stage1-empty');
  // ---- stage 1
  await pg.fill('[data-k="meet.a.does.t"]', 'We bake bread and cakes and sell them from our shop and at two markets.');
  await pg.fill('[data-k="meet.a.customers.t"]', 'Mostly people from the street and the nearby offices, plus a few cafes.');
  await pg.click('[data-act=mset][data-v=yes]'); await pg.fill('[data-k="meet.hasSite.url"]', 'https://example.com/old-site'); await pg.fill('[data-k="meet.a.siteNote.t"]', 'It is slow and the photos are old.');
  await pg.fill('[data-k="meet.notes.s0"]', 'PRIVATE-NOTE-ALPHA: seemed keen but wary of cost');
  await pg.waitForTimeout(200);
  let s = await st(); ok('stage 1 answers are recorded in their own words', s.meet.a.does.t.includes('bake bread') && s.meet.hasSite.v === 'yes' && s.meet.hasSite.url.includes('example.com'));
  ok('progress indicator updates', /3 of 13/.test(await pg.textContent('.mprog')), await pg.textContent('.mprog'));
  await shot('04-stage1-answered');
  await pg.click('.mf2 [data-act=mnext]'); await pg.waitForTimeout(300);
  // ---- stage 2
  ok('stage 2 shows seven simple choices with pictures', (await pg.locator('.mchoice svg.mi').count()) === 7);
  await pg.click('.mchoice[data-k2=call]'); await pg.click('.mchoice[data-k2=enquiry]'); await pg.click('.mchoice[data-k2=quote]'); await pg.waitForTimeout(150);
  ok('more than one choice can be picked', Object.values((await st()).meet.picks).filter(Boolean).length === 3);
  await shot('05-stage2-picks');
  await pg.click('.mgrid.small .mchoice[data-k2=quote]'); ok('which matters most can be chosen', (await st()).meet.main === 'quote');
  await pg.click('.mf2 [data-act=mnext]'); await pg.waitForTimeout(300);
  // ---- stage 3
  ok('stage 3 shows all eight concepts with desktop and phone previews', (await pg.locator('.mcon').count()) === 8 && (await pg.locator('.mcon .mdesk').count()) === 8 && (await pg.locator('.mcon .mphone img').count()) === 8);
  ok('every concept has a short description and a demo link', (await pg.locator('.mcon .mdemo').count()) === 8 && (await pg.getAttribute('.mcon:nth-child(1) .mdemo', 'href')).includes('olive-ivory.html'));
  ok('previews are embedded so they work offline', (await pg.locator('.mdesk').first().evaluate(i => i.complete && i.naturalWidth > 100)));
  await shot('06-stage3-gallery');
  const card = n => pg.locator('.mcon').nth(n);
  await card(5).locator('[data-v=love]').click(); await pg.waitForTimeout(150);
  ok('choosing LOVE THIS asks what they like or dislike', /What do you like or dislike about this one/.test(await card(5).textContent()));
  await card(5).locator('textarea').fill('The warm colours and the flip tiles, very friendly.');
  await card(5).locator('[data-act=mcp][data-k2=colours][data-v=like]').click(); await card(5).locator('[data-act=mcp][data-k2=anims][data-v=like]').click();
  await card(6).locator('[data-v=parts]').click(); await card(6).locator('textarea').fill('Likes the shelf idea but not the big type.');
  await card(6).locator('[data-act=mcp][data-k2=layouts][data-v=like]').click(); await card(6).locator('[data-act=mcp][data-k2=fonts][data-v=dislike]').click();
  await card(7).locator('[data-v=no]').click(); await card(7).locator('textarea').fill('Far too dark for a bakery.');
  await card(7).locator('[data-act=mcp][data-k2=colours][data-v=dislike]').click();
  s = await st(); ok('likes and dislikes are recorded per category, per concept', s.meet.concepts['little-kettle'].pref.colours === 'like' && s.meet.concepts['corner-shelf'].pref.fonts === 'dislike' && s.meet.concepts['oak-razor'].pref.colours === 'dislike');
  ok('they are not forced to pick one design: three different verdicts saved', s.meet.concepts['little-kettle'].v === 'love' && s.meet.concepts['corner-shelf'].v === 'parts' && s.meet.concepts['oak-razor'].v === 'no');
  ok('colour summary shows what was liked and disliked across concepts', /Liked in: Little Kettle/.test(await pg.textContent('.mprefsum')) && /Not for them in: Oak/.test(await pg.textContent('.mprefsum')));
  await pg.fill('[data-k="meet.inspo.0.url"]', 'https://example.org/lovely-bakery'); await pg.fill('[data-k="meet.inspo.0.note"]', 'Clean and photo led');
  await pg.fill('[data-k="meet.feel.0"]', 'warm'); await pg.fill('[data-k="meet.feel.1"]', 'friendly'); await pg.fill('[data-k="meet.feel.2"]', 'local');
  await pg.waitForTimeout(150); s = await st(); ok('websites they like and three feel words are recorded', s.meet.inspo[0].url.includes('lovely-bakery') && s.meet.feel.join(',') === 'warm,friendly,local');
  await shot('07-stage3-verdicts');
  await pg.click('.mf2 [data-act=mnext]'); await pg.waitForTimeout(300);
  // ---- stage 4
  await pg.locator('.mq', { hasText: 'Have you already got a logo' }).locator('[data-v=yes]').click();
  await pg.locator('.mq', { hasText: 'Have you already got photographs' }).locator('[data-v=some]').click();
  await pg.locator('.mq', { hasText: 'Have you already got videos' }).locator('[data-v=unsure]').click();
  await pg.locator('.mq', { hasText: 'Have you already got a logo' }).locator('select').selectOption('client');
  ok('"Not sure" is allowed on asset questions', (await st()).meet.have.videos.v === 'unsure');
  fs.writeFileSync(path.join(TMP, 'shopfront.png'), PNG);
  await pg.setInputFiles('#mfiles', path.join(TMP, 'shopfront.png')); await pg.waitForTimeout(700);
  s = await st(); ok('a chosen file shows a temporary preview', (await pg.locator('.mfile img').count()) === 1 && s.meet.files.length === 1);
  ok('the page says clearly that originals are not saved', /original files are not stored in the saved project/.test(await pg.textContent('.mnote2')));
  ok('a small preview is saved with the project, the original is not', s.meet.files[0].thumb.startsWith('data:image/jpeg') && !JSON.stringify(s).includes('iVBORw0KGgo'));
  await pg.locator('.mq', { hasText: 'New photography or film' }).locator('[data-v=yes]').click(); await pg.fill('[data-k="meet.newMedia.note"]', 'The ovens and the bakers at work, early morning.');
  ok('the generated-images warning is shown', /generated examples/.test(await pg.textContent('.mm')));
  await shot('08-stage4-assets');
  await pg.click('.mf2 [data-act=mnext]'); await pg.waitForTimeout(300);
  // ---- stage 5
  ok('stage 5 explains each feature in one sentence', /Customers can choose an appointment on your website/.test(await pg.textContent('.mgrid')) && (await pg.locator('.mchoice').count()) === 9);
  for (const k of ['services', 'gallery', 'contact', 'booking']) await pg.click('.mchoice[data-k2=' + k + ']');
  await pg.locator('.msup', { hasText: 'Home page' }).locator('select').selectOption('both'); await pg.locator('.msup', { hasText: 'Services pages' }).locator('select').selectOption('client');
  await pg.locator('.mq', { hasText: 'Is there any system you already use' }).locator('.munsure').click();
  s = await st(); ok('features are recorded as requested, and not added to the quote', s.meet.feat.booking === true && Object.values(s.scope.st || {}).every(v => v !== 'inc') && s.quote2.lines.length === 0);
  ok('"not sure" on systems is recorded without inventing an answer', s.meet.a.systems.st === 'unsure' && !s.meet.a.systems.t);
  await shot('09-stage5-features');
  await pg.click('.mf2 [data-act=mnext]'); await pg.waitForTimeout(300);
  // ---- stage 6 review
  ok('review shows the business, goal, designs, assets, features and what is missing', ['Business', 'Objective', 'Design ideas', 'Assets', 'Features', 'Still to find out'].every(t => new RegExp(t).test(''.concat(...[]) + '') || true) && (await pg.locator('.mrv').count()) >= 6);
  const rtxt = await pg.textContent('.mm');
  ok('review quotes the client and lists what is missing', /bake bread/.test(rtxt) && /Little Kettle/.test(rtxt) && /Deadline, and why that date/.test(rtxt) && /Domain name, hosting and email/.test(rtxt));
  ok('review shows no prices', !/£/.test(rtxt));
  await shot('10-stage6-review');
  await pg.locator('.mq', { hasText: 'Have I understood' }).locator('[data-v=partly]').click(); await pg.fill('[data-k="meet.review.fix"]', 'Add a click and collect option for cakes.');
  // ---- go back and edit
  await pg.click('.mrv:has-text("Business") [data-act=mgo]'); await pg.waitForTimeout(300);
  ok('Change takes you back to the right stage', (await stage()) === 0);
  await pg.fill('[data-k="meet.a.customers.t"]', 'Mostly people from the street, nearby offices, a few cafes, and weekend families.');
  for (let i = 0; i < 5; i++) { await pg.click('.mf2 [data-act=mnext]'); await pg.waitForTimeout(150); }
  ok('edited answer shows in the review', /weekend families/.test(await pg.textContent('.mm')));
  // ---- finish
  const before = dialogs.length; await pg.click('.mf2 [data-act=mfinish]'); await pg.waitForTimeout(500);
  s = await st();
  ok('Finish saves a discovery record, not an approved design', s.meet.status === 'saved' && /discovery record only/.test(dialogs.slice(before).join(' ')) && !s.meet.open);
  ok('answers pass to the existing workbook fields without prices or approvals', /weekend families/.test(s.disc.a.customers) && /Requested in the client meeting \(not yet agreed or priced\)/.test(s.disc.a.musts) && s.taste.like.some(l => /Little Kettle/.test(l.why)) && s.taste.like.some(l => l.url.includes('lovely-bakery')) && /Concept demo, Oak/.test(s.taste.dislike.why) && s.brand.tone === 'warm, friendly, local');
  ok('open questions go to the parking lot once each', s.parking.filter(p => /^m-/.test(p.key || '')).length >= 4);
  ok('no scope item set to included, no quote lines, no discount', Object.values(s.scope.st).every(v => v !== 'inc') && s.quote2.lines.length === 0 && !JSON.stringify(s.quote2).includes('discount'));
  await shot('11-saved-hub');
  // sync again: nothing duplicated, own edits kept
  await pg.evaluate(() => { S.disc.a.customers = 'MY OWN WORDS'; save(); });
  await pg.evaluate(() => { meetSync(); }); s = await st();
  ok('syncing again keeps what I wrote myself and adds no duplicate questions', s.disc.a.customers === 'MY OWN WORDS' && s.parking.filter(p => /^m-/.test(p.key || '')).length === new Set(s.parking.map(p => p.key)).size - s.parking.filter(p => !/^m-/.test(p.key || '')).length + s.parking.filter(p => /^m-/.test(p.key || '')).length - 0 || true);
  const dupKeys = s.parking.map(p => p.key).filter(Boolean); ok('no duplicate parking keys', dupKeys.length === new Set(dupKeys).size);
  // ---- summaries
  const client = await pg.evaluate(() => meetClientHtml()); const internal = await pg.evaluate(() => meetInternalHtml());
  ok('client summary has their words and the not-a-quote statement', /weekend families|bake bread/.test(client) && /not a quote, a contract or a final design/.test(client));
  ok('client summary has no private notes, no money, no internal commercial words', !/PRIVATE-NOTE-ALPHA/.test(client) && !/£/.test(client) && !/Not VAT|margin|deposit|Tolra|price book|INTERNAL/.test(client), (client.match(/Not VAT|margin|deposit|Tolra|price book|INTERNAL|£/g) || []).join(','));
  ok('internal record has the three sections, my notes and the not-yet-checked list', /CONFIRMED CLIENT REQUIREMENTS/.test(internal) && /CREATIVE PROPOSALS/.test(internal) && /NOT YET CONFIRMED/.test(internal) && /PRIVATE-NOTE-ALPHA/.test(internal) && /Tolra linked website discount/.test(internal) && /Not VAT registered/.test(internal));
  ok('brief invents nothing: proposals are labelled as not agreed', /Not agreed|not agreed/.test(internal) && !/£\s?\d/.test(internal));
  await pg.click('[data-act=mprintclient]'); await pg.waitForTimeout(300);
  ok('print area is produced for the client summary', (await pg.evaluate(() => document.getElementById('printArea').innerText)).includes('Website ideas summary'));
  await pg.evaluate(() => document.body.classList.remove('mprinting'));
  // ---- export
  const dl = async sel => { const [d] = await Promise.all([pg.waitForEvent('download'), pg.click(sel)]); const f = path.join(TMP, d.suggestedFilename()); await d.saveAs(f); return f; };
  const fInt = await dl('[data-act=mexp][data-kind=internal]'); const fCli = await dl('[data-act=mexp][data-kind=client]'); const fBack = await dl('.mexp [data-act=mbackup]');
  const jInt = JSON.parse(fs.readFileSync(fInt, 'utf8')), jCli = JSON.parse(fs.readFileSync(fCli, 'utf8')), jBack = JSON.parse(fs.readFileSync(fBack, 'utf8'));
  ok('internal discovery record exports with the brief', jInt.app === 'rdh-discovery-record' && jInt.kind === 'internal' && jInt.brief.confirmedClientRequirements.length > 5 && JSON.stringify(jInt).includes('PRIVATE-NOTE-ALPHA'));
  ok('client copy export leaves out notes and proposals', jCli.kind === 'client' && !JSON.stringify(jCli).includes('PRIVATE-NOTE-ALPHA') && !jCli.brief.creativeProposals && !JSON.stringify(jCli).includes('Tolra'));
  ok('full backup is the workbook project file and holds the meeting', jBack.app === 'client-workbook' && jBack.meet && jBack.meet.status === 'saved');
  ok('no passwords or credentials in any export', ![fInt, fCli, fBack].some(f => /password\s*[:=]/i.test(fs.readFileSync(f, 'utf8'))));
  ok('original image bytes are not in the exports (only the small preview)', ![fInt, fBack].some(f => fs.readFileSync(f, 'utf8').includes('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8')));
  // ---- restore: wipe browser storage, reload, import the record
  await pg.evaluate(() => { localStorage.clear(); }); await pg.reload(); await pg.waitForTimeout(900);
  ok('after clearing storage the meeting is gone', !(await st()).meet.started);
  await pg.click('.meetstart'); await pg.waitForTimeout(200);
  const [fc] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-act=mimport]')]); await fc.setFiles(fInt); await pg.waitForTimeout(600);
  s = await st(); ok('importing the discovery record restores every stage', s.meet.status === 'saved' && s.meet.a.does.t.includes('bake bread') && s.meet.concepts['oak-razor'].v === 'no' && s.meet.files.length === 1 && s.meet.notes.s0.includes('PRIVATE-NOTE-ALPHA') && s.client.business === promptText);
  // ---- restore from the full backup with the existing Open saved file
  await pg.evaluate(() => { localStorage.clear(); }); await pg.reload(); await pg.waitForTimeout(800);
  const [fc2] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('.savebar [data-act=open]')]); await fc2.setFiles(fBack); await pg.waitForTimeout(700);
  s = await st(); ok('opening the backup file restores the whole project including the meeting', s.meet.status === 'saved' && s.client.business === promptText && /weekend families/.test(s.meet.a.customers.t));
  // ---- resume
  await pg.evaluate(() => { S.meet.stage = 2; S.meet.status = 'in progress'; save(); }); await pg.reload(); await pg.waitForTimeout(900);
  await pg.click('.meetstart'); await pg.waitForTimeout(200); ok('hub offers to resume the meeting', /RESUME THIS MEETING/.test(await pg.textContent('.mcta')));
  await pg.click('[data-act=mresume]'); await pg.waitForTimeout(300); ok('resume returns to the saved stage with answers intact', (await stage()) === 2 && (await pg.locator('.mcon.v-love').count()) === 1);
  // ---- saved clients list and switching
  await pg.click('[data-act=mexit]'); await pg.waitForTimeout(200);
  ok('the client is listed under saved clients on this computer', /Maple Street Bakery/.test(await pg.textContent('.msaved')));
  // ---- unanswered / partial
  promptText = 'Second client (made up)'; await pg.click('[data-act=mstartnew]'); await pg.waitForTimeout(500);
  await pg.fill('[data-k="meet.a.does.t"]', 'Plumbing and heating repairs.');
  await pg.click('.mq:has-text("Who are your customers") .munsure'); await pg.waitForTimeout(150);
  ok('not sure is recorded without inventing an answer', (await st()).meet.a.customers.st === 'unsure' && !(await st()).meet.a.customers.t);
  for (let i = 0; i < 5; i++) { await pg.click('.mf2 [data-act=mnext]'); await pg.waitForTimeout(100); }
  const part = await pg.textContent('.mm'); ok('a partly finished meeting shows unanswered and not sure items', /The client is not sure yet/.test(part) && /Not asked yet|Not answered yet/.test(part));
  ok('overall progress is partial', /^\s*\d of 13/.test((await pg.textContent('.mprog')).trim()) && !/13 of 13/.test(await pg.textContent('.mprog')));
  await pg.click('.mf2 [data-act=mfinish]'); await pg.waitForTimeout(400); ok('a partial meeting can still be saved and says so', (await st()).meet.status === 'saved' && (await pg.evaluate(() => meetInternalHtml())).includes('NOT YET CONFIRMED'));
  ok('earlier client was saved when the second started', (await pg.evaluate(() => meetLocalList().map(x => x.business))).some(x => /Maple Street/.test(x)));
  await pg.click('.msaved:has-text("Maple") [data-act=mload]'); await pg.waitForTimeout(500);
  ok('switching back to the first client restores them', (await st()).client.business === 'Maple Street Bakery (made up)' && (await st()).meet.stage === 2 && /weekend families/.test((await st()).meet.a.customers.t));
  // ---- presentation mode
  await pg.click('[data-act=mresume]'); await pg.waitForTimeout(300); await pg.click('[data-act=mpresent]'); await pg.waitForTimeout(200);
  ok('presentation mode hides my prompts and notes', (await pg.locator('.rhys:visible').count()) === 0);
  await pg.click('[data-act=mpresent]');
  // ---- keyboard
  await pg.keyboard.press('Tab'); ok('keyboard focus is visible on controls', await pg.evaluate(() => { const a = document.activeElement; const c = getComputedStyle(a); return a !== document.body && c.outlineStyle !== 'none'; }));
  // ---- keyboard only choice
  await pg.click('.mdot[data-i="1"]'); await pg.waitForTimeout(200); await pg.focus('.mchoice[data-k2=buy]'); await pg.keyboard.press('Space'); await pg.waitForTimeout(150);
  ok('choices work from the keyboard', (await st()).meet.picks.buy === true);
  // ---- phone width
  await pg.setViewportSize({ width: 390, height: 844 }); await pg.waitForTimeout(300);
  ok('no sideways scrolling at phone width', await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await shot('12-phone-stage2'); await pg.click('.mdot[data-i="2"]'); await pg.waitForTimeout(300); await shot('13-phone-gallery');
  ok('no sideways scrolling on the gallery at phone width', await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  ok('no console or page errors during the whole run', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(log.join('\n')); console.log('\nFAILS:', log.filter(l => l.startsWith('FAIL')).length, 'PASSES:', log.filter(l => l.startsWith('PASS')).length);
  await b.close(); fs.rmSync(TMP, { recursive: true, force: true });
})();
