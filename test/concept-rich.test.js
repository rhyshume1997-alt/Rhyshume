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
  assert.ok(html.includes('Placeholder'));
});
