'use strict';
/*
Client access (Option B): server logic for the owner route (api/client-access.js) and the forced password change (api/client-change-password.js).
Inputs : owner requests { action, workbook_id, ... } with the owner's Supabase access token; the client's own access token and a chosen password.
         Environment: SUPABASE_SERVICE_ROLE_KEY (NOT SET YET, so everything here fails closed with 'not_set_up'), SUPABASE_URL and
         SUPABASE_PUBLISHABLE_KEY (default to the public values in the workbook), CLIENT_OWNER_EMAIL (or a single CONTACT_TO), RESEND_API_KEY,
         CONTACT_FROM, TURNSTILE_SECRET_KEY, CLIENT_LOGIN_URL (optional).
Outputs: JSON { ok, code?, ... }. The temporary password is returned ONCE, in the response to create or reset, and is never stored, logged or
         returned again. Writes: Supabase Auth admin API, client_accounts, client_access_log, client_rate_hit (all with the service role key).
Rules  : owner check identical to Option A (token verified against /auth/v1/user, exact owner email, role client refused); the service role key
         only ever travels in request headers; app_metadata (service role only) carries role, must_change_password, workbook_id, temp_expires_at,
         user_metadata is never read; rate limits use database counters and fail closed; errors are generic and never say whether an address has
         an account; the owner's own address can never be given a client login; the password-change route re-checks everything server side and
         never trusts the browser; no secret, password, token or email address is written to logs.
Must not change: fail closed on missing config, the single appearance of the temporary password, the separate (never combined) emails, the checks order.
*/
const crypto = require('node:crypto');
const A = require('./client-link-mail'); // owner verification, config, address pattern (Option A)
const P = require('./client-password');
const antispam = require('./antispam');

const TEMP_DAYS = 7;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const DEFAULT_LOGIN_URL = 'https://www.rhyshume.co.uk/client/';
const LB = new RegExp('[\\u0000-\\u001f\\u007f' + String.fromCharCode(0x2028, 0x2029) + ']+', 'g');
const oneLine = (s, n) => String(s == null ? '' : s).replace(LB, ' ').trim().slice(0, n);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');

function config(env) {
  env = env || process.env;
  const base = A.config(env);
  return Object.assign({}, base, {
    serviceKey: String(env.SUPABASE_SERVICE_ROLE_KEY || ''),
    turnstileSecret: String(env.TURNSTILE_SECRET_KEY || ''),
    loginUrl: /^https:\/\/[a-z0-9.-]+\/client\/$/.test(String(env.CLIENT_LOGIN_URL || '')) ? env.CLIENT_LOGIN_URL : DEFAULT_LOGIN_URL
  });
}
const setupMissing = cfg => { const m = []; if (!cfg.serviceKey) m.push('SUPABASE_SERVICE_ROLE_KEY'); if (!cfg.owner) m.push('CLIENT_OWNER_EMAIL'); return m; };

// ---- Supabase calls with the service role key (header only)
function mk(cfg, fetchImpl) {
  const f = fetchImpl || fetch;
  async function call(method, path, body, extra) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
    try {
      const res = await f(cfg.supabaseUrl + path, { method, headers: Object.assign({ apikey: cfg.serviceKey, Authorization: 'Bearer ' + cfg.serviceKey, 'Content-Type': 'application/json' }, extra || {}), body: body === undefined ? undefined : JSON.stringify(body), signal: ctl.signal });
      let j = null; const txt = await res.text(); try { j = txt ? JSON.parse(txt) : null; } catch (e) { j = null; }
      return { ok: res.ok, status: res.status, j };
    } catch (e) { return { ok: false, status: 0, j: null }; } finally { clearTimeout(t); }
  }
  return {
    call,
    rate: async (bucket, max, windowS) => { const r = await call('POST', '/rest/v1/rpc/client_rate_hit', { p_bucket: bucket, p_max: max, p_window_seconds: windowS }); if (!r.ok || !r.j || typeof r.j.allowed !== 'boolean') return { allowed: false, failed: true, retry: 60 }; return { allowed: r.j.allowed, retry: r.j.retry_after_s || 0 }; },
    account: async (col, val) => { const r = await call('GET', '/rest/v1/client_accounts?' + col + '=eq.' + encodeURIComponent(val) + '&select=*&limit=1'); return r.ok && Array.isArray(r.j) ? (r.j[0] || null) : undefined; },
    log: async (actor, action, workbookId, detail) => { const r = await call('POST', '/rest/v1/client_access_log', { actor: oneLine(actor, 254), action, workbook_id: workbookId || null, detail: detail || {} }, { Prefer: 'return=minimal' }); if (!r.ok) console.error('client-access: log write failed'); return r.ok; }
  };
}

// ---- mail (separate messages; never the password and the link together; the client page address is not the private link)
async function mail(cfg, fetchImpl, to, subject, text, html) {
  if (!cfg.resendKey) return { ok: false, code: 'mail_not_configured' };
  const payload = { from: cfg.from, to: [to], subject, text, html };
  if (cfg.replyTo && A.EMAIL_RE.test(cfg.replyTo)) payload.reply_to = cfg.replyTo;
  const f = fetchImpl || fetch, ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 10000);
  try { const r = await f('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + cfg.resendKey, 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctl.signal }); return r.ok ? { ok: true } : { ok: false, code: 'mail_failed' }; }
  catch (e) { return { ok: false, code: 'mail_failed' }; } finally { clearTimeout(t); }
}
function infoEmail(cfg, business, email, expires) {
  const day = new Date(expires).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' });
  const who = business ? ' for ' + business : '';
  const text = ['Hello,', '', 'Rhys Hume (web design and systems, Glasgow) has set up a private login' + who + '. You can use it to answer a few questions about what you need, and to see and accept a quote if he sends you one.', '',
    'Where to sign in: ' + cfg.loginUrl, 'Your login name is this email address: ' + email, '',
    'Rhys will give you a temporary password separately, by phone or text. This email does not contain it. The first time you sign in you will be asked to choose your own password straight away. The temporary one stops working on ' + day + ' if it has not been used.', '',
    'What is stored: your login email address, and the answers and pictures you choose to add. Nothing else about you is collected by the page.', '',
    'This is a one-off message about that login, not marketing. If you were not expecting it, ignore it, or reply to tell Rhys.', '', 'Rhys Hume', 'rhyshume.co.uk'].join('\n');
  const html = '<div style="font:16px/1.5 Arial,Helvetica,sans-serif;color:#1a1a1a;max-width:560px"><p>Hello,</p><p>Rhys Hume (web design and systems, Glasgow) has set up a private login' + esc(who) + '. You can use it to answer a few questions about what you need, and to see and accept a quote if he sends you one.</p>' +
    '<p>Where to sign in: <a href="' + esc(cfg.loginUrl) + '">' + esc(cfg.loginUrl) + '</a><br>Your login name is this email address: <b>' + esc(email) + '</b></p>' +
    '<p>Rhys will give you a temporary password separately, by phone or text. This email does not contain it. The first time you sign in you will be asked to choose your own password straight away. The temporary one stops working on ' + esc(day) + ' if it has not been used.</p>' +
    '<p>What is stored: your login email address, and the answers and pictures you choose to add. Nothing else about you is collected by the page.</p><p style="font-size:14px;color:#444">This is a one-off message about that login, not marketing. If you were not expecting it, ignore it, or reply to tell Rhys.</p><p>Rhys Hume<br>rhyshume.co.uk</p></div>';
  return { subject: 'Your private login from Rhys Hume', text, html };
}
function passwordEmail(cfg, pw, expires) {
  const day = new Date(expires).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' });
  const text = ['Hello,', '', 'Your temporary password for the private login is:', '', pw, '', 'You will be asked to choose your own password the first time you sign in. This one stops working on ' + day + '. Please delete this email once you have signed in.', '', 'Rhys Hume', 'rhyshume.co.uk'].join('\n');
  const html = '<div style="font:16px/1.5 Arial,Helvetica,sans-serif;color:#1a1a1a;max-width:560px"><p>Hello,</p><p>Your temporary password for the private login is:</p><p style="font:20px/1.4 monospace;letter-spacing:1px"><b>' + esc(pw) + '</b></p><p>You will be asked to choose your own password the first time you sign in. This one stops working on ' + esc(day) + '. Please delete this email once you have signed in.</p><p>Rhys Hume<br>rhyshume.co.uk</p></div>';
  return { subject: 'Your temporary password', text, html };
}

const stateOf = (acc, now) => !acc ? 'none' : acc.status === 'disabled' ? 'disabled' : acc.must_change_password ? (acc.temp_expires_at && Date.parse(acc.temp_expires_at) < now ? 'expired' : 'must_change') : 'active';
const out = (status, body) => ({ status, body });
const bad = code => out(400, { ok: false, code });
const GENERIC_FAIL = out(500, { ok: false, code: 'failed' });

// ============================================================ owner route
async function ownerHandle(input, deps) {
  deps = deps || {}; const cfg = config(deps.env), now = deps.now || Date.now();
  const who = await A.verifyOwner(cfg, input.token, deps.fetchImpl);
  if (!who.ok) return out(who.status, { ok: false, code: who.code });
  const b = input.body; if (!b || typeof b !== 'object') return bad('bad_request');
  const missing = setupMissing(cfg);
  if (b.action === 'config') return out(200, { ok: true, login_setup: missing.length === 0, missing, mail: !!cfg.resendKey });
  if (missing.length) { console.error('client-access: not set up, missing ' + missing.join(',')); return out(503, { ok: false, code: 'not_set_up' }); }
  if (typeof b.workbook_id !== 'string' || !UUID_RE.test(b.workbook_id)) return bad('bad_request');
  const wid = b.workbook_id, db = mk(cfg, deps.fetchImpl), actor = cfg.owner;
  const A_ = ['status', 'create', 'reset', 'disable', 'delete', 'email_info'];
  if (A_.indexOf(b.action) === -1) return bad('bad_request');
  const acc = await db.account('workbook_id', wid);
  if (acc === undefined) return GENERIC_FAIL; // the account table could not be read: refuse, do not guess
  if (b.action !== 'status' && b.action !== 'create') { const rl = await db.rate('mutate:owner', 60, 3600); if (!rl.allowed) return out(429, { ok: false, code: 'rate_limited', retry_after_s: rl.retry }); }

  if (b.action === 'status') {
    if (!acc) return out(200, { ok: true, state: 'none' });
    let last = null; const u = await db.call('GET', '/auth/v1/admin/users/' + acc.auth_user_id); if (u.ok && u.j) last = u.j.last_sign_in_at || null;
    return out(200, { ok: true, state: stateOf(acc, now), email: acc.email, created_at: acc.created_at, temp_expires_at: acc.must_change_password ? acc.temp_expires_at : null, last_sign_in_at: last, password_changed_at: acc.password_changed_at, disabled_at: acc.disabled_at });
  }

  const newTemp = async () => { const pw = P.generateTemp(deps.randomInt), exp = new Date(now + TEMP_DAYS * 86400000).toISOString(); return { pw, exp }; };
  const wantsInfo = b.send_info === true, wantsPw = b.email_password === true;

  if (b.action === 'create') {
    if (acc) return out(409, { ok: false, code: 'exists' });
    const email = oneLine(b.email, 254).toLowerCase();
    if (!A.EMAIL_RE.test(email) || email.length > 254) return bad('bad_email');
    if (email === cfg.owner) return out(400, { ok: false, code: 'cannot_create' });
    if (wantsPw && b.acknowledged_risk !== true) return bad('risk_not_acknowledged');
    for (const [k, mx, w] of [['create:owner', 10, 3600], ['create:wb:' + wid, 5, 86400]]) { const rl = await db.rate(k, mx, w); if (!rl.allowed) return out(429, { ok: false, code: 'rate_limited', retry_after_s: rl.retry }); }
    const { pw, exp } = await newTemp();
    const cu = await db.call('POST', '/auth/v1/admin/users', { email, password: pw, email_confirm: true, app_metadata: { role: 'client', must_change_password: true, workbook_id: wid, temp_expires_at: exp } });
    if (!cu.ok || !cu.j || !cu.j.id) return out(409, { ok: false, code: 'cannot_create' }); // generic: does not say whether the address already has an account
    const uid = cu.j.id;
    const ins = await db.call('POST', '/rest/v1/client_accounts', { auth_user_id: uid, workbook_id: wid, email, must_change_password: true, temp_expires_at: exp }, { Prefer: 'return=minimal' });
    if (!ins.ok) { await db.call('DELETE', '/auth/v1/admin/users/' + uid); return out(409, { ok: false, code: 'cannot_create' }); }
    await db.log(actor, 'create', wid, { email_hash: sha(email).slice(0, 12), temp_days: TEMP_DAYS });
    const res = { ok: true, temp_password: pw, temp_expires_at: exp, login_url: cfg.loginUrl, info_sent: false, password_emailed: false };
    return finishMail(cfg, deps, db, actor, wid, email, b, pw, exp, res, wantsInfo, wantsPw);
  }
  if (!acc) return out(404, { ok: false, code: 'none' });

  if (b.action === 'reset') {
    if (wantsPw && b.acknowledged_risk !== true) return bad('risk_not_acknowledged');
    const { pw, exp } = await newTemp();
    const up = await db.call('PUT', '/auth/v1/admin/users/' + acc.auth_user_id, { password: pw, ban_duration: 'none', app_metadata: { role: 'client', must_change_password: true, workbook_id: wid, temp_expires_at: exp } });
    if (!up.ok) return GENERIC_FAIL;
    const pr = await db.call('PATCH', '/rest/v1/client_accounts?id=eq.' + acc.id, { must_change_password: true, temp_expires_at: exp, status: 'active', disabled_at: null, session_epoch: new Date(now).toISOString() }, { Prefer: 'return=minimal' });
    if (!pr.ok) return GENERIC_FAIL;
    await db.log(actor, 'reset', wid, { temp_days: TEMP_DAYS });
    return finishMail(cfg, deps, db, actor, wid, acc.email, b, pw, exp, { ok: true, temp_password: pw, temp_expires_at: exp, login_url: cfg.loginUrl, info_sent: false, password_emailed: false }, wantsInfo, wantsPw);
  }
  if (b.action === 'disable') {
    const pr = await db.call('PATCH', '/rest/v1/client_accounts?id=eq.' + acc.id, { status: 'disabled', disabled_at: new Date(now).toISOString(), session_epoch: new Date(now).toISOString() }, { Prefer: 'return=minimal' });
    if (!pr.ok) return GENERIC_FAIL; // the database change is the one that matters: it stops all data access at once
    await db.call('PUT', '/auth/v1/admin/users/' + acc.auth_user_id, { ban_duration: '876000h' }); // also block signing in; best effort, the row already denies data
    await db.log(actor, 'disable', wid, {});
    return out(200, { ok: true });
  }
  if (b.action === 'delete') {
    const d = await db.call('DELETE', '/auth/v1/admin/users/' + acc.auth_user_id);
    if (!d.ok && d.status !== 404) return GENERIC_FAIL;
    await db.call('DELETE', '/rest/v1/client_accounts?id=eq.' + acc.id, undefined, { Prefer: 'return=minimal' });
    await db.log(actor, 'delete', wid, {});
    return out(200, { ok: true });
  }
  if (b.action === 'email_info') {
    if (acc.status !== 'active') return out(409, { ok: false, code: 'not_active' });
    const m = infoEmail(cfg, oneLine(b.business, 120), acc.email, acc.temp_expires_at || now);
    const r = await mail(cfg, deps.fetchImpl, acc.email, m.subject, m.text, m.html);
    if (!r.ok) return out(r.code === 'mail_not_configured' ? 503 : 502, { ok: false, code: r.code });
    await db.log(actor, 'email_login_info', wid, {});
    return out(200, { ok: true });
  }
  return bad('bad_request');
}
async function finishMail(cfg, deps, db, actor, wid, email, b, pw, exp, res, wantsInfo, wantsPw) {
  if (wantsInfo) { const m = infoEmail(cfg, oneLine(b.business, 120), email, exp); const r = await mail(cfg, deps.fetchImpl, email, m.subject, m.text, m.html); res.info_sent = r.ok; if (!r.ok) res.info_error = r.code; else await db.log(actor, 'email_login_info', wid, {}); }
  if (wantsPw) { await db.log(actor, 'email_password_warning', wid, { chose_to_email_password: true }); const m = passwordEmail(cfg, pw, exp); const r = await mail(cfg, deps.fetchImpl, email, m.subject, m.text, m.html); res.password_emailed = r.ok; if (!r.ok) res.password_error = r.code; }
  return out(200, res);
}

// ============================================================ forced password change (client)
const signIn = async (cfg, f, email, password) => { try { const r = await (f || fetch)(cfg.supabaseUrl + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: cfg.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }); return r.ok; } catch (e) { return false; } };
async function changeHandle(input, deps) {
  deps = deps || {}; const cfg = config(deps.env), now = deps.now || Date.now();
  if (!cfg.serviceKey) { console.error('client-change-password: not set up, missing SUPABASE_SERVICE_ROLE_KEY'); return out(503, { ok: false, code: 'not_set_up' }); }
  if (!cfg.turnstileSecret) { console.error('client-change-password: not set up, missing TURNSTILE_SECRET_KEY'); return out(503, { ok: false, code: 'not_set_up' }); }
  const db = mk(cfg, deps.fetchImpl), ipKey = sha(String(input.ip || 'unknown') + '|' + sha(cfg.serviceKey)).slice(0, 24);
  const rl = await db.rate('change:ip:' + ipKey, 20, 3600); if (!rl.allowed) return out(429, { ok: false, code: 'rate_limited', retry_after_s: rl.retry });
  const ts = await antispam.verifyTurnstile({ secret: cfg.turnstileSecret, token: input.body && input.body.turnstile, ip: input.ip, expectedAction: 'client-login', allowedHostnames: ['rhyshume.co.uk', 'www.rhyshume.co.uk'], fetchImpl: deps.fetchImpl });
  if (!ts.ok) return out(ts.reason === 'rejected' || ts.reason === 'missing_token' || ts.reason === 'wrong_action' || ts.reason === 'wrong_hostname' ? 403 : 503, { ok: false, code: 'check_failed' });
  const tok = input.token; if (!tok || tok.length > 4096) return out(401, { ok: false, code: 'unauthenticated' });
  const f = deps.fetchImpl || fetch; let user;
  try { const r = await f(cfg.supabaseUrl + '/auth/v1/user', { headers: { apikey: cfg.key, Authorization: 'Bearer ' + tok } }); if (!r.ok) return out(401, { ok: false, code: 'unauthenticated' }); user = await r.json(); } catch (e) { return out(401, { ok: false, code: 'unauthenticated' }); }
  const uemail = String(user && user.email || '').trim().toLowerCase();
  if (!user || !user.id || !UUID_RE.test(String(user.id)) || !user.app_metadata || user.app_metadata.role !== 'client' || !uemail || uemail === cfg.owner) return out(403, { ok: false, code: 'forbidden' });
  const ru = await db.rate('change:user:' + user.id, 8, 3600); if (!ru.allowed) return out(429, { ok: false, code: 'rate_limited', retry_after_s: ru.retry });
  const acc = await db.account('auth_user_id', user.id);
  if (!acc) return out(403, { ok: false, code: 'forbidden' });
  if (acc.status !== 'active') return out(403, { ok: false, code: 'forbidden' });
  if (acc.email !== uemail) return out(403, { ok: false, code: 'forbidden' });
  if (!acc.must_change_password) return out(409, { ok: false, code: 'not_pending' });
  if (acc.temp_expires_at && Date.parse(acc.temp_expires_at) < now) return out(403, { ok: false, code: 'expired' });
  const pw = input.body && input.body.new_password;
  if (typeof pw !== 'string') return bad('bad_request');
  const chk = P.checkNew(pw, acc.email); if (!chk.ok) return out(400, { ok: false, code: 'weak_password', reasons: chk.reasons });
  if (await signIn(cfg, deps.fetchImpl, acc.email, pw)) return out(400, { ok: false, code: 'weak_password', reasons: ['same_as_temp'] }); // it already works as the current password
  const up = await db.call('PUT', '/auth/v1/admin/users/' + user.id, { password: pw, app_metadata: { role: 'client', must_change_password: false, workbook_id: acc.workbook_id, temp_expires_at: null } });
  if (!up.ok) return GENERIC_FAIL;
  const pr = await db.call('PATCH', '/rest/v1/client_accounts?id=eq.' + acc.id, { must_change_password: false, temp_expires_at: null, password_changed_at: new Date(now).toISOString(), session_epoch: new Date(now).toISOString() }, { Prefer: 'return=minimal' });
  if (!pr.ok) { console.error('client-change-password: password set but the account row was not cleared'); return GENERIC_FAIL; } // stays denied by the database; Rhys resets
  try { await f(cfg.supabaseUrl + '/auth/v1/logout?scope=global', { method: 'POST', headers: { apikey: cfg.key, Authorization: 'Bearer ' + tok } }); } catch (e) { /* best effort: the session epoch already denies older tokens */ }
  await db.log(acc.email, 'change_password', acc.workbook_id, {});
  return out(200, { ok: true });
}
module.exports = { config, setupMissing, ownerHandle, changeHandle, infoEmail, passwordEmail, stateOf, TEMP_DAYS, UUID_RE };
