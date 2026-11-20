'use strict';
/*
Business review: public routes (CONTRACT section 3). One handler, routed by the path after /api/business-review.
Inputs : Node style req/res, deps (deps.js). Outputs: JSON envelope responses only.
Rules  : every route except /capabilities and /start needs the bearer access token; unknown id, wrong token and missing token all give
         the same 404; expired gives 410 only after the token proved correct; Turnstile on start, request-report, request-discussion;
         database counters for rate limits; nothing here calls a paid provider (steps.js does, through callProvider); failures return
         honest error codes with plain English messages and never internal detail.
Must not change: the identical 404 behaviour, the envelope, the consent separation, no contact details in logs or reports.
*/
const { err, ApiError, sendOk, sendError, sendJson, readJsonBody, clientIp, bearer, header } = require('./http');
const { isTokenShape, hashToken, hashesEqual, generateToken, generateRef, sha256Hex, visitorHash, isUuid, uuid, seal } = require('./token');
const V = require('./validate');
const { checkStart, hit } = require('./ratelimit');
const { crawlSite, probeSite } = require('./crawl');
const steps = require('./steps');
const { toApiEvidence } = require('./evidence');
const { STEP_ORDER } = require('./labels');
const mail = require('./mail');
const prospects = require('./prospects');
const automation = require('./automation');
const providers = require('./providers/index');
const { stable } = providers;
const { StoreError } = require('./db');
const { CONTRACT_VERSION } = require('./config');

const DAY = 86400000;
const TERMINAL_REVIEW = ['ready', 'failed', 'expired', 'cancelled'];

function nowOf(deps) { return deps.now ? deps.now() : new Date(); }
function isoZ(d) { return new Date(d).toISOString().replace(/\.\d{3}Z$/, 'Z'); }

function routeParts(req) {
  let r = req.query && req.query.route;
  if (Array.isArray(r)) r = r.join('/');
  let path;
  if (typeof r === 'string') path = r;
  else {
    const u = String(req.url || '').split('?')[0];
    path = u.replace(/^\/api\/business-review(?:-admin)?\/?/, '');
  }
  return String(path).split('/').filter(Boolean).slice(0, 6);
}

function queryParam(req, name) {
  if (req.query && req.query[name] != null) return Array.isArray(req.query[name]) ? req.query[name][0] : String(req.query[name]);
  const q = String(req.url || '').split('?')[1] || '';
  return new URLSearchParams(q).get(name);
}

function requireStorage(deps) { if (!deps.storageConfigured) throw err('storage_unavailable'); }

// ---------------------------------------------------------------- shaping
function competitorOut(c) {
  return { id: c.id, review_id: c.review_id, name: c.name, website_url: c.website_url, website_host: c.website_host, origin: c.origin, source_ref: c.source_ref || null, collected_at: c.collected_at, status: c.status,
    relevance: c.relevance || {}, rejected_reason: null, reviewed_by_owner: !!c.reviewed_by_owner, position: c.position, attribution: c.origin === 'google_places' ? 'Business listing data: Google' : null, data_expires_at: c.data_expires_at || null };
}

async function statusObject(deps, review, extra) {
  const store = deps.store;
  const comps = (await store.select('br_competitors', { review_id: review.id, status: 'selected' }, { order: ['position.asc'] })).map(competitorOut);
  const versions = await store.select('br_report_versions', { review_id: review.id }, { order: ['version.desc'], limit: 1 });
  const deliveries = await store.select('br_deliveries', { review_id: review.id }, { order: ['created_at.desc'], limit: 1 });
  const prospect = (await store.select('br_prospects', { review_id: review.id }, { limit: 1 }))[0];
  const terminal = TERMINAL_REVIEW.indexOf(review.status) !== -1;
  const o = {
    review: {
      id: review.id, ref: review.ref, status: review.status, completeness: review.completeness, assessment_level: review.assessment_level,
      created_at: isoZ(review.created_at), expires_at: isoZ(review.token_expires_at), confirmed_at: review.confirmed_at ? isoZ(review.confirmed_at) : null, completed_at: review.completed_at ? isoZ(review.completed_at) : null,
      business_name: review.business_name, website_url: review.website_url || null, location: { text: review.location_text, kind: review.location_kind }, category: review.category, goals: review.goals || []
    },
    steps: (review.steps || []).map(function (s) { return { key: s.key, label: s.label, state: s.state, started_at: s.started_at, finished_at: s.finished_at, reason: s.reason || null, message: s.message || '' }; }),
    next_after_ms: terminal ? 0 : 1500,
    report_available: versions.length > 0, report_version: versions.length ? versions[0].version : null,
    competitors: comps,
    delivery: { email_requested: deliveries.length > 0, status: deliveries.length ? deliveries[0].status : null },
    discussion: { requested: !!(prospect && prospect.follow_up_consent) }
  };
  return Object.assign(o, extra || {});
}

// ---------------------------------------------------------------- access
async function authReview(deps, req, id, opts) {
  const o = opts || {};
  const token = bearer(req);
  const notFound = function () { return err('not_found'); };
  if (!isUuid(id) || !isTokenShape(token)) { hashToken('x'); throw notFound(); }
  const review = (await deps.store.select('br_reviews', { id: id }, { limit: 1 }))[0];
  const given = hashToken(token);
  if (!review) throw notFound();
  if (!hashesEqual(review.token_hash, given)) throw notFound();
  if (review.status === 'cancelled') { if (o.allowCancelled) return review; throw notFound(); }
  if (review.token_revoked) throw notFound();
  if (new Date(review.token_expires_at).getTime() <= nowOf(deps).getTime() || review.status === 'expired') throw err('expired');
  return review;
}

async function turnstile(deps, req, body, action) {
  const r = await deps.verifyTurnstile({ token: body.turnstile_token, ip: clientIp(req), action: action });
  if (r.ok) return;
  if (r.reason === 'unavailable' || r.reason === 'not_configured') throw err('turnstile_unavailable');
  throw err('turnstile_failed');
}

// ---------------------------------------------------------------- capabilities
function capState(st, note) { const o = { state: st }; if (note) o.note = note; return o; }
function capabilities(deps) {
  const cfg = deps.cfg, reg = deps.registry;
  const psiSt = providers.stateOf(reg, cfg, 'pagespeed').state;
  const placesSt = providers.stateOf(reg, cfg, 'google_places').state;
  const aiAvail = cfg.ai.enabled && cfg.ai.publicRuns && cfg.ai.dailyCapPence > 0 && providers.AI_IDS.some(function (id) { return providers.stateOf(reg, cfg, id).state === 'available'; });
  const email = mail.canSendReports(cfg);
  return {
    site_analysis: capState('available'),
    pagespeed: capState(psiSt === 'disabled' ? 'disabled' : psiSt, psiSt === 'available' ? undefined : 'The mobile speed test is not switched on right now.'),
    competitor_discovery: placesSt === 'available' ? capState('available') : capState('not_configured', 'No supported business search source is switched on. You can name one competitor yourself.'),
    ai_visibility: aiAvail ? capState('available') : capState('disabled', 'Awaiting a supported test.'),
    email_delivery: email ? capState('available') : capState(cfg.email.enabled ? 'not_configured' : 'disabled', 'Emailing the report is not switched on. Use the print view.'),
    pdf: capState('disabled', 'Use the print view.')
  };
}

// ---------------------------------------------------------------- start
function inputHash(v) { return sha256Hex(stable({ n: v.business_name.toLowerCase(), h: v.website ? v.website.host : null, l: v.location.text.toLowerCase(), k: v.location.kind, c: v.category.toLowerCase() })); }

function scopeNote(loc) {
  if (loc.kind === 'regional') return 'Regional: businesses serving the ' + loc.text + ' area. You can change this to national or local below.';
  if (loc.kind === 'national') return 'National: specialist businesses across the UK. You can change this to regional or local below.';
  return 'Local: businesses close to ' + loc.text + '. You can change this to regional or national below.';
}

function interpretationOf(v, probe) {
  const assumptions = ['Comparison businesses will be chosen from a supported source where one is available.'];
  let website = null;
  if (v.website) {
    const home = probe && probe.home;
    const ld = home && home.ok && home.page.jsonld;
    website = {
      input: v.website.input, url: v.website.url, reachable: !!(home && home.ok && home.status < 400),
      title: home && home.ok && home.status < 400 ? (home.page.title || null) : null,
      detected_business_name: !(home && home.ok && home.status < 400) ? null : ld && ld.names && ld.names[0] ? ld.names[0] : (home && home.ok && home.page.headings.find(function (h) { return h.level === 1; }) ? (home.page.headings.find(function (h) { return h.level === 1; }).text || null) : null)
    };
    if (home && home.ok && home.status >= 400) { website.problem = 'http_error'; assumptions.push('The website answered with an error page just now. The analysis will record what it could not check.'); }
    if (home && !home.ok) {
      website.problem = home.code;
      assumptions.push(home.code === 'blocked_by_robots' || home.code === 'robots_unavailable' ? 'The website asks automated tools not to read it, so the website checks will be recorded as not tested.' : 'The website could not be read just now. The analysis will record what it could not check.');
    }
  } else assumptions.push('No website was given, so a reduced review is built from what you tell us.');
  return { business_name: v.business_name, website: website, location: v.location, category: v.category, competition_scope_note: scopeNote(v.location), assumptions: assumptions };
}

async function handleStart(deps, req, res) {
  requireStorage(deps);
  const body = await readJsonBody(req);
  const idem = header(req, 'idempotency-key');
  if (!V.validateIdempotencyKey(idem)) throw err('validation_failed', { field: 'Idempotency-Key', fields: { 'Idempotency-Key': 'A unique key is required.' } });
  const val = V.validateStart(body, deps.fetcher.parseUrl);
  if (!val.ok) {
    const keys = Object.keys(val.fields);
    if (val.urlReason && keys.length === 1 && keys[0] === 'website') throw err('url_not_allowed', { field: 'website', reason: val.urlReason });
    throw err('validation_failed', { field: keys[0], fields: val.fields });
  }
  const v = val.value;
  const ip = clientIp(req);
  const vh = visitorHash(deps.cfg.salt, ip);
  const store = deps.store;

  // replays first (a Turnstile token is single use, so a replay cannot carry a fresh one)
  const prior = (await store.select('br_reviews', { idempotency_key: idem }, { limit: 1 }))[0];
  if (prior) {
    if (prior.visitor_hash !== vh) throw err('conflict');
    return sendOk(res, { idempotent_replay: true, review: reviewHead(prior), interpretation: prior.interpretation, access_token: null, report_url: null }, 200);
  }
  const ih = inputHash(v);
  const recent = (await store.select('br_reviews', { input_hash: ih, visitor_hash: vh, created_at: { gt: new Date(nowOf(deps).getTime() - DAY).toISOString() } }, { order: ['created_at.desc'], limit: 1 }))[0];
  if (recent && recent.status !== 'cancelled' && recent.status !== 'expired') {
    return sendOk(res, { idempotent_replay: true, review: reviewHead(recent), interpretation: recent.interpretation, access_token: null, report_url: null }, 200);
  }

  await turnstile(deps, req, body, 'business-review');
  const rl = await checkStart(store, Object.assign({}, deps.cfg), ip, v.website ? v.website.host : null);
  if (!rl.ok) {
    if (rl.kind === 'daily') throw err('daily_limit');
    throw err('rate_limited', { retry_after_s: rl.retry_after_s });
  }

  let probe = null;
  if (v.website) {
    const resolved = await deps.fetcher.resolveHost(v.website.host);
    if (!resolved.ok) {
      if (resolved.code === 'url_not_allowed') throw err('url_not_allowed', { field: 'website', reason: 'private_address' });
      throw err('unresolvable', { field: 'website' });
    }
    probe = await probeSite({ url: v.website.url, fetcher: deps.fetcher, now: deps.now, sleep: deps.sleep, minIntervalMs: deps.minIntervalMs == null ? 1000 : deps.minIntervalMs, deadline: Date.now() + 14000 });
    if (probe.home && !probe.home.ok && probe.home.code === 'url_not_allowed') throw err('url_not_allowed', { field: 'website', reason: probe.home.reason || 'private_address' });
    if (probe.home && !probe.home.ok && probe.home.code === 'unresolvable') throw err('unresolvable', { field: 'website' });
  }
  const interp = interpretationOf(v, probe);
  const token = generateToken();
  const now = nowOf(deps);
  let row = null;
  for (let attempt = 0; attempt < 5 && !row; attempt++) {
    try {
      row = await store.insert('br_reviews', {
        ref: generateRef(), status: 'awaiting_confirmation', completeness: 'pending', assessment_level: v.website ? 'standard' : 'reduced',
        business_name: v.business_name, website_url: v.website ? v.website.url : null, website_host: v.website ? v.website.host : null,
        location_text: v.location.text, location_kind: v.location.kind, category: v.category, goals: v.goals,
        inputs: { submitted: { business_name: v.business_name, website: v.website ? v.website.input : null, location: v.location, category: v.category, goals: v.goals } },
        interpretation: interp, steps: [], idempotency_key: idem, input_hash: ih, visitor_hash: vh, token_hash: hashToken(token),
        token_expires_at: new Date(now.getTime() + deps.cfg.tokenDays * DAY).toISOString(), hold_for_approval: !!deps.cfg.requireApproval, purge_after: new Date(now.getTime() + 90 * DAY).toISOString()
      });
    } catch (e) {
      if (e && e.code === 'conflict') {
        const again = (await store.select('br_reviews', { idempotency_key: idem }, { limit: 1 }))[0];
        if (again) { if (again.visitor_hash !== vh) throw err('conflict'); return sendOk(res, { idempotent_replay: true, review: reviewHead(again), interpretation: again.interpretation, access_token: null, report_url: null }, 200); }
        continue; // ref collision: try another reference
      }
      throw e;
    }
  }
  if (!row) throw err('internal');
  return sendOk(res, { idempotent_replay: false, review: reviewHead(row), interpretation: interp, access_token: token, report_url: '/business-review/report#t=' + token + '&id=' + row.id }, 201);
}

function reviewHead(r) {
  return { id: r.id, ref: r.ref, status: r.status, completeness: r.completeness, assessment_level: r.assessment_level, created_at: isoZ(r.created_at), expires_at: isoZ(r.token_expires_at) };
}

// ---------------------------------------------------------------- confirm
async function resolvedSite(deps, w) {
  const r = await deps.fetcher.resolveHost(w.host);
  if (!r.ok) throw err(r.code === 'url_not_allowed' ? 'url_not_allowed' : 'unresolvable', r.code === 'url_not_allowed' ? { reason: 'private_address' } : {});
}

async function handleConfirm(deps, req, res, review) {
  const body = await readJsonBody(req);
  const val = V.validateConfirm(body, deps.fetcher.parseUrl);
  if (!val.ok) throw err('validation_failed', { field: Object.keys(val.fields)[0], fields: val.fields });
  const v = val.value;
  const replayHash = sha256Hex(stable({ confirmed: true, edits: body.edits || null, n: body.competitor_nomination || null, t: body.automation_task || null }));
  if (review.status !== 'awaiting_confirmation') {
    if (review.inputs && review.inputs.confirm_hash === replayHash) return sendOk(res, await statusObject(deps, review), 200);
    throw err('wrong_state');
  }
  const store = deps.store;
  const patch = {};
  let website = review.website_url ? { url: review.website_url, host: review.website_host } : null;
  const e = v.edits || {};
  if (e.business_name) patch.business_name = e.business_name;
  if (e.category) patch.category = e.category;
  if (e.location) { patch.location_text = e.location.text; patch.location_kind = e.location.kind; }
  if ('website' in e) {
    if (e.website) { await resolvedSite(deps, e.website); patch.website_url = e.website.url; patch.website_host = e.website.host; website = { url: e.website.url, host: e.website.host }; }
    else { patch.website_url = null; patch.website_host = null; website = null; }
  }
  patch.assessment_level = website ? 'standard' : 'reduced';
  if (v.nomination) {
    await resolvedSite(deps, v.nomination.website);
    if (website && v.nomination.website.host.replace(/^www\./, '') === website.host.replace(/^www\./, '')) throw err('validation_failed', { field: 'competitor_nomination', fields: { competitor_nomination: 'The competitor needs a different website from your own.' } });
  }
  const inputs = Object.assign({}, review.inputs, { confirm_hash: replayHash });
  if (v.automation_task) inputs.automation_task = v.automation_task;
  const merged = Object.assign({}, review, patch);
  const interp = Object.assign({}, review.interpretation, { business_name: merged.business_name, category: merged.category, location: { text: merged.location_text, kind: merged.location_kind } });
  if (website && interp.website && 'website' in e) interp.website = Object.assign({}, interp.website, { url: website.url, input: e.website ? e.website.input : interp.website.input, reachable: null });
  if (!website) interp.website = null;
  Object.assign(patch, { status: 'queued', confirmed_at: nowOf(deps).toISOString(), steps: steps.initialSteps(!!website), inputs: inputs, interpretation: interp });
  const updated = await store.update('br_reviews', { id: review.id, status: 'awaiting_confirmation' }, patch);
  if (!updated.length) {
    const cur = (await store.select('br_reviews', { id: review.id }, { limit: 1 }))[0];
    if (cur && cur.inputs && cur.inputs.confirm_hash === replayHash) return sendOk(res, await statusObject(deps, cur), 200);
    throw err('wrong_state');
  }
  const rv = updated[0];
  await steps.seedEvidence(deps, rv);
  if (v.nomination) {
    const n = v.nomination;
    await store.insert('br_competitors', { review_id: rv.id, name: n.name, website_url: n.website.url, website_host: n.website.host, origin: 'visitor_nominated', collected_at: nowOf(deps).toISOString(), status: 'selected', position: 1,
      relevance: { basis: ['nominated_by_visitor'], category_match: null, distance_km: null, note: 'Named by you. Relevance not checked by a supported source.' } });
  }
  return sendOk(res, await statusObject(deps, rv), 200);
}

// ---------------------------------------------------------------- advance
async function handleAdvance(deps, req, res, review) {
  await readJsonBody(req, { allowEmpty: true });
  if (review.status === 'ready') return sendOk(res, Object.assign(await statusObject(deps, review), { ran: [] }));
  if (review.status !== 'queued' && review.status !== 'running') throw err('wrong_state');
  const rl = await hit(deps.store, 'adv:review:' + review.id, 40, 30 * 86400);
  if (!rl.allowed) throw err('rate_limited', { retry_after_s: rl.retry_after_s || 3600 });
  const out = await steps.advance(deps, review);
  return sendOk(res, Object.assign(await statusObject(deps, out.review), { ran: out.ran }));
}

// ---------------------------------------------------------------- report
async function handleReport(deps, req, res, review) {
  const store = deps.store;
  const vq = queryParam(req, 'version');
  let filters = { review_id: review.id };
  if (vq !== null && vq !== undefined && vq !== '') {
    const n = parseInt(vq, 10);
    if (!/^\d{1,4}$/.test(String(vq)) || n < 1) throw err('validation_failed', { field: 'version' });
    filters.version = n;
  }
  const rows = await store.select('br_report_versions', filters, { order: ['version.desc'], limit: 1 });
  if (!rows.length) { if (filters.version) throw err('not_found'); throw err('wrong_state'); }
  const row = rows[0];
  const latest = (await store.select('br_report_versions', { review_id: review.id }, { order: ['version.desc'], limit: 1 }))[0];
  const report = Object.assign({}, row.content, { status: row.version === latest.version ? row.status : 'superseded', approved_at: row.approved_at || null });
  if (row.version !== latest.version) report.superseded_by_version = latest.version;
  return sendOk(res, { report: report });
}

// ---------------------------------------------------------------- nominate competitor
async function handleCompetitor(deps, req, res, review) {
  const body = await readJsonBody(req);
  const val = V.validateNominationBody(body, deps.fetcher.parseUrl);
  if (!val.ok) throw err('validation_failed', { field: Object.keys(val.fields)[0], fields: val.fields });
  if (review.status !== 'ready') throw err('wrong_state');
  const n = val.value;
  await resolvedSite(deps, n.website);
  if (review.website_host && n.website.host.replace(/^www\./, '') === review.website_host.replace(/^www\./, '')) throw err('validation_failed', { field: 'website', fields: { website: 'The competitor needs a different website from your own.' } });
  const store = deps.store;
  const existing = await store.select('br_competitors', { review_id: review.id, origin: 'visitor_nominated', status: 'selected' });
  if (existing.some(function (c) { return c.website_host === n.website.host && c.name === n.name; })) return sendOk(res, await statusObject(deps, review));
  const rl = await hit(store, 'nominate:review:' + review.id, 2, 30 * 86400);
  if (!rl.allowed) throw err('rate_limited', { retry_after_s: rl.retry_after_s || 3600 });
  for (let i = 0; i < existing.length; i++) await store.update('br_competitors', { id: existing[i].id }, { status: 'rejected', rejected_reason: 'replaced_by_visitor' });
  await store.insert('br_competitors', { review_id: review.id, name: n.name, website_url: n.website.url, website_host: n.website.host, origin: 'visitor_nominated', collected_at: nowOf(deps).toISOString(), status: 'selected', position: 1,
    relevance: { basis: ['nominated_by_visitor'], category_match: null, distance_km: null, note: 'Named by you. Relevance not checked by a supported source.' } });
  const rv = await steps.requeueForCompetitors(deps, review, 'competitors_changed');
  return sendOk(res, await statusObject(deps, rv));
}

// ---------------------------------------------------------------- automation
async function handleAutomation(deps, req, res, review) {
  const body = await readJsonBody(req);
  const val = V.validateTask(body);
  if (!val.ok) throw err('validation_failed', { field: 'task', fields: val.fields });
  const task = val.value.task;
  if (review.status === 'awaiting_confirmation') throw err('wrong_state');
  const store = deps.store;
  const ready = review.status === 'ready';
  if (!ready) {
    const opp = automation.mapTask(task);
    await store.update('br_reviews', { id: review.id }, { inputs: Object.assign({}, review.inputs, { automation_task: task }) });
    return sendOk(res, { automation_opportunity: opp, report_version: null });
  }
  const opp = await steps.addAutomation(deps, review, task);
  const built = await steps.buildAndStoreReport(deps, review, { reason: 'automation_added', createdBy: 'system' });
  return sendOk(res, { automation_opportunity: opp, report_version: built.version });
}

// ---------------------------------------------------------------- request report
async function handleRequestReport(deps, req, res, review, token) {
  const cfg = deps.cfg;
  if (!mail.canSendReports(cfg)) throw err('delivery_not_configured');
  const body = await readJsonBody(req);
  const val = V.validateRequestReport(body);
  if (!val.ok) { if (val.consentRequired) throw err('consent_required', { field: 'consent', fields: val.fields }); throw err('validation_failed', { field: Object.keys(val.fields)[0], fields: val.fields }); }
  const d = val.value;
  const store = deps.store;
  const rows = await store.select('br_report_versions', { review_id: review.id }, { order: ['version.desc'], limit: 1 });
  if (!rows.length) throw err('wrong_state');
  const version = rows[0];
  const emailHash = sha256Hex(deps.cfg.salt + '|' + d.email);
  const dup = (await store.select('br_deliveries', { review_id: review.id, report_version_id: version.id, to_email_hash: emailHash }, { limit: 1 }))[0];
  if (dup) return sendOk(res, { delivery: { id: dup.id, status: dup.status, to_masked: V.maskEmail(d.email) }, idempotent_replay: true }, 202);
  await turnstile(deps, req, body, 'business-review-mail');
  const rl = await hit(store, 'mail:review:' + review.id, 3, 86400);
  if (!rl.allowed) throw err('rate_limited', { retry_after_s: rl.retry_after_s || 3600 });
  const hold = !!review.hold_for_approval && !version.approved_at;
  let delivery;
  try {
    delivery = await store.insert('br_deliveries', { review_id: review.id, report_version_id: version.id, to_email: d.email, to_email_hash: emailHash, status: hold ? 'held_for_approval' : 'queued' });
  } catch (e) {
    if (e && e.code === 'conflict') { const ex = (await store.select('br_deliveries', { review_id: review.id, report_version_id: version.id, to_email_hash: emailHash }, { limit: 1 }))[0]; return sendOk(res, { delivery: { id: ex.id, status: ex.status, to_masked: V.maskEmail(d.email) }, idempotent_replay: true }, 202); }
    throw e;
  }
  if (d.consent.follow_up_contact || d.consent.marketing) await prospects.upsertProspect(deps, review, { name: d.name, email: d.email, phone: '', message: '', services: [], consent: { follow_up_contact: d.consent.follow_up_contact, marketing: d.consent.marketing } });
  if (hold) {
    // The emailed link needs the access token later. It is sealed with BR_SALT and kept only while the email is held (see HANDOFF-A).
    const cur = (await store.select('br_reviews', { id: review.id }, { limit: 1 }))[0];
    const sealed = Object.assign({}, (cur.inputs && cur.inputs.sealed_links) || {}, { [delivery.id]: seal(token, deps.cfg.salt) });
    await store.update('br_reviews', { id: review.id }, { inputs: Object.assign({}, cur.inputs, { sealed_links: sealed }) });
    return sendOk(res, { delivery: { id: delivery.id, status: 'held_for_approval', to_masked: V.maskEmail(d.email) }, idempotent_replay: false }, 202);
  }
  const sent = await mail.sendReport(deps, { to: d.email, name: d.name, ref: review.ref, reviewId: review.id, token: token, report: version.content, idempotencyKey: 'br-report-' + delivery.id });
  if (!sent.ok) {
    await store.update('br_deliveries', { id: delivery.id }, { status: 'failed', error_code: sent.code, attempts: 1 });
    throw err('delivery_failed', { delivery_id: delivery.id });
  }
  await store.update('br_deliveries', { id: delivery.id }, { status: 'sent', resend_id: sent.id || null, sent_at: nowOf(deps).toISOString(), attempts: 1 });
  return sendOk(res, { delivery: { id: delivery.id, status: 'sent', to_masked: V.maskEmail(d.email) }, idempotent_replay: false }, 202);
}

// ---------------------------------------------------------------- request discussion
async function handleDiscussion(deps, req, res, review) {
  const body = await readJsonBody(req);
  const val = V.validateDiscussion(body);
  if (!val.ok) { if (val.consentRequired) throw err('consent_required', { field: 'consent', fields: val.fields }); throw err('validation_failed', { field: Object.keys(val.fields)[0], fields: val.fields }); }
  if (review.status === 'awaiting_confirmation') throw err('wrong_state');
  const d = val.value;
  await turnstile(deps, req, body, 'business-review-discuss');
  const rl = await hit(deps.store, 'disc:ip:' + visitorHash(deps.cfg.salt, clientIp(req)).slice(0, 32), 3, 3600);
  if (!rl.allowed) throw err('rate_limited', { retry_after_s: rl.retry_after_s || 600 });
  const before = (await deps.store.select('br_prospects', { review_id: review.id }, { limit: 1 }))[0];
  await prospects.upsertProspect(deps, review, d);
  if (!before || !before.follow_up_consent) {
    const n = await mail.notifyOwner(deps, { ref: review.ref, name: d.name, business: review.business_name, email: d.email, phone: d.phone, message: d.message, services: d.service_interest, marketing: d.consent.marketing, idempotencyKey: 'br-discuss-' + review.id });
    if (!n.ok) console.error('[br] owner notification not sent', n.code);
  }
  return sendOk(res, { reference: review.ref, discussion: { requested: true } }, 201);
}

async function handleDelete(deps, req, res, review) {
  if (review.status !== 'cancelled') {
    await prospects.clearContact(deps, review);
    await deps.store.update('br_reviews', { id: review.id }, { status: 'cancelled', token_revoked: true, lease_until: null, lease_owner: null });
  }
  return sendOk(res, {});
}

// ---------------------------------------------------------------- dispatcher
function createPublicHandler(deps) {
  return async function handler(req, res) {
    try {
      const parts = routeParts(req);
      const method = String(req.method || 'GET').toUpperCase();
      if (method === 'OPTIONS') { res.setHeader('Allow', 'GET, POST, DELETE, OPTIONS'); return sendJson(res, 204, {}); }
      if (!parts.length) throw err('not_found');
      if (parts[0] === 'capabilities') {
        if (method !== 'GET') throw err('method_not_allowed');
        return sendOk(res, { capabilities: capabilities(deps), limits: { max_competitors: deps.cfg.limits.maxCompetitors, token_days: deps.cfg.tokenDays } });
      }
      if (parts[0] === 'start') {
        if (method !== 'POST' || parts.length !== 1) throw err('method_not_allowed');
        return await handleStart(deps, req, res);
      }
      if (parts[0] === 'admin') throw err('not_found');
      const id = parts[0];
      const sub = parts[1] || '';
      if (parts.length > 2) { throw err('not_found'); }
      requireStorage(deps);
      let review;
      const allowedBase = (sub === '' && (method === 'GET' || method === 'DELETE'));
      const known = { confirm: ['POST'], advance: ['POST'], report: ['GET'], competitors: ['POST'], automation: ['POST'], 'request-report': ['POST'], 'request-discussion': ['POST'], 'report.pdf': ['GET'] };
      if (!allowedBase && !(known[sub] && known[sub].indexOf(method) !== -1)) {
        // do not reveal whether the id exists before auth: unknown routes behave like not found
        if (sub && !known[sub]) throw err('not_found');
        if (sub === '' || known[sub]) { await authReview(deps, req, id); throw err('method_not_allowed'); }
      }
      const token = bearer(req);
      review = await authReview(deps, req, id, { allowCancelled: sub === '' && method === 'DELETE' });
      if (sub === '' && method === 'GET') return sendOk(res, await statusObject(deps, review));
      if (sub === '' && method === 'DELETE') return await handleDelete(deps, req, res, review);
      if (sub === 'confirm') return await handleConfirm(deps, req, res, review);
      if (sub === 'advance') return await handleAdvance(deps, req, res, review);
      if (sub === 'report') return await handleReport(deps, req, res, review);
      if (sub === 'competitors') return await handleCompetitor(deps, req, res, review);
      if (sub === 'automation') return await handleAutomation(deps, req, res, review);
      if (sub === 'request-report') return await handleRequestReport(deps, req, res, review, token);
      if (sub === 'request-discussion') return await handleDiscussion(deps, req, res, review);
      if (sub === 'report.pdf') throw err('pdf_unavailable');
      throw err('not_found');
    } catch (e) {
      if (e instanceof ApiError) return sendError(res, e);
      if (e instanceof StoreError) { console.error('[br] store', e.code, e.detail || ''); return sendError(res, err(e.code === 'not_configured' || e.code === 'store_error' ? 'storage_unavailable' : 'internal')); }
      console.error('[br] unexpected', e && e.name ? e.name : 'error');
      return sendError(res, err('internal'));
    }
  };
}

module.exports = { createPublicHandler, routeParts, statusObject, authReview, competitorOut, capabilities, queryParam, requireStorage, turnstile };
