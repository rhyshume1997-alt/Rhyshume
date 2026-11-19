/* Sunny Hours Club behaviour. Without this file the page is complete: the poster, the parent facts and the four steps
   all read as plain content, and the planner and enquiry (which need a script to do anything) are hidden with a plain explanation.
   Nothing here sends, stores or persists anything. */
(function () {
  'use strict';
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  /* ---------- the opening clip ---------- */
  var plate = $('#hero-plate');
  var slot = window.Footage && plate ? window.Footage.mount(plate) : null;
  if (slot) slot.listeners.push(function (what) {
    var t = $('#hero-tag');
    if (t) t.textContent = what === 'live' ? 'Generated concept footage' : 'Generated concept image';
  });
  /* drifting shapes pause when their section is off screen */
  if ('IntersectionObserver' in window) {
    var drift = new IntersectionObserver(function (es) { es.forEach(function (e) { e.target.classList.toggle('still', !e.isIntersecting); }); });
    $$('[data-drift]').forEach(function (s) { drift.observe(s); });
  }

  /* ---------- the planner ---------- */
  var ACT = [
    { id: 'make', name: 'Make', sub: 'Paper, pens and glue', icon: 's-star' },
    { id: 'move', name: 'Move', sub: 'Games that get everyone running about', icon: 's-zig' },
    { id: 'play', name: 'Play', sub: 'Board games and table games', icon: 's-circle' },
    { id: 'read', name: 'Read', sub: 'A story corner and book swaps', icon: 's-arch' },
    { id: 'grow', name: 'Grow garden', sub: 'Planting and watering', icon: 's-flower' },
    { id: 'music', name: 'Music', sub: 'Singing and simple instruments', icon: 's-half' }
  ];
  var DAYS = [
    { n: 'Monday', s: 'Mon', icon: 's-star', c: 'var(--red)' },
    { n: 'Tuesday', s: 'Tue', icon: 's-circle', c: 'var(--teal)' },
    { n: 'Wednesday', s: 'Wed', icon: 's-half', c: 'var(--sun)' },
    { n: 'Thursday', s: 'Thu', icon: 's-flower', c: 'var(--red)' },
    { n: 'Friday', s: 'Fri', icon: 's-arch', c: 'var(--teal)' }
  ];
  var ROWS = ['First activity', 'Second activity'];
  var byId = {}; ACT.forEach(function (a) { byId[a.id] = a; });

  var pl = $('#pl'); if (!pl) return;
  var tilesEl = $('#tiles'), board = $('#board'), statusEl = $('#status'), hold = $('#hold'), cancelBtn = $('#cancel');
  var grid = DAYS.map(function () { return [null, null]; });
  var held = null, heldTile = null, cur = { d: 0, r: 0 }, dragging = null, suppress = false;
  var drops = DAYS.map(function () { return [null, null]; });

  function svg(id) { return '<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#' + id + '"/></svg>'; }
  function say(t) { statusEl.textContent = t; }
  function total() { return grid.reduce(function (n, d) { return n + d.filter(Boolean).length; }, 0); }
  function lc(s) { return s.charAt(0).toLowerCase() + s.slice(1); }

  /* tiles */
  ACT.forEach(function (a) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'tile a-' + a.id; b.setAttribute('data-a', a.id); b.setAttribute('aria-pressed', 'false');
    b.innerHTML = '<span class="tile-art">' + svg(a.icon) + '</span><span class="tile-txt"><span class="tile-n">' + a.name + '</span><span class="tile-s">' + a.sub + '</span></span>';
    tilesEl.appendChild(b);
  });
  var tileEls = $$('.tile', tilesEl);

  /* board */
  DAYS.forEach(function (day, d) {
    var el = document.createElement('div');
    el.className = 'day'; el.setAttribute('role', 'group'); el.setAttribute('aria-label', day.n); el.style.setProperty('--dc', day.c);
    var h = '<div class="day-h"><h3>' + day.n + '</h3>' + svg(day.icon) + '</div>' +
      '<div class="slot fixed"><span class="sl mono">Pick-up and snack</span><span class="fx">Same every day</span></div>';
    ROWS.forEach(function (rn, r) {
      h += '<div class="slot"><span class="sl mono">' + rn + '</span><div class="slot-wrap"><button type="button" class="drop" data-d="' + d + '" data-r="' + r + '" tabindex="' + (d === 0 && r === 0 ? 0 : -1) + '"></button></div></div>';
    });
    h += '<div class="slot fixed"><span class="sl mono">Home time</span><span class="fx">Times to be confirmed</span></div>';
    el.innerHTML = h; board.appendChild(el);
    $$('.drop', el).forEach(function (b) { drops[d][+b.getAttribute('data-r')] = b; });
  });

  function label(d, r) {
    var a = grid[d][r] && byId[grid[d][r]];
    var s = DAYS[d].n + ', ' + lc(ROWS[r]) + ', ' + (a ? a.name + ' placed' : 'empty');
    if (held) s += '. Press Enter to place ' + byId[held].name + ' here';
    else if (a) s += '. Press Delete to remove';
    return s;
  }
  function paintSlot(d, r) {
    var b = drops[d][r], id = grid[d][r], a = id && byId[id];
    var wrap = b.parentNode, old = $('.rm', wrap); if (old) old.remove();
    if (a) {
      b.classList.add('filled');
      b.innerHTML = '<span class="chip a-' + a.id + '"><span class="chip-art">' + svg(a.icon) + '</span><span class="chip-n">' + a.name + '</span></span>';
      var x = document.createElement('button'); x.type = 'button'; x.className = 'rm'; x.setAttribute('data-d', d); x.setAttribute('data-r', r);
      x.setAttribute('aria-label', 'Remove ' + a.name + ' from ' + DAYS[d].n + ', ' + lc(ROWS[r]));
      x.innerHTML = '<span aria-hidden="true">&times;</span>'; wrap.appendChild(x);
    } else { b.classList.remove('filled'); b.innerHTML = ''; }
    b.setAttribute('aria-label', label(d, r));
  }
  function relabel() { for (var d = 0; d < 5; d++) for (var r = 0; r < 2; r++) drops[d][r].setAttribute('aria-label', label(d, r)); }

  /* summary */
  var countEl = $('#count'), sumList = $('#sum-list'), navCount = $('#nav-count'), cbCount = $('#cb-count');
  function plannedDays() { var o = []; grid.forEach(function (g, d) { if (g[0] || g[1]) o.push(d); }); return o; }
  function dayText(d) { return grid[d].filter(Boolean).map(function (id) { return byId[id].name; }).join(', '); }
  function paintSummary(bump) {
    var n = total();
    countEl.textContent = n; navCount.textContent = n; cbCount.textContent = n ? n : '';
    if (bump && !calm && countEl.animate) countEl.animate([{ transform: 'scale(1.3) rotate(-6deg)' }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(0.34,1.56,0.64,1)' });
    sumList.innerHTML = DAYS.map(function (day, d) {
      var ids = grid[d].filter(Boolean), t = ids.length ? dayText(d) : 'Nothing yet';
      return '<li class="' + (ids.length ? 'has' : '') + '"><b>' + day.s + '</b><span class="dots" aria-hidden="true">' + [0, 1].map(function (r) { return '<i class="' + (grid[d][r] ? 'a-' + grid[d][r] : '') + '"></i>'; }).join('') + '</span><span class="t"><span class="vh">' + day.n + ': </span>' + t + '</span></li>';
    }).join('');
    countEl.setAttribute('aria-label', n + ' of 10 sessions chosen');
  }

  /* holding */
  function setHold(id, tileEl) {
    held = id; heldTile = tileEl || null;
    tileEls.forEach(function (t) { t.setAttribute('aria-pressed', String(t.getAttribute('data-a') === id)); });
    board.classList.toggle('holding', !!id); hold.setAttribute('data-on', id ? '1' : '0'); cancelBtn.hidden = !id;
    relabel();
  }
  function idleText() { return total() ? 'Pick up another tile, or press Delete on a filled slot to remove it.' : 'Pick up a tile (click it, or press Enter), then choose a slot. Or drag it.'; }
  function pick(id, tileEl, viaKey) {
    setHold(id, tileEl);
    say('Holding ' + byId[id].name + '. ' + (viaKey ? 'Use the arrow keys to choose a day and slot, Enter to place it, Escape to cancel.' : 'Now choose a slot to place it, or cancel.'));
    if (viaKey) drops[cur.d][cur.r].focus();
  }
  function cancel(refocus) {
    var t = heldTile; var name = held ? byId[held].name : '';
    setHold(null); if (name) say(name + ' put back. ' + idleText());
    if (refocus && t) t.focus();
  }

  function fly(d, r, from) {
    var chip = $('.chip', drops[d][r]); if (!chip) return;
    if (calm || !from || !chip.animate) return;
    var to = chip.getBoundingClientRect();
    var g = chip.cloneNode(true); g.className += ' ghost'; g.style.inlineSize = to.width + 'px'; g.style.insetInlineStart = to.left + 'px'; g.style.insetBlockStart = to.top + 'px'; g.style.boxShadow = 'none';
    document.body.appendChild(g); chip.style.visibility = 'hidden';
    var dx = from.left + from.width / 2 - (to.left + to.width / 2), dy = from.top + from.height / 2 - (to.top + to.height / 2), s = Math.max(0.6, Math.min(1.8, from.width / to.width));
    var an = g.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ') rotate(-8deg)' }, { transform: 'translate(0,0) scale(1.08) rotate(2deg)', offset: 0.72 }, { transform: 'none' }], { duration: 560, easing: 'cubic-bezier(0.23,1,0.32,1)' });
    var done = function () { g.remove(); chip.style.visibility = ''; var b = drops[d][r]; b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); };
    an.onfinish = done; an.oncancel = done;
  }
  function place(d, r, from) {
    var id = held; if (!id) return;
    var prev = grid[d][r] && byId[grid[d][r]];
    grid[d][r] = id; setHold(null); paintSlot(d, r); paintSummary(true); fly(d, r, from);
    say(byId[id].name + ' placed on ' + DAYS[d].n + ', ' + lc(ROWS[r]) + (prev ? ', replacing ' + prev.name : '') + '. ' + total() + ' of 10 sessions chosen.');
  }
  function remove(d, r) {
    var a = grid[d][r] && byId[grid[d][r]]; if (!a) return;
    grid[d][r] = null; paintSlot(d, r); paintSummary(true); relabel();
    say(a.name + ' removed from ' + DAYS[d].n + ', ' + lc(ROWS[r]) + '. ' + total() + ' of 10 sessions chosen.');
  }
  function rectOf(el) { return el ? el.getBoundingClientRect() : null; }

  /* tiles: click or Enter picks up, drag with a mouse or pen */
  tilesEl.addEventListener('click', function (e) {
    var t = e.target.closest('.tile'); if (!t) return;
    if (suppress) { suppress = false; return; }
    var id = t.getAttribute('data-a');
    if (held === id) cancel(false); else pick(id, t, e.detail === 0);
  });
  tilesEl.addEventListener('pointerdown', function (e) {
    var t = e.target.closest('.tile'); if (!t || e.pointerType === 'touch' || e.button !== 0) return;
    dragging = { t: t, id: t.getAttribute('data-a'), x: e.clientX, y: e.clientY, on: false, ghost: null, pid: e.pointerId, over: null };
  });
  function overDrop(x, y) { var el = document.elementFromPoint(x, y); return el && el.closest ? el.closest('.drop') : null; }
  document.addEventListener('pointermove', function (e) {
    var g = dragging; if (!g || e.pointerId !== g.pid) return;
    if (!g.on) {
      if (Math.hypot(e.clientX - g.x, e.clientY - g.y) < 6) return;
      g.on = true; var r = g.t.getBoundingClientRect();
      g.ghost = g.t.cloneNode(true); g.ghost.className = 'tile ghost a-' + g.id; g.ghost.removeAttribute('aria-pressed'); g.ghost.style.inlineSize = r.width + 'px'; g.ghost.style.transition = 'none';
      g.w = r.width; g.h = r.height; document.body.appendChild(g.ghost); g.t.classList.add('lifted');
      pick(g.id, g.t, false); say('Dragging ' + byId[g.id].name + '. Drop it on a slot.');
    }
    g.ghost.style.transform = 'translate(' + (e.clientX - g.w / 2) + 'px,' + (e.clientY - g.h / 2) + 'px) rotate(-4deg) scale(0.9)';
    var o = overDrop(e.clientX, e.clientY);
    if (o !== g.over) { if (g.over) g.over.classList.remove('over'); if (o) o.classList.add('over'); g.over = o; }
  }, { passive: true });
  function endDrag(e, ok) {
    var g = dragging; if (!g || (e && e.pointerId !== g.pid)) return; dragging = null;
    if (!g.on) return;
    suppress = true; setTimeout(function () { suppress = false; }, 0);
    g.t.classList.remove('lifted'); if (g.over) g.over.classList.remove('over');
    var gr = g.ghost.getBoundingClientRect();
    if (ok && g.over) { g.ghost.remove(); place(+g.over.getAttribute('data-d'), +g.over.getAttribute('data-r'), gr); return; }
    var tr = g.t.getBoundingClientRect(); var ghost = g.ghost;
    cancel(false);
    if (!calm && ghost.animate) { var a = ghost.animate([{ transform: ghost.style.transform }, { transform: 'translate(' + tr.left + 'px,' + tr.top + 'px) rotate(0deg) scale(1)' }], { duration: 260, easing: 'cubic-bezier(0.23,1,0.32,1)' }); a.onfinish = function () { ghost.remove(); }; } else ghost.remove();
  }
  document.addEventListener('pointerup', function (e) { endDrag(e, true); });
  document.addEventListener('pointercancel', function (e) { endDrag(e, false); });

  /* slots */
  board.addEventListener('click', function (e) {
    var x = e.target.closest('.rm'); if (x) { var d0 = +x.getAttribute('data-d'), r0 = +x.getAttribute('data-r'); remove(d0, r0); drops[d0][r0].focus(); return; }
    var b = e.target.closest('.drop'); if (!b) return;
    var d = +b.getAttribute('data-d'), r = +b.getAttribute('data-r'); cur = { d: d, r: r };
    if (held) place(d, r, e.detail === 0 ? rectOf(heldTile) : rectOf(heldTile));
    else if (grid[d][r]) say(DAYS[d].n + ', ' + lc(ROWS[r]) + ': ' + byId[grid[d][r]].name + '. Use the remove button to clear it, or pick up another tile to replace it.');
    else say('Pick up a tile first, then choose a slot.');
  });
  function focusSlot(d, r) {
    d = Math.max(0, Math.min(4, d)); r = Math.max(0, Math.min(1, r));
    drops[cur.d][cur.r].tabIndex = -1; cur = { d: d, r: r }; drops[d][r].tabIndex = 0; drops[d][r].focus();
  }
  board.addEventListener('focusin', function (e) {
    var b = e.target.closest && e.target.closest('.drop'); if (!b) return;
    drops[cur.d][cur.r].tabIndex = -1; cur = { d: +b.getAttribute('data-d'), r: +b.getAttribute('data-r') }; b.tabIndex = 0;
  });
  board.addEventListener('keydown', function (e) {
    var b = e.target.closest('.drop'); if (!b) return;
    var d = +b.getAttribute('data-d'), r = +b.getAttribute('data-r'), k = e.key;
    if (k === 'ArrowRight') { e.preventDefault(); focusSlot(d + 1, r); }
    else if (k === 'ArrowLeft') { e.preventDefault(); focusSlot(d - 1, r); }
    else if (k === 'ArrowDown') { e.preventDefault(); focusSlot(d, r + 1); }
    else if (k === 'ArrowUp') { e.preventDefault(); focusSlot(d, r - 1); }
    else if (k === 'Home') { e.preventDefault(); focusSlot(0, r); }
    else if (k === 'End') { e.preventDefault(); focusSlot(4, r); }
    else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); if (grid[d][r]) remove(d, r); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (dragging && dragging.on) { endDrag(null, false); return; }
    if (held) { e.preventDefault(); var inside = pl.contains(document.activeElement); cancel(inside); }
  });
  cancelBtn.addEventListener('click', function () { cancel(true); });

  /* example and clear */
  var EXAMPLE = [['make', 'move'], ['play', 'read'], ['grow', 'music'], ['move', 'make'], ['play', 'music']];
  $('#example').addEventListener('click', function () {
    setHold(null);
    EXAMPLE.forEach(function (row, d) { row.forEach(function (id, r) { grid[d][r] = id; paintSlot(d, r); if (!calm) { var b = drops[d][r]; b.style.animationDelay = (d * 2 + r) * 55 + 'ms'; b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); } }); });
    paintSummary(true); relabel(); dayTouched = false; say('Example week placed: ten sessions. Change anything you like.');
  });
  $('#clear').addEventListener('click', function () {
    setHold(null); grid.forEach(function (g, d) { g[0] = g[1] = null; paintSlot(d, 0); paintSlot(d, 1); });
    paintSummary(true); dayTouched = false; say('The week is cleared. ' + idleText());
  });
  $('#use-week').addEventListener('click', function () { dayTouched = false; });

  for (var d = 0; d < 5; d++) for (var r = 0; r < 2; r++) paintSlot(d, r);
  paintSummary(false);

  /* ---------- the enquiry stepper ---------- */
  var form = $('#ask-form'), steps = $$('.step', form), prog = $$('#prog li'), back = $('#back'), next = $('#next'), result = $('#result'), panelProg = $('#prog');
  var stepNo = 1, dayTouched = false;
  var dayBoxes = $$('input[name=day]', form);
  dayBoxes.forEach(function (c) { c.addEventListener('change', function () { dayTouched = true; }); });

  function showStep(n, focus) {
    stepNo = n;
    steps.forEach(function (s, i) { s.hidden = i + 1 !== n; });
    prog.forEach(function (li, i) { li.classList.toggle('cur', i + 1 === n); li.classList.toggle('done', i + 1 < n); if (i + 1 === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
    back.hidden = n === 1; next.textContent = n === 4 ? 'See the demonstration result' : 'Next';
    if (n === 2) syncDays();
    if (focus) { var s = steps[n - 1]; s.tabIndex = -1; s.focus({ preventScroll: false }); }
  }
  function syncDays() {
    var pd = plannedDays(), fp = $('#from-plan');
    if (!dayTouched) dayBoxes.forEach(function (c, i) { c.checked = pd.indexOf(i) > -1; });
    if (pd.length) fp.textContent = 'Taken from your planner: ' + pd.map(function (d) { return DAYS[d].n + ' (' + dayText(d) + ')'; }).join(', ') + '. Change the days below if you like.';
    else fp.textContent = 'Your planner is empty, so choose the days here. You can also go back to the planner and build a week first.';
  }
  function err(n, msg) { var e = $('#err-' + n); e.textContent = msg; e.hidden = !msg; return !msg; }
  function valid(n) {
    if (n === 1) { if (form.elements.age.value) return err(1, ''); err(1, 'Please choose an age band, or "Not sure yet".'); $$('input[name=age]')[0].focus(); return false; }
    if (n === 2) { if (dayBoxes.some(function (c) { return c.checked; })) return err(2, ''); err(2, 'Please choose at least one day.'); dayBoxes[0].focus(); return false; }
    if (n === 4) { if (form.elements.contact.value) return err(4, ''); err(4, 'Please choose how you would like us to get in touch.'); $$('input[name=contact]')[0].focus(); return false; }
    return true;
  }
  function row(dl, k, v) { var w = document.createElement('div'), a = document.createElement('dt'), b = document.createElement('dd'); a.textContent = k; b.textContent = v; w.appendChild(a); w.appendChild(b); dl.appendChild(w); }
  next.addEventListener('click', function () {
    if (!valid(stepNo)) return;
    if (stepNo < 4) { showStep(stepNo + 1, true); return; }
    var dl = $('#recap'); dl.innerHTML = '';
    var days = dayBoxes.filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
    row(dl, 'Age band', form.elements.age.value);
    row(dl, 'Days wanted', days.join(', '));
    var plan = plannedDays(); row(dl, 'Planner', plan.length ? total() + ' sessions: ' + plan.map(function (d) { return DAYS[d].s + ' ' + dayText(d); }).join('; ') : 'No sessions placed');
    row(dl, 'To know', form.elements.know.value.trim() || 'Nothing added');
    row(dl, 'Contact preference', form.elements.contact.value);
    form.hidden = true; panelProg.hidden = true; result.hidden = false; result.focus();
  });
  back.addEventListener('click', function () { if (stepNo > 1) showStep(stepNo - 1, true); });
  $('#again').addEventListener('click', function () {
    form.reset(); dayTouched = false; [1, 2, 4].forEach(function (n) { err(n, ''); });
    result.hidden = true; form.hidden = false; panelProg.hidden = false; showStep(1, true);
  });
  form.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') { e.preventDefault(); next.click(); } });
  form.addEventListener('change', function () { if (!$('#err-1').hidden && form.elements.age.value) err(1, ''); if (!$('#err-2').hidden && dayBoxes.some(function (c) { return c.checked; })) err(2, ''); if (!$('#err-4').hidden && form.elements.contact.value) err(4, ''); });
  showStep(1, false);
  say(idleText());
})();
