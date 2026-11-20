'use strict';
// Business review pages: static accessibility checks (labels, button names, live region, skip link, language).
// Inputs: the three HTML pages and the markup the render functions build from the fixtures. Run with: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const R = require('../br-render.js');
const API = require('../br-report.js');
const fixture = (n) => JSON.parse(read('test/fixtures/business-review/' + n + '.json'));

function controls(html) {
  return (html.match(/<(input|select|textarea)\b[^>]*>/g) || []).filter((t) => !/type="(hidden|submit|button)"/.test(t));
}
function assertLabelled(html, where) {
  controls(html).forEach((t) => {
    const id = (t.match(/\sid="([^"]+)"/) || [])[1];
    assert.ok(id, where + ' control without id: ' + t);
    assert.ok(new RegExp('<label[^>]*for="' + id + '"').test(html) || /aria-label=/.test(t), where + ' no label for #' + id);
  });
}
function assertButtonsNamed(html, where) {
  (html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) || []).forEach((b) => {
    const text = b.replace(/<[^>]*>/g, '').trim();
    assert.ok(text.length > 0 || /aria-label=/.test(b), where + ' unnamed button ' + b);
  });
}

['business-review/index.html', 'business-review/report.html', 'business-review/bot.html'].forEach((f) => {
  test(f + ': language, skip link, main landmark, labelled controls, named buttons', () => {
    const h = read(f);
    assert.match(h, /<html lang="en-GB">/);
    assert.match(h, /<a class="skip" href="#main">/);
    assert.match(h, /<main id="main">/);
    assertLabelled(h, f);
    assertButtonsNamed(h, f);
    (h.match(/<img\b[^>]*>/g) || []).forEach((i) => assert.match(i, /alt=/));
  });
});

test('index: polite live region exists, steps change focus targets exist', () => {
  const h = read('business-review/index.html');
  assert.match(h, /id="br-live"[^>]*role="status"[^>]*aria-live="polite"/);
  ['br-intake-h', 'br-confirm-h', 'br-run-name', 'br-results-head'].forEach((id) => assert.ok(new RegExp('<h2 id="' + id + '" tabindex="-1"').test(h), id));
  assert.match(h, /aria-current|id="br-stages"/);
  assert.match(h, /<fieldset class="br-fieldset"><legend>What would you like help with/);
});

test('report page has a live region and a loading state announced to screen readers', () => {
  const h = read('business-review/report.html');
  assert.match(h, /id="br-live"[^>]*aria-live="polite"/);
  assert.match(h, /id="br-report-state" role="status"/);
});

test('rendered report: toggles are buttons with names, controls reference real panels, tables have captions and scoped headers', () => {
  const html = R.reportHtml(fixture('report-with-competitor').report, { idPrefix: 'br', view: 'report', actionsHtml: API.actionsHtml({ printHref: '/x' }), automationFormHtml: API.automationFormHtml(), competitorFormHtml: API.competitorFormHtml() });
  assertButtonsNamed(html, 'report');
  assertLabelled(html, 'report');
  (html.match(/aria-controls="([^"]+)"/g) || []).forEach((a) => {
    const id = a.match(/"([^"]+)"/)[1];
    assert.ok(html.includes('id="' + id + '"'), 'aria-controls target ' + id);
  });
  assert.ok((html.match(/<caption/g) || []).length >= 3);
  (html.match(/<table[\s\S]*?<\/thead>/g) || []).forEach((t) => assert.ok(/scope="col"/.test(t)));
  const ids = html.match(/\sid="[^"]+"/g);
  assert.strictEqual(new Set(ids).size, ids.length, 'duplicate ids');
  assert.ok(!/<th>/.test(html));
});

test('rendered report: state is carried by text, never colour alone', () => {
  const html = R.reportHtml(fixture('report-with-competitor').report, { idPrefix: 'br' });
  (html.match(/<span class="br-state [^"]*">([^<]*)<\/span>/g) || []).forEach((s) => assert.ok(/>[A-Z][^<]+</.test(s)));
});
