'use strict';

// Run with: node --test
// Checks for the Upgrade my site form. fetch is mocked, so nothing talks to Cloudflare or Google.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const handler = require('../api/upgrade');

const ROOT = path.join(__dirname, '..');
const REAL_FETCH = global.fetch;
let ip = 0;

function fakeReq(body) {
  const { Readable } = require('node:stream');
  const req = Readable.from([Buffer.from(body)]);
  ip += 1;
  req.method = 'POST';
  req.headers = { 'content-type': 'application/x-www-form-urlencoded', 'x-forwarded-for': '10.9.0.' + ip };
  return req;
}
function fakeRes() {
  const res = { statusCode: 0, headers: {}, setHeader: function (k, v) { this.headers[k.toLowerCase()] = v; }, end: function (b) { this.body = b; } };
  return res;
}
async function run(form, sheetReply, cf) {
  process.env.TURNSTILE_SECRET_KEY = 's';
  process.env.UPGRADE_SHEET_URL = 'https://script.google.com/macros/s/x/exec';
  process.env.UPGRADE_SHEET_SECRET = 'shh';
  const calls = [];
  global.fetch = async function (url, init) {
    if (String(url).indexOf('challenges.cloudflare.com') !== -1) {
      return { ok: true, json: async function () { return cf || { success: true, hostname: 'rhyshume.co.uk', action: 'upgrade' }; } };
    }
    calls.push(JSON.parse(init.body));
    return { ok: true, json: async function () { return sheetReply || { ok: true }; } };
  };
  const saved = { log: console.log, warn: console.warn, error: console.error };
  console.log = console.warn = console.error = function () {};
  const res = fakeRes();
  try { await handler(fakeReq(new URLSearchParams(form).toString()), res); } finally { global.fetch = REAL_FETCH; Object.assign(console, saved); }
  return { res: res, calls: calls };
}
const GOOD = { website: 'www.rosskeenengineering.co.uk', email: 'office@rosskeenengineering.co.uk', 'cf-turnstile-response': 'tok' };

test('a good request is saved to the Sheet with a clean https address and no secret leaks back', async function () {
  const r = await run(GOOD);
  assert.strictEqual(r.res.headers.location, '/upgrade?sent=1#sent');
  assert.deepStrictEqual(r.calls[0], { secret: 'shh', website: 'https://www.rosskeenengineering.co.uk/', domain: 'rosskeenengineering.co.uk', email: 'office@rosskeenengineering.co.uk', marketing: 'no' });
});

test('the email must be on the website domain and not a free mail address', async function () {
  for (const email of ['someone@gmail.com', 'office@otherfirm.co.uk']) {
    const r = await run(Object.assign({}, GOOD, { email: email }));
    assert.strictEqual(r.res.headers.location, '/upgrade?error=1#email-mismatch', email);
    assert.strictEqual(r.calls.length, 0);
  }
});

test('internal and odd addresses are refused before anything is saved', async function () {
  for (const site of ['http://localhost', 'http://127.0.0.1', 'http://169.254.169.254', 'https://intranet', 'https://firm.co.uk:8080', 'https://user:pw@firm.co.uk', 'ftp://firm.co.uk']) {
    assert.strictEqual(handler.cleanWebsite(site), null, site);
  }
});

test('a failed security check saves nothing', async function () {
  const r = await run(GOOD, null, { success: false });
  assert.strictEqual(r.res.headers.location, '/upgrade?error=1#check-failed');
  assert.strictEqual(r.calls.length, 0);
});

test('the Sheet limits show the already asked note', async function () {
  const r = await run(GOOD, { ok: false, reason: 'daily_limit' });
  assert.strictEqual(r.res.headers.location, '/upgrade?error=1#already');
});

test('the honeypot looks like success and saves nothing', async function () {
  const r = await run(Object.assign({}, GOOD, { company_website: 'x' }));
  assert.strictEqual(r.res.headers.location, '/upgrade?sent=1#sent');
  assert.strictEqual(r.calls.length, 0);
});

test('the page is noindex, out of the sitemap, uses Turnstile with its own action, and the marketing box starts unticked', function () {
  const html = fs.readFileSync(path.join(ROOT, 'upgrade.html'), 'utf8');
  assert.match(html, /<meta name="robots" content="noindex,nofollow">/);
  assert.ok(html.includes('action="/api/upgrade-live"') && html.includes('data-action="upgrade"'));
  assert.ok(/name="marketing" value="yes">/.test(html) && !/name="marketing"[^>]*checked/.test(html));
  assert.ok(!/—/.test(html), 'em dash');
  assert.ok(!fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8').includes('/upgrade'));
  assert.ok(fs.readFileSync(path.join(ROOT, 'privacy.html'), 'utf8').includes('upgrade my site form'));
});
