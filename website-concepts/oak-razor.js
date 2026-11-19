/* Oak & Razor behaviour. Without this file the page is complete: the opening is the poster with the name in plain bone,
   every service is open and readable, and the appointment demonstration (which needs a script) is replaced by a plain note.
   Nothing here sends, stores or books anything: no network calls, no storage. */
(function () {
  'use strict';
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var root = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  if (!calm) root.classList.add('mo');
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  /* ---------- 1. hero wordmark: letters answer scroll, pointer, and the clip ---------- */
  var stage = $('#stage'), plate = $('#hero-plate'), tag = $('#hero-tag');
  var lines = $$('.name .ln'), letters = [], total = 0;
  lines.forEach(function (ln, li) {
    var t = ln.textContent.trim(); ln.textContent = '';
    var v = el('span', 'vh', t), vis = el('span'); vis.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < t.length; i++) {
      var ch = t.charAt(i), c = el('span', 'c' + (ch === '&' ? ' amp' : '')), ci = el('span', 'ci', ch === ' ' ? ' ' : ch);
      ci.setAttribute('data-c', ch.toUpperCase()); ci.style.setProperty('--i', total); c.appendChild(ci); vis.appendChild(c);
      letters.push({ c: c, dir: parseFloat(ln.getAttribute('data-dir')) || 1, i: total, li: li, amp: ch === '&', blank: ch === ' ', cx: 0, cy: 0, last: '' });
      total++;
    }
    ln.appendChild(v); ln.appendChild(vis);
  });
  var slot = window.Footage ? window.Footage.mount(plate) : null;
  var lamp = 0.6, live = false;
  if (slot) {
    slot.listeners.push(function (what) {
      if (what === 'live') { live = true; if (tag) tag.textContent = 'Generated concept footage'; kick(); }
      if (what === 'poster') { live = false; if (tag) tag.textContent = 'Generated concept image'; paintStatic(); }
    });
    /* the brass lamps sit top right of the frame: their brightness modulates the brass on the type */
    window.Footage.light(slot, function (v) { lamp = clamp((v - 0.06) / 0.3, 0, 1); stage.style.setProperty('--lamp', lamp.toFixed(3)); }, { x: 0.72, y: 0.03, w: 0.18, h: 0.2 });
  }
  function pageXY(node, top) { var x = 0, y = 0; while (node && node !== top) { x += node.offsetLeft; y += node.offsetTop; node = node.offsetParent; } return [x, y]; }
  var stageTop = 0, stageH = 1, nameEl = $('.name');
  function measure() {
    var sr = stage.getBoundingClientRect(); stageTop = sr.top + window.scrollY; stageH = Math.max(1, sr.height);
    letters.forEach(function (L) { var p = pageXY(L.c, stage); L.cx = p[0] + L.c.offsetWidth / 2; L.cy = p[1] + L.c.offsetHeight / 2; });
  }
  function paintStatic() { letters.forEach(function (L) { L.c.style.transform = ''; L.c.style.removeProperty('--k'); }); }
  var ptr = { x: -999, y: -999, tx: -999, ty: -999 }, inView = true, raf = 0, wasLive = false;
  function frame() {
    raf = 0;
    var sy = window.scrollY, p = clamp((sy - stageTop) / stageH, 0, 1);
    ptr.x += (ptr.tx - ptr.x) * 0.16; ptr.y += (ptr.ty - ptr.y) * 0.16;
    var phase = -1;
    if (live && slot && slot.video && slot.video.duration) phase = slot.video.currentTime / slot.video.duration;
    var n = letters.length, still = Math.abs(ptr.tx - ptr.x) < 0.5 && Math.abs(ptr.ty - ptr.y) < 0.5;
    for (var k = 0; k < n; k++) {
      var L = letters[k], x = L.dir * p * (30 + L.i * 26), sk = -L.dir * p * 16, y = 0;
      var dx = L.cx - ptr.x, dy = L.cy - ptr.y, d = Math.sqrt(dx * dx + dy * dy), f = d < 320 ? 1 - d / 320 : 0;
      if (f > 0) { x += (dx / (d || 1)) * f * 22; y += (dy / (d || 1)) * f * 22 - f * 10; sk += (dx < 0 ? 1 : -1) * f * 7; }
      var tr = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) skewX(' + sk.toFixed(2) + 'deg)';
      if (tr !== L.last) { L.c.style.transform = tr; L.last = tr; }
      if (!L.blank) {
        var kk;
        if (L.amp) kk = live ? 0.5 + 0.5 * lamp : 1;
        else if (phase >= 0) { var dd = Math.abs(L.i / (n - 1) - phase); dd = Math.min(dd, 1 - dd); kk = clamp(1 - dd * 7, 0, 1) * (0.55 + 0.45 * lamp); } else kk = 0;
        L.c.style.setProperty('--k', kk.toFixed(2));
      }
    }
    if (inView && (live || !still)) raf = requestAnimationFrame(frame);
    wasLive = live;
  }
  function kick() { if (!raf && !calm && inView) raf = requestAnimationFrame(frame); }
  if (!calm) {
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { measure(); kick(); });
    window.addEventListener('resize', function () { measure(); kick(); });
    window.addEventListener('scroll', kick, { passive: true });
    if (fine) {
      stage.addEventListener('pointermove', function (e) { ptr.tx = e.clientX; ptr.ty = e.clientY + window.scrollY - stageTop; if (ptr.x < -900) { ptr.x = ptr.tx; ptr.y = ptr.ty; } kick(); }, { passive: true });
      stage.addEventListener('pointerleave', function () { ptr.tx = -999; ptr.ty = -999; kick(); });
    }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { inView = es[0].isIntersecting; if (inView) kick(); }, { threshold: 0 }).observe(stage);
  }

  /* ---------- kinetic headings: split into letters, mask reveal, tracking with scroll ---------- */
  var kins = [];
  $$('[data-kin]').forEach(function (h) {
    var t = h.textContent.trim(); h.textContent = '';
    var v = el('span', 'vh', t), vis = el('span'); vis.setAttribute('aria-hidden', 'true');
    var gi = 0; t.split(' ').forEach(function (w, wi) { if (wi) vis.appendChild(document.createTextNode(' ')); var ws = el('span', 'wd'); w.split('').forEach(function (ch) { var k = el('span', 'k'), ki = el('span', 'ki', ch); ki.style.setProperty('--i', gi++); k.appendChild(ki); ws.appendChild(k); }); vis.appendChild(ws); });
    h.appendChild(v); h.appendChild(vis);
    kins.push({ h: h, ks: $$('.k', vis), vis: false, fs: parseFloat(getComputedStyle(h).fontSize) || 100 });
  });
  var band = $('#band'), b1 = $('#b1'), b2 = $('#b2'), spS = $('#sp-stripes'), spOn = false;
  if (spS) { var NS = 'http://www.w3.org/2000/svg'; for (var s = -2; s < 22; s++) { var pth = document.createElementNS(NS, 'path'); pth.setAttribute('d', 'M0 ' + (s * 40) + ' L14 ' + (s * 40 + 14) + ' L14 ' + (s * 40 + 34) + ' L0 ' + (s * 40 + 20) + 'Z'); spS.appendChild(pth); } spOn = true; }
  var bandVis = false, tickQ = false;
  function tick() {
    tickQ = false; var vh = window.innerHeight, sy = window.scrollY, reads = [];
    kins.forEach(function (K) { if (K.vis) reads.push(K.h.getBoundingClientRect()); else reads.push(null); });
    var br = bandVis ? band.getBoundingClientRect() : null;
    kins.forEach(function (K, ix) {
      var r = reads[ix]; if (!r) return;
      var p = clamp((r.top + r.height / 2 - vh / 2) / (vh / 2), -1.2, 1.2), n = K.ks.length, s = K.fs * 0.045;
      K.ks.forEach(function (k, i) { k.style.transform = 'translate3d(' + (p * (i - (n - 1) / 2) * s).toFixed(1) + 'px,0,0) skewX(' + (-p * 9).toFixed(2) + 'deg)'; });
    });
    if (br) { var x = (br.top + br.height / 2 - vh / 2) * 0.45; b1.style.transform = 'translate3d(' + (-x).toFixed(0) + 'px,0,0)'; b2.style.transform = 'translate3d(' + x.toFixed(0) + 'px,0,0)'; }
    if (spOn) spS.setAttribute('transform', 'translate(0,' + (-(sy * 0.18) % 40).toFixed(1) + ')');
  }
  function reqTick() { if (!tickQ) { tickQ = true; requestAnimationFrame(tick); } }
  if (!calm && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var K = kins.filter(function (q) { return q.h === e.target; })[0]; if (!K) return;
        K.vis = e.isIntersecting; if (e.isIntersecting) K.h.classList.add('in'); reqTick();
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    kins.forEach(function (K) { io.observe(K.h); });
    new IntersectionObserver(function (es) { bandVis = es[0].isIntersecting; reqTick(); }, { rootMargin: '30% 0px' }).observe(band);
    window.addEventListener('scroll', reqTick, { passive: true }); window.addEventListener('resize', function () { kins.forEach(function (K) { K.fs = parseFloat(getComputedStyle(K.h).fontSize) || 100; }); reqTick(); });
    reqTick();
  } else { kins.forEach(function (K) { K.h.classList.add('in'); }); }

  /* ---------- 2. services: expanding rows (ARIA disclosure/accordion, one open at a time) ---------- */
  var svc = $('#svc'), rows = $$('.row', svc), btns = rows.map(function (r) { return $('.r-btn', r); });
  var openIx = -1;
  function setOpen(i) {
    openIx = i;
    rows.forEach(function (r, k) { r.classList.toggle('on', k === i); btns[k].setAttribute('aria-expanded', k === i ? 'true' : 'false'); });
    svc.classList.toggle('has-on', i >= 0);
  }
  function setHot(i) { rows.forEach(function (r, k) { r.classList.toggle('hot', k === i); }); svc.classList.toggle('has-hot', i >= 0); }
  setOpen(0);
  btns.forEach(function (b, i) {
    b.addEventListener('click', function () { setOpen(openIx === i ? -1 : i); });
    b.addEventListener('focus', function () { setHot(i); });
    b.addEventListener('blur', function () { setHot(-1); });
    if (fine) { rows[i].addEventListener('pointerenter', function () { setHot(i); }); rows[i].addEventListener('pointerleave', function () { setHot(-1); }); }
    b.addEventListener('keydown', function (e) {
      var n = btns.length, k = i;
      if (e.key === 'ArrowDown') k = (i + 1) % n; else if (e.key === 'ArrowUp') k = (i - 1 + n) % n; else if (e.key === 'Home') k = 0; else if (e.key === 'End') k = n - 1; else return;
      e.preventDefault(); btns[k].focus();
    });
  });
  $$('[data-choose]', svc).forEach(function (c) {
    c.addEventListener('click', function () { var r = c.closest('.row'); carry(r.getAttribute('data-id')); });
  });

  /* ---------- 3. appointment journey (demonstration, client side only) ---------- */
  var bk = $('#bk'); if (!bk) return;
  var SERVICES = rows.map(function (r) { return { id: r.getAttribute('data-id'), name: r.getAttribute('data-name') }; });
  var BARBERS = [{ id: 'first', name: 'First available', sub: 'Whoever is free' }, { id: 'b1', name: '[barber to be confirmed]', sub: 'Placeholder one' }, { id: 'b2', name: '[barber to be confirmed]', sub: 'Placeholder two' }];
  var TIMES = [{ p: 'Morning', t: ['09:00', '09:40', '10:20'] }, { p: 'Midday', t: ['12:00', '12:40'] }, { p: 'Afternoon', t: ['14:00', '14:40', '15:20'] }, { p: 'Evening', t: ['17:30', '18:10'] }];
  var CONTACT = [{ id: 'text', name: 'Text message' }, { id: 'email', name: 'Email' }, { id: 'call', name: 'Phone call' }];
  var STEPS = ['Service', 'Barber', 'Date', 'Time', 'Contact', 'Review'];
  var state = { service: null, barber: null, date: null, time: null, contact: null, name: '' }, step = 0, furthest = 0, done = false;
  var days = [], now = new Date();
  for (var d = 0; d < 14; d++) { var dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d); days.push({ id: 'd' + d, date: dt, long: dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }), wd: dt.toLocaleDateString('en-GB', { weekday: 'short' }), dn: dt.getDate(), mo: dt.toLocaleDateString('en-GB', { month: 'short' }) }); }
  var panelIn = $('#panel-in'), rail = $('#rail'), slip = $('#slip'), live2 = $('#live'), heading = null;
  function say(t) { live2.textContent = ''; setTimeout(function () { live2.textContent = t; }, 40); }
  function find(list, id) { return list.filter(function (x) { return x.id === id; })[0]; }
  function label(k) {
    if (k === 'service') return state.service ? find(SERVICES, state.service).name : null;
    if (k === 'barber') return state.barber ? find(BARBERS, state.barber).name + (state.barber !== 'first' ? ' (' + find(BARBERS, state.barber).sub.toLowerCase() + ')' : '') : null;
    if (k === 'date') return state.date ? find(days, state.date).long : null;
    if (k === 'time') return state.time ? state.time + ' (example)' : null;
    if (k === 'contact') return state.contact ? find(CONTACT, state.contact).name : null;
  }
  function renderRail() {
    rail.textContent = '';
    STEPS.forEach(function (s, i) {
      var li = el('li', i === step && !done ? 'cur' : (i < step || done ? 'done' : '')), b = el('button'); b.type = 'button';
      var n = el('span', 'n', String(i + 1)), l = el('span', 'lab', s); b.appendChild(n); b.appendChild(l);
      if (i < step || done) b.appendChild(el('span', 'vh', ', done'));
      if (i === step && !done) b.setAttribute('aria-current', 'step');
      if (i > furthest || done) b.disabled = true;
      b.addEventListener('click', function () { go(i, true); });
      li.appendChild(b); rail.appendChild(li);
    });
  }
  function renderSlip() {
    slip.textContent = '';
    [['service', 'Service'], ['barber', 'Barber'], ['date', 'Date'], ['time', 'Time'], ['contact', 'Contact']].forEach(function (p) {
      var d = el('div'); d.appendChild(el('span', 'sl mono', p[1])); d.appendChild(el('span', 'sv', label(p[0]) || 'Not chosen yet')); slip.appendChild(d);
    });
  }
  /* radio group (roving tabindex). Arrow keys move and select. cols: arrows also move by row when the grid has columns */
  function radios(items, key, opts) {
    var g = el('div', opts.cls || 'opts'); g.setAttribute('role', 'radiogroup'); g.setAttribute('aria-label', opts.label);
    var made = [];
    items.forEach(function (it, i) {
      var b = el('button', 'opt ' + (opts.item || '')); b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('data-v', it.id);
      b.setAttribute('aria-checked', state[key] === it.id ? 'true' : 'false'); b.tabIndex = (state[key] === it.id || (!state[key] && i === 0)) ? 0 : -1;
      if (it.aria) b.setAttribute('aria-label', it.aria);
      opts.fill(b, it); made.push(b); g.appendChild(b);
    });
    function pick(b, focus) {
      made.forEach(function (x) { var on = x === b; x.setAttribute('aria-checked', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1; });
      state[key] = b.getAttribute('data-v'); if (focus) b.focus(); opts.onPick(b.getAttribute('data-v'));
    }
    made.forEach(function (b, i) {
      b.addEventListener('click', function () { pick(b, false); });
      b.addEventListener('keydown', function (e) {
        var n = made.length, k = i, cols = opts.grid ? getComputedStyle(opts.grid()).gridTemplateColumns.split(' ').length : 1;
        if (e.key === 'ArrowRight') k = Math.min(n - 1, i + 1); else if (e.key === 'ArrowLeft') k = Math.max(0, i - 1);
        else if (e.key === 'ArrowDown') k = opts.grid ? (i + cols < n ? i + cols : i) : Math.min(n - 1, i + 1);
        else if (e.key === 'ArrowUp') k = opts.grid ? (i - cols >= 0 ? i - cols : i) : Math.max(0, i - 1);
        else if (e.key === 'Home') k = 0; else if (e.key === 'End') k = n - 1; else return;
        e.preventDefault(); if (k !== i) pick(made[k], true);
      });
    });
    return { el: g, buttons: made };
  }
  function head(i) { var h = el('h3'); h.tabIndex = -1; h.appendChild(el('span', 'stepno mono', 'Step ' + (i + 1) + ' of 6')); h.appendChild(document.createElement('br')); h.appendChild(document.createTextNode(STEPS[i])); heading = h; return h; }
  var msg;
  function actions(i, nextLabel) {
    var a = el('div', 'acts');
    if (i > 0) { var b = el('button', 'btn back', 'Back'); b.type = 'button'; b.addEventListener('click', function () { go(i - 1, true); }); a.appendChild(b); }
    var nx = el('button', 'btn', nextLabel || 'Next'); nx.type = 'button'; nx.addEventListener('click', function () { next(i); }); a.appendChild(nx);
    msg = el('p', 'msg'); msg.setAttribute('role', 'status'); a.appendChild(msg); return a;
  }
  function need(text) { msg.textContent = text; }
  function next(i) {
    var k = ['service', 'barber', 'date', 'time', 'contact'][i];
    if (k && !state[k]) { need({ service: 'Choose a service to continue.', barber: 'Choose a barber option to continue.', date: 'Choose a day to continue.', time: 'Choose an example time to continue.', contact: 'Choose how to be contacted to continue.' }[k]); return; }
    if (i === 5) { done = true; renderAll(); say('Demonstration result. Nothing is booked.'); focusHead(); return; }
    go(i + 1, true);
  }
  function focusHead() { if (heading) heading.focus({ preventScroll: false }); }
  function go(i, focus) { step = i; furthest = Math.max(furthest, i); done = false; renderAll(true); say('Step ' + (i + 1) + ' of 6: ' + STEPS[i]); if (focus) focusHead(); }
  function renderAll(swap) {
    renderRail(); renderSlip(); panelIn.textContent = ''; panelIn.classList.remove('swap');
    if (done) renderResult(); else [s0, s1, s2, s3, s4, s5][step]();
    if (swap) { void panelIn.offsetWidth; panelIn.classList.add('swap'); }
  }
  function updSlip() { renderSlip(); }
  function s0() {
    panelIn.appendChild(head(0)); panelIn.appendChild(el('p', 'demo-note', state.service ? 'Carried over from the services list. Change it here if you like.' : 'Choose a service, or pick one from the services list above.'));
    var r = radios(SERVICES, 'service', { label: 'Service', fill: function (b, it) { b.appendChild(el('span', '', it.name)); }, onPick: function (v) { updSlip(); say('Selected ' + find(SERVICES, v).name); if (msg) msg.textContent = ''; } });
    panelIn.appendChild(r.el); panelIn.appendChild(actions(0));
  }
  function s1() {
    panelIn.appendChild(head(1));
    var r = radios(BARBERS, 'barber', { label: 'Barber', fill: function (b, it) { b.appendChild(el('span', '', it.name)); b.appendChild(el('small', '', it.sub)); b.setAttribute('aria-label', it.name + ', ' + it.sub); }, onPick: function (v) { updSlip(); say('Selected ' + find(BARBERS, v).name); msg.textContent = ''; } });
    panelIn.appendChild(el('p', 'grp-t', 'First available, or pick a barber')); panelIn.appendChild(r.el);
    panelIn.appendChild(el('p', 'demo-note', 'Barber names are placeholders on this concept.')); panelIn.appendChild(actions(1));
  }
  function s2() {
    panelIn.appendChild(head(2)); panelIn.appendChild(el('span', 'tag-ex', 'Example availability, nothing is real'));
    var holder = { g: null };
    var r = radios(days, 'date', { cls: 'days', item: 'day', label: 'Date, next 14 days', grid: function () { return holder.g; },
      fill: function (b, it) { b.appendChild(el('small', '', it.wd)); b.appendChild(el('b', '', String(it.dn))); b.appendChild(el('small', '', it.mo)); b.setAttribute('aria-label', it.long); },
      onPick: function (v) { updSlip(); say('Selected ' + find(days, v).long); msg.textContent = ''; } });
    holder.g = r.el; panelIn.appendChild(r.el); panelIn.appendChild(actions(2));
  }
  function s3() {
    panelIn.appendChild(head(3)); panelIn.appendChild(el('span', 'tag-ex', 'Example times, not opening hours'));
    var flat = []; TIMES.forEach(function (g) { g.t.forEach(function (t) { flat.push({ id: t, p: g.p }); }); });
    var wrap = el('div', 'times'); wrap.setAttribute('role', 'radiogroup'); wrap.setAttribute('aria-label', 'Example time');
    var made = [];
    TIMES.forEach(function (g) {
      var row = el('div', 'period'); row.appendChild(el('p', 'grp-t', g.p)); var o = el('div', 'opts');
      g.t.forEach(function (t) {
        var b = el('button', 'opt time'); b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('data-v', t); b.setAttribute('aria-label', g.p + ' ' + t + ', example');
        b.setAttribute('aria-checked', state.time === t ? 'true' : 'false'); b.tabIndex = state.time === t || (!state.time && !made.length) ? 0 : -1;
        b.appendChild(el('b', '', t)); b.appendChild(el('small', '', 'example')); o.appendChild(b); made.push(b);
      });
      row.appendChild(o); wrap.appendChild(row);
    });
    function pick(b, f) { made.forEach(function (x) { var on = x === b; x.setAttribute('aria-checked', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1; }); state.time = b.getAttribute('data-v'); if (f) b.focus(); updSlip(); say('Selected ' + b.getAttribute('aria-label')); msg.textContent = ''; }
    made.forEach(function (b, i) {
      b.addEventListener('click', function () { pick(b, false); });
      b.addEventListener('keydown', function (e) {
        var k = i; if (e.key === 'ArrowRight' || e.key === 'ArrowDown') k = Math.min(made.length - 1, i + 1); else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') k = Math.max(0, i - 1); else if (e.key === 'Home') k = 0; else if (e.key === 'End') k = made.length - 1; else return;
        e.preventDefault(); if (k !== i) pick(made[k], true);
      });
    });
    panelIn.appendChild(wrap); panelIn.appendChild(actions(3));
  }
  function s4() {
    panelIn.appendChild(head(4));
    var r = radios(CONTACT, 'contact', { label: 'Contact preference', fill: function (b, it) { b.appendChild(el('span', '', it.name)); }, onPick: function (v) { updSlip(); say('Selected ' + find(CONTACT, v).name); msg.textContent = ''; } });
    panelIn.appendChild(el('p', 'grp-t', 'How should the shop reach you?')); panelIn.appendChild(r.el);
    var lab = el('label'); lab.appendChild(document.createTextNode('First name (optional)')); var inp = el('input'); inp.type = 'text'; inp.autocomplete = 'off'; inp.value = state.name; inp.addEventListener('input', function () { state.name = inp.value; });
    lab.appendChild(inp); lab.appendChild(el('span', 'hint', 'Please do not enter real details. Nothing is sent or saved.')); panelIn.appendChild(lab); panelIn.appendChild(actions(4));
  }
  function s5() {
    panelIn.appendChild(head(5)); panelIn.appendChild(el('p', 'demo-note', 'Check your choices. This is a demonstration, so nothing is booked.'));
    var dl = el('dl', 'rv-list');
    [['Service', 'service'], ['Barber', 'barber'], ['Date', 'date'], ['Time', 'time'], ['Contact', 'contact']].forEach(function (p) { var d = el('div'); d.appendChild(el('dt', 'mono', p[0])); d.appendChild(el('dd', '', label(p[1]) || 'Not chosen')); dl.appendChild(d); });
    if (state.name) { var d2 = el('div'); d2.appendChild(el('dt', 'mono', 'Name')); d2.appendChild(el('dd', '', state.name)); dl.appendChild(d2); }
    panelIn.appendChild(dl); panelIn.appendChild(actions(5, 'Show the demonstration result'));
  }
  function renderResult() {
    var c = el('div', 'result'); c.appendChild(el('span', 'stamp', 'Demonstration: nothing is booked'));
    var h = el('h3'); h.tabIndex = -1; h.textContent = 'This is how it would look.'; heading = h; c.appendChild(h);
    var dl = el('dl', 'rv-list');
    [['Service', 'service'], ['Barber', 'barber'], ['Date', 'date'], ['Time', 'time'], ['Contact', 'contact']].forEach(function (p) { var d = el('div'); d.appendChild(el('dt', 'mono', p[0])); d.appendChild(el('dd', '', label(p[1]) || 'Not chosen')); dl.appendChild(d); });
    c.appendChild(dl);
    c.appendChild(el('p', '', 'Nothing was sent, stored or booked, and the availability shown was an example. In a live site this step would reach the shop.'));
    var a = el('div', 'acts'), again = el('button', 'btn', 'Start again'); again.type = 'button';
    again.addEventListener('click', function () { state = { service: null, barber: null, date: null, time: null, contact: null, name: '' }; step = 0; furthest = 0; done = false; renderAll(true); say('Started again. Step 1 of 6: Service'); focusHead(); });
    a.appendChild(again); c.appendChild(a); panelIn.appendChild(c);
  }
  function carry(id) {
    state.service = id; step = 1; furthest = Math.max(furthest, 1); done = false; renderAll(true);
    var sec = $('#book'); sec.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
    say('Carried over: ' + find(SERVICES, id).name + '. Step 2 of 6: Barber');
    setTimeout(function () { if (heading) heading.focus({ preventScroll: true }); }, calm ? 0 : 500);
  }
  renderAll(false);
})();
