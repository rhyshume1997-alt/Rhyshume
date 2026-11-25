/* Tick lists, Yes/No answers and notes for the private HQ pages. Everything is saved in this browser (localStorage). */
(function () {
  'use strict';
  var ANS = 'jo-ans-v3', OLD = 'jo-ticks-v1', META = 'jo-meta-v1';
  function rd(k) { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } }
  var ans = rd(ANS), meta = rd(META), old = rd(OLD);

  function wr() { try { localStorage.setItem(ANS, JSON.stringify(ans)); localStorage.setItem(META, JSON.stringify(meta)); } catch (e) { } }
  var path = location.pathname.replace(/index\.html$/, '');
  var pageTitle = ((document.querySelector('.tk-title') || {}).textContent || document.title).replace(/\s+/g, ' ').trim();
  var boxes = [];
  var scopes = [].slice.call(document.querySelectorAll('[data-tick]'));
  var qaAll = scopes.some(function (s) { return s.getAttribute('data-qa') === 'all'; });
  var DEFAULT_OPTS = ['Yes', 'No', 'Not sure'];

  function mk(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; }
  function rec(key) { return ans[key] || (ans[key] = {}); }
  function textOf(row) {
    var c = row.cloneNode(true);
    [].forEach.call(c.querySelectorAll('.qa,.tk-badge,input,textarea,button'), function (n) { n.remove(); });
    return c.textContent.replace(/\s+/g, ' ').trim().slice(0, 160);
  }

  var targets = [];
  scopes.forEach(function (sc) {
    [].forEach.call(sc.querySelectorAll('input[type=checkbox], li, tbody tr'), function (el) { targets.push(el); });
  });
  var hs = [].slice.call(document.querySelectorAll('main h2, main summary'));
  function headOf(el) {
    var last = -1;
    for (var i = 0; i < hs.length; i++) { if (hs[i].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) last = i; else break; }
    return last;
  }

  targets.forEach(function (el) {
    var input = null, row = null;
    if (el.tagName === 'INPUT') {
      if (el.closest('.tk-bar,.qa,dialog')) return;
      input = el; row = el.closest('li,tr') || el.parentNode; el.disabled = false; el.classList.add('tk');
    } else if (el.tagName === 'LI') {
      if (el.querySelector('input[type=checkbox]') || el.querySelector('li')) return;
      input = mk('input', 'tk'); input.type = 'checkbox'; el.insertBefore(input, el.firstChild); row = el;
    } else if (el.tagName === 'TR') {
      if (el.querySelector('input[type=checkbox]')) return;
      var c = el.querySelector('td'); if (!c) return;
      input = mk('input', 'tk'); input.type = 'checkbox'; c.insertBefore(input, c.firstChild); row = el;
    }
    if (!input) return;
    var idx = boxes.length, key = path + '#' + idx;
    input.dataset.k = key;
    var r = ans[key] || {};
    input.checked = !!r.t;
    var hd = headOf(row);
    var b = { input: input, row: row, head: hd, key: key, q: textOf(row), sec: hd >= 0 ? hs[hd].textContent.replace(/\s*\d+\/\d+\s*$/, '').trim() : '' };
    boxes.push(b);
    buildQA(b, row);
  });

  function buildQA(b, row) {
    var holder = row.tagName === 'TR' ? row.querySelector('td:last-child') : row;
    if (!holder) return;
    var optAttr = row.getAttribute('data-opts');
    var isQ = optAttr || qaAll || /\?/.test(b.q);
    var opts = optAttr ? optAttr.split('|') : DEFAULT_OPTS;
    var r = ans[b.key] || {};
    var qa = mk('div', 'qa');
    if (isQ) {
      var grp = mk('span', 'qa-opts'); grp.setAttribute('role', 'group'); grp.setAttribute('aria-label', 'Answer');
      opts.forEach(function (o) {
        var btn = mk('button', 'qa-opt', o); btn.type = 'button'; btn.dataset.v = o; btn.setAttribute('aria-pressed', r.a === o ? 'true' : 'false');
        grp.appendChild(btn);
      });
      qa.appendChild(grp);
    }
    var nb = mk('button', 'qa-note-btn', r.n ? 'Note' : '+ Note'); nb.type = 'button'; nb.setAttribute('aria-expanded', r.n ? 'true' : 'false');
    qa.appendChild(nb);
    var ta = mk('textarea', 'qa-note'); ta.rows = 2; ta.placeholder = 'Write the answer or a note here'; ta.value = r.n || ''; ta.hidden = !r.n;
    ta.setAttribute('aria-label', 'Note for: ' + b.q.slice(0, 80));
    qa.appendChild(ta);
    holder.appendChild(qa);
    b.qa = qa; b.ta = ta; b.nb = nb;
    nb.addEventListener('click', function () { ta.hidden = !ta.hidden; nb.setAttribute('aria-expanded', String(!ta.hidden)); if (!ta.hidden) ta.focus(); });
    ta.addEventListener('input', function () { var x = rec(b.key); x.n = ta.value; x.q = b.q; x.p = b.sec || pageTitle; nb.textContent = ta.value ? 'Note' : '+ Note'; wr(); });
    qa.addEventListener('click', function (e) {
      var btn = e.target.closest('.qa-opt'); if (!btn) return;
      var x = rec(b.key), on = x.a !== btn.dataset.v;
      x.a = on ? btn.dataset.v : ''; x.q = b.q; x.p = b.sec || pageTitle;
      if (on) { x.t = 1; b.input.checked = true; } wr(); paint();
    });
  }

  function paint() {
    var done = 0, per = {};
    boxes.forEach(function (b) {
      var x = ans[b.key] || {}, on = b.input.checked; if (on) done++;
      b.row.classList.toggle('done', on);
      if (b.qa) [].forEach.call(b.qa.querySelectorAll('.qa-opt'), function (btn) { btn.setAttribute('aria-pressed', x.a === btn.dataset.v ? 'true' : 'false'); });
      var p = per[b.head] || (per[b.head] = { d: 0, t: 0 }); p.t++; if (on) p.d++;
    });
    hs.forEach(function (h, i) {
      var p = per[i], bd = h.querySelector('.tk-badge');
      if (!p) { if (bd) bd.remove(); return; }
      if (!bd) { bd = mk('span', 'tk-badge'); h.appendChild(bd); }
      bd.textContent = p.d + '/' + p.t; bd.classList.toggle('full', p.d === p.t);
    });
    var fill = document.querySelector('.tk-fill'), num = document.querySelector('.tk-num');
    if (fill) fill.style.width = (boxes.length ? done / boxes.length * 100 : 0) + '%';
    if (num) num.textContent = done + ' of ' + boxes.length;
    if (boxes.length) { meta[path] = { d: done, t: boxes.length }; }
    wr(); return done;
  }
  document.addEventListener('change', function (e) {
    var i = e.target; if (!i.dataset || !i.dataset.k) return;
    var x = rec(i.dataset.k); x.t = i.checked ? 1 : 0;
    var b = boxes.filter(function (z) { return z.key === i.dataset.k; })[0]; if (b) { x.q = b.q; x.p = b.sec || pageTitle; }
    wr(); paint();
  });
  document.addEventListener('click', function (e) {
    var li = e.target.closest && e.target.closest('li'); if (!li) return;
    if (e.target.closest('a,button,input,select,textarea,label,summary,.qa')) return;
    var b = boxes.filter(function (x) { return x.row === li; })[0]; if (!b) return;
    b.input.checked = !b.input.checked; b.input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  paint();

  /* ---------- send answers ---------- */
  var dlg = null;
  function today() { var d = new Date(); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }
  function report(scope) {
    var by = {}, order = [], n = 0;
    Object.keys(ans).forEach(function (k) {
      var x = ans[k]; if (!(x.t || x.a || x.n)) return;
      if (scope === 'page' && k.indexOf(path + '#') !== 0) return;
      var p = x.p || (k.split('#')[0].replace(/.*\//, '') || 'Hub'); if (!by[p]) { by[p] = []; order.push(p); }
      by[p].push({ k: k, x: x });
    });
    var out = ["# Jack O'Beers answers", today(), ''];
    order.forEach(function (p) {
      out.push('## ' + p);
      by[p].sort(function (a, b) { return (+a.k.split('#')[1]) - (+b.k.split('#')[1]); }).forEach(function (it) {
        var x = it.x; n++;
        out.push('- [' + (x.t ? 'x' : ' ') + '] ' + (x.q || '(item ' + it.k.split('#')[1] + ')') + (x.a ? '  => ' + x.a.toUpperCase() : ''));
        if (x.n) out.push('  Note: ' + x.n.replace(/\n/g, '\n  '));
      });
      out.push('');
    });
    if (!n) out.push('Nothing ticked or answered yet.');
    return out.join('\n');
  }
  function openSend() {
    if (!dlg) {
      dlg = mk('dialog', 'tk-dlg');
      dlg.innerHTML = '<h2>Your answers</h2><p class="sub">Copy this and paste it into the chat with Claude, or download it.</p>' +
        '<label class="tk-scope">Show <select id="tk-scope"><option value="page">This page only</option><option value="all">Everything</option></select></label>' +
        '<textarea id="tk-out" rows="14" readonly></textarea><div class="tk-dact"><button type="button" id="tk-do-copy" class="primary">Copy</button><button type="button" id="tk-do-dl">Download</button><button type="button" id="tk-do-close">Close</button></div><p id="tk-msg" role="status"></p>';
      document.body.appendChild(dlg);
      var sc = dlg.querySelector('#tk-scope'), out = dlg.querySelector('#tk-out'), msg = dlg.querySelector('#tk-msg');
      var fill = function () { out.value = report(sc.value); };
      sc.addEventListener('change', fill); dlg.fill = fill;
      out.addEventListener('focus', function () { out.select(); });
      dlg.querySelector('#tk-do-close').addEventListener('click', function () { dlg.close(); });
      dlg.querySelector('#tk-do-copy').addEventListener('click', function () {
        out.select(); var done = function () { msg.textContent = 'Copied. Paste it into the chat.'; };
        if (navigator.clipboard) navigator.clipboard.writeText(out.value).then(done, function () { document.execCommand('copy'); done(); }); else { document.execCommand('copy'); done(); }
      });
      dlg.querySelector('#tk-do-dl').addEventListener('click', function () {
        var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([out.value], { type: 'text/markdown' }));
        a.download = 'jack-obeers-answers.md'; document.body.appendChild(a); a.click(); a.remove(); msg.textContent = 'Downloaded.';
      });
    }
    dlg.querySelector('#tk-scope').value = boxes.length && !document.querySelector('[data-doc]') ? 'page' : 'all';
    dlg.querySelector('#tk-msg').textContent = ''; dlg.fill(); dlg.showModal();
  }
  var send = document.getElementById('tk-send'); if (send) send.addEventListener('click', openSend);

  /* ---------- other bar buttons ---------- */
  var reset = document.getElementById('tk-reset'), copy = document.getElementById('tk-copy'), paste = document.getElementById('tk-paste');
  if (reset) reset.addEventListener('click', function () {
    if (!confirm('Clear every tick, answer and note on this page?')) return;
    boxes.forEach(function (b) { b.input.checked = false; delete ans[b.key]; if (b.ta) { b.ta.value = ''; b.ta.hidden = true; b.nb.textContent = '+ Note'; } });
    wr(); paint();
  });
  if (copy) copy.addEventListener('click', function () {
    var s = JSON.stringify(ans);
    (navigator.clipboard ? navigator.clipboard.writeText(s) : Promise.reject()).then(function () { copy.textContent = 'Copied'; setTimeout(function () { copy.textContent = 'Copy backup'; }, 1800); }, function () { prompt('Copy this:', s); });
  });
  if (paste) paste.addEventListener('click', function () {
    var s = prompt('Paste the backup you copied from another device or link:'); if (!s) return;
    try { var o = JSON.parse(s); for (var k in o) { if (o[k] && typeof o[k] === 'object') ans[k] = o[k]; else if (o[k]) ans[k] = { t: 1 }; } wr(); location.reload(); } catch (e) { alert('That did not look right.'); }
  });

  /* ---------- hub progress ---------- */
  var docs = [].slice.call(document.querySelectorAll('[data-doc]'));
  function hubUpdate() {
    if (!docs.length) return;
    var m = rd(META), tot = 0, dn = 0;
    docs.forEach(function (a) {
      var p = new URL(a.getAttribute('href'), location.href).pathname, t = +a.dataset.total || 0, d = (m[p] && m[p].d) || 0;
      if (m[p] && m[p].t) t = m[p].t; tot += t; dn += Math.min(d, t);
      var bar = a.querySelector('.mini i'), bd = a.querySelector('.badge');
      if (bar) bar.style.width = (t ? d / t * 100 : 0) + '%';
      if (bd) { bd.textContent = d + '/' + t; bd.classList.toggle('full', t && d === t); }
    });
    var own = boxes.length, ownDone = boxes.filter(function (b) { return b.input.checked; }).length;
    var T = tot + own, D = dn + ownDone;
    var f = document.querySelector('.tk-fill'), n = document.querySelector('.tk-num');
    if (f) f.style.width = (T ? D / T * 100 : 0) + '%'; if (n) n.textContent = D + ' of ' + T + ' done';
  }
  hubUpdate();
  document.addEventListener('change', hubUpdate);
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.qa-opt')) hubUpdate(); });
})();
