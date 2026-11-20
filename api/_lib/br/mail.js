'use strict';
/*
Business review: email through Resend (same REST pattern as api/contact.js).
Inputs : config, fetch, a report summary and the report link. Outputs: { ok, id } or { ok:false, code }.
Rules  : report delivery email goes ONLY to the address the visitor typed for that purpose, with a link (token in the URL fragment), a short
         summary and the sender identity; no tracking pixels, no promotional content, no marketing consent implied; nothing is sent unless
         BR_EMAIL=1 and a Resend key exist; competitors are never emailed; the owner notification of a discussion request goes to CONTACT_TO
         only. Subjects and headers are single line (no CR or LF injection). Contact details are never logged.
Must not change: the separation of report delivery from marketing, the absence of tracking.
*/
const LINE_BREAKS = new RegExp('[\\r\\n' + String.fromCharCode(0x2028, 0x2029) + ']+', 'g');
function oneLine(s, max) { return String(s == null ? '' : s).replace(LINE_BREAKS, ' ').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max); }
function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

function canSendReports(cfg) { return !!(cfg.email.enabled && cfg.email.resendKey); }

async function resend(deps, payload, idemKey) {
  const f = deps.fetchImpl || fetch;
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, 10000);
  try {
    const headers = { Authorization: 'Bearer ' + deps.cfg.email.resendKey, 'Content-Type': 'application/json' };
    if (idemKey) headers['Idempotency-Key'] = oneLine(idemKey, 120);
    const res = await f('https://api.resend.com/emails', { method: 'POST', headers: headers, body: JSON.stringify(payload), signal: controller.signal });
    if (!res.ok) return { ok: false, code: 'resend_' + res.status };
    let id = '';
    try { id = (await res.json()).id || ''; } catch (e) { /* ignore */ }
    return { ok: true, id: String(id).slice(0, 80) };
  } catch (e) { return { ok: false, code: 'resend_network' }; } finally { clearTimeout(timer); }
}

function summaryLines(report) {
  const lines = [];
  (report.key_findings || []).slice(0, 3).forEach(function (k) { lines.push(k.text); });
  return lines;
}

async function sendReport(deps, o) {
  const cfg = deps.cfg;
  if (!canSendReports(cfg)) return { ok: false, code: 'not_configured' };
  const link = cfg.siteOrigin + '/business-review/report#t=' + o.token + '&id=' + o.reviewId;
  const greet = o.name ? 'Hello ' + oneLine(o.name, 60) + ',' : 'Hello,';
  const lines = summaryLines(o.report);
  const text = [greet, '', 'You asked for a copy of your free business review (' + o.ref + '). It was an automated review of public information, so please read the notes and limits in the report.', '',
    lines.length ? 'Key points:' : '', lines.map(function (l) { return '- ' + l; }).join('\n'), lines.length ? '' : '', 'Open your report: ' + link, '',
    'The link works for a limited time and is private to you. Anyone with the link can read the report, so please do not forward it.', '',
    'You are getting this one email because you asked for it. It is not a marketing message and you have not been added to any list.', '', 'Rhys Hume', 'rhyshume.co.uk'].filter(function (x, i, a) { return !(x === '' && a[i - 1] === ''); }).join('\n');
  const html = '<p>' + esc(greet) + '</p><p>You asked for a copy of your free business review (' + esc(o.ref) + '). It was an automated review of public information, so please read the notes and limits in the report.</p>' +
    (lines.length ? '<p>Key points:</p><ul>' + lines.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>' : '') +
    '<p><a href="' + esc(link) + '">Open your report</a></p><p>The link works for a limited time and is private to you. Anyone with the link can read the report, so please do not forward it.</p>' +
    '<p>You are getting this one email because you asked for it. It is not a marketing message and you have not been added to any list.</p><p>Rhys Hume<br>rhyshume.co.uk</p>';
  return resend(deps, { from: cfg.email.from, to: [o.to], subject: oneLine('Your business review ' + o.ref, 120), text: text, html: html }, o.idempotencyKey);
}

async function notifyOwner(deps, o) {
  const cfg = deps.cfg;
  if (!cfg.email.resendKey || !cfg.email.contactTo.length) return { ok: false, code: 'not_configured' };
  const rows = [['Reference', o.ref], ['Name', o.name], ['Business', o.business], ['Email', o.email], ['Phone', o.phone || 'Not given'], ['Services of interest', (o.services || []).join(', ') || 'Not given'], ['Marketing consent', o.marketing ? 'Yes (ticked)' : 'No'], ['Message', o.message || 'Not given']];
  const text = rows.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n') + '\n\nOpen the review in the workbook (Business reviews) to see the report and evidence.';
  const html = '<table>' + rows.map(function (r) { return '<tr><td><b>' + esc(r[0]) + '</b></td><td>' + esc(r[1]) + '</td></tr>'; }).join('') + '</table><p>Open the review in the workbook (Business reviews) to see the report and evidence.</p>';
  return resend(deps, { from: cfg.email.from, to: cfg.email.contactTo, reply_to: o.email, subject: oneLine('New business review discussion request ' + o.ref, 120), text: text, html: html }, o.idempotencyKey);
}

module.exports = { sendReport, notifyOwner, canSendReports, oneLine };
