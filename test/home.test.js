'use strict';

// Run with: node --test
// The redesigned home page and the engineering page it hands off to.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = function (p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); };
const text = function (html) { return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]*>/g, ' '); };
const BOOKING = 'https://calendar.google.com/calendar/appointments/AcZssZ35nSQ_2lobUifPsul__TiweHpPV1aRWuWbssQ=';
const BANNED = /\b(whole|lands|quiet|quietly|proper)\b/i;

const home = read('index.html');
const css = read('home.css');
const js = read('home.js');

test('home page: the headline, one line under it, the preview button and the smaller chat link', function () {
  assert.ok(/<h1[^>]*>Websites that get Glasgow trades more calls and quotes<\/h1>/.test(home));
  assert.ok(!/found on google/i.test(home), 'no found on Google claim beside the no guarantee line');
  assert.ok(/<a class="btn"[^>]*>Get a free preview of your site</.test(home.match(/<section class="hero"[\s\S]*?<\/section>/)[0]));
  assert.ok(/<p class="small">[^]*?<a [^>]*>Book a free 20-minute chat/.test(home), 'the 20 minute chat stays as a smaller link');
  assert.ok(!/<a class="btn[^"]*"[^>]*>Book a free 20-minute chat/.test(home), 'the chat is never a main button');
  assert.ok(home.split(BOOKING).length - 1 >= 3, 'booking link is in the header, the hero and the bottom');
  assert.ok(home.includes('href="tel:+447908041480"'));
  assert.ok(/<title>[^<]{10,70}<\/title>/.test(home));
  const d = home.match(/<meta name="description" content="([^"]+)"/);
  assert.ok(d && d[1].length <= 160, 'description length');
  assert.ok(home.includes('<link rel="canonical" href="https://www.rhyshume.co.uk/">'));
});

test('home page: the JNR Engineering line sits straight after the Marpet slider', function () {
  assert.ok(/<\/section>\s*<section class="result"[\s\S]*?\/work\/jnr-engineering[\s\S]*?<\/section>\s*<section class="services"/.test(home.slice(home.indexOf('<section class="proof"'))));
});

test('home page: the before and after slider is a native range input and says what the after side is', function () {
  assert.ok(/<input type="range"[^>]*aria-label="[^"]+"/.test(home));
  assert.ok(home.includes('After: New build, launching soon'));
  assert.ok(home.includes('Before: current site'));
  assert.ok(/<img[^>]*marpet-fabrications\.jpg[^>]*alt="[^"]{20,}/.test(home));
  assert.ok(/<img[^>]*marpet-new-build\.jpg[^>]*alt="[^"]{20,}/.test(home));
  assert.ok(fs.existsSync(path.join(ROOT, 'images/marpet-new-build.jpg')));
  const section = home.match(/<section class="proof"[\s\S]*?<\/section>/)[0];
  assert.ok(!/href=/.test(section), 'the slider section links to nothing');
  assert.ok(!/marpet\.co\.uk|vercel\.app/.test(home), 'no link to a Marpet site');
  assert.ok(!/coming soon/i.test(home), 'no coming soon wording next to the launching soon label');
});

test('home page: three services with their existing from prices, and the three automation add-ons in plain words', function () {
  [['Website', 'From £1,500 one-off'], ['Google profile and SEO', 'From £150'], ['Automatic replies and review requests', 'From £200']].forEach(function (p) {
    assert.ok(new RegExp(p[1] + '</p>\\s*<h3>' + p[0] + '</h3>').test(home), p.join(' ') + ' missing');
  });
  assert.ok(home.includes('Care plan from £35 a month'));
  assert.ok(home.includes('Instant replies to enquiries, booking reminders and Google review requests'));
  assert.ok(home.includes('online listings') || home.includes('Online listings'));
  assert.ok(home.includes('are from £120'));
  assert.ok(!/2,200|£60 a month/.test(home));
  assert.ok(home.includes('No one can guarantee rankings in Google or AI tools. What I can do is make sure your information is complete, accurate and easy to find, which is the part you control.'));
});

test('home page: the prices match the local business page', function () {
  const lb = read('local-business.html');
  ['from £1,500', 'from £35 a month', 'from £150', 'from £120', 'from £200'].forEach(function (p) {
    assert.ok(lb.includes(p), p + ' not on the local business page');
    assert.ok(home.toLowerCase().includes(p.toLowerCase()), p + ' not on the home page');
  });
});

test('home page: three steps, the JNR result line and the engineering tile', function () {
  ['<h3>Chat</h3>', '<h3>Preview</h3>', '<h3>Launch</h3>'].forEach(function (h) { assert.ok(home.includes(h), h); });
  assert.ok(home.includes('href="/work/jnr-engineering"'));
  assert.ok(/<a href="\/engineering">Websites for engineering firms<\/a>/.test(home));
});

test('home page: Tolra says pilot and register interest, with no price and no buy button', function () {
  assert.ok(home.includes('Tolra is in pilot with a Glasgow shop.'));
  assert.ok(home.includes('Register interest'));
  const t = text(home);
  const around = t.slice(Math.max(0, t.indexOf('Tolra') - 200), t.indexOf('Tolra') + 400);
  assert.ok(!/£|buy|subscribe|per month|a month/i.test(around), 'price or buy wording near Tolra');
});

test('home page: validation is linked from the footer only', function () {
  const beforeFooter = home.split('<footer')[0];
  assert.ok(!/\/csv|validation/i.test(beforeFooter), 'validation shows above the footer');
  assert.ok(home.split('<footer')[1].includes('href="/csv"'));
});

test('home page: no tools talk, no ChatGPT listing, no AI automation wording', function () {
  const t = text(home);
  assert.ok(!/AI automation|chatgpt|ai visibility|ai listing/i.test(t), 'banned selling words');
  assert.ok(!/Resend|Turnstile|Vercel|Supabase|Make\.com|Zapier/i.test(t), 'a tool is named');
});

test('home page: copy rules', function () {
  assert.ok(!/—/.test(home) && !/—/.test(css) && !/—/.test(js), 'em dash');
  const t = text(home).replace(/Good(?= morning)/g, '');
  assert.ok(!BANNED.test(t), 'banned word: ' + (t.match(BANNED) || [])[0]);
  assert.ok(!/rhyshume1997@gmail\.com/.test(home));
});

test('home page: the design rules hold in the stylesheet', function () {
  assert.ok(!/gradient/i.test(css), 'a gradient');
  assert.ok(!/backdrop-filter|blur\(/i.test(css), 'blur or glass');
  assert.ok(!/text-shadow|box-shadow|drop-shadow/i.test(css), 'a glow or shadow');
  assert.ok(!/#000(000)?\b|#fff(fff)?\b|\bblack\b|\bwhite\b/i.test(css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/white-space/g, '')), 'pure black or white');
  assert.ok(!/border-radius:\s*(999|50%|9{2,}px|[2-9]\d(px|rem))/i.test(css), 'round or pill shapes');
  assert.ok(!/transition:\s*all/i.test(css));
  assert.ok(!/ease-in\b|ease-in-out|\bbounce|cubic-bezier\(0\.\d+,\s*-/i.test(css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/ease-out/g, '')), 'a non ease-out curve');
  css.match(/transition:[^;]+;/g).forEach(function (t) {
    t.replace(/^transition:/, '').split(/,(?![^(]*\))/).forEach(function (part) {
      assert.ok(/^\s*(none;?$|transform\b|opacity\b)/.test(part), 'transition on something other than transform or opacity: ' + part.trim());
    });
  });
  css.match(/@keyframes[^{]+\{[\s\S]*?\}\s*\}|@keyframes[^{]+\{[^{}]*\{[^}]*\}[^{}]*\}/g).forEach(function (k) {
    assert.ok(!/(width|height|top|left|margin|padding|color|background)\s*:/i.test(k.replace(/@keyframes[^{]+\{/, '')), 'keyframes animate something other than transform or opacity');
  });
  ['Archivo', 'IBM Plex Sans', 'IBM Plex Mono'].forEach(function (f) { assert.ok(css.includes('font-family: "' + f + '"'), f); });
  assert.ok(/prefers-reduced-motion/.test(css) && /prefers-reduced-motion/.test(js));
  assert.ok(/@media \(hover: hover\) and \(pointer: fine\)/.test(css));
});

test('home page: the sticky call bar is there for phones and the page is not hidden without the script', function () {
  assert.ok(home.includes('class="callbar"'));
  assert.ok(/\.callbar\s*\{\s*display:\s*none/.test(css));
  assert.ok(/max-width:\s*47\.99rem[\s\S]*\.callbar/.test(css));
  assert.ok(/viewport-fit=cover/.test(home));
  assert.ok(/env\(safe-area-inset-bottom/.test(css));
  assert.ok(/html\.rv-on \.rv/.test(css), 'reveals only hide once the script has started');
  assert.ok(!/\.rv\s*\{[^}]*opacity:\s*0/.test(css.replace(/html\.rv-on \.rv/g, '')), 'content is hidden without the script');
});

test('the fonts the home page asks for exist', function () {
  ['fonts/archivo-latin.woff2', 'fonts/ibm-plex-sans-latin.woff2', 'fonts/ibm-plex-mono-400-latin.woff2', 'fonts/ARCHIVO-OFL.txt'].forEach(function (f) {
    assert.ok(fs.existsSync(path.join(ROOT, f)), f);
  });
});

test('engineering page: carries the old pitch, with Tolra in pilot, no validation outside the footer and the menu', function () {
  const e = read('engineering.html');
  assert.ok(e.includes('<link rel="canonical" href="https://www.rhyshume.co.uk/engineering">'));
  assert.ok(!/noindex/i.test(e));
  assert.ok(e.includes('Work gets lost in the gaps between the enquiry, the quote and the invoice.'));
  assert.ok(e.includes('in pilot with a Glasgow shop'));
  assert.ok(e.includes('Register interest'));
  assert.ok(e.includes(BOOKING));
  const nav = e.match(/<nav class="nav"[\s\S]*?<\/nav>/)[0];
  assert.ok(!/csv/.test(nav), 'validation in the menu');
  assert.ok(!/two working shops/.test(e));
  assert.ok(e.includes('Marpet Fabrications: new build launching soon.'));
  assert.ok(!/<h3 id="tolra">[\s\S]{0,400}£/.test(e), 'a price in the Tolra block');
  const sitemap = read('sitemap.xml');
  assert.ok(sitemap.includes('https://www.rhyshume.co.uk/engineering</loc>'));
  assert.ok(read('llms.txt').includes('https://www.rhyshume.co.uk/engineering'));
});
