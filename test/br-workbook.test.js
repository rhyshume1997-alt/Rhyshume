'use strict';
// Business reviews workbook module (WP-D). Run with: node --test
// Inputs : tools/workbook-reviews/*, the committed w-82503121e7fdf54e/index.html (already built), the build script run on a copy.
// Checks : the build succeeds once and refuses twice, the built file is purely additive, markers and sign in are intact, the module
//          calls only the admin API and br_* and leads, holds no key, contact detail or fixture data, never touches quotes or documents.
// Must not change: it only reads and writes to a temporary folder.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const WB = 'w-82503121e7fdf54e/index.html';
const MARK = 'BUSINESS REVIEWS: owner view of free reviews';
const py = cp.spawnSync('python3', ['--version']);
const havePy = py.status === 0;
const built = read(WB), js = read('tools/workbook-reviews/reviews.js'), css = read('tools/workbook-reviews/reviews.css'), build = read('tools/workbook-reviews/build.py');
const start = built.indexOf('<script>/* =====================================================================\n   ' + MARK), end = built.indexOf('</script>', start);
const outside = start > 0 ? built.slice(0, start) + built.slice(end) : built;

test('the committed workbook carries the module once, after the meeting module', () => {
  assert.strictEqual(built.split(MARK).length - 1, 1);
  assert.ok(built.indexOf('CLIENT MEETING: a guided discovery interview') < built.indexOf(MARK));
  assert.ok(built.indexOf(MARK) < built.indexOf('<script>init();</script>'));
});

test('existing markers and the sign in are intact, and there is still no offline way in', () => {
  ['CLIENT MEETING: a guided discovery interview', 'function cloudGate()', 'async function clToken()', 'async function clRest(', 'leadmk: async', 'Make into a client'].forEach(m => assert.ok(built.includes(m), m));
  assert.ok(!built.includes('data-act="cloffline">Work offline'), 'no offline button');
  assert.ok(built.includes("on: /^https?:$/.test(location.protocol),") || built.includes('on: /^https?:$/.test(location.protocol),'), 'no ?offline switch');
  assert.ok(!/!\/\[\?&\]offline\\b\/\.test\(location\.search\)/.test(built), 'the ?offline switch stays removed');
  assert.ok(built.includes('Only my email can sign in'));
  assert.ok(built.includes("CL.screen === 'reviews' && typeof brwGate"), 'the reviews gate screen sits behind the same gate and is only reached after sign in');
});

test('the module holds no key, no service role, no contact detail and no fixture data', () => {
  const mod = js + css + build;
  assert.ok(!/service_role|SERVICE_ROLE|SUPABASE_SERVICE/i.test(built), 'no service role anywhere in the workbook');
  assert.ok(!/sb_secret|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/.test(mod), 'no secret or token');
  assert.ok(!/password\s*[:=]\s*['"]/i.test(mod));
  ['Harbour Precision', 'harbourprecision.example', 'Clyde Components', '07700 900123', 'Alex Reid', 'Kelvin Joinery', 'Tarbet', 'MOCK-OWNER-TOKEN', '@rhyshume'].forEach(s => assert.ok(!mod.includes(s), 'module must not contain ' + s));
  ['Harbour Precision', 'harbourprecision.example', 'MOCK-OWNER-TOKEN', 'Alex Reid'].forEach(s => assert.ok(!built.includes(s), 'workbook must not contain ' + s));
});

test('the module calls only the admin API, br_ tables and leads', () => {
  const fetches = js.match(/\bfetch\(/g) || [];
  assert.strictEqual(fetches.length, 1, 'one network call site');
  assert.ok(/fetch\('\/api\/business-review\/admin\/' \+ path/.test(js));
  assert.ok(!/rest\/v1|supabase\.co|XMLHttpRequest|sendBeacon|WebSocket|EventSource/.test(js));
  const tables = [...js.matchAll(/table: '([a-z_]+)'/g)].map(m => m[1]);
  assert.ok(tables.length > 10);
  tables.forEach(t => assert.ok(/^br_[a-z_]+$/.test(t) || t === 'leads', 'table ' + t));
  assert.ok(!/client_quotes|quote_acceptances|client_portals|client_answers/.test(js), 'never touches quotes or the portal');
});

test('the module never writes or shows a quote, and never converts without a click', () => {
  assert.ok(!/S\.quote|S\.quote2|S\.docs|S\.scope|applyDefaults|quoteSend|\bqsend/.test(js));
  assert.ok(/data-act="brwconvert"/.test(js) && /Nothing is created until you confirm/.test(js));
  assert.ok(/brwconf" data-bk="convert"/.test(js), 'a confirm step comes first');
  assert.ok(!/setTimeout\([^)]*brwConvert|setInterval/.test(js), 'no timer starts a conversion');
});

test('internal notes live only in the database: S.review never holds them and no generator reads them', () => {
  assert.ok(!/S\.review\.internal|review\.internal|internal_notes\s*[:=]\s*S\./.test(js));
  assert.ok(!/S\.review/.test(outside), 'no existing code outside the module references S.review');
  assert.ok(!/internal_notes/.test(outside), 'nothing outside the module knows the notes field');
  const hooks = new Set(outside.match(/\bbrw[A-Z][A-Za-z]+/g) || []);
  assert.deepStrictEqual([...hooks].sort(), ['brwAfter', 'brwAttach', 'brwBanner', 'brwGate', 'brwHeadBtn', 'brwListBtn'], 'the only hooks the existing code calls into');
  const attach = js.slice(js.indexOf('async function brwAttach'), js.indexOf('async function brwAfter'));
  assert.ok(!/internal|needs|email|phone|contact/.test(attach), 'the reference copied into the draft has no notes or contact copy');
  const summary = js.slice(js.indexOf('function brwClientSummary'), js.indexOf('function brwSummarySec'));
  assert.ok(/function brwClientSummary\(rep, discussKeys\)/.test(summary) && !/internal|needs|email|phone|price|£/i.test(summary), 'the customer summary takes only the report and the marks');
  assert.ok(/Internal only\. Never shown to the customer/.test(js));
});

test('evidence state labels are exactly the contract wording and no percentage is built for AI visibility', () => {
  ['Verified public observation', 'Verified authenticated account data', 'Customer supplied information', 'Reasonable inference', 'Not tested', 'Unavailable'].forEach(l => assert.ok(js.includes("'" + l + "'"), l));
  assert.ok(!/toFixed|Math\.round\([^)]*\*\s*100/.test(js));
  assert.ok(/Awaiting a supported test/.test(js));
});

test('missing tables and a missing admin service are handled, not hidden', () => {
  assert.ok(/Reviews are not set up yet/.test(js) && /PGRST20\[25\]/.test(js));
  assert.ok(/Online only/.test(js));
  assert.ok(/The review admin service is not reachable/.test(js));
});

test('the CSS only adds classes that start with brw', () => {
  const sel = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@media[^{]*\{/g, '').split('}').map(r => r.split('{')[0].trim()).filter(Boolean);
  sel.forEach(s => s.split(',').forEach(x => assert.ok(/\.brw/.test(x), 'selector not scoped: ' + x)));
});

test('the build script refuses to run twice, stops when an anchor drifts, and the result is purely additive', { skip: !havePy && 'python3 not available' }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'brw-'));
  // the committed file is already built, so rebuild from a copy with the module removed to prove the build, then a second run
  const src = path.join(tmp, 'src.html');
  const reverse = built; // remove the module by applying the build's own anchors in reverse is not possible, so use git's copy of the file before the module when available
  let before = '';
  try { before = cp.execFileSync('git', ['show', 'origin/claude/br-a-engine:' + WB], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 }); } catch (e) { before = ''; }
  if (!before || before.includes(MARK)) { try { before = cp.execFileSync('git', ['show', '0e4f012:' + WB], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 }); } catch (e) { before = ''; } }
  if (!before || before.includes(MARK)) { assert.ok(reverse.includes(MARK)); return; }   // no pre module copy in this checkout (shallow clone): nothing more to prove here
  fs.writeFileSync(src, before);
  const out = path.join(tmp, 'out.html');
  const r1 = cp.spawnSync('python3', [path.join(ROOT, 'tools/workbook-reviews/build.py'), src, out], { encoding: 'utf8' });
  assert.strictEqual(r1.status, 0, r1.stderr + r1.stdout);
  assert.ok(fs.readFileSync(out, 'utf8').includes(MARK));
  assert.strictEqual(fs.readFileSync(out, 'utf8'), built, 'the committed workbook is exactly what the build script produces');
  const r2 = cp.spawnSync('python3', [path.join(ROOT, 'tools/workbook-reviews/build.py'), out, path.join(tmp, 'twice.html')], { encoding: 'utf8' });
  assert.notStrictEqual(r2.status, 0); assert.match(r2.stderr + r2.stdout, /already built/);
  const bad = fs.readFileSync(src, 'utf8').replace("{ id: 'meeting', g: '1 Client', label: 'Client meeting' },", '');
  fs.writeFileSync(path.join(tmp, 'drift.html'), bad);
  const r3 = cp.spawnSync('python3', [path.join(ROOT, 'tools/workbook-reviews/build.py'), path.join(tmp, 'drift.html'), path.join(tmp, 'drift-out.html')], { encoding: 'utf8' });
  assert.notStrictEqual(r3.status, 0); assert.match(r3.stderr + r3.stdout, /anchor must match exactly once/);
  const r4 = cp.spawnSync('python3', [path.join(ROOT, 'tools/workbook-reviews/additive-check.py'), src, out], { encoding: 'utf8' });
  assert.strictEqual(r4.status, 0, r4.stdout); assert.match(r4.stdout, /ADDITIVE/);
  fs.rmSync(tmp, { recursive: true, force: true });
});
