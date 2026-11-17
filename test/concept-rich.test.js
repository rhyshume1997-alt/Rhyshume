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
