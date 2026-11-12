'use strict';

// Optional browser steps for tools/preview.js: phone screenshots, measurements and Lighthouse.
// Needs playwright-core, lighthouse and chrome-launcher. The Build preview Action installs them.
// If they are missing, preview.js skips these steps and says so in notes.md. Nothing is invented.

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const zlib = require('node:zlib');

const VIEW = { width: 390, height: 844 };

function loadPlaywright() {
  try { return require('playwright-core'); } catch (e) { return null; }
}

function findChrome(pw) {
  const fromEnv = process.env.CHROME_PATH;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  try {
    const p = pw && pw.chromium && pw.chromium.executablePath();
    if (p && fs.existsSync(p)) return p;
  } catch (e) { /* not installed */ }
  return ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(function (p) { return fs.existsSync(p); }) || '';
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8'
};

// A small static server: the repo, with /preview/<slug>/ taken from the folder being built.
// Text files are gzipped, like the live site, so the speed numbers are fair.
function serve(repoRoot, slug, slugDir) {
  const server = http.createServer(function (req, res) {
    let p = decodeURIComponent((req.url || '/').split('?')[0].split('#')[0]);
    let file;
    const prefix = '/preview/' + slug + '/';
    if (p === '/preview/' + slug) p = prefix;
    if (p.startsWith(prefix)) file = path.join(slugDir, p.slice(prefix.length) || 'index.html');
    else file = path.join(repoRoot, p);
    const base = p.startsWith(prefix) ? slugDir : repoRoot;
    if (!path.resolve(file).startsWith(path.resolve(base))) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('not found'); }
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    let body = fs.readFileSync(file);
    const headers = { 'content-type': type, 'cache-control': 'public, max-age=3600' };
    if (/^(text|application\/(json|javascript))|svg/.test(type) && /gzip/.test(req.headers['accept-encoding'] || '')) {
      body = zlib.gzipSync(body); headers['content-encoding'] = 'gzip';
    }
    res.writeHead(200, headers); res.end(body);
  });
  return new Promise(function (resolve) {
    server.listen(0, '127.0.0.1', function () { resolve({ server: server, port: server.address().port }); });
  });
}

// Runs inside the page. Returns plain numbers and text only.
const MEASURE = function (view) {
  const vw = view.width; const vh = view.height; // the phone screen we asked for, not the width the page stretched the viewport to
  const visible = function (el) {
    const s = getComputedStyle(el); const r = el.getBoundingClientRect();
    return s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) !== 0 && r.width > 0 && r.height > 0;
  };
  const box = function (el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
  };
  const tel = Array.prototype.slice.call(document.querySelectorAll('a[href^="tel:"]')).filter(visible)[0];
  const quote = Array.prototype.slice.call(document.querySelectorAll('a, button')).filter(visible).find(function (e) {
    return /\bquote\b/i.test((e.textContent || '').trim()) && (e.textContent || '').trim().length < 40;
  });
  const h1 = Array.prototype.slice.call(document.querySelectorAll('h1')).filter(visible)[0];
  return {
    vw: vw, vh: vh,
    scrollW: document.documentElement.scrollWidth,
    sideways: document.documentElement.scrollWidth > vw + 1,
    tel: tel ? box(tel) : null,
    quote: quote ? box(quote) : null,
    h1: h1 ? { text: (h1.textContent || '').replace(/\s+/g, ' ').trim(), box: box(h1) } : null,
    fileInput: !!document.querySelector('input[type="file"]')
  };
};

async function shootAndMeasure(browser, url, opts) {
  const ctx = await browser.newContext({
    viewport: VIEW, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });
  try {
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'load', timeout: 45000 });
    await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(function () {});
    await page.waitForTimeout(1200);
    const m = await page.evaluate(MEASURE, VIEW);
    let pins = null;
    if (opts && opts.pinSelectors) {
      pins = await page.evaluate(function (sel) {
        const out = {};
        Object.keys(sel).forEach(function (k) {
          const el = Array.prototype.slice.call(document.querySelectorAll(sel[k])).find(function (e) {
            const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
            return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
          });
          if (el) { const r = el.getBoundingClientRect(); out[k] = { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height }; }
        });
        return out;
      }, opts.pinSelectors);
    }
    const shot = opts && opts.screenshot ? await page.screenshot({ type: 'jpeg', quality: 72 }) : null;
    return { m: m, pins: pins, shot: shot };
  } finally {
    await ctx.close();
  }
}

function median(a) {
  const s = a.slice().sort(function (x, y) { return x - y; });
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// Lighthouse mobile performance, median of several runs. Returns null if it cannot run.
async function lighthouse(url, chromePath, runs) {
  let lh; let launcher;
  try { lh = (await import('lighthouse')).default; launcher = await import('chrome-launcher'); } catch (e) { return { error: 'lighthouse is not installed' }; }
  const scores = []; const lcps = [];
  for (let i = 0; i < runs; i += 1) {
    let chrome;
    try {
      chrome = await launcher.launch({ chromePath: chromePath, chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'] });
      const r = await lh(url, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: ['performance'], formFactor: 'mobile' });
      const lhr = r && r.lhr;
      const score = lhr && lhr.categories && lhr.categories.performance && lhr.categories.performance.score;
      const lcp = lhr && lhr.audits && lhr.audits['largest-contentful-paint'] && lhr.audits['largest-contentful-paint'].numericValue;
      if (typeof score === 'number') { scores.push(Math.round(score * 100)); if (typeof lcp === 'number') lcps.push(lcp / 1000); }
    } catch (e) { /* one failed run is skipped */ } finally { if (chrome) { try { await chrome.kill(); } catch (e) { /* ignore */ } } }
  }
  if (!scores.length) return { error: 'every Lighthouse run failed' };
  return { score: Math.round(median(scores)), lcp: lcps.length ? Math.round(median(lcps) * 10) / 10 : null, runs: scores.length, all: scores };
}

module.exports = { VIEW, loadPlaywright, findChrome, serve, shootAndMeasure, lighthouse, median };
