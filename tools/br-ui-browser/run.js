/* Browser tests for /business-review and /business-review/report. FIXTURE DATA ONLY: the API is the mock in serve.js.
   Run: PLAYWRIGHT=<path to playwright> AXE=<path to axe.min.js> SHOTS=<dir> node tools/br-ui-browser/run.js
   Not part of `node --test` (needs a browser). Exits 1 if any check fails. */
'use strict';
const fs = require('node:fs');
const { createServer, TOKEN, ID } = require('./serve.js');
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const AXE = process.env.AXE ? fs.readFileSync(process.env.AXE, 'utf8') : null;
const SHOTS = process.env.SHOTS || '/tmp/br-shots';
fs.mkdirSync(SHOTS, { recursive: true });
const PORT = 4182, BASE = 'http://localhost:' + PORT;
const STUB = "window.turnstile={_n:0,render:function(el,o){var id='w'+(++this._n);setTimeout(function(){o.callback('TEST-TOKEN-'+o.action)},60);return id},reset:function(){}};";
const results = [];
const check = (name, cond, extra) => { results.push({ name, ok: !!cond }); console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '  ' + (extra || ''))); };
const mock = (q) => fetch(BASE + '/__mock/' + q).then((r) => r.json());
const mlog = () => mock('log').then((x) => x.log);

async function newPage(browser, vp, opts) {
  const ctx = await browser.newContext(Object.assign({ viewport: vp || { width: 1440, height: 900 } }, opts || {}));
  await ctx.route('https://challenges.cloudflare.com/**', (r) => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  const page = await ctx.newPage();
  await page.addInitScript(() => { window.__hist = { live: [], steps: [] }; document.addEventListener('DOMContentLoaded', () => { const l = document.getElementById('br-live'), st = document.getElementById('br-steps'); if (l) new MutationObserver(() => window.__hist.live.push(l.textContent)).observe(l, { childList: true, characterData: true, subtree: true }); if (st) new MutationObserver(() => window.__hist.steps.push(st.innerText)).observe(st, { childList: true, subtree: true }); }); });
  page.errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') page.errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => page.errors.push('pageerror: ' + e));
  return page;
}
async function fillIntake(p, o) {
  o = o || {};
  await p.fill('#br-name', o.name || 'Harbour Precision Ltd');
  if (o.noWebsite) await p.check('#br-no-website'); else await p.fill('#br-website', o.website || 'harbourprecision.example');
  await p.fill('#br-location', 'Glasgow');
  await p.fill('#br-category', 'CNC machining');
  if (o.comp) { await p.fill('#br-comp-name-in', 'Clyde Components'); await p.fill('#br-comp-site-in', 'clydecomponents.example'); }
  if (o.task) await p.click('.br-chip[data-task=chasing_quotations]');
}
async function toResults(p, o) {
  await p.goto(BASE + '/business-review');
  await fillIntake(p, o);
  await p.click('#br-start-btn');
  await p.waitForSelector('#br-step-confirm:not([hidden])');
  await p.click('#br-confirm-btn');
  await p.waitForSelector('#br-step-results:not([hidden])', { timeout: 15000 });
}
async function axe(p, label) {
  if (!AXE) return;
  await p.addScriptTag({ content: AXE });
  const r = await p.evaluate(() => axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] }));
  const v = r.violations.map((x) => x.id + ': ' + x.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | '));
  check('axe ' + label + ' (' + r.violations.length + ' violations)', v.length === 0, v.join(' ; '));
}
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);

(async () => {
  const server = createServer().listen(PORT);
  const browser = await chromium.launch();
  try {
    // ---------------------------------------------------------- 1 with a website, full journey, axe, screenshots
    await mock('scenario?name=with-website');
    let p = await newPage(browser);
    await p.goto(BASE + '/business-review');
    await p.waitForTimeout(400);
    await axe(p, 'intake');
    await p.screenshot({ path: SHOTS + '/intake-1440.png', fullPage: true });
    check('no email field before results', (await p.locator('#br-form input[type=email]').count()) === 0);
    check('no checkbox pre-ticked in intake except none', (await p.locator('#br-form input[type=checkbox]:checked').count()) === 0);
    await fillIntake(p, { comp: true, task: true });
    await p.click('#br-start-btn');
    await p.waitForSelector('#br-step-confirm:not([hidden])');
    check('focus moved to confirm heading', await p.evaluate(() => document.activeElement && document.activeElement.id) === 'br-confirm-h');
    check('confirm shows business, website, location', /Harbour Precision Ltd/.test(await p.innerText('#br-interp')) && /harbourprecision\.example/.test(await p.innerText('#br-interp')));
    await axe(p, 'confirm');
    await p.screenshot({ path: SHOTS + '/confirm-1440.png', fullPage: true });
    await p.click('#br-confirm-btn');
    await p.waitForSelector('#br-step-run:not([hidden])');
    check('focus moved to progress heading', await p.evaluate(() => document.activeElement && document.activeElement.id) === 'br-run-name');
    await p.waitForSelector('.br-step--done');
    await p.screenshot({ path: SHOTS + '/progress-1440.png', fullPage: true });
    await p.waitForSelector('#br-step-results:not([hidden])', { timeout: 15000 });
    const hist = await p.evaluate(() => window.__hist);
    check('live region announced real steps and the result', hist.live.some((t) => /Reading your website: done/.test(t)) && hist.live.some((t) => /Your results are ready/.test(t)), JSON.stringify(hist.live));
    await p.waitForSelector('#br-step-results:not([hidden])', { timeout: 15000 });
    check('focus moved to results heading', await p.evaluate(() => document.activeElement && document.activeElement.id) === 'br-results-head');
    let txt = await p.innerText('#br-report');
    check('results: summary first, comparison table, competitor named', /What we found/.test(txt) && /Clyde Components Ltd/.test(txt) && (await p.locator('table.br-table--cmp').count()) === 1);
    check('results: partial banner', /Partly complete/.test(txt));
    check('results: AI awaiting and local not tested', /Awaiting a supported test\./.test(txt) && /Not tested, no supported source\./.test(txt));
    check('results: chart present', (await p.locator('.br-chart').count()) === 1);
    check('results: no PDF button', (await p.locator('text=/PDF/i').count()) === 0);
    const lg = await mlog();
    const start = lg.find((x) => x.path === '/start'), conf = lg.find((x) => /confirm$/.test(x.path));
    check('start body has no email and carries Turnstile token + idempotency key', start && !('email' in start.body) && /^TEST-TOKEN-business-review$/.test(start.body.turnstile_token) && /^[0-9a-f-]{36}$/.test(start.key));
    check('confirm carried competitor and task', conf && conf.body.competitor_nomination.name === 'Clyde Components' && /chase/.test(conf.body.automation_task));
    check('advance calls used the bearer token, never in the URL', lg.filter((x) => /advance$/.test(x.path)).every((x) => x.hasToken) && lg.every((x) => !x.path.includes(TOKEN)));
    // details expand
    await p.click('.br-table--cmp .br-toggle');
    check('details expand with source and limitations', /Google PageSpeed Insights API v5/.test(await p.innerText('.br-table--cmp .br-detail')) && /Limitations/.test(await p.innerText('.br-table--cmp .br-detail')));
    check('toggle state exposed', (await p.getAttribute('.br-table--cmp .br-toggle', 'aria-expanded')) === 'true');
    await p.click('.br-expand-all');
    check('expand all opens every panel', (await p.locator('.br-detail[hidden]').count()) === 0);
    await axe(p, 'results (expanded)');
    await p.screenshot({ path: SHOTS + '/results-1440.png', fullPage: true });
    // request flows
    check('email and discussion forms hidden at first', !(await p.isVisible('#br-mail-form')) && !(await p.isVisible('#br-talk-form')));
    await p.click('#br-mail-open');
    check('consent unticked by default', (await p.locator('#br-mail-form input[type=checkbox]:checked').count()) === 0);
    await p.fill('#br-mail-email', 'owner@harbourprecision.example');
    await p.click('#br-mail-form button[type=submit]');
    check('cannot send without ticking the delivery box', (await mlog()).filter((x) => /request-report/.test(x.path)).length === 0);
    await p.check('#br-mail-consent');
    await p.waitForTimeout(200);
    await p.click('#br-mail-form button[type=submit]');
    await p.waitForFunction(() => /checks each report|sent|on its way/i.test(document.getElementById('br-mail-msg').textContent), null, { timeout: 8000 });
    const rr = (await mlog()).find((x) => /request-report/.test(x.path));
    check('mail body: delivery consent only, follow up and marketing false', rr && rr.body.consent.report_delivery === true && rr.body.consent.follow_up_contact === false && rr.body.consent.marketing === false && rr.body.turnstile_token === 'TEST-TOKEN-business-review-mail');
    await p.click('#br-talk-open');
    check('discussion form: follow up and marketing unticked', (await p.locator('#br-talk-form input[type=checkbox]:checked').count()) === 0);
    await p.fill('#br-talk-name', 'Alex'); await p.fill('#br-talk-email', 'owner@harbourprecision.example');
    await p.check('#br-si-automation'); await p.check('#br-talk-consent');
    await p.waitForTimeout(200);
    await p.click('#br-talk-form button[type=submit]');
    await p.waitForFunction(() => /BR-7K2M9QX4/.test(document.getElementById('br-talk-status').textContent), null, { timeout: 8000 });
    const dr = (await mlog()).find((x) => /request-discussion/.test(x.path));
    check('discussion body: follow up true, marketing false, service interest', dr && dr.body.consent.follow_up_contact === true && dr.body.consent.marketing === false && dr.body.service_interest[0] === 'automation');
    // add task after results
    await p.click('#br-auto-form .br-chip[data-task=chasing_quotations]');
    await p.click('#br-auto-form button[type=submit]');
    await p.waitForSelector('.br-ao', { timeout: 8000 });
    const card = await p.innerText('.br-ao');
    check('automation card says potential workflow, not existing, no development', /Potential workflow/.test(card) && /not an existing implementation at your business/.test(card) && /does not include development/.test(card));
    check('console clean (journey)', p.errors.length === 0, p.errors.join(' | '));
    await p.context().close();

    // ---------------------------------------------------------- 2 viewports and overflow
    for (const w of [390, 768, 1440]) {
      p = await newPage(browser, { width: w, height: 900 });
      await mock('scenario?name=with-website');
      await p.goto(BASE + '/business-review');
      check('intake no horizontal overflow at ' + w, !(await overflow(p)));
      await toResults(p, { comp: true });
      await p.click('.br-expand-all');
      check('results no horizontal overflow at ' + w, !(await overflow(p)));
      await p.screenshot({ path: SHOTS + '/results-' + w + '.png', fullPage: true });
      if (w === 390) await axe(p, 'results 390');
      await p.context().close();
    }

    // ---------------------------------------------------------- 3 no website
    await mock('scenario?name=no-website');
    p = await newPage(browser);
    await p.goto(BASE + '/business-review');
    await p.check('#br-no-website');
    check('reduced note shown and website disabled', (await p.isVisible('#br-reduced-note')) && (await p.isDisabled('#br-website')));
    await toResults(p, { noWebsite: true });
    const st = (await mlog()).find((x) => x.path === '/start');
    check('no website: start body has no website', st && !('website' in st.body));
    txt = await p.innerText('#br-report');
    check('no website: reduced review wording and no invented rows', /No website was entered/.test(txt) && (await p.locator('table.br-table--cmp').count()) === 0);
    const hs = (await p.evaluate(() => window.__hist)).steps.join('\n');
    check('no website: site steps shown as skipped with the reason, never as done', /Skipped/.test(hs) && /No website was entered/.test(hs) && !/Reading your website\s*\n?Done/.test(hs), hs.slice(0, 300));
    await p.screenshot({ path: SHOTS + '/results-no-website.png', fullPage: true });
    await p.context().close();

    // ---------------------------------------------------------- 4 discovery unavailable
    await mock('scenario?name=discovery-unavailable');
    p = await newPage(browser);
    await toResults(p, {});
    txt = await p.innerText('#br-report');
    check('discovery unavailable stated and nomination form offered', /not available for this review/.test(txt) && (await p.locator('#br-comp-form').count()) === 1);
    await p.fill('#br-comp-name', 'Clyde Components'); await p.fill('#br-comp-site', 'clydecomponents.example');
    await p.click('#br-comp-form button[type=submit]');
    await p.waitForSelector('#br-step-run:not([hidden])');
    await p.waitForSelector('#br-step-results:not([hidden])', { timeout: 15000 });
    check('naming a competitor re-runs the steps and returns to results', /Clyde Components/.test(await p.innerText('#br-report')));
    await p.context().close();

    // ---------------------------------------------------------- 5 partial
    await mock('scenario?name=partial');
    p = await newPage(browser);
    await toResults(p, { comp: true });
    check('partial: step shows could not complete and banner shows', /Partly complete/.test(await p.innerText('#br-report')));
    await p.context().close();

    // ---------------------------------------------------------- 6 provider failure (status failed): no analysis shown
    await mock('scenario?name=fail-second');
    p = await newPage(browser);
    await p.goto(BASE + '/business-review'); await fillIntake(p, {}); await p.click('#br-start-btn');
    await p.waitForSelector('#br-step-confirm:not([hidden])'); await p.click('#br-confirm-btn');
    await p.waitForSelector('#br-run-problem:not([hidden])', { timeout: 15000 });
    txt = await p.innerText('#br-step-run');
    check('failure: honest message, no results section', /could not be completed/.test(txt) && !(await p.isVisible('#br-step-results')));
    check('failure: no evidence labels or findings on screen', !/Verified public observation|What we found/.test(await p.innerText('#br-step-run')));
    check('failure: offers start again and the contact email', /Start again/.test(txt) && /rhys@rhyshume\.co\.uk/.test(txt));
    await p.screenshot({ path: SHOTS + '/failure-1440.png', fullPage: true });
    check('failure: problem heading has focus', await p.evaluate(() => document.activeElement && document.activeElement.tagName) === 'H3');
    await p.context().close();

    // ---------------------------------------------------------- 7 timeout then recovery
    await mock('scenario?name=always-504');
    p = await newPage(browser);
    await p.goto(BASE + '/business-review'); await fillIntake(p, {}); await p.click('#br-start-btn');
    await p.waitForSelector('#br-step-confirm:not([hidden])'); await p.click('#br-confirm-btn');
    await p.waitForSelector('#br-run-problem:not([hidden])', { timeout: 20000 });
    txt = await p.innerText('#br-run-problem');
    check('timeout: paused state says it is taking longer, offers Try again', /taking longer than expected/.test(txt) && /Try again/.test(txt));
    await p.screenshot({ path: SHOTS + '/timeout-1440.png', fullPage: true });
    await mock('set?k=scenario&v=with-website');
    await p.click('[data-act=resume]');
    await p.waitForSelector('#br-step-results:not([hidden])', { timeout: 15000 });
    check('timeout: Try again recovers to results', true);
    await p.context().close();

    // ---------------------------------------------------------- 8 transient problems recover by themselves
    for (const sc of ['step-busy-once', 'drop-once']) {
      await mock('scenario?name=' + sc);
      p = await newPage(browser);
      await toResults(p, {});
      check(sc + ': recovered without user action', true);
      await p.context().close();
    }

    // ---------------------------------------------------------- 9 expired
    await mock('scenario?name=with-website');
    p = await newPage(browser);
    await p.goto(BASE + '/business-review'); await fillIntake(p, {}); await p.click('#br-start-btn');
    await p.waitForSelector('#br-step-confirm:not([hidden])');
    await mock('set?k=scenario&v=expired');
    await p.click('#br-confirm-btn');
    await p.waitForSelector('#br-run-problem:not([hidden])', { timeout: 10000 });
    check('expired: clear message and a way to start again', /expired/i.test(await p.innerText('#br-run-problem')) && /Start a new review/.test(await p.innerText('#br-run-problem')));
    await p.context().close();

    // ---------------------------------------------------------- 10 start errors
    await mock('scenario?name=with-website');
    p = await newPage(browser);
    await p.goto(BASE + '/business-review');
    await p.click('#br-start-btn');
    check('empty form: field errors, focus on first field, nothing sent', (await p.locator('.br-field-error').count()) >= 3 && (await p.evaluate(() => document.activeElement.id)) === 'br-name' && (await mlog()).length === 0);
    await axe(p, 'intake with errors');
    await fillIntake(p, { website: 'http://private.example' });
    await p.click('#br-start-btn');
    await p.waitForSelector('#br-intake-error:not([hidden])');
    check('url_not_allowed shows the server message', /cannot be used/.test(await p.innerText('#br-intake-error')) && (await p.isVisible('#br-step-intake')));
    await p.context().close();

    // ---------------------------------------------------------- 11 duplicate submit
    await mock('scenario?name=with-website&delay=0');
    p = await newPage(browser);
    await p.goto(BASE + '/business-review'); await fillIntake(p, {});
    await p.evaluate(() => { const b = document.getElementById('br-start-btn'); b.click(); b.click(); document.getElementById('br-form').requestSubmit(); });
    await p.waitForSelector('#br-step-confirm:not([hidden])');
    await p.evaluate(() => { const b = document.getElementById('br-confirm-btn'); b.click(); b.click(); });
    await p.waitForSelector('#br-step-results:not([hidden])', { timeout: 15000 });
    const l2 = await mlog();
    check('duplicate submit: exactly one start and one confirm', l2.filter((x) => x.path === '/start').length === 1 && l2.filter((x) => /confirm$/.test(x.path)).length === 1);
    await p.context().close();

    // ---------------------------------------------------------- 12 nothing invented while a request runs
    await mock('scenario?name=with-website&delay=1500');
    p = await newPage(browser);
    await p.goto(BASE + '/business-review'); await fillIntake(p, { comp: true }); await p.click('#br-start-btn');
    await p.waitForSelector('#br-step-confirm:not([hidden])'); await p.click('#br-confirm-btn');
    await p.waitForSelector('#br-step-run:not([hidden])');
    await p.waitForTimeout(700);
    const mid = await p.evaluate(() => ({ results: !document.getElementById('br-step-results').hidden, report: document.getElementById('br-report').innerHTML.length, steps: Array.from(document.querySelectorAll('.br-step')).map((x) => x.className), text: document.getElementById('br-steps').innerText }));
    check('while a request runs: no report content, no step marked done', !mid.results && mid.report === 0 && !/Done/.test(mid.text));
    await p.screenshot({ path: SHOTS + '/loading-1440.png', fullPage: true });
    await p.context().close();

    // ---------------------------------------------------------- 13 keyboard only
    await mock('scenario?name=with-website');
    p = await newPage(browser);
    await p.goto(BASE + '/business-review');
    await p.focus('#br-name');
    const typeKb = async (s) => { await p.keyboard.type(s); };
    await typeKb('Harbour Precision Ltd'); await p.keyboard.press('Tab');
    await typeKb('harbourprecision.example'); await p.keyboard.press('Tab'); await p.keyboard.press('Tab');
    await typeKb('Glasgow'); await p.keyboard.press('Tab');
    check('keyboard: radio group reached', (await p.evaluate(() => document.activeElement.name)) === 'location_kind');
    await p.keyboard.press('Tab');
    await typeKb('CNC machining');
    await p.focus('#br-start-btn');
    await p.waitForTimeout(300);
    await p.keyboard.press('Enter');
    await p.waitForSelector('#br-step-confirm:not([hidden])');
    await p.focus('#br-confirm-btn'); await p.keyboard.press('Enter');
    await p.waitForSelector('#br-step-results:not([hidden])', { timeout: 15000 });
    await p.focus('.br-table--cmp .br-toggle'); await p.keyboard.press('Enter');
    check('keyboard: Enter opens details', (await p.getAttribute('.br-table--cmp .br-toggle', 'aria-expanded')) === 'true');
    await p.keyboard.press('Space');
    check('keyboard: Space closes details', (await p.getAttribute('.br-table--cmp .br-toggle', 'aria-expanded')) === 'false');
    await p.keyboard.press('Tab');
    check('keyboard: focus ring visible on the focused control', await p.evaluate(() => { const b = document.activeElement; const c = getComputedStyle(b); return b !== document.body && c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) >= 2; }));
    await p.context().close();

    // ---------------------------------------------------------- 14 reduced motion, layout shift
    p = await newPage(browser, { width: 390, height: 800 }, { reducedMotion: 'reduce' });
    await mock('scenario?name=with-website');
    await p.addInitScript(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
    await p.goto(BASE + '/business-review'); await p.waitForTimeout(1500);
    check('layout shift on intake load under 0.05 (got ' + (await p.evaluate(() => window.__cls)).toFixed(4) + ')', (await p.evaluate(() => window.__cls)) < 0.05);
    await fillIntake(p, {}); await p.click('#br-start-btn'); await p.waitForSelector('#br-step-confirm:not([hidden])'); await p.click('#br-confirm-btn');
    await p.waitForSelector('.br-step--running, #br-step-results:not([hidden])');
    check('reduced motion: spinner animation off', await p.evaluate(() => { const m = document.querySelector('.br-step--running .br-step-mark'); return !m || getComputedStyle(m).animationName === 'none'; }));
    await p.context().close();

    // ---------------------------------------------------------- 15 report page
    await mock('scenario?name=with-website');
    p = await newPage(browser);
    await p.goto(BASE + '/business-review/report');
    await p.waitForSelector('#br-report-state:not([hidden])');
    check('report page without a token: clear message, no data', /missing part of its access code/.test(await p.innerText('#br-report-state')) && !(await p.isVisible('#br-report-root')));
    await p.goto(BASE + '/business-review/report#t=' + TOKEN + '&id=' + ID); await p.reload();
    await p.waitForSelector('#br-report-root:not([hidden])');
    check('report page: title, evidence log, sources', /Harbour Precision Ltd/.test(await p.innerText('#br-report-title')) && (await p.locator('.br-table--log').count()) === 1 && /Sources and dates/.test(await p.innerText('#br-report-root')));
    check('report page: no PDF button when API says disabled', (await p.locator('#br-pdf').count()) === 0);
    check('report page: robots noindex meta', (await p.getAttribute('meta[name=robots]', 'content')) === 'noindex, nofollow, noarchive');
    await axe(p, 'report page');
    await p.emulateMedia({ media: 'print' });
    const pr = await p.evaluate(() => ({
      mast: getComputedStyle(document.querySelector('.masthead')).display,
      detailsShown: Array.from(document.querySelectorAll('.br-detail')).every((r) => getComputedStyle(r).display !== 'none'),
      actions: getComputedStyle(document.querySelector('.br-actions-panel')).display,
      printBtn: getComputedStyle(document.getElementById('br-print').closest('.br-noprint')).display,
      legend: getComputedStyle(document.querySelector('.br-legend-print')).display,
      disclaimers: document.querySelector('.br-disclaimers') && getComputedStyle(document.querySelector('.br-disclaimers')).display
    }));
    check('print: masthead, actions and print button hidden; every detail row shown; legend and disclaimers shown', pr.mast === 'none' && pr.detailsShown && pr.actions === 'none' && pr.printBtn === 'none' && pr.legend !== 'none' && pr.disclaimers !== 'none', JSON.stringify(pr));
    await p.screenshot({ path: SHOTS + '/report-print-emulated.png', fullPage: true });
    await p.pdf({ path: SHOTS + '/report-print.pdf', format: 'A4', printBackground: true });
    check('print to PDF by the browser works (file written)', fs.statSync(SHOTS + '/report-print.pdf').size > 5000);
    await p.emulateMedia({ media: 'screen' });
    await p.context().close();
    await mock('scenario?name=with-website&pdf=1');
    p = await newPage(browser);
    await p.goto(BASE + '/business-review/report#t=' + TOKEN + '&id=' + ID);
    await p.waitForSelector('#br-report-root:not([hidden])'); await p.waitForTimeout(300);
    check('report page: PDF button appears only when the API reports pdf available', (await p.locator('#br-pdf').count()) === 1);
    await p.context().close();
    await mock('scenario?name=with-website');
    p = await newPage(browser);
    await p.goto(BASE + '/business-review/report#t=' + 'x'.repeat(43) + '&id=' + ID); await p.reload();
    await p.waitForSelector('#br-report-state:not([hidden])');
    await p.waitForFunction(() => /could not find/.test(document.getElementById('br-report-state').textContent));
    check('report page: wrong token shows not found', true);
    await mock('scenario?name=expired');
    await p.goto(BASE + '/business-review/report#t=' + TOKEN + '&id=' + ID); await p.reload();
    await p.waitForFunction(() => /expired/.test(document.getElementById('br-report-state').textContent));
    check('report page: expired token handled', true);
    await p.context().close();

    // ---------------------------------------------------------- 16 delete
    await mock('scenario?name=with-website');
    p = await newPage(browser);
    await toResults(p, {});
    await p.click('#br-delete'); await p.click('#br-delete');
    await p.waitForSelector('#br-step-intake:not([hidden])');
    check('delete: returns to the form with a confirmation and clears the session', /deleted/.test(await p.innerText('#br-intake-note')) && (await p.evaluate(() => sessionStorage.getItem('br-session'))) === null);
    await p.context().close();
  } catch (e) {
    check('run completed without an exception', false, String(e && e.stack || e));
  } finally {
    await browser.close(); server.close();
  }
  const bad = results.filter((r) => !r.ok);
  console.log('\n' + (results.length - bad.length) + ' passed, ' + bad.length + ' failed, ' + results.length + ' checks');
  process.exit(bad.length ? 1 : 0);
})();
