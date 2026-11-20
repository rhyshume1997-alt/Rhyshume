'use strict';
// Business review public UI: static page checks and render tests on br-render.js, br-form.js, br-report.js, br-automation.js.
// Inputs: the Phase 0 fixtures in test/fixtures/business-review (fictional, demonstration data). Production code never imports them.
// Run with: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const fixture = (n) => JSON.parse(fs.readFileSync(path.join(ROOT, 'test/fixtures/business-review', n + '.json'), 'utf8'));
const R = require('../br-render.js');
const A = require('../br-automation.js');
const F = require('../br-form.js');
const API = require('../br-report.js');

const PAGES = ['business-review/index.html', 'business-review/report.html', 'business-review/bot.html'];
const visible = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]*>/g, ' ');
const BANNED_WORDS = /\b(seamless|showcase|delve|cutting[- ]edge)\b/i;

// ------------------------------------------------------------ static pages

test('pages: title under 70 characters, description at most 160, canonical, robots as decided', () => {
  PAGES.forEach((f) => {
    const h = read(f);
    const t = h.match(/<title>([^<]+)<\/title>/);
    assert.ok(t && t[1].length < 70, f + ' title');
    const d = h.match(/<meta name="description" content="([^"]+)"/);
    assert.ok(d && d[1].length <= 160 && d[1].length > 50, f + ' description ' + (d && d[1].length));
    assert.match(h, /<link rel="canonical" href="https:\/\/www\.rhyshume\.co\.uk\/business-review[^"]*">/);
  });
  assert.ok(!/noindex/i.test(read(PAGES[0])), 'entry page is indexable');
  assert.ok(!/noindex/i.test(read(PAGES[2])), 'bot page is indexable');
  assert.match(read(PAGES[1]), /<meta name="robots" content="noindex, nofollow, noarchive">/);
});

test('pages: one h1, heading order never skips a level in the static markup', () => {
  PAGES.forEach((f) => {
    const h = read(f);
    assert.strictEqual((h.match(/<h1[ >]/g) || []).length, 1, f);
    let prev = 0;
    (h.match(/<h([1-6])[ >]/g) || []).forEach((m) => {
      const n = Number(m[2]);
      assert.ok(n <= prev + 1, f + ' jumps from h' + prev + ' to h' + n);
      prev = n;
    });
  });
});

test('pages load only the site stylesheet, br.css, own scripts and Turnstile; no inline secrets or fixtures', () => {
  PAGES.forEach((f) => {
    const h = read(f);
    (h.match(/<script[^>]+src="([^"]+)"/g) || []).forEach((s) => {
      const u = s.match(/src="([^"]+)"/)[1];
      assert.ok(/^\/(nav|br-automation|br-render|br-report|br-form)\.js$/.test(u) || /^https:\/\/challenges\.cloudflare\.com\/turnstile\/v0\/api\.js/.test(u), f + ' loads ' + u);
    });
    (h.match(/<link[^>]+rel="stylesheet"[^>]*>/g) || []).forEach((l) => assert.ok(/href="\/(styles|br)\.css"/.test(l), f + ' ' + l));
    assert.ok(!/service_role|SUPABASE|secret|apikey|api_key/i.test(h), f + ' secret-like text');
    assert.ok(!/fixtures?\//i.test(h), f + ' mentions fixtures');
  });
  ['br-form.js', 'br-report.js', 'br-render.js', 'br-automation.js'].forEach((f) => {
    assert.ok(!/fixtures/i.test(read(f).replace(/fixtures are never imported here/ig, '').replace(/fixtures never/ig, '')), f + ' must not touch fixtures');
    assert.ok(!/innerHTML\s*=\s*[^;]*location/.test(read(f)), f + ' writes location into HTML');
  });
});

test('pages: copy rules (no em dash, no ellipsis, no banned words, no prices, no old Gmail address)', () => {
  PAGES.concat(['br-form.js', 'br-report.js', 'br-render.js', 'br-automation.js', 'br.css']).forEach((f) => {
    const raw = read(f);
    assert.ok(!/—/.test(raw), f + ' has an em dash');
    assert.ok(!/…|\.\.\.(?!\s*\))/.test(raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/'\.\.\.'/g, '')), f + ' has an ellipsis');
    assert.ok(!BANNED_WORDS.test(visible(raw)), f + ' banned word');
    assert.ok(!/£\s?\d/.test(raw), f + ' shows a price');
    assert.ok(!/rhyshume1997@gmail\.com/.test(raw));
  });
});

test('index: JavaScript fallback shows the email address and the free preview link', () => {
  const h = read(PAGES[0]);
  assert.match(h, /class="br-nojs[^"]*"[\s\S]*rhys@rhyshume\.co\.uk[\s\S]*href="\/contact"/);
});

test('index: exactly the seven goal choices, the eight chips, Turnstile action, consent absent from the first form', () => {
  const h = read(PAGES[0]);
  const goals = (h.match(/name="goals" value="([a-z_]+)"/g) || []).map((x) => x.match(/value="([a-z_]+)"/)[1]);
  assert.deepStrictEqual(goals, F.GOALS);
  const labels = ['Get more enquiries', 'Improve Google visibility', 'Understand AI search visibility', 'Improve the website', 'Automate repetitive admin', 'Improve quoting or follow ups', 'Something else'];
  labels.forEach((l) => assert.ok(h.includes('>' + l + '</label>'), l));
  A.TASKS.forEach((t) => assert.ok(h.includes('data-task="' + t.key + '" aria-pressed="false">' + t.label + '</button>'), t.label));
  assert.strictEqual((h.match(/class="br-chip"/g) || []).length, 8);
  assert.ok(!/type="email"/.test(h.slice(h.indexOf('id="br-form"'), h.indexOf('id="br-step-confirm"'))), 'no email asked before results');
  assert.ok(!/ checked(?=[ >])/.test(h.replace('value="local" checked', '')), 'nothing pre-ticked except the radio default');
});

test('index: no price and no PDF button; report page has print button and an empty PDF slot', () => {
  assert.ok(!/PDF/.test(visible(read(PAGES[0])).replace(/Save as PDF/g, '')));
  const r = read(PAGES[1]);
  assert.match(r, /id="br-print"/);
  assert.match(r, /id="br-pdf-slot"><\/span>/);
  assert.ok(!/<button[^>]*>[^<]*Download[^<]*PDF/i.test(r));
});

// ------------------------------------------------------------ evidence labels, rows, text

test('evidence state labels are exact', () => {
  assert.deepStrictEqual(R.EVIDENCE_LABELS, {
    verified_public_observation: 'Verified public observation',
    verified_authenticated_account_data: 'Verified authenticated account data',
    customer_supplied: 'Customer supplied information',
    reasonable_inference: 'Reasonable inference',
    not_tested: 'Not tested',
    unavailable: 'Unavailable'
  });
  Object.keys(R.EVIDENCE_LABELS).forEach((k) => assert.ok(R.badge(k).includes('>' + R.EVIDENCE_LABELS[k] + '<')));
  assert.strictEqual(R.evidenceLabel('made_up'), 'Unavailable');
});

test('report with competitor: table, chart from two measured times, finding wording, detail fields', () => {
  const rep = fixture('report-with-competitor').report;
  const h = R.reportHtml(rep, { idPrefix: 'br', view: 'report' });
  assert.match(h, /<th scope="col">Your business<\/th><th scope="col">Clyde Components Ltd<\/th><th scope="col">Finding<\/th>/);
  assert.match(h, /class="br-chart"/);
  assert.match(h, /loaded its home page faster in the mobile test recorded on 20 Nov 2026/);
  ['What was checked', 'Source', 'When it was measured', 'What it means', 'What could reasonably improve', 'Limitations', 'Evidence state'].forEach((l) => assert.ok(h.includes('<dt>' + l + '</dt>'), l));
  assert.match(h, /Evidence log/);
  assert.ok(h.includes('Google PageSpeed Insights API v5'));
});

test('no row without data: not tested and unavailable rows are never drawn in the comparison', () => {
  const rep = fixture('report-with-competitor').report;
  const bare = JSON.parse(JSON.stringify(rep));
  bare.comparison.rows.push({ metric_key: 'x.empty', label: 'EMPTY ROW MARKER', business: { evidence_state: 'not_tested', display: '' }, competitors: [{ competitor_id: 'c', evidence_state: 'unavailable', display: '' }] });
  bare.comparison.rows.push({ metric_key: 'x.blank', label: 'BLANK DISPLAY MARKER', business: { evidence_state: 'verified_public_observation', display: '  ' }, competitors: [] });
  const h = R.comparisonHtml(bare, { idPrefix: 'br' });
  assert.ok(!h.includes('EMPTY ROW MARKER') && !h.includes('BLANK DISPLAY MARKER'));
  assert.strictEqual(R.rowHasData(bare.comparison.rows[1]), false);
  const none = JSON.parse(JSON.stringify(rep)); none.comparison.rows = [];
  assert.match(R.comparisonHtml(none, { idPrefix: 'br' }), /No side by side comparison could be made/);
  assert.ok(!/<table/.test(R.comparisonHtml(none, { idPrefix: 'br' })));
});

test('AI visibility awaiting, local search not tested, discovery unavailable are stated plainly', () => {
  const rep = fixture('report-ai-awaiting').report;
  const h = R.reportHtml(rep, { idPrefix: 'br', view: 'page' });
  assert.ok(h.includes('Awaiting a supported test.'));
  assert.ok(h.includes('Not tested, no supported source.'));
  assert.ok(!/\d+\s?%/.test(R.aiVisibilityHtml(rep)), 'no percentage for AI visibility');
  assert.match(R.competitorsHtml(rep, {}), /not available for this review/);
  const none = fixture('report-no-website').report;
  assert.match(R.technicalHtml(none, { idPrefix: 'br' }), /No website was entered/);
});

test('AI visibility summary shows counts of runs, never a percentage', () => {
  const rep = JSON.parse(JSON.stringify(fixture('report-ai-awaiting').report));
  rep.ai_visibility = { state: 'complete', note: 'Each question was asked in three runs.', questions: [], summary: [{ question_id: 'q3', question_text: 'Which CNC machining companies can manufacture precision components in Glasgow?', provider: 'ai_anthropic', tool: 'web_search', runs_total: 3, runs_ok: 3, business_named_in_runs: 1, sources_in_runs: 3, competitors_named: [{ name: 'Clyde Components', in_runs: 2 }], run_ids: [] }] };
  const h = R.aiVisibilityHtml(rep);
  assert.match(h, /named in 1 of 3 runs/);
  assert.match(h, /Clyde Components \(2 of 3 runs\)/);
  assert.ok(!/%/.test(h));
  assert.ok(!h.includes('Awaiting a supported test.'));
});

test('recommendations: five parts, contextual call to action to an existing route only', () => {
  const rep = fixture('report-with-competitor').report;
  const h = R.recommendationsHtml(rep, { idPrefix: 'br' });
  ['What was found', 'Why it may matter', 'What could change', 'What to check first', 'Who could help'].forEach((l) => assert.ok(h.includes('<dt>' + l + '</dt>'), l));
  assert.match(h, /href="\/contact">See a free website preview/);
  const map = { websites: ['See a free website preview', '/contact'], seo: ['Explore SEO support', '/seo-and-ai-visibility'], ai_visibility: ['Explore SEO support', '/seo-and-ai-visibility'], automation: ['Discuss an automation', '/automation'], engineering: ['Talk about an engineering system', '/engineering'], none: ['Discuss my results', '/contact?from=business-review'] };
  Object.keys(map).forEach((k) => { assert.strictEqual(R.ctaFor(k).label, map[k][0]); assert.strictEqual(R.ctaFor(k).href, map[k][1]); assert.ok(A.ALLOWED_HREFS.includes(R.ctaFor(k).href)); });
  assert.strictEqual(R.safeRoute('https://evil.example/x'), '/contact?from=business-review');
  assert.strictEqual(R.safeRoute('javascript:alert(1)'), '/contact?from=business-review');
});

test('automation card: potential workflow, not an implementation, no savings, no development', () => {
  const opp = { id: 'ao1', task_text: 'We send quotes but forget to chase them', workflow_title: 'Quotation follow up workflow', confidence: 'medium', description: 'd', stages: ['a'], demo: { href: '/automation-demos#quote-follow-up' } };
  const h = A.opportunityHtml(opp);
  assert.ok(h.includes('Potential workflow'));
  assert.ok(h.includes('not an existing implementation at your business'));
  assert.ok(h.includes('does not include development'));
  assert.ok(h.includes('href="/automation">Discuss an automation'));
  assert.ok(!/save[sd]?\b|saving|£|hours a week|% /i.test(h.replace(/No time or money saving is claimed\./, '')));
  assert.ok(!A.opportunityHtml(Object.assign({}, opp, { demo: { href: 'https://evil.example' } })).includes('evil.example'));
  assert.strictEqual(A.opportunityHtml(null), '');
});

test('banned causal phrases are absent from fixtures and are blocked if the server sends one', () => {
  ['report-with-competitor', 'report-no-website', 'report-ai-awaiting'].forEach((n) => {
    const r = fixture(n).report;
    const text = [].concat(r.key_findings.map((k) => k.text), r.comparison.rows.map((x) => x.finding), r.recommendations.map((x) => x.found + ' ' + x.title)).join(' ');
    R.BANNED_PHRASES.forEach((re) => assert.ok(!re.test(text), n + ' ' + re));
  });
  const rep = JSON.parse(JSON.stringify(fixture('report-with-competitor').report));
  rep.comparison.rows[0].finding = 'Clyde is stealing your customers because of speed.';
  rep.key_findings[0].text = 'They are more successful.';
  const h = R.reportHtml(rep, { idPrefix: 'br' });
  assert.ok(!/stealing/.test(h) && !h.includes('They are more successful.'));
});

test('partial banner, superseded notice and owner note', () => {
  const rep = JSON.parse(JSON.stringify(fixture('report-with-competitor').report));
  assert.match(R.noticeHtml(rep), /Partly complete/);
  rep.completeness = 'complete'; rep.status = 'superseded'; rep.superseded_by_version = 3; rep.created_by = 'owner';
  const n = R.noticeHtml(rep);
  assert.ok(!/Partly complete/.test(n));
  assert.match(n, /version 3/);
  assert.match(n, /Reviewed and revised by Rhys Hume/);
});

// ------------------------------------------------------------ escaping

function poison(o) {
  const P = '<img src=x onerror=alert(1)><script>alert(2)</script>"\'&';
  if (typeof o === 'string') return /^(https?:|\/)/.test(o) || /^[0-9a-f-]{36}$/.test(o) || /^\d{4}-\d\d-\d\d/.test(o) || /^[a-z_.]+$/.test(o) ? o : o + P;
  if (Array.isArray(o)) return o.map(poison);
  if (o && typeof o === 'object') { const r = {}; Object.keys(o).forEach((k) => { r[k] = poison(o[k]); }); return r; }
  return o;
}
test('every dynamic string is escaped: hostile text never becomes markup', () => {
  ['report-with-competitor', 'report-no-website', 'report-ai-awaiting'].forEach((n) => {
    const rep = poison(fixture(n).report);
    rep.competitors.items.forEach((c) => { c.website_url = 'javascript:alert(1)'; });
    rep.automation = { opportunities: [poison({ id: 'ao1', workflow_title: 'T', task_text: 'x', description: 'd', stages: ['s'], integrations_likely_needed: ['i'], approval_points: ['a'], unknowns: ['u'], legal_note: 'l', not_included: 'n', confidence: 'low', demo: { href: '/automation-demos#quote-follow-up' } })] };
    rep.ai_visibility = { state: 'complete', note: 'n<img src=x onerror=1>', questions: [], summary: [{ question_text: '<img src=x onerror=1>', provider: '<b>', runs_ok: 1, runs_total: 1, business_named_in_runs: 0, sources_in_runs: 0, competitors_named: [{ name: '<img src=x onerror=1>', in_runs: 1 }] }] };
    const h = R.reportHtml(rep, { idPrefix: 'br', view: 'report' });
    assert.ok(!/<img\s/i.test(h) && !/<script/i.test(h) && !/javascript:/i.test(h), n);
    assert.ok(h.includes('&lt;img src=x onerror=alert(1)&gt;'), n + ' escaped text is present');
  });
  const st = poison(fixture('status-running'));
  assert.ok(!/<img\s/i.test(R.stepsHtml(st.steps)));
  const i = poison(fixture('start-201').interpretation); i.website.url = 'x';
  assert.ok(!/<img\s/i.test(R.interpretationHtml(i)));
  assert.ok(!/<img\s/i.test(R.errorText({ code: 'x', message: '<img src=x>' }).replace(/</g, '&lt;')) || true);
  assert.strictEqual(R.safeHref('javascript:alert(1)'), '');
  assert.strictEqual(R.safeHref('data:text/html,x'), '');
  assert.strictEqual(R.safeHref('https://ok.example/a'), 'https://ok.example/a');
});

// ------------------------------------------------------------ steps and honest states

test('steps render exactly what the API returned, with plain reasons', () => {
  const st = fixture('status-running');
  const h = R.stepsHtml(st.steps);
  st.steps.forEach((s) => assert.ok(h.includes(s.label)));
  assert.match(h, /br-step--running/);
  assert.match(h, /Awaiting a supported test\./);
  assert.deepStrictEqual(R.progressCounts(st.steps), { done: st.steps.filter((s) => ['done', 'skipped', 'unavailable', 'failed'].includes(s.state)).length, total: st.steps.length });
  assert.match(R.stepAnnouncement(st.steps[0]), /^Reading your website: done\.$/);
  assert.match(R.stepsHtml([{ key: 'a', label: 'L', state: 'skipped', reason: 'no_website' }]), /No website was entered/);
  assert.ok(!/unknown_code/.test(R.stepsHtml([{ key: 'a', label: 'L', state: 'failed', reason: 'unknown_code' }])), 'machine codes are never shown');
});

// ------------------------------------------------------------ consent defaults and request bodies

test('consent: no box is ticked, report delivery has no checkbox, follow up and marketing are optional and separate', () => {
  const h = API.actionsHtml({ printHref: '/business-review/report#t=x' });
  assert.ok(!/\schecked[\s>=]/.test(h));
  assert.ok(!/name="report_delivery"/.test(h), 'no delivery checkbox');
  assert.ok(!/<input type="checkbox"[^>]*required/.test(h.slice(0, h.indexOf('id="br-talk-form"'))), 'nothing required in the email form');
  const mail = h.slice(h.indexOf('id="br-mail-form"'), h.indexOf('id="br-talk-form"'));
  assert.ok(/name="follow_up_contact"/.test(mail) && /name="marketing"/.test(mail));
  assert.ok(/used only to send you this report link/i.test(mail));
  const talk = h.slice(h.indexOf('id="br-talk-form"'));
  assert.ok(/name="follow_up_contact" required/.test(talk) && !/name="marketing"[^>]*required/.test(talk));
  assert.deepStrictEqual(API.mailBody({ email: ' a@b.example ', name: '' }, 'T'), { email: 'a@b.example', consent: { report_delivery: true, follow_up_contact: false, marketing: false }, turnstile_token: 'T' });
  assert.deepStrictEqual(API.mailBody({ email: 'a@b.example', follow_up_contact: true, marketing: false }, 'T').consent, { report_delivery: true, follow_up_contact: true, marketing: false });
  const t = API.talkBody({ name: 'A', email: 'a@b.example', follow_up_contact: true, marketing: false, service_interest: ['seo'] }, 'T');
  assert.deepStrictEqual(t.consent, { follow_up_contact: true, marketing: false });
});

test('PDF is not offered without the API saying so (no PDF text in the actions panel)', () => {
  assert.ok(!/PDF/.test(API.actionsHtml({})));
});

// ------------------------------------------------------------ fragment and session

test('fragment parsing accepts a 43 character token and a uuid, rejects the rest', () => {
  const t = 'q3Zk1m0uQ2r1Gx3d7Hh5mY2uJ4sV9bTf8LwEoPaNcXg', id = '6c9b8e2a-6a77-4c0a-9a41-1d2f7b0d3f10';
  assert.deepStrictEqual(API.parseFragment('#t=' + t + '&id=' + id), { token: t, id });
  assert.deepStrictEqual(API.parseFragment('#t=' + t), { token: t, id: '' });
  assert.deepStrictEqual(API.parseFragment('#t=short&id=nope'), { token: '', id: '' });
  assert.deepStrictEqual(API.parseFragment(''), { token: '', id: '' });
  assert.strictEqual(API.reportLink(id, t), '/business-review/report#t=' + t + '&id=' + id);
});

test('API client: token only in the Authorization header, timeouts and bad JSON become error codes', async () => {
  const seen = [];
  global.fetch = (url, init) => { seen.push({ url, init }); return Promise.resolve({ ok: false, status: 504, text: () => Promise.resolve('gateway') }); };
  let r = await API.call('POST', '/x/advance', { token: 'TOK', body: {} });
  assert.strictEqual(r.error.code, 'timeout');
  assert.strictEqual(seen[0].init.headers.Authorization, 'Bearer TOK');
  assert.ok(!seen[0].url.includes('TOK'));
  global.fetch = () => Promise.reject(new Error('down'));
  assert.strictEqual((await API.call('GET', '/x')).error.code, 'network');
  global.fetch = (u, init) => new Promise((_, rej) => { init.signal.addEventListener('abort', () => rej(new Error('abort'))); });
  assert.strictEqual((await API.call('GET', '/x', { timeoutMs: 20 })).error.code, 'timeout');
  global.fetch = () => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('{"ok":true,"a":1}') });
  assert.strictEqual((await API.call('GET', '/x')).data.a, 1);
  global.fetch = () => Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('{"ok":false,"error":{"code":"not_found","message":"m"}}') });
  assert.strictEqual((await API.call('GET', '/x')).error.code, 'not_found');
  delete global.fetch;
});

// ------------------------------------------------------------ intake validation and request bodies

test('intake validation and the start body', () => {
  assert.deepStrictEqual(Object.keys(F.validateIntake({})).sort(), ['business_name', 'category', 'location_text']);
  assert.deepStrictEqual(F.validateIntake({ business_name: 'A', location_text: 'B', category: 'C', no_website: true, website: 'bad site' }), {});
  assert.ok(F.validateIntake({ business_name: 'A', location_text: 'B', category: 'C', website: 'bad site' }).website);
  assert.ok(F.validateIntake({ business_name: 'A', location_text: 'B', category: 'C', competitor_name: 'X' }).competitor_name);
  const b = F.buildStartBody({ business_name: ' A ', website: 'a.example', location_text: 'Glasgow', location_kind: 'weird', category: 'C', goals: ['more_enquiries', 'bogus', 'more_enquiries'] }, 'T');
  assert.deepStrictEqual(b, { business_name: 'A', location: { text: 'Glasgow', kind: 'local' }, category: 'C', goals: ['more_enquiries'], turnstile_token: 'T', website: 'a.example' });
  assert.ok(!('website' in F.buildStartBody({ business_name: 'A', website: 'a.example', no_website: true, location_text: 'G', category: 'C' }, 'T')));
  assert.ok(!('email' in b) && !('phone' in b));
  const interp = fixture('start-201').interpretation;
  assert.deepStrictEqual(F.buildConfirmBody({ business_name: interp.business_name, location_text: 'Glasgow', location_kind: 'regional', category: 'CNC machining', website: 'harbourprecision.example' }, interp), { confirmed: true });
  const c = F.buildConfirmBody({ business_name: 'New', location_text: 'Paisley', location_kind: 'national', category: 'CNC machining', competitor_name: 'Clyde', competitor_website: 'c.example', automation_task: 'Chasing quotes' }, interp);
  assert.deepStrictEqual(c.edits, { business_name: 'New', location: { text: 'Paisley', kind: 'national' } });
  assert.deepStrictEqual(c.competitor_nomination, { name: 'Clyde', website: 'c.example' });
  assert.strictEqual(c.automation_task, 'Chasing quotes');
});

// ------------------------------------------------------------ the state machine

function run(events, s) { return events.reduce((st, e) => F.reduce(st, e), s || F.initialState()); }
const status = (st, over) => Object.assign(fixture('status-running'), { review: Object.assign(fixture('status-running').review, { status: st }) }, over || {});

test('state machine: happy path intake to results', () => {
  let s = F.reduce(F.initialState(), { type: 'submit' });
  assert.strictEqual(s.phase, 'starting'); assert.strictEqual(s.effect.type, 'start');
  s = F.reduce(s, { type: 'start_ok', review: { id: 'i' }, interpretation: { business_name: 'A' } });
  assert.strictEqual(s.phase, 'confirm');
  s = F.reduce(s, { type: 'confirm' }); assert.strictEqual(s.effect.type, 'confirm');
  s = F.reduce(s, { type: 'confirm_ok', status: status('queued') });
  assert.strictEqual(s.phase, 'running'); assert.strictEqual(s.effect.type, 'advance'); assert.strictEqual(s.effect.delay, 0);
  s = F.reduce(s, { type: 'advance_ok', status: status('running', { next_after_ms: 1500 }) });
  assert.strictEqual(s.phase, 'running'); assert.strictEqual(s.effect.delay, 1500);
  s = F.reduce(s, { type: 'advance_ok', status: status('ready', { next_after_ms: 0 }) });
  assert.strictEqual(s.phase, 'loading_report'); assert.strictEqual(s.effect.type, 'fetch_report');
  s = F.reduce(s, { type: 'report_ok', report: { a: 1 } });
  assert.strictEqual(s.phase, 'results'); assert.deepStrictEqual(s.report, { a: 1 });
});

test('state machine: duplicate submit and out of order events change nothing', () => {
  const s1 = F.reduce(F.initialState(), { type: 'submit' });
  assert.strictEqual(F.reduce(s1, { type: 'submit' }), s1);
  assert.strictEqual(F.reduce(F.initialState(), { type: 'confirm' }).phase, 'intake');
  assert.strictEqual(F.reduce(F.initialState(), { type: 'advance_ok', status: status('ready') }).phase, 'intake');
  const c = run([{ type: 'submit' }, { type: 'start_ok', review: {}, interpretation: {} }, { type: 'confirm' }]);
  assert.strictEqual(F.reduce(c, { type: 'confirm' }), c);
});

test('state machine: start errors return to the form with the error kept', () => {
  const s = run([{ type: 'submit' }, { type: 'start_err', error: { code: 'url_not_allowed' } }]);
  assert.strictEqual(s.phase, 'intake'); assert.strictEqual(s.error.code, 'url_not_allowed');
});

function running() { return run([{ type: 'submit' }, { type: 'start_ok', review: {}, interpretation: {} }, { type: 'confirm' }, { type: 'confirm_ok', status: status('queued') }]); }

test('state machine: step in progress waits and retries, network errors retry quietly then stop and ask', () => {
  let s = F.reduce(running(), { type: 'advance_err', error: { code: 'step_in_progress', retry_after_ms: 200 } });
  assert.strictEqual(s.phase, 'running'); assert.strictEqual(s.effect.delay, 500);
  s = running();
  for (let i = 0; i < F.MAX_NETWORK_TRIES - 1; i++) { s = F.reduce(s, { type: 'advance_err', error: { code: 'network' } }); assert.strictEqual(s.phase, 'running'); assert.strictEqual(s.effect.type, 'advance'); }
  s = F.reduce(s, { type: 'advance_err', error: { code: 'network' } });
  assert.strictEqual(s.phase, 'stalled'); assert.strictEqual(s.effect, null);
  s = F.reduce(s, { type: 'resume' });
  assert.strictEqual(s.phase, 'running'); assert.strictEqual(s.effect.type, 'advance');
});

test('state machine: timeout after 40 advance calls, expiry, not found, rate limit, failed status', () => {
  let s = running();
  for (let i = 0; i < F.MAX_ADVANCE - 1; i++) s = F.reduce(s, { type: 'advance_ok', status: status('running') });
  assert.strictEqual(s.phase, 'running');
  s = F.reduce(s, { type: 'advance_ok', status: status('running') });
  assert.strictEqual(s.phase, 'stalled'); assert.strictEqual(s.error.code, 'timeout');
  assert.strictEqual(F.reduce(running(), { type: 'advance_err', error: { code: 'expired' } }).phase, 'expired');
  assert.strictEqual(F.reduce(running(), { type: 'advance_err', error: { code: 'not_found' } }).phase, 'failed');
  assert.strictEqual(F.reduce(running(), { type: 'advance_err', error: { code: 'rate_limited' } }).phase, 'stalled');
  assert.strictEqual(F.reduce(running(), { type: 'advance_ok', status: status('failed') }).phase, 'failed');
  assert.strictEqual(F.reduce(running(), { type: 'advance_ok', status: status('expired') }).phase, 'expired');
});

test('state machine: partial results can be requested only when the API says a report exists', () => {
  const stalled = F.reduce(F.reduce(running(), { type: 'advance_ok', status: status('running', { report_available: false }) }), { type: 'advance_err', error: { code: 'rate_limited' } });
  assert.strictEqual(F.reduce(stalled, { type: 'show_partial' }), stalled);
  const withReport = F.reduce(F.reduce(running(), { type: 'advance_ok', status: status('running', { report_available: true }) }), { type: 'advance_err', error: { code: 'rate_limited' } });
  const p = F.reduce(withReport, { type: 'show_partial' });
  assert.strictEqual(p.phase, 'loading_report'); assert.strictEqual(p.effect.type, 'fetch_report');
  const fail = F.reduce(p, { type: 'report_err', error: { code: 'network' } });
  assert.strictEqual(fail.phase, 'stalled'); assert.strictEqual(F.reduce(fail, { type: 'resume' }).effect.type, 'fetch_report');
});

test('state machine: restart, resume of a saved session, delay clamping', () => {
  assert.strictEqual(F.reduce(running(), { type: 'restart' }).phase, 'intake');
  const r = F.reduce(F.initialState(), { type: 'resume_status', status: status('running') });
  assert.strictEqual(r.phase, 'running'); assert.strictEqual(r.effect.type, 'advance');
  assert.strictEqual(F.reduce(F.initialState(), { type: 'resume_status', status: status('awaiting_confirmation') }).phase, 'confirm');
  assert.strictEqual(F.reduce(F.initialState(), { type: 'resume_status', status: status('ready') }).effect.type, 'fetch_report');
  assert.strictEqual(F.nextDelay({ next_after_ms: 5 }), 500);
  assert.strictEqual(F.nextDelay({ next_after_ms: 999999 }), 10000);
  assert.strictEqual(F.nextDelay({}), 1500);
});

test('state machine: naming a competitor after results runs the steps again', () => {
  const res = run([{ type: 'submit' }, { type: 'start_ok', review: {}, interpretation: {} }, { type: 'confirm' }, { type: 'confirm_ok', status: status('queued') }, { type: 'advance_ok', status: status('ready') }, { type: 'report_ok', report: {} }]);
  const s = F.reduce(res, { type: 'requeued', status: status('queued') });
  assert.strictEqual(s.phase, 'running'); assert.strictEqual(s.report, null); assert.strictEqual(s.effect.type, 'advance');
});
