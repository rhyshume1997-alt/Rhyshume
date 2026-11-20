'use strict';
/*
Business review: storage adapter.
Inputs : table name, row objects, simple filters. Two implementations share one interface:
           createSupabaseStore({ url, serviceKey, fetchImpl })  PostgREST over fetch with the service role key (production)
           createMemoryStore({ now })                           in memory, mirrors the migration's constraints and locks (tests)
Interface (all async): insert(table,row) select(table,filters,opts) update(table,filters,patch) delete(table,filters)
           count(table,filters) rpc(name,args)
Filters: { col: value } is equality; { col: null } is IS NULL; { col: { gt|gte|lt|lte|neq|in|is|like } } for the rest.
Errors : StoreError with code 'conflict' (unique violation), 'locked' (append only rule), 'not_configured' or 'store_error'.
         Error messages never contain the key, URLs or response bodies.
Must not change: the memory store must keep mirroring supabase/migrations/20261120120000_business_review.sql (uniques, locks,
         cascade, rpc behaviour) so tests mean something. The service role key is only ever sent as a request header.
*/
const crypto = require('node:crypto');

class StoreError extends Error {
  constructor(code, detail) { super(code); this.code = code; this.detail = detail || null; }
}

const TABLES = ['br_reviews', 'br_provider_calls', 'br_competitors', 'br_evidence', 'br_ai_runs', 'br_report_versions', 'br_automation_opportunities', 'br_prospects', 'br_deliveries', 'br_rate_limits', 'br_budget', 'br_admin_log', 'leads'];

// ---------------------------------------------------------------- Supabase (PostgREST)
function encodeValue(v) { return encodeURIComponent(String(v)); }
function filterParam(col, cond) {
  if (cond === null) return [col, 'is.null'];
  if (typeof cond !== 'object' || Array.isArray(cond)) return [col, 'eq.' + String(cond)];
  const k = Object.keys(cond)[0];
  const v = cond[k];
  switch (k) {
    case 'gt': case 'gte': case 'lt': case 'lte': case 'neq': case 'like': case 'ilike': return [col, k + '.' + String(v)];
    case 'is': return [col, 'is.' + (v === null ? 'null' : String(v))];
    case 'in': return [col, 'in.(' + v.map(function (x) { return '"' + String(x).replace(/"/g, '\\"') + '"'; }).join(',') + ')'];
    default: throw new StoreError('store_error', 'bad filter');
  }
}

function createSupabaseStore(opts) {
  const base = String(opts.url || '').replace(/\/+$/, '');
  const key = opts.serviceKey;
  const doFetch = opts.fetchImpl || fetch;
  const timeoutMs = opts.timeoutMs || 10000;
  if (!base || !key) {
    const missing = function () { return Promise.reject(new StoreError('not_configured')); };
    return { kind: 'supabase', insert: missing, select: missing, update: missing, delete: missing, count: missing, rpc: missing };
  }
  async function call(method, path, body, extraHeaders) {
    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, timeoutMs);
    let res;
    try {
      res = await doFetch(base + '/rest/v1/' + path, {
        method: method,
        headers: Object.assign({ apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Accept: 'application/json' }, extraHeaders || {}),
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal
      });
    } catch (e) { throw new StoreError('store_error', 'network'); } finally { clearTimeout(timer); }
    if (res.status === 409) throw new StoreError('conflict');
    if (!res.ok) {
      let code = null;
      try { const j = await res.json(); code = j && j.code ? String(j.code).slice(0, 12) : null; } catch (e) { /* ignore */ }
      if (code === '23505') throw new StoreError('conflict');
      if (code === 'P0001') throw new StoreError('locked');
      throw new StoreError('store_error', 'http_' + res.status + (code ? '_' + code : ''));
    }
    if (res.status === 204) return null;
    const text = await res.text();
    if (method === 'HEAD') return res;
    return text ? JSON.parse(text) : null;
  }
  function qs(table, filters, o) {
    const parts = [];
    Object.keys(filters || {}).forEach(function (c) {
      if (!/^[a-z_][a-z0-9_]*$/.test(c)) throw new StoreError('store_error', 'bad column');
      const p = filterParam(c, filters[c]);
      parts.push(p[0] + '=' + encodeValue(p[1]));
    });
    if (o && o.select) parts.push('select=' + encodeValue(o.select));
    if (o && o.order && o.order.length) parts.push('order=' + o.order.map(function (x) { return encodeValue(x); }).join(','));
    if (o && o.limit) parts.push('limit=' + (parseInt(o.limit, 10) || 1));
    if (o && o.offset) parts.push('offset=' + (parseInt(o.offset, 10) || 0));
    return table + (parts.length ? '?' + parts.join('&') : '');
  }
  function checkTable(t) { if (TABLES.indexOf(t) === -1) throw new StoreError('store_error', 'bad table'); }
  return {
    kind: 'supabase',
    async insert(table, row) { checkTable(table); const r = await call('POST', table, row, { Prefer: 'return=representation' }); return Array.isArray(r) ? r[0] : r; },
    async select(table, filters, o) { checkTable(table); return (await call('GET', qs(table, filters, o))) || []; },
    async update(table, filters, patch) {
      checkTable(table);
      if (!filters || !Object.keys(filters).length) throw new StoreError('store_error', 'unfiltered update');
      return (await call('PATCH', qs(table, filters), patch, { Prefer: 'return=representation' })) || [];
    },
    async delete(table, filters) {
      checkTable(table);
      if (!filters || !Object.keys(filters).length) throw new StoreError('store_error', 'unfiltered delete');
      return (await call('DELETE', qs(table, filters), undefined, { Prefer: 'return=representation' })) || [];
    },
    async count(table, filters) {
      checkTable(table);
      const rows = await call('GET', qs(table, filters, { select: 'id', limit: 10000 }));
      return (rows || []).length;
    },
    async rpc(name, args) {
      if (!/^br_[a-z_]+$/.test(name)) throw new StoreError('store_error', 'bad rpc');
      return call('POST', 'rpc/' + name, args || {});
    }
  };
}

// ---------------------------------------------------------------- memory
const UNIQUES = {
  br_reviews: [['ref'], ['idempotency_key'], ['token_hash']],
  br_provider_calls: [['idempotency_key']],
  br_ai_runs: [['review_id', 'question_id', 'provider', 'tool', 'run_index']],
  br_report_versions: [['review_id', 'version']],
  br_automation_opportunities: [['review_id', 'task_text']],
  br_prospects: [['review_id']],
  br_deliveries: [['review_id', 'report_version_id', 'to_email_hash']],
  br_rate_limits: [['bucket']],
  br_budget: [['day', 'provider']]
};
const REVIEW_CHILDREN = ['br_provider_calls', 'br_competitors', 'br_evidence', 'br_ai_runs', 'br_report_versions', 'br_automation_opportunities', 'br_prospects', 'br_deliveries'];

function clone(x) { return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }
function toNum(v) { if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v).getTime(); return v; }
function matches(row, filters) {
  return Object.keys(filters || {}).every(function (c) {
    const cond = filters[c];
    const v = row[c] === undefined ? null : row[c];
    if (cond === null) return v === null;
    if (typeof cond !== 'object' || Array.isArray(cond)) return v === cond;
    const k = Object.keys(cond)[0], x = cond[k];
    switch (k) {
      case 'gt': return v !== null && toNum(v) > toNum(x);
      case 'gte': return v !== null && toNum(v) >= toNum(x);
      case 'lt': return v !== null && toNum(v) < toNum(x);
      case 'lte': return v !== null && toNum(v) <= toNum(x);
      case 'neq': return v !== x;
      case 'is': return x === null ? v === null : v === x;
      case 'in': return x.indexOf(v) !== -1;
      case 'like': case 'ilike': return typeof v === 'string' && new RegExp('^' + String(x).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$', 'i').test(v);
      default: return false;
    }
  });
}
function sortRows(rows, order) {
  if (!order || !order.length) return rows;
  const specs = order.map(function (o) { const p = o.split('.'); return { c: p[0], d: p[1] === 'desc' ? -1 : 1 }; });
  return rows.slice().sort(function (a, b) {
    for (let i = 0; i < specs.length; i++) {
      const x = toNum(a[specs[i].c]), y = toNum(b[specs[i].c]);
      if (x === y) continue;
      if (x === undefined || x === null) return 1 * specs[i].d;
      if (y === undefined || y === null) return -1 * specs[i].d;
      return (x < y ? -1 : 1) * specs[i].d;
    }
    return 0;
  });
}

function createMemoryStore(options) {
  const o = options || {};
  const nowFn = o.now || function () { return new Date(); };
  const data = {};
  TABLES.forEach(function (t) { data[t] = []; });
  let seq = 0;
  const iso = function () { return nowFn().toISOString(); };

  function applyDefaults(table, row) {
    const r = clone(row);
    if (table !== 'br_rate_limits' && table !== 'br_budget' && table !== 'br_prospects' && table !== 'br_admin_log' && r.id === undefined) r.id = crypto.randomUUID();
    if (table === 'br_admin_log') { r.id = ++seq; r.at = r.at || iso(); r.detail = r.detail || {}; return r; }
    if (r.created_at === undefined && table !== 'br_rate_limits' && table !== 'br_budget') r.created_at = iso();
    const D = {
      br_reviews: { updated_at: iso(), status: 'awaiting_confirmation', completeness: 'pending', assessment_level: 'standard', location_kind: 'local', goals: [], inputs: {}, interpretation: {}, steps: [], attempt: 0, token_revoked: false, hold_for_approval: false, current_step: null, lease_owner: null, lease_until: null, error_code: null, confirmed_at: null, completed_at: null },
      br_provider_calls: { status: 'started', cost_pence: 0, review_id: null, http_status: null, error_code: null, finished_at: null, duration_ms: null, model_version: null, response: null, cache_expires_at: null, started_at: iso() },
      br_competitors: { relevance: {}, status: 'candidate', reviewed_by_owner: false, position: 0, rejected_reason: null, source_ref: null, data_expires_at: null, provider_call_id: null },
      br_evidence: { competitor_id: null, reason_code: null, value: null, method: {}, inputs: {}, limitations: [], provider_call_id: null, run_key: 'main', superseded_by: null },
      br_ai_runs: { status: 'planned', citations: [], search_queries: [], competitors_named: [], cost_pence: 0, error_code: null, answer_text: null, model_reported: null, ran_at: null, business_named: null, business_named_basis: null, sources_provided: null, provider_call_id: null, location_context: null },
      br_report_versions: { reason: 'initial', status: 'published', evidence_ids: [], approved_at: null, approved_note: null },
      br_automation_opportunities: {},
      br_prospects: { updated_at: iso(), requested_services: [], follow_up_consent: false, marketing_consent: false, status: 'new', discuss_keys: [], lead_id: null, workbook_id: null, contact_name: null, email: null, phone: null, message: null, consent_text_version: null, consent_at: null, needs: null, internal_notes: null, purge_after: null },
      br_deliveries: { purpose: 'report', status: 'queued', attempts: 0, resend_id: null, error_code: null, sent_at: null, report_version_id: null },
      leads: { handled: false, workbook_id: null, picks: {}, consent: false },
      br_rate_limits: {}, br_budget: { pence_used: 0, calls: 0 }
    }[table] || {};
    Object.keys(D).forEach(function (k) { if (r[k] === undefined) r[k] = clone(D[k]); });
    return r;
  }

  function checkConstraints(table, r) {
    if (table === 'br_evidence') {
      if (r.evidence_state !== 'not_tested' && r.evidence_state !== 'unavailable' && (r.value === null || r.value === undefined)) throw new StoreError('store_error', 'check_value');
      if (!/^[a-z0-9_.]{1,80}$/.test(r.metric_key || '')) throw new StoreError('store_error', 'check_metric');
      if (['verified_public_observation', 'verified_authenticated_account_data', 'customer_supplied', 'reasonable_inference', 'not_tested', 'unavailable'].indexOf(r.evidence_state) === -1) throw new StoreError('store_error', 'check_state');
    }
    if (table === 'br_deliveries' && r.purpose !== 'report') throw new StoreError('store_error', 'check_purpose');
    if (table === 'br_reviews' && (!r.business_name || r.business_name.length > 160)) throw new StoreError('store_error', 'check_name');
    if (table === 'br_reviews' && (r.token_hash === undefined || r.token_hash === null)) throw new StoreError('store_error', 'not_null');
    if (table === 'br_automation_opportunities' && (!r.task_text || r.task_text.length > 600)) throw new StoreError('store_error', 'check_task');
  }

  function uniqueConflict(table, r, ignoreRow) {
    const specs = (UNIQUES[table] || []).slice();
    for (let s = 0; s < specs.length; s++) {
      const cols = specs[s];
      if (cols.some(function (c) { return r[c] === null || r[c] === undefined; })) continue;
      const hit = data[table].some(function (x) { return x !== ignoreRow && cols.every(function (c) { return x[c] === r[c]; }); });
      if (hit) return true;
    }
    if (table === 'br_evidence' && r.superseded_by === null) {
      return data.br_evidence.some(function (x) { return x !== ignoreRow && x.superseded_by === null && x.review_id === r.review_id && (x.competitor_id || null) === (r.competitor_id || null) && x.metric_key === r.metric_key && x.run_key === r.run_key; });
    }
    return false;
  }

  function checkFk(table, r) {
    if (REVIEW_CHILDREN.concat(['br_admin_log']).indexOf(table) !== -1 && r.review_id && table !== 'br_admin_log' && !data.br_reviews.some(function (x) { return x.id === r.review_id; })) throw new StoreError('store_error', 'fk_review');
    if (table === 'br_evidence' && r.competitor_id && !data.br_competitors.some(function (x) { return x.id === r.competitor_id; })) throw new StoreError('store_error', 'fk_competitor');
    if (table === 'br_evidence' && r.superseded_by && !data.br_evidence.some(function (x) { return x.id === r.superseded_by; })) throw new StoreError('store_error', 'fk_superseded');
  }

  function lockCheck(table, old, next) {
    if (table === 'br_evidence') {
      const locked = ['id', 'review_id', 'competitor_id', 'metric_key', 'evidence_state', 'value', 'observed_at', 'source', 'method', 'inputs', 'run_key', 'category'];
      if (locked.some(function (c) { return JSON.stringify(old[c]) !== JSON.stringify(next[c]); })) throw new StoreError('locked', 'evidence');
    }
    if (table === 'br_report_versions') {
      if (['content', 'content_hash', 'version', 'review_id', 'evidence_ids'].some(function (c) { return JSON.stringify(old[c]) !== JSON.stringify(next[c]); })) throw new StoreError('locked', 'report');
    }
    if (table === 'br_ai_runs' && old.status === 'ok') {
      if (['answer_text', 'citations', 'question_text', 'model_reported', 'ran_at'].some(function (c) { return JSON.stringify(old[c]) !== JSON.stringify(next[c]); })) throw new StoreError('locked', 'ai_run');
    }
  }

  function cascadeDelete(reviewId) {
    REVIEW_CHILDREN.forEach(function (t) { data[t] = data[t].filter(function (x) { return x.review_id !== reviewId; }); });
    data.br_admin_log.forEach(function (x) { if (x.review_id === reviewId) x.review_id = null; });
  }

  const store = {
    kind: 'memory',
    _data: data,
    async insert(table, row) {
      if (!data[table]) throw new StoreError('store_error', 'bad table');
      const r = applyDefaults(table, row);
      checkConstraints(table, r);
      checkFk(table, r);
      if (uniqueConflict(table, r, null)) throw new StoreError('conflict');
      data[table].push(r);
      return clone(r);
    },
    async select(table, filters, opts) {
      if (!data[table]) throw new StoreError('store_error', 'bad table');
      let rows = data[table].filter(function (r) { return matches(r, filters); });
      rows = sortRows(rows, opts && opts.order);
      if (opts && opts.offset) rows = rows.slice(opts.offset);
      if (opts && opts.limit) rows = rows.slice(0, opts.limit);
      return clone(rows);
    },
    async update(table, filters, patch) {
      if (!data[table]) throw new StoreError('store_error', 'bad table');
      if (!filters || !Object.keys(filters).length) throw new StoreError('store_error', 'unfiltered update');
      const hits = data[table].filter(function (r) { return matches(r, filters); });
      const out = [];
      for (let i = 0; i < hits.length; i++) {
        const next = Object.assign({}, hits[i], clone(patch));
        if (table === 'br_reviews' || table === 'br_prospects') next.updated_at = iso();
        lockCheck(table, hits[i], next);
        if (uniqueConflict(table, next, hits[i])) throw new StoreError('conflict');
        Object.assign(hits[i], next);
        out.push(clone(hits[i]));
      }
      return out;
    },
    async delete(table, filters) {
      if (!data[table]) throw new StoreError('store_error', 'bad table');
      if (!filters || !Object.keys(filters).length) throw new StoreError('store_error', 'unfiltered delete');
      const hits = data[table].filter(function (r) { return matches(r, filters); });
      if (['br_evidence', 'br_report_versions', 'br_ai_runs'].indexOf(table) !== -1 && hits.length) throw new StoreError('locked', 'append_only');
      data[table] = data[table].filter(function (r) { return hits.indexOf(r) === -1; });
      if (table === 'br_reviews') hits.forEach(function (h) { cascadeDelete(h.id); });
      return clone(hits);
    },
    async count(table, filters) { return data[table].filter(function (r) { return matches(r, filters); }).length; },
    async rpc(name, args) {
      const t = nowFn().getTime();
      if (name === 'br_rate_hit') {
        if (args.p_max < 1 || args.p_window_seconds < 1) throw new StoreError('store_error', 'bad limit');
        let r = data.br_rate_limits.find(function (x) { return x.bucket === args.p_bucket; });
        if (!r) { r = { bucket: args.p_bucket, window_start: nowFn().toISOString(), hits: 1 }; data.br_rate_limits.push(r); }
        else if (new Date(r.window_start).getTime() < t - args.p_window_seconds * 1000) { r.window_start = nowFn().toISOString(); r.hits = 1; }
        else r.hits += 1;
        const retry = Math.max(0, Math.ceil((new Date(r.window_start).getTime() + args.p_window_seconds * 1000 - t) / 1000));
        return { allowed: r.hits <= args.p_max, hits: r.hits, retry_after_s: retry };
      }
      if (name === 'br_budget_spend') {
        if (args.p_pence < 0 || args.p_daily_cap_pence <= 0 || args.p_pence > args.p_daily_cap_pence) return false;
        const day = nowFn().toISOString().slice(0, 10);
        let r = data.br_budget.find(function (x) { return x.day === day && x.provider === args.p_provider; });
        if (!r) { data.br_budget.push({ day: day, provider: args.p_provider, pence_used: args.p_pence, calls: 1 }); return true; }
        if (r.pence_used + args.p_pence > args.p_daily_cap_pence) return false;
        r.pence_used += args.p_pence; r.calls += 1;
        return true;
      }
      if (name === 'br_review_lease') {
        const r = data.br_reviews.find(function (x) { return x.id === args.p_id; });
        if (!r || (r.status !== 'queued' && r.status !== 'running') || new Date(r.token_expires_at).getTime() <= t) return false;
        if (r.lease_until && new Date(r.lease_until).getTime() >= t && r.lease_owner !== args.p_owner) return false;
        r.lease_owner = args.p_owner;
        r.lease_until = new Date(t + args.p_seconds * 1000).toISOString();
        if (r.status === 'queued') r.status = 'running';
        r.updated_at = iso();
        return true;
      }
      if (name === 'br_purge_expired') {
        let a = 0, b = 0, c = 0;
        data.br_reviews.forEach(function (r) { if (['ready', 'failed', 'awaiting_confirmation', 'queued', 'running'].indexOf(r.status) !== -1 && new Date(r.token_expires_at).getTime() < t) { r.status = 'expired'; a++; } });
        data.br_deliveries.forEach(function (d) { if (d.to_email && new Date(d.created_at).getTime() < t - 30 * 86400000) { d.to_email = null; b++; } });
        const doomed = data.br_reviews.filter(function (r) { return new Date(r.purge_after).getTime() < t && !data.br_prospects.some(function (p) { return p.review_id === r.id && p.status !== 'closed'; }); });
        doomed.forEach(function (r) { data.br_reviews = data.br_reviews.filter(function (x) { return x !== r; }); cascadeDelete(r.id); c++; });
        data.br_rate_limits = data.br_rate_limits.filter(function (x) { return new Date(x.window_start).getTime() >= t - 2 * 86400000; });
        return { expired: a, addresses_cleared: b, reviews_deleted: c };
      }
      throw new StoreError('store_error', 'unknown rpc');
    }
  };
  return store;
}

module.exports = { createSupabaseStore, createMemoryStore, StoreError, TABLES };
