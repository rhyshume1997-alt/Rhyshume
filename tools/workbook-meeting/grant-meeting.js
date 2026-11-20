/* =====================================================================
   GRANT MEETING: a guided one-question-at-a-time meeting for the East Dunbartonshire Council Local Growth Fund
   digital support grant, inside the Client Workbook. Added on top of the client meeting module, nothing is replaced.
   INPUTS: the programme pack (PACKS), the price book (S.pb), and what Rhys types or taps in the meeting.
   OUTPUTS: answers are written straight into the EXISTING grant fields (S.client, S.elig, S.turnover, S.evid, S.crit,
     S.quote, S.quote2, S.plan, S.owners, S.dates, S.drafts), so Grant basics, Can they get it, Proof to collect, Grant
     answers, Grant costs, Dates, Files to send, Copy and print and the quote all show the same thing. Only the meeting's
     own bits (stage notes, trading since, legal form, acknowledgements) live in S.gmeet.
   MUST NOT: invent scheme rules, dates, amounts or prices; overwrite a field Rhys edited by hand (cost lines are synced
     with the same rule as meetSync); put internal notes into anything the client sees; store passwords; touch sign in.
   Nothing here talks to the internet. No promise of an award is ever written: funding is discretionary.
   ===================================================================== */
const GM_PACK_ID = 'edc-lgf-digital';
const GM_STAGES = [
  { id: 'basics', n: 'The business', sub: 'Who they are' },
  { id: 'elig', n: 'Can they get it?', sub: 'The rules, one by one' },
  { id: 'proj', n: 'The project', sub: 'What and why' },
  { id: 'cost', n: 'Costs', sub: 'The itemised quote' },
  { id: 'proof', n: 'Proof to collect', sub: 'Documents and dates' },
  { id: 'next', n: 'Dates and next steps', sub: 'Who does what' },
  { id: 'send', n: 'Send pack', sub: 'Copy, print, save' }
];
const GM_LEGAL = [['sole', 'Sole trader'], ['partner', 'Partnership'], ['ltd', 'Limited company'], ['llp', 'LLP'], ['other', 'Something else']];
const GM_CRIT_STAGE = { impact: 2, benefits: 2, value: 3, deliver: 5 };
const GM_PATHS = ['client.business', 'client.contact', 'client.email', 'client.phone', 'client.address', 'client.town', 'client.types', 'client.flags', 'elig', 'turnover', 'evid', 'crit', 'prep', 'gate', 'quote', 'plan', 'owners', 'dates', 'docs.f.clientNo', 'quote2.lines', 'quote2.dismiss'];
const GM_RT = { ann: '', step: '' };

/* ---------- state ---------- */
function gmBlank() {
  return { v: 1, id: uid() + uid(), open: false, step: 0, started: '', updated: '', test: false, status: 'not started', present: false, savedAt: '',
    b: { since: '', legal: '' }, p: { extra: '' }, uns: {}, ack: { stop: false, nospend: false, dates: false, vat: false }, notes: {}, synced: {}, reviewed: false };
}
function gmEnsure() { if (!S.gmeet || typeof S.gmeet !== 'object') S.gmeet = gmBlank(); else S.gmeet = merge(gmBlank(), S.gmeet); return S.gmeet; }
const GM = () => S.gmeet || gmEnsure();
const gmP = () => PACKS.find(p => p.id === GM_PACK_ID);
const gmActive = () => !!S.client.modes.funding && !!P() && P().id === GM_PACK_ID;
const gclean = s => String(s || '').replace(/\s+/g, ' ').trim();
const gv = path => gclean(get(path));
function gmUse(practice) {
  S.client.modes.funding = true; S.client.packId = GM_PACK_ID; ensurePackState();
  const g = gmEnsure(); if (!g.started) { g.started = mnow(); g.status = 'in progress'; if (practice !== undefined) g.test = !!practice; }
  g.open = true; if (S.meet) S.meet.open = false; S.screen = 'meeting';
}

/* ---------- eligibility logic, all from the pack ---------- */
const GM_LVL = { green: 'Fine so far', amber: 'Check this', red: 'Stop and check' };
function gmRuleMsg(q, a) {
  if (!a) return null;
  if (a === 'unsure') return { lvl: 'amber', text: 'Not sure yet. This goes to the open questions. Find out before you go further, do not guess.' };
  if (q.good) return a === q.good ? { lvl: 'green', text: 'That meets this rule, as far as you can tell. The council makes the decision, not us.' } : { lvl: 'red', text: 'Probably not eligible on this rule. ' + T(q.ifBad || 'Ask the funder before going further.') };
  return { lvl: 'green', text: T(a === 'yes' ? (q.ifYes || '') : (q.ifNo || '')) || 'Noted.' };
}
function gmElig() {
  const p = gmP(), bad = [], unsure = [], open = []; let ok = 0;
  (p.eligibility || []).forEach(q => { const a = S.elig[q.id]; const m = gmRuleMsg(q, a);
    if (!a) open.push(q); else if (a === 'unsure') unsure.push(q); else if (m.lvl === 'red') bad.push({ q, msg: m.text }); else ok++; });
  return { lvl: bad.length ? 'red' : (unsure.length || open.length ? 'amber' : 'green'), bad, unsure, open, ok, total: (p.eligibility || []).length };
}
function gmCap() {
  const p = gmP(), t = p.turnoverCap; const mx = p.award && p.award.max; const vals = [num(S.turnover.recent), num(S.turnover.last)].filter(x => x > 0);
  if (!vals.length || !t) return { max: mx || 0, limit: null, eff: mx || 0 };
  const lim = Math.min.apply(null, vals) * t.pct / 100; return { max: mx || 0, limit: lim, eff: mx ? Math.min(mx, lim) : lim };
}
function gmMonths() {
  const s = GM().b.since; const m = /^(\d{4})-(\d{2})$/.exec(s || ''); if (!m) return null; const n = today();
  return (n.getFullYear() - Number(m[1])) * 12 + (n.getMonth() + 1 - Number(m[2]));
}
const gmMonthYear = s => { const m = /^(\d{4})-(\d{2})$/.exec(s || ''); return m ? new Date(Number(m[1]), Number(m[2]) - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : ''; };
const gmOut = (lvl, text) => `<div class="gout g-${lvl}" role="group"><b>${GM_LVL[lvl]}</b><span>${esc(text)}</span></div>`;

/* things the council page or the pack leave open: shown as "check with the council" */
function gmFlags() {
  const p = gmP(), f = []; const dl = (p.dates || []).find(d => d.kind === 'deadline'), en = (p.dates || []).find(d => d.kind === 'end');
  [dl, en].forEach(d => { if (!d) return; const age = daysBetween(D(d.checked), today()); const left = daysBetween(today(), D(d.value));
    f.push({ id: 'date-' + d.id, lvl: (left < 0 || age > 7) ? 'amber' : 'amber', text: d.label + ': ' + fmtDate(d.value) + '. The workbook checked this on ' + fmtDate(d.checked) + ' (' + age + ' days ago). The council changes its dates, so check the council page before you tell the client.' + (left < 0 ? ' This date has already passed.' : '') }); });
  if (p.discretionary) f.push({ id: 'disc', lvl: 'amber', text: 'Funding is discretionary. Meeting the rules does not guarantee an award. Not confirmed from the council pages in the pack.' });
  if (p.claim) f.push({ id: 'claim', lvl: 'amber', text: 'The exact claim deadline and the evidence process are not settled in the pack, because the sources conflict. Check the current council guidance.' });
  if (p.turnoverCap) f.push({ id: 'turn', lvl: 'amber', text: 'The 10% of turnover rule: the notes say both recent and last year\'s turnover, so which one counts is not clear. Ask the council.' });
  ['quotesNeeded', 'decisionTime', 'extensions'].forEach(k => { if (!p[k]) f.push({ id: k, lvl: 'amber', text: ({ quotesNeeded: 'How many quotes the council needs is not stated.', decisionTime: 'How long a decision takes is not stated.', extensions: 'Whether the finish date can be extended is not stated.' })[k] + ' Ask the council.' }); });
  return f;
}
const gmFlagsHtml = list => list.length ? '<ul class="gflags">' + list.map(x => `<li><span class="gflag">Check with the council</span> ${esc(x.text)}</li>`).join('') + '</ul>' : '';

/* ---------- help for Rhys, per question ---------- */
const GM_HELP = {
  bname: ['Ask what the business is called, exactly as it appears on its registration.', 'The full trading name, and the registered name if it is different.', 'A trading name that is not the registered name, or a name change.', 'Do not tidy or shorten it. The council checks it against the registration.'],
  bcontact: ['Ask who will deal with the council and be the person you speak to.', 'One named person with a phone number and an email they actually read.', 'A shared inbox nobody checks, or a bookkeeper who is the real contact.', 'Do not store passwords or bank details here. Names and contact details only.'],
  baddr: ['Ask for the address they trade from, with the postcode.', 'A trading address with a postcode that is in East Dunbartonshire.', 'A home office, a registered office somewhere else, a unit just over the boundary.', 'Do not decide an address is inside the council area on the postal town alone. If unsure, the council decides.'],
  bsince: ['Ask when they started trading, and what shows it (registration, first invoice).', 'A clear month and year, with paperwork to back it up.', 'A new company set up for an older business, a break in trading, a date that is only a few weeks short of 12 months.', 'Do not round the date up. Do not suggest the council will bend the rule.'],
  blegal: ['Ask how the business is set up legally.', 'Sole trader, partnership, limited company or LLP, and a company number if there is one.', 'A business that is about to change its legal form. That can change the paperwork.', 'Do not give legal or tax advice. Note what they say.'],
  eturn: ['Ask for the turnover figures they would give the council. Two numbers: the most recent, and last year\'s.', 'Two clear figures from their accounts or bookkeeper.', 'A guess, a figure that includes VAT, a very different pair of numbers.', 'Do not say which figure counts, the guidance is not clear. Do not store bank statements, ask only for the figure.'],
  eresult: ['Read the result out in plain words, then pause.', 'The client understands it is a check on their answers, not a decision.', 'A client who has already decided the grant is theirs.', 'Do not promise an award. Funding is discretionary. If it is red, say honestly that it looks like a no for now.'],
  ptypes: ['Ask what they want to put in place, in their words. Then match it to the council\'s list.', 'A specific thing: a website that takes bookings, an online shop, a stock system.', 'Things the council\'s list does not mention: marketing, Google profile, domain and email, automation.', 'Do not say something is covered unless it is on the council\'s list. Anything else is "ask the council".'],
  pnow: ['Ask how they take orders, enquiries or bookings today.', 'Plain facts: phone, paper diary, a shop counter, a few emails a day.', 'Numbers the client cannot back up. Any figure needs a source they can show.', 'Do not write it for them. Use their own words.'],
  plimit: ['Ask what goes wrong, or what they cannot do, because of how it works today.', 'A real, specific limit: missed calls after 5pm, double bookings, hours lost re-typing.', 'Vague words like "better" or "modern". Ask what changes, for whom.', 'Do not invent a problem the client did not describe.'],
  pafter: ['Ask what will be different once the project is finished.', 'One or two concrete changes a customer or the owner would notice.', 'Promises of growth or sales. They cannot be guaranteed.', 'Do not promise results. Describe the change, not the profit.'],
  resil: ['Ask whether this would make the business harder to knock over, for example less reliance on one person or one channel.', 'A specific example in their own words.', 'Nothing to say. That is fine, leave it blank.', 'Do not stretch the answer to sound better.'],
  new: ['Ask whether anything here is new for the business or the area.', 'Something they have not done before.', 'Nothing new. That is fine.', 'Do not call something innovative if it is ordinary.'],
  local: ['Ask what the town gets from this: customers, local suppliers, jobs.', 'A real local link, in plain words.', 'Big claims about jobs.', 'Do not promise jobs or turnover. Only what they actually expect.'],
  palc: ['Ask whether they sell alcohol, now or in the project.', 'A clear yes or no.', 'Collection first, delivery only if their premises licence allows it.', 'This is not legal advice. Anything unsure goes to the licensing standards officer.'],
  gate: ['Ask the question as written.', 'A clear yes, with a document behind it.', 'Not sure answers. They become open questions.', 'Do not give licensing advice.'],
  statement: ['Read the statement aloud and ask what is wrong or missing.', 'The client says "yes, that is us" in their own words.', 'Words they would never say, or claims they cannot show.', 'Do not add numbers or promises. Edit it together, it stays theirs.'],
  cscope: ['Ask what they would say the quote is for, in one or two sentences.', 'A plain description of what is built or bought.', 'Several different projects mixed together.', 'Quote the real price for the real scope. Never pad to reach the cap.'],
  clines: ['Walk down the list and tick what the project really needs. Prices come from your price book.', 'A short list of real items, each with a price.', 'Items with no price yet, or not on the council\'s list.', 'Do not invent prices. Do not rename an item to make it fit. Never pad, rename or prepay to reach the cap.'],
  cvat: ['Say whether the business is VAT registered, and whether the quote has VAT.', 'Clear status. VAT is shown as a separate line.', 'A client who thinks VAT is covered.', 'VAT is not covered by the grant. Say so plainly.'],
  ctotals: ['Read the totals out: what they pay up front, what they could claim back, what they keep paying.', 'The client understands they pay suppliers first and claim later.', 'Anything over the cap, anything the council might not accept.', 'Say "up to", never "you will get". The grant cannot be more than the scheme maximum.'],
  buy: ['Ask them to list exactly what is being bought.', 'A list in plain words they could repeat.', 'Items that sound like running costs.', 'Do not list hosting or domains here. They are ongoing costs.'],
  size: ['Ask why this size of project is right for the business.', 'A reason tied to what the business does.', 'Wanting the biggest amount because it is available.', 'Do not size the project to the cap.'],
  price: ['Ask how the price was checked and who quoted.', 'Who quoted, on what date, and what was compared.', 'No other quote at all. The number of quotes the council needs is not stated.', 'Do not make up comparison quotes.'],
  apart: ['Ask which costs sit outside the grant and who pays them.', 'Hosting and the domain paid by the business each year, for example.', 'Surprise at ongoing costs.', 'Keep care plans and hosting separate from the grant.'],
  cheld: ['Ask how many quotes they hold and from whom.', 'A number and names.', 'The council has not said how many are needed. It is an open question.', 'Do not tell them how many are needed.'],
  cnotes: ['Write anything about price, margin or assumptions that only you should see.', 'Short, honest notes.', 'Anything you would not want the client to read.', 'This never goes into the client pack or the client export.'],
  evid: ['Ask who will get this document, and by what date.', 'A named person and a date they agree to.', 'Documents held by an accountant or a bank.', 'Bank statements go to the council, not through us. Never ask for figures.'],
  prep: ['Ask whether they have these things ready.', 'Most things ticked, the rest with a plan.', 'Anything they need to ask someone else for.', 'Do not hold files for them. They keep their own documents.'],
  ddead: ['Read the dates out, then tell them to check them with the council.', 'The client knows the dates can change.', 'A client who plans around the dates as fixed.', 'Do not promise a date. The council changes its dates and decides when it decides.'],
  dplan: ['Ask when they could start and how many weeks the work takes.', 'Dates that finish before the council\'s finish date.', 'A December start. It only works if approval comes first.', 'Nothing starts before the approval letter.'],
  dnospend: ['Say it plainly and get a clear yes.', 'The client says they will not order, pay or sign anything until approved.', 'A client who has already paid a deposit.', 'Anything bought before the approval letter cannot be claimed.'],
  who: ['Ask who will do the work and whether they have done similar work.', 'Your name and a real example, with the client\'s permission.', 'Overstating experience.', 'Do not claim past work you cannot show.'],
  steps: ['Ask for the steps and dates, finishing before the council\'s finish date.', 'Four or five steps with dates.', 'A tight timeline with no slack.', 'Do not promise a date before approval.'],
  risk: ['Ask what could slow it down, and the plan if it does.', 'Real risks: content late, approval late.', 'Saying there are no risks.', 'Be honest about delay.'],
  cash: ['Ask how the business will pay invoices first and claim later.', 'They have the cash, or a plan for it.', 'A client who cannot pay up front.', 'The grant is paid in arrears. It cannot be used to pay suppliers up front.'],
  downers: ['Agree who does what next, with dates.', 'Short lists with names and dates.', 'Tasks nobody owns.', 'Do not say "I will submit it for you". The client submits their own form, you prepare answers.'],
  dreview: ['Go through the review together and fix anything that is wrong.', 'The client agrees the summary is right.', 'Anything marked open.', 'Do not skip the open items. They go on the list for next time.'],
  send: ['Copy or print each part for the client. Keep the internal record to yourself.', 'The client gets a clear pack they can act on.', 'Anything in the client pack that is marked check.', 'Never send the internal record or the backup file.']
};
Object.assign(GM_HELP, {
  now: GM_HELP.pnow, limit: GM_HELP.plimit, after: GM_HELP.pafter,
  area: ['Ask for the trading address with postcode and listen to where the work is actually done.', 'A trading address with a postcode inside the council area.', 'A home office, a registered office elsewhere, a unit just over the boundary.', 'Do not decide on the postal town alone. If unsure, the council decides.'],
  trading: ['Ask when they started trading and what shows it.', 'A start date at least as long ago as the rule asks, with paperwork.', 'A date a few weeks short, a break in trading, a new company for an old business.', 'Do not round the date up and do not suggest the council will bend the rule.'],
  sme: ['Ask roughly how many people work in the business and what the turnover is.', 'A small firm: the owner and a few staff.', 'Part of a bigger group.', 'Do not decide what counts as small or medium. Ask the council if unsure.'],
  debt: ['Ask whether they owe the council anything, such as business rates or rent.', 'A clear no.', 'Payment plans, disputed bills.', 'Do not tell them to ignore a debt. The council checks.'],
  legal: ['Ask whether their insurance, licences and health and safety are in order.', 'A clear yes, with documents they can find.', 'Anything lapsed or "being sorted".', 'Do not give legal or safety advice.'],
  first: ['Ask whether they have had a grant from the council before.', 'A clear yes or no, and which grant and when if yes.', 'Grants from other bodies. This question is about the council.', 'Do not promise priority. The notes say first-time applicants are prioritised, no more.'],
  start: ['Ask whether they have bought, ordered or paid for anything for this project yet.', 'No, nothing yet.', 'A deposit already paid, a domain bought last week, a subscription already running.', 'Do not suggest backdating anything. Anything bought before the approval letter cannot be claimed.']
});
function gmHelp(s) {
  const h = GM_HELP[s.help || s.id] || ['Ask the question as written and let them answer in their own words.', 'A short, specific answer they could repeat.', 'Anything they are not sure about. Mark it "not sure".', 'Do not promise anything about the outcome.'];
  return `<div class="rhys ghelp"><b>Help for Rhys</b><dl><dt>Ask</dt><dd>${esc(h[0])}</dd><dt>A good answer sounds like</dt><dd>${esc(h[1])}</dd><dt>Listen out for</dt><dd>${esc(h[2])}</dd><dt>Do not promise</dt><dd>${esc(h[3])}</dd></dl></div>`;
}
const gnotes = st => `<div class="rhys mynotes"><b>My notes for this stage (never in the client pack)</b><textarea data-k="gmeet.notes.s${st}" rows="2" aria-label="My notes for this stage" placeholder="Anything to remember or follow up">${esc(GM().notes['s' + st] || '')}</textarea></div>`;

/* ---------- the questions ---------- */
function gmSteps() {
  const p = gmP(), out = []; if (!p) return out; const g = GM();
  const add = o => out.push(Object.assign({ info: false }, o));
  const txt = (id, st, q, path, label, ph, rows, help) => add({ id, st, q, help, unsureBtn: true, body: () => mta(path, { label, rows: rows || 3, ph }), done: () => !!gv(path) });
  /* stage 0 */
  add({ id: 'bname', st: 0, q: 'What is the business called?', body: () => mtx('client.business', { label: 'Business name', ph: 'As it appears on their registration' }), done: () => !!gv('client.business') });
  add({ id: 'bcontact', st: 0, q: 'Who is the main contact?', body: () => `<div class="gtwo">${mtx('client.contact', { label: 'Name' })}${mtx('client.email', { label: 'Email', type: 'email' })}${mtx('client.phone', { label: 'Phone', type: 'tel' })}</div>`, done: () => !!gv('client.contact') && (!!gv('client.email') || !!gv('client.phone')) });
  add({ id: 'baddr', st: 0, q: 'Where does the business trade from?', body: () => `<div class="gtwo">${mtx('client.address', { label: 'Trading address, with postcode', ph: 'Street, postcode' })}${mtx('client.town', { label: 'Town' })}</div><p class="hint">Whether this is in ${esc(p.area)} is the first rule in the next stage.</p>`, done: () => !!gv('client.address') });
  add({ id: 'bsince', st: 0, q: 'How long has the business been trading?', body: () => `${mtx('gmeet.b.since', { label: 'Trading since (month and year)', type: 'month', ph: 'YYYY-MM' })}<div class="gsince" data-live="gmsince"></div>`, done: () => !!g.b.since });
  add({ id: 'blegal', st: 0, q: 'What is the legal form?', body: () => `${mseg('gmeet.b.legal', GM_LEGAL, g.b.legal, 'mbig2')}${mtx('docs.f.clientNo', { label: 'Company or registration number, if there is one', ph: 'Optional' })}`, done: () => !!g.b.legal });
  /* stage 1: every eligibility rule in the pack */
  (p.eligibility || []).forEach(q => add({ id: 'e-' + q.id, st: 1, q: T(q.q), help: q.id, body: () => { const a = S.elig[q.id], m = gmRuleMsg(q, a);
    let pre = ''; if (q.id === 'trading') { const n = gmMonths(); if (n != null) pre = `<p class="hint">They said they started ${esc(gmMonthYear(g.b.since))}, about ${n} months ago.</p>`; }
    if (q.id === 'area' && gv('client.address')) pre = `<p class="hint">Trading address given: ${esc(gv('client.address'))}.</p>`;
    return `${pre}${mseg('elig.' + q.id, [['yes', 'Yes'], ['no', 'No'], ['unsure', 'Not sure']], a, 'mbig2')}<p class="why"><b>Why the council asks:</b> ${esc(T(q.why))}</p>${m ? gmOut(m.lvl, m.text) : ''}${srcHtml(q.src, q.checked)}`; }, done: () => !!S.elig[q.id], unsure: () => S.elig[q.id] === 'unsure' }));
  if (p.turnoverCap) add({ id: 'eturn', st: 1, q: 'What is the turnover?', body: () => `<p>${esc(T(p.turnoverCap.text))}</p>${srcHtml(p.turnoverCap.src, p.turnoverCap.checked)}<div class="gtwo">${mtx('turnover.recent', { label: 'Recent turnover, £', ph: 'The figure they give' })}${mtx('turnover.last', { label: 'Last year\'s turnover, £', ph: 'The figure they give' })}</div><div data-live="gmmax"></div>`, done: () => num(S.turnover.recent) > 0 || num(S.turnover.last) > 0 });
  add({ id: 'eresult', st: 1, q: 'What does that add up to?', info: true, body: () => { const e = gmElig(); const cap = gmCap();
    const lines = [].concat(e.bad.map(b => `<li><b>${esc(T(b.q.q))}</b> ${esc(b.msg)}</li>`), e.unsure.map(q => `<li><b>${esc(T(q.q))}</b> Not sure yet.</li>`), e.open.map(q => `<li><b>${esc(T(q.q))}</b> Not asked yet.</li>`));
    const msg = e.lvl === 'red' ? 'On what they have told you, the business is probably not eligible for this grant. Say so honestly. Do not hold out hope and do not let them spend anything on the strength of it. The council makes the decision, so check the rule with the council before you call it final. If it is only a timing problem, note the date they would qualify.'
      : e.lvl === 'amber' ? 'Some answers are still open or not sure. Find out before you rely on this. This is a check on their answers, not a decision.'
      : 'On these answers the business looks able to apply. That is not a decision. Funding is discretionary, so meeting every rule does not guarantee an award' + (cap.max ? ', and the grant cannot be more than ' + fmt(cap.max) + ' or more than the turnover limit' : '') + '.';
    const ov = e.lvl === 'red' ? `<label class="chk gack"><input type="checkbox" data-k="gmeet.ack.stop" ${g.ack.stop ? 'checked' : ''} data-full="1"><span>I have checked with the council, or this is a practice run, and I want to carry on</span></label>` : '';
    return `${gmOut(e.lvl, msg)}<p class="mlede">${e.ok} of ${e.total} rules answered in a way that meets them.</p>${lines.length ? '<ul class="glist">' + lines.join('') + '</ul>' : ''}${ov}${gmFlagsHtml(gmFlags().filter(f => f.id === 'disc' || f.id === 'turn'))}`; }, done: () => gmElig().lvl !== 'red' || g.ack.stop });
  /* stage 2 */
  add({ id: 'ptypes', st: 2, q: 'What do they want help with?', body: () => { const tiles = PROJECT_TYPES.map(t => { const on = S.client.types.includes(t.id); return `<button type="button" class="mchoice ${on ? 'on' : ''}" aria-pressed="${on}" data-want="${t.id}"><b>${esc(t.label)}</b><span>${esc(t.does)}</span><i class="mreq">Picked</i></button>`; }).join('');
    return `<div class="mgrid">${tiles}</div><div class="note"><b>What the council list covers (from the pack):</b> ${esc((p.eligibleCosts || []).map(c => c.label).join(', '))}. ${srcHtml((p.eligibleCosts[0] || {}).src, (p.eligibleCosts[0] || {}).checked)}</div><div class="note warn2"><b>Not on that list:</b> a Google profile, domain and email, and automation are things you sell, but the pack does not list them. Marketing-only work, ongoing overheads and routine maintenance are excluded. Treat them as <b>ask the council</b>, they are not counted as claimable.</div>${mta('gmeet.p.extra', { label: 'Anything else they asked for that is not on the council list', rows: 2, ph: 'In their words' })}`; }, done: () => S.client.types.length > 0 });
  (p.criteria || []).filter(c => (GM_CRIT_STAGE[c.id] === undefined ? 2 : GM_CRIT_STAGE[c.id]) === 2).forEach(c => allPrompts(c).forEach(x => add({ id: 'c-' + c.id + '-' + x.id, st: 2, q: T(x.qq), help: x.id.replace(/^x-.*/, 'pafter'), unsureBtn: true, info: c.id === 'benefits', body: () => mta('crit.' + c.id + '.a.' + x.id, { label: c.label + (x.tag ? ', ' + x.tag : ''), rows: 3, ph: x.ph || 'In their words' }), done: () => !!gv('crit.' + c.id + '.a.' + x.id) })));
  gatesAsked().forEach(gid => { const G = GATES[gid]; add({ id: 'palc', st: 2, q: G.flagQ, help: 'palc', body: () => `${mseg('client.flags.' + gid, [['yes', 'Yes'], ['no', 'No']], S.client.flags[gid], 'mbig2')}<p class="hint">${S.client.flags[gid] === 'yes' ? 'Yes switches on the ' + esc(G.label.toLowerCase()) + ' screen in the Grant group. The questions follow.' : 'Only the yes answer adds questions.'}</p>`, done: () => !!S.client.flags[gid] });
    if (S.client.flags[gid] === 'yes') G.items.forEach(it => add({ id: 'g-' + gid + '-' + it.id, st: 2, q: it.q, help: 'gate', body: () => { const v = (S.gate[gid] || {})[it.id]; return `${mseg('gate.' + gid + '.' + it.id, [['yes', 'Yes'], ['no', 'No'], ['unsure', 'Not sure']], v, 'mbig2')}<p class="why"><b>Why it matters:</b> ${esc(it.why)}</p>${(v === 'no' || v === 'unsure') ? gmOut(v === 'no' ? 'red' : 'amber', it.ifBad) : ''}`; }, done: () => !!(S.gate[gid] || {})[it.id], unsure: () => (S.gate[gid] || {})[it.id] === 'unsure' })); });
  add({ id: 'statement', st: 2, q: 'The digital impact statement', info: false, body: () => `<p class="mlede">Built from their own words. Read it with them and edit it. Once you edit it by hand, new answers will not change it.</p>${draftBox('gmimpact:statement', 11)}`, done: () => !!(gclean(ans('impact', 'now')) && gclean(ans('impact', 'after'))) });
  /* stage 3 */
  txt('cscope', 3, 'What is the quote for?', 'quote.scope', 'What the quote covers', 'Plain words, one or two sentences', 2);
  add({ id: 'clines', st: 3, q: 'Which items does the project need?', body: gmLinesBody, done: () => S.quote2.lines.some(l => l.freq === 'once' && l.tag !== 'not') });
  add({ id: 'cvat', st: 3, q: 'Is there any VAT on the quote?', body: () => `<p>${esc(S.quote2.vat ? 'Your quote has VAT switched on.' : 'Your quote says: ' + (S.quote2.vatStatus || 'Not VAT registered') + ', so no VAT line.')} The grant does not cover VAT. It is a separate line the client pays.</p>${mtx('quote.vat', { label: 'VAT on the quote, £, separate line. Leave empty if none', ph: 'Only if there is VAT' })}<label class="chk gack"><input type="checkbox" data-k="gmeet.ack.vat" ${g.ack.vat ? 'checked' : ''}><span>VAT is dealt with: there is none, or the amount is typed above</span></label>`, done: () => g.ack.vat });
  add({ id: 'ctotals', st: 3, q: 'What do the numbers come to?', info: true, body: () => `<div data-live="totals"></div><div data-live="gmcostflags"></div><p class="row"><button type="button" class="btn" data-act="gopen" data-s="cost">Open the Grant costs screen</button></p>`, done: () => true });
  (p.criteria || []).filter(c => GM_CRIT_STAGE[c.id] === 3).forEach(c => allPrompts(c).forEach(x => { add({ id: 'c-' + c.id + '-' + x.id, st: 3, q: T(x.qq), help: x.id, unsureBtn: true, body: () => mta('crit.' + c.id + '.a.' + x.id, { label: c.label, rows: 3, ph: x.ph || 'In their words' }), done: () => !!gv('crit.' + c.id + '.a.' + x.id) });
    if (x.id === 'price') add({ id: 'cheld', st: 3, q: 'How many quotes do they hold?', body: () => `${mtx('quote.held', { label: 'Who quoted, and how many', ph: 'e.g. two quotes, from us and one other' })}<p class="hint">${esc(p.quotesNeeded && p.quotesNeeded.text ? p.quotesNeeded.text : 'How many are needed is not stated. It is an open question.')}</p>`, done: () => !!gv('quote.held') }); }));
  add({ id: 'cnotes', st: 3, q: 'My private price and margin notes', info: true, body: () => `<div class="note warn2"><b>Internal only.</b> Never in the client pack or the client export.</div>${mta('gmeet.notes.price', { label: 'Price, margin and assumptions', rows: 4, ph: 'Only you see this' })}`, done: () => true });
  /* stage 4 */
  (p.evidence || []).forEach(e => add({ id: 'ev-' + e.id, st: 4, q: e.label, help: 'evid', body: () => { const k = 'evid.' + e.id; return `${e.hint ? `<p class="hint">${esc(T(e.hint))}</p>` : ''}${e.sensitive ? note('Ask the client to send this to the council themselves. Do not send it here and do not type any figures from it.', 'stop', 'Sensitive:') : ''}<div class="gtwo">${mtx(k + '.holder', { label: 'Who will send it' })}${mtx(k + '.by', { label: 'By what date', type: 'date' })}</div>${mseg(k + '.status', [['asked', 'Asked for'], ['have', 'Has it'] ], get(k + '.status') || '', 'mbig2')}${srcHtml(e.src, e.checked)}`; }, done: () => !!gv('evid.' + e.id + '.holder') && !!gv('evid.' + e.id + '.by') }));
  add({ id: 'prep', st: 4, q: 'Anything else to have ready?', help: 'prep', info: true, body: () => { const items = prepItems().filter(i => /^(f-|t-)/.test(i.id)); return (items.length ? items.map(i => chk('prep.' + i.id, esc(i.label))).join('') : '<p class="hint">Nothing extra for what they picked.</p>'); }, done: () => true });
  /* stage 5 */
  add({ id: 'ddead', st: 5, q: 'What are the scheme dates?', info: true, body: () => { const dl = dateOf('deadline'), en = dateOf('end'); const rows = [dl, en].filter(Boolean).map(d => { const left = daysBetween(today(), D(d.value)); return `<div class="q"><div class="ql">${esc(d.label)}</div><div class="gdate">${esc(fmtDate(d.value))}</div><span class="hint">${left < 0 ? 'This date has passed.' : left + ' days from today.'}</span> ${srcHtml(d.src, d.checked)}</div>`; }).join('');
    return `${rows || '<p class="hint">Dates are not in the pack. Ask the council.</p>'}${gmFlagsHtml(gmFlags().filter(f => /^date-/.test(f.id) || f.id === 'claim'))}<p><a class="btn" href="${esc(p.sources.page.url)}" target="_blank" rel="noopener">Open the council grant page (needs the internet)</a></p><label class="chk gack"><input type="checkbox" data-k="gmeet.ack.dates" ${g.ack.dates ? 'checked' : ''}><span>I have checked these dates on the council page</span></label>`; }, done: () => g.ack.dates });
  add({ id: 'dplan', st: 5, q: 'When could the work start and finish?', body: () => `<div class="gtwo">${mtx('plan.build', { label: 'Weeks the build takes', ph: 'The number you quote' })}${mtx('plan.start', { label: 'Planned start date', type: 'date' })}${mtx('plan.submit', { label: 'Planned date to submit', type: 'date' })}${mtx('plan.decision', { label: 'Council decision time, weeks', ph: 'Empty until the council says' })}</div><div data-live="deadplan"></div>`, done: () => !!gv('plan.build') && !!gv('plan.submit') });
  add({ id: 'dnospend', st: 5, q: 'Nothing is started or paid until the grant is approved', info: true, body: () => `<div class="gout g-red" role="group"><b>The rule</b><span>${esc(T(p.preApproval && p.preApproval.text ? p.preApproval.text : 'Ask the funder whether spending before approval can be claimed'))}. ${esc(T(p.payment && p.payment.text ? p.payment.text : ''))}.</span></div><label class="chk gack"><input type="checkbox" data-k="gmeet.ack.nospend" ${g.ack.nospend ? 'checked' : ''}><span>I have told the client: nothing is ordered, started, paid or signed until the approval letter arrives</span></label>`, done: () => g.ack.nospend });
  (p.criteria || []).filter(c => GM_CRIT_STAGE[c.id] === 5).forEach(c => allPrompts(c).forEach(x => add({ id: 'c-' + c.id + '-' + x.id, st: 5, q: T(x.qq), help: x.id, unsureBtn: true, body: () => mta('crit.' + c.id + '.a.' + x.id, { label: c.label, rows: 3, ph: x.ph || 'In their words' }), done: () => !!gv('crit.' + c.id + '.a.' + x.id) })));
  add({ id: 'downers', st: 5, q: 'Who does what next?', body: () => `<div class="gtwo">${mta('owners.client', { label: 'The client will', rows: 3, ph: 'e.g. send the registration proof and latest accounts' })}${mta('owners.us', { label: SETTINGS.preparedBy + ' will', rows: 3, ph: 'e.g. send the quote, draft the answers' })}${mtx('dates.quoteSent', { label: 'When the quote is sent', type: 'date' })}${mtx('dates.submitted', { label: 'When the client submits the application', type: 'date' })}</div>`, done: () => !!gv('owners.client') && !!gv('owners.us') });
  add({ id: 'dreview', st: 5, q: 'Review what we have', info: true, body: gmReviewBody, done: () => g.reviewed });
  add({ id: 'send', st: 6, q: 'Send pack', info: true, body: gmSendBody, done: () => true });
  return out;
}
function gmQState(s) { const g = GM(); if (s.info) return 'info'; if (g.uns[s.id] || (s.unsure && s.unsure())) return 'unsure'; return s.done() ? 'answered' : 'open'; }
function gmStageState(k) { const qs = gmSteps().filter(s => s.st === k && !s.info); if (!qs.length) { const infos = gmSteps().filter(s => s.st === k); return k === 6 ? (GM().reviewed ? 'done' : 'open') : 'done'; } const st = qs.map(gmQState); if (st.every(x => x === 'open')) return 'open'; if (st.every(x => x !== 'open')) return 'done'; return 'part'; }
function gmProgress() { const qs = gmSteps().filter(s => !s.info); const d = qs.filter(s => gmQState(s) !== 'open').length; return { t: qs.length, d, pct: qs.length ? Math.round(d / qs.length * 100) : 0 }; }

/* ---------- cost lines: the price book, matched to the scheme list ---------- */
function gmLinesBody() {
  const p = gmP(), ids = new Set((p.eligibleCosts || []).map(c => c.id)), cats = costCats();
  const once = (S.pb || []).filter(x => x.freq === 'once' && x.tag !== 'not'), ongoing = (S.pb || []).filter(x => x.freq !== 'once' && x.tag !== 'not');
  const row = pb => { const i = S.quote2.lines.findIndex(l => l.plId === pb.id), on = i >= 0, l = on ? S.quote2.lines[i] : null, listed = ids.has(pb.cat);
    const pr = pb.price === '' ? 'no price in My prices yet' : fmt(num(pb.price)); const tag = listed ? 'On the council list: ' + cats[pb.cat].label : 'Not on the council list in the pack, ask the council';
    let det = ''; if (on) { const k = 'quote2.lines.' + i + '.'; const j = S.quote.lines.findIndex(x => x.gm === l.id);
      det = `<div class="gdet"><label class="mf"><span class="mfl">Quantity</span><input type="text" inputmode="decimal" data-k="${k}qty" value="${esc(l.qty)}"></label><label class="mf"><span class="mfl">Price £, this quote only</span><input type="text" inputmode="decimal" data-k="${k}price" value="${esc(l.price)}" placeholder="Price to enter"></label><label class="mf"><span class="mfl">Council category</span><select data-k="${k}cat">${catOptions(l.cat)}</select></label>${j >= 0 ? `<label class="chk"><input type="checkbox" data-k="quote.lines.${j}.pre" ${S.quote.lines[j].pre ? 'checked' : ''}><span>Already bought</span></label>` : ''}${(l.price === '' || l.price == null) ? '<p class="hint">No price yet. Enter it here for this quote, or set it in My prices. Do not guess one.</p>' : ''}</div>`; }
    return `<div class="gline ${on ? 'on' : ''}"><button type="button" class="gtog" aria-pressed="${on}" data-act="gline" data-id="${esc(pb.id)}"><b>${esc(plainTxt(pb.name))}</b><span>${esc(pr)}</span><i>${esc(tag)}</i></button>${det}</div>`; };
  const A = once.filter(x => ids.has(x.cat)), B = once.filter(x => !ids.has(x.cat));
  const hand = S.quote2.lines.filter(l => !l.plId && l.freq === 'once' && l.tag !== 'not');
  return `<p class="mlede">Tap an item to put it on the quote. Prices come from My prices. Nothing is made up.</p>
  <h2 class="mq3">Matches what the council pays for</h2><div class="glines">${A.map(row).join('') || '<p class="hint">Nothing in the price book matches yet.</p>'}</div>
  <h2 class="mq3">Not on the council list</h2><p class="hint">These show as ask the council and are not counted as claimable until the council says so.</p><div class="glines">${B.map(row).join('')}</div>
  ${hand.length ? `<h2 class="mq3">Other lines already on the quote</h2><ul>${hand.map(l => `<li>${esc(plainTxt(l.name || 'Item'))}, ${(l.price === '' || l.price == null) ? 'price to enter' : fmt(lineTot(l))}</li>`).join('')}</ul>` : ''}
  <p class="hint"><b>Ongoing costs are kept apart and never in the grant:</b> ${esc(ongoing.map(x => plainTxt(x.name)).join(', ') || 'none')}. They go on the Monthly costs screen.</p>
  <div data-live="gmcostflags"></div>`;
}
LIVE.gmcostflags = () => {
  if (!gmActive()) return ''; const c = calc(), p = gmP(), out = []; const cap = gmCap();
  if (c.capped) out.push(gmOut('red', 'Over the cap. The eligible lines come to ' + fmt(c.elig) + ' but the scheme pays no more than ' + fmt(c.max) + '. The grant stops at ' + fmt(c.max) + ' and the client pays ' + fmt(c.elig * (c.pct || 100) / 100 - c.max) + ' more. Do not pad, rename or prepay items to reach the cap.'));
  const t = turnoverCheck(); if (t) t.rows.forEach(r => { if (r.v && c.grant > r.lim) out.push(gmOut('red', 'The grant asked for (' + fmt(c.grant) + ') is more than ' + t.pct + '% of ' + r.n.toLowerCase() + ' (' + fmt(r.lim) + '). Lower the ask or ask the council which turnover counts.')); });
  if (!c.elig && S.quote.lines.length) out.push(gmOut('amber', 'Nothing on the quote is marked as covered by the council list yet.'));
  if (c.unsure > 0) out.push(gmOut('amber', fmt(c.unsure) + ' is on lines that are not on the council list or have no category. They are counted as not claimable until the council says. Ask the council.'));
  if (c.not > 0) out.push(gmOut('amber', fmt(c.not) + ' is on lines the grant will not pay for. The client pays these.'));
  const q2 = qCalc().elig; if (q2 && Math.abs(q2.elig - c.elig) > 0.5) out.push(gmOut('amber', 'The Grant costs screen (' + fmt(c.elig) + ') and the quote (' + fmt(q2.elig) + ') show different eligible totals. Someone edited a line by hand. Check both.'));
  if (S.quote2.lines.some(l => l.freq === 'once' && l.tag !== 'not' && (l.price === '' || l.price == null))) out.push(gmOut('amber', 'Some lines have no price yet. They add nothing until you enter one.'));
  if (!out.length && S.quote.lines.length) out.push(gmOut('green', 'Under the cap and no warnings. The grant is up to ' + fmt(c.grant) + ', if approved. It is not guaranteed.'));
  return out.join('');
};
LIVE.gmmax = () => { if (!gmActive()) return ''; const c = gmCap(); if (c.limit == null) return '<p class="hint">Enter a turnover figure to see the limit.</p>'; return gmOut('amber', 'Cautious maximum grant: ' + fmt(c.eff) + '. That is the lower of the scheme maximum (' + fmt(c.max) + ') and ' + gmP().turnoverCap.pct + '% of the lower turnover figure given (' + fmt(c.limit) + '). Which turnover the council counts is not clear, so confirm with the council.'); };
LIVE.gmsince = () => { if (!gmActive()) return ''; const n = gmMonths(); const m = /(\d+)\s*months/.exec(((gmP().eligibility || []).find(q => q.id === 'trading') || {}).q || ''); if (n == null) return ''; if (!m) return '<p class="hint">About ' + n + ' months.</p>'; return gmOut(n >= Number(m[1]) ? 'green' : 'red', 'About ' + n + ' months of trading. The rule asks for at least ' + m[1] + ' months.'); };
LIVE.gprog = () => { const p = gmProgress(); return `<span class="mpbar" aria-hidden="true"><i style="width:${p.pct}%"></i></span><span>${p.d} of ${p.t} questions answered</span>`; };
LIVE.gmann = () => { try { const g = GM(), st = gmSteps(), s = st[g.step]; if (!s) return ''; const o = document.querySelector('.gout'); const txt = 'Question ' + (g.step + 1) + ' of ' + st.length + ', ' + s.q + '. ' + (o ? o.textContent : ''); let n = document.getElementById('gmlive'); if (!n) { n = document.createElement('div'); n.id = 'gmlive'; n.className = 'gsr'; n.setAttribute('role', 'status'); n.setAttribute('aria-live', 'polite'); n.setAttribute('aria-atomic', 'true'); document.body.appendChild(n); } if (GM_RT.ann !== txt) { GM_RT.ann = txt; n.textContent = txt; } } catch (e) { } return ''; };

/* ---------- syncing into the existing Grant costs screen, never over a hand edit ---------- */
function gmSyncSet(path, value) { const g = GM(); const cur = String(get(path) || ''); const last = g.synced[path]; value = String(value || ''); if (!value) return false; if (cur === value) { g.synced[path] = value; return false; } if (cur && cur !== last) return false; set(path, value); g.synced[path] = value; return true; }
function gmSyncCosts() {
  const g = GM(), want = S.quote2.lines.filter(l => l.freq === 'once' && l.tag !== 'not'), q = S.quote.lines, ids = new Set(want.map(l => l.id));
  want.forEach(l => { const key = 'line:' + l.id, d = JSON.stringify({ d: plainTxt(l.name || 'Item'), c: l.cat || '', a: String(lineTot(l)) }); const cur = q.find(x => x.gm === l.id);
    if (!cur) { if (g.synced[key]) return; const o = JSON.parse(d); q.push({ id: uid(), gm: l.id, desc: o.d, cat: o.c, amt: o.a, pre: false }); g.synced[key] = d; return; }
    const now = JSON.stringify({ d: cur.desc, c: cur.cat || '', a: String(cur.amt) });
    if (now === d) { g.synced[key] = d; } else if (now === g.synced[key]) { const o = JSON.parse(d); cur.desc = o.d; cur.cat = o.c; cur.amt = o.a; g.synced[key] = d; } /* else: edited by hand, leave it */ });
  for (let i = q.length - 1; i >= 0; i--) { const x = q[i]; if (x.gm && !ids.has(x.gm)) { const now = JSON.stringify({ d: x.desc, c: x.cat || '', a: String(x.amt) }); if (now === g.synced['line:' + x.gm]) { q.splice(i, 1); delete g.synced['line:' + x.gm]; } } }
  const v = qCalc().vat; if (v > 0) gmSyncSet('quote.vat', String(Math.round(v * 100) / 100));
  gmSyncParking();
}
function gmSyncParking() {
  S.parking = S.parking || []; const want = []; const add = (key, text, who) => want.push({ key, text, who });
  S.quote2.lines.filter(l => l.freq === 'once' && l.tag !== 'not').forEach(l => { if (!l.cat || l.cat === 'unsure') add('gm-cat-' + l.id, 'Grant meeting: ask the council whether "' + plainTxt(l.name || 'Item') + '" can be claimed', 'funder'); if (l.price === '' || l.price == null) add('gm-price-' + l.id, 'Grant meeting: no price yet for "' + plainTxt(l.name || 'Item') + '"', 'us'); });
  if (gv('gmeet.p.extra')) add('gm-extra', 'Grant meeting: ask the council about items not on its list: ' + gv('gmeet.p.extra'), 'funder');
  const keys = new Set(want.map(w => w.key)); S.parking = S.parking.filter(x => !(String(x.key || '').startsWith('gm-') && !keys.has(x.key)));
  const have = new Set(S.parking.map(x => x.key)); want.forEach(w => { if (!have.has(w.key)) S.parking.push({ id: 'p-' + uid(), key: w.key, text: w.text, who: w.who, auto: true }); });
}

/* ---------- review and send pack ---------- */
function gmReviewBody() {
  const g = GM(), st = gmSteps(), e = gmElig(), c = calc();
  const rows = GM_STAGES.slice(0, 6).map((s, k) => { const qs = st.filter(x => x.st === k && !x.info); const open = qs.filter(x => gmQState(x) === 'open'); return `<section class="mrv"><div class="mrvh"><h2>${esc(s.n)}</h2><button type="button" class="btn sm2" data-act="ggo" data-i="${k}">Change</button></div><p>${qs.length - open.length} of ${qs.length} answered</p>${open.length ? '<ul>' + open.map(x => `<li><button type="button" class="btn sm2" data-act="gjump" data-id="${esc(x.id)}">Still open</button> ${esc(x.q)}</li>`).join('') + '</ul>' : '<p class="hint">Nothing outstanding</p>'}</section>`; }).join('');
  return `<p class="mlede">Here is everything. Read it together and change anything that is wrong.</p>${gmOut(e.lvl, e.lvl === 'red' ? 'Eligibility: probably not eligible on what you were told. Be honest with the client.' : e.lvl === 'amber' ? 'Eligibility: some answers are open or not sure.' : 'Eligibility: looks able to apply. Not a decision, not guaranteed.')}
  <div class="tot"><div><span>Eligible costs, ex VAT</span><span>${fmt(c.elig)}</span></div><div><span>Up to, if approved (cap ${fmt(c.max || 0)})</span><span class="big">${fmt(c.grant)}</span></div><div><span>The client pays up front</span><span>${fmt(c.paidUp)}</span></div><div><span>The client keeps paying</span><span>${fmt(c.keep)}</span></div></div>
  <div class="mrvgrid">${rows}</div><section class="mrv wide"><div class="mrvh"><h2>Check with the council</h2></div>${gmFlagsHtml(gmFlags())}</section>
  <label class="chk gack"><input type="checkbox" data-k="gmeet.reviewed" ${g.reviewed ? 'checked' : ''} data-full="1"><span>We have read this together and it is right</span></label>`;
}
/* one source for the HTML and the text of every part of the pack, so they cannot drift */
function gmDoc(title, secs) {
  const html = `<main><h1>${esc(title)}</h1>${secs.map(s => `<h2>${esc(s.h)}</h2>${(s.p || []).map(x => `<p>${esc(x)}</p>`).join('')}${(s.ul || []).length ? '<ul>' + s.ul.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>' : ''}${(s.rows || []).length ? '<table>' + s.rows.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('') + '</table>' : ''}`).join('')}</main>`;
  const text = title.toUpperCase() + '\n\n' + secs.map(s => s.h + '\n' + (s.p || []).join('\n') + ((s.ul || []).length ? '\n' + s.ul.map(x => '- ' + x).join('\n') : '') + ((s.rows || []).length ? '\n' + s.rows.map(r => r[0] + ': ' + r[1]).join('\n') : '')).join('\n\n');
  return { html, text };
}
const gmYN = v => ({ yes: 'Yes', no: 'No', unsure: 'Not sure' }[v] || 'Not answered');
function gmClientOpen() {
  const p = gmP(), o = [];
  (p.eligibility || []).forEach(q => { const a = S.elig[q.id], m = gmRuleMsg(q, a); if (a === 'unsure' || (m && m.lvl === 'red')) o.push('To confirm with the council: ' + T(q.q)); });
  S.quote2.lines.filter(l => l.freq === 'once' && l.tag !== 'not' && (!l.cat || l.cat === 'unsure')).forEach(l => o.push('To confirm with the council: whether "' + plainTxt(l.name || 'Item') + '" can be included'));
  if (p.turnoverCap) o.push('To confirm with the council: which turnover figure counts for the ' + p.turnoverCap.pct + '% limit');
  o.push('To confirm with the council: the current closing date and finish date');
  return o;
}
function gmNextList() {
  const p = gmP(), out = []; if (gv('owners.client')) gv('owners.client') && out.push('You: ' + gv('owners.client'));
  (p.evidence || []).forEach(e => { const v = S.evid[e.id] || {}; if (v.status === 'have') return; out.push((e.sensitive ? 'Send ' + e.label + ' to the council yourself, please do not send it to us' : 'Get ' + e.label + ' ready' + ((v.holder && v.holder !== SETTINGS.preparedBy) ? ', held by ' + v.holder : '') + (v.by ? ', by ' + fmtDate(v.by) : ''))); });
  if (gv('dates.submitted')) out.push('You submit the application on the council form by ' + fmtDate(S.dates.submitted)); else out.push('You submit the application on the council\'s own online form. We prepare the answers and submit nothing for you');
  out.push('Do not order, start, pay for or sign anything for the project until the approval letter arrives');
  out.push('If it is approved, you pay your suppliers first and then claim the grant back with the invoices and proof of payment');
  out.push('Check the council page for the current dates before you rely on them');
  if (gv('owners.us')) out.push(SETTINGS.preparedBy + ' will: ' + gv('owners.us')); if (gv('dates.quoteSent')) out.push('The quote is sent by ' + fmtDate(S.dates.quoteSent));
  return out;
}
function gmPackItems() {
  const p = gmP(), c = calc(), cats = costCats(), g = GM(), out = []; const types = S.client.types.map(t => (PROJECT_TYPES.find(x => x.id === t) || {}).label).filter(Boolean);
  const dl = dateOf('deadline'), en = dateOf('end'); const cap = gmCap();
  const sum = gmDoc('Grant meeting summary: ' + cl(), [
    { h: 'About this summary', p: ['This is a summary of what we agreed about an application to the ' + p.name + ', run by ' + p.funder + '. It is not an application, a contract or a promise. Funding is discretionary, so meeting the rules does not guarantee an award. Nothing is submitted for you.'] },
    { h: 'The business', rows: [['Name', S.client.business || ''], ['Contact', S.client.contact || ''], ['Email', S.client.email || ''], ['Phone', S.client.phone || ''], ['Address', [S.client.address, S.client.town].filter(Boolean).join(', ')], ['Trading since', gmMonthYear(g.b.since)], ['Legal form', (GM_LEGAL.find(x => x[0] === g.b.legal) || ['', ''])[1]]].filter(r => r[1]) },
    { h: 'What you told us about the rules', rows: (p.eligibility || []).map(q => [T(q.q), gmYN(S.elig[q.id])]) },
    { h: 'The project', p: [gv('quote.scope') || 'Scope to confirm.'], ul: types.concat(gv('gmeet.p.extra') ? ['Also asked about, not on the council list: ' + gv('gmeet.p.extra')] : []) },
    { h: 'The costs', rows: S.quote.lines.map(l => [(l.desc || 'Item') + ' (' + ((cats[l.cat] || {}).label || 'category to confirm') + (l.pre ? ', already bought, not claimable' : '') + ')', fmt(num(l.amt))]).concat([['Eligible costs, ex VAT', fmt(c.elig)], ['The most the grant could cover, if approved', fmt(c.grant)], ['You pay your suppliers up front', fmt(c.paidUp)], ['You keep paying', fmt(c.keep)], ['VAT, a separate line and not covered by the grant', fmt(c.vat)]]), p: ['The grant is up to ' + fmt(c.max || 0) + (p.award && p.award.percent ? ' and up to ' + p.award.percent + '% of eligible costs' : '') + ', and no more than ' + (p.turnoverCap ? p.turnoverCap.pct + '% of turnover' : 'the limit in the guidance') + '. It is not guaranteed.'] },
    { h: 'Dates', rows: [dl ? [dl.label, fmtDate(dl.value)] : null, en ? [en.label, fmtDate(en.value)] : null, S.plan.submit ? ['Planned date to submit', fmtDate(S.plan.submit)] : null].filter(Boolean), p: ['The council can change its dates. Check the council page before you rely on them.'] },
    { h: 'Nothing starts until it is approved', p: ['Do not order, start, pay for or sign anything for the project until the approval letter arrives. Anything bought earlier cannot be claimed.'] },
    { h: 'Still to confirm', ul: gmClientOpen() }]);
  out.push({ id: 'summary', title: 'What we agreed', note: 'The client summary.', html: sum.html, text: sum.text });
  const secs = [{ h: 'About these answers', p: ['These are draft answers you can paste into the council\'s online form. Check that every answer is true and matches your own records before you submit anything. Nothing is submitted for you.'] }].concat(critList().map(cr => ({ h: cr.label, p: [(draftText('crit:' + cr.id) || '').trim() || '[to fill: answer]'] })));
  const ga = gmDoc('Grant answers: ' + cl(), secs); out.push({ id: 'answers', title: 'Grant answers', note: 'Draft answers for the council form.', html: ga.html, text: ga.text });
  const ev = gmDoc('Evidence checklist: ' + cl(), [{ h: 'What to collect', rows: (p.evidence || []).map(e => { const v = S.evid[e.id] || {}; return [e.label, (e.sensitive ? 'Send to the council yourself. Please do not send it to us. ' : '') + (v.holder ? 'Held by ' + v.holder : 'Holder to confirm') + ', by ' + (v.by ? fmtDate(v.by) : 'date to confirm') + ', ' + ({ '': 'not started', asked: 'asked for', have: 'have it' }[v.status || ''])]; }) }, { h: 'After approval', ul: GEV.map(x => x[1]), p: ['Keep every item in one folder. Pay suppliers first, then claim back.'] }]);
  out.push({ id: 'evidence', title: 'Evidence checklist', note: 'What to send, who holds it, by when.', html: ev.html, text: ev.text });
  const d = qpData(); out.push({ id: 'quote', title: 'Itemised quote for the application', note: 'The existing quote page, on headed paper, without bank details.', html: '<style>' + qpCss + '</style>' + qpHtml(d, { nobank: true }), text: quoteText(qSnap()), raw: true });
  const st = gmDoc('Digital impact statement: ' + cl(), [{ h: 'Statement', p: draftText('gmimpact:statement').split(/\n\n+/).filter(Boolean) }]); out.push({ id: 'statement', title: 'Digital impact statement', note: 'In their own words, editable.', html: st.html, text: st.text });
  const nx = gmDoc('What you do next: ' + cl(), [{ h: 'Your list', ul: gmNextList() }]); out.push({ id: 'next', title: 'What you do next', note: 'The client\'s to do list.', html: nx.html, text: nx.text });
  return out;
}
/* internal record for Rhys: never part of the client pack or the client export */
function gmInternal() {
  const p = gmP(), g = GM(), e = gmElig(), c = calc();
  const secs = [{ h: 'INTERNAL, Rhys only. Never send this to the client.', p: ['Eligibility outcome: ' + GM_LVL[e.lvl] + '. ' + e.ok + ' of ' + e.total + ' rules met on the answers given.' + (e.lvl === 'red' ? ' Probably not eligible on what was said.' : '')] },
    { h: 'Eligibility reasoning', rows: (p.eligibility || []).map(q => { const a = S.elig[q.id], m = gmRuleMsg(q, a); return [T(q.q), gmYN(a) + (m ? '. ' + GM_LVL[m.lvl] + ': ' + m.text : '')]; }) },
    { h: 'My notes', ul: GM_STAGES.map((s, i) => g.notes['s' + i] ? s.n + ': ' + g.notes['s' + i] : '').filter(Boolean) },
    { h: 'Assumptions', ul: ['Rules, amounts and dates are from the workbook pack for ' + p.name + ', checked ' + fmtDate(p.award.checked) + ', not re-read from the council page in this meeting', 'Prices come from My prices at the time the line was added', 'Lines with no price add nothing: ' + (S.quote2.lines.filter(l => l.tag !== 'not' && l.freq === 'once' && (l.price === '' || l.price == null)).map(l => plainTxt(l.name)).join(', ') || 'none'), 'Cautious maximum grant on the turnover given: ' + fmt(gmCap().eff)] },
    { h: 'Flagged unknowns', ul: gmFlags().map(f => f.text).concat((p.unknowns || []).map(u => T(u.q) + ' (' + u.note + ')'), S.quote2.lines.filter(l => l.tag !== 'not' && l.freq === 'once' && (!l.cat || l.cat === 'unsure')).map(l => 'Not on the council list or no category: ' + plainTxt(l.name || 'Item')), gv('gmeet.p.extra') ? ['Asked about, not on the council list: ' + gv('gmeet.p.extra')] : []) },
    { h: 'Price and margin notes', ul: [g.notes.price || ''].concat(S.quote2.lines.map(l => l.note || ''), [S.docs.mynotes || '']).filter(x => String(x).trim()) },
    { h: 'Numbers', rows: [['Eligible costs, ex VAT', fmt(c.elig)], ['Grant, up to', fmt(c.grant)], ['Client pays up front', fmt(c.paidUp)], ['Client keeps paying', fmt(c.keep)], ['Not claimable', fmt(c.not)], ['Not sure, counted as not claimable', fmt(c.unsure)]] }];
  return gmDoc('Internal grant meeting record: ' + cl(), secs);
}
function gmLeaks(items) {
  const bad = [], hay = items.map(x => x.text).join('\n').toLowerCase(); const g = GM(); const secrets = Object.keys(g.notes).map(k => g.notes[k]).concat(S.quote2.lines.map(l => l.note), [S.docs.mynotes]).map(x => gclean(x)).filter(x => x.length >= 6);
  secrets.forEach(s => { if (hay.includes(s.toLowerCase())) bad.push(s); }); return bad;
}
function gmSendBody() {
  const items = gmPackItems(), leaks = gmLeaks(items);
  const cards = items.map(it => `<article class="gpack" data-pack="${it.id}"><div class="gph"><div><h3>${esc(it.title)}</h3><p class="hint">${esc(it.note)}</p></div><div class="row noprint"><button type="button" class="btn" data-act="gcopy" data-id="${it.id}">Copy</button><button type="button" class="btn" data-act="gprint" data-id="${it.id}">Print</button></div></div><details><summary>Preview the text</summary><pre class="gpre">${esc(it.text)}</pre></details></article>`).join('');
  const inn = gmInternal();
  return `<p class="mlede">Everything the client needs, built from the same answers. Each part has Copy and Print.</p>
  ${leaks.length ? `<div class="note stop"><b>Check before sending:</b> ${leaks.length} private note${leaks.length === 1 ? '' : 's'} appear in the client pack. Remove them.</div>` : ''}
  <div class="gnote">${gmFlagsHtml(gmFlags().filter(f => /^date-/.test(f.id)))}</div>
  <div class="mexp"><button class="btn pri" data-act="gcopyall">Copy the whole client pack</button><button class="btn" data-act="gprintall">Print the whole client pack</button><button class="btn" data-act="gdlclient">Download the client pack (HTML)</button><button class="btn" data-act="gexp" data-kind="client">Export client copy (JSON)</button></div>
  <h2 class="mq3 gh2">Client pack</h2>${cards}
  <section class="gint"><h2 class="mq3">Internal record, for Rhys only</h2><div class="note stop"><b>Never send this.</b> It holds eligibility reasoning, your notes, assumptions, flagged unknowns and price notes. It is not in the client pack or the client export.</div><div class="mexp"><button class="btn" data-act="gcopyint">Copy the internal record</button><button class="btn" data-act="gprintint">Print the internal record</button><button class="btn" data-act="gexp" data-kind="internal">Export internal record (JSON)</button><button class="btn pri" data-act="gbackup">Save backup of the whole project (file)</button></div><details><summary>Preview the internal record</summary><pre class="gpre">${esc(inn.text)}</pre></details></section>
  <div class="mnote2"><b>What saving does.</b> The meeting saves on this computer as you go. The backup file keeps everything, including your private notes, so keep it to yourself. Neither stores passwords.</div>`;
}

/* ---------- printing and files ---------- */
function gmCopy(text, btn) {
  const fb = () => { const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) { } ta.remove(); flash(btn); };
  try { Promise.resolve(copyText(text)).then(() => flash(btn), fb); } catch (e) { fb(); }
}
const gmcss = 'body{font:16px/1.6 "IBM Plex Sans",system-ui,Arial,sans-serif;color:#0b2a5b;margin:0}main{max-width:800px;margin:0 auto;padding:24px}h1{font:500 30px Georgia,serif;margin:0 0 8px}h2{font:500 20px Georgia,serif;margin:20px 0 6px;border-top:2px solid #0b2a5b;padding-top:8px}table{border-collapse:collapse;width:100%}td{border-top:1px solid #c4c9d2;padding:5px 8px 5px 0;vertical-align:top}td:last-child{text-align:right}li{margin:3px 0}';
function gmPrint(html, raw) {
  let a = document.getElementById('printArea'); if (!a) { a = document.createElement('div'); a.id = 'printArea'; document.body.appendChild(a); }
  a.innerHTML = (raw ? '' : '<style>' + gmcss + '</style>') + html; document.body.classList.add('mprinting');
  const done = () => { document.body.classList.remove('mprinting'); window.removeEventListener('afterprint', done); }; window.addEventListener('afterprint', done); setTimeout(() => window.print(), 50);
}
const gmFile = () => (S.client.business || 'client').replace(/[^\w ]/g, '').trim().replace(/\s+/g, ' ') || 'client';
function gmSnapshot() { return JSON.stringify(Object.assign({ app: 'client-workbook' }, S), (k, v) => (k === 'ui' || k === 'pb' || k === 'assets') ? undefined : (k === 'gmeet' && v ? Object.assign({}, v, { open: false }) : v)); }
function gmSaveLocal() {
  const g = GM(), l = meetLocalList(); const rec = { id: g.id, business: S.client.business || 'No name yet', updated: mnow(), test: !!g.test, pct: gmProgress().pct, kind: 'grant', json: gmSnapshot() };
  const i = l.findIndex(x => x.id === g.id); if (i >= 0) l[i] = rec; else l.unshift(rec); return meetLocalWrite(l.slice(0, 12));
}
function gmRecord(kind) {
  const g = JSON.parse(JSON.stringify(GM())); g.open = false; const fields = {}; GM_PATHS.forEach(pa => { const v = get(pa); if (v !== undefined) fields[pa] = JSON.parse(JSON.stringify(v)); });
  const drafts = {}; Object.keys(S.drafts || {}).forEach(k => { if (/^(gmimpact|crit):/.test(k)) drafts[k] = S.drafts[k]; });
  if (kind === 'client') { g.notes = {}; g.synced = {}; (fields['quote2.lines'] || []).forEach(l => { delete l.note; }); }
  const e = gmElig(), c = calc();
  return { app: 'rdh-grant-meeting-record', v: 1, kind, exportedAt: mnow(), programme: GM_PACK_ID, client: { business: S.client.business || '' }, practice: !!g.test, progress: gmProgress(), gmeet: g, fields, drafts, summary: { eligibility: GM_LVL[e.lvl], eligibleCosts: c.elig, grantUpTo: c.grant, clientPaysUpFront: c.paidUp }, note: 'A grant meeting record only. Not an application, a quote or a promise of an award.' + (kind === 'client' ? ' Client copy: private notes and price notes are left out.' : '') };
}
function gmImport() {
  const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json';
  i.onchange = () => { const f = i.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const o = JSON.parse(r.result); if (o.app !== 'rdh-grant-meeting-record' || !o.gmeet || !o.fields) throw new Error('That is not a grant meeting record. For a whole project backup use Open a saved project file.');
      if ((S.client.business || GM().started) && !confirm('This replaces the grant answers in the project you have open now (' + (S.client.business || 'no name') + ') with the imported record for "' + ((o.client || {}).business || 'unnamed') + '". Save a backup first if you want to keep the current one. Continue?')) return;
      S.client.modes.funding = true; S.client.packId = GM_PACK_ID; Object.keys(o.fields).forEach(pa => { if (GM_PATHS.includes(pa)) set(pa, o.fields[pa]); }); Object.keys(o.drafts || {}).forEach(k => { S.drafts[k] = o.drafts[k]; });
      S.gmeet = merge(gmBlank(), o.gmeet); S.gmeet.open = false; S.gmeet.id = uid() + uid(); ensurePackState(); save(); gmSaveLocal(); S.screen = 'meeting'; render(); alert('Imported the grant meeting record for ' + ((o.client || {}).business || 'the client') + '.');
    } catch (e) { alert(e.message || 'That file could not be read.'); } }; r.readAsText(f); };
  i.click();
}

/* ---------- the full screen meeting ---------- */
function gmShell() {
  const g = GM(), steps = gmSteps(); g.step = Math.max(0, Math.min(steps.length - 1, g.step)); const s = steps[g.step], i = s.st, last = g.step === steps.length - 1;
  const dots = GM_STAGES.map((x, k) => { const stt = gmStageState(k); return `<li><button type="button" class="mdot ${k === i ? 'cur' : ''} d-${stt}" data-act="ggo" data-i="${k}" ${k === i ? 'aria-current="step"' : ''} aria-label="Stage ${k + 1}: ${esc(x.n)}${stt === 'done' ? ', done' : stt === 'part' ? ', partly done' : ''}"><b>${k + 1}</b><span>${esc(x.n)}</span></button></li>`; }).join('');
  const q = gmQState(s); const blockNext = s.id === 'eresult' && gmElig().lvl === 'red' && !g.ack.stop;
  const state = s.info ? '' : `<span class="mstate s-${q}">${q === 'answered' ? 'Answered' : q === 'unsure' ? 'Not sure yet' : 'Not answered yet'}</span>`;
  const uns = s.unsureBtn ? `<button type="button" class="munsure ${g.uns[s.id] ? 'on' : ''}" aria-pressed="${!!g.uns[s.id]}" data-act="gunsure" data-id="${s.id}">${g.uns[s.id] ? 'Marked: not sure yet. Tap to undo' : "I'm not sure yet"}</button>` : '';
  return `<a class="skip" href="#gstep">Skip to the question</a>
  <div class="mshell gshell ${g.present ? 'present' : ''}">
   <header class="mh noprint"><div class="mhl"><div class="wm">${esc(SETTINGS.appName)}: grant meeting</div><div class="sm">${esc(S.client.business || 'New client')}${g.test ? ' <span class="chip">Practice, made-up client</span>' : ''}</div></div>
    <div class="mhr"><button class="btn" data-act="gpresent" aria-pressed="${g.present}">${g.present ? 'Show my prompts' : 'Hide my prompts'}</button><button class="btn pri" data-act="gsave">Save</button><button class="btn" data-act="gbackup">Save backup</button><button class="btn" data-act="gexit">Back to the workbook</button></div></header>
   <nav class="mnav gnav noprint" aria-label="Grant meeting stages"><ol>${dots}</ol><div class="mprog" data-live="gprog"></div></nav>
   <main class="mm" id="mmain"><h1 id="gstep" tabindex="-1" class="mt"><span class="mnum">Stage ${i + 1} of 7, ${esc(GM_STAGES[i].n)} (step ${g.step + 1} of ${steps.length})</span>${esc(s.q)}</h1>
    <section class="mq">${state}${gmHelp(s)}${s.body()}${uns}</section>${gnotes(i)}<i data-live="gmann" hidden></i></main>
   <footer class="mf2 noprint"><button class="btn mbig" data-act="gback" ${g.step === 0 ? 'disabled' : ''}>Back</button><span class="mflash" role="status" aria-live="polite">${esc(MEET_RT.flash)}</span><button class="btn mbig" data-act="gsave">Save</button>${last ? '<button class="btn pri mbig" data-act="gfinish">Finish and save</button>' : `<button class="btn pri mbig" data-act="gnext" ${blockNext ? 'disabled' : ''}>Next</button>`}</footer>
  </div>`;
}
function gmGo(n) {
  const g = GM(), steps = gmSteps(); const was = steps[g.step]; g.step = Math.max(0, Math.min(steps.length - 1, n)); g.updated = mnow();
  if (was && was.st === 3) gmSyncCosts(); save(); gmSaveLocal(); render(); window.scrollTo(0, 0); const h = document.querySelector('#gstep'); if (h) h.focus();
}
function gmStart(newClient, practice) { gmUse(practice); }
function gmNew() {
  const name = prompt('Client or business name. Leave blank to add it later.', ''); if (name === null) return;
  if (S.client.business || GM().started || (S.meet && S.meet.started)) { try { if (GM().started) gmSaveLocal(); else meetSaveLocal(); } catch (e) { } }
  const practice = confirm('Is this a practice run with a made-up client?\n\nOK = practice (labelled Practice, nothing is real)\nCancel = a real client');
  S = blank(); ensurePackState(); S.client.modes = { funding: true, website: false, seo: false }; S.client.packId = GM_PACK_ID; S.client.status = 'enquiry'; meetEnsure(); S.gmeet = gmBlank(); S.client.business = name.trim();
  gmUse(practice); S.gmeet.step = 0; try { localStorage.removeItem(KEY); localStorage.removeItem(ASKEY); } catch (e) { } gmSaveLocal(); save(); render(); window.scrollTo(0, 0);
}
function gmHubSection() {
  const g = GM(), here = gmActive(); const web = S.meet && S.meet.started;
  const grant = g.started ? `<div class="gcard"><b>Grant meeting in progress</b><span class="src">${esc(S.client.business || 'No name yet')}, ${gmProgress().d} of ${gmProgress().t} questions answered</span><div class="row"><button class="btn pri mbig" data-act="gresume">RESUME GRANT MEETING</button><button class="btn" data-act="gnew">Start a new grant client</button></div></div>`
    : (S.client.business ? `<div class="gcard"><b>${here ? 'This client already has the grant switched on' : 'Use the client you have open'}: ${esc(S.client.business)}</b><span class="src">The meeting writes into the existing grant screens for this client.</span><div class="row"><button class="btn pri mbig" data-act="guse">START GRANT MEETING WITH THIS CLIENT</button><button class="btn" data-act="gnew">Start a new grant client</button></div></div>`
      : `<div class="gcard"><b>New grant meeting</b><span class="src">Seven short stages, one question at a time</span><div class="row"><button class="btn pri mbig" data-act="gnew">START GRANT MEETING</button></div></div>`);
  return `<section class="sec" id="gkind"><h2><span class="n">0.5</span>What kind of meeting?</h2><div class="gchoices"><div class="gcard"><b>Website project</b><span class="src">Six stages about the website: what it does, how it looks, what it needs</span><div class="row">${web ? '<button class="btn pri" data-act="mresume">Resume the website meeting</button>' : '<button class="btn pri" data-act="mstartnew">Start a website meeting</button>'}</div></div>
   ${grant.replace('class="gcard"', 'class="gcard gwide"')}</div><p class="hint">Grant: East Dunbartonshire Digital Support Grant (${esc(gmP() ? gmP().name : 'pack missing')}). Funding is discretionary. This never promises an award.</p>
   <div class="mexp"><button class="btn" data-act="gexp" data-kind="internal">Export grant record, internal (JSON)</button><button class="btn" data-act="gexp" data-kind="client">Export grant record, client copy (JSON)</button><button class="btn" data-act="gimport">Import a grant record (JSON)</button></div></section>`;
}
function vGMeeting() {
  const g = GM();
  return `${head('Grant meeting', 'Go through the East Dunbartonshire grant with the client, one question at a time. Every answer goes into the grant screens in this workbook.', 'gmeeting')}${gmHubSection().replace('<h2><span class="n">0.5</span>What kind of meeting?</h2>', '<h2><span class="n">1.0</span>Start</h2>')}
  <section class="sec"><h2><span class="n">2.0</span>What happens</h2><ol><li>The business: name, contact, address, how long trading, legal form.</li><li>Can they get it: every rule from the pack, with a green, amber or red result.</li><li>The project and the digital impact statement.</li><li>Costs from your price book, matched to the council list.</li><li>Proof to collect.</li><li>Dates and next steps.</li><li>Send pack: copy or print what the client needs, and keep your internal record.</li></ol><p class="hint">${g.started ? 'A meeting is in progress for ' + esc(S.client.business || 'this client') + '.' : 'Nothing started yet.'}</p></section>`;
}

/* ---------- wiring into the existing meeting hub and banner ---------- */
const gmOldHub = vMeeting, gmOldBanner = meetBanner;
vMeeting = function () { const h = gmOldHub(); const m = '<section class="sec"><h2><span class="n">1.0</span>Start</h2>'; return h.indexOf(m) >= 0 ? h.replace(m, gmHubSection() + m.replace('1.0', '1.1').replace('>Start<', '>Start a website meeting<')) : h + gmHubSection(); };
meetBanner = function () { const b = gmOldBanner(); if (!gmActive()) return b; const g = GM(); return b + `<div class="gbanner noprint"><div><b>${g.started ? 'A grant meeting is in progress' : 'This client is on the grant path'}</b><span>${esc(S.client.business || 'No name yet')}. ${esc(gmP().funder)}.</span></div><button class="btn pri gbig" data-act="${g.started ? 'gresume' : 'guse'}">${g.started ? 'RESUME GRANT MEETING' : 'START GRANT MEETING'}</button></div>`; };

/* ---------- actions ---------- */
function gmOpenScreen(s) { const g = GM(); g.open = false; save(); gmSaveLocal(); S.screen = s; render(); window.scrollTo(0, 0); }
Object.assign(ACTS2, {
  gnew: () => gmNew(),
  guse: () => { if (!gmP()) { alert('The East Dunbartonshire pack is not in this workbook.'); return; } if (GM().started === '') { gmUse(false); } else gmUse(); GM().step = 0; gmSaveLocal(); save(); render(); window.scrollTo(0, 0); },
  gresume: () => { gmUse(); save(); render(); window.scrollTo(0, 0); },
  gexit: () => { const g = GM(); gmSyncCosts(); g.open = false; save(); gmSaveLocal(); S.screen = 'gmeeting'; render(); window.scrollTo(0, 0); },
  gopen: (t, d) => gmOpenScreen(d.s),
  gnext: () => gmGo(GM().step + 1), gback: () => gmGo(GM().step - 1),
  ggo: (t, d) => { const k = Number(d.i), st = gmSteps(); const j = st.findIndex(x => x.st === k); gmGo(j < 0 ? 0 : j); },
  gjump: (t, d) => { const st = gmSteps(); const j = st.findIndex(x => x.id === d.id); if (j >= 0) gmGo(j); },
  gsave: () => { const ok = gmSaveLocal(); save(); mflash(ok ? 'Saved on this computer ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + '. Use Save backup for a file.' : 'Could not save in the browser. Use Save backup now.'); },
  gbackup: () => { gmSaveLocal(); saveFile(); mflash('Backup file downloaded. Keep it somewhere safe.'); },
  gpresent: () => { const g = GM(); g.present = !g.present; save(); render(); },
  gunsure: (t, d) => { const g = GM(); g.uns[d.id] = !g.uns[d.id]; save(); render(); },
  gline: (t, d) => { const pb = S.pb.find(x => x.id === d.id); if (!pb) return; const i = S.quote2.lines.findIndex(l => l.plId === d.id);
    if (i >= 0) { S.quote2.lines.splice(i, 1); (S.quote2.dismiss = S.quote2.dismiss || []).push(d.id); } else { S.quote2.dismiss = (S.quote2.dismiss || []).filter(x => x !== d.id); S.quote2.lines.push(qSnapLine(pb)); }
    gmSyncCosts(); save(); render(); const b = document.querySelector('[data-act="gline"][data-id="' + d.id + '"]'); if (b) b.focus({ preventScroll: true }); },
  gfinish: () => { const g = GM(); gmSyncCosts(); g.status = 'saved'; g.savedAt = mnow(); g.updated = mnow(); g.open = false; save(); gmSaveLocal(); S.screen = 'gmeeting'; render(); window.scrollTo(0, 0); setTimeout(() => alert('Grant meeting saved. It is a record of the meeting, not an application. Funding is discretionary. Use Save backup to keep a file.'), 30); },
  gcopy: (t, d) => { const it = gmPackItems().find(x => x.id === d.id); if (it) gmCopy(it.text, t); },
  gprint: (t, d) => { const it = gmPackItems().find(x => x.id === d.id); if (it) gmPrint(it.html, it.raw); },
  gcopyall: t => gmCopy(gmPackItems().map(x => x.text).join('\n\n----------\n\n'), t),
  gprintall: () => gmPrint(gmPackItems().map(x => (x.raw ? '' : '') + x.html).join('<div style="break-after:page"></div>'), false),
  gcopyint: t => gmCopy(gmInternal().text, t),
  gprintint: () => gmPrint(gmInternal().html),
  gdlclient: () => meetDownload('Grant pack ' + gmFile() + '.html', '<!DOCTYPE html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Grant pack</title><style>' + gmcss + '</style></head><body>' + gmPackItems().map(x => x.html).join('<hr>') + '</body></html>', 'text/html'),
  gexp: (t, d) => { const k = d.kind === 'client' ? 'client' : 'internal'; meetDownload('Grant meeting record ' + (k === 'client' ? 'client copy ' : 'internal ') + gmFile() + '.json', JSON.stringify(gmRecord(k), null, 2)); },
  gimport: () => gmImport()
});
document.addEventListener('input', e => { const t = e.target; if (!t || !t.dataset || !S.gmeet || !S.gmeet.open) return; if (/^quote2\.lines\./.test(t.dataset.k || '')) { gmSyncCosts(); save(); live(); } });
window.addEventListener('beforeunload', () => { try { if (S.gmeet && S.gmeet.started) gmSaveLocal(); } catch (e) { } });
setInterval(() => { try { if (S.gmeet && S.gmeet.started && S.gmeet.open) gmSaveLocal(); } catch (e) { } }, 20000);

/* the statement is built only from their words, with a visible gap where something is missing */
BUILD.gmimpact = () => {
  const g = GM(), c = S.client, fill = l => '[to fill: ' + l + ']', one = (cid, pid, l) => sentence(ans(cid, pid)) || fill(l);
  const labels = (c.types || []).map(t => (PROJECT_TYPES.find(x => x.id === t) || {}).label).filter(Boolean).map(x => x.toLowerCase());
  const where = [cl(), c.town].filter(Boolean).join(', ') + (S.elig.area === 'yes' ? ', ' + (gmP() ? gmP().area : 'East Dunbartonshire') : '');
  const legal = (GM_LEGAL.find(x => x[0] === g.b.legal) || ['', ''])[1];
  const out = ['About us: ' + where + '.' + (g.b.since ? ' Trading since ' + gmMonthYear(g.b.since) + '.' : '') + (legal ? ' ' + legal + '.' : ''),
    'How we work today: ' + one('impact', 'now', 'how the business works today'), 'The problem or limit: ' + one('impact', 'limit', 'the problem or limit'),
    'What we want to fund: ' + (labels.length ? labels.join(', ') : fill('what the project is')) + '.' + ((c.types || []).map(t => ans('impact', 'x-' + t)).filter(Boolean).map(x => ' ' + sentence(x)).join('')),
    'What will be different once it is finished: ' + one('impact', 'after', 'what changes')];
  [['benefits', 'resil', 'How it makes us harder to knock over'], ['benefits', 'new', 'Something new for us or the area'], ['benefits', 'local', 'What the town gets']].forEach(a => { if (gclean(ans(a[0], a[1]))) out.push(a[2] + ': ' + sentence(ans(a[0], a[1]))); });
  return out.join('\n\n');
};
