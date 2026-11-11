'use strict';

// Run with: node --test
// Checks on the static pages: the local business page, the menu, the sitemap, and that the hidden
// client workbook and client portal pages stay out of public lists and stay noindex.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = function (p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); };

const HIDDEN = ['w-82503121e7fdf54e', 'c-09b37e50c043baaa'];
const PAGE = 'local-business.html';
const BANNED = /\b(whole|lands|quiet|quietly|proper)\b/i;

function htmlFiles(dir, out) {
  fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).forEach(function (e) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) { if (!/^(\.git|node_modules|test|docs|api|fonts|images)$/.test(e.name)) htmlFiles(rel, out); }
    else if (e.name.endsWith('.html')) out.push(rel);
  });
  return out;
}
function visibleText(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]*>/g, ' ');
}
const publicPages = htmlFiles('.', []).filter(function (f) { return !HIDDEN.some(function (h) { return f.startsWith(h); }); });

test('the new page has a title, a description under 161 characters and a canonical address', function () {
  const html = read(PAGE);
  assert.match(html, /<title>[^<]{10,70}<\/title>/);
  const d = html.match(/<meta name="description" content="([^"]+)"/);
  assert.ok(d, 'meta description missing');
  assert.ok(d[1].length <= 160, 'description is ' + d[1].length + ' characters');
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.rhyshume\.co\.uk\/local-business">/);
  assert.ok(!/noindex/i.test(html), 'the new page must be indexable');
});

test('the new page is in the sitemap and llms.txt, and the hidden pages are not', function () {
  const sitemap = read('sitemap.xml');
  const llms = read('llms.txt');
  assert.ok(sitemap.includes('https://www.rhyshume.co.uk/local-business</loc>'));
  assert.ok(llms.includes('https://www.rhyshume.co.uk/local-business'));
  HIDDEN.forEach(function (h) {
    assert.ok(!sitemap.includes(h), h + ' is in the sitemap');
    assert.ok(!llms.includes(h), h + ' is in llms.txt');
  });
});

test('the hidden pages are not linked from any public page, and are still noindex', function () {
  publicPages.forEach(function (f) {
    const html = read(f);
    HIDDEN.forEach(function (h) { assert.ok(!html.includes(h), h + ' is linked from ' + f); });
  });
  HIDDEN.forEach(function (h) {
    assert.match(read(path.join(h, 'index.html')), /<meta name="robots" content="noindex,nofollow,noarchive">/);
  });
  const vercel = JSON.parse(read('vercel.json'));
  HIDDEN.forEach(function (h) {
    const rule = vercel.headers.find(function (r) { return r.source.indexOf(h) !== -1; });
    assert.ok(rule && rule.headers.some(function (x) { return x.key === 'X-Robots-Tag' && /noindex/.test(x.value); }), h + ' lost its X-Robots-Tag');
  });
});

test('every public page with the main menu links to the new page', function () {
  publicPages.filter(function (f) { return read(f).includes('<nav class="nav"'); }).forEach(function (f) {
    const nav = read(f).match(/<nav class="nav"[\s\S]*?<\/nav>/)[0];
    assert.ok(nav.includes('<a href="/local-business"'), f + ' has no menu link');
    assert.ok(nav.includes('Websites and digital for local business'), f + ' menu label is wrong');
  });
});

test('the home page has the small link and the grants page links back', function () {
  assert.ok(read('index.html').includes('I also build websites for local businesses</a>'));
  assert.ok(read('council-digital-grants/index.html').includes('href="/local-business"'));
});

test('the new page has all the sections, the seven from prices and no tier names', function () {
  const html = read(PAGE);
  ['id="proof"', 'id="services"', 'id="how"', 'id="grants"', 'id="about"', 'id="faq"', 'id="enquiry"'].forEach(function (id) {
    assert.ok(html.includes(id), id + ' missing');
  });
  [
    ['Websites', 'from £1,500'], ['Care plans', 'from £35 a month'], ['Filming', 'from £200'],
    ['Google search set up', 'from £150'], ['Online listings and structured data', 'from £120'],
    ['Automation and AI set up', 'from £200'], ['Domain and email set up', 'from £60']
  ].forEach(function (p) {
    assert.ok(new RegExp(p[0] + '<span class="status">' + p[1] + '</span>').test(html), p.join(' ') + ' missing');
  });
  assert.ok(!/\b(good|better|best)\b/i.test(visibleText(html).replace(/Good(?= morning)/g, '')), 'tier names found');
  assert.ok(html.includes('No one can guarantee rankings in Google or AI tools. What I can do is make sure your information is complete, accurate and easy to find, which is the part you control.'));
  assert.ok(!/AI tools, I make sure/.test(html), 'comma splice is back');
  assert.ok(!/AI visibility/i.test(html));
});

test('the new page uses the existing form and the Turnstile box', function () {
  const html = read(PAGE);
  assert.ok(html.includes('action="/api/contact"'));
  assert.ok(html.includes('name="form" value="local"'));
  assert.ok(html.includes('class="cf-turnstile" data-sitekey="0x4AAAAAAF7ONWeir1MBB-v7" data-action="contact"'));
  assert.ok(html.includes('name="company_website"'));
  assert.ok(html.includes('/form-check.js'));
});

test('copy rules: no em dashes and none of the banned words on the new page or the grants page', function () {
  [PAGE, 'council-digital-grants/index.html'].forEach(function (f) {
    const text = visibleText(read(f));
    assert.ok(!/—/.test(read(f)), f + ' has an em dash');
    assert.ok(!BANNED.test(text), f + ' has a banned word: ' + (text.match(BANNED) || [])[0]);
  });
});

test('claim rules: no employer, no grant funded wording, no monthly fees on the grants page', function () {
  const page = visibleText(read(PAGE));
  assert.ok(!/terumo|day job|9 to 5|validation engineer|CSV engineer/i.test(page), 'employer or day job mentioned');
  [read(PAGE), read('council-digital-grants/index.html')].forEach(function (html) {
    const t = visibleText(html);
    assert.ok(!/grant[- ]funded|covered by the grant|funded by the grant/i.test(t), 'grant funded wording found');
  });
  const grants = visibleText(read('council-digital-grants/index.html'));
  assert.ok(!/a month|per month|monthly|care plan/i.test(grants), 'monthly fee wording on the grants page');
  assert.ok(!/logo/i.test(read('council-digital-grants/index.html').replace(/alt="[^"]*"/g, '')) );
});

test('the grants page lists only website, Google search set up, and domain and email as set up costs', function () {
  const html = read('council-digital-grants/index.html');
  const s = html.match(/<section class="clause" id="projects"[\s\S]*?<\/section>/)[0];
  assert.strictEqual((s.match(/<li>/g) || []).length, 3);
  assert.ok(/<li>A website/.test(s) && /<li>Google search set up/.test(s) && /<li>Domain and email set up/.test(s));
  assert.ok(!/automation|e-commerce|CRM/i.test(s));
});

test('go-live fixes: no Marpet screenshot or coming soon note, button goes to the form, deposit line, footer', function () {
  const html = read(PAGE);
  assert.ok(!/marpet-fabrications/.test(html) && !/coming soon/i.test(html));
  assert.ok(!fs.existsSync(path.join(ROOT, 'images/marpet-fabrications-top.jpg')));
  assert.ok(html.includes('<a class="btn" href="#enquiry">Send an enquiry</a>'));
  assert.ok(html.includes('You pay a 50% deposit to start. If you’re applying for a grant, nothing is paid until your grant is approved. The timing is set out in your quote.'));
  publicPages.filter(function (f) { return read(f).includes('about-line'); }).forEach(function (f) {
    const h = read(f);
    assert.ok(h.includes('for engineering firms and local businesses, from Glasgow.'), f + ' footer line');
    assert.ok(!h.includes('for engineering and manufacturing firms, from Glasgow'), f + ' old footer line');
    assert.ok(h.includes('<li><a href="/local-business">Websites and digital for local business</a></li>'), f + ' footer link');
  });
});

test('home page prices match the local business page and do not say Google search is included', function () {
  const h = read('index.html');
  assert.ok(h.includes('Quote-ready site <span class="status">from £1,500 one-off'));
  assert.ok(h.includes('Care plan <span class="status">from £35 a month'));
  assert.ok(!/2,200|£60 a month/.test(h));
  assert.ok(/A fast site on your own domain with a quote form that takes drawings\./.test(h));
  assert.ok(!/Quote-ready site[\s\S]{0,400}Google search set up/.test(h.replace(/<[^>]*>/g, ' ')));
});

test('no public page or llms.txt shows the old Gmail address', function () {
  publicPages.concat(['llms.txt']).forEach(function (f) {
    assert.ok(!read(f).includes('rhyshume1997@gmail.com'), f + ' still shows the old Gmail address');
  });
});

test('grants page keeps the three set up costs and the softer wording together', function () {
  const g = read('council-digital-grants/index.html');
  assert.ok(g.includes('Set up costs that may be eligible'));
  assert.ok(g.includes('Delivery planned around the claim deadline.'));
  assert.ok(g.includes('How it pays out depends on the scheme'));
  assert.ok(g.includes('href="/local-business"'));
});
