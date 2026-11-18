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
    ok(await p.waitForFunction(() => { const b = document.querySelector('.hero .btn--primary'); return b && +getComputedStyle(b).opacity > 0.9; }, null, { timeout: 2500 }).then(() => true, () => false), 'the headline and quote button show within the first moments');
    await p.waitForSelector('[data-hero-skip]:not([hidden])', { timeout: 5000 });
    ok(await p.evaluate(() => document.querySelector('.hero').classList.contains('is-playing') && getComputedStyle(document.querySelector('[data-shot=macro]')).visibility === 'visible'), 'the opening plays, starting close on Marpet steel');
    ok(await p.evaluate(() => !document.querySelector('script[src*="viewer"]') && !performance.getEntriesByType('resource').some((r) => /viewer\.min\.js|conveyor\.glb/.test(r.name))), 'the homepage loads no 3D code or model');
    ok(await p.evaluate(() => !document.querySelector('.scene, .scene__pin, [data-scene]') && getComputedStyle(document.querySelector('.hero')).position !== 'sticky'), 'nothing on the homepage is pinned');
    await p.mouse.wheel(0, 400);
    ok(await p.waitForFunction(() => document.querySelector('.hero').classList.contains('is-done') && scrollY > 100, null, { timeout: 3000 }).then(() => true, () => false), 'scrolling is never held: it ends the opening and the page moves');
    ok(await p.evaluate(() => getComputedStyle(document.querySelector('[data-shot=hall]')).opacity === '1'), 'the opening ends on the production hall');
    await p.evaluate(() => scrollTo(0, 0));
    await p.goto(U + 'index.html?intro=1'); await p.waitForSelector('[data-hero-skip]:not([hidden])', { timeout: 5000 });
    await p.click('[data-hero-skip]');
    ok(await p.waitForFunction(() => document.querySelector('.hero').classList.contains('is-done'), null, { timeout: 2000 }).then(() => true, () => false), 'Skip ends it at once');
    await p.goto(U + 'index.html?intro=1'); await p.waitForSelector('[data-hero-skip]:not([hidden])', { timeout: 5000 });
    ok(await p.waitForFunction(() => document.querySelector('.hero').classList.contains('is-done'), null, { timeout: 12000 }).then(() => true, () => false), 'left alone, the opening is over within about four seconds');
    await p.goto(U + 'index.html');
    ok(await p.evaluate(() => document.querySelector('.hero').classList.contains('is-static')) && await p.isHidden('[data-hero-skip]'), 'returning visitors go straight to the still');
    ok(await p.evaluate(() => document.querySelector('[data-shot=hall] .shot__img img').complete && document.querySelector('[data-shot=hall] .shot__img img').naturalWidth > 0), 'the hall photograph has loaded');
    // slow connection: the first picture does not arrive in time, so the still is used and nothing waits
    const slow = await ctx.newPage();
    await slow.route('**/macro-panel.webp', async (r) => { await new Promise((s) => setTimeout(s, 2500)); r.continue(); });
    await slow.addInitScript(() => { try { localStorage.removeItem('mp-intro'); } catch (e) {} });
    await slow.goto(U + 'index.html?intro=1', { waitUntil: 'domcontentloaded' });
    ok(await slow.waitForFunction(() => document.querySelector('.hero').classList.contains('is-static'), null, { timeout: 2500 }).then(() => true, () => false), 'slow connection: the still is shown instead of waiting for the opening');
    ok(await slow.isVisible('.hero .btn--primary'), 'slow connection: the quote button is there');
    await slow.close();
    // the process section is an ordinary section
    await p.evaluate(() => document.querySelector('.process__list').scrollIntoView({ block: 'center' }));
    ok(await p.waitForFunction(() => [...document.querySelectorAll('.process__item')].every((e) => +getComputedStyle(e).opacity > 0.95), null, { timeout: 4000 }).then(() => true, () => false), 'the three process steps appear as they come into view');
    ok(await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 0, 'no sideways scroll');
    // typography
    ok(await p.evaluate(() => /^"?Archivo/.test(getComputedStyle(document.querySelector('.hero h1')).fontFamily) && /^"?Inter/.test(getComputedStyle(document.body).fontFamily) && document.fonts.check('800 16px Archivo') && document.fonts.check('400 16px Inter')), 'Archivo headings and Inter text are loaded');

    await p.evaluate(() => document.querySelector('.done-sec .wk').scrollIntoView()); await p.waitForTimeout(800);
    ok(await p.evaluate(() => { const f = document.querySelector('.done-sec .wk__frame').getBoundingClientRect(); return f.width > 400 && f.height > 300; }), 'project photographs are large');
    await p.evaluate(() => scrollTo(0, 900)); await p.waitForTimeout(900);
    ok(await p.evaluate(() => getComputedStyle(document.querySelector('.wk__bg img')).transform !== 'none'), 'gallery layers move with the scroll');
    ok(await p.evaluate(() => !document.querySelector('.sheets, .wk__panel')), 'no steel sheets or panels cover any content');

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
    // ---- video sections (labelled test pattern on the test page; real footage drops into the same slots) ----
    await p.goto(U + 'index.html');
    ok(await p.locator('[data-shot=hall] .shot-note').count() === 1 && /To film/.test(await p.textContent('[data-shot=hall] .shot-note')), 'placeholder stills say what needs filming');
    await p.goto(U + 'media-test.html'); await p.waitForTimeout(300);
    const vstate = () => p.evaluate(() => [...document.querySelectorAll('video[data-video]')].map((v) => ({ mode: v.dataset.mode, src: !!v.getAttribute('src'), paused: v.paused, t: v.currentTime })));
    ok(await p.waitForFunction(() => { const v = document.querySelector('.page-head video[data-video]'); return v && !v.paused && v.currentTime > 0.2; }, null, { timeout: 15000 }).then(() => true, () => false), 'a looping video section plays while on screen');
    await p.evaluate(() => document.querySelectorAll('[data-film-band]')[1].scrollIntoView()); await p.waitForTimeout(1200);
    ok((await vstate())[0].paused, 'and pauses once it has left the screen');
    const scrubAt = async (f) => { await p.evaluate((f) => { const b = document.querySelectorAll('[data-film-band]')[1]; scrollTo(0, b.offsetTop - innerHeight + (innerHeight + b.offsetHeight) * f); }, f); await p.waitForTimeout(900); return p.evaluate(() => document.querySelectorAll('[data-film-band]')[1].querySelector('video').currentTime); };
    const t1 = await scrubAt(0.2), t2 = await scrubAt(0.8), t3 = await scrubAt(0.3);
    ok(t2 > t1 + 2 && t3 < t2 - 2, `scroll moves through a scrub video, both ways (${t1.toFixed(1)}s, ${t2.toFixed(1)}s, ${t3.toFixed(1)}s)`);
    ok((await vstate()).find((v) => v.mode === 'scrub').paused, 'a scrub video never plays by itself');
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
    ok(await k.evaluate(() => !document.querySelector('.wk__panel') && +getComputedStyle(document.querySelector('.wk__frame')).opacity === 1), 'reduced motion: project photographs show at once');
    await k.goto(U + 'media-test.html'); await k.waitForTimeout(1500);
    ok(await k.evaluate(() => [...document.querySelectorAll('video[data-video]')].every((v) => !v.getAttribute('src') && v.poster)), 'reduced motion: video sections show their still frame and download no footage');
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
