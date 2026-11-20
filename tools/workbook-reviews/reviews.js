/* =====================================================================
   BUSINESS REVIEWS: owner view of free reviews, inside the signed in Client Workbook (WP-D, additive module).
   Inputs : the signed in session (CL.session, clToken(), clRest()), the owner only tables br_* and leads read through
            PostgREST under row level security, and the admin API /api/business-review/admin/* for the changes that need the
            service role (competitor corrections, regenerate, approve, revise, send a held email, AI run, token, link).
   Outputs: a Business reviews screen (a gate level screen on the client list, and a nav screen inside a client), a header
            button, and an additive S.review key on a draft project made with the existing "Make into a client" (leadmk).
   Must not change: sign in (cloudGate, clToken, clRest), saved clients, the meeting module, local storage keys, quotes, portal and
            document generators. Nothing here keeps notes in S, writes a quote, sends a message or converts without a click.
   Internal notes live ONLY in br_prospects.internal_notes. They are never copied into S, a summary, a quote, a portal page or a
   document. The customer safe summary below is built from the report and the discuss marks and cannot see the notes.
   Works with no new tables (shows "not set up yet") and with no admin API (reads work, changes say why they cannot run).
   ===================================================================== */
const BRW_EV = { verified_public_observation: 'Verified public observation', verified_authenticated_account_data: 'Verified authenticated account data', customer_supplied: 'Customer supplied information', reasonable_inference: 'Reasonable inference', not_tested: 'Not tested', unavailable: 'Unavailable' };
const BRW_STATUS = { awaiting_confirmation: 'Awaiting confirmation', queued: 'Queued', running: 'Running', ready: 'Ready', failed: 'Failed', expired: 'Expired', cancelled: 'Cancelled' };
const BRW_COMPLETE = { pending: 'Not finished', complete: 'Complete', partial: 'Partial, has gaps' };
const BRW_PROSPECT = { new: 'New enquiry', in_discussion: 'In discussion', draft_project: 'Draft project made', closed: 'Closed' };
const BRW_STEP = { pending: 'Waiting', running: 'Running', done: 'Done', skipped: 'Skipped', unavailable: 'Unavailable', failed: 'Failed' };
const BRW_GOAL = { more_enquiries: 'Get more enquiries', google_visibility: 'Improve Google visibility', ai_search_visibility: 'Understand AI search visibility', improve_website: 'Improve the website', automate_admin: 'Automate repetitive admin', quoting_followups: 'Improve quoting or follow ups', something_else: 'Something else' };
const BRW_SERVICE = { websites: 'Websites', seo: 'SEO and local search', ai_visibility: 'AI search visibility', automation: 'Automation', engineering: 'Engineering systems', care_plan: 'Care plan', none: 'None' };
const BRW_DELIVERY = { queued: 'Queued', held_for_approval: 'Held until you approve', sent: 'Sent', failed: 'Failed', cancelled: 'Cancelled' };
const BRW_ORIGIN = { google_places: 'Google Places', osm: 'OpenStreetMap', visitor_nominated: 'Named by the visitor', owner_added: 'Added by you' };
const BRW_PROV = { available: 'Available', not_configured: 'Not configured', disabled: 'Switched off', budget_exhausted: 'Budget used up', degraded: 'Degraded' };
const BRW_METRICS = [['reviews_started', 'Reviews started'], ['reviews_completed', 'Reviews completed'], ['reviews_partial', 'Completed with gaps'], ['reviews_failed', 'Failed'], ['reports_requested', 'Reports requested by email'], ['discussion_requests', 'Enquiries and consultation requests'], ['projects_created', 'Draft projects made from reviews']];
const BRW_CARE = 'Internal only. Never shown to the customer and never added to a quote, portal page or document.';

const BRW = { loaded: false, busy: '', err: '', notSetup: false, warn: [], reviews: [], pros: {}, reps: {}, dels: {}, calls: [], f: { status: '', q: '', attn: false }, sel: '', d: null, dbusy: '', msg: null, metrics: null, mdays: 30, mState: '', mLocal: false, prov: null, provState: '', countTried: false, newCount: null, draft: {}, conf: '', rev: false, aiPlan: null, aiRes: null, ev: { subj: '', cat: '' }, act: '', needSave: false };
const brwEnc = encodeURIComponent;
const brwIso = () => new Date().toISOString();
const brwDay = t => { try { return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } };
const brwWhen = t => t ? clTime(t) : 'not yet';
const brwSafeUrl = u => /^https?:\/\//i.test(String(u || '')) ? String(u) : '';
const brwOnline = () => typeof CL !== 'undefined' && CL.on && !CL.offline && !!CL.session;
const brwNoTable = e => { const m = String((e && e.message) || ''); return /^http 404/.test(m) || /PGRST20[25]|42P01|schema cache|does not exist/i.test(m); };
const brwMask = a => { const m = String(a || '').match(/^(.).*(@.+)$/); return m ? m[1] + '***' + m[2] : 'address cleared'; };
const brwOne = a => (a && a[0]) || null;
function brwText(e) {
  const m = String((e && e.message) || e || '');
  if (m === 'nosession') return 'You were signed out. Ask for a new sign in link.';
  if (e instanceof TypeError) return 'No connection. Try again.';
  return m.replace(/^http \d+ /, '').replace(/^\{.*?"message":"([^"]+)".*$/, '$1').slice(0, 200);
}
function brwReset() { Object.assign(BRW, { loaded: false, busy: '', err: '', notSetup: false, warn: [], reviews: [], pros: {}, reps: {}, dels: {}, calls: [], sel: '', d: null, dbusy: '', msg: null, metrics: null, mState: '', prov: null, provState: '', countTried: false, newCount: null, draft: {}, conf: '', rev: false, aiPlan: null, aiRes: null, act: '' }); }
{ const prev = clStoreSession; clStoreSession = function (s) { if (!s) brwReset(); return prev.apply(this, arguments); }; }
function brwSay(kind, text) {
  BRW.msg = text ? { kind, text } : null;
  let el = document.getElementById('brw-live');
  if (!el) { el = document.createElement('div'); el.id = 'brw-live'; el.className = 'brwsr'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
  el.textContent = text || '';
}
function brwPaint(focus) { render(); if (focus) setTimeout(() => { const el = $(focus); if (el) el.focus(); }, 0); }
async function brwGuardSession(e) { if (String((e && e.message) || '') === 'nosession') { CL.screen = 'login'; CL.msg = 'You were signed out, ask for a new link'; render(); return true; } return false; }

/* ---------- admin API: the only non database call this module makes ---------- */
async function brwApi(method, path, body) {
  const tok = await clToken();
  let r;
  r = await fetch('/api/business-review/admin/' + path, { method, headers: Object.assign({ Authorization: 'Bearer ' + tok }, body == null ? {} : { 'Content-Type': 'application/json' }), body: body == null ? undefined : JSON.stringify(body) });
  let j = null; try { j = await r.json(); } catch (e) { }
  if (r.ok && j && j.ok !== false) return j;
  const code = j && j.error && j.error.code;
  const err = new Error(code === 'unauthenticated' ? 'The review service did not accept your sign in. Sign out and in again.'
    : code === 'forbidden' ? 'This account is not the owner account for reviews.'
    : (!j && (r.status === 404 || r.status === 405 || r.status >= 500)) ? 'The review admin service is not reachable (' + r.status + '). It may not be deployed or set up yet. You can still read reviews.'
    : (j && j.error && j.error.message) || ('The review service answered ' + r.status));
  err.code = code || ('http_' + r.status); err.status = r.status; throw err;
}

/* ---------- loading ---------- */
const BRW_REV_COLS = 'id,ref,created_at,status,completeness,assessment_level,business_name,website_url,location_text,location_kind,category,goals,steps,error_code,confirmed_at,completed_at,token_expires_at,token_revoked,hold_for_approval';
async function brwLoadList() {
  if (BRW.busy) return; BRW.busy = 'Loading reviews'; BRW.err = ''; BRW.warn = []; BRW.notSetup = false; paintSoon();
  try {
    BRW.reviews = await clRest('?select=' + BRW_REV_COLS + '&order=created_at.desc&limit=200', { table: 'br_reviews' }) || [];
    const tol = async (table, q, what) => { try { return await clRest(q, { table }) || []; } catch (e) { if (String(e.message) === 'nosession') throw e; BRW.warn.push('Could not load ' + what + ': ' + brwText(e)); return []; } };
    const [ps, rs, ds, cs] = await Promise.all([
      tol('br_prospects', '?select=review_id,lead_id,workbook_id,status,follow_up_consent,marketing_consent,requested_services,created_at', 'enquiries'),
      tol('br_report_versions', '?select=review_id,version,status,created_by,reason,created_at,approved_at&order=version.desc&limit=600', 'report versions'),
      tol('br_deliveries', '?select=id,review_id,report_version_id,status,error_code,sent_at,created_at&order=created_at.desc&limit=300', 'deliveries'),
      tol('br_provider_calls', '?status=in.(error,unavailable,skipped_budget)&select=id,review_id,provider,operation,status,http_status,error_code,started_at&order=started_at.desc&limit=200', 'provider failures')]);
    BRW.pros = {}; ps.forEach(p => { BRW.pros[p.review_id] = p; });
    BRW.reps = {}; rs.forEach(r => { (BRW.reps[r.review_id] = BRW.reps[r.review_id] || []).push(r); });
    BRW.dels = {}; ds.forEach(x => { (BRW.dels[x.review_id] = BRW.dels[x.review_id] || []).push(x); });
    BRW.calls = cs; BRW.loaded = true; BRW.newCount = ps.filter(p => p.status === 'new').length; brwHeadCount();
  } catch (e) {
    if (await brwGuardSession(e)) { BRW.busy = ''; return; }
    if (brwNoTable(e)) { BRW.notSetup = true; BRW.reviews = []; BRW.loaded = true; } else BRW.err = 'I could not load the reviews. ' + brwText(e);
  }
  BRW.busy = ''; if (!BRW.notSetup && !BRW.err) brwLoadMetrics(); else paintSoon();
  if (!BRW.notSetup && !BRW.err && !BRW.prov) brwLoadProviders();
  paintSoon();
}
let brwTimer = 0; function paintSoon() { if (brwTimer) return; brwTimer = setTimeout(() => { brwTimer = 0; if (brwShowing()) { const keep = document.activeElement && document.activeElement.id; render(); if (keep) { const el = document.getElementById(keep); if (el) el.focus(); } } }, 0); }
const brwShowing = () => (typeof CL !== 'undefined' && CL.screen === 'reviews') || (S.screen === 'reviews' && CL.screen === 'work') || (S.screen === 'reviews' && !CL.on);
async function brwLoadMetrics() {
  BRW.mState = 'loading'; BRW.mLocal = false;
  try { const j = await brwApi('GET', 'metrics?days=' + BRW.mdays); BRW.metrics = j; BRW.mState = 'ok'; }
  catch (e) { if (String(e.message) === 'nosession') { await brwGuardSession(e); return; } BRW.metrics = brwLocalMetrics(); BRW.mLocal = true; BRW.mState = 'local'; BRW.mErr = brwText(e); }
  paintSoon();
}
function brwLocalMetrics() {
  const since = Date.now() - BRW.mdays * 864e5, rs = BRW.reviews.filter(r => Date.parse(r.created_at) >= since), ids = new Set(rs.map(r => r.id));
  const ps = Object.values(BRW.pros).filter(p => ids.has(p.review_id)), pf = {};
  BRW.calls.filter(c => Date.parse(c.started_at) >= since).forEach(c => { pf[c.provider] = (pf[c.provider] || 0) + 1; });
  return { days: BRW.mdays, metrics: { reviews_started: rs.length, reviews_completed: rs.filter(r => r.status === 'ready').length, reviews_partial: rs.filter(r => r.status === 'ready' && r.completeness === 'partial').length, reviews_failed: rs.filter(r => r.status === 'failed').length, reports_requested: Object.keys(BRW.dels).filter(k => ids.has(k)).reduce((n, k) => n + BRW.dels[k].length, 0), discussion_requests: ps.filter(p => p.follow_up_consent).length, projects_created: ps.filter(p => p.workbook_id).length, provider_failures: pf }, notes: ['Anonymous reviews are not leads. Counts come from stored rows only.'] };
}
async function brwLoadProviders() {
  BRW.provState = 'loading';
  try { const j = await brwApi('GET', 'providers'); BRW.prov = j.providers || []; BRW.provState = 'ok'; }
  catch (e) { if (String(e.message) === 'nosession') { await brwGuardSession(e); return; } BRW.prov = null; BRW.provState = 'err'; BRW.provErr = brwText(e); }
  paintSoon();
}
async function brwCount() {
  try { const p = await clRest('?status=eq.new&select=review_id', { table: 'br_prospects' }); BRW.newCount = (p || []).length; } catch (e) { BRW.newCount = null; }
  brwHeadCount();
}
function brwHeadCount() { $$('.brwhead').forEach(b => { b.innerHTML = brwHeadInner(); b.setAttribute('aria-label', 'Business reviews' + (BRW.newCount ? ', ' + BRW.newCount + ' new' : '')); }); $$('.brwlistbadge').forEach(b => { b.textContent = BRW.newCount ? ' (' + BRW.newCount + ' new)' : ''; }); }
const brwHeadInner = () => 'Reviews' + (BRW.newCount ? ' <b class="brwbadge">' + BRW.newCount + '</b>' : '');
function brwHeadBtn() {
  if (!brwOnline()) return '';
  if (!BRW.countTried) { BRW.countTried = true; setTimeout(brwCount, 400); }
  return `<button class="btn sm2 brwhead${S.screen === 'reviews' ? ' cur' : ''}" data-go="reviews" aria-label="Business reviews${BRW.newCount ? ', ' + BRW.newCount + ' new' : ''}">${brwHeadInner()}</button>`;
}
function brwListBtn() {
  if (!BRW.countTried) { BRW.countTried = true; setTimeout(brwCount, 400); }
  return `<button class="btn" data-act="brwgate">Business reviews<span class="brwlistbadge">${BRW.newCount ? ' (' + BRW.newCount + ' new)' : ''}</span></button>`;
}

async function brwOpenReview(id, version, keep) {
  const was = keep ? { msg: BRW.msg, rev: BRW.rev, draft: BRW.draft, ev: BRW.ev, aiPlan: BRW.aiPlan, aiRes: BRW.aiRes } : null;
  BRW.sel = id; BRW.dbusy = 'Opening the review'; if (!keep) { BRW.msg = null; BRW.conf = ''; BRW.rev = false; BRW.aiPlan = null; BRW.aiRes = null; BRW.ev = { subj: '', cat: '' }; BRW.draft = {}; } if (!BRW.d || BRW.d.review.id !== id) BRW.d = null; brwPaint();
  const q = brwEnc(id), g = (table, qs) => clRest(qs, { table });
  try {
    const rv = brwOne(await g('br_reviews', '?id=eq.' + q + '&select=*'));
    if (!rv) { BRW.dbusy = ''; BRW.sel = ''; brwSay('err', 'That review was not found. It may have been deleted.'); brwPaint(); return; }
    const reps = await clRest('?review_id=eq.' + q + '&select=id,version,created_at,created_by,reason,status,generator_version,content_hash,approved_at,approved_note&order=version.desc', { table: 'br_report_versions' }).catch(e => { if (String(e.message) === 'nosession') throw e; return null; });
    const pick = version ? (reps || []).find(r => r.version === version) : ((reps || []).find(r => r.status === 'published') || (reps || [])[0]);
    const [comps, ev, calls, ai, dels, pro, auto, content] = await Promise.all([
      g('br_competitors', '?review_id=eq.' + q + '&select=*&order=position,created_at'),
      g('br_evidence', '?review_id=eq.' + q + '&superseded_by=is.null&select=id,competitor_id,category,metric_key,evidence_state,reason_code,value,observed_at,source,method,inputs,limitations,run_key&order=category,metric_key&limit=1500'),
      g('br_provider_calls', '?review_id=eq.' + q + '&select=id,provider,operation,status,http_status,error_code,started_at,duration_ms,cost_pence&order=started_at.desc&limit=100'),
      g('br_ai_runs', '?review_id=eq.' + q + '&select=id,question_id,question_text,provider,tool,model_reported,run_index,ran_at,status,error_code,answer_text,business_named,sources_provided,competitors_named,cost_pence&order=question_id,run_index&limit=400'),
      g('br_deliveries', '?review_id=eq.' + q + '&select=id,report_version_id,status,error_code,attempts,sent_at,created_at,to_email&order=created_at.desc'),
      g('br_prospects', '?review_id=eq.' + q + '&select=*'),
      g('br_automation_opportunities', '?review_id=eq.' + q + '&select=id,task_text,category_key,detail'),
      pick ? g('br_report_versions', '?review_id=eq.' + q + '&version=eq.' + pick.version + '&select=content') : Promise.resolve([])
    ].map(p => p.then(v => v || [], e => { if (String(e.message) === 'nosession') throw e; return { __err: brwText(e) }; })));
    const sec = {}; const arr = (k, v) => { if (v && v.__err) { sec[k] = v.__err; return []; } return v; };
    const d = { review: rv, reps: reps || [], repErr: reps ? '' : 'Report versions could not be loaded.', ver: pick ? pick.version : 0, report: (arr('report', content)[0] || {}).content || null, comps: arr('comps', comps), ev: arr('ev', ev), calls: arr('calls', calls), ai: arr('ai', ai), dels: arr('dels', dels), pro: brwOne(arr('pro', pro)), auto: arr('auto', auto), sec };
    BRW.d = d; BRW.dbusy = '';
    const fresh = d.pro ? { status: d.pro.status, needs: d.pro.needs || '', internal_notes: d.pro.internal_notes || '' } : {};
    if (was) { BRW.draft = Object.assign({}, fresh, was.draft); if (was.msg) BRW.msg = was.msg; } else { BRW.draft = fresh; BRW.needSave = false; }
    brwPaint(was ? '' : '#brw-title');
  } catch (e) { BRW.dbusy = ''; if (await brwGuardSession(e)) return; BRW.d = null; brwSay('err', 'I could not open that review. ' + brwText(e)); brwPaint(); }
}
const brwReload = () => { BRW.loaded = false; return BRW.sel ? brwOpenReview(BRW.sel, BRW.d && BRW.d.ver, true) : Promise.resolve(); };

/* run an action, show the result, reload the open review */
async function brwDo(label, fn, okText) {
  if (BRW.act) return; BRW.act = label; brwSay('info', label); brwPaint();
  try { const r = await fn(); BRW.act = ''; BRW.conf = ''; BRW.draft.rej = ''; brwSay('ok', typeof okText === 'function' ? okText(r) : okText); await brwReload(); return r; }
  catch (e) { BRW.act = ''; if (await brwGuardSession(e)) return; brwSay('err', brwText(e)); brwPaint(); }
}

/* ---------- views ---------- */
const brwTag = (cls, t) => `<span class="brwtag ${cls}">${esc(t)}</span>`;
const brwState = s => `<span class="brwst brwst-${esc(s)}">${esc(BRW_EV[s] || s || 'Unknown')}</span>`;
function brwVal(v) {
  if (!v || v.v == null) return '';
  let t = v.type === 'boolean' ? (v.v ? 'Yes' : 'No') : Array.isArray(v.v) ? v.v.join(', ') : typeof v.v === 'object' ? JSON.stringify(v.v) : String(v.v);
  if (t.length > 160) t = t.slice(0, 157) + '...'; return t + (v.unit ? ' ' + v.unit : '');
}
const brwFailures = r => BRW.calls.filter(c => c.review_id === r.id).length + ((r.steps || []).filter(s => s.state === 'failed').length);
const brwIncomplete = r => r.status === 'failed' || (r.status === 'ready' && r.completeness !== 'complete') || (r.steps || []).some(s => s.state === 'failed');
function brwAttention(r) {
  const p = BRW.pros[r.id], why = [];
  if (p && p.status === 'new') why.push('New enquiry'); if (brwIncomplete(r)) why.push('Incomplete'); if (brwFailures(r)) why.push('Provider failures');
  if ((BRW.dels[r.id] || []).some(x => x.status === 'held_for_approval')) why.push('Held email');
  return why;
}
function brwFiltered() {
  const f = BRW.f, q = f.q.trim().toLowerCase();
  return BRW.reviews.filter(r => (!f.status || r.status === f.status) && (!f.attn || brwAttention(r).length) && (!q || [r.business_name, r.ref, r.website_url, r.location_text, r.category].join(' ').toLowerCase().includes(q)));
}
function brwListItems() {
  const rows = brwFiltered(); if (!rows.length) return '<li class="brwempty">' + (BRW.reviews.length ? 'No reviews match those filters.' : 'No reviews have been submitted yet. Anonymous reviews appear here too, but only visitors who ask to be contacted become enquiries.') + '</li>';
  return rows.map(r => {
    const p = BRW.pros[r.id], rep = (BRW.reps[r.id] || [])[0], n = brwFailures(r), held = (BRW.dels[r.id] || []).some(x => x.status === 'held_for_approval');
    return `<li class="brwrow"><div class="brwmain"><b>${esc(r.business_name)}</b> <span class="hint">${esc(r.ref)}, submitted ${esc(brwWhen(r.created_at))}, ${esc(r.location_text)}, ${esc(r.category)}${r.website_url ? '' : ', no website'}</span></div>
     <div class="brwtags">${brwTag('s-' + r.status, BRW_STATUS[r.status] || r.status)}${r.status === 'ready' ? brwTag(r.completeness === 'complete' ? 's-complete' : 's-partial', BRW_COMPLETE[r.completeness] || r.completeness) : ''}${brwIncomplete(r) ? brwTag('s-warn', 'Incomplete') : ''}${p ? brwTag(p.status === 'new' ? 's-new' : 's-pro', BRW_PROSPECT[p.status] || p.status) : brwTag('s-anon', 'Anonymous, not a lead')}${n ? brwTag('s-warn', n + ' failure' + (n > 1 ? 's' : '')) : ''}${rep ? brwTag('s-rep', 'Report v' + rep.version + (rep.approved_at ? ' approved' : ' not approved')) : brwTag('s-anon', 'No report yet')}${held ? brwTag('s-warn', 'Email held') : ''}</div>
     <button class="btn sm2" data-act="brwopen" data-bid="${esc(r.id)}" aria-label="Open the review for ${esc(r.business_name)}, ${esc(r.ref)}">Open</button></li>`;
  }).join('');
}
function brwMetricsHtml() {
  const days = `<label class="brwinline" for="brw-days">Period <select id="brw-days" data-brwf="days" style="width:auto">${[7, 30, 90].map(n => `<option value="${n}" ${BRW.mdays === n ? 'selected' : ''}>Last ${n} days</option>`).join('')}</select></label>`;
  if (BRW.mState === 'loading' && !BRW.metrics) return `<section class="brwsec" aria-labelledby="brw-h-metrics"><h2 id="brw-h-metrics">Numbers</h2><p class="hint" role="status">Loading the numbers</p></section>`;
  const m = (BRW.metrics && BRW.metrics.metrics) || {}, pf = m.provider_failures || {};
  const tiles = BRW_METRICS.map(([k, l]) => `<div class="brwtile"><b>${esc(m[k] == null ? '0' : m[k])}</b><span>${esc(l)}</span></div>`).join('');
  const pfl = Object.keys(pf).filter(k => pf[k]).map(k => esc(k) + ': ' + esc(pf[k])).join(', ') || 'none recorded';
  return `<section class="brwsec" aria-labelledby="brw-h-metrics"><h2 id="brw-h-metrics">Numbers</h2><div class="row">${days}</div>
   ${BRW.mLocal ? '<div class="note warn2"><b>Counted here:</b>The review admin service did not answer (' + esc(BRW.mErr || '') + '), so these counts are taken from the stored rows listed below, newest 200 reviews at most.</div>' : ''}
   <div class="brwtiles">${tiles}</div><p class="hint">Provider failures in this period: ${pfl}. Counts come from stored rows only. ${esc(((BRW.metrics && BRW.metrics.notes) || []).join(' '))} No conversion rates are shown because they cannot be measured honestly from this data.</p></section>`;
}
function brwProvidersHtml() {
  let body;
  if (BRW.provState === 'loading' && !BRW.prov) body = '<p class="hint" role="status">Loading provider status</p>';
  else if (!BRW.prov) body = `<div class="note warn2"><b>Not available:</b>${esc(BRW.provErr || 'The admin service did not answer.')} Provider failures that were logged are listed below.</div>`;
  else body = `<div class="brwscroll" role="region" aria-label="Provider status" tabindex="0"><table class="t"><caption class="brwsr">Provider status</caption><thead><tr><th scope="col">Provider</th><th scope="col">State</th><th scope="col">Last problem</th><th scope="col">Used today</th></tr></thead><tbody>${BRW.prov.map(p => `<tr><th scope="row">${esc(p.label || p.id)}</th><td>${brwTag('s-prov-' + p.state, BRW_PROV[p.state] || p.state)}${p.reason ? '<div class="hint">' + esc(p.reason) + '</div>' : ''}</td><td>${p.last_error_code ? esc(p.last_error_code) + ', ' + esc(brwWhen(p.last_error_at)) : 'none'}</td><td>${p.budget ? esc(p.budget.calls_today == null ? '' : p.budget.calls_today + ' calls') + (p.budget.used_pence ? ', ' + esc(p.budget.used_pence) + ' pence' : '') : ''}</td></tr>`).join('')}</tbody></table></div>`;
  const byId = {}; BRW.reviews.forEach(r => { byId[r.id] = r; });
  const errs = BRW.calls.slice(0, 15).map(c => `<tr><td>${esc(brwWhen(c.started_at))}</td><td>${esc(c.provider)}</td><td>${esc(c.operation)}</td><td>${esc(c.status)}${c.error_code ? ', ' + esc(c.error_code) : ''}${c.http_status ? ', HTTP ' + esc(c.http_status) : ''}</td><td>${byId[c.review_id] ? esc(byId[c.review_id].ref) : ''}</td></tr>`).join('');
  return `<section class="brwsec" aria-labelledby="brw-h-prov"><h2 id="brw-h-prov">Providers and error log</h2>${body}
   <h3>Recent provider failures</h3>${errs ? `<div class="brwscroll" role="region" aria-label="Provider failure log" tabindex="0"><table class="t"><caption class="brwsr">Recent provider failures</caption><thead><tr><th scope="col">When</th><th scope="col">Provider</th><th scope="col">Operation</th><th scope="col">Result</th><th scope="col">Review</th></tr></thead><tbody>${errs}</tbody></table></div>` : '<p class="hint">No provider failures have been logged.</p>'}</section>`;
}
function brwListHtml() {
  const f = BRW.f;
  const filters = `<div class="brwfilters"><label for="brw-q">Search<input id="brw-q" type="search" data-brwq="1" value="${esc(f.q)}" placeholder="Business, reference, place"></label>
   <label for="brw-status">Status<select id="brw-status" data-brwf="status"><option value="">All</option>${Object.keys(BRW_STATUS).map(k => `<option value="${k}" ${f.status === k ? 'selected' : ''}>${esc(BRW_STATUS[k])}</option>`).join('')}</select></label>
   <label class="brwchk"><input type="checkbox" id="brw-attn" data-brwf="attn" ${f.attn ? 'checked' : ''}> Needs attention only</label>
   <button class="btn sm2" data-act="brwrefresh">Refresh</button></div>`;
  return `${brwMetricsHtml()}<section class="brwsec" aria-labelledby="brw-h-list"><h2 id="brw-h-list">Reviews and enquiries</h2>
   <p class="hint">Newest first, at most 200. An anonymous review is not a lead. Only a visitor who asks to be contacted becomes an enquiry.</p>${filters}<ul class="brwlist" id="brw-list" aria-label="Reviews">${brwListItems()}</ul></section>${brwProvidersHtml()}`;
}
const brwNotSetupHtml = () => `<div class="note"><b>Reviews are not set up yet:</b>The database tables for the Free Business Opportunity Review have not been created on this project, so there is nothing to show. Nothing is wrong with your clients or this workbook. The review tables arrive with a migration that is waiting for your approval. Once it is applied and the review pages are live, new reviews and enquiries appear here.<p class="row" style="margin:8px 0 0"><button class="btn" data-act="brwrefresh">Check again</button></p></div>`;
const brwOfflineHtml = () => `<div class="note"><b>Online only:</b>Business reviews live in the online database behind the signed in workbook. This copy is working offline, so there is nothing to show here and nothing is stored here. Open the hosted workbook and sign in to see reviews. Everything else in this copy works as before.</div>`;

function brwBodyInner() {
  if (!brwOnline()) return brwOfflineHtml();
  if (BRW.sel) return brwDetailHtml();
  if (!BRW.loaded && !BRW.err) { if (!BRW.busy) setTimeout(brwLoadList, 0); return '<p class="hint" role="status">Loading reviews</p>'; }
  if (BRW.err) return `<div class="note stop"><b>Could not load:</b>${esc(BRW.err)}<p class="row" style="margin:8px 0 0"><button class="btn" data-act="brwrefresh">Try again</button></p></div>`;
  if (BRW.notSetup) return brwNotSetupHtml();
  return (BRW.warn.length ? `<div class="note warn2"><b>Partly loaded:</b>${BRW.warn.map(esc).join(' ')}</div>` : '') + brwListHtml();
}
const brwMsgHtml = () => BRW.msg ? `<div class="note ${BRW.msg.kind === 'err' ? 'stop' : BRW.msg.kind === 'info' ? '' : 'warn2'} brwmsg"><b>${BRW.msg.kind === 'err' ? 'Problem:' : BRW.msg.kind === 'ok' ? 'Done:' : 'Working:'}</b>${esc(BRW.msg.text)}</div>` : '';
const brwHead = () => `<h1 id="brw-h1" tabindex="-1">Business reviews</h1><p class="hint">Free review requests from the website, what was found, and what to do next. Internal view, only you can see it.</p>${brwMsgHtml()}`;
/* the Business reviews screen inside an open client (nav and header button) */
function vReviews() { return `<div class="brw">${brwHead()}${brwBodyInner()}</div>`; }
/* the same screen on the client list level (no client open) */
function brwGate() {
  return `<header class="top"><div><div class="wm">${esc(SETTINGS.appName)}</div><div class="sm">Business reviews</div></div><div class="topr"><button class="btn sm2" data-act="brwtolist">All clients</button><button class="btn sm2" data-act="clout">Sign out</button></div></header><div class="wrap" style="display:block"><main id="main" tabindex="-1" class="main brwmain" style="max-width:1180px;margin:0 auto"><div class="brw">${brwHead()}${CL.msg ? '<div class="note"><b>Note:</b>' + esc(CL.msg) + '</div>' : ''}${brwBodyInner()}</div></main></div><div class="corner">${esc(SETTINGS.corner)}</div>`;
}
function brwBanner() {
  const R = S.review; if (!R || !R.ref) return '';
  const failed = R.link && R.link.state === 'failed';
  return `<div class="note noprint brwbanner"><b>Started from a business review:</b>${esc(R.ref)}, report version ${esc(R.report_version || '?')}, ${esc(R.evidence_snapshot_count || 0)} evidence items kept as a reference. ${R.requested_services && R.requested_services.length ? 'Asked about: ' + esc(R.requested_services.map(k => BRW_SERVICE[k] || k).join(', ')) + '. ' : ''}This is a draft: scope and prices are not agreed, and no quote exists yet.${failed ? ' The review record could not be linked to this project yet.' : ''}<p class="row" style="margin:8px 0 0"><button class="btn sm2" data-go="reviews">Open business reviews</button>${failed ? '<button class="btn sm2" data-act="brwrelink">Try linking again</button>' : ''}</p></div>`;
}

/* ---------- one review ---------- */
function brwSafe(f, a, b) { try { return f(a, b); } catch (e) { return '<div class="note stop"><b>This part could not be shown:</b>The stored data has an unexpected shape (' + esc(String(e.message).slice(0, 100)) + '). The rest of the review is unaffected.</div>'; } }
function brwDetailHtml() {
  if (BRW.dbusy && !BRW.d) return `<p class="row"><button class="btn sm2" data-act="brwback">Back to the list</button></p><p class="hint" role="status">${esc(BRW.dbusy)}</p>`;
  const d = BRW.d; if (!d) return `<p class="row"><button class="btn sm2" data-act="brwback">Back to the list</button></p>`;
  const r = d.review, nav = [['brw-s-status', 'Status'], ['brw-s-pro', 'Enquiry'], ['brw-s-comp', 'Competitors'], ['brw-s-report', 'Report'], ['brw-s-recs', 'Recommendations'], ['brw-s-ev', 'Evidence'], ['brw-s-ai', 'AI visibility'], ['brw-s-del', 'Delivery'], ['brw-s-sum', 'Summary for the customer']];
  const secErr = k => d.sec[k] ? `<div class="note warn2"><b>Not loaded:</b>${esc(d.sec[k])}</div>` : '';
  return `<p class="row noprint"><button class="btn sm2" data-act="brwback">Back to the list</button><button class="btn sm2" data-act="brwreload">Refresh this review</button></p>
  <h2 id="brw-title" tabindex="-1" class="brwtitle">${esc(r.business_name)} <span class="brwref">${esc(r.ref)}</span></h2>
  <nav class="brwjump noprint" aria-label="Sections of this review">${nav.map(n => `<button class="btn sm2" data-act="brwjump" data-bid="${n[0]}">${esc(n[1])}</button>`).join('')}</nav>
  ${brwSafe(brwStatusSec, d, secErr)}${brwSafe(brwProspectSec, d, secErr)}${brwSafe(brwCompetitorSec, d, secErr)}${brwSafe(brwReportSec, d, secErr)}${brwSafe(brwRecsSec, d)}${brwSafe(brwEvidenceSec, d, secErr)}${brwSafe(brwAiSec, d, secErr)}${brwSafe(brwDeliverySec, d, secErr)}${brwSafe(brwSummarySec, d)}`;
}
function brwStatusSec(d, secErr) {
  const dis = BRW.act ? 'disabled' : '', r = d.review, steps = Array.isArray(r.steps) ? r.steps : [], fails = d.calls.filter(c => c.status !== 'ok' && c.status !== 'cache_hit' && c.status !== 'started');
  const expired = r.token_expires_at && Date.parse(r.token_expires_at) < Date.now();
  return `<section class="brwsec" id="brw-s-status" aria-labelledby="brw-h-status"><h3 id="brw-h-status">Status and analysis</h3>
  <p>${brwTag('s-' + r.status, BRW_STATUS[r.status] || r.status)} ${r.status === 'ready' ? brwTag(r.completeness === 'complete' ? 's-complete' : 's-partial', BRW_COMPLETE[r.completeness] || r.completeness) : ''} ${brwIncomplete(r) ? brwTag('s-warn', 'Incomplete assessment') : ''} ${r.hold_for_approval ? brwTag('s-rep', 'Emailed copies wait for your approval') : ''}</p>
  <dl class="brwdl"><dt>Website</dt><dd>${r.website_url ? (brwSafeUrl(r.website_url) ? `<a href="${esc(r.website_url)}" target="_blank" rel="noopener noreferrer nofollow">${esc(r.website_url)}</a>` : esc(r.website_url)) : 'None given, so a reduced assessment'}</dd>
  <dt>Service area</dt><dd>${esc(r.location_text)} (${esc(r.location_kind)})</dd><dt>Category</dt><dd>${esc(r.category)}</dd>
  <dt>Stated goals</dt><dd>${esc((r.goals || []).map(g => BRW_GOAL[g] || g).join(', ') || 'None chosen')} <span class="hint">Customer supplied information</span></dd>
  <dt>Assessment level</dt><dd>${esc(r.assessment_level)}</dd><dt>Submitted</dt><dd>${esc(brwWhen(r.created_at))}</dd><dt>Confirmed</dt><dd>${esc(brwWhen(r.confirmed_at))}</dd><dt>Finished</dt><dd>${esc(brwWhen(r.completed_at))}</dd>
  <dt>Report link</dt><dd>${r.token_revoked ? 'Revoked' : expired ? 'Expired ' + esc(brwWhen(r.token_expires_at)) : 'Valid until ' + esc(brwWhen(r.token_expires_at))} <span class="hint">The customer's link cannot be shown again because only a hash of it is stored.</span></dd></dl>
  <p class="row noprint"><button class="btn sm2" data-act="brwtoken" data-bk="extend" ${dis}>Extend the link by 30 days</button>${BRW.conf === 'revoke' ? `<span class="hint">Stop the customer opening their report link?</span><button class="btn sm2 pri" data-act="brwtoken" data-bk="revoke" ${dis}>Yes, revoke it</button><button class="btn sm2" data-act="brwconf" data-bk="">Cancel</button>` : '<button class="btn sm2" data-act="brwconf" data-bk="revoke">Revoke the link</button>'}</p>
  ${r.error_code ? `<div class="note stop"><b>Error:</b>${esc(r.error_code)}</div>` : ''}
  <h4>Steps</h4>${steps.length ? `<ol class="brwsteps">${steps.map(s => `<li>${brwTag('s-step-' + s.state, BRW_STEP[s.state] || s.state)} <b>${esc(s.label || s.key)}</b>${s.reason ? ' <span class="hint">' + esc(s.reason) + '</span>' : ''}${s.message ? ' <span class="hint">' + esc(s.message) + '</span>' : ''}</li>`).join('')}</ol>` : '<p class="hint">No steps have run yet.</p>'}
  <h4>Provider calls for this review</h4>${secErr('calls')}${d.calls.length ? `<div class="brwscroll" role="region" aria-label="Provider calls" tabindex="0"><table class="t"><caption class="brwsr">Provider calls</caption><thead><tr><th scope="col">When</th><th scope="col">Provider</th><th scope="col">Operation</th><th scope="col">Result</th></tr></thead><tbody>${d.calls.map(c => `<tr class="${c.status === 'ok' || c.status === 'cache_hit' ? '' : 'brwbad'}"><td>${esc(brwWhen(c.started_at))}</td><td>${esc(c.provider)}</td><td>${esc(c.operation)}</td><td>${esc(c.status)}${c.error_code ? ', ' + esc(c.error_code) : ''}${c.http_status ? ', HTTP ' + esc(c.http_status) : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="hint">No provider calls were recorded.</p>'}
  ${fails.length ? `<p class="hint">${fails.length} call${fails.length > 1 ? 's' : ''} did not succeed. A failed provider never produces invented results, the affected rows are shown as not tested or unavailable.</p>` : ''}</section>`;
}
function brwProspectSec(d, secErr) {
  const p = d.pro, r = d.review, dr = BRW.draft;
  if (!p) return `<section class="brwsec" id="brw-s-pro" aria-labelledby="brw-h-pro"><h3 id="brw-h-pro">Enquiry and notes</h3>${secErr('pro')}<div class="note"><b>Anonymous review:</b>This visitor has not asked to be contacted, so there is no enquiry record, no contact details, and nowhere to keep notes or convert it into a project. An anonymous visitor is not a lead.</div></section>`;
  const svc = (p.requested_services || []).map(k => BRW_SERVICE[k] || k).join(', ') || 'None chosen';
  const hasLead = !!p.lead_id, made = !!p.workbook_id;
  const dis = BRW.act ? 'disabled' : '';
  let conv;
  if (made) conv = `<div class="note"><b>Draft project made:</b>A draft project already exists for this enquiry.<p class="row" style="margin:8px 0 0"><button class="btn sm2" data-act="brwopenproj" data-bid="${esc(p.workbook_id)}" ${dis}>Open the draft project</button></p></div>`;
  else if (p.status === 'closed') conv = '<p class="hint">This enquiry is closed. Set it back to New or In discussion to convert it.</p>';
  else if (!hasLead) conv = '<p class="hint">There is no lead record for this review, so it cannot be turned into a project. Only an enquiry with a lead record can use Make into a client.</p>';
  else if (BRW.conf === 'convert') conv = `<div class="note warn2"><b>Create a draft project?</b>This uses the existing Make into a client step. It makes a <b>draft</b> client record from this enquiry and keeps the review (reference, report versions, evidence count) as a reference on it. It does <b>not</b> approve a client, create or send a quote, or contact the customer. Scope and prices stay empty until you agree them through the usual steps: Discovery, Scope, Dependencies and responsibilities, Quote, Statement of requirements, Contract and written acceptance, Deposit, Build specification, Build and testing, Client review, Acceptance, Handover, Care plan.<p class="row" style="margin:8px 0 0"><button class="btn pri" data-act="brwconvert" ${dis}>Yes, create the draft project</button><button class="btn" data-act="brwconf" data-bk="">Cancel</button></p></div>`;
  else conv = `<p class="row"><button class="btn pri" data-act="brwconf" data-bk="convert" ${dis}>Create draft project</button><span class="hint">Nothing is created until you confirm.</span></p>`;
  return `<section class="brwsec" id="brw-s-pro" aria-labelledby="brw-h-pro"><h3 id="brw-h-pro">Enquiry and notes</h3>${secErr('pro')}
  <dl class="brwdl"><dt>Enquiry status</dt><dd>${brwTag(p.status === 'new' ? 's-new' : 's-pro', BRW_PROSPECT[p.status] || p.status)}</dd><dt>Contact name</dt><dd>${esc(p.contact_name || 'Not given')}</dd><dt>Email</dt><dd>${esc(p.email || 'Not given')}</dd><dt>Phone</dt><dd>${esc(p.phone || 'Not given')}</dd>
  <dt>Report reference</dt><dd>${esc(d.review.ref)}${d.ver ? ', version ' + esc(d.ver) : ''}, ${esc(d.ev.length)} evidence items kept as the snapshot</dd><dt>Date submitted</dt><dd>${esc(brwWhen(p.created_at || d.review.created_at))}</dd><dt>Asked about</dt><dd>${esc(svc)}</dd><dt>Their message</dt><dd>${esc(p.message || 'None')}</dd>
  <dt>Contact permission</dt><dd>${p.follow_up_consent ? 'Agreed that you may contact them about these results' : 'Not given'}${p.consent_at ? ', ' + esc(brwWhen(p.consent_at)) : ''}${p.consent_text_version ? ' (wording ' + esc(p.consent_text_version) + ')' : ''}</dd>
  <dt>Marketing</dt><dd>${p.marketing_consent ? 'Agreed to marketing' : 'Not agreed. Nothing promotional may be sent.'}</dd></dl>
  <div class="q"><label class="ql" for="brw-status-sel">Enquiry status</label><select id="brw-status-sel" data-brw="status" style="max-width:260px"><option value="new" ${dr.status === 'new' ? 'selected' : ''}>New enquiry</option><option value="in_discussion" ${dr.status === 'in_discussion' ? 'selected' : ''}>In discussion</option><option value="closed" ${dr.status === 'closed' ? 'selected' : ''}>Closed</option>${p.status === 'draft_project' ? '<option value="draft_project" selected>Draft project made</option>' : ''}</select></div>
  <div class="q"><label class="ql" for="brw-needs">What the customer needs, in my words</label><textarea id="brw-needs" data-brw="needs" rows="4" placeholder="What they said they need, what is unclear, what to confirm in Discovery">${esc(dr.needs)}</textarea><span class="hint">Kept with the enquiry. It does not go into a quote or document by itself.</span></div>
  <div class="q brwinternal"><label class="ql" for="brw-notes">Internal notes</label><textarea id="brw-notes" data-brw="internal_notes" rows="4" placeholder="Private notes">${esc(dr.internal_notes)}</textarea><span class="hint"><b>${esc(BRW_CARE)}</b></span></div>
  <p class="row noprint"><button class="btn pri" data-act="brwsavepro" ${dis}>Save notes and status</button>${BRW.needSave ? '<span class="hint">Not saved yet</span>' : ''}</p>
  <h4>Make a draft project</h4>${conv}</section>`;
}
function brwCompetitorSec(d, secErr) {
  const dis = BRW.act ? 'disabled' : '', rep = d.report && d.report.competitors;
  const rows = d.comps.map(c => `<li class="brwcomp ${c.status === 'rejected' ? 'brwrej' : ''}"><div class="brwmain"><b>${esc(c.name)}</b> ${brwTag('s-comp-' + c.status, c.status === 'selected' ? 'Selected' : c.status === 'rejected' ? 'Rejected' : 'Candidate')} <span class="hint">${esc(BRW_ORIGIN[c.origin] || c.origin)}, collected ${esc(brwWhen(c.collected_at))}${c.website_url ? ', ' : ''}${c.website_url ? esc(c.website_url) : ''}</span>
    ${c.relevance && c.relevance.note ? `<div class="hint">${esc(c.relevance.note)}</div>` : ''}${c.relevance && c.relevance.basis ? `<div class="hint">Why it was chosen: ${esc((c.relevance.basis || []).join(', '))}${c.relevance.distance_km != null ? ', ' + esc(c.relevance.distance_km) + ' km' : ''}</div>` : ''}${c.rejected_reason ? `<div class="hint">Rejected because: ${esc(c.rejected_reason)}</div>` : ''}${c.reviewed_by_owner ? '<div class="hint">Checked by you</div>' : ''}</div>
    <div class="row noprint">${c.status === 'rejected' ? `<button class="btn sm2" data-act="brwcomp" data-bk="select" data-bid="${esc(c.id)}" ${dis}>Select again</button>` : BRW.conf === 'rej:' + c.id ? `<label class="brwinline" for="brw-rej-${esc(c.id)}">Why is it unsuitable?<input id="brw-rej-${esc(c.id)}" data-brw="rej" type="text" maxlength="200" value="${esc(BRW.draft.rej || '')}"></label><button class="btn sm2 pri" data-act="brwcomp" data-bk="reject" data-bid="${esc(c.id)}" ${dis}>Reject it</button><button class="btn sm2" data-act="brwconf" data-bk="">Cancel</button>` : `${c.status === 'candidate' ? `<button class="btn sm2" data-act="brwcomp" data-bk="select" data-bid="${esc(c.id)}" ${dis}>Select</button>` : ''}<button class="btn sm2" data-act="brwconf" data-bk="rej:${esc(c.id)}">This is not a suitable competitor</button>`}</div></li>`).join('');
  return `<section class="brwsec" id="brw-s-comp" aria-labelledby="brw-h-comp"><h3 id="brw-h-comp">Competitors</h3>${secErr('comps')}
  ${rep ? `<p class="hint">Report says: ${esc(rep.state || '')}. ${esc(rep.selection_note || '')}</p>` : ''}
  <p class="hint">Correct an unsuitable competitor here. This changes the selection through the review service and the report is rebuilt as a new version. The measured evidence is never edited.</p>
  ${rows ? `<ul class="brwlist">${rows}</ul>` : '<p class="hint">No competitors were found or named.</p>'}
  <div class="brwadd noprint"><h4>Add a competitor</h4><div class="grid2"><div class="q"><label class="ql" for="brw-c-name">Business name</label><input id="brw-c-name" data-brw="cname" type="text" maxlength="160" value="${esc(BRW.draft.cname || '')}"></div><div class="q"><label class="ql" for="brw-c-site">Website</label><input id="brw-c-site" data-brw="csite" type="url" maxlength="300" placeholder="https://" value="${esc(BRW.draft.csite || '')}"></div></div><p class="row"><button class="btn" data-act="brwcompadd" ${dis}>Add and select this competitor</button></p></div></section>`;
}
function brwReportSec(d, secErr) {
  const dis = BRW.act ? 'disabled' : '', cur = d.reps.find(x => x.version === d.ver), rep = d.report;
  const vers = d.reps.length ? `<label class="brwinline" for="brw-ver">Version <select id="brw-ver" data-brwf="ver" style="width:auto">${d.reps.map(x => `<option value="${x.version}" ${x.version === d.ver ? 'selected' : ''}>v${x.version}, ${esc(x.status)}, ${esc(x.created_by)}, ${esc(x.reason)}, ${esc(brwDay(x.created_at))}</option>`).join('')}</select></label>` : '';
  return `<section class="brwsec" id="brw-s-report" aria-labelledby="brw-h-report"><h3 id="brw-h-report">Opportunity report</h3>${secErr('report')}${d.repErr ? `<div class="note warn2"><b>Not loaded:</b>${esc(d.repErr)}</div>` : ''}
  ${!d.reps.length ? '<p class="hint">No report version has been built for this review yet.</p>' : `<div class="row">${vers}</div>
  ${cur ? `<p>${brwTag('s-rep', cur.status)} ${brwTag(cur.approved_at ? 's-complete' : 's-partial', cur.approved_at ? 'Approved ' + brwDay(cur.approved_at) : 'Not approved yet')} <span class="hint">Written by ${esc(cur.created_by)}, reason ${esc(cur.reason)}, ${esc(brwWhen(cur.created_at))}, generator ${esc(cur.generator_version)}</span></p>${cur.approved_note ? '<p class="hint">Approval note: ' + esc(cur.approved_note) + '</p>' : ''}` : ''}
  <div class="row noprint">${cur && !cur.approved_at ? `<button class="btn" data-act="brwapprove" ${dis}>Approve this version</button>` : ''}<button class="btn" data-act="brwregen" ${dis}>Rebuild from stored evidence</button><button class="btn" data-act="brwrevise" ${dis}>${BRW.rev ? 'Close the revision form' : 'Revise this report'}</button></div>
  <p class="hint">Approving releases held emails for this version. Rebuilding makes a new version from the stored evidence only, with no provider calls. Revising writes a new owner version, old versions are kept.</p>
  ${rep ? brwSafe(brwReportBody, rep) : '<p class="hint">The content of this version could not be loaded.</p>'}`}</section>`;
}
function brwReportBody(rep) {
  const b = rep.business || {}, m = rep.methodology || {}, c = rep.competitors || {}, rows = (rep.comparison && rep.comparison.rows) || [];
  const subjName = id => { const x = (c.items || []).find(i => i.id === id); return x ? x.name : 'Competitor'; };
  const kf = (rep.key_findings || []).map(k => `<li>${esc(k.text)} ${brwState(k.evidence_state)}<span class="hint"> ${(k.evidence_ids || []).length} evidence item${(k.evidence_ids || []).length === 1 ? '' : 's'}</span></li>`).join('');
  const cmp = rows.map(x => `<tr><th scope="row">${esc(x.label)}<span class="hint">${esc(x.what_checked || '')}</span></th><td>${esc((x.business && x.business.display) || 'Not measured')}<div>${x.business ? brwState(x.business.evidence_state) : ''}</div></td><td>${(x.competitors || []).map(k => esc(subjName(k.competitor_id)) + ': ' + esc(k.display) + '<div>' + brwState(k.evidence_state) + '</div>').join('') || 'None'}</td><td>${esc(x.finding || '')}</td><td>${esc(x.source || '')}<div class="hint">${esc(brwWhen(x.observed_at))}</div></td><td><details><summary>More</summary><p>${esc(x.what_it_means || '')}</p><p>${esc(x.could_improve || '')}</p>${(x.limitations || []).length ? '<p class="hint">Limits: ' + esc(x.limitations.join(' ')) + '</p>' : ''}</details></td></tr>`).join('');
  const tech = ((rep.technical && rep.technical.groups) || []).map(g => `<h5>${esc(g.label)}</h5><div class="brwscroll" role="region" aria-label="${esc(g.label)} checks" tabindex="0"><table class="t"><caption class="brwsr">${esc(g.label)}</caption><thead><tr><th scope="col">Check</th><th scope="col">Result</th><th scope="col">Evidence state</th><th scope="col">What it means</th></tr></thead><tbody>${(g.rows || []).map(x => `<tr><th scope="row">${esc(x.label)}</th><td>${esc((x.business && x.business.display) || '')}</td><td>${x.business ? brwState(x.business.evidence_state) : ''}</td><td>${esc(x.what_it_means || '')}</td></tr>`).join('')}</tbody></table></div>`).join('');
  const ls = rep.local_search || {}, ai = rep.ai_visibility || {};
  const aiRows = (ai.summary || []).map(s => `<tr><td>${esc(s.question_text)}</td><td>${esc(s.provider)}, ${esc(s.tool)}</td><td>${esc(s.runs_ok)} of ${esc(s.runs_total)}</td><td>${esc(s.business_named_in_runs)} of ${esc(s.runs_total)}</td><td>${esc(s.sources_in_runs)} of ${esc(s.runs_total)}</td><td>${esc((s.competitors_named || []).map(x => x.name + ' (' + x.in_runs + ')').join(', ') || 'none')}</td></tr>`).join('');
  const auto = ((rep.automation && rep.automation.opportunities) || []).map(a => `<li><b>${esc(a.workflow_title)}</b> ${brwState(a.evidence_state)} <span class="hint">Confidence ${esc(a.confidence)}. Their words: "${esc(a.task_text)}"</span><p>${esc(a.description)}</p><p class="hint">Approval points: ${esc((a.approval_points || []).join(' '))} Unknowns: ${esc((a.unknowns || []).join(', '))}</p><p class="hint">${esc(a.legal_note || '')} ${esc(a.not_included || '')}</p></li>`).join('');
  return `<div class="brwreport"><h4>Report content</h4>
  <p class="hint">${esc(b.name || '')}, ${esc((b.location && b.location.text) || '')}, ${esc(b.category || '')}. Review date ${esc(b.review_date || '')}. Completeness ${esc(rep.completeness || '')}. Reference ${esc(rep.review_ref || '')}.</p>
  <h5>How it was measured</h5><p>${esc(m.summary || '')}</p>${(m.sources || []).length ? `<ul>${m.sources.map(s => `<li>${esc(s.name)} <span class="hint">${esc(s.kind)}, collected ${esc(brwWhen(s.collected_at))}</span></li>`).join('')}</ul>` : ''}${m.disclaimer ? '<p class="hint">' + esc(m.disclaimer) + '</p>' : ''}
  <h5>Verified findings</h5>${kf ? `<ul class="brwkf">${kf}</ul>` : '<p class="hint">No findings are listed.</p>'}
  <h5>Comparison</h5>${cmp ? `<div class="brwscroll" role="region" aria-label="Comparison table" tabindex="0"><table class="t"><caption class="brwsr">Your business against comparison businesses</caption><thead><tr><th scope="col">Measure</th><th scope="col">Business</th><th scope="col">Competitors</th><th scope="col">Finding</th><th scope="col">Source and date</th><th scope="col">Detail</th></tr></thead><tbody>${cmp}</tbody></table></div>` : '<p class="hint">No row has data on both sides to compare.</p>'}
  ${c.limitations && c.limitations.length ? '<p class="hint">Competitor limits: ' + esc(c.limitations.join(' ')) + '</p>' : ''}
  <h5>Technical checks</h5>${tech || '<p class="hint">None recorded.</p>'}
  <h5>Local search</h5><p>${brwState(ls.state || 'not_tested')} ${esc(ls.note || '')}</p>
  <h5>AI search visibility</h5><p>${esc(ai.state || '')}: ${esc(ai.note || '')}</p>${aiRows ? `<div class="brwscroll" role="region" aria-label="AI visibility summary" tabindex="0"><table class="t"><caption class="brwsr">AI visibility by question</caption><thead><tr><th scope="col">Question</th><th scope="col">Tool</th><th scope="col">Runs that worked</th><th scope="col">Business named</th><th scope="col">Sources given</th><th scope="col">Competitors named</th></tr></thead><tbody>${aiRows}</tbody></table></div><p class="hint">Counts of runs, never a percentage.</p>` : ''}
  <h5>Automation opportunities</h5>${auto ? `<ul class="brwkf">${auto}</ul>` : '<p class="hint">The visitor did not describe a task.</p>'}
  ${(rep.disclaimers || []).length ? '<h5>Disclaimers in the report</h5><ul>' + rep.disclaimers.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : ''}</div>`;
}
function brwRecsSec(d) {
  const rep = d.report, recs = (rep && rep.recommendations) || [], p = d.pro, marks = new Set((p && p.discuss_keys) || []), dis = BRW.act ? 'disabled' : '';
  const body = recs.map(x => `<li class="brwrec"><div class="brwrechead"><label class="brwchk"><input type="checkbox" data-brwchk="discuss" data-bk="${esc(x.key)}" ${marks.has(x.key) ? 'checked' : ''} ${p && !dis ? '' : 'disabled'}> <b>Discuss: ${esc(x.title)}</b></label> ${brwTag('s-tier-' + x.priority.tier, 'Priority ' + x.priority.rank + ', ' + x.priority.tier)} ${brwTag('s-anon', x.issue_type.replace('_', ' '))}</div>
    <p><b>Found:</b> ${esc(x.found)}</p><p><b>Why it may matter:</b> ${esc(x.why_it_may_matter)}</p><p><b>What could change:</b> ${esc(x.what_could_change)}</p><p><b>Check first:</b> ${esc((x.check_before_implementation || []).join(' '))}</p>
    <p class="hint">Service: ${esc((x.service && x.service.label) || '')}. Evidence items: ${(x.evidence_ids || []).length}. Rule: ${esc((x.priority.basis && x.priority.basis.rule) || '')} ${esc((x.caveats || []).join(' '))}</p>
    ${BRW.rev ? `<div class="brwrevise"><label class="brwchk"><input type="checkbox" data-brwchk="hide" data-bk="${esc(x.key)}" ${BRW.draft['hide:' + x.key] ? 'checked' : ''}> Hide this recommendation in the revised report</label><label class="ql" for="brw-rn-${esc(x.key)}">Note the customer will see (optional)</label><input id="brw-rn-${esc(x.key)}" type="text" maxlength="300" data-brw="rnote:${esc(x.key)}" value="${esc(BRW.draft['rnote:' + x.key] || '')}"></div>` : ''}</li>`).join('');
  return `<section class="brwsec" id="brw-s-recs" aria-labelledby="brw-h-recs"><h3 id="brw-h-recs">Recommendations and discussion</h3>
  <p class="hint">Recommendations are possibilities, not proven outcomes. Tick the ones to talk about with the customer. ${p ? 'Ticks save straight away.' : 'Ticking needs an enquiry record, so it is switched off for an anonymous review.'}</p>
  ${recs.length ? `<ul class="brwlist">${body}</ul>` : '<p class="hint">This version has no recommendations.</p>'}
  ${BRW.rev && recs.length ? `<div class="note warn2"><b>Customer visible:</b>Notes here appear in the revised report the customer can open. Do not put internal notes here, use the internal notes box in the enquiry section.</div><div class="q"><label class="ql" for="brw-rev-reason">Why are you revising it?</label><input id="brw-rev-reason" type="text" data-brw="revreason" maxlength="200" value="${esc(BRW.draft.revreason || '')}"></div><p class="row"><button class="btn pri" data-act="brwrevisesave" ${dis}>Save as a new revised version</button></p>` : ''}</section>`;
}
function brwEvidenceSec(d, secErr) {
  const nameOf = id => { if (!id) return 'Your business'; const c = d.comps.find(x => x.id === id); return c ? c.name : 'Competitor'; };
  const f = BRW.ev, subs = [['', 'All'], ['business', 'Your business']].concat(d.comps.map(c => [c.id, c.name])), cats = ['', 'technical', 'local', 'ai_visibility', 'customer_supplied', 'automation'];
  const rows = d.ev.filter(e => (!f.subj || (f.subj === 'business' ? !e.competitor_id : e.competitor_id === f.subj)) && (!f.cat || e.category === f.cat));
  return `<section class="brwsec" id="brw-s-ev" aria-labelledby="brw-h-ev"><h3 id="brw-h-ev">Evidence collected</h3>${secErr('ev')}
  <p class="hint">Stored measurements, read only. Evidence is never edited. A correction makes a new measurement or a new report version.</p>
  <div class="brwfilters"><label for="brw-evs">Subject<select id="brw-evs" data-brwf="evsubj">${subs.map(s => `<option value="${esc(s[0])}" ${f.subj === s[0] ? 'selected' : ''}>${esc(s[1])}</option>`).join('')}</select></label><label for="brw-evc">Kind<select id="brw-evc" data-brwf="evcat">${cats.map(c => `<option value="${c}" ${f.cat === c ? 'selected' : ''}>${c ? esc(c.replace('_', ' ')) : 'All'}</option>`).join('')}</select></label><span class="hint">${rows.length} of ${d.ev.length} items</span></div>
  ${rows.length ? `<div class="brwscroll" role="region" aria-label="Evidence table" tabindex="0"><table class="t"><caption class="brwsr">Evidence collected for this review</caption><thead><tr><th scope="col">Measure</th><th scope="col">Subject</th><th scope="col">State</th><th scope="col">Value</th><th scope="col">Source</th><th scope="col">Measured</th><th scope="col">Method</th></tr></thead><tbody>${rows.map(e => `<tr><th scope="row"><code>${esc(e.metric_key)}</code></th><td>${esc(nameOf(e.competitor_id))}</td><td>${brwState(e.evidence_state)}${e.reason_code ? '<div class="hint">' + esc(e.reason_code) + '</div>' : ''}</td><td>${esc(brwVal(e.value))}</td><td>${esc((e.source && e.source.name) || '')}</td><td>${esc(brwWhen(e.observed_at))}</td><td><details><summary>Method</summary><p>${esc((e.method && e.method.summary) || '')}</p>${(e.limitations || []).length ? '<p class="hint">Limits: ' + esc(e.limitations.join(' ')) + '</p>' : ''}<p class="hint">Inputs: ${esc(JSON.stringify(e.inputs || {}).slice(0, 300))}</p></details></td></tr>`).join('')}</tbody></table></div>` : '<p class="hint">No evidence rows match.</p>'}</section>`;
}
function brwAiSec(d, secErr) {
  const dis = BRW.act ? 'disabled' : '', ai = d.ai, avail = (BRW.prov || []).filter(p => /^ai_/.test(p.id) && p.state === 'available');
  const sums = {}; ai.forEach(a => { const k = a.question_id + '|' + a.provider; (sums[k] = sums[k] || { q: a.question_text, p: a.provider, tool: a.tool, n: 0, ok: 0, named: 0, src: 0 }); const s = sums[k]; s.n++; if (a.status === 'ok') { s.ok++; if (a.business_named) s.named++; if (a.sources_provided) s.src++; } });
  const plan = BRW.aiPlan;
  const tools = avail.length ? `<fieldset class="brwfs"><legend>Tools to test</legend>${avail.map(p => `<label class="brwchk"><input type="checkbox" id="brw-ai-${esc(p.id)}" data-brwchk="aitool" data-bk="${esc(p.id)}" ${BRW.draft['ai:' + p.id] ? 'checked' : ''}> ${esc(p.label || p.id)}</label>`).join(' ')}</fieldset><div class="q"><label class="ql" for="brw-ai-runs">Runs per question (1 to 5)</label><input id="brw-ai-runs" type="number" min="1" max="5" data-brw="airuns" value="${esc(BRW.draft.airuns || 3)}" style="max-width:100px"></div><p class="row"><button class="btn" data-act="brwaiplan" ${dis}>Plan it first (spends nothing)</button></p>` : `<div class="note"><b>Awaiting a supported test:</b>No AI search provider is switched on${BRW.provState === 'err' ? ' (the provider status could not be read: ' + esc(BRW.provErr || '') + ')' : ''}. No AI visibility result exists and none is invented. Provider set up is described in the provider guide.</div>`;
  const planHtml = plan ? `<div class="note warn2"><b>Plan, nothing has run:</b>${esc(plan.questions)} questions, ${esc(plan.runs)} runs each, ${esc(plan.tools)} tool${plan.tools === 1 ? '' : 's'}, ${esc(plan.calls)} calls. Estimated cost ${esc(plan.estimate_pence && plan.estimate_pence.low)} to ${esc(plan.estimate_pence && plan.estimate_pence.high)} pence. ${plan.within_caps ? 'Within the daily and per review caps.' : 'Over a cap: ' + esc((plan.cap_reasons || []).join(', ')) + '.'}
    ${plan.within_caps ? `<label class="brwchk"><input type="checkbox" data-brwchk="aiok" ${BRW.draft.aiok ? 'checked' : ''}> I understand this spends real money, up to ${esc(plan.estimate_pence && plan.estimate_pence.high)} pence</label><p class="row" style="margin:8px 0 0"><button class="btn pri" data-act="brwairun" ${BRW.draft.aiok && !BRW.act ? '' : 'disabled'}>Run the assessment</button></p>` : ''}</div>` : '';
  const res = BRW.aiRes ? `<div class="note"><b>Run progress:</b>${esc(BRW.aiRes.text)}${BRW.aiRes.more ? '<p class="row" style="margin:8px 0 0"><button class="btn sm2" data-act="brwairun" ' + dis + '>Continue the run</button></p>' : ''}</div>` : '';
  return `<section class="brwsec" id="brw-s-ai" aria-labelledby="brw-h-ai"><h3 id="brw-h-ai">AI search visibility</h3>${secErr('ai')}
  ${ai.length ? `<div class="brwscroll" role="region" aria-label="AI visibility runs" tabindex="0"><table class="t"><caption class="brwsr">AI visibility runs by question</caption><thead><tr><th scope="col">Question</th><th scope="col">Tool</th><th scope="col">Runs recorded</th><th scope="col">Worked</th><th scope="col">Business named</th><th scope="col">Sources given</th></tr></thead><tbody>${Object.values(sums).map(s => `<tr><td>${esc(s.q)}</td><td>${esc(s.p)}, ${esc(s.tool)}</td><td>${s.n}</td><td>${s.ok}</td><td>${s.named} of ${s.ok}</td><td>${s.src} of ${s.ok}</td></tr>`).join('')}</tbody></table></div><p class="hint">Exact answers are kept as evidence. Counts of runs only, never a percentage.</p>` : '<p class="hint">No AI visibility runs exist for this review.</p>'}
  <div class="noprint">${tools}${planHtml}${res}</div></section>`;
}
function brwDeliverySec(d, secErr) {
  const dis = BRW.act ? 'disabled' : '', verOf = id => (d.reps.find(r => r.id === id) || {}), body = d.dels.map(x => { const v = verOf(x.report_version_id), canSend = x.status === 'held_for_approval' && v.approved_at; return `<tr><td>${esc(brwWhen(x.created_at))}</td><td>${esc(brwMask(x.to_email))}</td><td>${brwTag('s-del-' + x.status, BRW_DELIVERY[x.status] || x.status)}${x.error_code ? '<div class="hint">' + esc(x.error_code) + '</div>' : ''}</td><td>${v.version ? 'v' + esc(v.version) + (v.approved_at ? ', approved' : ', not approved') : ''}</td><td>${x.sent_at ? esc(brwWhen(x.sent_at)) : ''}</td><td>${x.status === 'held_for_approval' ? `<button class="btn sm2" data-act="brwsend" data-bid="${esc(x.id)}" ${canSend && !BRW.act ? '' : 'disabled'} ${canSend ? '' : 'title="Approve this report version first"'}>Send held email</button>${canSend ? '' : '<div class="hint">Approve the version first</div>'}` : ''}</td></tr>`; }).join('');
  return `<section class="brwsec" id="brw-s-del" aria-labelledby="brw-h-del"><h3 id="brw-h-del">Report delivery</h3>${secErr('dels')}
  <p class="hint">Report emails go only to the address the visitor gave for that purpose and are separate from marketing. Nothing is sent from this screen except a held email you choose to send.</p>
  ${body ? `<div class="brwscroll" role="region" aria-label="Deliveries" tabindex="0"><table class="t"><caption class="brwsr">Report emails</caption><thead><tr><th scope="col">Requested</th><th scope="col">To</th><th scope="col">Status</th><th scope="col">Version</th><th scope="col">Sent</th><th scope="col"><span class="brwsr">Action</span></th></tr></thead><tbody>${body}</tbody></table></div>` : '<p class="hint">The visitor has not asked for an emailed copy.</p>'}</section>`;
}
/* The customer safe summary is built only from the report and the ticks for discussion. It is given nothing else,
   so internal notes, needs, contact details and margins cannot appear in it. */
function brwClientSummary(rep, discussKeys) {
  if (!rep) return '';
  const b = rep.business || {}, marks = new Set(discussKeys || []), L = [];
  L.push('Business review summary for ' + (b.name || ''), 'Reference ' + (rep.review_ref || '') + ', report version ' + rep.version + ', review date ' + (b.review_date || ''), '');
  L.push('This summarises an automated review of public information on the date shown. It is not a quote and does not promise rankings, enquiries or returns.', '');
  L.push('What was found');
  (rep.key_findings || []).forEach(k => L.push('- ' + k.text + ' (' + (BRW_EV[k.evidence_state] || k.evidence_state) + ')'));
  const rs = (rep.recommendations || []).filter(x => marks.has(x.key));
  L.push('', 'Worth discussing');
  if (!rs.length) L.push('- Nothing has been marked for discussion yet.');
  rs.forEach(x => { L.push('- ' + x.title); L.push('  Found: ' + x.found); L.push('  Possible service: ' + ((x.service && x.service.label) || '')); });
  L.push('', 'Limits');
  (rep.disclaimers || []).forEach(x => L.push('- ' + x));
  return L.join('\n');
}
function brwSummarySec(d) {
  const text = brwClientSummary(d.report, d.pro && d.pro.discuss_keys);
  return `<section class="brwsec" id="brw-s-sum" aria-labelledby="brw-h-sum"><h3 id="brw-h-sum">Summary for the customer</h3>
  <p class="hint">Safe to share. Built only from the report and the recommendations you ticked for discussion. It never includes internal notes, your own notes on needs, contact details or prices.</p>
  ${text ? `<pre class="brwsum" id="brw-summary" tabindex="0" aria-label="Customer safe summary">${esc(text)}</pre><p class="row noprint"><button class="btn sm2" data-act="brwcopysum">Copy the summary</button></p>` : '<p class="hint">There is no report to summarise yet.</p>'}</section>`;
}

/* ---------- actions ---------- */
async function brwSavePro() {
  const d = BRW.d; if (!d || !d.pro) return; const dr = BRW.draft;
  const body = { needs: dr.needs || '', internal_notes: dr.internal_notes || '', updated_at: brwIso() }; if (dr.status && dr.status !== 'draft_project' && d.pro.status !== 'draft_project') body.status = dr.status;
  await brwDo('Saving notes and status', async () => { const rows = await clRest('?review_id=eq.' + brwEnc(d.review.id), { table: 'br_prospects', method: 'PATCH', body }); if (!rows || !rows.length) throw new Error('Nothing was saved. The enquiry may have been removed.'); }, 'Notes and status saved.');
}
async function brwDiscuss(key, on) {
  const d = BRW.d; if (!d || !d.pro) return; const set = new Set(d.pro.discuss_keys || []); if (on) set.add(key); else set.delete(key);
  const arr = Array.from(set), prev = d.pro.discuss_keys; d.pro.discuss_keys = arr;
  try { const rows = await clRest('?review_id=eq.' + brwEnc(d.review.id), { table: 'br_prospects', method: 'PATCH', body: { discuss_keys: arr, updated_at: brwIso() } }); if (!rows || !rows.length) throw new Error('Nothing was saved.'); brwSay('ok', 'Marked for discussion: ' + arr.length + ' recommendation' + (arr.length === 1 ? '' : 's') + '.'); }
  catch (e) { d.pro.discuss_keys = prev; if (await brwGuardSession(e)) return; brwSay('err', 'The mark was not saved. ' + brwText(e)); }
  brwPaint();
}
async function brwConvert() {
  const d = BRW.d, p = d && d.pro; if (!p || !p.lead_id || BRW.act) return;
  BRW.act = 'Creating the draft project'; brwSay('info', 'Creating the draft project'); brwPaint();
  try {
    if (CL.screen === 'work') {
      if (CL.timer || CL.dirty) await cloudSave(false);
      if (CL.conflict || ['signedout', 'error', 'offline'].includes(CL.status)) throw new Error('The client you have open is not saved online yet. Save it, or go to the client list, then try again. Nothing was created.');
    }
    const rows = await clRest('?id=eq.' + brwEnc(p.lead_id) + '&handled=eq.false&select=id,created_at,name,business,email,phone,message,picks', { table: 'leads' });
    if (!rows || !rows.length) throw new Error('That enquiry is no longer in the new leads list, it may already be handled. Nothing was created.');
    CL.leads = (CL.leads || []).filter(x => x.id !== rows[0].id).concat(rows);
    if (CL.screen === 'work') { CL.screen = 'reviews'; CL.id = ''; CL.dirty = false; clSafe(() => sessionStorage.removeItem(RESKEY)); }
    BRW.conf = ''; BRW.act = ''; BRW.msg = null;
    await ACTS2.leadmk(null, { id: rows[0].id });
    if (CL.screen !== 'work') { brwSay('err', CL.msg || 'The draft project could not be created.'); brwPaint(); }
    BRW.loaded = false; BRW.sel = ''; BRW.d = null;
  } catch (e) { BRW.act = ''; if (await brwGuardSession(e)) return; brwSay('err', brwText(e)); brwPaint(); }
}
/* called from leadmk, before the client row is made: attach the review as a reference, additive key S.review */
async function brwAttach(l) {
  delete S.review; const keep = CL.busy; CL.busy = 'Checking for a business review';
  try {
    const p = brwOne(await clRest('?lead_id=eq.' + brwEnc(l.id) + '&select=review_id,requested_services&limit=1', { table: 'br_prospects' })); if (!p) return;
    const q = brwEnc(p.review_id);
    const [rv, reps, ev] = await Promise.all([clRest('?id=eq.' + q + '&select=id,ref,website_url,location_text,category,goals,completed_at,created_at', { table: 'br_reviews' }), clRest('?review_id=eq.' + q + '&select=version,status,created_by,reason,created_at,approved_at&order=version', { table: 'br_report_versions' }), clRest('?review_id=eq.' + q + '&superseded_by=is.null&select=id&limit=2000', { table: 'br_evidence' })]);
    const r = brwOne(rv); if (!r) return; const pub = (reps || []).filter(x => x.status === 'published'), last = pub[pub.length - 1] || (reps || [])[(reps || []).length - 1];
    S.review = { v: 1, source: 'business_review', ref: r.ref, review_id: r.id, review_date: r.completed_at || r.created_at, converted_at: brwIso(), report_version: last ? last.version : null, report_status: last ? last.status : null, evidence_snapshot_count: (ev || []).length, requested_services: p.requested_services || [], goals: r.goals || [], business: { website: r.website_url || '', location: r.location_text || '', category: r.category || '' }, versions: (reps || []).map(x => ({ version: x.version, status: x.status, created_by: x.created_by, reason: x.reason, created_at: x.created_at, approved: !!x.approved_at })), link: { state: 'pending' } };
    if (!(S.client.town || '').trim() && r.location_text) S.client.town = r.location_text;
  } catch (e) { delete S.review; }
  finally { CL.busy = keep; }
}
/* called from leadmk, after the client row exists: record the link on the review (admin API, then a direct update) */
async function brwAfter(l, row) { if (S.review && S.review.review_id && row && row.id) await brwLinkProject(row.id); }
async function brwLinkProject(wid) {
  const R = S.review; if (!R) return; wid = wid || CL.id;
  try { await brwApi('POST', 'reviews/' + brwEnc(R.review_id) + '/link-workbook', { workbook_id: wid }); R.link = { state: 'linked', at: brwIso() }; }
  catch (e1) {
    if (String(e1.message) === 'nosession') return;
    try { const rows = await clRest('?review_id=eq.' + brwEnc(R.review_id), { table: 'br_prospects', method: 'PATCH', body: { workbook_id: wid, status: 'draft_project', updated_at: brwIso() } }); if (!rows || !rows.length) throw new Error('none'); R.link = { state: 'linked', at: brwIso(), via: 'direct' }; }
    catch (e2) { R.link = { state: 'failed', at: brwIso() }; }
  }
  BRW.loaded = false; save(); render();
}
async function brwLeave() {   /* before opening another client from here: save the open one first, as All clients does */
  if (CL.screen === 'work') {
    if (CL.timer || CL.dirty) await cloudSave(false);
    if (CL.conflict || ['signedout', 'error', 'offline'].includes(CL.status)) { if (!confirm('The latest changes are not saved online yet. Leave anyway? They stay on this device only')) return false; }
    CL.screen = 'reviews'; CL.id = ''; CL.dirty = false; clSafe(() => sessionStorage.removeItem(RESKEY));
  }
  return true;
}
Object.assign(ACTS2, {
  brwgate: () => { CL.screen = 'reviews'; BRW.sel = ''; BRW.msg = null; render(); window.scrollTo(0, 0); const h = $('#brw-h1'); if (h) h.focus(); },
  brwtolist: () => { CL.screen = 'list'; render(); clLoadList(); },
  brwrefresh: () => { BRW.loaded = false; BRW.busy = ''; BRW.err = ''; BRW.prov = null; brwLoadList(); },
  brwopen: (t, d) => brwOpenReview(d.bid),
  brwback: () => { BRW.sel = ''; BRW.d = null; BRW.msg = null; BRW.conf = ''; brwPaint('#brw-h1'); },
  brwreload: () => { BRW.msg = null; brwOpenReview(BRW.sel, BRW.d && BRW.d.ver); },
  brwjump: (t, d) => { const el = document.getElementById(d.bid); if (el) { el.scrollIntoView({ block: 'start' }); const h = el.querySelector('h3'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } } },
  brwconf: (t, d) => { BRW.conf = d.bk || ''; BRW.draft.rej = ''; brwPaint(/^rej:/.test(BRW.conf) ? '#brw-rej-' + BRW.conf.slice(4) : ''); },
  brwsavepro: () => brwSavePro(),
  brwconvert: () => brwConvert(),
  brwrelink: () => brwLinkProject(),
  brwopenproj: async (t, d) => { if (await brwLeave()) clOpen(d.bid); },
  brwcomp: (t, d) => { const id = BRW.sel, body = { action: d.bk, competitor_id: d.bid }; if (d.bk === 'reject') body.reason = (BRW.draft.rej || '').trim() || 'Not a suitable competitor'; brwDo(d.bk === 'reject' ? 'Rejecting the competitor' : 'Selecting the competitor', () => brwApi('POST', 'reviews/' + brwEnc(id) + '/competitors', body), r => (d.bk === 'reject' ? 'Competitor rejected. ' : 'Competitor selected. ') + (r && r.review_status === 'queued' ? 'The review is queued again and a new report version follows once the steps rerun.' : '')); },
  brwcompadd: () => { const n = (BRW.draft.cname || '').trim(), w = (BRW.draft.csite || '').trim(); if (!n || !w) { brwSay('err', 'Give the competitor a name and a website.'); brwPaint('#brw-c-name'); return; } const id = BRW.sel; brwDo('Adding the competitor', () => brwApi('POST', 'reviews/' + brwEnc(id) + '/competitors', { action: 'add', name: n, website: w }), 'Competitor added and selected. The review is queued again and a new report version follows once the steps rerun.').then(() => { BRW.draft.cname = ''; BRW.draft.csite = ''; }); },
  brwapprove: () => { const d = BRW.d, id = BRW.sel; brwDo('Approving the report', () => brwApi('POST', 'reviews/' + brwEnc(id) + '/reports/' + d.ver + '/approve', {}), 'Version ' + d.ver + ' approved. Held emails for it can now be sent.'); },
  brwregen: () => { const id = BRW.sel; brwDo('Rebuilding the report', () => brwApi('POST', 'reviews/' + brwEnc(id) + '/regenerate', { reason: 'owner_rebuild' }), r => 'A new report version was built from the stored evidence' + (r && r.report_version ? ': version ' + r.report_version + '.' : '.')); },
  brwrevise: () => { BRW.rev = !BRW.rev; brwPaint(); },
  brwrevisesave: () => {
    const d = BRW.d, id = BRW.sel, recs = ((d.report && d.report.recommendations) || []).map(x => ({ key: x.key, hide: !!BRW.draft['hide:' + x.key], owner_note: (BRW.draft['rnote:' + x.key] || '').trim() })).filter(x => x.hide || x.owner_note).map(x => { const o = { key: x.key }; if (x.hide) o.hide = true; if (x.owner_note) o.owner_note = x.owner_note; return o; });
    if (!recs.length) { brwSay('err', 'Choose something to hide or add a note first.'); brwPaint(); return; }
    brwDo('Saving the revised version', () => brwApi('POST', 'reviews/' + brwEnc(id) + '/reports/' + d.ver + '/revise', { overrides: { recommendations: recs }, reason: (BRW.draft.revreason || '').trim() || 'owner_revision' }), r => 'Saved as a new version' + (r && r.report_version ? ' ' + r.report_version : '') + '. The earlier versions are kept.').then(() => { BRW.rev = false; });
  },
  brwsend: (t, d) => { const id = BRW.sel; brwDo('Sending the held email', () => brwApi('POST', 'reviews/' + brwEnc(id) + '/deliveries/' + brwEnc(d.bid) + '/send', {}), 'The held email was sent to the address the visitor gave.'); },
  brwtoken: (t, d) => { const id = BRW.sel, ext = d.bk === 'extend'; brwDo(ext ? 'Extending the link' : 'Revoking the link', () => brwApi('POST', 'reviews/' + brwEnc(id) + '/token', ext ? { action: 'extend', days: 30 } : { action: 'revoke' }), r => ext ? 'The report link now lasts until ' + brwWhen(r && r.expires_at) + '.' : 'The report link was revoked.'); },
  brwaiplan: async () => {
    const tools = Object.keys(BRW.draft).filter(k => /^ai:/.test(k) && BRW.draft[k]).map(k => k.slice(3)); if (!tools.length) { brwSay('err', 'Choose at least one tool.'); brwPaint(); return; }
    const runs = Math.max(1, Math.min(5, Number(BRW.draft.airuns) || 3)), id = BRW.sel; BRW.draft.aiok = false; BRW.aiPlan = null; BRW.aiRes = null;
    const r = await brwDoKeep('Planning the AI assessment', () => brwApi('POST', 'reviews/' + brwEnc(id) + '/ai-visibility/run', { tools, runs, dry_run: true })); if (r) { BRW.aiPlan = r.plan || null; BRW.aiTools = tools; BRW.aiRunsN = runs; brwSay('ok', 'Plan ready. Nothing has been run and nothing has been spent.'); } brwPaint();
  },
  brwairun: async () => {
    const id = BRW.sel; const r = await brwDoKeep('Running the AI assessment', () => brwApi('POST', 'reviews/' + brwEnc(id) + '/ai-visibility/run', { tools: BRW.aiTools || [], runs: BRW.aiRunsN || 3, dry_run: false }));
    if (r) { const more = Number(r.remaining_calls) > 0; BRW.aiRes = { text: more ? (r.remaining_calls + ' calls are still to run.') : 'The run finished.', more }; BRW.draft.aiok = more; brwSay('ok', BRW.aiRes.text); if (!more) { BRW.aiPlan = null; await brwReload(); } } brwPaint();
  },
  brwcopysum: () => { const el = document.getElementById('brw-summary'); if (el) copyText(el.textContent).then(() => brwSay('ok', 'Summary copied.')); }
});
async function brwDoKeep(label, fn) { if (BRW.act) return null; BRW.act = label; brwSay('info', label); brwPaint(); try { const r = await fn(); BRW.act = ''; return r; } catch (e) { BRW.act = ''; if (await brwGuardSession(e)) return null; brwSay('err', brwText(e)); brwPaint(); return null; } }

/* typing and choices (delegated, no full redraw while typing) */
document.addEventListener('input', e => {
  const t = e.target; if (!t || !t.dataset) return;
  if (t.dataset.brw) { BRW.draft[t.dataset.brw] = t.value; if (/^(needs|internal_notes|status)$/.test(t.dataset.brw)) BRW.needSave = true; }
  else if (t.dataset.brwq) { BRW.f.q = t.value; const ul = document.getElementById('brw-list'); if (ul) ul.innerHTML = brwListItems(); }
});
document.addEventListener('change', e => {
  const t = e.target; if (!t || !t.dataset) return;
  if (t.dataset.brw === 'status') { BRW.draft.status = t.value; BRW.needSave = true; return; }
  if (t.dataset.brwf) {
    const k = t.dataset.brwf;
    if (k === 'status') BRW.f.status = t.value; else if (k === 'attn') BRW.f.attn = t.checked; else if (k === 'days') { BRW.mdays = Number(t.value) || 30; brwLoadMetrics(); return; }
    else if (k === 'evsubj') BRW.ev.subj = t.value; else if (k === 'evcat') BRW.ev.cat = t.value; else if (k === 'ver') { brwOpenReview(BRW.sel, Number(t.value)); return; }
    if (k === 'status' || k === 'attn') { const ul = document.getElementById('brw-list'); if (ul) ul.innerHTML = brwListItems(); } else brwPaint('#' + t.id);
    return;
  }
  if (t.dataset.brwchk) {
    const k = t.dataset.brwchk, key = t.dataset.bk;
    if (k === 'discuss') brwDiscuss(key, t.checked);
    else if (k === 'hide') BRW.draft['hide:' + key] = t.checked;
    else if (k === 'aitool') { BRW.draft['ai:' + key] = t.checked; BRW.aiPlan = null; BRW.draft.aiok = false; brwPaint(t.id ? '#' + t.id : ''); }
    else if (k === 'aiok') { BRW.draft.aiok = t.checked; brwPaint(); }
  }
});
