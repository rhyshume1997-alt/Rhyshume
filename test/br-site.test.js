'use strict';

// Run with: node --test
// WP-E (business review): site copy, structure and SEO files.
// Inputs: the static pages, sitemap.xml, llms.txt and the two price snapshots in docs/business-review.
// Outputs: pass or fail. Guards: prices, new routes, navigation, copy rules, ISO wording, privacy wording.
// Do not weaken the money, scope or contact assertions. Routes built by other work packages are
// checked strictly as soon as their files exist (after the packages are merged).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = function (p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); };
const exists = function (p) { return fs.existsSync(path.join(ROOT, p)); };

const PAGES = ['index.html', 'websites.html', 'local-business.html', 'automation.html', 'engineering.html', 'about.html', 'contact.html', 'privacy.html', 'tolra.html', 'csv.html', '404.html', 'upgrade.html', 'seo-and-ai-visibility.html', 'council-digital-grants/index.html', 'insights/index.html', 'insights/what-to-put-on-an-engineering-firms-website.html', 'work/jnr-engineering.html', 'website-concepts/index.html'];
const COPY_PAGES = ['index.html', 'seo-and-ai-visibility.html', 'engineering.html', 'automation.html', 'about.html', 'contact.html', 'privacy.html', 'websites.html'];
const EXTERNAL = { '/business-review': 'business-review/index.html', '/automation-demos': 'automation-demos/index.html' };

function visible(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/&rsquo;|&lsquo;/g, '’').replace(/&amp;/g, '&').replace(/&middot;/g, '·').replace(/&nbsp;/g, ' ');
}

// The same extraction that produced docs/business-review/PRICE-SNAPSHOT-*.txt.
function priceLines() {
  const ENT = { '&rsquo;': '’', '&lsquo;': '‘', '&amp;': '&', '&middot;': '·', '&pound;': '£', '&nbsp;': ' ', '&ndash;': '–', '&quot;': '"', '&#x27;': "'" };
  const out = [];
  PAGES.concat(['llms.txt']).forEach(function (f) {
    if (!exists(f)) return;
    let s = read(f);
    if (f.endsWith('.html')) s = s.replace(/<script(?![^>]*ld\+json)[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]*>/g, ' ');
    s = s.replace(/&[#\w]+;/g, function (m) { return ENT[m] || m; }).replace(/\\"/g, '"');
    const seen = {};
    s.split(/(?<=[.!?])\s+|\n/).forEach(function (x) {
      x = x.replace(/\s+/g, ' ').trim();
      if (/£|\bdeposit\b|\bVAT\b|per month|a month|subscription|\b297\b/i.test(x) && !seen[x]) { seen[x] = 1; out.push(f + ' :: ' + x); }
    });
  });
  return out;
}
const lines = function (p) { return read(p).split('\n').filter(Boolean); };

test('prices: every money, deposit and VAT line from before is still there, except the one deliberate removal', function () {
  const before = lines('docs/business-review/PRICE-SNAPSHOT-before.txt');
  const now = priceLines();
  // Deliberate: the automation page no longer prints a price (new automation work is quoted, DECISIONS and SPEC-GAPS 1).
  const removed = before.filter(function (l) { return now.indexOf(l) === -1; });
  removed.forEach(function (l) { assert.ok(/^automation\.html :: /.test(l) && /Automation and AI set up is from £200/.test(l), 'a price line was lost: ' + l); });
  assert.ok(removed.length >= 1, 'the automation page price line should have been removed on purpose');
  assert.ok(now.filter(function (l) { return /^local-business\.html :: .*Automation and AI set up from £200/.test(l); }).length === 1, 'the small business page keeps Automation and AI set up from £200');
});

test('prices: the after snapshot is current, and the only added lines repeat existing values', function () {
  const after = lines('docs/business-review/PRICE-SNAPSHOT-after.txt');
  assert.deepStrictEqual(priceLines(), after, 'regenerate docs/business-review/PRICE-SNAPSHOT-after.txt deliberately if a money line changed');
  const before = lines('docs/business-review/PRICE-SNAPSHOT-before.txt');
  after.filter(function (l) { return before.indexOf(l) === -1; }).forEach(function (l) {
    const ok = /^websites\.html :: (Websites start from £1,500 one-off, and a website with a quote workflow starts from £3,800 one-off\.|A care plan, from £35 a month, is optional\.|I’m not VAT registered, so no VAT is added\.)$/.test(l) ||
      (/^seo-and-ai-visibility\.html :: /.test(l) && !/£/.test(l));
    assert.ok(ok, 'unexpected new price line: ' + l);
  });
});

test('prices: only approved amounts appear, no 297 package, no new prices for SEO, AI visibility or automation, no mandatory subscription', function () {
  const approved = ['£1,500', '£3,800', '£35', '£200', '£150', '£120', '£60', '£2,500', '£20,000'];
  PAGES.concat(['llms.txt']).forEach(function (f) {
    if (!exists(f)) return;
    (read(f).match(/£\s?[\d,]+/g) || []).forEach(function (m) { assert.ok(approved.indexOf(m.replace(/[\s,]+$/, '').replace(/\s/g, '')) !== -1, f + ' has an unapproved amount ' + m); });
    assert.ok(!/297/.test(visible(read(f))), f + ' mentions 297');
  });
  ['seo-and-ai-visibility.html', 'automation.html'].forEach(function (f) { assert.ok(!/£/.test(read(f)), f + ' must carry no price'); });
  const seo = visible(read('seo-and-ai-visibility.html'));
  assert.ok(!/\b\d+\s*(hours|hrs)\b|per month|\ba month\b/i.test(seo), 'no hours or package prices on the SEO page');
  assert.ok(/Request a quote/.test(seo) && /Discuss your requirements/.test(seo));
  assert.ok(/Discuss your requirements/.test(visible(read('automation.html'))));
  assert.ok(!/free website[^.]{0,60}(subscription|monthly plan)/i.test(visible(read('index.html') + read('websites.html') + read('local-business.html'))), 'free website with a subscription');
  const lb = read('local-business.html');
  ['from £1,500', 'from £3,800', 'from £35 a month', 'from £200', 'from £150', 'from £120', 'from £60', '50% deposit'].forEach(function (p) { assert.ok(lb.includes(p), p + ' missing from the small business page'); });
});

test('new SEO and AI visibility page: metadata, one h1, valid JSON-LD without ratings, prices or offers', function () {
  const h = read('seo-and-ai-visibility.html');
  const title = h.match(/<title>([^<]+)<\/title>/)[1];
  assert.ok(title.length >= 10 && title.length <= 70, 'title length ' + title.length);
  const d = h.match(/<meta name="description" content="([^"]+)"/)[1];
  assert.ok(d.length <= 160, 'description length ' + d.length);
  assert.ok(h.includes('<link rel="canonical" href="https://www.rhyshume.co.uk/seo-and-ai-visibility">'));
  assert.ok(!/noindex/i.test(h));
  assert.strictEqual((h.match(/<h1[ >]/g) || []).length, 1);
  const ld = JSON.parse(h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const types = ld['@graph'].map(function (n) { return n['@type']; });
  ['Person', 'ProfessionalService', 'Service', 'FAQPage', 'BreadcrumbList'].forEach(function (t) { assert.ok(types.indexOf(t) !== -1, t); });
  assert.ok(!/AggregateRating|"Review"|"offers"|"price"|priceRange/.test(JSON.stringify(ld)), 'no review, rating or price markup');
  const faq = ld['@graph'].find(function (n) { return n['@type'] === 'FAQPage'; });
  faq.mainEntity.forEach(function (q) { assert.ok(visible(h).replace(/\s+/g, ' ').includes(q.name), 'FAQ question is visible on the page: ' + q.name); });
});

test('SEO page: four way separation, no guarantees, AI results vary, enquiry routes', function () {
  const t = visible(read('seo-and-ai-visibility.html')).replace(/\s+/g, ' ');
  ['Initial assessment', 'Initial implementation', 'Ongoing management', 'Additional specialist work'].forEach(function (s) { assert.ok(t.includes(s), s); });
  assert.ok(/AI search results vary/.test(t));
  assert.ok(/do not guarantee rankings/.test(t) && /do not guarantee that an AI tool will recommend you/.test(t));
  assert.ok(/awaiting a supported test/.test(t));
  assert.ok(!/\b\d{1,3}\s?%/.test(t), 'no AI visibility percentage');
  const h = read('seo-and-ai-visibility.html');
  assert.ok(h.includes('href="/business-review">See how your business compares<') && h.includes('href="/local-business#enquiry">Request a quote<') && h.includes('calendar.google.com/calendar/appointments'));
});

test('home page: the brief headline, supporting copy, both calls to action and the section flow', function () {
  const h = read('index.html');
  assert.ok(h.includes('<h1 id="hero-h" class="rise" style="--y:16px">Make your business easier to find. And easier to run.</h1>'));
  assert.ok(visible(h).replace(/\s+/g, ' ').includes('Websites, SEO, AI visibility and custom business systems for companies that want to improve how they’re found and how they work. Whether you’re losing enquiries, spending hours on repetitive admin or managing jobs across disconnected systems, I’ll help you work out what needs improving and build the right solution.'));
  assert.strictEqual((h.match(/<h1[ >]/g) || []).length, 1);
  const hero = h.match(/<section class="hero"[\s\S]*?<\/section>/)[0];
  assert.ok(hero.includes('<a class="btn" href="/business-review">See how your business compares</a>'));
  assert.ok(hero.includes('<a class="btn btn-alt" href="/contact">Get a free website preview</a>'));
  const order = ['id="problems"', 'id="compare"', 'id="websites"', 'id="systems"', 'id="engineering"', 'id="genuine-work"', 'id="demos"', 'id="steps"', 'aria-labelledby="last-h"'].map(function (k) { return h.indexOf(k); });
  order.forEach(function (i, n) { assert.ok(i > 0, 'section ' + n + ' missing'); if (n) assert.ok(i > order[n - 1], 'section ' + n + ' is out of order'); });
  assert.ok(h.indexOf('id="ft-sunny-hours"') > h.indexOf('class="result"'), 'real work before the made-up concepts');
  assert.ok(/not the cheapest option/.test(h));
});

test('engineering page: the brief headline and explanation, capabilities as designed in, demonstrated versus potential', function () {
  const h = read('engineering.html');
  assert.ok(h.includes('<h1>Business systems built with control, traceability and the people using them in mind</h1>'));
  assert.ok(h.includes('Engineering businesses need systems that reflect how work actually moves through the company. From enquiries and quotations to job tracking, document approval and reporting, I build systems around real operational processes. My experience working with structured requirements and validation in regulated environments informs how I approach testing, access control, documentation and changes.'));
  ['Document revision controls', 'User permissions', 'Audit trails', 'Approvals', 'Traceability', 'Change records', 'Test evidence', 'Controlled reporting', 'Customer and job records', 'Requirements documentation'].forEach(function (c) { assert.ok(h.includes('<th scope="row">' + c + '</th>'), c); });
  const t = visible(h).replace(/\s+/g, ' ');
  assert.ok(/can be designed into an agreed solution/.test(t) && /None of them is claimed as already available to you/.test(t));
  assert.ok(/Demonstrated\./.test(t) && /Potential\./.test(t) && /Not claimed\./.test(t));
  assert.ok(!/fully compliant|GxP compliant|validated system|21 CFR|FDA|regulatory approval is|approved by/i.test(t));
});

test('ISO wording: names without edition years, familiarity not certification, no employer', function () {
  COPY_PAGES.concat(['csv.html', 'tolra.html', 'work/jnr-engineering.html', 'council-digital-grants/index.html']).forEach(function (f) {
    const t = visible(read(f)).replace(/\s+/g, ' ');
    assert.ok(!/ISO\s*(9000|9001|13485|14001|27001)\s*[:\-]\s*\d{4}/.test(t), f + ' has an ISO edition year');
    assert.ok(!/ISO\s*\d+:\d{4}/.test(t), f + ' has an ISO edition year');
    const cleaned = t.replace(/is not ISO certified/g, '').replace(/not ISO certified/g, '').replace(/not certification/g, '');
    assert.ok(!/ISO[^.]{0,60}(certified|compliant|aligned)|(certified|compliant|aligned) (to|with) ISO/i.test(cleaned), f + ' implies ISO certification or compliance');
  });
  ['engineering.html', 'about.html'].forEach(function (f) {
    const t = visible(read(f)).replace(/\s+/g, ' ');
    assert.ok(/familiarity with the quality management principles behind ISO 9000, ISO 9001 and ISO 13485|familiar with the quality management principles behind ISO 9000, ISO 9001 and ISO 13485/.test(t), f);
    assert.ok(/not certification/.test(t) && /not ISO certified/.test(t), f);
  });
  assert.ok(!/terumo/i.test(COPY_PAGES.map(function (f) { return read(f); }).join('')));
});

test('copy rules on the pages and files rewritten for the business review', function () {
  const BAN = /\b(seamless|seamlessly|showcase|showcases|delve|cutting[- ]edge|whole|lands|quiet|quietly|proper)\b/i;
  COPY_PAGES.concat(['llms.txt']).forEach(function (f) {
    const raw = read(f);
    const t = f.endsWith('.html') ? visible(raw) : raw;
    assert.ok(!/—/.test(raw), f + ' has an em dash');
    assert.ok(!/–/.test(t), f + ' has an en dash');
    assert.ok(!/…|\.\.\./.test(t), f + ' has an ellipsis');
    assert.ok(!/ - /.test(t), f + ' has a spaced hyphen');
    assert.ok(!BAN.test(t), f + ' has a banned word: ' + (t.match(BAN) || [])[0]);
    assert.ok(!/rhyshume1997@gmail\.com/.test(raw.replace(/api\/contact/g, '')), f + ' shows the personal address');
  });
});

test('navigation: the same eight links and button on every page with the main menu, and the same footer list', function () {
  let nav0 = null, foot0 = null;
  PAGES.forEach(function (f) {
    const h = read(f);
    const m = h.match(/<nav class="(?:nav|site-nav)"[^>]*aria-label="Main">([\s\S]*?)<\/nav>/);
    assert.ok(m, f + ' has no main menu');
    const links = (m[1].match(/<a href="[^"]+"[^>]*>[^<]+<\/a>/g) || []).map(function (a) { return a.replace(/ aria-current="page"/, ''); }).join('|');
    if (nav0 === null) nav0 = links; assert.strictEqual(links, nav0, f + ' menu differs');
    assert.strictEqual((links.match(/<a /g) || []).length, 8);
    assert.ok(/<a class="btn" href="\/business-review">Free business review<\/a>/.test(h.split('<main')[0] + h.split('</header>')[0]), f + ' header button');
    const ul = h.split('<footer')[1].match(/<h2>Contents<\/h2>\s*(<ul>[\s\S]*?<\/ul>)/)[1];
    if (foot0 === null) foot0 = ul; assert.strictEqual(ul, foot0, f + ' footer list differs');
    assert.ok(h.includes('<p class="about-line">Websites, SEO and AI visibility, automation and business systems, from Glasgow.</p>'), f + ' footer line');
  });
  ['/seo-and-ai-visibility', '/business-review', '/automation-demos', '/local-business'].forEach(function (r) { assert.ok(foot0.includes('href="' + r + '"'), r + ' in the footer'); });
});

test('sitemap and llms.txt: new public routes listed, hidden and report routes never', function () {
  const sm = read('sitemap.xml'), llms = read('llms.txt');
  ['seo-and-ai-visibility', 'business-review', 'automation-demos'].forEach(function (r) {
    assert.ok(sm.includes('https://www.rhyshume.co.uk/' + r + '</loc>'), r + ' in the sitemap');
    assert.ok(llms.includes('https://www.rhyshume.co.uk/' + r), r + ' in llms.txt');
  });
  assert.ok(!/business-review\/(report|bot)|w-82503121e7fdf54e|c-09b37e50c043baaa|c-3e9a41b7d20f58c6|\/upgrade|\/preview/.test(sm + llms), 'a private route is listed');
  (sm.match(/<loc>[^<]+<\/loc>/g) || []).forEach(function (l) {
    const p = l.replace(/<\/?loc>/g, '').replace('https://www.rhyshume.co.uk', '') || '/';
    if (EXTERNAL[p]) return;
    const f = p === '/' ? 'index.html' : p.endsWith('/') ? p.slice(1) + 'index.html' : (exists(p.slice(1) + '.html') ? p.slice(1) + '.html' : p.slice(1) + '/index.html');
    assert.ok(exists(f), 'sitemap route has no file: ' + p);
  });
  const lastmods = (sm.match(/<lastmod>[^<]+/g) || []).length; assert.strictEqual(lastmods, (sm.match(/<loc>/g) || []).length);
});

test('links: every internal link on the pages resolves to a file or a route owned by another package (strict once those files exist)', function (t) {
  const missing = [], pending = {};
  PAGES.forEach(function (f) {
    (read(f).match(/href="\/[^"]*"/g) || []).forEach(function (a) {
      let p = a.slice(6, -1).split('#')[0].split('?')[0];
      if (!p || p === '/') return;
      if (EXTERNAL[p]) { if (!exists(EXTERNAL[p])) pending[p] = true; return; }
      const cands = [p.slice(1), p.slice(1) + '.html', p.slice(1).replace(/\/$/, '') + '/index.html'];
      if (!cands.some(exists) && !/^\/api\//.test(p)) missing.push(f + ' -> ' + p);
    });
  });
  assert.deepStrictEqual(missing, [], 'dead internal links');
  const waiting = Object.keys(pending);
  if (waiting.length) t.diagnostic('routes owned by other packages, not on this branch yet: ' + waiting.join(', '));
});

test('privacy notice: review tool sections, providers named, three separate choices, no compliance claims, nothing unconfirmed asserted', function () {
  const h = read('privacy.html'), t = visible(h).replace(/\s+/g, ' ');
  ['Supabase', 'Vercel', 'Google PageSpeed Insights', 'Resend', 'Cloudflare Turnstile'].forEach(function (p) { assert.ok(t.includes(p), p); });
  ['Email me the report.', 'I would like Rhys to contact me about these results.', 'Marketing.'].forEach(function (p) { assert.ok(t.includes(p), p); });
  assert.ok(/none is ticked for you/.test(t) && /Nothing promotional is sent automatically/.test(t));
  assert.ok(!/GDPR|PECR|compliant|compliance/i.test(t), 'a legal compliance claim');
  assert.ok(/still being finalised/.test(t), 'retention and lawful basis for the review are marked as not final');
  assert.ok(!/(90|60|7|14) days|\b2 years|\b6 months/.test(t), 'a retention period that has not been approved');
  assert.ok(t.includes('I’m not currently registered with the ICO.'), 'existing statement left as it was, flagged in PRIVACY-TODO.md');
  assert.ok(exists('docs/business-review/PRIVACY-TODO.md'));
  assert.ok(t.includes('upgrade my site form'), 'upgrade wording kept (upgrade.test.js)');
});

test('contact page: routes by need use existing destinations and add no forms', function () {
  const h = read('contact.html');
  assert.strictEqual((h.match(/<form[ >]/g) || []).length, 1, 'still exactly one form');
  assert.ok(h.includes('action="/api/contact"') && h.includes('name="form" value="preview"'));
  const routes = h.match(/<section class="c-routes"[\s\S]*?<\/section>/)[0];
  ['href="#preview"', 'calendar.google.com/calendar/appointments', 'href="/business-review"', 'href="/seo-and-ai-visibility"'].forEach(function (x) { assert.ok(routes.includes(x), x); });
  assert.ok(h.includes('rhys@rhyshume.co.uk') && h.includes('tel:+447908041480'));
});

test('automation page: potential workflows labelled as potential, demonstrations linked, no price', function () {
  const h = read('automation.html'), t = visible(h).replace(/\s+/g, ' ');
  assert.ok(/potential workflows, not existing implementations at your business/.test(t));
  ['Quotation follow up', 'Enquiry management', 'Job updates', 'Document approval'].forEach(function (w) { assert.ok(t.includes(w), w); });
  assert.ok(h.includes('href="/automation-demos"'));
  assert.ok(!/£/.test(h) && !/from £200/.test(t));
  assert.ok(/I'm not VAT registered|I’m not VAT registered/.test(h), 'VAT line kept');
});

test('hidden routes stay hidden: not linked, not in the sitemap, report and workbook routes noindex in vercel.json', function () {
  PAGES.forEach(function (f) { assert.ok(!/w-82503121e7fdf54e|c-09b37e50c043baaa|c-3e9a41b7d20f58c6/.test(read(f)), f + ' links a hidden route'); });
  const v = JSON.parse(read('vercel.json'));
  const rule = v.headers.find(function (r) { return r.source === '/business-review/report'; });
  assert.ok(rule && rule.headers.some(function (x) { return x.key === 'X-Robots-Tag' && /noindex/.test(x.value); }));
});
