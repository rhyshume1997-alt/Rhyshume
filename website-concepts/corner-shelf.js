/* The Corner Shelf behaviour. Without this file the page is complete: the opening, the index, every shelf of drawn objects,
   the aisle strip and the notes all read as static content. Nothing here sends, stores or persists anything: the basket
   lives in memory only and is gone when the page closes. */
(function () {
  'use strict';
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var raf = window.requestAnimationFrame.bind(window);
  var EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---- the opening: footage when it plays, the still when it does not ---- */
  var hero = $('#top'), plate = $('#hero-plate');
  var slot = window.Footage ? window.Footage.mount(plate) : null;
  if (slot) slot.listeners.push(function (what) {
    var t = $('#hero-tag');
    if (what === 'live' && t) t.textContent = 'Generated concept footage';
    if (what === 'poster' && t) t.textContent = 'Generated concept image';
  });
  if (!calm && hero) {
    hero.classList.add('scrolly');
    var hh = hero.offsetHeight, tick = false;
    window.addEventListener('resize', function () { hh = hero.offsetHeight; }, { passive: true });
    window.addEventListener('scroll', function () {
      if (tick) return; tick = true;
      raf(function () { tick = false; hero.style.setProperty('--p', Math.min(1, Math.max(0, window.scrollY / hh)).toFixed(3)); });
    }, { passive: true });
  }

  /* ---- scroll reveal for the shelves ---- */
  var shelves = $$('.shelf');
  if (!calm && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('rv-on');
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    shelves.forEach(function (s) { io.observe(s); });
  }

  /* ---- the products (read from the markup, so the page and the script agree) ---- */
  var items = $$('.item'), P = {};
  items.forEach(function (li) {
    var id = li.getAttribute('data-id'), sym = document.getElementById('s-' + id);
    P[id] = { id: id, li: li, name: li.getAttribute('data-name'), no: li.getAttribute('data-no'), desc: li.getAttribute('data-desc'), mat: li.getAttribute('data-mat').split(' | '), vb: sym.getAttribute('viewBox') };
  });
  function art(id, cls) { return '<svg' + (cls ? ' class="' + cls + '"' : '') + ' viewBox="' + P[id].vb + '" aria-hidden="true" focusable="false"><use href="#s-' + id + '"/></svg>'; }

  /* ---- the basket: in memory only ---- */
  var qty = {}, order = [];
  var bk = $('#basket'), bkOpener = null, live = $('#bk-live');
  function total() { return order.reduce(function (n, id) { return n + qty[id]; }, 0); }
  function plural(n) { return n + (n === 1 ? ' item' : ' items'); }
  function say(msg) { live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 30); }
  function syncCount() {
    var n = total();
    $('#bk-n').textContent = n; $('#bk-sr').textContent = ', ' + plural(n); $('#cb-n').textContent = 'Basket: ' + plural(n); $('#bk-count').textContent = plural(n);
    $('#bk-go').disabled = n === 0; $('#bk-clear').hidden = n === 0; $('#bk-empty').hidden = n !== 0;
  }
  function renderBasket() {
    var ul = $('#bk-list'); ul.innerHTML = '';
    order.forEach(function (id) {
      var p = P[id], li = document.createElement('li'); li.className = 'bk-item'; li.setAttribute('data-id', id);
      li.innerHTML = '<div class="thumb">' + art(id) + '</div><div><h3>' + esc(p.name) + '</h3><p class="pr">[price to be confirmed]</p></div>' +
        '<div class="step"><button type="button" class="dec" aria-label="Decrease quantity of ' + esc(p.name) + '">&minus;</button><output>' + qty[id] + '</output><button type="button" class="inc" aria-label="Increase quantity of ' + esc(p.name) + '">+</button><button type="button" class="rm" aria-label="Remove ' + esc(p.name) + ' from the basket">Remove</button></div>';
      li.querySelector('.dec').disabled = qty[id] <= 1;
      ul.appendChild(li);
    });
    syncCount();
  }
  function bump() { var b = $('#bk-open'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
  function add(id) {
    if (!qty[id]) { qty[id] = 0; order.push(id); }
    qty[id]++; renderBasket(); bump();
    say(P[id].name + ' added. ' + plural(total()) + ' in the demonstration basket.');
    updateInspectorState();
  }
  function setQty(id, n) {
    if (n < 1) return;
    qty[id] = n; var row = $('.bk-item[data-id="' + id + '"]', bk);
    if (row) { $('output', row).textContent = n; $('.dec', row).disabled = n <= 1; }
    syncCount(); updateInspectorState(); say(P[id].name + ', quantity ' + n + '. ' + plural(total()) + ' in the basket.');
  }
  function remove(id) {
    delete qty[id]; order = order.filter(function (x) { return x !== id; }); renderBasket(); updateInspectorState();
    say(P[id].name + ' removed. ' + plural(total()) + ' in the basket.');
    var t = $('#bk-count'); t.tabIndex = -1; t.focus();
  }
  function openBasket(opener) {
    bkOpener = opener || $('#bk-open'); showStep(1); renderBasket();
    if (!bk.open) bk.showModal();
    $('#bk-title').focus();
  }
  function showStep(n) {
    $('#bk-step1').hidden = n !== 1; $('#bk-step2').hidden = n !== 2;
    if (n === 2) $('#bk-sum').innerHTML = order.map(function (id) { return '<li>' + qty[id] + ' &times; ' + esc(P[id].name) + ', [price to be confirmed]</li>'; }).join('') + '<li>Total: [to be confirmed]</li>';
  }
  $('#bk-open').addEventListener('click', function (e) { openBasket(e.currentTarget); });
  $('#cb-open').addEventListener('click', function (e) { openBasket(e.currentTarget); });
  $('#bk-x').addEventListener('click', function () { bk.close(); });
  bk.addEventListener('click', function (e) { if (e.target === bk) bk.close(); });
  bk.addEventListener('close', function () { if (bkOpener && document.contains(bkOpener)) bkOpener.focus(); });
  $('#bk-list').addEventListener('click', function (e) {
    var row = e.target.closest('.bk-item'); if (!row) return; var id = row.getAttribute('data-id');
    if (e.target.closest('.inc')) setQty(id, qty[id] + 1); else if (e.target.closest('.dec')) setQty(id, qty[id] - 1); else if (e.target.closest('.rm')) remove(id);
  });
  $('#bk-go').addEventListener('click', function () { showStep(2); $('#bk-title').focus(); });
  $('#bk-back').addEventListener('click', function () { showStep(1); $('#bk-title').focus(); });
  $('#bk-clear').addEventListener('click', function () { qty = {}; order = []; renderBasket(); updateInspectorState(); say('Basket emptied.'); var t = $('#bk-count'); t.tabIndex = -1; t.focus(); });
  $('#bk-done').addEventListener('click', function () { qty = {}; order = []; renderBasket(); updateInspectorState(); say('Basket emptied.'); bk.close(); });
  syncCount();

  /* ---- the inspector: a flat drawing given thickness with stacked slices, turned in CSS 3D ---- */
  var ins = $('#inspector'), stage = $('#in-stage'), turn = $('#in-turn'), cur = null, insOpener = null, ry = 0, rx = 0, keepFocus = false;
  var LIM = 75, TILT = 20;
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function setTurn(y, x, eased) {
    ry = clamp(y, -LIM, LIM); rx = clamp(x, -TILT, TILT);
    turn.classList.toggle('ease', !!eased && !calm);
    turn.style.setProperty('--ry', ry + 'deg'); turn.style.setProperty('--rx', rx + 'deg');
    var r = Math.round(ry); stage.setAttribute('aria-valuenow', r);
    stage.setAttribute('aria-valuetext', r === 0 ? 'Facing front' : 'Turned ' + Math.abs(r) + ' degrees to the ' + (r > 0 ? 'right' : 'left'));
  }
  function sizeTurn() {
    var vb = P[cur].vb.split(' '), w = +vb[2], h = +vb[3], sh = stage.clientHeight - 80, sw = stage.clientWidth;
    var ih = Math.min(sh * 0.9, sw * 0.7 * h / w, 420), iw = ih * w / h;
    turn.style.setProperty('--iw', iw.toFixed(0) + 'px'); turn.style.setProperty('--ih', ih.toFixed(0) + 'px');
  }
  function openInspector(id, opener) {
    cur = id; var p = P[id]; insOpener = opener;
    $('#in-no').textContent = 'No. ' + p.no; $('#in-title').textContent = p.name; $('#in-desc').textContent = p.desc;
    $('#in-mat').innerHTML = p.mat.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('');
    var html = '', N = 14;
    for (var i = 0; i < N; i++) html += '<svg class="lay sl" style="transform:translateZ(' + (12 - i * 2) + 'px)" viewBox="' + p.vb + '" aria-hidden="true" focusable="false"><use href="#s-' + id + '"/></svg>';
    html += '<svg class="lay" style="transform:translateZ(14px)" viewBox="' + p.vb + '" aria-hidden="true" focusable="false"><use href="#s-' + id + '"/></svg>';
    turn.innerHTML = html; turn.classList.remove('ease');
    updateInspectorState();
    ins.showModal(); sizeTurn();
    if (!calm) { setTurn(-48, 8, false); void turn.offsetWidth; setTurn(0, 0, true); } else setTurn(0, 0, false);
  }
  function updateInspectorState() { if (!cur) return; var n = qty[cur] || 0; $('#in-in').textContent = n ? 'In basket: ' + n : 'Not in the basket yet'; $('#in-add').textContent = n ? 'Add another' : 'Add to basket'; }
  ins.addEventListener('close', function () { cur = null; if (!keepFocus && insOpener && document.contains(insOpener)) insOpener.focus(); keepFocus = false; });
  ins.addEventListener('click', function (e) { if (e.target === ins) ins.close(); });
  $('#in-x').addEventListener('click', function () { ins.close(); });
  $('#in-add').addEventListener('click', function () { add(cur); });
  $('#in-view').addEventListener('click', function () { keepFocus = true; ins.close(); openBasket($('#bk-open').offsetParent ? $('#bk-open') : $('#cb-open')); });
  $('#in-l').addEventListener('click', function () { setTurn(ry - 20, rx, true); });
  $('#in-r').addEventListener('click', function () { setTurn(ry + 20, rx, true); });
  $('#in-r0').addEventListener('click', function () { setTurn(0, 0, true); });
  stage.addEventListener('keydown', function (e) {
    var k = e.key, m = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, 5], ArrowDown: [0, -5] }[k];
    if (m) { e.preventDefault(); setTurn(ry + m[0], rx + m[1], true); } else if (k === 'Home') { e.preventDefault(); setTurn(0, 0, true); }
  });
  var drag = null;
  stage.addEventListener('pointerdown', function (e) { if (e.button > 0) return; drag = { x: e.clientX, y: e.clientY, ry: ry, rx: rx, id: e.pointerId }; try { stage.setPointerCapture(e.pointerId); } catch (_) {} turn.classList.remove('ease'); });
  stage.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dy = e.pointerType === 'touch' ? 0 : e.clientY - drag.y;
    setTurn(drag.ry + (e.clientX - drag.x) * 0.45, drag.rx - dy * 0.2, false);
  });
  function endDrag(e) { if (drag && e.pointerId === drag.id) drag = null; }
  stage.addEventListener('pointerup', endDrag); stage.addEventListener('pointercancel', endDrag);
  window.addEventListener('resize', function () { if (cur && ins.open) sizeTurn(); });

  /* ---- the wall: opening an object, or adding it ---- */
  $('#wall-body').addEventListener('click', function (e) {
    var li = e.target.closest('.item'); if (!li) return; var id = li.getAttribute('data-id');
    var q = e.target.closest('.quick');
    if (q) { add(id); q.classList.remove('added'); void q.offsetWidth; q.classList.add('added'); return; }
    openInspector(id, $('.prod', li));
  });

  /* ---- filtering: objects lower and fade, the rest slide along the shelf (FLIP) ---- */
  var chips = $$('.chip'), cat = 'all', run = 0, anims = [], NAMES = { all: 'All', kitchen: 'Kitchen', candles: 'Candles', cards: 'Cards and paper', plants: 'Plants', gifts: 'Gifts' };
  function match(li, c) { return c === 'all' || li.getAttribute('data-cats').split(' ').indexOf(c) > -1; }
  function gone(li) { return li.classList.contains('gone'); }
  function syncEmpty() { shelves.forEach(function (s) { s.classList.toggle('is-empty', !$('.item:not(.gone)', s)); }); }
  function finish(c) {
    chips.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-cat') === c)); });
    var n = items.filter(function (li) { return match(li, c); }).length;
    $('#wall-live').textContent = 'Showing ' + n + ' of ' + items.length + ' objects: ' + NAMES[c] + '.';
  }
  function setFilter(c, instant) {
    if (c === cat) { finish(c); return; }
    cat = c; finish(c);
    anims.forEach(function (a) { a.cancel(); }); anims = []; var my = ++run;
    var vis = items.filter(function (li) { return !gone(li); });
    var leave = vis.filter(function (li) { return !match(li, c); }), stay = vis.filter(function (li) { return match(li, c); }), enter = items.filter(function (li) { return gone(li) && match(li, c); });
    function swap() { leave.forEach(function (li) { li.classList.add('gone'); }); enter.forEach(function (li) { li.classList.remove('gone'); }); syncEmpty(); }
    if (calm || instant || !items[0].animate) { swap(); return; }
    var lv = leave.map(function (li, i) { var a = li.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(2.2rem) rotate(4deg)' }], { duration: 260, delay: i * 40, easing: 'cubic-bezier(0.5, 0, 0.8, 0.5)', fill: 'forwards' }); anims.push(a); return a.finished; });
    Promise.all(lv).then(function () {
      if (my !== run) return;
      $$('.scroller').forEach(function (s) { s.scrollLeft = 0; });
      var first = stay.map(function (li) { return li.getBoundingClientRect(); });
      swap();
      stay.forEach(function (li, i) {
        var l = li.getBoundingClientRect(), dx = first[i].left - l.left, dy = first[i].top - l.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        anims.push(li.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: 620, delay: i * 55, easing: EASE, fill: 'backwards' }));
      });
      enter.forEach(function (li, i) {
        anims.push(li.animate([{ opacity: 0, transform: 'translateY(2.4rem) rotate(-3deg)' }, { opacity: 1, transform: 'none' }], { duration: 560, delay: 140 + i * 70, easing: EASE, fill: 'backwards' }));
      });
    }, function () {});
  }
  chips.forEach(function (b) { b.addEventListener('click', function () { setFilter(b.getAttribute('data-cat')); }); });
  $$('.idx-row').forEach(function (a) { a.addEventListener('click', function () { setFilter(a.getAttribute('data-cat'), true); }); });
  $$('.panel .show').forEach(function (b) {
    b.addEventListener('click', function () {
      var c = b.getAttribute('data-cat'); setFilter(c, true);
      $('#wall').scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
      var chip = chips.filter(function (x) { return x.getAttribute('data-cat') === c; })[0]; if (chip) chip.focus({ preventScroll: true });
    });
  });

  /* ---- the aisle ---- */
  var sc = $('#aisle-scroll'), bar = $('#ai-bar'), maxS = 1, st = false;
  function measureAisle() { maxS = Math.max(1, sc.scrollWidth - sc.clientWidth); progress(); }
  function progress() { bar.style.transform = 'scaleX(' + (0.14 + 0.86 * Math.min(1, sc.scrollLeft / maxS)).toFixed(3) + ')'; }
  sc.addEventListener('scroll', function () { if (st) return; st = true; raf(function () { st = false; progress(); }); }, { passive: true });
  window.addEventListener('resize', measureAisle, { passive: true }); measureAisle();
  function nudge(d) { var p = $('.panel', sc); sc.scrollBy({ left: d * (p.offsetWidth + 20), behavior: calm ? 'auto' : 'smooth' }); }
  $('#ai-prev').addEventListener('click', function () { nudge(-1); });
  $('#ai-next').addEventListener('click', function () { nudge(1); });

  /* ---- ask the shop: a demonstration, nothing is sent ---- */
  $('#ask').addEventListener('submit', function (e) {
    e.preventDefault();
    var nm = $('#a-name').value.trim(), kind = $('#a-kind').value, note = $('#a-note').value.trim(), out = $('#a-out'), s = [];
    var line = (nm ? 'Thank you, ' + nm + '. ' : 'Thank you. ') + 'In a live shop this would be a question about ' + kind + '.';
    if (kind === 'the objects in my basket') line += order.length ? ' Your basket holds ' + order.map(function (id) { return qty[id] + ' ' + P[id].name; }).join(', ') + '.' : ' Your basket is empty.';
    if (note) line += ' Your note would travel with it.';
    $('#a-sum').textContent = line + ' Here nothing was sent, stored or booked.';
    out.classList.add('on'); out.focus();
  });
})();
