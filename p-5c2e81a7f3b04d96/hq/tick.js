/* Tick lists for the private HQ pages. Ticks live in this browser only (localStorage). */
(function () {
  'use strict';
  var KEY = 'jo-ticks-v1', META = 'jo-meta-v1';
  function rd(k) { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } }
  var ticks = rd(KEY), meta = rd(META);
  function wr() { try { localStorage.setItem(KEY, JSON.stringify(ticks)); localStorage.setItem(META, JSON.stringify(meta)); } catch (e) { } }
  var path = location.pathname.replace(/index\.html$/, '');
  var boxes = [], heads = [], counts = [];
  var scopes = [].slice.call(document.querySelectorAll('[data-tick]'));

  function box() { var i = document.createElement('input'); i.type = 'checkbox'; i.className = 'tk'; return i; }
  var targets = [];
  scopes.forEach(function (sc) {
    [].forEach.call(sc.querySelectorAll('input[type=checkbox], li, tbody tr'), function (el) { targets.push({ el: el, sc: sc }); });
  });
  var hs = [].slice.call(document.querySelectorAll('main h2, main summary'));
  function headOf(el) {
    var last = -1;
    for (var i = 0; i < hs.length; i++) { if (hs[i].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) last = i; else break; }
    return last;
  }
  targets.forEach(function (t) {
    var el = t.el, input = null, row = null;
    if (el.tagName === 'INPUT') { input = el; if (el.closest('.tk-bar')) return; row = el.closest('li,tr') || el.parentNode; el.disabled = false; el.classList.add('tk'); }
    else if (el.tagName === 'LI') {
      if (el.querySelector('input[type=checkbox]') || el.querySelector('li')) return;
      input = box(); el.insertBefore(input, el.firstChild); row = el;
    } else if (el.tagName === 'TR') {
      if (el.querySelector('input[type=checkbox]')) return;
      var c = el.querySelector('td'); if (!c) return; input = box(); c.insertBefore(input, c.firstChild); row = el;
    }
    if (!input) return;
    var idx = boxes.length, key = path + '#' + idx, h = headOf(row);
    input.dataset.k = key; input.checked = !!ticks[key]; row.classList.toggle('done', input.checked);
    boxes.push({ input: input, row: row, head: h });
  });

  function paint() {
    var done = 0; var per = {};
    boxes.forEach(function (b) { var on = b.input.checked; if (on) done++; b.row.classList.toggle('done', on); var p = per[b.head] || (per[b.head] = { d: 0, t: 0 }); p.t++; if (on) p.d++; });
    hs.forEach(function (h, i) {
      var p = per[i], bd = h.querySelector('.tk-badge');
      if (!p) { if (bd) bd.remove(); return; }
      if (!bd) { bd = document.createElement('span'); bd.className = 'tk-badge'; h.appendChild(bd); }
      bd.textContent = p.d + '/' + p.t; bd.classList.toggle('full', p.d === p.t);
    });
    var fill = document.querySelector('.tk-fill'), num = document.querySelector('.tk-num');
    if (fill) fill.style.width = (boxes.length ? done / boxes.length * 100 : 0) + '%';
    if (num) num.textContent = done + ' of ' + boxes.length;
    if (boxes.length) { meta[path] = { d: done, t: boxes.length }; wr(); }
    return done;
  }
  document.addEventListener('change', function (e) {
    var i = e.target; if (!i.dataset || !i.dataset.k) return; ticks[i.dataset.k] = i.checked ? 1 : 0; wr(); paint();
  });
  document.addEventListener('click', function (e) {
    var li = e.target.closest && e.target.closest('li.done, li'); if (!li) return;
    if (e.target.closest('a,button,input,select,textarea,label,summary')) return;
    var b = boxes.filter(function (x) { return x.row === li; })[0]; if (!b) return;
    b.input.checked = !b.input.checked; b.input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  paint();

  /* bar buttons */
  var reset = document.getElementById('tk-reset'), copy = document.getElementById('tk-copy'), paste = document.getElementById('tk-paste');
  if (reset) reset.addEventListener('click', function () {
    if (!confirm('Untick everything on this page?')) return;
    boxes.forEach(function (b) { b.input.checked = false; ticks[b.input.dataset.k] = 0; }); wr(); paint();
  });
  if (copy) copy.addEventListener('click', function () {
    var s = JSON.stringify(ticks);
    (navigator.clipboard ? navigator.clipboard.writeText(s) : Promise.reject()).then(function () { copy.textContent = 'Copied'; setTimeout(function () { copy.textContent = 'Copy my ticks'; }, 1800); }, function () { prompt('Copy this:', s); });
  });
  if (paste) paste.addEventListener('click', function () {
    var s = prompt('Paste the ticks you copied from another device or link:'); if (!s) return;
    try { var o = JSON.parse(s); for (var k in o) if (o[k]) ticks[k] = 1; wr(); location.reload(); } catch (e) { alert('That did not look right.'); }
  });

  /* hub: progress on document cards and overall */
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
})();
