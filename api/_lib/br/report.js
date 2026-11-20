'use strict';
/*
Business review: report builder (CONTRACT section 9). Pure and deterministic: stored evidence in, report JSON out.
Inputs : { review row, evidence (API shaped, active rows), competitors, opportunities, aiRuns, questions, version, reason, createdBy,
           now, reportId, previous (earlier version summaries), overrides }.
Outputs: the report object. Nothing is fetched, no provider is called, no value is made up: every number shown is copied from an
         evidence row and cites its id.
Rules  : a comparison row exists only if the business or at least one selected competitor has a measured value; findings state the
         measured difference with its date and never a cause; contact details never appear; the same object feeds screen, print and email.
         content_hash covers everything except generated_at, report_id, version and changes_from_previous, so an unchanged evidence set
         yields the same hash and the caller creates no new version.
Must not change: the template wording that avoids causal claims (tests ban "stealing", "losing customers to", "because of",
         "more successful"), or the rule that unmeasured items are shown as Not tested or Unavailable.
*/
const crypto = require('node:crypto');
const { METRICS, GROUPS, displayValue, fmtDate } = require('./metrics');
const { EVIDENCE_LABELS, reasonMessage } = require('./labels');
const { generate, applyOverrides, SERVICES } = require('./recommendations');
const { stable } = require('./providers/index');
const { GENERATOR_VERSION, BOT_UA } = require('./config');
const aiv = require('./ai-visibility');

const MEASURED = ['verified_public_observation', 'verified_authenticated_account_data', 'customer_supplied', 'reasonable_inference'];
const isMeasured = function (e) { return !!e && MEASURED.indexOf(e.evidence_state) !== -1 && e.value !== null && e.value !== undefined; };

const COULD_IMPROVE = {
  speed: 'Smaller images, fewer render blocking scripts and better hosting can improve these measurements.',
  basics: 'Check your hosting and certificate settings.', search: 'Check the robots.txt and sitemap settings.',
  onpage: 'Check the page template and the settings of your website platform.', structured: 'Add or correct structured data that matches the page.',
  navigation: 'Review the main menu and fix links that do not work.', content: 'Make the ways to get in touch clear on every page.'
};

function display(e) {
  if (!e) return '';
  if (isMeasured(e)) return displayValue(e.metric_key, e.value);
  return EVIDENCE_LABELS[e.evidence_state];
}
function cell(e) {
  if (!e) return null;
  const c = { evidence_id: e.id, evidence_state: e.evidence_state, display: display(e) };
  if (!isMeasured(e)) { c.reason_code = e.reason_code || null; c.note = reasonMessage(e.reason_code); }
  return c;
}
function latest(rows, key, competitorId) {
  const l = rows.filter(function (r) { return r.metric_key === key && !r.superseded_by && (competitorId ? r.subject.kind === 'competitor' && r.subject.competitor_id === competitorId : r.subject.kind === 'business'); });
  return l.length ? l[l.length - 1] : null;
}

function compare(def, b, c) {
  // Returns 'better' | 'worse' | 'similar' | 'differs' | null from the competitor's point of view.
  const bv = b.value.v, cv = c.value.v;
  if (def.better === 'true') { if (bv === cv) return 'similar'; return cv === true ? 'better' : 'worse'; }
  if (typeof bv !== 'number' || typeof cv !== 'number') return null;
  const scale = def.unit === 'score' && def.better === 'higher' ? 5 : 0;
  if (scale) { if (Math.abs(cv - bv) < scale) return 'similar'; return cv > bv ? 'better' : 'worse'; }
  const rel = Math.abs(cv - bv) / Math.max(Math.abs(bv), 1e-9);
  if (def.unit === 'ms' && Math.abs(cv - bv) < 100) return 'similar';
  if (rel < 0.1 || (def.unit === 'score' && Math.abs(cv - bv) < 0.02)) return 'similar';
  if (def.better === 'lower') return cv < bv ? 'better' : 'worse';
  return cv > bv ? 'better' : 'worse';
}
function phrase(def, key, name, rel) {
  if (rel === 'similar') return name + ' was similar in this test.';
  if (def.better === 'true') return rel === 'better' ? name + ' has this and your site does not.' : name + ' does not have this and your site does.';
  if (def.unit === 'ms') return name + (rel === 'better' ? ' was faster in this test.' : ' was slower in this test.');
  if (key === 'psi.mobile.cls') return name + (rel === 'better' ? ' had less layout movement in this test.' : ' had more layout movement in this test.');
  return name + (rel === 'better' ? ' scored higher in this test.' : ' scored lower in this test.');
}

function build(input) {
  const rv = input.review;
  const now = input.now instanceof Date ? input.now : new Date(input.now || Date.now());
  const evidence = input.evidence.slice().sort(function (a, b) { return a.category < b.category ? -1 : a.category > b.category ? 1 : a.metric_key < b.metric_key ? -1 : a.metric_key > b.metric_key ? 1 : (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : (a.id < b.id ? -1 : 1)); });
  const selected = (input.competitors || []).filter(function (c) { return c.status === 'selected'; }).sort(function (a, b) { return a.position - b.position || (a.created_at < b.created_at ? -1 : 1); });
  const goals = rv.goals || [];
  const opportunities = (input.opportunities || []).map(function (o) { return o.detail; });
  const hasWebsite = !!rv.website_url;

  // ---- comparison rows
  const rows = [];
  if (selected.length) {
    Object.keys(METRICS).forEach(function (key) {
      const def = METRICS[key];
      if (!def.comparable) return;
      const b = latest(evidence, key, null);
      const cs = selected.map(function (c) { return { c: c, e: latest(evidence, key, c.id) }; }).filter(function (x) { return x.e; });
      const anyMeasured = isMeasured(b) || cs.some(function (x) { return isMeasured(x.e); });
      if (!anyMeasured) return;
      const sentences = [];
      cs.forEach(function (x) { if (isMeasured(b) && isMeasured(x.e)) { const rel = compare(def, b, x.e); if (rel) sentences.push(phrase(def, key, x.c.name, rel)); } });
      const first = [b].concat(cs.map(function (x) { return x.e; })).filter(Boolean)[0];
      rows.push({
        metric_key: key, label: def.label.replace(' (mobile lab test)', ' (mobile test)'), what_checked: def.label + ' for each home page, measured the same way.',
        business: cell(b), competitors: cs.map(function (x) { const k = cell(x.e); k.competitor_id = x.c.id; return k; }),
        finding: sentences.length ? sentences.join(' ') : 'Not enough measured values on both sides to compare.',
        source: first && first.source ? (first.source.kind === 'pagespeed_insights' ? 'Google PageSpeed Insights API v5' : first.source.name) : '', observed_at: (b || first).observed_at,
        what_it_means: def.what_it_means, could_improve: COULD_IMPROVE[def.group] || '', limitations: def.limitations.slice()
      });
    });
  }

  // ---- technical groups (the business only)
  const groups = [];
  GROUPS.forEach(function (g) {
    const grows = [];
    Object.keys(METRICS).forEach(function (key) {
      const def = METRICS[key];
      if (def.category !== 'technical' || def.group !== g.key) return;
      const e = latest(evidence, key, null);
      if (!e) return;
      const row = { metric_key: key, label: def.label, business: cell(e), what_it_means: def.what_it_means, limitations: (e.limitations || []).slice(), observed_at: e.observed_at };
      if (selected.length) row.competitors = selected.map(function (c) { const ce = latest(evidence, key, c.id); if (!ce) return null; const k = cell(ce); k.competitor_id = c.id; return k; }).filter(Boolean);
      grows.push(row);
    });
    if (grows.length) groups.push({ key: g.key, label: g.label, rows: grows });
  });

  // ---- recommendations
  let recs = generate({ evidence: evidence, goals: goals, opportunities: opportunities });
  if (input.overrides) recs = applyOverrides(recs, input.overrides);

  // ---- key findings
  const kf = [];
  const ordered = rows.slice().sort(function (x, y) { return (METRICS[x.metric_key].group === 'speed' ? 0 : 1) - (METRICS[y.metric_key].group === 'speed' ? 0 : 1) || (x.metric_key === 'psi.mobile.lcp_ms' ? -1 : y.metric_key === 'psi.mobile.lcp_ms' ? 1 : 0); });
  ordered.forEach(function (r) {
    if (kf.length >= 4 || !r.business || !isMeasured({ evidence_state: r.business.evidence_state, value: 1 })) return;
    selected.forEach(function (c) {
      if (kf.length >= 4) return;
      const def = METRICS[r.metric_key];
      const b = latest(evidence, r.metric_key, null), ce = latest(evidence, r.metric_key, c.id);
      if (!isMeasured(b) || !isMeasured(ce)) return;
      const rel = compare(def, b, ce);
      if (!rel || rel === 'similar') return;
      let text;
      const when = fmtDate(ce.observed_at);
      if (r.metric_key === 'psi.mobile.lcp_ms') text = c.name + (rel === 'better' ? ' loaded its home page faster' : ' loaded its home page slower') + ' in the mobile test recorded on ' + when + ' (' + displayValue(r.metric_key, ce.value) + ' against ' + displayValue(r.metric_key, b.value) + ' for your page).';
      else text = def.label + ': ' + c.name + ' recorded ' + displayValue(r.metric_key, ce.value) + ' against ' + displayValue(r.metric_key, b.value) + ' for your page in the check recorded on ' + when + '.';
      kf.push({ id: '', text: text, evidence_ids: [b.id, ce.id], evidence_state: 'verified_public_observation' });
    });
  });
  recs.filter(function (r) { return r.issue_type === 'technical_issue'; }).slice(0, 3).forEach(function (r) {
    const first = evidence.find(function (e) { return e.id === r.evidence_ids[0]; });
    kf.push({ id: '', text: r.found, evidence_ids: r.evidence_ids.slice(), evidence_state: first ? first.evidence_state : 'verified_public_observation' });
  });
  if (!hasWebsite) {
    const e = latest(evidence, 'page.status', null);
    if (e) kf.push({ id: '', text: 'No website address was supplied, so the website checks were not run.', evidence_ids: [e.id], evidence_state: e.evidence_state });
  }
  kf.forEach(function (k, i) { k.id = 'kf' + (i + 1); });

  // ---- competitors section
  const fromPlaces = selected.some(function (c) { return c.origin === 'google_places' || c.origin === 'osm'; });
  const compState = !selected.length ? (input.discoveryState === 'unavailable' ? 'unavailable' : 'none_available')
    : selected.some(function (c) { return c.origin === 'owner_added'; }) ? 'owner_selected' : fromPlaces ? 'discovered' : 'nominated';
  const compNote = {
    none_available: 'No supported business search source is switched on and no competitor was named, so no comparison is shown.',
    unavailable: 'The business search source could not be used for this review, so no comparison businesses were chosen.',
    nominated: 'No supported business search source is switched on, so only the competitor you named is compared.',
    discovered: 'Comparison businesses were chosen from a supported source using your category and location. They may not all be direct competitors.',
    owner_selected: 'Comparison businesses were reviewed and chosen by Rhys Hume.'
  }[compState];
  const compLimits = selected.length ? ['A higher or lower technical score does not show which business is more successful.', 'Information about other businesses comes from public sources and is limited to the measurements shown.'] : [];
  const items = selected.map(function (c) {
    return { id: c.id, review_id: c.review_id, name: c.name, website_url: c.website_url, website_host: c.website_host, origin: c.origin, source_ref: c.source_ref || null, collected_at: c.collected_at, status: c.status,
      relevance: c.relevance || {}, rejected_reason: null, reviewed_by_owner: !!c.reviewed_by_owner, position: c.position, attribution: c.origin === 'google_places' ? 'Business listing data: Google' : null, data_expires_at: c.data_expires_at || null };
  });

  // ---- sources and methodology
  const srcMap = {};
  evidence.forEach(function (e) {
    if (!e.source || !isMeasured(e)) return;
    const k = e.source.kind;
    const nm = k === 'own_fetch' ? 'Public pages fetched directly' : k === 'pagespeed_insights' ? 'Google PageSpeed Insights API v5' : k === 'customer_supplied' ? 'Information supplied by you' : e.source.name;
    if (!srcMap[k] || e.observed_at > srcMap[k].collected_at) srcMap[k] = { id: 'src-' + k.replace(/_/g, '-'), name: nm, kind: k, collected_at: e.observed_at };
  });
  const sources = Object.keys(srcMap).sort().map(function (k) { return srcMap[k]; });
  const hasPsi = !!srcMap.pagespeed_insights, hasFetch = !!srcMap.own_fetch;
  const summaryParts = [];
  if (hasFetch) summaryParts.push('Public pages were read once with a limited crawl.');
  else if (!hasWebsite) summaryParts.push('No website was given, so no public pages were read. This is a reduced review built from what you told us.');
  else summaryParts.push('Your public pages could not be read in this review.');
  if (hasPsi) summaryParts.push('Speed was measured with Google PageSpeed Insights (Lighthouse) on mobile.');
  summaryParts.push(selected.length ? 'Comparison businesses were chosen from the sources listed below.' : 'No comparison businesses are shown.');
  const settings = {};
  if (hasFetch) settings.crawl = { user_agent: 'RhysHumeReviewBot/1.0', max_requests: 25, robots_honoured: true };
  if (hasPsi) settings.psi = { strategy: 'mobile', categories: ['performance', 'seo', 'accessibility', 'best-practices'], runs_per_url: 1 };

  // ---- local search and ai visibility
  const localRows = evidence.filter(function (e) { return e.category === 'local' && e.subject.kind === 'business'; });
  const localMeasured = localRows.filter(isMeasured);
  const local = localMeasured.length
    ? { state: 'partial', reason_code: null, note: 'Some local listing details were measured from a supported source.', rows: localMeasured.map(function (e) { return { metric_key: e.metric_key, label: e.label, business: cell(e), observed_at: e.observed_at, source: e.source.name }; }) }
    : { state: 'not_tested', reason_code: (localRows[0] && localRows[0].reason_code) || 'no_supported_source', note: 'Google Maps ranking, profile and reviews were not measured because no supported data source is connected.', rows: [] };
  const ai = aiv.reportSection({ runs: input.aiRuns || [], questions: input.questions || [], evidence: evidence });

  // ---- next steps
  const nextSteps = [{ label: 'Discuss my results', href: '/contact?from=business-review', service_key: 'none' }];
  const seen = { 'none': true };
  recs.forEach(function (r) {
    if (nextSteps.length >= 5 || seen[r.service.key]) return;
    seen[r.service.key] = true;
    nextSteps.push({ label: r.service.cta.label, href: r.service.cta.href, service_key: r.service.key });
  });
  if (!hasWebsite) nextSteps.push({ label: 'See a free website preview', href: '/contact', service_key: 'websites' });

  const disclaimers = [
    'This is an automated review of public information on the date shown. It does not promise rankings, enquiries or returns.',
    'Nothing here is a quote. Any work is scoped and priced separately.',
    'Lighthouse scores are not Google ranking scores. AI tool answers vary between runs.'
  ];
  const prev = (input.previous || []).slice();
  const version = input.version || 1;
  const reasonSummary = { initial: 'Initial report.', competitors_changed: 'Comparison businesses changed; evidence and recommendations rebuilt.', ai_run_added: 'AI visibility results added.', owner_revision: 'Revised by Rhys Hume.', automation_added: 'Automation opportunity added.', regenerated: 'Rebuilt from the stored evidence.' }[input.reason || 'initial'] || 'Updated.';
  const changes = prev.concat([{ version: version, summary: reasonSummary }]);

  const report = {
    report_id: input.reportId, review_ref: rv.ref, version: version, status: 'published', created_by: input.createdBy || 'system', reason: input.reason || 'initial',
    generated_at: now.toISOString().replace(/\.\d{3}Z$/, 'Z'), generator_version: GENERATOR_VERSION, completeness: rv.completeness, expires_at: rv.token_expires_at ? new Date(rv.token_expires_at).toISOString().replace(/\.\d{3}Z$/, 'Z') : null,
    business: { name: rv.business_name, website: rv.website_url || null, location: { text: rv.location_text, kind: rv.location_kind }, category: rv.category, goals: goals.slice(), assessment_level: rv.assessment_level, review_date: (rv.confirmed_at || rv.created_at || now.toISOString()).slice(0, 10) },
    methodology: { summary: summaryParts.join(' '), sources: sources, test_settings: settings, disclaimer: 'Lighthouse scores are lab test results, not Google ranking scores.' },
    competitors: { state: compState, selection_note: compNote, items: items, limitations: compLimits },
    key_findings: kf, comparison: { rows: rows }, technical: { groups: groups }, local_search: local, ai_visibility: ai, recommendations: recs,
    automation: { opportunities: opportunities }, next_steps: nextSteps, disclaimers: disclaimers, changes_from_previous: changes,
    evidence_index: evidence.map(function (e) { const c = JSON.parse(JSON.stringify(e)); return c; })
  };
  if (input.overrides && Array.isArray(input.overrides.finding_notes)) report.owner_notes = input.overrides.finding_notes.filter(function (x) { return typeof x === 'string' && x.trim(); }).map(function (x) { return x.trim().slice(0, 600); }).slice(0, 10);
  return report;
}

function contentHash(report) {
  const c = Object.assign({}, report);
  delete c.generated_at; delete c.report_id; delete c.version; delete c.changes_from_previous; delete c.created_by; delete c.reason;
  return crypto.createHash('sha256').update(stable(c)).digest('hex');
}

module.exports = { build, contentHash, SERVICES };
