'use strict';
/*
Business review: provider registry and the single gate for every external call (callProvider).
Inputs : store, config, provider id, operation, request, review id, idempotency key, cache ttl, worst case cost.
Outputs: { ok:true, data, cached, replay, call_id, cost_pence } or { ok:false, state, code, call_id? }.
Order  : 1 state (flag, key, cap)  2 same idempotency key already logged -> reuse, never repeat a call that may have been billed
         3 cache by request hash  4 claim the key (log 'started')  5 atomic budget spend (br_budget_spend)  6 run once with a timeout  7 log result.
Rules  : nothing is called when a provider is disabled, unconfigured or over budget; no retries; a provider failure is returned as a
         failure and the caller records an unavailable evidence row; secrets never reach the log rows or return values.
Must not change: this order, the no retry rule, off by default.
*/
const psi = require('./psi');
const places = require('./places');
const osm = require('./osm');
const aiNull = require('./ai-null');
const COSTS = require('../costs');
const { sha256Hex } = require('../token');

const AI_IDS = ['ai_anthropic', 'ai_openai', 'ai_gemini', 'ai_perplexity'];
const STARTED_STALE_MS = 90 * 1000;

function stable(x) {
  if (Array.isArray(x)) return '[' + x.map(stable).join(',') + ']';
  if (x && typeof x === 'object') return '{' + Object.keys(x).sort().map(function (k) { return JSON.stringify(k) + ':' + stable(x[k]); }).join(',') + '}';
  return JSON.stringify(x === undefined ? null : x);
}

function registry(overrides) {
  const reg = { pagespeed: psi, google_places: places, osm: osm };
  AI_IDS.forEach(function (id) { reg[id] = aiNull.create(id); });
  Object.keys(overrides || {}).forEach(function (k) { reg[k] = overrides[k]; });
  return reg;
}

// Budget definition per provider. units: 'calls' for PSI (each call spends 1 unit of BR_PSI_DAILY_CALLS), pence otherwise.
function budgetFor(cfg, id, worstCasePence) {
  if (id === 'pagespeed') return { cap: cfg.psi.dailyCalls, amount: COSTS.PSI_BUDGET_UNIT, unit: 'calls' };
  if (id === 'google_places') return { cap: cfg.discovery.dailyCapPence, amount: worstCasePence == null ? COSTS.PLACES_TEXT_SEARCH_PENCE : worstCasePence, unit: 'pence' };
  if (AI_IDS.indexOf(id) !== -1) return { cap: cfg.ai.dailyCapPence, amount: worstCasePence == null ? COSTS.AI_PENCE_PER_CALL_WORST : worstCasePence, unit: 'pence' };
  return null; // free and uncapped: osm (1 request a second is paced by the caller)
}

function stateOf(reg, cfg, id) {
  const impl = reg[id];
  if (!impl) return { state: 'not_configured', reason: 'unknown provider' };
  return impl.status(cfg);
}

async function logUnavailable(store, reviewId, id, operation, key, requestHash, state, code) {
  if (!reviewId) return null;
  try {
    const row = await store.insert('br_provider_calls', { review_id: reviewId, provider: id, operation: operation, idempotency_key: key, request_hash: requestHash, status: 'unavailable', error_code: code, finished_at: new Date().toISOString(), duration_ms: 0 });
    return row.id;
  } catch (e) {
    if (e && e.code === 'conflict') { const ex = await store.select('br_provider_calls', { idempotency_key: key }, { limit: 1 }); return ex[0] ? ex[0].id : null; }
    return null;
  }
}

/*
callProvider(deps, call)
deps : { store, cfg, registry?, fetchImpl?, now? }
call : { id, operation, request, reviewId, idempotencyKey, cacheTtlS?, worstCasePence?, timeoutMs? }
*/
async function callProvider(deps, call) {
  const store = deps.store, cfg = deps.cfg;
  const reg = deps.registry || registry();
  const now = deps.now || function () { return new Date(); };
  const id = call.id;
  const requestHash = sha256Hex(id + '|' + call.operation + '|' + stable(call.request));

  // 1 state
  const st = stateOf(reg, cfg, id);
  if (st.state !== 'available') {
    const code = st.state;
    const callId = await logUnavailable(store, call.reviewId, id, call.operation, call.idempotencyKey + ':unavailable', requestHash, st.state, code);
    return { ok: false, state: st.state, code: code, call_id: callId };
  }

  // 2 idempotency: a call logged under this key is never repeated
  const prior = (await store.select('br_provider_calls', { idempotency_key: call.idempotencyKey }, { limit: 1 }))[0];
  if (prior) {
    if (prior.status === 'ok' || prior.status === 'cache_hit') return { ok: true, data: prior.response, cached: prior.status === 'cache_hit', replay: true, call_id: prior.id, cost_pence: Number(prior.cost_pence) || 0 };
    if (prior.status === 'started') {
      const age = now().getTime() - new Date(prior.started_at).getTime();
      if (age < STARTED_STALE_MS) return { ok: false, state: 'degraded', code: 'in_progress', call_id: prior.id };
      await store.update('br_provider_calls', { id: prior.id }, { status: 'error', error_code: 'interrupted', finished_at: now().toISOString() });
      return { ok: false, state: 'degraded', code: 'interrupted', call_id: prior.id };
    }
    return { ok: false, state: prior.status === 'skipped_budget' ? 'budget_exhausted' : 'degraded', code: prior.error_code || prior.status, call_id: prior.id };
  }

  // 3 cache
  if (call.cacheTtlS > 0) {
    const hit = (await store.select('br_provider_calls', { provider: id, request_hash: requestHash, status: 'ok', cache_expires_at: { gt: now().toISOString() } }, { order: ['started_at.desc'], limit: 1 }))[0];
    if (hit) {
      let row = null;
      try {
        row = await store.insert('br_provider_calls', { review_id: call.reviewId || null, provider: id, operation: call.operation, idempotency_key: call.idempotencyKey, request_hash: requestHash, status: 'cache_hit', finished_at: now().toISOString(), duration_ms: 0, model_version: hit.model_version, response: hit.response, cost_pence: 0 });
      } catch (e) { if (!e || e.code !== 'conflict') throw e; }
      return { ok: true, data: hit.response, cached: true, replay: false, call_id: row ? row.id : hit.id, cost_pence: 0, from_call_id: hit.id };
    }
  }

  // 4 claim the idempotency key first (a unique key means a racing duplicate loses here and spends nothing)
  let row;
  try {
    row = await store.insert('br_provider_calls', { review_id: call.reviewId || null, provider: id, operation: call.operation, idempotency_key: call.idempotencyKey, request_hash: requestHash, status: 'started', started_at: now().toISOString() });
  } catch (e) {
    if (e && e.code === 'conflict') return { ok: false, state: 'degraded', code: 'in_progress' };
    throw e;
  }

  // 5 budget (atomic, in the database); a refusal closes the claimed row and nothing is called
  const b = budgetFor(cfg, id, call.worstCasePence);
  if (b) {
    let allowed = false;
    try { allowed = await store.rpc('br_budget_spend', { p_provider: id, p_pence: b.amount, p_daily_cap_pence: b.cap }); } catch (e) { allowed = false; }
    if (allowed !== true) {
      await store.update('br_provider_calls', { id: row.id }, { status: 'skipped_budget', error_code: 'budget_exhausted', finished_at: now().toISOString(), duration_ms: 0 });
      return { ok: false, state: 'budget_exhausted', code: 'budget_exhausted', call_id: row.id };
    }
  }

  // 6 run exactly once
  const t0 = Date.now();
  let result;
  try {
    result = await reg[id].run(call.request, { cfg: cfg, fetchImpl: deps.fetchImpl || fetch, timeoutMs: call.timeoutMs, now: now });
  } catch (e) { result = { ok: false, code: 'provider_error' }; }
  const ms = Date.now() - t0;

  // 7 log result
  if (result && result.ok) {
    const ttl = call.cacheTtlS > 0 ? new Date(now().getTime() + call.cacheTtlS * 1000).toISOString() : null;
    await store.update('br_provider_calls', { id: row.id }, { status: 'ok', http_status: 200, finished_at: now().toISOString(), duration_ms: ms, cost_pence: result.cost_pence || 0, model_version: result.model_version || null, response: result.data, cache_expires_at: ttl });
    return { ok: true, data: result.data, cached: false, replay: false, call_id: row.id, cost_pence: result.cost_pence || 0, model_version: result.model_version || null };
  }
  const code = result && result.code ? String(result.code).slice(0, 40) : 'provider_error';
  await store.update('br_provider_calls', { id: row.id }, { status: 'error', error_code: code, finished_at: now().toISOString(), duration_ms: ms });
  return { ok: false, state: 'degraded', code: code, call_id: row.id };
}

// Admin view of every provider (CONTRACT section 10). No secrets, no key presence beyond the state.
async function providerStatuses(deps) {
  const store = deps.store, cfg = deps.cfg;
  const reg = deps.registry || registry();
  const day = (deps.now ? deps.now() : new Date()).toISOString().slice(0, 10);
  const budget = await store.select('br_budget', { day: day }).catch(function () { return []; });
  const out = [];
  const ids = ['own_fetch', 'pagespeed', 'google_places', 'osm'].concat(AI_IDS, ['resend', 'turnstile']);
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    let st, label, kind;
    if (id === 'own_fetch') { st = { state: 'available', reason: null }; label = 'Direct page fetch'; kind = 'own_fetch'; }
    else if (id === 'resend') { st = !cfg.email.enabled ? { state: 'disabled', reason: 'BR_EMAIL is off' } : !cfg.email.resendKey ? { state: 'not_configured', reason: 'no RESEND_API_KEY' } : { state: 'available', reason: null }; label = 'Resend email'; kind = 'email'; }
    else if (id === 'turnstile') { st = cfg.turnstileSecret ? { state: 'available', reason: null } : { state: 'not_configured', reason: 'no TURNSTILE_SECRET_KEY' }; label = 'Cloudflare Turnstile'; kind = 'turnstile'; }
    else { st = stateOf(reg, cfg, id); label = reg[id].label; kind = reg[id].kind; }
    let lastOk = null, lastErr = null;
    try {
      const ok = await store.select('br_provider_calls', { provider: id, status: 'ok' }, { order: ['started_at.desc'], limit: 1 });
      const er = await store.select('br_provider_calls', { provider: id, status: { in: ['error', 'unavailable'] } }, { order: ['started_at.desc'], limit: 1 });
      lastOk = ok[0] ? ok[0].started_at : null; lastErr = er[0] || null;
    } catch (e) { /* status still returned */ }
    const bu = budget.find(function (r) { return r.provider === id; });
    out.push({
      id: id, kind: kind, label: label, state: st.state, reason: st.reason || null, last_ok_at: lastOk,
      last_error_code: lastErr ? lastErr.error_code : null, last_error_at: lastErr ? lastErr.started_at : null,
      budget: { used_pence: bu ? Number(bu.pence_used) : 0, daily_cap_pence: id === 'google_places' ? cfg.discovery.dailyCapPence : AI_IDS.indexOf(id) !== -1 ? cfg.ai.dailyCapPence : 0, calls_today: bu ? bu.calls : 0, daily_call_cap: id === 'pagespeed' ? cfg.psi.dailyCalls : 0 },
      cost_note: id === 'pagespeed' ? 'Free within Google\'s quota.' : id === 'google_places' ? 'Paid per request beyond a small free allowance (estimate, check current pricing).' : AI_IDS.indexOf(id) !== -1 ? 'Paid per call (estimate, check current pricing).' : '',
      terms_note: id === 'pagespeed' || id === 'google_places' ? 'Read the current Google API terms before launch.' : ''
    });
  }
  return out;
}

module.exports = { callProvider, providerStatuses, registry, stateOf, budgetFor, AI_IDS, stable };
