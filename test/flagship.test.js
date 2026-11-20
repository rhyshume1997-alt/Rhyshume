'use strict';
/* Rev 2 release: the redesigned home page, the four featured concepts, and the public portfolio at /website-concepts/ with
   eight working demonstrations. The development copies stay hidden and are never deployed. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = p => fs.existsSync(path.join(ROOT, p));
const text = h => h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]*>/g, ' ');
const SLUGS = ['olive-ivory', 'bright-circuit', 'salt-ember', 'sunny-hours', 'clear-ground', 'little-kettle', 'corner-shelf', 'oak-razor'];
const FEATURED = ['sunny-hours', 'little-kettle', 'bright-circuit', 'corner-shelf'];
const home = read('index.html'), port = read('website-concepts/index.html');
const BANNED = /\b(whole|lands|quiet|quietly|proper)\b/i;
const HIDDEN = ['c-3e9a41b7d20f58c6', 'c-09b37e50c043baaa', 'w-82503121e7fdf54e'];

test('public portfolio: eight exhibits, each labelled as a concept, each linking to its public demonstration', function () {
  assert.equal((port.match(/<article class="ex /g) || []).length, 8);
  SLUGS.forEach(function (s) {
    const m = port.match(new RegExp('<article class="ex[^"]*" id="' + s + '"[\\s\\S]*?</article>')); assert.ok(m, s);
    assert.ok(m[0].includes('a made-up business') && m[0].includes('Generated concept footage'), s + ' is labelled as made up with generated footage beside it');
    assert.ok(m[0].includes('href="/website-concepts/' + s + '">Explore this concept<'), s + ' explore link');
    assert.ok(m[0].includes('href="/contact">Want something like this for your business?<'), s + ' enquiry link uses the existing contact process');
    assert.ok(/<video[^>]*muted[^>]*loop[^>]*playsinline[^>]*preload="none"/.test(m[0]), s + ' video');
    assert.ok(/<img class="ex-phone"[^>]*alt="[^"]{10,}/.test(m[0]), s + ' phone alt');
  });
  assert.ok(port.includes('Concept by Rhys Hume, not a live site.') && /fictional demonstrations, not client projects or real businesses/.test(port), 'one page level notice, separated from real work');
  assert.ok(/not part of the starting prices/.test(port), 'does not imply the advanced features are in the starting price');
});

test('public demonstrations: all eight exist, are labelled, safe and self contained', function () {
  const man = JSON.parse(read('website-concepts/data/footage.json'));
  SLUGS.forEach(function (s) {
    assert.ok(exists('website-concepts/' + s + '.html'), s + ' page');
    const h = read('website-concepts/' + s + '.html');
    assert.ok(h.includes('Concept by Rhys Hume, not a live site.'), s + ' notice');
    assert.ok(h.includes('<meta name="robots" content="noindex,follow">'), s + ' is noindex so a made-up business is never indexed as real');
    assert.ok(h.includes('<link rel="canonical" href="https://www.rhyshume.co.uk/website-concepts/' + s + '">'), s + ' canonical');
    HIDDEN.forEach(function (x) { assert.ok(!h.split('<a href="/w-82503121e7fdf54e/" rel="nofollow">Client login</a>').join('').includes(x), s + ' mentions ' + x); });
    (h.match(/<form[^>]*>/g) || []).forEach(function (tag) { assert.ok(/action="#"/.test(tag) && /onsubmit="return false"/.test(tag), s + ' form not inert: ' + tag); });
    assert.ok(!/href="tel:|href="mailto:|action="http/i.test(h), s + ' has a real phone, mail or form target');
    (h.match(/(?:src|srcset|href)="((?:img|video|fonts|data)\/[^"]+)"/g) || []).forEach(function (m) { const f = m.replace(/^[a-z]+="/, '').replace(/"$/, ''); assert.ok(exists('website-concepts/' + f), s + ' missing ' + f); });
    assert.ok(!/—/.test(h), s + ' em dash');
  });
  Object.keys(man).filter(k => k[0] !== '_').forEach(function (k) { if (man[k].available) ['.webm', '.mp4'].forEach(function (e) { assert.ok(exists('website-concepts/video/' + k + e), k + e); }); });
  SLUGS.forEach(function (s) { ['css', 'js'].forEach(function (e) { const n = s === 'olive-ivory' ? 'olive' : s === 'salt-ember' ? 'ember' : s; const f = n + '.' + e; assert.equal(read('website-concepts/' + f), read('c-3e9a41b7d20f58c6/cinematic/' + f), f + ' matches the development copy'); }); });
  assert.equal(read('website-concepts/footage.js'), read('c-3e9a41b7d20f58c6/cinematic/footage.js'));
  ['website-concepts/portfolio.js', 'website-concepts/footage.js'].forEach(function (f) { assert.ok(!/localStorage|sessionStorage|document\.cookie|sendBeacon/.test(read(f)), f + ' stores something'); });
});

test('deployment: development copies are not deployed, the workbook and hidden routes are not linked, indexing decisions are explicit', function () {
  const ig = read('.vercelignore'); assert.ok(/^c-3e9a41b7d20f58c6\/cinematic$/m.test(ig), 'development concepts are not deployed');
  assert.ok(/^test$/m.test(ig) && /^docs$/m.test(ig), 'tests and docs are not deployed');
  const v = JSON.parse(read('vercel.json')); const rule = v.headers.find(h => /website-concepts/.test(h.source)); assert.ok(rule && rule.headers.some(h => h.key === 'X-Robots-Tag' && /noindex/.test(h.value) && !/nofollow/.test(h.value)), 'demonstrations carry noindex, follow');
  ['w-82503121e7fdf54e', 'c-09b37e50c043baaa'].forEach(function (d) { assert.ok(v.headers.some(h => h.source.includes(d) && h.headers.some(x => /noindex/.test(x.value))), d + ' still noindex'); });
  const sm = read('sitemap.xml'); assert.ok(sm.includes('https://www.rhyshume.co.uk/website-concepts/</loc>'), 'portfolio in the sitemap');
  SLUGS.forEach(function (s) { assert.ok(!sm.includes('/website-concepts/' + s), s + ' demonstration is not in the sitemap'); });
  assert.ok(!sm.includes('c-3e9a41b7d20f58c6'), 'hidden route not in the sitemap');
  assert.ok(port.includes('<link rel="canonical" href="https://www.rhyshume.co.uk/website-concepts/">') && !/noindex/.test(port), 'the portfolio itself is indexable');
  [home, port].concat(['about', 'contact', 'engineering', 'tolra', 'csv', 'automation', 'local-business', 'websites'].map(f => read(f + '.html'))).forEach(function (h) { HIDDEN.forEach(function (x) { assert.ok(!h.split('<a href="/w-82503121e7fdf54e/" rel="nofollow">Client login</a>').join('').includes(x), 'public page links ' + x); }); });
  assert.ok(!exists('design-concepts.html') && !exists('design-concepts-private.js'), 'the earlier preview-only files are gone');
});

test('navigation: the portfolio is in the main menu of every public page', function () {
  ['index', 'about', 'contact', 'engineering', 'tolra', 'csv', 'automation', 'local-business', 'websites'].forEach(function (f) { assert.ok(/<a href="\/website-concepts\/"[^>]*>Website concepts<\/a>/.test(read(f + '.html').split('</header>')[0]), f + ' menu'); });
  assert.ok(/<a href="\/website-concepts\/" aria-current="page">Website concepts<\/a>/.test(port));
});

test('home page: four featured concepts, editorial and interactive, with the two required actions each', function () {
  FEATURED.forEach(function (s) {
    const m = home.match(new RegExp('<article class="ft ft-[a-z]+ rv" id="ft-' + s + '"[\\s\\S]*?</article>')); assert.ok(m, s + ' featured');
    assert.ok(m[0].includes('href="/website-concepts/' + s + '">Explore this concept<'), s + ' explore');
    assert.ok(m[0].includes('href="/contact">Want something like this for your business?<'), s + ' enquiry');
    assert.ok(/<p class="ft-note">A fictional /.test(m[0]), s + ' says it is fictional');
    assert.ok(/class="ft-demo"/.test(m[0]) && /<video class="mv"/.test(m[0]) && /class="mv-btn"/.test(m[0]), s + ' demo and footage');
    assert.ok(/data-webm="\/website-concepts\/video\//.test(m[0]), s + ' uses the shared footage');
  });
  assert.equal((home.match(/<article class="ft /g) || []).length, 4);
  const order = FEATURED.map(s => home.indexOf('id="ft-' + s + '"')); assert.deepEqual(order.slice().sort((a, b) => a - b), order, 'order: Sunny Hours, Little Kettle, Bright Circuit, The Corner Shelf');
  assert.ok(home.indexOf('class="proof"') < home.indexOf('Made-up concepts and demonstrations, not clients') && home.indexOf('Made-up concepts and demonstrations, not clients') < home.indexOf('class="featured"'), 'real work comes first, and a labelled divider separates it from the made-up concepts (business review: real versus fictional)');
  assert.ok(/Real work and work in progress/.test(home) && /Four made-up websites/.test(home) && home.slice(home.indexOf('class="featured"'), home.indexOf('id="ft-sunny-hours"')).includes('Concept by Rhys Hume, not live sites.'), 'the featured section carries the notice once');
  assert.equal((home.match(/<ol class="cc-strip">[\s\S]*?<\/ol>/)[0].match(/<li/g) || []).length, 8, 'all eight in the strip');
});

test('home page: positioning, prices, scope clarity and contact routes', function () {
  assert.ok(/Make your business easier to find\. And easier to run\./.test(home));
  ['Customers can&rsquo;t find you', 'Your website doesn&rsquo;t bring in enquiries', 'Admin eats the week', 'Work is spread across disconnected systems'].forEach(function (c) { assert.ok(home.includes(c), c); });
  assert.ok(home.includes('href="/csv"'), 'validation still linked');
  assert.ok(home.includes('From £1,500 one-off') && home.includes('From £3,800 one-off') && home.includes('From £35 a month'), 'live starting prices kept');
  assert.ok(!/£2,200|£60 a month/.test(home), 'prices are not changed without approval');
  assert.ok(/Not in these starting prices/.test(home) && /film openings, custom interactions/.test(home), 'advanced work is not implied to be included');
  assert.ok(home.includes('href="tel:+447908041480"') && home.includes('href="mailto:rhys@rhyshume.co.uk"') && home.includes('calendar.google.com/calendar/appointments'), 'contact routes');
  assert.ok(/data-mode="plan"/.test(home) && (home.match(/data-mode="/g) || []).length === 4, 'building example with four jobs');
  assert.ok(home.includes('"@type": "Person"') && /rdhcoaching\.com/.test(home) && home.includes('/work/jnr-engineering'), 'real work and structured data kept');
  assert.ok(/After: new build, launching soon/.test(home), 'Marpet stays labelled launching soon');
  assert.ok(!/—/.test(home + read('featured.js') + read('featured.css')), 'em dash');
  assert.ok(!BANNED.test(text(home)), 'banned word');
  const t = text(home); assert.ok(!/AI automation|chatgpt|ai listing/i.test(t));
});

test('featured scripts and styles: flat, safe, reduced motion respected', function () {
  const css = read('featured.css').replace(/\/\*[\s\S]*?\*\//g, ''), js = read('featured.js');
  assert.ok(!/gradient|backdrop-filter|blur\(|text-shadow|box-shadow|drop-shadow/i.test(css), 'gradient, glow or blur');
  assert.ok(/prefers-reduced-motion/.test(css) && /calm/.test(js) && /saveData/.test(js), 'reduced motion and data saver');
  assert.ok(!/fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|document\.cookie|sendBeacon/.test(js), 'no network or storage');
  assert.ok(/Demonstration only, no payment/.test(read('index.html')) && /Nothing is sent, booked, bought or saved/.test(read('index.html')));
});
