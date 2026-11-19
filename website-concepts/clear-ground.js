/* Clear Ground behaviour. Without this file the page is complete: the opening is the poster in a window, the four chapters read in order,
   and the enquiry is hidden (it needs a script to say what it does and does not do). */
(function () {
  'use strict';
  var doc = document.documentElement;
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  if (calm) doc.classList.add('calm');

  /* the window: footage if it exists, the poster if not */
  var slot = window.Footage ? window.Footage.mount($('#hero-plate')) : null;
  if (slot) slot.listeners.push(function (what) {
    var t = $('#hero-tag'); if (!t) return;
    if (what === 'live') t.textContent = 'Generated concept footage';
    if (what === 'poster') t.textContent = 'Generated concept image';
  });

  /* gentle reveals: opacity and a short rise, only for things below the first screen */
  if (!calm && 'IntersectionObserver' in window) {
    var rvs = $$('.rv');
    rvs.forEach(function (el) { if (el.getBoundingClientRect().top < innerHeight * 0.95) el.classList.add('in'); });
    doc.classList.add('rv-on');
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    rvs.forEach(function (el) { if (!el.classList.contains('in')) io.observe(el); });
  }

  /* ---------- the journey line ---------- */
  var J = $('#journey'), svg = $('#jsvg'), ghost = $('#jghost'), draw = $('#jdraw'), marker = $('#jmarker'), prog = $('#prog');
  var chapters = $$('.ch'), links = $$('#index a');
  var mq = window.matchMedia('(max-width: 47.99rem)');
  var total = 0, ys = null, N = 0, startY = 0, endY = 0, jAbs = 0, docMax = 1, chTops = [], wps = [], cur = 0, raf = 0, built = false, activeI = -1;
  var NS = 'http://www.w3.org/2000/svg';

  function seeded(n) { var s = n * 9301 + 49297; return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
  function smooth(p) {
    var d = 'M' + p[0][0].toFixed(1) + ',' + p[0][1].toFixed(1);
    for (var i = 0; i < p.length - 1; i++) {
      var a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c, t = 6;
      d += ' C' + (b[0] + (c[0] - a[0]) / t).toFixed(1) + ',' + (b[1] + (c[1] - a[1]) / t).toFixed(1) + ' ' + (c[0] - (e[0] - b[0]) / t).toFixed(1) + ',' + (c[1] - (e[1] - b[1]) / t).toFixed(1) + ' ' + c[0].toFixed(1) + ',' + c[1].toFixed(1);
    }
    return d;
  }
  function lenForY(y) { var lo = 0, hi = N; while (lo < hi) { var m = (lo + hi) >> 1; if (ys[m] >= y) hi = m; else lo = m + 1; } return lo * total / N; }

  function build() {
    var mob = mq.matches, jr = J.getBoundingClientRect(), W = J.offsetWidth, H = J.offsetHeight;
    jAbs = jr.top + window.pageYOffset;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    function c(el) { var r = el.getBoundingClientRect(); return { x: r.left - jr.left + r.width / 2, y: r.top - jr.top + r.height / 2, l: r.left - jr.left, t: r.top - jr.top, w: r.width, h: r.height }; }
    var rnd = seeded(11), st = c($('#start')), pts = [[st.x, st.y]], list = [];
    var startG = $('[data-k="start"]', svg); list.push({ g: startG, x: st.x, y: st.y });
    chTops = [];
    chapters.forEach(function (ch) {
      var lane = $('.lane', ch), L = c(lane), pad = parseFloat(getComputedStyle(ch).paddingTop) || 0, wob = parseFloat(ch.getAttribute('data-wob')) || 0;
      var amp = Math.min(L.w * 0.24, 62) * wob * (mob ? 0.8 : 1), step = mob ? 90 : 130;
      var y0 = L.t + pad * 0.85, y1 = L.t + L.h - pad * 0.85;
      chTops.push(ch.getBoundingClientRect().top + window.pageYOffset);
      var seq = [{ x: L.x, y: y0 }];
      $$('.wp', lane).sort(function (a, b) { return a.offsetTop - b.offsetTop; }).forEach(function (w) { var a = c(w); a.k = w.getAttribute('data-kind'); seq.push(a); });
      seq.push({ x: L.x, y: y1 });
      pts.push([seq[0].x, seq[0].y]);
      for (var i = 1; i < seq.length; i++) {
        var a = seq[i - 1], b = seq[i], dy = b.y - a.y, n = Math.max(0, Math.floor(dy / step) - 0);
        for (var k = 1; k <= n; k++) {
          var t = k / (n + 1);
          if (a.k === 'knot' && k === 1 && false) continue;
          pts.push([L.x + amp * Math.sin(i * 2.1 + k * 1.9) + (rnd() - 0.5) * amp * 0.5, a.y + dy * t]);
        }
        if (b.k === 'knot') {
          var r = mob ? 9 : 30, x = b.x, y = b.y;
          pts.push([x, y - r * 1.9], [x + r * 1.15, y - r * 0.5], [x + r * 0.2, y + r * 0.95], [x - r * 1.15, y + r * 0.1], [x - r * 0.1, y - r * 0.95], [x + r * 0.95, y + r * 0.35], [x + r * 0.3, y + r * 1.9]);
        } else pts.push([b.x, b.y]);
        if (b.k && b.k !== 'knot') { var g = $('[data-k="' + b.k + '"]', svg); if (g) list.push({ g: g, x: b.x, y: b.y, slot: /^slot/.test(b.k) }); }
      }
    });
    var d = smooth(pts);
    ghost.setAttribute('d', d); draw.setAttribute('d', d);
    total = draw.getTotalLength(); draw.style.strokeDasharray = total.toFixed(1);
    N = Math.max(60, Math.ceil(total / 4)); ys = new Float32Array(N + 1);
    var m = -1e9; for (var i = 0; i <= N; i++) { var p = draw.getPointAtLength(total * i / N); m = Math.max(m, p.y); ys[i] = m; }
    startY = pts[0][1]; endY = pts[pts.length - 1][1];
    wps = list.map(function (w) {
      var s = mob ? (w.slot ? 0.75 : 0.4) : 1;
      w.g.setAttribute('transform', 'translate(' + w.x.toFixed(1) + ',' + w.y.toFixed(1) + ') scale(' + s + ')');
      w.len = lenForY(w.y); return w;
    });
    docMax = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    built = true;
  }
  function targetLen() { return lenForY(clamp(window.pageYOffset + innerHeight * 0.6 - jAbs, startY, endY)); }
  function render() {
    draw.style.strokeDashoffset = (total - cur).toFixed(1);
    var p = draw.getPointAtLength(cur); marker.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ')');
    marker.classList.add('on');
    for (var i = 0; i < wps.length; i++) if (cur >= wps[i].len - 36) wps[i].g.classList.add('on');
  }
  function chapterState() {
    var y = window.pageYOffset + innerHeight * 0.4, a = -1;
    for (var i = 0; i < chTops.length; i++) if (chTops[i] <= y) a = i;
    if (a !== activeI) { activeI = a; links.forEach(function (l, i) { if (i === a) l.setAttribute('aria-current', 'location'); else l.removeAttribute('aria-current'); }); }
    if (!calm) doc.style.setProperty('--p', clamp(window.pageYOffset / docMax, 0, 1).toFixed(4));
  }
  function frame() {
    raf = 0; chapterState();
    if (calm) return;
    var t = targetLen(); cur += (t - cur) * 0.07; if (Math.abs(t - cur) < 0.5) cur = t;
    render(); if (cur !== t) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && built) raf = requestAnimationFrame(frame); }
  function init() {
    build();
    if (calm) { draw.style.strokeDashoffset = '0'; wps.forEach(function (w) { w.g.classList.add('on'); }); chapterState(); }
    else { cur = targetLen(); render(); chapterState(); }
  }
  var rt = 0; function relayout() { clearTimeout(rt); rt = setTimeout(function () { var was = built; build(); if (calm) { wps.forEach(function (w) { w.g.classList.add('on'); }); } else { cur = targetLen(); render(); } chapterState(); applyAnswers(); }, 120); }
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', relayout);
  if ('ResizeObserver' in window) { var lastH = J.offsetHeight; new ResizeObserver(function () { if (Math.abs(J.offsetHeight - lastH) > 1) { lastH = J.offsetHeight; relayout(); } }).observe(J); }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { init(); });
  init();

  /* ---------- the enquiry: three prompts, each answer marks the line ---------- */
  var form = $('#enq'); if (!form) return;
  var steps = $$('.step', form), trail = $$('#trail li'), next = $('#next'), back = $('#back'), status = $('#status'), pn = $('#pn'), result = $('#result'), stepsWrap = $('#steps'), note = $('#note');
  var slotG = [$('[data-k="slot1"]', svg), $('[data-k="slot2"]', svg), $('[data-k="slot3"]', svg)];
  var answers = [null, null, null], step = 0;
  var FULL = {
    q1: { work: 'a different shape to your working week', decision: 'a decision you keep putting off to be made', pace: 'a pace of life that feels more like yours', 'else': 'something you will explain in your own words' },
    q2: { time: 'not enough time', start: 'not knowing where to start', others: 'other people’s expectations', momentum: 'starting well and losing momentum' },
    q3: { online: 'online', person: 'in person', either: 'either, and you would like to talk it over' }
  };
  var BEGIN = {
    time: 'We might begin with one ordinary week, and find the first hour in it that is genuinely yours.',
    start: 'We might begin by describing where you are now in plain words, until a first step shows itself.',
    others: 'We might begin by separating what is expected of you from what you want.',
    momentum: 'We might begin with a step small enough to repeat, and notice what happens when it gets harder.'
  };
  function applyAnswers() {
    answers.forEach(function (a, i) {
      var g = slotG[i]; if (!g) return;
      if (a) { g.classList.add('on', 'got'); $('.cap', g).textContent = a.short; if (i === 2) g.setAttribute('data-sel', a.value); }
      else { g.classList.remove('got'); $('.cap', g).textContent = ''; g.removeAttribute('data-sel'); }
    });
  }
  function show(i) {
    step = i;
    steps.forEach(function (s, k) { s.hidden = k !== i; });
    pn.textContent = 'Prompt ' + (i + 1) + ' of 3';
    back.disabled = i === 0; next.disabled = !answers[i];
    next.textContent = i === 2 ? 'Write my note' : 'Next prompt';
    status.textContent = answers[i] ? 'Marked on your line: ' + answers[i].short + '.' : 'Choose an answer to add a marker to your line.';
  }
  function setAnswer(i, input) {
    answers[i] = { value: input.value, short: input.getAttribute('data-short'), text: input.parentNode.textContent.trim() };
    trail[i].classList.add('got'); $('b', trail[i]).textContent = answers[i].short;
    applyAnswers(); next.disabled = false;
    status.textContent = 'Added to your line: ' + answers[i].short + '.';
  }
  $$('input[type="radio"]', form).forEach(function (r) {
    r.addEventListener('change', function () { setAnswer(+r.closest('.step').getAttribute('data-step'), r); });
  });
  function focusQ(i) { var q = $('.q', steps[i]); if (q) q.focus({ preventScroll: true }); }
  next.addEventListener('click', function () {
    if (!answers[step]) return;
    if (step < 2) { show(step + 1); focusQ(step); } else finish();
  });
  back.addEventListener('click', function () { if (step > 0) { show(step - 1); focusQ(step); } });

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }
  function finish() {
    note.textContent = '';
    var p1 = el('p'); p1.appendChild(el('span', 'mono', 'In six months')); p1.appendChild(document.createTextNode('You would like to see ')); p1.appendChild(el('em', '', FULL.q1[answers[0].value])); p1.appendChild(document.createTextNode('.'));
    var p2 = el('p'); p2.appendChild(el('span', 'mono', 'So far')); p2.appendChild(document.createTextNode('What has got in the way is ')); p2.appendChild(el('em', '', FULL.q2[answers[1].value])); p2.appendChild(document.createTextNode('.'));
    var p3 = el('p'); p3.appendChild(el('span', 'mono', 'How you would like to work')); p3.appendChild(document.createTextNode('You would prefer ')); p3.appendChild(el('em', '', FULL.q3[answers[2].value])); p3.appendChild(document.createTextNode('.'));
    note.appendChild(p1); note.appendChild(p2); note.appendChild(p3);
    var extra = $('#extra').value.trim();
    if (extra) { var pe = el('p'); pe.appendChild(el('span', 'mono', 'In your own words')); pe.appendChild(el('q', '', extra)); note.appendChild(pe); }
    var pb = el('p'); pb.appendChild(el('span', 'mono', 'A way to begin')); pb.appendChild(document.createTextNode(BEGIN[answers[1].value])); note.appendChild(pb);
    note.appendChild(el('p', 'ph', 'Session details: [to be confirmed]. Price: [to be confirmed].'));
    stepsWrap.hidden = true; result.hidden = false;
    status.textContent = '';
    $('#result-h').focus({ preventScroll: false });
  }
  $('#again').addEventListener('click', function () {
    answers = [null, null, null]; $$('input[type="radio"]', form).forEach(function (r) { r.checked = false; }); $('#extra').value = '';
    trail.forEach(function (t) { t.classList.remove('got'); $('b', t).textContent = 'Not yet marked'; });
    applyAnswers(); result.hidden = true; stepsWrap.hidden = false; show(0); focusQ(0);
  });
  show(0);
})();
