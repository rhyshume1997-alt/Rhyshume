/* Business review: the automation question and the opportunity card.
   Inputs: the eight example tasks (below), and an automation opportunity object from the API (CONTRACT section 12).
   Outputs: HTML strings (chips, task field, opportunity card). Pure functions, no network, no DOM access.
   Must not change: the card always says it is a potential workflow and not an existing implementation at the business,
   never shows a time or money saving, and says the free review includes no development. Every dynamic string goes through esc().
   UMD: works in the browser (window.BRAutomation) and in Node tests (require). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BRAutomation = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // The eight examples from the brief. `text` is what lands in the box when a chip is chosen; the server maps free text to a workflow.
  var TASKS = [
    { key: 'replying_to_enquiries', label: 'Replying to new enquiries', text: 'We spend too long replying to new enquiries' },
    { key: 'chasing_quotations', label: 'Chasing quotations', text: 'We send quotes but forget to chase them' },
    { key: 'following_up_customers', label: 'Following up potential customers', text: 'We forget to follow up potential customers' },
    { key: 'updating_customers', label: 'Updating customers on jobs', text: 'We spend time updating customers on their jobs' },
    { key: 'copying_to_spreadsheets', label: 'Copying information into spreadsheets', text: 'We copy information into spreadsheets by hand' },
    { key: 'preparing_reports', label: 'Preparing reports', text: 'We spend hours preparing reports' },
    { key: 'moving_between_systems', label: 'Moving information between systems', text: 'We move information between systems by hand' },
    { key: 'documents_and_approvals', label: 'Managing documents and approvals', text: 'We manage documents and approvals by email' }
  ];
  var MAX_TASK = 600;

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Only the existing routes the contract allows. Anything else becomes the contact route.
  var ALLOWED_HREFS = ['/contact?from=business-review', '/seo-and-ai-visibility', '/websites', '/automation', '/engineering', '/contact'];
  function safeRoute(href, fallback) {
    return ALLOWED_HREFS.indexOf(href) !== -1 ? href : (fallback || '/contact?from=business-review');
  }
  // Demo anchors on the demonstration page (WP-C): only these three exist.
  var DEMO_HREFS = ['/automation-demos#quote-follow-up', '/automation-demos#enquiry-to-job', '/automation-demos#document-approval'];

  function chipsHtml(idPrefix) {
    var p = esc(idPrefix || 'br-task');
    return '<ul class="br-chips" role="list" aria-label="Example tasks">' + TASKS.map(function (t) {
      return '<li><button type="button" class="br-chip" data-task="' + esc(t.key) + '" aria-pressed="false">' + esc(t.label) + '</button></li>';
    }).join('') + '</ul><span class="visually-hidden" id="' + p + '-chips-note">Choosing an example fills the box below. You can change the wording.</span>';
  }

  function taskFieldHtml(opts) {
    opts = opts || {};
    var id = esc(opts.id || 'br-task');
    return '<div class="field br-task-field">' +
      '<label for="' + id + '">What is one task your business spends too much time doing? <span class="opt">(optional)</span></label>' +
      chipsHtml(id) +
      '<textarea id="' + id + '" name="automation_task" rows="3" maxlength="' + MAX_TASK + '" aria-describedby="' + id + '-hint ' + id + '-chips-note"></textarea>' +
      '<p class="br-hint" id="' + id + '-hint">Pick an example or write your own. A few words is enough. This only shapes the ideas in your report. Nothing is built from it.</p>' +
      '</div>';
  }

  function listHtml(items, cls) {
    items = Array.isArray(items) ? items.filter(function (x) { return typeof x === 'string' && x; }) : [];
    if (!items.length) return '';
    return '<ul' + (cls ? ' class="' + esc(cls) + '"' : '') + '>' + items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
  }

  // The fixed statement. Used even if the API text is missing, so the card never omits it.
  var NOT_INCLUDED = 'This is a potential workflow, not an existing implementation at your business. The free review does not include development. Implementation is quoted separately.';

  function opportunityHtml(opp, opts) {
    opts = opts || {};
    if (!opp || typeof opp !== 'object') return '';
    var id = esc(opts.idPrefix || 'br-ao') + '-' + esc(opp.id || '0');
    var confidence = { high: 'Good match', medium: 'Fair match', low: 'Loose match' }[opp.confidence] || 'Match not rated';
    var demoHref = opp.demo && DEMO_HREFS.indexOf(opp.demo.href) !== -1 ? opp.demo.href : '';
    var cta = '<a class="btn" href="/automation">Discuss an automation</a>';
    var stages = Array.isArray(opp.stages) && opp.stages.length
      ? '<h4>How it could work</h4><ol class="br-stages">' + opp.stages.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' : '';
    return '<article class="br-ao" aria-labelledby="' + id + '-h">' +
      '<p class="br-eyebrow">Potential workflow</p>' +
      '<h3 id="' + id + '-h">' + esc(opp.workflow_title || 'A possible automation') + '</h3>' +
      (opp.task_text ? '<p class="br-ao-said">You said: <q>' + esc(opp.task_text) + '</q></p>' : '') +
      '<p class="br-ao-note" role="note"><strong>Not an existing implementation.</strong> ' + esc(opp.not_included || NOT_INCLUDED) + '</p>' +
      (opp.description ? '<p>' + esc(opp.description) + '</p>' : '') +
      stages +
      (Array.isArray(opp.integrations_likely_needed) && opp.integrations_likely_needed.length ? '<h4>What it would probably need to connect to</h4>' + listHtml(opp.integrations_likely_needed) : '') +
      (Array.isArray(opp.approval_points) && opp.approval_points.length ? '<h4>Where a person approves</h4>' + listHtml(opp.approval_points) : '') +
      (Array.isArray(opp.unknowns) && opp.unknowns.length ? '<h4>What is not known yet</h4>' + listHtml(opp.unknowns) : '') +
      (opp.legal_note ? '<p class="br-hint">' + esc(opp.legal_note) + '</p>' : '') +
      '<p class="br-hint">How closely this idea matches what you wrote: ' + esc(confidence) + '. This is an inference from your wording, not knowledge of your software or process. No time or money saving is claimed.</p>' +
      '<p class="br-actions">' + cta +
      (demoHref ? ' <a class="btn btn-quiet" href="' + esc(demoHref) + '">See a demonstration with made up data</a>' : '') + '</p>' +
      '</article>';
  }

  function opportunitiesHtml(list, opts) {
    list = Array.isArray(list) ? list : [];
    return list.map(function (o) { return opportunityHtml(o, opts); }).join('');
  }

  return {
    TASKS: TASKS, MAX_TASK: MAX_TASK, NOT_INCLUDED: NOT_INCLUDED, ALLOWED_HREFS: ALLOWED_HREFS, DEMO_HREFS: DEMO_HREFS,
    esc: esc, safeRoute: safeRoute, chipsHtml: chipsHtml, taskFieldHtml: taskFieldHtml, opportunityHtml: opportunityHtml, opportunitiesHtml: opportunitiesHtml
  };
});
