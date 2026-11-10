'use strict';

/*
Reusable anti spam helpers for contact and quote forms on Vercel serverless functions.
No dependencies. Needs Node 18 or newer (uses the built in fetch).

verifyTurnstile   mandatory server side check of the Cloudflare Turnstile token
classify          scores a submission for unsolicited SEO and marketing pitches
quarantineTarget  where suspicious enquiries go to be reviewed (never deleted)

Copy this file into any site unchanged. Per site settings live in environment variables
and in the options passed by the function that calls it.
*/

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const MAX_TOKEN_LENGTH = 2048; // Cloudflare's documented maximum

/*
Turnstile only protects the form if the server checks the token, so this is the part that matters.
Returns { ok: true } or { ok: false, reason } where reason is one of:
not_configured  no secret set, fail closed
missing_token   the browser sent no token (script blocked, bot, or form posted directly)
rejected        Cloudflare says the token is invalid, expired or already used
wrong_hostname  the token was issued on a different site
wrong_action    the token was issued for a different form
unavailable     Cloudflare could not be reached or had an internal error, fail closed
*/
async function verifyTurnstile(opts) {
  const token = typeof opts.token === 'string' ? opts.token.trim() : '';
  if (!opts.secret) return { ok: false, reason: 'not_configured' };
  if (!token || token.length > MAX_TOKEN_LENGTH) return { ok: false, reason: 'missing_token' };

  const doFetch = opts.fetchImpl || fetch;
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, opts.timeoutMs || 5000);
  let data;
  try {
    const body = new URLSearchParams();
    body.set('secret', opts.secret);
    body.set('response', token);
    if (opts.ip && opts.ip !== 'unknown') body.set('remoteip', opts.ip);
    const res = await doFetch(SITEVERIFY_URL, { method: 'POST', body: body, signal: controller.signal });
    if (!res.ok) return { ok: false, reason: 'unavailable' };
    data = await res.json();
  } catch (e) {
    return { ok: false, reason: 'unavailable' };
  } finally {
    clearTimeout(timer);
  }

  const codes = Array.isArray(data && data['error-codes']) ? data['error-codes'] : [];
  if (!data || data.success !== true) {
    if (codes.indexOf('internal-error') !== -1) return { ok: false, reason: 'unavailable', codes: codes };
    return { ok: false, reason: 'rejected', codes: codes };
  }
  if (opts.allowedHostnames && opts.allowedHostnames.length) {
    const host = String(data.hostname || '').toLowerCase();
    if (opts.allowedHostnames.indexOf(host) === -1) return { ok: false, reason: 'wrong_hostname' };
  }
  if (opts.expectedAction && data.action !== opts.expectedAction) return { ok: false, reason: 'wrong_action' };
  return { ok: true };
}

/*
Spam scoring. A pitch scores points for sales phrases and links, and loses points for real engineering words,
so a genuine enquiry that mentions "SEO" once still goes straight through.
*/
const MARKETING = [
  /\bseo\b/i,
  /search engine optimi[sz]ation/i,
  /digital marketing/i,
  /marketing (agency|services|company|team|expert)/i,
  /web ?(site)? ?(design|development|redesign)\s+(services|agency|company|team|expert)/i,
  /first page of google/i,
  /google (ranking|rankings|first page|page one|my business)/i,
  /(increase|boost|improve|grow|skyrocket)\s+(your\s+)?(website\s+)?(traffic|rankings|sales|leads|visibility|online presence|revenue)/i,
  /back-?links?/i,
  /guest post/i,
  /lead generation/i,
  /social media (marketing|management)/i,
  /we (noticed|looked at|visited|reviewed|came across|were looking at) your (website|site)/i,
  /free (website |seo )?(audit|analysis|consultation|report|mock-?up|trial)/i,
  /(website|site) (audit|issues|errors|is not|isn't)/i,
  /\bppc\b|google ads|facebook ads|instagram ads/i,
  /(cold )?email (campaign|outreach|marketing)/i,
  /outsourc(e|ing)\s+(your\s+)?(it|development|marketing|design)/i,
  /(mobile )?app development/i,
  /\b(crypto|bitcoin|forex)\b/i,
  /(business|merchant) (loan|funding|financing)/i,
  /\bunsubscribe\b/i,
  /reply (with )?["']?(stop|no)["']?/i
];

const ENGINEERING = [
  /\bcnc\b/i, /\bmill(ing|ed)?\b/i, /\bturn(ing|ed)\b/i, /\bmachin(e|ed|ing)\b/i, /\bdrawings?\b/i,
  /\btoleranc/i, /\balumin(i)?um\b/i, /\bstainless\b/i, /\bsteel\b/i, /\btitanium\b/i, /\bbrass\b/i,
  /\bbronze\b/i, /\bdelrin\b/i, /\bpeek\b/i, /\bnylon\b/i, /\bprototypes?\b/i, /\bbrackets?\b/i,
  /\bshafts?\b/i, /\bflanges?\b/i, /\bthreads?\b/i, /\bbore\b/i, /\banodi[sz]/i, /\bdxf\b/i,
  /\bqty\b/i, /\b\d+\s?mm\b/i, /\bbatch\b/i, /\bfabricat/i, /\bweld/i, /\bwater ?jet\b/i
];

function countUrls(text) {
  const m = String(text).match(/https?:\/\/|www\./gi);
  return m ? m.length : 0;
}

/*
sub: { name, company, email, message, service, quantity, material, fileCount }
opts: { threshold } default 4
Returns { score, reasons, quarantine }
*/
function classify(sub, opts) {
  const threshold = (opts && opts.threshold) || 4;
  const text = [sub.company, sub.name, sub.message, sub.material, sub.quantity].join(' \n ');
  let score = 0;
  const reasons = [];

  let marketing = 0;
  MARKETING.forEach(function (re) { if (re.test(text)) marketing += 1; });
  if (marketing) {
    const pts = Math.min(marketing * 3, 9);
    score += pts;
    reasons.push('sales phrases x' + marketing + ' (+' + pts + ')');
  }

  const urls = countUrls(text);
  if (urls >= 2) { score += 3; reasons.push(urls + ' links (+3)'); }
  else if (urls === 1) { score += 1; reasons.push('1 link (+1)'); }

  const hasJobDetail = (sub.fileCount > 0) || !!(sub.quantity || sub.material || sub.service);
  if (!hasJobDetail) { score += 1; reasons.push('no drawing, quantity, material or service (+1)'); }

  let eng = 0;
  ENGINEERING.forEach(function (re) { if (re.test(text)) eng += 1; });
  if (eng) {
    const pts = Math.min(eng * 2, 6);
    score -= pts;
    reasons.push('engineering words x' + eng + ' (-' + pts + ')');
  }

  return { score: score, reasons: reasons, quarantine: score >= threshold };
}

/*
Suspicious enquiries are emailed to a review address, never dropped.
Set QUOTE_QUARANTINE_TO to your own address. If it is not set they go to the normal inbox with a
[SPAM REVIEW] subject instead, so nothing is ever lost.
*/
function quarantineTarget(env, fallbackTo) {
  const list = String(env.QUOTE_QUARANTINE_TO || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  if (list.length) return { to: list, separate: true };
  return { to: fallbackTo, separate: false };
}

function quarantineSubject(subject, verdict) {
  return '[SPAM REVIEW score ' + verdict.score + '] ' + subject;
}

function quarantineNote(verdict, separate) {
  const where = separate
    ? 'This was held back and NOT sent to the workshop inbox.'
    : 'No review address is set, so this came to the normal inbox.';
  return 'SPAM REVIEW: scored ' + verdict.score + ' (' + verdict.reasons.join('; ') + '). ' + where +
    ' If it is a real customer, forward it on and reply to them. The customer saw the normal thank you page.\n\n';
}

module.exports = {
  verifyTurnstile: verifyTurnstile,
  classify: classify,
  quarantineTarget: quarantineTarget,
  quarantineSubject: quarantineSubject,
  quarantineNote: quarantineNote
};
