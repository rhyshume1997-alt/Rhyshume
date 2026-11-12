/* The instant Upgrade my site button. Sends the website to /api/upgrade-live, shows progress,
   then shows the concept in a sandboxed frame (scripts allowed, nothing else) with the list of changes. */
(function () {
  'use strict';
  var form = document.getElementById('live-form');
  if (!form) return;
  var button = document.getElementById('live-go');
  var ok = document.getElementById('check-ok');
  var msg = document.getElementById('check-msg');
  var errBox = document.getElementById('live-error');
  var errText = document.getElementById('live-error-text');
  var progress = document.getElementById('live-progress');
  var progressText = document.getElementById('live-progress-text');
  var result = document.getElementById('live-result');
  var frame = document.getElementById('live-frame');
  var points = document.getElementById('live-points');
  var label = button.textContent;
  var steps = ['Reading your site', 'Finding your services and contact details', 'Writing the new copy from what is on your site', 'Checking every line against your site', 'Putting the page together'];
  var timer = null;
  var waiting = false;
  var busy = false;

  function token() { var f = form.querySelector('[name="cf-turnstile-response"]'); return f ? f.value : ''; }
  function say(t) { if (msg) { msg.textContent = t; msg.hidden = !t; } }
  function showError(text) {
    errText.textContent = text;
    errBox.style.display = 'block';
  }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
  function reset() {
    busy = false; waiting = false;
    button.disabled = false; button.textContent = label;
    if (ok) ok.hidden = true;
    say('');
    try { if (window.turnstile) window.turnstile.reset(); } catch (e) { /* the widget shows its own state */ }
  }

  window.rhCheckOk = function () {
    if (ok) ok.hidden = false;
    say('');
    if (waiting) { waiting = false; submit(); }
  };
  window.rhCheckExpired = function () { if (ok) ok.hidden = true; };
  window.rhCheckError = function () {
    if (ok) ok.hidden = true;
    say('The security check didn’t load. Refresh the page and try again, or email rhys@rhyshume.co.uk.');
  };

  function start() {
    errBox.style.display = 'none';
    result.hidden = true;
    progress.style.display = 'block';
    var i = 0;
    progressText.textContent = steps[0];
    timer = setInterval(function () { i = Math.min(i + 1, steps.length - 1); progressText.textContent = steps[i]; }, 12000);
  }

  function show(data) {
    stopTimer();
    progress.style.display = 'none';
    document.getElementById('live-result-label').textContent = 'Your concept for ' + data.host;
    frame.srcdoc = data.html;
    points.textContent = '';
    (data.points || []).forEach(function (p) { var li = document.createElement('li'); li.textContent = p; points.appendChild(li); });
    result.hidden = false;
    form.style.display = 'none';
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function submit() {
    if (busy) return;
    busy = true;
    button.disabled = true; button.textContent = 'Building…';
    start();
    var body = new URLSearchParams(new FormData(form)).toString();
    var controller = new AbortController();
    var cut = setTimeout(function () { controller.abort(); }, 130000);
    fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' }, body: body, signal: controller.signal })
      .then(function (res) { return res.json().catch(function () { return { ok: false }; }); })
      .then(function (data) {
        clearTimeout(cut);
        if (data && data.ok && data.html) { show(data); return; }
        stopTimer(); progress.style.display = 'none';
        showError((data && data.message) || 'Something went wrong. Email rhys@rhyshume.co.uk and I will build it by hand.');
        reset();
      })
      .catch(function () {
        clearTimeout(cut); stopTimer(); progress.style.display = 'none';
        showError('That took too long or the connection dropped. Email rhys@rhyshume.co.uk and I will build it by hand.');
        reset();
      });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy || waiting) return;
    if (!token()) {
      waiting = true;
      button.disabled = true; button.textContent = 'Checking…';
      say('Running the security check, one moment.');
      return;
    }
    submit();
  });

  window.addEventListener('pageshow', function (e) { if (e.persisted) reset(); });
})();
