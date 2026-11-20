'use strict';
/*
Business review: Google PageSpeed Insights API v5 provider.
Inputs : { url, strategy:'mobile' } and the PSI_API_KEY. Outputs: a trimmed Lighthouse summary and evidence drafts.
Rules  : the same settings for the business and every competitor (mobile, four categories, en-GB, one run); without a key the provider
         is not_configured and the shared anonymous pool is never called; the key is only sent as a query parameter to Google and never
         stored, logged or returned; the full response (about 1 MB) is not stored, only the fields below.
Must not change: identical test settings across subjects; scores are Lighthouse scores, never ranking scores.
Not verified: Google's current quota and terms pages could not be read in this environment (DECISIONS 5a).
*/
const ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const CATEGORIES = ['performance', 'seo', 'accessibility', 'best-practices'];
const LOCALE = 'en-GB';
const COSTS = require('../costs');

function status(cfg) {
  if (!cfg.psi.enabled) return { state: 'disabled', reason: 'BR_PSI is off' };
  if (!cfg.psi.key) return { state: 'not_configured', reason: 'no PSI_API_KEY' };
  if (cfg.psi.dailyCalls <= 0) return { state: 'budget_exhausted', reason: 'daily call cap is 0' };
  return { state: 'available', reason: null };
}

function num(x) { return typeof x === 'number' && Number.isFinite(x) ? x : null; }

function trim(json) {
  const lr = json && json.lighthouseResult;
  if (!lr || typeof lr !== 'object') return null;
  const cats = lr.categories || {};
  const aud = lr.audits || {};
  const score = function (k) { const s = cats[k] && num(cats[k].score); return s === null ? null : Math.round(s * 100); };
  const av = function (k) { return aud[k] ? num(aud[k].numericValue) : null; };
  const cfgs = lr.configSettings || {};
  const le = json.loadingExperience;
  return {
    fetch_time: lr.fetchTime || null, lighthouse_version: lr.lighthouseVersion || null,
    requested_url: lr.requestedUrl || null, final_url: lr.finalUrl || lr.finalDisplayedUrl || null,
    config: { form_factor: cfgs.formFactor || null, throttling_method: cfgs.throttlingMethod || null, locale: cfgs.locale || null, emulated_form_factor: cfgs.emulatedFormFactor || null },
    scores: { performance: score('performance'), seo: score('seo'), accessibility: score('accessibility'), best_practices: score('best-practices') },
    metrics: { lcp_ms: av('largest-contentful-paint'), cls: av('cumulative-layout-shift'), tbt_ms: av('total-blocking-time'), fcp_ms: av('first-contentful-paint'), speed_index_ms: av('speed-index'), server_response_ms: av('server-response-time') },
    run_warnings: Array.isArray(lr.runWarnings) ? lr.runWarnings.slice(0, 5).map(function (w) { return String(w).slice(0, 200); }) : [],
    field_data: { available: !!(le && le.metrics && Object.keys(le.metrics).length), overall: le && le.overall_category ? String(le.overall_category) : null }
  };
}

async function run(request, ctx) {
  const key = ctx.cfg.psi.key;
  const u = new URL(ENDPOINT);
  u.searchParams.set('url', request.url);
  u.searchParams.set('strategy', request.strategy || 'mobile');
  CATEGORIES.forEach(function (c) { u.searchParams.append('category', c); });
  u.searchParams.set('locale', LOCALE);
  u.searchParams.set('key', key);
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, ctx.timeoutMs || 40000);
  let res;
  try { res = await ctx.fetchImpl(u.toString(), { method: 'GET', headers: { Accept: 'application/json' }, signal: controller.signal }); }
  catch (e) { return { ok: false, code: controller.signal.aborted ? 'timeout' : 'provider_error', retryable: false }; }
  finally { clearTimeout(timer); }
  if (res.status === 429) return { ok: false, code: 'rate_limited', retryable: false };
  if (res.status === 400 || res.status === 404) return { ok: false, code: 'provider_error', detail: 'psi_could_not_test_url', retryable: false };
  if (res.status === 401 || res.status === 403) return { ok: false, code: 'provider_error', detail: 'psi_key_rejected', retryable: false };
  if (!res.ok) return { ok: false, code: 'provider_error', detail: 'http_' + res.status, retryable: false };
  let json;
  try { json = await res.json(); } catch (e) { return { ok: false, code: 'provider_error', detail: 'bad_json', retryable: false }; }
  const data = trim(json);
  if (!data) return { ok: false, code: 'provider_error', detail: 'no_lighthouse_result', retryable: false };
  return { ok: true, data: data, cost_pence: COSTS.PSI_PENCE_PER_CALL, model_version: data.lighthouse_version };
}

const SCORE_KEYS = [['psi.mobile.performance_score', 'performance'], ['psi.mobile.seo_score', 'seo'], ['psi.mobile.accessibility_score', 'accessibility'], ['psi.mobile.best_practices_score', 'best_practices']];
const METRIC_KEYS = [['psi.mobile.lcp_ms', 'lcp_ms'], ['psi.mobile.cls', 'cls'], ['psi.mobile.tbt_ms', 'tbt_ms'], ['psi.mobile.fcp_ms', 'fcp_ms'], ['psi.mobile.speed_index_ms', 'speed_index_ms']];
const ALL_KEYS = SCORE_KEYS.map(function (x) { return x[0]; }).concat(METRIC_KEYS.map(function (x) { return x[0]; }), ['psi.field.available']);

// Evidence for a successful call. A missing individual value becomes unavailable, never a default.
function toDrafts(data, ctx) {
  const lv = data.lighthouse_version || 'unknown';
  const source = { kind: 'pagespeed_insights', name: 'Google PageSpeed Insights API v5 (Lighthouse ' + lv + ')', url: ctx.url, provider_call_id: ctx.providerCallId || null };
  const method = { summary: 'Lighthouse lab test, mobile, simulated throttling, run once', settings: { strategy: 'mobile', categories: CATEGORIES.slice(), locale: LOCALE, lighthouse_version: lv, form_factor: data.config.form_factor || 'mobile', throttling_method: data.config.throttling_method || null, runs_per_url: 1 } };
  const inputs = { requested_url: data.requested_url || ctx.url, final_url: data.final_url || null };
  const at = data.fetch_time || ctx.observedAt;
  const out = [];
  const mk = function (key, v) {
    const base = { metric_key: key, competitor_id: ctx.competitorId || null, observed_at: at, source: source, method: method, inputs: inputs, limitations: data.run_warnings.length ? ['Lighthouse reported run warnings: ' + data.run_warnings.join(' | ')] : [] };
    if (v === null || v === undefined) return Object.assign(base, { state: 'unavailable', reason_code: 'provider_error' });
    return Object.assign(base, { state: 'verified_public_observation', value: v });
  };
  SCORE_KEYS.forEach(function (p) { out.push(mk(p[0], data.scores[p[1]])); });
  METRIC_KEYS.forEach(function (p) { out.push(mk(p[0], data.metrics[p[1]])); });
  out.push(mk('psi.field.available', !!data.field_data.available));
  return out;
}

// Evidence when the test could not be run: states are honest about why. No value is ever stored.
function failureDrafts(code, ctx) {
  const notTested = code === 'not_configured' || code === 'disabled' || code === 'budget_exhausted';
  return ALL_KEYS.map(function (k) {
    return {
      metric_key: k, competitor_id: ctx.competitorId || null, state: notTested ? 'not_tested' : 'unavailable', reason_code: code,
      observed_at: ctx.observedAt, source: { kind: 'pagespeed_insights', name: 'Google PageSpeed Insights API v5', url: ctx.url, provider_call_id: ctx.providerCallId || null },
      method: { summary: 'Lighthouse lab test, mobile, simulated throttling, run once (not completed)', settings: { strategy: 'mobile', categories: CATEGORIES.slice(), locale: LOCALE } },
      inputs: { requested_url: ctx.url }, limitations: []
    };
  });
}

module.exports = { id: 'pagespeed', kind: 'pagespeed', label: 'Google PageSpeed Insights', status, run, trim, toDrafts, failureDrafts, ALL_KEYS, CATEGORIES, LOCALE };
