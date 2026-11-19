/* Salt & Ember proof of concept behaviour. Without this file the page is complete:
   the opening is the still photograph, the menu panel shows the first course, and the reservation is hidden
   because a form that books nothing needs a script to say so. */
(function () {
  'use strict';
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  /* the fire: the photograph, moving, with embers drifting across the whole opening */
  var fire = $('#fire'), plate = $('#fire-plate');
  if (window.Scene) {
    window.Scene.plate(plate, { mode: 'fire', amp: 0.022, grain: 0.04, focus: [0.5, 0.4] });
    window.Scene.embers(fire, {
      origin: function () {
        var s = fire.getBoundingClientRect(), p = plate.getBoundingClientRect();
        return { x: p.left - s.left + p.width * 0.14, y: p.top - s.top + p.height * 0.3, w: p.width * 0.3, h: p.height * 0.2 };
      }
    });
  }

  /* the hand-off from fire to food: as the opening scrolls away the embers die down, the photograph drifts and the
     headline lifts. Only transform and opacity are driven, through one custom property. */
  if (!calm) {
    var ticking = false;
    var upd = function () { ticking = false; var h = fire.offsetHeight || 1, p = Math.max(0, Math.min(1, window.scrollY / (h * 0.9))); fire.style.setProperty('--p', p.toFixed(3)); };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
    upd();
  }

  /* the menu: choose a course, the photograph follows. Works by tap, hover, focus and arrow keys. */
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
    if (focus) tabs[i].focus();
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

  /* reservation demonstration: nothing is sent, booked or kept */
  var f = $('#res');
  if (f) f.addEventListener('submit', function (e) {
    e.preventDefault();
    $('#r-sum').textContent = 'Day: ' + ($('#r-day').value || 'not chosen') + '. Party: ' + $('#r-n').value + '. Name: ' + ($('#r-name').value || 'not given') + '. In a live site this would reach the restaurant. Here it goes nowhere.';
    $('#r-stamp').classList.add('on'); $('#r-out').focus();
  });
})();
