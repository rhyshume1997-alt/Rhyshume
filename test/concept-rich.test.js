'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { extractBrand } = require('../tools/brand');
const { renderRich } = require('../tools/concept-rich');

const content = function (over) {
  return Object.assign({
    name: 'Acme <b>Engineering</b>', host: 'acme.co.uk', banner: 'Concept by Rhys Hume, not a live site', logo: 'javascript:alert(1)',
    phone: { display: '0141 000 0000', href: '+441410000000' }, email: 'a@acme.co.uk', quoteButton: 'Get a quote', callBar: 'Call 0141 000 0000',
    headline: 'Precision work', intro: 'We make parts.', area: 'Glasgow', proof: ['Family run'], servicesHeading: 'What we do',
    services: [{ title: 'Milling', text: 'Three axis', detail: '' }], heroPhoto: { src: 'https://acme.co.uk/a.jpg', alt: 'Shop' }, photos: [{ src: 'data:text/html,x', alt: 'bad' }],
    placeholder: 'Placeholder', aboutHeading: 'About', about: 'Here a while.', quoteHeading: 'Get a quote', quoteIntro: 'Tell us.', fileTypesLine: '', replyLine: '',
    labels: { name: 'Name', email: 'Email', phone: 'Phone', need: 'Need' }, send: 'Send', demoNote: 'Demo only.', demoStatus: 'Demo only. Nothing was sent.', contactHeading: 'Contact', footer: 'Acme'
  }, over || {});
};

test('brand: takes the firm\'s most used real colour and skips greys', function () {
  const b = extractBrand([{ text: '.a{color:#0a3d62}.b{background:#0a3d62}.c{color:#333}.d{background:#fff}.e{color:#e55039}' }], '');
  assert.strictEqual(b.primary, '#0a3d62');
  assert.strictEqual(b.accent, '#e55039');
  assert.ok(b.found);
});

test('brand: falls back to a safe default when the site has no colour', function () {
  const b = extractBrand([{ text: 'a{color:#000;background:#fff}' }], '');
  assert.strictEqual(b.found, false);
  assert.match(b.primary, /^#[0-9a-f]{6}$/);
});

test('rich page: escapes text, refuses non http images, keeps the concept banner', function () {
  const html = renderRich(content(), extractBrand([{ text: '.a{color:#0a3d62}' }], ''));
  assert.ok(!html.includes('<b>Engineering</b>'));
  assert.ok(html.includes('&lt;b&gt;Engineering&lt;/b&gt;'));
  assert.ok(!html.includes('javascript:alert'));
  assert.ok(!html.includes('data:text/html'));
  assert.ok(html.includes('Concept by Rhys Hume, not a live site'));
  assert.ok(html.includes('https://acme.co.uk/a.jpg'));
  assert.ok(html.includes('tel:+441410000000'));
});

test('rich page: still a complete page with no phone, no photo and no about text', function () {
  const html = renderRich(content({ phone: null, email: null, heroPhoto: null, about: '', callBar: '' }), null);
  assert.ok(html.startsWith('<!DOCTYPE html>'));
  assert.ok(!html.includes('class="callbar"'));
  assert.ok(!html.includes('Placeholder'));
});

test('rich page: shows what was read and what changed only when the engine gives a change list', function () {
  const brand = extractBrand([{ text: '.a{color:#0a3d62}.e{color:#e55039}' }], '');
  const plain = renderRich(content(), brand);
  assert.ok(!plain.includes('id="changes"'));
  const html = renderRich(content(), brand, ['Phone at the top. Why: ring without scrolling.', '<script>x</script> one']);
  assert.ok(html.includes('id="changes"'));
  assert.ok(html.includes('Built from acme.co.uk'));
  assert.ok(html.includes('Ring without scrolling.'));
  assert.ok(html.includes('#0a3d62') && html.includes('#e55039'));
  assert.ok(!html.includes('<script>x</script>'));
});

test('rich page: button labels flip, the floor grid is there and no pill buttons are used', function () {
  const html = renderRich(content(), null);
  assert.ok(html.includes('class="fl"'));
  assert.ok(html.includes('class="floor"'));
  assert.ok(!/border-radius:\s*(9999|999|50)/.test(html));
});

test('rich page: the script loader calls back with no argument, so three.js and React really start', function () {
  const html = renderRich(content(), null);
  assert.ok(!html.includes('s.onload=cb;'));
  assert.ok(html.includes('s.onload=function(){cb();};'));
});

// ---------------------------------------------------------------- motion, nav, hover, search section

function styleOf(html) { return (html.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || ''; }
// Leaf css rules with the at-rules they sit inside, so a test can say "this one is inside the hover media query".
function cssRules(css) {
  const out = []; const stack = []; let buf = '';
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === '{') { stack.push(buf.trim()); buf = ''; }
    else if (ch === '}') {
      const sel = stack.pop();
      if (buf.trim()) out.push({ sel: sel, body: buf.trim(), at: stack.filter(function (x) { return x.charAt(0) === '@'; }) });
      buf = '';
    } else buf += ch;
  }
  return out;
}
const photo = function (n) { return { src: 'https://acme.co.uk/p' + n + '.jpg', alt: 'Photo ' + n }; };

test('motion: one photo is a still image, no slides', function () {
  const html = renderRich(content({ photos: [] }), null);
  assert.ok(!html.includes('data-slides="'));
  assert.ok(!html.includes('class="sl'));
  assert.ok(html.includes('class="shot rise r3"'));
});

test('motion: no photo at all draws no hero image and no wipe', function () {
  const html = renderRich(content({ heroPhoto: null, photos: [] }), null);
  assert.ok(!html.includes('class="shot'));
  assert.ok(!html.includes('class="wipe"'));
});

test('motion: more than one photo cross-fades, the first slide is visible and the rest are hidden from screen readers', function () {
  const html = renderRich(content({ heroPhoto: photo(1), photos: [photo(2)] }), null);
  assert.ok(html.includes('data-slides="2"'));
  assert.strictEqual((html.match(/class="sl on"/g) || []).length, 1);
  assert.strictEqual((html.match(/class="sl" aria-hidden="true"/g) || []).length, 1);
  assert.ok(html.indexOf('p1.jpg') < html.indexOf('p2.jpg'));
});

test('motion: with six photos the hero takes three, the gallery gets the other three, and no photo is shown twice', function () {
  const html = renderRich(content({ heroPhoto: photo(1), photos: [photo(2), photo(3), photo(4), photo(5), photo(6)] }), null);
  assert.ok(html.includes('data-slides="3"'));
  for (let n = 1; n <= 6; n++) assert.strictEqual((html.match(new RegExp('p' + n + '\\.jpg', 'g')) || []).length, 1, 'photo ' + n + ' shows once');
  assert.strictEqual((html.match(/<div class="photos">/g) || []).length, 1);
});

test('motion: exactly one image wipe, on the lead gallery photo, using clip-path with the image settling inside it', function () {
  const html = renderRich(content({ heroPhoto: photo(1), photos: [photo(2), photo(3), photo(4), photo(5)] }), null);
  assert.strictEqual((html.match(/class="wipe"/g) || []).length, 1);
  assert.ok(/<div class="photos"><div class="wipe">/.test(html));
  const css = styleOf(html);
  // the clip sits on the image, not on the box the observer watches, or the box never counts as visible and the wipe never runs
  assert.ok(css.includes('html.js .wipe:not(.in) img{clip-path:inset(0 100% 0 0);transform:scale(1.12)}'));
  assert.ok(css.includes('.wipe img{transition:clip-path'));
  assert.ok(!/\.wipe[^ {]*\{[^}]*clip-path/.test(css.replace(/\.wipe[^{]* img\{[^}]*\}/g, '')));
  assert.ok(html.includes("querySelectorAll('.reveal,.wipe')"));
});

test('motion: the existing rise and reveal are still there', function () {
  const html = renderRich(content(), null);
  const css = styleOf(html);
  assert.ok(css.includes('@keyframes rise'));
  assert.ok(css.includes('.reveal{opacity:0;transform:translateY(24px)'));
  assert.ok(html.includes('class="eyebrow rise r1"'));
});

test('motion: the push is a transform animation on the visible and the leaving slide, so it does not restart mid fade', function () {
  const css = styleOf(renderRich(content({ photos: [photo(2)] }), null));
  assert.ok(css.includes('.shot .sl.on,.shot .sl.prev{animation:push 8s linear forwards}'));
  assert.ok(css.includes('@keyframes push{from{transform:scale(1)}to{transform:scale(1.06)}}'));
  assert.ok(css.includes('.shot .sl{position:absolute;inset:0;opacity:0;transition:opacity'));
});

test('motion: only transform, opacity and clip-path are ever transitioned, and never "all"', function () {
  const css = styleOf(renderRich(content({ photos: [photo(2), photo(3)] }), null));
  const allowed = ['transform', 'opacity', 'clip-path', 'none'];
  const found = [];
  css.replace(/transition:([^;}]+)/g, function (m, v) { v.split(/,(?![^(]*\))/).forEach(function (part) { found.push(part.trim().split(/\s+/)[0]); }); return m; });
  assert.ok(found.length > 8, 'the page does transition things');
  found.forEach(function (p) { assert.ok(allowed.indexOf(p) !== -1, 'transition on ' + p); });
  assert.ok(!/transition:\s*all\b/.test(css));
  assert.ok(!/scale\(0\)/.test(css.replace(/scaleX\(0\)/g, '')));
  assert.ok(!/ease-in[^-o]/.test(css.replace(/ease-in-out/g, '')));
});

test('motion: every hover rule that moves something sits inside the hover media query', function () {
  const rules = cssRules(styleOf(renderRich(content(), null)));
  const hovered = rules.filter(function (r) { return /:hover/.test(r.sel); });
  assert.ok(hovered.length >= 7);
  hovered.forEach(function (r) {
    const gated = r.at.some(function (a) { return a.replace(/\s+/g, '') === '@media(hover:hover)and(pointer:fine)'; });
    const reset = r.at.some(function (a) { return /prefers-reduced-motion|max-width/.test(a); }) && /^transform:none$/.test(r.body.replace(/\s+/g, ''));
    const resetFlip = r.at.some(function (a) { return /prefers-reduced-motion/.test(a); });
    assert.ok(gated || reset || resetFlip, 'ungated hover: ' + r.sel);
  });
  // keyboard users still get the same movement
  assert.ok(rules.some(function (r) { return /\.nav nav a:focus-visible$/.test(r.sel) && /translateY/.test(r.body); }));
});

test('motion: reduced motion stops the push, the slide changes, the wipe and the nav fade', function () {
  const html = renderRich(content({ photos: [photo(2), photo(3)] }), null);
  const rm = cssRules(styleOf(html)).filter(function (r) { return r.at.some(function (a) { return /prefers-reduced-motion/.test(a); }); });
  const all = rm.map(function (r) { return r.sel + '{' + r.body + '}'; }).join('\n');
  assert.ok(all.includes('.shot .sl.on,.shot .sl.prev{animation:none}'));
  assert.ok(all.includes('html.js .wipe:not(.in) img{clip-path:none;transform:none}'));
  assert.ok(all.includes('header.nav:before{transition:none}'));
  assert.ok(html.includes("if(sh&&!reduce){"));
  assert.ok(html.includes("'(prefers-reduced-motion: reduce)'"));
});

test('nav: clear at the top, a solid layer fades in after 60px, and without script it stays solid', function () {
  const html = renderRich(content(), null);
  const css = styleOf(html);
  assert.ok(css.includes('header.nav:before{content:"";position:absolute;inset:0;z-index:-1;background:var(--paper)'));
  assert.ok(css.includes('opacity:0;transition:opacity .25s'));
  assert.ok(css.includes('header.nav.solid:before,.menu-open header.nav:before,html:not(.js) header.nav:before{opacity:1}'));
  assert.ok(html.includes("classList.toggle('solid',(window.pageYOffset||0)>60)"));
  assert.ok(html.includes("{passive:true}"));
  assert.ok(html.includes('<script>document.documentElement.classList.add("js")</script>'));
  assert.ok(!/header\.nav\{[^}]*background:/.test(css), 'the header itself has no background');
});

test('phone basics: tap flash off, taps are not delayed, the call bar clears the home bar, text stays 16px in the form', function () {
  const html = renderRich(content(), null);
  const css = styleOf(html);
  assert.ok(html.includes('viewport-fit=cover'));
  assert.ok(css.includes('-webkit-tap-highlight-color:transparent'));
  assert.ok(css.includes('a,button{touch-action:manipulation}'));
  assert.ok(css.includes('env(safe-area-inset-bottom)'));
  assert.ok(css.includes('.btn:active{transform:scale(.97)}'));
  assert.ok(/form\.qf input,form\.qf textarea\{font:400 16px/.test(css));
});

const seoEv = function (over) {
  return { host: 'acme.co.uk', checkedOn: '2026-11-19', problems: [], seo: Object.assign({ title: 'Acme <i>Joinery</i> | Perth', description: 'Joiners in Perth.', phone: true, address: false, mobile: true, pagesRead: 3 }, over || {}) };
};

test('Found on Google: shows the title, description, phone, address and phone-friendly checks from the page, and escapes them', function () {
  const html = renderRich(content(), null, null, { cta: { mail: 'mailto:rhys@rhyshume.co.uk' }, evidence: seoEv() });
  assert.ok(html.includes('<h2>Found on Google?</h2>'));
  assert.ok(html.includes('Acme &lt;i&gt;Joinery&lt;/i&gt; | Perth'));
  assert.ok(!html.includes('<i>Joinery</i>'));
  assert.ok(html.includes('Joiners in Perth.'));
  ['Page title', 'Description', 'Phone number', 'Address', 'Works on a phone'].forEach(function (k) { assert.ok(html.includes('<b>' + k + '</b>'), k); });
  assert.ok(html.includes('No postcode or address block was found on the 3 pages read.'));
  assert.ok(html.includes('A phone number is on the home page.'));
  assert.strictEqual((html.match(/<i class="no">No<\/i>/g) || []).length, 1);
  assert.ok(html.includes('on 19 November 2026'));
});

test('Found on Google: missing things are said to be missing, never filled in', function () {
  const html = renderRich(content(), null, null, { cta: { mail: 'mailto:rhys@rhyshume.co.uk' }, evidence: seoEv({ title: '', description: '', phone: false, address: true, mobile: false, pagesRead: 1 }) });
  assert.ok(html.includes('No title found'));
  assert.ok(html.includes('No description found'));
  assert.ok(html.includes('No title tag was found in the page source.'));
  assert.ok(html.includes('No phone number was found on the home page.'));
  assert.ok(html.includes('A postcode or address block was found on the 1 page read.'));
  assert.ok(html.includes('There is no viewport tag'));
  assert.strictEqual((html.match(/<i class="no">No<\/i>/g) || []).length, 4);
});

test('Found on Google: no ranking promise, no invented numbers, no em dash, and only on the owner page', function () {
  const html = renderRich(content(), null, null, { cta: { mail: 'mailto:rhys@rhyshume.co.uk' }, evidence: seoEv() });
  const sec = html.slice(html.indexOf('<section class="seo"'), html.indexOf('</section>', html.indexOf('<section class="seo"')));
  assert.ok(sec.includes('does not show where you appear in Google'));
  assert.ok(sec.includes('does not guarantee more enquiries'));
  assert.ok(!/first page|page one|top of google|#1|rank|\bmore customers\b/i.test(sec));
  assert.ok(!/\d+\s*%|\bx\d+\b/.test(sec));
  assert.ok(!sec.includes('—'));
  assert.ok(!renderRich(content(), null, null, { evidence: seoEv() }).includes('Found on Google?'));
  assert.ok(!renderRich(content(), null, null, { cta: { mail: 'mailto:rhys@rhyshume.co.uk' }, evidence: { host: 'acme.co.uk', problems: [] } }).includes('Found on Google?'));
});

test('niche: the help part does not talk about drawings or engineering for a deli, nursery or wedding business', function () {
  const eng = renderRich(content(), null, null, { cta: { mail: 'mailto:rhys@rhyshume.co.uk' } });
  assert.ok(eng.includes('trades or engineering firm') && eng.includes('drawing'));
  ['hospitality', 'childcare', 'weddings'].forEach(function (n) {
    const html = renderRich(content({ niche: n, quoteButton: 'Get in touch' }), null, null, { cta: { mail: 'mailto:rhys@rhyshume.co.uk' } });
    const help = html.slice(html.indexOf('id="help"'), html.indexOf('</section>', html.indexOf('id="help"')));
    assert.ok(!/trades or engineering|drawing|quote/i.test(help), n);
    assert.ok(help.includes('Get in touch button'));
    assert.ok(!help.includes('—'));
  });
});

test('whole page: no em dash anywhere, with every new part switched on', function () {
  const html = renderRich(content({ heroPhoto: photo(1), photos: [photo(2), photo(3), photo(4)] }), null, ['One. Why: two.'], { cta: { mail: 'mailto:rhys@rhyshume.co.uk', book: 'https://example.com/book' }, evidence: seoEv() });
  assert.ok(!html.includes('—'));
});
