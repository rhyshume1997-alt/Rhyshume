/* Jack O'Beers concept, Rev 1. Local demonstration only: no network calls, no storage, no cookies, no forms posted.
   Without this file the page is complete: the opening shows its finished state and the demonstrations are hidden. */
(function () {
  'use strict';
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  /* ---------- opening: the signature sequence lives in signature.js ---------- */
  var root = document.documentElement;
  var scene = $('#scene');
  if (window.Sig && window.gsap && scene) Sig.opening(scene); else root.classList.remove('sig-wait');
  var rp = $('#replay'); if (rp) rp.addEventListener('click', function () { if (window.Sig && Sig.replay) Sig.replay(); });

  /* scroll reveals */
  if ('IntersectionObserver' in window && !calm) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: 0.15 });
    $$('.rv').forEach(function (n) { io.observe(n); });
    root.classList.add('rv-on');
  }

  /* ---------- demonstration data: NOT real products ---------- */
  var AX = ['Sweet', 'Bitter or tart', 'Fruity', 'Body'];
  var P = [
    { id: 'b1', liq: '#d08a22', foam: 1, cat: 'beer', name: 'Demo Amber Ale', sub: 'Amber ale, sample entry', f: [2, 3, 2, 3], pair: ['Demo cheddar', 'Demo pork pie'], col: '#7a3f1c' },
    { id: 'b2', liq: '#3a1c0e', foam: 1, cat: 'beer', name: 'Demo Dark Stout', sub: 'Stout, sample entry', f: [2, 4, 1, 5], pair: ['Demo smoked cheese', 'Demo chocolate'], col: '#3b2417' },
    { id: 'b3', liq: '#e8b83a', foam: 1, cat: 'beer', name: 'Demo Pale Lager', sub: 'Lager, sample entry', f: [1, 2, 1, 1], pair: ['Demo oatcakes', 'Demo cheddar'], col: '#8a5a22' },
    { id: 'b4', liq: '#b8452e', foam: 1, cat: 'beer', name: 'Demo Fruit Beer', sub: 'Fruit beer, sample entry', f: [4, 1, 5, 2], pair: ['Demo soft cheese', 'Demo shortbread'], col: '#8f3a2a' },
    { id: 'c1', liq: '#d9b84a', foam: 1, cat: 'cider', name: 'Demo Dry Cider', sub: 'Dry cider, sample entry', f: [1, 4, 2, 2], pair: ['Demo pork pie', 'Demo chutney'], col: '#a9812a' },
    { id: 'c2', liq: '#e0b040', foam: 1, cat: 'cider', name: 'Demo Medium Cider', sub: 'Medium cider, sample entry', f: [3, 2, 3, 2], pair: ['Demo cheddar', 'Demo oatcakes'], col: '#b5902f' },
    { id: 'c3', liq: '#a83c63', foam: 1, cat: 'cider', name: 'Demo Berry Cider', sub: 'Fruit cider, sample entry', f: [4, 1, 5, 2], pair: ['Demo shortbread', 'Demo soft cheese'], col: '#8c3358' },
    { id: 'w1', liq: '#6b1d33', foam: 0, cat: 'wine', name: 'Demo Red', sub: 'Red wine, sample entry', f: [1, 3, 3, 4], pair: ['Demo cured meat', 'Demo hard cheese'], col: '#4b1f2a' },
    { id: 'w2', liq: '#d7d27a', foam: 0, cat: 'wine', name: 'Demo White', sub: 'White wine, sample entry', f: [2, 4, 4, 2], pair: ['Demo soft cheese', 'Demo oatcakes'], col: '#8a8c3a' },
    { id: 'w3', liq: '#e08a94', foam: 0, cat: 'wine', name: 'Demo Rosé', sub: 'Rosé wine, sample entry', f: [3, 2, 4, 2], pair: ['Demo cured meat', 'Demo chutney'], col: '#c06a74' }
  ];
  var CATNAME = { beer: 'Beer', cider: 'Cider', wine: 'Wine' };

  /* a drawn bottle: the product photograph slot. Wine is slimmer and taller than beer and cider. */
  function bottle(col, wine) {
    var s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 120 200'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    var p = document.createElementNS(NS, 'path');
    p.setAttribute('d', wine ? 'M42 192 Q42 198 48 198 H72 Q78 198 78 192 V92 Q78 76 66 68 V22 H70 V8 H50 V22 H54 V68 Q42 76 42 92Z' : 'M32 190 Q32 198 40 198 H80 Q88 198 88 190 V110 Q88 84 70 74 V34 H76 V16 H44 V34 H50 V74 Q32 84 32 110Z');
    p.setAttribute('fill', col); s.appendChild(p);
    var l = document.createElementNS(NS, 'circle'); l.setAttribute('cx', 60); l.setAttribute('cy', wine ? 140 : 144); l.setAttribute('r', wine ? 15 : 20); l.setAttribute('fill', '#f8efdc'); s.appendChild(l);
    var d = document.createElementNS(NS, 'circle'); d.setAttribute('cx', 60); d.setAttribute('cy', wine ? 140 : 144); d.setAttribute('r', wine ? 5 : 7); d.setAttribute('fill', '#c0392b'); s.appendChild(d);
    var c = document.createElementNS(NS, 'rect'); c.setAttribute('x', wine ? 49 : 43); c.setAttribute('y', wine ? 5 : 12); c.setAttribute('width', wine ? 22 : 34); c.setAttribute('height', 8); c.setAttribute('rx', 4); c.setAttribute('fill', '#c0392b'); s.appendChild(c);
    return s;
  }

  /* ---------- shop: category -> product -> detail ---------- */
  var grid = $('#grid'), detail = $('#detail'), tabs = $('#cat-tabs'), cat = 'beer', cur_ = null, basket = 0;
  var HAS = !!(window.Sig && window.gsap);
  function renderGrid() {
    if (!grid) return;
    if (HAS && Sig.drinks) Sig.drinks.reset();
    grid.textContent = ''; $('#grid-panel').setAttribute('aria-labelledby', 'ct-' + cat);
    P.filter(function (p) { return p.cat === cat; }).forEach(function (p) {
      var li = el('li', 'pw'), b = el('button', 'card'); b.type = 'button'; b.setAttribute('aria-pressed', cur_ && cur_.id === p.id ? 'true' : 'false'); b.dataset.id = p.id; b.setAttribute('aria-describedby', 'info-' + p.id);
      b.appendChild(el('span', 'demo mono', 'Demo'));
      var art = el('span', 'art'); art.appendChild(bottle(p.col, p.cat === 'wine'));
      var gs = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); gs.setAttribute('class', 'gl'); gs.setAttribute('viewBox', '0 0 60 80'); gs.setAttribute('aria-hidden', 'true'); gs.setAttribute('focusable', 'false');
      art.appendChild(gs); b.appendChild(art);
      b.appendChild(el('b', null, p.name)); b.appendChild(el('span', 'st', p.sub)); b.appendChild(el('span', 'pr mono', '[price to be confirmed]'));
      li.appendChild(b);
      /* information panel: always in the page, shown on hover, focus or tap. Flavour values are sample data, not verified. */
      var info = el('div', 'info'); info.id = 'info-' + p.id;
      info.appendChild(el('b', null, p.name));
      info.appendChild(el('p', null, 'Description: [to be supplied by the shop]'));
      info.appendChild(el('p', 'mono', 'Flavour, sample data, not verified'));
      var ul = el('ul', 'mini'); p.f.forEach(function (v, i) { ul.appendChild(el('li', null, AX[i] + ' ' + v + '/5')); }); info.appendChild(ul);
      info.appendChild(el('p', null, 'Allergens: [to be verified]'));
      li.appendChild(info);
      if (HAS) li._glass = Sig.cardGlass(gs, { colour: p.liq, foam: !!p.foam, foamColour: '#fffaf0' });
      grid.appendChild(li);
    });
  }
  function setCat(c, focusTab) {
    cat = c; cur_ = null;
    $$('.tab', tabs).forEach(function (t) { var on = t.dataset.cat === c; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; if (on && focusTab) t.focus(); });
    renderGrid();
  }
  function showDetail(p, focus) {
    cur_ = p; $$('.card', grid).forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.id === p.id ? 'true' : 'false'); });
    $('#d-cat').textContent = CATNAME[p.cat] + ' · demonstration product';
    $('#d-name').textContent = p.name; $('#d-sub').textContent = p.sub;
    var art = $('#d-art'); art.textContent = ''; var s = bottle(p.col, p.cat === 'wine'); while (s.firstChild) art.appendChild(s.firstChild);
    var fl = $('#d-flav'); fl.textContent = '';
    p.f.forEach(function (v, i) {
      var li = el('li'), n = el('span', null, AX[i]), bar = el('span', 'bar'), fill = el('i'); fill.style.setProperty('--v', 0); bar.appendChild(fill);
      bar.setAttribute('role', 'img'); bar.setAttribute('aria-label', AX[i] + ' ' + v + ' out of 5'); li.appendChild(n); li.appendChild(bar); fl.appendChild(li);
      requestAnimationFrame(function () { requestAnimationFrame(function () { fill.style.setProperty('--v', v / 5); }); });
    });
    var pr = $('#d-pair'); pr.textContent = ''; p.pair.forEach(function (x) { pr.appendChild(el('li', null, x)); });
    $('#d-all').textContent = '[allergen information to be supplied by the producer and verified before it is shown]';
    $('#d-note').textContent = 'Demonstration only. Nothing is added, stored, charged or sent. Collection and shipping rules, and delivery limits for alcohol, are still to be confirmed.';
    if (focus) detail.focus({ preventScroll: window.matchMedia('(min-width: 62rem)').matches });
  }
  if (grid) {
    $$('.tab', tabs).forEach(function (t) { t.addEventListener('click', function () { setCat(t.dataset.cat); }); });
    tabs.addEventListener('keydown', function (e) {
      var ts = $$('.tab', tabs), i = ts.indexOf(document.activeElement); if (i < 0) return;
      var j = e.key === 'ArrowRight' ? (i + 1) % ts.length : e.key === 'ArrowLeft' ? (i + ts.length - 1) % ts.length : e.key === 'Home' ? 0 : e.key === 'End' ? ts.length - 1 : -1;
      if (j >= 0) { e.preventDefault(); setCat(ts[j].dataset.cat, true); }
    });
    grid.addEventListener('click', function (e) { var b = e.target.closest('.card'); if (!b) return; showDetail(P.filter(function (p) { return p.id === b.dataset.id; })[0], e.detail === 0); });
    $$('[data-pick]').forEach(function (a) { a.addEventListener('click', function () { setCat(a.dataset.pick); }); });
    $('#add').addEventListener('click', function () {
      if (!cur_) { $('#d-note').textContent = 'Pick a product first. Demonstration only.'; return; }
      basket++; $('#bn').textContent = basket; var how = ($('input[name="how"]:checked') || {}).value || 'Click and collect';
      $('#d-note').textContent = 'Demo only: ' + cur_.name + ' (' + how + ') counted on this page. Nothing is added to a real basket, nothing is charged, and nothing is stored.';
    });
    setCat('beer'); showDetail(P[0], false);
    if (HAS && Sig.drinks) Sig.drinks.init($('#shop'), grid);
    var tg = $('#pour-toggle');
    if (tg) {
      var setTog = function (on) { tg.setAttribute('aria-pressed', on); tg.textContent = 'Pouring animation: ' + (on ? 'on' : 'off'); if (HAS) Sig.drinks.setMotion(on); };
      setTog(!calm);
      tg.addEventListener('click', function () { setTog(tg.getAttribute('aria-pressed') !== 'true'); });
    }
  }

  /* ---------- flavour finder ---------- */
  var ranked = $('#ranked');
  function rank() {
    if (!ranked) return;
    var want = [+$('#f-sweet').value, +$('#f-bit').value, +$('#f-fruit').value];
    var list = P.map(function (p) { var d = 0; for (var i = 0; i < 3; i++) d += Math.abs(p.f[i] - want[i]); return { p: p, m: Math.round(100 - d / 15 * 100) }; })
      .sort(function (a, b) { return b.m - a.m; }).slice(0, 3);
    ranked.textContent = '';
    list.forEach(function (x) {
      var li = el('li'); li.appendChild(bottle(x.p.col, x.p.cat === 'wine'));
      var mid = el('div'); mid.appendChild(el('b', null, x.p.name)); mid.appendChild(el('p', 't', CATNAME[x.p.cat] + ' · sample entry')); li.appendChild(mid);
      li.appendChild(el('span', 'm', x.m + '%')); ranked.appendChild(li);
    });
    $('#f-out').textContent = 'Closest sample drink: ' + list[0].p.name + ', ' + list[0].m + ' percent match on sample data.';
  }
  ['#f-sweet', '#f-bit', '#f-fruit'].forEach(function (s) { var n = $(s); if (n) n.addEventListener('input', rank); });
  rank();

  /* ---------- deli ---------- */
  var DELI = [
    ['Cheese', 'Wedges and rounds'], ['Cured meats and pies', 'Ready to slice or eat'], ['Oatcakes and bread', 'Something to carry it'],
    ['Chutneys and preserves', 'For the board'], ['Sweet treats', 'Shortbread and the like'], ['Hamper bits', 'Mix and match']
  ];
  var counter = $('#counter');
  if (counter) DELI.forEach(function (d, i) {
    var li = el('li'), b = el('button', 'dcard'); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
    b.appendChild(el('b', null, d[0])); b.appendChild(el('span', null, d[1])); li.appendChild(b); counter.appendChild(li);
    b.addEventListener('click', function () {
      $$('.dcard', counter).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      $('#deli-note').textContent = d[0] + ' (proposed category): a real page would list each product, its allergens, and a drink from the shop to go with it. Stock and wording to be supplied.';
    });
  });

  /* ---------- services ---------- */
  var stabs = $('#svc-tabs');
  function svc(id, focus) {
    $$('.tab', stabs).forEach(function (t) { var on = t.dataset.i === id; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
    $$('.sp').forEach(function (p) { var on = p.id === 'sp-' + id; p.classList.toggle('on', on); p.hidden = !on; });
  }
  if (stabs) {
    $$('.tab', stabs).forEach(function (t) { t.addEventListener('click', function () { svc(t.dataset.i); }); });
    stabs.addEventListener('keydown', function (e) {
      var ts = $$('.tab', stabs), i = ts.indexOf(document.activeElement); if (i < 0) return;
      var j = e.key === 'ArrowRight' ? (i + 1) % ts.length : e.key === 'ArrowLeft' ? (i + ts.length - 1) % ts.length : e.key === 'Home' ? 0 : e.key === 'End' ? ts.length - 1 : -1;
      if (j >= 0) { e.preventDefault(); svc(ts[j].dataset.i, true); }
    });
  }
  function ccUpdate() {
    var d = $('input[name="ccd"]:checked'), t = $('input[name="cct"]:checked'); if (!d || !t) return;
    $('#cc-out').textContent = 'Demo slot: ' + d.value + ', ' + t.value + '. Nothing is booked. Real slots, opening hours and till stock sync are to be confirmed.';
  }
  $$('input[name="ccd"], input[name="cct"]').forEach(function (i) { i.addEventListener('change', ccUpdate); });
  var hp = $('#hp');
  if (hp) hp.addEventListener('change', function (e) {
    var boxes = $$('input', hp), on = boxes.filter(function (b) { return b.checked; });
    if (on.length > 3) { e.target.checked = false; on = boxes.filter(function (b) { return b.checked; }); $('#hp-out').textContent = 'Three is the sample limit. Hamper size rules are to be agreed.'; return; }
    $('#hp-out').textContent = on.length ? 'Sample hamper: ' + on.map(function (b) { return b.value; }).join(', ') + '. Contents, packaging and pricing are to be agreed. Nothing is ordered.' : 'Nothing chosen yet. Hamper contents, packaging and pricing are to be agreed.';
  });
  function rentUpdate() {
    var f = $('#r-from').value, t = $('#r-to').value, o = $('#r-out');
    if (!f || !t) { o.textContent = 'Pick both dates to see the wording. No availability, deposit or charge exists.'; return; }
    o.textContent = t < f ? 'The end date is before the start date. Choose again.' : 'Sample wording: dates from ' + f + ' to ' + t + '. This is not a booking. What is rented, availability, deposits and how usage is charged are all to be confirmed.';
  }
  ['#r-from', '#r-to'].forEach(function (s) { var n = $(s); if (n) n.addEventListener('change', rentUpdate); });
  var mt = $('#m-toggle');
  if (mt) mt.addEventListener('click', function () { var on = mt.getAttribute('aria-pressed') !== 'true'; mt.setAttribute('aria-pressed', on); mt.textContent = on ? 'Hide the signed-in view' : 'Preview a signed-in view'; $('#member').hidden = !on; });
})();
