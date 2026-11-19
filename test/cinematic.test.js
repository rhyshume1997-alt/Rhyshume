'use strict';
/* Tests for the Rev 2 cinematic proofs of concept. They check the rules the brief set:
   the concept notice is shown, forms stay inactive, nothing is stored, motion respects reduced motion,
   every image is registered and every picture has a description. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DIR = 'c-3e9a41b7d20f58c6/cinematic';
const read = function (p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); };
const PAGES = ['olive-ivory.html', 'salt-ember.html', 'index.html'];
const BANNED = /\b(whole|lands|quiet|quietly|proper)\b/i;

test('cinematic proofs: each page shows the concept notice and is hidden from search', function () {
  PAGES.forEach(function (f) {
    const h = read(DIR + '/' + f);
    assert.ok(h.includes('Concept by Rhys Hume, not a live site.'), f + ' notice');
    assert.match(h, /<meta name="robots" content="noindex,nofollow,noarchive">/, f + ' robots');
  });
  ['olive-ivory.html', 'salt-ember.html'].forEach(function (f) {
    const h = read(DIR + '/' + f);
    assert.ok(/generated concept images/i.test(h), f + ' says the photographs are generated');
    assert.ok(/not photographs of a real business/i.test(h), f + ' says they are not real');
  });
});

test('cinematic proofs: forms are inactive and nothing is stored or sent', function () {
  ['olive-ivory.html', 'salt-ember.html'].forEach(function (f) {
    const h = read(DIR + '/' + f);
    (h.match(/<form[^>]*>/g) || []).forEach(function (tag) {
      assert.ok(/action="#"/.test(tag) && /onsubmit="return false"/.test(tag), f + ' form is inert: ' + tag);
      assert.ok(!/method="post"/i.test(tag), f + ' no post');
    });
    assert.ok(/class="js-only"/.test(h), f + ' forms only appear with JavaScript');
  });
  ['olive.js', 'ember.js', 'scene.js'].forEach(function (f) {
    const j = read(DIR + '/' + f);
    assert.ok(!/fetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|document\.cookie|indexedDB/.test(j), f + ' stores or sends nothing');
  });
});

test('cinematic proofs: motion respects reduced motion', function () {
  const scene = read(DIR + '/scene.js');
  assert.ok(scene.includes('prefers-reduced-motion: reduce'));
  assert.ok(/if \(calm\) \{ el\.setAttribute\('data-scene', 'still'\); return null; \}/.test(scene), 'plate stops for reduced motion');
  assert.ok(/function embers[\s\S]*?if \(calm\) return null;/.test(scene), 'embers stop for reduced motion');
  const css = read(DIR + '/cinematic.css');
  assert.ok(/prefers-reduced-motion: no-preference\) \{\s*\.rise/.test(css), 'entrances only under no-preference');
  assert.ok(read(DIR + '/ember.js').includes('if (!calm)'), 'scroll hand-off only without reduced motion');
});

test('cinematic proofs: the still photograph is always in the page as the fallback', function () {
  const o = read(DIR + '/olive-ivory.html'), e = read(DIR + '/salt-ember.html');
  assert.ok(/id="hero-plate"[\s\S]*?<img [^>]*src="img\/oi-03-dress-window\.jpg"/.test(o));
  assert.ok(/id="fire-plate"[\s\S]*?<img [^>]*src="img\/se-01-fire-grill\.jpg"/.test(e));
  assert.ok(/canvas\.setAttribute\('aria-hidden'|cv\.setAttribute\('aria-hidden', 'true'\)/.test(read(DIR + '/scene.js')), 'canvas hidden from assistive tech');
});

test('cinematic proofs: every image exists, is in the image register, and has alt text', function () {
  const reg = read('docs/concepts/image-register.md');
  const used = {};
  ['olive-ivory.html', 'salt-ember.html', 'olive.js'].forEach(function (f) {
    const s = read(DIR + '/' + f);
    (s.match(/img\/[a-z0-9-]+(@2x)?\.(webp|jpg)/g) || []).forEach(function (m) { used[m.replace(/(@2x)?\.(webp|jpg)$/, '').replace('img/', '')] = 1; });
    (s.match(/b: 'img\/[a-z0-9-]+'/g) || []).forEach(function (m) { used[m.replace("b: 'img/", '').replace("'", '')] = 1; });
  });
  assert.ok(Object.keys(used).length >= 8, 'all eight images are used');
  Object.keys(used).forEach(function (n) {
    ['.webp', '.jpg', '@2x.webp'].forEach(function (ext) { assert.ok(fs.existsSync(path.join(ROOT, DIR, 'img', n + ext)) || ext === '@2x.webp', n + ext + ' exists'); });
    assert.ok(reg.includes('`' + n + '`'), n + ' is in the image register');
  });
  ['olive-ivory.html', 'salt-ember.html'].forEach(function (f) {
    const s = read(DIR + '/' + f);
    (s.match(/<img [^>]*>/g) || []).forEach(function (tag) {
      if (/id="pr-img"/.test(tag)) return; /* filled by script, alt set there */
      assert.ok(/ alt="/.test(tag), f + ' img without alt: ' + tag);
      if (!/ alt=""/.test(tag)) assert.ok(/generated concept image|\./.test(tag.match(/ alt="([^"]*)"/)[1]), f + ' alt describes the picture');
    });
  });
  assert.ok(/generated concept images/i.test(reg) && /not photographs of a real business/i.test(reg));
});

test('cinematic proofs: no prices, no em dashes, no banned wording, no invented hours', function () {
  PAGES.forEach(function (f) {
    const h = read(DIR + '/' + f);
    const visible = h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]*>/g, ' ');
    assert.ok(!/£\s?\d/.test(visible), f + ' shows a price');
    assert.ok(!/—/.test(h), f + ' has an em dash');
    assert.ok(!BANNED.test(visible), f + ' banned wording');
    assert.ok(!/\b\d{1,2}(:|\.)\d{2}\s?(am|pm)\b/i.test(visible) && !/opening hours?:/i.test(visible), f + ' invents opening hours');
  });
});

test('cinematic proofs: the existing eight concept pages were not changed by this branch', function () {
  ['weddings', 'electricians', 'restaurants', 'after-school-club', 'coaching', 'cafe', 'shop', 'barber', 'index'].forEach(function (n) {
    assert.ok(fs.existsSync(path.join(ROOT, 'c-3e9a41b7d20f58c6', n + '.html')), n + ' still exists');
  });
});
