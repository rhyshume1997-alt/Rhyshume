/* Business review: turns API JSON (status, interpretation, report) into HTML strings.
   Inputs: objects shaped as in docs/business-review/CONTRACT.md (sections 3.2, 3.4, 5, 8, 9, 12).
   Outputs: HTML strings only. No DOM, no network, no storage. UMD: window.BRRender in the browser, require() in Node tests.
   Must not change:
   - every dynamic string goes through esc(); links go through safeHref() or safeRoute();
   - a comparison row is drawn only when the business or a competitor has recorded data for it (rowHasData);
   - the six evidence state labels are exact (EVIDENCE_LABELS);
   - nothing here invents a value, a score, a percentage or a causal claim; text that did not come from the API is fixed interface wording;
   - AI visibility is never shown as a percentage, and "Awaiting a supported test." is shown when no supported test ran. */
(function (root, factory) {
  var auto = (typeof module === 'object' && module.exports) ? require('./br-automation.js') : root.BRAutomation;
  if (typeof module === 'object' && module.exports) module.exports = factory(auto);
  else root.BRRender = factory(auto);
})(typeof self !== 'undefined' ? self : this, function (AUTO) {
  'use strict';

  // ---------------------------------------------------------------- basics

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  // Only plain http and https links to other sites. Anything else (javascript:, data:, relative) is dropped.
  function safeHref(u) {
    if (typeof u !== 'string') return '';
    var s = u.trim();
    return /^https?:\/\/[^\s<>"']+$/i.test(s) ? s : '';
  }
  function safeRoute(href, fallback) { return AUTO.safeRoute(href, fallback); }
  function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }
  function arr(x) { return Array.isArray(x) ? x : []; }
  function str(x) { return typeof x === 'string' ? x : ''; }

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function two(n) { return (n < 10 ? '0' : '') + n; }
  function formatDate(iso) {
    var d = new Date(iso);
    if (typeof iso !== 'string' || isNaN(d.getTime())) return '';
    return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
  }
  function formatDateTime(iso) {
    var d = new Date(iso);
    if (typeof iso !== 'string' || isNaN(d.getTime())) return '';
    return formatDate(iso) + ', ' + two(d.getUTCHours()) + ':' + two(d.getUTCMinutes()) + ' UTC';
  }

  // ---------------------------------------------------------------- evidence states

  var EVIDENCE_LABELS = {
    verified_public_observation: 'Verified public observation',
    verified_authenticated_account_data: 'Verified authenticated account data',
    customer_supplied: 'Customer supplied information',
    reasonable_inference: 'Reasonable inference',
    not_tested: 'Not tested',
    unavailable: 'Unavailable'
  };
  var EVIDENCE_MEANINGS = {
    verified_public_observation: 'Read or measured directly from public information. The source and date are recorded.',
    verified_authenticated_account_data: 'Taken from an account that its owner connected and authorised.',
    customer_supplied: 'Information you typed in. It has not been checked.',
    reasonable_inference: 'A judgement drawn from what was observed. It may be wrong, so it is labelled as an inference.',
    not_tested: 'No test was run for this measure.',
    unavailable: 'A test was expected but the data could not be obtained.'
  };
  var STATE_ORDER = ['verified_public_observation', 'verified_authenticated_account_data', 'customer_supplied', 'reasonable_inference', 'not_tested', 'unavailable'];

  // An unknown state is shown as Unavailable rather than guessed at.
  function evidenceLabel(state) { return EVIDENCE_LABELS[state] || EVIDENCE_LABELS.unavailable; }
  function stateKey(state) { return EVIDENCE_LABELS[state] ? state : 'unavailable'; }
  function badge(state) {
    var k = stateKey(state);
    return '<span class="br-state br-state--' + k + '">' + esc(EVIDENCE_LABELS[k]) + '</span>';
  }
  function legendHtml() {
    return '<dl class="br-legend">' + STATE_ORDER.map(function (k) {
      return '<div><dt>' + badge(k) + '</dt><dd>' + esc(EVIDENCE_MEANINGS[k]) + '</dd></div>';
    }).join('') + '</dl>';
  }

  // A cell counts as data only when its state is a measured or supplied one and it has something to show.
  function cellHasData(cell) {
    return !!cell && isObj(cell) && cell.evidence_state !== 'not_tested' && cell.evidence_state !== 'unavailable' &&
      !!EVIDENCE_LABELS[cell.evidence_state] && typeof cell.display === 'string' && cell.display.trim() !== '';
  }
  function rowHasData(row) {
    if (!isObj(row)) return false;
    return cellHasData(row.business) || arr(row.competitors).some(cellHasData);
  }

  // Wording that blames or credits a cause is not allowed in findings (CONTRACT section 9). If one slips in, it is not shown.
  var BANNED_PHRASES = [/stealing/i, /losing customers to/i, /because of/i, /more successful/i, /costing you/i, /guarantee/i];
  function hasBanned(text) { return BANNED_PHRASES.some(function (re) { return re.test(String(text || '')); }); }
  function safeFinding(text) {
    return hasBanned(text) ? 'See the figures for this measure.' : str(text);
  }

  // ---------------------------------------------------------------- reasons and labels

  var REASONS = {
    no_website: 'No website was entered, so this check was skipped.',
    not_run_in_free_review: 'Awaiting a supported test.',
    no_supported_source: 'No supported data source is connected for this check.',
    not_configured: 'This check is not switched on.',
    site_unreachable: 'The website could not be reached.',
    blocked_by_robots: 'The site asks automated tools not to read this page, so it was not checked.',
    timeout: 'The check took too long and was stopped.',
    budget_exhausted: 'A usage limit was reached, so this check did not run.'
  };
  function reasonText(code) { return REASONS[code] || ''; }

  var STEP_STATE_LABELS = { pending: 'Waiting', running: 'In progress', done: 'Done', skipped: 'Skipped', unavailable: 'Unavailable', failed: 'Could not complete' };
  var TERMINAL_STEP = { done: 1, skipped: 1, unavailable: 1, failed: 1 };

  var GOAL_LABELS = {
    more_enquiries: 'Get more enquiries', google_visibility: 'Improve Google visibility', ai_search_visibility: 'Understand AI search visibility',
    improve_website: 'Improve the website', automate_admin: 'Automate repetitive admin', quoting_followups: 'Improve quoting or follow ups', something_else: 'Something else'
  };
  var KIND_LABELS = { local: 'Local: customers come from my town or city', regional: 'Regional: customers come from across my region', national: 'National: customers come from across the UK' };
  var KIND_SHORT = { local: 'Local', regional: 'Regional', national: 'National' };

  // ---------------------------------------------------------------- progress

  function progressCounts(steps) {
    steps = arr(steps);
    var done = steps.filter(function (s) { return s && TERMINAL_STEP[s.state]; }).length;
    return { done: done, total: steps.length };
  }
  function stepsHtml(steps) {
    steps = arr(steps);
    return '<ol class="br-steps">' + steps.map(function (s) {
      if (!isObj(s)) return '';
      var state = STEP_STATE_LABELS[s.state] ? s.state : 'pending';
      var note = str(s.message) || reasonText(s.reason);
      return '<li class="br-step br-step--' + state + '" data-step="' + esc(s.key) + '">' +
        '<span class="br-step-mark" aria-hidden="true"></span>' +
        '<span class="br-step-body"><span class="br-step-label">' + esc(s.label) + '</span>' +
        '<span class="br-step-state">' + esc(STEP_STATE_LABELS[state]) + '</span>' +
        (note ? '<span class="br-step-note">' + esc(note) + '</span>' : '') + '</span></li>';
    }).join('') + '</ol>';
  }
  // What a screen reader hears when a step changes. Only real states from the API.
  function stepAnnouncement(step) {
    if (!isObj(step)) return '';
    var state = STEP_STATE_LABELS[step.state] ? step.state : 'pending';
    return str(step.label) + ': ' + STEP_STATE_LABELS[state].toLowerCase() + '.';
  }

  // ---------------------------------------------------------------- confirm step

  function interpretationHtml(interp) {
    if (!isObj(interp)) return '';
    var site = isObj(interp.website) ? interp.website : null;
    var loc = isObj(interp.location) ? interp.location : {};
    var siteHtml;
    if (!site || !site.url) {
      siteHtml = 'No website entered. You will get a shorter review based on what you told us.';
    } else if (site.reachable === false) {
      siteHtml = esc(site.url) + '<br><span class="br-warn">We could not read this address just now. You can continue, and the website checks will be recorded as unavailable.</span>';
    } else {
      siteHtml = esc(site.url) + (site.title ? '<br><span class="muted">Page title found: ' + esc(site.title) + '</span>' : '');
    }
    var items = arr(interp.assumptions);
    return '<dl class="br-facts br-confirm">' +
      '<div><dt>Business</dt><dd>' + esc(interp.business_name) +
        (site && site.detected_business_name && site.detected_business_name !== interp.business_name ? '<br><span class="muted">Name on the website: ' + esc(site.detected_business_name) + '</span>' : '') + '</dd></div>' +
      '<div><dt>Website</dt><dd>' + siteHtml + '</dd></div>' +
      '<div><dt>Location</dt><dd>' + esc(loc.text) + (KIND_SHORT[loc.kind] ? ' (' + esc(KIND_SHORT[loc.kind]) + ')' : '') + '</dd></div>' +
      '<div><dt>Type of business</dt><dd>' + esc(interp.category) + '</dd></div>' +
      '</dl>' +
      (interp.competition_scope_note ? '<p class="br-scope">' + esc(interp.competition_scope_note) + '</p>' : '') +
      (items.length ? '<ul class="br-assume">' + items.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>' : '');
  }

  // ---------------------------------------------------------------- evidence lookups

  function evidenceById(report) {
    var map = {};
    arr(report && report.evidence_index).forEach(function (e) { if (isObj(e) && e.id) map[e.id] = e; });
    return map;
  }
  function competitorNames(report) {
    var map = {};
    var c = isObj(report && report.competitors) ? report.competitors : {};
    arr(c.items).forEach(function (x) { if (isObj(x) && x.id) map[x.id] = str(x.name); });
    return map;
  }
  function selectedCompetitors(report) {
    var c = isObj(report && report.competitors) ? report.competitors : {};
    return arr(c.items).filter(function (x) { return isObj(x) && x.status === 'selected'; });
  }

  function valueText(v) {
    if (!isObj(v) || v.v === undefined || v.v === null) return '';
    if (v.type === 'boolean') return v.v ? 'Yes' : 'No';
    if (v.type === 'number') return String(v.v) + (v.unit ? ' ' + v.unit : '');
    if (v.type === 'list') return arr(v.v).map(String).join(', ');
    if (v.type === 'object') { try { return JSON.stringify(v.v); } catch (e) { return ''; } }
    return String(v.v);
  }

  // ---------------------------------------------------------------- the metric cell and the expandable detail

  function cellHtml(cell) {
    if (!isObj(cell)) return '<span class="br-none">Not tested</span>';
    if (!cellHasData(cell)) return badge(cell.evidence_state === 'unavailable' ? 'unavailable' : 'not_tested');
    return '<span class="br-val">' + esc(cell.display) + '</span>' + badge(cell.evidence_state);
  }

  function detailHtml(row, evidence, names) {
    var ev = [];
    if (isObj(row.business) && row.business.evidence_id && evidence[row.business.evidence_id]) ev.push({ who: 'Your business', e: evidence[row.business.evidence_id], cell: row.business });
    arr(row.competitors).forEach(function (c) {
      if (isObj(c) && c.evidence_id && evidence[c.evidence_id]) ev.push({ who: names[c.competitor_id] || 'Comparison business', e: evidence[c.evidence_id], cell: c });
    });
    var first = ev.length ? ev[0].e : null;
    var checked = str(row.what_checked) || (first && isObj(first.method) ? str(first.method.summary) : '') || str(row.label);
    var source = str(row.source) || (first && isObj(first.source) ? str(first.source.name) : '');
    var when = row.observed_at || (first && first.observed_at) || '';
    var lims = arr(row.limitations).slice();
    ev.forEach(function (x) { arr(x.e.limitations).forEach(function (l) { if (lims.indexOf(l) === -1) lims.push(l); }); });
    var states = [];
    [row.business].concat(arr(row.competitors)).forEach(function (c) { if (isObj(c) && c.evidence_state && states.indexOf(c.evidence_state) === -1) states.push(c.evidence_state); });
    return '<dl class="br-more">' +
      '<div><dt>What was checked</dt><dd>' + esc(checked) + '</dd></div>' +
      '<div><dt>Source</dt><dd>' + (source ? esc(source) : 'Not recorded') + '</dd></div>' +
      '<div><dt>When it was measured</dt><dd>' + (when ? esc(formatDateTime(when)) : 'Not recorded') + '</dd></div>' +
      '<div><dt>Evidence state</dt><dd>' + (states.length ? states.map(function (s) { return badge(s) + ' <span class="br-state-note">' + esc(EVIDENCE_MEANINGS[stateKey(s)]) + '</span>'; }).join('<br>') : badge('not_tested')) + '</dd></div>' +
      (str(row.what_it_means) ? '<div><dt>What it means</dt><dd>' + esc(row.what_it_means) + '</dd></div>' : '') +
      (str(row.could_improve) ? '<div><dt>What could reasonably improve</dt><dd>' + esc(row.could_improve) + '</dd></div>' : '') +
      '<div><dt>Limitations</dt><dd>' + (lims.length ? '<ul>' + lims.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>' : 'None recorded for this measure.') + '</dd></div>' +
      (ev.length && first && isObj(first.method) && first.method.summary && str(row.what_checked) ? '<div><dt>Method</dt><dd>' + esc(first.method.summary) + '</dd></div>' : '') +
      '</dl>';
  }

  var CHART_KEYS = ['psi.mobile.lcp_ms', 'psi.mobile.fcp_ms', 'psi.mobile.speed_index_ms', 'psi.mobile.tbt_ms', 'page.response_ms'];

  // ---------------------------------------------------------------- the comparison table

  function comparisonHtml(report, ctx) {
    var c = isObj(report && report.comparison) ? report.comparison : {};
    var rows = arr(c.rows).filter(rowHasData);
    var comps = selectedCompetitors(report);
    if (!rows.length) {
      return '<p class="br-empty">No side by side comparison could be made. A row is only shown when something was actually measured for your business or for a comparison business.' +
        (comps.length ? '' : ' No comparison business was measured in this review.') + '</p>';
    }
    var evidence = evidenceById(report), names = competitorNames(report);
    // The columns are the selected competitors that appear in the rows, in the order they first appear.
    var colIds = [];
    rows.forEach(function (r) { arr(r.competitors).forEach(function (x) { if (isObj(x) && x.competitor_id && colIds.indexOf(x.competitor_id) === -1) colIds.push(x.competitor_id); }); });
    var idp = esc(ctx.idPrefix);
    var head = '<tr><th scope="col">Measure</th><th scope="col">Your business</th>' +
      colIds.map(function (id) { return '<th scope="col">' + esc(names[id] || 'Comparison business') + '</th>'; }).join('') +
      '<th scope="col">Finding</th></tr>';
    var body = rows.map(function (r, i) {
      var id = idp + '-cmp-' + i;
      var cells = '<td data-label="Your business">' + cellHtml(r.business) + '</td>' + colIds.map(function (cid) {
        var m = arr(r.competitors).filter(function (x) { return isObj(x) && x.competitor_id === cid; })[0];
        return '<td data-label="' + esc(names[cid] || 'Comparison business') + '">' + cellHtml(m) + '</td>';
      }).join('');
      return '<tr class="br-row"><th scope="row"><span class="br-measure">' + esc(r.label) + '</span>' + toggleHtml(id, r.label) + '</th>' + cells +
        '<td data-label="Finding" class="br-finding">' + (r.finding ? esc(safeFinding(r.finding)) : '<span class="muted">No difference stated.</span>') + '</td></tr>' +
        '<tr class="br-detail" id="' + id + '" hidden><td colspan="' + (3 + colIds.length) + '">' + detailHtml(r, evidence, names) + '</td></tr>';
    }).join('');
    return chartHtml(rows, evidence, names, ctx) +
      '<div class="br-tablewrap"><table class="br-table br-table--cmp"><caption class="visually-hidden">Your business compared with ' + (colIds.length ? 'the comparison business' + (colIds.length > 1 ? 'es' : '') : 'no comparison business') + ', one measure per row</caption>' +
      '<thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';
  }

  function toggleHtml(id, label) {
    return '<button type="button" class="br-toggle" aria-expanded="false" aria-controls="' + esc(id) + '">Show details<span class="visually-hidden"> for ' + esc(label) + '</span></button>';
  }

  // A bar chart only for measured times of the business and at least one comparison business, from recorded numbers.
  function chartHtml(rows, evidence, names, ctx) {
    var pick = null, pickIdx = 99;
    rows.forEach(function (r) {
      var k = CHART_KEYS.indexOf(r.metric_key);
      if (k === -1 || k >= pickIdx) return;
      var series = [];
      var bev = isObj(r.business) ? evidence[r.business.evidence_id] : null;
      if (bev && cellHasData(r.business) && isObj(bev.value) && bev.value.type === 'number' && bev.value.unit === 'ms' && typeof bev.value.v === 'number') {
        series.push({ who: 'Your business', ms: bev.value.v, display: r.business.display });
      }
      arr(r.competitors).forEach(function (c) {
        var ev = isObj(c) ? evidence[c.evidence_id] : null;
        if (ev && cellHasData(c) && isObj(ev.value) && ev.value.type === 'number' && ev.value.unit === 'ms' && typeof ev.value.v === 'number') {
          series.push({ who: names[c.competitor_id] || 'Comparison business', ms: ev.value.v, display: c.display });
        }
      });
      if (series.length >= 2 && series[0].who === 'Your business') { pick = { row: r, series: series }; pickIdx = k; }
    });
    if (!pick) return '';
    var max = Math.max.apply(null, pick.series.map(function (s) { return s.ms; }));
    if (!(max > 0)) return '';
    return '<figure class="br-chart"><figcaption><strong>' + esc(pick.row.label) + '</strong><br><span class="muted">One test per home page' +
      (pick.row.observed_at ? ', recorded ' + esc(formatDate(pick.row.observed_at)) : '') + '. Shorter is faster. A single lab test, so it varies from run to run.</span></figcaption>' +
      '<ul class="br-bars" role="list">' + pick.series.map(function (s) {
        var w = Math.max(2, Math.round((s.ms / max) * 100));
        return '<li><span class="br-bar-who">' + esc(s.who) + '</span><span class="br-bar" aria-hidden="true"><span style="width:' + w + '%"></span></span><span class="br-bar-val">' + esc(s.display) + '</span></li>';
      }).join('') + '</ul></figure>';
  }

  // ---------------------------------------------------------------- technical checks (one result per measure)

  function technicalHtml(report, ctx) {
    var t = isObj(report && report.technical) ? report.technical : {};
    var groups = arr(t.groups).filter(function (g) { return isObj(g) && arr(g.rows).length; });
    if (!groups.length) {
      return '<p class="br-empty">No checks of your own website are listed. ' +
        (isObj(report && report.business) && report.business.assessment_level === 'reduced' ? 'No website was entered, so this is a shorter review based on what you told us.' : 'Nothing was recorded for this section.') + '</p>';
    }
    var evidence = evidenceById(report), names = competitorNames(report), n = 0;
    return groups.map(function (g) {
      var rows = arr(g.rows).filter(function (r) { return isObj(r) && isObj(r.business); }).map(function (r) {
        var id = esc(ctx.idPrefix) + '-tech-' + (n++);
        var asRow = { label: r.label, what_checked: r.what_checked, business: r.business, competitors: [], source: r.source, observed_at: r.observed_at, what_it_means: r.what_it_means, could_improve: r.could_improve, limitations: r.limitations };
        return '<tr class="br-row"><th scope="row"><span class="br-measure">' + esc(r.label) + '</span>' + toggleHtml(id, r.label) + '</th>' +
          '<td data-label="Result">' + cellHtml(r.business) + '</td></tr>' +
          '<tr class="br-detail" id="' + id + '" hidden><td colspan="2">' + detailHtml(asRow, evidence, names) + '</td></tr>';
      }).join('');
      return '<h4 class="br-group">' + esc(g.label) + '</h4><div class="br-tablewrap"><table class="br-table br-table--tech"><caption class="visually-hidden">' + esc(g.label) + ': checks of your website</caption>' +
        '<thead><tr><th scope="col">Check</th><th scope="col">Result</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    }).join('');
  }

  // ---------------------------------------------------------------- competitors

  var ORIGIN_LABELS = { google_places: 'Found through a business search source', osm: 'Found through an open map source', visitor_nominated: 'Named by you', owner_added: 'Added after review by Rhys Hume' };
  var COMP_STATE_TEXT = {
    discovered: 'These businesses were chosen from a supported source and checked the same way as yours.',
    nominated: 'Only the business you named is compared. No supported source for finding other comparison businesses was available.',
    none_available: 'Finding comparison businesses was not available for this review, so no comparison business was measured. You can name one and the review will compare it.',
    unavailable: 'Finding comparison businesses was not available for this review, so no comparison business was measured. You can name one and the review will compare it.',
    owner_selected: 'These comparison businesses were checked and selected by Rhys Hume.'
  };
  function competitorsHtml(report, ctx) {
    var c = isObj(report && report.competitors) ? report.competitors : {};
    var items = selectedCompetitors(report);
    var state = COMP_STATE_TEXT[c.state] ? c.state : 'unavailable';
    var note = str(c.selection_note);
    var out = '<p class="br-lede">' + esc(note || COMP_STATE_TEXT[state]) + '</p>';
    if ((state === 'none_available' || state === 'unavailable') && note && note !== COMP_STATE_TEXT[state]) out += '<p>' + esc(COMP_STATE_TEXT[state]) + '</p>';
    if (items.length) {
      out += '<ul class="br-comps">' + items.map(function (x) {
        var link = safeHref(x.website_url);
        var rel = isObj(x.relevance) ? x.relevance : {};
        return '<li><strong>' + esc(x.name) + '</strong>' +
          (link ? ' <a href="' + esc(link) + '" rel="noopener nofollow noreferrer" target="_blank">' + esc(x.website_host || link) + '<span class="visually-hidden"> (opens in a new tab)</span></a>' : '') +
          '<br><span class="muted">' + esc(ORIGIN_LABELS[x.origin] || 'Source not recorded') +
          (x.collected_at ? ', recorded ' + esc(formatDate(x.collected_at)) : '') + '.</span>' +
          (rel.note ? '<br><span class="muted">' + esc(rel.note) + '</span>' : '') +
          (x.attribution ? '<br><span class="muted">' + esc(x.attribution) + '</span>' : '') + '</li>';
      }).join('') + '</ul>';
    }
    var lims = arr(c.limitations);
    if (lims.length) out += '<ul class="br-limits">' + lims.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>';
    return out;
  }

  // ---------------------------------------------------------------- local search and AI visibility

  function localSearchHtml(report, ctx) {
    var l = isObj(report && report.local_search) ? report.local_search : {};
    var rows = arr(l.rows).filter(function (r) { return isObj(r) && cellHasData(r.business); });
    if (l.state === 'not_tested' || l.state === 'unavailable' || !rows.length) {
      var why = reasonText(l.reason_code) || '';
      return '<p class="br-status-line">' + badge(l.state === 'unavailable' ? 'unavailable' : 'not_tested') + ' <strong>Not tested, no supported source.</strong></p>' +
        '<p>' + esc(str(l.note) || 'Google Maps position, profile details and reviews were not measured because no supported data source is connected.') + '</p>' +
        (why && l.note !== why ? '<p class="muted">' + esc(why) + '</p>' : '') +
        '<p class="muted">Nothing here is a guess. A ranking is not shown unless it was measured by a supported source.</p>';
    }
    var evidence = evidenceById(report), names = competitorNames(report);
    var n = 0;
    return '<div class="br-tablewrap"><table class="br-table br-table--tech"><caption class="visually-hidden">Local search checks</caption><thead><tr><th scope="col">Check</th><th scope="col">Result</th></tr></thead><tbody>' +
      rows.map(function (r) {
        var id = esc(ctx.idPrefix) + '-loc-' + (n++);
        return '<tr class="br-row"><th scope="row"><span class="br-measure">' + esc(r.label) + '</span>' + toggleHtml(id, r.label) + '</th><td data-label="Result">' + cellHtml(r.business) + '</td></tr>' +
          '<tr class="br-detail" id="' + id + '" hidden><td colspan="2">' + detailHtml(r, evidence, names) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function ofRuns(n, total) {
    if (typeof n !== 'number' || typeof total !== 'number') return '';
    return n + ' of ' + total + ' ' + (total === 1 ? 'run' : 'runs');
  }
  function aiVisibilityHtml(report) {
    var a = isObj(report && report.ai_visibility) ? report.ai_visibility : {};
    var summary = arr(a.summary).filter(isObj);
    if (a.state === 'awaiting_supported_test' || (!summary.length && a.state !== 'complete' && a.state !== 'partial')) {
      return '<p class="br-status-line">' + badge('not_tested') + ' <strong>Awaiting a supported test.</strong></p>' +
        '<p>' + esc(str(a.note) && a.note !== 'Awaiting a supported test.' ? a.note : 'AI search answers change from run to run and from tool to tool, so no result is shown until a supported test has been run and recorded. A plain AI chat reply is not a live web search result, and nothing here is taken from a model’s own memory.') + '</p>';
    }
    if (a.state === 'unavailable' && !summary.length) {
      return '<p class="br-status-line">' + badge('unavailable') + ' <strong>Unavailable.</strong></p><p>' + esc(str(a.note) || 'The AI search test could not be completed, so nothing is shown.') + '</p>';
    }
    return '<p class="br-lede">' + esc(str(a.note) || 'Each question was asked in more than one run. Counts below are runs, not percentages, and answers vary.') + '</p>' +
      summary.map(function (s) {
        var comps = arr(s.competitors_named).filter(isObj);
        return '<article class="br-ai"><h4>' + esc(s.question_text) + '</h4>' +
          '<p class="muted">Tool: ' + esc(s.provider || s.tool || 'not recorded') + '. Completed runs: ' + esc(ofRuns(s.runs_ok, s.runs_total)) + '.</p>' +
          '<ul><li>Your business was named in ' + esc(ofRuns(s.business_named_in_runs, s.runs_ok)) + '.</li>' +
          '<li>Sources were shown in ' + esc(ofRuns(s.sources_in_runs, s.runs_ok)) + '.</li>' +
          (comps.length ? '<li>Other businesses named: ' + comps.map(function (c) { return esc(c.name) + ' (' + esc(ofRuns(c.in_runs, s.runs_ok)) + ')'; }).join(', ') + '.</li>' : '<li>No other businesses were named.</li>') + '</ul></article>';
      }).join('');
  }

  // ---------------------------------------------------------------- recommendations

  var TIER_LABELS = { high: 'Higher priority', medium: 'Medium priority', low: 'Lower priority' };
  var TYPE_LABELS = { technical_issue: 'Technical issue', commercial_hypothesis: 'Commercial hypothesis (an inference, not a measurement)', opportunity: 'Opportunity' };

  // The five contextual calls to action. The route comes from the fixed list; the label follows the service.
  var SERVICE_CTA = {
    websites: { label: 'See a free website preview', href: '/contact' },
    seo: { label: 'Explore SEO support', href: '/seo-and-ai-visibility' },
    ai_visibility: { label: 'Explore SEO support', href: '/seo-and-ai-visibility' },
    automation: { label: 'Discuss an automation', href: '/automation' },
    engineering: { label: 'Talk about an engineering system', href: '/engineering' },
    care_plan: { label: 'Discuss my results', href: '/contact?from=business-review' },
    none: { label: 'Discuss my results', href: '/contact?from=business-review' }
  };
  function ctaFor(serviceKey) { return SERVICE_CTA[serviceKey] || SERVICE_CTA.none; }

  function recommendationsHtml(report, ctx) {
    var recs = arr(report && report.recommendations).filter(isObj).slice().sort(function (a, b) {
      var ra = isObj(a.priority) ? a.priority.rank : 99, rb = isObj(b.priority) ? b.priority.rank : 99;
      return ra - rb;
    });
    if (!recs.length) return '<p class="br-empty">No recommendations were produced from the data recorded in this review.</p>';
    var evidence = evidenceById(report);
    return recs.map(function (r, i) {
      var id = esc(ctx.idPrefix) + '-rec-' + i;
      var p = isObj(r.priority) ? r.priority : {};
      var svc = isObj(r.service) ? r.service : {};
      var cta = ctaFor(svc.key);
      var states = [];
      arr(r.evidence_ids).forEach(function (eid) { var e = evidence[eid]; if (e && states.indexOf(e.evidence_state) === -1) states.push(e.evidence_state); });
      var checks = arr(r.check_before_implementation);
      return '<article class="br-rec" aria-labelledby="' + id + '-h">' +
        '<header><p class="br-rank" aria-hidden="true">' + esc(p.rank != null ? p.rank : i + 1) + '</p><div>' +
        '<h4 id="' + id + '-h">' + esc(r.title) + '</h4>' +
        '<p class="br-tags"><span class="br-type br-type--' + esc(r.issue_type) + '">' + esc(TYPE_LABELS[r.issue_type] || 'Opportunity') + '</span> ' +
        '<span class="br-tier br-tier--' + esc(p.tier) + '">' + esc(TIER_LABELS[p.tier] || 'Priority not rated') + '</span></p></div></header>' +
        '<dl class="br-five">' +
        '<div><dt>What was found</dt><dd>' + esc(r.found) + (states.length ? '<br>' + states.map(badge).join(' ') : '') + '</dd></div>' +
        '<div><dt>Why it may matter</dt><dd>' + esc(r.why_it_may_matter) + '</dd></div>' +
        '<div><dt>What could change</dt><dd>' + esc(r.what_could_change) + '</dd></div>' +
        '<div><dt>What to check first</dt><dd>' + (checks.length ? '<ul>' + checks.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>' : 'Nothing further recorded.') + '</dd></div>' +
        '<div><dt>Who could help</dt><dd>' + (svc.label ? esc(svc.label) : 'Not matched to a service') +
        '<p class="br-actions"><a class="btn btn-quiet" href="' + esc(safeRoute(cta.href, '/contact?from=business-review')) + '">' + esc(cta.label) + '</a></p></dd></div>' +
        '</dl>' +
        (isObj(p.basis) && p.basis.rule ? '<p class="br-hint">How this was ranked: ' + esc(p.basis.rule) + ' The order is for this report only. It is not a prediction of results.</p>' : '') +
        (arr(r.caveats).length ? '<ul class="br-limits">' + arr(r.caveats).map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>' : '') +
        '</article>';
    }).join('');
  }

  // ---------------------------------------------------------------- summary, method, disclaimers, evidence log

  function evidenceCounts(report) {
    var counts = { total: 0, measured: 0, notRun: 0 };
    arr(report && report.evidence_index).forEach(function (e) {
      if (!isObj(e)) return;
      counts.total++;
      if (e.evidence_state === 'not_tested' || e.evidence_state === 'unavailable') counts.notRun++;
      else counts.measured++;
    });
    return counts;
  }

  function summaryHtml(report) {
    var b = isObj(report && report.business) ? report.business : {};
    var findings = arr(report && report.key_findings).filter(isObj);
    var comps = selectedCompetitors(report);
    var counts = evidenceCounts(report);
    var loc = isObj(b.location) ? b.location : {};
    var out = '<dl class="br-facts">' +
      '<div><dt>Business</dt><dd>' + esc(b.name) + '</dd></div>' +
      '<div><dt>Location</dt><dd>' + esc(loc.text) + (KIND_SHORT[loc.kind] ? ' (' + esc(KIND_SHORT[loc.kind]) + ')' : '') + '</dd></div>' +
      '<div><dt>Type of business</dt><dd>' + esc(b.category) + '</dd></div>' +
      '<div><dt>Review date</dt><dd>' + esc(formatDate(b.review_date + 'T00:00:00Z') || b.review_date || formatDate(report && report.generated_at)) + '</dd></div>' +
      '<div><dt>Comparison businesses</dt><dd>' + comps.length + '</dd></div>' +
      (counts.total ? '<div><dt>Checks recorded</dt><dd>' + counts.measured + ' measured, ' + counts.notRun + ' not tested or unavailable</dd></div>' : '') +
      '</dl>';
    if (findings.length) {
      out += '<ul class="br-findings">' + findings.map(function (f) {
        return '<li>' + esc(safeFinding(f.text)) + ' ' + badge(f.evidence_state) + '</li>';
      }).join('') + '</ul>';
    } else {
      out += '<p class="br-empty">No headline finding was produced from the data recorded. The sections below show what was measured and what was not.</p>';
    }
    return out;
  }

  function methodologyHtml(report) {
    var m = isObj(report && report.methodology) ? report.methodology : {};
    var ts = isObj(m.test_settings) ? m.test_settings : {};
    var crawl = isObj(ts.crawl) ? ts.crawl : null, psi = isObj(ts.psi) ? ts.psi : null;
    var sources = arr(m.sources).filter(isObj);
    return (m.summary ? '<p>' + esc(m.summary) + '</p>' : '') +
      (sources.length ? '<h4>Sources and dates</h4><ul class="br-sources">' + sources.map(function (s) {
        return '<li>' + esc(s.name) + (s.collected_at ? ', collected ' + esc(formatDateTime(s.collected_at)) : '') + '</li>';
      }).join('') + '</ul>' : '<p class="muted">No sources are listed for this report.</p>') +
      ((crawl || psi) ? '<h4>Test settings</h4><ul>' +
        (crawl ? '<li>Reading public pages: identified as ' + esc(crawl.user_agent) + ', up to ' + esc(crawl.max_requests) + ' requests, robots rules ' + (crawl.robots_honoured ? 'honoured' : 'not honoured') + '.</li>' : '') +
        (psi ? '<li>Speed test: ' + esc(psi.strategy) + ' device, ' + esc(psi.runs_per_url) + ' run per page.</li>' : '') + '</ul>' : '') +
      (m.disclaimer ? '<p class="br-hint">' + esc(m.disclaimer) + '</p>' : '');
  }

  function disclaimersHtml(report) {
    var d = arr(report && report.disclaimers).filter(function (x) { return typeof x === 'string' && x; });
    if (!d.length) return '';
    return '<ul class="br-disclaimers">' + d.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
  }

  function evidenceLogHtml(report) {
    var list = arr(report && report.evidence_index).filter(isObj);
    if (!list.length) return '<p class="muted">No evidence records are attached to this report.</p>';
    var names = competitorNames(report);
    return '<div class="br-tablewrap"><table class="br-table br-table--log"><caption class="visually-hidden">Every recorded check with its source and date</caption>' +
      '<thead><tr><th scope="col">Check</th><th scope="col">Business</th><th scope="col">Result</th><th scope="col">Evidence state</th><th scope="col">Measured</th><th scope="col">Source</th></tr></thead><tbody>' +
      list.map(function (e) {
        var who = isObj(e.subject) && e.subject.kind === 'competitor' ? (names[e.subject.competitor_id] || 'Comparison business') : 'Your business';
        var val = valueText(e.value);
        var res = val ? esc(val) : (e.reason_code ? esc(reasonText(e.reason_code) || 'No value recorded') : 'No value recorded');
        return '<tr><th scope="row" data-label="Check">' + esc(e.label) + '</th><td data-label="Business">' + esc(who) + '</td><td data-label="Result">' + res + '</td><td data-label="Evidence state">' + badge(e.evidence_state) + '</td>' +
          '<td data-label="Measured">' + esc(formatDateTime(e.observed_at) || 'Not recorded') + '</td><td data-label="Source">' + esc(isObj(e.source) ? e.source.name : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function nextStepsHtml(report) {
    var steps = arr(report && report.next_steps).filter(isObj);
    if (!steps.length) return '';
    return '<p class="br-actions">' + steps.map(function (s, i) {
      return '<a class="btn' + (i ? ' btn-quiet' : '') + '" href="' + esc(safeRoute(s.href)) + '">' + esc(s.label) + '</a>';
    }).join(' ') + '</p>';
  }

  // ---------------------------------------------------------------- the whole report

  function noticeHtml(report) {
    var out = '';
    var r = isObj(report) ? report : {};
    if (r.completeness === 'partial') {
      out += '<div class="br-banner br-banner--partial" role="note"><strong>Partly complete.</strong> Some checks could not be completed or are not supported yet. Everything shown was recorded with its source and date. Items marked Not tested or Unavailable were not measured.</div>';
    }
    if (r.status === 'superseded') {
      out += '<div class="br-banner" role="note"><strong>An older version.</strong> A newer version of this report exists' + (r.superseded_by_version ? ' (version ' + esc(r.superseded_by_version) + ')' : '') + '.</div>';
    }
    out += '<p class="br-hint">' + (r.created_by === 'owner'
      ? 'Reviewed and revised by Rhys Hume.'
      : 'This is an automated review. It has not been checked by a person.') + ' Report reference ' + esc(r.review_ref) + ', version ' + esc(r.version) +
      (r.generated_at ? ', generated ' + esc(formatDateTime(r.generated_at)) : '') + '.</p>';
    return out;
  }

  function section(id, heading, body, extraClass) {
    return '<section class="br-sec' + (extraClass ? ' ' + extraClass : '') + '" id="' + id + '" aria-labelledby="' + id + '-h"><h3 id="' + id + '-h" tabindex="-1">' + heading + '</h3>' + body + '</section>';
  }

  /* opts: { idPrefix, view: 'page' | 'report', actionsHtml, automationFormHtml } */
  function reportHtml(report, opts) {
    opts = opts || {};
    if (!isObj(report)) return '';
    var ctx = { idPrefix: (opts.idPrefix || 'br') };
    var legend = '<details class="br-legend-wrap"><summary>What the labels mean</summary>' + legendHtml() + '</details><div class="br-legend-print"><h4>What the labels mean</h4>' + legendHtml() + '</div>';
    var opps = arr(report.automation && report.automation.opportunities);
    var parts = [];
    parts.push(noticeHtml(report));
    parts.push('<nav class="br-jump" aria-label="In this report"><ul>' +
      '<li><a href="#' + ctx.idPrefix + '-summary">What we found</a></li>' +
      '<li><a href="#' + ctx.idPrefix + '-compare">Comparison</a></li>' +
      '<li><a href="#' + ctx.idPrefix + '-recs">Opportunities</a></li>' +
      '<li><a href="#' + ctx.idPrefix + '-method">Sources and limits</a></li></ul>' +
      '<button type="button" class="btn btn-quiet br-expand-all" aria-pressed="false">Show all details</button></nav>');
    parts.push(section(ctx.idPrefix + '-summary', 'What we found', summaryHtml(report) + legend));
    parts.push(section(ctx.idPrefix + '-compare', 'Your business compared', comparisonHtml(report, ctx)));
    parts.push(section(ctx.idPrefix + '-tech', 'Checks of your own website', technicalHtml(report, ctx)));
    parts.push(section(ctx.idPrefix + '-comps', 'Comparison businesses', competitorsHtml(report, ctx) + (opts.competitorFormHtml && !selectedCompetitors(report).length ? opts.competitorFormHtml : '')));
    parts.push(section(ctx.idPrefix + '-local', 'Local search', localSearchHtml(report, ctx)));
    parts.push(section(ctx.idPrefix + '-ai', 'AI search visibility', aiVisibilityHtml(report)));
    parts.push(section(ctx.idPrefix + '-recs', 'Opportunities and what to do next', recommendationsHtml(report, ctx)));
    parts.push(section(ctx.idPrefix + '-auto', 'A potential automation',
      (opps.length ? AUTO.opportunitiesHtml(opps, { idPrefix: ctx.idPrefix + '-ao' }) : '<p class="br-empty">No automation idea has been added to this review. ' + (opts.automationFormHtml ? 'Describe one task below and a possible workflow will be added.' : '') + '</p>') +
      (opts.automationFormHtml || '')));
    parts.push(nextStepsHtml(report));
    if (opts.actionsHtml) parts.push(opts.actionsHtml);
    parts.push(section(ctx.idPrefix + '-method', 'How this was done, sources and limits', methodologyHtml(report) + disclaimersHtml(report)));
    if (opts.view === 'report') parts.push(section(ctx.idPrefix + '-log', 'Evidence log', evidenceLogHtml(report)));
    var changes = arr(report.changes_from_previous).filter(isObj);
    if (changes.length > 1) {
      parts.push('<section class="br-sec" aria-label="Version history"><h3>Version history</h3><ul>' + changes.map(function (c) { return '<li>Version ' + esc(c.version) + ': ' + esc(c.summary) + '</li>'; }).join('') + '</ul></section>');
    }
    return parts.join('\n');
  }

  // ---------------------------------------------------------------- errors

  var ERROR_TEXT = {
    validation_failed: 'Some details need another look.',
    url_not_allowed: 'That website address cannot be used. Please check it, or leave it empty if you do not have a website.',
    unresolvable: 'That website address could not be found. Please check the spelling, or leave it empty.',
    turnstile_failed: 'The security check did not pass. Please try again.',
    turnstile_unavailable: 'The security check is not available right now. Please try again shortly.',
    rate_limited: 'You have made a lot of requests. Please wait a moment and try again.',
    daily_limit: 'The free review has reached its limit for today. Please try again tomorrow, or get in touch.',
    not_found: 'We could not find this review. The link may be wrong, or the review may have been deleted.',
    expired: 'This review has expired and its details have been removed. You can start a new one.',
    wrong_state: 'That cannot be done at this stage of the review.',
    consent_required: 'Please tick the box to confirm the request.',
    delivery_not_configured: 'Emailing a copy is not switched on yet. You can print or save this page instead.',
    delivery_failed: 'The email could not be sent. You can print or save this page instead.',
    provider_unavailable: 'A service this check needs is not available right now.',
    internal: 'Something went wrong on our side. Your review is saved. Please try again.',
    network: 'We could not reach the server. Check your connection and try again.',
    timeout: 'This is taking longer than expected.'
  };
  function errorText(err) {
    if (!isObj(err)) return ERROR_TEXT.internal;
    return str(err.message) || ERROR_TEXT[err.code] || ERROR_TEXT.internal;
  }

  return {
    esc: esc, safeHref: safeHref, safeRoute: safeRoute, formatDate: formatDate, formatDateTime: formatDateTime,
    EVIDENCE_LABELS: EVIDENCE_LABELS, EVIDENCE_MEANINGS: EVIDENCE_MEANINGS, GOAL_LABELS: GOAL_LABELS, KIND_LABELS: KIND_LABELS, REASONS: REASONS,
    STEP_STATE_LABELS: STEP_STATE_LABELS, SERVICE_CTA: SERVICE_CTA, BANNED_PHRASES: BANNED_PHRASES, ERROR_TEXT: ERROR_TEXT,
    evidenceLabel: evidenceLabel, badge: badge, legendHtml: legendHtml, cellHasData: cellHasData, rowHasData: rowHasData, hasBanned: hasBanned,
    reasonText: reasonText, progressCounts: progressCounts, stepsHtml: stepsHtml, stepAnnouncement: stepAnnouncement,
    interpretationHtml: interpretationHtml, comparisonHtml: comparisonHtml, technicalHtml: technicalHtml, competitorsHtml: competitorsHtml,
    localSearchHtml: localSearchHtml, aiVisibilityHtml: aiVisibilityHtml, recommendationsHtml: recommendationsHtml, ctaFor: ctaFor,
    summaryHtml: summaryHtml, methodologyHtml: methodologyHtml, disclaimersHtml: disclaimersHtml, evidenceLogHtml: evidenceLogHtml,
    noticeHtml: noticeHtml, reportHtml: reportHtml, errorText: errorText, valueText: valueText
  };
});
