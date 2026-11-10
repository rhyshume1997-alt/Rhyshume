/* Security check helper for the contact and grants forms.
   The Cloudflare Turnstile widget is in the page. This file shows our own "Security check passed" line,
   waits for the check if Send is pressed before it has finished, and resets the widget when it needs a fresh token.
   Without JavaScript the widget cannot run, so the form refuses to send and the page shows the phone and email instead. */
(function () {
  'use strict';
  var form = document.querySelector('form[action="/api/contact"]');
  if (!form) return;
  var ok = document.getElementById('check-ok');
  var msg = document.getElementById('check-msg');
  var button = form.querySelector('button[type="submit"]');
  var label = button ? button.textContent : 'Send';
  var waiting = false;
  var FALLBACK = 'Please call 07908 041480 or email rhyshume1997@gmail.com.';

  function token() {
    var field = form.querySelector('[name="cf-turnstile-response"]');
    return field ? field.value : '';
  }
  function say(text) {
    if (!msg) return;
    msg.textContent = text;
    msg.hidden = !text;
  }
  function stopWaiting() {
    waiting = false;
    if (button) { button.disabled = false; button.textContent = label; }
  }

  // Fresh token, clears the green line and any waiting state. Call this after any failed send.
  function resetCheck() {
    if (ok) ok.hidden = true;
    say('');
    stopWaiting();
    try { if (window.turnstile) window.turnstile.reset(); } catch (e) { /* the widget will show its own state */ }
  }

  window.rhCheckOk = function () {
    if (ok) ok.hidden = false;
    say('');
    if (waiting) {
      stopWaiting();
      if (form.requestSubmit) form.requestSubmit(button); else form.submit();
    }
  };
  window.rhCheckExpired = function () {
    if (ok) ok.hidden = true;
    stopWaiting();
  };
  window.rhCheckError = function () {
    if (ok) ok.hidden = true;
    stopWaiting();
    say('The security check didn’t load. Refresh the page and try again. ' + FALLBACK);
  };

  // Send pressed before the check finished: hold the send, then submit as soon as it passes.
  form.addEventListener('submit', function (e) {
    if (token()) return;
    e.preventDefault();
    if (waiting) return;
    waiting = true;
    if (button) { button.disabled = true; button.textContent = 'Checking…'; }
    say('Running the security check, one moment.');
  });

  // Back or forward button can bring back the page with an already used token.
  window.addEventListener('pageshow', function (e) { if (e.persisted) resetCheck(); });
})();
