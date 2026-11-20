/* Jack O'Beers signature interaction, Rev 2.
   Reusable SVG components (Bottle, Stream, Glass, Liquid) driven by GSAP, then two uses of them:
     1. Sig.opening(): the opening sequence in the hero scene.
     2. Sig.drinks:   the beer-bottle cursor and per-product pour in the drinks discovery section.
   Everything here is decorative. Information is always in the page; nothing waits for an animation to finish.
   No network calls, no storage. Needs the global `gsap`; without it the page keeps its static markup. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  function S(tag, attrs, parent) { var e = document.createElementNS(NS, tag); if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var Sig = window.Sig = { reduced: calm, motion: !calm, ready: false };
  if (!window.gsap) return;
  var EMPTY = 66;           /* liquid group offset when the glass is empty (glass units) */
  var uid = 0;

  /* ---------------- components ---------------- */

  /* Bottle: separate body, neck, cap and label. Drawn in a 34 x 79 box, then shifted so the PIVOT (the shoulder) is the group's
     origin. That lets GSAP rotate it about the shoulder and place the neck tip exactly. */
  Sig.Bottle = {
    create: function (o) {
      o = o || {}; var k = o.scale || 1;
      var g = S('g', { 'class': 'sig-bottle' });
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

  /* Stream: a line drawn from the neck tip down. draw() grows it from the nozzle, retract() takes the tail down so it stops cleanly. */
  Sig.Stream = {
    create: function () {
      var line = S('line', { 'class': 'sig-stream' });
      var st = { el: line, L: 1 };
      st.aim = function (x, y1, y2) {
        line.setAttribute('x1', x); line.setAttribute('x2', x); line.setAttribute('y1', y1); line.setAttribute('y2', y2);
        st.L = Math.abs(y2 - y1); line.style.strokeDasharray = st.L + ' ' + st.L; line.style.strokeDashoffset = st.L;
      };
      st.hide = function () { line.style.strokeDashoffset = st.L; };
      st.draw = function (d) { return gsap.fromTo(line, { strokeDashoffset: st.L }, { strokeDashoffset: 0, duration: d, ease: 'none' }); };
      st.retract = function (d) { return gsap.to(line, { strokeDashoffset: -st.L, duration: d, ease: 'none' }); };
      st.aim(32, 6, 70);
      return st;
    }
  };

  /* Liquid: the amber fill and its foam head, clipped to the inside of the glass. level 0 is empty, 1 is full. */
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
      var hasFoam = !(o && o.foam === false);
      if (!hasFoam) foam.style.display = 'none';
      gsap.set(liquid, { y: EMPTY });
      gsap.set(foam, { scale: 0, transformOrigin: '30px 20px' });
      return {
        el: clip, liquid: liquid, foam: foam, hasFoam: hasFoam,
        level: function (l) { gsap.set(liquid, { y: EMPTY * (1 - l) }); gsap.set(foam, { scale: hasFoam && l >= 1 ? 1 : 0 }); },
        fill: function (tl, at, dur) { tl.fromTo(liquid, { y: EMPTY }, { y: 0, duration: dur, ease: 'power1.inOut' }, at); return tl; },
        head: function (tl, at, dur) { if (hasFoam) tl.fromTo(foam, { scale: 0 }, { scale: 1, duration: dur, ease: 'power2.out' }, at); return tl; },
        drain: function (dur) { gsap.killTweensOf([liquid, foam]); gsap.to(foam, { scale: 0, duration: dur * 0.5, ease: 'power1.in' }); return gsap.to(liquid, { y: EMPTY, duration: dur, ease: 'power2.inOut' }); }
      };
    }
  };

  /* Glass: outline, liquid and a stream, in a 60 x 80 box. Mouth is at (30, 10). */
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

  function R(theta, x, y) { var a = theta * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return { x: x * c - y * s, y: x * s + y * c }; }
  /* where the pivot must sit so the neck tip lands on W when the bottle is rotated by theta */
  function pivotFor(W, tipLen, theta) { var t = R(theta, 0, -tipLen); return { x: W.x - t.x, y: W.y - t.y }; }

  /* ---------------- 1. the opening ---------------- */
  var scene, stage, T = {}; /* T holds the opening's parts */
  var LOGO = { x: 16, y: 207, w: 156, h: 165 }, COUNTER = 372, GK = 1.9, GX = 214, GY = 225.7, BK = 1.6;
  function buildOpening(svg) {
    stage = svg.querySelector('#sig-stage'); if (!stage) return false;
    while (stage.firstChild) stage.removeChild(stage.firstChild);
    var src = stage.getAttribute('data-logo') || 'jack-logo.png';
    T.logo = S('image', { href: src, x: LOGO.x, y: LOGO.y, width: LOGO.w, height: LOGO.h, preserveAspectRatio: 'xMidYMax meet' }, stage);
    T.logo.setAttribute('role', 'img'); T.logo.setAttribute('aria-label', 'Jack O’Beers and Deli logo');
    var gpos = S('g', { transform: 'translate(' + GX + ' ' + GY + ') scale(' + GK + ')' }, stage);
    T.gwrap = S('g', null, gpos);       /* GSAP animates this wrapper, so the positioning transform above is left alone */
    T.glass = Sig.Glass.create({}); T.gwrap.appendChild(T.glass.el);
    /* neck tip lands just left of the glass centre, a little above the rim, in glass units */
    T.tip = { gx: 33, gy: 3 };
    T.glass.stream.aim(T.tip.gx, T.tip.gy, 70);
    T.bottle = Sig.Bottle.create({ scale: BK });
    T.pose = S('g', { 'class': 'sig-pose' }, stage); T.pose.appendChild(T.bottle.el);
    T.stand = { x: 352, y: COUNTER - T.bottle.bottomLen };
    var W = { x: GX + T.tip.gx * GK, y: GY + T.tip.gy * GK };
    T.pour = pivotFor(W, T.bottle.tipLen, -100); T.pourRot = -100;
    return true;
  }
  function openingFinal() {
    gsap.set(T.logo, { rotation: 0, opacity: 1, svgOrigin: (LOGO.x + LOGO.w) + ' ' + COUNTER });
    T.glass.liquid.level(1); T.glass.stream.hide();
    gsap.set(T.gwrap, { opacity: 1, y: 0 });
    gsap.set(T.pose, { x: T.stand.x, y: T.stand.y, rotation: 0, opacity: 1, svgOrigin: '0 0' });
  }
  function openingTL() {
    var tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
    var pivotLogo = (LOGO.x + LOGO.w) + ' ' + COUNTER;
    /* logo: lying on the counter at an angle, then rises */
    tl.fromTo(T.logo, { rotation: 80, svgOrigin: pivotLogo }, { rotation: 0, svgOrigin: pivotLogo, duration: 1.0, ease: 'power3.out' }, 0);
    /* glass settles in, bottle slides in from the right */
    tl.fromTo(T.gwrap, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45 }, 0.45);
    tl.fromTo(T.pose, { x: 470, y: T.stand.y, rotation: 0, opacity: 0 }, { x: T.stand.x, y: T.stand.y, opacity: 1, duration: 0.5 }, 0.55);
    /* lift and tip towards the glass */
    tl.to(T.pose, { x: T.pour.x, y: T.pour.y, rotation: T.pourRot, duration: 0.55, ease: 'power2.inOut' }, 1.0);
    /* pour: stream, rising level, then a foam head */
    tl.add(T.glass.stream.draw(0.16), 1.45);
    T.glass.liquid.fill(tl, 1.5, 0.8);
    T.glass.liquid.head(tl, 2.0, 0.45);
    tl.add(T.glass.stream.retract(0.2), 2.2);
    /* bottle returns upright */
    tl.to(T.pose, { x: T.stand.x, y: T.stand.y, rotation: 0, duration: 0.55, ease: 'power2.inOut' }, 2.3);
    /* the shop content arrives as the bottle comes back */
    tl.fromTo('.reveal', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, clearProps: 'opacity,transform' }, 1.9);
    return tl;
  }
  Sig.opening = function (svg) {
    var ok = buildOpening(svg);
    var root = document.documentElement;
    if (!ok) { root.classList.remove('sig-wait'); return; }
    openingFinal();
    if (!Sig.motion) { root.classList.remove('sig-wait'); Sig.ready = true; return; }
    var tl = Sig.openingTL = openingTL();
    tl.progress(0);                       /* the first frame is set before the page is shown */
    root.classList.remove('sig-wait');
    tl.play();
    var skip = function () { if (tl.progress() < 1) tl.progress(1); off(); };
    var evs = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    function off() { evs.forEach(function (e) { window.removeEventListener(e, skip); }); }
    evs.forEach(function (e) { window.addEventListener(e, skip, { passive: true }); });
    tl.eventCallback('onComplete', off);
    Sig.ready = true;
  };
  Sig.replay = function () {
    if (!Sig.openingTL) { if (Sig.motion && stage) { Sig.openingTL = openingTL(); } else return; }
    Sig.openingTL.restart();
  };

  /* ---------------- 2. the cursor bottle and card pours ---------------- */
  var D = { active: null, hold: false, mode: '', follow: null, pose: null, svg: null, bottle: null, qx: null, qy: null, qr: null, lx: 0, ly: 0, px: 0, py: 0, shown: false, section: null, grid: null };
  var CK = 0.75, POUR_THETA = 100;

  /* a glass for one product card: mounted into the card's own small svg */
  Sig.cardGlass = function (svg, o) {
    var g = Sig.Glass.create(o || {}); svg.appendChild(g.el); return g;
  };

  function buildCursor() {
    var f = document.createElement('div'); f.className = 'sig-follow'; f.setAttribute('aria-hidden', 'true');
    var svg = S('svg', { width: 2, height: 2, focusable: 'false' }); svg.style.overflow = 'visible';
    var pose = S('g', { 'class': 'sig-pose' }, svg);
    var b = Sig.Bottle.create({ scale: CK }); pose.appendChild(b.el);
    f.appendChild(svg); document.body.appendChild(f);
    D.follow = f; D.svg = svg; D.pose = pose; D.bottle = b;
    gsap.set(f, { x: -200, y: -200, opacity: 0, transformOrigin: '0 0' });
    gsap.set(pose, { svgOrigin: '0 0' });
    mkQ();
  }
  function mkQ() {
    D.qx = gsap.quickTo(D.follow, 'x', { duration: 0.35, ease: 'power3' });
    D.qy = gsap.quickTo(D.follow, 'y', { duration: 0.35, ease: 'power3' });
    D.qr = gsap.quickTo(D.pose, 'rotation', { duration: 0.4, ease: 'power3' });
  }
  function showLayer(on) { gsap.to(D.follow, { opacity: on ? 1 : 0, duration: 0.25, overwrite: 'auto' }); D.shown = on; }
  function follows() { return window.matchMedia('(hover: hover) and (pointer: fine)').matches; }

  /* the pour pose for a card: bottle at the left of its glass, tipped over it */
  function aim(li, duration) {
    var gs = li.querySelector('svg.gl'); if (!gs) return null;
    var r = gs.getBoundingClientRect(), sc = r.width / 60;
    var W = { x: r.left + 33 * sc, y: r.top + 4 * sc };
    var P = pivotFor(W, D.bottle.tipLen, POUR_THETA);
    var fx = gsap.getProperty(D.follow, 'x'), fy = gsap.getProperty(D.follow, 'y');
    gsap.to(D.pose, { x: P.x - fx, y: P.y - fy, rotation: POUR_THETA, svgOrigin: '0 0', duration: duration, ease: 'power2.inOut', overwrite: true });
    var gl = li._glass; if (gl) gl.stream.aim(33, 4, 68);
    return gl;
  }

  function releasePose(done) {
    gsap.to(D.pose, { x: 0, y: 0, rotation: 0, svgOrigin: '0 0', duration: 0.4, ease: 'power2.inOut', overwrite: true, onComplete: function () {
      D.hold = false; mkQ(); if (done) done();
      if (D.pendingHide) { D.pendingHide = false; showLayer(false); } else if (D.mode === 'mouse' && D.shown) { D.qx(D.px + 24); D.qy(D.py + 34); }
    } });
  }

  function staticOn(li) { var gl = li._glass; if (gl) { gl.liquid.level(1); gl.stream.hide(); } }
  function staticOff(li) { var gl = li._glass; if (gl) { gl.liquid.level(0); } }

  function enter(li, mode) {
    if (D.active === li) { if (mode === 'key') D.mode = 'key'; return; }
    var prev = D.active;
    if (prev) leave(prev, true);
    D.active = li; D.mode = mode;
    li.classList.add('on');                           /* information is visible at once, whatever the animation does */
    var gl = li._glass; if (!gl) return;
    if (!Sig.motion) { staticOn(li); return; }
    gsap.killTweensOf([gl.liquid.liquid, gl.liquid.foam, gl.stream.el]);
    if (!D.hold) {
      D.hold = true; gsap.killTweensOf(D.follow, 'x,y'); gsap.killTweensOf(D.pose);
      if (mode === 'touch' || !D.shown) {
        var gr = li.querySelector('svg.gl').getBoundingClientRect();
        gsap.set(D.follow, { x: gr.left - 70, y: gr.top - 40 }); gsap.set(D.pose, { x: 0, y: 0, rotation: 0 });
        showLayer(true);
      }
    }
    showLayer(true);
    aim(li, prev ? 0.4 : 0.5);
    var tl = li._tl = gsap.timeline();
    gl.stream.hide();
    tl.add(gl.stream.draw(0.18), 0.4);
    gl.liquid.fill(tl, 0.46, 0.85);
    gl.liquid.head(tl, 0.95, 0.45);
    tl.add(gl.stream.retract(0.2), 1.1);
    if (mode === 'touch') tl.call(function () { if (D.active === li) { releasePose(function () { showLayer(false); }); } }, null, 1.9);
  }

  function leave(li, switching) {
    if (li._tl) { li._tl.kill(); li._tl = null; }
    li.classList.remove('on');
    var gl = li._glass;
    if (gl) { gl.stream.hide(); if (Sig.motion) gl.liquid.drain(0.35); else staticOff(li); }
    if (D.active === li) D.active = null;
    if (!switching && Sig.motion && D.hold) releasePose(D.mode === 'mouse' ? null : function () { showLayer(false); });
  }

  Sig.drinks = {
    reset: function () { if (D.active) leave(D.active); },
    init: function (section, grid) {
      D.section = section; D.grid = grid;
      buildCursor();
      var lastType = 'mouse';
      var cardOf = function (t) { var li = t && t.closest ? t.closest('.pw') : null; return li && grid.contains(li) ? li : null; };
      window.addEventListener('pointerdown', function (e) { lastType = e.pointerType || 'mouse'; }, { passive: true, capture: true });

      section.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse' && follows() && Sig.motion) { D.px = e.clientX; D.py = e.clientY; if (!D.hold) { gsap.set(D.follow, { x: e.clientX + 24, y: e.clientY + 34 }); } showLayer(true); } });
      section.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { if (D.active) leave(D.active); if (!D.hold) showLayer(false); else D.pendingHide = true; } });
      section.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse' || !follows() || !Sig.motion) return;
        var dx = e.clientX - D.px; D.px = e.clientX; D.py = e.clientY;
        if (!D.shown) showLayer(true);
        if (D.hold) return;
        D.qx(e.clientX + 24); D.qy(e.clientY + 34);
        D.qr(-10 + Math.max(-18, Math.min(18, dx * 1.2)));
      }, { passive: true });

      grid.addEventListener('pointerover', function (e) { if (e.pointerType !== 'mouse') return; if (D.active && D.mode === 'key' && !e.movementX && !e.movementY) return; /* a layout change under a parked mouse must not steal keyboard focus's pour */ var li = cardOf(e.target); if (li) enter(li, 'mouse'); });
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
          if (D.hold && Sig.motion) aim(li, 0.1);
        });
      }, { passive: true });
    },
    setMotion: function (on) {
      Sig.motion = !!on;
      if (D.active) { var li = D.active; D.active = null; leave(li); }
      if (!on && D.follow) { gsap.killTweensOf(D.follow, 'x,y'); gsap.killTweensOf(D.pose); D.hold = false; showLayer(false); }
    }
  };
  Sig.ready = true;
})();
