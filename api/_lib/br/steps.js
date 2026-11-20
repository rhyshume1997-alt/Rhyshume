'use strict';
/*
Business review: the stepper. Runs the ten fixed steps in order under a database lease, saving evidence after each step.
Inputs : deps { store, cfg, fetcher, fetchImpl, now, sleep, minIntervalMs, registry }, a review row.
Outputs: updated review row (steps, status, completeness), evidence rows, provider call rows, report versions.
Rules  : only the lease holder runs (br_review_lease); a call stops starting new steps after about 40 s and never runs past 55 s;
         a failed step never blocks later steps and never fabricates a value (it records unavailable evidence with a reason);
         every provider call goes through callProvider; replays are safe (provider calls and evidence are keyed so a repeat reuses
         the earlier result); PageSpeed runs for at most one URL per call; a review is ready only when every step is terminal.
Must not change: step order and keys (labels.js), the lease, the time limits, the no substitution rule.
*/
const crypto = require('node:crypto');
const { STEP_ORDER, STEP_LABELS, BY_DESIGN_REASONS, reasonMessage } = require('./labels');
const { crawlSite } = require('./crawl');
const { analyzeSnapshot, PAGE_METRICS } = require('./analyzer');
const { recordMany, recordEvidence, activeEvidence, toApiEvidence } = require('./evidence');
const { callProvider } = require('./providers/index');
const psi = require('./providers/psi');
const discovery = require('./discovery');
const automation = require('./automation');
const reportMod = require('./report');
const { sha256Hex, uuid } = require('./token');
const { err } = require('./http');

const SOFT_MS = 40000, HARD_MS = 55000, LEASE_S = 70;
const TERMINAL = ['done', 'skipped', 'unavailable', 'failed'];

function iso(d) { return d.toISOString(); }
function nowOf(deps) { return deps.now ? deps.now() : new Date(); }

function newStep(key) { return { key: key, label: STEP_LABELS[key], state: 'pending', started_at: null, finished_at: null, reason: null, message: '' }; }

function initialSteps(hasWebsite) {
  return STEP_ORDER.map(function (k) {
    const s = newStep(k);
    if (!hasWebsite && (k === 'site_fetch' || k === 'site_analysis' || k === 'psi_business')) { s.state = 'skipped'; s.reason = 'no_website'; s.message = reasonMessage('no_website'); }
    if (k === 'ai_visibility') { s.state = 'unavailable'; s.reason = 'not_run_in_free_review'; s.message = 'Awaiting a supported test.'; }
    return s;
  });
}

function completenessOf(steps) {
  const bad = steps.filter(function (s) { return s.key !== 'report_build' && (s.state === 'failed' || (s.state === 'unavailable' && BY_DESIGN_REASONS.indexOf(s.reason) === -1) || (s.state === 'skipped' && BY_DESIGN_REASONS.indexOf(s.reason) === -1)); });
  return bad.length ? 'partial' : 'complete';
}
function allTerminal(steps) { return steps.every(function (s) { return TERMINAL.indexOf(s.state) !== -1; }); }

// Evidence that exists from the moment a review is confirmed: what the visitor typed, and the honest "not tested" rows.
async function seedEvidence(deps, review) {
  const t = nowOf(deps).toISOString();
  const cust = { kind: 'customer_supplied', name: 'Information supplied by you' };
  const drafts = [
    { metric_key: 'customer.goals', state: 'customer_supplied', value: review.goals || [], observed_at: t, source: cust, method: { summary: 'Chosen on the review form' }, inputs: { goals: review.goals || [] } },
    { metric_key: 'ai.visibility.summary', state: 'not_tested', reason_code: 'not_run_in_free_review', observed_at: t, source: { kind: 'not_run', name: 'Not run in the free review' }, method: { summary: 'AI search visibility needs repeated runs against a supported tool' }, inputs: {} },
    { metric_key: 'local.gbp.profile', state: 'not_tested', reason_code: 'no_supported_source', observed_at: t, source: { kind: 'no_source', name: 'No supported source connected' }, inputs: {} },
    { metric_key: 'local.maps_position', state: 'not_tested', reason_code: 'no_supported_source', observed_at: t, source: { kind: 'no_source', name: 'No supported source connected' }, inputs: {} },
    { metric_key: 'local.rating', state: 'not_tested', reason_code: 'no_supported_source', observed_at: t, source: { kind: 'no_source', name: 'No supported source connected' }, inputs: {} },
    { metric_key: 'local.review_count', state: 'not_tested', reason_code: 'no_supported_source', observed_at: t, source: { kind: 'no_source', name: 'No supported source connected' }, inputs: {} }
  ];
  if (!review.website_url) {
    PAGE_METRICS.forEach(function (k) { drafts.push({ metric_key: k, state: 'not_tested', reason_code: 'no_website', observed_at: t, source: cust, method: { summary: 'No website address was supplied' }, inputs: {} }); });
  }
  await recordMany(deps.store, review.id, drafts);
}

async function saveSteps(deps, review, patch) {
  const rows = await deps.store.update('br_reviews', { id: review.id }, patch);
  return rows[0] || review;
}

// ---------------------------------------------------------------- step handlers
function snapshotKey(review, role, cid) { return review.id + ':crawl:' + (cid || 'business') + ':1'; }

async function loadSnapshot(deps, review, cid) {
  const r = await deps.store.select('br_provider_calls', { idempotency_key: snapshotKey(review, 'x', cid) }, { limit: 1 });
  return r[0] && r[0].status === 'ok' ? r[0] : null;
}
async function saveSnapshot(deps, review, cid, snap) {
  const key = snapshotKey(review, 'x', cid);
  try {
    return await deps.store.insert('br_provider_calls', { review_id: review.id, provider: 'own_fetch', operation: 'crawl', idempotency_key: key, request_hash: sha256Hex('crawl|' + snap.start_url), status: 'ok', finished_at: nowOf(deps).toISOString(), duration_ms: 0, cost_pence: 0, response: snap });
  } catch (e) { if (e && e.code === 'conflict') return (await deps.store.select('br_provider_calls', { idempotency_key: key }, { limit: 1 }))[0]; throw e; }
}

function crawlDeps(deps, deadline) {
  return { fetcher: deps.fetcher, now: function () { return nowOf(deps); }, sleep: deps.sleep, minIntervalMs: deps.minIntervalMs, deadline: deadline };
}

const handlers = {
  async site_fetch(deps, review, deadline) {
    let row = await loadSnapshot(deps, review, null);
    if (!row) {
      const snap = await crawlSite(Object.assign({ url: review.website_url, role: 'business' }, crawlDeps(deps, deadline)));
      row = await saveSnapshot(deps, review, null, snap);
    }
    const snap = row.response;
    if (!snap.home || !snap.home.ok) {
      const code = (snap.home && snap.home.code) || 'site_unreachable';
      return { state: 'failed', reason: code, message: reasonMessage(code) };
    }
    return { state: 'done', message: 'Read ' + (1 + snap.pages.filter(function (p) { return !p.failed; }).length) + (snap.pages.length ? ' pages.' : ' page.') };
  },
  async site_analysis(deps, review) {
    const row = await loadSnapshot(deps, review, null);
    if (!row) return { state: 'failed', reason: 'step_not_finished', message: reasonMessage('step_not_finished') };
    await recordMany(deps.store, review.id, analyzeSnapshot(row.response, { category: review.category }));
    return { state: 'done', message: '' };
  },
  async psi_business(deps, review, deadline) {
    const r = await runPsi(deps, review, null, review.website_url, 'psi_business:business', deadline);
    return r;
  },
  async competitor_discovery(deps, review) {
    const st = require('./providers/index').stateOf(deps.registry || require('./providers/index').registry(), deps.cfg, 'google_places');
    if (st.state !== 'available') return { state: 'unavailable', reason: st.state === 'disabled' ? 'not_configured' : st.state === 'budget_exhausted' ? 'budget_exhausted' : 'not_configured', message: 'No supported business search source is switched on. You can name one competitor yourself.' };
    const existing = await deps.store.select('br_competitors', { review_id: review.id });
    if (existing.some(function (c) { return c.origin === 'google_places'; })) return { state: 'done', message: 'Comparison businesses were already chosen.' };
    const r = await discovery.run({ store: deps.store, cfg: deps.cfg, registry: deps.registry, fetchImpl: deps.fetchImpl, now: deps.now }, review);
    if (!r.ok) return { state: r.state === 'budget_exhausted' ? 'unavailable' : 'failed', reason: r.code === 'budget_exhausted' ? 'budget_exhausted' : (r.code || 'provider_error'), message: 'The business search could not be used for this review.' };
    const nominated = existing.filter(function (c) { return c.status === 'selected'; }).length;
    for (let i = 0; i < r.rows.length; i++) {
      const row = r.rows[i];
      if (row.status === 'selected' && nominated + row.position > deps.cfg.limits.maxCompetitors) row.status = 'candidate';
      await deps.store.insert('br_competitors', Object.assign({ review_id: review.id, provider_call_id: r.provider_call_id }, row));
    }
    const picked = r.rows.filter(function (x) { return x.status === 'selected'; }).length;
    return { state: 'done', message: picked ? 'Chose ' + picked + ' comparison ' + (picked === 1 ? 'business.' : 'businesses.') : 'No suitable comparison businesses could be identified from the supported source.' };
  },
  async competitor_fetch(deps, review, deadline) {
    const comps = await selectedCompetitors(deps, review);
    if (!comps.length) return { state: 'skipped', reason: 'no_competitors', message: reasonMessage('no_competitors') };
    let done = 0, failed = 0;
    for (let i = 0; i < comps.length; i++) {
      const c = comps[i];
      let row = await loadSnapshot(deps, review, c.id);
      if (row) { if (row.response.home && row.response.home.ok) done++; else failed++; continue; }
      if (Date.now() > deadline - 8000) return { state: 'running', message: 'Read ' + done + ' of ' + comps.length + ' comparison sites.' };
      const snap = await crawlSite(Object.assign({ url: c.website_url, role: 'competitor' }, crawlDeps(deps, deadline)));
      row = await saveSnapshot(deps, review, c.id, snap);
      await recordMany(deps.store, review.id, analyzeSnapshot(snap, { competitorId: c.id, category: review.category }));
      if (snap.home && snap.home.ok) done++; else failed++;
    }
    if (failed && !done) return { state: 'failed', reason: 'site_unreachable', message: 'The comparison websites could not be read.' };
    return { state: 'done', message: failed ? 'Read ' + done + ' of ' + comps.length + ' comparison sites.' : '' };
  },
  async psi_competitors(deps, review, deadline) {
    const comps = await selectedCompetitors(deps, review);
    if (!comps.length) return { state: 'skipped', reason: 'no_competitors', message: reasonMessage('no_competitors') };
    let ok = 0, bad = 0, lastFail = null;
    for (let i = 0; i < comps.length; i++) {
      const c = comps[i];
      const key = 'psi_competitors:' + c.id;
      const evs = await deps.store.select('br_evidence', { review_id: review.id, competitor_id: c.id, metric_key: 'psi.mobile.lcp_ms', superseded_by: { is: null } });
      if (evs.length) { if (evs[0].evidence_state === 'verified_public_observation') ok++; else { bad++; lastFail = lastFail || { state: evs[0].evidence_state === 'not_tested' ? 'unavailable' : 'failed', reason: evs[0].reason_code, message: reasonMessage(evs[0].reason_code) }; } continue; }
      if (Date.now() > deadline - 12000) return { state: 'running', message: '' };
      const snap = await loadSnapshot(deps, review, c.id);
      const url = (snap && snap.response.home && snap.response.home.final_url) || c.website_url;
      const r = await runPsi(deps, review, c.id, url, key, deadline);
      if (r.state === 'done') ok++; else { bad++; lastFail = r; }
      if (i < comps.length - 1) return { state: 'running', message: '' }; // one PageSpeed URL per call at most
    }
    if (bad && !ok) return lastFail || { state: 'failed', reason: 'provider_error', message: 'The speed tests for the comparison sites did not complete.' };
    return { state: 'done', message: bad ? 'Some comparison speed tests did not complete.' : '' };
  },
  async local_search() {
    return { state: 'unavailable', reason: 'no_supported_source', message: 'Not tested: no supported data source is connected.' };
  },
  async ai_visibility() { return { state: 'unavailable', reason: 'not_run_in_free_review', message: 'Awaiting a supported test.' }; },
  async automation_map(deps, review) {
    const task = review.inputs && review.inputs.automation_task;
    if (!task) return { state: 'skipped', reason: 'no_task_given', message: reasonMessage('no_task_given') };
    await addAutomation(deps, review, task);
    return { state: 'done', message: '' };
  },
  async report_build(deps, review) {
    const steps = review.steps;
    const comp = completenessOf(steps);
    const rv = (await deps.store.update('br_reviews', { id: review.id }, { completeness: comp }))[0];
    const reason = (rv.inputs && rv.inputs.report_reason) || 'initial';
    const res = await buildAndStoreReport(deps, rv, { reason: reason, createdBy: 'system' });
    if (rv.inputs && rv.inputs.report_reason) { await deps.store.update('br_reviews', { id: review.id }, { inputs: Object.assign({}, rv.inputs, { report_reason: null }) }); }
    return { state: 'done', message: res.created ? '' : 'No change from the previous report.' };
  }
};

async function selectedCompetitors(deps, review) {
  const rows = await deps.store.select('br_competitors', { review_id: review.id, status: 'selected' }, { order: ['position.asc', 'created_at.asc'] });
  return rows.slice(0, deps.cfg.limits.maxCompetitors);
}

async function runPsi(deps, review, competitorId, url, key, deadline) {
  const hostCheck = (function () { const p = deps.fetcher.parseUrl(url); return p; })();
  const observedAt = nowOf(deps).toISOString();
  const ctxBase = { url: url, competitorId: competitorId, observedAt: observedAt };
  if (!hostCheck.ok) {
    await recordMany(deps.store, review.id, psi.failureDrafts('url_not_allowed', ctxBase));
    return { state: 'failed', reason: 'url_not_allowed', message: reasonMessage('url_not_allowed') };
  }
  const resolved = await deps.fetcher.resolveHost(hostCheck.hostname);
  if (!resolved.ok) {
    await recordMany(deps.store, review.id, psi.failureDrafts(resolved.code === 'url_not_allowed' ? 'url_not_allowed' : 'unresolvable', ctxBase));
    return { state: 'failed', reason: resolved.code, message: reasonMessage(resolved.code) };
  }
  const used = (await deps.store.select('br_provider_calls', { review_id: review.id, provider: 'pagespeed' })).filter(function (c) { return c.status === 'ok' || c.status === 'started' || c.status === 'cache_hit'; }).length;
  const priorKey = review.id + ':' + key + ':1';
  const hasPrior = (await deps.store.select('br_provider_calls', { idempotency_key: priorKey }, { limit: 1 })).length > 0;
  if (used >= deps.cfg.psi.maxCallsPerReview && !hasPrior) {
    await recordMany(deps.store, review.id, psi.failureDrafts('budget_exhausted', ctxBase));
    return { state: 'unavailable', reason: 'budget_exhausted', message: 'The speed test limit for one review was reached.' };
  }
  const remaining = deadline - Date.now();
  const r = await callProvider({ store: deps.store, cfg: deps.cfg, registry: deps.registry, fetchImpl: deps.fetchImpl, now: deps.now }, {
    id: 'pagespeed', operation: 'run_pagespeed', request: { url: hostCheck.url, strategy: 'mobile' }, reviewId: review.id, idempotencyKey: priorKey, cacheTtlS: 86400, timeoutMs: Math.max(5000, Math.min(45000, remaining - 2000))
  });
  if (r.ok) {
    await recordMany(deps.store, review.id, psi.toDrafts(r.data, Object.assign({ providerCallId: r.call_id }, ctxBase)));
    return { state: 'done', message: r.cached ? 'Used a speed test recorded in the last 24 hours.' : '' };
  }
  await recordMany(deps.store, review.id, psi.failureDrafts(r.code, Object.assign({ providerCallId: r.call_id || null }, ctxBase)));
  if (r.state === 'not_configured' || r.state === 'disabled') return { state: 'unavailable', reason: 'not_configured', message: 'The speed test is not switched on yet.' };
  if (r.state === 'budget_exhausted') return { state: 'unavailable', reason: 'budget_exhausted', message: reasonMessage('budget_exhausted') };
  return { state: 'failed', reason: r.code === 'timeout' ? 'timeout' : r.code === 'in_progress' ? 'timeout' : 'provider_error', message: r.code === 'timeout' ? reasonMessage('timeout') : reasonMessage('provider_error') };
}

async function addAutomation(deps, review, task) {
  const opp = automation.mapTask(task);
  try {
    await deps.store.insert('br_automation_opportunities', { review_id: review.id, task_text: opp.task_text, category_key: opp.category_key, match_basis: opp.match_basis, detail: opp });
  } catch (e) { if (!e || e.code !== 'conflict') throw e; }
  await recordEvidence(deps.store, review.id, { metric_key: 'customer.automation_task', state: 'customer_supplied', value: opp.task_text, observed_at: nowOf(deps).toISOString(), source: { kind: 'customer_supplied', name: 'Information supplied by you' }, method: { summary: 'Typed on the review form' }, inputs: {} });
  return opp;
}

// ---------------------------------------------------------------- report storage
async function buildAndStoreReport(deps, review, opts) {
  const store = deps.store;
  const evRows = await activeEvidence(store, review.id);
  const comps = await store.select('br_competitors', { review_id: review.id });
  const ops = await store.select('br_automation_opportunities', { review_id: review.id }, { order: ['created_at.asc'] });
  const ai = await store.select('br_ai_runs', { review_id: review.id }, { order: ['question_id.asc', 'run_index.asc'] });
  const versions = await store.select('br_report_versions', { review_id: review.id }, { order: ['version.asc'] });
  const last = versions[versions.length - 1] || null;
  const discoveryStep = (review.steps || []).find(function (s) { return s.key === 'competitor_discovery'; });
  const questions = require('./questions').generateQuestions({ category: review.category, location: { text: review.location_text, kind: review.location_kind } });
  const input = {
    review: review, evidence: evRows.map(toApiEvidence), competitors: comps, opportunities: ops, aiRuns: ai, questions: questions,
    version: (last ? last.version : 0) + 1, reason: opts.reason || 'initial', createdBy: opts.createdBy || 'system', now: nowOf(deps), reportId: uuid(),
    previous: versions.map(function (v) { return { version: v.version, summary: ((v.content.changes_from_previous || []).slice(-1)[0] || {}).summary || 'Report.' }; }),
    overrides: opts.overrides || (review.inputs && review.inputs.owner_overrides) || null, discoveryState: discoveryStep && discoveryStep.state === 'failed' ? 'unavailable' : null
  };
  const content = reportMod.build(input);
  const hash = reportMod.contentHash(content);
  if (last && last.content_hash === hash && !opts.force) return { created: false, version: last.version, row: last };
  const row = await store.insert('br_report_versions', {
    review_id: review.id, version: content.version, created_by: content.created_by, reason: content.reason, generator_version: content.generator_version,
    status: 'published', content: content, content_hash: hash, evidence_ids: evRows.map(function (e) { return e.id; })
  });
  if (last) await store.update('br_report_versions', { id: last.id }, { status: 'superseded' });
  return { created: true, version: content.version, row: row };
}

// ---------------------------------------------------------------- the stepper
async function advance(deps, review) {
  const store = deps.store;
  const owner = 'lease-' + crypto.randomBytes(6).toString('hex');
  let got;
  try { got = await store.rpc('br_review_lease', { p_id: review.id, p_owner: owner, p_seconds: LEASE_S }); } catch (e) { throw e; }
  if (got !== true) {
    const cur = (await store.select('br_reviews', { id: review.id }, { limit: 1 }))[0];
    if (cur && (cur.status === 'ready')) return { review: cur, ran: [] };
    const wait = cur && cur.lease_until ? Math.max(1000, new Date(cur.lease_until).getTime() - nowOf(deps).getTime()) : 3000;
    throw err('step_in_progress', { retry_after_ms: Math.min(wait, 15000) });
  }
  const started = Date.now();
  const soft = started + (deps.softMs || SOFT_MS), hard = started + (deps.hardMs || HARD_MS);
  let rv = (await store.select('br_reviews', { id: review.id }, { limit: 1 }))[0];
  const ran = [];
  let steps = rv.steps.map(function (s) { return Object.assign({}, s); });
  try {
    for (let i = 0; i < STEP_ORDER.length; i++) {
      const key = STEP_ORDER[i];
      const st = steps.find(function (s) { return s.key === key; });
      if (TERMINAL.indexOf(st.state) !== -1) continue;
      if (Date.now() >= soft && ran.length) break;
      st.state = 'running'; st.started_at = st.started_at || nowOf(deps).toISOString();
      rv = await saveSteps(deps, rv, { steps: steps, current_step: key });
      let res;
      try { res = await handlers[key](deps, Object.assign({}, rv, { steps: steps }), hard); }
      catch (e) {
        if (e && (e.code === 'not_configured' || (e.constructor && e.constructor.name === 'StoreError'))) throw e;
        res = { state: 'failed', reason: 'internal', message: 'This check hit an unexpected problem.' };
      }
      if (res.state === 'running') {
        st.state = 'running'; st.message = res.message || '';
        rv = await saveSteps(deps, rv, { steps: steps });
        break;
      }
      st.state = res.state; st.reason = res.reason || null; st.message = res.message || ''; st.finished_at = nowOf(deps).toISOString();
      ran.push(key);
      rv = await saveSteps(deps, rv, { steps: steps });
    }
    if (allTerminal(steps)) {
      const versions = await store.select('br_report_versions', { review_id: rv.id }, { limit: 1 });
      if (versions.length) rv = await saveSteps(deps, rv, { status: 'ready', completeness: completenessOf(steps), completed_at: nowOf(deps).toISOString(), current_step: null, error_code: null });
      else rv = await saveSteps(deps, rv, { status: 'failed', completeness: 'partial', current_step: null, error_code: 'report_build_failed' });
    }
  } finally {
    try { await store.update('br_reviews', { id: review.id }, { lease_until: null, lease_owner: null }); } catch (e) { /* lease expires by itself */ }
  }
  return { review: (await store.select('br_reviews', { id: review.id }, { limit: 1 }))[0], ran: ran };
}

// Re-queue steps after the competitor set changed (nomination or owner edit). Evidence stays; a new report version follows.
async function requeueForCompetitors(deps, review, reason) {
  const steps = review.steps.map(function (s) {
    if (s.key === 'competitor_fetch' || s.key === 'psi_competitors' || s.key === 'report_build') return Object.assign({}, newStep(s.key));
    return s;
  });
  return (await deps.store.update('br_reviews', { id: review.id }, { steps: steps, status: 'queued', completed_at: null, lease_until: null, lease_owner: null, inputs: Object.assign({}, review.inputs, { report_reason: reason || 'competitors_changed' }) }))[0];
}

// Daily sweeper: finishes stale reviews honestly (unfinished steps become unavailable, not invented) then purges expired data.
async function sweep(deps) {
  const store = deps.store;
  const cutoff = new Date(nowOf(deps).getTime() - 24 * 3600 * 1000).toISOString();
  const stale = (await store.select('br_reviews', { status: { in: ['queued', 'running'] }, updated_at: { lt: cutoff } }, { limit: 50 }));
  let finished = 0;
  for (let i = 0; i < stale.length; i++) {
    let rv = stale[i];
    const steps = rv.steps.map(function (s) {
      if (TERMINAL.indexOf(s.state) !== -1 || s.key === 'report_build') return s;
      return Object.assign({}, s, { state: 'unavailable', reason: 'step_not_finished', message: reasonMessage('step_not_finished'), finished_at: nowOf(deps).toISOString() });
    });
    rv = (await store.update('br_reviews', { id: rv.id }, { steps: steps, completeness: 'partial' }))[0];
    try {
      await buildAndStoreReport(deps, rv, { reason: 'initial', createdBy: 'system' });
      const done = steps.map(function (s) { return s.key === 'report_build' ? Object.assign({}, s, { state: 'done', finished_at: nowOf(deps).toISOString() }) : s; });
      await store.update('br_reviews', { id: rv.id }, { steps: done, status: 'ready', completeness: 'partial', completed_at: nowOf(deps).toISOString(), lease_until: null, lease_owner: null });
      finished++;
    } catch (e) { /* left for the next sweep */ }
  }
  const purge = await store.rpc('br_purge_expired', {});
  return { finished_stale: finished, purge: purge };
}

module.exports = { advance, initialSteps, seedEvidence, completenessOf, allTerminal, buildAndStoreReport, requeueForCompetitors, addAutomation, sweep, handlers, TERMINAL, SOFT_MS, HARD_MS, LEASE_S };
