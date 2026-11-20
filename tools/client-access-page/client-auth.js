/* CLIENT LOGIN: sign in, forced password change, sign out, for the client page at /client/.
   Inputs : the client's email and password (typed here), Supabase Auth REST with the PUBLIC publishable key, /api/client-change-password.
   Outputs: calls CA.ready(start) once the client is signed in AND has no pending password change; before that nothing else on the page runs.
   Rules  : no SDK. The session lives in this page's memory only (never localStorage, sessionStorage or cookies), so closing or reloading the tab
            signs out. Nothing here is the security: the database refuses every data call while a password change is pending
            (the browser can be edited, the database cannot). Error wording never says whether an email has an account.
   Must not change: memory-only session, generic sign-in failure message, the change form appearing before anything else. */
(function () {
  'use strict';
  var SB = 'https://vkpdrqkwxkokolphmkbh.supabase.co', KEY = 'sb_publishable_GL24QszG4OiwuzdL9QecwQ_ePysbKgx', TSKEY = '0x4AAAAAAF7ONWeir1MBB-v7';
  var COMMON = __COMMON__;
  var ses = null, startFn = null, tsToken = '', tsId = null, busy = false, timer = 0;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var app = function () { return document.getElementById('app'); };
  var $ = function (s) { return document.querySelector(s); };
  function claims(t) { try { var p = String(t).split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(atob(p + '='.repeat((4 - p.length % 4) % 4))); } catch (e) { return {}; } }
  function frame(title, inner) { document.title = title + ' | Rhys Hume'; app().innerHTML = '<header class="top"><div class="wm">Prepared with Rhys Hume</div><h1>' + esc(title) + '</h1></header><main id="main" tabindex="-1">' + inner + '</main>'; var m = $('#main'); if (m) m.focus({ preventScroll: true }); }
  var STORED = '<p class="hint">What is stored: your login email address, and the answers and pictures you choose to add. This page sets no cookies and uses no tracking. Your sign-in stays in this browser tab only and ends when you close or reload it. <a href="/privacy">Privacy</a></p>';
  var GENERIC = 'That email or password is not right. Check them and try again. If it keeps happening, ask Rhys.';

  /* ---- sign in ---- */
  function loginView(msg) {
    frame('Sign in', '<p>Sign in to see your private page.</p><form id="ca-login" novalidate><div class="q"><label class="ql" for="ca-email">Email</label><input id="ca-email" type="email" autocomplete="username" inputmode="email" autocapitalize="off" spellcheck="false" required></div>' +
      '<div class="q"><label class="ql" for="ca-pw">Password</label><input id="ca-pw" type="password" autocomplete="current-password" required><p class="hint"><label><input type="checkbox" id="ca-show"> Show password</label></p></div>' +
      '<p id="ca-err" class="err" role="alert">' + esc(msg || '') + '</p><p><button type="submit" class="btn pri" id="ca-go">Sign in</button></p></form>' +
      '<p class="hint">First time here? Use the temporary password Rhys gave you. You will choose your own password straight away.</p>' + STORED);
    $('#ca-show').addEventListener('change', function (e) { $('#ca-pw').type = e.target.checked ? 'text' : 'password'; });
    $('#ca-login').addEventListener('submit', function (e) { e.preventDefault(); doLogin($('#ca-email').value, $('#ca-pw').value); });
    $('#ca-email').focus();
  }
  function authPost(path, body, headers) {
    return fetch(SB + '/auth/v1/' + path, { method: 'POST', headers: Object.assign({ apikey: KEY, 'Content-Type': 'application/json' }, headers || {}), body: JSON.stringify(body) });
  }
  function setSes(j, email) { ses = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600), email: email }; clearInterval(timer); timer = setInterval(function () { if (ses && ses.expires_at - 120 < Date.now() / 1000) refresh(); }, 30000); }
  function refresh() {
    if (!ses) return Promise.resolve(false);
    return authPost('token?grant_type=refresh_token', { refresh_token: ses.refresh_token }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) { setSes(j, ses.email); return true; }, function () { return false; });
  }
  function signInCall(email, pw) {
    return authPost('token?grant_type=password', { email: String(email).trim().toLowerCase(), password: pw }).then(function (r) {
      if (r.status === 429) return { err: 'Too many tries. Wait a few minutes and try again.' };
      if (!r.ok) return { err: GENERIC };
      return r.json().then(function (j) { return { j: j }; });
    }, function () { return { err: 'No connection. Check it and try again.' }; });
  }
  function doLogin(email, pw) {
    if (busy) return; if (!email || !pw) { $('#ca-err').textContent = 'Enter your email and password.'; return; }
    busy = true; $('#ca-go').disabled = true; $('#ca-go').textContent = 'Signing in';
    signInCall(email, pw).then(function (r) { busy = false; if (r.err) return loginView(r.err); afterSignIn(r.j, String(email).trim().toLowerCase()); });
  }
  function afterSignIn(j, email) {
    var c = claims(j.access_token), am = c.app_metadata || {};
    if (am.role !== 'client') { ses = null; return loginView(GENERIC); } // a sign in that is not a client login gets nothing here, and no hint why
    setSes(j, email);
    if (am.must_change_password !== false) {
      var exp = am.temp_expires_at ? Date.parse(am.temp_expires_at) : 0;
      if (exp && exp < Date.now()) return expiredView();
      return changeView();
    }
    frame('Loading', '<div class="big"><p>One moment</p></div>'); startFn();
  }
  function expiredView() {
    ses = null; clearInterval(timer);
    frame('Temporary password expired', '<div class="note bad">That temporary password has run out. Nothing has been opened. Please ask Rhys for a new one.</div><p><button type="button" class="btn" id="ca-back">Back to sign in</button></p>' + STORED);
    $('#ca-back').addEventListener('click', function () { loginView(); });
  }

  /* ---- forced password change ---- */
  function rules(pw, pw2, email) {
    var n = pw.toLowerCase().replace(/[^a-z0-9]/g, ''), local = String(email || '').split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    return [
      ['len', 'At least 12 characters (a few random words is a good idea)', pw.length >= 12],
      ['common', 'Not a common password', pw.length > 0 && COMMON.indexOf(pw.toLowerCase()) < 0 && COMMON.indexOf(n) < 0 && !/password|passw0rd|qwerty|asdfgh|zxcvb|123456|abcdef|letmein/.test(n)],
      ['email', 'Does not contain your email name', pw.length > 0 && !(local.length >= 4 && n.indexOf(local) >= 0)],
      ['match', 'Both boxes match', pw.length > 0 && pw === pw2]
    ];
  }
  function strength(pw) { var s = 0; if (pw.length >= 12) s++; if (pw.length >= 16) s++; if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++; if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) s++; return ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'][Math.min(s, 4)]; }
  function changeView() {
    tsToken = ''; tsId = null;
    frame('Choose your own password', '<div class="note"><b>One more step.</b> The temporary password only works to get you here. Choose your own password now. Nothing else opens until you do.</div>' +
      '<form id="ca-change" novalidate><div class="q"><label class="ql" for="ca-new">New password</label><input id="ca-new" type="password" autocomplete="new-password" aria-describedby="ca-rules"></div>' +
      '<div class="q"><label class="ql" for="ca-new2">Type it again</label><input id="ca-new2" type="password" autocomplete="new-password"></div>' +
      '<p class="hint"><label><input type="checkbox" id="ca-show2"> Show passwords</label></p><p class="hint" id="ca-strength" aria-live="polite"></p><ul id="ca-rules" class="hint" aria-live="polite" style="list-style:none;padding:0;margin:6px 0"></ul>' +
      '<div id="ca-ts" style="min-height:70px"></div><p id="ca-err" class="err" role="alert"></p><p><button type="submit" class="btn pri" id="ca-save" disabled>Save my password</button> <button type="button" class="btn" id="ca-out">Sign out</button></p></form>' + STORED);
    var upd = function () {
      var a = $('#ca-new').value, b = $('#ca-new2').value, rs = rules(a, b, ses && ses.email);
      $('#ca-rules').innerHTML = rs.map(function (r) { return '<li><span aria-hidden="true">' + (r[2] ? '✓' : '○') + '</span> ' + (r[2] ? '<span class="sr">Done: </span>' : '<span class="sr">Not yet: </span>') + esc(r[1]) + '</li>'; }).join('');
      $('#ca-strength').textContent = a ? 'Strength: ' + strength(a) : '';
      $('#ca-save').disabled = !rs.every(function (r) { return r[2]; }) || !tsToken || busy;
    };
    $('#ca-new').addEventListener('input', upd); $('#ca-new2').addEventListener('input', upd); upd();
    $('#ca-show2').addEventListener('change', function (e) { var t = e.target.checked ? 'text' : 'password'; $('#ca-new').type = t; $('#ca-new2').type = t; });
    $('#ca-out').addEventListener('click', signOut);
    $('#ca-change').addEventListener('submit', function (e) { e.preventDefault(); submitChange(); });
    window.__caUpd = upd; loadTurnstile();
    $('#ca-new').focus();
  }
  function loadTurnstile() {
    var go = function () { if (!window.turnstile || !$('#ca-ts')) return; tsId = window.turnstile.render('#ca-ts', { sitekey: TSKEY, action: 'client-login', callback: function (t) { tsToken = t; if (window.__caUpd) window.__caUpd(); }, 'expired-callback': function () { tsToken = ''; if (window.__caUpd) window.__caUpd(); }, 'error-callback': function () { tsToken = ''; var e = $('#ca-err'); if (e) e.textContent = 'The security check did not load. Reload the page and try again.'; } }); };
    if (window.turnstile) return go();
    var s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true; s.onload = go; s.onerror = function () { var e = $('#ca-err'); if (e) e.textContent = 'The security check could not load. Check your connection and reload the page.'; }; document.head.appendChild(s);
  }
  var WHY = { short: 'That is too short. Use at least 12 characters.', long: 'That is too long.', common: 'That is a very common password. Choose another.', email: 'It should not contain your email name.', pattern: 'That is too simple a pattern. Try a few unrelated words.', same_as_temp: 'It cannot be the temporary password. Choose a new one.', control: 'Remove the special control characters.' };
  function submitChange() {
    if (busy) return; var a = $('#ca-new').value, b = $('#ca-new2').value, err = $('#ca-err');
    if (!rules(a, b, ses && ses.email).every(function (r) { return r[2]; })) { err.textContent = 'Check the list above.'; return; }
    if (!tsToken) { err.textContent = 'Please wait for the security check.'; return; }
    busy = true; $('#ca-save').disabled = true; $('#ca-save').textContent = 'Saving'; err.textContent = '';
    fetch('/api/client-change-password', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + ses.access_token }, body: JSON.stringify({ new_password: a, turnstile: tsToken }) }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { s: r.status, j: j }; }); }, function () { return { s: 0, j: {} }; }).then(function (r) {
      busy = false; $('#ca-save').textContent = 'Save my password'; tsToken = '';
      if (r.s === 200 && r.j.ok) { var em = ses.email; frame('Saving', '<div class="big"><p>Password saved. Signing you in</p></div>'); signInCall(em, a).then(function (x) { a = ''; b = ''; if (x.err) return loginView('Your password was saved. Please sign in with it.'); afterSignIn(x.j, em); }); return; }
      var code = r.j && r.j.code, msg = 'That did not work. Try again, or ask Rhys.';
      if (r.s === 0) msg = 'No connection. Your password has not been changed. Try again.';
      else if (code === 'weak_password') msg = (r.j.reasons || []).map(function (k) { return WHY[k] || ''; }).join(' ') || WHY.common;
      else if (code === 'expired') return expiredView();
      else if (r.s === 401) return loginView('Your sign in ran out. Please sign in again.');
      else if (r.s === 429) msg = 'Too many tries. Wait a few minutes and try again.';
      else if (code === 'check_failed') msg = 'The security check did not pass. Try again.';
      else if (code === 'not_set_up') msg = 'This is not switched on yet. Please ask Rhys.';
      else if (code === 'not_pending' || r.s === 403) msg = 'This login cannot change its password here. Please ask Rhys.';
      $('#ca-err').textContent = msg; if (window.turnstile && tsId !== null) { try { window.turnstile.reset(tsId); } catch (e) { } } if (window.__caUpd) window.__caUpd();
    });
  }

  /* ---- sign out and the calls the page makes ---- */
  function signOut() {
    var t = ses && ses.access_token; ses = null; clearInterval(timer);
    var done = function () { location.reload(); };
    if (t) fetch(SB + '/auth/v1/logout', { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + t } }).then(done, done); else done();
  }
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-ca=signout]'); if (b) signOut(); });
  window.CA = {
    ready: function (fn) { startFn = fn; loginView(); },
    headers: function () { return { apikey: KEY, Authorization: 'Bearer ' + (ses ? ses.access_token : ''), 'Content-Type': 'application/json' }; },
    rpc: function (fn, args) {
      var go = function () { return fetch(SB + '/rest/v1/rpc/' + fn, { method: 'POST', headers: window.CA.headers(), body: JSON.stringify(args || {}) }); };
      return go().then(function (r) { if (r.status === 401) return refresh().then(function (ok) { return ok ? go() : r; }); return r; }).then(function (r) {
        if (r.status === 401 || (r.status === 400 && false)) { setTimeout(function () { loginView('Your sign in ran out. Please sign in again.'); }, 0); }
        return r.text().then(function (t) { if (!r.ok) { var er = new Error(t.slice(0, 160)); er.http = r.status; throw er; } return t ? JSON.parse(t) : null; });
      });
    }
  };
})();
