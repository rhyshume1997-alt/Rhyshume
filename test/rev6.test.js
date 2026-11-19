'use strict';
/* Rev 6: the eight cinematic concept websites. Static checks on every page: notices, search hiding, inert forms,
   nothing stored or sent, registered media, honest copy. Behaviour (keyboard, motion, video, axe) is covered by the
   browser checks recorded in the review, not here. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DIR = 'c-3e9a41b7d20f58c6/cinematic';
const read = function (p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); };
const exists = function (p) { return fs.existsSync(path.join(ROOT, p)); };
const SLUGS = ['olive-ivory', 'bright-circuit', 'salt-ember', 'sunny-hours', 'clear-ground', 'little-kettle', 'corner-shelf', 'oak-razor'];
const KEYS = { 'olive-ivory': 'oi-hero-window-16x9', 'bright-circuit': 'bright-circuit-16x9', 'salt-ember': 'se-hero-fire-16x9', 'sunny-hours': 'sunny-hours-16x9', 'clear-ground': 'clear-ground-16x9', 'little-kettle': 'little-kettle-16x9', 'corner-shelf': 'corner-shelf-16x9', 'oak-razor': 'oak-razor-16x9' };
const BANNED = /\b(whole|lands|quiet|quietly|proper)\b/i;
const SCRIPTS = { 'olive-ivory': ['olive.js'], 'salt-ember': ['ember.js'] };
const STYLES = { 'olive-ivory': 'olive.css', 'salt-ember': 'ember.css' };
function cssOf(s) { return read(DIR + '/' + (STYLES[s] || s + '.css')); }
function scriptsOf(s) { return ['footage.js'].concat(SCRIPTS[s] || [s + '.js']); }
function visible(h) { return h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' '); }

test('rev6: all eight pages exist with their files and are linked from the index', function () {
  const idx = read(DIR + '/index.html');
  SLUGS.forEach(function (s) {
    assert.ok(exists(DIR + '/' + s + '.html'), s + '.html');
    assert.ok(idx.includes('href="' + s + '.html"'), s + ' is in the index');
    scriptsOf(s).forEach(function (f) { assert.ok(exists(DIR + '/' + f), s + ' needs ' + f); });
  });
});

test('rev6: every page carries the concept notice, is hidden from search and has one h1', function () {
  SLUGS.concat(['index']).forEach(function (s) {
    const h = read(DIR + '/' + s + '.html');
    assert.ok(h.includes('Concept by Rhys Hume, not a live site.'), s + ' notice');
    assert.match(h, /<meta name="robots" content="noindex,nofollow,noarchive">/, s + ' robots');
    assert.match(h, /<html lang="en-GB">/, s + ' lang');
    assert.equal((h.match(/<h1[\s>]/g) || []).length, 1, s + ' h1 count');
    assert.ok(/class="skip"/.test(h) || s === 'index', s + ' skip link');
  });
});

test('rev6: forms are inert and nothing is stored or sent', function () {
  SLUGS.forEach(function (s) {
    const h = read(DIR + '/' + s + '.html');
    (h.match(/<form[^>]*>/g) || []).forEach(function (tag) {
      assert.ok(/action="#"/.test(tag) && /onsubmit="return false"/.test(tag), s + ' form is inert: ' + tag);
      assert.ok(!/method="post"/i.test(tag), s + ' no post');
    });
    assert.ok(!/href="tel:|href="mailto:|action="http/i.test(h), s + ' has no real phone, mail or form target');
    scriptsOf(s).forEach(function (f) {
      const j = read(DIR + '/' + f).replace(/fetch\('data\/(footage|olive-ivory)\.json'[^;]*;/g, '');
      assert.ok(!/fetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|document\.cookie|indexedDB|navigator\.share|WebSocket/.test(j), s + ' / ' + f + ' stores or sends nothing');
    });
  });
});

test('rev6: each hero slot names a registered clip with files and a poster', function () {
  const man = JSON.parse(read(DIR + '/data/footage.json'));
  SLUGS.forEach(function (s) {
    const key = KEYS[s], h = read(DIR + '/' + s + '.html');
    assert.ok(man[key] && man[key].available === true, key + ' registered and available');
    assert.equal(man[key].layout, 'wide', key + ' is the wide composition');
    ['.webm', '.mp4'].forEach(function (e) {
      assert.ok(exists(DIR + '/video/' + key + e), key + e);
      assert.ok(fs.statSync(path.join(ROOT, DIR, 'video', key + e)).size < 3 * 1024 * 1024, key + e + ' under 3 MB');
    });
    ['.webp', '.jpg'].forEach(function (e) { assert.ok(exists(DIR + '/img/' + man[key].poster + e), key + ' poster' + e); });
    assert.ok(h.includes('data-desktop="' + key + '"'), s + ' video slot uses ' + key);
    assert.ok(new RegExp('<video[^>]*muted[^>]*playsinline[^>]*aria-hidden="true"|<video[^>]*playsinline[^>]*muted[^>]*aria-hidden="true"').test(h), s + ' video is muted, inline and hidden from assistive tech');
    assert.ok(/img\/[a-z0-9-]*16x9\.jpg/.test(h), s + ' has the poster in the markup');
    assert.ok(/footage\.js/.test(h), s + ' loads the footage script');
  });
});

test('rev6: no stretched portrait video and no unregistered media', function () {
  SLUGS.forEach(function (s) {
    const css = cssOf(s).concat(read(DIR + '/cinematic.css')).replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(!/video[^{}]*\{[^}]*object-fit:\s*fill/.test(css), s + ' does not stretch video');
    const h = read(DIR + '/' + s + '.html');
    (h.match(/(?:src|srcset)="(img\/[^"]+)"/g) || []).forEach(function (m) {
      const f = m.replace(/^(src|srcset)="/, '').replace(/"$/, '');
      assert.ok(exists(DIR + '/' + f), s + ' refers to a missing image ' + f);
    });
    (h.match(/<img [^>]*>/g) || []).forEach(function (tag) { assert.ok(/ alt="/.test(tag), s + ' img without alt: ' + tag); });
  });
});

test('rev6: honest copy, no invented prices, hours, numbers, credentials, no em dashes or banned words', function () {
  SLUGS.forEach(function (s) {
    const h = read(DIR + '/' + s + '.html');
    const js = read(DIR + '/' + (SCRIPTS[s] || [s + '.js'])[0]);
    const v = visible(h);
    assert.ok(!/£\s?\d/.test(v + js), s + ' shows a price');
    assert.ok(!/—/.test(h + js + cssOf(s)), s + ' has an em dash');
    assert.ok(!BANNED.test(v), s + ' banned wording in page text');
    assert.ok(!/\b(whole|lands|quiet|quietly|proper)\b/i.test((js.match(/(['"`])(?:(?!\1)[^\\\n]|\\.){12,}\1/g) || []).join(' ')), s + ' banned wording in script strings');
    assert.ok(!/\b(NICEIC|NAPIT|Gas Safe|Part P|DBS[- ]checked|Ofsted|OFSTED|insured and|fully insured|award[- ]winning|five[- ]star|5[- ]star|rated \d)/i.test(v + js), s + ' invents a credential, award or rating');
    assert.ok(!/\b(0\d{3,4}[ -]?\d{3}[ -]?\d{3,4}|\+44[ \d]{8,})\b/.test(v), s + ' shows a phone number');
    assert.ok(!/opening hours?:|open (monday|mon|daily|every)|\b\d{1,2}(:|\.)\d{2}\s?(am|pm)\b/i.test(v) || s === 'olive-ivory', s + ' invents opening hours');
  });
});

test('rev6: reduced motion rules exist on every page and the page works without a script', function () {
  SLUGS.forEach(function (s) {
    const css = (SCRIPTS[s] ? SCRIPTS[s].map(function (f) { return read(DIR + '/' + f.replace('.js', '.css')); }).join('') : read(DIR + '/' + s + '.css')) + read(DIR + '/cinematic.css');
    assert.ok(/prefers-reduced-motion/.test(css), s + ' has reduced motion rules');
    const j = scriptsOf(s).map(function (f) { return read(DIR + '/' + f); }).join('\n');
    assert.ok(/prefers-reduced-motion|Footage\.calm|calm/.test(j), s + ' scripts read the reduced motion setting');
    const h = read(DIR + '/' + s + '.html');
    assert.ok(/classList\.add\("js"/.test(h), s + ' marks js');
  });
});

test('rev6: the asset register lists every clip and poster', function () {
  const reg = read('docs/concepts/asset-register.md');
  Object.keys(KEYS).forEach(function (s) { assert.ok(reg.includes(KEYS[s]), KEYS[s] + ' in the asset register'); });
  assert.ok(/736 x 400/.test(reg) && /not upscaled|never upscaled|not enlarged/i.test(reg), 'register states the clip size and no upscaling');
});
