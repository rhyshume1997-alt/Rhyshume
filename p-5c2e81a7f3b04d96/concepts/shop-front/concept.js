/* Jack O'Beers & Deli: concept "The Shop Front". Vanilla JS, no network. */
(function () {
  "use strict";

  var reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduced = function () { return reduceQuery.matches; };

  /* ---------- SAMPLE PRODUCTS (demonstration data, copied from the shared sample file) ---------- */
  var PRODUCTS = [
    { id: "demo-amber-ale", title: "Demo Amber Ale", col: "beers", glyph: "bottle", c: "#C77A1E", c2: "#C93A1F", bg: "#FFEFB0",
      desc: "Malty and rounded, easy to share.", hint: "Toasty malt, gentle bitter finish", price: 3.8, from: true,
      flav: "Sweet 2, bitter 3, fruity 2, body 3 (out of 5)", pair: "Demo cheddar, demo pork pie" },
    { id: "demo-dark-stout", title: "Demo Dark Stout", col: "beers", glyph: "bottle", c: "#4A2A12", c2: "#FFD95A", bg: "#CDEBE6",
      desc: "Dark, roasty and smooth.", hint: "Roasted coffee and cocoa, full body", price: 4.2, from: true,
      flav: "Sweet 2, bitter 4, fruity 1, body 5 (out of 5)", pair: "Demo smoked cheese, demo chocolate" },
    { id: "demo-pale-lager", title: "Demo Pale Lager", col: "beers", glyph: "bottle", c: "#E0A233", c2: "#0F7070", bg: "#FBE0D6",
      desc: "Crisp, light and clean.", hint: "Crisp and dry, light body", price: 3.5, from: true,
      flav: "Sweet 1, bitter 2, fruity 1, body 1 (out of 5)", pair: "Demo oatcakes, demo cheddar" },
    { id: "demo-dry-cider", title: "Demo Dry Cider", col: "ciders", glyph: "cider", c: "#6FA84A", c2: "#FFF6DD", bg: "#FFEFB0",
      desc: "Sharp, clean and apple-led.", hint: "Dry and sharp, apple first", price: 3.9, from: true,
      flav: "Sweet 1, bitter 4, fruity 2, body 2 (out of 5)", pair: "Demo pork pie, demo chutney" },
    { id: "demo-berry-cider", title: "Demo Berry Cider", col: "ciders", glyph: "cider", c: "#A8324F", c2: "#FFD95A", bg: "#FBE0D6",
      desc: "Sweet berries over crisp apple.", hint: "Sweet and fruity, best over ice", price: 4.1, from: true,
      flav: "Sweet 4, bitter 1, fruity 5, body 2 (out of 5)", pair: "Demo shortbread, demo soft cheese" },
    { id: "demo-red-wine", title: "Demo Red", col: "wines", glyph: "wine", c: "#7A1F3D", c2: "#FFD95A", bg: "#CDEBE6",
      desc: "Soft and rounded.", hint: "Ripe red fruit, gentle tannins", price: 11, from: true,
      flav: "Sweet 1, bitter 3, fruity 3, body 4 (out of 5)", pair: "Demo cured meat, demo hard cheese" },
    { id: "demo-keg-amber-20l", title: "Demo Amber Ale, keg", col: "kegs", glyph: "keg", c: "#0F7070", c2: "#FFD95A", bg: "#FFEFB0",
      desc: "For parties and pubs at home.", hint: "Same amber ale, by the keg", price: 72, from: true,
      flav: "Sweet 2, bitter 3, fruity 2, body 3 (out of 5)", pair: "To be confirmed", extra: "Size and deposit: to be confirmed." },
    { id: "demo-hamper-beer", title: "Demo Beer Hamper", col: "hampers", glyph: "hamper", c: "#E0A85F", c2: "#C93A1F", bg: "#FBE0D6",
      desc: "A selection of beers with something to eat.", hint: "Contents to be agreed", price: 34, from: true,
      flav: "To be confirmed", pair: "To be confirmed", extra: "Hamper contents: to be agreed." }
  ];
  var LABELS = { all: "all", beers: "beer", ciders: "cider", wines: "wine", kegs: "keg", hampers: "hamper" };

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function money(n) { return "£" + n.toFixed(2); }

  /* ---------- build the shelf ---------- */
  var list = $("#products");
  var glyphSizes = { bottle: [40, 100], cider: [40, 100], wine: [36, 112], keg: [90, 100], hamper: [120, 100] };
  PRODUCTS.forEach(function (p) {
    var sym = p.glyph === "cider" ? "bottle" : p.glyph;
    var gs = glyphSizes[p.glyph];
    var li = document.createElement("li");
    li.className = "product";
    li.dataset.col = p.col;
    li.innerHTML =
      '<article class="card">' +
        '<div class="card-art" style="--bg:' + p.bg + '">' +
          '<span class="badge">Sample</span>' +
          '<svg viewBox="0 0 ' + gs[0] + " " + gs[1] + '" aria-hidden="true" focusable="false">' +
            '<use href="#g-' + sym + '" style="--c:' + p.c + ";--c2:" + p.c2 + '" width="' + gs[0] + '" height="' + gs[1] + '"/>' +
            (p.glyph === "cider" ? '<use href="#g-apple" x="8" y="62" width="24" height="24"/>' : "") +
          "</svg>" +
        "</div>" +
        "<h3>" + p.title + "</h3>" +
        '<p class="desc">' + p.desc + "</p>" +
        '<p class="flav">Flavour: ' + p.hint + "</p>" +
        '<p class="price-row"><span class="price"><small>from</small> ' + money(p.price) + ' <small>Sample price</small></span></p>' +
        "<details><summary>Flavour, pairings, allergens</summary>" +
          "<p><strong>Flavour:</strong> " + p.flav + "</p>" +
          "<p><strong>Pairs with:</strong> " + p.pair + "</p>" +
          "<p><strong>Strength (ABV):</strong> to be confirmed</p>" +
          "<p><strong>Allergens:</strong> to be confirmed</p>" +
          (p.extra ? "<p>" + p.extra + "</p>" : "") +
        "</details>" +
        '<button type="button" class="add" data-id="' + p.id + '" aria-label="Add ' + p.title + ' to basket (sample)">Add to basket</button>' +
      "</article>";
    list.appendChild(li);
  });

  /* ---------- filters ---------- */
  var chips = $$(".chip");
  var note = $("#filter-note");
  function setFilter(f) {
    if (!LABELS[f]) f = "all";
    var n = 0;
    $$(".product").forEach(function (li) {
      var show = f === "all" || li.dataset.col === f;
      li.hidden = !show;
      if (show) n++;
    });
    chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c.dataset.filter === f)); });
    note.textContent = f === "all"
      ? "Showing all " + n + " sample products."
      : "Showing " + n + " sample " + LABELS[f] + (n === 1 ? " product." : " products.");
  }
  chips.forEach(function (c) { c.addEventListener("click", function () { setFilter(c.dataset.filter); }); });

  /* ---------- basket (demonstration only) ---------- */
  var basket = {};
  var bBtn = $("#basket-btn"), bPanel = $("#basket-panel"), bCount = $("#basket-count");
  var bList = $("#basket-list"), bEmpty = $("#basket-empty"), bClear = $("#basket-clear"), live = $("#live");
  function totalItems() { return Object.keys(basket).reduce(function (a, k) { return a + basket[k]; }, 0); }
  function title(id) { return PRODUCTS.filter(function (p) { return p.id === id; })[0].title; }
  function renderBasket() {
    var t = totalItems();
    bCount.firstChild.nodeValue = String(t);
    bList.innerHTML = "";
    Object.keys(basket).forEach(function (id) {
      var li = document.createElement("li");
      var a = document.createElement("span"); a.textContent = title(id) + " (sample)";
      var b = document.createElement("strong"); b.textContent = "× " + basket[id];
      li.appendChild(a); li.appendChild(b); bList.appendChild(li);
    });
    bEmpty.hidden = t > 0;
    bClear.hidden = t === 0;
  }
  function bump() {
    if (reduced()) return;
    bCount.classList.remove("bump"); void bCount.offsetWidth; bCount.classList.add("bump");
  }
  list.addEventListener("click", function (e) {
    var btn = e.target.closest(".add");
    if (!btn) return;
    var id = btn.dataset.id;
    basket[id] = (basket[id] || 0) + 1;
    renderBasket(); bump();
    if (!reduced()) { btn.classList.remove("added"); void btn.offsetWidth; btn.classList.add("added"); }
    var t = totalItems();
    live.textContent = "Added " + title(id) + ". Basket has " + t + (t === 1 ? " item." : " items.");
  });
  function toggleBasket(open) {
    bPanel.hidden = !open;
    bBtn.setAttribute("aria-expanded", String(open));
  }
  bBtn.addEventListener("click", function (e) { e.stopPropagation(); toggleBasket(bPanel.hidden); });
  $("#basket-close").addEventListener("click", function () { toggleBasket(false); bBtn.focus(); });
  bClear.addEventListener("click", function () { basket = {}; renderBasket(); live.textContent = "Basket emptied."; });
  bPanel.addEventListener("click", function (e) { e.stopPropagation(); });

  /* ---------- navigation ---------- */
  var nav = $("#nav"), menuBtn = $("#menu-btn"), shopBtn = $("#shop-toggle");
  var mobileMQ = window.matchMedia("(max-width: 960px)");
  function setShop(open) { shopBtn.setAttribute("aria-expanded", String(open)); }
  function setMenu(open) {
    nav.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    if (open && mobileMQ.matches) setShop(true);
    if (!open && mobileMQ.matches) setShop(false);
  }
  menuBtn.addEventListener("click", function (e) { e.stopPropagation(); setMenu(!nav.classList.contains("open")); });
  shopBtn.addEventListener("click", function (e) { e.stopPropagation(); setShop(shopBtn.getAttribute("aria-expanded") !== "true"); });
  document.addEventListener("click", function () {
    toggleBasket(false);
    if (!mobileMQ.matches) setShop(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!bPanel.hidden) { toggleBasket(false); bBtn.focus(); return; }
    if (shopBtn.getAttribute("aria-expanded") === "true" && !mobileMQ.matches) { setShop(false); shopBtn.focus(); return; }
    if (nav.classList.contains("open")) { setMenu(false); menuBtn.focus(); }
  });
  nav.addEventListener("click", function (e) { if (e.target.closest("a") && mobileMQ.matches) setMenu(false); });
  mobileMQ.addEventListener("change", function () { nav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); setShop(false); });

  /* ---------- the shop sign: real hours, Europe/London ---------- */
  var OPEN_H = 11, CLOSE_H = 19;
  var DAYNAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" });
  var WK = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  function londonNow() {
    var override = new URLSearchParams(location.search).get("at"); /* demo helper: ?at=2026-11-25T12:00:00Z */
    var d = override ? new Date(override) : new Date();
    if (isNaN(d.getTime())) d = new Date();
    var o = {};
    fmt.formatToParts(d).forEach(function (p) { o[p.type] = p.value; });
    return { day: WK[o.weekday.slice(0, 3)], mins: (+o.hour) * 60 + (+o.minute) };
  }
  /* Tuesday is "to be confirmed", so the shop is treated as closed on Tuesday. */
  function isOpenDay(d) { return d !== 2; }
  function nextOpening(day, mins) {
    if (isOpenDay(day) && mins < OPEN_H * 60) return "Opens today at 11am.";
    return (day + 1) % 7 === 2 ? "Opens Wednesday at 11am." : "Opens tomorrow at 11am.";
  }
  var sign = $("#sign"), signSub = $("#sign-sub"), statusEl = $("#shop-status"), statusText = $("#status-text");
  var lastText = "", firstPaint = true;
  function updateSign() {
    var n = londonNow();
    var open = isOpenDay(n.day) && n.mins >= OPEN_H * 60 && n.mins < CLOSE_H * 60;
    var text;
    if (open) {
      var left = CLOSE_H * 60 - n.mins;
      text = left <= 60 ? "We're open. Closing soon, at 7pm." : "We're open! Come on in. We close at 7pm.";
    } else if (n.day === 2) {
      text = "Sorry, we're closed today. Tuesday to be confirmed. Opens Wednesday at 11am.";
    } else {
      text = "Sorry, we're closed right now. " + nextOpening(n.day, n.mins);
      if (n.day === 1 && n.mins >= CLOSE_H * 60) text += " Tuesday to be confirmed.";
    }
    if (firstPaint) sign.classList.add("no-anim");
    sign.dataset.state = open ? "open" : "closed";
    statusEl.dataset.state = open ? "open" : "closed";
    signSub.hidden = !(n.day === 2);
    if (text !== lastText) { statusText.textContent = text; lastText = text; }
    if (firstPaint) { void sign.offsetWidth; sign.classList.remove("no-anim"); firstPaint = false; }
    $$("#hours li").forEach(function (li) { li.classList.toggle("today", +li.dataset.day === n.day); });
  }
  updateSign();
  setInterval(updateSign, 30000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) updateSign(); });

  /* ---------- the door ---------- */
  var door = $("#door"), letIn = $("#let-in"), shelves = $("#shelves"), hint = $("#door-hint");
  var isOpen = false;
  function openDoor(opts) {
    opts = opts || {};
    if (!isOpen) {
      isOpen = true;
      shelves.removeAttribute("data-closed");
      if (!reduced() && !opts.instant) { shelves.classList.add("reveal"); }
      door.setAttribute("aria-expanded", "true");
      letIn.setAttribute("aria-expanded", "true");
      door.setAttribute("aria-label", "The door is open. Go to the shelves");
      letIn.textContent = "Go to the shelves";
      hint.textContent = "Come in, have a look around. The shelves are just below.";
      live.textContent = "The door is open. The shop shelves are now showing below.";
    }
  }
  function goTo(el, focus) {
    if (!el) return;
    var smooth = !reduced();
    el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    if (focus) { try { el.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
  }
  function doorPress() {
    var firstTime = !isOpen;
    openDoor();
    goTo($("#ranges"), false);
    try { $("#ranges-title").focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    if (!firstTime) return;
  }
  door.addEventListener("click", doorPress);
  letIn.addEventListener("click", doorPress);

  /* Links that point inside the shop open the door first, instantly. */
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[href^='#']");
    if (!a || a.getAttribute("href") === "#") return;
    var id = a.getAttribute("href").slice(1);
    var target = document.getElementById(id);
    if (!target || !shelves.contains(target)) return;
    e.preventDefault();
    openDoor({ instant: true });
    if (a.dataset.filter) setFilter(a.dataset.filter);
    if (history.replaceState) history.replaceState(null, "", "#" + id);
    goTo(target, false);
  });
  $$("a[href='#']").forEach(function (a) { a.addEventListener("click", function (e) { e.preventDefault(); }); });

  if (location.hash.length > 1) {
    var t = document.getElementById(location.hash.slice(1));
    if (t && shelves.contains(t)) { openDoor({ instant: true }); }
  }

  /* ---------- newsletter (demonstration only) ---------- */
  var form = $("#news-form"), email = $("#news-email"), msg = $("#news-msg");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = email.value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) {
      msg.className = "form-msg error";
      msg.textContent = "That doesn't look like an email address yet. Could you check it?";
      email.setAttribute("aria-invalid", "true");
      email.focus();
      return;
    }
    email.removeAttribute("aria-invalid");
    msg.className = "form-msg";
    msg.textContent = "Thank you! This is only a demonstration, so nothing was sent or saved.";
    form.reset();
  });

  renderBasket();
  setFilter("all");
})();
