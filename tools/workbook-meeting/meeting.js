/* =====================================================================
   CLIENT MEETING: a guided discovery interview inside the Client Workbook.
   Nothing here talks to the internet. Everything lives in S.meet, which is saved with the rest of the project
   (browser storage, Save backup, Save to file). The eight concept previews are embedded so the gallery works offline.
   Rule used throughout: only what the client said or picked is recorded as theirs. Everything else is labelled
   as a proposal, or as not yet confirmed. No prices, dates or scope are ever filled in here.
   ===================================================================== */
const MEET_LIB_KEY = 'client-workbook-meetings-v1';
const MEET_STAGES = [
  { id: 'biz', n: 'Your business', sub: 'Tell me about what you do' },
  { id: 'goal', n: 'What should your website do?', sub: 'What should visitors do?' },
  { id: 'look', n: 'What should it look like?', sub: 'Look at ideas together' },
  { id: 'assets', n: 'Photos and branding', sub: 'What you have already' },
  { id: 'feat', n: 'What does it need?', sub: 'Pages and features' },
  { id: 'review', n: "Let's review your ideas", sub: 'Check I got it right' }
];
const MEET_ICONS = {
  call: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  enquiry: 'M3 6h18v12H3z M3 7l9 7 9-7',
  quote: 'M6 3h9l4 4v14H6z M15 3v4h4 M9 12h6 M9 16h6',
  book: 'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4',
  buy: 'M5 8h14l-1 12H6z M9 8a3 3 0 0 1 6 0',
  work: 'M4 5h7v7H4z M13 5h7v4h-7z M13 11h7v8h-7z M4 14h7v5H4z',
  other: 'M5 12h.01 M12 12h.01 M19 12h.01',
  services: 'M4 6h16 M4 12h16 M4 18h10',
  tag: 'M4 4h8l8 8-8 8-8-8z M8 8h.01',
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 8 0 0 1 16 0'
};
const micon = k => `<svg class="mi" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${MEET_ICONS[k] || MEET_ICONS.other}"/></svg>`;
const MEET_ACTIONS = [
  ['call', 'Call you', 'call', 'Tap to ring your number'],
  ['enquiry', 'Send an enquiry', 'enquiry', 'Fill in a short message form'],
  ['quote', 'Request a quote', 'quote', 'Describe a job and ask what it would cost'],
  ['book', 'Book something', 'book', 'Choose a time, a table or an appointment'],
  ['buy', 'Buy something', 'buy', 'Pay for products on the site'],
  ['work', 'Look at your work', 'work', 'Browse photos or examples of what you have done'],
  ['other', 'Something else', 'other', 'Anything not on this list']
];
const MEET_FEATURES = [
  ['services', 'Services pages', 'services', 'A page for each thing you do, so people can see what you offer'],
  ['gallery', 'Photo gallery', 'work', 'Your photos shown nicely so people can look through them'],
  ['contact', 'Contact form', 'enquiry', 'People send you a message from the website'],
  ['quotereq', 'Quote request', 'quote', 'People describe a job and ask for a price'],
  ['booking', 'Booking system', 'book', 'Customers can choose an appointment on your website'],
  ['catalogue', 'Product catalogue', 'tag', 'A list of what you sell, without taking payment on the site'],
  ['shop', 'Online shop', 'buy', 'Customers can pay for products on your website'],
  ['customer', 'Customer area', 'person', 'A private place where customers can log in and see their own things'],
  ['otherfeat', 'Other business functionality', 'other', 'Anything else the website should do for the business']
];
const MEET_PREFS = [['colours', 'Colours'], ['fonts', 'Fonts and typography'], ['photos', 'Photographs'], ['layouts', 'Page composition'], ['anims', 'Animations'], ['mood', 'General atmosphere']];
const MEET_ASSETS = [
  ['logo', 'A logo', 'Your name or symbol, ready to use'],
  ['photos', 'Photographs', 'Pictures of your work, your premises, your team or your products'],
  ['videos', 'Videos', 'Short clips of your work or business'],
  ['colfont', 'Existing branding', 'Colours, fonts or a style guide you already use'],
  ['content', 'Website content', 'Words, prices lists, descriptions or other information for the pages']
];
const MEET_CONCEPTS = __MEET_CONCEPTS__;
const MEET_DEMO_BASE = '../c-3e9a41b7d20f58c6/cinematic/';
const MEET_ONLINE_BASE = 'https://www.rhyshume.co.uk/website-concepts/';
const MEET_RT = { files: {}, flash: '' };

/* ---------- state ---------- */
function meetBlank() {
  return {
    v: 1, id: uid() + uid(), open: false, stage: 0, started: '', updated: '', status: 'not started', present: false, test: false, contact: '',
    a: {},            /* free text answers: a.<id> = { t: 'their words', st: '' | 'unsure' } */
    hasSite: { v: '', url: '' },
    picks: {}, main: '', otherAction: '',
    concepts: {},     /* slug -> { v: love|parts|no, why: '', pref: { colours: like|dislike ... } } */
    inspo: [{ url: '', note: '' }, { url: '', note: '' }],
    feel: ['', '', ''], feelSt: '',
    pref: {},         /* overall words per category */
    have: { logo: { v: '', who: '', note: '' }, photos: { v: '', who: '', note: '' }, videos: { v: '', who: '', note: '' }, colfont: { v: '', who: '', note: '' }, content: { v: '', who: '', note: '' } },
    files: [], keepThumbs: true, newMedia: { v: '', note: '' },
    feat: {}, otherFeat: '', supply: {},
    review: { v: '', fix: '' },
    notes: {},        /* my private notes per stage and general (never in client copies) */
    synced: {}, savedAt: ''
  };
}
function meetEnsure() { if (!S.meet || typeof S.meet !== 'object') S.meet = meetBlank(); else S.meet = merge(meetBlank(), S.meet); return S.meet; }
const M = () => S.meet || meetEnsure();
const mt = id => ((M().a[id] || {}).t || '').trim();
const mst = id => (M().a[id] || {}).st || '';
const mclean = s => String(s || '').replace(/\s+/g, ' ').trim();
const mnow = () => new Date().toISOString();

/* ---------- questions: what counts as answered ---------- */
const MEET_Q = [
  { id: 'does', st: 0, q: 'What does your business do?', help: 'Let them talk. Write it the way they say it, not the way you would.' },
  { id: 'customers', st: 0, q: 'Who are your customers?', help: 'Are they local, businesses, families? How do they usually find the business today?' },
  { id: 'hasSite', st: 0, q: 'Have you already got a website?', help: 'If yes, ask for the address and what works or does not work about it.' },
  { id: 'actions', st: 1, q: 'When someone opens your website, what do you want them to do?', help: 'Are they meant to ring you, buy something or fill in a form?' },
  { id: 'main', st: 1, q: 'Which one matters most?', help: 'If everything matters, ask: if only one worked perfectly, which would it be?' },
  { id: 'looks', st: 2, q: 'Which of these designs do you like?', help: 'Do not push them towards one. Ask what makes them react, then write their words.' },
  { id: 'feel', st: 2, q: 'Three words for how you want your website to feel', help: 'If stuck, offer pairs: calm or lively? simple or detailed? traditional or modern?' },
  { id: 'logo', st: 3, q: 'Have you already got a logo?', help: 'Ask to see it. Is it in a file they can send, or only on a van or a letterhead?' },
  { id: 'photos', st: 3, q: 'Have you already got photographs?', help: 'Are they good enough, and who owns them? Do not use photos you cannot trace.' },
  { id: 'videos', st: 3, q: 'Have you already got videos?', help: 'Short clips only matter if they are good quality. Ask what is on them.' },
  { id: 'colfont', st: 3, q: 'Have you already got branding, such as colours and fonts?', help: 'Ask for anything printed: letterhead, van, signage. Note the colours if they know them.' },
  { id: 'content', st: 3, q: 'Have you already got the words and information for the website?', help: 'Services list, about text, opening times, prices. Who will write what they do not have?' },
  { id: 'feat', st: 4, q: 'What does your website need to have?', help: 'Everything ticked here is a request. None of it is in a quote until we agree it.' },
  { id: 'systems', st: 4, q: 'Is there any system you already use that should connect to the website?', help: 'For example a diary, accounts, a till or an email service. Ask who runs it.' },
  { id: 'understood', st: 5, q: 'Have I understood what you would like your website to look like and do?', help: 'Pause. Let them correct you. Fix the answers before you save.' }
];
function mAnswered(id) {
  const m = M(), a = m.a;
  switch (id) {
    case 'hasSite': return !!m.hasSite.v;
    case 'actions': return Object.keys(m.picks).some(k => m.picks[k]) || mst('actions') === 'unsure';
    case 'main': return !!m.main || mst('main') === 'unsure';
    case 'looks': return Object.keys(m.concepts).some(k => (m.concepts[k] || {}).v) || m.inspo.some(x => mclean(x.url)) || mst('looks') === 'unsure';
    case 'feel': return m.feel.some(x => mclean(x)) || m.feelSt === 'unsure';
    case 'logo': case 'photos': case 'videos': case 'colfont': case 'content': return !!m.have[id].v;
    case 'feat': return Object.keys(m.feat).some(k => m.feat[k]) || mst('feat') === 'unsure';
    case 'understood': return !!m.review.v;
    default: return !!mt(id) || mst(id) === 'unsure';
  }
}
function mUnsure(id) {
  const m = M();
  if (id === 'hasSite') return m.hasSite.v === 'unsure';
  if (id === 'feel') return m.feelSt === 'unsure';
  if (['logo', 'photos', 'videos', 'colfont', 'content'].includes(id)) return m.have[id].v === 'unsure';
  return mst(id) === 'unsure';
}
const mQState = id => mUnsure(id) ? 'unsure' : (mAnswered(id) ? 'answered' : 'open');
function mStageState(i) {
  const qs = MEET_Q.filter(q => q.st === i); const s = qs.map(q => mQState(q.id));
  if (s.every(x => x === 'open')) return 'open'; if (s.every(x => x !== 'open')) return 'done'; return 'part';
}
function mProgress() { const t = MEET_Q.length, d = MEET_Q.filter(q => mAnswered(q.id)).length; return { t, d, pct: Math.round(d / t * 100) }; }

/* ---------- helpers for markup ---------- */
const mseg = (path, opts, cur, cls) => `<div class="mseg ${cls || ''}" role="group">${opts.map(([v, l]) => `<button type="button" class="${cur === v ? 'on' : ''}" aria-pressed="${cur === v}" data-act="mset" data-p="${path}" data-v="${v}">${l}</button>`).join('')}</div>`;
const mta = (path, o) => { o = o || {}; return `<label class="mf"><span class="mfl">${o.label || ''}</span><textarea data-k="${path}" rows="${o.rows || 3}" placeholder="${esc(o.ph || 'Type here, in their words')}" ${o.id ? 'id="' + o.id + '"' : ''}>${esc(get(path) || '')}</textarea></label>`; };
const mtx = (path, o) => { o = o || {}; return `<label class="mf"><span class="mfl">${o.label || ''}</span><input type="${o.type || 'text'}" data-k="${path}" value="${esc(get(path) || '')}" placeholder="${esc(o.ph || '')}"></label>`; };
const mUnsureBtn = (id, label) => `<button type="button" class="munsure ${mUnsure(id) ? 'on' : ''}" aria-pressed="${mUnsure(id)}" data-act="munsure" data-q="${id}">${mUnsure(id) ? 'Marked: not sure yet. Tap to undo' : (label || "I'm not sure yet")}</button>`;
const mHelp = id => { const q = MEET_Q.find(x => x.id === id); return q ? `<div class="rhys"><b>Help for Rhys</b><span>${esc(q.help)}</span></div>` : ''; };
const mState = id => { const s = mQState(id); return `<span class="mstate s-${s}" data-live="mq" data-q="${id}">${s === 'answered' ? 'Answered' : s === 'unsure' ? 'Not sure yet' : 'Not answered yet'}</span>`; };
LIVE.mq = el => { const s = mQState(el.q); const c = document.querySelector('[data-live="mq"][data-q="' + el.q + '"]'); if (c) c.className = 'mstate s-' + s; return s === 'answered' ? 'Answered' : s === 'unsure' ? 'Not sure yet' : 'Not answered yet'; };
LIVE.mprog = () => { const p = mProgress(); return `<span class="mpbar" aria-hidden="true"><i style="width:${p.pct}%"></i></span><span>${p.d} of ${p.t} questions answered</span>`; };
const mnotes = i => `<div class="rhys mynotes"><b>My notes (never in the client copy)</b><textarea data-k="meet.notes.s${i}" rows="2" placeholder="Anything to remember or follow up">${esc((M().notes['s' + i]) || '')}</textarea></div>`;
const MEET_HOSTED = /^https?:$/.test(location.protocol);
const mdemo = c => MEET_HOSTED
  ? `<div class="mdemos"><a class="mdemo" href="/website-concepts/${c.slug}" target="_blank" rel="noopener">Open the working demo <small>(opens the public concept, needs the internet)</small></a></div>`
  : `<div class="mdemos"><a class="mdemo" href="${MEET_DEMO_BASE}${c.slug}.html" target="_blank" rel="noopener">Open the working demo <small>(on this computer, works offline)</small></a><a class="mdemo2" href="${MEET_ONLINE_BASE}${c.slug}" target="_blank" rel="noopener">Online copy <small>(needs the internet)</small></a></div>`;

/* ---------- the workbook screen: start, resume, saved clients ---------- */
function meetBanner() {
  const m = M(); const resume = m.started;
  return `<div class="mbanner noprint"><div><b>Sitting down with a client?</b><span>${resume ? 'A meeting is in progress: ' + esc(S.client.business || 'no name yet') + '.' : 'Start the guided meeting. One question at a time, big buttons, easy to follow.'}</span></div><button class="btn pri mbig" data-act="mstart">START CLIENT MEETING</button></div>`;
}
function meetLocalList() { try { const l = JSON.parse(localStorage.getItem(MEET_LIB_KEY)); return Array.isArray(l) ? l : []; } catch (e) { return []; } }
function meetLocalWrite(l) { try { localStorage.setItem(MEET_LIB_KEY, JSON.stringify(l)); return true; } catch (e) { return false; } }
function meetSnapshot() { return JSON.stringify(Object.assign({ app: 'client-workbook' }, S), (k, v) => (k === 'ui' || k === 'pb' || k === 'assets') ? undefined : v); }
function meetSaveLocal() {
  const m = M(); const l = meetLocalList(); const rec = { id: m.id, business: S.client.business || 'No name yet', updated: mnow(), test: !!m.test, pct: mProgress().pct, json: meetSnapshot() };
  const i = l.findIndex(x => x.id === m.id); if (i >= 0) l[i] = rec; else l.unshift(rec);
  return meetLocalWrite(l.slice(0, 12));
}
function vMeeting() {
  const m = M(); const list = meetLocalList(); const p = mProgress();
  const started = !!m.started;
  const saved = list.map(r => `<div class="msaved"><div><b>${esc(r.business)}</b>${r.test ? ' <span class="chip">Practice</span>' : ''}<span class="src">${esc(fmtDate((r.updated || '').slice(0, 10), true))}, ${r.pct}% answered</span></div><div class="row"><button class="btn" data-act="mload" data-id="${r.id}">Open</button><button class="btn sm2 stop" data-act="mdelsaved" data-id="${r.id}">Remove</button></div></div>`).join('') || '<p class="hint">Nothing saved on this computer yet. Saving happens automatically while you work.</p>';
  return `${head('Client meeting', 'A guided interview you work through beside the client. Their answers feed the rest of this workbook. Nothing leaves this computer.', 'meeting')}
  <section class="sec"><h2><span class="n">1.0</span>Start</h2>
   ${started ? `<div class="mcta"><div><b>${esc(S.client.business || 'Meeting in progress')}</b><span class="src">Stage ${m.stage + 1} of 6, ${p.d} of ${p.t} answered${m.status === 'saved' ? ', discovery record saved' : ''}</span></div><div class="row"><button class="btn pri mbig" data-act="mresume">RESUME THIS MEETING</button><button class="btn" data-act="mstartnew">Start a new client</button></div></div>`
     : `<div class="mcta"><div><b>New client meeting</b><span class="src">Six short stages, about 30 to 40 minutes</span></div><div class="row"><button class="btn pri mbig" data-act="mstartnew">START CLIENT MEETING</button></div></div>`}
  </section>
  <section class="sec"><h2><span class="n">2.0</span>Saved clients on this computer</h2>${saved}
   <p class="hint">Browser storage can be cleared by the browser. Always use <b>Save backup</b> too.</p></section>
  <section class="sec"><h2><span class="n">3.0</span>Backup, export and import</h2>
   <div class="mexp">
    <button class="btn pri" data-act="mbackup">Save backup of the whole project (file)</button>
    <button class="btn" data-act="mexp" data-kind="internal">Export discovery record, internal (JSON)</button>
    <button class="btn" data-act="mexp" data-kind="client">Export discovery record, client copy (JSON)</button>
    <button class="btn" data-act="mimport">Import a discovery record (JSON)</button>
    <button class="btn" data-act="open">Open a saved project file</button>
   </div>
   <div class="note warn2"><b>How this is protected, honestly.</b> Nothing leaves this computer. The meeting answers, saved clients and backup files are <b>not encrypted</b> and have <b>no password</b>: anyone who can use this computer, this browser or the backup files can read them. Presentation mode only hides things on screen, it is not security. Keep the computer locked and keep backup files somewhere private. The workbook's own email sign-in link protects only clients saved online, and "Work offline" does not need it.</div>
   <p class="hint">The full backup holds everything in this workbook, including your private notes and any quote work, so keep it to yourself. The client copy leaves out your notes and all commercial working. Neither stores passwords. Do not put real client records in the website repository.</p></section>
  <section class="sec"><h2><span class="n">4.0</span>After the meeting</h2><div class="mexp"><button class="btn" data-act="mprintclient">Print or save the client summary</button><button class="btn" data-act="mprintinternal">Print the internal record</button><button class="btn" data-act="mdlclient">Download the client summary (HTML)</button><button class="btn" data-act="msync">Update the rest of the workbook from this meeting</button></div>
   <p class="hint">This does not skip any stage. A discovery record is not a scope, a quote or a contract. Next: Questions to ask, Sites they like, What is in, then the quote.</p></section>`;
}

/* ---------- starting, resuming, switching ---------- */
function meetAskNew() {
  const name = prompt('Client or business name (their own words are best). Leave blank to add it later.', '');
  if (name === null) return null; return name;
}
function meetNewClient() {
  const name = meetAskNew(); if (name === null) return;
  if (S.client.business || M().started) { meetSaveLocal(); }
  const practice = confirm('Is this a practice run with a made-up client?\n\nOK = practice (it is labelled Practice and nothing is real)\nCancel = a real client');
  S = blank(); ensurePackState(); S.client.modes = { funding: false, website: true, seo: false }; S.client.status = 'enquiry';
  S.meet = meetBlank(); S.meet.started = mnow(); S.meet.status = 'in progress'; S.meet.test = practice; S.meet.open = true; S.meet.stage = 0; S.client.business = name.trim();
  S.screen = 'meeting'; try { localStorage.removeItem(KEY); localStorage.removeItem(ASKEY); } catch (e) { }
  meetSaveLocal(); save(); render(); window.scrollTo(0, 0);
}
function meetLoadLocal(id) {
  const rec = meetLocalList().find(x => x.id === id); if (!rec) return;
  if (S.client.business || M().started) { if (!confirm('Open "' + rec.business + '"? The client you have open now is saved on this computer first.')) return; meetSaveLocal(); }
  try { const o = JSON.parse(rec.json); S = merge(blank(), o); S.ui = {}; ensurePackState(); meetEnsure(); S.screen = 'meeting'; S.meet.open = false; save(); render(); window.scrollTo(0, 0); } catch (e) { alert('That saved copy could not be opened.'); }
}
function meetResume() { const m = M(); m.open = true; S.screen = 'meeting'; save(); render(); window.scrollTo(0, 0); }
function meetGo(i) { const m = M(); m.stage = Math.max(0, Math.min(5, i)); m.updated = mnow(); save(); meetSaveLocal(); render(); window.scrollTo(0, 0); const h = document.querySelector('#mstage'); if (h) h.focus(); }
function meetExit() { const m = M(); m.open = false; save(); meetSaveLocal(); S.screen = 'meeting'; render(); window.scrollTo(0, 0); }

/* ---------- the full screen interview ---------- */
function meetShell() {
  const m = M(), i = m.stage, st = MEET_STAGES[i];
  const dots = MEET_STAGES.map((s, k) => { const stt = mStageState(k); return `<li><button type="button" class="mdot ${k === i ? 'cur' : ''} d-${stt}" data-act="mgo" data-i="${k}" ${k === i ? 'aria-current="step"' : ''} aria-label="Stage ${k + 1}: ${esc(s.n)}${stt === 'done' ? ', done' : stt === 'part' ? ', partly done' : ''}"><b>${k + 1}</b><span>${esc(s.n)}</span></button></li>`; }).join('');
  const last = i === 5;
  return `<a class="skip" href="#mstage">Skip to the question</a>
  <div class="mshell ${m.present ? 'present' : ''}">
   <header class="mh noprint"><div class="mhl"><div class="wm">${esc(SETTINGS.appName)}</div><div class="sm">${esc(S.client.business || 'Your website ideas')}${m.test ? ' <span class="chip">Practice, made-up client</span>' : ''}</div></div>
    <div class="mhr"><button class="btn" data-act="mpresent" aria-pressed="${m.present}">${m.present ? 'Show my prompts' : 'Hide my prompts'}</button><button class="btn pri" data-act="msave">Save</button><button class="btn" data-act="mbackup">Save backup</button><button class="btn" data-act="mexit">Back to the workbook</button></div></header>
   <nav class="mnav noprint" aria-label="Meeting stages"><ol>${dots}</ol><div class="mprog" data-live="mprog"></div></nav>
   <main class="mm" id="mmain"><h1 id="mstage" tabindex="-1" class="mt"><span class="mnum">Stage ${i + 1} of 6</span>${esc(st.n)}</h1>${meetStage(i)}</main>
   <footer class="mf2 noprint"><button class="btn mbig" data-act="mback" ${i === 0 ? 'disabled' : ''}>Back</button><span class="mflash" role="status" aria-live="polite">${esc(MEET_RT.flash)}</span><button class="btn mbig" data-act="msave">Save</button>${last ? '<button class="btn pri mbig" data-act="mfinish">Finish and save</button>' : '<button class="btn pri mbig" data-act="mnext">Next</button>'}</footer>
  </div>`;
}
function meetStage(i) { return [stBiz, stGoal, stLook, stAssets, stFeat, stReview][i](); }

/* Stage 1 */
function qcard(id, body, extra) {
  const q = MEET_Q.find(x => x.id === id);
  return `<section class="mq"><div class="mqh"><h2 class="mql">${esc(q.q)}</h2>${mState(id)}</div>${mHelp(id)}${body}${extra === false ? '' : mUnsureBtn(id)}</section>`;
}
function stBiz() {
  const m = M();
  return `<p class="mlede">Let's start with you. There are no wrong answers, and you can say "I'm not sure".</p>
  ${qcard('does', mta('meet.a.does.t', { label: 'Their answer', rows: 4, ph: 'What the business does, in their own words' }))}
  ${qcard('customers', mta('meet.a.customers.t', { label: 'Their answer', rows: 4, ph: 'Who buys from them, in their own words' }))}
  ${qcard('hasSite', `${mseg('meet.hasSite.v', [['yes', 'Yes'], ['no', 'No'], ['unsure', 'Not sure']], m.hasSite.v, 'mbig2')}${m.hasSite.v === 'yes' ? mtx('meet.hasSite.url', { label: 'Its address, if they know it', ph: 'https://' }) + mta('meet.a.siteNote.t', { label: 'What do they like or dislike about it?', rows: 3 }) : ''}`, false)}
  ${mnotes(0)}`;
}

/* Stage 2 */
function stGoal() {
  const m = M(); const picked = MEET_ACTIONS.filter(a => m.picks[a[0]]);
  const grid = MEET_ACTIONS.map(a => `<button type="button" class="mchoice ${m.picks[a[0]] ? 'on' : ''}" aria-pressed="${!!m.picks[a[0]]}" data-act="mpick" data-k2="${a[0]}">${micon(a[2])}<b>${esc(a[1])}</b><span>${esc(a[3])}</span></button>`).join('');
  const main = picked.length > 1 ? picked.map(a => `<button type="button" class="mchoice ${m.main === a[0] ? 'on' : ''}" aria-pressed="${m.main === a[0]}" data-act="mmain" data-k2="${a[0]}">${micon(a[2])}<b>${esc(a[1])}</b></button>`).join('') : (picked.length === 1 ? `<p class="mlede">Only one picked: <b>${esc(picked[0][1])}</b>. That is the main one.</p>` : '<p class="hint">Pick what visitors should do above first.</p>');
  return `<p class="mlede">Think about the moment someone opens your website. You can pick more than one.</p>
  ${qcard('actions', `<div class="mgrid">${grid}</div>${m.picks.other ? mtx('meet.otherAction', { label: 'What else?', ph: 'In their words' }) : ''}`)}
  ${qcard('main', `<div class="mgrid small">${main}</div>`)}
  ${mnotes(1)}`;
}

/* Stage 3 */
function mpref(slug, k, cur) { return `<div class="mpr"><span>${esc(k[1])}</span><div class="mseg2"><button type="button" class="${cur === 'like' ? 'on' : ''}" aria-pressed="${cur === 'like'}" data-act="mcp" data-slug="${slug}" data-k2="${k[0]}" data-v="like">Like</button><button type="button" class="${cur === 'dislike' ? 'on neg' : ''}" aria-pressed="${cur === 'dislike'}" data-act="mcp" data-slug="${slug}" data-k2="${k[0]}" data-v="dislike">Not for me</button></div></div>`; }
function mcard(c) {
  const m = M(); const cc = m.concepts[c.slug] || {}; const v = cc.v || '';
  const sw = c.palette.map(x => `<i style="background:${x}" title="${x}"></i>`).join('');
  const detail = v ? `<div class="mdetail"><h3 class="mq3">What do you like about this?</h3>
     <label class="mf"><span class="mfl">Their words</span><textarea data-k="meet.concepts.${c.slug}.why" rows="2" placeholder="What they like, in their words">${esc(cc.why || '')}</textarea></label>
     <h3 class="mq3">What would you change?</h3>
     <label class="mf"><span class="mfl">Their words</span><textarea data-k="meet.concepts.${c.slug}.change" rows="2" placeholder="What they would change or avoid">${esc(cc.change || '')}</textarea></label>
     <h3 class="mq3">Which parts?</h3>
     <div class="mprefs" role="group" aria-label="Likes and dislikes for ${esc(c.name)}">${MEET_PREFS.map(k => mpref(c.slug, k, (cc.pref || {})[k[0]] || '')).join('')}</div></div>` : '';
  return `<article class="mcon ${v ? 'v-' + v : ''}"><div class="mshots"><img class="mdesk" src="${c.d}" width="720" height="450" alt="Desktop preview of the ${esc(c.name)} concept website" loading="lazy"><div class="mphone"><img src="${c.m}" alt="Phone preview of the ${esc(c.name)} concept website" loading="lazy"></div></div>
   <div class="mcb"><p class="mkind">${esc(c.kind)}, a made-up business</p><h3 class="mcn">${esc(c.name)}</h3><p>${esc(c.blurb)}</p><p class="mshow"><b>Shows:</b> ${esc(c.shows)}</p>
   <div class="mpal" aria-label="Colours used">${sw}<span>${esc(c.fonts)}</span></div>
   ${mdemo(c)}
   <div class="mverd" role="group" aria-label="How do you feel about ${esc(c.name)}"><button type="button" class="${v === 'love' ? 'on love' : ''}" aria-pressed="${v === 'love'}" data-act="mverd" data-slug="${c.slug}" data-v="love">LOVE THIS</button><button type="button" class="${v === 'parts' ? 'on parts' : ''}" aria-pressed="${v === 'parts'}" data-act="mverd" data-slug="${c.slug}" data-v="parts">LIKE PARTS OF IT</button><button type="button" class="${v === 'no' ? 'on no' : ''}" aria-pressed="${v === 'no'}" data-act="mverd" data-slug="${c.slug}" data-v="no">NOT FOR ME</button></div>${detail}</div></article>`;
}
function mTally(k) {
  const m = M(), lk = [], dk = [];
  MEET_CONCEPTS.forEach(c => { const p = ((m.concepts[c.slug] || {}).pref || {})[k]; if (p === 'like') lk.push(c.name); if (p === 'dislike') dk.push(c.name); });
  return { lk, dk };
}
function stLook() {
  const m = M();
  const insp = m.inspo.map((x, i) => `<div class="minsp"><label class="mf"><span class="mfl">Website they like, address</span><input type="text" data-k="meet.inspo.${i}.url" value="${esc(x.url)}" placeholder="https://"></label><label class="mf"><span class="mfl">What they like about it</span><input type="text" data-k="meet.inspo.${i}.note" value="${esc(x.note)}" placeholder="In their words"></label>${m.inspo.length > 1 ? `<button type="button" class="btn sm2" data-act="minsprm" data-i="${i}" aria-label="Remove this website">Remove</button>` : ''}</div>`).join('');
  const prefs = MEET_PREFS.map(k => { const t = mTally(k[0]); return `<div class="mpsum"><h3 class="mq3">${esc(k[1])}</h3><p class="src">${t.lk.length ? 'Liked in: ' + esc(t.lk.join(', ')) : 'No likes marked yet'}${t.dk.length ? '<br>Not for them in: ' + esc(t.dk.join(', ')) : ''}</p>${mta('meet.pref.' + k[0], { label: 'In their own words (optional)', rows: 2, ph: 'What they want, or do not want' })}</div>`; }).join('');
  return `<div class="mnote2"><b>You do not have to choose one.</b> These are made-up businesses, built to show different styles. Pick the bits you like from any of them and we will design something original for you.</div>
  ${qcard('looks', `<div class="mcons">${MEET_CONCEPTS.map(mcard).join('')}</div><p class="hint">${MEET_HOSTED ? 'Working demos open in a new tab, from the public concepts page.' : 'Working demos open in a new tab. They run offline when the concepts folder sits beside this workbook.'} Each is a fictional concept by Rhys Hume, not a real business.</p>`)}
  <section class="mq"><div class="mqh"><h2 class="mql">Pulling it together</h2></div><p class="mlede">Colours, fonts, photographs, layouts, animations and the general atmosphere, one at a time.</p><div class="mprefsum">${prefs}</div></section>
  <section class="mq"><div class="mqh"><h2 class="mql">Websites you already like</h2></div><p class="hint">Any website, from any business. We take ideas and feel from them, never their text or pictures.</p>${insp}<button type="button" class="btn" data-act="minspadd">Add another website</button></section>
  ${qcard('feel', `<div class="mfeel">${[0, 1, 2].map(i => `<label class="mf"><span class="mfl">Word ${i + 1}</span><input type="text" data-k="meet.feel.${i}" value="${esc(m.feel[i])}" placeholder="${['for example calm', 'for example friendly', 'for example confident'][i]}"></label>`).join('')}</div>`)}
  ${mnotes(2)}`;
}

/* Stage 4 */
function stAssets() {
  const m = M();
  const rows = MEET_ASSETS.map(a => { const x = m.have[a[0]]; const qid = a[0]; return `<section class="mq"><div class="mqh"><h2 class="mql">${esc((MEET_Q.find(q => q.id === qid) || { q: a[1] }).q)}</h2>${mState(qid)}</div>${mHelp(qid)}<p class="hint">${esc(a[2])}</p>${mseg('meet.have.' + a[0] + '.v', [['yes', 'Yes'], ['some', 'Some'], ['no', 'No'], ['unsure', 'Not sure']], x.v, 'mbig2')}
    ${x.v === 'yes' || x.v === 'some' ? mta('meet.have.' + a[0] + '.note', { label: 'What exists, and what is missing', rows: 2 }) : ''}
    ${x.v && x.v !== 'unsure' ? `<label class="mf"><span class="mfl">Who will provide it?</span><select data-k="meet.have.${a[0]}.who" ${''}><option value="">Not decided</option><option value="client" ${x.who === 'client' ? 'selected' : ''}>The client will provide it</option><option value="rhys" ${x.who === 'rhys' ? 'selected' : ''}>Rhys will arrange it</option><option value="new" ${x.who === 'new' ? 'selected' : ''}>It needs to be made new</option></select></label>` : ''}</section>`; }).join('');
  const files = m.files.map(f => { const rt = MEET_RT.files[f.id]; const src = rt ? rt.url : (f.thumb || ''); return `<li class="mfile">${src ? `<img src="${src}" alt="Preview of ${esc(f.name)}">` : '<span class="mnoimg">No preview</span>'}<div><b>${esc(f.name)}</b><span class="src">${esc(f.kind)}, ${Math.round(f.size / 1024)} KB, ${rt ? 'preview is temporary' : (f.thumb ? 'small preview saved' : 'name only saved')}</span></div><button type="button" class="btn sm2" data-act="mfilerm" data-id="${f.id}">Remove</button></li>`; }).join('');
  return `<p class="mlede">Let's see what you already have, so we know what is missing and who will provide it.</p>
  ${rows}
  <section class="mq"><div class="mqh"><h2 class="mql">Pictures and files you can show me now</h2></div>
   <div class="mnote2"><b>What gets saved.</b> Files you choose here are only previewed on this computer for now. The saved project keeps each file's name and size. ${m.keepThumbs ? 'It also keeps a <b>small preview picture</b> (about 300 pixels wide) of images.' : 'No preview pictures are kept.'} <b>The original files are not stored in the saved project</b>, so ask the client to send them and keep them yourself.</div>
   <label class="chk"><input type="checkbox" data-k="meet.keepThumbs" ${m.keepThumbs ? 'checked' : ''} data-full="1"><span>Keep a small preview picture of images in the saved project</span></label>
   <label class="btn mfilebtn">Choose files<input type="file" id="mfiles" multiple accept="image/*,video/*,.pdf,.svg,.ai,.eps" hidden></label>
   <ul class="mfiles">${files || '<li class="hint">No files chosen yet</li>'}</ul></section>
  <section class="mq"><div class="mqh"><h2 class="mql">New photography or film</h2></div><p class="hint">Would they like new photographs or a short film made for the website?</p>${mseg('meet.newMedia.v', [['yes', 'Yes please'], ['maybe', 'Maybe'], ['no', 'No'], ['unsure', 'Not sure']], m.newMedia.v, 'mbig2')}${m.newMedia.v === 'yes' || m.newMedia.v === 'maybe' ? mta('meet.newMedia.note', { label: 'What would they like to show', rows: 2 }) : ''}
   <div class="rhys"><b>Remember</b><span>The photographs and films in the concept designs are generated examples. They are not pictures of a real business and must not be used to make claims about the client's own work, premises or people.</span></div></section>
  ${mnotes(3)}`;
}

/* Stage 5 */
function mPages() {
  const m = M(), f = m.feat; const base = [['home', 'Home page'], ['about', 'About page'], ['contactp', 'Contact page']];
  const extra = [];
  if (f.services) extra.push(['services', 'Services pages']); if (f.gallery) extra.push(['gallery', 'Photo gallery']); if (f.quotereq) extra.push(['quotereq', 'Quote request page']);
  if (f.booking) extra.push(['booking', 'Booking page']); if (f.catalogue) extra.push(['catalogue', 'Product catalogue']); if (f.shop) extra.push(['shop', 'Shop pages']); if (f.customer) extra.push(['customer', 'Customer area']);
  if (f.otherfeat && mclean(m.otherFeat)) extra.push(['otherfeat', 'Other: ' + mclean(m.otherFeat)]);
  return base.concat(extra);
}
function stFeat() {
  const m = M();
  const grid = MEET_FEATURES.map(a => `<button type="button" class="mchoice ${m.feat[a[0]] ? 'on' : ''}" aria-pressed="${!!m.feat[a[0]]}" data-act="mfeat" data-k2="${a[0]}">${micon(a[2])}<b>${esc(a[1])}</b><span>${esc(a[3])}</span><i class="mreq">Requested, not in a quote yet</i></button>`).join('');
  const sup = mPages().map(p => `<div class="msup"><span>${esc(p[1])}</span><select data-k="meet.supply.${p[0]}" aria-label="Who supplies the words and photos for ${esc(p[1])}"><option value="">Not decided</option><option value="client" ${m.supply[p[0]] === 'client' ? 'selected' : ''}>The client</option><option value="rhys" ${m.supply[p[0]] === 'rhys' ? 'selected' : ''}>Rhys</option><option value="both" ${m.supply[p[0]] === 'both' ? 'selected' : ''}>Both together</option></select></div>`).join('');
  return `<p class="mlede">Tick everything you would like. Ticking is a request. It does not add anything to a price.</p>
  ${qcard('feat', `<div class="mgrid">${grid}</div>${m.feat.otherfeat ? mtx('meet.otherFeat', { label: 'What other feature?', ph: 'In their words' }) : ''}`)}
  ${qcard('systems', mta('meet.a.systems.t', { label: 'Their answer', rows: 3, ph: 'Any diary, accounts, till or email system they use' }))}
  <section class="mq"><div class="mqh"><h2 class="mql">Who will supply the words and photos for each page?</h2></div><p class="hint">Someone has to write the words and provide the pictures. Who is it?</p>${sup}</section>
  ${mnotes(4)}`;
}

/* ---------- the model that everything below reads ---------- */
const mLabel = (arr, k) => (arr.find(a => a[0] === k) || [k, k])[1];
const mRole = v => ({ client: 'The client', rhys: 'Rhys', both: 'Both together', new: 'Needs to be made new' }[v] || '');
const mAssetWord = v => ({ yes: 'Yes', some: 'Some', no: 'No', unsure: 'Not sure' }[v] || '');
function meetModel() {
  const m = M(); const o = { conf: [], prop: [], open: [], req: [], scope: [] };
  const add = (list, group, label, value, extra) => list.push(Object.assign({ group, label, value }, extra || {}));
  const ask = (id, group, label, text) => { const s = mQState(id); if (s === 'answered' && text) add(o.conf, group, label, text); else if (s === 'unsure') add(o.open, group, label, 'The client is not sure yet'); else add(o.open, group, label, 'Not asked or not answered yet'); };
  ask('does', 'Business', 'What the business does', mt('does')); ask('customers', 'Audience', 'Who the customers are', mt('customers'));
  if (m.hasSite.v === 'yes') add(o.conf, 'Business', 'Existing website', 'Yes' + (mclean(m.hasSite.url) ? ', ' + mclean(m.hasSite.url) : '') + (mt('siteNote') ? '. ' + mt('siteNote') : '')); else if (m.hasSite.v === 'no') add(o.conf, 'Business', 'Existing website', 'No website yet'); else add(o.open, 'Business', 'Existing website', m.hasSite.v === 'unsure' ? 'The client is not sure' : 'Not asked yet');
  const picks = MEET_ACTIONS.filter(a => m.picks[a[0]]).map(a => a[0] === 'other' && mclean(m.otherAction) ? 'Something else: ' + mclean(m.otherAction) : a[1]);
  if (picks.length) add(o.conf, 'Objective', 'What visitors should do', picks.join(', ')); else add(o.open, 'Objective', 'What visitors should do', mst('actions') === 'unsure' ? 'The client is not sure yet' : 'Not answered yet');
  if (m.main) add(o.conf, 'Objective', 'Matters most', mLabel(MEET_ACTIONS, m.main)); else if (picks.length > 1) add(o.open, 'Objective', 'Matters most', 'Not chosen yet');
  const liked = MEET_CONCEPTS.filter(c => (m.concepts[c.slug] || {}).v === 'love' || (m.concepts[c.slug] || {}).v === 'parts'), noped = MEET_CONCEPTS.filter(c => (m.concepts[c.slug] || {}).v === 'no');
  liked.forEach(c => { const cc = m.concepts[c.slug]; add(o.conf, 'Style', (cc.v === 'love' ? 'Loved: ' : 'Likes parts of: ') + c.name, (mclean(cc.why) || 'No reason recorded') + (mclean(cc.change) ? '. Would change: ' + mclean(cc.change) : ''), { concept: c.slug }); });
  noped.forEach(c => { const cc = m.concepts[c.slug]; add(o.conf, 'Style', 'Not for them: ' + c.name, (mclean(cc.change) || mclean(cc.why)) || 'No reason recorded', { concept: c.slug }); });
  MEET_PREFS.forEach(k => { const t = mTally(k[0]); const w = mclean(m.pref[k[0]]); if (t.lk.length || t.dk.length || w) add(o.conf, 'Style', k[1], [t.lk.length ? 'Liked in ' + t.lk.join(', ') : '', t.dk.length ? 'Not for them in ' + t.dk.join(', ') : '', w ? 'Their words: ' + w : ''].filter(Boolean).join('. ')); });
  m.inspo.filter(x => mclean(x.url)).forEach(x => add(o.conf, 'Style', 'Website they like', mclean(x.url) + (mclean(x.note) ? ' (' + mclean(x.note) + ')' : '')));
  const feel = m.feel.map(mclean).filter(Boolean); if (feel.length) add(o.conf, 'Style', 'Three words for the feel', feel.join(', ')); else add(o.open, 'Style', 'Three words for the feel', m.feelSt === 'unsure' ? 'The client is not sure yet' : 'Not answered yet');
  if (!liked.length && !noped.length) add(o.open, 'Style', 'Reaction to the design concepts', mst('looks') === 'unsure' ? 'The client is not sure yet' : 'No reaction recorded yet');
  MEET_ASSETS.forEach(a => { const x = m.have[a[0]]; if (x.v === 'yes' || x.v === 'some') add(o.conf, 'Assets', a[1], mAssetWord(x.v) + (mclean(x.note) ? '. ' + mclean(x.note) : '') + (x.who ? '. Provided by: ' + mRole(x.who) : '')); else if (x.v === 'no') add(o.conf, 'Assets', a[1], 'None' + (x.who ? '. ' + mRole(x.who) : '')); else add(o.open, 'Assets', a[1], x.v === 'unsure' ? 'The client is not sure' : 'Not asked yet'); });
  if (m.newMedia.v === 'yes' || m.newMedia.v === 'maybe') add(o.conf, 'Assets', 'New photography or film', (m.newMedia.v === 'yes' ? 'Requested' : 'Maybe') + (mclean(m.newMedia.note) ? '. ' + mclean(m.newMedia.note) : ''));
  m.files.forEach(f => add(o.conf, 'Assets', 'File shown in the meeting', f.name + ' (' + Math.round(f.size / 1024) + ' KB). The original is not stored in this record'));
  const feats = MEET_FEATURES.filter(a => m.feat[a[0]]); feats.forEach(a => add(o.req, 'Features', a[0] === 'otherfeat' && mclean(m.otherFeat) ? 'Other: ' + mclean(m.otherFeat) : a[1], 'Requested. ' + (a[0] === 'otherfeat' ? '' : a[3] + '. ') + 'Not in any quote yet'));
  if (!feats.length) add(o.open, 'Features', 'Pages and features', mst('feat') === 'unsure' ? 'The client is not sure yet' : 'Not answered yet');
  ask('systems', 'Dependencies', 'Systems to connect', mt('systems'));
  mPages().forEach(p => { const v = m.supply[p[0]]; if (v) add(o.conf, 'Dependencies', 'Words and photos for ' + p[1], mRole(v)); else add(o.open, 'Dependencies', 'Who supplies the words and photos for ' + p[1], 'Not decided'); });
  /* creative proposals: mine, not agreed */
  const pages = mPages().map(p => p[1]);
  add(o.prop, 'Proposal', 'Page structure to explore', pages.join(', ') + '. A starting list from what was requested. Not agreed, not priced.');
  if (liked.length) add(o.prop, 'Proposal', 'Design direction to explore', 'Combine what they liked from ' + liked.map(c => c.name).join(', ') + ' into an original design' + (noped.length ? ', avoiding what they rejected in ' + noped.map(c => c.name).join(', ') : '') + '. No concept is copied or used as a template.');
  if (feel.length) add(o.prop, 'Proposal', 'Tone', 'Write and design so the site feels ' + feel.join(', ') + '.');
  if (m.newMedia.v === 'yes' || m.newMedia.v === 'maybe' || ['no', 'unsure', ''].includes(m.have.photos.v)) add(o.prop, 'Proposal', 'Photography', 'Plan for real photography of the business. Generated concept images are placeholders and are not used to make claims about the real business.');
  add(o.prop, 'Proposal', 'Next step', 'Turn this record into scope, responsibilities and a quote for the client to review. Nothing starts until it has been agreed and accepted in writing.');
  /* standing open questions from the workbook's own list */
  const stand = [['deadline', 'Deadline, and why that date'], ['budget', "Budget range, the client's own number"], ['updates', 'Who will update the site after launch'], ['success', 'What success looks like in 12 months']];
  stand.forEach(s => { if (!((S.disc.a || {})[s[0]] || '').trim()) add(o.open, 'Not yet discussed', s[1], 'Ask in the Questions to ask screen'); });
  add(o.open, 'Not yet discussed', 'Domain name, hosting and email', 'Not covered in this meeting');
  o.scope.push({ group: 'Scope', label: 'Which pages and features are included', value: 'Not agreed. Everything requested above still has to be scoped' }, { group: 'Scope', label: 'Price', value: 'Not agreed. Nothing here is priced' }, { group: 'Scope', label: 'Dates and timing', value: 'Not agreed' }, { group: 'Scope', label: 'Who does what', value: 'To be written down as responsibilities, after this meeting' }, { group: 'Scope', label: 'Contract and written acceptance', value: 'Not started. These follow the quote and come before any work starts' });
  o.next = ['Check this summary with the client and correct anything', 'Rhys turns the answers into a scope and responsibilities', 'A quote and statement of requirements follow for the client to review', 'Nothing starts until the quote has been agreed and accepted in writing'];
  return o;
}
function mGroup(list) { const g = {}; list.forEach(x => { (g[x.group] = g[x.group] || []).push(x); }); return g; }

/* Stage 6 */
function stReview() {
  const m = M(), o = meetModel(); const g = mGroup(o.conf); const op = o.open;
  const card = (title, stage, items) => `<section class="mrv"><div class="mrvh"><h2>${esc(title)}</h2><button type="button" class="btn sm2" data-act="mgo" data-i="${stage}">Change</button></div>${items.length ? '<ul>' + items.map(x => `<li><b>${esc(x.label)}</b><span>${esc(x.value)}</span></li>`).join('') + '</ul>' : '<p class="hint">Nothing recorded yet</p>'}</section>`;
  const pick = (grp, st) => card(grp, st, g[grp] || []);
  const concepts = MEET_CONCEPTS.filter(c => (m.concepts[c.slug] || {}).v && (m.concepts[c.slug] || {}).v !== 'no');
  const thumbs = concepts.length ? `<div class="mthumbs">${concepts.map(c => `<figure><img src="${c.d}" alt="${esc(c.name)} concept" width="180" height="113"><figcaption>${esc(c.name)} (${m.concepts[c.slug].v === 'love' ? 'loved' : 'some parts'})</figcaption></figure>`).join('')}</div>` : '';
  return `<p class="mlede">Here is everything I heard. Read it together. Change anything that is not right.</p>
  <div class="mrvgrid">${pick('Business', 0)}${pick('Audience', 0)}${pick('Objective', 1)}<section class="mrv"><div class="mrvh"><h2>Design ideas</h2><button type="button" class="btn sm2" data-act="mgo" data-i="2">Change</button></div>${thumbs}${(g.Style || []).length ? '<ul>' + g.Style.map(x => `<li><b>${esc(x.label)}</b><span>${esc(x.value)}</span></li>`).join('') + '</ul>' : '<p class="hint">Nothing recorded yet</p>'}</section>${pick('Assets', 3)}${card('Requested functionality (requests only)', 4, o.req)}${pick('Dependencies', 4)}${card('Commercial scope still to be agreed', 5, o.scope)}<section class="mrv"><div class="mrvh"><h2>Next steps (proposed)</h2></div><ol>${o.next.map(x => `<li>${esc(x)}</li>`).join('')}</ol></section></div>
  <section class="mrv wide"><div class="mrvh"><h2>Still to find out</h2></div>${op.length ? '<ul>' + op.map(x => `<li><b>${esc(x.group)}: ${esc(x.label)}</b><span>${esc(x.value)}</span></li>`).join('') + '</ul>' : '<p>Nothing outstanding.</p>'}</section>
  ${qcard('understood', `${mseg('meet.review.v', [['yes', 'Yes, that is right'], ['partly', 'Mostly, a few changes'], ['no', 'No, let us go back']], m.review.v, 'mbig2')}${m.review.v === 'partly' || m.review.v === 'no' ? mta('meet.review.fix', { label: 'What should change?', rows: 3, ph: 'In their words' }) : ''}`, false)}
  <div class="mnote2"><b>What saving does.</b> It saves a <b>discovery record</b>: what the client said, and what is still open. It is not a quote, a scope, a contract or a final design. No price, date or promise is added.</div>
  ${mnotes(5)}
  <section class="mq"><div class="mqh"><h2 class="mql">After you finish</h2></div><div class="mexp"><button class="btn" data-act="mprintclient">Client summary (print or save as PDF)</button><button class="btn" data-act="mprintinternal">Internal record (print)</button><button class="btn" data-act="mexp" data-kind="internal">Export discovery record (JSON)</button><button class="btn pri" data-act="mbackup">Save backup of the whole project</button></div></section>`;
}

/* ---------- sync into the existing workbook screens, without overwriting my own edits ---------- */
function msyncSet(path, value) {
  const m = M(); const cur = String(get(path) || ''); const last = m.synced[path]; value = String(value || '');
  if (!value) return false; if (cur === value) { m.synced[path] = value; return false; }
  if (cur && cur !== last) return false; /* I edited it myself: leave it alone */
  set(path, value); m.synced[path] = value; return true;
}
function meetSync() {
  const m = M(), o = meetModel(); let n = 0;
  const grp = (gname, label) => (o.conf.filter(x => x.group === gname && (!label || x.label === label)).map(x => x.label + ': ' + x.value).join('\n'));
  if (S.client.business === '' && mclean(m.contact)) { /* nothing to guess */ }
  if (mt('customers') && msyncSet('disc.a.customers', mt('customers'))) n++;
  const goalsOwn = [mt('does') ? 'The business: ' + mt('does') : '', grp('Objective')].filter(Boolean).join('\n'); if (goalsOwn && msyncSet('disc.a.goalsOwn', goalsOwn)) n++;
  const sumFeat = o.req.map(x => x.label).join(', '); if (sumFeat && msyncSet('disc.a.musts', 'Requested in the client meeting (not yet agreed or priced): ' + sumFeat)) n++;
  const contentTxt = [grp('Assets')].filter(Boolean).join('\n'); if (contentTxt && msyncSet('disc.a.content', contentTxt)) n++;
  if (mt('systems') && msyncSet('disc.a.today', 'Systems they use now: ' + mt('systems'))) n++;
  const goalMap = { book: 'bookings', buy: 'sales', work: 'credibility', other: 'other' }; let rank = 1;
  if (m.main && goalMap[m.main] && !S.disc.goals[goalMap[m.main]]) { S.disc.goals[goalMap[m.main]] = '1'; n++; }
  const feel = m.feel.map(mclean).filter(Boolean).join(', '); if (feel && msyncSet('brand.tone', feel)) n++;
  const styleTxt = o.conf.filter(x => x.group === 'Style' && x.label !== 'Three words for the feel').map(x => x.label + ': ' + x.value).join('\n'); if (styleTxt && msyncSet('brand.notes', styleTxt)) n++;
  /* sites they like */
  const likes = S.taste.like; const have = new Set(likes.map(x => mclean(x.url)).filter(Boolean));
  m.inspo.filter(x => mclean(x.url) && !have.has(mclean(x.url))).forEach(x => { const slot = likes.find(l => !mclean(l.url) && !mclean(l.why)); const item = { url: mclean(x.url), why: mclean(x.note) }; if (slot) Object.assign(slot, item); else likes.push(item); n++; });
  MEET_CONCEPTS.forEach(c => { const cc = m.concepts[c.slug]; if (!cc || !cc.v) return; const tag = 'Concept demo, ' + c.name + ' (made-up, by Rhys): '; const why = tag + (cc.v === 'love' ? 'loved. ' : cc.v === 'parts' ? 'likes parts. ' : 'not for them. ') + mclean(cc.why);
    if (cc.v === 'no') { if (!mclean(S.taste.dislike.why) || String(S.taste.dislike.why).startsWith('Concept demo')) { S.taste.dislike.why = why; n++; } return; }
    if (!likes.some(l => String(l.why).startsWith(tag))) { const slot = likes.find(l => !mclean(l.url) && !mclean(l.why)); if (slot) slot.why = why; else likes.push({ url: '', why }); n++; } });
  /* things still to find out go to the parking lot once, keyed so they never duplicate */
  S.parking = S.parking || []; const keyed = new Set(S.parking.map(p => p.key));
  o.open.forEach(x => { const key = 'm-' + (x.group + x.label).toLowerCase().replace(/[^a-z0-9]+/g, '-'); if (!keyed.has(key)) { S.parking.push({ id: 'p-' + uid(), key, text: 'Client meeting: ' + x.group + ', ' + x.label + ' (' + x.value + ')', who: 'client', auto: true }); keyed.add(key); n++; } });
  /* requested features are only noted against the matching scope item, never set to included */
  const scopeNote = { services: 'p-offer', contact: 'p-contact', gallery: 'p-gallery' };
  Object.keys(scopeNote).forEach(f => { const id = scopeNote[f]; if (m.feat[f] && scopeItems().some(i => i.id === id) && !S.scope.note[id]) { S.scope.note[id] = 'Requested in the client meeting. Not agreed or priced yet'; n++; } });
  m.updated = mnow(); save(); return n;
}

/* ---------- summaries and exports ---------- */
const mcss = 'body{font:16px/1.6 "IBM Plex Sans",system-ui,Arial,sans-serif;color:#0b2a5b;margin:0}main{max-width:800px;margin:0 auto;padding:32px 24px}h1{font:500 34px Georgia,serif;margin:0 0 4px}h2{font:500 22px Georgia,serif;margin:26px 0 6px;border-top:2px solid #0b2a5b;padding-top:10px}ul{padding-left:20px}li{margin:4px 0}.src{color:#33486c;font-size:14px}.box{border:1px solid #c4c9d2;background:#f4f4f0;padding:10px 14px;margin:14px 0}.chip{border:1px solid #0b2a5b;padding:2px 8px;font-size:13px}.c{display:inline-block;margin:0 8px 8px 0;font-size:13px}.c img{display:block;width:180px;height:auto;border:1px solid #c4c9d2}h3{font-size:16px;margin:14px 0 2px}@media print{main{padding:0}h2{break-after:avoid}li{break-inside:avoid}}';
const mUl = items => items.length ? '<ul>' + items.map(x => `<li><b>${esc(x.label)}:</b> ${esc(x.value)}</li>`).join('') + '</ul>' : '<p class="src">Nothing recorded.</p>';
function meetClientHtml() {
  const m = M(), o = meetModel(); const g = mGroup(o.conf); const name = S.client.business || 'Your business';
  const liked = MEET_CONCEPTS.filter(c => ['love', 'parts'].includes((m.concepts[c.slug] || {}).v));
  const thumbs = liked.length ? '<div>' + liked.map(c => `<figure class="c"><img src="${c.d}" alt="${esc(c.name)} concept"><figcaption>${esc(c.name)}, a made-up design example</figcaption></figure>`).join('') + '</div>' : '';
  const sec = (t, arr) => arr && arr.length ? `<h2>${t}</h2>${mUl(arr)}` : '';
  return `<main><p class="src">Website ideas summary${m.test ? ' (practice)' : ''}</p><h1>${esc(name)}</h1><p class="src">From our meeting${m.started ? ' on ' + esc(fmtDate(m.started.slice(0, 10))) : ''}. Prepared by ${esc(SETTINGS.preparedBy || 'Rhys Hume')}.</p>
  <div class="box"><b>This is a summary of your ideas.</b> It is not a quote, a contract or a final design, and it is not formal scope. No prices, dates or promises have been agreed. Nothing is agreed until it is written down and you have accepted it.</div>
  ${sec('Your business', g.Business)}${sec('Who your customers are', g.Audience)}${sec('What your website should do', g.Objective)}
  <h2>What you like, and what you would change</h2>${thumbs}${mUl(g.Style || [])}${sec('Photos and branding you have', g.Assets)}${sec('What you would like it to have (these are requests)', o.req)}${sec('Who provides what', g.Dependencies)}
  <h2>Still to find out</h2>${o.open.length ? '<ul>' + o.open.map(x => `<li>${esc(x.label)}: ${esc(x.value)}</li>`).join('') + '</ul>' : '<p>Nothing outstanding.</p>'}
  <h2>Still to be agreed together</h2><ul>${o.scope.map(x => `<li>${esc(x.label)}: ${esc(x.value)}</li>`).join('')}</ul>
  <h2>What happens next</h2><ol>${o.next.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
  <p class="src">Please tell Rhys if anything above is wrong. The example websites you looked at are made-up designs by Rhys Hume, not real businesses. The pictures and films in them are generated examples.</p></main>`;
}
function meetInternalHtml() {
  const m = M(), o = meetModel(); const g = mGroup(o.conf); const name = S.client.business || 'Client';
  const sec = (t, arr) => arr && arr.length ? `<h3>${t}</h3>${mUl(arr)}` : '';
  const notes = MEET_STAGES.map((s, i) => (m.notes['s' + i] || '').trim() ? `<li><b>${esc(s.n)}:</b> ${esc(m.notes['s' + i])}</li>` : '').join('');
  const wf = ['Discovery (this meeting, done)', 'Scope', 'Responsibilities', 'Quote', 'Statement of requirements', 'Contract', 'Written acceptance', 'Deposit', 'Build brief', 'Development', 'Testing', 'Client review', 'Handover', 'Care plan'];
  return `<main><p class="src">INTERNAL MEETING RECORD. Not for the client. Contains private notes.${m.test ? ' PRACTICE RUN.' : ''}</p><h1>${esc(name)}: design discovery record</h1><p class="src">Status: ${esc(m.status)}. Started ${esc(m.started ? fmtDate(m.started.slice(0, 10)) : 'n/a')}. ${mProgress().d} of ${mProgress().t} questions answered.</p>
  <div class="box"><b>Draft design brief, from the recorded answers only.</b> Nothing below is approved. No prices, dates or scope have been agreed.</div>
  <h2>CONFIRMED CLIENT INFORMATION</h2><p class="src">Said or picked by the client.</p>${sec('Business', g.Business)}${sec('Audience', g.Audience)}${sec('What the website should achieve', g.Objective)}${sec('Style, examples, likes and dislikes', g.Style)}${sec('Existing assets', g.Assets)}${sec('Dependencies and who supplies what', g.Dependencies)}
  <h2>CREATIVE IDEAS AND PROPOSALS</h2><p class="src">Mine, based on the answers. Not agreed with the client.</p>${mUl(o.prop)}
  <h2>MISSING OR UNVERIFIED DETAILS</h2>${o.open.length ? '<ul>' + o.open.map(x => `<li><b>${esc(x.group)}: ${esc(x.label)}:</b> ${esc(x.value)}</li>`).join('') + '</ul>' : '<p>Nothing outstanding.</p>'}
  <h3>Not Yet Checked</h3><ul><li>Any grant eligibility or funding</li><li>Legal, contract and regulatory requirements for this business</li><li>The basis of the Tolra linked website discount, which must be confirmed before quoting. No discount is applied</li><li>Whether any concept imagery may be used (it is generated and fictional)</li></ul>
  <h2>REQUESTED FUNCTIONALITY</h2><p class="src">Requests only. None of it is in a quote.</p>${mUl(o.req)}
  <h2>COMMERCIAL SCOPE STILL TO BE AGREED</h2>${mUl(o.scope)}<p class="src">Prices come only from the workbook price book. Quotes say Not VAT registered and carry no VAT line. No discount is applied automatically.</p>
  <h2>My notes</h2>${notes ? '<ul>' + notes + '</ul>' : '<p class="src">None.</p>'}${(m.notes.general || '').trim() ? '<p>' + esc(m.notes.general) + '</p>' : ''}
  <h2>Where this sits in the process</h2><p>${wf.map((s, i) => `${i + 1}. ${esc(s)}`).join(' &rarr; ')}</p><p class="src">The meeting does not skip any step.</p></main>`;
}
function meetPrint(html) {
  let a = document.getElementById('printArea'); if (!a) { a = document.createElement('div'); a.id = 'printArea'; document.body.appendChild(a); }
  a.innerHTML = '<style>' + mcss + '</style>' + html; document.body.classList.add('mprinting');
  const done = () => { document.body.classList.remove('mprinting'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done); setTimeout(() => window.print(), 50);
}
function meetDownload(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type || 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
const mSafeName = () => (S.client.business || 'client').replace(/[^\w ]/g, '').trim().replace(/\s+/g, ' ') || 'client';
function meetRecord(kind) {
  const m = JSON.parse(JSON.stringify(M())); const o = meetModel();
  m.open = false; delete m.synced;
  const rec = { app: 'rdh-discovery-record', v: 1, kind, exportedAt: mnow(), client: { business: S.client.business || '' }, practice: !!m.test, status: m.status, progress: mProgress(), meeting: m, brief: { confirmedClientInformation: o.conf, creativeIdeasAndProposals: o.prop, missingOrUnverified: o.open, requestedFunctionality: o.req, commercialScopeToBeAgreed: o.scope, nextSteps: o.next }, note: 'A discovery record only. Not a quote, scope, contract or final design. No prices, dates or scope are agreed in it.' };
  if (kind === 'client') { delete m.notes; delete rec.brief.creativeIdeasAndProposals; m.notes = {}; delete rec.meeting.contact; rec.note += ' Client copy: private notes and commercial working are left out.'; }
  rec.files = (m.files || []).map(f => ({ name: f.name, size: f.size, kind: f.kind, thumbSaved: !!f.thumb }));
  return rec;
}
function meetImport() {
  const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json';
  i.onchange = () => { const f = i.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => {
    try { const o = JSON.parse(r.result); if (o.app !== 'rdh-discovery-record' || !o.meeting) throw new Error('That is not a discovery record. For a whole project backup use Open a saved project file.');
      const had = M().started || S.client.business; if (had && !confirm('This replaces the meeting answers in the project you have open now (' + (S.client.business || 'no name') + ') with the imported record for "' + ((o.client || {}).business || 'unnamed') + '". Save a backup first if you want to keep the current one. Continue?')) return;
      S.meet = merge(meetBlank(), o.meeting); S.meet.open = false; S.meet.id = uid() + uid(); if (!S.client.business && o.client && o.client.business) S.client.business = o.client.business;
      save(); meetSaveLocal(); S.screen = 'meeting'; render(); alert('Imported the discovery record for ' + ((o.client || {}).business || 'the client') + '.');
    } catch (e) { alert(e.message || 'That file could not be read.'); } };
    r.readAsText(f); };
  i.click();
}

/* ---------- files chosen in the meeting: temporary previews, optional small saved preview ---------- */
function meetAddFiles(list) {
  const m = M(); [].slice.call(list).slice(0, 24 - m.files.length).forEach(f => {
    const id = uid() + uid(); const kind = f.type.startsWith('image/') ? 'Image' : f.type.startsWith('video/') ? 'Video' : (f.name.split('.').pop() || 'File').toUpperCase();
    const rec = { id, name: f.name, size: f.size, kind, thumb: '' }; m.files.push(rec); MEET_RT.files[id] = { url: URL.createObjectURL(f) };
    if (kind === 'Image' && m.keepThumbs && f.type !== 'image/svg+xml') { const img = new Image(); img.onload = () => { const w = Math.min(300, img.width), h = Math.round(img.height * w / img.width); const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h); try { rec.thumb = c.toDataURL('image/jpeg', 0.7); save(); } catch (e) { } }; img.src = MEET_RT.files[id].url; }
  });
  save(); render();
}

/* ---------- actions ---------- */
function mflash(t) { MEET_RT.flash = t; const el = document.querySelector('.mflash'); if (el) el.textContent = t; clearTimeout(mflash.t); mflash.t = setTimeout(() => { MEET_RT.flash = ''; const e2 = document.querySelector('.mflash'); if (e2) e2.textContent = ''; }, 2500); }
Object.assign(ACTS2, {
  mstart: () => { S.screen = 'meeting'; M().open = false; save(); render(); window.scrollTo(0, 0); const b = document.querySelector('.mbig'); if (b) b.focus(); },
  mstartnew: () => meetNewClient(),
  mresume: () => meetResume(),
  mload: (t, d) => meetLoadLocal(d.id),
  mdelsaved: (t, d) => { if (confirm('Remove this saved client from this computer? Any backup files you saved are not affected.')) { meetLocalWrite(meetLocalList().filter(x => x.id !== d.id)); render(); } },
  mgo: (t, d) => meetGo(Number(d.i)),
  mnext: () => meetGo(M().stage + 1),
  mback: () => meetGo(M().stage - 1),
  msave: () => { const ok = meetSaveLocal(); save(); mflash(ok ? 'Saved on this computer ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + '. Use Save backup for a file.' : 'Could not save in the browser. Use Save backup now.'); },
  mbackup: () => { meetSaveLocal(); saveFile(); mflash('Backup file downloaded. Keep it somewhere safe.'); },
  mexit: () => meetExit(),
  mpresent: () => { const m = M(); m.present = !m.present; save(); render(); },
  mset: (t, d) => { const cur = get(d.p); set(d.p, cur === d.v ? '' : d.v); M().updated = mnow(); save(); render(); },
  munsure: (t, d) => { const id = d.q, m = M(); const on = mUnsure(id);
    if (id === 'hasSite') m.hasSite.v = on ? '' : 'unsure'; else if (id === 'feel') m.feelSt = on ? '' : 'unsure'; else if (['logo', 'photos', 'videos', 'colfont', 'content'].includes(id)) m.have[id].v = on ? '' : 'unsure';
    else { m.a[id] = m.a[id] || { t: '', st: '' }; m.a[id].st = on ? '' : 'unsure'; }
    save(); render(); },
  mpick: (t, d) => { const m = M(); m.picks[d.k2] = !m.picks[d.k2]; if (!m.picks[d.k2] && m.main === d.k2) m.main = ''; const on = MEET_ACTIONS.filter(a => m.picks[a[0]]); if (on.length === 1) m.main = on[0][0]; if (m.a.actions) m.a.actions.st = ''; save(); render(); },
  mmain: (t, d) => { const m = M(); m.main = m.main === d.k2 ? '' : d.k2; save(); render(); },
  mverd: (t, d) => { const m = M(); const c = m.concepts[d.slug] = m.concepts[d.slug] || { v: '', why: '', change: '', pref: {} }; c.v = c.v === d.v ? '' : d.v; if (m.a.looks) m.a.looks.st = ''; save(); render(); const el = document.querySelector('[data-k="meet.concepts.' + d.slug + '.why"]'); if (el && c.v) el.focus({ preventScroll: true }); },
  mcp: (t, d) => { const m = M(); const c = m.concepts[d.slug] = m.concepts[d.slug] || { v: '', why: '', pref: {} }; c.pref = c.pref || {}; c.pref[d.k2] = c.pref[d.k2] === d.v ? '' : d.v; save(); render(); const b = document.querySelector('[data-act="mcp"][data-slug="' + d.slug + '"][data-k2="' + d.k2 + '"][data-v="' + d.v + '"]'); if (b) b.focus({ preventScroll: true }); },
  minspadd: () => { M().inspo.push({ url: '', note: '' }); save(); render(); },
  minsprm: (t, d) => { M().inspo.splice(Number(d.i), 1); save(); render(); },
  mfeat: (t, d) => { const m = M(); m.feat[d.k2] = !m.feat[d.k2]; if (m.a.feat) m.a.feat.st = ''; save(); render(); },
  mfilerm: (t, d) => { const m = M(); m.files = m.files.filter(f => f.id !== d.id); if (MEET_RT.files[d.id]) { try { URL.revokeObjectURL(MEET_RT.files[d.id].url); } catch (e) { } delete MEET_RT.files[d.id]; } save(); render(); },
  mfinish: () => { const m = M(); const n = meetSync(); m.status = 'saved'; m.savedAt = mnow(); m.updated = mnow(); save(); meetSaveLocal(); m.open = false; S.screen = 'meeting'; render(); window.scrollTo(0, 0); setTimeout(() => alert('Discovery record saved' + (n ? ' and ' + n + ' items passed to the rest of the workbook' : '') + '.\n\nIt is a discovery record only, not a quote or contract. Use Save backup to keep a file.'), 30); },
  msync: () => { const n = meetSync(); alert(n ? n + ' items passed to Questions to ask, Sites they like, Look and feel, What is in and the open questions list. Anything you wrote yourself was left alone.' : 'Nothing new to pass on. Anything you wrote yourself in those screens was left alone.'); render(); },
  mprintclient: () => meetPrint(meetClientHtml()),
  mprintinternal: () => meetPrint(meetInternalHtml()),
  mdlclient: () => meetDownload('Website ideas summary ' + mSafeName() + '.html', '<!DOCTYPE html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Website ideas summary</title><style>' + mcss + '</style></head><body>' + meetClientHtml() + '</body></html>', 'text/html'),
  mexp: (t, d) => { const k = d.kind === 'client' ? 'client' : 'internal'; meetDownload('Discovery record ' + (k === 'client' ? 'client copy ' : 'internal ') + mSafeName() + '.json', JSON.stringify(meetRecord(k), null, 2)); },
  mimport: () => meetImport()
});
document.addEventListener('change', e => { const t = e.target; if (t && t.id === 'mfiles') { meetAddFiles(t.files); t.value = ''; } });
window.addEventListener('beforeunload', () => { try { if (S.meet && S.meet.started) meetSaveLocal(); } catch (e) { } });
setInterval(() => { try { if (S.meet && S.meet.started && S.meet.open) meetSaveLocal(); } catch (e) { } }, 20000);
