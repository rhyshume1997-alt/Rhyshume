'use strict';
/*
Business review: evidence records, validation and append only storage rules.
Inputs : drafts from the analyzer, PSI parser, customer inputs; a store adapter.
Outputs: validated rows in br_evidence; API shaped evidence records (CONTRACT section 5).
Rules  : value is null exactly when state is not_tested or unavailable (then reason_code is required); every row has a source,
         an observed_at timestamp and the exact inputs; a replay with the same result changes nothing; a different result is
         appended under a new run_key and the old row is marked superseded (never edited or deleted); verified_authenticated_account_data
         is refused in this release; reasonable_inference rows must say so in their limitations.
Must not change: append only behaviour, the refusal to store a value for not_tested or unavailable, no substituted values.
*/
const { EVIDENCE_STATES } = require('./labels');
const { METRICS, isKnownMetric } = require('./metrics');
const { uuid } = require('./token');

const CATEGORIES = ['technical', 'local', 'ai_visibility', 'customer_supplied', 'automation'];

function fail(msg) { const e = new Error('evidence: ' + msg); e.code = 'evidence_invalid'; return e; }

function iso(d) { return (d instanceof Date ? d : new Date(d)).toISOString().replace(/\.\d{3}Z$/, 'Z'); }

function makeValue(metricKey, raw) {
  if (raw === null || raw === undefined) return null;
  const def = METRICS[metricKey] || {};
  let type = def.type;
  if (!type) type = Array.isArray(raw) ? 'list' : typeof raw === 'object' ? 'object' : typeof raw;
  const v = { type: type, v: raw };
  if (def.unit) v.unit = def.unit;
  return v;
}

// draft: { metric_key, competitor_id?, state, value?, reason_code?, observed_at, source:{kind,name,url?,provider_call_id?}, method?, inputs?, limitations?, run_key? }
function buildRow(reviewId, draft) {
  if (!isKnownMetric(draft.metric_key)) throw fail('unknown metric ' + draft.metric_key);
  if (EVIDENCE_STATES.indexOf(draft.state) === -1) throw fail('bad state');
  if (draft.state === 'verified_authenticated_account_data') throw fail('authenticated account data is not produced in this release');
  const def = METRICS[draft.metric_key];
  const empty = draft.state === 'not_tested' || draft.state === 'unavailable';
  const value = empty ? null : makeValue(draft.metric_key, draft.value);
  if (empty && draft.value !== undefined && draft.value !== null) throw fail('a value cannot be stored for ' + draft.state);
  if (!empty && value === null) throw fail('a value is required for ' + draft.state);
  if (empty && !draft.reason_code) throw fail('reason_code required for ' + draft.state);
  if (!draft.source || !draft.source.kind || !draft.source.name) throw fail('source required');
  if (!draft.observed_at || Number.isNaN(new Date(draft.observed_at).getTime())) throw fail('observed_at required');
  const limitations = (def.limitations || []).concat(draft.limitations || []);
  if (draft.state === 'reasonable_inference' && !limitations.some(function (l) { return /inference/i.test(l); })) limitations.push('This is an inference, not a measurement.');
  if (draft.state === 'customer_supplied' && !limitations.some(function (l) { return /supplied by you/i.test(l); })) limitations.push('Supplied by you and not checked.');
  return {
    id: draft.id || uuid(),
    review_id: reviewId,
    competitor_id: draft.competitor_id || null,
    category: draft.category || def.category,
    metric_key: draft.metric_key,
    evidence_state: draft.state,
    reason_code: empty ? draft.reason_code : null,
    value: value,
    observed_at: iso(draft.observed_at),
    source: { kind: draft.source.kind, name: draft.source.name, url: draft.source.url || null, provider_call_id: draft.source.provider_call_id || null },
    method: draft.method || {},
    inputs: draft.inputs || {},
    limitations: limitations,
    provider_call_id: draft.source.provider_call_id || null,
    run_key: draft.run_key || 'main',
    superseded_by: null
  };
}

function sameResult(a, b) {
  return a.evidence_state === b.evidence_state && a.reason_code === b.reason_code && JSON.stringify(a.value) === JSON.stringify(b.value);
}

// Append only: returns the row that is now current for this (review, competitor, metric).
async function recordEvidence(store, reviewId, draft) {
  const row = buildRow(reviewId, draft);
  const filters = { review_id: reviewId, metric_key: row.metric_key, superseded_by: { is: null } };
  const active = (await store.select('br_evidence', filters)).filter(function (r) { return (r.competitor_id || null) === row.competitor_id; });
  const same = active.find(function (r) { return r.run_key === row.run_key; });
  if (same && sameResult(same, row)) return { row: same, created: false };
  if (active.length) {
    // numbered run keys keep the partial unique index satisfied while the old row is superseded afterwards
    const n = active.reduce(function (mx, r) { const m = /^r(\d+)$/.exec(r.run_key); return Math.max(mx, m ? +m[1] : 1); }, 1);
    if (!draft.run_key || same) row.run_key = 'r' + (n + 1);
  }
  const saved = await store.insert('br_evidence', row);
  for (let i = 0; i < active.length; i++) {
    await store.update('br_evidence', { id: active[i].id }, { superseded_by: saved.id });
  }
  return { row: saved, created: true };
}

async function recordMany(store, reviewId, drafts) {
  const rows = [];
  for (let i = 0; i < drafts.length; i++) rows.push((await recordEvidence(store, reviewId, drafts[i])).row);
  return rows;
}

async function activeEvidence(store, reviewId) {
  const rows = await store.select('br_evidence', { review_id: reviewId, superseded_by: { is: null } }, { order: ['created_at.asc', 'metric_key.asc'] });
  return rows;
}

// DB row -> API record (CONTRACT section 5). Label and meaning come from the catalogue so wording stays consistent.
function toApiEvidence(row) {
  const def = METRICS[row.metric_key] || {};
  return {
    id: row.id, review_id: row.review_id,
    subject: row.competitor_id ? { kind: 'competitor', competitor_id: row.competitor_id } : { kind: 'business' },
    category: row.category, metric_key: row.metric_key, label: def.label || row.metric_key,
    evidence_state: row.evidence_state, reason_code: row.reason_code || null, value: row.value || null,
    observed_at: row.observed_at, source: row.source, method: row.method || {}, inputs: row.inputs || {},
    what_it_means: def.what_it_means || '', limitations: row.limitations || [], run_key: row.run_key,
    superseded_by: row.superseded_by || null, created_at: row.created_at
  };
}

module.exports = { buildRow, recordEvidence, recordMany, activeEvidence, toApiEvidence, makeValue, iso, CATEGORIES };
