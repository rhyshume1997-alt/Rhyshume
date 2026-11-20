/* Release 1 guard tests.
   Inputs: the public pages, llms.txt, sitemap.xml and the repository tree.
   Outputs: pass or fail. Must not be changed to allow a link to, or copy about, an automated review tool:
   Release 1 has no Business Review engine, so the only review route is the existing enquiry form. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const pages = ['index', 'about', 'automation', 'automation-demos/index', 'contact', 'csv', 'engineering', 'insights/index', 'insights/what-to-put-on-an-engineering-firms-website', 'local-business', 'privacy', 'seo-and-ai-visibility', 'tolra', 'upgrade', 'websites', 'work/jnr-engineering', 'council-digital-grants/index', 'website-concepts/index', '404'].map((p) => p + '.html');
const L = '/local-business#enquiry';

test('nothing links to or advertises an automated business review', () => {
  for (const f of pages.concat(['llms.txt', 'sitemap.xml'])) {
    const t = read(f);
    assert.ok(!/business-review|Business Opportunity|See how your business compares/.test(t), f);
  }
});

test('the header button and the footer link send visitors to the existing enquiry form', () => {
  for (const f of pages) {
    const t = read(f);
    assert.ok(t.includes('<a class="btn" href="' + L + '">Request a free business review</a>'), f + ' header button');
    assert.ok(t.includes('<li><a href="' + L + '">Request a free business review</a></li>'), f + ' footer link');
  }
});

test('the enquiry form that the review button reaches is the existing one, with a Not sure yet option', () => {
  const h = read('local-business.html');
  assert.equal((h.match(/id="enquiry"/g) || []).length, 1);
  assert.ok(h.includes('<form class="form" action="/api/contact" method="POST">') && h.includes('<input type="hidden" name="form" value="local">'));
  assert.ok(h.includes('<option>Not sure yet</option>'));
  assert.ok(h.includes('data-sitekey="0x4AAAAAAF7ONWeir1MBB-v7" data-action="contact"'));
  assert.ok(h.includes('Thank you. Your message has reached me. If you asked for a free business review, I will look at your website and how your business works, and reply by email or phone.'));
});

test('review copy promises no timeframe, report, PDF, AI testing, competitor analysis or scores', () => {
  const copy = ['index.html', 'contact.html', 'about.html', 'websites.html', 'automation-demos/index.html', 'seo-and-ai-visibility.html', 'llms.txt'].map(read).join('\n');
  const parts = copy.match(/[^.<>]*business review[^.<>]*\./gi) || [];
  assert.ok(parts.length > 5);
  for (const p of parts) assert.ok(!/\b(PDF|score|scores|competitor|within|hours|days|report|AI test)\b/i.test(p), p);
});

test('the Business Review backend is not part of this release', () => {
  for (const p of ['business-review', 'supabase/migrations/20261120120000_business_review.sql', 'supabase/rollback/20261120120000_business_review_rollback.sql', 'api/_lib/br', 'api/business-review.js', 'api/business-review-admin.js', 'tools/br-fullstack', 'tools/br-ui-browser', 'tools/workbook-reviews', 'br-form.js', 'br-render.js', 'br-report.js', 'br-automation.js', 'br.css']) {
    assert.ok(!fs.existsSync(path.join(ROOT, p)), p + ' must not exist in Release 1');
  }
  const v = read('vercel.json');
  assert.ok(!/business-review|"crons"/.test(v));
});

test('the privacy page describes no review tool processing', () => {
  const t = read('privacy.html').replace(/Request a free business review/g, '');
  assert.ok(!/Supabase|PageSpeed|review tool|the tool reads|business review/i.test(t));
  assert.ok(t.includes('<p>I’m not currently registered with the ICO.</p>'));
});

test('release 1: every public footer has the Client login link to the private workbook, marked nofollow', function () {
  const fs2 = require('node:fs');
  const pages = ['index', 'about', 'contact', 'engineering', 'automation', 'websites', 'local-business', 'seo-and-ai-visibility', 'automation-demos', 'privacy', 'tolra', 'csv', '404'];
  pages.forEach(function (p) {
    const h = fs2.readFileSync(require('node:path').join(__dirname, '..', p === 'automation-demos' ? 'automation-demos/index.html' : p + '.html'), 'utf8');
    assert.ok(h.includes('<a href="/w-82503121e7fdf54e/" rel="nofollow">Client login</a>'), p + ' footer has the Client login link');
  });
});
