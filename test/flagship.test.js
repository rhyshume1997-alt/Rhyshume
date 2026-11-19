'use strict';
/* The flagship pass: the design concepts page, the concepts strip and the building example on the home page.
   The concepts are fictional and their working demonstrations stay private: nothing public may link to the hidden route. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = p => fs.existsSync(path.join(ROOT, p));
const text = h => h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]*>/g, ' ');
const SLUGS = ['olive-ivory', 'bright-circuit', 'salt-ember', 'sunny-hours', 'clear-ground', 'little-kettle', 'corner-shelf', 'oak-razor'];
const dc = read('design-concepts.html'), home = read('index.html');
const BANNED = /\b(whole|lands|quiet|quietly|proper)\b/i;

test('design concepts: all eight exhibits, each labelled as a concept and not a live site', function () {
  SLUGS.forEach(function (s) {
    const m = dc.match(new RegExp('<article class="ex[^"]*" id="' + s + '"[\\s\\S]*?</article>'));
    assert.ok(m, s + ' exhibit');
    assert.ok(m[0].includes('Concept by Rhys Hume, not a live site.'), s + ' notice');
    assert.ok(/a made-up business/.test(m[0]) && /generated concept material/.test(m[0]), s + ' says it is made up and generated');
    assert.ok(/<video[^>]*muted[^>]*loop[^>]*playsinline[^>]*preload="none"/.test(m[0]), s + ' video is muted, looping, inline and not preloaded');
    assert.ok(/class="ex-play"[^>]*aria-pressed/.test(m[0]), s + ' has a play control');
    assert.ok(/<img class="ex-phone"[^>]*alt="[^"]{10,}/.test(m[0]), s + ' phone view has alt text');
    ['-poster.webp', '-thumb.webp', '-phone.webp'].forEach(function (x) { assert.ok(exists('images/concepts/' + s + x), s + x); });
    ['.webm', '.mp4'].forEach(function (x) { assert.ok(exists('video/concepts/' + s + x), s + x); });
  });
  assert.equal((dc.match(/<article class="ex /g) || []).length, 8);
  assert.ok(/Concept by Rhys Hume, not a live site\./.test(text(dc.match(/<aside class="dc-notice[\s\S]*?<\/aside>/)[0])), 'read this first box');
  assert.ok(/None of these are real businesses or past clients/.test(dc), 'separated from real work');
});

test('design concepts: the hidden concept routes are not linked from any public page and demos are preview only', function () {
  ['c-3e9a41b7d20f58c6', 'c-09b37e50c043baaa', 'w-82503121e7fdf54e'].forEach(function (h) {
    assert.ok(!dc.includes(h) && !home.includes(h), h + ' in the public HTML');
    assert.ok(!read('design-concepts.js').includes(h) && !read('home.js').includes(h), h + ' in the public scripts');
  });
  assert.ok(/<a class="demo-link" data-slug="[a-z-]+" hidden>/.test(dc), 'demo links start hidden');
  const js = read('design-concepts.js');
  assert.ok(/vercel\\.app/.test(js) && /localhost/.test(js) && /design-concepts-private\.js/.test(js), 'demo links are enabled only on preview hosts');
  assert.ok(/Delete this file before any launch/.test(read('design-concepts-private.js')), 'the private file says to delete it');
  assert.ok(/not public/.test(dc), 'the page says the demonstration is not public');
});

test('design concepts: metadata, sitemap, navigation and links', function () {
  assert.ok(/<title>[^<]{10,70}<\/title>/.test(dc));
  const d = dc.match(/<meta name="description" content="([^"]+)"/); assert.ok(d && d[1].length <= 160, 'description length');
  assert.ok(dc.includes('<link rel="canonical" href="https://www.rhyshume.co.uk/design-concepts">'));
  assert.ok(!/noindex/.test(dc), 'the portfolio page itself is meant to be indexable once approved');
  assert.ok(read('sitemap.xml').includes('https://www.rhyshume.co.uk/design-concepts'));
  assert.ok(/<a href="\/design-concepts">Design concepts<\/a>/.test(home), 'home nav');
  ['about.html', 'contact.html', 'engineering.html', 'tolra.html', 'csv.html', 'automation.html', 'local-business.html', 'websites.html'].forEach(function (f) { assert.ok(read(f).includes('href="/design-concepts"'), f + ' nav'); });
  assert.equal((dc.match(/<h1[ >]/g) || []).length, 1);
  assert.ok(dc.includes('href="tel:+447908041480"') && dc.includes('href="/contact"'), 'contact routes kept');
});

test('home page: the building example, the routes, the concepts strip and the real-work divider', function () {
  assert.ok(/<figure class="build[^"]*"[^>]*id="build"/.test(home));
  assert.equal((home.match(/data-mode="(call|quote|book)"/g) || []).length, 3, 'three ways to get in touch');
  assert.ok(/Concept by Rhys Hume, not a live site\./.test(home.match(/<figure class="build[\s\S]*?<\/figure>/)[0]), 'example is labelled');
  assert.equal((home.match(/<ol class="cc-strip">[\s\S]*?<\/ol>/)[0].match(/<li/g) || []).length, 8, 'eight concepts in the strip');
  assert.ok(/Eight websites that don&rsquo;t exist/.test(home));
  assert.ok(home.indexOf('class="concepts"') < home.indexOf('class="kind"') && home.indexOf('class="kind"') < home.indexOf('class="proof"'), 'concepts come before the real work divider');
  assert.ok(/Real work and work in progress/.test(home));
  assert.ok(home.includes('Websites that get Glasgow trades more calls and quotes'), 'approved headline kept');
  assert.ok(home.includes('"@type": "Person"') && home.includes('+447908041480'), 'structured data and phone kept');
});

test('flagship: copy rules and flat design rules hold in the new files', function () {
  [dc, read('design-concepts.js'), read('design-concepts.css')].forEach(function (s) { assert.ok(!/—/.test(s), 'em dash'); });
  assert.ok(!BANNED.test(text(dc)), 'banned word');
  const css = read('design-concepts.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/gradient|backdrop-filter|blur\(|text-shadow|box-shadow|drop-shadow/i.test(css), 'gradient, glow or blur');
  css.match(/transition:[^;]+;/g).forEach(function (t) { t.replace(/^transition:/, '').split(/,(?![^(]*\))/).forEach(function (p) { assert.ok(/^\s*(none;?$|transform\b|opacity\b)/.test(p), 'transition on ' + p.trim()); }); });
  assert.ok(/prefers-reduced-motion/.test(read('design-concepts.css')) && /calm/.test(read('design-concepts.js')), 'reduced motion handled');
  assert.ok(!/fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|document\.cookie/.test(read('design-concepts.js')), 'no network or storage');
});
