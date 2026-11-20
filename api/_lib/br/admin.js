'use strict';
/*
Business review: admin routes (CONTRACT section 4), owner only.
Inputs : Authorization: Bearer <Supabase access token of the owner>; the sweep route also accepts the cron secret.
Outputs: JSON envelope responses. Reads that the workbook can do through RLS also exist here for completeness.
Rules  : the token is verified by calling Supabase /auth/v1/user and the email must equal BR_OWNER_EMAIL (fails closed when unset);
         401 when there is no valid session, 403 for any other person; every mutation writes br_admin_log (no contact details, no secrets);
         report content is never edited in place (regenerate and revise create new versions); competitor changes re-queue the steps and
         the report is rebuilt as a new version; AI runs show a dry run cost first and are capped; nothing here emails a prospect except the
         explicit send of a held report email after approval.
Must not change: owner check, append only report handling, the dry run first rule.
*/
const crypto = require('node:crypto');
const { err, ApiError, sendOk, sendError, sendJson, readJsonBody, bearer, header } = require('./http');
const { isUuid, hashesEqual, unseal, uuid } = require('./token');
const { routeParts, queryParam, competitorOut, requireStorage } = require('./routes');
const { toApiEvidence, recordEvidence } = require('./evidence');
const steps = require('./steps');
const providers = require('./providers/index');
const aiv = require('./ai-visibility');
const mail = require('./mail');
const prospects = require('./prospects');
const V = require('./validate');
const { generateQuestions } = require('./questions');
const { StoreError } = require('./db');

function nowOf(deps) { return deps.now ? deps.now() : new Date(); }
function isoZ(d) { return new Date(d).toISOString().replace(/\.\d{3}Z$/, 'Z'); }

async function ownerFromToken(deps, token) {
  if (!token || !deps.cfg.supabaseUrl) return { ok: false };
  const f = deps.fetchImpl || fetch;
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, 6000);
  try {
    const res = await f(deps.cfg.supabaseUrl + '/auth/v1/user', { headers: { apikey: deps.cfg.serviceKey, Authorization: 'Bearer ' + token }, signal: controller.signal });
    if (!res.ok) return { ok: false };
    const u = await res.json();
    const email = String(u && u.email || '').toLowerCase();
    return email ? { ok: true, email: email } : { ok: false };
  } catch (e) { return { ok: false }; } finally { clearTimeout(timer); }
}

async function requireOwner(deps, req) {
  const token = bearer(req);
  if (!token) throw err('unauthenticated');
  const who = deps.verifyOwner ? await deps.verifyOwner(token) : await ownerFromToken(deps, token);
  if (!who.ok) throw err('unauthenticated');
  if (!deps.cfg.ownerEmail || who.email !== deps.cfg.ownerEmail) throw err('forbidden');
  return who.email;
}

function cronOk(deps, req) {
  const secret = deps.cfg.cronSecret;
  const t = bearer(req);
  if (!secret || !t) return false;
  const a = crypto.createHash('sha256').update(secret).digest('hex'), b = crypto.createHash('sha256').update(t).digest('hex');
  return hashesEqual(a, b);
}

async function log(deps, actor, action, reviewId, detail) {
  try { await deps.store.insert('br_admin_log', { actor: actor, action: action, review_id: reviewId || null, detail: detail || {} }); } catch (e) { console.error('[br] admin log failed'); }
}

async function loadReview(deps, id) {
  if (!isUuid(id)) throw err('not_found');
  const r = (await deps.store.select('br_reviews', { id: id }, { limit: 1 }))[0];
  if (!r) throw err('not_found');
  return r;
}

function reviewOut(r) {
  return { id: r.id, ref: r.ref, status: r.status, completeness: r.completeness, assessment_level: r.assessment_level, created_at: isoZ(r.created_at), expires_at: isoZ(r.token_expires_at),
    confirmed_at: r.confirmed_at ? isoZ(r.confirmed_at) : null, completed_at: r.completed_at ? isoZ(r.completed_at) : null, business_name: r.business_name, website_url: r.website_url || null,
    location: { text: r.location_text, kind: r.location_kind }, category: r.category, goals: r.goals || [], token_revoked: !!r.token_revoked, hold_for_approval: !!r.hold_for_approval };
}

// ---------------------------------------------------------------- reads
async function listReviews(deps, req, res) {
  const limit = Math.min(100, Math.max(1, parseInt(queryParam(req, 'limit') || '50', 10) || 50));
  const filters = {};
  const status = queryParam(req, 'status');
  if (status) { if (['awaiting_confirmation', 'queued', 'running', 'ready', 'failed', 'expired', 'cancelled'].indexOf(status) === -1) throw err('validation_failed', { field: 'status' }); filters.status = status; }
  const cursor = queryParam(req, 'cursor');
  if (cursor) { if (Number.isNaN(new Date(cursor).getTime())) throw err('validation_failed', { field: 'cursor' }); filters.created_at = { lt: cursor }; }
  const q = (queryParam(req, 'q') || '').trim().slice(0, 80);
  let rows;
  if (q) {
    const safe = q.replace(/[*%,()"\\]/g, '');
    const a = await deps.store.select('br_reviews', Object.assign({}, filters, { ref: { ilike: '*' + safe + '*' } }), { order: ['created_at.desc'], limit: limit });
    const b = await deps.store.select('br_reviews', Object.assign({}, filters, { business_name: { ilike: '*' + safe + '*' } }), { order: ['created_at.desc'], limit: limit });
    const seen = {};
    rows = a.concat(b).filter(function (r) { if (seen[r.id]) return false; seen[r.id] = true; return true; }).sort(function (x, y) { return x.created_at < y.created_at ? 1 : -1; }).slice(0, limit);
  } else rows = await deps.store.select('br_reviews', filters, { order: ['created_at.desc'], limit: limit });
  const ids = rows.map(function (r) { return r.id; });
  const prospects = ids.length ? await deps.store.select('br_prospects', { review_id: { in: ids } }) : [];
  const calls = ids.length ? await deps.store.select('br_provider_calls', { review_id: { in: ids }, status: { in: ['error', 'unavailable'] } }) : [];
  const out = rows.map(function (r) {
    const p = prospects.find(function (x) { return x.review_id === r.id; });
    const fails = calls.filter(function (c) { return c.review_id === r.id; }).length;
    const aiStep = (r.steps || []).find(function (s) { return s.key === 'ai_visibility'; });
    return Object.assign(reviewOut(r), {
      steps: (r.steps || []).map(function (s) { return { key: s.key, label: s.label, state: s.state, reason: s.reason || null }; }),
      prospect: p ? { status: p.status, follow_up_consent: p.follow_up_consent, marketing_consent: p.marketing_consent, requested_services: p.requested_services, workbook_id: p.workbook_id } : null,
      ai_visibility_state: aiStep ? (aiStep.state === 'done' ? 'tested' : 'awaiting_supported_test') : 'awaiting_supported_test',
      provider_failures: fails, incomplete: r.completeness === 'partial' || r.status === 'failed'
    });
  });
  return sendOk(res, { reviews: out, next_cursor: rows.length === limit ? rows[rows.length - 1].created_at : null });
}

async function reviewDetail(deps, res, id) {
  const store = deps.store;
  const r = await loadReview(deps, id);
  const comps = (await store.select('br_competitors', { review_id: id }, { order: ['position.asc', 'created_at.asc'] })).map(function (c) { return Object.assign(competitorOut(c), { rejected_reason: c.rejected_reason || null }); });
  const ev = (await store.select('br_evidence', { review_id: id }, { order: ['created_at.asc'] })).map(toApiEvidence);
  const reports = (await store.select('br_report_versions', { review_id: id }, { order: ['version.asc'] })).map(function (v) { return { version: v.version, status: v.status, created_at: isoZ(v.created_at), reason: v.reason, created_by: v.created_by, approved_at: v.approved_at || null, approved_note: v.approved_note || null }; });
  const deliveries = (await store.select('br_deliveries', { review_id: id }, { order: ['created_at.asc'] })).map(function (d) { return { id: d.id, report_version_id: d.report_version_id, status: d.status, to_email: d.to_email || null, error_code: d.error_code || null, sent_at: d.sent_at || null, created_at: isoZ(d.created_at), attempts: d.attempts }; });
  const prospect = (await store.select('br_prospects', { review_id: id }, { limit: 1 }))[0] || null;
  const calls = (await store.select('br_provider_calls', { review_id: id }, { order: ['started_at.asc'] })).map(function (c) { return { id: c.id, provider: c.provider, operation: c.operation, status: c.status, error_code: c.error_code || null, started_at: c.started_at, duration_ms: c.duration_ms, cost_pence: Number(c.cost_pence) || 0 }; });
  const aiRuns = await store.select('br_ai_runs', { review_id: id }, { order: ['question_id.asc', 'run_index.asc'] });
  return sendOk(res, { review: reviewOut(r), steps: r.steps || [], competitors: comps, evidence: ev, reports: reports, deliveries: deliveries, prospect: prospect, provider_calls: calls, ai_runs: aiRuns });
}

async function metrics(deps, req, res) {
  const days = Math.min(365, Math.max(1, parseInt(queryParam(req, 'days') || '30', 10) || 30));
  const since = new Date(nowOf(deps).getTime() - days * 86400000).toISOString();
  const s = deps.store;
  const reviews = await s.select('br_reviews', { created_at: { gte: since } });
  const deliveries = await s.select('br_deliveries', { created_at: { gte: since } });
  const prospects = await s.select('br_prospects', { created_at: { gte: since } });
  const calls = await s.select('br_provider_calls', { started_at: { gte: since }, status: { in: ['error', 'unavailable'] } });
  const failures = {};
  calls.forEach(function (c) { failures[c.provider] = (failures[c.provider] || 0) + 1; });
  return sendOk(res, { days: days, metrics: {
    reviews_started: reviews.length, reviews_completed: reviews.filter(function (r) { return r.status === 'ready'; }).length, reviews_partial: reviews.filter(function (r) { return r.status === 'ready' && r.completeness === 'partial'; }).length,
    reviews_failed: reviews.filter(function (r) { return r.status === 'failed'; }).length, reports_requested: deliveries.length, discussion_requests: prospects.filter(function (p) { return p.follow_up_consent; }).length,
    projects_created: prospects.filter(function (p) { return !!p.workbook_id; }).length, provider_failures: failures },
    notes: ['Anonymous reviews are not leads. Counts come from database rows only.'] });
}

// ---------------------------------------------------------------- mutations
const MAX_SELECTED = 3;
async function competitorsAction(deps, req, res, id, actor) {
  const body = await readJsonBody(req);
  const action = body.action;
  const r = await loadReview(deps, id);
  const store = deps.store;
  if (['select', 'reject', 'add', 'edit'].indexOf(action) === -1) throw err('validation_failed', { field: 'action' });
  const all = await store.select('br_competitors', { review_id: id });
  const selected = all.filter(function (c) { return c.status === 'selected'; });
  const reason = typeof body.reason === 'string' ? V.clean(body.reason, 200) : null;
  const addRow = async function (name, website) {
    const f = {};
    const nom = V.validateNominationBody({ name: name, website: website }, deps.fetcher.parseUrl);
    if (!nom.ok) throw err('validation_failed', { field: Object.keys(nom.fields)[0], fields: nom.fields });
    const chk = await deps.fetcher.resolveHost(nom.value.website.host);
    if (!chk.ok) throw err(chk.code === 'url_not_allowed' ? 'url_not_allowed' : 'unresolvable', chk.code === 'url_not_allowed' ? { reason: 'private_address' } : {});
    if (selected.length >= MAX_SELECTED && !(action === 'edit')) throw err('validation_failed', { field: 'action', fields: { action: 'Up to three comparison businesses can be selected.' } });
    return store.insert('br_competitors', { review_id: id, name: nom.value.name, website_url: nom.value.website.url, website_host: nom.value.website.host, origin: 'owner_added', collected_at: nowOf(deps).toISOString(), status: 'selected', reviewed_by_owner: true,
      position: all.length + 1, relevance: { basis: ['added_by_owner'], category_match: null, distance_km: null, note: 'Added by Rhys Hume.' } });
  };
  if (action === 'select' || action === 'reject' || action === 'edit') {
    const c = all.find(function (x) { return x.id === body.competitor_id; });
    if (!isUuid(body.competitor_id) || !c) throw err('not_found');
    if (action === 'select') {
      if (c.status !== 'selected' && selected.length >= MAX_SELECTED) throw err('validation_failed', { field: 'action', fields: { action: 'Up to three comparison businesses can be selected.' } });
      await store.update('br_competitors', { id: c.id }, { status: 'selected', reviewed_by_owner: true, rejected_reason: null });
    } else if (action === 'reject') await store.update('br_competitors', { id: c.id }, { status: 'rejected', reviewed_by_owner: true, rejected_reason: reason || 'rejected_by_owner' });
    else {
      // a different website is a different business: the old record is kept (with its evidence) and a new one is added
      await store.update('br_competitors', { id: c.id }, { status: 'rejected', reviewed_by_owner: true, rejected_reason: 'edited_by_owner' });
      selected.splice(selected.indexOf(c), 1);
      await addRow(body.name || c.name, body.website || c.website_url);
    }
  } else await addRow(body.name, body.website);
  await log(deps, actor, 'competitors_' + action, id, { competitor_id: body.competitor_id || null });
  let rv = await loadReview(deps, id);
  if (rv.status === 'ready') rv = await steps.requeueForCompetitors(deps, rv, 'competitors_changed');
  let ran = null;
  if (rv.status === 'queued' || rv.status === 'running') { try { ran = await steps.advance(deps, rv); rv = ran.review; } catch (e) { if (!(e instanceof ApiError)) throw e; } }
  const comps = (await store.select('br_competitors', { review_id: id }, { order: ['position.asc'] })).map(function (c) { return Object.assign(competitorOut(c), { rejected_reason: c.rejected_reason || null }); });
  return sendOk(res, { competitors: comps, review_status: rv.status === 'ready' ? 'ready' : 'queued' });
}

async function advanceAdmin(deps, res, id, actor) {
  const r = await loadReview(deps, id);
  if (r.status === 'ready') return sendOk(res, { review_status: 'ready', ran: [] });
  if (r.status !== 'queued' && r.status !== 'running') throw err('wrong_state');
  const out = await steps.advance(deps, r);
  await log(deps, actor, 'advance', id, { ran: out.ran });
  return sendOk(res, { review_status: out.review.status, ran: out.ran });
}

async function regenerate(deps, req, res, id, actor) {
  const body = await readJsonBody(req);
  const reason = typeof body.reason === 'string' ? V.clean(body.reason, 200) : '';
  if (!reason) throw err('validation_failed', { field: 'reason', fields: { reason: 'Give a short reason.' } });
  const r = await loadReview(deps, id);
  const b = await steps.buildAndStoreReport(deps, r, { reason: 'regenerated', createdBy: 'owner' });
  await log(deps, actor, 'regenerate', id, { reason: reason, created: b.created, version: b.version });
  return sendOk(res, { report_version: b.version, created: b.created });
}

async function approve(deps, req, res, id, version, actor) {
  const body = await readJsonBody(req, { allowEmpty: true });
  await loadReview(deps, id);
  const n = parseInt(version, 10);
  const row = (await deps.store.select('br_report_versions', { review_id: id, version: n }, { limit: 1 }))[0];
  if (!row) throw err('not_found');
  const note = typeof body.note === 'string' ? V.clean(body.note, 300) : null;
  if (!row.approved_at) await deps.store.update('br_report_versions', { id: row.id }, { approved_at: nowOf(deps).toISOString(), approved_note: note });
  await log(deps, actor, 'approve_report', id, { version: n });
  return sendOk(res, { version: n, approved: true });
}

function cleanOverrides(o) {
  const out = { recommendations: [], finding_notes: [] };
  if (!o || typeof o !== 'object') return out;
  if (Array.isArray(o.recommendations)) o.recommendations.slice(0, 40).forEach(function (r) {
    if (!r || typeof r.key !== 'string' || !/^[a-z0-9_]{1,60}$/.test(r.key)) return;
    const c = { key: r.key };
    if (r.hide === true) c.hide = true;
    if (typeof r.owner_note === 'string') { const n = V.clean(r.owner_note, 600); if (n) c.owner_note = n; }
    out.recommendations.push(c);
  });
  if (Array.isArray(o.finding_notes)) o.finding_notes.slice(0, 10).forEach(function (x) { if (typeof x === 'string') { const n = V.clean(x, 600); if (n) out.finding_notes.push(n); } });
  return out;
}

async function revise(deps, req, res, id, version, actor) {
  const body = await readJsonBody(req);
  const reason = typeof body.reason === 'string' ? V.clean(body.reason, 200) : '';
  if (!reason) throw err('validation_failed', { field: 'reason', fields: { reason: 'Give a short reason.' } });
  const r = await loadReview(deps, id);
  const exists = (await deps.store.select('br_report_versions', { review_id: id, version: parseInt(version, 10) }, { limit: 1 }))[0];
  if (!exists) throw err('not_found');
  const overrides = cleanOverrides(body.overrides);
  const rv = (await deps.store.update('br_reviews', { id: id }, { inputs: Object.assign({}, r.inputs, { owner_overrides: overrides }) }))[0];
  const b = await steps.buildAndStoreReport(deps, rv, { reason: 'owner_revision', createdBy: 'owner', overrides: overrides });
  await log(deps, actor, 'revise_report', id, { reason: reason, based_on: parseInt(version, 10), version: b.version });
  return sendOk(res, { report_version: b.version, created: b.created }, b.created ? 201 : 200);
}

async function sendHeld(deps, res, id, deliveryId, actor) {
  if (!mail.canSendReports(deps.cfg)) throw err('delivery_not_configured');
  const r = await loadReview(deps, id);
  if (!isUuid(deliveryId)) throw err('not_found');
  const d = (await deps.store.select('br_deliveries', { id: deliveryId, review_id: id }, { limit: 1 }))[0];
  if (!d) throw err('not_found');
  if (d.status !== 'held_for_approval' || !d.to_email) throw err('wrong_state');
  const ver = (await deps.store.select('br_report_versions', { id: d.report_version_id }, { limit: 1 }))[0];
  if (!ver || !ver.approved_at) throw err('wrong_state');
  const sealed = r.inputs && r.inputs.sealed_links && r.inputs.sealed_links[deliveryId];
  const token = sealed ? unseal(sealed, deps.cfg.salt) : null;
  if (!token) throw err('wrong_state');
  const prospect = (await deps.store.select('br_prospects', { review_id: id }, { limit: 1 }))[0];
  const sent = await mail.sendReport(deps, { to: d.to_email, name: prospect && prospect.contact_name || '', ref: r.ref, reviewId: r.id, token: token, report: ver.content, idempotencyKey: 'br-report-' + d.id });
  if (!sent.ok) { await deps.store.update('br_deliveries', { id: d.id }, { status: 'failed', error_code: sent.code, attempts: d.attempts + 1 }); throw err('delivery_failed'); }
  const upd = (await deps.store.update('br_deliveries', { id: d.id }, { status: 'sent', resend_id: sent.id || null, sent_at: nowOf(deps).toISOString(), attempts: d.attempts + 1 }))[0];
  const links = Object.assign({}, r.inputs.sealed_links); delete links[deliveryId];
  await deps.store.update('br_reviews', { id: id }, { inputs: Object.assign({}, r.inputs, { sealed_links: links }) });
  await log(deps, actor, 'send_held_delivery', id, { delivery_id: d.id });
  return sendOk(res, { delivery: { id: upd.id, status: upd.status, sent_at: upd.sent_at } });
}

async function aiRun(deps, req, res, id, actor) {
  const body = await readJsonBody(req);
  const r = await loadReview(deps, id);
  if (r.status === 'awaiting_confirmation') throw err('wrong_state');
  const tools = Array.isArray(body.tools) ? body.tools.filter(function (t) { return typeof t === 'string'; }).slice(0, 5) : [];
  const runs = body.runs === undefined ? 3 : body.runs;
  const dry = body.dry_run !== false; // anything but an explicit false is a dry run
  let questions = generateQuestions({ category: r.category, location: { text: r.location_text, kind: r.location_kind } });
  if (Array.isArray(body.question_ids)) questions = questions.filter(function (q) { return body.question_ids.indexOf(q.question_id) !== -1; });
  const dd = { cfg: deps.cfg, registry: deps.registry };
  const plan = aiv.plan(dd, { tools: tools, runs: runs, questions: questions });
  if (dry) { await log(deps, actor, 'ai_dry_run', id, { calls: plan.calls }); return sendOk(res, { plan: plan }); }
  if (!plan.within_caps) throw err(plan.cap_reasons.indexOf('daily_cap_zero') !== -1 || plan.cap_reasons.some(function (x) { return x.indexOf('over_') === 0; }) ? 'budget_exhausted' : 'provider_unavailable', { cap_reasons: plan.cap_reasons });
  const comps = await deps.store.select('br_competitors', { review_id: id });
  const out = await aiv.execute(deps, { review: r, tools: tools, runs: runs, questions: questions, competitors: comps, deadline: Date.now() + (deps.softMs || steps.SOFT_MS) });
  const runsAll = await deps.store.select('br_ai_runs', { review_id: id });
  const okRuns = runsAll.filter(function (x) { return x.status === 'ok'; });
  if (okRuns.length) {
    const summary = aiv.summarise(runsAll.filter(function (x) { return x.status !== 'planned'; }));
    await recordEvidence(deps.store, id, { metric_key: 'ai.visibility.summary', state: 'verified_public_observation', value: { questions: summary.length, runs_ok: okRuns.length, runs_total: runsAll.length, tools: tools }, observed_at: nowOf(deps).toISOString(),
      source: { kind: tools[0], name: 'AI search tool test run by Rhys Hume' }, method: { summary: 'Customer style questions, repeated runs, exact answers kept', settings: { question_set: questions[0] && questions[0].question_set, runs_per_question: runs } }, inputs: { tools: tools, questions: questions.length },
      limitations: ['AI tool answers vary between runs.', 'Counts show how many runs named the business; there is no single score.'] });
    const stepsNew = (r.steps || []).map(function (s) { return s.key === 'ai_visibility' ? Object.assign({}, s, { state: 'done', reason: null, message: 'Tested by the owner.' }) : s; });
    const patch = { steps: stepsNew };
    if (out.remaining_calls === 0 && runs === 3 && questions.length >= 8) patch.assessment_level = 'full';
    const rv = (await deps.store.update('br_reviews', { id: id }, patch))[0];
    if (r.status === 'ready') await steps.buildAndStoreReport(deps, rv, { reason: 'ai_run_added', createdBy: 'owner' });
  }
  await log(deps, actor, 'ai_run', id, { ok: out.ok, errors: out.errors, remaining: out.remaining_calls });
  return sendOk(res, { progress: out, remaining_calls: out.remaining_calls });
}

// Owner delete of any review (for example a test record): contact details cleared, then the row and everything under it deleted. The admin log
// row survives with its review link set to null. A lead the owner has marked handled is kept (it is the owner's own record).
async function deleteReview(deps, res, id, actor) {
  const r = await loadReview(deps, id);
  await prospects.clearContact(deps, r);
  await log(deps, actor, 'delete_review', id, { ref: r.ref });
  await deps.store.delete('br_reviews', { id: id });
  return sendOk(res, { deleted: true });
}

async function tokenAction(deps, req, res, id, actor) {
  const body = await readJsonBody(req);
  const r = await loadReview(deps, id);
  if (body.action === 'revoke') {
    await deps.store.update('br_reviews', { id: id }, { token_revoked: true });
    await log(deps, actor, 'token_revoke', id, {});
    return sendOk(res, { expires_at: isoZ(r.token_expires_at), revoked: true });
  }
  if (body.action === 'extend') {
    const days = parseInt(body.days, 10);
    if (!Number.isInteger(days) || days < 1 || days > 90) throw err('validation_failed', { field: 'days', fields: { days: 'Choose 1 to 90 days.' } });
    if (r.status === 'cancelled') throw err('wrong_state');
    const exp = new Date(nowOf(deps).getTime() + days * 86400000);
    const patch = { token_expires_at: exp.toISOString(), token_revoked: false };
    const purge = new Date(exp.getTime() + 30 * 86400000);
    if (new Date(r.purge_after) < purge) patch.purge_after = purge.toISOString();
    if (r.status === 'expired') {
      const hasReport = (await deps.store.select('br_report_versions', { review_id: id }, { limit: 1 })).length > 0;
      patch.status = hasReport ? 'ready' : 'queued';
    }
    const u = (await deps.store.update('br_reviews', { id: id }, patch))[0];
    await log(deps, actor, 'token_extend', id, { days: days });
    return sendOk(res, { expires_at: isoZ(u.token_expires_at) });
  }
  throw err('validation_failed', { field: 'action' });
}

async function linkWorkbook(deps, req, res, id, actor) {
  const body = await readJsonBody(req);
  await loadReview(deps, id);
  if (!isUuid(body.workbook_id)) throw err('validation_failed', { field: 'workbook_id', fields: { workbook_id: 'A workbook id is required.' } });
  const p = (await deps.store.select('br_prospects', { review_id: id }, { limit: 1 }))[0];
  if (!p) throw err('not_found');
  try { await deps.store.update('br_prospects', { review_id: id }, { workbook_id: body.workbook_id, status: 'draft_project' }); }
  catch (e) { if (e instanceof StoreError) throw err('validation_failed', { field: 'workbook_id' }); throw e; }
  await log(deps, actor, 'link_workbook', id, { workbook_id: body.workbook_id });
  return sendOk(res, {});
}

function createAdminHandler(deps) {
  return async function handler(req, res) {
    try {
      const parts = routeParts(req);
      const method = String(req.method || 'GET').toUpperCase();
      requireStorage(deps);
      if (parts[0] === 'admin') parts.shift();
      if (parts[0] === 'sweep') {
        if (method !== 'POST' && method !== 'GET') throw err('method_not_allowed');
        let actor = 'cron';
        if (!cronOk(deps, req)) actor = await requireOwner(deps, req);
        const out = await steps.sweep(deps);
        await log(deps, actor, 'sweep', null, out);
        return sendOk(res, out);
      }
      const actor = await requireOwner(deps, req);
      const a = parts[0], id = parts[1], c = parts[2], d = parts[3], e = parts[4];
      if (a === 'metrics' && method === 'GET' && parts.length === 1) return await metrics(deps, req, res);
      if (a === 'providers' && method === 'GET' && parts.length === 1) return sendOk(res, { providers: await providers.providerStatuses(deps) });
      if (a === 'reviews') {
        if (parts.length === 1 && method === 'GET') return await listReviews(deps, req, res);
        if (parts.length === 2 && method === 'GET') return await reviewDetail(deps, res, id);
        if (parts.length === 2 && method === 'DELETE') return await deleteReview(deps, res, id, actor);
        if (parts.length === 3 && method === 'POST') {
          if (c === 'competitors') return await competitorsAction(deps, req, res, id, actor);
          if (c === 'regenerate') return await regenerate(deps, req, res, id, actor);
          if (c === 'advance') return await advanceAdmin(deps, res, id, actor);
          if (c === 'token') return await tokenAction(deps, req, res, id, actor);
          if (c === 'link-workbook') return await linkWorkbook(deps, req, res, id, actor);
        }
        if (parts.length === 4 && method === 'POST' && c === 'ai-visibility' && d === 'run') return await aiRun(deps, req, res, id, actor);
        if (parts.length === 5 && method === 'POST' && c === 'reports' && e === 'approve') return await approve(deps, req, res, id, d, actor);
        if (parts.length === 5 && method === 'POST' && c === 'reports' && e === 'revise') return await revise(deps, req, res, id, d, actor);
        if (parts.length === 5 && method === 'POST' && c === 'deliveries' && e === 'send') return await sendHeld(deps, res, id, d, actor);
      }
      throw err('not_found');
    } catch (e) {
      if (e instanceof ApiError) return sendError(res, e);
      if (e instanceof StoreError) { console.error('[br] store', e.code); return sendError(res, err('storage_unavailable')); }
      console.error('[br] unexpected', e && e.name ? e.name : 'error');
      return sendError(res, err('internal'));
    }
  };
}

module.exports = { createAdminHandler, requireOwner, ownerFromToken, cleanOverrides };
