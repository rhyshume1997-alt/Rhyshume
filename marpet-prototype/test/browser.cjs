// Browser checks: navigation, transitions, the enquiry form, three screen sizes and accessibility (axe-core).
// Needs Playwright with Chromium available.   node test/browser.cjs [--shots dir]
const { chromium, devices } = require('playwright');
const { spawn } = require('node:child_process');
const { readFileSync, readdirSync, mkdirSync } = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PORT = 4188, U = `http://localhost:${PORT}/`;
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const SHOTS = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
const pages = readdirSync(path.join(ROOT, 'site')).filter((f) => f.endsWith('.html'));
const HEAVY = new Set(['material-test.html', 'phone-test.html']);   // four live 3D views: checked on desktop only
const SIZES = [['desktop', { viewport: { width: 1440, height: 900 } }], ['tablet', { viewport: { width: 820, height: 1180 }, hasTouch: true }], ['mobile', { ...devices['Pixel 7'] }]];
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

let passed = 0; const failures = [];
const ok = (cond, name, detail = '') => { if (cond) passed++; else { failures.push(name + (detail ? ': ' + detail : '')); console.log('FAIL', name, detail); } };

async function main() {
  const server = spawn('node', ['serve.mjs', String(PORT)], { cwd: ROOT, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 900));
  const browser = await chromium.launch({ args: ARGS });
  try {
    // ---- every page at three sizes: no script errors, no sideways scroll, accessibility ----
    for (const [size, opts] of SIZES) {
      const ctx = await browser.newContext({ ...opts, reducedMotion: 'reduce' });
      const p = await ctx.newPage(); const errs = [];
      p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/favicon|ERR_/.test(m.text())) errs.push(m.text()); });
      for (const f of pages) {
        if (HEAVY.has(f) && size !== 'desktop') continue;
        errs.length = 0;
        await p.goto(U + f, { waitUntil: 'load' });
        if (f === 'index.html') await p.waitForFunction(() => document.querySelector('.hero').classList.contains('is-ready'), null, { timeout: 90000 });
        else await p.waitForTimeout(250);
        ok(errs.length === 0, `${size} ${f}: no script errors`, errs.join(' | '));
        const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        ok(over <= 0, `${size} ${f}: no sideways scroll`, over + 'px');
        await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } scrollTo(0, 0); });
        await p.addScriptTag({ content: AXE });
        const res = await p.evaluate(() => window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] }));
        const bad = res.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
        ok(bad.length === 0, `${size} ${f}: accessibility`, bad.map((v) => `${v.id} (${v.nodes.length}) ${v.nodes[0].target}`).join('; '));
        if (SHOTS && !HEAVY.has(f)) { mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, `${size}-${f.replace('.html', '')}.jpg`), quality: 72, fullPage: f !== 'index.html', timeout: 120000 }).catch(() => {}); }
      }
      if (SHOTS) {   // homepage full length, with the hero as a still so the capture is quick
        await p.goto(U + 'index.html?static'); await p.waitForTimeout(400);
        await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } scrollTo(0, 0); });
        await p.waitForTimeout(1600);
        await p.screenshot({ path: path.join(SHOTS, `${size}-index-full.jpg`), quality: 72, fullPage: true, timeout: 120000 }).catch(() => {});
      }
      await ctx.close();
    }

    // ---- desktop behaviour, motion on ----
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    await p.goto(U + 'index.html?intro=1');
    ok(await p.isVisible('.header-cta'), 'quote button is usable before the opening finishes');
    ok(await p.isVisible('.nav a[data-section=services]'), 'navigation is usable before the opening finishes');
    await p.waitForSelector('[data-hero-skip]:not([hidden])', { timeout: 90000 });
    ok(true, 'skip button shows during the opening');
    ok(await p.evaluate(() => document.querySelector('.hero').classList.contains('is-opening') && getComputedStyle(document.querySelector('[data-shot=macro]')).visibility === 'visible'), 'the opening starts close on Marpet steel');
    ok(await p.evaluate(() => !document.querySelector('script[src*="viewer"]') && !performance.getEntriesByType('resource').some((r) => /viewer\.min\.js|conveyor\.glb/.test(r.name))), 'the homepage loads no 3D code or model');
    await p.click('[data-hero-skip]');
    await p.waitForFunction(() => document.querySelector('.hero').classList.contains('is-done'), null, { timeout: 20000 });
    ok(await p.evaluate(() => getComputedStyle(document.querySelector('[data-shot=hall]')).opacity === '1'), 'skipping lands on the production hall');
    ok(await p.isVisible('.hero h1'), 'hero copy is shown after skipping');
    await p.reload(); await p.goto(U + 'index.html');
    await p.waitForFunction(() => document.querySelector('.hero').classList.contains('is-done'), null, { timeout: 90000 });
    ok(await p.isHidden('[data-hero-skip]'), 'opening does not replay for a returning visitor');
    ok(await p.evaluate(() => document.querySelector('[data-shot=hall] .shot__img img').complete && document.querySelector('[data-shot=hall] .shot__img img').naturalWidth > 0), 'the hall photograph has loaded');

    // ---- pinned homepage scene ----
    ok(await p.evaluate(() => document.querySelector('.scene').classList.contains('is-scrolly')), 'homepage scene is pinned when motion is allowed');
    const toScene = (v) => p.evaluate((v) => { const s = document.querySelector('[data-scene]'); scrollTo(0, s.offsetTop + (s.offsetHeight - innerHeight) * v); }, v);
    const chapterIs = (n) => p.waitForFunction((n) => [...document.querySelectorAll('[data-ch]')].findIndex((c) => c.classList.contains('is-on')) === n, n, { timeout: 30000 }).then(() => true, () => false);
    await toScene(0.3);
    ok(await chapterIs(1), 'scrolling brings in the first chapter');
    ok(Math.abs(await p.evaluate(() => document.querySelector('.scene__pin').getBoundingClientRect().top) - 72) < 2, 'the stage stays pinned under the header');
    await toScene(0.6);
    ok(await chapterIs(2), 'then the second chapter');
    ok(await p.waitForFunction(() => getComputedStyle(document.querySelector('[data-shot=ch2]')).visibility === 'visible', null, { timeout: 10000 }).then(() => true, () => false), 'each chapter brings its own photograph');
    ok(await p.evaluate(() => document.querySelector('[data-ch]').inert), 'chapters that are off screen cannot be tabbed into');
    ok(await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 0, 'pinned scene causes no sideways scroll');
    await toScene(0);
    ok(await chapterIs(0), 'scrolling back restores the headline');
    await p.evaluate(() => { const s = document.querySelector('[data-scene]'); scrollTo(0, s.offsetTop + s.offsetHeight + 200); }); await p.waitForTimeout(400);
    ok(await p.isVisible('#main > section:nth-of-type(2) h2'), 'the page continues after the scene');

    // ---- services viewing frame ----
    await p.goto(U + 'services.html'); await p.waitForTimeout(400);
    await p.waitForTimeout(900); await p.hover('[data-svc-item="3"]');
    ok(await p.waitForFunction(() => { const on = [...document.querySelectorAll('.svc__slide.is-on')]; return on.length === 1 && on[0].dataset.svcSlide === '3'; }, null, { timeout: 8000 }).then(() => true, () => false), 'hovering a plate wipes its photographs into the frame');
    await p.hover('[data-svc-item="1"]'); await p.hover('[data-svc-item="5"]'); await p.waitForTimeout(2300);
    ok(await p.evaluate(() => { const on = [...document.querySelectorAll('.svc__slide.is-on')]; return on.length === 1 && on[0].dataset.svcSlide === '5'; }), 'quick changes settle on the last plate');
    ok(await p.isVisible('.svc__slide.is-on .svc__cap p'), 'the frame shows what the service is');
    await p.goto(U + 'work.html'); await p.waitForTimeout(700);
    ok(await p.locator('.wk').count() >= 6 && await p.locator('.wk__bg img').count() === await p.locator('.wk').count(), 'each project is a scene with its own backdrop');
    ok(await p.evaluate(() => { const f = document.querySelector('.wk__frame').getBoundingClientRect(); return f.width > 400 && f.height > 300; }), 'project photographs are large');
    await p.evaluate(() => scrollTo(0, 900)); await p.waitForTimeout(900);
    ok(await p.evaluate(() => getComputedStyle(document.querySelector('.wk__bg img')).transform !== 'none'), 'gallery layers move with the scroll');
    await p.goto(U + 'index.html?static'); await p.waitForTimeout(500);
    ok(await p.locator('.sheets .sheet').count() >= 3, 'steel sheets are placed over the sections they reveal');
    ok(await p.evaluate(() => { const s = document.querySelector('.sheets'); return s.getAttribute('aria-hidden') === 'true' && getComputedStyle(s).pointerEvents === 'none'; }), 'sheets are decoration only and never block the page');
    await p.evaluate(() => document.querySelector('[data-sheets]').scrollIntoView()); 
    ok(await p.waitForFunction(() => { const r = document.querySelector('.sheets .sheet').getBoundingClientRect(), s = document.querySelector('[data-sheets]').getBoundingClientRect(); return r.bottom <= s.top + 40 || r.height < 5; }, null, { timeout: 8000 }).then(() => true, () => false), 'the sheet has lifted clear once the section is in place');

    await p.goto(U + 'services.html'); await p.waitForTimeout(300);
    await p.click('.stack li:nth-child(3) a'); await p.waitForURL('**/service-pipework.html', { timeout: 8000 });
    ok((await p.textContent('h1')).includes('pipework'), 'plate opens its service page');
    ok(await p.evaluate(() => document.activeElement.tagName) === 'MAIN', 'focus moves to the new page');
    await p.waitForTimeout(900);
    await p.goBack(); await p.waitForTimeout(1500);
    ok(p.url().endsWith('services.html') && (await p.textContent('h1')) === 'Services', 'back returns to Services');
    await p.goForward(); await p.waitForTimeout(1500);
    ok(p.url().endsWith('service-pipework.html'), 'forward works');
    await p.click('.nav a[data-section=work]'); await p.waitForURL('**/work.html'); await p.waitForTimeout(900);
    ok((await p.getAttribute('.nav a[data-section=work]', 'aria-current')) === 'page', 'current page is marked in the menu');
    await p.click('[data-filter] button[value=pipework]');
    ok((await p.textContent('[data-filter-count]')).startsWith('1 project'), 'project filter works');
    ok(await p.locator('[data-filter-list] li:not([hidden])').count() === 1, 'filter hides other projects');
    await p.click('[data-filter] button[value=all]');
    await p.click('.wk a >> nth=0'); await p.waitForURL('**/project-*.html', { timeout: 8000 }); await p.waitForTimeout(900);
    ok(await p.isVisible('[data-frame-target] img'), 'project photograph opens its page');
    const direct = await ctx.newPage(); await direct.goto(U + 'project-process-pipework.html');
    ok((await direct.textContent('h1')) === 'Process pipework', 'project page works as a direct address'); await direct.close();

    // ---- enquiry form ----
    await p.goto(U + 'contact.html'); await p.waitForTimeout(300);
    await p.click('form button[type=submit]');
    ok(await p.isVisible('[data-error-summary]'), 'empty form shows an error summary');
    ok(await p.evaluate(() => document.activeElement.hasAttribute('data-error-summary')), 'error summary takes focus');
    ok(await p.locator('[data-error-summary] li').count() === 3, 'three required fields are reported');
    ok((await p.getAttribute('#f-email', 'aria-invalid')) === 'true', 'invalid field is marked');
    await p.click('[data-error-summary] li a >> nth=0');
    ok(await p.evaluate(() => document.activeElement.id) === 'f-name', 'summary links jump to the field');
    await p.fill('#f-name', 'Test Person'); await p.fill('#f-email', 'not-an-email'); await p.fill('#f-msg', 'A stainless steel table, 2 m by 1 m.');
    await p.click('form button[type=submit]');
    ok(await p.locator('[data-error-summary] li').count() === 1, 'only the bad email is reported');
    await p.fill('#f-email', 'test@example.co.uk'); await p.click('form button[type=submit]');
    ok(await p.isHidden('[data-error-summary]'), 'valid form clears the errors');
    const status = await p.textContent('#enquiry-status');
    ok(/Nothing has been sent yet/.test(status), 'with no sending service, the form says nothing was sent');
    ok((await p.getAttribute('#enquiry-status a', 'href')).startsWith('mailto:info@marpet.co.uk?subject='), 'and offers the enquiry by email');
    ok((await p.inputValue('input[name=ts]')).length > 10 && (await p.inputValue('#f-website')) === '', 'spam fields are in place');
    await ctx.close();

    // ---- keyboard, reduced motion, no script ----
    const k = await (await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' })).newPage();
    await k.goto(U + 'services.html'); await k.keyboard.press('Tab');
    ok(await k.evaluate(() => document.activeElement.className) === 'skip', 'first Tab reaches the skip link');
    const t0 = Date.now(); await k.click('.nav a[data-section=about]'); await k.waitForURL('**/about.html');
    ok(Date.now() - t0 < 700, 'reduced motion: pages change without the transition');
    await k.goto(U + 'index.html?intro=1');
    await k.waitForFunction(() => document.querySelector('.hero').classList.contains('is-done'), null, { timeout: 90000 });
    ok(await k.isHidden('[data-hero-skip]') && await k.isHidden('[data-hero-replay]'), 'reduced motion: no opening animation');
    ok(await k.evaluate(() => !document.querySelector('.sheets') && getComputedStyle(document.querySelector('[data-shot=hall]')).visibility === 'visible' && !document.querySelector('.has-motion')), 'reduced motion: a still photograph, no moving sheets or panels');
    await k.goto(U + 'work.html');
    ok(await k.evaluate(() => getComputedStyle(document.querySelector('.wk__panel')).display === 'none'), 'reduced motion: project photographs are never covered');
    const n = await (await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false })).newPage();
    await n.goto(U + 'index.html');
    ok(await n.isVisible('.hero h1') && await n.locator('.nav a').count() === 5, 'without scripts: copy and menu are there');
    await n.click('.nav a >> nth=0'); ok(n.url().endsWith('services.html'), 'without scripts: links work');
    await n.goto(U + 'team.html'); ok(await n.isVisible('.member summary'), 'without scripts: team plates are there');
  } finally {
    await browser.close(); server.kill();
  }
  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) { console.log(failures.map((f) => ' - ' + f).join('\n')); process.exit(1); }
}
main().catch((e) => { console.error(e); process.exit(1); });
