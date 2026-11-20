/* Business review: the form, the confirm step, the live steps and the results on /business-review.
   Inputs: what the visitor types, and the JSON API in docs/business-review/CONTRACT.md (start, confirm, advance, status, report).
   Outputs: window.BRFlow in the browser (and require() in Node tests for the pure parts: validation, request bodies, the state machine).
   Must not change:
   - the flow is: intake, confirm, running (advance loop), results. The page never shows analysis that the API did not return;
   - the step list only changes when the API reports a change; progress is steps finished out of steps listed, nothing estimated;
   - a second press on any submit does nothing while a request is running (idempotency key kept until the review is created);
   - timeouts, failures and partial results are shown as what they are, with a way to retry or to read what was verified;
   - no consent box is ticked by default and no email address is asked for before the results are shown. */
(function (root, factory) {
  var R = (typeof module === 'object' && module.exports) ? require('./br-render.js') : root.BRRender;
  var API = (typeof module === 'object' && module.exports) ? require('./br-report.js') : root.BRReport;
  var A = (typeof module === 'object' && module.exports) ? require('./br-automation.js') : root.BRAutomation;
  var flow = factory(R, API, A, root);
  if (typeof module === 'object' && module.exports) module.exports = flow;
  else root.BRFlow = flow;
})(typeof self !== 'undefined' ? self : this, function (R, API, A, root) {
  'use strict';

  var GOALS = ['more_enquiries', 'google_visibility', 'ai_search_visibility', 'improve_website', 'automate_admin', 'quoting_followups', 'something_else'];
  var KINDS = ['local', 'regional', 'national'];
  var MAX_ADVANCE = 40;      // the server allows 40 advance calls per review
  var MAX_NETWORK_TRIES = 3; // network or server errors in a row before the page stops and asks
  var MAX_BUSY_WAITS = 30;   // step_in_progress answers in a row before the page stops and asks
  var MIN_DELAY = 500, MAX_DELAY = 10000, DEFAULT_DELAY = 1500;

  // ---------------------------------------------------------------- pure: validation and request bodies

  function trim(x) { return String(x == null ? '' : x).trim(); }

  // Returns { field: message }. Empty object means valid. The server checks again; this is only to save a round trip.
  function validateIntake(v) {
    var e = {};
    if (!trim(v.business_name)) e.business_name = 'Please enter your business name.';
    else if (trim(v.business_name).length > 160) e.business_name = 'Please keep the business name under 160 characters.';
    var site = trim(v.website);
    if (!v.no_website && site) {
      if (site.length > 300) e.website = 'That address is too long.';
      else if (/\s/.test(site)) e.website = 'A website address has no spaces in it. Please check it, or tick the box if you do not have a website.';
    }
    if (!trim(v.location_text)) e.location_text = 'Please say which town, city or area your customers are in.';
    else if (trim(v.location_text).length > 160) e.location_text = 'Please keep this under 160 characters.';
    if (!trim(v.category)) e.category = 'Please say what kind of business this is.';
    else if (trim(v.category).length > 120) e.category = 'Please keep this under 120 characters.';
    var cn = trim(v.competitor_name), cw = trim(v.competitor_website);
    if ((cn && !cw) || (!cn && cw)) e.competitor_name = 'Please give both the name and the website of the business, or leave both empty.';
    else if (cn.length > 160 || cw.length > 300) e.competitor_name = 'That is too long.';
    if (trim(v.automation_task).length > A.MAX_TASK) e.automation_task = 'Please keep this under ' + A.MAX_TASK + ' characters.';
    return e;
  }

  function cleanGoals(goals) {
    var out = [];
    (Array.isArray(goals) ? goals : []).forEach(function (g) { if (GOALS.indexOf(g) !== -1 && out.indexOf(g) === -1) out.push(g); });
    return out;
  }

  function buildStartBody(v, turnstileToken) {
    var body = {
      business_name: trim(v.business_name),
      location: { text: trim(v.location_text), kind: KINDS.indexOf(v.location_kind) !== -1 ? v.location_kind : 'local' },
      category: trim(v.category),
      goals: cleanGoals(v.goals),
      turnstile_token: turnstileToken
    };
    if (!v.no_website && trim(v.website)) body.website = trim(v.website);
    return body;
  }

  // Sent at confirm: the visitor's edits (only what changed), the optional named business and the optional task.
  function buildConfirmBody(v, interp) {
    var body = { confirmed: true };
    var edits = {};
    if (interp) {
      if (trim(v.business_name) && trim(v.business_name) !== interp.business_name) edits.business_name = trim(v.business_name);
      if (trim(v.category) && trim(v.category) !== interp.category) edits.category = trim(v.category);
      var il = interp.location || {};
      if ((trim(v.location_text) && trim(v.location_text) !== il.text) || (v.location_kind && v.location_kind !== il.kind)) {
        edits.location = { text: trim(v.location_text) || il.text, kind: KINDS.indexOf(v.location_kind) !== -1 ? v.location_kind : (il.kind || 'local') };
      }
      var cur = interp.website && interp.website.input ? interp.website.input : '';
      if (!v.no_website && trim(v.website) && trim(v.website) !== cur && trim(v.website) !== (interp.website && interp.website.url)) edits.website = trim(v.website);
    }
    if (Object.keys(edits).length) body.edits = edits;
    if (trim(v.competitor_name) && trim(v.competitor_website)) body.competitor_nomination = { name: trim(v.competitor_name), website: trim(v.competitor_website) };
    if (trim(v.automation_task)) body.automation_task = trim(v.automation_task).slice(0, A.MAX_TASK);
    return body;
  }

  function nextDelay(status) {
    var n = status && typeof status.next_after_ms === 'number' ? status.next_after_ms : DEFAULT_DELAY;
    return Math.min(MAX_DELAY, Math.max(MIN_DELAY, n));
  }
  function busyDelay(err) {
    var n = err && typeof err.retry_after_ms === 'number' ? err.retry_after_ms : 2000;
    return Math.min(MAX_DELAY, Math.max(MIN_DELAY, n));
  }

  // ---------------------------------------------------------------- pure: the state machine

  /* phases: intake, starting, confirm, confirming, running, loading_report, results, stalled, failed, expired
     reduce(state, event) returns a new state. state.effect names the one thing the page should do next:
       { type: 'start' | 'confirm' | 'advance' | 'fetch_report', delay? }
     Events: submit, start_ok, start_err, confirm, confirm_ok, confirm_err, advance_ok, advance_err, report_ok, report_err,
             resume, show_partial, requeued, resume_status, restart */
  function initialState() {
    return { phase: 'intake', error: null, review: null, interpretation: null, status: null, steps: [], advanceCalls: 0, failures: 0, busyWaits: 0, report: null, effect: null, pending: null };
  }
  function copy(s, patch) {
    var o = {}; Object.keys(s).forEach(function (k) { o[k] = s[k]; });
    Object.keys(patch).forEach(function (k) { o[k] = patch[k]; });
    if (!('effect' in patch)) o.effect = null;
    return o;
  }

  function fromStatus(s, status) {
    // Decide what the page should do for a status object returned by confirm, advance or status.
    var st = status && status.review ? status.review.status : '';
    var base = { status: status, steps: (status && status.steps) || [], review: Object.assign({}, s.review || {}, status && status.review ? status.review : {}) };
    if (st === 'ready') return copy(s, Object.assign(base, { phase: 'loading_report', error: null, effect: { type: 'fetch_report' }, pending: 'report' }));
    if (st === 'expired') return copy(s, Object.assign(base, { phase: 'expired', error: { code: 'expired' } }));
    if (st === 'failed' || st === 'cancelled') return copy(s, Object.assign(base, { phase: 'failed', error: { code: st === 'cancelled' ? 'not_found' : 'internal' } }));
    if (st === 'awaiting_confirmation') return copy(s, Object.assign(base, { phase: 'confirm', error: null }));
    return copy(s, Object.assign(base, { phase: 'running', error: null, effect: { type: 'advance', delay: nextDelay(status) } }));
  }

  function reduce(s, ev) {
    switch (ev.type) {
      case 'submit':
        if (s.phase !== 'intake') return s; // duplicate press: nothing changes, no new effect
        return copy(s, { phase: 'starting', error: null, effect: { type: 'start' } });
      case 'start_ok':
        if (s.phase !== 'starting') return s;
        return copy(s, { phase: 'confirm', review: ev.review, interpretation: ev.interpretation, error: null });
      case 'start_err':
        if (s.phase !== 'starting') return s;
        return copy(s, { phase: 'intake', error: ev.error });
      case 'confirm':
        if (s.phase !== 'confirm') return s;
        return copy(s, { phase: 'confirming', error: null, effect: { type: 'confirm' } });
      case 'confirm_ok':
        if (s.phase !== 'confirming') return s;
        return copy(s, { phase: 'running', status: ev.status, steps: ev.status.steps || [], review: Object.assign({}, s.review, ev.status.review), advanceCalls: 0, failures: 0, busyWaits: 0, error: null, effect: { type: 'advance', delay: 0 } });
      case 'confirm_err':
        if (s.phase !== 'confirming') return s;
        if (ev.error.code === 'expired') return copy(s, { phase: 'expired', error: ev.error });
        if (ev.error.code === 'not_found') return copy(s, { phase: 'failed', error: ev.error });
        return copy(s, { phase: 'confirm', error: ev.error });
      case 'advance_ok':
        if (s.phase !== 'running') return s;
        var next = fromStatus(copy(s, { advanceCalls: s.advanceCalls + 1, failures: 0, busyWaits: 0 }), ev.status);
        if (next.phase === 'running' && next.advanceCalls >= MAX_ADVANCE) return copy(next, { phase: 'stalled', error: { code: 'timeout' }, effect: null });
        return next;
      case 'advance_err':
        if (s.phase !== 'running') return s;
        var c = ev.error.code;
        if (c === 'step_in_progress') {
          if (s.busyWaits + 1 >= MAX_BUSY_WAITS) return copy(s, { phase: 'stalled', error: { code: 'timeout' } });
          return copy(s, { busyWaits: s.busyWaits + 1, effect: { type: 'advance', delay: busyDelay(ev.error) } });
        }
        if (c === 'expired') return copy(s, { phase: 'expired', error: ev.error });
        if (c === 'not_found') return copy(s, { phase: 'failed', error: ev.error });
        if (c === 'rate_limited' || c === 'daily_limit') return copy(s, { phase: 'stalled', error: ev.error });
        if (c === 'wrong_state') return copy(s, { phase: 'failed', error: ev.error });
        // network, timeout, internal: the server keeps its progress, so a few quiet retries are safe.
        if (s.failures + 1 >= MAX_NETWORK_TRIES) return copy(s, { phase: 'stalled', error: ev.error, failures: s.failures + 1 });
        return copy(s, { failures: s.failures + 1, effect: { type: 'advance', delay: Math.min(8000, 1500 * (s.failures + 1)) } });
      case 'resume':
        if (s.phase !== 'stalled') return s;
        if (s.pending === 'report') return copy(s, { phase: 'loading_report', error: null, effect: { type: 'fetch_report' } });
        return copy(s, { phase: 'running', error: null, failures: 0, busyWaits: 0, advanceCalls: Math.min(s.advanceCalls, MAX_ADVANCE - 1), effect: { type: 'advance', delay: 0 } });
      case 'show_partial': // the visitor asks to see what was verified so far
        if (s.phase !== 'stalled' && s.phase !== 'failed') return s;
        if (!(s.status && s.status.report_available)) return s;
        return copy(s, { phase: 'loading_report', error: null, pending: 'report', effect: { type: 'fetch_report' } });
      case 'report_ok':
        if (s.phase !== 'loading_report' && s.phase !== 'results') return s;
        return copy(s, { phase: 'results', report: ev.report, error: null, pending: null });
      case 'report_err':
        if (s.phase !== 'loading_report' && s.phase !== 'results') return s;
        if (ev.error.code === 'expired') return copy(s, { phase: 'expired', error: ev.error });
        if (ev.error.code === 'not_found') return copy(s, { phase: 'failed', error: ev.error });
        if (s.phase === 'results') return copy(s, { error: ev.error });
        return copy(s, { phase: 'stalled', error: ev.error, pending: 'report' });
      case 'refresh_report':
        if (s.phase !== 'results') return s;
        return copy(s, { phase: 'loading_report', pending: 'report', effect: { type: 'fetch_report' } });
      case 'requeued': // a competitor was named after the results: the review runs again from the status returned
        if (s.phase !== 'results') return s;
        return fromStatus(copy(s, { report: null, advanceCalls: 0, failures: 0, busyWaits: 0 }), ev.status);
      case 'resume_status': // page reopened with a saved session
        if (s.phase !== 'intake') return s;
        return fromStatus(copy(s, { review: ev.status.review, advanceCalls: 0, failures: 0, busyWaits: 0, interpretation: interpFromStatus(ev.status.review) }), ev.status);
      case 'restart':
        return initialState();
      default:
        return s;
    }
  }

  // A status object has no page title or assumptions, so a resumed confirm step shows only what the status holds.
  function interpFromStatus(r) {
    r = r || {};
    return { business_name: r.business_name, website: r.website_url ? { input: r.website_url, url: r.website_url, reachable: null } : null, location: r.location, category: r.category, assumptions: [] };
  }

  // ---------------------------------------------------------------- browser driver

  function $(id) { return document.getElementById(id); }

  function start() {
    var app = $('br-app');
    if (!app) return;
    var reduceMotion = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var live = $('br-live');
    var S = initialState();
    var runId = 0;                   // bumped on restart so late replies from an old run are ignored
    var idemKey = API.uuid();        // kept until a review is created
    var session = null;              // { id, token, ref }
    var values = {};
    var turnstileStart = null;
    var shownPhase = null;
    var announced = {};

    var sections = { intake: $('br-step-intake'), confirm: $('br-step-confirm'), run: $('br-step-run'), results: $('br-step-results') };
    var stageItems = Array.prototype.slice.call(document.querySelectorAll('#br-stages li'));
    var PHASE_SECTION = { intake: 'intake', starting: 'intake', confirm: 'confirm', confirming: 'confirm', running: 'run', loading_report: 'run', stalled: 'run', failed: 'run', expired: 'run', results: 'results' };
    var PHASE_STAGE = { intake: 0, starting: 0, confirm: 1, confirming: 1, running: 2, loading_report: 2, stalled: 2, failed: 2, expired: 2, results: 3 };

    function say(text) { if (live && text) { live.textContent = ''; setTimeout(function () { live.textContent = text; }, 30); } }

    // ---- rendering

    function showError(boxId, html) {
      var box = $(boxId);
      if (!box) return;
      box.innerHTML = html || '';
      box.hidden = !html;
    }

    function render(prev) {
      var secKey = PHASE_SECTION[S.phase];
      Object.keys(sections).forEach(function (k) { sections[k].hidden = k !== secKey; });
      stageItems.forEach(function (li, i) {
        var cur = i === PHASE_STAGE[S.phase];
        if (cur) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
        li.classList.toggle('is-done', i < PHASE_STAGE[S.phase]);
      });

      // intake
      var submit = $('br-start-btn');
      var busy = S.phase === 'starting';
      submit.disabled = busy;
      submit.setAttribute('aria-disabled', String(busy));
      $('br-start-status').textContent = busy ? 'Checking the details you entered.' : '';
      if (S.phase === 'intake' && S.error) showError('br-intake-error', '<strong>' + R.esc(R.errorText(S.error)) + '</strong>' + fieldList(S.error));
      else if (S.phase === 'intake') showError('br-intake-error', '');

      // confirm
      if (S.phase === 'confirm' || S.phase === 'confirming') {
        $('br-interp').innerHTML = R.interpretationHtml(S.interpretation);
        var cb = $('br-confirm-btn'); cb.disabled = S.phase === 'confirming';
        $('br-confirm-status').textContent = S.phase === 'confirming' ? 'Saving your confirmation.' : '';
        showError('br-confirm-error', S.error ? '<strong>' + R.esc(R.errorText(S.error)) + '</strong>' + fieldList(S.error) : '');
      }

      // running and the problem states
      if (secKey === 'run') renderRun();
      if (S.phase === 'results') renderResults(prev);
    }

    function fieldList(err) {
      if (!err || !err.fields || typeof err.fields !== 'object') return '';
      var keys = Object.keys(err.fields);
      return keys.length ? '<ul>' + keys.map(function (k) { return '<li>' + R.esc(err.fields[k]) + '</li>'; }).join('') + '</ul>' : '';
    }

    function renderRun() {
      var name = S.review && S.review.business_name ? S.review.business_name : (S.interpretation && S.interpretation.business_name) || '';
      $('br-run-name').textContent = name ? 'Reviewing ' + name : 'Reviewing your business';
      $('br-steps').innerHTML = R.stepsHtml(S.steps);
      var c = R.progressCounts(S.steps);
      var p = $('br-progress');
      p.max = c.total || 1; p.value = c.done;
      $('br-progress-text').textContent = c.total ? c.done + ' of ' + c.total + ' checks finished' : 'Starting';
      var problem = $('br-run-problem');
      var phase = S.phase;
      if (phase === 'running' || phase === 'loading_report') {
        problem.hidden = true; problem.innerHTML = '';
        $('br-run-intro').hidden = false;
        $('br-run-intro').textContent = phase === 'loading_report' ? 'All checks have finished. Loading the report.' : 'Each line changes only when that check has really finished. This usually takes a minute or two.';
        return;
      }
      $('br-run-intro').hidden = true;
      var code = S.error && S.error.code;
      var html = '';
      if (phase === 'expired') {
        html = '<h3 tabindex="-1">This review has expired</h3><p>' + R.esc(R.ERROR_TEXT.expired) + '</p><p class="br-actions"><button type="button" class="btn" data-act="restart">Start a new review</button></p>';
      } else if (phase === 'failed') {
        html = '<h3 tabindex="-1">The review could not be completed</h3><p>' + R.esc(code === 'not_found' ? R.ERROR_TEXT.not_found : R.errorText(S.error && S.error.code === 'internal' ? { code: 'internal' } : S.error)) + '</p>' +
          '<p>Nothing has been made up to fill the gap. You can start again, or email <a href="mailto:rhys@rhyshume.co.uk">rhys@rhyshume.co.uk</a>.</p>' +
          '<p class="br-actions">' + (S.status && S.status.report_available ? '<button type="button" class="btn" data-act="partial">Show what was verified so far</button>' : '') + '<button type="button" class="btn btn-quiet" data-act="restart">Start again</button></p>';
      } else { // stalled
        var lead = code === 'timeout' ? 'This is taking longer than expected.' : code === 'network' ? 'We could not reach the server.' : code === 'rate_limited' || code === 'daily_limit' ? R.errorText(S.error) : 'Something went wrong while waiting for the next step.';
        html = '<h3 tabindex="-1">The review has paused</h3><p>' + R.esc(lead) + ' Your review is saved. The steps above show exactly where it got to.</p>' +
          '<p class="br-actions"><button type="button" class="btn" data-act="resume">Try again</button>' +
          (S.status && S.status.report_available ? '<button type="button" class="btn btn-quiet" data-act="partial">Show what was verified so far</button>' : '') +
          '<button type="button" class="btn btn-quiet" data-act="restart">Start again</button></p>';
      }
      problem.innerHTML = html; problem.hidden = false;
    }

    function renderResults(prev) {
      var box = $('br-report');
      var report = S.report;
      $('br-results-head').textContent = report && report.business ? 'Your review: ' + report.business.name : 'Your review';
      API.mountReport(box, report, {
        idPrefix: 'br', view: 'page',
        actionsHtml: API.actionsHtml({ printHref: API.reportLink(session.id, session.token) }),
        automationFormHtml: API.automationFormHtml(),
        competitorFormHtml: API.competitorFormHtml()
      });
      API.wireForms(box, {
        id: session.id, token: session.token, ref: session.ref,
        onReportChanged: function () { dispatch({ type: 'refresh_report' }); },
        onCompetitorNamed: function (status) { dispatch({ type: 'requeued', status: status }); },
        onDeleted: function (why) { goodbye(why); }
      });
      showError('br-results-error', S.error ? '<strong>' + R.esc(R.errorText(S.error)) + '</strong>' : '');
    }

    function goodbye(why) {
      API.clearSession();
      session = null;
      dispatch({ type: 'restart' });
      idemKey = API.uuid();
      say(why === 'deleted' ? 'Your review and details have been deleted.' : 'That review is no longer available.');
      var note = $('br-intake-note');
      note.textContent = why === 'deleted' ? 'Your review and details have been deleted. You can start a new review below.' : 'That review is no longer available. You can start a new one below.';
      note.hidden = false;
    }

    // ---- moving between phases

    function focusSection(key) {
      var h = sections[key].querySelector('h2');
      if (!h) return;
      h.setAttribute('tabindex', '-1');
      try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); }
      var top = sections[key].getBoundingClientRect().top + root.pageYOffset - 16;
      root.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? 'auto' : 'smooth' });
    }

    function dispatch(ev) {
      var prev = S;
      var next = reduce(S, ev);
      if (next === S) return;
      S = next;
      render(prev);
      var key = PHASE_SECTION[S.phase];
      var changedSection = shownPhase === null ? false : PHASE_SECTION[shownPhase] !== key;
      if (changedSection) focusSection(key);
      else if (shownPhase !== S.phase && (S.phase === 'stalled' || S.phase === 'failed' || S.phase === 'expired')) { var h3 = $('br-run-problem').querySelector('h3'); if (h3) h3.focus({ preventScroll: true }); }
      if (shownPhase !== S.phase) announcePhase(prev);
      shownPhase = S.phase;
      announceSteps(prev);
      var eff = S.effect;
      if (eff) { var id = runId; setTimeout(function () { if (id === runId) perform(eff); }, eff.type === 'advance' ? (eff.delay || 0) : 0); }
    }

    function announcePhase() {
      var msg = {
        confirm: 'Please check the details and confirm.', running: 'The review has started.', stalled: 'The review has paused.',
        failed: 'The review could not be completed.', expired: 'This review has expired.', results: 'Your results are ready.'
      }[S.phase];
      if (S.phase === 'results' && S.report && S.report.completeness === 'partial') msg = 'Your results are ready. Some checks could not be completed.';
      say(msg);
    }
    function announceSteps(prev) {
      var seen = {};
      (prev.steps || []).forEach(function (s) { seen[s.key] = s.state; });
      var lines = [];
      (S.steps || []).forEach(function (s) {
        if (seen[s.key] !== s.state && s.state !== 'pending') lines.push(R.stepAnnouncement(s));
      });
      if (lines.length) say(lines.join(' '));
    }

    // ---- side effects

    function perform(eff) {
      var id = runId;
      var guard = function (fn) { return function (res) { if (id === runId) fn(res); }; };
      if (eff.type === 'start') {
        var tok = turnstileStart ? turnstileStart.wait(20000) : Promise.resolve('');
        tok.then(function (t) {
          if (id !== runId) return;
          if (!t) { dispatch({ type: 'start_err', error: { code: 'turnstile_failed' } }); return; }
          API.call('POST', '/start', { body: buildStartBody(values, t), idempotencyKey: idemKey, timeoutMs: 30000 }).then(guard(function (res) {
            if (turnstileStart) turnstileStart.reset();
            if (!res.ok) { dispatch({ type: 'start_err', error: res.error }); return; }
            var d = res.data;
            var sess = d.access_token ? { id: d.review.id, token: d.access_token, ref: d.review.ref } : API.loadSession();
            if (!sess || sess.id !== d.review.id) { dispatch({ type: 'start_err', error: { code: 'internal', message: 'This review was already started in another window. Please open it there, or change a detail and try again.' } }); return; }
            session = sess; API.saveSession(sess);
            idemKey = API.uuid();
            dispatch({ type: 'start_ok', review: d.review, interpretation: d.interpretation });
          }));
        });
      } else if (eff.type === 'confirm') {
        API.call('POST', '/' + session.id + '/confirm', { token: session.token, body: buildConfirmBody(values, S.interpretation), timeoutMs: 30000 }).then(guard(function (res) {
          if (res.ok) dispatch({ type: 'confirm_ok', status: res.data }); else dispatch({ type: 'confirm_err', error: res.error });
        }));
      } else if (eff.type === 'advance') {
        API.call('POST', '/' + session.id + '/advance', { token: session.token, body: {}, timeoutMs: 70000 }).then(guard(function (res) {
          if (res.ok) dispatch({ type: 'advance_ok', status: res.data }); else dispatch({ type: 'advance_err', error: res.error });
        }));
      } else if (eff.type === 'fetch_report') {
        API.call('GET', '/' + session.id + '/report', { token: session.token, timeoutMs: 30000 }).then(guard(function (res) {
          if (res.ok) dispatch({ type: 'report_ok', report: res.data.report }); else dispatch({ type: 'report_err', error: res.error });
        }));
      }
    }

    // ---- the intake form

    var form = $('br-form');
    var noWeb = $('br-no-website'), web = $('br-website');
    function syncWebsite() {
      web.disabled = noWeb.checked;
      if (noWeb.checked) web.value = '';
      $('br-reduced-note').hidden = !noWeb.checked;
    }
    noWeb.addEventListener('change', syncWebsite);
    syncWebsite();
    API.wireChips(form);

    turnstileStart = API.turnstile($('br-start-ts'), 'business-review', {
      onOk: function () { $('br-check-ok').hidden = false; $('br-check-msg').hidden = true; },
      onExpired: function () { $('br-check-ok').hidden = true; },
      onError: function () { $('br-check-ok').hidden = true; var m = $('br-check-msg'); m.textContent = 'The security check did not load. Refresh the page and try again, or email rhys@rhyshume.co.uk.'; m.hidden = false; }
    });

    function readValues(f) {
      var v = { goals: [] };
      Array.prototype.forEach.call(f.elements, function (el) {
        if (!el.name) return;
        if (el.type === 'checkbox') { if (el.name === 'goals') { if (el.checked) v.goals.push(el.value); } else v[el.name] = el.checked; }
        else if (el.type === 'radio') { if (el.checked) v[el.name] = el.value; }
        else v[el.name] = el.value;
      });
      return v;
    }

    function clearFieldErrors(f) {
      Array.prototype.forEach.call(f.querySelectorAll('[aria-invalid]'), function (el) { el.removeAttribute('aria-invalid'); });
      Array.prototype.forEach.call(f.querySelectorAll('.br-field-error'), function (el) { el.remove(); });
    }
    function showFieldErrors(f, errs, summaryId) {
      var keys = Object.keys(errs);
      keys.forEach(function (k) {
        var el = f.elements[k];
        if (!el) return;
        el.setAttribute('aria-invalid', 'true');
        var p = document.createElement('p');
        p.className = 'br-field-error'; p.id = el.id + '-err'; p.textContent = errs[k];
        el.setAttribute('aria-describedby', ((el.getAttribute('aria-describedby') || '') + ' ' + p.id).trim());
        (el.closest('.field') || el.parentNode).appendChild(p);
      });
      var box = $(summaryId);
      box.innerHTML = '<strong>Please check these.</strong><ul>' + keys.map(function (k) { var el = f.elements[k]; return '<li><a href="#' + (el ? el.id : '') + '">' + R.esc(errs[k]) + '</a></li>'; }).join('') + '</ul>';
      box.hidden = false;
      var first = f.elements[keys[0]]; if (first) first.focus();
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (S.phase !== 'intake') return; // second press while a request is running does nothing
      clearFieldErrors(form);
      $('br-intake-note').hidden = true;
      var v = readValues(form);
      var errs = validateIntake(v);
      if (Object.keys(errs).length) { showFieldErrors(form, errs, 'br-intake-error'); return; }
      values = v;
      showError('br-intake-error', '');
      dispatch({ type: 'submit' });
    });

    // ---- the confirm step

    var editForm = $('br-edit-form');
    $('br-edit-open').addEventListener('click', function () {
      var open = editForm.hidden;
      editForm.hidden = !open;
      this.setAttribute('aria-expanded', String(open));
      if (open) {
        var i = S.interpretation || {};
        editForm.elements.business_name.value = i.business_name || '';
        editForm.elements.website.value = i.website && i.website.input ? i.website.input : '';
        editForm.elements.location_text.value = i.location ? i.location.text : '';
        editForm.elements.location_kind.value = i.location && i.location.kind ? i.location.kind : 'local';
        editForm.elements.category.value = i.category || '';
        editForm.elements.competitor_name.value = values.competitor_name || '';
        editForm.elements.competitor_website.value = values.competitor_website || '';
        editForm.elements.business_name.focus();
      }
    });
    $('br-confirm-btn').addEventListener('click', function () {
      if (S.phase !== 'confirm') return;
      if (!editForm.hidden) {
        var ev = readValues(editForm);
        var merged = Object.assign({}, values, ev, { no_website: !trim(ev.website) && values.no_website, automation_task: values.automation_task });
        var errs = validateIntake(Object.assign({}, merged, { website: ev.website, no_website: false }));
        clearFieldErrors(editForm);
        if (Object.keys(errs).length) { showFieldErrors(editForm, errs, 'br-confirm-error'); return; }
        values = merged;
      }
      dispatch({ type: 'confirm' });
    });
    $('br-confirm-back').addEventListener('click', function () { restart(); });

    // ---- the run step actions (delegated)

    $('br-run-problem').addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'resume') dispatch({ type: 'resume' });
      else if (act === 'partial') dispatch({ type: 'show_partial' });
      else if (act === 'restart') restart();
    });
    $('br-restart-results').addEventListener('click', function () { restart(); });

    function restart() {
      runId++;
      API.clearSession();
      session = null; values = {};
      form.reset(); syncWebsite();
      Array.prototype.forEach.call(form.querySelectorAll('.br-chip'), function (c) { c.setAttribute('aria-pressed', 'false'); });
      clearFieldErrors(form);
      idemKey = API.uuid();
      shownPhase = null;
      S = initialState();
      announced = {};
      render(S);
      shownPhase = 'intake';
      focusSection('intake');
      if (turnstileStart) turnstileStart.reset();
    }

    // ---- reopening a saved review in the same tab

    var saved = API.loadSession();
    if (saved) {
      API.call('GET', '/' + saved.id, { token: saved.token, timeoutMs: 20000 }).then(function (res) {
        if (!res.ok) { if (res.error.code === 'not_found' || res.error.code === 'expired') API.clearSession(); return; }
        var st = res.data.review.status;
        if (st === 'cancelled') { API.clearSession(); return; }
        var box = $('br-resume');
        $('br-resume-text').textContent = 'You have a review in progress for ' + (res.data.review.business_name || 'your business') + '.';
        box.hidden = false;
        $('br-resume-go').onclick = function () {
          session = saved; box.hidden = true;
          dispatch({ type: 'resume_status', status: res.data });
        };
        $('br-resume-new').onclick = function () { API.clearSession(); box.hidden = true; };
      });
    }

    render(S);
    shownPhase = 'intake';
    app.classList.add('is-ready');
  }

  if (typeof document !== 'undefined' && document.getElementById && document.getElementById('br-app')) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  }

  return {
    GOALS: GOALS, KINDS: KINDS, MAX_ADVANCE: MAX_ADVANCE, MAX_NETWORK_TRIES: MAX_NETWORK_TRIES,
    validateIntake: validateIntake, buildStartBody: buildStartBody, buildConfirmBody: buildConfirmBody, nextDelay: nextDelay, busyDelay: busyDelay,
    initialState: initialState, reduce: reduce
  };
});
