'use strict';

// Run with: node --test
// Checks on the preview generator (tools/preview.js) and on every preview page saved under /preview.
// The generator is run against a made-up firm with a faked fetch and a faked Claude reply, so
// nothing here touches the network or needs ANTHROPIC_API_KEY.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const gen = require('../tools/preview.js');

const ROOT = path.join(__dirname, '..');
const read = function (p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); };

// ---------------------------------------------------------------- a made-up firm and a faked network

const SITE = 'https://www.hartley-metalwork.test';
const PAGES = {};
PAGES[SITE + '/'] = '<html><head><title>Welcome | Hartley Metalwork</title></head><body>' +
  '<img class="site-logo" src="/img/logo.png" alt="Hartley Metalwork logo">' +
  '<nav><a href="/services">Services</a> <a href="/about-us">About us</a> <a href="/contact">Contact</a> <a href="https://other.test/x">Other</a></nav>' +
  '<h1>Metalwork in Hamilton</h1><p>Family workshop in Hamilton, South Lanarkshire. We turn, mill and fabricate parts from your drawings.</p>' +
  '<img src="/img/shop.jpg" alt="The workshop floor" width="800" height="600">' +
  '<img src="https://cdn.stock.test/people.jpg" alt="Smiling people" width="800" height="600">' +
  '<a href="tel:+441698123456">01698 123456</a></body></html>';
PAGES[SITE + '/services'] = '<html><body><h1>Services</h1><h2>Milling</h2><p>CNC milling of steel and aluminium.</p><h2>Turning</h2><p>CNC turning up to 300 mm.</p><h2>Fabrication</h2><p>Welded fabrication.</p><img src="/img/mill.jpg" alt="" width="640" height="480"></body></html>';
PAGES[SITE + '/about-us'] = '<html><body><h1>About us</h1><p>Hartley Metalwork is a workshop in Hamilton. We work from drawings.</p></body></html>';
PAGES[SITE + '/contact'] = '<html><body><h1>Contact</h1><p>Email <a href="mailto:office@hartley-metalwork.test">office@hartley-metalwork.test</a> or ring 01698 123456.</p></body></html>';
PAGES['https://www.rival-engineering.test/'] = '<html><head><title>Rival Engineering</title></head><body><h1>Rival Engineering</h1><p>Turning and welding in Glasgow.</p></body></html>';

const GOOD = {
  headline: 'Milling, turning and fabrication in Hamilton',
  intro: 'A workshop in Hamilton, South Lanarkshire. We make parts from your drawings.',
  area: 'Hamilton, South Lanarkshire.',
  about: 'Hartley Metalwork is a workshop in Hamilton. We work from drawings.',
  services: [
    { title: 'Milling', text: 'CNC milling of steel and aluminium.' },
    { title: 'Turning', text: 'CNC turning up to 300 mm.' },
    { title: 'Fabrication', text: 'Welded fabrication.' }
  ],
  comparison: 'Both sites list turning. Only Hartley Metalwork lists milling and fabrication.'
};

function fakeNetwork(replies) {
  const calls = { api: [], pages: [] };
  const queue = replies.slice();
  const fetchImpl = async function (url, opts) {
    if (String(url).startsWith('https://api.anthropic.com/')) {
      const body = JSON.parse(opts.body);
      calls.api.push(body);
      const next = queue.shift();
      const text = typeof next === 'string' ? next : JSON.stringify(next);
      return { ok: true, status: 200, json: async function () { return { content: [{ type: 'text', text: text }] }; }, text: async function () { return text; } };
    }
    calls.pages.push(String(url));
    const html = PAGES[String(url)];
    if (!html) return { ok: false, status: 404, url: url, headers: { get: function () { return 'text/html'; } }, text: async function () { return ''; } };
    return { ok: true, status: 200, url: url, headers: { get: function () { return 'text/html; charset=utf-8'; } }, text: async function () { return html; } };
  };
  return { fetchImpl: fetchImpl, calls: calls };
}

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'preview-test-')); }

async function generate(reply, extra) {
  const net = fakeNetwork(Array.isArray(reply) ? reply : [reply]);
  const outRoot = tmp();
  const r = await gen.run(Object.assign({
    url: SITE + '/', slug: 'hartley-metalwork', apiKey: 'test-key', fetchImpl: net.fetchImpl, outRoot: outRoot, today: '2026-11-11', measure: false
  }, extra || {}));
  r.net = net; r.outRoot = outRoot;
  return r;
}

function visibleChunks(html) {
  return html.replace(/<head>[\s\S]*?<\/head>/i, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .split(/<[^>]*>/).map(function (t) { return gen.htmlToText(t); }).filter(Boolean);
}

// ---------------------------------------------------------------- the generated page

test('the page is noindex, has the banner, and uses the house stylesheet', async function () {
  const r = await generate(GOOD);
  assert.ok(fs.existsSync(path.join(r.outRoot, 'hartley-metalwork', 'index.html')));
  assert.ok(fs.existsSync(path.join(r.outRoot, 'hartley-metalwork', 'notes.md')));
  assert.match(r.html, /<meta name="robots" content="noindex,nofollow,noarchive">/);
  assert.ok(r.html.includes('Concept by Rhys Hume, not a live site'));
  assert.match(r.html, /<div class="concept-banner"[^>]*>[\s\S]*?Concept by Rhys Hume, not a live site/);
  assert.ok(r.html.includes('<link rel="stylesheet" href="/styles.css">'));
  assert.ok(r.html.includes('<link rel="stylesheet" href="/preview/preview.css">'));
  assert.ok(!/<link[^>]+rel="canonical"/i.test(r.html), 'a preview must not name a canonical address');
});

test('phone and quote button are at the top, and the phone comes from their site', async function () {
  const r = await generate(GOOD);
  const header = r.html.match(/<header class="masthead">[\s\S]*?<\/header>/)[0];
  assert.ok(header.includes('href="tel:+441698123456"') && header.includes('01698 123456'));
  assert.ok(header.includes('<a class="btn" href="#quote">Get a quote</a>'));
  assert.ok(header.includes('hartley-metalwork.test/img/logo.png'), 'their logo is used');
});

test('only their own photos are used, and the others are reported', async function () {
  const r = await generate(GOOD);
  assert.ok(r.html.includes(SITE + '/img/shop.jpg'));
  assert.ok(!r.html.includes('cdn.stock.test'));
  assert.match(r.notes, /Skipped 1 photo\(s\)/);
  assert.match(r.html, /<meta name="referrer" content="no-referrer">/);
});

test('it reads the home page and up to 3 linked pages, from their own site only', async function () {
  const r = await generate(GOOD);
  assert.deepStrictEqual(r.net.calls.pages.filter(function (u) { return !/sitemap\.xml$/.test(u) && !/\.(jpe?g|png|webp)$/.test(u); }), [SITE + '/', SITE + '/services', SITE + '/about-us', SITE + '/contact']);
  assert.ok(r.net.calls.pages.every(function (u) { return u.indexOf(SITE) === 0; }), 'a request left their site');
});

test('the demo quote form posts nowhere', async function () {
  const r = await generate(GOOD);
  const form = r.html.match(/<form[\s\S]*?<\/form>/)[0];
  assert.ok(!/\baction=/i.test(form), 'form has an action');
  assert.ok(!/\bmethod=/i.test(form), 'form has a method');
  assert.ok(/onsubmit="return false"/.test(form));
  assert.ok(!/type="submit"/i.test(form), 'form has a submit button');
  assert.ok(/<input id="q-files" type="file" multiple>/.test(form), 'form does not take drawings');
  assert.ok(!/name=/i.test(form), 'fields have names, so a browser could send them');
  const scripts = (r.html.match(/<script[\s\S]*?<\/script>/g) || []).join('\n');
  assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|FormData|\/api\//.test(scripts), 'a script could send data');
  assert.ok(!/src="https?:/i.test(scripts) && !/<script[^>]+src=/i.test(r.html), 'the page loads an outside script');
  assert.ok(!/turnstile|form-check|cf-/i.test(r.html));
  assert.ok(r.html.includes('Demo only. Nothing is sent from this form.'));
});

test('no em dashes anywhere, even when the AI reply has them', async function () {
  const dirty = JSON.parse(JSON.stringify(GOOD));
  dirty.headline = 'Milling — turning and fabrication in Hamilton';
  dirty.about = 'Hartley Metalwork is a workshop in Hamilton — we work from drawings.';
  dirty.services[0].text = 'CNC milling of steel and aluminium – to your drawing.';
  dirty.comparison = 'Both sites list turning — only Hartley Metalwork lists milling.';
  const r = await generate(dirty, { competitor: 'https://www.rival-engineering.test/' });
  assert.ok(!/—/.test(r.html), 'em dash in the page');
  assert.ok(!/—/.test(r.notes), 'em dash in notes.md');
  assert.ok(!/—/.test(fs.readFileSync(path.join(r.outRoot, 'hartley-metalwork', 'index.html'), 'utf8')));
});

test('copy from the AI is escaped, so it cannot add markup', async function () {
  const bad = JSON.parse(JSON.stringify(GOOD));
  bad.headline = 'Milling <b>bold</b> in Hamilton';
  const r = await generate(bad);
  assert.ok(!/<b>bold/.test(r.html));
  assert.ok(r.html.includes('&lt;b&gt;bold&lt;/b&gt;'));
});

// ---------------------------------------------------------------- notes.md

test('notes.md shows every line of copy on the page', async function () {
  const r = await generate(GOOD, { competitor: 'https://www.rival-engineering.test/' });
  visibleChunks(r.html).forEach(function (chunk) {
    assert.ok(r.notes.includes(chunk), 'notes.md is missing this line: "' + chunk + '"');
  });
  assert.ok(r.notes.includes('Concept by Rhys Hume, not a live site'));
});

test('notes.md has 3 points and one comparison when there is a competitor', async function () {
  const r = await generate(GOOD, { competitor: 'https://www.rival-engineering.test/' });
  const section = r.notes.match(/## What changed and why\n\n([\s\S]*?)\n\n## /)[1].split('\n');
  assert.strictEqual(section.length, 3);
  assert.ok(section.every(function (l, i) { return l.startsWith((i + 1) + '. '); }));
  assert.match(r.notes, /## Comparison with rival-engineering\.test\n\nBoth sites list turning\./);
  assert.strictEqual((r.notes.match(/^## Comparison/gm) || []).length, 1);
});

test('without a competitor there is no comparison section', async function () {
  const noCompare = JSON.parse(JSON.stringify(GOOD)); noCompare.comparison = '';
  const r = await generate(noCompare);
  assert.ok(!/## Comparison/.test(r.notes));
});

// ---------------------------------------------------------------- the rules on the copy

test('invented numbers, banned words and unsupported claims are rejected and the AI is asked once more', async function () {
  const bad = JSON.parse(JSON.stringify(GOOD));
  bad.intro = 'Seamless solutions from a workshop with 25 years of experience.';
  bad.services[1].text = 'Award-winning turning, guaranteed.';
  const r = await generate([bad, GOOD]);
  assert.strictEqual(r.net.calls.api.length, 2, 'it should retry exactly once');
  const retry = r.net.calls.api[1].messages;
  assert.strictEqual(retry.length, 3);
  const feedback = retry[2].content;
  assert.ok(/banned word: "Seamless"/.test(feedback) || /banned word/.test(feedback));
  assert.ok(/"25"/.test(feedback));
  assert.ok(/award/i.test(feedback));
  assert.ok(!r.html.includes('25 years'));
});

test('if the retry still breaks the rules, nothing is written', async function () {
  const bad = JSON.parse(JSON.stringify(GOOD));
  bad.intro = 'Seamless service. Established 1994.';
  const net = fakeNetwork([bad, bad]);
  const outRoot = tmp();
  await assert.rejects(
    gen.run({ url: SITE + '/', slug: 'hartley-metalwork', apiKey: 'k', fetchImpl: net.fetchImpl, outRoot: outRoot }),
    /still breaks the rules/
  );
  assert.ok(!fs.existsSync(path.join(outRoot, 'hartley-metalwork')), 'files were written anyway');
});

test('the checker catches phones, emails, addresses, prices and ranking promises in AI copy', function () {
  const source = 'Milling and turning in Hamilton. Prices from 120 pounds.';
  const base = { headline: 'Milling in Hamilton', intro: 'Milling and turning.', area: '', about: '', comparison: '', fileTypes: '', replyTime: '', proof: [], services: [{ title: 'Milling', text: '', detail: '' }] };
  function problems(patch) { return gen.checkCopy(Object.assign({}, base, patch), source).problems.join('\n'); }
  assert.strictEqual(problems({}), '');
  assert.match(problems({ intro: 'Ring 0141 555 0100.' }), /phone number, email or web address/);
  assert.match(problems({ intro: 'Write to a@b.co.uk.' }), /phone number, email or web address/);
  assert.match(problems({ intro: 'See www.example.com.' }), /phone number, email or web address/);
  assert.match(problems({ intro: 'From £999 a job.' }), /"999"/);
  assert.strictEqual(problems({ intro: 'Prices from 120 pounds.' }), '');
  assert.match(problems({ intro: 'The best in Glasgow.' }), /banned word/);
  assert.match(problems({ intro: 'We rank first on Google.' }), /banned word/);
  ['cutting-edge', 'seamless', 'elevate', 'unlock', 'solutions', 'quick', 'quickly'].forEach(function (w) {
    assert.match(problems({ intro: 'We offer ' + w + ' work.' }), /banned word/, w + ' was not caught');
  });
  assert.match(problems({ intro: 'We have reviews from customers.' }), /"review"/);
  assert.match(problems({ headline: '' }), /headline is empty/);
});

test('their own fixed template lines pass the same word rules', function () {
  const facts = { name: 'Test Firm', host: 'test.example', logo: '', phones: [], emails: [], photos: [], text: '' };
  const content = gen.buildContent(facts, { headline: 'A', intro: 'B', area: '', about: '', proof: [], fileTypes: '', replyTime: '', services: [{ title: 'C', text: '', detail: '' }], comparison: '' }, 'test-firm');
  const fixed = [content.banner, content.quoteButton, content.servicesHeading, content.quoteHeading, content.quoteIntro, content.send,
    content.demoNote, content.demoStatus, content.contactHeading, content.phoneLabel, content.emailLabel, content.placeholder, content.quoteHeading].concat(Object.values(content.labels));
  fixed.forEach(function (t) {
    assert.ok(!gen.BANNED.test(t), 'banned word in: ' + t);
    assert.ok(!/—/.test(t), 'em dash in: ' + t);
  });
});

// ---------------------------------------------------------------- guards on the tool itself

test('bad slugs and private addresses are refused', function () {
  assert.throws(function () { gen.assertSlug('../etc'); });
  assert.throws(function () { gen.assertSlug('Has Capitals'); });
  assert.throws(function () { gen.assertSlug('a'); });
  assert.strictEqual(gen.assertSlug('jnr-engineering'), 'jnr-engineering');
  ['http://localhost:3000', 'http://127.0.0.1/', 'http://192.168.1.5/', 'http://10.0.0.1/', 'file:///etc/passwd', 'ftp://x.test/'].forEach(function (u) {
    assert.throws(function () { gen.assertPublicUrl(u); }, u);
  });
  assert.ok(gen.assertPublicUrl('https://www.example.com/').startsWith('https://'));
});

test('without an API key it stops before fetching anything', async function () {
  const net = fakeNetwork([GOOD]);
  await assert.rejects(gen.run({ url: SITE + '/', slug: 'x1', apiKey: '', fetchImpl: net.fetchImpl, outRoot: tmp() }), /ANTHROPIC_API_KEY/);
  assert.strictEqual(net.calls.pages.length, 0);
});

// ---------------------------------------------------------------- the live repo

test('robots.txt blocks /preview/ and a noindex header is set for it', function () {
  assert.match(read('robots.txt'), /^Disallow: \/preview\/$/m);
  const vercel = JSON.parse(read('vercel.json'));
  const rule = vercel.headers.find(function (r) { return r.source === '/preview/(.*)'; });
  assert.ok(rule && rule.headers.some(function (h) { return h.key === 'X-Robots-Tag' && /noindex/.test(h.value); }));
});

test('previews are not in the sitemap, llms.txt, or any link on the live pages', function () {
  assert.ok(!/\/preview/.test(read('sitemap.xml')), 'preview in sitemap.xml');
  assert.ok(!/\/preview/.test(read('llms.txt')), 'preview in llms.txt');
  const skip = /^(\.git|node_modules|test|docs|api|fonts|images|preview|tools)$/;
  (function walk(dir) {
    fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).forEach(function (e) {
      const rel = path.join(dir, e.name);
      if (e.isDirectory()) { if (!skip.test(e.name)) walk(rel); return; }
      if (/\.(html|js|txt|xml)$/.test(e.name)) {
        assert.ok(!/["'(]\/preview\//.test(read(rel)) && !/rhyshume\.co\.uk\/preview/.test(read(rel)), rel + ' links to a preview');
      }
    });
  })('.');
});

test('every preview page saved in the repo follows the rules', function () {
  const base = path.join(ROOT, 'preview');
  const dirs = fs.readdirSync(base, { withFileTypes: true }).filter(function (e) { return e.isDirectory(); });
  dirs.forEach(function (d) {
    const html = read('preview/' + d.name + '/index.html');
    const notes = read('preview/' + d.name + '/notes.md');
    assert.match(html, /<meta name="robots" content="noindex,nofollow,noarchive">/, d.name + ' is not noindex');
    assert.ok(html.includes('Concept by Rhys Hume, not a live site'), d.name + ' has no banner');
    assert.ok(!/—/.test(html) && !/—/.test(notes), d.name + ' has an em dash');
    const form = html.match(/<form[\s\S]*?<\/form>/);
    assert.ok(form && !/\baction=/i.test(form[0]) && !/type="submit"/i.test(form[0]), d.name + ' form could post');
    visibleChunks(html).forEach(function (c) { assert.ok(notes.includes(c), d.name + ': notes.md is missing "' + c + '"'); });
  });
  assert.ok(fs.existsSync(path.join(base, 'preview.css')));
});

test('the generator does not touch the live styles, form handler or other tests', function () {
  const src = read('tools/preview.js');
  assert.ok(!/styles\.css['"]\s*[,)]\s*[^/]*writeFile/.test(src));
  assert.ok(!/api\/contact/.test(src));
});

test('the GitHub Action only passes inputs through env, never straight into a shell command', function () {
  const yml = read('.github/workflows/preview.yml');
  assert.match(yml, /workflow_dispatch:/);
  assert.ok(!/pull_request|push:/.test(yml.split('jobs:')[0]), 'it must only run when started by hand');
  const runBlocks = yml.match(/run: \|[\s\S]*?(?=\n      - |\n$)/g) || [];
  assert.ok(runBlocks.length >= 2);
  runBlocks.forEach(function (b) { assert.ok(!/\$\{\{/.test(b), 'an expression is inside a run block: ' + b.slice(0, 60)); });
  assert.ok(!/ANTHROPIC_API_KEY:\s*["']?sk-/.test(yml), 'a key is written in the file');
  assert.ok(/secrets\.ANTHROPIC_API_KEY/.test(yml));
  assert.ok(!/git push[^\n]*\bmain\b/.test(yml), 'it must never push to main');
});

test('the Action opens a pull request to main, never merges, and keeps the notes out of the site', function () {
  const yml = read('.github/workflows/preview.yml');
  assert.match(yml, /pull-requests: write/);
  assert.match(yml, /gh pr create --base main --head "preview-\$SLUG"/);
  assert.ok(!/gh pr merge|--auto|--admin/.test(yml), 'the Action must never merge');
  assert.ok(!/vercel|VERCEL/i.test(yml.replace(/rhyshume\.co\.uk/g, '').replace(/#.*$/gm, '')), 'the Action must not touch Vercel');
  assert.match(read('.vercelignore'), /^preview\/\*\/notes\.md$/m);
});

// ---------------------------------------------------------------- PR B: logo, photos, proof, compare

const pg = function (url, html) { return { url: url, html: html }; };

test('logo: picks the one that shows on a pale page, not the white one', function () {
  const home = 'https://jnr.test/';
  const html = '<img class="logo" src="/img/logo-white.png" alt="logo"><img src="/img/logo-navy.png" alt="JNR logo">';
  const r = gen.pickLogo([pg(home, html)], home);
  assert.strictEqual(r.logo, 'https://jnr.test/img/logo-navy.png');
  assert.match(r.note, /Skipped/);
});

test('logo: only a white logo means no image, name shown as text', function () {
  const home = 'https://jnr.test/';
  const r = gen.pickLogo([pg(home, '<img src="/img/logo-white.png" alt="logo">')], home);
  assert.strictEqual(r.logo, '');
  assert.match(r.note, /white or light logo/);
});

test('logo: a domain name with "light" in it is not treated as a pale logo', function () {
  const home = 'https://light-engineering.test/';
  const r = gen.pickLogo([pg(home, '<img src="/img/logo.png" alt="logo">')], home);
  assert.strictEqual(r.logo, 'https://light-engineering.test/img/logo.png');
});

test('photos: CSS backgrounds, inline styles, linked CSS and next/image are found, off-site ones skipped', function () {
  const home = 'https://shop.test/';
  const html = '<style>.hero{background-image:url(/img/our-hero.jpg)}</style>' +
    '<div style="background:url(\'/img/our-inline.jpg\')"></div>' +
    '<img src="/_next/image?url=%2Fimg%2Four-next-photo.jpg&w=640&q=75" alt="">' +
    '<div style="background-image:url(https://cdn.other.test/x.jpg)"></div>';
  const out = gen.collectImages([pg(home, html)], home, [{ url: 'https://shop.test/css/site.css', text: '.team{background:url(/img/our-from-css.png)}' }]);
  const srcs = out.photos.map(function (p) { return p.src; });
  ['our-hero.jpg', 'our-inline.jpg', 'our-next-photo.jpg', 'our-from-css.png'].forEach(function (f) {
    assert.ok(srcs.some(function (s) { return s.endsWith('/img/' + f); }), f + ' missing: ' + srcs.join(' '));
  });
  assert.ok(!srcs.some(function (s) { return s.includes('cdn.other.test'); }));
});

test('no photos found means a clearly marked placeholder, not a stock photo', async function () {
  const saved = {}; Object.keys(PAGES).forEach(function (k) { saved[k] = PAGES[k]; });
  Object.keys(PAGES).forEach(function (k) { PAGES[k] = PAGES[k].replace(/<img[^>]*>/g, ''); });
  try {
    const r = await generate(GOOD);
    assert.match(r.html, /Placeholder: your (workshop )?photo here/);
    assert.ok(/pv-placeholder/.test(r.html));
  } finally { Object.keys(saved).forEach(function (k) { PAGES[k] = saved[k]; }); }
});

test('the sticky call bar is a tel link and the body carries the has-call class', async function () {
  const r = await generate(GOOD);
  assert.match(r.html, /<a class="pv-call" href="tel:\+441698123456">/);
  assert.match(r.html, /<body id="top" class="pv has-call">/);
});

test('the quote form heading follows their site: "Send us your drawing" only if they mention drawings', async function () {
  const r = await generate(GOOD);
  assert.ok(r.html.includes('Send us your drawing')); // their pages say "from your drawings"
  const saved = PAGES[SITE + '/']; PAGES[SITE + '/'] = saved.replace(/drawings/g, 'plans');
  const keep = PAGES[SITE + '/about-us']; PAGES[SITE + '/about-us'] = keep.replace(/drawings/g, 'plans');
  try {
    const g = Object.assign({}, GOOD, { intro: 'A workshop in Hamilton, South Lanarkshire.', about: 'Hartley Metalwork is a workshop in Hamilton.' });
    const r2 = await generate(g);
    assert.ok(!r2.html.includes('Send us your drawing'));
  } finally { PAGES[SITE + '/'] = saved; PAGES[SITE + '/about-us'] = keep; }
});

test('proof strip, file types and reply time are rejected when they are not on their site', function () {
  const facts = 'Family run workshop in Hamilton. We make parts from drawings.';
  const base = Object.assign({}, GOOD, { proof: ['Family run', 'Hamilton'], fileTypes: '', replyTime: '', services: [{ title: 'Milling', text: '', detail: '' }] });
  const bad = gen.checkCopy(Object.assign({}, base, { proof: ['Family run', 'Started in 1987'] }), facts);
  assert.ok(bad.problems.length > 0, 'an invented year must be rejected');
  const bad2 = gen.checkCopy(Object.assign({}, base, { fileTypes: 'DXF, STEP and PDF' }), facts);
  assert.ok(bad2.problems.length > 0, 'file types not on the site must be rejected');
  const bad3 = gen.checkCopy(Object.assign({}, base, { replyTime: 'Within 2 hours' }), facts);
  assert.ok(bad3.problems.length > 0, 'a reply time not on the site must be rejected');
});

test('buildChangeNotes only reports what was measured, max 5, numbered pins', function () {
  const their = { vw: 390, vh: 844, scrollW: 656, sideways: true, tel: { x: 10, y: 1500, w: 100, h: 20 }, quote: null, h1: { text: 'Welcome', box: { x: 0, y: 100, w: 300, h: 40 } }, fileInput: false };
  const concept = { vw: 390, vh: 844, sideways: false, tel: { x: 10, y: 10, w: 100, h: 20 }, quote: { x: 10, y: 50, w: 100, h: 40 }, fileInput: true };
  const facts = { phones: [{ display: '01698 123456' }], hasUpload: false };
  const n = gen.buildChangeNotes(their, concept, {}, facts, { from: 900, to: 120 }, 'Milling in Hamilton');
  assert.ok(n.length >= 3 && n.length <= 5);
  assert.ok(n.some(function (x) { return /wider than a phone screen/.test(x.text); }));
  assert.ok(n.some(function (x) { return /screens down/.test(x.text); }));
  n.forEach(function (x) { assert.ok(!/—/.test(x.text)); });
  const none = gen.buildChangeNotes(Object.assign({}, their, { sideways: false }), concept, {}, { phones: [], hasUpload: true }, { from: 100, to: 100 }, 'X');
  assert.ok(!none.some(function (x) { return /wider than a phone screen/.test(x.text); }), 'no invented findings');
});

test('buildTable shows "Not measured" when there is no Lighthouse result, never a made up number', function () {
  const m = { vw: 390, vh: 844, tel: null, quote: null, sideways: false, fileInput: false };
  const t = gen.buildTable([{ title: 'Their site', m: m, lh: null }, { title: 'Concept', m: m, lh: { score: 93, lcp: 2.1 } }, { title: 'Rival', m: m, lh: { error: 'x' } }]);
  const row = t.rows.find(function (r) { return /Lighthouse/.test(r.label); });
  assert.deepStrictEqual(row.values, ['Not measured', '93 out of 100', 'Not measured']);
  assert.deepStrictEqual(t.cols, ['Their site', 'Concept', 'Rival']);
});

test('the Action installs the browser tools at pinned versions and gives the build enough time', function () {
  const yml = read('.github/workflows/preview.yml');
  assert.match(yml, /playwright-core@1\.65\.0/);
  assert.match(yml, /lighthouse@13\.6\.0/);
  assert.match(yml, /chrome-launcher@1\.2\.3/);
  assert.match(read('.gitignore'), /^node_modules\/$/m);
});

// ---------------------------------------------------------------- niche blocks

test('niche: no niche leaves the instructions exactly as they were', function () {
  assert.strictEqual(gen.buildSystem(), gen.SYSTEM);
  assert.strictEqual(gen.buildSystem('none'), gen.SYSTEM);
});

test('niche: engineering adds the moves, keeps every existing hard rule, bans third party names', function () {
  const sys = gen.buildSystem('engineering');
  assert.ok(sys.startsWith(gen.SYSTEM), 'existing rules must come first and be unchanged');
  ['Hero line', 'Service cards', 'Closing ask', 'Get a quote buttons', 'phone and email bar'].forEach(function (k) {
    assert.ok(sys.toLowerCase().includes(k.toLowerCase()), 'missing move: ' + k);
  });
  assert.match(sys, /only if the site text gives the facts/);
  assert.match(sys, /Never name or describe any customer, client, partner, brand or accreditation body/);
  assert.match(sys, /No third party names or logos on a cold preview/);
  assert.ok(!/—/.test(sys));
});

test('niche: an unknown niche is refused', function () {
  assert.throws(function () { gen.buildSystem('plumbing'); }, /Unknown niche/);
  assert.throws(function () { gen.buildSystem('constructor'); }, /Unknown niche/);
});

test('niche: the chosen niche is what the API call sends', async function () {
  const plain = await generate(GOOD);
  assert.strictEqual(plain.net.calls.api[0].system, gen.SYSTEM);
  const eng = await generate(GOOD, { niche: 'engineering' });
  assert.strictEqual(eng.net.calls.api[0].system, gen.buildSystem('engineering'));
});

test('niche: the Action passes the niche through env only', function () {
  const yml = read('.github/workflows/preview.yml');
  assert.match(yml, /IN_NICHE: \$\{\{ inputs\.niche \}\}/);
  assert.match(yml, /--niche "\$IN_NICHE"/);
  assert.match(yml, /- engineering/);
});

test('the hard rule "left out, never filled" is in the AI instructions and in docs/PREVIEW-RULES.md', function () {
  const src = read('tools/preview.js');
  assert.match(src, /Hard rule for every part of the page: a part that needs a fact the site does not state is left out, never filled/);
  const doc = read('docs/PREVIEW-RULES.md');
  assert.match(doc, /switches on only when the facts it needs were found/);
  assert.match(doc, /Never show holes/);
  assert.ok(!/—/.test(doc), 'the rules doc has an em dash');
});

test('Action safety: manual only, one run at a time, 20 a day, up to 3 prospects, never rebuild an existing slug', function () {
  const yml = read('.github/workflows/preview.yml');
  // 1) manual trigger only
  assert.match(yml, /on:\n  workflow_dispatch:/);
  assert.ok(!/schedule:|pull_request|push:|workflow_run|repository_dispatch/.test(yml.split('jobs:')[0]));
  // 2) one run at a time, queued runs wait and are not cancelled
  assert.match(yml, /concurrency:\n  group: build-preview\n  cancel-in-progress: false/);
  // 3) the very first step counts today's runs and stops at 20 or more
  const firstStep = yml.split('    steps:\n')[1].split('\n      - ')[0];
  assert.match(firstStep, /Stop if 20 or more runs/);
  assert.match(firstStep, /gh run list --workflow preview\.yml --created ">=\$today"/);
  assert.match(firstStep, /-ge 20/);
  assert.match(firstStep, /exit 1/);
  assert.ok(!/ANTHROPIC_API_KEY/.test(firstStep), 'the counting step must not touch the key');
  assert.match(yml, /actions: read/);
  // 4) up to 3 prospects per run
  assert.match(yml, /prospects:/);
  assert.match(yml, /-gt 3/);
  // 5) an existing preview folder stops the build, checked up front and again right before building
  const checks = yml.match(/if \[ -e "preview\/\$(slug|SLUG)" \]/g) || [];
  assert.strictEqual(checks.length, 2);
  assert.ok(yml.indexOf('-e "preview/$slug"') < yml.indexOf('node tools/preview.js'));
  // the key still comes from the repo secret, only on the build step
  assert.match(yml, /ANTHROPIC_API_KEY: \$\{\{ secrets\.ANTHROPIC_API_KEY \}\}/);
  assert.strictEqual((yml.match(/secrets\.ANTHROPIC_API_KEY/g) || []).length, 1);
});

test('a reply that is not valid JSON gets one retry instead of failing the build', async function () {
  const r = await generate(['{"headline": "Broken, "intro": oops', GOOD]);
  assert.strictEqual(r.net.calls.api.length, 2, 'it should retry exactly once');
  assert.match(r.net.calls.api[1].messages[2].content, /not valid JSON/);
  assert.ok(r.html.length > 1000);
});

test('two invalid JSON replies in a row still fail, with the parse error', async function () {
  await assert.rejects(generate(['not json at all {', '{"also": broken']), /JSON|json/);
});

// ---------------------------------------------------------------- local business niches

const NEW_NICHES = ['trades', 'hospitality', 'childcare', 'weddings'];

test('niche: the list is engineering plus trades, hospitality, childcare and weddings', function () {
  assert.deepStrictEqual(Object.keys(gen.NICHES).sort(), ['childcare', 'engineering', 'hospitality', 'trades', 'weddings']);
});

test('niche: each new block sits after the unchanged base rules, in the same style as engineering', function () {
  NEW_NICHES.forEach(function (n) {
    const sys = gen.buildSystem(n);
    assert.ok(sys.startsWith(gen.SYSTEM), n + ': base rules first and unchanged');
    assert.match(sys, /\nNiche: /, n);
    assert.match(sys, /Each one is used only if the site text gives the facts for it\. If it does not, leave that part out/, n);
    assert.match(sys, /- Hero line: /, n);
    assert.match(sys, /- Service cards: /, n);
    assert.match(sys, /- Closing ask: .*You do not write it\. The page adds it\./, n);
    assert.match(sys, /No third party names or logos on a cold preview/, n);
    assert.ok(!/—/.test(sys), n + ': no em dash');
  });
});

test('niche: every new block bans customers, reviews and promises in its own words', function () {
  const need = {
    trades: [/Never name or describe any customer, client, supplier, brand or accreditation body/, /never write a registration or membership claim/, /No promises of price, speed, availability or results/],
    hospitality: [/Never write a review, a rating, a star score, an award, a food hygiene rating or a quote from a customer/, /never name or describe any customer, supplier, brand or accreditation body/, /Never promise a booking, a table, a delivery time/, /Never invent a menu/],
    childcare: [/Never name or describe any child, parent, family, staff member or other person/, /never write a review, testimonial or quote/, /No promises about a place, a start date, availability or outcomes/, /write nothing about registration, inspection results/, /Never write a fee, a price, a funding offer or a free place unless the site states it/],
    weddings: [/Never write a review, a testimonial, a quote or an award/, /Never name or describe any couple, guest, venue, supplier, brand or publication/, /Never promise that a date is free/, /Never invent a package, a price or a capacity/]
  };
  NEW_NICHES.forEach(function (n) {
    const sys = gen.buildSystem(n);
    need[n].forEach(function (re) { assert.match(sys, re, n + ' is missing ' + re); });
  });
});

test('niche: no block uses a word the copy checker bans, so the model is never told to write one', function () {
  NEW_NICHES.forEach(function (n) {
    const block = gen.NICHES[n];
    // Words in the block that sit inside a "never write" instruction are the ones the checker bans, so strip those clauses first.
    const body = block.split('\n').filter(function (l) { return !/^- (Never|No promises)|never/i.test(l); }).join('\n');
    assert.ok(!gen.BANNED.test(body), n + ': ' + (body.match(gen.BANNED) || [''])[0]);
  });
});

test('niche: form words are set for each new niche and are not engineering words', function () {
  assert.deepStrictEqual(Object.keys(gen.NICHE_LABELS).sort(), NEW_NICHES.slice().sort());
  const facts = { name: 'Test Firm', host: 'test.example', logo: '', phones: [], emails: [], photos: [], text: 'we work from drawings' };
  const ai = { headline: 'A', intro: 'B', area: '', about: '', proof: [], fileTypes: '', replyTime: '', services: [{ title: 'C', text: '', detail: '' }], comparison: '' };
  const none = gen.buildContent(facts, ai, 't');
  assert.strictEqual(none.quoteHeading, 'Send us your drawing');
  assert.strictEqual(none.niche, '');
  NEW_NICHES.forEach(function (n) {
    const c = gen.buildContent(facts, ai, 't', n);
    assert.strictEqual(c.niche, n);
    [c.quoteButton, c.quoteHeading, c.quoteIntro].concat(Object.values(c.labels)).forEach(function (t) {
      assert.ok(!/drawing/i.test(t), n + ' says drawing: ' + t);
      assert.ok(!gen.BANNED.test(t) && !/—/.test(t), n + ' bad word in: ' + t);
    });
  });
  assert.strictEqual(gen.buildContent(facts, ai, 't', 'hospitality').quoteButton, 'Get in touch');
  assert.strictEqual(gen.buildContent(facts, ai, 't', 'weddings').quoteButton, 'Enquire');
  assert.strictEqual(gen.buildContent(facts, ai, 't', 'trades').quoteButton, 'Get a quote');
  assert.strictEqual(gen.buildContent(facts, ai, 't', 'engineering').quoteHeading, 'Send us your drawing');
});

test('niche: each new niche is what the API call sends, and shapes the page labels', async function () {
  for (const n of NEW_NICHES) {
    const r = await generate(GOOD, { niche: n });
    assert.strictEqual(r.net.calls.api[0].system, gen.buildSystem(n), n);
    assert.strictEqual(r.content.niche, n);
    assert.strictEqual(r.content.quoteButton, gen.NICHE_LABELS[n].quoteButton);
  }
});

test('niche: the build records what the page says about itself to a search engine', async function () {
  const r = await generate(GOOD);
  const seo = r.evidence.seo;
  assert.strictEqual(seo.title, 'Welcome | Hartley Metalwork');
  assert.strictEqual(seo.description, '');
  assert.strictEqual(seo.phone, true);
  assert.strictEqual(seo.mobile, false);
  assert.strictEqual(seo.address, false);
  assert.ok(seo.pagesRead >= 1);
});

test('niche: the command line help names every niche', function () {
  assert.match(read('tools/preview.js'), /\[--niche engineering\|trades\|hospitality\|childcare\|weddings\]/);
});

// ---------------------------------------------------------------- photos: keep their own work and trade, drop obvious misfits

const FW = gen.firmWordsOf('Stirling Electrical Ltd');
const verdict = function (c, route, pagePath, niche) { return gen.photoVerdict(Object.assign({ alt: '', hint: '', caption: '', near: '', via: 'img', zone: 'content', order: 5 }, c), route, pagePath || '/', FW, niche); };

test('photo rule: obvious misfits are dropped, whatever page they are on', function () {
  [
    [{ alt: 'Restaurant table set for dinner' }, '/uploads/table.jpg', '/'],
    [{ alt: '' }, '/uploads/restaurant-table.jpg', '/our-work'],
    [{ alt: 'Our work' }, '/uploads/dining-room.jpg', '/gallery'],
    [{ alt: 'Happy customers' }, '/uploads/a.jpg', '/'],
    [{ alt: 'Businessman shaking hands' }, '/uploads/b.jpg', '/'],
    [{ alt: '' }, '/uploads/shutterstock_12345.jpg', '/'],
    [{ alt: 'Sunset over a beach' }, '/uploads/c.jpg', '/'],
    [{ alt: 'Screenshot' }, '/uploads/screenshot-2022.png', '/'],
    [{ alt: 'NSI approved badge' }, '/uploads/nsi.jpg', '/']
  ].forEach(function (t) { assert.strictEqual(verdict(t[0], t[1], t[2]).ok, false, JSON.stringify(t[0]) + t[1]); });
  assert.match(verdict({ alt: 'Restaurant table' }, '/a.jpg').why, /food or hospitality/);
  assert.match(verdict({ alt: 'Sunset' }, '/a.jpg').why, /unrelated to the trade/);
  assert.match(verdict({ alt: 'Happy family' }, '/a.jpg').why, /stock or people/);
});

test('photo rule: text right beside the image about food drops a photo with a generic alt', function () {
  assert.strictEqual(verdict({ alt: 'Picture', near: 'Join us for lunch in our restaurant' }, '/uploads/6704066.jpeg').ok, false);
  // but an image that says it is their own work stays
  assert.strictEqual(verdict({ alt: 'Our van', near: 'Join us for lunch in our restaurant' }, '/uploads/6704066.jpeg').ok, true);
  assert.strictEqual(verdict({ alt: 'Picture', near: 'Join us for lunch in our restaurant' }, '/uploads/6704066.jpeg', '/', 'hospitality').ok, true);
});

test('photo rule: a generic alt text and a number for a file name is kept when it sits in the main content', function () {
  const v = verdict({ alt: 'Picture' }, '/uploads/1/2/1368098438.jpg', '/', undefined);
  assert.strictEqual(v.ok, true);
  assert.strictEqual(v.level, 0);
  assert.match(v.why, /main content with no sign it is unrelated \(kept on position\)/);
  assert.match(verdict({ alt: 'Picture' }, '/uploads/x.jpg').why, /kept on position$|kept on position\)/);
  assert.match(verdict({ alt: 'Picture', order: 1 }, '/uploads/x.jpg').why, /one of the first images on the page/);
});

test('photo rule: position drops what is in the header, nav, footer or a sidebar, and graphics with nothing to say they are photos', function () {
  const chrome = verdict({ alt: 'Picture', zone: 'chrome' }, '/uploads/x.jpg');
  assert.strictEqual(chrome.ok, false);
  assert.match(chrome.why, /header, footer or a sidebar/);
  const png = verdict({ alt: 'Picture' }, '/uploads/x.png');
  assert.strictEqual(png.ok, false);
  assert.match(png.why, /png or gif/);
  const bg = verdict({ alt: '', via: 'css background' }, '/uploads/hero.jpg');
  assert.strictEqual(bg.ok, false);
  assert.match(bg.why, /background or share image/);
});

test('photo rule: their own work, van, site, team, premises or name is kept with the reason, ahead of a generic one', function () {
  [
    [{ alt: 'Our van outside a job' }, '/a.jpg', /own work, vehicle, site or team/, 2],
    [{ alt: 'Consumer unit installation completed' }, '/b.jpg', /own work/, 2],
    [{ alt: '' }, '/uploads/company-van-1.jpg', /own work/, 2],
    [{ alt: '' }, '/uploads/stirling-electrical-vehicle.jpg', /firm name/, 2],
    [{ alt: '', caption: 'The crew on site' }, '/c.jpg', /own work/, 2],
    [{ alt: '', hint: 'team-photo' }, '/d.jpg', /own work/, 2],
    [{ alt: 'Picture' }, '/uploads/new-consumer-unit.jpg', /shows their trade/, 1],
    [{ alt: 'Picture' }, '/uploads/timber-frame-house.jpg', /shows their trade/, 1]
  ].forEach(function (t) {
    const v = verdict(t[0], t[1]);
    assert.strictEqual(v.ok, true, JSON.stringify(t[0]) + t[1]);
    assert.match(v.why, t[2]);
    assert.strictEqual(v.level, t[3]);
  });
  assert.strictEqual(verdict({ alt: 'Picture' }, '/uploads/x.png', '/gallery').level, 1);
});

test('photo rule: a trade word alone does not make a png or gif a photo', function () {
  assert.strictEqual(verdict({ alt: 'Picture' }, '/uploads/socket.png').ok, false);
  assert.strictEqual(verdict({ alt: 'Our van' }, '/uploads/van.png').ok, true);
});

test('photo rule: a food business may use food photos, any other niche may not', function () {
  assert.strictEqual(verdict({ alt: 'Our dining room' }, '/room.jpg', '/', 'hospitality').ok, true);
  assert.strictEqual(verdict({ alt: 'Our dining room' }, '/room.jpg', '/', 'trades').ok, false);
  assert.strictEqual(verdict({ alt: 'Our dining room' }, '/room.jpg').ok, false);
});

test('photo rule: collectImages reads position and nearby text from the page, keeps good ones first, withholds the rest', function () {
  const home = 'https://stirling.test/';
  const html = '<header><img src="/u/banner-top.jpg" alt="Picture" width="800" height="300"></header>' +
    '<img src="/u/van.jpg" alt="Our van" width="800" height="600"><p>Our work</p><img src="/u/1368.jpg" alt="Picture" width="800" height="600">' +
    '<img src="/u/diagram.png" alt="Picture" width="800" height="600"><img src="/u/6704.jpg" alt="Picture" width="800" height="600"><p>Eat with us in the restaurant at lunch</p>' +
    '<footer><img src="/u/foot.jpg" alt="Picture" width="800" height="600"></footer>';
  const out = gen.collectImages([{ url: home, html: html }], home, [], 'Stirling Electrical Ltd', undefined);
  assert.deepStrictEqual(out.photos.map(function (p) { return p.src.split('/').pop(); }), ['van.jpg', '1368.jpg']);
  const why = {}; out.withheld.forEach(function (w) { why[w.src.split('/').pop()] = w.why; });
  assert.match(why['banner-top.jpg'], /header, footer or a sidebar/);
  assert.match(why['6704.jpg'], /text beside it is about food or hospitality/);
  assert.match(why['diagram.png'], /png or gif/);
  assert.ok(why['foot.jpg'], 'the footer image is withheld, for whichever reason comes first');
});

test('photo size: the real pixel size is read from png, gif, jpeg and webp headers', function () {
  const png = Buffer.alloc(32); Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png); png.writeUInt32BE(640, 16); png.writeUInt32BE(480, 20);
  assert.deepStrictEqual(gen.imageSize(png), { w: 640, h: 480 });
  const gif = Buffer.alloc(32); gif.write('GIF89a'); gif.writeUInt16LE(100, 6); gif.writeUInt16LE(50, 8);
  assert.deepStrictEqual(gen.imageSize(gif), { w: 100, h: 50 });
  const jpg = Buffer.alloc(40); jpg[0] = 0xff; jpg[1] = 0xd8; jpg[2] = 0xff; jpg[3] = 0xe0; jpg.writeUInt16BE(4, 4); jpg[8] = 0xff; jpg[9] = 0xc0; jpg.writeUInt16BE(11, 10); jpg[12] = 8; jpg.writeUInt16BE(600, 13); jpg.writeUInt16BE(900, 15);
  assert.deepStrictEqual(gen.imageSize(jpg), { w: 900, h: 600 });
  const webp = Buffer.alloc(32); webp.write('RIFF'); webp.write('WEBP', 8); webp.write('VP8 ', 12); webp.writeUInt16LE(320, 26); webp.writeUInt16LE(200, 28);
  assert.deepStrictEqual(gen.imageSize(webp), { w: 320, h: 200 });
  assert.strictEqual(gen.imageSize(Buffer.from('<html>not an image at all, just text</html>')), null);
  assert.strictEqual(gen.imageSize(null), null);
});

test('photo size: tiny images (icons, badges, thumbnails) are withheld with the pixel size, unreadable ones are kept', async function () {
  const mk = function (w, h) { const b = Buffer.alloc(32); Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b); b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20); return b; };
  const sizes = { 'https://x.test/big.png': mk(900, 600), 'https://x.test/icon.png': mk(160, 109), 'https://x.test/edge.png': mk(240, 150), 'https://x.test/thin.png': mk(900, 42) };
  const fetchImpl = async function (u) {
    if (u.endsWith('/broken.png')) throw new Error('down');
    if (u.endsWith('/text.png')) return { ok: true, arrayBuffer: async function () { return Buffer.from('<html>no</html>'); } };
    if (u.endsWith('/nobody.png')) return { ok: true };
    const b = sizes[u]; return { ok: true, arrayBuffer: async function () { return b.buffer.slice(b.byteOffset, b.byteOffset + b.length); } };
  };
  const facts = { photos: ['big', 'icon', 'edge', 'thin', 'broken', 'text', 'nobody'].map(function (n) { return { src: 'https://x.test/' + n + '.png', alt: n }; }), withheldPhotos: [] };
  await gen.dropTinyPhotos(facts, fetchImpl);
  assert.deepStrictEqual(facts.photos.map(function (p) { return p.alt; }), ['big', 'edge', 'broken', 'text', 'nobody']);
  assert.deepStrictEqual(facts.withheldPhotos.map(function (w) { return w.alt; }), ['icon', 'thin']);
  assert.match(facts.withheldPhotos[0].why, /only 160 by 109 pixels, too small for a photo/);
});

test('photo rule: with only misfits, the hero is the marked space and the notes list every withheld photo with its reason', async function () {
  const saved = PAGES[SITE + '/'];
  PAGES[SITE + '/'] = saved.replace(/<img src="\/img\/shop\.jpg"[^>]*>/, '<img src="/img/restaurant-table.jpg" alt="Restaurant table" width="800" height="600">');
  const everyPage = Object.assign({}, PAGES);
  Object.keys(PAGES).forEach(function (k) { if (k !== SITE + '/') PAGES[k] = PAGES[k].replace(/<img[^>]*>/g, ''); });
  try {
    const r = await generate(GOOD);
    assert.strictEqual(r.content.heroPhoto, null);
    assert.ok(!r.html.includes('restaurant-table'));
    assert.match(r.html, /Placeholder: your (workshop )?photo here/);
    assert.match(r.notes, /Photo not used: .*restaurant-table\.jpg \(alt text: Restaurant table\)\. looks like food/);
    assert.match(r.notes, /Add it by hand if it is theirs/);
  } finally { Object.keys(everyPage).forEach(function (k) { PAGES[k] = everyPage[k]; }); PAGES[SITE + '/'] = saved; }
});

// ---------------------------------------------------------------- detail kept out of the page

test('word counts, colours and fonts are in notes.md and not in the points shown on the page', async function () {
  const r = await generate(GOOD);
  r.points.forEach(function (p) { assert.ok(!/\bwords\b/i.test(p), p); assert.ok(!/#[0-9a-f]{6}/i.test(p), p); });
  assert.match(r.notes, /- Words: the main text goes from about \d+ words on their home page to about \d+ words\./);
  assert.match(r.notes, /- Colours: /);
  assert.match(r.notes, /- Fonts: /);
});

test('points: the form point no longer claims drawings, and the phone point uses the niche button', function () {
  const facts = { phones: [], emails: [] };
  const base = { phone: null, quoteButton: 'Enquire', quoteHeading: 'Enquire', services: [{ title: 'a' }] };
  const pts = gen.buildPoints(facts, 100, base, 40);
  assert.ok(pts.every(function (p) { return !/drawing/i.test(p) && !/was found/i.test(p); }));
  assert.match(pts[0], /A Enquire button|an? Enquire button|Enquire button/);
  assert.match(pts[0], /no phone number is shown/);
});

test('the notes never say an email or phone was simply not found, only that none is shown', async function () {
  const saved = Object.assign({}, PAGES);
  Object.keys(PAGES).forEach(function (k) { PAGES[k] = PAGES[k].replace(/<a href="mailto:[^>]*>[^<]*<\/a>/g, '').replace(/office@hartley-metalwork\.test/g, ''); });
  try {
    const r = await generate(GOOD);
    assert.match(r.notes, /- Email: none found in the text read, it may be hidden or in an image, so the page shows none/);
    assert.ok(!/- Email: none found\n/.test(r.notes));
  } finally { Object.keys(saved).forEach(function (k) { PAGES[k] = saved[k]; }); }
});

// ---------------------------------------------------------------- email from the contact page, including hidden ones

test('email: a Cloudflare protected address is decoded the way a browser does', function () {
  assert.strictEqual(gen.decodeCfEmail('9af3f4fcf5daf0f1f7b4f9f5b4eff1'), 'info@jkm.co.uk');
  assert.strictEqual(gen.decodeCfEmail('0c6d6f6f637962787f4c666761226f63227967'), 'accounts@jkm.co.uk');
  assert.strictEqual(gen.decodeCfEmail('117f7e6531707f31747c70787d'), '', 'decodes to something that is not an address');
  assert.strictEqual(gen.decodeCfEmail('zz'), '');
  assert.strictEqual(gen.decodeCfEmail('abc'), '');
  const html = '<a class="__cf_email__" data-cfemail="9af3f4fcf5daf0f1f7b4f9f5b4eff1">[email&#160;protected]</a>' +
    '<a href="/cdn-cgi/l/email-protection#0c6d6f6f637962787f4c666761226f63227967">x</a><a href="/cdn-cgi/l/email-protection#117f7e6531707f31747c70787d">y</a>';
  assert.deepStrictEqual(gen.protectedEmails(html), ['info@jkm.co.uk', 'accounts@jkm.co.uk']);
});

function withContactPage(contactHtml, homeExtra) {
  const saved = Object.assign({}, PAGES);
  Object.keys(PAGES).forEach(function (k) { PAGES[k] = PAGES[k].replace(/<a href="mailto:[^>]*>[^<]*<\/a>/g, '').replace(/office@hartley-metalwork\.test/g, ''); });
  PAGES[SITE + '/contact'] = '<html><body><h1>Contact</h1>' + contactHtml + '</body></html>';
  return function restore() { Object.keys(PAGES).forEach(function (k) { delete PAGES[k]; }); Object.keys(saved).forEach(function (k) { PAGES[k] = saved[k]; }); };
}

test('email: found on the contact page when it is not on the home page, and shown on the concept', async function () {
  const restore = withContactPage('<p>Write to <a href="mailto:hello@hartley-metalwork.test">hello@hartley-metalwork.test</a></p>');
  try {
    const r = await generate(GOOD);
    assert.strictEqual(r.content.email, 'hello@hartley-metalwork.test');
    const html = require('../tools/concept-rich').renderRich(r.content, r.brand, r.points, { cta: { mail: 'mailto:rhys@rhyshume.co.uk' }, evidence: r.evidence });
    assert.ok(html.includes('href="mailto:hello@hartley-metalwork.test"'));
    assert.ok(html.includes('<dt>Email</dt><dd>hello@hartley-metalwork.test</dd>'));
  } finally { restore(); }
});

test('email: a hidden (Cloudflare) address on the contact page is read, enquiries before accounts', async function () {
  const restore = withContactPage('<p>Accounts <a href="/cdn-cgi/l/email-protection#0c6d6f6f637962787f4c666761226f63227967">[email protected]</a></p><p>Jobs <a class="__cf_email__" data-cfemail="9af3f4fcf5daf0f1f7b4f9f5b4eff1">[email protected]</a></p>');
  try {
    const r = await generate(GOOD);
    assert.strictEqual(r.content.email, 'info@jkm.co.uk');
    assert.match(r.notes, /- Email: info@jkm\.co\.uk/);
  } finally { restore(); }
});

test('email: with nothing readable anywhere the page shows none and the notes say it may be hidden', async function () {
  const restore = withContactPage('<p>Use the form below.</p><form><textarea></textarea></form>');
  try {
    const r = await generate(GOOD);
    assert.strictEqual(r.content.email, null);
    assert.match(r.notes, /may be hidden or in an image, so the page shows none/);
  } finally { restore(); }
});

test('email: the contact page is one of the pages read', function () {
  const home = SITE + '/';
  assert.ok(gen.pickLinks(home, PAGES[home]).includes(SITE + '/contact'));
});
