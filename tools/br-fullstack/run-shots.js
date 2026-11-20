/* DEV ONLY (not shipped). Review journey states at 390/768/1440: intake, confirm, progress, results, report page; axe and overflow on each. */
'use strict';
const fs = require('node:fs');
const { createHarness } = require('./harness');
const L = require('./lib');
const A = require('./api');
const { chromium } = require('playwright');
const { check, results, ctl, SHOTS, S, newPage, fill } = L;
const AXE = fs.readFileSync(process.env.AXE, 'utf8');
async function axe(p) { await p.addScriptTag({ content: AXE }); const r = await p.evaluate(() => axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] })); return r.violations.map((v) => v.id + ' x' + v.nodes.length + ' ' + v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')); }
(async () => {
  const H = createHarness(); const ports = await H.start(0, Number(process.env.FIXTURE_PORT || 80));
  S.BASE = 'http://localhost:' + ports.port; A.setBase(S.BASE); S.browser = await chromium.launch();
  try {
    for (const w of [390, 768, 1440]) {
      await ctl('reset'); await ctl('psi-delay?host=slow&ms=4000');
      const p = await newPage({ viewport: { width: w, height: 900 }, hasTouch: w < 800 });
      await p.goto(S.BASE + '/business-review'); await fill(p, { website: 'http://slow-site.test/', comp: { name: 'Rival One', site: 'http://rival-one.test/' }, task: true });
      await p.screenshot({ path: SHOTS + '/br-intake-' + w + '.png' });
      let v = await axe(p); check('intake ' + w + ' axe', v.length === 0, v.join('; '));
      await p.click('#br-start-btn'); await p.waitForSelector('#br-step-confirm:not([hidden])');
      await p.screenshot({ path: SHOTS + '/br-confirm-' + w + '.png' });
      v = await axe(p); check('confirm ' + w + ' axe', v.length === 0, v.join('; '));
      await p.click('#br-confirm-btn'); await p.waitForSelector('#br-step-run:not([hidden])'); await p.waitForTimeout(1500);
      await p.screenshot({ path: SHOTS + '/br-progress-' + w + '.png' });
      v = await axe(p); check('progress ' + w + ' axe', v.length === 0, v.join('; '));
      await p.waitForSelector('#br-step-results:not([hidden])', { timeout: 60000 });
      await p.screenshot({ path: SHOTS + '/br-results-top-' + w + '.png' });
      await p.click('.br-expand-all');
      v = await axe(p); check('results (expanded) ' + w + ' axe', v.length === 0, v.join('; '));
      check('results ' + w + ' no horizontal overflow', !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
      // crops down the page
      const H0 = await p.evaluate(() => document.documentElement.scrollHeight);
      await p.evaluate(() => document.getElementById('br-report').scrollIntoView());
      await p.waitForTimeout(200);
      await p.screenshot({ path: SHOTS + '/br-results-report-' + w + '.png' });
      await p.mouse.wheel(0, 900); await p.waitForTimeout(200);
      await p.screenshot({ path: SHOTS + '/br-results-report2-' + w + '.png' });
      // email then report page via link
      await p.evaluate(() => { document.getElementById('br-mail-open').scrollIntoView(); });
      await p.click('#br-mail-open'); await p.fill('#br-mail-email', 'a@example.test'); await p.waitForTimeout(250); await p.click('#br-mail-form button[type=submit]');
      await p.waitForFunction(() => /sent/i.test(document.getElementById('br-mail-msg').textContent), null, { timeout: 15000 });
      const m = (await fetch(S.BASE + '/__harness/mails').then((r) => r.json())).pop();
      const link = m.text.match(/http:\/\/localhost(\/business-review\/report#[^\s]+)/)[1];
      const f = await newPage({ viewport: { width: w, height: 900 } });
      await f.goto(S.BASE + link); await f.waitForSelector('#br-report-root:not([hidden])'); await f.waitForTimeout(400);
      await f.screenshot({ path: SHOTS + '/br-report-' + w + '.png' });
      v = await axe(f); check('report page ' + w + ' axe', v.length === 0, v.join('; '));
      check('report page ' + w + ' no horizontal overflow', !(await f.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
      await f.screenshot({ path: SHOTS + '/br-report-full-' + w + '.png', fullPage: true });
      await p.context().close(); await f.context().close();
    }
  } catch (e) { check('exception', false, String(e && e.stack || e)); }
  finally { await S.browser.close(); await H.close(); }
  const bad = results.filter((r) => !r.ok); console.log(results.length - bad.length + ' passed, ' + bad.length + ' failed');
})();
