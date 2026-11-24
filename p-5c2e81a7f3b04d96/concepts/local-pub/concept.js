/* The Local: concept behaviour. Vanilla JS, no network requests. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var wide = window.matchMedia('(min-width: 960px)');

  /* ---------- Navigation ---------- */
  var menuBtn = $('#menu-btn'), nav = $('#site-nav'), subBtn = $('.sub-btn');
  function setMenu(open) {
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  }
  function setSub(open) { subBtn.setAttribute('aria-expanded', String(open)); }
  menuBtn.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
  subBtn.addEventListener('click', function () { setSub(subBtn.getAttribute('aria-expanded') !== 'true'); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (subBtn.getAttribute('aria-expanded') === 'true') { setSub(false); subBtn.focus(); }
    else if (nav.classList.contains('open') && !wide.matches) { setMenu(false); menuBtn.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (wide.matches && !e.target.closest('.has-sub')) setSub(false);
  });
  $$('.site-nav a').forEach(function (a) {
    a.addEventListener('click', function () { setSub(false); if (!wide.matches) setMenu(false); });
  });

  /* ---------- Shelf filter ---------- */
  var cards = $$('.card'), chips = $$('.chip'), countEl = $('#shelf-count');
  function filter(f) {
    var n = 0;
    cards.forEach(function (c) {
      var show = f === 'all' || c.dataset.collection === f;
      c.hidden = !show; if (show) n++;
    });
    chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.dataset.filter === f)); });
    countEl.textContent = 'Showing ' + n + ' of ' + cards.length + ' sample products';
  }
  chips.forEach(function (c) { c.addEventListener('click', function () { filter(c.dataset.filter); }); });
  $$('a[data-filter]').forEach(function (a) {
    a.addEventListener('click', function () { filter(a.dataset.filter); });
  });

  /* ---------- Basket (demonstration: a count only) ---------- */
  var count = 0, bc = $('#basket-count'), bb = $('#basket-btn'), bs = $('#basket-status');
  function updateBasket(title) {
    bc.textContent = count;
    bb.setAttribute('aria-label', 'Basket, ' + count + (count === 1 ? ' item' : ' items') + '. Demonstration only.');
    bs.textContent = 'Added ' + title + '. Basket has ' + count + (count === 1 ? ' item' : ' items') + '.';
    bc.classList.remove('bump'); void bc.offsetWidth; bc.classList.add('bump');
  }
  $$('.btn-add').forEach(function (b) {
    b.addEventListener('click', function () { count++; updateBasket(b.dataset.title); });
  });
  bb.addEventListener('click', function () {
    bs.textContent = 'Basket has ' + count + (count === 1 ? ' item' : ' items') + '. This is a demonstration; there is no checkout.';
  });

  /* ---------- Placeholder links ---------- */
  $$('a[data-placeholder]').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); });
  });

  /* ---------- Newsletter (demo, nothing sent) ---------- */
  var form = $('#news-form'), email = $('#news-email'), msg = $('#news-msg');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!email.value || !email.checkValidity()) {
      msg.textContent = 'Please enter an email address like name@example.com.';
      email.setAttribute('aria-invalid', 'true'); email.focus(); return;
    }
    email.removeAttribute('aria-invalid');
    msg.textContent = 'Thanks. This is a demonstration, so nothing was sent or saved.';
    form.reset();
  });

  /* ---------- Reveals (once) ---------- */
  var rv = $$('.rv');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    rv.forEach(function (el) { io.observe(el); });
  } else { rv.forEach(function (el) { el.classList.add('in'); }); }

  /* ---------- Signature: the regulars' stamp card ---------- */
  var KEY = 'jo_concept_local_card';
  var TOTAL = 10;
  var slots = $$('.slot'), cardEl = $('#stampcard'), countOut = $('#card-count'),
      full = $('#card-full'), help = $('#card-help'), live = $('#card-live'), reset = $('#card-reset');
  var stamped = 0;

  function load() {
    try {
      var v = parseInt(localStorage.getItem(KEY), 10);
      return isNaN(v) ? 0 : Math.max(0, Math.min(TOTAL, v));
    } catch (e) { return 0; }
  }
  function save() { try { localStorage.setItem(KEY, String(stamped)); } catch (e) { /* private mode */ } }

  function render() {
    slots.forEach(function (s, i) {
      var n = i + 1, done = n <= stamped, isNext = n === stamped + 1;
      s.dataset.stamped = String(done);
      s.dataset.next = String(isNext);
      s.setAttribute('aria-label', 'Slot ' + n + ' of ' + TOTAL + (done ? ', stamped' : isNext ? ', next to stamp' : ', empty'));
      s.setAttribute('aria-disabled', String(!isNext));
      s.tabIndex = isNext ? 0 : -1;
      if (!done) s.classList.remove('fresh');
    });
    countOut.textContent = stamped;
    var isFull = stamped >= TOTAL;
    full.hidden = !isFull;
    help.hidden = isFull;
  }

  function stampNext(slot) {
    if (stamped >= TOTAL || Number(slot.dataset.n) !== stamped + 1) return;
    stamped++; save();
    slot.classList.add('fresh');
    render();
    if (!reduce.matches) {
      cardEl.classList.remove('thunk'); void cardEl.offsetWidth; cardEl.classList.add('thunk');
    }
    live.textContent = stamped >= TOTAL ? 'Stamp ' + stamped + ' of ' + TOTAL + '. Card full.' : 'Stamp ' + stamped + ' of ' + TOTAL + ' added.';
    var next = slots[stamped];
    if (next) next.focus({ preventScroll: true }); else reset.focus({ preventScroll: true });
  }

  slots.forEach(function (s) {
    s.addEventListener('click', function () { stampNext(s); });
  });
  reset.addEventListener('click', function () {
    stamped = 0; save(); render();
    live.textContent = 'Card reset. 0 of ' + TOTAL + ' stamped.';
    slots[0].focus({ preventScroll: true });
  });

  stamped = load();
  render();
})();
