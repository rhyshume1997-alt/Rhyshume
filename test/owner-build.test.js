'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rich = require('../tools/concept-rich');
const blob = require('../api/_lib/blob');
const handler = require('../api/owner-build');
const page = require('../api/c');

function res() {
  return { statusCode: 0, headers: {}, body: '', setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { this.body = b || ''; } };
}
const base = { name: 'Acme', servicesHeading: 'Services', quoteHeading: 'Quote', contactHeading: 'Contact', banner: 'Concept', footer: 'f', services: [] };

test('the Prototype line and the Like it bar are on every page, and only safe links are used', () => {
  const none = rich.renderRich(base, null, null);
  assert.ok(none.includes('Like it? Reply to my email or book 20 minutes'));
  assert.ok(none.includes('Prototype by Rhys Hume, built from your current site.'));
  assert.ok(none.includes('href="mailto:rhys@rhyshume.co.uk'));
  const withCta = rich.renderRich(base, null, null, { cta: { mail: 'mailto:rhys@rhyshume.co.uk', book: 'javascript:alert(1)' } });
  assert.ok(withCta.includes('Like it? Reply to my email or book 20 minutes'));
  assert.ok(withCta.includes('Reply by email'));
  assert.ok(!withCta.includes('javascript:'));
  assert.ok(!withCta.includes('—'));
});

test('blob ids must be 24 hex characters', () => {
  assert.ok(blob.validId('a'.repeat(24)));
  assert.ok(!blob.validId('../etc/passwd'));
  assert.ok(!blob.validId('a'.repeat(23)));
});

test('owner build refuses a wrong key and refuses everything when no key is set', async () => {
  delete process.env.OWNER_BUILD_KEY;
  let r = res();
  await handler({ method: 'POST', body: { key: 'x', website: 'example.co.uk' } }, r);
  assert.strictEqual(r.statusCode, 401);
  process.env.OWNER_BUILD_KEY = 'a-long-random-key-for-tests';
  r = res();
  await handler({ method: 'POST', body: { key: 'wrong', website: 'example.co.uk' } }, r);
  assert.strictEqual(r.statusCode, 401);
  r = res();
  await handler({ method: 'GET' }, r);
  assert.strictEqual(r.statusCode, 405);
  delete process.env.OWNER_BUILD_KEY;
});

test('saved concept route is noindex and 404s on bad ids', async () => {
  const r = res();
  await page({ query: { id: '../x' } }, r);
  assert.strictEqual(r.statusCode, 404);
  assert.match(r.headers['x-robots-tag'], /noindex/);
});

test('a title that is a list of services is not used as the firm name', () => {
  const preview = require('../tools/preview');
  const html = '<html><head><title>Mechanical Engineering, Fabrication, Welding, Hire subsea baskets, Offshore fabrication</title></head><body><h1>Welcome</h1><p>Calder Engineering Ltd offers fabrication from its base in Thurso.</p></body></html>';
  const facts = preview.extractFacts([{ url: 'https://www.calderengineering.co.uk/', html: html }], '', []);
  assert.strictEqual(facts.name, 'Calder Engineering Ltd');
  const bare = preview.extractFacts([{ url: 'https://www.calderengineering.co.uk/', html: html.replace('Calder Engineering Ltd', 'We') }], '', []);
  assert.strictEqual(bare.name, 'Calderengineering');
});

test('prototype notice and the how this helps section appear with a cta and cover the problems', () => {
  const html = rich.renderRich(Object.assign({}, base, { phone: { display: '01382 810737', href: '+441382810737' } }), null, ['One. Why: because.'], { cta: { mail: 'mailto:rhys@rhyshume.co.uk' } });
  assert.ok(html.includes('Prototype by Rhys Hume'));
  assert.ok(html.includes('How this helps your business'));
  assert.ok(/AI assistants/.test(html) && /phone/i.test(html) && /changed to your spec/.test(html));
  assert.ok(!html.includes('—'));
  const plain = rich.renderRich(base, null, null);
  assert.ok(!plain.includes('How this helps your business'));
});

test('evidence checks find real problems, quote proof, and a clean page passes', () => {
  const ev = require('../tools/evidence');
  const bad = '<html><head><title>Steel</title></head><body><p>Call 0845 123 4567 Fax 01382 111 222 © 2019</p><img src="a.jpg"><img src="b.jpg"><img src="c.jpg"></body></html>';
  const found = ev.checkSite([{ url: 'http://x.co.uk/', html: bad }], { sitemap: false }, new Date('2026-11-17'));
  const ids = ev.topProblems(found, 20).map(p => p.id);
  ['viewport', 'description', 'h1', 'schema', 'form', 'https', 'sitemap', 'year', 'fax', 'nongeo', 'alt', 'title'].forEach(id => assert.ok(ids.includes(id), id));
  assert.ok(found.find(c => c.id === 'year').proof.includes('2019'));
  const good = '<html><head><title>Calder Engineering, steel fabrication in Thurso</title><meta name="viewport" content="width=device-width"><meta name="description" content="x"><meta property="og:title" content="x"><script type="application/ld+json">{}</script></head><body><h1>Calder</h1><a href="tel:+441847123456">01847 123456</a><form><textarea></textarea></form></body></html>';
  const ok = ev.checkSite([{ url: 'https://y.co.uk/', html: good }], { sitemap: true }, new Date('2026-11-17'));
  assert.deepStrictEqual(ev.topProblems(ok, 20).map(p => p.id), []);
  const cmp = ev.compare(found, ok);
  assert.ok(cmp.length > 3 && cmp.every(r => r.comp === true));
});

test('evidence section shows proof and the comparison, and is absent with no problems', () => {
  const evidence = { host: 'x.co.uk', checkedOn: '2026-11-17', problems: [{ issue: 'No form', proof: 'None found.', why: 'Buyers leave.' }], compHost: 'y.co.uk', compare: [{ label: 'Tap to call', theirs: false, comp: true }] };
  const html = rich.renderRich(base, null, null, { cta: { mail: 'mailto:rhys@rhyshume.co.uk' }, evidence });
  assert.ok(html.includes('Problems on your current site you may not know about'));
  assert.ok(html.includes('None found.') && html.includes('The same checks on y.co.uk'));
  assert.ok(!html.includes('—'));
  const none = rich.renderRich(base, null, null, { cta: { mail: 'mailto:rhys@rhyshume.co.uk' }, evidence: { host: 'x', problems: [] } });
  assert.ok(!none.includes('you may not know about'));
});

test('a name that is a short list of services but unrelated to the web address is replaced from the text', () => {
  const preview = require('../tools/preview');
  const html = '<html><head><title>Steel Fabrication, Steel Erection Specialists</title></head><body><p>Welcome to Simmers Contracts Ltd, based in Keith.</p></body></html>';
  const facts = preview.extractFacts([{ url: 'https://simmerscontracts.co.uk/', html: html }], '', []);
  assert.strictEqual(facts.name, 'Simmers Contracts Ltd');
  const brand = preview.extractFacts([{ url: 'https://mdk-fab.com/', html: '<html><head><title>MDK Fab | Steel</title></head><body>x</body></html>' }], '', []);
  assert.strictEqual(brand.name, 'MDK Fab');
});

test('comparison table cannot push the page sideways on a phone', () => {
  const html = rich.renderRich(base, null, null, { cta: { mail: 'mailto:rhys@rhyshume.co.uk' }, evidence: { host: 'a-very-long-hostname-example.co.uk', checkedOn: '2026-11-17', problems: [{ issue: 'x', proof: 'y', why: 'z' }], compHost: 'another-very-long-hostname-example.co.uk', compare: [{ label: 'Business details machines can read', theirs: false, comp: true }] } });
  assert.ok(/\.evd table\{[^}]*table-layout:fixed/.test(html));
  assert.ok(/\.evd th,\.evd td\{overflow-wrap:anywhere\}/.test(html));
});

// ---------------------------------------------------------------- niche, and the builder page

test('searchFacts reads title, description, phone, address and phone-friendliness from the page and nothing else', () => {
  const ev = require('../tools/evidence');
  const home = '<html><head><title>Acme Joinery &amp; Building | Perth</title><meta name="description" content="Joiners and builders in Perth."><meta name="viewport" content="width=device-width"></head><body><a href="tel:01738000000">01738 000000</a></body></html>';
  const contact = '<html><body><p>12 High Street, Perth PH1 5AB</p></body></html>';
  const f = ev.searchFacts([{ url: 'https://acme.co.uk/', html: home }, { url: 'https://acme.co.uk/contact', html: contact }]);
  assert.deepStrictEqual(f, { title: 'Acme Joinery & Building | Perth', description: 'Joiners and builders in Perth.', phone: true, address: true, mobile: true, pagesRead: 2 });
  const bare = ev.searchFacts([{ url: 'https://acme.co.uk/', html: '<html><body><p>Hello</p></body></html>' }]);
  assert.deepStrictEqual(bare, { title: '', description: '', phone: false, address: false, mobile: false, pagesRead: 1 });
  assert.strictEqual(ev.searchFacts([{ url: 'https://a.co.uk/', html: '<address>1 Mill Rd</address>' }]).address, true);
  assert.strictEqual(ev.searchFacts([{ url: 'https://a.co.uk/', html: '<title>' + 'x'.repeat(300) + '</title>' }]).title, 'x'.repeat(119) + '...');
});

test('owner build refuses an unknown niche before it builds anything, and accepts the empty and none niches as no niche', async () => {
  process.env.OWNER_BUILD_KEY = 'a-long-random-key-for-tests';
  process.env.ANTHROPIC_API_KEY = 'k'; process.env.BLOB_READ_WRITE_TOKEN = 't';
  try {
    for (const bad of ['plumbing', 'constructor', '__proto__', 'engineering;x', 7]) {
      const r = res();
      await handler({ method: 'POST', body: { key: 'a-long-random-key-for-tests', website: 'example.co.uk', niche: bad } }, r);
      assert.strictEqual(r.statusCode, 400, String(bad));
      assert.strictEqual(JSON.parse(r.body).error, 'bad_niche');
    }
  } finally { delete process.env.OWNER_BUILD_KEY; delete process.env.ANTHROPIC_API_KEY; delete process.env.BLOB_READ_WRITE_TOKEN; }
});

test('owner build passes a valid niche to the engine (checked from the source, no network)', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'api', 'owner-build.js'), 'utf8');
  assert.match(src, /preview\.NICHES, niche/);
  assert.match(src, /niche: niche, slug: slug/);
  assert.match(src, /niche: niche \|\| 'none'/);
  assert.match(src, /nicheRaw === '' \|\| nicheRaw === 'none' \? undefined/);
});

test('builder page: the dropdown and the per-line words match the niches the engine knows', () => {
  const html = require('fs').readFileSync(require('path').join(__dirname, '..', 'build-concepts.html'), 'utf8');
  const keys = Object.keys(require('../tools/preview').NICHES);
  const options = (html.match(/<select id="n">([\s\S]*?)<\/select>/) || [])[1] || '';
  const values = (options.match(/value="([^"]*)"/g) || []).map(function (v) { return v.slice(7, -1); });
  assert.deepStrictEqual(values, [''].concat(keys));
  const listed = JSON.parse(((html.match(/var NICHES=(\[[^\]]*\])/) || [])[1] || '[]').replace(/'/g, '"'));
  assert.deepStrictEqual(listed, keys);
  assert.match(html, /niche:niche/);
  assert.ok(!html.includes('—'));
});

test('builder page: a niche word on a line is taken out of the site and competitor, and beats the dropdown', () => {
  const html = require('fs').readFileSync(require('path').join(__dirname, '..', 'build-concepts.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const vm = require('node:vm');
  const posted = [];
  const el = { value: '', textContent: '', disabled: false, className: '', appendChild() {}, set onclick(f) { this._go = f; }, get onclick() { return this._go; } };
  const dom = { k: Object.assign({}, el, { value: 'key' }), n: Object.assign({}, el, { value: 'weddings' }), a: Object.assign({}, el, { value: 'one.co.uk\ntwo.co.uk comp.co.uk trades\nthree.co.uk, hospitality' }), go: Object.assign({}, el), out: Object.assign({}, el) };
  const ctx = {
    document: { getElementById: function (id) { return { k: dom.k, n: dom.n, a: dom.a, go: dom.go, out: dom.out }[id]; }, createElement: function () { return Object.assign({}, el); } },
    fetch: async function (u, o) { posted.push(JSON.parse(o.body)); return { json: async function () { return { ok: false }; } }; },
    navigator: {}
  };
  vm.runInNewContext(script, ctx);
  return dom.go.onclick().then(function () {
    assert.deepStrictEqual(posted.map(function (p) { return [p.website, p.competitor, p.niche]; }), [
      ['one.co.uk', '', 'weddings'],
      ['two.co.uk', 'comp.co.uk', 'trades'],
      ['three.co.uk', '', 'hospitality']
    ]);
  });
});
