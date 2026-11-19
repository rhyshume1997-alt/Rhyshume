/* Home page: the featured concepts. Without this file every band is complete: poster, text, links. The small demonstrations
   need the script and say so by being inert without it. Nothing here sends, stores or books anything. */
(function () {
  'use strict';
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saver = !!(navigator.connection && navigator.connection.saveData);
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  /* ---- moving previews: play in view, pause out of view, the button always wins ---- */
  function load(v) { if (v.dataset.loaded) return; v.dataset.loaded = '1'; ['webm', 'mp4'].forEach(function (t) { var s = document.createElement('source'); s.src = v.getAttribute('data-' + t); s.type = 'video/' + t; v.appendChild(s); }); v.load(); }
  function label(btn, name, playing) { btn.setAttribute('aria-pressed', playing ? 'true' : 'false'); btn.setAttribute('aria-label', (playing ? 'Pause' : 'Play') + ' the moving preview of ' + name); btn.firstElementChild.textContent = playing ? 'Pause' : 'Play'; }
  $$('.ft').forEach(function (ft) {
    var v = $('.mv', ft), btn = $('.mv-btn', ft), name = ($('h3', ft) || {}).textContent || 'this concept'; if (!v || !btn) return;
    var chosen = null;
    function play() { load(v); var p = v.play(); if (p && p.catch) p.catch(function () { label(btn, name, false); }); label(btn, name, true); }
    btn.addEventListener('click', function () { if (v.paused) { chosen = true; play(); } else { chosen = false; v.pause(); label(btn, name, false); } });
    if (!calm && !saver && 'IntersectionObserver' in window) new IntersectionObserver(function (es) { var on = es[0].isIntersecting; if (chosen === false) return; if (on) play(); else if (!v.paused) { v.pause(); label(btn, name, false); } }, { threshold: 0.4 }).observe(ft);
    document.addEventListener('visibilitychange', function () { if (document.hidden && !v.paused) { v.pause(); label(btn, name, false); } });
  });

  /* ---- Sunny Hours: a week planner. Pick an activity, then a slot. Tap, click or keyboard. ---- */
  var sun = $('#ft-sunny-hours');
  if (sun) {
    var cur = '', sum = $('.sp-sum', sun);
    function count() { var n = $$('.sp-slot.on', sun).length; sum.textContent = (cur ? cur + ' is picked. Choose a slot. ' : 'Pick an activity, then a slot. ') + n + (n === 1 ? ' session' : ' sessions') + ' chosen.'; }
    $$('.sp-tile', sun).forEach(function (t) { t.addEventListener('click', function () { cur = cur === t.dataset.a ? '' : t.dataset.a; $$('.sp-tile', sun).forEach(function (x) { x.setAttribute('aria-pressed', x.dataset.a === cur ? 'true' : 'false'); }); count(); }); });
    $$('.sp-slot', sun).forEach(function (s) { s.addEventListener('click', function () {
      var on = s.classList.contains('on');
      if (on && (!cur || s.dataset.a === cur)) { s.classList.remove('on'); delete s.dataset.a; s.firstElementChild.textContent = 'Empty'; s.setAttribute('aria-label', s.dataset.day + ', activity ' + s.dataset.n + ', empty'); }
      else if (cur) { s.classList.add('on'); s.dataset.a = cur; s.firstElementChild.textContent = cur; s.setAttribute('aria-label', s.dataset.day + ', activity ' + s.dataset.n + ', ' + cur); }
      else { sum.textContent = 'Pick an activity first, then choose a slot.'; return; }
      count();
    }); });
    $('[data-act="sp-clear"]', sun).addEventListener('click', function () { $$('.sp-slot', sun).forEach(function (s) { s.classList.remove('on'); delete s.dataset.a; s.firstElementChild.textContent = 'Empty'; s.setAttribute('aria-label', s.dataset.day + ', activity ' + s.dataset.n + ', empty'); }); count(); });
  }

  /* ---- Little Kettle: flip tiles ---- */
  var kt = $('#ft-little-kettle');
  if (kt) {
    var ksum = $('.kt-sum', kt), tiles = $$('.kt-tile', kt);
    function kcount() { var n = tiles.filter(function (t) { return t.getAttribute('aria-pressed') === 'true'; }).length; ksum.textContent = 'Eight tiles in the full concept. Turn a tile over to see a sample special. ' + n + ' turned.'; }
    function setTile(t, on) { t.setAttribute('aria-pressed', on ? 'true' : 'false'); $('.kt-sr', t).textContent = on ? ' Sample special: ' + t.dataset.back : ' Turn over to see the special.'; }
    tiles.forEach(function (t) { t.addEventListener('click', function () { setTile(t, t.getAttribute('aria-pressed') !== 'true'); kcount(); }); });
    $('[data-act="kt-all"]', kt).addEventListener('click', function () { tiles.forEach(function (t) { setTile(t, true); }); kcount(); });
    $('[data-act="kt-back"]', kt).addEventListener('click', function () { tiles.forEach(function (t) { setTile(t, false); }); kcount(); });
  }

  /* ---- Bright Circuit: breakers ---- */
  var bc = $('#ft-bright-circuit');
  if (bc) {
    var say = { 1: 'Fault finding: tracing a problem to the circuit and the cause.', 2: 'Lighting: new fittings, dimmers and outdoor lights.', 3: 'Sockets and units: extra sockets and consumer unit work.' };
    var bsum = $('.bc-sum', bc);
    function bupd() { var on = $$('.bc-sw button', bc).filter(function (b) { return b.getAttribute('aria-checked') === 'true'; }).map(function (b) { return say[b.dataset.i]; }); bsum.textContent = on.length ? on.join(' ') : 'All three circuits are off. Flip a switch to power it.'; }
    $$('.bc-sw button', bc).forEach(function (b) { b.addEventListener('click', function () {
      var on = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', on ? 'true' : 'false'); $('i', b).textContent = on ? 'On' : 'Off';
      $('#bc-p' + b.dataset.i).classList.toggle('on', on); $('#bc-n' + b.dataset.i).classList.toggle('on', on); bupd();
    }); });
    $('[data-act="bc-call"]', bc).addEventListener('click', function () { $('.bc-call', bc).textContent = 'In the concept this would dial the business. Nothing is called here.'; });
  }

  /* ---- The Corner Shelf: filter, look closer, a demonstration basket ---- */
  var sh = $('#ft-corner-shelf');
  if (sh) {
    var objs = $$('.sh-obj', sh), name = $('.sh-name', sh), price = $('.sh-price', sh), turn = $('.sh-turn', sh), add = $('.sh-add', sh), bk = $('.sh-basket', sh), sel = null, basket = 0;
    $$('.sh-chips button', sh).forEach(function (c) { c.addEventListener('click', function () {
      $$('.sh-chips button', sh).forEach(function (x) { x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
      var f = c.dataset.f, shown = 0; objs.forEach(function (o) { var show = f === 'all' || o.dataset.cat === f; o.hidden = !show; if (show) shown++; });
      if (sel && sel.hidden) { sel.setAttribute('aria-pressed', 'false'); sel = null; name.textContent = 'Choose an object to look closer.'; price.textContent = ''; turn.hidden = true; add.hidden = true; }
      bk.textContent = 'Showing ' + shown + ' of 6 objects. Basket: ' + basket + (basket === 1 ? ' item' : ' items') + '. Demonstration only, no payment.';
    }); });
    objs.forEach(function (o) { o.addEventListener('click', function () {
      if (sel) { sel.setAttribute('aria-pressed', 'false'); sel.classList.remove('sh-turned'); } sel = o; o.setAttribute('aria-pressed', 'true');
      name.textContent = o.dataset.name; price.textContent = '[price to be confirmed]'; turn.hidden = false; add.hidden = false;
    }); });
    turn.addEventListener('click', function () { if (sel) { sel.classList.toggle('sh-turned'); name.textContent = sel.dataset.name + (sel.classList.contains('sh-turned') ? ', turned over' : ''); } });
    add.addEventListener('click', function () { if (!sel) return; basket++; bk.textContent = 'Basket: ' + basket + (basket === 1 ? ' item' : ' items') + '. Added ' + sel.dataset.name + '. Demonstration only, no payment.'; });
  }
})();
