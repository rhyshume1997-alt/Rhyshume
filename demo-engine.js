/* Automation demonstration engine (WP-C).
   Inputs:  a JSON scenario (see demo-scenarios.js): people, statuses, fields, templates, rules, transitions, entities, inbox, clock.
   Outputs: create(scenario) returns { getState, dispatch, reset, subscribe, rulesPlain, available, ... }. dispatch(action) returns
            { ok, message, entityId } and never throws for a refused action: the refusal is written to the audit trail.
   A small state machine plus a daily rules engine over a deterministic demo clock. The clock only moves when the visitor moves it
   (or by a fixed number of minutes per action), so the same actions always give the same timestamps.
   Must not be changed: no network, storage, cookie, mail or timer use here (tests read this file). Every outgoing message is a
   draft that needs a named person to approve it, and "approving" only writes a line in the history. Nothing is ever sent.
   UMD: works as a browser global (DemoEngine) and in Node (require). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DemoEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DAY = 86400000;
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dayNumber(ms) { return Math.floor(ms / DAY); }
  /* Always UTC, so a visitor's own time zone can never change what the demonstration shows. */
  function fmtDate(ms) { var d = new Date(ms); return DAYS[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()]; }
  function fmtTime(ms) { var d = new Date(ms); return pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()); }
  function fmtStamp(ms) { return fmtDate(ms) + ', ' + fmtTime(ms); }
  function fmtFull(ms) { return fmtDate(ms) + ' ' + new Date(ms).getUTCFullYear() + ', ' + fmtTime(ms); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function letter(i) { return String.fromCharCode(65 + i); }

  /* Fills {name} placeholders from a params object. Unknown names are left visible so a typo shows up in tests. */
  function fill(text, vars) {
    return String(text == null ? '' : text).replace(/\{\{?\s*([a-zA-Z0-9_.]+)\s*\}?\}/g, function (m, k) {
      return Object.prototype.hasOwnProperty.call(vars, k) && vars[k] != null ? String(vars[k]) : m;
    });
  }

  function validate(sc) {
    var errs = [];
    function need(c, m) { if (!c) errs.push(m); }
    need(sc && sc.id, 'scenario id');
    need(sc.clock && !isNaN(Date.parse(sc.clock.start)), 'clock.start');
    need(Array.isArray(sc.statuses) && sc.statuses.length, 'statuses');
    var known = {}; (sc.statuses || []).forEach(function (s) { known[s.id] = true; });
    (sc.transitions || []).forEach(function (t) {
      need(t.id && t.label, 'transition id and label');
      (t.from || []).forEach(function (s) { need(known[s], 'transition ' + t.id + ' from unknown status ' + s); });
      if (t.to) need(known[t.to], 'transition ' + t.id + ' to unknown status ' + t.to);
    });
    (sc.rules || []).forEach(function (r) {
      need(r.id && r.plain, 'rule id and plain text');
      need(r.trigger === 'tick' || r.trigger === 'status', 'rule ' + r.id + ' trigger');
      (r.then || []).forEach(function (a) {
        if (a.do === 'prepare') {
          var ids = a.template ? [a.template] : a.templateByCount ? a.templateByCount : a.templateByStatus ? Object.keys(a.templateByStatus).map(function (k) { return a.templateByStatus[k]; }) : [];
          need(ids.length && ids.every(function (t) { return sc.templates && sc.templates[t]; }), 'rule ' + r.id + ' template');
        }
        if (a.do === 'setStatus') need(known[a.status], 'rule ' + r.id + ' status ' + a.status);
      });
    });
    if (errs.length) throw new Error('Invalid scenario: ' + errs.join('; '));
  }

  function create(scenario) {
    var sc = clone(scenario);
    validate(sc);
    var statusById = {}; sc.statuses.forEach(function (s) { statusById[s.id] = s; });
    var personById = {}; (sc.people || []).forEach(function (p) { personById[p.id] = p; });
    var st, listeners = [];

    /* ---------- helpers over state ---------- */
    function isTerminal(status) { return !!(statusById[status] && statusById[status].terminal); }
    function entity(id) { for (var i = 0; i < st.entities.length; i++) if (st.entities[i].id === id) return st.entities[i]; return null; }
    function personName(id) { return personById[id] ? personById[id].name : (id || ''); }
    function personLine(id) { var p = personById[id]; return p ? p.name + ' (' + p.role + ')' : (id || ''); }
    function nextId(prefix) { st.seq += 1; return prefix + st.seq; }
    function latest(e) { return e.revisions && e.revisions.length ? e.revisions[e.revisions.length - 1] : null; }
    function actorName(e, actor) {
      if (actor === 'author') return personName(e.author);
      if (actor === 'approver') return personName(e.approver);
      if (actor === 'customer') return (e.fields && (e.fields.contact || e.fields.customer)) || 'The customer';
      if (actor === 'system') return 'Automation rules';
      return sc.userName || 'You';
    }
    function logEntry(e, o) {
      var entry = { id: nextId('L'), at: o.at == null ? st.clock : o.at, entityId: e ? e.id : null, kind: o.kind || 'system', actor: o.actor || 'Automation rules', text: o.text };
      st.log.push(entry);
      if (!o.seed) st.fresh.push(entry);
      return entry;
    }
    function vars(e, extra) {
      var v = { ref: e.id, title: e.title || '', signoff: (sc.business && sc.business.signoff) || '', business: (sc.business && sc.business.name) || '',
        assignee: personName(e.assignee), approver: personName(e.approver), author: personName(e.author), status: (statusById[e.status] || {}).label || e.status,
        due: e.due ? fmtDate(Date.parse(e.due)) : '', rev: latest(e) ? latest(e).letter : '' };
      Object.keys(e.fields || {}).forEach(function (k) { v[k] = e.fields[k]; });
      Object.keys(extra || {}).forEach(function (k) { v[k] = extra[k]; });
      return v;
    }

    /* ---------- drafts (prepared messages that need a person) ---------- */
    function approverOf(e, who) {
      if (who === 'entity.approver') return e.approver;
      if (who === 'entity.author') return e.author;
      if (who === 'entity.assignee') return e.assignee || sc.ownerId;
      if (who === 'owner') return sc.ownerId;
      return who || sc.ownerId;
    }
    function prepareDraft(e, rule, action, status) {
      var tid = action.template || (action.templateByStatus && action.templateByStatus[status]) ||
        (action.templateByCount && action.templateByCount[Math.min(e.fired[rule.id] || 0, action.templateByCount.length - 1)]);
      if (!tid) return null;
      var t = sc.templates[tid];
      var v = vars(e, { count: (e.fired[rule.id] || 0) + 1 });
      var d = { id: nextId('D'), entityId: e.id, ruleId: rule.id, templateId: tid, channel: t.channel || 'email',
        to: fill(t.to || '{contact}', v), subject: fill(t.subject, v), body: fill(t.body, v), approverId: approverOf(e, action.approver),
        status: 'needs_approval', preparedAt: st.clock, decidedAt: null };
      st.drafts.push(d);
      logEntry(e, { kind: 'draft', actor: 'Automation rules', text: 'Prepared a draft: "' + d.subject + '". It needs approval from ' + personName(d.approverId) + ' before anything is sent.' });
      return d;
    }
    function pendingDrafts(e) { return st.drafts.filter(function (d) { return d.entityId === e.id && d.status === 'needs_approval'; }); }
    function cancelPending(e, why) {
      var p = pendingDrafts(e);
      p.forEach(function (d) { d.status = 'cancelled'; d.decidedAt = st.clock; });
      if (p.length) logEntry(e, { kind: 'system', text: 'Cancelled ' + plural(p.length, 'prepared draft', 'prepared drafts') + ' (' + why + ').' });
      return p.length;
    }

    /* ---------- rules ---------- */
    function pv(v, rule) { return typeof v === 'string' && v.charAt(0) === '$' ? (rule.params || {})[v.slice(1)] : v; }
    function matches(rule, e, status) {
      var w = rule.when || {};
      if (w.types && w.types.indexOf(e.type) < 0) return false;
      if (w.status && w.status.indexOf(status || e.status) < 0) return false;
      if (w.dueReached && !(e.due && dayNumber(st.clock) > dayNumber(Date.parse(e.due)))) return false;
      if (w.daysSince) {
        var ref = e[w.daysSince.ref]; if (!ref) return false;
        if (dayNumber(st.clock) - dayNumber(ref) < pv(w.daysSince.gte, rule)) return false;
      }
      if (w.firedLessThan != null && (e.fired[rule.id] || 0) >= pv(w.firedLessThan, rule)) return false;
      if (w.firedAtLeast && (e.fired[w.firedAtLeast.rule] || 0) < pv(w.firedAtLeast.n, rule)) return false;
      if (w.noPendingDraft && pendingDrafts(e).length) return false;
      if (w.flagNot && e.flags[w.flagNot]) return false;
      return true;
    }
    function applyRule(rule, e, status) {
      var did = false;
      (rule.then || []).forEach(function (a) {
        if (a.do === 'prepare') { if (prepareDraft(e, rule, a, status)) did = true; }
        else if (a.do === 'flag') { e.flags[a.flag] = fill(a.text, vars(e)); did = true; logEntry(e, { kind: 'system', text: fill(a.text, vars(e)) }); }
        else if (a.do === 'setStatus') { did = true; logEntry(e, { kind: 'system', text: fill(a.text || 'Status changed to {status}.', { status: statusById[a.status].label }) }); enterStatus(e, a.status, true); }
        else if (a.do === 'log') { did = true; logEntry(e, { kind: 'system', text: fill(a.text, vars(e)) }); }
      });
      if (did) e.fired[rule.id] = (e.fired[rule.id] || 0) + 1;
    }
    function runTick() {
      sc.rules.forEach(function (rule) {
        if (rule.trigger !== 'tick') return;
        st.entities.forEach(function (e) {
          if (isTerminal(e.status)) return;
          if (matches(rule, e)) applyRule(rule, e);
        });
      });
    }
    function enterStatus(e, status, bySystem) {
      e.status = status; e.statusAt = st.clock;
      if (isTerminal(status)) {
        e.stopped = true;
        var n = cancelPending(e, 'this ' + (sc.noun || 'item') + ' is now ' + statusById[status].label.toLowerCase());
        e.stoppedNote = n;
        if (statusById[status].stopText) logEntry(e, { kind: 'system', text: fill(statusById[status].stopText, vars(e, { cancelled: n })) });
      }
      sc.rules.forEach(function (rule) {
        if (rule.trigger !== 'status') return;
        if (matches(rule, e, status)) applyRule(rule, e, status);
      });
    }

    /* ---------- clock ---------- */
    function nextMoment(from) {
      var d = new Date(from), t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), sc.clock.ruleHour == null ? 9 : sc.clock.ruleHour, 0, 0);
      while (t <= from) t += DAY;
      return t;
    }
    /* Moves the clock forward. Every morning check that falls inside the jump is run in order, each at its own time. */
    function advanceTo(target) {
      if (target <= st.clock) return;
      var t = nextMoment(st.clock);
      while (t <= target) { st.clock = t; runTick(); t += DAY; }
      st.clock = target;
    }
    function bump() { advanceTo(st.clock + (sc.clock.stepMinutes == null ? 7 : sc.clock.stepMinutes) * 60000); }

    /* ---------- state ---------- */
    function makeEntity(src, seed) {
      var e = { id: src.id, type: src.type || 'item', title: src.title, status: src.status, statusAt: Date.parse(src.statusAt || src.createdAt || sc.clock.start),
        createdAt: Date.parse(src.createdAt || sc.clock.start), lastContactAt: src.lastContactAt ? Date.parse(src.lastContactAt) : null,
        touchedAt: Date.parse(src.touchedAt || src.lastContactAt || src.createdAt || sc.clock.start), due: src.due || null, fields: clone(src.fields || {}),
        check: clone(src.check || {}), source: src.source || null, raw: src.raw || null, assignee: src.assignee || null, author: src.author || null, approver: src.approver || null,
        flags: {}, fired: {}, stopped: false, stoppedNote: 0, confirmed: !!src.confirmed };
      if (src.revisions) e.revisions = src.revisions.map(function (r) { return { letter: r.letter, text: r.text, status: r.status, createdAt: Date.parse(r.createdAt), createdBy: r.createdBy, summary: r.summary || '', decidedAt: r.decidedAt ? Date.parse(r.decidedAt) : null, decidedBy: r.decidedBy || null, comment: r.comment || '', locked: !!r.locked }; });
      if (seed && isTerminal(e.status)) e.stopped = true;
      return e;
    }
    function init() {
      st = { clock: Date.parse(sc.clock.start), seq: 0, entities: [], log: [], drafts: [], inboxIndex: 0, fresh: [], lastMessage: '' };
      var seeded = [];
      (sc.entities || []).forEach(function (src) {
        st.entities.push(makeEntity(src, true));
        (src.history || []).forEach(function (h) { seeded.push({ entityId: src.id, at: Date.parse(h.at), kind: h.kind || 'system', actor: h.actor, text: h.text }); });
      });
      seeded.sort(function (a, b) { return a.at - b.at; });
      seeded.forEach(function (h) { logEntry(entity(h.entityId), { at: h.at, kind: h.kind, actor: h.actor, text: h.text, seed: true }); });
      st.fresh = [];
    }
    function snapshot() { return clone(st); }
    function emit(message, entityId, ok) {
      st.lastMessage = message;
      var out = { ok: ok !== false, message: message, entityId: entityId || null };
      listeners.forEach(function (fn) { fn(snapshot(), out); });
      return out;
    }
    function summary() {
      var parts = st.fresh.map(function (l) { return (l.entityId ? l.entityId + ': ' : '') + l.text; });
      st.fresh = [];
      return parts.join(' ');
    }
    /* A clock jump can touch several items at once, so it is announced in one short sentence. The detail is in the history. */
    function clockSummary() {
      var drafts = st.fresh.filter(function (l) { return l.kind === 'draft'; }).length, other = st.fresh.length - drafts;
      st.fresh = [];
      var m = 'Clock moved to ' + fmtStamp(st.clock) + '.';
      if (drafts) m += ' ' + plural(drafts, 'new draft is', 'new drafts are') + ' waiting for approval.';
      if (other) m += ' ' + plural(other, 'other change is', 'other changes are') + ' in the history.';
      if (!drafts && !other) m += ' Nothing was due.';
      return m;
    }
    function refuse(e, actor, text) {
      logEntry(e, { kind: 'blocked', actor: actor, text: text });
      st.fresh = [];
      return emit(text, e ? e.id : null, false);
    }

    /* ---------- the actions a visitor can take ---------- */
    function dispatch(a) {
      var e = a.entityId ? entity(a.entityId) : null;
      if (a.type === 'advance') {
        var days = Number(a.days || 0);
        if (!(days > 0)) return emit('Nothing to skip.', null, false);
        advanceTo(st.clock + days * DAY);
        return emit(clockSummary(), null);
      }
      if (a.type === 'nextDay') {
        advanceTo(nextMoment(st.clock));
        return emit(clockSummary(), null);
      }
      if (a.type === 'arrive') {
        var src = (sc.inbox || [])[st.inboxIndex];
        if (!src) return emit('No more made up enquiries in this demonstration. Press Reset to start again.', null, false);
        st.inboxIndex += 1; bump();
        var ne = makeEntity({ id: src.id, type: 'enquiry', title: src.title, status: sc.initialStatus || 'new', createdAt: new Date(st.clock).toISOString(), fields: src.fields, check: src.check, source: src.source, raw: src.raw }, false);
        ne.statusAt = st.clock; ne.touchedAt = st.clock; ne.lastContactAt = null;
        st.entities.push(ne);
        logEntry(ne, { kind: 'comms_in', actor: ne.fields.contact || 'Customer', text: 'Enquiry received by ' + src.source + '. Details were read into fields, not yet checked by a person.' });
        enterStatus(ne, ne.status);
        return emit(summary('New enquiry ' + ne.id + ' arrived by ' + src.source + '.'), ne.id);
      }
      if (!e) return emit('Choose an item first.', null, false);

      if (a.type === 'transition') {
        var tr = (sc.transitions || []).filter(function (t) { return t.id === a.id; })[0];
        if (!tr) return emit('That action is not available.', e.id, false);
        var who = actorName(e, tr.actor);
        if (tr.from && tr.from.indexOf(e.status) < 0) return refuse(e, who, '"' + tr.label + '" is not possible while this ' + (sc.noun || 'item') + ' is ' + statusById[e.status].label.toLowerCase() + '.');
        if (isTerminal(e.status) && !tr.afterTerminal) return refuse(e, who, 'This ' + (sc.noun || 'item') + ' is closed, so nothing more happens to it.');
        if (tr.requires === 'approver' && !e.approver) return refuse(e, who, 'Choose an approver before submitting.');
        var input = (a.input == null ? '' : String(a.input)).slice(0, 300).trim();
        if (tr.input && tr.input.required && !input) return emit('Add ' + (tr.input.label || 'a note').toLowerCase() + ' first.', e.id, false);
        bump();
        if (tr.revision === 'new') {
          var prev = latest(e); var rv = { letter: letter(e.revisions.length), text: prev ? prev.text : '', status: 'draft', createdAt: st.clock, createdBy: e.author, summary: input || '', decidedAt: null, decidedBy: null, comment: '', locked: false };
          e.revisions.push(rv);
        } else if (tr.revision === 'decide' || tr.revision === 'submit') {
          var cur = latest(e);
          cur.status = tr.to;
          if (tr.revision === 'decide') {
            cur.decidedAt = st.clock; cur.decidedBy = tr.actor === 'approver' ? e.approver : e.author; cur.comment = input;
            if (tr.lock) {
              cur.locked = true;
              e.revisions.forEach(function (r) { if (r !== cur && r.status === 'approved') r.status = 'superseded'; });
            }
          }
        }
        if (tr.assignTo) e.assignee = tr.assignTo;
        var v = vars(e, { actor: who, input: input, rev: latest(e) ? latest(e).letter : '' });
        var kind = tr.comms === 'in' ? 'comms_in' : tr.comms === 'out' ? 'comms_out' : 'status';
        logEntry(e, { kind: kind, actor: who, text: fill(tr.log, v) });
        if (tr.touch !== false) e.touchedAt = st.clock;
        if (tr.comms) e.lastContactAt = st.clock;
        if (tr.to && tr.to !== e.status) enterStatus(e, tr.to);
        else if (tr.to) { e.statusAt = st.clock; }
        return emit(summary(), e.id);
      }
      if (a.type === 'approveDraft' || a.type === 'discardDraft') {
        var d = st.drafts.filter(function (x) { return x.id === a.draftId; })[0];
        if (!d || d.status !== 'needs_approval') return emit('That draft is no longer waiting.', e.id, false);
        bump();
        d.decidedAt = st.clock;
        var by = personName(d.approverId);
        if (a.type === 'approveDraft') {
          d.status = 'approved';
          e.lastContactAt = st.clock; e.touchedAt = st.clock;
          logEntry(e, { kind: 'comms_out', actor: by, text: by + ' approved "' + d.subject + '". In a real build it would be sent now. In this demonstration nothing is sent.' });
        } else {
          d.status = 'discarded'; e.touchedAt = st.clock;
          logEntry(e, { kind: 'draft', actor: by, text: by + ' discarded the draft "' + d.subject + '". Nothing was sent.' });
        }
        return emit(summary(), e.id);
      }
      if (a.type === 'assign') {
        var field = a.field || 'assignee', pid = a.personId;
        if (!personById[pid]) return emit('Choose a person from the list.', e.id, false);
        var role = a.role || 'assignee';
        if (field === 'approver' && pid === e.author) return refuse(e, sc.userName || 'You', personName(pid) + ' wrote this document, so they cannot also approve it. Choose someone else.');
        if (isTerminal(e.status) || (e.revisions && latest(e) && latest(e).locked)) return refuse(e, sc.userName || 'You', 'This ' + (sc.noun || 'item') + ' is locked or closed, so it cannot be reassigned.');
        bump();
        e[field] = pid; e.touchedAt = st.clock;
        logEntry(e, { kind: 'assign', actor: sc.userName || 'You', text: (field === 'approver' ? 'Approver set to ' : 'Assigned to ') + personLine(pid) + '.' });
        return emit(summary(), e.id);
      }
      if (a.type === 'setFields') {
        if (isTerminal(e.status) || e.confirmed) return refuse(e, sc.userName || 'You', 'These details are already checked and locked. Ask the owner to reopen the item to change them.');
        bump();
        var changed = [];
        Object.keys(a.fields || {}).forEach(function (k) {
          var val = String(a.fields[k]).slice(0, 120).trim();
          if (e.fields[k] !== val) { changed.push((sc.fields.filter(function (f) { return f.key === k; })[0] || { label: k }).label + ': "' + e.fields[k] + '" corrected to "' + val + '"'); e.fields[k] = val; }
          e.check[k] = false;
        });
        e.confirmed = true; e.touchedAt = st.clock;
        logEntry(e, { kind: 'edit', actor: sc.userName || 'You', text: 'Details checked and confirmed.' + (changed.length ? ' Corrected: ' + changed.join('; ') + '.' : ' Nothing needed correcting.') });
        if (a.thenStatus && e.status === sc.initialStatus) enterStatus(e, a.thenStatus);
        return emit(summary(), e.id);
      }
      if (a.type === 'editText') {
        var r = latest(e);
        if (!r) return emit('Nothing to edit.', e.id, false);
        var author = personName(e.author);
        if (r.locked) return refuse(e, author, 'Edit blocked: Rev ' + r.letter + ' is approved and locked. To change the document, raise a new revision.');
        if (r.status === 'in_review') return refuse(e, author, 'Edit blocked: Rev ' + r.letter + ' is with the approver. Wait for a decision first.');
        var text = String(a.text == null ? '' : a.text).slice(0, 1200);
        if (text === r.text) return emit('No change to save.', e.id, false);
        bump();
        r.text = text; e.touchedAt = st.clock;
        logEntry(e, { kind: 'edit', actor: author, text: 'Edited the working text of Rev ' + r.letter + '.' });
        return emit(summary(), e.id);
      }
      return emit('That action is not available.', e.id, false);
    }

    /* ---------- what the interface may offer right now ---------- */
    function available(entityId) {
      var e = entity(entityId); if (!e) return [];
      return (sc.transitions || []).filter(function (t) {
        if (t.from && t.from.indexOf(e.status) < 0) return false;
        if (isTerminal(e.status) && !t.afterTerminal) return false;
        return true;
      }).map(function (t) { return { id: t.id, label: fill(t.label, vars(e)), actor: t.actor, actorName: actorName(e, t.actor), input: t.input || null, tone: t.tone || null }; });
    }
    function rulesPlain() {
      return sc.rules.map(function (r) { return { id: r.id, text: fill(r.plain, r.params || {}) }; });
    }

    init();
    return {
      getState: snapshot,
      dispatch: dispatch,
      reset: function () { init(); return emit('Demonstration reset. The clock is back at ' + fmtStamp(st.clock) + '.', null); },
      subscribe: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (x) { return x !== fn; }); }; },
      available: available,
      rulesPlain: rulesPlain,
      scenario: function () { return clone(sc); },
      isTerminal: isTerminal
    };
  }

  return { create: create, validate: validate, format: { date: fmtDate, time: fmtTime, stamp: fmtStamp, full: fmtFull }, fill: fill };
});
