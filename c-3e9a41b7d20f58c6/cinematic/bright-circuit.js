/* Bright Circuit Electrical behaviour. Without this file the page is complete: the headline, the poster inside its
   inspection window, the flow, every service with its cover text open, and a plain-text emergency note in the footer.
   The enquiry demonstration is hidden without scripts. Nothing is sent, stored or dialled. */
(function () {
  'use strict';
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var NS = 'http://www.w3.org/2000/svg';
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* ---------- the opening: footage in the inspection window ---------- */
  var slot = window.Footage ? window.Footage.mount($('#hero-plate')) : null;
  if (slot) {
    slot.listeners.push(function (what) {
      var t = $('#hero-tag'), m = $('#mode');
      if (what === 'live') { if (t) t.textContent = 'Generated concept footage'; if (m) m.textContent = 'Live view'; }
      if (what === 'poster') { if (t) t.textContent = 'Generated concept image'; if (m) m.textContent = 'Still'; }
    });
    window.Footage.light(slot, function (v) { var w = $('#win'); if (w) w.style.setProperty('--lux', clamp((v - 0.04) / 0.3, 0.04, 1).toFixed(2)); });
  }

  /* ---------- emergency dialog (demonstration) ---------- */
  var em = $('#em'), opener = null;
  function openEm(e) {
    if (!em || typeof em.showModal !== 'function') return;
    e.preventDefault(); opener = document.activeElement; if (!em.open) em.showModal();
  }
  $$('[data-em], #em-open').forEach(function (a) { a.addEventListener('click', openEm); });
  if (em) {
    em.addEventListener('close', function () { if (opener && opener.focus) opener.focus(); opener = null; });
    em.addEventListener('click', function (e) { if (e.target === em) em.close(); });
    $('#em-close').addEventListener('click', function () { em.close(); });
  }

  /* ---------- services: breakers (role=switch) ---------- */
  var sws = $$('.sw'), count = $('#count');
  function setSw(b, on, quiet) {
    b.setAttribute('aria-checked', on ? 'true' : 'false');
    var cov = document.getElementById(b.getAttribute('aria-controls')); if (cov) cov.hidden = !on;
    var st = $('.st', b); if (st) st.textContent = on ? 'On' : 'Off';
  }
  function tally() { var n = sws.filter(function (b) { return b.getAttribute('aria-checked') === 'true'; }).length; if (count) count.textContent = n + ' of ' + sws.length + ' ways on'; }
  sws.forEach(function (b, i) {
    setSw(b, i === 0);
    b.addEventListener('click', function () { setSw(b, b.getAttribute('aria-checked') !== 'true'); tally(); });
  });
  tally();
  var allOn = $('#all-on'), allOff = $('#all-off');
  if (allOn) allOn.addEventListener('click', function () { sws.forEach(function (b) { setSw(b, true); }); tally(); });
  if (allOff) allOff.addEventListener('click', function () { sws.forEach(function (b) { setSw(b, false); }); tally(); });

  /* ---------- the bus: one continuous line, drawn as you scroll, branches that energise ---------- */
  var bus = $('#bus'), rail = $('#rail'), secs = $$('.sec[data-node]');
  var state = { on: [], earth: false }, geo = null, lastP = 0, busTop = 0, pulseEl = null, raf = 0;
  function el(n, attrs, parent) { var e = document.createElementNS(NS, n); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }

  function build() {
    if (!bus || !rail) return;
    var mobile = window.innerWidth < 768;
    var W = mobile ? 34 : 84, bx = mobile ? 10 : 26, L = mobile ? 24 : 54;
    var br = bus.getBoundingClientRect(); busTop = br.top + window.scrollY; var H = bus.offsetHeight;
    var earthY = H - 8;
    rail.setAttribute('width', W); rail.setAttribute('height', H + 70); rail.setAttribute('viewBox', '0 0 ' + W + ' ' + (H + 70)); rail.textContent = '';
    /* the supply, the bus, the earth */
    el('rect', { x: bx - 8, y: 0, width: 16, height: 6, fill: '#17212d' }, rail);
    var baseP = el('path', { d: 'M' + bx + ' 6V' + earthY, 'class': 'base' }, rail);
    if (!mobile) { var t = el('text', { x: bx + 14, y: 14 }, rail); t.textContent = 'SUPPLY'; }
    var len = earthY - 6;
    var hotC = el('path', { d: 'M' + bx + ' 6V' + earthY, 'class': 'case hotw' }, rail), hotK = el('path', { d: 'M' + bx + ' 6V' + earthY, 'class': 'core hotw' }, rail);
    [hotC, hotK].forEach(function (p) { p.style.setProperty('--len', len); p.style.strokeDasharray = len; p.style.strokeDashoffset = len; });
    var nodes = secs.map(function (s, i) {
      var h = $('.node-h', s).getBoundingClientRect(), y = Math.round(h.top + window.scrollY - busTop + h.height / 2);
      var g = el('g', { 'class': 'branch' + (state.on[i] ? ' on closed' : '') }, rail);
      var gap0 = bx + (mobile ? 5 : 11), gap1 = gap0 + (mobile ? 11 : 22), x1 = bx + L;
      var seg = function (a, b, cls) {
        var d = 'M' + a + ' ' + y + 'H' + b, l = b - a;
        [['case hotw ' + cls], ['core hotw ' + cls]].forEach(function (c) { var p = el('path', { d: d, 'class': c[0] }, g); p.style.setProperty('--len', l); p.style.strokeDasharray = l; p.style.strokeDashoffset = l; });
      };
      el('path', { d: 'M' + bx + ' ' + y + 'H' + x1, 'class': 'base' }, g);
      seg(bx, gap0, 'pre'); seg(gap1, x1, 'post');
      el('circle', { cx: bx, cy: y, r: 5, 'class': 'dot' }, g);
      el('circle', { cx: gap0, cy: y, r: 3.2, 'class': 'ct' }, g); el('circle', { cx: gap1, cy: y, r: 3.2, 'class': 'ct' }, g);
      var lev = el('line', { x1: gap0, y1: y, x2: gap1, y2: y, 'class': 'lever' }, g); lev.style.transformOrigin = gap0 + 'px ' + y + 'px';
      el('circle', { cx: x1, cy: y, r: 5, 'class': 'end' }, g);
      if (!mobile) { var tx = el('text', { x: bx + 8, y: y - 13 }, g); tx.textContent = 'N' + (i + 1); }
      var guide = el('path', { d: 'M' + bx + ' ' + y + 'H' + x1, fill: 'none', stroke: 'none' }, g);
      return { y: y, g: g, guide: guide, L: L, sec: s, i: i };
    });
    var eg = el('g', { 'class': 'earth' + (state.earth ? ' on' : '') }, rail);
    el('path', { d: 'M' + (bx - 13) + ' ' + (earthY + 4) + 'H' + (bx + 13) + 'M' + (bx - 8) + ' ' + (earthY + 12) + 'H' + (bx + 8) + 'M' + (bx - 3) + ' ' + (earthY + 20) + 'H' + (bx + 3), fill: 'none' }, eg);
    pulseEl = el('circle', { r: 6, 'class': 'pulse', cx: -20, cy: -20 }, rail);
    geo = { hotC: hotC, hotK: hotK, nodes: nodes, earthY: earthY, eg: eg, bx: bx, len: len };
    nodes.forEach(function (n) { n.sec.classList.toggle('live', !!state.on[n.i]); });
    lastP = -1; frame();
  }

  function travel(n, fromY) {
    /* a small pulse runs down the bus, then out along the branch, closing the breaker as it passes */
    if (calm || !pulseEl) { n.g.classList.add('closed'); return; }
    var t0 = performance.now(), d1 = clamp(Math.abs(n.y - fromY) * 0.8, 260, 900), d2 = 520, closed = false;
    function step(t) {
      var dt = t - t0, pt;
      if (dt < d1) { var k = dt / d1; k = 1 - Math.pow(1 - k, 2); pt = { x: geo.bx, y: fromY + (n.y - fromY) * k }; }
      else if (dt < d1 + d2) { var k2 = (dt - d1) / d2; pt = n.guide.getPointAtLength(n.L * k2); if (!closed && k2 > 0.25) { closed = true; n.g.classList.add('closed'); } }
      else { pulseEl.classList.remove('go'); return; }
      pulseEl.classList.add('go'); pulseEl.setAttribute('cx', pt.x); pulseEl.setAttribute('cy', pt.y);
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var prevY = 6;
  function frame() {
    raf = 0; if (!geo) return;
    var p = calm ? geo.earthY : clamp(window.scrollY + window.innerHeight * 0.66 - busTop, 6, geo.earthY);
    if (p !== lastP) {
      lastP = p; var off = Math.max(0, geo.len - (p - 6));
      geo.hotC.style.strokeDashoffset = off; geo.hotK.style.strokeDashoffset = off;
      geo.nodes.forEach(function (n) {
        if (!state.on[n.i] && p >= n.y) {
          state.on[n.i] = true; n.sec.classList.add('live'); n.g.classList.add('on');
          if (calm) n.g.classList.add('closed'); else travel(n, prevY);
          prevY = n.y;
        }
      });
      if (!state.earth && p >= geo.earthY - 4) { state.earth = true; geo.eg.classList.add('on'); }
    }
  }
  function onScroll() { if (!raf) raf = requestAnimationFrame(frame); }
  if (bus && rail) {
    document.documentElement.classList.add('rv-on');
    var rebuild = function () { build(); };
    window.addEventListener('scroll', onScroll, { passive: true });
    var rt = 0; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(rebuild, 120); });
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { requestAnimationFrame(rebuild); });
    rebuild();
    if (window.ResizeObserver) { var h0 = bus.offsetHeight; new ResizeObserver(function () { if (Math.abs(bus.offsetHeight - h0) > 2) { h0 = bus.offsetHeight; clearTimeout(rt); rt = setTimeout(rebuild, 150); } }).observe(bus); }
  }

  /* reveal helper for the flow steps */
  var rvs = $$('.rv');
  if (!calm && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: 0.2 });
    rvs.forEach(function (e) { io.observe(e); });
  } else rvs.forEach(function (e) { e.classList.add('in'); });

  /* ---------- the enquiry board ---------- */
  var SERVICES = ['Fault finding', 'Lighting', 'Sockets and consumer units', 'Testing and certificates', 'EV charger points', 'Smoke alarm installs'];
  var URGENCY = ['Emergency', 'Today', 'This week', 'Planned'];
  var CONTACT = ['Phone call', 'Text message', 'Email', 'No preference'];
  var form = $('#enq'); if (!form) return;
  var ans = { service: '', urgency: '', contact: '' };
  function tiles(host, name, list) {
    list.forEach(function (t, i) {
      var l = document.createElement('label'); l.className = 'tile';
      l.innerHTML = '<input type="radio" name="' + name + '" value="' + t + '"><span>' + t + '</span>';
      host.appendChild(l);
    });
  }
  tiles($('#o-service'), 'service', SERVICES); tiles($('#o-urgency'), 'urgency', URGENCY); tiles($('#o-contact'), 'contact', CONTACT);
  var steps = $$('.step', form), prail = $$('#prail li'), cur = 0, errEl = $('#err'), now = $('#now');
  var NAMES = ['Service type', 'Urgency', 'Postcode area', 'Details', 'Contact preference', 'Review'];
  var nextB = $('#next'), backB = $('#back');
  var val = function (n) { var c = form.querySelector('input[name="' + n + '"]:checked'); return c ? c.value : ''; };
  function render(move) {
    steps.forEach(function (s, i) { s.hidden = i !== cur; });
    prail.forEach(function (li, i) { li.classList.toggle('done', i < cur); li.classList.toggle('cur', i === cur); if (i === cur) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
    now.textContent = 'Step ' + (cur + 1) + ' of 6: ' + NAMES[cur];
    backB.style.visibility = cur === 0 ? 'hidden' : 'visible';
    nextB.textContent = cur === 5 ? 'Show demo result' : 'Next';
    errEl.textContent = '';
    if (cur === 5) buildReview();
    if (cur === 1) $('#em-note').hidden = val('urgency') !== 'Emergency';
    if (move) { var h = $('h3', steps[cur]); if (h) h.focus({ preventScroll: false }); }
  }
  function row(k, v, edit) {
    var dl = document.createElement('div'); dl.innerHTML = '<dt></dt><dd></dd>' + (edit === undefined ? '' : '<dd class="act"><button type="button" class="edit">Edit<span class="vh"> ' + k + '</span></button></dd>');
    dl.firstChild.textContent = k; dl.children[1].textContent = v;
    if (edit !== undefined) dl.querySelector('.edit').addEventListener('click', function () { cur = edit; render(true); });
    return dl;
  }
  function summary(host, withEdit) {
    host.textContent = '';
    var rows = [['Service', val('service') || 'Not chosen'], ['Urgency', val('urgency') || 'Not chosen'], ['Postcode area', $('#f-area').value.trim() || 'Not given'], ['Details', $('#f-details').value.trim() || 'Not given'], ['Contact preference', val('contact') || 'Not chosen']];
    rows.forEach(function (r, i) { host.appendChild(row(r[0], r[1], withEdit ? i : undefined)); });
  }
  function buildReview() { summary($('#review'), true); }
  function check() {
    if (cur === 0 && !val('service')) return 'Choose a service to continue.';
    if (cur === 1 && !val('urgency')) return 'Choose how soon you need it.';
    if (cur === 4 && !val('contact')) return 'Choose a contact preference.';
    return '';
  }
  nextB.addEventListener('click', function () {
    var m = check(); if (m) { errEl.textContent = m; return; }
    if (cur < 5) { cur++; render(true); return; }
    summary($('#r-sum'), false);
    var u = val('urgency');
    var r = $('#result'); $('p.hint', r).textContent = (u === 'Emergency' ? 'You chose Emergency. In a live site the Emergency call button would be the way to reach the business at once. ' : '') + 'In a live site this would reach the business. Here it goes nowhere: nothing was sent, stored or booked, and no reply will follow.';
    form.hidden = true; r.hidden = false; $('#prail').classList.add('sent'); prail.forEach(function (li) { li.classList.add('done'); li.classList.remove('cur'); }); now.textContent = 'Demonstration complete. Nothing was sent.';
    r.focus();
  });
  backB.addEventListener('click', function () { if (cur > 0) { cur--; render(true); } });
  form.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type === 'text') { e.preventDefault(); nextB.click(); } });
  form.addEventListener('change', function (e) { errEl.textContent = ''; if (cur === 1) $('#em-note').hidden = val('urgency') !== 'Emergency'; });
  $('#again').addEventListener('click', function () {
    form.reset(); form.hidden = false; $('#result').hidden = true; cur = 0; render(true);
  });
  render(false);
})();
