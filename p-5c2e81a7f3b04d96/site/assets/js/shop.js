/* Jack O'Beers: shop pages. Collection grids, product page, basket page, click and collect slots, members demo wall. Everything goes through Store.* */
(function () {
  'use strict';
  var JO = window.JO, $ = JO.$, $$ = JO.$$, esc = JO.esc;
  var page = document.body.dataset.page;
  var C = window.JO_CONFIG || {};

  function variantOf(p) { return p.variants.filter(function (v) { return v.available; })[0] || p.variants[0]; }
  function priceText(p) {
    var v = p.variants, min = Math.min.apply(null, v.map(function (x) { return x.price; }));
    return (v.length > 1 ? 'From ' : '') + Store.money(min);
  }
  function tbc(t) { return /^\[.*\]$/.test(t || '') ? '<span class="tbc">' + esc(t.slice(1, -1)) + '</span>' : esc(t); }
  function photo(p, alt) { return p.image ? '<img src="' + esc(p.image.url) + '" alt="' + esc(p.image.alt || alt) + '" loading="lazy" width="640" height="480">' : '<span>Photo slot<br>' + esc(p.demo ? 'Real photo of this product goes here' : 'No image set in Shopify') + '</span>'; }
  function add(p, qty, thenCheckout) {
    var v = variantOf(p);
    if (!v || !v.available) { JO.toast('Sorry, that is sold out.'); return Promise.resolve(); }
    return Store.cart.add(v.id, qty || 1, { title: p.title, variantTitle: v.title === 'Default' || v.title === 'Default Title' ? '' : v.title, price: v.price, image: p.image && p.image.url, handle: p.handle })
      .then(function () { if (thenCheckout) JO.checkout(); else { JO.toast(p.title + ' added to your basket'); JO.openCart(); } }).catch(JO.fail);
  }

  function card(p) {
    var v = variantOf(p), avail = v && v.available;
    return '<li class="card" data-handle="' + esc(p.handle) + '" data-kind="' + esc(p.kind) + '"><div class="slot">' + photo(p, p.title) + '</div>' +
      '<div class="card-b"><div class="chips">' + (p.demo ? '<span class="chip">Sample</span>' : '') + '<span class="chip k">' + esc(p.productType || p.kind) + '</span></div>' +
      '<h3><a href="product.html?h=' + encodeURIComponent(p.handle) + '">' + esc(p.title) + '</a></h3><p class="desc">' + esc(p.descriptor) + '</p>' + (p.blurb && !/^\[.*\]$/.test(p.blurb) ? '<p class="blurb">' + esc(p.blurb) + '</p>' : '') + (p.pairings && p.pairings.length ? '<p class="blurb"><b>Goes with:</b> ' + p.pairings.map(esc).join(', ') + '</p>' : '') + '</div>' +
      '<div class="card-f"><div class="price">' + priceText(p) + (p.demo ? '<small>Sample price</small>' : '') + '</div>' +
      '<div class="card-act">' + (avail ? '<button class="btn sm" type="button" data-add="' + esc(p.handle) + '">Add to basket</button><button class="btn sm ghost" type="button" data-buy="' + esc(p.handle) + '">Buy now</button>' : '<span class="tbc">Sold out</span>') + '</div></div></li>';
  }

  /* ---------- collection ---------- */
  function initCollection() {
    var handle = document.body.dataset.collection, list = $('#cards'), status = $('#cards-status'), byHandle = {};
    var filters = $('#filters');
    Store.collection(handle).then(function (col) {
      col.products.forEach(function (p) { byHandle[p.handle] = p; });
      if (!col.products.length) { list.innerHTML = ''; status.textContent = 'Nothing here yet. Check back soon.'; return; }
      status.textContent = '';
      function show(f) {
        var items = col.products.filter(function (p) { return !f || f === 'all' || p.productType === f || p.tags.indexOf(f) > -1; });
        list.innerHTML = items.map(card).join('');
        status.textContent = items.length + (items.length === 1 ? ' product' : ' products') + ' shown';
        window.dispatchEvent(new Event('jo:layout'));
      }
      var types = []; col.products.forEach(function (p) { if (p.productType && types.indexOf(p.productType) < 0) types.push(p.productType); });
      if (filters && types.length > 1) {
        filters.innerHTML = '<button type="button" aria-pressed="true" data-f="all">All</button>' + types.map(function (t) { return '<button type="button" aria-pressed="false" data-f="' + esc(t) + '">' + esc(t) + '</button>'; }).join('');
        filters.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; $$('button', filters).forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); show(b.dataset.f); });
      }
      show('all');
    }).catch(function () { status.className = 'err'; status.textContent = 'Sorry, we could not load the shop just now. Please refresh, or call the shop.'; });
    list.addEventListener('click', function (e) {
      var a = e.target.closest('[data-add]'), b = e.target.closest('[data-buy]');
      if (a) add(byHandle[a.dataset.add], 1, false); else if (b) add(byHandle[b.dataset.buy], 1, true);
    });
  }

  /* ---------- product ---------- */
  function dials(f) {
    if (!f) return '<p class="note-s">Flavour guide to come from the shop.</p>';
    return '<div class="dials">' + [['Sweet', 'sweet'], ['Bitter', 'bitter'], ['Fruity', 'fruity'], ['Body', 'body']].map(function (d) {
      var n = f[d[1]]; if (n == null) return ''; var bar = ''; for (var i = 1; i <= 5; i++) bar += '<i' + (i <= n ? ' class="on"' : '') + '></i>';
      return '<div class="dial"><span>' + d[0] + '</span><span class="bar" role="img" aria-label="' + n + ' out of 5">' + bar + '</span></div>';
    }).join('') + '</div>';
  }
  function initProduct() {
    var h = new URLSearchParams(location.search).get('h'), root = $('#pdp');
    if (!h) { root.innerHTML = '<p>We could not find that product. <a class="link" href="shop.html">Back to the shop</a></p>'; return; }
    Store.product(h).then(function (p) {
      if (!p) { root.innerHTML = '<p>We could not find that product. <a class="link" href="shop.html">Back to the shop</a></p>'; document.title = 'Product not found | Jack O’Beers'; return; }
      document.title = p.title + ' | Jack O’Beers';
      var v = variantOf(p), qty = 1;
      var opts = p.variants.length > 1 ? '<div class="field"><label for="variant">Size</label><select id="variant">' + p.variants.map(function (x, i) { return '<option value="' + i + '"' + (x === v ? ' selected' : '') + (x.available ? '' : ' disabled') + '>' + esc(x.title) + ' (' + Store.money(x.price) + ')</option>'; }).join('') + '</select></div>' : '';
      root.innerHTML =
        '<div><div class="slot">' + photo(p, p.title) + '</div></div><div class="pdp-b" style="display:grid;gap:1.4rem;align-content:start">' +
        '<div class="crumbs"><a href="shop.html">Shop</a> / <span>' + esc(p.productType || p.kind) + '</span></div>' +
        (p.demo ? '<p class="notice"><b>Sample product.</b> Name, flavours, pairings and price are demonstration data for the design, not the shop&rsquo;s range.</p>' : '') +
        '<h1 style="font-size:clamp(2.2rem,5vw,3.6rem)">' + esc(p.title) + '</h1><p class="lede">' + esc(p.descriptor) + '</p>' +
        '<div class="buybox"><div class="price" id="pprice">' + Store.money(v.price) + (p.demo ? '<small>Sample price</small>' : '') + '</div>' + opts +
        '<div class="row" style="display:flex;gap:.8rem;flex-wrap:wrap;align-items:center"><div class="qty" role="group" aria-label="Quantity"><button type="button" id="q-" aria-label="Fewer">&minus;</button><output id="q" aria-live="polite">1</output><button type="button" id="q+" aria-label="More">+</button></div>' +
        '<button class="btn" type="button" id="p-add">Add to basket</button><button class="btn dk" type="button" id="p-buy">Buy now</button></div>' +
        '<div class="pay-opts"><span>Choose how you get it at the basket: <b>delivery</b> or <b>click and collect</b>.</span><span data-live-only>You pay securely on Shopify&rsquo;s checkout.</span><span data-demo-only>Demonstration mode: checkout is not connected, nothing is charged.</span></div></div>' +
        '<h2 style="font-size:1.6rem">Flavour</h2>' + dials(p.flavour) +
        '<dl class="dl"><div><dt>About</dt><dd>' + tbc(p.blurb && !/^\[.*\]$/.test(p.blurb) ? p.blurb : p.description) + '</dd></div><div><dt>Goes well with</dt><dd>' + (p.pairings.length ? p.pairings.map(esc).join(', ') : '<span class="tbc">to be supplied</span>') + '</dd></div><div><dt>ABV</dt><dd>' + tbc(p.abv || '[ABV to be confirmed]') + '</dd></div><div><dt>Allergens</dt><dd>' + tbc(p.allergens || '[Allergens to be verified]') + '</dd></div></dl>' +
        '<p class="note-s">Please drink responsibly. 18+ only. We check age on delivery and collection.</p></div>';
      $$('[data-demo-only]', root).forEach(function (n) { n.hidden = Store.mode !== 'demo'; }); $$('[data-live-only]', root).forEach(function (n) { n.hidden = Store.mode !== 'shopify'; });
      var sel = $('#variant', root); if (sel) sel.addEventListener('change', function () { v = p.variants[+sel.value]; $('#pprice').firstChild.textContent = Store.money(v.price); });
      var qo = $('#q');
      $('#q-').addEventListener('click', function () { qty = Math.max(1, qty - 1); qo.textContent = qty; });
      $('#q\\+').addEventListener('click', function () { qty = Math.min(24, qty + 1); qo.textContent = qty; });
      function go(co) { var vv = v; Store.cart.add(vv.id, qty, { title: p.title, variantTitle: vv.title === 'Default' ? '' : vv.title, price: vv.price, image: p.image && p.image.url, handle: p.handle }).then(function () { if (co) JO.checkout(); else { JO.toast(p.title + ' added to your basket'); JO.openCart(); } }).catch(JO.fail); }
      $('#p-add').addEventListener('click', function () { go(false); });
      $('#p-buy').addEventListener('click', function () { go(true); });
    }).catch(function () { root.innerHTML = '<p class="err">Sorry, we could not load this product. Please refresh.</p>'; });
  }

  /* ---------- collection slots (shared by collect page and basket) ---------- */
  function slotDays() {
    var cfg = C.collection || {}, out = [], now = new Date(), earliest = new Date(now.getTime() + (cfg.leadHours || 24) * 3600e3);
    for (var i = 0; i < (cfg.horizonDays || 10) + 2; i++) { var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i); if ((cfg.weekdays || []).indexOf(d.getDay()) < 0) continue; if (d < new Date(earliest.getFullYear(), earliest.getMonth(), earliest.getDate())) continue; out.push(d); }
    return out;
  }
  var fmt = new Intl.DateTimeFormat(C.locale || 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  JO.renderSlots = function (box, onPick) {
    var days = slotDays(), wins = (C.collection || {}).windows || [], cur = Store.cart.current().attributes || {};
    box.innerHTML = days.length ? days.map(function (d) { return wins.map(function (w) { var val = iso(d) + '|' + w, id = 's' + iso(d) + w.replace(/\W/g, ''); return '<label><input type="radio" name="slot" value="' + val + '" id="' + id + '"' + ((cur.collection_date === iso(d) && cur.collection_window === w) ? ' checked' : '') + '><span>' + esc(fmt.format(d)) + '<small>' + esc(w) + '</small></span></label>'; }).join(''); }).join('') : '<p class="note-s">No collection times are set yet.</p>';
    box.addEventListener('change', function (e) { if (e.target.name !== 'slot') return; var p = e.target.value.split('|'); onPick({ collection_date: p[0], collection_window: p[1] }); });
  };

  /* ---------- basket page ---------- */
  function initCart() {
    var list = $('#page-lines'), tot = $('#page-total'), slotBox = $('#slots'), slotWrap = $('#slot-wrap'), msg = $('#cart-msg');
    function render(c) {
      list.innerHTML = c.lines.length ? c.lines.map(JO.lineHtml).join('') : '<li class="empty">Your basket is empty.<br><a class="link" href="shop.html">Have a look around the shop</a></li>';
      tot.textContent = Store.money(c.subtotal);
      $('#page-checkout').disabled = !c.lines.length;
      var m = (c.attributes || {}).delivery_method || 'ship'; $$('input[name="method"]').forEach(function (r) { r.checked = r.value === m; }); slotWrap.hidden = m !== 'collect';
    }
    JO.bindLines(list);
    document.addEventListener('jo:cart', function (e) { render(e.detail); });
    render(Store.cart.current());
    JO.renderSlots(slotBox, function (a) { Store.cart.setAttributes(a).catch(JO.fail); msg.textContent = ''; });
    $$('input[name="method"]').forEach(function (r) { r.addEventListener('change', function () { slotWrap.hidden = r.value !== 'collect'; Store.cart.setAttributes({ delivery_method: r.value }).catch(JO.fail); }); });
    $('#page-checkout').addEventListener('click', function () {
      var a = Store.cart.current().attributes || {};
      if (a.delivery_method === 'collect' && !(a.collection_date && a.collection_window)) { msg.className = 'err'; msg.textContent = 'Please choose a collection time first.'; slotBox.querySelector('input') && slotBox.querySelector('input').focus(); return; }
      if (!a.delivery_method) Store.cart.setAttributes({ delivery_method: 'ship' }).then(JO.checkout); else JO.checkout();
    });
  }

  /* ---------- click and collect page ---------- */
  function initCollect() {
    var box = $('#slots'), out = $('#slot-out');
    JO.renderSlots(box, function (a) {
      Store.cart.setAttributes(Object.assign({ delivery_method: 'collect' }, a)).then(function () { out.className = 'ok'; out.textContent = 'Saved: ' + fmt.format(new Date(a.collection_date + 'T12:00')) + ', ' + a.collection_window + '. Add your drinks and head to the basket.'; }).catch(JO.fail);
    });
  }

  /* ---------- members (DEMONSTRATION wall: real gating needs Shopify customer accounts or a server) ---------- */
  function initMembers() {
    var wall = $('#wall'), area = $('#area'), KEY = 'jo_member_demo';
    function sync() { var on = false; try { on = sessionStorage.getItem(KEY) === '1'; } catch (e) {} wall.hidden = on; area.hidden = !on; }
    $$('[data-signin]').forEach(function (b) { b.addEventListener('click', function () { if (C.accountUrl) { location.href = C.accountUrl; return; } JO.openDialog('signin'); }); });
    var f = $('#signin-form'); if (f) f.addEventListener('submit', function (e) { e.preventDefault(); var em = f.elements.email, pw = f.elements.password, st = $('[data-status]', f); if (!em.checkValidity() || !pw.value) { st.className = 'err'; st.textContent = 'Enter an email and any password to preview the members area.'; return; } try { sessionStorage.setItem(KEY, '1'); } catch (x) {} JO.closeDialog('signin'); sync(); });
    var out = $('#signout'); if (out) out.addEventListener('click', function () { try { sessionStorage.removeItem(KEY); } catch (x) {} sync(); });
    sync();
  }

  if (page === 'collection') initCollection();
  if (page === 'product') initProduct();
  if (page === 'cart') initCart();
  if (page === 'collect') initCollect();
  if (page === 'members') initMembers();
  /* featured products on the home page */
  if (page === 'home') {
    var feat = $('#featured'); if (feat) Store.collection('beers').then(function (c) { feat.innerHTML = c.products.slice(0, 4).map(card).join(''); var by = {}; c.products.forEach(function (p) { by[p.handle] = p; }); feat.addEventListener('click', function (e) { var a = e.target.closest('[data-add]'), b = e.target.closest('[data-buy]'); if (a) add(by[a.dataset.add], 1, false); else if (b) add(by[b.dataset.buy], 1, true); }); }).catch(function () {});
  }
})();
