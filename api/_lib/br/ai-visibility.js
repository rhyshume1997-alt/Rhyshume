'use strict';
/*
Business review: AI search visibility planning, run recording, caps and report section.
Inputs : a review, its question set, provider adapters (through callProvider), the config caps.
Outputs: a plan with a cost estimate (dry run, spends nothing), recorded runs in br_ai_runs, and the report section.
Rules  : OFF by default (flag, adapter and a daily cap in pence are all needed); the public free review never calls this; only the owner
         runs it from the admin view; hard ceilings in code: at most 12 questions, 3 runs per question, 2 tools, 72 calls; per review caps
         from config; one attempt per planned run, no retries; an answer is only accepted when the adapter reports search evidence
         (citations or search queries), otherwise the run is stored as error no_search_evidence and excluded; a plain model reply is never
         a result; no percentage or single score is ever produced.
Must not change: the ceilings, the no_search_evidence rule, the absence of any score.
*/
const COSTS = require('./costs');
const { callProvider, stateOf, registry: makeRegistry, AI_IDS } = require('./providers/index');

const MAX_Q = COSTS.MAX_AI_QUESTIONS, MAX_RUNS = COSTS.MAX_AI_RUNS_PER_QUESTION, MAX_TOOLS = COSTS.MAX_AI_TOOLS, HARD_CALLS = MAX_Q * MAX_RUNS * MAX_TOOLS;

function plan(deps, opts) {
  const cfg = deps.cfg, reg = deps.registry || makeRegistry();
  const tools = (opts.tools || []).filter(function (t, i, a) { return a.indexOf(t) === i; });
  const qs = opts.questions || [];
  const runs = opts.runs == null ? MAX_RUNS : opts.runs;
  const reasons = [];
  if (!cfg.ai.enabled) reasons.push('ai_visibility_disabled');
  if (tools.length === 0) reasons.push('no_tools_selected');
  if (tools.length > MAX_TOOLS) reasons.push('too_many_tools');
  tools.forEach(function (t) { if (AI_IDS.indexOf(t) === -1) reasons.push('unknown_tool:' + t); else if (stateOf(reg, cfg, t).state === 'not_configured') reasons.push('provider_not_configured:' + t); });
  if (!Number.isInteger(runs) || runs < 1 || runs > MAX_RUNS) reasons.push('runs_out_of_range');
  if (qs.length > MAX_Q) reasons.push('too_many_questions');
  if (qs.length === 0) reasons.push('no_questions');
  if (cfg.ai.dailyCapPence <= 0) reasons.push('daily_cap_zero');
  const calls = qs.length * (Number.isInteger(runs) ? runs : 0) * tools.length;
  if (calls > HARD_CALLS) reasons.push('over_hard_ceiling');
  if (calls > cfg.ai.maxCallsPerReview) reasons.push('over_calls_per_review');
  const low = calls * COSTS.AI_PENCE_PER_CALL_LOW, high = calls * COSTS.AI_PENCE_PER_CALL_WORST;
  if (high > cfg.ai.maxPencePerReview) reasons.push('over_cost_per_review');
  return { questions: qs.length, runs: runs, tools: tools.length, calls: calls, estimate_pence: { low: low, high: high }, within_caps: reasons.length === 0, cap_reasons: reasons };
}

function strip(name) {
  return String(name || '').toLowerCase().replace(/&/g, ' and ').replace(/\b(ltd|limited|llp|plc|inc|co|company|group)\b\.?/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function norm(text) { return ' ' + String(text || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' '; }
function hostOf(u) { try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ''); } catch (e) { return ''; } }

function detect(answer, citations, business) {
  const text = norm(answer);
  const variants = [strip(business.name)].filter(function (v) { return v.length >= 4; });
  const host = String(business.host || '').toLowerCase().replace(/^www\./, '');
  const textHit = variants.some(function (v) { return text.indexOf(' ' + v + ' ') !== -1; }) || (host && String(answer || '').toLowerCase().indexOf(host) !== -1);
  const citeHit = !!host && (citations || []).some(function (c) { return hostOf(c && c.url) === host; });
  return { named: textHit || citeHit, basis: textHit && citeHit ? 'both' : textHit ? 'text_match' : citeHit ? 'citation_match' : 'none' };
}
function competitorsIn(answer, names) {
  const text = norm(answer);
  return (names || []).filter(function (n) { const v = strip(n); return v.length >= 4 && text.indexOf(' ' + v + ' ') !== -1; });
}

async function execute(deps, opts) {
  const store = deps.store, cfg = deps.cfg, reg = deps.registry || makeRegistry();
  const review = opts.review;
  const tools = opts.tools.slice(0, MAX_TOOLS);
  const runs = Math.min(opts.runs || MAX_RUNS, MAX_RUNS);
  const qs = opts.questions.slice(0, MAX_Q);
  const existing = await store.select('br_ai_runs', { review_id: review.id });
  const spentPence = existing.reduce(function (s, r) { return s + (Number(r.cost_pence) || 0); }, 0);
  let calls = existing.filter(function (r) { return r.status === 'ok' || r.status === 'error'; }).length;
  let pence = spentPence;
  const business = { name: review.business_name, host: review.website_host };
  const compNames = (opts.competitors || []).filter(function (c) { return c.status === 'selected'; }).map(function (c) { return c.name; });
  const out = { attempted: 0, ok: 0, errors: 0, unavailable: 0, skipped_budget: 0, remaining: 0, stopped: null };
  let bound = 0;
  outer:
  for (let ti = 0; ti < tools.length; ti++) {
    for (let qi = 0; qi < qs.length; qi++) {
      for (let run = 1; run <= runs; run++) {
        if (++bound > HARD_CALLS) break outer;
        const q = qs[qi], tool = tools[ti];
        const prior = existing.find(function (r) { return r.question_id === q.question_id && r.provider === tool && r.run_index === run; });
        if (prior && (prior.status === 'ok' || prior.status === 'error' || prior.status === 'unavailable' || prior.status === 'skipped_budget')) continue;
        if (opts.deadline && Date.now() > opts.deadline) { out.remaining++; out.stopped = 'time'; continue; }
        if (calls >= cfg.ai.maxCallsPerReview || pence + COSTS.AI_PENCE_PER_CALL_WORST > cfg.ai.maxPencePerReview) {
          out.skipped_budget++;
          await upsertRun(store, review, q, tool, run, reg, { status: 'skipped_budget', error_code: 'budget_exhausted' }, prior);
          continue;
        }
        out.attempted++;
        const r = await callProvider({ store: store, cfg: cfg, registry: reg, fetchImpl: deps.fetchImpl, now: deps.now }, {
          id: tool, operation: 'ai_question', request: { question: q.question_text, location_context: review.location_text + ', United Kingdom', run_index: run },
          reviewId: review.id, idempotencyKey: review.id + ':ai:' + q.question_id + ':' + tool + ':' + run, worstCasePence: COSTS.AI_PENCE_PER_CALL_WORST, timeoutMs: 45000
        });
        if (!r.ok) {
          const st = r.state === 'budget_exhausted' ? 'skipped_budget' : (r.state === 'not_configured' || r.state === 'disabled') ? 'unavailable' : 'error';
          out[st === 'skipped_budget' ? 'skipped_budget' : st === 'unavailable' ? 'unavailable' : 'errors']++;
          await upsertRun(store, review, q, tool, run, reg, { status: st, error_code: r.code || 'provider_error', provider_call_id: r.call_id || null }, prior);
          continue;
        }
        calls++;
        const d = r.data || {};
        const citations = Array.isArray(d.citations) ? d.citations.slice(0, 20).map(function (c) { return { url: String(c && c.url || '').slice(0, 500), title: String(c && c.title || '').slice(0, 200) }; }) : [];
        const queries = Array.isArray(d.search_queries) ? d.search_queries.slice(0, 10).map(function (x) { return String(x).slice(0, 200); }) : [];
        const cost = Number(r.cost_pence) || 0;
        pence += cost;
        const searched = citations.length > 0 || queries.length > 0;
        if (typeof d.answer_text !== 'string' || !searched) {
          out.errors++;
          await upsertRun(store, review, q, tool, run, reg, { status: 'error', error_code: 'no_search_evidence', answer_text: typeof d.answer_text === 'string' ? d.answer_text : null, model_reported: d.model_reported || null, provider_call_id: r.call_id, cost_pence: cost, ran_at: (deps.now ? deps.now() : new Date()).toISOString() }, prior);
          continue;
        }
        const det = detect(d.answer_text, citations, business);
        out.ok++;
        await upsertRun(store, review, q, tool, run, reg, {
          status: 'ok', answer_text: d.answer_text, citations: citations, search_queries: queries, model_reported: d.model_reported || null, tool: d.tool || undefined,
          business_named: det.named, business_named_basis: det.basis, competitors_named: competitorsIn(d.answer_text, compNames), sources_provided: citations.length > 0,
          provider_call_id: r.call_id, cost_pence: cost, ran_at: (deps.now ? deps.now() : new Date()).toISOString()
        }, prior);
      }
    }
  }
  out.remaining_calls = Math.max(0, Math.min(qs.length * runs * tools.length, HARD_CALLS) - (await store.select('br_ai_runs', { review_id: review.id })).filter(function (r) { return ['ok', 'error', 'unavailable', 'skipped_budget'].indexOf(r.status) !== -1; }).length);
  return out;
}

async function upsertRun(store, review, q, tool, run, reg, patch, prior) {
  const base = Object.assign({ location_context: review.location_text + ', United Kingdom' }, patch);
  if (prior) { await store.update('br_ai_runs', { id: prior.id }, base); return; }
  await store.insert('br_ai_runs', Object.assign({ review_id: review.id, question_id: q.question_id, question_set: q.question_set, question_text: q.question_text, provider: tool, tool: (reg[tool] && reg[tool].toolName) || 'search', model_requested: (reg[tool] && reg[tool].model) || 'not_configured', run_index: run }, base));
}

function summarise(runs, questionsById) {
  const groups = {};
  runs.forEach(function (r) {
    const k = r.question_id + '|' + r.provider + '|' + r.tool;
    const g = groups[k] || (groups[k] = { question_id: r.question_id, question_text: r.question_text, provider: r.provider, tool: r.tool, runs_total: 0, runs_ok: 0, business_named_in_runs: 0, sources_in_runs: 0, _comp: {}, run_ids: [] });
    g.runs_total++;
    g.run_ids.push(r.id);
    if (r.status === 'ok') {
      g.runs_ok++;
      if (r.business_named) g.business_named_in_runs++;
      if (r.sources_provided) g.sources_in_runs++;
      (r.competitors_named || []).forEach(function (n) { g._comp[n] = (g._comp[n] || 0) + 1; });
    }
  });
  return Object.keys(groups).sort().map(function (k) {
    const g = groups[k];
    const comps = Object.keys(g._comp).sort().map(function (n) { return { name: n, in_runs: g._comp[n] }; });
    delete g._comp;
    g.competitors_named = comps;
    g.run_ids.sort();
    return g;
  });
}

function reportSection(input) {
  const runs = (input.runs || []).filter(function (r) { return r.status !== 'planned'; });
  if (!runs.length) return { state: 'awaiting_supported_test', note: 'Awaiting a supported test.', questions: [], summary: [] };
  const ok = runs.filter(function (r) { return r.status === 'ok'; });
  const summary = summarise(runs);
  const seen = {};
  const questions = [];
  runs.slice().sort(function (a, b) { return a.question_id < b.question_id ? -1 : 1; }).forEach(function (r) { if (!seen[r.question_id]) { seen[r.question_id] = true; questions.push({ question_id: r.question_id, question_text: r.question_text }); } });
  const state = ok.length === 0 ? 'unavailable' : ok.length === runs.length ? 'complete' : 'partial';
  const note = state === 'unavailable' ? 'The test was attempted but no run returned a usable answer with search evidence.' : state === 'partial' ? 'Some runs did not complete, so results are partial. Answers vary between runs and tools.' : 'Answers vary between runs and tools. Counts show how many runs named the business.';
  return { state: state, note: note, questions: questions, summary: summary };
}

module.exports = { plan, execute, summarise, reportSection, detect, competitorsIn, HARD_CALLS };
