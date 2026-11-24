/* Jack O'Beers: store layer. One interface, two adapters.
     Store.mode              'shopify' | 'demo'
     Store.collection(h)     -> { title, lede, products[] }
     Store.product(handle)   -> product | null
     Store.cart.get/add/setQty/remove/setAttributes/checkout
   Shopify mode talks to the Storefront API (GraphQL) and sends the buyer to Shopify's own checkout. Demo mode uses data/products.json and a
   local basket, and never leaves the page. The rest of the site only ever calls Store.*, so switching modes needs no page changes. */
(function () {
  'use strict';
  var C = window.JO_CONFIG || {};
  var live = !!(C.shopifyDomain && C.storefrontToken);
  var Store = window.Store = { mode: live ? 'shopify' : 'demo', config: C };
  var money = new Intl.NumberFormat(C.locale || 'en-GB', { style: 'currency', currency: C.currency || 'GBP' });
  Store.money = function (n) { return money.format(Number(n) || 0); };
  function emit(cart) { document.dispatchEvent(new CustomEvent('jo:cart', { detail: cart })); }
  var base = (document.currentScript && document.currentScript.src) ? document.currentScript.src.replace(/assets\/js\/store\.js.*$/, '') : '';
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------------- Shopify adapter ---------------- */
  var META = ['descriptor', 'kind', 'flavour_sweet', 'flavour_bitter', 'flavour_fruity', 'flavour_body', 'pairings', 'allergens', 'abv'];
  var PRODUCT_FRAGMENT = 'fragment P on Product { id handle title description productType tags featuredImage { url altText } images(first: 6) { nodes { url altText } } ' +
    'variants(first: 20) { nodes { id title availableForSale price { amount currencyCode } } } ' +
    'metafields(identifiers: [' + META.map(function (k) { return '{ namespace: "custom", key: "' + k + '" }'; }).join(', ') + ']) { key value } }';
  var CART_FRAGMENT = 'fragment C on Cart { id checkoutUrl totalQuantity attributes { key value } cost { subtotalAmount { amount currencyCode } } ' +
    'lines(first: 100) { nodes { id quantity merchandise { ... on ProductVariant { id title price { amount } product { handle title featuredImage { url } } } } } } }';

  function endpoint() { return (C.apiBase || ('https://' + C.shopifyDomain)) + '/api/' + (C.apiVersion || '2025-01') + '/graphql.json'; }
  function gql(query, variables) {
    return fetch(endpoint(), { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': C.storefrontToken }, body: JSON.stringify({ query: query, variables: variables || {} }) })
      .then(function (r) { if (!r.ok) throw new Error('Shop request failed (' + r.status + ')'); return r.json(); })
      .then(function (j) { if (j.errors && j.errors.length) throw new Error(j.errors[0].message || 'Shop error'); return j.data; });
  }
  function mf(p) { var o = {}; (p.metafields || []).forEach(function (m) { if (m) o[m.key] = m.value; }); return o; }
  function num(v) { var n = parseInt(v, 10); return isNaN(n) ? null : Math.max(0, Math.min(5, n)); }
  function normShopify(p, collection) {
    var m = mf(p), fl = null;
    if (m.flavour_sweet != null || m.flavour_bitter != null || m.flavour_fruity != null || m.flavour_body != null) fl = { sweet: num(m.flavour_sweet), bitter: num(m.flavour_bitter), fruity: num(m.flavour_fruity), body: num(m.flavour_body) };
    var pairings = []; if (m.pairings) { try { var j = JSON.parse(m.pairings); pairings = Array.isArray(j) ? j : []; } catch (e) { pairings = String(m.pairings).split(',').map(function (s) { return s.trim(); }).filter(Boolean); } }
    var desc = p.description || '';
    return { handle: p.handle, title: p.title, collection: collection || '', productType: p.productType || '', tags: p.tags || [], descriptor: m.descriptor || (desc.split(/(?<=[.!?])\s/)[0] || ''),
      description: desc, kind: m.kind || 'bottle', flavour: fl, pairings: pairings, abv: m.abv || '', allergens: m.allergens || '',
      image: p.featuredImage ? { url: p.featuredImage.url, alt: p.featuredImage.altText || p.title } : null, images: ((p.images && p.images.nodes) || []).map(function (i) { return { url: i.url, alt: i.altText || p.title }; }),
      variants: ((p.variants && p.variants.nodes) || []).map(function (v) { return { id: v.id, title: v.title, price: parseFloat(v.price.amount), available: v.availableForSale }; }), demo: false };
  }
  function normCart(c) {
    if (!c) return { id: null, lines: [], count: 0, subtotal: 0, checkoutUrl: null, attributes: {} };
    var attrs = {}; (c.attributes || []).forEach(function (a) { attrs[a.key] = a.value; });
    return { id: c.id, checkoutUrl: c.checkoutUrl, count: c.totalQuantity, subtotal: parseFloat(c.cost.subtotalAmount.amount), attributes: attrs,
      lines: c.lines.nodes.map(function (l) { var mm = l.merchandise; return { id: l.id, variantId: mm.id, qty: l.quantity, title: mm.product.title, variantTitle: mm.title === 'Default Title' ? '' : mm.title, price: parseFloat(mm.price.amount), image: mm.product.featuredImage ? mm.product.featuredImage.url : null, handle: mm.product.handle }; }) };
  }
  var shopify = {
    collection: function (h) {
      return gql(PRODUCT_FRAGMENT + ' query Col($h: String!) { collection(handle: $h) { title description products(first: 60) { nodes { ...P } } } }', { h: h }).then(function (d) {
        var c = d.collection; if (!c) return { title: h, lede: '', products: [] };
        return { title: c.title, lede: c.description || '', products: c.products.nodes.map(function (p) { return normShopify(p, h); }) };
      });
    },
    product: function (handle) { return gql(PRODUCT_FRAGMENT + ' query Prod($h: String!) { product(handle: $h) { ...P } }', { h: handle }).then(function (d) { return d.product ? normShopify(d.product, '') : null; }); },
    cartApi: {
      load: function () { var id = ls('jo_cart_id'); if (!id) return Promise.resolve(normCart(null)); return gql(CART_FRAGMENT + ' query Cart($id: ID!) { cart(id: $id) { ...C } }', { id: id }).then(function (d) { if (!d.cart) { ls('jo_cart_id', null); return normCart(null); } return normCart(d.cart); }); },
      add: function (variantId, qty) {
        var id = ls('jo_cart_id'), lines = [{ merchandiseId: variantId, quantity: qty }];
        var q = id ? CART_FRAGMENT + ' mutation Add($id: ID!, $lines: [CartLineInput!]!) { cartLinesAdd(cartId: $id, lines: $lines) { cart { ...C } userErrors { message } } }'
                   : CART_FRAGMENT + ' mutation Create($input: CartInput!) { cartCreate(input: $input) { cart { ...C } userErrors { message } } }';
        return gql(q, id ? { id: id, lines: lines } : { input: { lines: lines } }).then(function (d) {
          var r = id ? d.cartLinesAdd : d.cartCreate; if (r.userErrors && r.userErrors.length) throw new Error(r.userErrors[0].message);
          ls('jo_cart_id', r.cart.id); return normCart(r.cart);
        });
      },
      setQty: function (lineId, qty) {
        var id = ls('jo_cart_id');
        if (qty < 1) return shopify.cartApi.remove(lineId);
        return gql(CART_FRAGMENT + ' mutation Upd($id: ID!, $lines: [CartLineUpdateInput!]!) { cartLinesUpdate(cartId: $id, lines: $lines) { cart { ...C } userErrors { message } } }', { id: id, lines: [{ id: lineId, quantity: qty }] }).then(function (d) { return normCart(d.cartLinesUpdate.cart); });
      },
      remove: function (lineId) { var id = ls('jo_cart_id'); return gql(CART_FRAGMENT + ' mutation Rm($id: ID!, $ids: [ID!]!) { cartLinesRemove(cartId: $id, lineIds: $ids) { cart { ...C } userErrors { message } } }', { id: id, ids: [lineId] }).then(function (d) { return normCart(d.cartLinesRemove.cart); }); },
      setAttributes: function (obj) {
        var id = ls('jo_cart_id'); obj = Object.assign({}, current.attributes, obj); /* the API replaces the whole list, so always send the merged set */ var attrs = Object.keys(obj).map(function (k) { return { key: k, value: String(obj[k]) }; });
        var make = id ? Promise.resolve(id) : gql(CART_FRAGMENT + ' mutation Create($input: CartInput!) { cartCreate(input: $input) { cart { ...C } } }', { input: {} }).then(function (d) { ls('jo_cart_id', d.cartCreate.cart.id); return d.cartCreate.cart.id; });
        return make.then(function (cid) { return gql(CART_FRAGMENT + ' mutation Attr($id: ID!, $a: [AttributeInput!]!) { cartAttributesUpdate(cartId: $id, attributes: $a) { cart { ...C } userErrors { message } } }', { id: cid, a: attrs }); }).then(function (d) { return normCart(d.cartAttributesUpdate.cart); });
      }
    }
  };

  /* ---------------- Demo adapter ---------------- */
  var demoData = null;
  function loadDemo() { if (demoData) return demoData; demoData = fetch(base + (C.catalogueFile || 'data/products.json')).then(function (r) { if (!r.ok) throw new Error('catalogue'); return r.json(); }).then(function (d) { d.products.forEach(function (p) { p.demo = true; }); return d; }); return demoData; }
  var demo = {
    collection: function (h) { return loadDemo().then(function (d) { var c = d.collections[h] || { title: h, lede: '' }; return { title: c.title, lede: c.lede, products: d.products.filter(function (p) { return p.collection === h; }) }; }); },
    product: function (handle) { return loadDemo().then(function (d) { return d.products.filter(function (p) { return p.handle === handle; })[0] || null; }); },
    cartApi: {
      read: function () { try { return JSON.parse(ls('jo_cart_demo') || '{"lines":[],"attributes":{}}'); } catch (e) { return { lines: [], attributes: {} }; } },
      write: function (c) { ls('jo_cart_demo', JSON.stringify(c)); return demo.cartApi.shape(c); },
      shape: function (c) { var count = 0, sub = 0; c.lines.forEach(function (l) { count += l.qty; sub += l.qty * l.price; }); return { id: 'demo', lines: c.lines, count: count, subtotal: sub, checkoutUrl: null, attributes: c.attributes || {} }; },
      load: function () { return Promise.resolve(demo.cartApi.shape(demo.cartApi.read())); },
      add: function (variantId, qty, meta) {
        var c = demo.cartApi.read(), line = c.lines.filter(function (l) { return l.variantId === variantId; })[0];
        if (line) line.qty += qty; else c.lines.push({ id: 'l' + Date.now() + Math.random().toString(16).slice(2, 6), variantId: variantId, qty: qty, title: meta.title, variantTitle: meta.variantTitle || '', price: meta.price, image: meta.image || null, handle: meta.handle });
        return Promise.resolve(demo.cartApi.write(c));
      },
      setQty: function (lineId, qty) { var c = demo.cartApi.read(); c.lines = c.lines.map(function (l) { if (l.id === lineId) l.qty = qty; return l; }).filter(function (l) { return l.qty > 0; }); return Promise.resolve(demo.cartApi.write(c)); },
      remove: function (lineId) { return demo.cartApi.setQty(lineId, 0); },
      setAttributes: function (obj) { var c = demo.cartApi.read(); c.attributes = Object.assign(c.attributes || {}, obj); return Promise.resolve(demo.cartApi.write(c)); }
    }
  };
  var A = live ? shopify : demo;

  Store.collection = function (h) { return A.collection(h); };
  Store.product = function (h) { return A.product(h); };
  var current = { id: null, lines: [], count: 0, subtotal: 0, checkoutUrl: null, attributes: {} };
  function set(c) { current = c; emit(c); return c; }
  Store.cart = {
    current: function () { return current; },
    load: function () { return A.cartApi.load().then(set); },
    /* meta is used by the demo adapter (Shopify already knows the variant): { title, variantTitle, price, image, handle } */
    add: function (variantId, qty, meta) { return A.cartApi.add(variantId, qty || 1, meta || {}).then(set); },
    setQty: function (lineId, qty) { return A.cartApi.setQty(lineId, qty).then(set); },
    remove: function (lineId) { return A.cartApi.remove(lineId).then(set); },
    setAttributes: function (obj) { return A.cartApi.setAttributes(obj).then(set); },
    /* Live: returns the Shopify checkout URL (the caller redirects). Demo: returns null and the UI shows the demonstration dialog. */
    checkoutUrl: function () { return live ? current.checkoutUrl : null; }
  };
  Store.reset = function () { ls('jo_cart_demo', null); ls('jo_cart_id', null); set({ id: null, lines: [], count: 0, subtotal: 0, checkoutUrl: null, attributes: {} }); };
})();
