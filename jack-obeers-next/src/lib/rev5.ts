// @ts-nocheck
/* Lifted from the Rev 5 static preview (rev5.js) so the design behaves the same in Next.js.
   Temporary: it drives the DOM directly. Next steps are to replace it piece by piece with React components. */
/* Jack O'Beers Rev 5: shared behaviour. Header, basket, toast, reveals, the opening, the shelf with its beer-bottle cursor, the label panel. */
export function initRev5(P: any[]): () => void {
  const offs: Array<() => void> = [];
  const on = (t: any, type: string, fn: any, o?: any) => { t.addEventListener(type, fn, o); offs.push(() => t.removeEventListener(type, fn, o)); };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  document.documentElement.classList.add('js');
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var money = function (n) { return '£' + Number(n).toFixed(2); };
  var ls = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };

  /* ---- toast ---- */
  var tt; function toast(m) { var t = $('#toast'); if (!t) return; t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(function () { t.classList.remove('on'); }, 2800); }

  /* ---- header ---- */
  var hdr = $('.hdr');
  function hs() { if (hdr) hdr.classList.toggle('solid', scrollY > 30 || document.body.dataset.solid === '1'); }
  on(window, 'scroll', hs, { passive: true }); hs();
  var mb = $('#menubtn'), tabs = $('#tabs');
  if (mb) mb.addEventListener('click', function () { var o = tabs.classList.toggle('open'); mb.setAttribute('aria-expanded', o); mb.firstElementChild.textContent = o ? 'Close' : 'Menu'; });
  $$('[data-drop]').forEach(function (b) {
    var p = document.getElementById(b.getAttribute('aria-controls'));
    function set(o) { b.setAttribute('aria-expanded', o); p.hidden = !o; }
    b.addEventListener('click', function (e) { e.stopPropagation(); set(p.hidden); });
    on(document, 'click', function (e) { if (!p.hidden && !p.contains(e.target)) set(false); });
    on(document, 'keydown', function (e) { if (e.key === 'Escape' && !p.hidden) { set(false); b.focus(); } });
    $$('a', p).forEach(function (a) { a.addEventListener('click', function () { set(false); if (tabs) tabs.classList.remove('open'); }); });
  });

  /* ---- reveals ---- */
  var rv = $$('.rv');
  if (reduced || !('IntersectionObserver' in window)) rv.forEach(function (n) { n.classList.add('in'); });
  else { var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' }); rv.forEach(function (n) { io.observe(n); }); }

  /* ---- products ---- */
  var SHELVES = { beers: 'Beers', ciders: 'Ciders', wines: 'Wines', kegs: 'Kegs' };
  var COL = { 'Amber ale': '#c97a1c', Stout: '#2a140c', Lager: '#e8c25a', 'Fruit beer': '#b5502a', IPA: '#d8962a', 'Dry cider': '#e3c36a', 'Medium cider': '#dcb24f', 'Fruit cider': '#c46a4a', 'Red wine': '#5a1424', 'White wine': '#e6d98f', 'Rose wine': '#d98a8a', 'Rosé wine': '#d98a8a', 'Pale Ale': '#d8962a', Pilsner: '#e8c25a', Porter: '#3a1c10', Sour: '#c46a4a', NEIPA: '#e0b04a', Bitter: '#b8741c', Blonde: '#ecc860', Ale: '#c97a1c', Heavy: '#8a4a18', Cider: '#e3c36a', 'Cherry beer': '#9a2a2a', 'Sparkling wine': '#ecdc9a', IPL: '#e8c25a' };
  function colour(p) { return COL[p.productType] || (p.kind === 'keg' ? '#c97a1c' : '#d9992b'); }
  function price(p) { return Math.min.apply(null, p.variants.map(function (v) { return v.price; })); }
  function by(h) { return P.filter(function (p) { return p.handle === h; })[0]; }
  var uid = 0;
  function photo(p, cls) {
    if (!p.image) return '';
    var u = p.image + (p.image.indexOf('?') > -1 ? '&' : '?') + 'width=720';
    return '<img class="' + cls + '" src="' + esc(u) + '" alt="' + esc(p.title) + '" width="720" height="720" loading="lazy" decoding="async">';
  }
  function glass(p, lvl) {
    var id = 'g' + (++uid), c = colour(p);
    return '<svg viewBox="0 0 100 150" aria-hidden="true" focusable="false"><defs><clipPath id="' + id + '"><path d="M15 10 H85 L76 138 Q75 143 70 143 H30 Q25 143 24 138 Z"/></clipPath></defs>' +
      '<g clip-path="url(#' + id + ')"><g class="liq"><rect x="0" y="12" width="100" height="132" fill="' + c + '"/><rect x="0" y="12" width="100" height="22" fill="#fbf1d6" class="foam"/><circle cx="35" cy="80" r="2" fill="#fff" opacity=".3"/><circle cx="60" cy="100" r="2.6" fill="#fff" opacity=".28"/><circle cx="48" cy="60" r="1.6" fill="#fff" opacity=".3"/></g>' +
      '<rect x="24" y="10" width="6" height="132" fill="#fff" opacity=".12"/></g>' +
      '<path d="M12 6 H88 L78 140 Q77 147 70 147 H30 Q23 147 22 140 Z" fill="rgba(255,255,255,.14)" stroke="#2a1a10" stroke-width="2.6" stroke-linejoin="round"/><path d="M26 138 H74" stroke="#2a1a10" stroke-width="2" opacity=".5"/></svg>';
  }
  function lvlOf(p) { var b = p.flavour ? p.flavour.body : 3; return (0.56 + b * 0.07).toFixed(2); }
  function dials(f) {
    if (!f) return '<p class="note-s">Flavour guide to come from the shop.</p>';
    return '<div class="dials">' + [['Sweet', 'sweet'], ['Bitter', 'bitter'], ['Fruity', 'fruity'], ['Body', 'body']].map(function (d) {
      var n = f[d[1]], bar = ''; for (var i = 1; i <= 5; i++) bar += '<i' + (i <= n ? ' class="on"' : '') + '></i>';
      return '<div class="dial"><span>' + d[0] + '</span><span class="bar" role="img" aria-label="' + n + ' out of 5">' + bar + '</span></div>';
    }).join('') + '</div>';
  }

  /* ---- basket ---- */
  var MIN_ORDER = 35;
  function subtotal() { return cart.reduce(function (a, l) { var p = by(l.h); return a + (p ? price(p) * l.q : 0); }, 0); }
  function minOk() { return subtotal() >= MIN_ORDER; }
  function minNote() { var m = $('#min-msg'); if (!m) return; var s = subtotal(); m.textContent = (cart.length && s < MIN_ORDER) ? 'Minimum order is ' + money(MIN_ORDER) + '. Add ' + money(MIN_ORDER - s) + ' more to check out.' : 'Minimum order ' + money(MIN_ORDER) + '.'; }
  function ageOf(v) { if (!v) return -1; var d = new Date(v + 'T00:00:00'); if (isNaN(d)) return -1; var n = new Date(), a = n.getFullYear() - d.getFullYear(), m = n.getMonth() - d.getMonth(); if (m < 0 || (m === 0 && n.getDate() < d.getDate())) a--; return a; }
  function ageOk() { var d = $('#age-dob'), c = $('#age-ok'); return !!(d && c && c.checked && ageOf(d.value) >= 18); }
  function ageNote() { var d = $('#age-dob'), c = $('#age-ok'), m = $('#age-msg'); if (!m || !d || !c) return; var a = ageOf(d.value); m.textContent = (d.value && a < 18) ? 'You need to be 18 or over to order drinks.' : ((d.value && a >= 18 && !c.checked) ? 'Please tick the box to confirm.' : ''); var ck = $('#cart-ck'); if (ck) ck.disabled = !cart.length || !ageOk() || !minOk(); minNote(); }
  document.addEventListener('input', function (e) { if (e.target && (e.target.id === 'age-dob' || e.target.id === 'age-ok')) ageNote(); });

  var cart = []; try { cart = JSON.parse(ls('jo5_cart') || '[]'); } catch (e) { cart = []; }
  function saveCart() { ls('jo5_cart', JSON.stringify(cart)); renderCart(); }
  function count() { return cart.reduce(function (a, l) { return a + l.q; }, 0); }
  function add(h, q) { var l = cart.filter(function (x) { return x.h === h; })[0]; if (l) l.q += q; else cart.push({ h: h, q: q }); saveCart(); var p = by(h); toast((p ? p.title : 'Item') + ' added to your basket'); }
  function renderCart() {
    $$('[data-count]').forEach(function (n) { n.textContent = count(); });
    var b = $('#cart-body'); if (!b) return;
    var tot = 0;
    b.innerHTML = cart.length ? '<ul>' + cart.map(function (l) { var p = by(l.h); if (!p) return ''; tot += price(p) * l.q; return '<li style="display:flex;justify-content:space-between;gap:1rem;padding:.6rem 0;border-bottom:1px solid var(--line)"><span><b>' + esc(p.title) + '</b> × ' + l.q + '<br><button class="rm" data-rm="' + esc(l.h) + '" style="background:none;border:0;text-decoration:underline;min-height:2.75rem;padding:0">Remove</button></span><span class="price">' + money(price(p) * l.q) + '</span></li>'; }).join('') + '</ul><p class="price" style="margin-top:1rem;display:flex;justify-content:space-between"><span>Subtotal' + (cart.some(function (l) { var q = by(l.h); return q && q.sample; }) ? ' (sample prices)' : '') + '</span><span>' + money(tot) + '</span></p>' : '<p>Your basket is empty. Find something good on the shelf.</p>';
    var ck = $('#cart-ck'); if (ck) ck.disabled = !cart.length || !ageOk() || !minOk(); minNote();
  }
  on(document, 'click', function (e) {
    var rm = e.target.closest('[data-rm]'); if (rm) { cart = cart.filter(function (l) { return l.h !== rm.dataset.rm; }); saveCart(); }
    var a = e.target.closest('[data-add]'); if (a) add(a.dataset.add, +(a.dataset.q || 1));
    var oc = e.target.closest('[data-open-cart]'); if (oc) { e.preventDefault(); $('#cart').showModal(); }
    var cl = e.target.closest('[data-close]'); if (cl) { var d = cl.closest('dialog'); if (d) d.close(); }
  });
  var ckb = $('#cart-ck'); if (ckb) ckb.addEventListener('click', function () {
    var off = function () { $('#cart').close(); $('#demo-ck').showModal(); };
    if (cart.some(function (l) { var p = by(l.h); return !p || p.sample; })) { off(); return; } if (!ageOk()) { ageNote(); return; }
    ckb.disabled = true;
    fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lines: cart, dob: $('#age-dob').value, ageConfirmed: $('#age-ok').checked }) })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { ckb.disabled = !cart.length; if (j && j.ok && j.url) { location.href = j.url; } else { off(); } })
      .catch(function () { ckb.disabled = !cart.length; off(); });
  });
  $$('dialog[closedby="any"]').forEach(function (d) { if (!('closedBy' in HTMLDialogElement.prototype)) d.addEventListener('click', function (e) { if (e.target === d) { var r = d.getBoundingClientRect(); if (!(r.top <= e.clientY && e.clientY <= r.bottom && r.left <= e.clientX && e.clientX <= r.right)) d.close(); } }); });
  renderCart();

  /* ============ THE OPENING ============ */
  var stage = $('.stage');
  if (stage) {
    var arch = $('.arch'), copy = $('.hero-copy'), medal = $('.medal'), counter = $('.counter'), cue = $('.scrollcue'), vid = null, enter = $('.arch video.enter'), tag = $('.stage .img-tag'), note = $('.sleep-note');
    var h1 = $('.hero-copy h1'), chars = [];
    $$('.w', h1).forEach(function (w) { var t = w.textContent; w.textContent = ''; t.split('').forEach(function (c) { var s = document.createElement('span'); s.className = 'ch'; s.textContent = c; w.appendChild(s); chars.push(s); }); });
    h1.setAttribute('aria-label', h1.textContent.replace(/\s+/g, ' ').trim());
    var litUpTo = 0, done = false;
    function light(n) { for (var i = litUpTo; i < Math.min(n, chars.length); i++) chars[i].classList.add('lit'); litUpTo = Math.max(litUpTo, n); }
    if (reduced) { light(chars.length); if (medal) medal.classList.add('up'); if (vid) { vid.removeAttribute('autoplay'); vid.preload = 'metadata'; vid.pause(); vid.addEventListener('play', function () { vid.pause(); }); } }
    else {
      /* the beer in the glass writes the headline: letters light in step with the pour's progress */
      if (medal) setTimeout(function () { medal.classList.add('up'); }, 900);
      /* no video drives the headline now, so the letters light one after another */
      var li = 0, lt = setInterval(function () { light(++li * 2); if (litUpTo >= chars.length) clearInterval(lt); }, 70);
      var tick = function () {
        if (!vid || done) return;
        var d = vid.duration || 5, p = Math.min(1, vid.currentTime / (d * 0.82));
        light(Math.ceil(p * chars.length)); if (litUpTo >= chars.length) done = true; else requestAnimationFrame(tick);
      };
      if (vid) { vid.addEventListener('playing', function () { requestAnimationFrame(tick); }, { once: true }); var pr = vid.play(); if (pr && pr.catch) pr.catch(function () { light(chars.length); }); setTimeout(function () { if (!litUpTo) light(chars.length); }, 4500); }
      else light(chars.length);
    }
    /* the carry: scroll drives the arch from window to full bleed; the medallion lunges; the counter slides away */
    var mob = function () { return innerWidth <= 832; };
    var S = function () { return mob() ? { t: 49, r: 7, b: 21, l: 7 } : { t: 13, r: 6, b: 19, l: 57 }; };
    var lerp = function (a, b, t) { return a + (b - a) * t; }, ease = function (t) { return 1 - Math.pow(1 - t, 3); };
    var pt = 0, tgt = 0, raf = 0;
    function prog() { var r = stage.getBoundingClientRect(), max = stage.offsetHeight - innerHeight; return Math.min(1, Math.max(0, -r.top / max)); }
    function paint() {
      raf = 0; pt += (tgt - pt) * (reduced ? 1 : .18); if (Math.abs(tgt - pt) < .001) pt = tgt; else raf = requestAnimationFrame(paint);
      var e = ease(Math.min(1, pt / .7)), s = S();
      arch.style.setProperty('--t', lerp(s.t, 0, e) + '%'); arch.style.setProperty('--r', lerp(s.r, 0, e) + '%'); arch.style.setProperty('--b', lerp(s.b, 0, e) + '%'); arch.style.setProperty('--l', lerp(s.l, 0, e) + '%');
      arch.style.setProperty('--rad', lerp(10, 0, e) + 'px'); arch.style.setProperty('--rad2', lerp(10, 0, e) + 'px'); arch.style.setProperty('--open', Math.min(1, pt / .3));
      var f = Math.max(0, 1 - pt * 3);
      copy.style.opacity = f; copy.style.transform = 'translateY(' + (-pt * 60) + 'px)'; if (cue) cue.style.opacity = f; if (note) note.style.opacity = f; if (tag) tag.style.opacity = 1;
      counter.style.transform = 'translateY(' + (Math.max(0, pt - .55) / .45 * 105) + '%)';
      arch.style.setProperty('--pt', pt); var jk = $('.jack-charge'); if (jk) jk.style.backgroundPosition = (Math.round(Math.min(1, pt / .28) * 11) / 11 * 100) + '% 0'; if (enter && !reduced && pt > .02 && enter.paused) { var q2 = enter.play(); if (q2 && q2.catch) q2.catch(function () {}); }
      if (!medal) return;
      var run = Math.min(1, pt / .5), ex = innerWidth * (mob() ? .55 : .55) * ease(run);
      medal.style.translate = ex + 'px ' + (-Math.sin(run * Math.PI) * 8) + 'px'; medal.style.opacity = Math.max(0, 1 - Math.max(0, pt - .38) / .22);
    }
    function onScroll() { tgt = prog(); if (!raf) raf = requestAnimationFrame(paint); }
    on(window, 'scroll', onScroll, { passive: true }); on(window, 'resize', onScroll); onScroll();
    on(document, 'visibilitychange', function () { if (!vid || reduced) return; if (document.hidden) vid.pause(); else if (pt < .9) { var q = vid.play(); if (q && q.catch) q.catch(function () {}); } });
    /* "Come in": Jack lunges and the opening is carried away */
    var go = $('[data-come-in]');
    if (go) go.addEventListener('click', function (e) {
      e.preventDefault(); var target = $('#shelf'); if (!target) return;
      var y = target.getBoundingClientRect().top + scrollY - 4; scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
      setTimeout(function () { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }, reduced ? 0 : 900);
    });
  }

  /* ============ THE SHELF ============ */
  var area = $('.shelf-area');
  if (area) {
    var board = $('.board', area), status = $('#shelf-status'), sortEl = $('#sort'), rowsBox = $('#rows');
    var cur = 'beers', sortBy = 'featured';
    var counts = {}; P.forEach(function (p) { if (SHELVES[p.collection]) counts[p.collection] = (counts[p.collection] || 0) + 1; });
    if (rowsBox) {
      rowsBox.innerHTML = Object.keys(SHELVES).map(function (k, i) { return '<li><button class="row" type="button" data-shelf="' + k + '" aria-pressed="' + (k === cur) + '"><span class="no">0' + (i + 1) + '</span><span class="nm">' + SHELVES[k] + '</span><span class="ct">' + (counts[k] || 0) + (P.some(function (p) { return p.sample; }) ? ' samples' : ' drinks') + '</span><span class="ar" aria-hidden="true">→</span></button></li>'; }).join('');
    }
    var sorts = { featured: null, 'price-asc': function (a, b) { return price(a) - price(b); }, 'price-desc': function (a, b) { return price(b) - price(a); }, name: function (a, b) { return a.title.localeCompare(b.title); } };
    function render() {
      var items = P.filter(function (p) { return p.collection === cur; }); if (sorts[sortBy]) items = items.slice().sort(sorts[sortBy]);
      board.innerHTML = items.map(function (p) {
        return '<li class="item" data-h="' + esc(p.handle) + '" style="--lvl:' + lvlOf(p) + '"><button class="pick" type="button" data-pick="' + esc(p.handle) + '" aria-haspopup="dialog"><span class="glass" data-cursor-ok>' + glass(p) + '</span><span class="tag"><b>' + esc(p.title) + '</b><small>' + esc(p.descriptor) + '</small></span></button>' +
          '<div class="meta"><span class="price">' + money(price(p)) + (p.sample ? '<small>sample</small>' : '') + '</span><button class="btn sm" type="button" data-add="' + esc(p.handle) + '">Add<span class="vh"> ' + esc(p.title) + ' to basket</span></button></div></li>';
      }).join('');
      if (status) status.textContent = items.length + (items.length === 1 ? ' product' : ' products') + ' in ' + SHELVES[cur];
    }
    if (rowsBox) rowsBox.addEventListener('click', function (e) { var b = e.target.closest('[data-shelf]'); if (!b) return; cur = b.dataset.shelf; $$('[data-shelf]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); render(); if (innerWidth < 900) area.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); });
    if (sortEl) sortEl.addEventListener('change', function () { sortBy = sortEl.value; render(); });
    var q = new URLSearchParams(location.search).get('c'); if (q && SHELVES[q]) { cur = q; $$('[data-shelf]').forEach(function (x) { x.setAttribute('aria-pressed', x.dataset.shelf === cur); }); }
    render();

    /* pouring: hover, focus, tap. The glass fills in the beer's own colour. */
    function itemOf(el) { return el && el.closest && el.closest('.item'); }
    var poured = null;
    function pour(it, on) { if (!it) return; it.classList.toggle('pouring', on); }
    area.addEventListener('focusin', function (e) { var it = itemOf(e.target); if (it && e.target.matches(':focus-visible')) pour(it, true); });
    area.addEventListener('focusout', function (e) { pour(itemOf(e.target), false); });

    /* label panel */
    var dlg = $('#label');
    function open(h) {
      var p = by(h); if (!p || !dlg) return;
      $('#label-body').innerHTML = photo(p, 'lbl-photo') + '<div style="display:grid;grid-template-columns:auto 1fr;gap:1.2rem;align-items:center"><div class="glass" style="--now:' + lvlOf(p) + ';width:5.5rem" aria-hidden="true">' + glass(p) + '</div><div><p class="mono">' + esc(SHELVES[p.collection]) + ' · ' + esc(p.productType) + (p.sample ? ' · sample' : '') + '</p><h2 id="label-t">' + esc(p.title) + '</h2></div></div>' +
        '<p class="lede" style="font-size:1.15rem">' + esc(p.descriptor) + ' ' + esc(p.blurb || '') + '</p><h3 class="vh">Flavour</h3>' + dials(p.flavour) +
        '<dl class="dl"><div><dt>Goes well with</dt><dd>' + (p.pairings && p.pairings.length ? p.pairings.map(esc).join(', ') : '<span class="tbc">to be supplied</span>') + '</dd></div><div><dt>ABV</dt><dd><span class="tbc">to be confirmed</span></dd></div><div><dt>Allergens</dt><dd><span class="tbc">to be verified from the label</span></dd></div></dl>' +
        '<div class="row-act"><span class="price" style="font-size:1.5rem">' + money(price(p)) + (p.sample ? '<small>sample price</small>' : '') + '</span><button class="btn" type="button" data-add="' + esc(p.handle) + '">Add to basket</button><a class="btn ghost" href="/product?h=' + encodeURIComponent(p.handle) + '">Open full page</a></div><p class="note-s">Please drink responsibly. 18+ only.</p>';
      dlg.showModal(); var s = $('.liq', dlg); if (s) { s.style.transform = 'scaleY(.14)'; requestAnimationFrame(function () { requestAnimationFrame(function () { s.style.transform = 'scaleY(' + lvlOf(p) + ')'; }); }); }
    }
    area.addEventListener('click', function (e) {
      var b = e.target.closest('[data-pick]'); if (!b) return; var it = itemOf(b);
      if (e.pointerType === 'touch' || !fine) { tapPour(it, function () { open(b.dataset.pick); }); } else open(b.dataset.pick);
    });
    function tapPour(it, then) {
      if (reduced) { pour(it, true); setTimeout(function () { pour(it, false); }, 400); then(); return; }
      var g = $('.glass', it).getBoundingClientRect(), c = document.createElement('div'); c.className = 'cur tapbottle'; c.setAttribute('aria-hidden', 'true');
      c.style.setProperty('--x', (g.left + g.width * .45) + 'px'); c.style.setProperty('--y', (g.top - 10) + 'px'); c.innerHTML = '<img src="/media/bottle-amber.webp" alt="" width="225" height="720">'; document.body.appendChild(c);
      pour(it, true); setTimeout(function () { c.remove(); then(); setTimeout(function () { pour(it, false); }, 300); }, 950);
    }

    /* the weighted bottle cursor: shelf only, mouse only, never over text or controls */
    if (fine && !reduced) {
      var bot = document.createElement('div'); bot.className = 'cur'; bot.setAttribute('aria-hidden', 'true'); bot.innerHTML = '<img src="/media/bottle-amber.webp" alt="" width="225" height="720" draggable="false">'; document.body.appendChild(bot); offs.push(function () { bot.remove(); });
      var px = 0, py = 0, bx = 0, by_ = 0, rot = 0, vx = 0, want = false, rafc = 0, pose = null, inside = false, W = 54;
      var BAD = 'h1,h2,h3,h4,p,small,b,label,a,button,input,select,summary,.tag,.meta,.rows,.shelf-bar,.hint,.sample-chip,dialog';
      function ok(t) { return !!(t && t.closest && t.closest('[data-cursor-ok]') && !t.closest('.tag,.meta,.shelf-bar,.rows')); }
      function loop() {
        rafc = 0; var tx = px, ty = py, tr = Math.max(-18, Math.min(18, vx * .6)) - 12;
        if (pose) { tx = pose.x; ty = pose.y; tr = -100; }
        bx += (tx - bx) * .14; by_ += (ty - by_) * .14; rot += (tr - rot) * .12; vx *= .9;
        bot.style.transform = 'translate(' + (bx - W / 2) + 'px,' + (by_ - 20) + 'px) rotate(' + rot + 'deg)';
        if (inside || Math.abs(tx - bx) > .3 || Math.abs(tr - rot) > .3) rafc = requestAnimationFrame(loop);
      }
      area.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return; vx = e.clientX - px; px = e.clientX; py = e.clientY; inside = true;
        var good = ok(e.target); bot.classList.toggle('on', good); area.classList.toggle('cursor-on', good);
        var it = good ? itemOf(e.target) : null;
        if (it !== poured) { if (poured) pour(poured, false); poured = it; if (it) pour(it, true); }
        if (it) { var g = $('.glass', it).getBoundingClientRect(); pose = { x: g.right + 6, y: g.top + 10 }; } else pose = null;
        if (!rafc) rafc = requestAnimationFrame(loop);
      });
      area.addEventListener('pointerleave', function () { inside = false; bot.classList.remove('on'); area.classList.remove('cursor-on'); if (poured) { pour(poured, false); poured = null; } pose = null; });
      area.addEventListener('pointerdown', function () { bot.classList.remove('on'); });
    } else if (fine) {
      /* reduced motion: no bottle; the glass simply fills while hovered */
      area.addEventListener('pointerover', function (e) { var it = itemOf(e.target); if (it) pour(it, true); });
      area.addEventListener('pointerout', function (e) { pour(itemOf(e.target), false); });
    }
  }

  /* ============ DELI STUBS ============ */
  var stubs = $$('.stub');
  if (stubs.length) {
    var ph = $('#deli-photo');
    function sel(b) { stubs.forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); ph.innerHTML = '<span><b>' + esc(b.dataset.n) + '</b>Photo coming soon<br>' + esc(b.dataset.d) + '</span>'; }
    stubs.forEach(function (b) { b.addEventListener('click', function () { sel(b); }); if (fine) b.addEventListener('pointerenter', function () { sel(b); }); b.addEventListener('focus', function () { sel(b); }); });
    sel(stubs[0]);
  }

  /* ============ PRODUCT PAGE ============ */
  var pdp = $('#pdp');
  if (pdp) {
    var h = new URLSearchParams(location.search).get('h'), p = by(h) || P[0], qn = 1;
    document.title = p.title + ' | Jack O’Beers';
    pdp.innerHTML = '<div class="pdp-l">' + photo(p, 'pdp-photo') + '<div class="glass" style="--now:' + lvlOf(p) + '" aria-hidden="true">' + glass(p) + '</div></div><div style="display:grid;gap:1.1rem"><p class="mono">' + esc(SHELVES[p.collection]) + ' · ' + esc(p.productType) + (p.sample ? ' · sample product' : '') + '</p><h1 class="h2">' + esc(p.title) + '</h1><p class="lede">' + esc(p.descriptor) + ' ' + esc(p.blurb || '') + '</p>' + dials(p.flavour) +
      '<dl class="dl"><div><dt>Goes well with</dt><dd>' + (p.pairings || []).map(esc).join(', ') + '</dd></div><div><dt>ABV</dt><dd><span class="tbc">to be confirmed</span></dd></div><div><dt>Allergens</dt><dd><span class="tbc">to be verified from the label</span></dd></div></dl>' +
      '<div class="row-act"><span class="price" style="font-size:1.6rem">' + money(price(p)) + (p.sample ? '<small>sample price</small>' : '') + '</span><div class="qty" role="group" aria-label="Quantity"><button type="button" id="qm" aria-label="Fewer">−</button><output id="qo" aria-live="polite">1</output><button type="button" id="qp" aria-label="More">+</button></div><button class="btn" id="addq" type="button">Add to basket</button></div><p class="note-s">Please drink responsibly. 18+ only.</p><p><a class="btn ghost on-cream" href="/?c=' + esc(p.collection) + '#shelf" style="color:var(--ink)">← Back to the shelf</a></p></div>';
    $('#qm').addEventListener('click', function () { qn = Math.max(1, qn - 1); $('#qo').textContent = qn; });
    $('#qp').addEventListener('click', function () { qn = Math.min(24, qn + 1); $('#qo').textContent = qn; });
    $('#addq').addEventListener('click', function () { add(p.handle, qn); });
  }

  /* placeholder links */
  $$('[data-placeholder]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); toast('That link is still to be added.'); }); });
  var nl = $('#nl'); if (nl) nl.addEventListener('submit', function (e) { e.preventDefault(); var s = $('#nl-s'); if (!nl.email.checkValidity() || !nl.email.value) { s.textContent = 'Please enter a valid email address.'; return; } if (!nl.consent.checked) { s.textContent = 'Please tick the box so we know you are happy to hear from us.'; return; } s.textContent = 'Thank you. (Demonstration only: nothing was sent.)'; nl.reset(); });
  return function () { offs.forEach(function (f) { f(); }); };
}
