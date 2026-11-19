/* Olive & Ivory proof of concept behaviour. Without this file the page is complete and readable:
   the opening is a still photograph, the sheet is four photographs, the day is four moments with their pictures,
   and the reply card is hidden because a form that cannot send anything needs a script to say so. */
(function () {
  'use strict';
  var root = document.documentElement, calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  var FR = [
    { no: '01', t: 'Getting ready', time: '08:40', b: 'img/oi-03-dress-window', alt: 'A wedding dress hanging in a tall window, daylight through old curtains.', c: 'The room before everyone arrives, and a few minutes that belong only to you.', w: 698, h: 1088 },
    { no: '02', t: 'The details', time: '11:20', b: 'img/oi-02-flowers', alt: 'A bouquet of white roses on a stone sill.', c: 'Flowers, rings, stationery. The small things you spent months choosing.', w: 790, h: 1088 },
    { no: '03', t: 'The vows', time: '14:00', b: 'img/oi-04-rings-vows', alt: 'Two hands joined during the vows, a book open behind.', c: 'Hands, faces and the pause before the words.', w: 664, h: 1088 },
    { no: '04', t: 'Golden hour', time: '18:30', b: 'img/oi-01-couple-walking', alt: 'A couple walking hand in hand through long grass towards a castle, low evening sun.', c: 'Ten minutes away from everyone, with the light low and nothing to organise.', w: 716, h: 1088 }
  ];
  var kept = [];

  /* scroll reveals, only once the script runs and never for reduced motion */
  var rv = $$('.rv, .frames, .ruleg');
  $$('.frame').forEach(function (f, i) { f.style.setProperty('--k', i); });
  if (!calm && 'IntersectionObserver' in window) {
    root.classList.add('rv-on');
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    rv.forEach(function (e) { io.observe(e); });
  }

  /* opening scene: the photograph, moving. Falls back to the still image by itself. */
  if (window.Scene) window.Scene.plate($('#hero-plate'), { mode: 'cloth', amp: 0.0095, grain: 0.03, focus: [0.5, 0.45] });

  /* proof sheet and the expanding print */
  var dlg = $('#print'), pimg = $('#pr-img'), cur = 0, lastBtn = null;
  function setKept() {
    $$('.frame').forEach(function (b, i) { b.classList.toggle('kept', kept.indexOf(i) > -1); });
    var ul = $('#kept-list'); ul.innerHTML = '';
    kept.slice().sort().forEach(function (i) { var li = document.createElement('li'); li.textContent = FR[i].no + ' ' + FR[i].t; ul.appendChild(li); });
    $('#kept-none').style.display = kept.length ? 'none' : '';
    var k = $('#pr-keep'); var on = kept.indexOf(cur) > -1; k.setAttribute('aria-pressed', on); k.textContent = on ? 'Kept. Tap to remove' : 'Keep this moment';
  }
  function fill(i) {
    var f = FR[i]; cur = i; pimg.width = f.w; pimg.height = f.h; pimg.src = f.b + '@2x.webp'; pimg.alt = f.alt;
    $('#pr-no').textContent = 'Frame ' + f.no + ' of 04, ' + f.time; $('#pr-t').textContent = f.t; $('#pr-c').textContent = f.c; setKept();
  }
  function flip(btn) {
    if (calm || !btn) return;
    var from = btn.getBoundingClientRect(), to = $('#pr-fig').getBoundingClientRect(); if (!to.width) return;
    pimg.style.transition = 'none'; pimg.style.transformOrigin = 'top left';
    pimg.style.transform = 'translate(' + (from.left - to.left) + 'px,' + (from.top - to.top) + 'px) scale(' + (from.width / to.width) + ',' + (from.height / to.height) + ')';
    pimg.getBoundingClientRect(); pimg.style.transition = 'transform 640ms cubic-bezier(0.23,1,0.32,1)'; pimg.style.transform = 'none';
  }
  function openPrint(i, btn) {
    lastBtn = btn; fill(i);
    if (typeof dlg.showModal !== 'function') { return; }
    dlg.showModal(); requestAnimationFrame(function () { dlg.classList.add('in'); flip(btn); }); $('#pr-keep').focus({ preventScroll: true });
  }
  function closePrint() { dlg.classList.remove('in'); setTimeout(function () { if (dlg.open) dlg.close(); }, calm ? 0 : 220); }
  function go(d) { var n = (cur + d + FR.length) % FR.length; pimg.style.transition = 'none'; pimg.style.transform = 'none'; fill(n); }
  $$('.frame').forEach(function (b) { b.addEventListener('click', function () { openPrint(+b.dataset.i, b); }); });
  $('#pr-close').addEventListener('click', closePrint);
  $('#pr-prev').addEventListener('click', function () { go(-1); });
  $('#pr-next').addEventListener('click', function () { go(1); });
  $('#pr-keep').addEventListener('click', function () { var p = kept.indexOf(cur); if (p > -1) kept.splice(p, 1); else kept.push(cur); setKept(); drawChips(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) closePrint(); });
  dlg.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } });
  dlg.addEventListener('close', function () { dlg.classList.remove('in'); if (lastBtn) lastBtn.focus({ preventScroll: true }); });
  dlg.addEventListener('cancel', function () { dlg.classList.remove('in'); });

  /* follow the day: one sticky picture that follows the moment you are reading */
  var day = $('.day'), stack = $('#stack');
  if ('IntersectionObserver' in window && stack) {
    FR.forEach(function (f, i) {
      var pic = document.createElement('picture'), s = document.createElement('source'), im = document.createElement('img');
      s.srcset = f.b + '@2x.webp'; s.type = 'image/webp'; im.src = f.b + '.jpg'; im.alt = f.alt; im.width = f.w; im.height = f.h; im.loading = 'lazy';
      pic.appendChild(s); pic.appendChild(im); if (i === 0) pic.className = 'on'; stack.appendChild(pic);
    });
    day.classList.add('seq-on');
    var lis = $$('#moments li'), pics = $$('picture', stack), lab = $('#stack-lab'), tp = $('.thread i');
    function active(i) {
      lis.forEach(function (l, k) { l.classList.toggle('on', k === i); }); pics.forEach(function (p, k) { p.classList.toggle('on', k === i); });
      lab.textContent = 'Frame ' + FR[i].no + ' of 04. Generated concept image.'; tp.style.setProperty('--tp', ((i + 1) / FR.length).toFixed(2));
    }
    active(0);
    var mo = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) active(+e.target.dataset.i); }); }, { rootMargin: '-42% 0px -42% 0px', threshold: 0 });
    lis.forEach(function (l) { mo.observe(l); });
  }

  /* the reply card: a four step demonstration that sends and keeps nothing */
  var steps = $$('#rsvp fieldset'), n = 1, form = $('#rsvp');
  function drawChips() {
    var c = $('#chips'); if (!c) return; c.innerHTML = '';
    if (!kept.length) { var p = document.createElement('span'); p.textContent = 'None kept yet'; c.appendChild(p); return; }
    kept.slice().sort().forEach(function (i) { var s = document.createElement('span'); s.textContent = FR[i].no + ' ' + FR[i].t; c.appendChild(s); });
  }
  function show(k, focus) {
    n = k; steps.forEach(function (f) { f.classList.toggle('on', +f.dataset.s === k); });
    $('#stepno').textContent = 'Step ' + k + ' of 4'; $('#back').hidden = k === 1; $('#nextstep').hidden = k === 4; $('#send').hidden = k !== 4;
    if (k === 3) drawChips();
    if (focus) { var el = $('fieldset.on input, fieldset.on textarea, fieldset.on select', form); if (el) el.focus({ preventScroll: false }); }
  }
  $('#nextstep').addEventListener('click', function () { show(Math.min(4, n + 1), true); });
  $('#back').addEventListener('click', function () { show(Math.max(1, n - 1), true); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var dl = $('#summary'); dl.innerHTML = '';
    [['Date', $('#f-date').value], ['Where', ($('#f-where').value ? $('#f-where').value + ', ' : '') + $('#f-region').value], ['Moments kept', kept.slice().sort().map(function (i) { return FR[i].no + ' ' + FR[i].t; }).join(', ') || 'None'], ['Names', $('#f-name').value]].forEach(function (r) {
      var dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = r[0]; dd.textContent = r[1] || 'Not given'; dl.appendChild(dt); dl.appendChild(dd);
    });
    form.classList.add('sent'); var d = $('#done'); d.focus();
  });
  $('#again').addEventListener('click', function () { form.reset(); form.classList.remove('sent'); show(1, true); });
  show(1, false); setKept(); drawChips();
})();
