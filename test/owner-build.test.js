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

test('Like it bar only appears with a cta, and only with safe links', () => {
  const none = rich.renderRich(base, null, null);
  assert.ok(!none.includes('Like it?'));
  const withCta = rich.renderRich(base, null, null, { cta: { mail: 'mailto:rhys@rhyshume.co.uk', book: 'javascript:alert(1)' } });
  assert.ok(withCta.includes('Like it? Reply to my email or book 20 minutes.'));
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
