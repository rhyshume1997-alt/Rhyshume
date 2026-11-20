/* Business review: the shared client (API calls, token and session handling, Turnstile, the report view and its request forms).
   Inputs: the JSON API in docs/business-review/CONTRACT.md. The access token comes from the URL fragment (#t=...&id=...) or sessionStorage.
   Outputs: window.BRReport in the browser; the pure parts are exported for Node tests. On /business-review/report this file also runs the report page.
   Must not change:
   - the token is only ever sent as an Authorization header, never in a path or query string, and never written to the page text;
   - nothing is shown as analysis unless it came back from the API; fixtures are never imported here;
   - consent boxes are never pre-ticked, and report delivery, follow up and marketing stay separate;
   - there is no PDF button unless the API says pdf is available;
   - a request that fails is reported as failed, never replaced by invented content. */
(function (root, factory) {
  var render = (typeof module === 'object' && module.exports) ? require('./br-render.js') : root.BRRender;
  var auto = (typeof module === 'object' && module.exports) ? require('./br-automation.js') : root.BRAutomation;
  var api = factory(render, auto, root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BRReport = api;
})(typeof self !== 'undefined' ? self : this, function (R, A, root) {
  'use strict';

  var BASE = '/api/business-review';
  var SITEKEY = '0x4AAAAAAF7ONWeir1MBB-v7';
  var SESSION_KEY = 'br-session';
  var esc = R.esc;
  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

  // ---------------------------------------------------------------- pure helpers

  function parseFragment(hash) {
    var out = { token: '', id: '' };
    String(hash || '').replace(/^#/, '').split('&').forEach(function (pair) {
      var i = pair.indexOf('=');
      if (i < 1) return;
      var k = pair.slice(0, i), v = pair.slice(i + 1);
      try { v = decodeURIComponent(v); } catch (e) { return; }
      if (k === 't' && TOKEN_RE.test(v)) out.token = v;
      if (k === 'id' && UUID_RE.test(v)) out.id = v;
    });
    return out;
  }
  function reportLink(id, token) {
    return '/business-review/report#t=' + encodeURIComponent(token) + (id ? '&id=' + encodeURIComponent(id) : '');
  }

  function uuid() {
    var c = root.crypto;
    if (c && c.randomUUID) return c.randomUUID();
    var b = new Uint8Array(16);
    if (c && c.getRandomValues) c.getRandomValues(b); else for (var i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    var h = Array.prototype.map.call(b, function (x) { return (x < 16 ? '0' : '') + x.toString(16); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }

  // Session in sessionStorage: { id, token, ref }. Failure to store is not fatal.
  function store() { try { return root.sessionStorage || null; } catch (e) { return null; } }
  function loadSession() {
    var s = store();
    if (!s) return null;
    try {
      var o = JSON.parse(s.getItem(SESSION_KEY) || 'null');
      return o && UUID_RE.test(o.id) && TOKEN_RE.test(o.token) ? o : null;
    } catch (e) { return null; }
  }
  function saveSession(o) { var s = store(); if (s) { try { s.setItem(SESSION_KEY, JSON.stringify(o)); } catch (e) { /* ignore */ } } }
  function clearSession() { var s = store(); if (s) { try { s.removeItem(SESSION_KEY); } catch (e) { /* ignore */ } } }

  // One request to the API. Always resolves: { ok, status, data, error }. error.code is what callers branch on.
  function call(method, path, opts) {
    opts = opts || {};
    var headers = { 'Accept': 'application/json' };
    var init = { method: method, headers: headers, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' };
    if (opts.token) headers['Authorization'] = 'Bearer ' + opts.token;
    if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;
    if (opts.body !== undefined) { headers['Content-Type'] = 'application/json; charset=utf-8'; init.body = JSON.stringify(opts.body); }
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timedOut = false, timer = null;
    if (ctl) { init.signal = ctl.signal; timer = setTimeout(function () { timedOut = true; ctl.abort(); }, opts.timeoutMs || 70000); }
    return fetch(BASE + path, init).then(function (res) {
      return res.text().then(function (text) {
        if (timer) clearTimeout(timer);
        var data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
        if (res.ok && data && data.ok !== false) return { ok: true, status: res.status, data: data };
        var err = data && data.error && typeof data.error === 'object' ? data.error : { code: res.status === 404 ? 'not_found' : (res.status === 408 || res.status === 504) ? 'timeout' : 'internal' };
        if (!err.code) err.code = 'internal';
        return { ok: false, status: res.status, data: data, error: err };
      });
    }, function () {
      if (timer) clearTimeout(timer);
      return { ok: false, status: 0, data: null, error: { code: timedOut ? 'timeout' : 'network' } };
    });
  }

  // ---------------------------------------------------------------- forms (pure HTML)

  function consentBox(id, name, text, required) {
    // Never checked: no `checked` attribute anywhere in this file for a consent box.
    return '<div class="br-check"><input type="checkbox" id="' + id + '" name="' + name + '"' + (required ? ' required' : '') + '>' +
      '<label for="' + id + '">' + text + '</label></div>';
  }

  function automationFormHtml() {
    return '<form class="br-inline-form" id="br-auto-form" novalidate>' +
      '<fieldset><legend>Add a task to this review</legend>' +
      A.taskFieldHtml({ id: 'br-auto-task' }).replace(' <span class="opt">(optional)</span>', '') +
      '<p class="br-live-msg" id="br-auto-msg" role="status"></p>' +
      '<button class="btn btn-quiet" type="submit">Add a possible workflow</button></fieldset></form>';
  }

  function competitorFormHtml() {
    return '<form class="br-inline-form" id="br-comp-form" novalidate>' +
      '<fieldset><legend>Name a business to compare</legend>' +
      '<p class="br-hint">If you name one, its public website is tested the same way as yours and shown as a business you named. Naming a business is not evidence that it competes with you directly.</p>' +
      '<div class="field"><label for="br-comp-name">Business name</label><input id="br-comp-name" name="name" type="text" maxlength="160" autocomplete="off"></div>' +
      '<div class="field"><label for="br-comp-site">Their website</label><input id="br-comp-site" name="website" type="text" inputmode="url" maxlength="300" autocomplete="off" placeholder="www.theirbusiness.co.uk"></div>' +
      '<p class="br-live-msg" id="br-comp-msg" role="status"></p>' +
      '<button class="btn btn-quiet" type="submit">Compare this business</button></fieldset></form>';
  }

  var SERVICE_INTEREST = [
    ['websites', 'Website development'], ['seo', 'SEO and local search'], ['ai_visibility', 'AI search visibility'],
    ['automation', 'Business automation'], ['engineering', 'Engineering systems']
  ];

  // The request panel: view only first. Nothing here needs an email address until the visitor chooses to send one.
  function actionsHtml(opts) {
    opts = opts || {};
    var printHref = opts.printHref ? esc(opts.printHref) : '';
    return '<section class="br-sec br-actions-panel" id="br-copy" aria-labelledby="br-copy-h">' +
      '<h3 id="br-copy-h" tabindex="-1">Keep this report or talk it through</h3>' +
      '<p>You can read, print or save this report without giving an email address.</p>' +
      '<p class="br-actions">' + (printHref ? '<a class="btn" href="' + printHref + '" target="_blank" rel="noopener">Open the printable report<span class="visually-hidden"> (opens in a new tab)</span></a>' : '') +
      '<button type="button" class="btn btn-quiet" id="br-mail-open" aria-expanded="false" aria-controls="br-mail-form">Email me a copy</button>' +
      '<button type="button" class="btn btn-quiet" id="br-talk-open" aria-expanded="false" aria-controls="br-talk-form">Discuss my results</button></p>' +

      '<form class="br-inline-form" id="br-mail-form" hidden novalidate>' +
      '<fieldset><legend>Email me a copy of this report</legend>' +
      '<div class="field"><label for="br-mail-email">Email address</label><input id="br-mail-email" name="email" type="email" autocomplete="email" maxlength="200" required aria-describedby="br-mail-email-hint"><p class="br-hint" id="br-mail-email-hint">Used only to send you this report link. Nothing else is sent to it.</p></div>' +
      '<div class="field"><label for="br-mail-name">Your name <span class="opt">(optional)</span></label><input id="br-mail-name" name="name" type="text" autocomplete="name" maxlength="120"></div>' +
      '<fieldset class="br-sub"><legend>Optional extras, separate from the report <span class="opt">(none needed)</span></legend>' +
      consentBox('br-mail-follow', 'follow_up_contact', 'I would also like Rhys to contact me about these results.', false) +
      consentBox('br-mail-marketing', 'marketing', 'I would also like occasional news and offers by email.', false) + '</fieldset>' +
      '<div class="check br-turnstile" id="br-mail-ts"></div>' +
      '<p class="br-live-msg" id="br-mail-msg" role="status"></p>' +
      '<button class="btn" type="submit">Email me a copy</button></fieldset></form>' +

      '<form class="br-inline-form" id="br-talk-form" hidden novalidate>' +
      '<fieldset><legend>Discuss my results with Rhys</legend>' +
      '<p class="br-hint">This sends your details to Rhys so he can reply about this report. It is not a quote, and it is not signing up to anything.</p>' +
      '<div class="field"><label for="br-talk-name">Your name</label><input id="br-talk-name" name="name" type="text" autocomplete="name" maxlength="120" required></div>' +
      '<div class="field"><label for="br-talk-email">Email address</label><input id="br-talk-email" name="email" type="email" autocomplete="email" maxlength="200" required></div>' +
      '<div class="field"><label for="br-talk-phone">Phone <span class="opt">(optional)</span></label><input id="br-talk-phone" name="phone" type="tel" autocomplete="tel" maxlength="40"></div>' +
      '<div class="field"><label for="br-talk-msg">Anything you would like to say <span class="opt">(optional)</span></label><textarea id="br-talk-msg" name="message" rows="3" maxlength="1000"></textarea></div>' +
      '<fieldset class="br-sub"><legend>What would you like to talk about? <span class="opt">(optional)</span></legend>' +
      SERVICE_INTEREST.map(function (s) { return '<div class="br-check"><input type="checkbox" id="br-si-' + s[0] + '" name="service_interest" value="' + s[0] + '"><label for="br-si-' + s[0] + '">' + esc(s[1]) + '</label></div>'; }).join('') + '</fieldset>' +
      consentBox('br-talk-consent', 'follow_up_contact', 'I would like Rhys to contact me about these results.', true) +
      consentBox('br-talk-marketing', 'marketing', 'I would also like occasional news and offers by email. This is optional and separate from the line above.', false) +
      '<div class="check br-turnstile" id="br-talk-ts"></div>' +
      '<p class="br-live-msg" id="br-talk-status" role="status"></p>' +
      '<button class="btn" type="submit">Send to Rhys</button></fieldset></form>' +

      '<p class="br-privacy-line">See the <a href="/privacy">privacy page</a> for how details are used. Deleting this review also clears any contact details linked to it.</p>' +
      '<p class="br-actions"><button type="button" class="btn btn-quiet" id="br-delete" aria-describedby="br-delete-note">Delete this review and my details</button></p>' +
      '<p class="br-hint" id="br-delete-note"></p>' +
      '</section>';
  }

  // The body of POST /:id/request-report. Asking for the email is itself the request, so report_delivery is sent as true
  // without a checkbox (CONTRACT 3.9 still requires the field). Follow up and marketing are false unless the visitor ticked them.
  function mailBody(v, turnstileToken) {
    var o = { email: String(v.email || '').trim(), consent: { report_delivery: true, follow_up_contact: !!v.follow_up_contact, marketing: !!v.marketing }, turnstile_token: turnstileToken };
    if (v.name && String(v.name).trim()) o.name = String(v.name).trim();
    return o;
  }
  function talkBody(v, turnstileToken) {
    var o = {
      name: String(v.name || '').trim(), email: String(v.email || '').trim(),
      service_interest: Array.isArray(v.service_interest) ? v.service_interest : [],
      consent: { follow_up_contact: !!v.follow_up_contact, marketing: !!v.marketing }, turnstile_token: turnstileToken
    };
    if (v.phone && String(v.phone).trim()) o.phone = String(v.phone).trim();
    if (v.message && String(v.message).trim()) o.message = String(v.message).trim();
    return o;
  }

  var DELIVERY_TEXT = {
    queued: 'Your copy is on its way.',
    held_for_approval: 'Thank you. Rhys checks each report before a copy is sent, so yours will arrive after that check.',
    sent: 'Your copy has been sent.',
    failed: 'The email could not be sent.',
    cancelled: 'This copy was cancelled.'
  };
  function deliveryText(d) {
    d = d || {};
    return (DELIVERY_TEXT[d.status] || 'Your request was received.') + (d.to_masked ? ' Address: ' + d.to_masked + '.' : '');
  }

  // ---------------------------------------------------------------- Turnstile (browser only)

  // action must match the server: business-review, business-review-mail, business-review-discuss.
  function turnstile(el, action, handlers) {
    handlers = handlers || {};
    var state = { id: null, token: '', failed: false, waiters: [] };
    function settle() { var t = state.token; state.waiters.splice(0).forEach(function (w) { w(t); }); }
    var tries = 0;
    (function mount() {
      var ts = root.turnstile;
      if (ts && ts.render) {
        try {
          state.id = ts.render(el, {
            sitekey: SITEKEY, action: action, theme: 'light',
            callback: function (t) { state.token = t; state.failed = false; if (handlers.onOk) handlers.onOk(); settle(); },
            'expired-callback': function () { state.token = ''; if (handlers.onExpired) handlers.onExpired(); },
            'error-callback': function () { state.token = ''; state.failed = true; if (handlers.onError) handlers.onError(); settle(); }
          });
        } catch (e) { state.failed = true; if (handlers.onError) handlers.onError(); settle(); }
        return;
      }
      if (++tries > 100) { state.failed = true; if (handlers.onError) handlers.onError(); settle(); return; }
      setTimeout(mount, 150);
    })();
    return {
      token: function () { return state.token; },
      failed: function () { return state.failed; },
      reset: function () { state.token = ''; if (handlers.onExpired) handlers.onExpired(); try { if (root.turnstile && state.id != null) root.turnstile.reset(state.id); } catch (e) { /* the widget shows its own state */ } },
      // Resolves with a token, or '' if the check failed or took too long.
      wait: function (ms) {
        if (state.token) return Promise.resolve(state.token);
        if (state.failed) return Promise.resolve('');
        return new Promise(function (resolve) {
          var done = false;
          state.waiters.push(function (t) { if (!done) { done = true; resolve(t); } });
          setTimeout(function () { if (!done) { done = true; resolve(state.token || ''); } }, ms || 20000);
        });
      }
    };
  }

  // ---------------------------------------------------------------- browser: mounting a report

  function setMsg(el, text, kind) {
    if (!el) return;
    el.textContent = text || '';
    el.className = 'br-live-msg' + (kind ? ' br-live-msg--' + kind : '');
  }

  function wireReport(container) {
    container.addEventListener('click', function (e) {
      var t = e.target;
      var btn = t && t.closest ? t.closest('.br-toggle') : null;
      if (btn) {
        var panel = document.getElementById(btn.getAttribute('aria-controls'));
        var open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!open));
        btn.firstChild.nodeValue = open ? 'Show details' : 'Hide details';
        if (panel) panel.hidden = open;
        return;
      }
      var all = t && t.closest ? t.closest('.br-expand-all') : null;
      if (all) {
        var on = all.getAttribute('aria-pressed') !== 'true';
        all.setAttribute('aria-pressed', String(on));
        all.textContent = on ? 'Hide all details' : 'Show all details';
        Array.prototype.forEach.call(container.querySelectorAll('.br-toggle'), function (b) {
          b.setAttribute('aria-expanded', String(on));
          b.firstChild.nodeValue = on ? 'Hide details' : 'Show details';
          var p = document.getElementById(b.getAttribute('aria-controls'));
          if (p) p.hidden = !on;
        });
      }
    });
  }

  function mountReport(container, report, opts) {
    opts = opts || {};
    container.innerHTML = R.reportHtml(report, {
      idPrefix: opts.idPrefix || 'br', view: opts.view || 'page', actionsHtml: opts.actionsHtml || '',
      automationFormHtml: opts.automationFormHtml || '', competitorFormHtml: opts.competitorFormHtml || ''
    });
    if (!container.__brWired) { wireReport(container); container.__brWired = true; }
  }

  // Wires the email, discussion, delete, task and competitor forms inside a mounted report.
  // ctx: { id, token, ref, onReportChanged(), onCompetitorNamed(status), onDeleted() }
  function wireForms(container, ctx) {
    var mailForm = container.querySelector('#br-mail-form'), talkForm = container.querySelector('#br-talk-form');
    var widgets = {};

    function reveal(openBtnId, form, action, tsId) {
      var btn = container.querySelector('#' + openBtnId);
      if (!btn || !form) return;
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!open));
        form.hidden = open;
        if (!open) {
          if (!widgets[action]) {
            var okEl = form.querySelector('.br-live-msg');
            widgets[action] = turnstile(container.querySelector('#' + tsId), action, {
              onOk: function () { setMsg(okEl, 'Security check passed.', 'ok'); },
              onExpired: function () { /* a new check starts by itself */ },
              onError: function () { setMsg(okEl, 'The security check did not load. Refresh the page and try again, or email rhys@rhyshume.co.uk.', 'error'); }
            });
          }
          var first = form.querySelector('input:not([type="hidden"])');
          if (first) first.focus();
        }
      });
    }
    reveal('br-mail-open', mailForm, 'business-review-mail', 'br-mail-ts');
    reveal('br-talk-open', talkForm, 'business-review-discuss', 'br-talk-ts');

    function guarded(form, msgId, action, build, path, done) {
      if (!form) return;
      var busy = false;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var msg = container.querySelector('#' + msgId);
        if (busy) return; // a second press while the first is running does nothing
        if (!form.checkValidity()) { form.reportValidity(); return; }
        var w = widgets[action];
        var submit = form.querySelector('button[type="submit"]');
        busy = true; submit.disabled = true;
        setMsg(msg, 'Running the security check, one moment.', '');
        (w ? w.wait(20000) : Promise.resolve('')).then(function (tok) {
          if (!tok) { busy = false; submit.disabled = false; setMsg(msg, 'The security check did not pass. Please try again, or email rhys@rhyshume.co.uk.', 'error'); if (w) w.reset(); return null; }
          setMsg(msg, 'Sending.', '');
          return call('POST', '/' + encodeURIComponent(ctx.id) + path, { token: ctx.token, body: build(tok), timeoutMs: 30000 }).then(function (res) {
            busy = false; submit.disabled = false;
            if (w) w.reset();
            if (res.ok) { done(res, msg, form); return; }
            setMsg(msg, R.errorText(res.error), 'error');
            if (res.error.code === 'expired' || res.error.code === 'not_found') { if (ctx.onDeleted) ctx.onDeleted(res.error.code); }
          });
        });
      });
    }

    function values(form) {
      var v = {};
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name) return;
        if (el.type === 'checkbox') {
          if (el.name === 'service_interest') { if (el.checked) (v.service_interest = v.service_interest || []).push(el.value); }
          else v[el.name] = el.checked;
        } else v[el.name] = el.value;
      });
      return v;
    }

    guarded(mailForm, 'br-mail-msg', 'business-review-mail', function (tok) { return mailBody(values(mailForm), tok); }, '/request-report', function (res, msg, form) {
      setMsg(msg, deliveryText(res.data.delivery), 'ok');
      form.querySelector('button[type="submit"]').disabled = true;
    });
    guarded(talkForm, 'br-talk-status', 'business-review-discuss', function (tok) { return talkBody(values(talkForm), tok); }, '/request-discussion', function (res, msg, form) {
      setMsg(msg, 'Thank you. Your request has reached Rhys. Your reference is ' + (res.data.reference || ctx.ref || '') + '.', 'ok');
      form.querySelector('button[type="submit"]').disabled = true;
    });

    // Add a task after the review.
    var autoForm = container.querySelector('#br-auto-form');
    if (autoForm) {
      wireChips(autoForm);
      autoForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var msg = container.querySelector('#br-auto-msg');
        var ta = autoForm.querySelector('textarea');
        var task = ta.value.trim();
        if (!task) { setMsg(msg, 'Please pick an example or write a few words first.', 'error'); ta.focus(); return; }
        var b = autoForm.querySelector('button[type="submit"]'); b.disabled = true; setMsg(msg, 'Adding.', '');
        call('POST', '/' + encodeURIComponent(ctx.id) + '/automation', { token: ctx.token, body: { task: task }, timeoutMs: 30000 }).then(function (res) {
          b.disabled = false;
          if (res.ok) { if (ctx.onReportChanged) ctx.onReportChanged('auto'); } else setMsg(msg, R.errorText(res.error), 'error');
        });
      });
    }

    // Name a business to compare after the review. This re-queues the review, so the page goes back to the live steps.
    var compForm = container.querySelector('#br-comp-form');
    if (compForm) {
      compForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var msg = container.querySelector('#br-comp-msg');
        var name = compForm.elements.name.value.trim(), site = compForm.elements.website.value.trim();
        if (!name || !site) { setMsg(msg, 'Please give both the name and the website.', 'error'); return; }
        var b = compForm.querySelector('button[type="submit"]'); b.disabled = true; setMsg(msg, 'Sending.', '');
        call('POST', '/' + encodeURIComponent(ctx.id) + '/competitors', { token: ctx.token, body: { name: name, website: site }, timeoutMs: 30000 }).then(function (res) {
          b.disabled = false;
          if (res.ok) { if (ctx.onCompetitorNamed) ctx.onCompetitorNamed(res.data); } else setMsg(msg, R.errorText(res.error), 'error');
        });
      });
    }

    // Delete, with one confirming press.
    var del = container.querySelector('#br-delete');
    if (del) {
      var armed = false;
      var note = container.querySelector('#br-delete-note');
      del.addEventListener('click', function () {
        if (!armed) { armed = true; del.textContent = 'Press again to delete for good'; note.textContent = 'This removes the review and any contact details linked to it. It cannot be undone.'; return; }
        del.disabled = true;
        call('DELETE', '/' + encodeURIComponent(ctx.id), { token: ctx.token, timeoutMs: 30000 }).then(function (res) {
          del.disabled = false;
          if (res.ok) { clearSession(); if (ctx.onDeleted) ctx.onDeleted('deleted'); }
          else { armed = false; del.textContent = 'Delete this review and my details'; note.textContent = R.errorText(res.error); }
        });
      });
    }
  }

  function wireChips(scope) {
    var ta = scope.querySelector('textarea[name="automation_task"]');
    if (!ta) return;
    var chips = Array.prototype.slice.call(scope.querySelectorAll('.br-chip'));
    var texts = {};
    A.TASKS.forEach(function (t) { texts[t.key] = t.text; });
    function sync() {
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(ta.value.trim() === texts[c.getAttribute('data-task')])); });
    }
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        var pressed = c.getAttribute('aria-pressed') === 'true';
        ta.value = pressed ? '' : texts[c.getAttribute('data-task')] || '';
        sync();
      });
    });
    ta.addEventListener('input', sync);
    sync();
  }

  // ---------------------------------------------------------------- the report page (/business-review/report)

  function reportPage() {
    var rootEl = document.getElementById('br-report-root');
    if (!rootEl) return;
    var live = document.getElementById('br-live');
    var state = document.getElementById('br-report-state');
    var frag = parseFragment(location.hash);
    var sess = loadSession();
    var id, token;
    if (frag.token) { token = frag.token; id = frag.id || (sess && sess.token === frag.token ? sess.id : ''); }
    else { token = sess ? sess.token : ''; id = sess ? sess.id : ''; }
    if (frag.token && frag.id) saveSession({ id: frag.id, token: frag.token, ref: sess && sess.id === frag.id ? sess.ref : '' });
    var printBtn = document.getElementById('br-print');
    var pdfSlot = document.getElementById('br-pdf-slot');

    function show(msgHtml, kind) {
      state.hidden = false;
      state.className = 'br-banner' + (kind === 'error' ? ' br-banner--error' : '');
      state.innerHTML = msgHtml;
      if (kind === 'error') state.setAttribute('role', 'alert'); else state.setAttribute('role', 'status');
    }
    if (printBtn) printBtn.addEventListener('click', function () { root.print(); });

    if (!token || !id) {
      rootEl.hidden = true;
      show('<strong>This link is missing part of its access code.</strong> Open the link from your report email again, or start a new review. If you opened this in a different browser from the one you used for the review, the full link is needed.<p class="br-actions"><a class="btn" href="/business-review">Start a free review</a></p>', 'error');
      return;
    }
    show('Loading your report.', '');
    var ctx = { id: id, token: token, ref: sess && sess.ref, onDeleted: function (why) {
      rootEl.hidden = true;
      show(why === 'deleted' ? '<strong>This review has been deleted.</strong> Its details have been removed.' : '<strong>This report is no longer available.</strong> The link may have expired.', why === 'deleted' ? '' : 'error');
    } };

    function load() {
      call('GET', '/' + encodeURIComponent(id) + '/report', { token: token, timeoutMs: 30000 }).then(function (res) {
        if (!res.ok) {
          rootEl.hidden = true;
          var c = res.error.code;
          if (c === 'expired') show('<strong>This report has expired.</strong> Reports are kept for a limited time and their details are then removed.<p class="br-actions"><a class="btn" href="/business-review">Start a new free review</a></p>', 'error');
          else if (c === 'not_found') show('<strong>We could not find this report.</strong> The link may be wrong, or the report may have been deleted.<p class="br-actions"><a class="btn" href="/business-review">Start a free review</a></p>', 'error');
          else if (c === 'wrong_state') show('<strong>This report is not ready yet.</strong> The review may still be running. Go back to the review page in the browser you started it in.<p class="br-actions"><a class="btn" href="/business-review">Back to the review</a></p>', 'error');
          else show('<strong>' + esc(R.errorText(res.error)) + '</strong><p class="br-actions"><button type="button" class="btn" id="br-retry">Try again</button></p>', 'error');
          var retry = document.getElementById('br-retry');
          if (retry) retry.addEventListener('click', function () { show('Loading your report.', ''); load(); });
          return;
        }
        var report = res.data.report;
        state.hidden = true;
        rootEl.hidden = false;
        var h1 = document.getElementById('br-report-title');
        if (h1) h1.textContent = 'Business opportunity review: ' + (report.business && report.business.name ? report.business.name : '');
        document.title = 'Business opportunity review ' + (report.review_ref || '') + ' | Rhys Hume';
        var meta = document.getElementById('br-report-meta');
        if (meta) meta.textContent = 'Reference ' + report.review_ref + '. Version ' + report.version + '. Reviewed ' + R.formatDate(report.business && report.business.review_date ? report.business.review_date + 'T00:00:00Z' : report.generated_at) + '.';
        mountReport(rootEl, report, { idPrefix: 'br', view: 'report', actionsHtml: actionsHtml({ printHref: '' }) });
        wireForms(rootEl, ctx);
        if (live) live.textContent = 'Report loaded.';
        var h = document.getElementById('br-report-title'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
      });
    }
    load();

    // A PDF button only if the server says PDF is available. It is not, in the first release.
    call('GET', '/capabilities', { timeoutMs: 15000 }).then(function (res) {
      var cap = res.ok && res.data && res.data.capabilities && res.data.capabilities.pdf;
      if (!cap || cap.state !== 'available' || !pdfSlot) return;
      pdfSlot.innerHTML = '<button type="button" class="btn btn-quiet" id="br-pdf">Download as PDF</button>';
      document.getElementById('br-pdf').addEventListener('click', function () {
        fetch(BASE + '/' + encodeURIComponent(id) + '/report.pdf', { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store', referrerPolicy: 'no-referrer' })
          .then(function (r) { if (!r.ok) throw new Error('pdf'); return r.blob(); })
          .then(function (b) { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'business-review.pdf'; document.body.appendChild(a); a.click(); a.remove(); })
          .catch(function () { show('<strong>The PDF could not be made.</strong> Please use Print and choose Save as PDF.', 'error'); });
      });
    });
  }

  if (typeof document !== 'undefined' && document.getElementById && document.getElementById('br-report-root')) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', reportPage); else reportPage();
  }

  return {
    BASE: BASE, SITEKEY: SITEKEY, SESSION_KEY: SESSION_KEY, parseFragment: parseFragment, reportLink: reportLink, uuid: uuid,
    loadSession: loadSession, saveSession: saveSession, clearSession: clearSession, call: call,
    consentBox: consentBox, actionsHtml: actionsHtml, automationFormHtml: automationFormHtml, competitorFormHtml: competitorFormHtml,
    mailBody: mailBody, talkBody: talkBody, deliveryText: deliveryText,
    turnstile: turnstile, mountReport: mountReport, wireForms: wireForms, wireChips: wireChips, setMsg: setMsg
  };
});
