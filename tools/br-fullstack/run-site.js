/* DEV ONLY (not shipped). Site pass: nav and footer links, headings, axe at three widths, overflow, keyboard focus, reduced motion, screenshots.
   Run: NODE_PATH=$(npm root -g) AXE=<axe.min.js> SHOTS=<dir> node tools/br-fullstack/run-site.js */
'use strict';
const fs = require('node:fs');
const { createHarness } = require('./harness');
const L = require('./lib');
const A = require('./api');
const { chromium } = require('playwright');
const { check, results, ctl, SHOTS, S, newPage, fill } = L;
const AXE = fs.readFileSync(process.env.AXE, 'utf8');
const W = [390, 768, 1440];
const PAGES = [['home', '/'], ['business-review', '/business-review'], ['automation-demos', '/automation-demos'], ['engineering', '/engineering'], ['seo', '/seo-and-ai-visibility'], ['automation', '/automation'], ['about', '/about'], ['contact', '/contact'], ['websites', '/websites'], ['bot', '/business-review/bot']];
async function axe(p) { await p.addScriptTag({ content: AXE }); const r = await p.evaluate(() => axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] })); return r.violations.map((v) => v.id + ' x' + v.nodes.length + ' ' + v.nodes[0].target.join(' ')); }
(async () => {
  const H = createHarness();
  const ports = await H.start(0, Number(process.env.FIXTURE_PORT || 80));
  S.BASE = 'http://localhost:' + ports.port; A.setBase(S.BASE);
  S.browser = await chromium.launch();
  try {
    for (const [name, url] of PAGES) {
      for (const w of W) {
        const p = await newPage({ viewport: { width: w, height: 900 }, hasTouch: w < 800 });
        const resp = await p.goto(S.BASE + url); await p.waitForTimeout(700);
        await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo(0, 0); });
        await p.waitForTimeout(500);
        const v = await axe(p);
        const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        const h = await p.evaluate(() => { const hs = [...document.querySelectorAll('h1,h2,h3,h4')].map((e) => +e.tagName[1]); let skip = 0, prev = 0; hs.forEach((x) => { if (prev && x > prev + 1) skip++; prev = x; }); return { h1: hs.filter((x) => x === 1).length, skip }; });
        check(name + ' ' + w + ': 200, axe clean, no overflow, one h1, no skipped heading level, console clean', resp.status() === 200 && v.length === 0 && ov <= 0 && h.h1 === 1 && h.skip === 0 && p.errors.length === 0, 'status ' + resp.status() + ' axe ' + v.join('; ') + ' overflow ' + ov + ' ' + JSON.stringify(h) + ' ' + p.errors.slice(0, 2).join('|'));
        await p.screenshot({ path: SHOTS + '/site-' + name + '-' + w + '.png', fullPage: w === 390 ? false : false });
        await p.screenshot({ path: SHOTS + '/site-' + name + '-' + w + '-full.png', fullPage: true });
        await p.context().close();
      }
    }
    // nav links on every page
    const p = await newPage();
    for (const [name, url] of PAGES.concat([['report', '/business-review/report']])) {
      await p.goto(S.BASE + url);
      const nav = await p.evaluate(() => { const n = document.querySelector('#site-nav, nav'); return { hrefs: [...document.querySelectorAll('nav a, header a')].map((a) => a.getAttribute('href')) }; });
      const foot = await p.evaluate(() => [...document.querySelectorAll('footer a')].map((a) => a.getAttribute('href')));
      check(name + ': nav links Demonstrations and the review button, footer links both', nav.hrefs.includes('/automation-demos') && nav.hrefs.includes('/business-review') && foot.includes('/automation-demos') && foot.includes('/business-review'), JSON.stringify({ nav: nav.hrefs, foot }));
    }
    // keyboard: tab through the review page, focus visible, skip link
    await p.goto(S.BASE + '/business-review');
    let bad = 0, n = 0;
    for (let i = 0; i < 40; i++) { await p.keyboard.press('Tab'); const r = await p.evaluate(() => { const b = document.activeElement; if (!b || b === document.body) return null; const c = getComputedStyle(b); const vis = c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) >= 2 || c.boxShadow !== 'none'; const rect = b.getBoundingClientRect(); return { vis, onscreen: rect.width > 0 }; }); if (r) { n++; if (!r.vis) bad++; } }
    check('review page: 40 Tab presses, every focused control shows a visible focus indicator', n > 20 && bad === 0, 'focused ' + n + ' bad ' + bad);
    // reduced motion
    const rm = await newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    for (const [name, url] of [['home', '/'], ['automation-demos', '/automation-demos'], ['business-review', '/business-review']]) {
      await rm.goto(S.BASE + url); await rm.waitForTimeout(800);
      const r = await rm.evaluate(() => { let running = 0; document.getAnimations().forEach((a) => { if (a.playState === 'running' && a.effect && a.effect.getTiming().iterations === Infinity) running++; }); return running; });
      check('reduced motion ' + name + ': no infinite animation running', r === 0, String(r));
    }
  } catch (e) { check('run completed without an exception', false, String(e && e.stack || e)); }
  finally { await S.browser.close(); await H.close(); }
  const bad = results.filter((r) => !r.ok);
  console.log('\n' + (results.length - bad.length) + ' passed, ' + bad.length + ' failed, ' + results.length + ' checks');
  process.exit(bad.length ? 1 : 0);
})();
