'use strict';

// Run with: node --test
// Checks for the instant Upgrade my site button (api/upgrade-live.js). Every network call is faked.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { Readable } = require('node:stream');
const handler = require('../api/upgrade-live');

const ROOT = path.join(__dirname, '..');
const REAL_FETCH = global.fetch;
let ipCount = 0;

handler.setLookup(async function (host) {
  if (host === 'sneaky.test') return [{ address: '10.0.0.5', family: 4 }];
  return [{ address: '93.184.216.34', family: 4 }];
});

// ---------------------------------------------------------------- the address checks

test('private, internal and odd addresses are never public', function () {
  for (const a of ['127.0.0.1', '10.1.2.3', '192.168.0.9', '172.20.0.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fe80::1', 'fd00::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1']) {
    assert.strictEqual(handler.ipIsPublic(a), false, a);
  }
  for (const a of ['93.184.216.34', '8.8.8.8', '2606:4700:4700::1111']) assert.strictEqual(handler.ipIsPublic(a), true, a);
});

test('a name that points at a private address, a login in the address and odd ports are refused', async function () {
  await assert.rejects(handler.assertHostIsPublic('https://sneaky.test/'), /not a public/);
  await assert.rejects(handler.assertHostIsPublic('http://127.0.0.1/'), /not a public/);
  await assert.rejects(handler.assertHostIsPublic('http://[::1]/'), /not a public/);
  await assert.rejects(handler.assertHostIsPublic('https://user:pw@firm.test/'), /login/);
  await assert.rejects(handler.assertHostIsPublic('https://firm.test:6379/'), /port/);
  await assert.rejects(handler.assertHostIsPublic('ftp://firm.test/'), /http/);
  await handler.assertHostIsPublic('https://firm.test/');
});

test('a redirect to an internal address is stopped, and a loop of redirects is stopped', async function () {
  const toInternal = handler.makeFetch(Date.now() + 60000, async function (url) {
    return { status: 302, headers: { get: function () { return 'http://169.254.169.254/latest/meta-data/'; } } };
  });
  await assert.rejects(toInternal('https://firm.test/'), /not a public/);
  const loop = handler.makeFetch(Date.now() + 60000, async function () {
    return { status: 301, headers: { get: function () { return 'https://firm.test/again'; } } };
  });
  await assert.rejects(loop('https://firm.test/'), /Too many redirects/);
});

test('the build stops when the deadline has passed', async function () {
  const late = handler.makeFetch(Date.now() - 1, async function () { return { status: 200, headers: { get: function () { return ''; } } }; });
  await assert.rejects(late('https://firm.test/'), /out of time/);
});

// ---------------------------------------------------------------- the whole request, with a faked network

const PAGE = '<html><head><title>Hartley Metalwork</title></head><body><nav><a href="/services">Services</a> <a href="/contact">Contact</a></nav>' +
  '<h1>Metalwork in Hamilton</h1><p>Family workshop in Hamilton, South Lanarkshire. We turn, mill and fabricate parts from your drawings.</p>' +
  '<a href="tel:+441698123456">01698 123456</a></body></html>';
const SERVICES = '<html><body><h1>Services</h1><h2>Milling</h2><p>CNC milling of steel and aluminium.</p><h2>Turning</h2><p>CNC turning up to 300 mm.</p></body></html>';
const CONTACT = '<html><body><h1>Contact</h1><p>Email office@hartley-metalwork.co.uk or ring 01698 123456.</p></body></html>';
const AI = {
  headline: 'Milling and turning in Hamilton',
  intro: 'A workshop in Hamilton, South Lanarkshire. We make parts from your drawings.',
  area: 'Hamilton, South Lanarkshire.',
  about: 'Hartley Metalwork is a workshop in Hamilton. We work from drawings.',
  services: [{ title: 'Milling', text: 'CNC milling of steel and aluminium.' }, { title: 'Turning', text: 'CNC turning up to 300 mm.' }],
  comparison: 'Both pages list milling.'
};

function fakeReq(form) {
  const req = Readable.from([Buffer.from(new URLSearchParams(form).toString())]);
  ipCount += 1;
  req.method = 'POST';
  req.headers = { 'content-type': 'application/x-www-form-urlencoded', 'x-forwarded-for': '10.8.0.' + ipCount };
  return req;
}
function fakeRes() {
  return { statusCode: 0, headers: {}, setHeader: function (k, v) { this.headers[k.toLowerCase()] = v; }, end: function (b) { this.body = b; } };
}

async function run(form, opts) {
  opts = opts || {};
  process.env.TURNSTILE_SECRET_KEY = 's';
  process.env.UPGRADE_SHEET_URL = 'https://script.google.com/macros/s/x/exec';
  process.env.UPGRADE_SHEET_SECRET = 'shh';
  process.env.ANTHROPIC_API_KEY = opts.noKey ? '' : 'k';
  delete process.env.UPGRADE_LIVE_OFF;
  const seen = { sheet: [], api: 0, pages: [] };
  global.fetch = async function (url, init) {
    const u = String(url);
    if (u.indexOf('challenges.cloudflare.com') !== -1) return { ok: true, json: async function () { return opts.cf || { success: true, hostname: 'rhyshume.co.uk', action: 'upgrade' }; } };
    if (u.indexOf('script.google.com') !== -1) {
      const body = JSON.parse(init.body);
      seen.sheet.push(body);
      const reply = (body.action === 'claim' ? opts.claim : null) || { ok: true };
      return { ok: true, json: async function () { return reply; } };
    }
    if (u.startsWith('https://api.anthropic.com/')) {
      seen.api += 1;
      const text = JSON.stringify(AI);
      return { ok: true, status: 200, json: async function () { return { content: [{ type: 'text', text: text }] }; }, text: async function () { return text; } };
    }
    seen.pages.push(u);
    const map = { 'https://www.hartley-metalwork.co.uk/': PAGE, 'https://www.hartley-metalwork.co.uk/services': SERVICES, 'https://www.hartley-metalwork.co.uk/contact': CONTACT };
    const html = opts.pages === false ? null : map[u];
    if (!html) return { ok: false, status: 404, url: u, headers: { get: function () { return 'text/html'; } }, text: async function () { return ''; } };
    return { ok: true, status: 200, url: u, headers: { get: function () { return 'text/html; charset=utf-8'; } }, text: async function () { return html; } };
  };
  const saved = { log: console.log, warn: console.warn, error: console.error };
  console.log = console.warn = console.error = function () {};
  const res = fakeRes();
  try { await handler(fakeReq(form), res); } finally { global.fetch = REAL_FETCH; Object.assign(console, saved); }
  return { res: res, body: res.body ? JSON.parse(res.body) : null, seen: seen };
}
const GOOD = { website: 'www.hartley-metalwork.co.uk', 'cf-turnstile-response': 'tok' };

test('a good request claims the Sheet, builds the page, returns it and reports back', async function () {
  const r = await run(GOOD);
  assert.strictEqual(r.res.statusCode, 200);
  assert.strictEqual(r.body.ok, true);
  assert.match(r.body.html, /Concept by Rhys Hume, not a live site/);
  assert.match(r.body.html, /Milling and turning in Hamilton/);
  assert.ok(r.body.points.length >= 3);
  assert.strictEqual(r.seen.sheet[0].action, 'claim');
  assert.strictEqual(r.seen.sheet[0].domain, 'hartley-metalwork.co.uk');
  assert.match(r.seen.sheet[0].visitor, /^[a-f0-9]{16}$/);
  assert.strictEqual(r.seen.sheet[r.seen.sheet.length - 1].action, 'finish');
  assert.strictEqual(r.seen.sheet[r.seen.sheet.length - 1].status, 'Built');
  assert.ok(!JSON.stringify(r.body).includes('shh'), 'secret leaked');
  assert.ok(r.seen.api >= 1 && r.seen.api <= 2, 'one or two model calls');
});

test('no email is needed, and a free mail address is simply stored with no marketing unless ticked', async function () {
  const r = await run(Object.assign({}, GOOD, { email: 'boss@gmail.com' }));
  assert.strictEqual(r.body.ok, true);
  assert.strictEqual(r.seen.sheet[0].email, 'boss@gmail.com');
  assert.strictEqual(r.seen.sheet[0].marketing, 'no');
  const none = await run(GOOD);
  assert.strictEqual(none.seen.sheet[0].email, '');
});

test('when the Sheet says no, nothing is built and no model call is made', async function () {
  for (const reason of ['duplicate', 'daily_limit', 'visitor_limit']) {
    const r = await run(GOOD, { claim: { ok: false, reason: reason } });
    assert.strictEqual(r.res.statusCode, 429);
    assert.strictEqual(r.body.error, 'already');
    assert.strictEqual(r.seen.api, 0);
    assert.strictEqual(r.seen.pages.length, 0);
  }
});

test('if the Sheet cannot be used the build does not run (fails closed)', async function () {
  const r = await run(GOOD, { claim: { ok: false, reason: 'sheet_unreachable' } });
  assert.strictEqual(r.res.statusCode, 502);
  assert.strictEqual(r.seen.api, 0);
});

test('a failed security check, a bad address, the honeypot and a missing key build nothing', async function () {
  const cases = [
    [function () { return run(GOOD, { cf: { success: false } }); }, 403],
    [function () { return run({ website: 'http://localhost', 'cf-turnstile-response': 't' }); }, 400],
    [function () { return run({ website: '169.254.169.254', 'cf-turnstile-response': 't' }); }, 400],
    [function () { return run(Object.assign({}, GOOD, { company_website: 'x' })); }, 400],
    [function () { return run(GOOD, { noKey: true }); }, 500]
  ];
  for (const [start, status] of cases) {
    const r = await start();
    assert.strictEqual(r.res.statusCode, status);
    assert.strictEqual(r.seen.api, 0);
    assert.strictEqual(r.seen.sheet.length, 0);
  }
});

test('a site that cannot be read gives a friendly answer and tells the Sheet it failed', async function () {
  const r = await run(GOOD, { pages: false });
  assert.strictEqual(r.res.statusCode, 422);
  assert.strictEqual(r.body.error, 'unreadable');
  assert.strictEqual(r.seen.api, 0);
  const last = r.seen.sheet[r.seen.sheet.length - 1];
  assert.strictEqual(last.action, 'finish');
  assert.strictEqual(last.status, 'Failed');
});

test('the visitor is rate limited in memory', async function () {
  process.env.TURNSTILE_SECRET_KEY = 's';
  const results = [];
  for (let i = 0; i < 4; i++) {
    const req = fakeReq(Object.assign({}, GOOD, { company_website: 'x' }));
    req.headers['x-forwarded-for'] = '10.77.0.1';
    const res = fakeRes();
    await handler(req, res);
    results.push(res.statusCode);
  }
  assert.deepStrictEqual(results, [400, 400, 400, 429]);
});

test('the switch turns the button off at once', async function () {
  const req = fakeReq(GOOD);
  const res = fakeRes();
  process.env.UPGRADE_LIVE_OFF = '1';
  await handler(req, res);
  delete process.env.UPGRADE_LIVE_OFF;
  assert.strictEqual(res.statusCode, 503);
});

test('the page runs the instant button, is noindex, has no em dash and the function has a long enough time limit', function () {
  const html = fs.readFileSync(path.join(ROOT, 'upgrade.html'), 'utf8');
  assert.match(html, /<meta name="robots" content="noindex,nofollow">/);
  assert.ok(html.includes('action="/api/upgrade-live"') && html.includes('data-action="upgrade"') && html.includes('sandbox="allow-scripts"'));
  assert.ok(!/—/.test(html) && !/—/.test(fs.readFileSync(path.join(ROOT, 'upgrade-live.js'), 'utf8')));
  const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  assert.ok(vercel.functions['api/upgrade-live.js'].maxDuration >= 60);
});
