/* Regression checks for the client meeting's design discovery prompts.
   Run: node tools/workbook-meeting/test-design-discovery.js
   Uses only Node's standard library and never reads client records. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, 'meeting.js'), 'utf8');

// Parse the module without executing its browser-dependent setup.
new Function(source);

const caseMatch = source.match(/case 'looks': return ([^\n]+);/);
assert.ok(caseMatch, 'concept completion logic exists');
const completion = new Function('m', 'mclean', 'mst', 'return ' + caseMatch[1]);
const clean = value => String(value || '').trim();
const base = () => ({ concepts: {}, inspo: [{ url: '', note: '' }] });
const answered = (state, unsure = false) => Boolean(completion(state, clean, () => unsure ? 'unsure' : ''));

assert.equal(answered(base()), false, 'nothing selected remains unanswered');
assert.equal(answered({ ...base(), concepts: { demo: { v: 'love' } } }), false, 'a rating without a reason is insufficient');
assert.equal(answered({ ...base(), concepts: { demo: { v: 'no', change: 'Hard to read' } } }), true, 'a recorded dislike explains the rating');
assert.equal(answered({ ...base(), concepts: { demo: { v: 'parts', pref: { layouts: 'like' } } } }), true, 'a selected design attribute counts');
assert.equal(answered({ ...base(), concepts: { demo: { v: 'love', why: 'Large photos' } } }), true, 'a specific comment counts');
assert.equal(answered({ ...base(), inspo: [{ url: 'https://example.com', note: '' }] }), false, 'a URL without a reason is insufficient');
assert.equal(answered({ ...base(), inspo: [{ url: 'https://example.com', note: 'Clear navigation' }] }), true, 'an explained reference counts');
assert.equal(answered(base(), true), true, 'client may explicitly mark not sure');

for (const name of ['first', 'standOut', 'avoid', 'priority']) {
  assert.ok(source.includes('meet.direction.' + name), 'field ' + name + ' appears in interview');
}
assert.ok(source.includes("if (value) add(o.conf, 'Style', label, value)"), 'recorded direction goes to design brief');
assert.ok(source.includes("else add(o.open, 'Design', label"), 'missing direction is flagged');
assert.ok(source.includes('Design direction check:'), 'review shows readiness check');
console.log('Design discovery regression checks passed');
