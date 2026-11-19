/* Olive & Ivory behaviour. Without this file the page is complete and readable: the name is drawn by CSS, the sheet is the
   four photographs, the day is four moments each with its picture, and the reply card is hidden (a form that sends
   nothing needs a script to say so).
   The sheet, the light table and the day are built from data/olive-ivory.json, so adding a photograph means adding
   its files and one entry there. */
(function () {
  'use strict';
  var root = document.documentElement, calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var D = null, FR = [], marks = {}, TARGET = 12;
  var RING = 'M66 18C30 12 10 44 12 80c2 40 28 56 54 50 30-6 36-44 26-76C84 38 66 22 36 32';
  var CROSS = 'M14 20L86 138M86 18L16 140';

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function num(i) { return ('0' + (i + 1)).slice(-2); }
  function picture(f, lazy) { return '<picture><source srcset="img/' + f.file + '.webp" type="image/webp"><img src="img/' + f.file + '.jpg" width="' + f.w + '" height="' + f.h + '" alt="' + esc(f.alt) + '"' + (lazy ? ' loading="lazy"' : '') + '></picture>'; }
  function marksSvg() { return '<svg class="mk mk-keep" viewBox="0 0 100 156" aria-hidden="true"><path pathLength="1" d="' + RING + '"/></svg><svg class="mk mk-pass" viewBox="0 0 100 156" aria-hidden="true"><path pathLength="1" d="' + CROSS + '"/></svg>'; }

  /* ---------- scroll reveals ---------- */
  var io = null;
  function revealSetup() {
    if (calm || !('IntersectionObserver' in window)) return;
    root.classList.add('rv-on');
    io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('.rv, .frames, .ruleg').forEach(function (e) { io.observe(e); });
  }

  /* ---------- the footage slot on the opening ---------- */
  var plate = $('#hero-plate'), open = $('#open'), bg = $('#hero-bg');
  var wideQ = window.matchMedia('(min-width: 56rem)');
  /* phones: the portrait scene lives in the plate, which is also the docking object.
     tablet and desktop: a landscape scene sits behind the opening (its own slot) and the plate stays the portrait photograph. */
  var slot = window.Footage ? window.Footage.mount(plate) : null;
  if (slot) slot.listeners.push(function (what) {
    if (what === 'live') { open.classList.add('footage'); $('#hero-cap').textContent = 'Frame 01. Concept footage.'; measure(); }
    if (what === 'poster') { open.classList.remove('footage'); $('#hero-cap').textContent = 'Frame 01. Generated concept image.'; measure(); }
  });
  var bgSlot = bg && window.Footage ? window.Footage.mount(bg) : null;
  if (bgSlot) bgSlot.listeners.push(function (what) {
    if (what === 'layout' && bgSlot.layout === 'wide') open.classList.add('wide');
    if (what === 'poster' && bgSlot.layout !== 'wide') open.classList.remove('wide');
    measure(); leave();
  });
  /* the landscape scene leaves on its own schedule: it fades and drifts while the plate is still travelling to the sheet */
  function leave() {
    if (calm || !bg || !open.classList.contains('wide') || !wideQ.matches) { open.style.removeProperty('--bgo'); open.style.removeProperty('--bgy'); return; }
    var q = Math.max(0, Math.min(1, window.scrollY / (window.innerHeight * 0.55)));
    open.style.setProperty('--bgo', (1 - q).toFixed(3)); open.style.setProperty('--bgy', (window.scrollY * 0.22).toFixed(1) + 'px');
  }

  /* ---------- the proof sheet ---------- */
  function buildSheet() {
    var ol = $('#frames'); ol.innerHTML = '';
    FR.forEach(function (f, i) {
      var li = el('li', 'cell' + (i === 0 ? ' dock' : ''));
      li.dataset.id = f.id; li.style.setProperty('--k', i);
      li.innerHTML = '<span class="crop a"></span><span class="crop b"></span><button class="film" type="button" data-i="' + i + '" aria-haspopup="dialog" aria-label="Open frame ' + num(i) + ', ' + esc(f.title) + '"><span class="no mono">' + num(i) + '</span>' + picture(f, i > 0) + marksSvg() + '</button>' +
        '<p class="edge mono"><span>&#9656; ' + num(i) + '</span><span>' + num(i) + 'A</span></p><p class="cap2"><span>' + esc(f.title) + '</span><span class="mono">' + esc(f.time) + '</span></p>';
      ol.appendChild(li);
    });
    var missing = Math.max(0, TARGET - FR.length);
    if (missing) {
      var r = el('li', 'reserve-strip'); r.innerHTML = '<b>Frames ' + num(FR.length) + ' to ' + num(TARGET - 1) + ' are not photographed yet</b><span class="mono">' + missing + ' more needed. See the asset manifest.</span>';
      ol.appendChild(r);
    }
    $('#sheet-count').textContent = 'Frames 01 to ' + num(FR.length - 1) + (missing ? ' of ' + TARGET : '');
    $$('.film', ol).forEach(function (b) { b.addEventListener('click', function () { openTable(+b.dataset.i, b); }); });
    if (io) io.observe(ol);
    setMarks();
  }
  function setMarks() {
    $$('.cell[data-id]').forEach(function (c) { var m = marks[c.dataset.id]; if (m) c.dataset.mark = m; else c.removeAttribute('data-mark'); });
    var ul = $('#kept-list'); ul.innerHTML = '';
    FR.forEach(function (f, i) { var m = marks[f.id]; if (!m) return; var li = el('li', m === 'pass' ? 'pass' : '', num(i) + ' ' + esc(f.title) + (m === 'pass' ? ' (passed)' : '')); ul.appendChild(li); });
    $('#kept-none').style.display = Object.keys(marks).length ? 'none' : '';
    $$('#tb-strip button').forEach(function (b, i) { var m = marks[FR[i].id]; if (m) b.dataset.mark = m; else b.removeAttribute('data-mark'); });
    var k = $('#tb-keep'), p = $('#tb-pass'), cur = FR[curIdx]; if (cur) { k.setAttribute('aria-pressed', marks[cur.id] === 'keep'); p.setAttribute('aria-pressed', marks[cur.id] === 'pass'); }
    drawChips();
  }

  /* ---------- the hero becomes the first frame ---------- */
  var S = null, E = null, endY = 1, docked = false;
  function measure() {
    if (calm || !plate) return;
    var first = $('.cell.dock .film'); if (!first) return;
    plate.style.transform = 'none';
    var sy = window.scrollY, r = plate.getBoundingClientRect(), q = first.getBoundingClientRect();
    S = { x: r.left, y: r.top + sy, w: r.width }; E = { x: q.left, y: q.top + sy, w: q.width };
    endY = Math.max(1, E.y - window.innerHeight * 0.6);
    apply();
  }
  function apply() {
    if (!S || !E) return;
    var p = Math.max(0, Math.min(1, window.scrollY / endY));
    var dx = (E.x - S.x) * p, dy = (E.y - S.y) * p, sc = 1 + (E.w / S.w - 1) * p;
    plate.style.transform = p === 0 ? '' : 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(' + sc.toFixed(4) + ')';
    var d = p >= 1;
    if (d !== docked) { docked = d; plate.classList.toggle('docked', d); $('.cell.dock').classList.toggle('docking', !d); }
  }
  var tick = false;
  function onScroll() { if (!tick) { tick = true; requestAnimationFrame(function () { tick = false; apply(); leave(); }); } }

  /* ---------- the light table ---------- */
  var dlg = $('#table'), timg = $('#tb-img'), tpr = $('#tb-pr'), curIdx = 0, lastBtn = null;
  function fillTable(i, dir) {
    var f = FR[i]; curIdx = i;
    timg.width = f.w; timg.height = f.h; timg.src = 'img/' + f.file + '.jpg'; timg.alt = f.alt; tpr.style.setProperty('--ar', f.w + ' / ' + f.h);
    $('#tb-no').textContent = 'Frame ' + num(i) + ' of ' + num(FR.length - 1) + ', ' + f.time; $('#tb-t').textContent = f.title; $('#tb-c').textContent = f.caption;
    $$('#tb-strip button').forEach(function (b, k) { b.setAttribute('aria-current', k === i); });
    var cb = $('#tb-strip button[aria-current="true"]'); if (cb && cb.scrollIntoView) cb.scrollIntoView({ block: 'nearest', inline: 'center' });
    setMarks();
    if (dir && !calm && tpr.animate) tpr.animate([{ opacity: 0, transform: 'translateX(' + (dir * 36) + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 340, easing: 'cubic-bezier(0.23,1,0.32,1)' });
  }
  function buildStrip() {
    var ol = $('#tb-strip'); ol.innerHTML = '';
    FR.forEach(function (f, i) {
      var li = el('li'); var b = el('button', '', '<img src="img/' + f.file + '.jpg" alt="" width="' + f.w + '" height="' + f.h + '">'); b.type = 'button'; b.setAttribute('aria-label', 'Frame ' + num(i) + ', ' + f.title); b.dataset.i = i;
      b.addEventListener('click', function () { fillTable(i, i > curIdx ? 1 : -1); }); li.appendChild(b); ol.appendChild(li);
    });
  }
  function flip(from, reverse) {
    if (calm || !from || !tpr.animate) return null;
    var to = tpr.getBoundingClientRect(); if (!to.width) return null;
    var f = from.getBoundingClientRect(), dx = f.left - to.left, dy = f.top - to.top, sc = f.width / to.width;
    var a = [{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sc + ')', transformOrigin: '0 0' }, { transform: 'none', transformOrigin: '0 0' }];
    return tpr.animate(reverse ? a.reverse() : a, { duration: 560, easing: 'cubic-bezier(0.23,1,0.32,1)', fill: 'both' });
  }
  function openTable(i, btn) {
    lastBtn = btn; fillTable(i, 0);
    if (typeof dlg.showModal !== 'function') return;
    dlg.showModal(); requestAnimationFrame(function () { dlg.classList.add('in'); flip(btn); });
    $('#tb-keep').focus({ preventScroll: true });
  }
  function closeTable() {
    var film = $$('.film')[curIdx], vis = film && film.getBoundingClientRect().bottom > 0 && film.getBoundingClientRect().top < window.innerHeight;
    var a = vis ? flip(film, true) : null; dlg.classList.remove('in');
    setTimeout(function () { if (dlg.open) dlg.close(); if (a) a.cancel(); }, calm ? 0 : (a ? 520 : 240));
  }
  function go(d) { fillTable((curIdx + d + FR.length) % FR.length, d); }
  function mark(kind) { var f = FR[curIdx]; marks[f.id] = marks[f.id] === kind ? null : kind; if (!marks[f.id]) delete marks[f.id]; setMarks(); }

  /* swipe along the roll */
  var sx = 0, dx = 0, sw = false;
  var tp = $('#tb-print');
  tp.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse' && e.button !== 0) return; sw = true; sx = e.clientX; dx = 0; try { tp.setPointerCapture(e.pointerId); } catch (x) { } });
  tp.addEventListener('pointermove', function (e) { if (!sw) return; dx = e.clientX - sx; if (Math.abs(dx) > 6) tpr.style.transform = 'translateX(' + dx * 0.6 + 'px)'; });
  function endSwipe() { if (!sw) return; sw = false; tpr.style.transform = ''; if (Math.abs(dx) > 70) go(dx < 0 ? 1 : -1); else if (Math.abs(dx) > 6 && !calm && tpr.animate) tpr.animate([{ transform: 'translateX(' + dx * 0.6 + 'px)' }, { transform: 'none' }], { duration: 240, easing: 'cubic-bezier(0.23,1,0.32,1)' }); dx = 0; }
  tp.addEventListener('pointerup', endSwipe); tp.addEventListener('pointercancel', endSwipe);

  $('#tb-close').addEventListener('click', closeTable);
  $('#tb-prev').addEventListener('click', function () { go(-1); });
  $('#tb-next').addEventListener('click', function () { go(1); });
  $('#tb-keep').addEventListener('click', function () { mark('keep'); });
  $('#tb-pass').addEventListener('click', function () { mark('pass'); });
  dlg.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } else if (e.key === 'k' || e.key === 'K') mark('keep'); else if (e.key === 'p' || e.key === 'P') mark('pass'); });
  dlg.addEventListener('cancel', function (e) { e.preventDefault(); closeTable(); });
  dlg.addEventListener('close', function () { dlg.classList.remove('in'); if (lastBtn) lastBtn.focus({ preventScroll: true }); });

  /* ---------- the day ---------- */
  function buildDay() {
    var day = $('.day'), stack = $('#stack'), moments = $('#moments');
    if (!('IntersectionObserver' in window) || !stack) return;
    moments.innerHTML = '';
    D.moments.forEach(function (m, i) {
      var f = FR.filter(function (x) { return x.id === m.frame; })[0]; if (!f) return;
      var li = el('li', '', '<p class="clock">' + esc(m.time) + '</p><h3>' + esc(m.title) + '</h3><p>' + esc(m.text) + '</p><figure class="inl">' + picture(f, true) + '</figure>'); li.dataset.f = f.id; li.dataset.i = i; moments.appendChild(li);
    });
    stack.innerHTML = '';
    var lis = $$('li', moments);
    lis.forEach(function (li, k) {
      var f = FR.filter(function (x) { return x.id === li.dataset.f; })[0];
      var pic = el('picture', k === 0 ? 'on' : '', '<source srcset="img/' + f.file + '.webp" type="image/webp"><img src="img/' + f.file + '.jpg" alt="' + esc(f.alt) + '" width="' + f.w + '" height="' + f.h + '"' + (k ? ' loading="lazy"' : '') + '>'); stack.appendChild(pic);
    });
    day.classList.add('seq-on');
    var pics = $$('picture', stack), lab = $('#stack-lab'), tp2 = $('.thread i');
    function active(k) {
      lis.forEach(function (l, j) { l.classList.toggle('on', j === k); }); pics.forEach(function (p, j) { p.classList.toggle('on', j === k); });
      var f = FR.filter(function (x) { return x.id === lis[k].dataset.f; })[0], idx = FR.indexOf(f);
      lab.textContent = 'Frame ' + num(idx) + '. Generated concept image.'; tp2.style.setProperty('--tp', ((k + 1) / lis.length).toFixed(2));
    }
    active(0);
    var mo = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) active(+e.target.dataset.i); }); }, { rootMargin: '-42% 0px -42% 0px', threshold: 0 });
    lis.forEach(function (l) { mo.observe(l); });
  }

  /* ---------- the reply card: four steps, nothing sent or kept ---------- */
  var steps = $$('#rsvp fieldset'), n = 1, form = $('#rsvp');
  function drawChips() {
    var c = $('#chips'); if (!c) return; c.innerHTML = '';
    var kept = FR.filter(function (f) { return marks[f.id] === 'keep'; });
    if (!kept.length) { c.appendChild(el('span', '', 'None kept yet')); return; }
    kept.forEach(function (f) { c.appendChild(el('span', '', num(FR.indexOf(f)) + ' ' + esc(f.title))); });
  }
  function show(k, focus) {
    n = k; steps.forEach(function (f) { f.classList.toggle('on', +f.dataset.s === k); });
    $('#stepno').textContent = 'Step ' + k + ' of 4'; $('#back').hidden = k === 1; $('#nextstep').hidden = k === 4; $('#send').hidden = k !== 4;
    if (k === 3) drawChips();
    if (focus) { var x = $('fieldset.on input, fieldset.on textarea, fieldset.on select', form); if (x) x.focus(); }
  }
  $('#nextstep').addEventListener('click', function () { show(Math.min(4, n + 1), true); });
  $('#back').addEventListener('click', function () { show(Math.max(1, n - 1), true); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var dl = $('#summary'); dl.innerHTML = '';
    var kept = FR.filter(function (f) { return marks[f.id] === 'keep'; }).map(function (f) { return num(FR.indexOf(f)) + ' ' + f.title; }).join(', ');
    [['Date', $('#f-date').value], ['Where', ($('#f-where').value ? $('#f-where').value + ', ' : '') + $('#f-region').value], ['Frames kept', kept || 'None'], ['Names', $('#f-name').value]].forEach(function (r) {
      var dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = r[0]; dd.textContent = r[1] || 'Not given'; dl.appendChild(dt); dl.appendChild(dd);
    });
    form.classList.add('sent'); $('#done').focus();
  });
  $('#again').addEventListener('click', function () { form.reset(); form.classList.remove('sent'); show(1, true); });

  /* ---------- start ---------- */
  function start(data) {
    D = data; FR = data.frames; TARGET = data.target || FR.length;
    buildSheet(); buildStrip(); buildDay();
    if (!calm) { $('.cell.dock').classList.add('docking'); }
    show(1, false); drawChips();
    window.addEventListener('scroll', onScroll, { passive: true });
    var m = function () { measure(); }; window.addEventListener('resize', m); window.addEventListener('orientationchange', m);
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(m);
    window.addEventListener('load', m); setTimeout(m, 600);
  }
  revealSetup();
  fetch('data/olive-ivory.json').then(function (r) { return r.json(); }).then(start).catch(function () { /* the static sheet and day stay as they are */ show(1, false); });
})();
