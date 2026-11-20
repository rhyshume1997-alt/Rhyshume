'use strict';
// Package A: recommendation engine, prioritisation model and automation mapper. Run with: node --test
const test = require('node:test');
const assert = require('node:assert');
const recs = require('../api/_lib/br/recommendations');
const automation = require('../api/_lib/br/automation');
const { evRows } = require('./br-helpers');

const GOOD = [
  { metric_key: 'https.enabled', value: true }, { metric_key: 'page.status', value: 200 }, { metric_key: 'page.title.present', value: true }, { metric_key: 'page.title.length', value: 45 },
  { metric_key: 'page.meta_description.present', value: true }, { metric_key: 'page.h1.count', value: 1 }, { metric_key: 'page.heading_order.valid', value: true }, { metric_key: 'page.canonical.present', value: true },
  { metric_key: 'page.canonical.self', value: true }, { metric_key: 'page.viewport.present', value: true }, { metric_key: 'structured_data.present', value: true }, { metric_key: 'structured_data.json_ld_parses', value: true },
  { metric_key: 'sitemap.present', value: true }, { metric_key: 'robots.blocks_crawl', value: false }, { metric_key: 'links.broken.count', value: 0 }, { metric_key: 'contact.route.present', value: true },
  { metric_key: 'content.service_pages.estimate', value: 5, state: 'reasonable_inference' }, { metric_key: 'psi.mobile.lcp_ms', value: 1800 }, { metric_key: 'psi.mobile.cls', value: 0.02 }, { metric_key: 'psi.mobile.tbt_ms', value: 100 },
  { metric_key: 'psi.mobile.seo_score', value: 100 }, { metric_key: 'psi.mobile.accessibility_score', value: 96 }, { metric_key: 'psi.mobile.best_practices_score', value: 100 }
];
const NOT_TESTED = [
  { metric_key: 'local.gbp.profile', state: 'not_tested', reason_code: 'no_supported_source' }, { metric_key: 'ai.visibility.summary', state: 'not_tested', reason_code: 'not_run_in_free_review' }
];
const ALLOWED = ['/contact?from=business-review', '/seo-and-ai-visibility', '/websites', '/automation', '/engineering', '/contact'];
const SERVICE_KEYS = ['websites', 'seo', 'ai_visibility', 'automation', 'engineering', 'care_plan', 'none'];

function override(list, over) { return list.map(function (e) { return over[e.metric_key] !== undefined ? Object.assign({}, e, typeof over[e.metric_key] === 'object' ? over[e.metric_key] : { value: over[e.metric_key] }) : e; }); }
const run = function (list, goals, ops) { const rows = evRows(list); return { rows: rows, recs: recs.generate({ evidence: rows, goals: goals || [], opportunities: ops || [] }) }; };

test('a healthy site produces no technical issues, only honest "not tested" opportunities', function () {
  const r = run(GOOD.concat(NOT_TESTED), ['ai_search_visibility']);
  assert.strictEqual(r.recs.filter(function (x) { return x.issue_type === 'technical_issue'; }).length, 0);
  assert.ok(r.recs.every(function (x) { return x.issue_type === 'opportunity'; }));
  assert.ok(r.recs.some(function (x) { return x.key === 'ai_visibility_untested'; }));
  assert.ok(!r.recs.some(function (x) { return x.key === 'local_search_untested'; }), 'only offered when the visitor asked about Google visibility');
  assert.ok(run(GOOD.concat(NOT_TESTED), ['google_visibility']).recs.some(function (x) { return x.key === 'local_search_untested'; }));
});

const CASES = [
  ['no_https', { 'https.enabled': false }, 'high'], ['http_not_redirected', { 'https.http_redirects_to_https': { value: false } }, null], ['robots_blocks_home', { 'robots.blocks_crawl': true }, 'high'],
  ['no_sitemap', { 'sitemap.present': false }, 'medium'], ['missing_title', { 'page.title.present': false }, 'high'], ['title_length', { 'page.title.length': 8 }, 'medium'], ['missing_meta_description', { 'page.meta_description.present': false }, 'high'],
  ['missing_h1', { 'page.h1.count': 0 }, 'high'], ['multiple_h1', { 'page.h1.count': 3 }, 'medium'], ['heading_order', { 'page.heading_order.valid': false }, 'medium'], ['missing_canonical', { 'page.canonical.present': false }, 'medium'],
  ['canonical_elsewhere', { 'page.canonical.self': false }, 'medium'], ['no_viewport', { 'page.viewport.present': false }, 'high'], ['invalid_json_ld', { 'structured_data.json_ld_parses': false }, 'high'],
  ['broken_links', { 'links.broken.count': 4 }, 'high'], ['no_contact_route', { 'contact.route.present': false }, 'high'], ['few_service_pages', { 'content.service_pages.estimate': { value: 1, state: 'reasonable_inference' } }, 'low'],
  ['slow_mobile_loading', { 'psi.mobile.lcp_ms': 3900 }, 'high'], ['layout_shift', { 'psi.mobile.cls': 0.3 }, 'high'], ['blocking_time', { 'psi.mobile.tbt_ms': 700 }, 'high'],
  ['lighthouse_seo_checks', { 'psi.mobile.seo_score': 70 }, 'medium'], ['lighthouse_accessibility', { 'psi.mobile.accessibility_score': 60 }, 'high'], ['lighthouse_best_practices', { 'psi.mobile.best_practices_score': 70 }, 'medium']
];
CASES.forEach(function (c) {
  test('rule ' + c[0] + ': appears when its evidence says so, with the five parts, cited evidence and a transparent priority', function () {
    const bad = override(GOOD, c[1]);
    if (c[0] === 'http_not_redirected') bad.push({ metric_key: 'https.http_redirects_to_https', value: false });
    const r = run(bad.concat(NOT_TESTED));
    const x = r.recs.find(function (y) { return y.key === c[0]; });
    assert.ok(x, c[0] + ' was not produced');
    ['title', 'found', 'why_it_may_matter', 'what_could_change'].forEach(function (k) { assert.ok(typeof x[k] === 'string' && x[k].length > 10, k); });
    assert.ok(Array.isArray(x.check_before_implementation) && x.check_before_implementation.length >= 1);
    assert.ok(x.service && SERVICE_KEYS.indexOf(x.service.key) !== -1 && ALLOWED.indexOf(x.service.cta.href) !== -1);
    assert.ok(x.evidence_ids.length >= 1 && x.evidence_ids.every(function (id) { return r.rows.some(function (e) { return e.id === id; }); }));
    assert.ok(['technical_issue', 'commercial_hypothesis', 'opportunity'].indexOf(x.issue_type) !== -1);
    const b = x.priority.basis;
    assert.ok([1, 2, 3].indexOf(b.severity) !== -1 && ['high', 'medium', 'low'].indexOf(b.confidence) !== -1 && ['low', 'medium', 'high'].indexOf(b.effort) !== -1);
    const score = b.severity * { high: 3, medium: 2, low: 1 }[b.confidence];
    assert.strictEqual(x.priority.tier, score >= 6 ? 'high' : score >= 3 ? 'medium' : 'low');
    assert.ok(b.rule.indexOf('= ' + score) !== -1 && /high if 6 or more/.test(b.rule), 'the rule text shows the working');
    if (c[2]) assert.strictEqual(x.priority.tier, c[2], c[0]);
    // the other healthy items did not trigger
    assert.ok(r.recs.filter(function (y) { return y.issue_type === 'technical_issue'; }).length <= 2, 'only the intended rules fire');
  });
});

test('recommendations: ranks are unique 1..n, ordering is deterministic and tiers sort first', function () {
  const bad = override(GOOD, { 'https.enabled': false, 'page.title.present': false, 'sitemap.present': false, 'psi.mobile.lcp_ms': 5000, 'page.h1.count': 2, 'page.canonical.present': false });
  const a = run(bad.concat(NOT_TESTED)).recs, b = run(bad.concat(NOT_TESTED).reverse()).recs;
  assert.deepStrictEqual(a.map(function (x) { return x.key + ':' + x.priority.rank; }), a.map(function (x, i) { return x.key + ':' + (i + 1); }));
  assert.deepStrictEqual(a.map(function (x) { return x.key; }), b.map(function (x) { return x.key; }), 'input order does not change the result');
  const order = { high: 0, medium: 1, low: 2 };
  for (let i = 1; i < a.length; i++) assert.ok(order[a[i - 1].priority.tier] <= order[a[i].priority.tier]);
  assert.strictEqual(new Set(a.map(function (x) { return x.priority.rank; })).size, a.length);
  assert.strictEqual(recs.tierOf(6), 'high'); assert.strictEqual(recs.tierOf(5), 'medium'); assert.strictEqual(recs.tierOf(3), 'medium'); assert.strictEqual(recs.tierOf(2), 'low');
});

test('commercial hypotheses are labelled as inferences and cite only inference or customer supplied evidence; technical issues never do', function () {
  const r = run(override(GOOD, { 'content.service_pages.estimate': { value: 0, state: 'reasonable_inference' } }).concat(NOT_TESTED));
  const h = r.recs.filter(function (x) { return x.issue_type === 'commercial_hypothesis'; });
  assert.ok(h.length >= 1);
  h.forEach(function (x) {
    assert.ok(x.found.indexOf('This is an inference:') === 0);
    x.evidence_ids.forEach(function (id) { const e = r.rows.find(function (y) { return y.id === id; }); assert.ok(['reasonable_inference', 'customer_supplied'].indexOf(e.evidence_state) !== -1); });
  });
  r.recs.filter(function (x) { return x.issue_type === 'technical_issue'; }).forEach(function (x) { assert.ok(x.found.indexOf('This is an inference') === -1); });
});

test('a site that could not be read yields an honest "could not be read" item, not invented findings', function () {
  const r = run([{ metric_key: 'page.status', state: 'unavailable', reason_code: 'site_unreachable' }, { metric_key: 'page.title.present', state: 'unavailable', reason_code: 'site_unreachable' }].concat(NOT_TESTED));
  assert.ok(r.recs.some(function (x) { return x.key === 'site_not_read'; }));
  assert.ok(!r.recs.some(function (x) { return x.key === 'missing_title'; }), 'no title finding without a title measurement');
  const err = run([{ metric_key: 'page.status', value: 503 }].concat(NOT_TESTED));
  assert.ok(err.recs.some(function (x) { return x.key === 'home_page_error'; }));
  const robots = run([{ metric_key: 'page.status', state: 'not_tested', reason_code: 'blocked_by_robots' }].concat(NOT_TESTED));
  assert.ok(robots.recs.some(function (x) { return x.key === 'site_blocks_review_bot'; }));
});

test('wording never promises outcomes, gives money or ranking figures, or claims cause', function () {
  const worst = override(GOOD, { 'https.enabled': false, 'page.title.present': false, 'psi.mobile.lcp_ms': 6000, 'psi.mobile.cls': 0.5, 'psi.mobile.tbt_ms': 900, 'psi.mobile.seo_score': 40, 'psi.mobile.accessibility_score': 40, 'psi.mobile.best_practices_score': 40, 'links.broken.count': 9, 'contact.route.present': false, 'content.service_pages.estimate': { value: 0, state: 'reasonable_inference' } });
  const r = run(worst.concat(NOT_TESTED), ['google_visibility', 'ai_search_visibility'], [automation.mapTask('We send quotes but forget to chase them')]);
  const text = JSON.stringify(r.recs).toLowerCase();
  ['guarantee', 'will increase', 'will rank', 'first page', 'more customers', 'more revenue', 'lost sales', 'lose customers', 'stealing', 'because of', 'more successful', '£', 'per month', 'roi', 'return on investment', 'free development', 'save you'].forEach(function (b) { assert.ok(text.indexOf(b) === -1, 'banned wording: ' + b); });
  assert.ok(!/revenue|saving/.test(Object.keys(r.recs[0]).join()), 'no revenue fields');
  assert.ok(!/—|–|\.\.\.|…/.test(JSON.stringify(r.recs)), 'no em dashes or ellipses');
  assert.ok(!/\bISO\b/.test(JSON.stringify(r.recs)), 'no standards claims or edition years');
  assert.ok(!/seamless|showcase|delve|cutting.edge/i.test(JSON.stringify(r.recs)));
  r.recs.forEach(function (x) { assert.ok(ALLOWED.indexOf(x.service.cta.href) !== -1, x.service.cta.href); });
});

test('automation recommendation carries the "potential workflow" caveat and no savings', function () {
  const op = automation.mapTask('We send quotes but forget to chase them');
  const r = run(GOOD.concat(NOT_TESTED, [{ metric_key: 'customer.automation_task', state: 'customer_supplied', value: op.task_text, source: { kind: 'customer_supplied', name: 'Information supplied by you' } }]), [], [op]);
  const x = r.recs.find(function (y) { return y.key === 'automation_opportunity'; });
  assert.ok(x);
  assert.strictEqual(x.service.key, 'automation');
  assert.ok(x.caveats.join(' ').indexOf('not an existing implementation') !== -1);
  assert.ok(!/hours|minutes|save|saving|£/i.test(x.found + x.why_it_may_matter + x.what_could_change));
});

test('owner overrides hide or annotate recommendations and re-rank without editing the originals', function () {
  const r = run(override(GOOD, { 'page.title.present': false, 'sitemap.present': false }).concat(NOT_TESTED));
  const original = JSON.stringify(r.recs);
  const out = recs.applyOverrides(r.recs, { recommendations: [{ key: 'missing_title', hide: true }, { key: 'no_sitemap', owner_note: 'Discuss.' }] });
  assert.ok(!out.some(function (x) { return x.key === 'missing_title'; }));
  assert.strictEqual(out.find(function (x) { return x.key === 'no_sitemap'; }).owner_note, 'Discuss.');
  assert.deepStrictEqual(out.map(function (x) { return x.priority.rank; }), out.map(function (_, i) { return i + 1; }));
  assert.strictEqual(JSON.stringify(r.recs), original);
});

test('automation mapper: the eight example tasks map sensibly; unknown tasks need a conversation; no figures or claims about their systems', function () {
  const expect = {
    'We spend too long replying to new enquiries': 'enquiry_management', 'We send quotes but forget to chase them': 'quote_follow_up', 'We forget to follow up potential customers': 'enquiry_management',
    'We spend time updating customers on their jobs': 'customer_updates', 'We copy information into spreadsheets by hand': 'data_entry_copying', 'We spend hours preparing reports': 'reporting',
    'We move information between systems by hand': 'system_sync', 'We manage documents and approvals by email': 'document_approvals', 'Enquiries by website and email get lost': 'enquiry_management'
  };
  Object.keys(expect).forEach(function (t) {
    const o = automation.mapTask(t);
    assert.strictEqual(o.category_key, expect[t], t);
    assert.strictEqual(o.evidence_state, 'reasonable_inference');
    assert.strictEqual(o.task_text, t);
    assert.ok(/potential workflow, not an existing implementation at your business/.test(o.not_included));
    assert.ok(/not included|does not include development/.test(o.not_included) || /does not include development/.test(o.not_included));
    assert.ok(o.stages.length >= 3 && o.integrations_likely_needed.length && o.approval_points.length && o.unknowns.length === 3);
    assert.ok(/Not yet checked/.test(o.legal_note));
    assert.ok(!/\d+\s?(hours|minutes|%|per week)|£|\bsave\b|saving/i.test(JSON.stringify(o)), 'no savings or money claims: ' + t);
    assert.ok(!/compliant|compliance is|legally/i.test(o.legal_note));
    assert.deepStrictEqual(o.service.cta, { label: 'Discuss an automation', href: '/automation' });
  });
  ['tidy the shed', 'x', 'We water the plants every day', 'a'.repeat(600)].forEach(function (t) {
    const o = automation.mapTask(t);
    assert.strictEqual(o.category_key, 'other');
    assert.strictEqual(o.confidence, 'low');
    assert.strictEqual(o.demo, null);
  });
  assert.strictEqual(automation.mapTask('We send quotes but forget to chase them').demo.href, '/automation-demos#quote-follow-up');
  assert.strictEqual(automation.mapTask('We manage documents and approvals by email').demo.href, '/automation-demos#document-approval');
  assert.strictEqual(automation.mapTask('We send quotes but forget to chase them').confidence, 'medium');
  assert.strictEqual(automation.mapTask('quotes chase and remind customers who send nothing back').confidence === 'low', false);
  const t0 = Date.now();
  automation.mapTask('quote '.repeat(120) + 'chase '.repeat(60));
  assert.ok(Date.now() - t0 < 500);
});
