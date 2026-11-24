/* Jack O'Beers: full-screen scroll-drain background from six photo frames (beer-1 full ... beer-6 empty).
   TEMPORARY: the frames are AI-generated stand-ins, not shop photography. Replace the files, same names, to change them.
   Only opacity is animated. Frame 1 loads at once; frames 2-6 load when the browser is idle. If frame 1 fails, the generated beer (beer.js) takes over. */
(function () {
  'use strict';
  var box = document.querySelector('.pint'); if (!box) return;
  var meter = document.querySelector('.drain-level i'), gauge = document.querySelector('.drain-level');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var small = window.matchMedia('(pointer: coarse), (max-width: 700px)').matches;
  var N = 6, frames = [], ready = [], pos = 0, target = 0, raf = 0, base = 'assets/media/beer-';

  function fail() { box.hidden = true; box.dataset.state = 'fallback'; if (window.JO_startBeerShader) window.JO_startBeerShader(); }
  function make(i) {
    var im = new Image(); im.alt = ''; im.decoding = 'async'; im.draggable = false; im.style.opacity = i === 0 ? '1' : '0';
    im.addEventListener('load', function () { ready[i] = true; box.appendChild(im); order(); if (i === 0) { box.dataset.state = 'ready'; request(); } });
    im.addEventListener('error', function () { ready[i] = false; if (i === 0) fail(); });
    im.src = base + (i + 1) + (small ? '-sm' : '') + '.webp';
    frames[i] = im; return im;
  }
  function order() { /* keep frames stacked in order, whatever order they finished loading */ frames.forEach(function (f, i) { if (ready[i]) f.style.zIndex = i; }); }

  function progress() { var m = document.documentElement.scrollHeight - innerHeight; return m > 0 ? Math.min(1, Math.max(0, scrollY / m)) : 0; }
  function sm(t) { return t * t * t * (t * (t * 6 - 15) + 10); } /* smootherstep: each frame settles before the next arrives */
  function paint() {
    var avail = []; for (var i = 0; i < N; i++) if (ready[i]) avail.push(i);
    if (!avail.length) return;
    /* map progress (0..1) onto the frames that actually loaded, so a missing frame never leaves a gap */
    var p = pos / (N - 1) , x = p * (avail.length - 1), a = Math.min(avail.length - 2, Math.floor(x)), f = avail.length > 1 ? x - a : 0;
    for (var k = 0; k < avail.length; k++) {
      var o = k <= a ? 1 : (k === a + 1 ? sm(Math.max(0, Math.min(1, f))) : 0);
      if (avail.length === 1) o = 1;
      frames[avail[k]].style.opacity = String(o);
    }
    var fill = 1 - pos / (N - 1); /* 100% at frame 1, 0% at frame 6 */
    if (meter) meter.style.transform = 'scaleY(' + Math.max(0, Math.min(1, fill)).toFixed(3) + ')';
    if (gauge) gauge.setAttribute('data-pct', Math.round(fill * 100));
  }
  function tick() {
    raf = 0; if (document.hidden) return;
    target = progress() * (N - 1);
    pos += (target - pos) * .12; /* the level settles like a liquid; it never jumps */
    if (Math.abs(target - pos) < .002) pos = target; else raf = requestAnimationFrame(tick);
    paint();
  }
  function request() { if (!raf && !document.hidden) raf = requestAnimationFrame(tick); }

  make(0);
  var foot = document.querySelector('.foot');
  if (gauge && foot && 'IntersectionObserver' in window) new IntersectionObserver(function (es) { gauge.style.visibility = es[0].isIntersecting ? 'hidden' : ''; }).observe(foot); /* gauge steps aside when the footer arrives */
  if (reduced) { /* one still frame, the full pint */ if (meter) meter.style.transform = 'scaleY(1)'; return; }
  var later = function () { for (var i = 1; i < N; i++) make(i); };
  if ('requestIdleCallback' in window) requestIdleCallback(later, { timeout: 2500 }); else setTimeout(later, 800);
  addEventListener('scroll', request, { passive: true }); addEventListener('resize', request);
  window.addEventListener('jo:layout', request);
  document.addEventListener('visibilitychange', function () { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else request(); }); /* no work while the tab is hidden */
})();
