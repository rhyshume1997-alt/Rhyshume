/* Little Kettle Café behaviour. Without this file the page is complete: the opening is the poster in its arch, every
   special and menu list is printed in full, and the demonstrations (which need a script to do anything) are hidden.
   Nothing here sends, stores or books anything: no network calls, no storage. */
(function () {
  'use strict';
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var EASE = 'cubic-bezier(0.23, 1, 0.32, 1)', SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

  /* opening: the pour, if the clip plays; the poster if not */
  var plate = $('#hero-plate'), slot = window.Footage && plate ? window.Footage.mount(plate) : null;
  if (slot) slot.listeners.push(function (what) {
    var t = $('#hero-tag'); if (!t) return;
    if (what === 'live') t.textContent = 'Generated concept footage';
    if (what === 'poster') t.textContent = 'Generated concept image';
  });

  /* scroll reveals */
  if ('IntersectionObserver' in window && !calm) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: 0.15 });
    $$('.rv').forEach(function (el) { io.observe(el); });
    document.documentElement.classList.add('rv-on');
  }

  function bump(el, from) {
    if (calm || !el.animate) return;
    el.animate([{ transform: 'scale(' + (from || 1.3) + ')' }, { transform: 'none' }], { duration: 380, easing: SPRING });
  }

  /* ---------- the specials board ---------- */
  var ul = $('#tiles'), countEl = $('#bd-count');
  function lis() { return $$('li', ul); }
  function tileBtn(li) { return $('.tile', li); }
  function isOn(li) { return li.classList.contains('flipped'); }
  function label(li, on) {
    $('.front', li).setAttribute('aria-hidden', on ? 'true' : 'false'); $('.back', li).setAttribute('aria-hidden', on ? 'false' : 'true');
    tileBtn(li).title = on ? 'Turn back over' : 'Turn over';
  }
  function tally() { var n = lis().filter(isOn).length; countEl.textContent = n + ' of ' + lis().length + ' turned over'; }
  function flip(li, on, delay) {
    if (on === undefined) on = !isOn(li);
    var faces = $$('.face', li); faces.forEach(function (f) { f.style.transitionDelay = delay ? delay + 'ms' : ''; });
    li.classList.toggle('flipped', on); label(li, on);
  }
  lis().forEach(function (li) { label(li, false); tileBtn(li).tabIndex = -1; });
  tileBtn(lis()[0]).tabIndex = 0;
  ul.addEventListener('click', function (e) {
    var b = e.target.closest('.tile'); if (!b) return;
    var li = b.parentNode; flip(li, undefined, 0); tally(); rove(b);
  });
  function rove(b) { lis().forEach(function (l) { tileBtn(l).tabIndex = tileBtn(l) === b ? 0 : -1; }); }
  ul.addEventListener('focusin', function (e) { var b = e.target.closest('.tile'); if (b) rove(b); });
  ul.addEventListener('keydown', function (e) {
    var b = e.target.closest('.tile'); if (!b) return;
    var all = lis(), i = all.indexOf(b.parentNode), cols = getComputedStyle(ul).gridTemplateColumns.split(' ').length, j = i;
    if (e.key === 'ArrowRight') j = Math.min(all.length - 1, i + 1);
    else if (e.key === 'ArrowLeft') j = Math.max(0, i - 1);
    else if (e.key === 'ArrowDown') j = i + cols < all.length ? i + cols : i;
    else if (e.key === 'ArrowUp') j = i - cols >= 0 ? i - cols : i;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = all.length - 1;
    else return;
    e.preventDefault(); tileBtn(all[j]).focus();
  });
  $('#reset').addEventListener('click', function () {
    var on = lis().filter(isOn); on.forEach(function (li, k) { flip(li, false, calm ? 0 : k * 70); }); tally();
  });
  $('#shuffle').addEventListener('click', function () {
    var all = lis(), first = all.map(function (li) { return li.getBoundingClientRect(); }), order = all.slice(), same = true, tries = 0;
    while (same && tries++ < 12) {
      for (var i = order.length - 1; i > 0; i--) { var r = Math.floor(Math.random() * (i + 1)), t = order[i]; order[i] = order[r]; order[r] = t; }
      same = order.every(function (li, k) { return li === all[k]; });
    }
    var focused = document.activeElement;
    order.forEach(function (li) { ul.appendChild(li); });
    if (focused && focused.focus) focused.focus({ preventScroll: true });
    countEl.textContent = 'Board shuffled. ' + lis().filter(isOn).length + ' of ' + all.length + ' turned over';
    if (calm || !all[0].animate) return;
    all.forEach(function (li, k) {
      var f = first[all.indexOf(li)], l = li.getBoundingClientRect(), dx = f.left - l.left, dy = f.top - l.top;
      if (!dx && !dy) return;
      var tilt = (k % 2 ? 1 : -1) * (4 + (k * 3) % 5);
      li.animate([
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1) rotate(0deg)', zIndex: 3 },
        { transform: 'translate(' + (dx * 0.5) + 'px,' + (dy * 0.5 - 14) + 'px) scale(0.9) rotate(' + tilt + 'deg)', offset: 0.5, zIndex: 3 },
        { transform: 'translate(0,0) scale(1) rotate(0deg)', zIndex: 3 }
      ], { duration: 720 + (k * 37) % 220, delay: (k * 53) % 240, easing: EASE, fill: 'backwards' });
    });
  });

  /* ---------- the menu tabs ---------- */
  var tabs = $$('.tab'), panels = $$('.panel'), cur = 0, tk = 0;
  function select(i, focus) {
    if (i === cur && !focus) return;
    var token = ++tk, out = panels[cur], inn = panels[i];
    tabs.forEach(function (t, k) { var on = k === i; t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; });
    if (focus) tabs[i].focus();
    var was = cur; cur = i;
    if (was === i) return;
    panels.forEach(function (p) { $$('.ticket', p).forEach(function (t) { t.getAnimations().forEach(function (a) { a.cancel(); }); }); });
    function swap() {
      if (token !== tk) return;
      panels.forEach(function (p, k) { p.classList.toggle('on', k === i); });
      if (calm) return;
      $$('.ticket', inn).forEach(function (t, k) {
        var from = k % 3 === 0 ? 'translate(-26px, 8px) rotate(-3deg)' : k % 3 === 1 ? 'translate(0, 26px) rotate(1.6deg)' : 'translate(26px, 8px) rotate(2.6deg)';
        t.animate([{ opacity: 0, transform: from }, { opacity: 1, transform: 'none' }], { duration: 480, delay: k * 60, easing: EASE, fill: 'backwards' });
      });
    }
    if (calm) { swap(); return; }
    var items = $$('.ticket', out);
    items.forEach(function (t, k) { t.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-10px) scale(0.98)' }], { duration: 140, delay: k * 14, easing: 'ease-in', fill: 'forwards' }); });
    setTimeout(function () { items.forEach(function (t) { t.getAnimations().forEach(function (a) { a.cancel(); }); }); swap(); }, 140 + items.length * 14);
  }
  tabs.forEach(function (t, i) { t.addEventListener('click', function () { select(i, false); }); });
  $('#tabs').addEventListener('keydown', function (e) {
    var i = tabs.indexOf(document.activeElement); if (i < 0) return;
    var j = i;
    if (e.key === 'ArrowRight') j = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') j = (i + tabs.length - 1) % tabs.length;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = tabs.length - 1;
    else return;
    e.preventDefault(); select(j, true);
  });

  /* ---------- the tray: a table order demonstration ---------- */
  var qty = {}, order = [], rows = {};
  var list = $('#tray-list'), emptyEl = $('#tray-empty'), numEl = $('#tray-n'), wordEl = $('#tray-w'), cbN = $('#cb-n'), out = $('#tray-out');
  var live = document.createElement('p'); live.className = 'vh'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); $('#tray').appendChild(live);
  function total() { return order.reduce(function (a, n) { return a + qty[n]; }, 0); }
  function paintTotals(announce) {
    var t = total(); numEl.textContent = t; cbN.textContent = t; wordEl.textContent = t === 1 ? 'item' : 'items';
    emptyEl.hidden = t > 0; bump(numEl, 1.35); bump(cbN, 1.4);
    if (announce) live.textContent = announce + ' ' + t + (t === 1 ? ' item' : ' items') + ' on the tray.';
    out.innerHTML = '';
  }
  function badge(name) {
    $$('.ticket').forEach(function (li) { if (li.getAttribute('data-name') !== name) return; var b = $('.add', li), n = qty[name] || 0; if (n) { b.setAttribute('data-n', n); $('.in', b).textContent = '×' + n; } else { b.removeAttribute('data-n'); } });
  }
  function row(name) {
    var li = document.createElement('li'); li.setAttribute('data-name', name);
    li.innerHTML = '<span class="nm"></span><span class="step"><button type="button" class="mn"><span aria-hidden="true">−</span></button><output aria-live="off"></output><button type="button" class="pl"><span aria-hidden="true">+</span></button></span>';
    $('.nm', li).textContent = name;
    $('.mn', li).setAttribute('aria-label', 'Take one ' + name + ' off the tray');
    $('.pl', li).setAttribute('aria-label', 'Add one more ' + name);
    $('.mn', li).addEventListener('click', function () { change(name, -1); });
    $('.pl', li).addEventListener('click', function () { change(name, 1); });
    return li;
  }
  function change(name, d, fromTicket) {
    var had = qty[name] || 0, n = Math.max(0, had + d); if (n === had) return;
    qty[name] = n;
    if (!had && n) {
      order.push(name); var r = row(name); rows[name] = r; list.appendChild(r);
      if (!calm && r.animate) r.animate([{ opacity: 0, transform: 'translateX(-18px) scale(0.96)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: EASE });
    }
    if (n) { $('output', rows[name]).textContent = n; if (!calm) bump($('output', rows[name]), 1.5); }
    else {
      var r2 = rows[name], idx = order.indexOf(name); order.splice(idx, 1); delete rows[name]; delete qty[name];
      var nextName = order[Math.min(idx, order.length - 1)], hadFocus = r2.contains(document.activeElement);
      r2.remove();
      if (hadFocus) { var nb = nextName ? $('.pl', rows[nextName]) : $('#tray'); nb.focus(); }
    }
    badge(name);
    paintTotals(d > 0 ? name + ' added.' : n ? name + ' taken off.' : name + ' removed.');
  }
  $$('.ticket').forEach(function (li) {
    var name = li.getAttribute('data-name'), b = document.createElement('button');
    b.type = 'button'; b.className = 'add'; b.setAttribute('aria-label', 'Add ' + name + ' to the tray');
    b.innerHTML = '<span class="pl" aria-hidden="true">+</span><span class="mono ad" aria-hidden="true">Add</span><span class="mono in" aria-hidden="true"></span>';
    li.appendChild(b);
    b.addEventListener('click', function (e) { e.stopPropagation(); change(name, 1, true); if (!calm && b.animate) b.animate([{ transform: 'scale(0.82) rotate(-5deg)' }, { transform: 'none' }], { duration: 380, easing: SPRING }); });
    li.addEventListener('click', function (e) { if (e.target.closest('button')) return; b.click(); });
  });
  $('#tray-clear').addEventListener('click', function () {
    var names = order.slice(); names.forEach(function (n) { qty[n] = 0; badge(n); }); order = []; qty = {}; rows = {}; list.innerHTML = '';
    paintTotals(names.length ? 'Tray cleared.' : 'The tray was already empty.'); if (!names.length) live.textContent = 'The tray is already empty.';
  });
  $('#tray-go').addEventListener('click', function () {
    if (!total()) { out.innerHTML = '<div class="receipt"><p><b>The tray is empty.</b> Tap the stub of a ticket to add something, then try again.</p></div>'; return; }
    var html = '<div class="receipt"><p class="mono">Table order, demonstration</p><ul>' + order.map(function (n) { return '<li>' + qty[n] + ' × ' + n.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</li>'; }).join('') + '</ul><p><b>Nothing is ordered or sent.</b> This only shows how a table order could look. No prices, no totals, no payment.</p></div>';
    out.innerHTML = html;
    var r = $('.receipt', out); if (!calm && r.animate) r.animate([{ opacity: 0, transform: 'translateY(14px) rotate(-1.5deg)' }, { opacity: 1, transform: 'none' }], { duration: 480, easing: EASE });
  });
  paintTotals('');

  /* ---------- the booking demonstration ---------- */
  var form = $('#book-form'), bout = $('#book-out');
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function bad(input, msg, show) { input.setAttribute('aria-invalid', show ? 'true' : 'false'); if (!show) input.removeAttribute('aria-invalid'); msg.hidden = !show; }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('#b-name'), date = $('#b-date'), nOk = name.value.trim() !== '', dOk = date.value !== '';
    bad(name, $('#b-name-e'), !nOk); bad(date, $('#b-date-e'), !dOk);
    if (!nOk) { name.focus(); bout.innerHTML = ''; return; }
    if (!dOk) { date.focus(); bout.innerHTML = ''; return; }
    var ask = $('input[name=kind]:checked', form).value === 'ask', d = new Date(date.value + 'T12:00:00'), ds = isNaN(d) ? date.value : d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    bout.innerHTML = '<div class="stubcard"><p class="mono">Demonstration: nothing is sent</p><h4>' + (ask ? 'A question about a booking' : 'A table, if this were live') + '</h4><dl><dt>Name</dt><dd>' + esc(name.value.trim()) + '</dd><dt>Party</dt><dd>' + esc($('#b-size').value) + '</dd><dt>Date</dt><dd>' + esc(ds) + '</dd><dt>Time of day</dt><dd>' + esc($('#b-time').value) + '</dd></dl><p>This is how an enquiry would read back to you. Nothing was sent, stored or booked, and the café has heard nothing. How to reach the café: [contact details to be confirmed].</p></div>';
    var c = $('.stubcard', bout); if (!calm && c.animate) c.animate([{ opacity: 0, transform: 'translateY(16px) rotate(1.5deg)' }, { opacity: 1, transform: 'none' }], { duration: 520, easing: EASE });
  });
  $('#b-name').addEventListener('input', function () { bad(this, $('#b-name-e'), false); });
  $('#b-date').addEventListener('input', function () { bad(this, $('#b-date-e'), false); });
})();
