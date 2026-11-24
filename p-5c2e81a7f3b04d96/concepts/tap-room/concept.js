/* The Tap Room: header menus, basket count, scroll reveals and the tap handle. No network calls. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- navigation ---------- */
  var nav = $('#site-nav'), menuBtn = $('.menu-toggle'), subBtn = $('.sub-toggle'), sub = $('#shop-sub');
  var basketBtn = $('.basket-btn'), basketPanel = $('#basket-panel');

  function setSub(open) { subBtn.setAttribute('aria-expanded', String(open)); sub.classList.toggle('is-open', open); }
  function setMenu(open) { menuBtn.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open); if (!open) setSub(false); }
  function setBasket(open) { basketBtn.setAttribute('aria-expanded', String(open)); basketPanel.hidden = !open; }

  menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
  subBtn.addEventListener('click', function () { setSub(subBtn.getAttribute('aria-expanded') !== 'true'); });
  basketBtn.addEventListener('click', function () { setBasket(basketBtn.getAttribute('aria-expanded') !== 'true'); });
  $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); setSub(false); }); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (sub.classList.contains('is-open')) { setSub(false); subBtn.focus(); }
    else if (!basketPanel.hidden) { setBasket(false); basketBtn.focus(); }
    else if (nav.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.has-sub')) setSub(false);
    if (!e.target.closest('.basket-wrap')) setBasket(false);
  });
  $('.has-sub').addEventListener('focusout', function (e) {
    if (!e.relatedTarget || !e.currentTarget.contains(e.relatedTarget)) setSub(false);
  });

  /* ---------- basket ---------- */
  var items = [], countEl = $('#basket-count'), listEl = $('#basket-list');
  function renderBasket() {
    var n = items.reduce(function (s, i) { return s + i.qty; }, 0);
    countEl.firstChild.nodeValue = String(n);
    listEl.innerHTML = '';
    if (!items.length) { listEl.innerHTML = '<li class="empty">Nothing yet.</li>'; return; }
    items.forEach(function (i) {
      var li = document.createElement('li');
      var a = document.createElement('span'); a.textContent = i.qty + ' x ' + i.name;
      var b = document.createElement('span'); b.textContent = '£' + (i.qty * i.price).toFixed(2);
      li.appendChild(a); li.appendChild(b); listEl.appendChild(li);
    });
    var s = document.createElement('li');
    s.innerHTML = '<span>Sample total</span><span>£' + items.reduce(function (t, i) { return t + i.qty * i.price; }, 0).toFixed(2) + '</span>';
    listEl.appendChild(s);
  }
  $$('.add').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var name = btn.dataset.name, price = parseFloat(btn.dataset.price);
      var found = items.filter(function (i) { return i.name === name; })[0];
      if (found) found.qty++; else items.push({ name: name, price: price, qty: 1 });
      renderBasket();
      countEl.classList.remove('bump'); void countEl.offsetWidth; countEl.classList.add('bump');
      btn.classList.add('added');
      var label = btn.firstChild.nodeValue;
      btn.firstChild.nodeValue = 'Added';
      setTimeout(function () { btn.classList.remove('added'); btn.firstChild.nodeValue = label; }, 1100);
      say('Added ' + name + ' to the basket. Basket has ' + countEl.firstChild.nodeValue + ' items.');
    });
  });

  /* ---------- newsletter (demonstration only) ---------- */
  var form = $('#news-form'), msg = $('#news-msg');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var em = $('#email');
    if (!em.checkValidity() || !em.value) { msg.textContent = 'Please enter a valid email address.'; em.focus(); return; }
    msg.textContent = 'Thanks. This is a demonstration: nothing was sent or saved.';
    form.reset();
  });

  /* ---------- reveals ---------- */
  var rev = $$('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    rev.forEach(function (r) { io.observe(r); });
  } else rev.forEach(function (r) { r.classList.add('is-in'); });

  /* ---------- the tap handle ---------- */
  var rig = $('#rig'), handle = $('#handle'), pourBtn = $('#pour-btn'), status = $('#rig-status');
  var liquid = $('#liquid'), foamPos = $('#foam-pos'), foam = $('#foam'), stream = $('#stream');
  var capName = $('#cap-name'), capDesc = $('#cap-desc'), capLink = $('#cap-link'), caption = $('#caption');

  var BEERS = [
    { h: 'demo-amber-ale', n: 'Demo Amber Ale', t: 'Amber ale', l: 'Malty and rounded, easy to share.', c: '#e8962a' },
    { h: 'demo-dark-stout', n: 'Demo Dark Stout', t: 'Stout', l: 'Dark, roasty and smooth.', c: '#4f2a15' },
    { h: 'demo-pale-lager', n: 'Demo Pale Lager', t: 'Lager', l: 'Crisp, light and clean.', c: '#f2cb58' },
    { h: 'demo-session-ipa', n: 'Demo Session IPA', t: 'IPA', l: 'Hoppy without the weight.', c: '#f0a82a' },
    { h: 'demo-fruit-beer', n: 'Demo Fruit Beer', t: 'Fruit beer', l: 'Bright and juicy.', c: '#cf5a3c' }
  ];
  var MAXA = 64, OPEN_AT = 18, BASE = 505, H = 165, NOZZLE = 282, MAXL = 0.86, POUR_SECONDS = 3;
  var cur = 0, a = 0, av = 0, target = 0, held = false, auto = false, f = 0, done = false, raf = 0, last = 0, wasOpen = false;

  function say(t) { status.textContent = ''; setTimeout(function () { status.textContent = t; }, 30); }
  function applyBeer() { rig.style.setProperty('--beer', BEERS[cur].c); }

  function render() {
    var L = f * MAXL;
    handle.style.transform = 'translateX(-50%) rotate(' + a.toFixed(2) + 'deg)';
    liquid.style.transform = 'scaleY(' + L.toFixed(4) + ')';
    foamPos.style.transform = 'translateY(' + (-L * H).toFixed(2) + 'px)';
    foam.style.transform = 'scaleY(' + Math.min(1, 0.12 + f * 2.2).toFixed(3) + ')';
    foamPos.style.opacity = f > 0.015 ? 1 : 0;
    var open = a >= OPEN_AT && f < 1;
    if (open) {
      var surface = BASE - L * H;
      stream.style.opacity = 1;
      stream.style.transform = 'scaleY(' + Math.max(0.02, (surface - NOZZLE) / (BASE - NOZZLE)).toFixed(4) + ')';
    } else stream.style.opacity = 0;
    rig.classList.toggle('is-pouring', open);
  }

  function reset() {
    if (done) cur = (cur + 1) % BEERS.length;
    done = false; f = 0; applyBeer();
    rig.classList.remove('is-full'); caption.setAttribute('aria-hidden', 'true'); capLink.tabIndex = -1;
    pourBtn.textContent = 'Pour a pint';
  }

  function complete() {
    done = true; f = 1; held = false; auto = false;
    var b = BEERS[cur];
    capName.textContent = b.n;
    capDesc.textContent = b.t + '. ' + b.l;
    capLink.setAttribute('href', '#row-' + b.h);
    capLink.tabIndex = 0;
    caption.setAttribute('aria-hidden', 'false');
    rig.classList.add('is-full');
    pourBtn.textContent = 'Pour another pint';
    say('Glass full. Sample pour: ' + b.n + '. A link to it on the tap list is next to the glass.');
  }

  function tick(now) {
    var dt = Math.min(0.033, (now - last) / 1000 || 0.016); last = now;
    var moving = false;
    if (held) {
      a += (target - a) * (1 - Math.exp(-dt * 26));
      av = 0; moving = true;
    } else if (a !== 0 || av !== 0) {
      if (reduce.matches) { a = 0; av = 0; }
      else {
        /* gentle spring back: slightly under-damped, one small overshoot */
        var acc = -170 * a - 15 * av;
        av += acc * dt; a += av * dt;
        if (a < -7) { a = -7; av = Math.max(av, 0); }
        if (Math.abs(a) < 0.15 && Math.abs(av) < 1) { a = 0; av = 0; }
        else moving = true;
      }
    }
    var open = a >= OPEN_AT && f < 1;
    if (open) {
      if (!wasOpen) { rig.classList.add('has-pulled'); }
      var rate = 0.35 + 0.65 * Math.min(1, (a - OPEN_AT) / (MAXA - OPEN_AT));
      f = Math.min(1, f + dt / POUR_SECONDS * rate);
      moving = true;
    }
    wasOpen = open;
    render();
    if (f >= 1 && !done) { complete(); moving = true; }
    if (moving || a !== 0) raf = requestAnimationFrame(tick); else raf = 0;
  }
  function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }

  function pull(t, isAuto) {
    if (done) reset();
    held = true; auto = !!isAuto; target = t;
    if (!rig.classList.contains('has-pulled')) say('Pouring.');
    kick();
  }
  function release() {
    if (!held) return;
    held = false;
    if (auto) { auto = false; pourBtn.textContent = done ? 'Pour another pint' : 'Pour a pint'; }
    kick();
  }

  /* pointer: press pulls to a middle position, drag adjusts */
  var startY = 0, pid = null;
  handle.addEventListener('pointerdown', function (e) {
    if (e.button && e.button !== 0) return;
    pid = e.pointerId; startY = e.clientY;
    try { handle.setPointerCapture(pid); } catch (_) {}
    handle.classList.add('dragging');
    pull(40, false);
  });
  handle.addEventListener('pointermove', function (e) {
    if (e.pointerId !== pid || !held) return;
    var range = Math.max(90, rig.getBoundingClientRect().width * 0.3);
    target = Math.max(0, Math.min(MAXA, 40 + (e.clientY - startY) / range * 50));
  });
  function end(e) { if (e.pointerId !== pid) return; pid = null; handle.classList.remove('dragging'); release(); }
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
  handle.addEventListener('lostpointercapture', end);

  /* keyboard: hold Arrow Down or Space */
  handle.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      if (!e.repeat && !held) pull(MAXA, false);
    } else if (e.key === 'Enter') { e.preventDefault(); togglePour(); }
  });
  handle.addEventListener('keyup', function (e) {
    if (e.key === 'ArrowDown' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); release(); }
  });
  handle.addEventListener('blur', function () { if (pid === null) release(); });
  handle.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  /* accessible button: runs the pour for you; instant under reduced motion */
  function togglePour() {
    if (reduce.matches) {
      if (done) reset();
      rig.classList.add('has-pulled');
      a = 0; av = 0; held = false; f = 1; render(); complete(); return;
    }
    if (held && auto) { release(); pourBtn.textContent = 'Pour a pint'; say('Stopped.'); return; }
    pull(MAXA, true);
    pourBtn.textContent = 'Stop pouring';
  }
  pourBtn.addEventListener('click', togglePour);

  /* caption link: scroll to the row and flag it */
  capLink.addEventListener('click', function () {
    var row = document.getElementById('row-' + BEERS[cur].h);
    if (!row) return;
    row.classList.remove('is-picked'); void row.offsetWidth; row.classList.add('is-picked');
  });

  applyBeer(); render();
})();
