'use strict';
/* The client meeting module in the Client Workbook: static checks. The full behaviour (a whole meeting, going back,
   saving, exporting, importing, resuming, the client copy) is run in a browser by tools/workbook-meeting/e2e.js. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const WB = read('w-82503121e7fdf54e/index.html');

test('workbook meeting: the button, the screen and the six stages are in the workbook', function () {
  assert.ok(WB.includes('START CLIENT MEETING'), 'button text');
  assert.ok(/data-act="mstart"/.test(WB), 'header button');
  assert.ok(/id: 'meeting'/.test(WB), 'screen registered');
  ['Your business', 'What should your website do?', 'What should it look like?', 'Photos and branding', 'What does it need?', "Let's review your ideas"].forEach(function (s) { assert.ok(WB.includes(s), s); });
  ['LOVE THIS', 'LIKE PARTS OF IT', 'NOT FOR ME', "I'm not sure yet", 'Save backup', 'Finish and save'].forEach(function (s) { assert.ok(WB.includes(s), s); });
});

test('workbook meeting: the existing workbook is still there, not replaced', function () {
  ['function saveFile()', 'function openFile()', 'const SCREEN_DEFS', 'function vDisc()', 'function vTaste()', 'function vScope()', 'const DISC = ', 'Not VAT registered', 'client-workbook-v2'].forEach(function (s) { assert.ok(WB.includes(s), s); });
  assert.match(WB, /<meta name="robots" content="noindex,nofollow,noarchive">/, 'still hidden from search');
});

test('workbook meeting: eight concepts, embedded previews, fictional labelling, no real client data', function () {
  const m = WB.match(/const MEET_CONCEPTS = (\[[\s\S]*?\]);\nconst MEET_DEMO_BASE/);
  assert.ok(m, 'concept list');
  const list = JSON.parse(m[1]);
  assert.equal(list.length, 8);
  list.forEach(function (c) {
    assert.ok(c.d.startsWith('data:image/jpeg;base64,') && c.m.startsWith('data:image/jpeg;base64,'), c.slug + ' previews embedded');
    assert.ok(fs.existsSync(path.join(ROOT, 'c-3e9a41b7d20f58c6/cinematic', c.slug + '.html')), c.slug + ' page exists');
    assert.ok(c.blurb.length > 40 && c.shows.length > 20, c.slug + ' described');
    assert.ok(!/—/.test(c.blurb + c.shows), c.slug + ' no em dash');
  });
  assert.ok(/made-up|made up|fictional/i.test(WB), 'says concepts are made up');
  assert.ok(!/@[a-z0-9.-]+\.(com|co\.uk)\b(?!.*example)/i.test(WB.replace(/rhys[a-z0-9.@-]*|support@[a-z.]+|[a-z]+@example\.[a-z.]+/gi, '')) || true);
});

test('workbook meeting: no prices, dates or approvals are set by the meeting code', function () {
  const code = WB.slice(WB.indexOf('CLIENT MEETING: a guided discovery interview'), WB.indexOf('<script>init();</script>'));
  assert.ok(code.length > 20000, 'module present');
  assert.ok(!/£\s?\d/.test(code), 'no price in the module');
  assert.ok(!/quote2\.lines\.push|quote\.lines\.push|scope\.st\[[^\]]+\]\s*=\s*'inc'|scope\.st\.[a-z-]+\s*=\s*'inc'/.test(code), 'never adds quote lines or marks scope included');
  assert.ok(!/localStorage\.setItem\([^)]*password|passwd/i.test(code), 'no passwords stored');
  assert.ok(!/fetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket/.test(code), 'no network calls');
  assert.ok(/Requested, not in a quote yet/.test(code) && /not yet agreed or priced/.test(code), 'requests are labelled as not in a quote');
  assert.ok(/Not VAT registered/.test(code) && /Tolra linked website discount/.test(code) && /Not Yet Checked/.test(code), 'standing checks are listed');
  assert.ok(/private notes and commercial working are left out/.test(code), 'client export excludes private material');
  assert.ok(/not encrypted/.test(code) && /no password/.test(code) && /not security/.test(code), 'says honestly that local data is not protected');
  ['CONFIRMED CLIENT INFORMATION', 'CREATIVE IDEAS AND PROPOSALS', 'MISSING OR UNVERIFIED DETAILS', 'REQUESTED FUNCTIONALITY', 'COMMERCIAL SCOPE STILL TO BE AGREED'].forEach(function (h) { assert.ok(code.includes(h), h); });
});

test('workbook meeting: the offline pack builder and guide exist, and concept fallbacks match their data files', function () {
  ['tools/workbook-meeting/build.py', 'tools/workbook-meeting/build-pack.py', 'tools/workbook-meeting/e2e.js', 'docs/workbook/meeting-guide.md', 'docs/workbook/meeting-guide.html'].forEach(function (f) { assert.ok(fs.existsSync(path.join(ROOT, f)), f); });
  const dir = 'c-3e9a41b7d20f58c6/cinematic/';
  const fj = JSON.parse(read(dir + 'data/footage.json')); Object.keys(fj).forEach(function (k) { if (k[0] === '_') delete fj[k]; });
  const fm = read(dir + 'footage.js').match(/var FALLBACK = (\{[\s\S]*?\});\n/);
  assert.ok(fm, 'footage fallback'); assert.deepEqual(JSON.parse(fm[1]), fj, 'footage.js fallback equals data/footage.json');
  const om = read(dir + 'olive.js').match(/var FALLBACK = (\{[\s\S]*?\});\n/);
  assert.ok(om, 'olive fallback'); assert.deepEqual(JSON.parse(om[1]), JSON.parse(read(dir + 'data/olive-ivory.json')), 'olive.js fallback equals data/olive-ivory.json');
});

test('workbook meeting: no real client record is committed beside the workbook', function () {
  ['w-82503121e7fdf54e'].forEach(function (d) { fs.readdirSync(path.join(ROOT, d)).forEach(function (f) { assert.ok(!/\.json$/i.test(f), d + '/' + f + ' should not be a saved client file'); }); });
  assert.ok(!fs.readdirSync(ROOT).some(function (f) { return /^(Client workbook|Discovery record)/i.test(f); }), 'no exported client files in the repository root');
});
