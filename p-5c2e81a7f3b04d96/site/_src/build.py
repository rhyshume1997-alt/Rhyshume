#!/usr/bin/env python3
"""Generates every page of the Jack O'Beers site from one shared layout.  Run:  python3 _src/build.py
Edit copy here (or in the page functions below), re-run, commit the generated .html files.
Placeholders look like [to be confirmed] and render as small tags so nothing unverified reads as fact."""
import html, os, re, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
E = html.escape
TITLE = "Jack O’Beers"

def tbc(t):
    return f'<span class="tbc">{E(t)}</span>'

COLLECTIONS = [
    ("beers", "Beers", "Crisp lagers to dark stouts, all British"),
    ("ciders", "Ciders", "Dry through to fruity"),
    ("wines", "Wines", "To go with the deli counter"),
    ("kegs", "Kegs", "For parties and pubs at home"),
    ("hampers", "Hampers", "Drinks and deli, ready to give"),
]

NAV = [  # (label, href, key)
    ("Shop", None, "shop"),
    ("Deli menu", "deli.html", "deli"),
    ("Click &amp; collect", "click-and-collect.html", "collect"),
    ("Shipping", "shipping.html", "shipping"),
    ("About", "about.html", "about"),
    ("Newsletter", "newsletter.html", "newsletter"),
    ("Members", "members.html", "members"),
]

def header(key):
    items = []
    for label, href, k in NAV:
        cur = ' aria-current="page"' if k == key else ""
        if href is None:
            links = "".join(f'<a href="{h}.html"><b>{t}</b><small>{d}</small></a>' for h, t, d in COLLECTIONS)
            items.append(
                f'<li><button class="tab" type="button" data-mega aria-expanded="false" aria-controls="mega-shop"{cur}>{label}'
                f'<svg class="chev" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>'
                f'<div class="mega" id="mega-shop" hidden>{links}<a class="all" href="shop.html"><b>See the whole shop</b><small>Every shelf in one place</small></a></div></li>')
        else:
            items.append(f'<li><a class="tab" href="{href}"{cur}>{label}</a></li>')
    return f'''<header class="hdr"><div class="wrap hdr-in">
<a class="brand" href="index.html" aria-label="Jack O&rsquo;Beers, home"><img src="assets/media/jack-logo.png" alt="" width="46" height="46"><span>Jack <span>O&rsquo;</span>Beers</span></a>
<nav aria-label="Main"><ul class="tabs" id="tabs">{"".join(items)}</ul></nav>
<a class="cartbtn" href="cart.html" data-open-cart data-cart-label aria-label="Basket, 0 items"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12l-1 13H7L6 7zm3-1a3 3 0 016 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg><span class="lbl">Basket</span> <span class="n" data-cart-count>0</span></a>
<button class="menubtn" type="button" id="menubtn" aria-expanded="false" aria-controls="tabs"><span>Menu</span></button>
</div></header>'''

def footer():
    cols = "".join(f'<li><a href="{h}.html">{t}</a></li>' for h, t, d in COLLECTIONS)
    return f'''<footer class="foot"><div class="wrap">
<div class="foot-cols">
<div><h2>Jack O&rsquo;Beers</h2><p>The best of British beer, cider and wine, plus a deli counter to match.</p><p style="margin-top:.7rem">{tbc("Address to be confirmed")}<br>{tbc("Opening hours to be confirmed")}<br>{tbc("Phone to be confirmed")}</p></div>
<div><h2>Shop</h2><ul>{cols}<li><a href="deli.html">Deli menu</a></li></ul></div>
<div><h2>Help</h2><ul><li><a href="click-and-collect.html">Click &amp; collect</a></li><li><a href="shipping.html">Shipping</a></li><li><a href="returns.html">Delivery &amp; returns</a></li><li><a href="members.html">Members</a></li><li><a href="about.html">About us</a></li></ul></div>
<div><h2>Stay in touch</h2>
<form class="form" data-newsletter novalidate><div class="field"><label for="fn-email">Email</label><input id="fn-email" name="email" type="email" autocomplete="email" required></div>
<label class="check"><input type="checkbox" name="consent"><span>Yes, send me news and offers. I can unsubscribe at any time.</span></label>
<button class="btn sm" type="submit">Join the list</button><p data-status role="status"></p></form></div>
</div>
<div class="fine"><p><b>Please drink responsibly. You must be 18 or over to buy alcohol.</b> <a href="age-policy.html">Age policy</a> · <a href="privacy.html">Privacy</a> · <a href="terms.html">Terms</a> · <a href="returns.html">Delivery &amp; returns</a></p>
<p>Private design preview of a proposed site by Rhys Hume. Not live. Products, prices and details are sample data until the shop supplies the real ones.</p></div>
</div></footer>'''

def drawer():
    return '''<div class="scrim" id="scrim"></div>
<aside class="drawer" id="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-t" aria-hidden="true">
<div class="drawer-h"><h2 id="drawer-t">Your basket</h2><button class="x" type="button" data-close-cart aria-label="Close basket">&times;</button></div>
<ul class="drawer-b" id="cart-lines" style="list-style:none;margin:0"></ul>
<div class="drawer-f"><div class="tot"><span>Subtotal</span><span id="cart-total">&pound;0.00</span></div>
<p class="note-s">Delivery or click &amp; collect, and any tax, are set on the next step.<span data-live-only> You pay securely on Shopify.</span></p>
<button class="btn" type="button" id="drawer-checkout" data-checkout disabled>Checkout</button>
<a class="btn ghost" href="cart.html" style="color:var(--ink)">View basket &amp; choose delivery or collection</a></div></aside>
<dialog id="demo-checkout" aria-labelledby="dc-t"><div class="dlg"><h2 id="dc-t">Checkout is not connected yet</h2>
<p>This is a design preview, so nothing is charged. When the shop&rsquo;s Shopify store is connected, this button takes you to Shopify&rsquo;s secure checkout, where you pay with the methods the shop turns on (for example card, Apple Pay, Google Pay or PayPal).</p>
<p class="note-s">Click &amp; collect orders pay the same way. Whether paying in the shop on collection is allowed is a decision for the shop.</p>
<div class="row"><button class="btn" type="button" data-close-dialog>Got it</button></div></div></dialog>
<dialog id="agegate" class="agegate" aria-labelledby="ag-t"><div class="dlg"><p class="mono">Welcome</p><h2 id="ag-t">Are you 18 or over?</h2>
<p class="lede">We sell alcohol, so we ask everyone to confirm their age before looking around. We may ask for ID on delivery or collection.</p>
<div class="row"><button class="btn" type="button" id="age-yes">Yes, I&rsquo;m 18 or over</button><button class="btn ghost" type="button" id="age-no">No</button></div>
<p class="note-s" style="color:#cbb98f">This is a simple confirmation, not an age check. How age is verified is for the shop to decide.</p></div></dialog>
<div class="toast" id="toast" role="status" aria-live="polite"></div>'''

def page(slug, title, desc, body, key="", cls="", extra_attrs="", motion=False, dpage=None, hero_head=""):
    scripts = ['assets/js/config.js', 'data/products.js', 'assets/js/store.js']
    if motion:
        scripts += ['assets/js/gsap.min.js', 'assets/js/ScrollTrigger.min.js']
    scripts += ['assets/js/ui.js', 'assets/js/shop.js']
    scripts += ['assets/js/motion.js']
    if cls == 'drain-page':
        scripts += ['assets/js/beer.js', 'assets/js/pint.js']
    sc = "\n".join(f'<script src="{s}" defer></script>' for s in scripts)
    full_title = f"{title} | {TITLE}" if title != TITLE else TITLE
    out = f'''<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex,nofollow,noarchive">
<meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#1d0f0a">
<title>{E(full_title)}</title>
<meta name="description" content="{E(desc)}">
<link rel="icon" href="assets/media/jack-logo.png">
<link rel="preload" href="assets/fonts/source-sans-3-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/newsreader-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/css/site.css">
</head>
<body class="{cls}" data-page="{dpage or key or slug}" {extra_attrs}>
<a class="skip" href="#main">Skip to the content</a>
<div class="demo-bar" role="region" aria-label="Preview notice">Private design preview. Sample products and prices. <span data-demo-only>Checkout is not connected.</span></div>
{header(key)}
{hero_head}<main id="main" tabindex="-1">
{body}
</main>
{footer()}
{drawer()}
{sc}
</body>
</html>
'''
    with open(os.path.join(ROOT, slug + ".html"), "w", encoding="utf-8") as f:
        f.write(out)

def head(h1, lede, crumb=None, eyebrow=""):
    c = f'<div class="crumbs"><a href="index.html">Home</a> / <span>{crumb}</span></div>' if crumb else ""
    ey = f'<p class="mono">{eyebrow}</p>' if eyebrow else ""
    return f'<div class="wrap page-head">{c}{ey}<h1>{h1}</h1><p class="lede">{lede}</p></div>'

def tiles(items, cream=False):
    c = " cream" if cream else ""
    return '<div class="grid g3">' + "".join(f'<a class="tile{c} rv" href="{h}"><h3>{t}</h3><p>{d}</p><span class="go">Take a look &rarr;</span></a>' for h, t, d in items) + '</div>'

# ---------------- pages ----------------
def home():
    hero = '''<section class="hero" aria-labelledby="h1">
<video muted loop playsinline preload="metadata" poster="assets/media/pour-poster.webp" autoplay aria-hidden="true"><source src="assets/media/pour.webm" type="video/webm"><source src="assets/media/pour.mp4" type="video/mp4"></video>
<div class="wrap hero-in">
<div class="sign" role="img" aria-label="Jack O&rsquo;Beers &amp; Deli logo"><img src="assets/media/jack-logo.png" alt="" width="160" height="160"></div>
<p class="mono">British beer, cider, wine &amp; deli</p>
<h1 id="h1" data-lit>Something good on the shelves</h1>
<p class="lede">Come in, have a look around, and take something good home. The best of British drinks, with a deli counter to match.</p>
<div class="btns"><a class="btn" href="shop.html">Explore the shop</a><a class="btn ghost" href="deli.html">Discover the deli</a></div>
</div>
<p class="tempnote">Temporary footage: AI-generated reference, not the shop. Real film goes here.</p>
</section><div class="counter-lip" aria-hidden="true"></div>'''
    body = f'''
<section class="sec"><div class="wrap">
<div class="sec-head"><p class="mono">Browse the shelves</p><h2>Find your way in two clicks</h2><p class="lede">Beers, ciders, wines, kegs and hampers. Pick a shelf and you are looking at the bottles.</p></div>
{tiles([(f"{h}.html", t, d) for h, t, d in COLLECTIONS])}
</div></section>
<section class="sec alt"><div class="wrap"><div class="sec-head"><p class="mono">On the shelf now</p><h2>A few to start with</h2><p class="lede">Sample products shown here so you can see how it will look. The real range will come from the shop.</p></div>
<ul class="cards" id="featured" style="list-style:none" aria-label="Featured products"></ul>
<p style="margin-top:1.4rem"><a class="btn dk" href="beers.html">See all the beers</a></p></div></section>
<section class="sec dark"><div class="wrap">
<div class="sec-head"><p class="mono">However you like to shop</p><h2>Collect it, or we send it</h2><p class="lede">Order online and pick it up from the shop, or have it delivered. Either way you pay once, securely.</p></div>
<div class="grid g3">
<a class="tile rv" href="click-and-collect.html"><h3>Click &amp; collect</h3><p>Pick a day and a time that suits you. We&rsquo;ll have it ready.</p><span class="go">Choose a time &rarr;</span></a>
<a class="tile rv" href="shipping.html"><h3>Shipping</h3><p>Delivery across the UK where we are able to, with an age check.</p><span class="go">How delivery works &rarr;</span></a>
<a class="tile rv" href="members.html"><h3>Members</h3><p>Sign in to see member offers and your orders.</p><span class="go">Sign in &rarr;</span></a>
</div></div></section>
<section class="sec"><div class="wrap grid g2" style="align-items:center">
<div><p class="mono">The deli counter</p><h2>Discover the deli</h2><p class="lede" style="margin-top:.8rem">Pies, cheese, cured meats and sweet things from around Britain, to go with whatever is in your glass. {tbc("Deli range to be supplied by the shop")}</p><p style="margin-top:1.2rem"><a class="btn" href="deli.html">See the menu</a></p></div>
<div class="slot wide rv">Photo slot<br>The deli counter. Real photo goes here.</div></div></section>
<section class="sec alt"><div class="wrap narrow" style="text-align:center"><p class="mono">Never miss a thing</p><h2>Join the newsletter</h2><p class="lede" style="margin:.8rem auto 1.4rem">New arrivals, events and the odd offer. No spam.</p><a class="btn dk" href="newsletter.html">Sign me up</a></div></section>'''
    page("index", TITLE, "The best of British beer, cider and wine, plus a deli counter.", body, key="home", cls="home", motion=True, hero_head=hero)

def pint_markup(prefix="beer-", direction="drain", pos=""):
    """Full-screen scroll background (assets/js/pint.js). direction: drain (frame 1 full) or fill (frame 1 empty)."""
    p = f' data-pos="{pos}"' if pos else ""
    return (f'<div class="pint" aria-hidden="true" data-state="loading" data-prefix="{prefix}" data-dir="{direction}"{p}></div>'
            f'<canvas class="beer" aria-hidden="true" data-dir="{direction}" hidden></canvas>\n<div class="drain-level" aria-hidden="true"><i></i></div>')

DRAIN = pint_markup()

def collection(h, t, lede, drain=False, note=""):
    cls = "drain-page" if drain else ""
    flt = '<div class="filters" id="filters" role="group" aria-label="Filter"></div>'
    body = (DRAIN if drain else "") + f'''
{head(t, lede, t, "The shelf")}
<section class="{'' if drain else ''}"><div class="wrap" style="padding-bottom:5rem">
<div class="toolbar">{note}{flt}
<p id="cards-status" class="note-s" role="status" aria-live="polite">Loading the shelf&hellip;</p></div>
<h2 class="vh">Products</h2>
<ul class="cards" id="cards" style="list-style:none" aria-label="{t}"></ul>
<p class="note-s foot-note" style="margin-top:1.4rem">Please drink responsibly. 18+ only. Allergen and ABV details will be shown on each product once the shop confirms them.</p>
{'<p class="drain-note">Temporary: the pint behind this page is made of AI-generated stand-in images, not shop photography. Real photos of the shop&rsquo;s own pour will replace them.</p>' if drain else ''}
</div></section>'''
    page(h, t, lede, body, key="shop", dpage="collection", cls=cls, extra_attrs=f'data-collection="{h}"', motion=drain)

def keezer_test():
    """Separate TEST page for the keezer scroll background. Not linked from the site. Nothing here is a real rental offer."""
    items = [("Rental price", "to be confirmed"), ("Available dates", "to be confirmed"), ("Deposit", "to be confirmed"),
             ("Kegs per unit", "to be confirmed"), ("Delivery", "to be confirmed"), ("Collection", "to be confirmed")]
    cards = "".join(f'<li class="card rv"><div class="card-b"><div class="chips"><span class="chip">Placeholder</span></div><h3>{t}</h3><p>{tbc(v)}</p></div><div class="card-f"></div></li>' for t, v in items)
    body = pint_markup("keezer-", "fill", "50% 45%") + f'''
{head("Keezer rental (test page)", "A test of the full-screen keezer background. The glass fills as you scroll.", "Keezer test", "Test page")}
<section><div class="wrap" style="padding-bottom:5rem">
<div class="toolbar"><p class="notice"><b>Test page, not a real offer.</b> A keezer is read here as a chest freezer converted to serve kegs through taps. Nothing about the rental is agreed or assumed: every detail below is a placeholder.</p>
<p class="note-s">Temporary: the pictures behind this page are AI-generated stand-ins, not shop photography and not the shop&rsquo;s own equipment.</p></div>
<h2 class="vh">Rental details</h2><ul class="cards" style="list-style:none">{cards}</ul>
<div class="toolbar" style="margin-top:1.4rem"><h2 style="font-size:1.6rem">How the background works</h2><p>Six frames cross-fade as you scroll: empty glass at the top of the page, a full pint at the bottom. Only opacity animates. With reduced motion you get one still frame.</p><p class="note-s">The kegs page is unchanged. Using this on the kegs page, and any change to its name, buttons or copy, is waiting for the shop&rsquo;s say-so.</p></div>
<p class="note-s foot-note" style="margin-top:1.4rem">Please drink responsibly. 18+ only.</p>
<p class="drain-note">Temporary: AI-generated stand-in images of a keezer, not shop photography.</p>
</div></section>'''
    page("keezer-test", "Keezer rental (test)", "Test page for the keezer background.", body, key="kegs", cls="drain-page", motion=True)


def shop():
    body = head("The shop", "Everything on the shelves, in one place. Pick a shelf to start.", "Shop", "Explore") + '<section class="sec" style="padding-top:0"><div class="wrap"><h2 class="vh">Shelves</h2>' + tiles([(f"{h}.html", t, d) for h, t, d in COLLECTIONS], cream=True) + '</div></section>'
    page("shop", "Shop", "Beers, ciders, wines, kegs and hampers.", body, key="shop")

def product():
    body = '<div class="wrap"><div class="pdp" id="pdp" aria-live="polite"><p>Loading&hellip;</p></div></div>'
    page("product", "Product", "Product details.", body, key="shop", dpage="product")

def cart():
    body = f'''{head("Your basket", "Check your order, then choose delivery or click &amp; collect.", "Basket")}
<section class="sec" style="padding-top:0"><div class="wrap grid g2" style="align-items:start">
<div><ul id="page-lines" style="list-style:none;display:grid;gap:.9rem" aria-label="Items in your basket"></ul></div>
<div class="buybox"><h2 style="font-size:1.6rem">How would you like it?</h2>
<fieldset class="field" style="border:0"><legend class="vh">Delivery or collection</legend><div class="method">
<label><input type="radio" name="method" value="ship" checked><span><b>Delivery</b><small>We post it to you. Age check on delivery.</small></span></label>
<label><input type="radio" name="method" value="collect"><span><b>Click &amp; collect</b><small>Pick it up from the shop.</small></span></label></div></fieldset>
<div id="slot-wrap" hidden><h3 style="font-size:1.2rem;margin-bottom:.6rem">Choose a collection time</h3><div class="slots" id="slots"></div><p class="note-s" style="margin-top:.6rem">{tbc("Collection days and times are placeholders until the shop confirms them")}</p></div>
<div class="tot"><span>Subtotal</span><span id="page-total">&pound;0.00</span></div>
<p class="note-s">Delivery cost and tax are shown at checkout. <span data-live-only>You pay securely on Shopify&rsquo;s checkout.</span></p>
<button class="btn" type="button" id="page-checkout" disabled>Checkout</button><p id="cart-msg" role="status"></p>
<div class="pay-opts"><span>Payment methods are the ones the shop switches on in Shopify (for example card, Apple Pay, Google Pay, PayPal).</span><span data-demo-only>Demonstration mode: nothing is charged.</span></div></div>
</div></section>'''
    page("cart", "Basket", "Your basket.", body, key="cart")

def collect():
    steps = '''<ol class="steps" style="list-style:none"><li><h3>Choose your drinks</h3><p>Fill your basket as normal.</p></li><li><h3>Pick a time</h3><p>Choose a day and a window that suits you.</p></li><li><h3>Pay at checkout</h3><p>One secure payment, same as delivery.</p></li><li><h3>Come and collect</h3><p>Bring your order number and photo ID. We&rsquo;ll have it ready.</p></li></ol>'''
    body = f'''{head("Click &amp; collect", "Order online, pick it up from the shop. Simple as that.", "Click &amp; collect", "Collect")}
<section class="sec" style="padding-top:0"><div class="wrap"><h2 class="vh">How it works</h2>{steps}</div></section>
<section class="sec alt"><div class="wrap grid g2" style="align-items:start"><div><h2>Pick your time</h2><p class="lede" style="margin:.7rem 0 1rem">Choose a slot now and we&rsquo;ll remember it in your basket.</p>
<div class="slots" id="slots"></div><p id="slot-out" role="status" style="margin-top:1rem"></p><p class="note-s" style="margin-top:.6rem">{tbc("Collection days, times and lead time are placeholders until the shop confirms them")}</p>
<p style="margin-top:1.2rem"><a class="btn" href="shop.html">Start shopping</a> <a class="btn ghost" style="color:var(--ink)" href="cart.html">Go to basket</a></p></div>
<div class="buybox"><h3>Good to know</h3><ul style="padding-inline-start:1.2rem;display:grid;gap:.5rem"><li>Bring photo ID. We may ask to see it when you collect alcohol.</li><li>Only the person named on the order can collect, unless the shop agrees otherwise. {tbc("Collection rules to be confirmed")}</li><li>Find us: {tbc("Address to be confirmed")}. Opening hours: {tbc("to be confirmed")}.</li><li>If something is not in stock we&rsquo;ll be in touch before you travel. {tbc("Stock approach to be confirmed")}</li></ul></div></div></section>'''
    page("click-and-collect", "Click & collect", "Order online and collect from the shop.", body, key="collect")

def shipping():
    body = f'''{head("Shipping", "Good drinks, brought to your door. Here is how delivery works.", "Shipping", "Delivery")}
<section class="sec" style="padding-top:0"><div class="wrap"><div class="prose">
<p class="notice"><b>Draft.</b> Delivery areas, prices and times below are placeholders until the shop confirms its carriers and licence conditions. Alcohol delivery rules have not been checked.</p>
<h2>Where we deliver</h2><p>{tbc("Delivery areas to be confirmed")}</p>
<h2>What it costs and how long it takes</h2><div class="tw" tabindex="0" role="region" aria-label="Delivery table, scrolls sideways"><table><thead><tr><th>Service</th><th>Cost</th><th>Time</th></tr></thead><tbody><tr><td>Standard delivery</td><td>{tbc("to be confirmed")}</td><td>{tbc("to be confirmed")}</td></tr><tr><td>Kegs and bulk</td><td>{tbc("to be confirmed")}</td><td>{tbc("to be confirmed")}</td></tr><tr><td>Hampers</td><td>{tbc("to be confirmed")}</td><td>{tbc("to be confirmed")}</td></tr></tbody></table></div>
<h2>Age checks</h2><p>You must be 18 or over to buy alcohol. Someone aged 18 or over must be there to accept the delivery, and we may ask for ID. {tbc("Carrier age-check process to be confirmed")}</p>
<h2>Prefer to collect?</h2><p>You can pick up from the shop instead. <a class="link" href="click-and-collect.html">See click &amp; collect</a>.</p>
<h2>Something wrong?</h2><p>Tell us and we&rsquo;ll put it right. <a class="link" href="returns.html">Delivery &amp; returns</a>.</p></div></div></section>'''
    page("shipping", "Shipping", "How delivery works.", body, key="shipping")

def deli():
    rows = [("Cheese", "Cheddar, Stilton, Cheshire and other British cheeses"), ("Pies &amp; savoury", "Pork pies, sausage rolls, scotch eggs"), ("Cured &amp; cold", "Ham, charcuterie, smoked fish"), ("On the side", "Chutneys, pickles, oatcakes, bread"), ("Something sweet", "Shortbread, tablet, tarts and cakes")]
    cards = "".join(f'<li class="card rv"><div class="slot">Photo slot<br>Real photo goes here</div><div class="card-b"><div class="chips"><span class="chip">Sample</span></div><h3>{t}</h3><p>{d}</p><p>{tbc("Real items and prices to be supplied")}</p></div><div class="card-f"></div></li>' for t, d in rows)
    body = f'''{head("Deli menu", "Pies, cheese, cured meats and sweet things from around Britain, to go with whatever is in your glass.", "Deli menu", "The deli counter")}
<section class="sec" style="padding-top:0"><div class="wrap"><p class="notice" style="margin-bottom:1.4rem"><b>Sample categories.</b> The real menu (with items, prices and allergens) will come from the shop. {tbc("Menu PDF or list to be supplied")}</p><h2 class="vh">Deli categories</h2><ul class="cards" style="list-style:none">{cards}</ul>
<p class="note-s" style="margin-top:1.2rem">Allergen information must be given for every deli item. {tbc("Allergen data to be supplied and verified by the shop")}</p>
<p style="margin-top:1.4rem"><a class="btn dk" href="hampers.html">Looking for a hamper?</a></p></div></section>'''
    page("deli", "Deli menu", "The Jack O'Beers deli menu.", body, key="deli")

def newsletter():
    body = f'''{head("Newsletter", "New arrivals, events and the odd offer, straight to your inbox. No spam, and you can leave whenever you like.", "Newsletter", "Stay in touch")}
<section class="sec" style="padding-top:0"><div class="wrap"><form class="form" data-newsletter novalidate><div class="field"><label for="nl-email">Email address</label><input id="nl-email" name="email" type="email" autocomplete="email" required><span class="hint">We&rsquo;ll only use it to send you the newsletter.</span></div>
<label class="check"><input type="checkbox" name="consent"><span>Yes, I&rsquo;d like to receive news and offers by email. I understand I can unsubscribe at any time. See the <a href="privacy.html">privacy notice</a>.</span></label>
<button class="btn" type="submit">Sign me up</button><p data-status role="status"></p></form>
<p class="note-s" style="margin-top:1.2rem">{tbc("Newsletter provider and consent wording to be confirmed with the shop")}. For adults only.</p></div></section>'''
    page("newsletter", "Newsletter", "Join the Jack O'Beers newsletter.", body, key="newsletter")

def members():
    body = f'''{head("Members", "A little extra for regulars: member offers, early looks and your order history.", "Members", "Members")}
<section class="sec" style="padding-top:0"><div class="wrap">
<div class="wall" id="wall"><h2 style="font-size:2rem">Sign in to continue</h2><p class="lede">The members&rsquo; area is for signed-in members. New here? Create an account when you sign in.</p><div><button class="btn" type="button" data-signin>Sign in or create an account</button></div>
<p class="note-s" style="color:#cbb98f">Preview only: in the live site, sign-in and accounts are handled by Shopify. {tbc("Member benefits to be agreed with the shop")}</p></div>
<div id="area" hidden><div class="grid g3"><div class="buybox"><h3>Member offers</h3><p>{tbc("Offers to be agreed")}</p></div><div class="buybox"><h3>Your orders</h3><p>{tbc("Order history comes from Shopify accounts")}</p></div><div class="buybox"><h3>Your details</h3><p>{tbc("Account details come from Shopify accounts")}</p></div></div><p style="margin-top:1.2rem"><button class="btn ghost" style="color:var(--ink)" type="button" id="signout">Sign out</button></p></div>
</div></section>
<dialog id="signin" aria-labelledby="si-t"><form class="dlg" id="signin-form" novalidate><h2 id="si-t">Sign in (preview)</h2><p class="notice"><b>Demonstration only.</b> Enter any email and password to see the members area. No account is created and nothing is stored or sent.</p>
<div class="field"><label for="si-e">Email</label><input id="si-e" name="email" type="email" autocomplete="email" required></div><div class="field"><label for="si-p">Password</label><input id="si-p" name="password" type="password" autocomplete="current-password" required></div>
<p data-status role="status"></p><div class="row"><button class="btn" type="submit">Sign in</button><button class="btn ghost" style="color:var(--ink)" type="button" data-close-dialog>Cancel</button></div></form></dialog>'''
    page("members", "Members", "The members' area.", body, key="members")

def about():
    body = f'''{head("About Jack O&rsquo;Beers", "A friendly shop for people who like good things to eat and drink.", "About", "Our story")}
<section class="sec" style="padding-top:0"><div class="wrap grid g2" style="align-items:start"><div class="prose"><p>Jack O&rsquo;Beers is a shop for the best of British beer, cider and wine, with a deli counter that does food to go alongside. Come in for a chat, a recommendation or a gift, or order online and we&rsquo;ll get it to you.</p>
<p>{tbc("Real story, opening year and team to be written by the shop")}</p><h2>What we are not</h2><p>{tbc("What the shop does not do, or who it is not for, to be written by the shop")}. For adults only: we do not sell alcohol to anyone under 18.</p><h2>Find us</h2><p>{tbc("Address to be confirmed")}<br>{tbc("Opening hours to be confirmed")}<br>{tbc("Phone and email to be confirmed")}</p>
<p><a class="btn" href="click-and-collect.html">Click &amp; collect</a> <a class="btn ghost" style="color:var(--ink)" href="shipping.html">Shipping</a></p></div>
<div class="slot wide rv">Photo slot<br>The shop front or the team. Real photo goes here.</div></div></section>'''
    page("about", "About", "About Jack O'Beers.", body, key="about")

def legal(slug, title, intro, bullets, key=None):
    lis = "".join(f"<li>{b}</li>" for b in bullets)
    body = f'''{head(title, intro, title)}<section class="sec" style="padding-top:0"><div class="wrap"><div class="prose"><p class="notice"><b>Draft placeholder, not legal text.</b> The shop must have this page written or checked by a suitably qualified adviser before launch.</p><h2>Points this page needs to cover</h2><ul>{lis}</ul></div></div></section>'''
    page(slug, title, intro, body, key=key or slug)

def age_policy():
    body = f'''{head("Age policy", "We only sell alcohol to people aged 18 or over.", "Age policy")}<section class="sec" style="padding-top:0"><div class="wrap"><div class="prose">
<p class="notice" id="under" hidden><b>Sorry, you need to be 18 or over to look around our drinks.</b> You are welcome to come back when you are.</p>
<p class="notice"><b>Draft placeholder, not legal text.</b> The shop must have this page written or checked by a suitably qualified adviser before launch.</p>
<h2>Points this page needs to cover</h2><ul><li>Minimum age to buy and receive alcohol, and how it is checked online, on delivery and on collection</li><li>Accepted ID, and what happens when ID is not shown</li><li>The shop&rsquo;s licensing details and licensing conditions {tbc("to be supplied")}</li><li>Responsible drinking information and signposting</li></ul></div></div></section>
<script>if(/[?&]under=1/.test(location.search))document.getElementById('under').hidden=false;</script>'''
    page("age-policy", "Age policy", "Our age policy.", body, key="age")

def notfound():
    body = head("We can&rsquo;t find that page", "It might have moved. Try one of these instead.") + '<section class="sec" style="padding-top:0"><div class="wrap"><p><a class="btn" href="index.html">Home</a> <a class="btn ghost" style="color:var(--ink)" href="shop.html">Shop</a> <a class="btn ghost" style="color:var(--ink)" href="about.html">About</a></p></div></section>'
    page("404", "Page not found", "Page not found.", body, key="404")

def main():
    home(); shop()
    collection("beers", "Beers", "British beers, from crisp lagers to dark stouts.", drain=True,
               note='<p class="notice" style="margin-bottom:1.2rem">You are inside the pint, and it empties as you scroll. Fill your basket before it is gone.</p>')
    collection("ciders", "Ciders", "British ciders, dry through to fruity.")
    collection("wines", "Wines", "Wines to go with the deli counter.")
    collection("kegs", "Kegs", "Beer by the keg, for parties and pubs at home.", note=f'<p class="notice" style="margin-bottom:1.2rem">Keg size, deposit and equipment rental are {tbc("to be confirmed with the shop")}. Nothing here is assumed.</p>')
    collection("hampers", "Hampers", "Ready-made hampers of drinks and deli.")
    keezer_test(); product(); cart(); collect(); shipping(); deli(); newsletter(); members(); about()
    legal("privacy", "Privacy notice", "How we look after your information.", ["Who the data controller is and how to contact them", "What is collected (orders, accounts, newsletter, cookies and analytics) and why", "Who it is shared with (Shopify, payment and delivery providers, email provider)", "Retention, your rights and how to complain"])
    legal("terms", "Terms of sale", "The terms that apply when you buy from us.", ["Who we are, prices, tax and payment", "Orders, acceptance and cancellation", "Age restrictions and alcohol sale conditions", "Liability and governing law"])
    legal("returns", "Delivery & returns", "What happens if something goes wrong.", ["Delivery times, areas and costs", "Damaged or incorrect items and how to tell us", "Cancellations and refunds, including rules for perishable and alcoholic goods", "Click and collect problems"])
    age_policy(); notfound()
    print("built", len([f for f in os.listdir(ROOT) if f.endswith('.html')]), "pages")

if __name__ == "__main__":
    main()
