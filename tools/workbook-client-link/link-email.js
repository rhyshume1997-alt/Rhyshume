/* CLIENT LINK EMAIL: "Email the link" on the Client link screen of the hosted workbook.
   Inputs : the private link the workbook is showing right now (PT.token, shown once, never stored), the client's email from the Client screen
            (S.client.email), the owner session (clToken). Outputs: one POST to /api/client-link-email (same site, owner token), which sends a
            plain email through Resend. Nothing is stored in the workbook data, local storage or the database by this module.
   Must not change: it never reads or writes S beyond S.client.email and S.client.business, never saves the link, never sends without a confirm.
   Added to the workbook by tools/workbook-client-link/build.py. Independent of every other module and of any migration. */
const CLM = { ask: false, busy: false, msg: '', err: '', st: null, loading: false, to: '' };
const clmOk = e => /^[^\s@,;<>]{1,64}@[^\s@,;<>]+\.[^\s@,;<>]{2,}$/.test(e) && e.length <= 254;
async function clmCall(body) {
  const tok = await clToken();
  const r = await fetch('/api/client-link-email', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify(body) });
  let j = null; try { j = await r.json(); } catch (e) { j = null; }
  return { status: r.status, j: j || {} };
}
async function clmStatus() {
  if (CLM.loading) return; CLM.loading = true;
  try { const r = await clmCall({ action: 'status' }); CLM.st = r.status === 200 && r.j.ok ? { mail: !!r.j.mail } : { err: true }; }
  catch (e) { CLM.st = { err: true }; }
  CLM.loading = false; if (S.screen === 'portal') render();
}
const clmWhy = (status, j) => status === 429 ? 'Too many sends just now. Wait ' + (j.retry_after_s > 90 ? 'a few minutes' : 'a minute') + ' and try again'
  : j.code === 'mail_not_configured' ? 'Email is not switched on on the server yet'
  : j.code === 'bad_link' ? 'The link does not look right for sending. Make a new link on the live site and try again'
  : j.code === 'bad_email' ? 'The email address does not look right. Fix it on the Client screen'
  : (status === 401 || status === 403) ? 'You are not signed in as the owner. Sign in again'
  : status === 503 ? 'Email sending is not set up on the server yet'
  : 'The email did not go. Nothing was sent, so you can try again or copy the link and send it yourself';
function clmPanel() {
  if (!pOnline()) return '';
  if (!CLM.st && !CLM.loading) clmStatus();
  const to = String((S.client && S.client.email) || '').trim(), st = CLM.st;
  let body = '<p class="hint">Sends the client one plain email with their private link, from you. It is not marketing. The link is not saved by this tool, so you can only send it while it is showing above. If you have left this page, make a new link</p>';
  if (CLM.msg) body += '<div class="note" role="status"><b>Done:</b>' + esc(CLM.msg) + '</div>';
  if (CLM.err) body += note(esc(CLM.err), 'stop', 'Not sent:');
  if (!st) body += '<p class="hint">Checking whether email is switched on</p>';
  else if (st.err) body += note('Could not check the email set up. You can still copy the link and send it yourself', 'stop', 'Not available:');
  else if (!st.mail) body += note('Email sending is not switched on yet. The site needs a mail key before it can send. Copy the link above and send it yourself', 'stop', 'Not set up:');
  else if (!PT.token) body += '<p class="hint">Make the link first, then it can be sent from here</p>';
  else if (!clmOk(to)) body += '<p class="hint">There is no valid email address for this client. Add one on the Client screen first</p><p class="row"><button class="btn" data-go="setup">Go to the Client screen</button></p>';
  else if (CLM.ask) body += '<div class="note"><b>Send now?</b>Email the private link to <b>' + esc(to) + '</b>. Check the address is right, the link opens their page<p class="row" style="margin:8px 0 0"><button class="btn pri" data-act="clmyes" ' + (CLM.busy ? 'disabled' : '') + '>' + (CLM.busy ? 'Sending' : 'Yes, send it') + '</button><button class="btn" data-act="clmno" ' + (CLM.busy ? 'disabled' : '') + '>Cancel</button></p></div>';
  else body += '<p>To: <b>' + esc(to) + '</b></p><p class="row"><button class="btn pri" data-act="clmask">' + (CLM.msg ? 'Send it again' : 'Send link by email') + '</button></p>';
  return sec('2.5', 'Email the link', body);
}
Object.assign(ACTS2, {
  clmask: () => { CLM.err = ''; CLM.msg = ''; CLM.ask = true; render(); },
  clmno: () => { CLM.ask = false; render(); },
  clmyes: async () => {
    if (CLM.busy) return; const to = String((S.client && S.client.email) || '').trim();
    if (!PT.token || !clmOk(to)) { CLM.ask = false; render(); return; }
    CLM.busy = true; CLM.err = ''; render();
    try {
      const r = await clmCall({ action: 'send', to, link: pLink(), business: String((S.client && S.client.business) || '').trim() });
      if (r.status === 200 && r.j.ok) { CLM.msg = 'Sent to ' + to + ' at ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + '. If they do not see it, ask them to check junk'; CLM.err = ''; }
      else CLM.err = clmWhy(r.status, r.j);
    } catch (e) { CLM.err = 'No connection. Nothing was sent'; }
    CLM.busy = false; CLM.ask = false; render();
  }
});
