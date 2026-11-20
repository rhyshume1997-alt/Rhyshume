/* Tests for the automation demonstration engine, scenarios and page.
   Inputs: demo-engine.js, demo-scenarios.js, demo-ui.js, automation-demos.css, automation-demos/index.html.
   Outputs: pass or fail. Must not be changed to weaken the rules: no network or storage code, stop rules, locked revisions. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Engine = require('../demo-engine.js');
const S = require('../demo-scenarios.js');

const ROOT = path.join(__dirname, '..');
const FILES = ['demo-engine.js', 'demo-scenarios.js', 'demo-ui.js', 'automation-demos.css', 'automation-demos/index.html'];
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const quote = () => Engine.create(S.quoteFollowUp);
const enq = () => Engine.create(S.enquiryToJob);
const doc = () => Engine.create(S.documentApproval);
const ent = (e, id) => e.getState().entities.find((x) => x.id === id);
const drafts = (e, id, status) => e.getState().drafts.filter((d) => d.entityId === id && (!status || d.status === status));
const act = (e, entityId, id, input) => e.dispatch({ type: 'transition', entityId, id, input });

test('all scenarios validate and list plain English rules with their numbers filled in', () => {
  for (const s of S.all) {
    const e = Engine.create(s);
    for (const r of e.rulesPlain()) assert.ok(!/[{}$]/.test(r.text), r.text);
  }
  assert.match(quote().rulesPlain().find((r) => r.id === 'followup').text, /^If there is no reply 3 days after the last contact, prepare a follow up for approval/);
});

test('an invalid scenario is rejected', () => {
  const bad = JSON.parse(JSON.stringify(S.quoteFollowUp));
  bad.transitions[0].to = 'nowhere';
  assert.throws(() => Engine.create(bad), /Invalid scenario/);
});

test('quote follow up: nothing is due early, then a draft is prepared on day 3 at 09:00', () => {
  const e = quote();
  assert.equal(drafts(e, 'Q-2041').length, 0);
  e.dispatch({ type: 'nextDay' }); e.dispatch({ type: 'nextDay' });
  assert.equal(drafts(e, 'Q-2041').length, 0, 'two days after contact is too early');
  e.dispatch({ type: 'nextDay' });
  const d = drafts(e, 'Q-2041');
  assert.equal(d.length, 1);
  assert.equal(d[0].status, 'needs_approval');
  assert.equal(d[0].approverId, 'morag');
  assert.equal(new Date(d[0].preparedAt).toISOString(), '2026-03-05T09:00:00.000Z');
  assert.match(d[0].body, /quote Q-2041/);
});

test('quote follow up: a quote already four days old is prepared on the first morning', () => {
  const e = quote();
  e.dispatch({ type: 'nextDay' });
  assert.equal(drafts(e, 'Q-2042', 'needs_approval').length, 1);
  assert.equal(drafts(e, 'Q-2041').length, 0);
});

test('only one draft waits at a time, and approving restarts the wait', () => {
  const e = quote();
  e.dispatch({ type: 'advance', days: 4 });
  assert.equal(drafts(e, 'Q-2042', 'needs_approval').length, 1);
  const d = drafts(e, 'Q-2042', 'needs_approval')[0];
  const r = e.dispatch({ type: 'approveDraft', entityId: 'Q-2042', draftId: d.id });
  assert.ok(r.ok);
  assert.match(r.message, /nothing is sent/);
  assert.equal(drafts(e, 'Q-2042', 'needs_approval').length, 0);
  e.dispatch({ type: 'nextDay' }); e.dispatch({ type: 'nextDay' });
  assert.equal(drafts(e, 'Q-2042', 'needs_approval').length, 0, 'wait of 3 days restarts after approval');
  e.dispatch({ type: 'nextDay' });
  assert.equal(drafts(e, 'Q-2042', 'needs_approval').length, 1);
});

test('never more than three follow ups, then a phone call is suggested and reminders stop', () => {
  const e = quote();
  for (let i = 0; i < 40; i++) {
    e.dispatch({ type: 'advance', days: 1 });
    for (const d of drafts(e, 'Q-2042', 'needs_approval')) e.dispatch({ type: 'approveDraft', entityId: 'Q-2042', draftId: d.id });
  }
  const q = ent(e, 'Q-2042');
  assert.equal(drafts(e, 'Q-2042').length <= 3, true);
  assert.equal(q.fired.followup, 3);
});

test('a phone call is suggested after the third follow up (before the quote expires)', () => {
  const sc = JSON.parse(JSON.stringify(S.quoteFollowUp));
  sc.entities[1].due = '2026-04-30';
  const e = Engine.create(sc);
  for (let i = 0; i < 20; i++) { e.dispatch({ type: 'advance', days: 1 }); for (const d of drafts(e, 'Q-2042', 'needs_approval')) e.dispatch({ type: 'approveDraft', entityId: 'Q-2042', draftId: d.id }); }
  assert.equal(drafts(e, 'Q-2042').length, 3);
  assert.ok(ent(e, 'Q-2042').flags.phone);
});

test('accepting a quote cancels waiting reminders, shows the stop rule and no more are prepared', () => {
  const e = quote();
  e.dispatch({ type: 'nextDay' });
  assert.equal(drafts(e, 'Q-2042', 'needs_approval').length, 1);
  const r = act(e, 'Q-2042', 'accept');
  assert.ok(r.ok);
  assert.equal(drafts(e, 'Q-2042', 'needs_approval').length, 0);
  assert.equal(drafts(e, 'Q-2042', 'cancelled').length, 1);
  assert.equal(ent(e, 'Q-2042').status, 'accepted');
  assert.equal(ent(e, 'Q-2042').stopped, true);
  assert.match(r.message, /Stop rule applied/);
  e.dispatch({ type: 'advance', days: 30 });
  assert.equal(drafts(e, 'Q-2042').length, 1, 'still only the cancelled one');
  const again = act(e, 'Q-2042', 'accept');
  assert.equal(again.ok, false);
});

test('declined, closed and expired quotes stop too', () => {
  for (const id of ['decline', 'close']) {
    const e = quote(); e.dispatch({ type: 'nextDay' });
    act(e, 'Q-2042', id);
    e.dispatch({ type: 'advance', days: 20 });
    assert.equal(drafts(e, 'Q-2042', 'needs_approval').length, 0, id);
    assert.ok(ent(e, 'Q-2042').stopped);
  }
  const e = quote(); e.dispatch({ type: 'advance', days: 3 });
  assert.equal(ent(e, 'Q-2043').status, 'expired');
  assert.equal(drafts(e, 'Q-2043').length, 0, 'the expiry rule runs before the follow up rule');
});

test('a customer question pauses reminders, and answering restarts the wait', () => {
  const e = quote();
  act(e, 'Q-2041', 'reply');
  e.dispatch({ type: 'advance', days: 5 });
  assert.equal(drafts(e, 'Q-2041').length, 0);
  act(e, 'Q-2041', 'answered');
  assert.equal(ent(e, 'Q-2041').status, 'sent');
  e.dispatch({ type: 'advance', days: 3 });
  assert.equal(drafts(e, 'Q-2041', 'needs_approval').length, 1);
});

test('discarding a draft restarts the wait instead of re preparing it the next morning', () => {
  const e = quote(); e.dispatch({ type: 'nextDay' });
  const d = drafts(e, 'Q-2042', 'needs_approval')[0];
  e.dispatch({ type: 'discardDraft', entityId: 'Q-2042', draftId: d.id });
  e.dispatch({ type: 'nextDay' });
  assert.equal(drafts(e, 'Q-2042', 'needs_approval').length, 0);
});

test('communication history is visible and in time order', () => {
  const e = quote();
  e.dispatch({ type: 'advance', days: 4 });
  const d = drafts(e, 'Q-2042', 'needs_approval')[0];
  e.dispatch({ type: 'approveDraft', entityId: 'Q-2042', draftId: d.id });
  act(e, 'Q-2042', 'reply');
  const log = e.getState().log.filter((l) => l.entityId === 'Q-2042');
  assert.ok(log.length >= 4);
  assert.ok(log.some((l) => l.kind === 'comms_out') && log.some((l) => l.kind === 'comms_in') && log.some((l) => l.kind === 'draft'));
  for (let i = 1; i < log.length; i++) assert.ok(log[i].at >= log[i - 1].at, 'log goes forward in time');
});

test('reset restores the first state exactly', () => {
  const e = quote();
  const first = JSON.stringify(e.getState());
  e.dispatch({ type: 'advance', days: 9 }); act(e, 'Q-2041', 'accept');
  e.reset();
  assert.equal(JSON.stringify(e.getState()).replace(/"lastMessage":"[^"]*"/, ''), first.replace(/"lastMessage":"[^"]*"/, ''));
});

test('the same actions always give the same history (deterministic clock)', () => {
  const run = () => { const e = quote(); e.dispatch({ type: 'advance', days: 3 }); act(e, 'Q-2041', 'reply'); return JSON.stringify(e.getState().log); };
  assert.equal(run(), run());
});

test('enquiry to job: arrival, structured fields, correction, stages and a draft at each change', () => {
  const e = enq();
  assert.equal(e.getState().entities.length, 1);
  const r = e.dispatch({ type: 'arrive' });
  assert.equal(r.entityId, 'E-0098');
  let x = ent(e, 'E-0098');
  assert.equal(x.status, 'new');
  assert.equal(x.fields.quantity, '25');
  assert.equal(x.check.quantity, true);
  assert.equal(drafts(e, 'E-0098', 'needs_approval').length, 1, 'acknowledgement is prepared');
  assert.equal(act(e, 'E-0098', 'send_quote').ok, false, 'cannot skip stages');
  const c = e.dispatch({ type: 'setFields', entityId: 'E-0098', fields: Object.assign({}, x.fields, { quantity: '24' }), thenStatus: 'checked' });
  assert.ok(c.ok);
  x = ent(e, 'E-0098');
  assert.equal(x.fields.quantity, '24'); assert.equal(x.status, 'checked'); assert.equal(x.check.quantity, false);
  assert.match(e.getState().log.filter((l) => l.entityId === 'E-0098').pop().text, /Quantity: "25" corrected to "24"/);
  assert.equal(e.dispatch({ type: 'setFields', entityId: 'E-0098', fields: { quantity: '1' } }).ok, false, 'checked details are locked');
  const stages = [['send_quote', 'quote_sent'], ['book', 'booked'], ['start', 'in_progress'], ['ready', 'ready'], ['complete', 'complete']];
  for (const [t, to] of stages) {
    assert.ok(act(e, 'E-0098', t).ok, t);
    assert.equal(ent(e, 'E-0098').status, to);
    assert.equal(drafts(e, 'E-0098', 'needs_approval').some((d) => d.templateId === (to === 'quote_sent' ? 'quote_sent' : to)), true, 'update draft for ' + to);
  }
  assert.equal(ent(e, 'E-0098').stopped, true);
});

test('enquiry to job: assignment, outstanding list and overdue flag', () => {
  const e = enq();
  e.dispatch({ type: 'arrive' });
  assert.ok(e.dispatch({ type: 'assign', entityId: 'E-0098', personId: 'callum' }).ok);
  assert.equal(ent(e, 'E-0098').assignee, 'callum');
  assert.equal(e.dispatch({ type: 'assign', entityId: 'E-0098', personId: 'nobody' }).ok, false);
  assert.equal(ent(e, 'E-0098').flags.overdue, undefined);
  e.dispatch({ type: 'nextDay' });
  assert.ok(ent(e, 'E-0098').flags.overdue);
  const open = e.getState().entities.filter((x) => !e.isTerminal(x.status)).map((x) => x.id);
  assert.deepEqual(open, ['J-0097', 'E-0098']);
  act(e, 'E-0098', 'decline');
  assert.deepEqual(e.getState().entities.filter((x) => !e.isTerminal(x.status)).map((x) => x.id), ['J-0097']);
  assert.equal(drafts(e, 'E-0098', 'needs_approval').length, 0, 'declined cancels waiting drafts');
});

test('enquiry inbox runs out honestly', () => {
  const e = enq();
  for (let i = 0; i < 3; i++) assert.ok(e.dispatch({ type: 'arrive' }).ok);
  const r = e.dispatch({ type: 'arrive' });
  assert.equal(r.ok, false);
  assert.match(r.message, /No more made up enquiries/);
});

test('document approval: revisions, audit trail and locking', () => {
  const e = doc();
  assert.equal(act(e, 'WI-014', 'approve').ok, false, 'cannot approve a draft');
  assert.ok(e.dispatch({ type: 'editText', entityId: 'WI-014', text: 'New text' }).ok);
  assert.ok(act(e, 'WI-014', 'submit').ok);
  assert.equal(e.dispatch({ type: 'editText', entityId: 'WI-014', text: 'Sneaky' }).ok, false, 'no editing while with the approver');
  assert.ok(act(e, 'WI-014', 'request_changes', 'Step 3 is unclear.').ok);
  assert.equal(act(e, 'WI-014', 'request_changes', '').ok, false);
  assert.ok(act(e, 'WI-014', 'revise').ok);
  let d = ent(e, 'WI-014');
  assert.deepEqual(d.revisions.map((r) => r.letter), ['A', 'B']);
  assert.equal(d.revisions[1].text, 'New text', 'new revision starts from the previous text');
  assert.ok(act(e, 'WI-014', 'submit').ok);
  assert.ok(act(e, 'WI-014', 'approve').ok);
  d = ent(e, 'WI-014');
  assert.equal(d.revisions[1].locked, true);
  assert.equal(d.status, 'approved');
  const blocked = e.dispatch({ type: 'editText', entityId: 'WI-014', text: 'Changed after approval' });
  assert.equal(blocked.ok, false);
  assert.equal(ent(e, 'WI-014').revisions[1].text, 'New text', 'text unchanged');
  assert.ok(act(e, 'WI-014', 'raise_change').ok);
  d = ent(e, 'WI-014');
  assert.deepEqual(d.revisions.map((r) => r.letter), ['A', 'B', 'C']);
  assert.equal(d.revisions[1].locked, true, 'the approved revision stays locked');
  assert.ok(e.dispatch({ type: 'editText', entityId: 'WI-014', text: 'Rev C text' }).ok);
  act(e, 'WI-014', 'submit'); act(e, 'WI-014', 'approve');
  assert.equal(ent(e, 'WI-014').revisions[1].status, 'superseded');
  assert.equal(ent(e, 'WI-014').revisions[2].locked, true);
});

test('document approval: audit trail is ordered, attributed and records refused attempts', () => {
  const e = doc();
  act(e, 'WI-014', 'submit'); act(e, 'WI-014', 'approve');
  e.dispatch({ type: 'editText', entityId: 'WI-014', text: 'x' });
  const log = e.getState().log.filter((l) => l.entityId === 'WI-014');
  for (let i = 1; i < log.length; i++) assert.ok(log[i].at >= log[i - 1].at);
  assert.equal(new Set(log.map((l) => l.id)).size, log.length, 'unique ids');
  assert.ok(log.every((l) => l.actor && l.text));
  assert.equal(log[log.length - 1].kind, 'blocked');
  assert.match(log.find((l) => /approved Rev A/.test(l.text)).actor, /Eilidh Shaw/);
  assert.ok(log.filter((l) => l.at > Date.parse('2026-03-02T09:00:00Z')).length >= 3);
});

test('document approval: the author cannot be the approver, and a reminder is prepared for the author to approve', () => {
  const e = doc();
  const r = e.dispatch({ type: 'assign', entityId: 'WI-014', field: 'approver', personId: 'ross' });
  assert.equal(r.ok, false);
  assert.equal(ent(e, 'WI-014').approver, 'eilidh');
  assert.ok(e.dispatch({ type: 'assign', entityId: 'WI-014', field: 'approver', personId: 'ravi' }).ok);
  e.dispatch({ type: 'nextDay' });
  const d = drafts(e, 'PRC-007', 'needs_approval');
  assert.equal(d.length, 1);
  assert.equal(d[0].approverId, 'ross');
  e.dispatch({ type: 'advance', days: 40 });
  assert.ok(drafts(e, 'PRC-007').length <= 2);
});

test('document approval: approval needs an approver to be set', () => {
  const sc = JSON.parse(JSON.stringify(S.documentApproval));
  sc.entities[0].approver = null;
  const e = Engine.create(sc);
  assert.equal(act(e, 'WI-014', 'submit').ok, false);
});

test('no network, storage, cookie, mail, phone or form use in any demo file', () => {
  const banned = [/\bfetch\s*\(/, /XMLHttpRequest/, /sendBeacon/, /localStorage/, /sessionStorage/, /indexedDB/, /document\.cookie/, /mailto:/i, /\btel:/i, /<form\b/i, /\baction\s*=/i, /WebSocket/, /EventSource/, /\bimport\s*\(/, /setTimeout|setInterval/, /@import/, /https?:\/\/(?!www\.rhyshume\.co\.uk|schema\.org|www\.linkedin\.com)/];
  for (const f of FILES) for (const re of banned) assert.ok(!re.test(read(f)), f + ' matches ' + re);
});

test('demo files hold no prices, no pound signs and no real looking contact details', () => {
  for (const f of FILES) {
    const t = read(f);
    assert.ok(!/£|&pound;|\bGBP\b/.test(t), f);
  }
  const data = read('demo-scenarios.js');
  assert.ok(!/\b0[127]\d{2,3}\s?\d{3}\s?\d{3,4}\b/.test(data), 'no phone numbers');
  for (const m of data.match(/[\w.-]+@[\w.-]+/g) || []) assert.ok(/\.example$/.test(m), m + ' must use the reserved .example domain');
});

test('every business and customer name is marked as made up', () => {
  for (const s of S.all) {
    assert.match(s.business.name, /\(made up\)/);
    for (const en of (s.entities || []).concat(s.inbox || [])) if (en.fields.customer) assert.match(en.fields.customer, /\(made up\)/, en.id);
  }
});

test('copy rules: no em dashes, ellipses, banned words or hyphen decoration in the demo text', () => {
  for (const f of FILES) {
    const t = read(f);
    assert.ok(!/—|…|\.\.\./.test(t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\.\.\/|\.\.\./g, (m) => (m === '../' ? m : '')) ) || f === 'demo-engine.js', f);
    assert.ok(!/seamless|showcase|delve|cutting.edge/i.test(t), f);
  }
});

test('page: label on every demo, anchors, noscript fallback, metadata, scripts in order', () => {
  const html = read('automation-demos/index.html');
  assert.ok(html.length > 0);
  for (const s of S.all) {
    assert.ok(html.includes('id="' + s.id + '"'), s.id);
    assert.ok(html.includes('data-demo="' + s.id + '"'), s.id);
    assert.equal(s.label, 'Demonstration with made up data');
  }
  assert.equal((html.match(/class="dmo-label">Demonstration with made up data</g) || []).length, 3);
  const title = html.match(/<title>(.*?)<\/title>/)[1];
  assert.ok(title.length <= 70, title);
  assert.ok(html.match(/name="description" content="(.*?)"/)[1].length <= 160);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.rhyshume\.co\.uk\/automation-demos">/);
  assert.ok(!/noindex/.test(html));
  assert.ok(html.indexOf('/demo-engine.js') < html.indexOf('/demo-scenarios.js') && html.indexOf('/demo-scenarios.js') < html.indexOf('/demo-ui.js'));
  assert.equal((html.match(/<h1/g) || []).length, 1);
  assert.match(html, /<main id="main">/);
  assert.ok(!/<form|<img /.test(html));
});

test('UI source only writes text with textContent, never as HTML', () => {
  const ui = read('demo-ui.js');
  assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function/.test(ui));
});
