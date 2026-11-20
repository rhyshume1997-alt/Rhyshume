/* FIXTURE SERVER for the business review UI browser tests. NOT part of the site and never deployed.
   Inputs: the repository files (served like Vercel with cleanUrls) and a small mock of /api/business-review built from
   test/fixtures/business-review/*.json. Every answer from the mock is labelled demonstration data in the fixtures.
   Outputs: an HTTP server on the port given (default 4181). Control endpoints under /__mock/ let a test pick a scenario and read the request log.
   Must not change: production code never imports this file or the fixtures; the page under test gets no special hooks. */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const FIX = path.join(ROOT, 'test', 'fixtures', 'business-review');
const fx = (n) => JSON.parse(fs.readFileSync(path.join(FIX, n + '.json'), 'utf8'));
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.txt': 'text/plain', '.xml': 'text/xml' };

const TOKEN = 'q3Zk1m0uQ2r1Gx3d7Hh5mY2uJ4sV9bTf8LwEoPaNcXg';
const ID = '6c9b8e2a-6a77-4c0a-9a41-1d2f7b0d3f10';

const STEP_LABELS = {
  site_fetch: 'Reading your website', site_analysis: 'Checking titles, headings and structure', psi_business: 'Running a mobile speed test on your site',
  competitor_discovery: 'Finding comparison businesses', competitor_fetch: 'Reading the comparison website', psi_competitors: 'Running the same speed test on the comparison site',
  local_search: 'Local search', ai_visibility: 'AI search visibility', automation_map: 'Looking at the task you described', report_build: 'Building your report'
};
const ORDER = Object.keys(STEP_LABELS);

function freshState() {
  return { scenario: 'with-website', log: [], startKeys: {}, advanceCalls: 0, confirmed: null, started: null, extra: { automation: null }, deleted: false, flags: {}, pdf: false, delayMs: 0 };
}
let M = freshState();

// How each scenario fills the step list at a given advance call (1 based) and what the final status is.
function stepsFor(call, sc) {
  const noSite = sc === 'no-website';
  const st = {};
  ORDER.forEach((k) => { st[k] = { key: k, label: STEP_LABELS[k], state: 'pending', started_at: null, finished_at: null, reason: null, message: '' }; });
  const done = (k, msg) => { st[k].state = 'done'; st[k].message = msg || ''; };
  if (noSite) { ['site_fetch', 'site_analysis', 'psi_business'].forEach((k) => { st[k].state = 'skipped'; st[k].reason = 'no_website'; }); }
  if (call >= 1 && !noSite) { done('site_fetch', 'Read 6 pages.'); done('site_analysis'); st.psi_business.state = 'running'; }
  if (call >= 2) {
    if (!noSite) done('psi_business');
    if (sc === 'discovery-unavailable' || noSite) { st.competitor_discovery.state = 'unavailable'; st.competitor_discovery.reason = 'not_configured'; st.competitor_discovery.message = 'No supported business search source is switched on.'; st.competitor_fetch.state = 'skipped'; st.psi_competitors.state = 'skipped'; }
    else { done('competitor_discovery', 'Using the business you named.'); done('competitor_fetch'); done('psi_competitors'); }
    st.local_search.state = 'unavailable'; st.local_search.reason = 'no_supported_source';
    st.ai_visibility.state = 'unavailable'; st.ai_visibility.reason = 'not_run_in_free_review'; st.ai_visibility.message = 'Awaiting a supported test.';
    if (sc === 'partial') { st.psi_competitors.state = 'failed'; st.psi_competitors.reason = 'timeout'; st.psi_competitors.message = 'The speed test on the comparison site did not finish.'; }
    st.automation_map.state = 'running';
  }
  if (call >= 3) { done('automation_map'); done('report_build'); }
  return ORDER.map((k) => st[k]);
}

function statusObj(sc, call, over) {
  const base = fx('status-running');
  const ready = call >= 3;
  const s = JSON.parse(JSON.stringify(base));
  delete s.fixture; delete s.fixture_note;
  const conf = M.confirmed || {}, st = M.started || {};
  s.review.business_name = st.business_name || s.review.business_name;
  s.review.website_url = sc === 'no-website' ? null : s.review.website_url;
  s.review.assessment_level = sc === 'no-website' ? 'reduced' : 'standard';
  s.review.status = ready ? 'ready' : (call >= 1 ? 'running' : 'queued');
  s.review.completeness = ready ? (sc === 'with-website' ? 'partial' : 'partial') : 'pending';
  s.review.completed_at = ready ? '2026-11-20T10:19:30Z' : null;
  s.steps = stepsFor(call, sc);
  s.next_after_ms = ready ? 0 : 100;
  s.report_available = ready;
  s.report_version = ready ? 1 : null;
  s.competitors = [];
  return Object.assign(s, over || {});
}

function reportFor(sc) {
  let name = sc === 'no-website' ? 'report-no-website' : (sc === 'discovery-unavailable' ? 'report-ai-awaiting' : 'report-with-competitor');
  const r = fx(name); delete r.fixture; delete r.fixture_note;
  if (sc === 'partial') r.report.completeness = 'partial';
  if (M.started && M.started.business_name) r.report.business.name = M.started.business_name;
  if (M.extra.automation) r.report.automation = { opportunities: [M.extra.automation] };
  return r;
}

const AUTOMATION = {
  id: 'ao1', task_text: 'We send quotes but forget to chase them', category_key: 'quote_follow_up', workflow_title: 'Quotation follow up workflow', evidence_state: 'reasonable_inference',
  match_basis: 'phrases: send quotes, chase', confidence: 'medium',
  description: 'A possible workflow in which each quote is recorded with a date and status, a follow up is prepared when no reply has been recorded by the agreed date, and further follow ups stop when the quote is accepted, declined or closed.',
  stages: ['Quote issued and recorded with a date and status', 'Follow up due date reached with no response', 'Follow up prepared for a person to approve', 'Stops when accepted, declined or closed', 'Communication history visible on the quote'],
  integrations_likely_needed: ['Where quotes are created today', 'Email or messaging used with customers'],
  approval_points: ['A person approves wording and timing rules before anything is sent'],
  unknowns: ['Your current software', 'How you issue quotes', 'How much time this takes now'],
  legal_note: 'Any customer messaging must be checked for consent and opt out rules before use. Not yet checked.',
  not_included: 'This is a potential workflow, not an existing implementation at your business. The free review does not include development. Implementation is quoted separately.',
  demo: { key: 'quote_follow_up', href: '/automation-demos#quote-follow-up' },
  service: { key: 'automation', label: 'Business process automation', cta: { label: 'Discuss an automation', href: '/automation' } }
};

function send(res, code, obj, extra) {
  res.writeHead(code, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Referrer-Policy': 'no-referrer' }, extra || {}));
  res.end(JSON.stringify(obj));
}
const ok = (res, payload, code) => send(res, code || 200, Object.assign({ ok: true, contract_version: '1.0' }, payload));
const err = (res, code, errCode, message, extra) => send(res, code, { ok: false, contract_version: '1.0', error: Object.assign({ code: errCode, message }, extra || {}) });

function readBody(req) {
  return new Promise((resolve) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}); } catch (e) { resolve({ __bad: true }); } }); });
}

async function api(req, res, url) {
  const p = url.pathname.replace(/^\/api\/business-review/, '') || '/';
  const body = ['POST', 'PUT', 'DELETE'].includes(req.method) ? await readBody(req) : {};
  const auth = req.headers['authorization'] || '';
  M.log.push({ method: req.method, path: p, auth: auth ? 'Bearer ' : '', hasToken: auth === 'Bearer ' + TOKEN, key: req.headers['idempotency-key'] || null, body });
  if (M.delayMs && req.method === 'POST' && /advance$/.test(p)) await new Promise((r) => setTimeout(r, M.delayMs));

  if (req.method === 'GET' && p === '/capabilities') {
    const c = fx('capabilities-minimal');
    if (M.pdf) c.capabilities.pdf = { state: 'available' };
    delete c.fixture; delete c.fixture_note;
    return send(res, 200, c);
  }
  if (req.method === 'POST' && p === '/start') {
    if (!body.turnstile_token) return err(res, 403, 'turnstile_failed', 'The security check did not pass. Please try again.');
    if (M.scenario === 'start-rate-limited') return err(res, 429, 'rate_limited', 'Too many reviews from this connection. Please wait a few minutes.', { retry_after_s: 120 });
    if (String(body.website || '').includes('private')) return err(res, 400, 'url_not_allowed', 'That website address cannot be used. Please check it, or leave it empty.', { reason: 'private_address' });
    const key = req.headers['idempotency-key'];
    if (key && M.startKeys[key]) { const r = M.startKeys[key]; return send(res, 200, Object.assign({}, r, { idempotent_replay: true, access_token: null })); }
    M.started = body;
    const r = fx('start-201'); delete r.fixture; delete r.fixture_note;
    r.interpretation.business_name = body.business_name;
    r.interpretation.location = body.location; r.interpretation.category = body.category;
    if (!body.website) r.interpretation.website = null;
    if (M.scenario === 'site-unreachable') r.interpretation.website.reachable = false;
    if (key) M.startKeys[key] = r;
    return send(res, 201, r);
  }
  const m = p.match(/^\/([0-9a-f-]{36})(\/[a-z.-]+)?$/);
  if (!m) return err(res, 404, 'not_found', 'Not found.');
  if (auth !== 'Bearer ' + TOKEN || m[1] !== ID || M.deleted) return err(res, 404, 'not_found', 'We could not find that review.');
  const sub = m[2] || '';
  const sc = M.scenario;

  if (req.method === 'DELETE' && !sub) { M.deleted = true; return ok(res, {}); }
  if (req.method === 'GET' && !sub) {
    if (sc === 'expired') return err(res, 410, 'expired', 'This review has expired.');
    return ok(res, statusObj(sc, M.advanceCalls));
  }
  if (req.method === 'POST' && sub === '/confirm') {
    if (body.confirmed !== true) return err(res, 400, 'validation_failed', 'Please confirm.');
    M.confirmed = body;
    return ok(res, statusObj(sc, 0, { }));
  }
  if (req.method === 'POST' && sub === '/advance') {
    if (sc === 'expired') return err(res, 410, 'expired', 'This review has expired.');
    if (sc === 'step-busy-once' && !M.flags.busy) { M.flags.busy = true; return err(res, 409, 'step_in_progress', 'Another step is running.', { retry_after_ms: 200 }); }
    if (sc === 'drop-once' && !M.flags.dropped) { M.flags.dropped = true; req.socket.destroy(); return; }
    if (sc === 'always-504') { res.writeHead(504, { 'Content-Type': 'text/plain' }); return res.end('FUNCTION_INVOCATION_TIMEOUT'); }
    if (sc === 'fail-second' && M.advanceCalls >= 1) { return ok(res, Object.assign(statusObj(sc, 1), { review: Object.assign(statusObj(sc, 1).review, { status: 'failed' }), next_after_ms: 0 })); }
    if (sc === 'stall-then-partial' && M.advanceCalls >= 1) { return err(res, 503, 'provider_unavailable', 'A service this check needs is not available right now.'); }
    M.advanceCalls += 1;
    const out = statusObj(sc, M.advanceCalls); out.ran = [];
    return ok(res, out);
  }
  if (req.method === 'GET' && sub === '/report') {
    if (sc === 'expired') return err(res, 410, 'expired', 'This report has expired.');
    if (sc === 'no-report-yet' ) return err(res, 409, 'wrong_state', 'The report is not ready.');
    return send(res, 200, reportFor(sc));
  }
  if (req.method === 'POST' && sub === '/automation') {
    if (!body.task) return err(res, 400, 'validation_failed', 'Please describe a task.');
    M.extra.automation = Object.assign({}, AUTOMATION, { task_text: body.task });
    return ok(res, { automation_opportunity: M.extra.automation, report_version: 2 });
  }
  if (req.method === 'POST' && sub === '/competitors') {
    M.advanceCalls = 0; M.confirmed = M.confirmed || {}; M.scenario = 'with-website';
    return ok(res, statusObj('with-website', 0, { review: Object.assign(statusObj('with-website', 0).review, { status: 'queued' }) }));
  }
  if (req.method === 'POST' && sub === '/request-report') {
    if (!body.consent || body.consent.report_delivery !== true) return err(res, 400, 'consent_required', 'Please tick the box to confirm the request.');
    if (sc === 'email-not-configured') return err(res, 503, 'delivery_not_configured', 'Emailing a copy is not switched on yet.');
    return send(res, 202, { ok: true, contract_version: '1.0', delivery: { id: 'd3b2', status: 'held_for_approval', to_masked: 'o***@harbourprecision.example' }, idempotent_replay: false });
  }
  if (req.method === 'POST' && sub === '/request-discussion') {
    if (!body.consent || body.consent.follow_up_contact !== true) return err(res, 400, 'consent_required', 'Please tick the box to confirm the request.');
    return ok(res, { reference: 'BR-7K2M9QX4', discussion: { requested: true } }, 201);
  }
  if (req.method === 'GET' && sub === '/report.pdf') return err(res, 501, 'pdf_unavailable', 'PDF is not available.');
  return err(res, 404, 'not_found', 'Not found.');
}

function serveStatic(req, res, url) {
  let p = decodeURIComponent(url.pathname);
  const tries = p.endsWith('/') ? [p + 'index.html'] : [p, p + '.html', p + '/index.html'];
  for (const t of tries) {
    const f = path.join(ROOT, t);
    if (!f.startsWith(ROOT)) continue;
    try {
      if (fs.statSync(f).isFile()) {
        const headers = { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' };
        if (/^\/business-review\/report/.test(p)) { headers['X-Robots-Tag'] = 'noindex, nofollow, noarchive'; headers['Cache-Control'] = 'no-store'; headers['Referrer-Policy'] = 'no-referrer'; }
        res.writeHead(200, headers); return fs.createReadStream(f).pipe(res);
      }
    } catch (e) { /* try the next */ }
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('not found');
}

function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname.startsWith('/__mock/')) {
      if (url.pathname === '/__mock/scenario') { const s = url.searchParams.get('name') || 'with-website'; M = freshState(); M.scenario = s; if (url.searchParams.get('pdf')) M.pdf = true; if (url.searchParams.get('delay')) M.delayMs = Number(url.searchParams.get('delay')); return send(res, 200, { ok: true, scenario: s }); }
      if (url.pathname === '/__mock/set') { const k = url.searchParams.get('k'); const v = url.searchParams.get('v'); if (k === 'scenario') M.scenario = v; if (k === 'delay') M.delayMs = Number(v); return send(res, 200, { ok: true }); }
      if (url.pathname === '/__mock/log') return send(res, 200, { log: M.log });
      return send(res, 404, {});
    }
    if (url.pathname.startsWith('/api/business-review')) return api(req, res, url).catch((e) => { try { send(res, 500, { ok: false, error: { code: 'internal', message: String(e) } }); } catch (x) { /* ignore */ } });
    // The Turnstile script is replaced by a stub so no outside host is needed. The stub gives a fixed test token.
    if (url.pathname === '/__stub/turnstile.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript' });
      return res.end("window.turnstile={_n:0,render:function(el,o){var id='w'+(++this._n);el.setAttribute('data-test-widget',o.action);setTimeout(function(){o.callback('TEST-TOKEN-'+o.action)},60);return id},reset:function(){}};");
    }
    return serveStatic(req, res, url);
  });
}

module.exports = { createServer, TOKEN, ID };
if (require.main === module) {
  const port = Number(process.argv[2] || 4181);
  createServer().listen(port, () => console.log('fixture server on ' + port));
}
