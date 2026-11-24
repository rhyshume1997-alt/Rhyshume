/* The Shelves: vanilla JS. Menu, basket count, reveals, newsletter demo, and the "Find your drink" dials (FLIP re-order). */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* toast */
  var toast = $('#toast'), toastT;
  function say(msg) { toast.textContent = msg; toast.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { toast.classList.remove('on'); }, 2800); }

  /* menu + Shop dropdown */
  var tabs = $('#tabs'), menuBtn = $('#menubtn');
  menuBtn.addEventListener('click', function () { var o = tabs.classList.toggle('is-open'); menuBtn.setAttribute('aria-expanded', o); menuBtn.firstElementChild.textContent = o ? 'Close' : 'Menu'; });
  $$('a.tab, .mega a').forEach(function (a) { a.addEventListener('click', function () { if (tabs.classList.contains('is-open')) { tabs.classList.remove('is-open'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.firstElementChild.textContent = 'Menu'; } }); });
  $$('[data-mega]').forEach(function (b) {
    var panel = document.getElementById(b.getAttribute('aria-controls'));
    function set(open) { b.setAttribute('aria-expanded', open); panel.hidden = !open; }
    b.addEventListener('click', function (e) { e.stopPropagation(); set(panel.hidden); });
    panel.addEventListener('click', function () { set(false); });
    document.addEventListener('click', function (e) { if (!panel.hidden && !panel.contains(e.target)) set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { set(false); b.focus(); } });
    panel.addEventListener('focusout', function (e) { if (e.relatedTarget && !panel.contains(e.relatedTarget) && e.relatedTarget !== b) set(false); });
  });

  /* basket (count only: this is a concept) */
  var count = 0, countEl = $('#cartcount'), cartBtn = $('#cartbtn');
  function setCount(n) {
    count = n; countEl.textContent = n; cartBtn.setAttribute('aria-label', 'Basket, ' + n + (n === 1 ? ' item' : ' items'));
    countEl.classList.remove('bump'); void countEl.offsetWidth; if (!mqReduce.matches) countEl.classList.add('bump');
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-add]'); if (!b) return;
    setCount(count + 1); say('Added ' + b.getAttribute('data-add') + ' to the basket. (Demo: nothing is charged.)');
  });
  cartBtn.addEventListener('click', function () { say('Basket: ' + count + (count === 1 ? ' item' : ' items') + '. The full basket and Shopify checkout are not built in this concept.'); });
  $$('a[href="#"]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); say('Not built in this concept yet.'); }); });

  /* reveal once */
  var rv = $$('.rv');
  if ('IntersectionObserver' in window && !mqReduce.matches) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }); }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    rv.forEach(function (n) { io.observe(n); });
  } else { rv.forEach(function (n) { n.classList.add('in'); }); }

  /* newsletter (demo) */
  var nf = $('#news-form'), ns = $('#news-status');
  nf.addEventListener('submit', function (e) {
    e.preventDefault(); ns.className = ''; var em = nf.elements.email, cs = nf.elements.consent;
    if (!em.value || !em.checkValidity()) { ns.className = 'err'; ns.textContent = 'Please enter a valid email address.'; em.focus(); return; }
    if (!cs.checked) { ns.className = 'err'; ns.textContent = 'Please tick the box so we know you are happy to hear from us.'; cs.focus(); return; }
    ns.className = 'ok'; ns.textContent = 'Thank you. (Demonstration only: nothing was sent or stored.)'; nf.reset();
  });

  /* ---- Find your drink ---- */
  var KEYS = ['sweet', 'bitter', 'fruity', 'body'];
  var NAMES = { sweet: 'sweet', bitter: 'bitter', fruity: 'fruity', body: 'body' };
  var WORDS = {
    sweet: ['None', 'A hint', 'Slight', 'Medium', 'Sweet', 'Very sweet'],
    bitter: ['None', 'Mild', 'Gentle', 'Medium', 'Bitter', 'Very bitter'],
    fruity: ['None', 'A hint', 'Subtle', 'Medium', 'Fruity', 'Bursting'],
    body: ['Very light', 'Light', 'Light to medium', 'Medium', 'Full', 'Very full']
  };
  var inputs = {}, outputs = {};
  KEYS.forEach(function (k) { inputs[k] = $('#d-' + k); outputs[k] = $('#o-' + k); });
  var planks = $$('#beer [data-plank]');
  var items = $$('#beer li[data-i]').sort(function (a, b) { return +a.dataset.i - +b.dataset.i; });
  var liveVis = $('#live-vis'), liveSr = $('#live-sr'), srT;
  var active = false;
  var IDLE = 'Move a dial to start. The shelf stays in its usual order until you do.';

  function wordFor(k, v) { return v + ' · ' + WORDS[k][v]; }
  function readDials() { return KEYS.map(function (k) { return +inputs[k].value; }); }
  function showDials() { KEYS.forEach(function (k) { var v = +inputs[k].value; outputs[k].textContent = wordFor(k, v); inputs[k].setAttribute('aria-valuetext', wordFor(k, v)); }); }
  function flav(el) { var s = el.dataset.f; return s ? s.split(',').map(Number) : null; }
  function announce(txt) { liveVis.textContent = txt; clearTimeout(srT); srT = setTimeout(function () { liveSr.textContent = txt; }, 500); }

  function place(order) {
    /* returns true if the DOM changed. Four per shelf, in order. */
    var changed = false, per = Math.ceil(order.length / planks.length);
    order.forEach(function (el, idx) {
      var pk = planks[Math.min(planks.length - 1, Math.floor(idx / per))];
      var slot = idx - planks.indexOf(pk) * per, kids = pk.children;
      if (kids[slot] !== el) { pk.insertBefore(el, kids[slot] || null); changed = true; }
    });
    return changed;
  }

  function flip(order) {
    var reduce = mqReduce.matches;
    var first = new Map();
    items.forEach(function (el) { first.set(el, el.getBoundingClientRect()); el.getAnimations().forEach(function (a) { a.cancel(); }); });
    var changed = place(order);
    if (!changed || reduce || !items[0].animate) return;
    items.forEach(function (el) {
      var f = first.get(el), l = el.getBoundingClientRect(), dx = f.left - l.left, dy = f.top - l.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.23,1,.32,1)' });
    });
  }

  function update() {
    showDials();
    if (!active) return;
    var want = readDials(), scored = [];
    items.forEach(function (el) {
      var f = flav(el), gap = null, parts = null;
      if (f) { parts = f.map(function (v, i) { return Math.abs(v - want[i]); }); gap = parts.reduce(function (a, b) { return a + b; }, 0); }
      scored.push({ el: el, gap: gap, parts: parts, i: +el.dataset.i });
    });
    scored.sort(function (a, b) {
      if (a.gap === null && b.gap === null) return a.i - b.i;
      if (a.gap === null) return 1; if (b.gap === null) return -1;
      return a.gap - b.gap || a.i - b.i;
    });
    var min = scored[0].gap, nBest = 0;
    scored.forEach(function (s, rank) {
      var el = s.el, best = s.gap !== null && s.gap === min, near = s.gap !== null && !best && rank < 3;
      if (best) nBest++;
      el.classList.toggle('is-best', best); el.classList.toggle('is-near', near); el.classList.toggle('is-none', s.gap === null);
      var tag = $('.best', el); if (tag) tag.hidden = !best;
      var g = $('[data-gap]', el);
      g.hidden = false;
      g.textContent = s.gap === null ? 'No flavour numbers, so it goes last.' : 'Gap ' + s.gap + ' of 20 (' + s.parts.join(' + ') + ')';
    });
    flip(scored.map(function (s) { return s.el; }));
    var top = scored[0].el.dataset.title, nFlav = scored.filter(function (s) { return s.gap !== null; }).length;
    var tail = scored.length - nFlav;
    var msg = 'Showing ' + scored.length + ' on the craft beer shelf, closest first. ' + (nBest > 1 ? nBest + ' are joint closest, starting with ' + top : 'Closest is ' + top) + ' (gap ' + min + ' of 20).' +
      (tail ? ' ' + (tail === 1 ? 'The hamper has' : tail + ' items have') + ' no flavour numbers, so ' + (tail === 1 ? 'it goes' : 'they go') + ' last.' : '');
    announce(msg);
  }

  function reset() {
    active = false;
    KEYS.forEach(function (k) { inputs[k].value = 3; });
    showDials();
    items.forEach(function (el) {
      el.classList.remove('is-best', 'is-near', 'is-none');
      var tag = $('.best', el); if (tag) tag.hidden = true;
      var g = $('[data-gap]', el); if (g) { g.hidden = true; g.textContent = ''; }
    });
    flip(items.slice());
    announce('Back in the usual order. All ' + items.length + ' are on the craft beer shelf.');
  }

  KEYS.forEach(function (k) { inputs[k].addEventListener('input', function () { active = true; update(); }); });
  $('#reset').addEventListener('click', reset);
  showDials();
})();
