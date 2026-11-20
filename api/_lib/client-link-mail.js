'use strict';
/*
Client link by email (Option A): logic for POST /api/client-link-email.
Inputs : an owner request { action: 'status' } or { action: 'send', to, link, business } with Authorization: Bearer <Supabase access token>.
         Environment: CLIENT_OWNER_EMAIL (or CONTACT_TO when it holds exactly one address), RESEND_API_KEY, CONTACT_FROM (optional),
         SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (optional, they default to the public values the workbook already ships with).
Outputs: JSON { ok, code?, ... }. Sends one plain transactional email with the private client link through Resend.
Rules  : fails closed (nothing is sent) when the owner address is not set, the token is not the owner's, Resend is not configured,
         the recipient or the link is malformed, or a rate limit is hit. The token is verified by asking Supabase /auth/v1/user.
         The link must be this site's client page with a 48 hex token in the fragment, so this route cannot mail arbitrary content.
         No database access, no service role key, no accounts. The link token is never stored or logged. The recipient address is
         never logged. Rate limits live in this instance's memory only (see docs/client-access/DESIGN.md).
Must not change: the owner check, the link shape check, the fail closed behaviour, the absence of tracking and marketing in the email.
*/
const crypto = require('node:crypto');

const DEFAULT_URL = 'https://vkpdrqkwxkokolphmkbh.supabase.co';
const DEFAULT_PUBLISHABLE_KEY = 'sb_publishable_GL24QszG4OiwuzdL9QecwQ_ePysbKgx'; // public by design, same value as in the workbook page
const DEFAULT_FROM = 'Rhys Hume <hello@rhyshume.co.uk>';
const LINK_RE = /^https:\/\/(?:www\.)?rhyshume\.co\.uk\/c-09b37e50c043baaa\/#t=[0-9a-f]{48}$/;
const EMAIL_RE = /^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
const LB = new RegExp('[\\r\\n' + String.fromCharCode(0x2028, 0x2029) + ']+', 'g');
const oneLine = (s, max) => String(s == null ? '' : s).replace(LB, ' ').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const sameString = (a, b) => crypto.timingSafeEqual(sha(a), sha(b)) && String(a).length === String(b).length;

function config(env) {
  env = env || process.env;
  let owner = String(env.CLIENT_OWNER_EMAIL || '').trim().toLowerCase();
  if (!owner) { // existing variable, only trusted when it is a single address (the notes say it is Rhys's own inbox)
    const parts = String(env.CONTACT_TO || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    if (parts.length === 1) owner = parts[0];
  }
  return {
    supabaseUrl: String(env.SUPABASE_URL || DEFAULT_URL).replace(/\/+$/, ''),
    key: String(env.SUPABASE_PUBLISHABLE_KEY || DEFAULT_PUBLISHABLE_KEY),
    owner: EMAIL_RE.test(owner) ? owner : '',
    resendKey: String(env.RESEND_API_KEY || ''),
    from: oneLine(env.CONTACT_FROM, 200) || DEFAULT_FROM,
    replyTo: String(env.CONTACT_TO || '').split(',').map(s => s.trim()).filter(Boolean)[0] || ''
  };
}
const mailMissing = cfg => cfg.resendKey ? [] : ['RESEND_API_KEY'];

async function verifyOwner(cfg, token, fetchImpl) {
  if (!cfg.owner) return { ok: false, status: 503, code: 'not_configured' };
  if (!token || token.length > 4096) return { ok: false, status: 401, code: 'unauthenticated' };
  const f = fetchImpl || fetch, ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 6000);
  try {
    const res = await f(cfg.supabaseUrl + '/auth/v1/user', { headers: { apikey: cfg.key, Authorization: 'Bearer ' + token }, signal: ctl.signal });
    if (!res.ok) return { ok: false, status: 401, code: 'unauthenticated' };
    const u = await res.json();
    const email = String((u && u.email) || '').trim().toLowerCase();
    const role = u && u.app_metadata && u.app_metadata.role;
    if (!email || !(u.email_confirmed_at || u.confirmed_at) || u.is_anonymous) return { ok: false, status: 401, code: 'unauthenticated' };
    if (role === 'client' || !sameString(email, cfg.owner)) return { ok: false, status: 403, code: 'forbidden' };
    return { ok: true };
  } catch (e) { return { ok: false, status: 401, code: 'unauthenticated' }; } finally { clearTimeout(timer); }
}

function validateSend(b) {
  if (!b || typeof b !== 'object') return { ok: false, code: 'bad_request' };
  const to = oneLine(b.to, 254).toLowerCase();
  if (!EMAIL_RE.test(to) || to.length > 254) return { ok: false, code: 'bad_email' };
  const link = typeof b.link === 'string' ? b.link : '';
  if (!LINK_RE.test(link)) return { ok: false, code: 'bad_link' };
  return { ok: true, to, link, business: oneLine(b.business, 120) };
}

function buildEmail(o) {
  const who = o.business ? ' for ' + o.business : '';
  const subject = 'Your private page from Rhys Hume';
  const text = [
    'Hello,', '',
    'Rhys Hume (web design and systems, Glasgow) has set up a private page' + who + '. You can use it to tell him what you need, and to see and accept a quote if he sends you one.', '',
    'Open your private page:', o.link, '',
    'The link is private to you, so please do not forward it. It works on a phone or a computer. There is no account and no password.',
    'What is stored: the answers and pictures you choose to add are saved so that Rhys can read them. Nothing else about you is collected by the page.', '',
    'This is a one-off message about that page, not marketing. If you were not expecting it, you can ignore it, or reply to tell Rhys.', '',
    'Rhys Hume', 'rhyshume.co.uk'
  ].join('\n');
  const html = '<div style="font:16px/1.5 Arial,Helvetica,sans-serif;color:#1a1a1a;max-width:560px">' +
    '<p>Hello,</p><p>Rhys Hume (web design and systems, Glasgow) has set up a private page' + esc(who) + '. You can use it to tell him what you need, and to see and accept a quote if he sends you one.</p>' +
    '<p><a href="' + esc(o.link) + '" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 18px;text-decoration:none;border-radius:4px">Open your private page</a></p>' +
    '<p style="font-size:14px;color:#444">If the button does not work, copy this address into your browser:<br>' + esc(o.link) + '</p>' +
    '<p>The link is private to you, so please do not forward it. It works on a phone or a computer. There is no account and no password.</p>' +
    '<p>What is stored: the answers and pictures you choose to add are saved so that Rhys can read them. Nothing else about you is collected by the page.</p>' +
    '<p style="font-size:14px;color:#444">This is a one-off message about that page, not marketing. If you were not expecting it, you can ignore it, or reply to tell Rhys.</p>' +
    '<p>Rhys Hume<br>rhyshume.co.uk</p></div>';
  return { subject, text, html };
}

// Per instance memory limits. Vercel may run several instances and restarts them, so this slows a loop, it is not a hard cap.
const hits = new Map();
const LIMITS = { cooldownMs: 30 * 1000, perRecipientHour: 5, globalHour: 20 };
function rateCheck(to, now) {
  now = now || Date.now();
  const keep = a => (a || []).filter(t => now - t < 3600000);
  const k = sha(to).toString('hex'), mine = keep(hits.get(k)), all = keep(hits.get('*'));
  if (mine.length && now - mine[mine.length - 1] < LIMITS.cooldownMs) return { ok: false, retry: Math.ceil((LIMITS.cooldownMs - (now - mine[mine.length - 1])) / 1000) };
  if (mine.length >= LIMITS.perRecipientHour || all.length >= LIMITS.globalHour) return { ok: false, retry: 600 };
  mine.push(now); all.push(now); hits.set(k, mine); hits.set('*', all);
  return { ok: true };
}
const rateReset = () => hits.clear();

async function resendSend(cfg, payload, fetchImpl) {
  const f = fetchImpl || fetch, ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 10000);
  try {
    const res = await f('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + cfg.resendKey, 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctl.signal });
    if (!res.ok) return { ok: false, code: 'mail_failed', http: res.status };
    let id = ''; try { id = String((await res.json()).id || '').slice(0, 80); } catch (e) { /* ignore */ }
    return { ok: true, id };
  } catch (e) { return { ok: false, code: 'mail_failed' }; } finally { clearTimeout(timer); }
}

async function handle(input, deps) {
  deps = deps || {};
  const cfg = config(deps.env), out = (status, body) => ({ status, body });
  const who = await verifyOwner(cfg, input.token, deps.fetchImpl);
  if (!who.ok) return out(who.status, { ok: false, code: who.code });
  const b = input.body;
  if (!b || typeof b !== 'object') return out(400, { ok: false, code: 'bad_request' });
  if (b.action === 'status') { const m = mailMissing(cfg); return out(200, { ok: true, mail: m.length === 0, missing: m }); }
  if (b.action !== 'send') return out(400, { ok: false, code: 'bad_request' });
  const v = validateSend(b);
  if (!v.ok) return out(400, { ok: false, code: v.code });
  const missing = mailMissing(cfg);
  if (missing.length) { console.error('client-link-email: not configured, missing ' + missing.join(',')); return out(503, { ok: false, code: 'mail_not_configured' }); }
  const rl = rateCheck(v.to, deps.now);
  if (!rl.ok) return out(429, { ok: false, code: 'rate_limited', retry_after_s: rl.retry });
  const m = buildEmail(v);
  const payload = { from: cfg.from, to: [v.to], subject: m.subject, text: m.text, html: m.html };
  if (cfg.replyTo && EMAIL_RE.test(cfg.replyTo)) payload.reply_to = cfg.replyTo;
  const r = await resendSend(cfg, payload, deps.fetchImpl);
  if (!r.ok) { console.error('client-link-email: Resend failed' + (r.http ? ' ' + r.http : '')); return out(502, { ok: false, code: 'mail_failed' }); }
  console.log('client-link-email: sent via Resend, id ' + r.id);
  return out(200, { ok: true });
}

module.exports = { config, verifyOwner, validateSend, buildEmail, rateCheck, rateReset, handle, LINK_RE, EMAIL_RE, LIMITS, mailMissing };
