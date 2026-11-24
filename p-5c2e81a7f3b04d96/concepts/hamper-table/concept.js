/* The Hamper Table: pack-a-hamper builder, basket count, nav, shelf filter, reveals. Vanilla JS, no network. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  document.documentElement.classList.add('js');
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = mq.matches; mq.addEventListener && mq.addEventListener('change', function (e) { reduced = e.matches; });
  var MAX = 60, EASE = 'cubic-bezier(.23,1,.32,1)', FLY_MS = 260;
  function money(n) { return '£' + n.toFixed(2); }

  /* ---------- navigation ---------- */
  var tabs = $('#tabs'), menuBtn = $('#menubtn');
  menuBtn.addEventListener('click', function () {
    var o = tabs.classList.toggle('is-open'); menuBtn.setAttribute('aria-expanded', o); menuBtn.firstElementChild.textContent = o ? 'Close' : 'Menu';
  });
  $$('.tabs a').forEach(function (a) { a.addEventListener('click', closeMenu); });
  function closeMenu() { tabs.classList.remove('is-open'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.firstElementChild.textContent = 'Menu'; }
  $$('[data-mega]').forEach(function (b) {
    var panel = document.getElementById(b.getAttribute('aria-controls'));
    function set(open) { b.setAttribute('aria-expanded', open); panel.hidden = !open; }
    b.addEventListener('click', function (e) { e.stopPropagation(); set(panel.hidden); });
    panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') { set(false); b.focus(); } });
    document.addEventListener('click', function (e) { if (!panel.hidden && !panel.contains(e.target) && e.target !== b) set(false); });
    panel.addEventListener('focusout', function (e) { if (e.relatedTarget && !panel.contains(e.relatedTarget) && e.relatedTarget !== b) set(false); });
    $$('a', panel).forEach(function (a) { a.addEventListener('click', function () { set(false); closeMenu(); var f = a.getAttribute('data-f'); if (f) filterShelf(f); }); });
  });
  $$('[data-f]').forEach(function (a) { if (!a.closest('.mega')) a.addEventListener('click', function () { filterShelf(a.getAttribute('data-f')); }); });
  $$('[data-placeholder]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); }); });

  /* ---------- basket ---------- */
  var cart = { lines: [] }, cartBtn = $('#cartbtn'), cartN = $('#cartn');
  function cartCount() { return cart.lines.reduce(function (n, l) { return n + l.qty; }, 0); }
  function renderCartCount(bump) {
    var n = cartCount(); cartN.textContent = n; cartBtn.setAttribute('aria-label', 'Basket, ' + n + (n === 1 ? ' item' : ' items'));
    if (bump && !reduced) { cartBtn.classList.remove('bump'); void cartBtn.offsetWidth; cartBtn.classList.add('bump'); }
  }
  var dlg = $('#basket');
  cartBtn.addEventListener('click', function () { renderBasket(); if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); });
  $('#bk-close').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  function renderBasket() {
    var ul = $('#bk-lines'); ul.textContent = ''; var total = 0;
    cart.lines.forEach(function (l) {
      var li = document.createElement('li'), b = document.createElement('b'), s = document.createElement('span'), t = document.createElement('span');
      t.textContent = l.name + (l.qty > 1 ? ' x ' + l.qty : ''); b.appendChild(t);
      var p = document.createElement('span'); p.textContent = l.price == null ? 'price to be confirmed' : money(l.price * l.qty); b.appendChild(p);
      s.textContent = l.detail || ''; li.appendChild(b); if (l.detail) li.appendChild(s); ul.appendChild(li);
      if (l.price != null) total += l.price * l.qty;
    });
    $('#bk-empty').hidden = cart.lines.length > 0; $('#bk-total').textContent = money(total);
  }

  /* ---------- shelf: add to basket and filter ---------- */
  $$('[data-add]').forEach(function (b) {
    b.addEventListener('click', function () {
      var id = b.getAttribute('data-add'), l = cart.lines.filter(function (x) { return x.id === id; })[0];
      if (l) l.qty++; else cart.lines.push({ id: id, name: b.getAttribute('data-name'), price: parseFloat(b.getAttribute('data-price')), qty: 1, detail: 'Sample product' });
      renderCartCount(true); say(b.getAttribute('data-name') + ' added to the basket. Sample only.', true);
    });
  });
  function filterShelf(f) {
    $$('[data-filter]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-filter') === f ? 'true' : 'false'); });
    $$('#cards .card').forEach(function (c) { c.hidden = !(f === 'all' || c.getAttribute('data-col') === f); });
  }
  $$('[data-filter]').forEach(function (b) { b.addEventListener('click', function () { filterShelf(b.getAttribute('data-filter')); }); });
  var live = document.createElement('p'); live.className = 'vh'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); document.body.appendChild(live);
  function say(msg, global) { if (global) { live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 30); } }

  /* ---------- the hamper builder ---------- */
  var box = $('#box'), contents = $('#contents'), emptyMsg = $('#emptymsg'), status = $('#status');
  var wrapBtn = $('#wrap'), addBtn = $('#addham'), againBtn = $('#again'), msg = $('#msg'), pill = $('#pillsum');
  var tiles = $$('.tile-b'), state = { items: [], wrapped: false }, flying = {}, tagLines = $$('#tag-text tspan');
  var meta = {}; tiles.forEach(function (t) { meta[t.dataset.item] = { id: t.dataset.item, name: t.dataset.name, kind: t.dataset.kind, price: t.dataset.price === '' ? null : parseFloat(t.dataset.price), tile: t }; });
  var order = tiles.map(function (t) { return t.dataset.item; });

  function slotEl(id) { return $('.slot[data-slot="' + id + '"]', box); }
  function has(id) { return state.items.indexOf(id) > -1; }

  function render() {
    state.items.sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); });
    tiles.forEach(function (t) { var on = has(t.dataset.item); t.setAttribute('aria-pressed', on ? 'true' : 'false'); t.querySelector('.tile-st').textContent = on ? 'In the hamper. Tap to take out' : 'Tap to add'; });
    order.forEach(function (id) { slotEl(id).classList.toggle('is-in', has(id) && !flying[id]); });
    contents.textContent = '';
    var total = 0, deli = 0;
    state.items.forEach(function (id) {
      var m = meta[id], li = document.createElement('li'), d = document.createElement('span'), n = document.createElement('span'), p = document.createElement('span'), r = document.createElement('button');
      d.className = 'cn'; n.textContent = m.name; p.className = 'cp'; p.textContent = m.price == null ? 'Deli item to be confirmed, no price' : 'Sample price ' + money(m.price);
      d.appendChild(n); d.appendChild(p); r.type = 'button'; r.className = 'rm'; r.textContent = 'Remove'; r.setAttribute('aria-label', 'Remove ' + m.name + ' from the hamper'); r.setAttribute('data-rm', id);
      li.appendChild(d); li.appendChild(r); contents.appendChild(li);
      if (m.price == null) deli++; else total += m.price;
    });
    var k = state.items.length;
    $('#boxcount').textContent = k + (k === 1 ? ' item' : ' items'); emptyMsg.hidden = k > 0;
    $('#total').textContent = money(total);
    $('#totalnote').textContent = deli ? 'Drinks only, at sample prices. ' + deli + (deli === 1 ? ' deli item' : ' deli items') + ', the box and wrapping: price to be confirmed.' : 'Drinks only, at sample prices. The box and wrapping: price to be confirmed.';
    wrapBtn.disabled = k === 0; addBtn.disabled = k === 0;
    box.classList.toggle('is-wrapped', state.wrapped);
    wrapBtn.setAttribute('aria-pressed', state.wrapped ? 'true' : 'false'); wrapBtn.textContent = state.wrapped ? 'Unwrap' : 'Wrap it';
    $('#pillcount').textContent = k + (k === 1 ? ' item' : ' items'); pill.hidden = k === 0;
  }

  function setStatus(t) { status.textContent = t; }

  function fly(fromEl, toEl, id, done) {
    var a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect(), vh = window.innerHeight;
    var visible = b.bottom > 0 && b.top < vh && a.bottom > 0 && a.top < vh;
    if (reduced || !visible || !fromEl.animate) { done(); return; }
    var clone = document.createElement('div'); clone.className = 'fly';
    var svg = fromEl.cloneNode(true); svg.removeAttribute('id'); clone.appendChild(svg);
    svg.style.width = a.width + 'px'; svg.style.height = a.height + 'px'; svg.removeAttribute('width'); svg.removeAttribute('height');
    clone.style.left = a.left + 'px'; clone.style.top = a.top + 'px'; document.body.appendChild(clone);
    var s = b.width / a.width, dx = b.left - a.left, dy = b.top - a.top;
    var anim = clone.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')' }], { duration: FLY_MS, easing: EASE, fill: 'forwards' });
    var fin = function () { clone.remove(); done(); }; anim.onfinish = fin; anim.oncancel = fin;
  }

  function toggle(id) {
    var m = meta[id], tileSvg = $('.tile-ill svg', m.tile), slot = slotEl(id);
    if (state.wrapped) { state.wrapped = false; }
    if (!has(id)) {
      state.items.push(id); flying[id] = true; againBtn.hidden = true;
      render(); setStatus(m.name + ' is in the box. ' + state.items.length + (state.items.length === 1 ? ' item' : ' items') + ' packed.');
      fly(tileSvg, slot, id, function () { delete flying[id]; render(); });
    } else { remove(id, tileSvg, slot); }
  }
  function remove(id, tileSvg, slot) {
    var m = meta[id]; tileSvg = tileSvg || $('.tile-ill svg', m.tile); slot = slot || slotEl(id);
    if (state.wrapped) state.wrapped = false;
    flying[id] = true; state.items.splice(state.items.indexOf(id), 1);
    var from = slot, to = tileSvg;
    /* slot is hidden during the flight, so measure it before render */
    var a = from.getBoundingClientRect();
    render(); setStatus(m.name + ' taken out of the box. ' + state.items.length + (state.items.length === 1 ? ' item' : ' items') + ' left.');
    var vis = a.bottom > 0 && a.top < window.innerHeight;
    if (reduced || !vis || !slot.animate) { delete flying[id]; render(); return; }
    var clone = document.createElement('div'); clone.className = 'fly'; var svg = slot.cloneNode(true); svg.classList.add('is-in');
    ['x', 'y', 'width', 'height', 'data-slot', 'class'].forEach(function (k) { svg.removeAttribute(k); }); svg.style.width = a.width + 'px'; svg.style.height = a.height + 'px';
    clone.appendChild(svg); clone.style.left = a.left + 'px'; clone.style.top = a.top + 'px'; document.body.appendChild(clone);
    var b = to.getBoundingClientRect(), s = b.width / a.width;
    var anim = clone.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: 'translate(' + (b.left - a.left) + 'px,' + (b.top - a.top) + 'px) scale(' + s + ')', opacity: .9 }], { duration: FLY_MS, easing: EASE, fill: 'forwards' });
    var fin = function () { clone.remove(); delete flying[id]; render(); }; anim.onfinish = fin; anim.oncancel = fin;
  }

  tiles.forEach(function (t) { t.addEventListener('click', function () { toggle(t.dataset.item); }); });
  contents.addEventListener('click', function (e) {
    var b = e.target.closest('[data-rm]'); if (!b) return;
    var next = b.closest('li').nextElementSibling || b.closest('li').previousElementSibling, nextId = next ? $('[data-rm]', next).getAttribute('data-rm') : null;
    remove(b.getAttribute('data-rm'));
    var target = nextId ? $('[data-rm="' + nextId + '"]', contents) : null; (target || meta[b.getAttribute('data-rm')].tile).focus();
  });

  /* gift tag: live, escaped by textContent only */
  function wrapWords(t, w) {
    var words = t.split(/\s+/).filter(Boolean), lines = [], cur = '';
    words.forEach(function (word) {
      while (word.length > w) { if (cur) { lines.push(cur); cur = ''; } lines.push(word.slice(0, w)); word = word.slice(w); }
      if (!cur) cur = word; else if ((cur + ' ' + word).length <= w) cur += ' ' + word; else { lines.push(cur); cur = word; }
    });
    if (cur) lines.push(cur); return lines.slice(0, 4);
  }
  function renderTag() {
    var v = msg.value.slice(0, MAX), lines = wrapWords(v, 17), txt = $('#tag-text');
    txt.classList.toggle('is-empty', !v.trim());
    if (!v.trim()) lines = ['Your message', 'goes here'];
    tagLines.forEach(function (ts, i) { ts.textContent = lines[i] || ''; });
    $('#msgcount').textContent = v.length;
  }
  msg.addEventListener('input', function () { if (msg.value.length > MAX) msg.value = msg.value.slice(0, MAX); renderTag(); if (state.wrapped) { /* message change does not unwrap */ } });

  function doWrap(next) {
    state.wrapped = next; render();
    setStatus(next ? 'Lid closed and ribbon tied.' : 'Unwrapped. The box is open again.');
  }
  wrapBtn.addEventListener('click', function () { doWrap(!state.wrapped); });
  addBtn.addEventListener('click', function () {
    if (!state.items.length) return;
    var names = state.items.map(function (id) { return meta[id].name; }).join(', '), total = 0, hasDeli = false;
    state.items.forEach(function (id) { if (meta[id].price == null) hasDeli = true; else total += meta[id].price; });
    var go = function () {
      cart.lines.push({ id: 'hamper-' + Date.now(), name: 'Your packed hamper (sample)', price: hasDeli ? null : total, qty: 1, detail: names + (msg.value.trim() ? '. Tag: ' + msg.value.trim() : '') + (hasDeli ? '. Drinks ' + money(total) + ', deli items and packaging to be confirmed.' : '') });
      renderCartCount(true); addBtn.disabled = true; againBtn.hidden = false;
      setStatus('Hamper added to the basket. Basket now has ' + cartCount() + (cartCount() === 1 ? ' item' : ' items') + '. Sample only, nothing is charged.');
      againBtn.focus();
    };
    if (!state.wrapped) { doWrap(true); setTimeout(go, reduced ? 0 : 280); } else go();
  });
  againBtn.addEventListener('click', function () {
    state.items = []; state.wrapped = false; msg.value = ''; renderTag(); againBtn.hidden = true; render(); setStatus('A fresh box, ready to fill.'); tiles[0].focus();
  });

  /* ---------- newsletter (demo) ---------- */
  $('#nl').addEventListener('submit', function (e) {
    e.preventDefault(); var i = $('#nl-email'), s = $('#nl-status');
    if (!i.value || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(i.value)) { s.textContent = 'Please enter a valid email address.'; i.focus(); return; }
    s.textContent = 'Thank you. This is a demo, so nothing was sent or stored.'; i.value = '';
  });

  /* ---------- reveal once ---------- */
  var rv = $$('.rv');
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }); }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    rv.forEach(function (n) { io.observe(n); });
  } else rv.forEach(function (n) { n.classList.add('in'); });

  renderTag(); render();
})();
