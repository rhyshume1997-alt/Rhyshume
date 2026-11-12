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
    url: SITE + '/', slug: 'hartley-metalwork', apiKey: 'test-key', fetchImpl: net.fetchImpl, outRoot: outRoot, today: '2026-11-11'
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
  assert.ok(r.html.includes(SITE + '/img/mill.jpg'));
  assert.ok(!r.html.includes('cdn.stock.test'));
  assert.match(r.notes, /Skipped 1 photo\(s\)/);
  assert.match(r.html, /<meta name="referrer" content="no-referrer">/);
});

test('it reads the home page and up to 3 linked pages, from their own site only', async function () {
  const r = await generate(GOOD);
  assert.deepStrictEqual(r.net.calls.pages, [SITE + '/', SITE + '/services', SITE + '/about-us', SITE + '/contact']);
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
  const base = { headline: 'Milling in Hamilton', intro: 'Milling and turning.', area: '', about: '', comparison: '', services: [{ title: 'Milling', text: '' }] };
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
  const facts = { name: 'Test Firm', host: 'test.example', logo: '', phones: [], emails: [], photos: [] };
  const content = gen.buildContent(facts, { headline: 'A', intro: 'B', area: '', about: '', services: [{ title: 'C', text: '' }], comparison: '' });
  const fixed = [content.banner, content.quoteButton, content.servicesHeading, content.quoteHeading, content.quoteIntro, content.send,
    content.demoNote, content.demoStatus, content.contactHeading, content.phoneLabel, content.emailLabel].concat(Object.values(content.labels));
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
