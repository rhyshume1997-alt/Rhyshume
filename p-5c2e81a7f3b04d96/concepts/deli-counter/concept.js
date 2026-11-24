/* The Deli Counter: vanilla JS. No network requests. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var $ = function (s, r) { return (r || document).querySelector(s); };

  /* ---------- Sample products (demonstration data, inlined) ---------- */
  var PRODUCTS = [
    { id: 'demo-amber-ale', t: 'Demo Amber Ale', k: 'Amber ale', one: 'Malty and rounded, easy to share.', f: [2, 3, 2, 3], p: 3.8, pic: 'i-beer', c1: '#F0B83A' },
    { id: 'demo-dark-stout', t: 'Demo Dark Stout', k: 'Stout', one: 'Dark, roasty and smooth.', f: [2, 4, 1, 5], p: 4.2, pic: 'i-beer', c1: '#5A3A28', c2: '#F0B83A' },
    { id: 'demo-pale-lager', t: 'Demo Pale Lager', k: 'Lager', one: 'Crisp, light and clean.', f: [1, 2, 1, 1], p: 3.5, pic: 'i-beer', c1: '#E7D27A' },
    { id: 'demo-session-ipa', t: 'Demo Session IPA', k: 'IPA', one: 'Hoppy without the weight.', f: [2, 4, 3, 2], p: 4.1, pic: 'i-beer', c1: '#1D4A38', c2: '#F0B83A' },
    { id: 'demo-dry-cider', t: 'Demo Dry Cider', k: 'Dry cider', one: 'Sharp, clean and apple-led.', f: [1, 4, 2, 2], p: 3.9, pic: 'i-cider', c1: '#E7D27A' },
    { id: 'demo-berry-cider', t: 'Demo Berry Cider', k: 'Fruit cider', one: 'Sweet berries over crisp apple.', f: [4, 1, 5, 2], p: 4.1, pic: 'i-cider', c1: '#B02A1F', c2: '#F4EBD6' },
    { id: 'demo-red-wine', t: 'Demo Red', k: 'Red wine', one: 'Soft and rounded.', f: [1, 3, 3, 4], p: 11.0, pic: 'i-wine', c1: '#7A1F2B', c2: '#F4EBD6' },
    { id: 'demo-hamper-deli', t: 'Demo Deli Hamper', k: 'Hamper', one: 'Deli favourites for sharing.', f: null, p: 42.0, pic: 'i-hamper', c1: '#B02A1F', c2: '#F0B83A' }
  ];
  var LABELS = ['Sweet', 'Bitter', 'Fruity', 'Body'];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var cards = $('#cards');
  cards.innerHTML = PRODUCTS.map(function (p, i) {
    var flav = p.f
      ? '<dl class="flav">' + p.f.map(function (v, n) {
          var d = ''; for (var j = 1; j <= 5; j++) d += '<i' + (j <= v ? ' class="on"' : '') + '></i>';
          return '<dt>' + LABELS[n] + '</dt><dd><span class="dots" role="img" aria-label="' + v + ' out of 5">' + d + '</span></dd>';
        }).join('') + '</dl>'
      : '<p class="flav-none">Contents to be agreed.</p>';
    return '<li class="card rv"><span class="sticker">Sample</span>' +
      '<svg class="pic" viewBox="0 0 64 80" aria-hidden="true" style="--c1:' + p.c1 + ';--c2:' + (p.c2 || '#F4EBD6') + '"><use href="#' + p.pic + '"/></svg>' +
      '<p class="kind">' + esc(p.k) + '</p><h3>' + esc(p.t) + '</h3><p class="one">' + esc(p.one) + '</p>' + flav +
      '<div class="price-row"><span class="price"><small>From</small>&pound;' + p.p.toFixed(2) + '</span><span class="tagnote">Sample price</span></div>' +
      '<button class="btn add" type="button" data-i="' + i + '">Add to basket<span class="sr-only">: ' + esc(p.t) + '</span></button></li>';
  }).join('');

  /* ---------- Basket (demonstration, no checkout) ---------- */
  var basket = {}, countEl = $('#basketCount'), list = $('#basketList'), live = $('#takeStatus');
  function total() { var n = 0; for (var k in basket) n += basket[k].q; return n; }
  function renderBasket() {
    var items = Object.keys(basket);
    list.innerHTML = items.length ? items.map(function (k) { return '<li><span>' + esc(basket[k].t) + '</span><span>x ' + basket[k].q + '</span></li>'; }).join('') : '<li class="muted">Nothing here yet.</li>';
    countEl.textContent = total();
    countEl.setAttribute('aria-label', total() + ' items in basket');
  }
  cards.addEventListener('click', function (e) {
    var b = e.target.closest('.add'); if (!b) return;
    var p = PRODUCTS[+b.dataset.i];
    basket[p.id] = basket[p.id] || { t: p.t, q: 0 }; basket[p.id].q++;
    renderBasket();
    if (!reduce.matches) { countEl.classList.remove('bump'); void countEl.offsetWidth; countEl.classList.add('bump'); }
    live.textContent = 'Added ' + p.t + '. Basket has ' + total() + (total() === 1 ? ' item.' : ' items.');
    b.classList.add('done'); b.firstChild.nodeValue = 'Added';
    clearTimeout(b._t); b._t = setTimeout(function () { b.classList.remove('done'); b.firstChild.nodeValue = 'Add to basket'; }, 1100);
  });
  var bb = $('#basketBtn'), bp = $('#basketPanel');
  bb.addEventListener('click', function () {
    var open = bp.hidden; bp.hidden = !open; bb.setAttribute('aria-expanded', String(open));
  });

  /* ---------- Navigation ---------- */
  var navToggle = $('#navToggle'), navList = $('#navList'), subBtn = $('.sub-toggle');
  navToggle.addEventListener('click', function () {
    var o = navToggle.getAttribute('aria-expanded') !== 'true';
    navToggle.setAttribute('aria-expanded', String(o)); navList.classList.toggle('open', o);
  });
  subBtn.addEventListener('click', function () {
    subBtn.setAttribute('aria-expanded', String(subBtn.getAttribute('aria-expanded') !== 'true'));
  });
  function closeMenus() {
    subBtn.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-expanded', 'false'); navList.classList.remove('open');
    bp.hidden = true; bb.setAttribute('aria-expanded', 'false');
  }
  navList.addEventListener('click', function (e) { if (e.target.closest('a')) closeMenus(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { var f = document.activeElement; closeMenus(); if (f && f.closest('.site-header')) { (f.closest('.has-sub') ? subBtn : f).focus(); } }
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.site-header')) closeMenus(); });

  /* ---------- Scroll reveals (once) ---------- */
  var rv = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    rv.forEach(function (el) { io.observe(el); });
  } else rv.forEach(function (el) { el.classList.add('in'); });

  /* ---------- SIGNATURE: the ticket dispenser ---------- */
  var COUNTERS = [
    { name: 'Beer', id: 'beer', say: 'the Beer counter' },
    { name: 'Deli', id: 'deli', say: 'the Deli counter' },
    { name: 'Gift hampers', id: 'hampers', say: 'the Gift hampers counter' }
  ];
  var btn = $('#takeBtn'), out = $('#out'), tray = $('#tray'), trayEmpty = $('#trayEmpty'), serving = $('#servingNum');
  var last = 40, shown = 38, busy = false, tickTimer = null;
  var pad = function (n) { return ('00' + n).slice(-3); };

  function ticketHTML(n, c) {
    return '<div class="tk-wrap"><div class="tk"><span class="tk-no">' + pad(n) + '</span><span class="tk-lab">Go to</span><span class="tk-go">' + c.name + '</span></div></div>';
  }
  function countUp(to, done) {
    clearInterval(tickTimer);
    if (reduce.matches || shown >= to) { shown = to; serving.textContent = pad(to); return done(); }
    tickTimer = setInterval(function () {
      shown++; serving.textContent = pad(shown);
      if (shown >= to) { clearInterval(tickTimer); done(); }
    }, 130);
  }
  function anim(el, frames, ms) {
    if (reduce.matches || !el.animate) return { finished: Promise.resolve() };
    return el.animate(frames, { duration: ms, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
  }
  function goTo(c) {
    var sec = document.getElementById(c.id); if (!sec) return;
    document.querySelectorAll('.counter.serving-here').forEach(function (x) { x.classList.remove('serving-here'); });
    sec.classList.add('serving-here');
    sec.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
    var h = sec.querySelector('h3'); if (h) h.focus({ preventScroll: true });
    setTimeout(function () { sec.classList.remove('serving-here'); }, 4000);
  }

  function take() {
    if (busy) return; busy = true; btn.setAttribute('aria-disabled', 'true');
    var n = ++last, c = COUNTERS[n % 3];
    live.textContent = 'Ticket number ' + n + '. Please go to ' + c.say + '.';

    var tk = document.createElement('div'); tk.className = 'ticket'; tk.innerHTML = ticketHTML(n, c);
    out.appendChild(tk);

    // 1. slides out of the slot (transform + opacity only)
    var slide = anim(tk, [{ transform: 'translateY(-70px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], 260);
    Promise.resolve(slide.finished).then(function () {
      // 2. quick tear: a small tilt and snap
      return Promise.resolve(anim(tk, [{ transform: 'translateY(0) rotate(0deg)' }, { transform: 'translateY(8px) rotate(-3deg)' }, { transform: 'translateY(62px) rotate(1deg)' }], 200).finished);
    }).then(function () {
      // 3. lands in the tray
      tk.getAnimations && tk.getAnimations().forEach(function (a) { a.cancel(); });
      tk.remove();
      if (trayEmpty) { trayEmpty.remove(); trayEmpty = null; }
      var t2 = document.createElement('div'); t2.className = 'ticket'; t2.innerHTML = ticketHTML(n, c);
      tray.insertBefore(t2, tray.firstChild);
      while (tray.children.length > 3) tray.removeChild(tray.lastChild);
      anim(t2, [{ transform: 'translateY(-14px)', opacity: .4 }, { transform: 'translateY(0)', opacity: 1 }], 180);
      // 4. display counts up, then we head to the counter
      countUp(n, function () {
        setTimeout(function () { goTo(c); busy = false; btn.removeAttribute('aria-disabled'); }, reduce.matches ? 0 : 350);
      });
    });
  }
  btn.addEventListener('click', take);

  /* ---------- Newsletter (demonstration only) ---------- */
  var form = $('#newsForm'), msg = $('#newsMsg'), email = $('#email');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!email.value || !email.checkValidity()) {
      msg.className = 'small'; msg.textContent = 'Please enter a valid email address.'; email.focus(); return;
    }
    msg.className = 'small ok'; msg.textContent = 'Thanks. This is a demonstration, so nothing was sent or stored.'; form.reset();
  });
})();
