/* Jack O'Beers concept: Keg to Bottle. Vanilla JS, no network.
   1. The beer line (signature): scroll position pushes amber down the pipe; each stop lights as the fill arrives.
   2. Header menu, reveals, sample shelf, basket count, demo newsletter. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- toast ---------- */
  var toastEl = $('#toast'), toastT = 0;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 2600); }
  $$('[data-todo]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); toast('Concept only: this page or link is not built yet.'); }); });

  /* ---------- header: mobile menu and Shop dropdown ---------- */
  var menubtn = $('#menubtn'), tabs = $('#tabs'), mb = $('[data-mega]'), mega = $('#mega-shop');
  menubtn.addEventListener('click', function () { var o = tabs.classList.toggle('is-open'); menubtn.setAttribute('aria-expanded', o); });
  function megaSet(open) { mega.hidden = !open; mb.setAttribute('aria-expanded', String(open)); }
  mb.addEventListener('click', function () { megaSet(mega.hidden); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (!mega.hidden) { megaSet(false); mb.focus(); } else if (tabs.classList.contains('is-open')) { tabs.classList.remove('is-open'); menubtn.setAttribute('aria-expanded', 'false'); menubtn.focus(); } } });
  document.addEventListener('click', function (e) { if (!mega.hidden && !e.target.closest('#mega-shop, [data-mega]')) megaSet(false); });
  $$('#tabs a').forEach(function (a) { a.addEventListener('click', function () { megaSet(false); tabs.classList.remove('is-open'); menubtn.setAttribute('aria-expanded', 'false'); }); });

  /* ---------- skip links and in-page jumps: move focus to the target so keyboard users land there ---------- */
  $$('a[href^="#"]:not([href="#"])').forEach(function (a) {
    a.addEventListener('click', function () {
      var t = document.getElementById(a.getAttribute('href').slice(1)); if (!t) return;
      if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
      setTimeout(function () { try { t.focus({ preventScroll: true }); } catch (x) { t.focus(); } }, 0);
    });
  });

  /* ---------- reveals (once, 0.7s) ---------- */
  var rv = $$('.rv');
  if (reduced || !('IntersectionObserver' in window)) rv.forEach(function (n) { n.classList.add('in'); });
  else {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    rv.forEach(function (n) { io.observe(n); });
  }

  /* ---------- hero video: still when motion is reduced, paused when off-screen ---------- */
  var vid = $('.hero video');
  if (vid) {
    if (reduced) { vid.removeAttribute('autoplay'); vid.pause(); }
    else if ('IntersectionObserver' in window) {
      var inV = true, sync = function () { if (inV && !document.hidden) { var p = vid.play(); if (p && p.catch) p.catch(function () {}); } else vid.pause(); };
      new IntersectionObserver(function (es) { inV = es[0].isIntersecting; sync(); }, { threshold: 0.05 }).observe($('.hero'));
      document.addEventListener('visibilitychange', sync);
    }
  }

  /* ---------- THE BEER LINE ----------
     Real object: a draught line from keg to tap. Liquid is pushed down it as the user scrolls.
     Fill length follows the scroll position at an anchor line 60% down the viewport. The length is eased the way
     pint.js eases the pint (pos += (target - pos) * .12 per frame), so it settles like a liquid and never jumps.
     Only transform is animated: scaleY on the fill, translateY on the head dot. */
  var jn = $('#journey-in'), fill = $('.pipe-fill'), head = $('.pipe-head'), stops = $$('.stop'), joints = stops.map(function (s) { return $('.joint', s); });
  var flow = $('#flow'), flowI = $('#flow-i'), flowName = $('#flow-name'), flowBar = $('#flow-bar');
  var ANCHOR = 0.6, ys = [], top = 0, H = 1, base = 0, pos = null, raf = 0, shown = -1, inView = false;

  function measure() {
    var jr = jn.getBoundingClientRect(); base = jr.top + window.scrollY;
    var cs = joints.map(function (j) { var r = j.getBoundingClientRect(); return r.top + r.height / 2 - jr.top; });
    top = cs[0]; H = Math.max(1, cs[cs.length - 1] - cs[0]);
    ys = cs.map(function (c) { return c - top; });
    jn.style.setProperty('--pt', top.toFixed(1) + 'px'); jn.style.setProperty('--ph', H.toFixed(1) + 'px');
  }
  function targetPos() { var t = window.scrollY + window.innerHeight * ANCHOR - (base + top); return Math.max(-40, Math.min(H + 40, t)); }
  function setCount(n) {
    if (n === shown) return; shown = n;
    stops.forEach(function (s, i) { s.classList.toggle('lit', reduced || i < n); });
    if (n > 0) { flowI.textContent = n; flowName.textContent = stops[n - 1].getAttribute('data-name'); flowBar.style.transform = 'scaleX(' + (n / stops.length).toFixed(3) + ')'; }
    flow.classList.toggle('on', n > 0 && inView);
  }
  function paint() {
    var p = Math.max(0, Math.min(H, pos)), n = 0;
    if (!reduced) { fill.style.transform = 'scaleY(' + (p / H).toFixed(4) + ')'; head.style.transform = 'translateY(' + p.toFixed(1) + 'px)'; }
    for (var i = 0; i < ys.length; i++) if (pos >= ys[i] - 0.5) n = i + 1;
    setCount(n);
  }
  function tick() {
    raf = 0; if (document.hidden) return;
    var t = targetPos();
    if (pos === null || reduced) pos = t; else pos += (t - pos) * 0.12;
    var settled = Math.abs(t - pos) < 0.4; if (settled) pos = t;
    paint();
    if (!settled) raf = requestAnimationFrame(tick);
  }
  function request() { if (!raf && !document.hidden) raf = requestAnimationFrame(tick); }

  if (jn && fill && stops.length) {
    measure();
    if (reduced) stops.forEach(function (s) { s.classList.add('lit'); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { inView = es[0].isIntersecting; flow.classList.toggle('on', inView && shown > 0); }, { rootMargin: '-10% 0px -5% 0px' }).observe(jn);
    addEventListener('scroll', request, { passive: true });
    addEventListener('resize', function () { measure(); request(); });
    if (window.ResizeObserver) new ResizeObserver(function () { measure(); request(); }).observe(jn);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); request(); });
    addEventListener('load', function () { measure(); request(); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) request(); });
    request();
  }

  /* ---------- sample shelf ---------- */
  var P = [
    { id: 'amber-ale', t: 'Demo Amber Ale', d: 'Malty and rounded, easy to share.', b: 'A copper-coloured ale with a toasty malt middle and a gentle bitter finish.', g: ['Demo cheddar', 'Demo pork pie'], p: 3.8 },
    { id: 'dark-stout', t: 'Demo Dark Stout', d: 'Dark, roasty and smooth.', b: 'Deep and dark with roasted coffee and cocoa notes, full-bodied but smooth.', g: ['Demo smoked cheese', 'Demo chocolate'], p: 4.2 },
    { id: 'pale-lager', t: 'Demo Pale Lager', d: 'Crisp, light and clean.', b: 'Pale gold and refreshing with a clean, dry finish. A good all-rounder.', g: ['Demo oatcakes', 'Demo cheddar'], p: 3.5 },
    { id: 'dry-cider', t: 'Demo Dry Cider', d: 'Sharp, clean and apple-led.', b: 'Made from apples, with a sharp, dry, almost wine-like finish. Lovely chilled.', g: ['Demo pork pie', 'Demo chutney'], p: 3.9 },
    { id: 'red-wine', t: 'Demo Red', d: 'Soft and rounded.', b: 'Soft and easy-drinking, with ripe red fruit and gentle tannins.', g: ['Demo cured meat', 'Demo hard cheese'], p: 11 },
    { id: 'keg-amber', t: 'Demo Amber Ale, keg', d: 'For parties and pubs at home.', b: 'The amber ale in a keg. Size, deposit, tap hire and delivery to be confirmed.', g: ['Ask the shop'], p: 72 },
    { id: 'hamper-beer', t: 'Demo Beer Hamper', d: 'A selection of beers with something to eat.', b: 'A boxed selection of beers with something to eat alongside. Contents to be agreed.', g: ['Contents to be agreed'], p: 34 },
    { id: 'hamper-deli', t: 'Demo Deli Hamper', d: 'Deli favourites for sharing.', b: 'A hamper of deli favourites made for sharing. Contents to be agreed.', g: ['Contents to be agreed'], p: 42 }
  ];
  var money = function (n) { return '£' + n.toFixed(2); };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var list = $('#cards');
  list.innerHTML = P.map(function (x) {
    return '<li class="pcard"><div class="slot" role="img" aria-label="Photo to be supplied">Photo to be supplied</div><div class="pcard-b"><span class="chip">Sample</span><h3>' + esc(x.t) + '</h3><p class="desc">' + esc(x.d) + '</p><p class="blurb">' + esc(x.b) + '</p><p class="goes"><b>Goes with:</b> ' + esc(x.g.join(', ')) + '</p></div>' +
      '<div class="pcard-f"><p class="price">' + money(x.p) + '<small>Sample price</small></p><button class="btn dk sm" type="button" data-add="' + x.id + '">Add to basket<span class="vh">: ' + esc(x.t) + '</span></button></div></li>';
  }).join('');

  /* ---------- basket (in memory, demo) ---------- */
  var cart = {}, cartBtn = $('#cartbtn'), cartN = $('#cartn'), dlg = $('#basket');
  function cartTotals() { var c = 0, s = 0; Object.keys(cart).forEach(function (k) { c += cart[k]; var pr = P.filter(function (x) { return x.id === k; })[0]; s += pr.p * cart[k]; }); return { c: c, s: s }; }
  function renderCart() {
    var t = cartTotals(); cartN.textContent = t.c; $('#cartw').textContent = t.c === 1 ? ' item' : ' items';
    var ul = $('#bk-lines');
    ul.innerHTML = Object.keys(cart).length ? Object.keys(cart).map(function (k) { var pr = P.filter(function (x) { return x.id === k; })[0]; return '<li><span>' + esc(pr.t) + ' &times; ' + cart[k] + '</span><b>' + money(pr.p * cart[k]) + '</b></li>'; }).join('') : '<li><span>Nothing in the basket yet.</span></li>';
    $('#bk-total').textContent = money(t.s);
  }
  list.addEventListener('click', function (e) {
    var b = e.target.closest('[data-add]'); if (!b) return; var id = b.getAttribute('data-add');
    cart[id] = (cart[id] || 0) + 1; renderCart();
    var pr = P.filter(function (x) { return x.id === id; })[0]; toast('Added ' + pr.t + ' to your basket (sample).');
  });
  cartBtn.addEventListener('click', function () { renderCart(); if (dlg.showModal) dlg.showModal(); });
  $('#bk-close').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  renderCart();

  /* ---------- newsletter (demo only) ---------- */
  var form = $('#nlform'), st = $('#nl-status');
  form.addEventListener('submit', function (e) {
    e.preventDefault(); var em = form.elements.email, ok = form.elements.consent.checked;
    st.classList.remove('err');
    if (!em.value || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em.value)) { st.classList.add('err'); st.textContent = 'Please enter a valid email address.'; em.focus(); return; }
    if (!ok) { st.classList.add('err'); st.textContent = 'Please tick the box to agree to receive emails.'; return; }
    st.textContent = 'Thanks. This is a demo, so nothing was sent or saved.'; form.reset();
  });
})();
