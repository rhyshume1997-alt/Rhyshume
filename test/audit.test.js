'use strict';

// Run with: node --test
// Checks for the audit fixes: no employer named, softened grants and result wording, price table spacing.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = function (p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); };
function publicFiles(dir, out) {
  fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).forEach(function (e) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) { if (!/^(\.git|node_modules|test|docs|api|fonts|images|w-[0-9a-f]+|c-[0-9a-f]+)$/.test(e.name)) publicFiles(rel, out); }
    else if (/\.(html|txt|xml|md)$/.test(e.name)) out.push(rel);
  });
  return out;
}
const text = function (html) { return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]*>/g, ' '); };

test('no public page, meta tag or llms.txt names an employer', function () {
  publicFiles('.', []).forEach(function (f) {
    const s = read(f);
    assert.ok(!/terumo|aortic|thermo fisher/i.test(s), f + ' names an employer');
    assert.ok(!/CSV Engineer at/i.test(s), f + ' says a job title at an employer');
  });
});

test('grants page: payout step is not certain, delivery wording is softened, no AI tool example', function () {
  const g = read('council-digital-grants/index.html');
  assert.ok(!/the council reimburses you\./.test(text(g).replace(/You pay your supplier and the council reimburses you once the award is made\./, '')), 'step 2.4 still certain');
  assert.ok(g.includes('If your grant is approved, how it pays out depends on the scheme, so check with your council.'));
  assert.ok(!/timed to the claim deadline/.test(g));
  assert.ok(g.includes('Delivery planned around the claim deadline.'));
  assert.ok(!/AI tool/i.test(g));
});

test('grants page: dates warning is there, and title and descriptions agree on both councils', function () {
  const g = read('council-digital-grants/index.html');
  assert.ok(g.includes('Dates and conditions change. Check every date and condition with the council before you rely on them.'));
  const d = g.match(/<meta (?:name|property)="(?:description|og:description|twitter:description)" content="[^"]*"/g);
  assert.strictEqual(d.length, 3);
  d.forEach(function (m) { assert.ok(/East Dunbartonshire and North Lanarkshire/.test(m), m); });
});

test('result promises are softened on the automation and websites pages', function () {
  assert.ok(!/The result is/.test(read('automation.html')));
  assert.ok(!/The result is/.test(read('websites.html')));
  assert.ok(!/nothing lost between the form and your inbox/.test(read('websites.html')));
});

test('price table has a space between the item name and its price', function () {
  const h = read('index.html');
  assert.ok(!/(Quote-ready site|Site plus quote workflow|Care plan)<span class="status">/.test(h));
  assert.ok(/Care plan <span class="status">/.test(h));
  assert.ok(/Care plan /.test(text(h)));
});

test('home page: invoice drafting and the Tolra site offer are labelled pilot, no half price, and no years claim anywhere', function () {
  const h = read('index.html');
  assert.ok(h.includes('In pilot: AI drafts the invoice'));
  assert.ok(h.includes('Pilot only, ask me.'));
  assert.ok(!/half price/i.test(h));
  publicFiles('.', []).forEach(function (f) { assert.ok(!/nearly three years/i.test(read(f)), f + ' still has the years claim'); });
  assert.ok(read('index.html').includes('I come from a computer system validation background.'));
  assert.ok(read('csv.html').includes('I come from a computer system validation background.'));
  assert.ok(read('llms.txt').includes('He comes from a computer system validation background.'));
});

test('copy rules on the files changed: no em dashes, none of the banned words', function () {
  ['index.html', 'about.html', 'csv.html', 'automation.html', 'websites.html', 'council-digital-grants/index.html', 'llms.txt'].forEach(function (f) {
    const s = read(f);
    assert.ok(!/—/.test(s), f + ' has an em dash');
  });
});
