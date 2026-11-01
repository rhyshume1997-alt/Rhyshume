/* rhyshume.co.uk: the clickable "how the system works" flow and the system map.
   Plain JavaScript, no libraries. Without it the flow is an ordered list and the map has a list under it. */
(function () {
  'use strict';

  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var wide = window.matchMedia ? window.matchMedia('(min-width: 70rem)') : { matches: true };
  var SERVICE = {
    website: ['Website', '/websites'],
    automation: ['Automation', '/automation'],
    tolra: ['Tolra', '/tolra'],
    csv: ['CSV', '/csv']
  };
  var uid = 0;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function samePage(href) {
    var here = location.pathname.replace(/\/$/, '') || '/';
    return here === href;
  }

  function chip(key, extra) {
    var info = SERVICE[key];
    if (!info) return null;
    var node = samePage(info[1]) ? el('span', 'chip chip-' + key + (extra ? ' is-also' : ''), info[0]) : el('a', 'chip chip-' + key + (extra ? ' is-also' : ''), info[0]);
    if (node.tagName === 'A') node.href = info[1];
    return node;
  }

  var SHORT = { website: 'Web', automation: 'Auto', tolra: 'Tolra', csv: 'CSV' };

  // A small coloured label. Narrow cards show a short form, the full name stays in the page for screen readers.
  function tag(key, also) {
    var t = el('span', 'fs-tag fs-' + key + (also ? ' is-also' : ''));
    t.appendChild(el('span', 'lg', (also ? '+ ' : '') + SERVICE[key][0]));
    var sh = el('span', 'sh', (also ? '+ ' : '') + SHORT[key]);
    sh.setAttribute('aria-hidden', 'true');
    t.appendChild(sh);
    return t;
  }

  /* ---------------------------------------------------------------- flow */
  function initFlow(root) {
    var items = Array.prototype.slice.call(root.querySelectorAll('.flow-static > li'));
    if (!items.length) return;
    var id = root.id || ('flow' + (++uid));
    var panelId = id + '-panel';

    var steps = items.map(function (li) {
      return {
        title: li.querySelector('h3').textContent,
        service: li.getAttribute('data-service'),
        also: (li.getAttribute('data-also') || '').split(',').filter(Boolean),
        sb: li.getAttribute('data-sb') || '',
        sa: li.getAttribute('data-sa') || '',
        before: li.querySelector('.t-before').textContent,
        after: li.querySelector('.t-after').textContent,
        outcome: li.querySelector('.t-outcome').textContent
      };
    });

    var active = 0;
    var view = 'after';
    var ui = el('div', 'flow-ui');

    /* controls: legend, before and after switch, auto-play */
    var controls = el('div', 'flow-controls');
    var legend = el('ul', 'flow-legend');
    legend.setAttribute('aria-label', 'Colour key, one colour for each service');
    var seen = {};
    steps.forEach(function (s) {
      [s.service].concat(s.also).forEach(function (k) {
        if (!SERVICE[k] || seen[k]) return;
        seen[k] = true;
        var li = el('li');
        var sw = el('span', 'sw sw-' + k);
        sw.setAttribute('aria-hidden', 'true');
        li.appendChild(sw);
        li.appendChild(document.createTextNode(SERVICE[k][0]));
        legend.appendChild(li);
      });
    });

    var right = el('div', 'flow-actions');
    var seg = el('div', 'seg');
    seg.setAttribute('role', 'group');
    seg.setAttribute('aria-label', 'Switch between the old manual way and the connected system');
    var bBefore = el('button', '', 'Before');
    var bAfter = el('button', '', 'After');
    bBefore.type = bAfter.type = 'button';
    seg.appendChild(bBefore);
    seg.appendChild(bAfter);
    var play = el('button', 'btn btn-sm btn-ghost flow-play', 'Auto-play');
    play.type = 'button';
    play.setAttribute('aria-pressed', 'false');
    right.appendChild(seg);
    if (!reduce) right.appendChild(play);
    controls.appendChild(legend);
    controls.appendChild(right);

    /* the steps */
    var track = el('ol', 'flow-track');
    track.setAttribute('aria-label', root.getAttribute('data-label') || 'The steps');
    track.style.setProperty('--n', String(steps.length));
    var panel = el('div', 'flow-panel');
    panel.id = panelId;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Step details');

    var holders = [];
    var buttons = steps.map(function (s, i) {
      var li = el('li', 'flow-item');
      li.setAttribute('data-service', s.service);
      var b = el('button', 'flow-step');
      b.type = 'button';
      b.setAttribute('data-service', s.service);
      b.setAttribute('aria-expanded', 'false');
      b.setAttribute('aria-controls', panelId);
      b.tabIndex = -1;
      b.appendChild(el('span', 'fs-num', String(i + 1)));
      b.appendChild(el('span', 'fs-name', s.title));
      var tags = el('span', 'fs-tags');
      tags.appendChild(tag(s.service, false));
      s.also.forEach(function (k) { if (SERVICE[k]) tags.appendChild(tag(k, true)); });
      b.appendChild(tags);
      var state = el('span', 'fs-state');
      state.appendChild(el('span', 'st-b', s.sb));
      state.appendChild(el('span', 'st-a', s.sa));
      b.appendChild(state);
      b.addEventListener('click', function () { select(i, true); });
      li.appendChild(b);
      track.appendChild(li);
      holders.push(li);
      return b;
    });

    ui.appendChild(controls);
    ui.appendChild(track);
    ui.appendChild(panel);
    root.appendChild(ui);

    function block(cls, heading, text) {
      var d = el('div', 'p-block ' + cls);
      d.appendChild(el('h4', '', heading));
      d.appendChild(el('p', '', text));
      return d;
    }

    function renderPanel() {
      var s = steps[active];
      panel.innerHTML = '';
      panel.appendChild(el('h3', '', 'Step ' + (active + 1) + ' of ' + steps.length + ': ' + s.title));
      var who = el('p', 'p-who');
      who.appendChild(el('span', 'p-who-label', 'Done by'));
      var c = chip(s.service);
      if (c) who.appendChild(c);
      s.also.forEach(function (k) { var x = chip(k, true); if (x) who.appendChild(x); });
      panel.appendChild(who);
      var grid = el('div', 'p-grid');
      grid.appendChild(block('p-before', 'The old way', s.before));
      grid.appendChild(block('p-after', 'What the system does', s.after));
      grid.appendChild(block('p-outcome', 'The outcome for the business', s.outcome));
      panel.appendChild(grid);
      var info = SERVICE[s.service];
      if (!samePage(info[1])) {
        var p = el('p', 'p-link');
        var a = el('a', 'textlink', 'See how the ' + info[0] + ' service does this');
        a.href = info[1];
        p.appendChild(a);
        panel.appendChild(p);
      }
    }

    function place() {
      if (wide.matches) ui.appendChild(panel);
      else holders[active].appendChild(panel);
    }

    function select(i, byUser) {
      active = (i + steps.length) % steps.length;
      buttons.forEach(function (b, k) {
        var on = k === active;
        b.setAttribute('aria-expanded', on ? 'true' : 'false');
        b.classList.toggle('is-active', on);
        b.tabIndex = on ? 0 : -1;
        holders[k].classList.toggle('is-active', on);
      });
      renderPanel();
      place();
      if (byUser) stopAuto();
    }

    function setView(v) {
      view = v;
      root.setAttribute('data-view', v);
      bBefore.setAttribute('aria-pressed', v === 'before' ? 'true' : 'false');
      bAfter.setAttribute('aria-pressed', v === 'after' ? 'true' : 'false');
    }
    bBefore.addEventListener('click', function () { setView('before'); });
    bAfter.addEventListener('click', function () { setView('after'); });

    /* keyboard: arrows move between steps, Home and End jump, Enter or Space opens a step */
    track.addEventListener('keydown', function (e) {
      var i = buttons.indexOf(document.activeElement);
      if (i < 0) return;
      var next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % buttons.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + buttons.length) % buttons.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = buttons.length - 1;
      if (next == null) return;
      e.preventDefault();
      buttons.forEach(function (b, k) { b.tabIndex = k === next ? 0 : -1; });
      buttons[next].focus();
    });

    /* auto-play: every 3 seconds, paused by a click, by hovering and while focus is in the steps */
    var timer = null, wantAuto = false, hovering = false, focusing = false;
    function sync() {
      var run = wantAuto && !hovering && !focusing && !document.hidden;
      if (run && !timer) timer = setInterval(function () { select(active + 1, false); }, 3000);
      if (!run && timer) { clearInterval(timer); timer = null; }
    }
    function stopAuto() {
      if (!wantAuto) return;
      wantAuto = false;
      play.setAttribute('aria-pressed', 'false');
      play.textContent = 'Auto-play';
      sync();
    }
    play.addEventListener('click', function () {
      wantAuto = !wantAuto;
      play.setAttribute('aria-pressed', wantAuto ? 'true' : 'false');
      play.textContent = wantAuto ? 'Pause' : 'Auto-play';
      sync();
    });
    ui.addEventListener('mouseenter', function () { hovering = true; sync(); });
    ui.addEventListener('mouseleave', function () { hovering = false; sync(); });
    [track, panel].forEach(function (n) {
      n.addEventListener('focusin', function () { focusing = true; sync(); });
      n.addEventListener('focusout', function () { focusing = false; sync(); });
    });
    document.addEventListener('visibilitychange', sync);
    if (wide.addEventListener) wide.addEventListener('change', place);
    else if (wide.addListener) wide.addListener(place);

    setView('after');
    select(0, false);
    root.classList.add('flow-on');
  }

  /* ---------------------------------------------------------------- system map */
  function initMap(root) {
    var note = root.querySelector('[data-map-note]');
    var nodes = Array.prototype.slice.call(root.querySelectorAll('.node'));
    if (!note || !nodes.length) return;
    function show(n) {
      note.textContent = n.getAttribute('data-note');
      var key = n.getAttribute('data-key');
      nodes.forEach(function (x) { x.classList.toggle('is-on', x.getAttribute('data-key') === key); });
    }
    nodes.forEach(function (n) {
      n.addEventListener('mouseenter', function () { show(n); });
      n.addEventListener('focus', function () { show(n); });
      n.addEventListener('click', function () { show(n); });
    });
    root.classList.add('map-on');
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-flow]'), initFlow);
  Array.prototype.forEach.call(document.querySelectorAll('[data-map]'), initMap);
})();
