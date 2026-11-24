/* Jack O'Beers concept: Wake Jack. Vanilla JS, no network.
   State lives on <html>: class "asleep" (the dark curtain is showing) or data-room="<id>" (one shop room is showing).
   Every move between states is an in-page swap that updates the URL hash, moves focus to the new heading and works from the keyboard.
   TEMPORARY STAND-IN: Jack is the supplied logo (framed sign), rotated and slid with the Web Animations API (transform and opacity only).
   Supplied logo animations plug in at wake() and slide(). */
(function () {
  'use strict';
  var root = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var ROOMS = ['shop', 'deli', 'collect', 'shipping', 'about', 'find', 'newsletter', 'members'];
  var EASE = 'cubic-bezier(.23, 1, .32, 1)'; /* ease-out, never ease-in */
  var curtain = $('#curtain'), jackBtn = $('#jack'), runner = $('#runner'), live = $('#live'), toastEl = $('#toast');
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var canAnimate = typeof Element.prototype.animate === 'function';
  var busy = false;

  function reduced() { return mq.matches || !canAnimate; }
  function isAsleep() { return root.classList.contains('asleep'); }
  function current() { return root.getAttribute('data-room') || ''; }
  function roomEl(id) { return document.getElementById(id); }
  function say(msg) { if (live) { live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 30); } }
  var toastT;
  function toast(msg) { if (!toastEl) return; toastEl.textContent = msg; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 3000); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function done(anim) { return anim.finished.catch(function () {}); }

  /* ---------- shared bits: nav state, hash, focus, reveals ---------- */
  function markNav(id) {
    $$('[data-nav]').forEach(function (n) { if (n.getAttribute('data-nav') === id) n.setAttribute('aria-current', 'true'); else n.removeAttribute('aria-current'); });
  }
  function setHash(id) {
    var url = id ? '#' + id : location.pathname + location.search;
    if ((id && location.hash === '#' + id) || (!id && !location.hash)) return;
    try { history.pushState(null, '', url); } catch (e) { /* file:// or sandbox: the page still works without a hash */ }
  }
  function focusHeading(id, el) {
    var h = el || $('#' + id + '-h'); if (!h) return;
    h.focus({ preventScroll: true });
  }
  function revealNow(scope) {
    $$('.rv', scope).forEach(function (n) { var r = n.getBoundingClientRect(); if (r.top < window.innerHeight && r.bottom > 0) { n.classList.add('nt', 'in'); } });
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    $$('.rv').forEach(function (n) { io.observe(n); });
  } else { $$('.rv').forEach(function (n) { n.classList.add('in'); }); }

  /* Pin an element where it is on screen so it can slide away without changing layout. */
  function pin(el) {
    var r = el.getBoundingClientRect();
    el.classList.add('is-leaving');
    el.style.cssText = 'position:fixed;top:' + r.top + 'px;left:0;width:' + r.width + 'px;height:' + r.height + 'px;margin:0;z-index:40;overflow:hidden;';
  }
  function unpin(el) { el.style.cssText = ''; el.classList.remove('is-leaving'); }

  /* Jack on the run: a fixed, decorative copy of the sign. */
  function runnerSlideY() { return Math.max(80, window.innerHeight - runner.offsetHeight - Math.max(16, window.innerHeight * 0.1)); }

  /* The headbutt: Jack enters from the left edge and pushes `el` off to the right while the page underneath is revealed. 700 ms, ease-out. */
  function slide(el, y, tilt) {
    var W = window.innerWidth + 30, jw = runner.offsetWidth;
    runner.hidden = false;
    var a = el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(' + W + 'px)' }], { duration: 700, easing: EASE, fill: 'forwards' });
    var b = runner.animate([
      { transform: 'translate(' + (-jw + 8) + 'px,' + y + 'px) rotate(' + tilt + 'deg)' },
      { transform: 'translate(' + (W - jw + 8) + 'px,' + y + 'px) rotate(' + tilt + 'deg)' }
    ], { duration: 700, easing: EASE, fill: 'forwards' });
    return Promise.all([done(a), done(b)]).then(function () {
      var f = runner.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-out', fill: 'forwards' });
      return done(f).then(function () { runner.getAnimations().forEach(function (x) { x.cancel(); }); runner.hidden = true; el.getAnimations().forEach(function (x) { x.cancel(); }); });
    });
  }

  function arrive(id, el, opts) {
    markNav(id);
    setHash(id);
    focusHeading(id);
    say((opts && opts.msg) || (($('#' + id + '-h') || {}).textContent || id));
    if (opts && opts.scrollTo) scrollToTarget(opts.scrollTo);
    busy = false;
  }
  function scrollToTarget(name) {
    var t = document.getElementById(name); if (!t) return;
    t.scrollIntoView({ behavior: mq.matches ? 'auto' : 'smooth', block: 'start' });
    t.focus({ preventScroll: true });
  }

  /* ---------- room to room ---------- */
  function goRoom(id, scrollTo) {
    var from = roomEl(current()), to = roomEl(id);
    if (!to) return;
    if (from === to) { markNav(id); if (scrollTo) scrollToTarget(scrollTo); else { window.scrollTo(0, 0); focusHeading(id); } setHash(id); return; }
    busy = true; setHash(id);
    if (reduced()) {
      root.setAttribute('data-room', id); window.scrollTo(0, 0);
      to.classList.remove('fade-in'); void to.offsetWidth; to.classList.add('fade-in');
      revealNow(to);
      setTimeout(function () { to.classList.remove('fade-in'); }, 260);
      arrive(id, to, { scrollTo: scrollTo }); return;
    }
    pin(from);
    root.setAttribute('data-room', id);
    window.scrollTo(0, 0);
    revealNow(to);
    slide(from, runnerSlideY(), 7).then(function () { unpin(from); arrive(id, to, { scrollTo: scrollTo }); });
  }

  /* ---------- asleep to awake: the signature ---------- */
  function wake(id, scrollTo) {
    id = id || 'shop';
    busy = true; setHash(id);
    var sr = jackBtn.getBoundingClientRect();
    var onShow = window.scrollY < 8 && sr.bottom > 0 && sr.top < window.innerHeight && sr.width > 0;
    if (reduced()) {
      root.classList.remove('asleep'); root.setAttribute('data-room', id); window.scrollTo(0, 0);
      var to = roomEl(id); to.classList.add('fade-in'); revealNow(to); setTimeout(function () { to.classList.remove('fade-in'); }, 260);
      arrive(id, to, { scrollTo: scrollTo, msg: 'Jack is awake. ' + $('#' + id + '-h').textContent }); return;
    }
    pin(curtain);
    root.classList.remove('asleep'); root.setAttribute('data-room', id);
    window.scrollTo(0, 0);
    revealNow(roomEl(id));
    var y = runnerSlideY(), jw, seq;
    runner.hidden = false; jw = runner.offsetWidth;
    if (onShow) {
      /* 1. he gets up: rotate from lying to upright with a small overshoot, a little hop on the way */
      y = sr.top;
      jackBtn.style.visibility = 'hidden';
      var x0 = sr.left;
      var up = runner.animate([
        { transform: 'translate(' + x0 + 'px,' + y + 'px) rotate(-90deg)', offset: 0 },
        { transform: 'translate(' + x0 + 'px,' + (y - 10) + 'px) rotate(8deg)', offset: .62, easing: EASE },
        { transform: 'translate(' + x0 + 'px,' + y + 'px) rotate(0deg)', offset: 1 }
      ], { duration: 420, easing: EASE, fill: 'forwards' });
      seq = done(up).then(function () {
        /* 2. he winds back: leans away, then backs off the left edge to take a run-up */
        var wind = runner.animate([
          { transform: 'translate(' + x0 + 'px,' + y + 'px) rotate(0deg)', offset: 0 },
          { transform: 'translate(' + (x0 + 18) + 'px,' + y + 'px) rotate(-9deg)', offset: .3, easing: EASE },
          { transform: 'translate(' + (-jw + 8) + 'px,' + y + 'px) rotate(-3deg)', offset: 1 }
        ], { duration: 360, easing: EASE, fill: 'forwards' });
        return done(wind);
      }).then(function () { runner.getAnimations().forEach(function (x) { x.cancel(); }); });
    } else { seq = Promise.resolve(); }
    /* 3. the headbutt: the dark curtain is shoved sideways off screen, 700 ms, ease-out */
    seq.then(function () { return slide(curtain, y, 7); }).then(function () {
      unpin(curtain); jackBtn.style.visibility = ''; jackBtn.classList.remove('standing');
      arrive(id, roomEl(id), { scrollTo: scrollTo, msg: 'Jack is awake. ' + $('#' + id + '-h').textContent });
    });
  }

  /* ---------- awake to asleep ---------- */
  function sleep() {
    busy = true;
    window.scrollTo(0, 0);
    root.classList.add('asleep', 'returning');
    markNav('');
    var after = function () {
      root.classList.remove('returning'); root.removeAttribute('data-room'); setHash('');
      jackBtn.focus({ preventScroll: true }); say('Jack is asleep.'); busy = false;
    };
    if (reduced()) { curtain.classList.add('fade-in'); setTimeout(function () { curtain.classList.remove('fade-in'); }, 260); after(); return; }
    /* the room stays visible underneath while the curtain slides back in from the right, then Jack lies down */
    jackBtn.classList.add('standing');
    var c = curtain.animate([{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }], { duration: 560, easing: EASE });
    done(c).then(function () {
      var lie = jackBtn.firstElementChild.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(-90deg)' }], { duration: 320, easing: EASE });
      jackBtn.classList.remove('standing');
      return done(lie);
    }).then(after);
  }

  /* ---------- one router for every link and button ---------- */
  function go(id, opts) {
    opts = opts || {};
    if (busy) return;
    if (opts.filter) applyFilter(opts.filter);
    if (isAsleep()) wake(id, opts.scroll); else goRoom(id, opts.scroll);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]'); if (!a) return;
    if (a.hasAttribute('data-placeholder') || a.getAttribute('href') === '#') { e.preventDefault(); toast('That link is still to be added.'); return; }
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    var id = a.getAttribute('href').slice(1);
    if (ROOMS.indexOf(id) < 0) return;
    e.preventDefault(); closeMenus();
    go(id, { filter: a.getAttribute('data-filter'), scroll: a.getAttribute('data-scroll') });
  });
  var wakeBtn = $('#wake');
  function wakeNow() { if (!busy && isAsleep()) wake('shop'); }
  wakeBtn.addEventListener('click', wakeNow);
  jackBtn.addEventListener('click', wakeNow);
  $('#sleep').addEventListener('click', function () { if (!busy && !isAsleep()) sleep(); });

  /* back and forward: swap instantly, no shove */
  window.addEventListener('popstate', function () {
    if (busy) return;
    var h = location.hash.slice(1);
    if (ROOMS.indexOf(h) > -1) { root.classList.remove('asleep'); root.setAttribute('data-room', h); markNav(h); revealNow(roomEl(h)); window.scrollTo(0, 0); focusHeading(h); }
    else { root.classList.add('asleep'); root.removeAttribute('data-room'); markNav(''); window.scrollTo(0, 0); }
  });
  window.addEventListener('pageshow', function () { markNav(current()); });
  markNav(current());
  if (current()) revealNow(roomEl(current()));

  /* ---------- header menus ---------- */
  var tabs = $('#tabs'), menuBtn = $('#menubtn'), mega = $('[data-mega]'), panel = $('#mega-shop');
  function setMega(open) { mega.setAttribute('aria-expanded', open); panel.hidden = !open; }
  function closeMenus() {
    setMega(false);
    if (tabs.classList.contains('is-open')) { tabs.classList.remove('is-open'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.firstElementChild.textContent = 'Menu'; }
  }
  menuBtn.addEventListener('click', function () { var o = tabs.classList.toggle('is-open'); menuBtn.setAttribute('aria-expanded', o); menuBtn.firstElementChild.textContent = o ? 'Close' : 'Menu'; });
  mega.addEventListener('click', function (e) { e.stopPropagation(); setMega(panel.hidden); });
  document.addEventListener('click', function (e) { if (!panel.hidden && !panel.contains(e.target) && !mega.contains(e.target)) setMega(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (!panel.hidden) { setMega(false); mega.focus(); } else if (tabs.classList.contains('is-open')) { closeMenus(); menuBtn.focus(); } }
  });
  panel.addEventListener('focusout', function (e) { if (e.relatedTarget && !panel.contains(e.relatedTarget) && e.relatedTarget !== mega) setMega(false); });
  $('#search').addEventListener('click', function () { toast('Search is not built in this concept.'); });
  $('#basket').addEventListener('click', function () { toast('Basket and Shopify checkout are not connected in this concept.'); });

  /* ---------- the shelf: filter and add to basket ---------- */
  var cards = $$('#cards .card'), count = $('#count'), fbtns = $$('[data-f]');
  function applyFilter(f) {
    if (f !== 'all' && !fbtns.some(function (b) { return b.getAttribute('data-f') === f; })) f = 'all';
    var n = 0;
    cards.forEach(function (c) {
      var show = f === 'all' ? c.hasAttribute('data-feat') : c.getAttribute('data-c') === f;
      c.hidden = !show; if (show) { n++; c.classList.add('in'); }
    });
    fbtns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-f') === f ? 'true' : 'false'); });
    count.textContent = 'Showing ' + n + ' of ' + cards.length + ' sample products';
  }
  fbtns.forEach(function (b) { b.addEventListener('click', function () { applyFilter(b.getAttribute('data-f')); }); });
  applyFilter('all');
  var basket = 0;
  $$('[data-add]').forEach(function (b) {
    b.addEventListener('click', function () {
      basket++;
      $$('[data-count]').forEach(function (n) { n.textContent = basket; });
      $('#basket').setAttribute('aria-label', 'Basket, ' + basket + (basket === 1 ? ' item' : ' items'));
      toast('Added to basket: ' + b.getAttribute('data-add') + ' (sample)');
    });
  });

  /* ---------- newsletter (demo only) ---------- */
  var form = $('#nl');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var st = $('[data-status]', form), em = form.elements.email, co = form.elements.consent;
    st.className = ''; st.textContent = '';
    if (!em.value || !em.checkValidity()) { st.className = 'err'; st.textContent = 'Please enter a valid email address.'; em.focus(); return; }
    if (!co.checked) { st.className = 'err'; st.textContent = 'Please tick the box so we know you are happy to hear from us.'; co.focus(); return; }
    st.className = 'ok'; st.textContent = 'Thank you. (Demonstration only: nothing was sent or stored.)'; form.reset();
  });
})();
