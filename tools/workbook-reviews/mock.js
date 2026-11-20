/* TEST ONLY. A small in memory stand in for the Supabase REST endpoints and the review admin API, used by e2e.js.
   Everything here is FIXTURE DATA about FICTIONAL businesses (Harbour Precision Ltd and friends, example domains, Ofcom drama phone numbers).
   Inputs : the Phase 0 contract fixtures in test/fixtures/business-review/ (read only).
   Outputs: a fresh database object and a handler that answers PostgREST style requests and /api/business-review/admin/* calls.
   Must not: be shipped, be imported by production code, contain a real address, token or key. Nothing here sends anything anywhere. */
const fs = require('fs'); const path = require('path');
const FX = n => JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'test', 'fixtures', 'business-review', n), 'utf8'));
const RID = '6c9b8e2a-6a77-4c0a-9a41-1d2f7b0d3f10', LEAD = '11111111-aaaa-4aaa-8aaa-111111111111', CLYDE = '5a0c2f1e-7b3d-4a9c-9d2e-1f3a5b7c9d0e', GIFT = '7d7d7d7d-1111-4111-8111-777777777777';
const RID2 = '22222222-2222-4222-8222-222222222222', RID3 = '33333333-3333-4333-8333-333333333333';
const MARK_INTERNAL = 'INTERNAL-ONLY-NOTE-7731';
function freshDb() {
  const rc = FX('report-with-competitor.json').report, st = FX('status-ready-partial.json');
  const rep2 = JSON.parse(JSON.stringify(rc)); rep2.recommendations.push({ id: 'rec-sd', key: 'no_service_pages', title: 'Few separate service pages were found', issue_type: 'commercial_hypothesis', found: 'This is an inference: 2 service pages were found for 5 listed services.', evidence_ids: [], why_it_may_matter: 'Separate pages can help people and search find a service.', what_could_change: 'Add a page per main service.', check_before_implementation: ['Confirm which services matter most.'], service: { key: 'seo', label: 'SEO and local search', cta: { label: 'Explore SEO support', href: '/seo-and-ai-visibility' } }, priority: { rank: 2, tier: 'medium', basis: { severity: 1, confidence: 'low', effort: 'medium', rule: 'Inference only.' } }, caveats: [] });
  const ev = rc.evidence_index.map(e => ({ id: e.id, review_id: RID, competitor_id: e.subject.kind === 'competitor' ? e.subject.competitor_id : null, category: e.category, metric_key: e.metric_key, evidence_state: e.evidence_state, reason_code: e.reason_code, value: e.value, observed_at: e.observed_at, source: e.source, method: e.method, inputs: e.inputs, limitations: e.limitations, run_key: e.run_key }));
  ev.push({ id: 'ev-local', review_id: RID, competitor_id: null, category: 'local', metric_key: 'local.maps_position', evidence_state: 'not_tested', reason_code: 'no_supported_source', value: null, observed_at: '2026-11-20T10:18:00Z', source: { kind: 'none', name: 'No supported source' }, method: {}, inputs: {}, limitations: [], run_key: 'main' });
  return {
    client_workbooks: [{ id: 'c0c0c0c0-0000-4000-8000-000000000001', client_name: 'Maple Street Bakery (made up)', updated_at: '2026-11-18T09:00:00Z', data: { client: { status: 'enquiry', business: 'Maple Street Bakery (made up)' } } }],
    client_portals: [], client_answers: [], client_videos: [], business_details: [], client_quotes: [], quote_acceptances: [],
    leads: [{ id: LEAD, created_at: '2026-11-20T10:30:00Z', name: 'Alex Reid', business: 'Harbour Precision Ltd', email: 'owner@harbourprecision.example', phone: '07700 900123', message: 'BR-7K2M9QX4: Interested in the quote follow up idea.', picks: {}, handled: false, workbook_id: null }],
    br_reviews: [
      { id: RID, ref: 'BR-7K2M9QX4', created_at: '2026-11-20T10:15:02Z', status: 'ready', completeness: 'partial', assessment_level: 'standard', business_name: 'Harbour Precision Ltd', website_url: 'https://harbourprecision.example/', location_text: 'Glasgow', location_kind: 'regional', category: 'CNC machining', goals: ['more_enquiries', 'quoting_followups'], steps: st.steps, error_code: null, confirmed_at: '2026-11-20T10:16:10Z', completed_at: '2026-11-20T10:19:30Z', token_expires_at: '2026-12-20T10:15:02Z', token_revoked: false, hold_for_approval: true },
      { id: RID2, ref: 'BR-4N8PQ2WD', created_at: '2026-11-19T15:00:00Z', status: 'ready', completeness: 'complete', assessment_level: 'reduced', business_name: 'Kelvin Joinery (made up)', website_url: null, location_text: 'Paisley', location_kind: 'local', category: 'Joinery', goals: [], steps: [], error_code: null, confirmed_at: '2026-11-19T15:01:00Z', completed_at: '2026-11-19T15:03:00Z', token_expires_at: '2026-12-19T15:00:00Z', token_revoked: false, hold_for_approval: false },
      { id: RID3, ref: 'BR-9X3C5HTM', created_at: '2026-11-18T08:00:00Z', status: 'failed', completeness: 'pending', assessment_level: 'standard', business_name: 'Tarbet Bakehouse (made up)', website_url: 'https://tarbetbakehouse.example/', location_text: 'Helensburgh', location_kind: 'local', category: 'Bakery', goals: ['improve_website'], steps: [], error_code: 'database_unreachable', confirmed_at: null, completed_at: null, token_expires_at: '2026-12-18T08:00:00Z', token_revoked: false, hold_for_approval: false }],
    br_prospects: [{ review_id: RID, created_at: '2026-11-20T10:30:00Z', updated_at: '2026-11-20T10:30:00Z', lead_id: LEAD, workbook_id: null, contact_name: 'Alex Reid', email: 'owner@harbourprecision.example', phone: '07700 900123', requested_services: ['automation', 'seo'], message: 'Interested in the quote follow up idea.', follow_up_consent: true, marketing_consent: false, consent_text_version: 'v1', consent_at: '2026-11-20T10:30:00Z', status: 'new', needs: null, internal_notes: null, discuss_keys: [] }],
    br_report_versions: [{ id: 'rv1', review_id: RID, version: 1, created_at: '2026-11-20T10:19:30Z', created_by: 'system', reason: 'initial', status: 'published', generator_version: 'br-gen-1.0.0', content_hash: 'fixture', approved_at: null, approved_note: null, content: rep2 }],
    br_competitors: [
      { id: CLYDE, review_id: RID, name: 'Clyde Components Ltd', website_url: 'https://clydecomponents.example/', origin: 'visitor_nominated', collected_at: '2026-11-20T10:16:10Z', status: 'selected', relevance: { basis: ['nominated_by_visitor'], note: 'Named by you. Relevance not checked by a supported source.' }, rejected_reason: null, reviewed_by_owner: false, position: 1 },
      { id: GIFT, review_id: RID, name: 'Harbour Gifts and Cards (made up)', website_url: 'https://harbourgifts.example/', origin: 'osm', collected_at: '2026-11-20T10:16:12Z', status: 'selected', relevance: { basis: ['category_match'], note: 'Matched on the word Harbour only.' }, rejected_reason: null, reviewed_by_owner: false, position: 2 }],
    br_evidence: ev, br_ai_runs: [],
    br_deliveries: [{ id: 'dl1', review_id: RID, report_version_id: 'rv1', created_at: '2026-11-20T10:25:00Z', purpose: 'report', to_email: 'owner@harbourprecision.example', status: 'held_for_approval', error_code: null, attempts: 0, sent_at: null }],
    br_provider_calls: [
      { id: 'pc1', review_id: RID, provider: 'pagespeed', operation: 'psi_competitor', status: 'error', http_status: 504, error_code: 'timeout', started_at: '2026-11-20T10:17:09Z', duration_ms: 41000, cost_pence: 0 },
      { id: 'pc2', review_id: RID, provider: 'pagespeed', operation: 'psi_business', status: 'ok', http_status: 200, error_code: null, started_at: '2026-11-20T10:16:30Z', duration_ms: 22000, cost_pence: 0 }],
    br_automation_opportunities: [], br_admin_log: [], _sent: 0, _log: [], _providers: [
      { id: 'pagespeed', kind: 'pagespeed', label: 'Google PageSpeed Insights', state: 'degraded', reason: 'A timeout in the last day', last_ok_at: '2026-11-20T10:16:52Z', last_error_code: 'timeout', last_error_at: '2026-11-20T10:17:50Z', budget: { used_pence: 0, calls_today: 14, daily_call_cap: 150 } },
      { id: 'google_places', kind: 'discovery', label: 'Google Places', state: 'not_configured', reason: 'No key set', budget: { used_pence: 0 } },
      { id: 'ai_anthropic', kind: 'ai_search', label: 'AI search tool (Anthropic)', state: 'not_configured', reason: 'Switched off by default', budget: { used_pence: 0 } }]
  };
}
const J = (status, obj, extra) => ({ status, headers: Object.assign({ 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, extra || {}), body: JSON.stringify(obj) });
function applyFilters(rows, params) {
  let out = rows.slice();
  for (const [k, v] of params) {
    if (['select', 'order', 'limit', 'offset'].includes(k)) continue;
    const dot = v.indexOf('.'), op = v.slice(0, dot), val = v.slice(dot + 1);
    out = out.filter(r => {
      const x = r[k];
      if (op === 'eq') return String(x) === val;
      if (op === 'in') return val.replace(/^\(|\)$/g, '').split(',').includes(String(x));
      if (op === 'is') return val === 'null' ? x == null : x != null;
      return true;
    });
  }
  return out;
}
/* handler(db, flags, req) -> { status, headers, body } where req = { method, url, headers, body } */
function handle(db, flags, req) {
  const u = new URL(req.url), p = u.pathname;
  if (req.method === 'OPTIONS') return { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: '' };
  const body = req.body ? JSON.parse(req.body) : null;
  if (p.startsWith('/rest/v1/')) {
    const table = p.slice(9);
    db._log.push(req.method + ' ' + table);
    if (/^br_/.test(table) && flags.noReviewTables) return J(404, { code: 'PGRST205', message: "Could not find the table 'public." + table + "' in the schema cache", hint: null });
    if (/^br_/.test(table) && flags.reviewsError && table === 'br_reviews') return J(500, { message: 'fixture: database error' });
    if (!db[table]) return J(404, { code: 'PGRST205', message: 'Could not find the table ' + table });
    let rows = db[table];
    if (req.method === 'GET') {
      let out = applyFilters(rows, u.searchParams); const sel = u.searchParams.get('select') || '*';
      if (table === 'client_workbooks' && /status:data/.test(sel)) out = out.map(r => ({ id: r.id, client_name: r.client_name, updated_at: r.updated_at, status: r.data && r.data.client && r.data.client.status, seen: null }));
      else if (sel !== '*' && !/[>:]/.test(sel)) { const cols = sel.split(',').map(s => s.trim()); out = out.map(r => { const o = {}; cols.forEach(c => { if (c in r) o[c] = r[c]; }); return o; }); }
      const lim = Number(u.searchParams.get('limit')); if (lim) out = out.slice(0, lim);
      return J(200, out);
    }
    if (req.method === 'POST') { const add = (Array.isArray(body) ? body : [body]).map(r => Object.assign({ created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, r)); rows.push(...add); return J(201, add); }
    if (req.method === 'PATCH') { const hit = applyFilters(rows, u.searchParams); hit.forEach(r => Object.assign(r, body)); if (flags.lastPatch !== undefined) flags.lastPatch = { table, body }; db._log.push('PATCH ' + table + ' ' + JSON.stringify(Object.keys(body || {}))); return J(200, hit); }
    if (req.method === 'DELETE') { const hit = applyFilters(rows, u.searchParams); db[table] = rows.filter(r => !hit.includes(r)); return J(200, hit); }
  }
  if (p.startsWith('/api/business-review/admin/')) {
    const route = p.slice('/api/business-review/admin/'.length); db._log.push('ADMIN ' + req.method + ' ' + route);
    if (flags.adminDown) return { status: 404, headers: { 'content-type': 'text/html' }, body: '<html>Not found</html>' };
    const auth = req.headers.authorization || '';
    if (flags.admin403) return J(403, { ok: false, contract_version: '1.0', error: { code: 'forbidden', message: 'Not the owner.' } });
    if (auth !== 'Bearer MOCK-OWNER-TOKEN') return J(401, { ok: false, contract_version: '1.0', error: { code: 'unauthenticated', message: 'Sign in.' } });
    const ok = x => J(200, Object.assign({ ok: true, contract_version: '1.0' }, x));
    const m = route.match(/^reviews\/([^/]+)\/(.*)$/);
    if (route.startsWith('metrics')) { const rs = db.br_reviews; return ok({ days: 30, metrics: { reviews_started: rs.length, reviews_completed: rs.filter(r => r.status === 'ready').length, reviews_partial: rs.filter(r => r.status === 'ready' && r.completeness === 'partial').length, reviews_failed: rs.filter(r => r.status === 'failed').length, reports_requested: db.br_deliveries.length, discussion_requests: db.br_prospects.filter(x => x.follow_up_consent).length, projects_created: db.br_prospects.filter(x => x.workbook_id).length, provider_failures: { pagespeed: 1, google_places: 0 } }, notes: ['Anonymous reviews are not leads. Counts come from database rows only.'] }); }
    if (route === 'providers') return ok({ providers: db._providers });
    if (m) {
      const id = m[1], tail = m[2], rev = db.br_reviews.find(r => r.id === id); if (!rev) return J(404, { ok: false, error: { code: 'not_found', message: 'No such review' } });
      if (tail === 'competitors') {
        if (body.action === 'reject') { const c = db.br_competitors.find(x => x.id === body.competitor_id); c.status = 'rejected'; c.rejected_reason = body.reason || null; c.reviewed_by_owner = true; }
        else if (body.action === 'select') { const c = db.br_competitors.find(x => x.id === body.competitor_id); c.status = 'selected'; c.rejected_reason = null; c.reviewed_by_owner = true; }
        else if (body.action === 'add') db.br_competitors.push({ id: 'new-' + db.br_competitors.length, review_id: id, name: body.name, website_url: body.website, origin: 'owner_added', collected_at: new Date().toISOString(), status: 'selected', relevance: { basis: [], note: 'Added by you.' }, reviewed_by_owner: true, position: 9 });
        rev.status = 'queued'; return ok({ competitors: db.br_competitors.filter(c => c.review_id === id), review_status: 'queued' });
      }
      if (tail === 'regenerate') { const last = db.br_report_versions.filter(v => v.review_id === id).sort((a, b) => b.version - a.version)[0]; const nv = Object.assign({}, last, { id: 'rv' + (last.version + 1), version: last.version + 1, reason: body.reason, created_by: 'system', approved_at: null, created_at: new Date().toISOString() }); db.br_report_versions.push(nv); return ok({ report_version: nv.version }); }
      let mm = tail.match(/^reports\/(\d+)\/approve$/); if (mm) { const v = db.br_report_versions.find(x => x.review_id === id && x.version === Number(mm[1])); v.approved_at = new Date().toISOString(); v.approved_note = body.note || null; return ok({}); }
      mm = tail.match(/^reports\/(\d+)\/revise$/); if (mm) { const last = db.br_report_versions.find(x => x.review_id === id && x.version === Number(mm[1])); const c = JSON.parse(JSON.stringify(last.content)); (body.overrides.recommendations || []).forEach(o => { if (o.hide) c.recommendations = c.recommendations.filter(r => r.key !== o.key); }); const nv = { id: 'rvr', review_id: id, version: last.version + 1, created_at: new Date().toISOString(), created_by: 'owner', reason: body.reason, status: 'published', generator_version: 'br-gen-1.0.0', content_hash: 'x', approved_at: null, content: c }; db.br_report_versions.push(nv); db._revise = body; return J(201, { ok: true, contract_version: '1.0', report_version: nv.version }); }
      mm = tail.match(/^deliveries\/([^/]+)\/send$/); if (mm) { const d = db.br_deliveries.find(x => x.id === mm[1]); d.status = 'sent'; d.sent_at = new Date().toISOString(); db._sent++; return ok({ delivery: d }); }
      if (tail === 'token') { if (body.action === 'extend') { rev.token_expires_at = '2027-01-19T10:15:02Z'; return ok({ expires_at: rev.token_expires_at }); } rev.token_revoked = true; return ok({ expires_at: rev.token_expires_at }); }
      if (tail === 'ai-visibility/run') return ok({ plan: { questions: 10, runs: body.runs, tools: body.tools.length, calls: 10 * body.runs * body.tools.length, estimate_pence: { low: 40, high: 120 }, within_caps: true, cap_reasons: [] }, dry: body.dry_run });
      if (tail === 'link-workbook') { if (flags.linkFails) return J(500, { ok: false, error: { code: 'internal', message: 'fixture failure' } }); const pr = db.br_prospects.find(x => x.review_id === id); pr.workbook_id = body.workbook_id; pr.status = 'draft_project'; return ok({}); }
    }
    return J(404, { ok: false, contract_version: '1.0', error: { code: 'not_found', message: 'No such route' } });
  }
  return J(404, { message: 'not mocked' });
}
module.exports = { freshDb, handle, RID, RID2, RID3, LEAD, CLYDE, GIFT, MARK_INTERNAL };
