/* The Long Pour. Vanilla JS, no dependencies.
   1. Pint stage: six photo frames (full to empty) fixed behind the page. Approach copied from the preview's pint.js:
      only opacity animates, eased blend, frame 1 loads first and the rest when idle, -sm files on small screens,
      reduced motion = one still full pint, paused while the tab is hidden, plain dark stage if the images fail.
   2. Level gauge and caption percentages follow the same blended position.
   3. "Fill it up again": scrolls back to the top (eased, interruptible) and the glass refills as it goes.
   TEMPORARY: the frames are AI-generated stand-ins; replace the files, same names, to change them. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var doc = document.documentElement; doc.classList.add('js');
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MEDIA = '../../site/assets/media/';

  /* ---------- toast ---------- */
  var toastEl = $('#toast'), toastT;
  function toast(msg) { if (!toastEl) return; toastEl.textContent = msg; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 2800); }

  /* ---------- header: Shop dropdown, mobile menu ---------- */
  var tabs = $('#tabs'), menuBtn = $('#menubtn');
  if (menuBtn && tabs) menuBtn.addEventListener('click', function () {
    var o = tabs.classList.toggle('is-open'); menuBtn.setAttribute('aria-expanded', o); menuBtn.firstElementChild.textContent = o ? 'Close' : 'Menu';
  });
  $$('[data-mega]').forEach(function (b) {
    var panel = document.getElementById(b.getAttribute('aria-controls'));
    function set(open) { b.setAttribute('aria-expanded', open); panel.hidden = !open; }
    b.addEventListener('click', function (e) { e.stopPropagation(); set(panel.hidden); });
    document.addEventListener('click', function (e) { if (!panel.hidden && !panel.contains(e.target) && e.target !== b) set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { set(false); b.focus(); } });
    panel.addEventListener('focusout', function (e) { if (e.relatedTarget && !panel.contains(e.relatedTarget) && e.relatedTarget !== b) set(false); });
  });
  /* links to pages this concept does not have: say so instead of jumping to the top */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href="#"]'); if (!a) return;
    e.preventDefault(); toast(a.hasAttribute('data-placeholder') ? 'Link to be added by the shop.' : 'This page is not part of the concept.');
    if (tabs && tabs.classList.contains('is-open')) menuBtn.click();
  });
  /* in-page links close the mobile menu */
  $$('a[href^="#"]').forEach(function (a) { if (a.getAttribute('href').length > 1) a.addEventListener('click', function () { if (tabs && tabs.classList.contains('is-open')) menuBtn.click(); }); });

  /* ---------- basket count (demo) ---------- */
  var n = 0, cartn = $('#cartn'), cartbtn = $('.cartbtn');
  $$('[data-add]').forEach(function (b) {
    b.addEventListener('click', function () {
      n++; cartn.textContent = n; cartbtn.setAttribute('aria-label', 'Basket, ' + n + (n === 1 ? ' item' : ' items'));
      toast('Added ' + b.getAttribute('data-add') + ' (sample).');
    });
  });

  /* ---------- newsletter (demo) ---------- */
  var nl = $('#nl');
  if (nl) nl.addEventListener('submit', function (e) {
    e.preventDefault(); var s = $('#nl-status'), em = $('#nl-email');
    if (!em.value || !em.checkValidity()) { s.className = 'status err'; s.textContent = 'Please enter a valid email address.'; em.focus(); return; }
    if (!nl.consent.checked) { s.className = 'status err'; s.textContent = 'Please tick the box so we know you want to hear from us.'; return; }
    s.className = 'status'; s.textContent = 'Thanks. This is a demo, so nothing has been sent or stored.'; nl.reset();
  });

  /* ---------- reveals (once) ---------- */
  var rv = $$('.rv, .drop');
  if (reduced || !('IntersectionObserver' in window)) rv.forEach(function (el) { el.classList.add('in'); });
  else {
    var io = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }); }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    rv.forEach(function (el) { io.observe(el); });
  }

  /* ---------- hero film: plays only while visible, never in reduced motion ---------- */
  var film = $('#film');
  if (film) {
    if (reduced) { film.removeAttribute('autoplay'); }
    else if ('IntersectionObserver' in window) {
      var vis = true;
      var vio = new IntersectionObserver(function (es) { vis = es[0].isIntersecting; sync(); }); vio.observe(film);
      var sync = function () { if (vis && !document.hidden) { var p = film.play(); if (p && p.catch) p.catch(function () {}); } else film.pause(); };
      document.addEventListener('visibilitychange', sync);
    } else { var pp = film.play(); if (pp && pp.catch) pp.catch(function () {}); }
  }

  /* ---------- the pint ---------- */
  var box = $('#pint'), meter = $('.drain-level i'), gauge = $('.drain-level'), pct = $('#pct');
  var N = 6, frames = [], ready = [], pos = 0, target = 0, raf = 0;
  var small = matchMedia('(max-width: 900px), (pointer: coarse) and (orientation: portrait)').matches; /* phone files are cropped to the middle of the frame */
  function level(l) { /* l: 1 full .. 0 empty */
    l = Math.max(0, Math.min(1, l));
    if (meter) meter.style.transform = 'scaleY(' + l.toFixed(3) + ')';
    if (gauge) gauge.setAttribute('data-pct', Math.round(l * 100));
    if (pct) pct.textContent = Math.round(l * 100) + '%';
  }
  level(1);
  function fail() { box.dataset.state = 'fallback'; }
  function make(i) {
    var im = new Image(); im.alt = ''; im.decoding = 'async'; im.draggable = false; im.style.opacity = i === 0 ? '1' : '0';
    im.addEventListener('load', function () { ready[i] = true; box.appendChild(im); order(); if (i === 0) { box.dataset.state = 'ready'; request(); } });
    im.addEventListener('error', function () { ready[i] = false; if (i === 0) fail(); });
    im.src = MEDIA + 'beer-' + (i + 1) + (small ? '-sm' : '') + '.webp';
    frames[i] = im;
  }
  function order() { frames.forEach(function (f, i) { if (ready[i]) f.style.zIndex = i; }); }
  function progress() { var m = doc.scrollHeight - innerHeight; return m > 0 ? Math.min(1, Math.max(0, scrollY / m)) : 0; }
  function sm(t) { return t * t * t * (t * (t * 6 - 15) + 10); } /* smootherstep: each frame settles before the next arrives */
  function paint() {
    level(1 - pos / (N - 1)); /* the gauge works even if the photos did not load */
    var avail = []; for (var i = 0; i < N; i++) if (ready[i]) avail.push(i);
    if (!avail.length) return;
    var x = pos / (N - 1) * (avail.length - 1), a = Math.min(Math.max(avail.length - 2, 0), Math.floor(x)), f = avail.length > 1 ? x - a : 0;
    for (var k = 0; k < avail.length; k++) {
      var o = k <= a ? 1 : (k === a + 1 ? sm(Math.max(0, Math.min(1, f))) : 0);
      if (avail.length === 1) o = 1;
      frames[avail[k]].style.opacity = String(o);
    }
  }
  function tick() {
    raf = 0; if (document.hidden) return;
    target = progress() * (N - 1);
    pos += (target - pos) * .12; /* the level settles like a liquid; it never jumps */
    if (Math.abs(target - pos) < .002) pos = target; else raf = requestAnimationFrame(tick);
    paint();
  }
  function request() { if (!raf && !document.hidden) raf = requestAnimationFrame(tick); }

  if (box) {
    make(0); /* frame 1 first */
    var foot = $('.foot'), g = $('.gauge');
    if (g && foot && 'IntersectionObserver' in window) new IntersectionObserver(function (es) { g.style.visibility = es[0].isIntersecting ? 'hidden' : ''; }).observe(foot);
    if (!reduced) { /* reduced motion: one still, full pint and a static gauge */
      var later = function () { for (var i = 1; i < N; i++) make(i); };
      if ('requestIdleCallback' in window) requestIdleCallback(later, { timeout: 2500 }); else setTimeout(later, 800);
      addEventListener('scroll', request, { passive: true }); addEventListener('resize', request);
      document.addEventListener('visibilitychange', function () { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else request(); });
      request();
    }
  }

  /* ---------- Fill it up again ---------- */
  var refill = $('#refill'), anim = 0;
  function stop() { if (anim) { cancelAnimationFrame(anim); anim = 0; } ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (t) { removeEventListener(t, stop); }); }
  function landed() { var top = document.getElementById('top'); if (top) top.focus({ preventScroll: true }); if (toastEl) toast('Topped up.'); }
  if (refill) refill.addEventListener('click', function () {
    if (reduced) { scrollTo(0, 0); landed(); return; }
    stop();
    var from = scrollY, dist = from, dur = Math.min(2200, Math.max(900, dist * .22)), t0 = performance.now();
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (t) { addEventListener(t, stop, { passive: true }); });
    (function step(now) {
      var t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 3); /* ease-out */
      scrollTo(0, from * (1 - e));
      if (t < 1) anim = requestAnimationFrame(step); else { stop(); landed(); }
    })(t0);
  });
})();
