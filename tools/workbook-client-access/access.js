/* CLIENT ACCESS PANEL: "Client access" on the Client link screen of the hosted workbook (Option B, client login with a temporary password).
   Inputs : the open client (CL.id), their email from the Client screen (S.client.email), the owner session (clToken).
   Outputs: POSTs to /api/client-access (same site, owner token): config, status, create, reset, disable, delete, email_info.
   Rules  : the temporary password exists only in CAC.reveal, in memory, from the moment the server returns it until Rhys presses Hide, changes
            client or reloads. It is never written to S, local storage, session storage or the database by this module, and the server never
            returns it again. Nothing is sent without a confirm step. Independent of the Option A module and of every other module.
   Must not change: the single appearance of the password, the confirm steps, the plain wording about the risk of emailing a password.
   Added to the workbook by tools/workbook-client-access/build.py. */
const CAC = { cfg: null, st: null, busy: false, err: '', msg: '', reveal: null, ask: '', o: { info: false, pw: false, ack: false }, wb: '', loading: false };
const cacOk = e => /^[^\s@,;<>]{1,64}@[^\s@,;<>]+\.[^\s@,;<>]{2,}$/.test(e) && e.length <= 254;
function cacReset() { if (CAC.wb !== CL.id) { CAC.wb = CL.id; CAC.st = null; CAC.reveal = null; CAC.ask = ''; CAC.err = ''; CAC.msg = ''; CAC.o = { info: false, pw: false, ack: false }; } }
async function cacCall(body) {
  const tok = await clToken();
  const r = await fetch('/api/client-access', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify(body) });
  let j = null; try { j = await r.json(); } catch (e) { j = null; }
  return { status: r.status, j: j || {} };
}
async function cacLoad(force) {
  if (CAC.loading) return; CAC.loading = true;
  try {
    if (!CAC.cfg || force) { const c = await cacCall({ action: 'config' }); CAC.cfg = c.status === 200 && c.j.ok ? { setup: !!c.j.login_setup, missing: c.j.missing || [], mail: !!c.j.mail } : { err: true }; }
    if (CAC.cfg.setup) { const s = await cacCall({ action: 'status', workbook_id: CL.id }); CAC.st = s.status === 200 && s.j.ok ? s.j : { err: true }; }
  } catch (e) { if (!CAC.cfg) CAC.cfg = { err: true }; else CAC.st = { err: true }; }
  CAC.loading = false; if (S.screen === 'portal') render();
}
const cacWhy = (s, j) => s === 429 ? 'Too many changes just now. Wait a few minutes and try again'
  : j.code === 'not_set_up' ? 'Client logins are not switched on on the server yet'
  : j.code === 'exists' ? 'This client already has a login'
  : j.code === 'cannot_create' ? 'A login could not be made for that address. Use a different address, or check the Client screen'
  : j.code === 'bad_email' ? 'The email address does not look right. Fix it on the Client screen'
  : j.code === 'risk_not_acknowledged' ? 'Tick the box that says you understand the risk of emailing a password'
  : (s === 401 || s === 403) ? 'You are not signed in as the owner. Sign in again'
  : 'That did not work, and nothing was left half done. Try again';
const cacDate = t => { try { return new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
const CAC_STATE = { none: 'No login', must_change: 'Login made, waiting for them to choose their own password', active: 'Active', expired: 'Temporary password ran out, not used. Reset it to try again', disabled: 'Switched off' };
function cacOpts(reset) {
  const mail = CAC.cfg && CAC.cfg.mail;
  return '<div class="q"><label><input type="checkbox" data-cacopt="info" ' + (CAC.o.info ? 'checked' : '') + (mail ? '' : ' disabled') + '> Also email them the sign in address and instructions. That email never contains the password</label>' + (mail ? '' : '<div class="hint">Email is not set up on the server, so this is off</div>') + '</div>' +
    '<div class="q"><label><input type="checkbox" data-cacopt="pw" ' + (CAC.o.pw ? 'checked' : '') + (mail ? '' : ' disabled') + '> Email them the temporary password as well (not recommended)</label>' +
    (CAC.o.pw ? '<div class="note bad"><b>Warning:</b>Email is not a safe place for a password. Anyone who can read their inbox, now or later, could sign in until they choose their own. Giving it by phone or text is safer. This choice is logged<label style="display:block;margin-top:6px"><input type="checkbox" data-cacopt="ack" ' + (CAC.o.ack ? 'checked' : '') + '> I understand and I still want to email it</label></div>' : '<div class="hint">Safer: give it to them yourself by phone or text. It goes in a separate email from the instructions, never together</div>') + '</div>';
}
function cacPanel() {
  if (!pOnline()) return ''; cacReset();
  if (!CAC.cfg && !CAC.loading) cacLoad(false); else if (CAC.cfg && CAC.cfg.setup && !CAC.st && !CAC.loading) cacLoad(false);
  const to = String((S.client && S.client.email) || '').trim().toLowerCase(), c = CAC.cfg, st = CAC.st;
  let b = '<p class="hint">A login lets the client sign in with their email and a temporary password, and see only their own page, the same as the link. They must choose their own password the first time. This is the less safe option, the link is simpler</p>';
  if (CAC.msg) b += '<div class="note" role="status"><b>Done:</b>' + esc(CAC.msg) + '</div>';
  if (CAC.err) b += note(esc(CAC.err), 'stop', 'Problem:');
  if (CAC.reveal) { const r = CAC.reveal; b += '<div class="note"><b>Temporary password, shown once:</b>Give it to them by phone or text. It is not saved anywhere and cannot be shown again. If it is lost, reset it<div class="mono" style="font-size:22px;letter-spacing:.08em;margin:8px 0;user-select:all" id="cac-pw">' + esc(r.pw) + '</div><div class="hint">Sign in address: ' + esc(r.url) + ' &middot; login name: ' + esc(r.email) + ' &middot; it stops working on ' + esc(cacDate(r.exp)) + ' if unused</div><p class="row"><button class="btn pri" data-act="caccopy">Copy the password</button><button class="btn" data-act="cachide">Hide it</button></p></div>'; }
  if (!c) b += '<p class="hint">Checking whether client logins are switched on</p>';
  else if (c.err) b += note('Could not check the client login set up. The link options above still work', 'stop', 'Not available:');
  else if (!c.setup) b += note('Client logins are not switched on yet. The server needs ' + c.missing.map(m => '<span class="mono">' + esc(m) + '</span>').join(' and ') + ' and the database change approved first. Nothing here works until then. The link above still does', 'stop', 'Not set up:');
  else if (!st) b += '<p class="hint">Loading the login status</p>';
  else if (st.err) b += note('Could not read the login status. Nothing was changed', 'stop', 'Not available:');
  else {
    b += '<table class="tbl"><tr><th>Login</th><td>' + esc(CAC_STATE[st.state] || st.state) + '</td></tr>' + (st.state !== 'none' ? '<tr><th>Login name</th><td>' + esc(st.email || '') + '</td></tr><tr><th>Made</th><td>' + esc(cacDate(st.created_at)) + '</td></tr><tr><th>Last signed in</th><td>' + (st.last_sign_in_at ? esc(cacDate(st.last_sign_in_at)) : 'never') + '</td></tr>' + (st.temp_expires_at ? '<tr><th>Temporary password ends</th><td>' + esc(cacDate(st.temp_expires_at)) + '</td></tr>' : '') : '') + '</table>';
    const yn = (txt, act, lbl) => '<div class="note"><b>' + txt[0] + '</b>' + txt[1] + '<p class="row" style="margin:8px 0 0"><button class="btn pri" data-act="' + act + '" ' + (CAC.busy ? 'disabled' : '') + '>' + (CAC.busy ? 'Working' : lbl) + '</button><button class="btn" data-act="cacno" ' + (CAC.busy ? 'disabled' : '') + '>Cancel</button></p></div>';
    if (st.state === 'none') {
      if (!cacOk(to)) b += '<p class="hint">Add the client\'s email on the Client screen first. The login uses that address</p><p class="row"><button class="btn" data-go="setup">Go to the Client screen</button></p>';
      else if (CAC.ask === 'create') b += '<div class="note"><b>Create a login for ' + esc(to) + '?</b>They sign in with this address. A temporary password is made and shown to you once.' + cacOpts() + '<p class="row" style="margin:8px 0 0"><button class="btn pri" data-act="cacyes" ' + (CAC.busy || (CAC.o.pw && !CAC.o.ack) ? 'disabled' : '') + '>' + (CAC.busy ? 'Working' : 'Yes, create the login') + '</button><button class="btn" data-act="cacno" ' + (CAC.busy ? 'disabled' : '') + '>Cancel</button></p></div>';
      else b += '<p>Login address: <b>' + esc(to) + '</b></p><p class="row"><button class="btn pri" data-act="cacmake">Create client login</button></p>';
    } else if (CAC.ask === 'reset') b += '<div class="note"><b>Make a new temporary password?</b>The old password and any open sign in stop working straight away. They will be asked to choose their own again.' + cacOpts() + '<p class="row" style="margin:8px 0 0"><button class="btn pri" data-act="cacyes" ' + (CAC.busy || (CAC.o.pw && !CAC.o.ack) ? 'disabled' : '') + '>' + (CAC.busy ? 'Working' : 'Yes, reset it') + '</button><button class="btn" data-act="cacno" ' + (CAC.busy ? 'disabled' : '') + '>Cancel</button></p></div>';
    else if (CAC.ask === 'disable') b += yn(['Switch this login off?', 'They are signed out and cannot see anything. Their answers are kept. Reset the password to switch it back on'], 'cacyes', 'Yes, switch it off');
    else if (CAC.ask === 'delete') b += yn(['Delete this login?', 'The login is removed for good. Their answers and link are not deleted. It cannot be undone'], 'cacyes', 'Yes, delete the login');
    else b += '<p class="row"><button class="btn" data-act="cacreset">Reset temp password</button><button class="btn" data-act="cacdisable" ' + (st.state === 'disabled' ? 'disabled' : '') + '>Disable login</button><button class="btn" data-act="cacdel">Delete login</button><button class="btn" data-act="cacinfo" ' + (c.mail && st.state !== 'disabled' ? '' : 'disabled') + '>Email sign in instructions</button></p>' + (c.mail ? '' : '<p class="hint">Email is not set up on the server, so instructions cannot be sent from here</p>');
  }
  return sec('2.7', 'Client access', b);
}
document.addEventListener('change', e => { const t = e.target, o = t && t.dataset && t.dataset.cacopt; if (!o) return; CAC.o[o] = !!t.checked; if (o === 'pw' && !t.checked) CAC.o.ack = false; render(); });
Object.assign(ACTS2, {
  cacmake: () => { CAC.err = ''; CAC.msg = ''; CAC.ask = 'create'; CAC.o = { info: false, pw: false, ack: false }; render(); },
  cacreset: () => { CAC.err = ''; CAC.msg = ''; CAC.ask = 'reset'; CAC.o = { info: false, pw: false, ack: false }; render(); },
  cacdisable: () => { CAC.err = ''; CAC.msg = ''; CAC.ask = 'disable'; render(); },
  cacdel: () => { CAC.err = ''; CAC.msg = ''; CAC.ask = 'delete'; render(); },
  cacno: () => { CAC.ask = ''; render(); },
  cachide: () => { CAC.reveal = null; render(); },
  caccopy: async () => { try { await navigator.clipboard.writeText(CAC.reveal.pw); CAC.msg = 'Password copied. It is still shown once above'; } catch (e) { CAC.msg = 'Could not copy. Select the password above and copy it'; } render(); },
  cacinfo: async () => {
    if (CAC.busy) return; CAC.busy = true; CAC.err = ''; CAC.msg = ''; render();
    try { const r = await cacCall({ action: 'email_info', workbook_id: CL.id, business: String((S.client && S.client.business) || '') }); if (r.status === 200 && r.j.ok) CAC.msg = 'Sign in instructions emailed. No password was in it'; else CAC.err = r.j.code === 'mail_not_configured' || r.status === 503 ? 'Email is not set up on the server, nothing was sent' : cacWhy(r.status, r.j); } catch (e) { CAC.err = 'No connection. Nothing was sent'; }
    CAC.busy = false; render();
  },
  cacyes: async () => {
    if (CAC.busy || !CAC.ask) return; const act = CAC.ask; if (CAC.o.pw && !CAC.o.ack && (act === 'create' || act === 'reset')) return;
    CAC.busy = true; CAC.err = ''; CAC.msg = ''; render();
    const body = { action: act, workbook_id: CL.id }; if (act === 'create' || act === 'reset') { body.business = String((S.client && S.client.business) || ''); body.send_info = !!CAC.o.info; body.email_password = !!CAC.o.pw; body.acknowledged_risk = !!CAC.o.ack; } if (act === 'create') body.email = String((S.client && S.client.email) || '').trim();
    try {
      const r = await cacCall(body);
      if (r.status === 200 && r.j.ok) {
        if (r.j.temp_password) CAC.reveal = { pw: r.j.temp_password, exp: r.j.temp_expires_at, url: r.j.login_url, email: String((S.client && S.client.email) || '').trim().toLowerCase() };
        const bits = []; if (r.j.info_sent) bits.push('instructions emailed'); if (r.j.password_emailed) bits.push('password emailed (logged)'); if (r.j.info_error || r.j.password_error) bits.push('an email did not go');
        CAC.msg = ({ create: 'Login created', reset: 'New temporary password made', disable: 'Login switched off', delete: 'Login deleted' }[act]) + (bits.length ? ', ' + bits.join(', ') : '');
        if (act === 'delete' || act === 'disable') CAC.reveal = null;
      } else CAC.err = cacWhy(r.status, r.j);
    } catch (e) { CAC.err = 'No connection. Nothing was changed'; }
    CAC.busy = false; CAC.ask = ''; CAC.o = { info: false, pw: false, ack: false }; CAC.st = null; render();
  }
});
