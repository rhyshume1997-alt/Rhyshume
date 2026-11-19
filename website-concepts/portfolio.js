/* Design concepts page. Without this file the page is complete: every concept shows its poster, its text and its notice,
   and the filter chips do nothing (they need the script, so they are only useful with it). */
(function () {
  'use strict';
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saver = !!(navigator.connection && navigator.connection.saveData);
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var exhibits = $$('.ex');

  /* ---- reveals ---- */
  if (!calm && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('rv-on');
    var ro = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); } }); }, { threshold: 0.08, rootMargin: '0px 0px -4% 0px' });
    exhibits.forEach(function (x) { ro.observe(x); });
  }

  /* ---- moving previews: play in view, pause out of view, the button always wins ---- */
  function load(v) {
    if (v.dataset.loaded) return; v.dataset.loaded = '1';
    ['webm', 'mp4'].forEach(function (t) { var s = document.createElement('source'); s.src = v.getAttribute('data-' + t); s.type = 'video/' + t; v.appendChild(s); });
    v.load();
  }
  function setBtn(btn, playing) { btn.setAttribute('aria-pressed', playing ? 'true' : 'false'); var name = (btn.closest('.ex').querySelector('h2') || {}).textContent || 'this concept'; btn.setAttribute('aria-label', (playing ? 'Pause' : 'Play') + ' the moving preview of ' + name); btn.firstElementChild.textContent = playing ? 'Pause' : 'Play'; }
  exhibits.forEach(function (ex) {
    var v = $('video', ex), btn = $('.ex-play', ex); if (!v || !btn) return;
    var chosen = null; /* null: automatic, true or false: the visitor decided */
    function play() { load(v); var p = v.play(); if (p && p.catch) p.catch(function () { setBtn(btn, false); }); setBtn(btn, true); }
    function pause() { v.pause(); setBtn(btn, false); }
    btn.addEventListener('click', function () { if (v.paused) { chosen = true; play(); } else { chosen = false; pause(); } });
    if (!calm && !saver && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { var on = es[0].isIntersecting; if (chosen === false) return; if (on) play(); else if (!v.paused) { v.pause(); setBtn(btn, false); } }, { threshold: 0.45 }).observe(ex);
    }
    document.addEventListener('visibilitychange', function () { if (document.hidden && !v.paused) { v.pause(); setBtn(btn, false); } });
  });

  /* ---- filter ---- */
  var chips = $$('.chip'), count = $('#dc-count');
  function filt(k) {
    var n = 0; exhibits.forEach(function (ex) { var show = k === 'all' || (ex.getAttribute('data-tags') || '').split(' ').indexOf(k) >= 0; ex.hidden = !show; if (show) { n++; ex.classList.add('in'); } });
    chips.forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-filter') === k ? 'true' : 'false'); });
    count.textContent = k === 'all' ? 'Showing all eight' : 'Showing ' + n + ' of 8 concepts with ' + (chips.filter(function (c) { return c.getAttribute('data-filter') === k; })[0].textContent.toLowerCase());
    $$('.dc-index li').forEach(function (li, i) { li.hidden = exhibits[i].hidden; });
  }
  chips.forEach(function (c) { c.addEventListener('click', function () { filt(c.getAttribute('data-filter')); }); });

  /* ---- index follows the page ---- */
  var links = $$('.dc-index a');
  if ('IntersectionObserver' in window && links.length) {
    var spy = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { links.forEach(function (a) { a.setAttribute('aria-current', a.getAttribute('href') === '#' + e.target.id ? 'true' : 'false'); }); } }); }, { rootMargin: '-35% 0px -55% 0px' });
    exhibits.forEach(function (x) { spy.observe(x); });
  }

})();
