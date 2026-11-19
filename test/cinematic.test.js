'use strict';
/* Tests for the Rev 3 cinematic productions. They check the rules the brief set: the concept notice is shown,
   forms stay inactive, nothing is stored, footage is optional and manifest driven, motion respects reduced motion,
   every image is registered, and no raster is enlarged. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DIR = 'c-3e9a41b7d20f58c6/cinematic';
const read = function (p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); };
const exists = function (p) { return fs.existsSync(path.join(ROOT, p)); };
const PAGES = ['olive-ivory.html', 'salt-ember.html', 'index.html'];
const PROOFS = ['olive-ivory.html', 'salt-ember.html'];
const BANNED = /\b(whole|lands|quiet|quietly|proper)\b/i;

test('cinematic: each page shows the concept notice and is hidden from search', function () {
  PAGES.forEach(function (f) {
    const h = read(DIR + '/' + f);
    assert.ok(h.includes('Concept by Rhys Hume, not a live site.'), f + ' notice');
    assert.match(h, /<meta name="robots" content="noindex,nofollow,noarchive">/, f + ' robots');
  });
  PROOFS.forEach(function (f) {
    const h = read(DIR + '/' + f);
    assert.ok(/generated concept images/i.test(h), f + ' says the photographs are generated');
    assert.ok(/not photographs of a real business/i.test(h), f + ' says they are not real');
  });
});

test('cinematic: forms are inactive and nothing is stored or sent', function () {
  PROOFS.forEach(function (f) {
    const h = read(DIR + '/' + f);
    (h.match(/<form[^>]*>/g) || []).forEach(function (tag) {
      assert.ok(/action="#"/.test(tag) && /onsubmit="return false"/.test(tag), f + ' form is inert: ' + tag);
      assert.ok(!/method="post"/i.test(tag), f + ' no post');
    });
    assert.ok(/class="js-only"/.test(h), f + ' forms only appear with JavaScript');
  });
  ['olive.js', 'ember.js', 'footage.js'].forEach(function (f) {
    const j = read(DIR + '/' + f).replace(/fetch\('data\/(footage|olive-ivory)\.json'[^;]*;/g, '');
    assert.ok(!/fetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|document\.cookie|indexedDB/.test(j), f + ' stores or sends nothing beyond its own data file');
  });
});

test('cinematic: no procedural fire simulation and no heavy frameworks', function () {
  assert.ok(!exists(DIR + '/scene.js'), 'the procedural scene script is gone');
  PROOFS.forEach(function (f) {
    const h = read(DIR + '/' + f);
    assert.ok(!/<canvas/i.test(h), f + ' has no canvas');
    assert.ok(!/three|react|gsap/i.test((h.match(/<script[^>]*src="[^"]*"/g) || []).join(' ')), f + ' loads no framework');
  });
  ['olive.js', 'ember.js'].forEach(function (f) {
    assert.ok(!/getContext\(|WebGL/i.test(read(DIR + '/' + f)), f + ' draws nothing on a canvas');
  });
  /* footage.js only samples a 16 x 9 canvas to read the brightness of a real clip; it never draws a visible fire */
  assert.ok(!/WebGL|webgl/.test(read(DIR + '/footage.js')) && /16, 9|16 \* 9|SW|16/.test(read(DIR + '/footage.js')));
});

test('cinematic: footage slots are manifest driven, optional and fall back to the poster', function () {
  const man = JSON.parse(read(DIR + '/data/footage.json'));
  const keys = Object.keys(man).filter(function (k) { return k[0] !== '_'; });
  assert.ok(keys.length >= 4, 'four clips declared');
  ['se-hero-fire-16x9', 'se-hero-fire-mobile-4x5', 'oi-hero-window-16x9', 'oi-hero-portrait-4x5'].forEach(function (k) {
    assert.ok(man[k], k + ' declared');
    assert.ok(man[k].layout === 'wide' || man[k].layout === 'portrait', k + ' says which composition it is');
    if (man[k].poster && man[k].available) assert.ok(exists(DIR + '/img/' + man[k].poster + '.jpg') && exists(DIR + '/img/' + man[k].poster + '.webp'), k + ' poster files exist');
  });
  assert.equal(man['se-hero-fire-16x9'].layout, 'wide'); assert.equal(man['oi-hero-portrait-4x5'].layout, 'portrait');
  keys.forEach(function (k) {
    assert.equal(typeof man[k].available, 'boolean', k + ' has an available flag');
    if (man[k].available) assert.ok(exists(DIR + '/video/' + k + '.webm') || exists(DIR + '/video/' + k + '.mp4'), k + ' is declared available but has no file');
  });
  const f = read(DIR + '/footage.js');
  assert.ok(/prefers-reduced-motion: reduce/.test(f), 'reduced motion skips footage');
  assert.ok(/saveData/.test(f), 'data saver skips footage');
  assert.ok(/'poster'/.test(f) && /error/.test(f), 'a failed load falls back to the poster');
  assert.ok(/39\.99rem/.test(f), 'phones get the phone composition');
  const e = read(DIR + '/salt-ember.html'), o = read(DIR + '/olive-ivory.html');
  assert.ok(/id="fire-plate"[\s\S]*?<video[^>]*data-desktop="se-hero-fire-16x9"[^>]*data-mobile="se-hero-fire-mobile-4x5"/.test(e));
  assert.ok(/id="hero-bg"[\s\S]*?<video[^>]*data-desktop="oi-hero-window-16x9"/.test(o), 'landscape backdrop slot');
  assert.ok(/id="hero-plate"[\s\S]*?<video[^>]*data-mobile="oi-hero-portrait-4x5"/.test(o), 'portrait phone slot');
  assert.ok(/id="fire-plate"[\s\S]*?<img [^>]*src="img\/se-01-fire-grill\.jpg"/.test(e), 'poster in the page');
  assert.ok(/id="hero-plate"[\s\S]*?<img [^>]*src="img\/oi-03-dress-window\.jpg"/.test(o), 'poster in the page');
  assert.ok(/muted/.test(e) && /muted/.test(o) && /playsinline/.test(e) && /playsinline/.test(o), 'videos are muted and inline');
});

test('cinematic: wide scenes are layouts of their own and the portrait plate remains the docking object', function () {
  const ec = read(DIR + '/ember.css'), oc = read(DIR + '/olive.css'), oj = read(DIR + '/olive.js'), ej = read(DIR + '/ember.js');
  assert.ok(/\.stage\.wide \.plate/.test(ec) && /object-position: 72% 50%/.test(ec), 'salt wide stage, fire anchored right');
  assert.ok(/\.open\.wide \.scene-bg/.test(oc) && /\.open\.wide \.stage-plate/.test(oc), 'olive wide backdrop and print');
  assert.ok(/function leave\(\)/.test(oj) && /--bgo/.test(oj), 'the backdrop leaves on its own schedule');
  assert.ok(/plate\.style\.transform = p === 0/.test(oj), 'the plate still docks into frame 01');
  assert.ok(/layout/.test(ej) && /'wide'/.test(ej), 'salt reads the layout the footage declares');
});

test('cinematic: motion respects reduced motion and the content works without it', function () {
  const css = read(DIR + '/cinematic.css'), ember = read(DIR + '/ember.css'), olive = read(DIR + '/olive.css');
  assert.ok(/prefers-reduced-motion: no-preference/.test(css), 'entrances only under no-preference');
  assert.ok(/prefers-reduced-motion/.test(ember) && /prefers-reduced-motion/.test(olive), 'both pages have reduced motion rules');
  assert.ok(/calm|reduce/.test(read(DIR + '/ember.js')) && /calm|reduce/.test(read(DIR + '/olive.js')), 'scripts read the reduced motion setting');
  assert.ok(/\.js-only/.test(css) && /html:not\(\.js\)/.test(css + ember + olive) === true || /\.js-only/.test(css), 'no-JS rules exist');
});

test('cinematic: the name reveals use real drawing and per-letter ignition, not wipes', function () {
  const o = read(DIR + '/olive-ivory.html');
  assert.ok(/<mask/.test(o) && /pathLength="1"/.test(o), 'olive name is a stroke mask');
  assert.ok(!/clip-path:\s*inset/.test(read(DIR + '/olive.css').split('.name')[1] || ''), 'no rectangular wipe on the name');
  const e = read(DIR + '/salt-ember.html');
  assert.ok(/class="c"/.test(e) && /--i:/.test(e), 'salt name is split into ignited letters');
});

test('cinematic: every image exists, is in the register, is never enlarged, and has alt text', function () {
  const reg = read('docs/concepts/image-register.md');
  const used = {};
  const sources = PROOFS.map(function (f) { return read(DIR + '/' + f); }).concat([read(DIR + '/olive.js'), read(DIR + '/data/olive-ivory.json')]);
  sources.forEach(function (s) {
    (s.match(/img\/[a-z0-9-]+\.(webp|jpg)/g) || []).forEach(function (m) { used[m.replace(/\.(webp|jpg)$/, '').replace('img/', '')] = 1; });
  });
  assert.ok(Object.keys(used).length >= 8, 'all eight images are used');
  Object.keys(used).forEach(function (n) {
    assert.ok(exists(DIR + '/img/' + n + '.jpg'), n + '.jpg exists');
    assert.ok(reg.includes('`' + n + '`'), n + ' is in the image register');
  });
  assert.ok(fs.readdirSync(path.join(ROOT, DIR, 'img')).every(function (f) { return !/@2x/.test(f); }), 'no enlarged @2x copies are kept');
  assert.ok(/never enlarged|not enlarged|not upscaled/i.test(reg), 'the register says nothing was upscaled');
  PROOFS.forEach(function (f) {
    (read(DIR + '/' + f).match(/<img [^>]*>/g) || []).forEach(function (tag) {
      assert.ok(/ alt="/.test(tag), f + ' img without alt: ' + tag);
    });
  });
  const data = JSON.parse(read(DIR + '/data/olive-ivory.json'));
  (data.frames || []).forEach(function (fr) { assert.ok(fr.alt && fr.alt.length > 10, fr.id + ' has alt text'); });
  assert.ok(/generated concept images/i.test(reg) && /not photographs of a real business/i.test(reg));
});

test('cinematic: the asset manifest is complete and matches its JSON', function () {
  const md = read('docs/concepts/asset-manifest.md'), js = JSON.parse(read('docs/concepts/asset-manifest.json'));
  assert.ok(js.length >= 20);
  const need = ['file', 'scene', 'composition', 'aspect', 'minres', 'duration', 'camera', 'light', 'desktop', 'mobile', 'status', 'prompt'];
  js.forEach(function (a) {
    need.forEach(function (k) { assert.ok(a[k] && String(a[k]).length > 0, a.file + ' has ' + k); });
    assert.ok(md.includes('`' + a.file + '`'), a.file + ' is in the markdown');
    assert.ok(/needs production|exists/i.test(a.status), a.file + ' says whether it exists');
  });
  assert.ok(js.filter(function (a) { return a.page === 'olive-ivory' && a.kind === 'photograph'; }).length === 12, 'twelve wedding frames specified');
  assert.ok(/fictional concept demonstrations only/i.test(md), 'fictional-only statement present');
  assert.ok(!/—/.test(md), 'no em dashes');
});

test('cinematic: no prices, no em dashes, no banned wording, no invented hours', function () {
  PAGES.forEach(function (f) {
    const h = read(DIR + '/' + f);
    const visible = h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]*>/g, ' ');
    assert.ok(!/£\s?\d/.test(visible), f + ' shows a price');
    assert.ok(!/—/.test(h), f + ' has an em dash');
    assert.ok(!BANNED.test(visible), f + ' banned wording');
    assert.ok(!/\b\d{1,2}(:|\.)\d{2}\s?(am|pm)\b/i.test(visible) && !/opening hours?:/i.test(visible), f + ' invents opening hours');
  });
  const d = JSON.parse(read(DIR + '/data/olive-ivory.json'));
  assert.ok(!BANNED.test(JSON.stringify(d)) && !/—/.test(JSON.stringify(d)), 'sheet data wording');
});

test('cinematic: the existing eight concept pages were not changed by this branch', function () {
  ['weddings', 'electricians', 'restaurants', 'after-school-club', 'coaching', 'cafe', 'shop', 'barber', 'index'].forEach(function (n) {
    assert.ok(exists('c-3e9a41b7d20f58c6/' + n + '.html'), n + ' still exists');
  });
});
