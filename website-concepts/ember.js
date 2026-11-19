/* Salt & Ember behaviour. Without this file the page is complete: the opening is the poster photograph with the name
   in plain cream, the menu shows the first course, and the booking demo is hidden (a form that books nothing needs a
   script to say so). */
(function () {
  'use strict';
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  /* the opening: footage if it exists, the photograph if not */
  var scene = $('#fire'), stage = $('#stage'), plate = $('#fire-plate'), name = $('.name');
  var slot = window.Footage ? window.Footage.mount(plate) : null;
  if (slot) slot.listeners.push(function (what) {
    var t = $('#fire-tag');
    if (what === 'layout' && slot.layout === 'wide') stage.classList.add('wide');
    if (what === 'live') { stage.classList.add('footage'); if (t) t.textContent = 'Concept footage'; }
    if (what === 'poster') { stage.classList.remove('footage'); if (slot.layout !== 'wide') stage.classList.remove('wide'); if (t) t.textContent = 'Generated concept image'; }
  });
  /* in the wide scene the fire is on the right, so the name reads the brightness of the right hand side only */
  if (slot) window.Footage.light(slot, function (v) { stage.style.setProperty('--heat', Math.max(0, Math.min(1, (v - 0.12) / 0.35)).toFixed(3)); }, slot.plate.getAttribute('data-layout') === 'wide' ? { x: 0.45, y: 0, w: 0.55, h: 1 } : null);

  /* ignition starts once fonts are ready (and, if footage is loading, once it can play, or after a short wait) */
  function nameWidth() { if (name) name.style.setProperty('--nw', Math.round(name.getBoundingClientRect().width) + 'px'); }
  var started = false;
  function go() { if (started) return; started = true; nameWidth(); stage.classList.add('go'); }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { requestAnimationFrame(function () { setTimeout(go, slot && slot.video && slot.state !== 'poster' ? 0 : 150); }); });
  setTimeout(go, 1300);
  window.addEventListener('resize', nameWidth);

  /* the hand-off from fire to food: one number, 0 to 1, drives the name, the plate and the dark that arrives */
  if (!calm) {
    var ticking = false;
    var upd = function () {
      ticking = false;
      var r = scene.getBoundingClientRect(), total = scene.offsetHeight - stage.offsetHeight;
      var p = total > 0 ? Math.max(0, Math.min(1, -r.top / total)) : 0;
      scene.style.setProperty('--p', p.toFixed(3));
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
    window.addEventListener('resize', upd); upd();
  }

  /* section words warm up as they arrive */
  $$('.warm').forEach(function (el) {
    var words = el.textContent.replace(/\s+/g, ' ').trim().split(' ');
    el.textContent = '';
    words.forEach(function (w, i) {
      var s = document.createElement('span'); s.className = 'w'; s.style.setProperty('--i', i); s.textContent = w; el.appendChild(s); if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  });
  if (!calm && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: 0.35 });
    $$('.warm').forEach(function (e) { io.observe(e); });
  } else { $$('.warm').forEach(function (e) { e.classList.add('in'); }); }

  /* the menu: choose a course, the photograph follows. Tap, mouse hover, keyboard focus and arrow keys all work. */
  var COURSES = [
    { t: 'To start', d: 'Small plates to share while you decide what comes next.' },
    { t: 'From the fire', d: 'The big plates, cooked over coals and put in the middle of the table.' },
    { t: 'To drink', d: 'Wine, beer and something without alcohol.' },
    { t: 'Something sweet', d: 'One last thing before you go.' }
  ];
  var tabs = $$('.tab'), imgs = $$('#pplate img'), panel = $('#panel');
  function sel(i, focus) {
    tabs.forEach(function (t, k) { t.setAttribute('aria-selected', k === i); t.tabIndex = k === i ? 0 : -1; });
    imgs.forEach(function (m, k) { m.classList.toggle('on', k === i); if (k === i) m.loading = 'eager'; });
    $('#ptitle').textContent = COURSES[i].t; $('#pdesc').textContent = COURSES[i].d; panel.setAttribute('aria-labelledby', 't' + i);
    if (focus) tabs[i].focus({ preventScroll: true });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { sel(i, false); });
    t.addEventListener('focus', function () { sel(i, false); });
    if (fine) t.addEventListener('pointerenter', function () { sel(i, false); });
    t.addEventListener('keydown', function (e) {
      var n = tabs.length, k = i;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') k = (i + 1) % n; else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') k = (i - 1 + n) % n; else if (e.key === 'Home') k = 0; else if (e.key === 'End') k = n - 1; else return;
      e.preventDefault(); sel(k, true);
    });
  });

  /* booking demonstration: nothing is sent, booked or kept */
  var f = $('#res');
  if (f) f.addEventListener('submit', function (e) {
    e.preventDefault();
    $('#r-sum').textContent = 'Day: ' + ($('#r-day').value || 'not chosen') + '. Party: ' + $('#r-n').value + '. Name: ' + ($('#r-name').value || 'not given') + '. In a live site this would reach the restaurant. Here it goes nowhere.';
    $('#r-stamp').classList.add('on'); $('#r-out').focus();
  });
})();
