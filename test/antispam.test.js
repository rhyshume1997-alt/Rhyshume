'use strict';

// Run with: node --test
const test = require('node:test');
const assert = require('node:assert');
const antispam = require('../api/_lib/antispam');

function fakeFetch(payload, opts) {
  const o = opts || {};
  const calls = [];
  const fn = async function (url, init) {
    calls.push({ url: url, init: init });
    if (o.throws) throw new Error('network down');
    return { ok: o.ok !== false, json: async function () { return payload; } };
  };
  fn.calls = calls;
  return fn;
}

const base = { secret: 'test-secret', token: 'tok', ip: '1.2.3.4', expectedAction: 'quote', allowedHostnames: ['jnrengineering.co.uk'] };

test('turnstile: valid token passes and sends the right fields to Cloudflare', async function () {
  const f = fakeFetch({ success: true, hostname: 'jnrengineering.co.uk', action: 'quote' });
  const r = await antispam.verifyTurnstile(Object.assign({}, base, { fetchImpl: f }));
  assert.deepStrictEqual(r, { ok: true });
  assert.strictEqual(f.calls[0].url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
  const body = f.calls[0].init.body;
  assert.strictEqual(body.get('secret'), 'test-secret');
  assert.strictEqual(body.get('response'), 'tok');
  assert.strictEqual(body.get('remoteip'), '1.2.3.4');
});

test('turnstile: missing token is refused without calling Cloudflare', async function () {
  const f = fakeFetch({ success: true });
  const r = await antispam.verifyTurnstile(Object.assign({}, base, { token: '', fetchImpl: f }));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'missing_token');
  assert.strictEqual(f.calls.length, 0);
});

test('turnstile: oversize token is refused', async function () {
  const f = fakeFetch({ success: true });
  const r = await antispam.verifyTurnstile(Object.assign({}, base, { token: 'x'.repeat(3000), fetchImpl: f }));
  assert.strictEqual(r.reason, 'missing_token');
});

test('turnstile: invalid token is refused', async function () {
  const f = fakeFetch({ success: false, 'error-codes': ['invalid-input-response'] });
  const r = await antispam.verifyTurnstile(Object.assign({}, base, { fetchImpl: f }));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'rejected');
});

test('turnstile: no secret configured fails closed', async function () {
  const f = fakeFetch({ success: true });
  const r = await antispam.verifyTurnstile(Object.assign({}, base, { secret: '', fetchImpl: f }));
  assert.strictEqual(r.reason, 'not_configured');
  assert.strictEqual(f.calls.length, 0);
});

test('turnstile: token from another site is refused', async function () {
  const f = fakeFetch({ success: true, hostname: 'evil.example', action: 'quote' });
  const r = await antispam.verifyTurnstile(Object.assign({}, base, { fetchImpl: f }));
  assert.strictEqual(r.reason, 'wrong_hostname');
});

test('turnstile: token from another form is refused', async function () {
  const f = fakeFetch({ success: true, hostname: 'jnrengineering.co.uk', action: 'login' });
  const r = await antispam.verifyTurnstile(Object.assign({}, base, { fetchImpl: f }));
  assert.strictEqual(r.reason, 'wrong_action');
});

test('turnstile: Cloudflare unreachable fails closed', async function () {
  const f = fakeFetch(null, { throws: true });
  const r = await antispam.verifyTurnstile(Object.assign({}, base, { fetchImpl: f }));
  assert.strictEqual(r.reason, 'unavailable');
});

test('turnstile: Cloudflare HTTP error fails closed', async function () {
  const f = fakeFetch({}, { ok: false });
  const r = await antispam.verifyTurnstile(Object.assign({}, base, { fetchImpl: f }));
  assert.strictEqual(r.reason, 'unavailable');
});

test('turnstile: Cloudflare internal error is treated as unavailable, not as a bad token', async function () {
  const f = fakeFetch({ success: false, 'error-codes': ['internal-error'] });
  const r = await antispam.verifyTurnstile(Object.assign({}, base, { fetchImpl: f }));
  assert.strictEqual(r.reason, 'unavailable');
});

test('classify: real quote request is not quarantined', function () {
  const v = antispam.classify({
    name: 'Sam Reid', company: 'Reid Hydraulics', email: 'sam@reid.example',
    message: 'Need 50 off aluminium brackets, drawing attached, tolerance +/-0.05mm. Required by the 20th.',
    service: 'CNC Milling', quantity: '50', material: 'Aluminium 6082', fileCount: 1
  });
  assert.strictEqual(v.quarantine, false);
});

test('classify: short real enquiry with no attachment is not quarantined', function () {
  const v = antispam.classify({
    name: 'Jo', company: 'Clyde Marine', email: 'jo@clyde.example',
    message: 'Can you turn a stainless shaft, about 300mm long? Will send the drawing tomorrow.',
    service: '', quantity: '', material: '', fileCount: 0
  });
  assert.strictEqual(v.quarantine, false);
});

test('classify: SEO pitch is quarantined', function () {
  const v = antispam.classify({
    name: 'Mark', company: 'RankHigh Ltd', email: 'mark@rankhigh.example',
    message: 'Hi, we noticed your website is not on the first page of Google. We offer SEO services to boost your traffic. Free audit at www.rankhigh.example',
    service: '', quantity: '', material: '', fileCount: 0
  });
  assert.strictEqual(v.quarantine, true);
  assert.ok(v.reasons.length > 0);
});

test('classify: digital marketing pitch with one phrase and one link is quarantined', function () {
  const v = antispam.classify({
    name: 'Anna', company: 'Bright Media', email: 'a@bright.example',
    message: 'We are a digital marketing agency, see https://bright.example for what we do.',
    service: '', quantity: '', material: '', fileCount: 0
  });
  assert.strictEqual(v.quarantine, true);
});

test('classify: a genuine job that mentions SEO once still goes through', function () {
  const v = antispam.classify({
    name: 'Priya', company: 'Orbit Web Hardware', email: 'p@orbit.example',
    message: 'Our SEO team needs a one-off steel bracket machined for a camera rig. 10 off, drawing attached.',
    service: 'CNC Machining', quantity: '10', material: 'Steel', fileCount: 1
  });
  assert.strictEqual(v.quarantine, false);
});

test('classify: threshold can be changed per site', function () {
  const sub = { name: 'A', company: 'B', email: 'a@b.example', message: 'Need a link building and SEO quote', service: '', quantity: '', material: '', fileCount: 0 };
  assert.strictEqual(antispam.classify(sub, { threshold: 4 }).quarantine, true);
  assert.strictEqual(antispam.classify(sub, { threshold: 99 }).quarantine, false);
});

test('quarantine target: uses the review address when set, else falls back to the normal inbox', function () {
  const a = antispam.quarantineTarget({ QUOTE_QUARANTINE_TO: 'me@example.com, you@example.com' }, ['shop@example.com']);
  assert.deepStrictEqual(a, { to: ['me@example.com', 'you@example.com'], separate: true });
  const b = antispam.quarantineTarget({}, ['shop@example.com']);
  assert.deepStrictEqual(b, { to: ['shop@example.com'], separate: false });
});

test('quarantine subject and note carry the score and reasons', function () {
  const v = { score: 7, reasons: ['sales phrases x2 (+6)'], quarantine: true };
  assert.match(antispam.quarantineSubject('New quote request', v), /^\[SPAM REVIEW score 7\]/);
  assert.match(antispam.quarantineNote(v, true), /NOT sent to the workshop inbox/);
  assert.match(antispam.quarantineNote(v, false), /normal inbox/);
});
