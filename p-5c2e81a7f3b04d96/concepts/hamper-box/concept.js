/* The Hamper Box: concept for discussion. Vanilla JS, no network calls. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var wide = window.matchMedia('(min-width: 1060px)');
  var status = $('#status');
  var basket = 0;

  function say(msg) {
    status.textContent = '';
    window.setTimeout(function () { status.textContent = msg; }, 30);
  }
  function money(n) { return '£' + n.toFixed(2); }

  /* ---------- Basket count ---------- */
  var countEl = $('#basket-count');
  var basketLink = $('.basket-link');
  function addToBasket(n) {
    basket += n;
    countEl.textContent = String(basket);
    basketLink.setAttribute('aria-label', 'Basket, ' + basket + (basket === 1 ? ' item' : ' items'));
    countEl.classList.add('bump');
    window.setTimeout(function () { countEl.classList.remove('bump'); }, 150);
  }

  /* ---------- Navigation ---------- */
  var menuBtn = $('.menu-btn');
  var nav = $('#nav');
  var subBtn = $('.sub-btn');
  var sub = $('#sub-shop');
  function setSub(open) {
    subBtn.setAttribute('aria-expanded', String(open));
    sub.hidden = !open;
  }
  function setMenu(open) {
    menuBtn.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('open', open);
    if (!open && !wide.matches) setSub(false);
  }
  menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
  subBtn.addEventListener('click', function () { setSub(subBtn.getAttribute('aria-expanded') !== 'true'); });
  $$('a', nav).forEach(function (a) {
    a.addEventListener('click', function () { setMenu(false); setSub(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (subBtn.getAttribute('aria-expanded') === 'true') { setSub(false); subBtn.focus(); }
      else if (menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); }
    }
  });
  document.addEventListener('click', function (e) {
    if (wide.matches && !e.target.closest('.has-sub')) setSub(false);
  });
  wide.addEventListener('change', function () { setMenu(false); setSub(false); });

  /* ---------- Reveals ---------- */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Shelf: add to basket ---------- */
  $$('.add-btn').forEach(function (b) {
    var t;
    b.addEventListener('click', function () {
      addToBasket(1);
      b.textContent = 'Added';
      say(b.getAttribute('data-name') + ' (sample) added. Basket has ' + basket + (basket === 1 ? ' item.' : ' items.'));
      window.clearTimeout(t);
      t = window.setTimeout(function () { b.textContent = 'Add to basket'; }, 1400);
    });
  });

  /* ---------- Hamper builder ---------- */
  var SVGNS = 'http://www.w3.org/2000/svg';
  var picks = $$('.pick');
  var layer = $('#box-items');
  var box = $('#box');
  var contents = $('#contents');
  var totalEl = $('#total');
  var pickCount = $('#pick-count');
  var tagIn = $('#tag-input');
  var tagPrev = $('#tag-preview');
  var tagCount = $('#tag-count');
  var addBtn = $('#add-hamper');
  var addNote = $('#add-note');
  var EMPTY_TAG = 'Your message will appear here.';
  var items = {};
  var selected = [];

  picks.forEach(function (btn, i) {
    var wrap = document.createElement('div');
    wrap.className = 'box-item';
    wrap.style.left = (7 + i * 14) + '%';
    wrap.style.zIndex = String(i + 1);
    var svg = document.createElementNS(SVGNS, 'svg');
    var sym = btn.getAttribute('data-sym');
    svg.setAttribute('viewBox', btn.querySelector('.thumb').getAttribute('viewBox'));
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS(SVGNS, 'use');
    use.setAttribute('href', '#' + sym);
    use.style.setProperty('--tint', btn.getAttribute('data-tint'));
    svg.appendChild(use);
    wrap.appendChild(svg);
    layer.appendChild(wrap);
    items[btn.getAttribute('data-id')] = wrap;
  });

  function offsetFrom(btn, el) {
    var s = btn.querySelector('.thumb').getBoundingClientRect();
    var d = el.getBoundingClientRect();
    return {
      x: (s.left + s.width / 2) - (d.left + d.width / 2),
      y: (s.top + s.height / 2) - (d.top + d.height / 2)
    };
  }

  function toggle(btn) {
    var id = btn.getAttribute('data-id');
    var el = items[id];
    var on = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', String(on));
    btn.classList.toggle('on', on);
    btn.querySelector('.pick-state').textContent = on ? 'In box' : 'Add';
    if (on) {
      selected.push(id);
      if (!reduce.matches) {
        el.style.transition = 'none';
        el.style.transform = 'none';
        var o = offsetFrom(btn, el);
        el.style.transform = 'translate(' + o.x.toFixed(1) + 'px,' + o.y.toFixed(1) + 'px) scale(.7)';
        el.classList.add('is-in');
        void el.offsetWidth;
        el.style.transition = '';
        el.style.transform = '';
      } else {
        el.style.transition = '';
        el.style.transform = '';
        el.classList.add('is-in');
      }
    } else {
      selected.splice(selected.indexOf(id), 1);
      if (!reduce.matches) {
        var o2 = offsetFrom(btn, el);
        el.style.transform = 'translate(' + o2.x.toFixed(1) + 'px,' + o2.y.toFixed(1) + 'px) scale(.7)';
      }
      el.classList.remove('is-in');
    }
    refresh();
  }

  function refresh() {
    var total = 0;
    contents.textContent = '';
    picks.forEach(function (b) {
      if (selected.indexOf(b.getAttribute('data-id')) < 0) return;
      var p = parseFloat(b.getAttribute('data-price'));
      total += p;
      var li = document.createElement('li');
      var a = document.createElement('span');
      a.textContent = b.getAttribute('data-title');
      var c = document.createElement('span');
      c.textContent = money(p);
      li.appendChild(a); li.appendChild(c);
      contents.appendChild(li);
    });
    if (!selected.length) {
      var li0 = document.createElement('li');
      li0.className = 'muted';
      li0.textContent = 'Nothing yet.';
      contents.appendChild(li0);
    }
    totalEl.textContent = money(total);
    pickCount.textContent = selected.length + ' of 6 in the box';
    box.classList.toggle('has-items', selected.length > 0);
    var ok = selected.length > 0;
    addBtn.setAttribute('aria-disabled', String(!ok));
    addNote.textContent = ok
      ? 'Sample total ' + money(total) + '. Demonstration only: no order is placed.'
      : 'Choose at least one item first. Demonstration only: no order is placed.';
  }

  picks.forEach(function (b) {
    b.addEventListener('click', function () { toggle(b); });
  });

  tagIn.addEventListener('input', function () {
    var v = tagIn.value.replace(/[\u0000-\u001F\u007F]/g, '').slice(0, 60);
    if (v !== tagIn.value) tagIn.value = v;
    tagCount.textContent = String(v.length);
    if (v.trim()) { tagPrev.textContent = v; tagPrev.setAttribute('data-empty', 'false'); }
    else { tagPrev.textContent = EMPTY_TAG; tagPrev.setAttribute('data-empty', 'true'); }
  });

  addBtn.addEventListener('click', function () {
    if (addBtn.getAttribute('aria-disabled') === 'true') {
      say('Choose at least one item before adding the hamper.');
      addNote.textContent = 'Please choose at least one item first.';
      return;
    }
    addToBasket(1);
    var n = selected.length;
    var msg = 'Sample hamper with ' + n + (n === 1 ? ' item' : ' items') + ' added to the basket. Basket has ' + basket + (basket === 1 ? ' item.' : ' items.');
    say(msg);
    addNote.textContent = msg + ' Demonstration only.';
    var old = addBtn.textContent;
    addBtn.textContent = 'Added to basket';
    window.setTimeout(function () { addBtn.textContent = old; }, 1600);
  });

  /* ---------- Newsletter (demonstration only) ---------- */
  var form = $('#news-form');
  var msg = $('#news-msg');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = $('#email');
    if (!email.value || !email.checkValidity()) {
      msg.textContent = 'Please enter a valid email address. Demonstration only.';
      email.focus();
      return;
    }
    msg.textContent = 'Thank you. Demonstration only: nothing was sent or saved.';
    form.reset();
  });
})();
