/* Jack O'Beers: shared interface. Navigation (two-click menu), age notice, basket drawer, toast, checkout hand-off. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var JO = window.JO = window.JO || {};
  document.documentElement.classList.add('js');
  JO.$ = $; JO.$$ = $$;
  JO.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  JO.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lastFocus = null;

  /* toast */
  var toastT;
  JO.toast = function (msg) {
    var t = $('#toast'); if (!t) return; t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 3200);
  };

  /* dialogs */
  JO.openDialog = function (id) { var d = document.getElementById(id); if (!d) return; lastFocus = document.activeElement; if (d.showModal) d.showModal(); else d.setAttribute('open', ''); };
  JO.closeDialog = function (id) { var d = document.getElementById(id); if (!d) return; if (d.close) d.close(); else d.removeAttribute('open'); if (lastFocus && lastFocus.focus) lastFocus.focus(); };
  $$('[data-close-dialog]').forEach(function (b) { b.addEventListener('click', function () { var d = b.closest('dialog'); if (d) JO.closeDialog(d.id); }); });

  /* navigation */
  var tabs = $('#tabs'), menuBtn = $('#menubtn');
  if (menuBtn && tabs) menuBtn.addEventListener('click', function () { var o = tabs.classList.toggle('is-open'); menuBtn.setAttribute('aria-expanded', o); menuBtn.querySelector('span').textContent = o ? 'Close' : 'Menu'; });
  $$('[data-mega]').forEach(function (b) {
    var panel = document.getElementById(b.getAttribute('aria-controls'));
    function set(open) { b.setAttribute('aria-expanded', open); panel.hidden = !open; }
    b.addEventListener('click', function (e) { e.stopPropagation(); set(panel.hidden); });
    panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') { set(false); b.focus(); } });
    document.addEventListener('click', function (e) { if (!panel.hidden && !panel.contains(e.target) && e.target !== b) set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { set(false); } });
    panel.addEventListener('focusout', function (e) { if (e.relatedTarget && !panel.contains(e.relatedTarget) && e.relatedTarget !== b) set(false); });
  });

  /* age notice (self-declaration only; how age is verified is a compliance decision for the client) */
  var AGE = 'jo_age_ok';
  function ageOk() { try { return localStorage.getItem(AGE) === '1'; } catch (e) { return false; } }
  var gate = $('#agegate');
  if (gate && window.JO_CONFIG && JO_CONFIG.ageGate && !ageOk() && !/[?&]noage=1/.test(location.search)) {
    JO.openDialog('agegate');
    gate.addEventListener('cancel', function (e) { e.preventDefault(); });
    $('#age-yes').addEventListener('click', function () { try { localStorage.setItem(AGE, '1'); } catch (e) {} JO.closeDialog('agegate'); });
    $('#age-no').addEventListener('click', function () { location.href = 'age-policy.html?under=1'; });
  }

  /* basket drawer */
  var drawer = $('#drawer'), scrim = $('#scrim');
  JO.openCart = function () { if (!drawer) return; lastFocus = document.activeElement; drawer.classList.add('on'); scrim.classList.add('on'); drawer.removeAttribute('aria-hidden'); document.body.style.overflow = 'hidden'; var c = $('.x', drawer); if (c) c.focus(); };
  JO.closeCart = function () { if (!drawer) return; drawer.classList.remove('on'); scrim.classList.remove('on'); drawer.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; if (lastFocus && lastFocus.focus) lastFocus.focus(); };
  $$('[data-open-cart]').forEach(function (b) { b.addEventListener('click', function (e) { if (document.body.dataset.page === 'cart') return; e.preventDefault(); JO.openCart(); }); });
  $$('[data-close-cart]').forEach(function (b) { b.addEventListener('click', JO.closeCart); });
  if (scrim) scrim.addEventListener('click', JO.closeCart);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer && drawer.classList.contains('on')) JO.closeCart();
    if (e.key === 'Tab' && drawer && drawer.classList.contains('on')) { var f = $$('button, a[href], input', drawer).filter(function (n) { return !n.disabled && n.offsetParent !== null; }); if (!f.length) return; var a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
  });

  JO.lineHtml = function (l) {
    var th = l.image ? '<img src="' + JO.esc(l.image) + '" alt="" width="64" height="64">' : '';
    return '<li class="line" data-line="' + JO.esc(l.id) + '"><div class="th">' + th + '</div><div><div class="t"><a href="product.html?h=' + encodeURIComponent(l.handle || '') + '">' + JO.esc(l.title) + '</a></div>' + (l.variantTitle ? '<div class="note-s">' + JO.esc(l.variantTitle) + '</div>' : '') +
      '<div class="ctl"><div class="qty" role="group" aria-label="Quantity for ' + JO.esc(l.title) + '"><button type="button" data-dec aria-label="Fewer">&minus;</button><output aria-live="polite">' + l.qty + '</output><button type="button" data-inc aria-label="More">+</button></div><button type="button" class="linkbtn" data-rm>Remove</button></div></div>' +
      '<div class="price">' + Store.money(l.price * l.qty) + '</div></li>';
  };
  JO.bindLines = function (root) {
    root.addEventListener('click', function (e) {
      var li = e.target.closest('[data-line]'); if (!li) return; var id = li.getAttribute('data-line'), line = Store.cart.current().lines.filter(function (l) { return l.id === id; })[0]; if (!line) return;
      if (e.target.closest('[data-inc]')) Store.cart.setQty(id, line.qty + 1).catch(JO.fail);
      else if (e.target.closest('[data-dec]')) Store.cart.setQty(id, line.qty - 1).catch(JO.fail);
      else if (e.target.closest('[data-rm]')) Store.cart.remove(id).catch(JO.fail);
    });
  };
  JO.fail = function (err) { JO.toast((err && err.message) ? 'Sorry: ' + err.message : 'Something went wrong. Please try again.'); };
  JO.renderDrawer = function (c) {
    var list = $('#cart-lines'); if (!list) return;
    list.innerHTML = c.lines.length ? c.lines.map(JO.lineHtml).join('') : '<li class="empty">Your basket is empty.<br><a class="link" href="shop.html">Have a look around the shop</a></li>';
    $('#cart-total').textContent = Store.money(c.subtotal);
    $('#drawer-checkout').disabled = !c.lines.length;
  };
  document.addEventListener('jo:cart', function (e) {
    var c = e.detail; $$('[data-cart-count]').forEach(function (n) { n.textContent = c.count; });
    $$('[data-cart-label]').forEach(function (n) { n.setAttribute('aria-label', 'Basket, ' + c.count + (c.count === 1 ? ' item' : ' items')); });
    JO.renderDrawer(c);
  });
  var dl = $('#cart-lines'); if (dl) JO.bindLines(dl);

  /* checkout hand-off. Live: Shopify's own checkout (payment methods are the ones enabled in Shopify). Demo: explanatory dialog, nothing is charged. */
  JO.checkout = function () {
    var c = Store.cart.current(); if (!c.lines.length) return;
    if (Store.mode === 'shopify') { var u = Store.cart.checkoutUrl(); if (u) { location.href = u; return; } JO.toast('Checkout is not ready. Please try again.'); return; }
    JO.openDialog('demo-checkout');
  };
  $$('[data-checkout]').forEach(function (b) { b.addEventListener('click', function () { JO.checkout(); }); });
  $$('[data-demo-only]').forEach(function (n) { n.hidden = Store.mode !== 'demo'; });
  $$('[data-live-only]').forEach(function (n) { n.hidden = Store.mode !== 'shopify'; });

  /* footer newsletter */
  JO.newsletterForm = function (form, status) {
    form.addEventListener('submit', function (e) {
      e.preventDefault(); var email = form.elements.email, consent = form.elements.consent;
      status.className = ''; status.textContent = '';
      if (!email.value || !email.checkValidity()) { status.className = 'err'; status.textContent = 'Please enter a valid email address.'; email.focus(); return; }
      if (consent && !consent.checked) { status.className = 'err'; status.textContent = 'Please tick the box so we know you are happy to hear from us.'; consent.focus(); return; }
      var ep = (window.JO_CONFIG || {}).newsletterEndpoint;
      var done = function () { status.className = 'ok'; status.textContent = ep ? 'Thank you. You are on the list.' : 'Thank you. (Demonstration only: nothing was sent or stored.)'; form.reset(); };
      if (!ep) { done(); return; }
      fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.value, consent: !!(consent && consent.checked) }) })
        .then(function (r) { if (!r.ok) throw new Error('Sign-up failed'); done(); }).catch(function () { status.className = 'err'; status.textContent = 'Sorry, that did not work. Please try again.'; });
    });
  };
  $$('form[data-newsletter]').forEach(function (f) { JO.newsletterForm(f, $('[data-status]', f)); });

  if (window.Store) Store.cart.load().catch(function () { /* offline: basket stays empty */ });
})();
