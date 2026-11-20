'use strict';
/*
Business review: input validation. Pure functions, no I/O.
Inputs : parsed JSON bodies (untrusted).
Outputs: { ok:true, value } or { ok:false, fields:{name:message}, urlReason? }. Unknown fields are ignored, never copied.
Rules  : strings are trimmed, control characters removed, lengths bounded (CONTRACT section 3.2 and 3.3); websites go through the
         safe URL rules; goals come only from the enum; no prototype keys are ever assigned.
Must not change: the length limits and the refusal of anything that is not a plain string where a string is expected.
*/
const { parseUrl } = require('./safe-fetch');
const { GOALS, LOCATION_KINDS, SERVICE_KEYS } = require('./labels');
const { isUuid } = require('./token');

const CTRL = new RegExp('[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f' + String.fromCharCode(0x2028, 0x2029) + ']', 'g');
const BIDI = new RegExp('[' + [[0x202a, 0x202e], [0x2066, 0x2069], [0x200b, 0x200f], [0xfeff, 0xfeff]].map(function (r) { return String.fromCharCode(r[0]) + '-' + String.fromCharCode(r[1]); }).join('') + ']', 'g');

function clean(v, max, multiline) {
  if (typeof v !== 'string') return null;
  let s = v.normalize('NFC').replace(CTRL, '').replace(BIDI, '');
  s = multiline ? s.replace(/\r\n?/g, '\n').trim() : s.replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim();
  return s.length > max ? null : s;
}

function str(body, key, min, max, label, fields, o) {
  const raw = body[key];
  if (raw === undefined || raw === null || raw === '') {
    if (min > 0) fields[key] = 'Enter ' + label + '.';
    return '';
  }
  if (typeof raw !== 'string') { fields[key] = 'Enter ' + label + ' as text.'; return ''; }
  const s = clean(raw, max + 1000, o && o.multiline);
  if (s === null) { fields[key] = label.charAt(0).toUpperCase() + label.slice(1) + ' is too long (up to ' + max + ' characters).'; return ''; }
  if (s.length > max) { fields[key] = label.charAt(0).toUpperCase() + label.slice(1) + ' is too long (up to ' + max + ' characters).'; return ''; }
  if (s.length < min) { fields[key] = 'Enter ' + label + '.'; return ''; }
  return s;
}

function ownObj(v) { return v && typeof v === 'object' && !Array.isArray(v) ? v : null; }
function get(o, k) { return o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined; }

function validateWebsite(raw, fields, key, parse) {
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw !== 'string') { fields[key] = 'Enter the website address as text.'; return null; }
  const p = (parse || parseUrl)(raw);
  if (!p.ok) { fields[key] = 'That website address cannot be checked.'; return { rejected: p.reason }; }
  return { input: raw.trim(), url: p.url, host: p.hostname, origin: p.origin };
}

function validateLocation(raw, fields) {
  const o = ownObj(raw);
  if (!o) { fields.location = 'Enter the town, city or area you serve.'; return null; }
  const text = str({ t: get(o, 'text') }, 't', 1, 160, 'the town, city or area', {});
  if (!text) { fields['location'] = 'Enter the town, city or area you serve.'; return null; }
  let kind = get(o, 'kind');
  if (kind === undefined || kind === null || kind === '') kind = 'local';
  if (typeof kind !== 'string' || LOCATION_KINDS.indexOf(kind) === -1) { fields.location = 'Choose local, regional or national.'; return null; }
  return { text: text, kind: kind };
}

function validateGoals(raw, fields) {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw) || raw.length > 7) { fields.goals = 'Choose up to seven goals from the list.'; return []; }
  const out = [];
  for (let i = 0; i < raw.length; i++) {
    if (typeof raw[i] !== 'string' || GOALS.indexOf(raw[i]) === -1) { fields.goals = 'Choose goals from the list.'; return []; }
    if (out.indexOf(raw[i]) === -1) out.push(raw[i]);
  }
  return out;
}

function validateStart(body, parse) {
  const fields = {};
  const business_name = str(body, 'business_name', 1, 160, 'your business name', fields);
  const category = str(body, 'category', 1, 120, 'what your business does', fields);
  const location = validateLocation(get(body, 'location'), fields);
  const goals = validateGoals(get(body, 'goals'), fields);
  const w = validateWebsite(get(body, 'website'), fields, 'website', parse);
  if (Object.keys(fields).length) return { ok: false, fields: fields, urlReason: w && w.rejected ? w.rejected : null };
  return { ok: true, value: { business_name: business_name, category: category, location: location, goals: goals, website: w } };
}

function validateNomination(raw, fields, key, parse) {
  const o = ownObj(raw);
  if (!o) { fields[key] = 'Enter the competitor name and website.'; return null; }
  const name = str({ n: get(o, 'name') }, 'n', 1, 160, 'the competitor name', {});
  if (!name) { fields[key] = 'Enter the competitor name (up to 160 characters).'; return null; }
  const rawSite = get(o, 'website');
  if (rawSite === undefined || rawSite === null || rawSite === '') { fields[key] = 'Enter the competitor website.'; return null; }
  const w = validateWebsite(rawSite, fields, key, parse);
  if (!w || w.rejected) return null;
  return { name: name, website: w };
}

function validateConfirm(body, parse) {
  const fields = {};
  if (get(body, 'confirmed') !== true) return { ok: false, fields: { confirmed: 'Please confirm the details to continue.' } };
  const v = { edits: null, nomination: null, automation_task: null };
  const edits = get(body, 'edits');
  if (edits !== undefined && edits !== null) {
    const e = ownObj(edits);
    if (!e) fields.edits = 'Edits must be an object.';
    else {
      v.edits = {};
      if (get(e, 'business_name') !== undefined) { const s = str({ x: get(e, 'business_name') }, 'x', 1, 160, 'your business name', {}); if (!s) fields['edits.business_name'] = 'Enter your business name (up to 160 characters).'; else v.edits.business_name = s; }
      if (get(e, 'category') !== undefined) { const s = str({ x: get(e, 'category') }, 'x', 1, 120, 'what your business does', {}); if (!s) fields['edits.category'] = 'Enter what your business does (up to 120 characters).'; else v.edits.category = s; }
      if (get(e, 'location') !== undefined) { const f2 = {}; const l = validateLocation(get(e, 'location'), f2); if (!l) fields['edits.location'] = f2.location || 'Check the location.'; else v.edits.location = l; }
      if (get(e, 'website') !== undefined) {
        const raw = get(e, 'website');
        if (raw === null || raw === '') v.edits.website = null;
        else { const f2 = {}; const w = validateWebsite(raw, f2, 'website', parse); if (!w || w.rejected) fields['edits.website'] = 'That website address cannot be checked.'; else v.edits.website = w; }
      }
    }
  }
  const nom = get(body, 'competitor_nomination');
  if (nom !== undefined && nom !== null) {
    const f2 = {};
    const n = validateNomination(nom, f2, 'competitor_nomination', parse);
    if (!n) fields.competitor_nomination = f2.competitor_nomination || 'Check the competitor details.'; else v.nomination = n;
  }
  const task = get(body, 'automation_task');
  if (task !== undefined && task !== null && task !== '') {
    const t = str({ x: task }, 'x', 1, 600, 'the task', {}, { multiline: true });
    if (!t) fields.automation_task = 'Describe the task in up to 600 characters.'; else v.automation_task = t;
  }
  if (Object.keys(fields).length) return { ok: false, fields: fields };
  return { ok: true, value: v };
}

function validateNominationBody(body, parse) {
  const fields = {};
  const n = validateNomination({ name: get(body, 'name'), website: get(body, 'website') }, fields, 'website', parse);
  if (!n || Object.keys(fields).length) return { ok: false, fields: Object.keys(fields).length ? fields : { website: 'Enter the competitor name and website.' } };
  return { ok: true, value: n };
}

function validateTask(body) {
  const fields = {};
  const t = str(body, 'task', 1, 600, 'the task', fields, { multiline: true });
  if (Object.keys(fields).length) return { ok: false, fields: fields };
  return { ok: true, value: { task: t } };
}

const EMAIL_RE = /^[A-Za-z0-9.!#$%&*+\/=?^_`{|}~-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,24}$/;
function validEmail(s) { return typeof s === 'string' && s.length <= 200 && !/[\r\n\0]/.test(s) && EMAIL_RE.test(s) && s.indexOf('..') === -1; }
function maskEmail(e) { const i = e.indexOf('@'); return e.slice(0, 1) + '***' + e.slice(i); }

function consentObj(raw) {
  const o = ownObj(raw) || {};
  return { report_delivery: get(o, 'report_delivery') !== false, follow_up_contact: get(o, 'follow_up_contact') === true, marketing: get(o, 'marketing') === true };
}

function validateRequestReport(body) {
  const fields = {};
  const email = str(body, 'email', 1, 200, 'your email address', fields);
  if (email && !validEmail(email)) fields.email = 'Enter a valid email address.';
  const name = str(body, 'name', 0, 120, 'your name', fields);
  const consent = consentObj(get(body, 'consent'));
  if (Object.keys(fields).length) return { ok: false, fields: fields };
  // Essential report delivery needs no tick box: asking for the email is the request. Only an explicit false is refused.
  if (!consent.report_delivery) return { ok: false, consentRequired: true, fields: { consent: 'We need your agreement to email the report to this address.' } };
  return { ok: true, value: { email: email.toLowerCase(), name: name, consent: consent } };
}

function validateDiscussion(body) {
  const fields = {};
  const name = str(body, 'name', 1, 120, 'your name', fields);
  const email = str(body, 'email', 1, 200, 'your email address', fields);
  if (email && !validEmail(email)) fields.email = 'Enter a valid email address.';
  const phoneRaw = str(body, 'phone', 0, 40, 'your phone number', fields);
  if (phoneRaw && !/^[0-9 +()\-.]{6,40}$/.test(phoneRaw)) fields.phone = 'Enter a valid phone number or leave it empty.';
  const message = str(body, 'message', 0, 1500, 'your message', fields, { multiline: true });
  const si = get(body, 'service_interest');
  const services = [];
  if (si !== undefined && si !== null) {
    if (!Array.isArray(si) || si.length > 6) fields.service_interest = 'Choose services from the list.';
    else si.forEach(function (x) { if (typeof x !== 'string' || SERVICE_KEYS.indexOf(x) === -1 || x === 'none') fields.service_interest = 'Choose services from the list.'; else if (services.indexOf(x) === -1) services.push(x); });
  }
  const consent = consentObj(get(body, 'consent'));
  if (Object.keys(fields).length) return { ok: false, fields: fields };
  if (!consent.follow_up_contact) return { ok: false, consentRequired: true, fields: { consent: 'Please tick the box to say Rhys may contact you about these results.' } };
  return { ok: true, value: { name: name, email: email.toLowerCase(), phone: phoneRaw, message: message, service_interest: services, consent: consent } };
}

function validateIdempotencyKey(k) { return typeof k === 'string' && (isUuid(k) || /^[A-Za-z0-9_-]{16,64}$/.test(k)); }

module.exports = { validateStart, validateConfirm, validateNominationBody, validateTask, validateRequestReport, validateDiscussion, validateIdempotencyKey, validEmail, maskEmail, clean };
