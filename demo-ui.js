/* Automation demonstration interface (WP-C).
   Inputs:  elements with data-demo="<scenario id>" in /automation-demos, plus DemoEngine and DemoScenarios (loaded first).
   Outputs: renders each demonstration into its element and wires the controls. Every control is a button or a labelled input, one
            polite live region per demonstration announces each change, focus is kept where the visitor was after each update.
   Must not be changed: no network, storage, cookie, mail or timer use. Text is only ever set with textContent (never as HTML).
   Nothing typed here leaves the page or is kept after it is closed. */
(function () {
  'use strict';
  var E = window.DemoEngine, S = window.DemoScenarios;
  if (!E || !S) return;

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'text') el.textContent = v;
      else if (k === 'class') el.className = v;
      else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c != null) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function plural(n, a, b) { return n + ' ' + (n === 1 ? a : b); }

  var KIND = { comms_out: 'Message out', comms_in: 'From customer', draft: 'Draft', status: 'Status', edit: 'Edit', assign: 'Assigned', system: 'Automation', blocked: 'Refused', revision: 'Revision' };
  var DRAFT = { approved: 'Approved. In a real build this would now be sent. Nothing was sent.', discarded: 'Discarded. Nothing was sent.', cancelled: 'Cancelled by a stop rule. Nothing was sent.' };

  function mount(root, sc) {
    var engine = E.create(sc);
    var uid = sc.id;
    var selected = sc.entities && sc.entities.length ? sc.entities[0].id : null;
    var seen = {};            /* draft ids already shown, so only new ones animate in */
    var typed = {};           /* unsaved typing per item, kept across updates, never stored anywhere */
    var personById = {}; sc.people.forEach(function (p) { personById[p.id] = p; });
    var statusById = {}; sc.statuses.forEach(function (s) { statusById[s.id] = s; });
    function person(id) { return personById[id] ? personById[id].name + ', ' + personById[id].role : ''; }
    function name(id) { return personById[id] ? personById[id].name : ''; }
    function fmt(ms) { return E.format.stamp(ms); }

    /* ---------- shell, built once so the live region is never replaced ---------- */
    clear(root);
    root.classList.add('dm');
    var say = h('p', { class: 'dm-say', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', text: 'Ready. Nothing has happened yet.' });
    var clock = h('p', { class: 'dm-clock' });
    var ctl = h('div', { class: 'dm-ctl', role: 'group', 'aria-label': 'Controls for the ' + sc.title + ' demonstration' });
    var list = h('div', { class: 'dm-side' });
    var detail = h('div', { class: 'dm-detail' });

    var rulesBox = h('div', { role: 'group', class: 'dm-rules', 'aria-labelledby': uid + '-rules-h' }, [
      h('h3', { id: uid + '-rules-h', text: 'The rules, in plain English' }),
      h('ol', { class: 'dm-rule-list' }, engine.rulesPlain().map(function (r) { return h('li', { text: r.text }); })),
      h('p', { class: 'dm-stoprule' }, [h('strong', { text: 'Stop rule. ' }), sc.stopRule]),
      (sc.alwaysRules || []).length ? h('ul', { class: 'dm-rule-list dm-always' }, sc.alwaysRules.map(function (t) { return h('li', { text: t }); })) : null
    ]);
    var app = h('div', { class: 'dm-app' }, [
      h('div', { class: 'dm-bar' }, [clock, ctl]),
      say,
      h('div', { class: 'dm-grid' }, [list, detail])
    ]);
    var connect = h('div', { role: 'group', class: 'dm-connect', 'aria-labelledby': uid + '-conn-h' }, [
      h('h3', { id: uid + '-conn-h', text: 'What this would connect to in a real build' }),
      h('div', { class: 'dm-conn-cols' }, [
        h('div', {}, [h('h4', { text: 'Possible, not built or connected here' }), h('ul', { class: 'dm-ul' }, sc.connect.potential.map(function (t) { return h('li', { text: t }); }))]),
        h('div', {}, [h('h4', { text: 'What exists today' }), h('ul', { class: 'dm-ul' }, sc.connect.existing.map(function (t) { return h('li', { text: t }); }))])
      ])
    ]);
    root.appendChild(h('p', { class: 'dm-lead', text: sc.lead }));
    root.appendChild(h('p', { class: 'dm-how', text: 'How to try it: ' + sc.howTo }));
    root.appendChild(rulesBox);
    root.appendChild(app);
    root.appendChild(connect);
    root.appendChild(h('p', { class: 'dm-foot', text: 'This is a demonstration of a possible workflow. It is not a feature at your business and not a product you can sign up for. Nothing is sent, saved or connected, and every name and date is made up.' }));

    /* ---------- focus keeping ---------- */
    function rememberFocus() { var a = document.activeElement; return a && root.contains(a) && a.getAttribute('data-k') ? a.getAttribute('data-k') : null; }
    function restoreFocus(k, fallback) {
      var el = k ? root.querySelector('[data-k="' + k + '"]') : null;
      if (!el && fallback) el = fallback();
      if (el) el.focus({ preventScroll: true });
    }

    /* ---------- dispatch ---------- */
    function run(action, opts) {
      var k = rememberFocus();
      var out = engine.dispatch(action);
      if (action.type === 'arrive' && out.ok && out.entityId) selected = out.entityId;
      say.textContent = out.message;
      render();
      restoreFocus(k, function () { return detail.querySelector('h3') || root.querySelector('[data-k="reset"]'); });
      return out;
    }

    /* ---------- pieces ---------- */
    function badge(e) {
      var s = statusById[e.status] || { label: e.status, tone: 'wait' };
      return h('span', { class: 'dm-st dm-st-' + (s.tone || 'wait'), text: s.label });
    }
    function pending(state, e) { return state.drafts.filter(function (d) { return d.entityId === e.id && d.status === 'needs_approval'; }); }
    function latest(e) { return e.revisions && e.revisions.length ? e.revisions[e.revisions.length - 1] : null; }

    function renderBar(state) {
      clock.textContent = '';
      clock.appendChild(h('span', { class: 'dm-lab', text: 'Demo clock' }));
      clock.appendChild(h('strong', { text: E.format.full(state.clock) }));
      clear(ctl);
      (sc.clock.controls || []).forEach(function (c) {
        ctl.appendChild(h('button', { type: 'button', class: 'dm-btn', 'data-k': 'clk-' + c.id, text: c.label, onclick: function () { run(c.id === 'nextDay' ? { type: 'nextDay' } : { type: 'advance', days: c.days }); } }));
      });
      if (sc.inbox && sc.inbox.length) {
        var left = sc.inbox.length - state.inboxIndex;
        if (left > 0) ctl.appendChild(h('button', { type: 'button', class: 'dm-btn dm-btn-main', 'data-k': 'arrive', text: 'Receive the next enquiry (' + left + ' left)', onclick: function () { run({ type: 'arrive' }); } }));
        else ctl.appendChild(h('span', { class: 'dm-quiet', text: 'No more made up enquiries to receive.' }));
      }
      ctl.appendChild(h('button', { type: 'button', class: 'dm-btn dm-btn-quiet', 'data-k': 'reset', text: 'Reset', onclick: function () {
        typed = {}; seen = {}; selected = sc.entities.length ? sc.entities[0].id : null;
        var out = engine.reset(); say.textContent = out.message; render(); restoreFocus('reset');
      } }));
    }

    function meta(e) {
      var bits = [];
      if (e.due && sc.dueLabel) bits.push(sc.dueLabel + ' ' + E.format.date(Date.parse(e.due)));
      if (latest(e)) bits.push('Rev ' + latest(e).letter);
      if (e.assignee) bits.push('Assigned to ' + name(e.assignee));
      if (e.source) bits.push('By ' + e.source);
      return bits.join(' · ');
    }

    function renderList(state) {
      clear(list);
      var open = state.entities.filter(function (e) { return !engine.isTerminal(e.status); });
      var closed = state.entities.filter(function (e) { return engine.isTerminal(e.status); });
      function group(title, items, id) {
        var box = h('div', { role: 'group', class: 'dm-group', 'aria-labelledby': uid + '-' + id }, [h('h3', { id: uid + '-' + id, class: 'dm-h', text: title + ' (' + items.length + ')' })]);
        if (!items.length) box.appendChild(h('p', { class: 'dm-quiet', text: 'None.' }));
        var ul = h('ul', { class: 'dm-items' });
        items.forEach(function (e) {
          var np = pending(state, e).length;
          var btn = h('button', { type: 'button', class: 'dm-item', 'data-k': 'ent-' + e.id, 'aria-current': e.id === selected ? 'true' : null, onclick: function () { selected = e.id; render(); restoreFocus('ent-' + e.id); } }, [
            h('span', { class: 'dm-item-top' }, [h('strong', { text: e.id }), badge(e)]),
            h('span', { class: 'dm-item-title', text: (e.fields.customer || e.title) + (e.fields.customer ? ' – ' + e.title : '') }),
            meta(e) ? h('span', { class: 'dm-item-meta', text: meta(e) }) : null,
            np ? h('span', { class: 'dm-flagtag', text: plural(np, 'draft', 'drafts') + ' needs approval' }) : null,
            e.flags.overdue || e.flags.phone ? h('span', { class: 'dm-flagtag dm-flagtag-warn', text: e.flags.overdue ? 'Overdue' : 'Call suggested' }) : null
          ]);
          ul.appendChild(h('li', {}, [btn]));
        });
        box.appendChild(ul);
        return box;
      }
      list.appendChild(group(sc.listTitle || 'Items', open, 'open-h'));
      if (closed.length) list.appendChild(group('Closed', closed, 'closed-h'));
    }

    function field(label, value) { return [h('dt', { text: label }), h('dd', { text: value })]; }

    function renderDetail(state) {
      clear(detail);
      var e = state.entities.filter(function (x) { return x.id === selected; })[0];
      if (!e) { detail.appendChild(h('p', { class: 'dm-quiet', text: 'Nothing selected. ' + (sc.inbox ? 'Press Receive the next enquiry.' : '') })); return; }
      var terminal = engine.isTerminal(e.status), rev = latest(e), locked = !!(rev && rev.locked);
      var t = typed[e.id] = typed[e.id] || { fields: {}, text: null, input: {} };

      detail.appendChild(h('div', { class: 'dm-dhead' }, [h('h3', { tabindex: '-1', text: e.id + ': ' + e.title }), badge(e)]));
      if (terminal) detail.appendChild(h('p', { class: 'dm-stopbanner' }, [h('strong', { text: 'Stopped. ' }), sc.stopRule]));
      Object.keys(e.flags).forEach(function (k) { detail.appendChild(h('p', { class: 'dm-warn', text: e.flags[k] })); });

      /* facts */
      var dl = h('dl', { class: 'dm-facts' });
      var editing = !!(sc.inbox && !e.confirmed && !terminal);
      if (e.raw) {
        detail.appendChild(h('figure', { class: 'dm-raw' }, [h('figcaption', { text: 'Message as received by ' + e.source + ' (made up)' }), h('blockquote', { text: e.raw })]));
      }
      if (editing) {
        var form = h('div', { class: 'dm-form', role: 'group', 'aria-labelledby': uid + '-fields-h' }, [
          h('h4', { id: uid + '-fields-h', text: 'Details read from the message. Check and correct them.' }),
          h('p', { class: 'dm-quiet', text: 'In this demonstration the fields are pre filled, not read live. A person always checks them before anything moves on.' })
        ]);
        sc.fields.forEach(function (f) {
          var id = uid + '-f-' + e.id + '-' + f.key, val = t.fields[f.key] != null ? t.fields[f.key] : e.fields[f.key];
          form.appendChild(h('div', { class: 'dm-field' }, [
            h('label', { for: id, text: f.label }),
            h('input', { id: id, type: 'text', value: val, maxlength: '120', autocomplete: 'off', 'data-k': 'f-' + f.key, 'aria-describedby': e.check[f.key] ? id + '-c' : null, oninput: function (ev) { t.fields[f.key] = ev.target.value; } }),
            e.check[f.key] ? h('span', { id: id + '-c', class: 'dm-check', text: 'Please check this one' }) : null
          ]));
        });
        form.appendChild(h('button', { type: 'button', class: 'dm-btn dm-btn-main', 'data-k': 'save-fields', text: 'Confirm details', onclick: function () {
          var vals = {}; sc.fields.forEach(function (f) { vals[f.key] = t.fields[f.key] != null ? t.fields[f.key] : e.fields[f.key]; });
          t.fields = {}; run({ type: 'setFields', entityId: e.id, fields: vals, thenStatus: 'checked' });
        } }));
        detail.appendChild(form);
      } else {
        sc.fields.forEach(function (f) { if (e.fields[f.key] != null) field(f.label, e.fields[f.key]).forEach(function (n) { dl.appendChild(n); }); });
        if (e.due && sc.dueLabel) field(sc.dueLabel, E.format.date(Date.parse(e.due))).forEach(function (n) { dl.appendChild(n); });
        if (e.lastContactAt) field('Last contact', fmt(e.lastContactAt)).forEach(function (n) { dl.appendChild(n); });
        if (e.author) field('Author', person(e.author)).forEach(function (n) { dl.appendChild(n); });
        if (e.approver) field('Approver', person(e.approver)).forEach(function (n) { dl.appendChild(n); });
        if (e.assignee) field('Assigned to', person(e.assignee)).forEach(function (n) { dl.appendChild(n); });
        detail.appendChild(dl);
      }

      /* assignment */
      (sc.assign || []).forEach(function (a) {
        if (terminal) return;
        var gid = uid + '-as-' + a.field;
        var grp = h('div', { class: 'dm-assign', role: 'group', 'aria-labelledby': gid }, [h('span', { id: gid, class: 'dm-lab', text: a.label })]);
        sc.people.forEach(function (p) {
          grp.appendChild(h('button', { type: 'button', class: 'dm-chip', 'data-k': 'as-' + a.field + '-' + p.id, 'aria-pressed': e[a.field] === p.id ? 'true' : 'false', onclick: function () { run({ type: 'assign', entityId: e.id, field: a.field, personId: p.id }); } }, [p.name, h('span', { class: 'dm-chip-role', text: ' ' + p.role })]));
        });
        detail.appendChild(grp);
      });

      /* document text */
      if (rev) {
        var editable = !locked && (rev.status === 'draft' || rev.status === 'changes_requested');
        var tid = uid + '-text-' + e.id;
        var box = h('div', { class: 'dm-doc' + (locked ? ' dm-locked' : '') }, [
          h('label', { for: tid, text: 'Working text of Rev ' + rev.letter }),
          h('textarea', { id: tid, rows: '6', 'data-k': 'doc-text', readonly: editable ? null : true, 'aria-describedby': tid + '-n', oninput: function (ev) { t.text = ev.target.value; } }),
          h('p', { id: tid + '-n', class: 'dm-note', text: locked ? 'Locked: Rev ' + rev.letter + ' is approved, so its text cannot be changed.' : rev.status === 'in_review' ? 'With the approver, so editing is paused.' : 'Open for editing by the author.' })
        ]);
        box.querySelector('textarea').value = t.text != null && editable ? t.text : rev.text;
        box.appendChild(h('button', { type: 'button', class: 'dm-btn', 'data-k': 'save-text', text: editable ? 'Save edit' : 'Try to edit anyway', onclick: function () {
          var cur = t.text != null ? t.text : rev.text; var text = editable ? cur : rev.text + ' (edit)';
          t.text = null; run({ type: 'editText', entityId: e.id, text: text });
        } }));
        detail.appendChild(box);
      }

      /* actions */
      var acts = engine.available(e.id), order = ['customer', 'user', 'author', 'approver'];
      order.forEach(function (who) {
        var mine = acts.filter(function (a) { return a.actor === who; });
        if (!mine.length) return;
        var gid = uid + '-act-' + who;
        var title = who === 'customer' ? 'What the customer does' : who === 'user' ? 'What you do' : who === 'author' ? 'As the author, ' + mine[0].actorName : 'As the approver, ' + mine[0].actorName;
        var grp = h('div', { class: 'dm-acts', role: 'group', 'aria-labelledby': gid }, [h('span', { id: gid, class: 'dm-lab', text: title })]);
        mine.forEach(function (a) {
          if (a.input && a.input.required) {
            var iid = uid + '-in-' + e.id + '-' + a.id;
            grp.appendChild(h('div', { class: 'dm-field' }, [h('label', { for: iid, text: a.input.label }), h('input', { id: iid, type: 'text', maxlength: '300', autocomplete: 'off', value: t.input[a.id] != null ? t.input[a.id] : a.input.default, oninput: function (ev) { t.input[a.id] = ev.target.value; } })]));
          }
          grp.appendChild(h('button', { type: 'button', class: 'dm-btn' + (a.tone === 'good' ? ' dm-btn-main' : ''), 'data-k': 'tr-' + a.id, text: a.label, onclick: function () {
            var v = a.input ? (t.input[a.id] != null ? t.input[a.id] : a.input.default) : '';
            run({ type: 'transition', entityId: e.id, id: a.id, input: v });
          } }));
        });
        detail.appendChild(grp);
      });

      /* prepared drafts */
      var drafts = state.drafts.filter(function (d) { return d.entityId === e.id; }).reverse();
      if (drafts.length) {
        var dsec = h('div', { role: 'group', class: 'dm-drafts', 'aria-labelledby': uid + '-dr-h' }, [h('h4', { id: uid + '-dr-h', text: 'Prepared drafts' })]);
        drafts.forEach(function (d) {
          var fresh = !seen[d.id]; seen[d.id] = true;
          var waiting = d.status === 'needs_approval';
          var mineToApprove = sc.userName === name(d.approverId);
          var card = h('article', { class: 'dm-draft' + (waiting ? ' dm-draft-wait' : '') + (fresh && waiting ? ' dm-in' : ''), 'aria-label': 'Draft: ' + d.subject }, [
            h('p', { class: 'dm-draft-state' }, [h('strong', { text: waiting ? (mineToApprove ? 'Needs your approval' : 'Needs approval') : 'Handled' }), ' ', waiting ? 'Approver: ' + person(d.approverId) + '. Not sent.' : DRAFT[d.status]]),
            h('p', { class: 'dm-draft-line' }, [h('span', { class: 'dm-lab', text: 'To' }), ' ' + d.to]),
            h('p', { class: 'dm-draft-line' }, [h('span', { class: 'dm-lab', text: 'Subject' }), ' ' + d.subject]),
            h('pre', { class: 'dm-draft-body', text: d.body })
          ]);
          if (waiting) {
            card.appendChild(h('div', { class: 'dm-draft-acts' }, [
              h('button', { type: 'button', class: 'dm-btn dm-btn-main', 'data-k': 'ap-' + d.id, text: 'Approve (nothing is really sent)', onclick: function () { run({ type: 'approveDraft', entityId: e.id, draftId: d.id }); } }),
              h('button', { type: 'button', class: 'dm-btn', 'data-k': 'dc-' + d.id, text: 'Discard the draft', onclick: function () { run({ type: 'discardDraft', entityId: e.id, draftId: d.id }); } })
            ]));
          }
          dsec.appendChild(card);
        });
        detail.appendChild(dsec);
      }

      /* revision history */
      if (e.revisions) {
        var rs = h('div', { role: 'group', class: 'dm-revs', 'aria-labelledby': uid + '-rv-h' }, [h('h4', { id: uid + '-rv-h', text: 'Revision history' })]);
        var ol = h('ol', { class: 'dm-revlist' });
        e.revisions.slice().reverse().forEach(function (r) {
          var label = r.status === 'approved' ? (r === latest(e) ? 'Approved and locked' : 'Approved, current until the new revision is approved') : r.status === 'superseded' ? 'Superseded, still locked' : (statusById[r.status] || { label: r.status }).label;
          ol.appendChild(h('li', {}, [
            h('span', { class: 'dm-rev', text: 'Rev ' + r.letter }),
            h('span', { class: 'dm-revtext' }, [h('strong', { text: label }), ' · ' + (r.summary || 'No summary'), h('br'), 'Started ' + fmt(r.createdAt) + ' by ' + name(r.createdBy) + (r.decidedAt ? '. Decided ' + fmt(r.decidedAt) + ' by ' + name(r.decidedBy) + (r.comment ? ': "' + r.comment + '"' : '') : '')])
          ]));
        });
        rs.appendChild(ol); detail.appendChild(rs);
      }

      /* history and audit trail */
      var hist = state.log.filter(function (l) { return l.entityId === e.id; });
      var hs = h('div', { role: 'group', class: 'dm-hist', 'aria-labelledby': uid + '-hi-h' }, [h('h4', { id: uid + '-hi-h', text: sc.historyTitle || 'History' }), h('p', { class: 'dm-quiet', text: 'Oldest first. Times come from the demo clock, not a real one.' })]);
      var hl = h('ol', { class: 'dm-histlist' });
      hist.forEach(function (l) {
        hl.appendChild(h('li', { class: 'dm-h-' + l.kind }, [
          h('time', { text: fmt(l.at) }),
          h('span', { class: 'dm-kind', text: KIND[l.kind] || l.kind }),
          h('span', { class: 'dm-hist-text' }, [l.text.indexOf(l.actor) === 0 ? null : h('strong', { text: l.actor + '. ' }), l.text])
        ]));
      });
      hs.appendChild(hl); detail.appendChild(hs);
    }

    function render() {
      var state = engine.getState();
      renderBar(state); renderList(state); renderDetail(state);
    }
    render();
    return { engine: engine, render: render };
  }

  var mounted = {};
  function mountAll() {
    [].slice.call(document.querySelectorAll('[data-demo]')).forEach(function (el) {
      var sc = S.all.filter(function (s) { return s.id === el.getAttribute('data-demo'); })[0];
      if (sc && !mounted[sc.id]) { mounted[sc.id] = mount(el, sc); el.setAttribute('data-ready', 'true'); }
    });
  }
  window.DemoUI = { mount: mount, mountAll: mountAll };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll); else mountAll();
})();
