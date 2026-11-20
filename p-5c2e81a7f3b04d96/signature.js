/* Jack O'Beers signature interaction, Rev 3 (photographic).
   - Opening: a layered scene. Real (AI-generated reference) pour footage as the plate, the client's logo on a plaque layer that lies on the
     counter and rises. The bottle in the footage always comes in from beyond the frame edge, so nothing floats without a hand.
   - Cursor: a photographic amber bottle cut-out that follows the pointer in the drinks section, with weighted, damped movement.
   - Pour: hovering, focusing or tapping a beer or cider opens a small window onto the same footage. Wine has no footage yet, so it shows information only.
   - Fallback: if the footage cannot play (or ?pour=svg), the Rev 2 drawn pour (components below) is used, clearly temporary.
   Everything is decorative. Information is shown by a class set at once, never after an animation. No network calls except the local media files, no storage. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  function S(tag, attrs, parent) { var e = document.createElementNS(NS, tag); if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var root = document.documentElement;
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saver = !!(navigator.connection && navigator.connection.saveData);
  var forceSvg = /[?&]pour=svg\b/.test(location.search);
  var Sig = window.Sig = { reduced: calm, motion: !calm, ready: false, film: !forceSvg && !saver };
  if (!window.gsap) { root.classList.remove('sig-wait'); return; }
  var EMPTY = 66, uid = 0;
  var tag = document.createElement('video');
  var canFilm = !!(tag.canPlayType && (tag.canPlayType('video/webm; codecs="vp9"') || tag.canPlayType('video/mp4; codecs="avc1.42E01E"')));
  if (!canFilm) Sig.film = false;
  if (!Sig.film) root.classList.add('film-off');

  /* ---------------- components ---------------- */

  /* Bottle. With a photo it is a cut-out image whose pivot (the shoulder) is the group origin, so GSAP rotates it about the shoulder.
     Without one it draws the Rev 2 illustration (kept only for the comparison and the fallback). */
  Sig.Bottle = {
    create: function (o) {
      o = o || {};
      var g = S('g', { 'class': 'sig-bottle' });
      if (o.photo) {
        var H = o.height || 112, W = H * (o.aspect || 0.313), py = H * (o.pivot || 0.27);
        var img = S('image', { 'class': 'sig-photo', href: o.photo, x: -W / 2, y: -py, width: W, height: H, preserveAspectRatio: 'xMidYMid meet' }, g);
        return { el: g, parts: { photo: img }, k: 1, tipLen: py, bottomLen: H - py, width: W };
      }
      var k = o.scale || 1;
      var i = S('g', { transform: 'translate(' + (-17 * k) + ' ' + (-28 * k) + ') scale(' + k + ')' }, g);
      var body = S('path', { 'class': 'sig-body', d: 'M4 72Q4 77 9 77H25Q30 77 30 72V44Q30 32 21 26H13Q4 32 4 44Z' }, i);
      var neck = S('rect', { 'class': 'sig-neck', x: 13, y: 7, width: 8, height: 21, rx: 2 }, i);
      var cap = S('rect', { 'class': 'sig-cap', x: 11.5, y: 3.5, width: 11, height: 5, rx: 2.5 }, i);
      var label = S('g', { 'class': 'sig-label' }, i);
      S('rect', { 'class': 'sig-label-bg', x: 7, y: 47, width: 20, height: 22, rx: 10 }, label);
      S('circle', { 'class': 'sig-label-dot', cx: 17, cy: 58, r: 4 }, label);
      S('path', { 'class': 'sig-shine', d: 'M8 46V68' }, i);
      return { el: g, parts: { body: body, neck: neck, cap: cap, label: label }, k: k, tipLen: 24 * k, bottomLen: 49 * k };
    }
  };

  Sig.Stream = {
    create: function () {
      var line = S('line', { 'class': 'sig-stream' }), st = { el: line, L: 1 };
      st.aim = function (x, y1, y2) { line.setAttribute('x1', x); line.setAttribute('x2', x); line.setAttribute('y1', y1); line.setAttribute('y2', y2); st.L = Math.abs(y2 - y1); line.style.strokeDasharray = st.L + ' ' + st.L; line.style.strokeDashoffset = st.L; };
      st.hide = function () { line.style.strokeDashoffset = st.L; };
      st.draw = function (d) { return gsap.fromTo(line, { strokeDashoffset: st.L }, { strokeDashoffset: 0, duration: d, ease: 'none' }); };
      st.retract = function (d) { return gsap.to(line, { strokeDashoffset: -st.L, duration: d, ease: 'none' }); };
      st.aim(32, 6, 70); return st;
    }
  };

  Sig.Liquid = {
    create: function (clipId, o) {
      var clip = S('g', { 'clip-path': 'url(#' + clipId + ')' });
      var liquid = S('g', { 'class': 'sig-liquid' }, clip);
      var body = S('rect', { 'class': 'sig-beer', x: 0, y: 16, width: 60, height: 70 }, liquid);
      var foam = S('g', { 'class': 'sig-foam' }, liquid);
      [[14, 18, 6], [23, 15, 7], [33, 14, 7.5], [43, 15, 7], [51, 18, 6]].forEach(function (c) { S('circle', { cx: c[0], cy: c[1], r: c[2] }, foam); });
      S('rect', { x: 10, y: 18, width: 42, height: 8 }, foam);
      if (o && o.colour) body.style.fill = o.colour;
      if (o && o.foamColour) foam.style.fill = o.foamColour;
      var hasFoam = !(o && o.foam === false); if (!hasFoam) foam.style.display = 'none';
      gsap.set(liquid, { y: EMPTY }); gsap.set(foam, { scale: 0, transformOrigin: '30px 20px' });
      return {
        el: clip, liquid: liquid, foam: foam, hasFoam: hasFoam,
        level: function (l) { gsap.set(liquid, { y: EMPTY * (1 - l) }); gsap.set(foam, { scale: hasFoam && l >= 1 ? 1 : 0 }); },
        fill: function (tl, at, dur) { tl.fromTo(liquid, { y: EMPTY }, { y: 0, duration: dur, ease: 'power1.inOut' }, at); return tl; },
        head: function (tl, at, dur) { if (hasFoam) tl.fromTo(foam, { scale: 0 }, { scale: 1, duration: dur, ease: 'power2.out' }, at); return tl; },
        drain: function (dur) { gsap.killTweensOf([liquid, foam]); gsap.to(foam, { scale: 0, duration: dur * 0.5, ease: 'power1.in' }); return gsap.to(liquid, { y: EMPTY, duration: dur, ease: 'power2.inOut' }); }
      };
    }
  };

  Sig.Glass = {
    create: function (o) {
      o = o || {}; var id = 'sg' + (++uid);
      var g = S('g', { 'class': 'sig-glass' });
      var defs = S('defs', null, g), cp = S('clipPath', { id: id }, defs);
      S('path', { d: 'M8 10L15 74Q16 77 19 77H41Q44 77 45 74L52 10Z' }, cp);
      var liq = Sig.Liquid.create(id, o); g.appendChild(liq.el);
      var stream = Sig.Stream.create(); g.appendChild(stream.el);
      S('path', { 'class': 'sig-outline', d: 'M8 10L15 74Q16 77 19 77H41Q44 77 45 74L52 10' }, g);
      S('path', { 'class': 'sig-hi', d: 'M16 22L20 64' }, g);
      return { el: g, liquid: liq, stream: stream, mouth: { x: 30, y: 10 } };
    }
  };
  Sig.cardGlass = function (svg, o) { var g = Sig.Glass.create(o || {}); svg.appendChild(g.el); return g; };

  function R(theta, x, y) { var a = theta * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return { x: x * c - y * s, y: x * s + y * c }; }
  function pivotFor(W, tipLen, theta) { var t = R(theta, 0, -tipLen); return { x: W.x - t.x, y: W.y - t.y }; }

  /* ---------------- 1. the opening ---------------- */
  var O = {};
  function openingFinal() {
    gsap.set(O.plaque, { rotationX: 0, y: 0, opacity: 1, clearProps: 'transform' });
    if (O.shadow) gsap.set(O.shadow, { opacity: 0.4, scaleX: 1, clearProps: 'transform' });
  }
  function openingTL() {
    var tl = gsap.timeline({ paused: true });
    /* the plaque lies flat on the counter, then stands up. A perspective tilt, one small settle, no bounce. */
    tl.fromTo(O.plaque, { rotationX: 84, transformPerspective: 900, transformOrigin: '50% 100%', opacity: 1 },
      { rotationX: 0, duration: 1.15, ease: 'power3.out' }, 0.25);
    if (O.shadow) tl.fromTo(O.shadow, { opacity: 0.15, scaleX: 1.25 }, { opacity: 0.4, scaleX: 1, duration: 1.15, ease: 'power3.out' }, 0.25);
    /* a slow camera push over the plate */
    tl.fromTo(O.inner, { scale: 1.06, transformOrigin: "60% 55%" }, { scale: 1, duration: 2.8, ease: "power1.out" }, 0);
    /* the page content arrives while the pour is still running */
    tl.fromTo('.reveal', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, clearProps: 'opacity,transform' }, 1.2);
    return tl;
  }
  Sig.opening = function () {
    O.stage = $('#stage'); O.film = $('#hero-film'); O.plaque = $('#plaque'); O.shadow = $('#plaque-shadow'); O.inner = $('#stage-inner');
    if (!O.stage || !O.plaque) { root.classList.remove('sig-wait'); return; }
    openingFinal();
    var playable = Sig.motion && Sig.film && O.film;
    if (!playable) { var st = $('#stage .still'); if (st) st.src = 'media/pour-poster-end.webp'; root.classList.remove('sig-wait'); Sig.ready = true; return; }
    var tl = Sig.openingTL = openingTL();
    tl.progress(0);
    root.classList.remove('sig-wait');
    /* the still frame is the same first frame as the footage, so starting playback is invisible */
    var started = false;
    O.film.addEventListener('playing', function () { if (!started) { started = true; gsap.set(O.film, { opacity: 1 }); } }, { once: true });
    O.film.addEventListener('error', function () { gsap.set(O.film, { opacity: 0 }); }, { once: true });
    var p = O.film.play(); if (p && p.catch) p.catch(function () { /* autoplay refused: the still stays, nothing breaks */ });
    tl.play();
    var skip = function () { if (tl.progress() < 1) tl.progress(1); off(); };
    var evs = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    function off() { evs.forEach(function (e) { window.removeEventListener(e, skip); }); }
    evs.forEach(function (e) { window.addEventListener(e, skip, { passive: true }); });
    tl.eventCallback('onComplete', off);
    Sig.ready = true;
  };
  Sig.replay = function () {
    if (!Sig.openingTL || !O.film) return;
    gsap.set(O.film, { opacity: 0 }); O.film.currentTime = 0;
    var p = O.film.play(); if (p && p.catch) p.catch(function () {});
    O.film.addEventListener('playing', function () { gsap.set(O.film, { opacity: 1 }); }, { once: true });
    Sig.openingTL.restart();
  };

  /* ---------------- 2. the cursor bottle and the card pours ---------------- */
  var D = { active: null, hold: false, mode: '', follow: null, pose: null, bottle: null, qx: null, qy: null, qr: null, px: 0, py: 0, vx: 0, shown: false, film: false, base: -12, idle: 0 };
  var POUR_THETA = 100, BASE = -12;
  var shared = null;   /* one footage element, moved into whichever card is open, so it is fetched and decoded once */

  function buildCursor() {
    var f = document.createElement('div'); f.className = 'sig-follow'; f.setAttribute('aria-hidden', 'true');
    var svg = S('svg', { width: 2, height: 2, focusable: 'false' }); svg.style.overflow = 'visible';
    var pose = S('g', { 'class': 'sig-pose' }, svg);
    var b = Sig.Bottle.create({ photo: 'media/bottle-amber-sm.webp', height: 104, aspect: 0.3131, pivot: 0.27 }); pose.appendChild(b.el);
    f.appendChild(svg); document.body.appendChild(f);
    D.follow = f; D.pose = pose; D.bottle = b;
    gsap.set(f, { x: -200, y: -200, opacity: 0, transformOrigin: '0 0' });
    gsap.set(pose, { svgOrigin: '0 0', rotation: BASE });
    mkQ();
  }
  /* weighted movement: the position trails the pointer with a long ease, and the bottle swings like something hanging from its neck,
     leaning against the direction of travel and settling back when the pointer stops. No bounce. */
  function mkQ() {
    D.qx = gsap.quickTo(D.follow, 'x', { duration: 0.55, ease: 'power3' });
    D.qy = gsap.quickTo(D.follow, 'y', { duration: 0.55, ease: 'power3' });
    D.qr = gsap.quickTo(D.pose, 'rotation', { duration: 0.8, ease: 'power2' });
  }
  function fade(to, dur, delay) { if (D.fadeT) D.fadeT.kill(); D.fadeT = gsap.to(D.follow, { opacity: to, duration: dur, delay: delay || 0 }); }
  function showLayer(on) { fade(on ? 1 : 0, 0.25); D.shown = on; }
  function follows() { return window.matchMedia('(hover: hover) and (pointer: fine)').matches; }

  /* ----- fallback pour (Rev 2 drawn glass and stream) ----- */
  function aimSvg(li, duration) {
    var gs = li.querySelector('svg.gl'); if (!gs || !D.bottle) return null;
    var r = gs.getBoundingClientRect(), sc = r.width / 60;
    var W = { x: r.left + 33 * sc, y: r.top + 4 * sc };
    var P = pivotFor(W, D.bottle.tipLen, POUR_THETA);
    var fx = gsap.getProperty(D.follow, 'x'), fy = gsap.getProperty(D.follow, 'y');
    gsap.to(D.pose, { x: P.x - fx, y: P.y - fy, rotation: POUR_THETA, svgOrigin: '0 0', duration: duration, ease: 'power2.inOut', overwrite: true });
    var gl = li._glass; if (gl) gl.stream.aim(33, 4, 68); return gl;
  }
  function releasePose(done) {
    gsap.to(D.pose, { x: 0, y: 0, rotation: BASE, svgOrigin: '0 0', duration: 0.5, ease: 'power2.inOut', overwrite: true, onComplete: function () {
      D.hold = false; mkQ(); if (done) done();
      if (D.pendingHide) { D.pendingHide = false; showLayer(false); } else if (D.mode === 'mouse' && D.shown) { D.qx(D.px + 26); D.qy(D.py + 30); }
    } });
  }
  function svgOn(li) { var gl = li._glass; if (gl) { gl.liquid.level(1); gl.stream.hide(); } }
  function svgOff(li) { var gl = li._glass; if (gl) gl.liquid.level(0); }

  /* ----- film windows ----- */
  function sharedVideo() {
    if (shared) return shared;
    var v = document.createElement('video'); v.muted = true; v.defaultMuted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto'; v.loop = false; v.setAttribute('aria-hidden', 'true'); v.tabIndex = -1; v.className = 'reel-video';
    ['webm', 'mp4'].forEach(function (t) { var s = document.createElement('source'); s.src = 'media/pour.' + t; s.type = 'video/' + t; v.appendChild(s); });
    v.addEventListener('error', function () { filmFailed(); }, true);
    shared = v; return v;
  }
  function filmFailed() { Sig.film = false; root.classList.add('film-off'); if (D.active) { var li = D.active; D.active = null; leaveFilm(li); } }
  function openReel(li) {
    var reel = li._reel; if (!reel) return;
    li.classList.add('is-open');
    if (!Sig.motion) { gsap.set(reel, { clipPath: 'inset(0% 0% 0% 0%)' }); return; }   /* static: the still frame shows, no motion */
    var v = sharedVideo(); reel.appendChild(v);
    try { v.currentTime = 0; } catch (e) {}
    gsap.fromTo(reel, { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.5, ease: 'power3.out', overwrite: true });
    var p = v.play(); if (p && p.catch) p.catch(function () {});
  }
  function closeReel(li, instant) {
    var reel = li._reel; if (!reel) return;
    li.classList.remove('is-open');
    var v = shared; if (v && v.parentNode === reel) { v.pause(); }
    if (!Sig.motion || instant) { gsap.set(reel, { clipPath: 'inset(0% 0% 0% 100%)' }); if (v && v.parentNode === reel) reel.removeChild(v); return; }
    gsap.to(reel, { clipPath: 'inset(0% 0% 0% 100%)', duration: 0.3, ease: 'power2.in', overwrite: true, onComplete: function () { if (v && v.parentNode === reel && !li.classList.contains('is-open')) reel.removeChild(v); } });
  }
  function leaveFilm(li) { closeReel(li); }

  function useFilm(li) { return Sig.film && !!li._reel; }

  function enter(li, mode) {
    if (D.active === li) { if (mode === 'key') D.mode = 'key'; return; }
    var prev = D.active; if (prev) leave(prev, true);
    D.active = li; D.mode = mode;
    li.classList.add('on');                           /* information is visible at once, whatever the animation does */
    if (li._none) return;                              /* no footage for this product type yet: information only */
    if (useFilm(li)) {
      openReel(li);
      if (Sig.motion && D.follow && mode !== 'touch') {
        /* hand-off: the cursor bottle tips towards the window and gives way to the filmed bottle, which enters from the frame edge */
        D.film = true; gsap.killTweensOf(D.pose);
        gsap.to(D.pose, { rotation: 78, duration: 0.3, ease: 'power2.in', svgOrigin: '0 0' });
        fade(0, 0.3);
      }
      return;
    }
    /* drawn fallback */
    var gl = li._glass; if (!gl) return;
    if (!Sig.motion) { svgOn(li); return; }
    gsap.killTweensOf([gl.liquid.liquid, gl.liquid.foam, gl.stream.el]);
    if (!D.hold) {
      D.hold = true; gsap.killTweensOf(D.follow, 'x,y'); gsap.killTweensOf(D.pose);
      if (mode === 'touch' || !D.shown) {
        var gr = li.querySelector('svg.gl').getBoundingClientRect();
        gsap.set(D.follow, { x: gr.left - 70, y: gr.top - 40 }); gsap.set(D.pose, { x: 0, y: 0, rotation: BASE });
      }
    }
    showLayer(true); aimSvg(li, prev ? 0.4 : 0.5);
    var tl = li._tl = gsap.timeline(); gl.stream.hide();
    tl.add(gl.stream.draw(0.18), 0.4); gl.liquid.fill(tl, 0.46, 0.85); gl.liquid.head(tl, 0.95, 0.45); tl.add(gl.stream.retract(0.2), 1.1);
    if (mode === 'touch') tl.call(function () { if (D.active === li) releasePose(function () { showLayer(false); }); }, null, 1.9);
  }

  function leave(li, switching) {
    if (li._tl) { li._tl.kill(); li._tl = null; }
    li.classList.remove('on');
    if (li._reel && li.classList.contains('is-open')) closeReel(li);
    var gl = li._glass; if (gl && !useFilm(li)) { gl.stream.hide(); if (Sig.motion) gl.liquid.drain(0.35); else svgOff(li); }
    if (D.active === li) D.active = null;
    if (D.film && !switching) {
      D.film = false;
      if (Sig.motion && D.follow) {
        gsap.to(D.pose, { rotation: BASE, duration: 0.5, ease: 'power2.out', svgOrigin: '0 0', onComplete: mkQ });
        if (follows() && D.shown !== false) fade(1, 0.4, 0.1);
        else if (D.mode === 'touch') D.shown = false;
      }
    }
    if (!switching && Sig.motion && D.hold) releasePose(D.mode === 'mouse' ? null : function () { showLayer(false); });
  }

  Sig.drinks = {
    reset: function () { if (D.active) leave(D.active); if (D.film) { D.film = false; if (D.pose) { gsap.set(D.pose, { rotation: BASE }); mkQ(); } } },
    init: function (section, grid) {
      buildCursor();
      /* warm the footage as the drinks section nears the screen, so the first hover does not wait */
      if (Sig.film && 'IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { sharedVideo().load(); io.disconnect(); } }, { rootMargin: '500px' });
        io.observe(section);
      }
      var lastType = 'mouse';
      var cardOf = function (t) { var li = t && t.closest ? t.closest('.pw') : null; return li && grid.contains(li) ? li : null; };
      window.addEventListener('pointerdown', function (e) { lastType = e.pointerType || 'mouse'; }, { passive: true, capture: true });
      section.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse' && follows() && Sig.motion) { D.px = e.clientX; D.py = e.clientY; if (!D.hold) gsap.set(D.follow, { x: e.clientX + 26, y: e.clientY + 30 }); if (!D.film) showLayer(true); else D.shown = true; } });
      section.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { if (D.active) leave(D.active); if (!D.hold) showLayer(false); else D.pendingHide = true; } });
      section.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse' || !follows() || !Sig.motion) return;
        var dx = e.clientX - D.px; D.px = e.clientX; D.py = e.clientY;
        D.vx = D.vx * 0.6 + dx * 0.4;
        if (!D.shown) showLayer(true);
        if (D.hold) return;
        D.qx(e.clientX + 26); D.qy(e.clientY + 30);
        if (!D.film) {
          D.qr(Math.max(-26, Math.min(16, BASE + D.vx * 1.1)));
          clearTimeout(D.idle); D.idle = setTimeout(function () { if (!D.film && !D.hold) D.qr(BASE); }, 140);
        }
      }, { passive: true });
      grid.addEventListener('pointerover', function (e) { if (e.pointerType !== 'mouse') return; if (D.active && D.mode === 'key' && !e.movementX && !e.movementY) return; var li = cardOf(e.target); if (li) enter(li, 'mouse'); });
      grid.addEventListener('pointerout', function (e) { if (e.pointerType !== 'mouse') return; var li = cardOf(e.target); if (li && !li.contains(e.relatedTarget) && !(li.contains(document.activeElement) && D.mode === 'key')) leave(li); });
      grid.addEventListener('focusin', function (e) { var li = cardOf(e.target); if (li && (!e.target.matches || e.target.matches(':focus-visible'))) enter(li, 'key'); });
      grid.addEventListener('focusout', function (e) { var li = cardOf(e.target); if (li && D.active === li && D.mode === 'key' && !li.contains(e.relatedTarget)) leave(li); });
      grid.addEventListener('click', function (e) { var li = cardOf(e.target); if (li && lastType !== 'mouse') enter(li, 'touch'); });
      var sraf = 0;
      window.addEventListener('scroll', function () {
        if (!D.active || sraf) return;
        sraf = requestAnimationFrame(function () {
          sraf = 0; var li = D.active; if (!li) return;
          var r = li.getBoundingClientRect();
          if (r.bottom < 0 || r.top > innerHeight) { leave(li); return; }
          if (D.hold && Sig.motion && !useFilm(li)) aimSvg(li, 0.1);
        });
      }, { passive: true });
    },
    setMotion: function (on) {
      Sig.motion = !!on;
      if (D.active) { var li = D.active; D.active = null; leave(li); }
      if (!on && D.follow) { gsap.killTweensOf(D.follow, 'x,y'); gsap.killTweensOf(D.pose); D.hold = false; D.film = false; gsap.set(D.pose, { rotation: BASE }); showLayer(false); mkQ(); }
    }
  };
  Sig.ready = true;
})();
