#!/usr/bin/env python3
"""Builds the Rev 5 pages. Run: python3 rev5/build.py. Facts come from the shop's own emails; everything else is a labelled placeholder."""
import os, html
R = os.path.dirname(os.path.abspath(__file__))
E = html.escape
B = {"tagline": "Fresh from keg to bottle, no foam, no fuss.", "address": ["13 Station Road", "Milngavie", "G62 8PG"], "phone": "07405 480950", "email": "sales@jackobeers.com"}
MAPS = "https://www.google.com/maps/search/?api=1&query=Jack+O'Beers+%26+Deli,+13+Station+Road,+Milngavie,+G62+8PG"
tbc = lambda t: f'<span class="tbc">{E(t)}</span>'
GUARD = '<script>if(!/\\/$/.test(location.pathname)&&!/\\.html$/.test(location.pathname)&&!/\\/(index|drinks|product)$/.test(location.pathname))location.replace(location.pathname+"/"+location.search+location.hash)</script>'

def header():
    return f'''<header class="hdr"><div class="wrap hdr-in">
<a class="brand" href="index.html" aria-label="Jack O&rsquo;Beers &amp; Deli, home"><img src="../site/assets/media/jack-logo.png" alt="" width="46" height="46"><span>Jack <b>O&rsquo;</b>Beers</span></a>
<nav aria-label="Main"><ul class="tabs" id="tabs">
<li><button class="tab" type="button" data-drop aria-expanded="false" aria-controls="d-shop">Shop <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
<div class="drop" id="d-shop" hidden><a href="drinks.html?c=beers">Beers<small>Crisp lagers to dark stouts</small></a><a href="drinks.html?c=ciders">Ciders<small>Dry through to fruity</small></a><a href="drinks.html?c=wines">Wines<small>For the deli counter</small></a><a href="drinks.html?c=kegs">Kegs<small>For parties</small></a><a href="index.html#hampers">Gift hampers<small>Drinks and deli, boxed</small></a></div></li>
<li><a class="tab" href="index.html#deli">Deli</a></li><li><a class="tab" href="index.html#services">Click &amp; collect</a></li><li><a class="tab" href="index.html#services">Shipping</a></li><li><a class="tab" href="index.html#find">Find us</a></li><li><a class="tab" href="index.html#services">Members</a></li></ul></nav>
<a class="iconbtn" href="drinks.html" aria-label="Browse the drinks"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></a>
<a class="cartbtn" href="#" data-open-cart><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12l-1 13H7L6 7zm3-1a3 3 0 016 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg><span class="lbl">Basket</span> <span class="n" data-count>0</span></a>
<button class="menubtn" type="button" id="menubtn" aria-expanded="false" aria-controls="tabs"><span>Menu</span></button></div></header>'''

def shelf(head_h2=True):
    top = '<div class="sec-top"><p class="mono">The shelf</p><h2 class="h2">Pick a glass, <em>any glass.</em></h2><p class="lede">Beer, cider, wine and kegs. Choose a shelf, then pick a drink to see how it tastes and what to eat with it.</p></div>' if head_h2 else ''
    return f'''{top}<ul class="rows" id="rows" aria-label="Choose a shelf"></ul>
<div class="shelf-area"><div class="shelf-bar"><p id="shelf-status" role="status">Loading&hellip;</p><label class="sort">Sort <select id="sort"><option value="featured">Featured</option><option value="price-asc">Price, low to high</option><option value="price-desc">Price, high to low</option><option value="name">Name, A to Z</option></select></label></div>
<ul class="board" aria-label="Drinks on the shelf"></ul>
<p class="hint" style="margin-top:1.2rem">Sample products and prices. Photos, ABV and allergens are to be supplied.</p></div>'''

def dialogs():
    return '''<dialog id="label" class="sheet" closedby="any" aria-labelledby="label-t"><div class="pane"><button class="x" type="button" data-close aria-label="Close">&times;</button><div id="label-body" style="display:grid;gap:1.1rem"></div></div></dialog>
<dialog id="cart" class="sheet" closedby="any" aria-labelledby="cart-t"><div class="pane"><button class="x" type="button" data-close aria-label="Close basket">&times;</button><h2 id="cart-t">Your basket</h2><div id="cart-body"></div><div class="row-act"><button class="btn" id="cart-ck" type="button">Checkout</button></div><p class="note-s">Delivery or click &amp; collect is chosen at checkout. Secure checkout by Shopify once connected.</p></div></dialog>
<dialog id="demo-ck" closedby="any" aria-labelledby="dc-t"><div class="pane"><button class="x" type="button" data-close aria-label="Close">&times;</button><h2 id="dc-t">Checkout isn&rsquo;t connected yet</h2><p>This is a design preview, so nothing is charged. When the shop&rsquo;s Shopify is connected this goes to Shopify&rsquo;s own checkout.</p><div class="row-act"><button class="btn" type="button" data-close>Got it</button></div></div></dialog>
<div class="toast" id="toast" role="status" aria-live="polite"></div>'''

def footer():
    a = "<br>".join(B["address"])
    return f'''<footer class="find" id="find"><div class="wrap"><p class="mono">Find us</p><h2 class="h2">Come in, <em>we&rsquo;re open.</em></h2>
<div class="grid"><div><h3>The shop</h3><p>{a}<br><a href="{MAPS}" target="_blank" rel="noopener noreferrer">Get directions<span class="vh"> (opens Google Maps)</span></a></p><p style="margin-top:.8rem">Wednesday to Monday, 11am to 7pm<br>Tuesday: {tbc("to be confirmed")}</p><p style="margin-top:.8rem"><a href="tel:07405480950">{B["phone"]}</a><br><a href="mailto:{B["email"]}">{B["email"]}</a></p></div>
<div><h3>Follow</h3><ul><li><a href="#" data-placeholder>Instagram</a> {tbc("link to be added")}</li><li><a href="#" data-placeholder>YouTube</a> {tbc("link to be added")}</li><li><a href="#" data-placeholder>Google page</a> {tbc("link to be added")}</li></ul></div>
<div><h3>Newsletter</h3><form id="nl" novalidate style="display:grid;gap:.7rem"><label for="nl-e" style="font-weight:700">Email</label><input id="nl-e" name="email" type="email" autocomplete="email" style="min-height:3rem;padding:.5rem 1rem;border-radius:99px;border:2px solid var(--brass);background:#fffdf6;color:var(--ink)"><label style="display:flex;gap:.6rem"><input type="checkbox" name="consent" style="width:1.3rem;height:1.3rem;flex:none;margin-top:.2rem"><span>Yes, send me news and offers. I can unsubscribe at any time.</span></label><button class="btn sm" type="submit">Join the list</button><p id="nl-s" role="status"></p></form></div></div>
<div class="fine"><p><b>Please drink responsibly. You must be 18 or over to buy alcohol.</b> <a href="#" data-placeholder>Age policy</a> &middot; <a href="#" data-placeholder>Privacy</a> &middot; <a href="#" data-placeholder>Terms</a></p><p>Rev 5 working preview by Rhys Hume. Sample products and prices; images marked temporary are AI-generated and not the shop&rsquo;s own. Not live.</p></div></div></footer>'''

def page(slug, title, body, scripts, solid=False, extra=""):
    out = f'''<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
{GUARD}
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex,nofollow,noarchive">
<meta name="theme-color" content="#1d0f0a">
<title>{E(title)}</title>
<link rel="icon" href="../site/assets/media/jack-logo.png">
<link rel="preload" href="../site/assets/fonts/newsreader-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="rev5.css">
</head>
<body{' data-solid="1"' if solid else ''}>
<a class="skip" href="#main">Skip to the content</a>
{header()}
<main id="main">
{body}
</main>
{footer()}
{dialogs()}
{scripts}
</body>
</html>
'''
    open(os.path.join(R, slug + ".html"), "w", encoding="utf-8").write(out)

S = '<script src="../site/data/products.js" defer></script>\n<script src="rev5.js" defer></script>'

hero = f'''<section class="stage" aria-label="Opening"><div class="stage-in">
<div class="arch" aria-hidden="true"><video muted loop playsinline preload="auto" autoplay poster="../site/assets/media/pour-poster.webp"><source src="../site/assets/media/pour.webm" type="video/webm"><source src="../site/assets/media/pour.mp4" type="video/mp4"></video></div>
<div class="hero-copy"><p class="mono">Craft beer &middot; cider &middot; wine &middot; deli &middot; gifts</p>
<h1 class="big"><span class="w">Fresh</span> <span class="w">from</span> <span class="w">keg</span> <span class="w">to</span> <span class="w">bottle,</span> <span class="acc"><span class="w">no</span> <span class="w">foam,</span> <span class="w">no</span> <span class="w">fuss.</span></span></h1>
<p class="lede">An independent British drinks shop and deli in Milngavie. Come in, have a look along the shelf, and take something good home.</p>
<div class="btns"><a class="btn" href="#shelf" data-come-in>Come in</a><a class="btn ghost" href="drinks.html?c=beers">Shop beers</a></div>
<p class="hours-pill"><i></i>Open Wednesday to Monday, 11am to 7pm</p></div>
<div class="counter" aria-hidden="true"></div>
<div class="medal" aria-hidden="true"><div class="medal-in"><img src="../site/assets/media/jack-logo.png" alt="" width="160" height="160"></div><span class="zz"><i>z</i><i>z</i><i>z</i></span></div>
<p class="sleep-note" aria-hidden="true">Jack&rsquo;s animation is a stand-in</p>
<p class="img-tag">Temporary AI-generated footage</p>
<p class="scrollcue" aria-hidden="true">Scroll</p></div></section>'''

deli = f'''<section class="deli" id="deli" aria-labelledby="deli-h"><div class="wrap"><p class="mono">The deli counter</p><h2 class="h2" id="deli-h">Good things to eat, <em>next to the beer.</em></h2>
<div class="cols"><ul class="stubs rv" aria-label="Sample deli items">
<li><button class="stub" type="button" data-n="Cheddar" data-d="Deli photo to be supplied" aria-pressed="false"><span><b>Cheddar</b><small>Sample item &middot; price {tbc("to be confirmed")}</small></span><span class="go">Pairs with a pale lager</span></button></li>
<li><button class="stub" type="button" data-n="Pork pie" data-d="Deli photo to be supplied" aria-pressed="false"><span><b>Pork pie</b><small>Sample item &middot; price {tbc("to be confirmed")}</small></span><span class="go">Pairs with an amber ale</span></button></li>
<li><button class="stub" type="button" data-n="Oatcakes" data-d="Deli photo to be supplied" aria-pressed="false"><span><b>Oatcakes</b><small>Sample item &middot; price {tbc("to be confirmed")}</small></span><span class="go">Pairs with a dry cider</span></button></li>
<li><button class="stub" type="button" data-n="Chutney" data-d="Deli photo to be supplied" aria-pressed="false"><span><b>Chutney</b><small>Sample item &middot; price {tbc("to be confirmed")}</small></span><span class="go">Pairs with a session IPA</span></button></li>
<li><button class="stub" type="button" data-n="Shortbread" data-d="Deli photo to be supplied" aria-pressed="false"><span><b>Shortbread</b><small>Sample item &middot; price {tbc("to be confirmed")}</small></span><span class="go">Pairs with a fruit beer</span></button></li></ul>
<div class="photo" id="deli-photo" role="img" aria-label="Deli photo to be supplied"></div></div>
<p class="hint" style="margin-top:1.6rem;color:#e1d4b3">The real deli range, prices and allergens come from the shop. These are sample items taken from the sample pairings.</p></div></section>'''

hampers = f'''<section class="hampers" id="hampers" aria-labelledby="h-h"><div class="wrap"><p class="mono">Gift hampers</p><h2 class="h2" id="h-h">Something good <em>to give.</em></h2>
<div class="cols"><div class="arch-slot rv" role="img" aria-label="Hamper photo to be supplied"><span>Photo coming soon<br>A gift hamper</span></div>
<div class="hlist"><article class="hcard rv"><p class="mono">Sample hamper</p><h3>Beer hamper</h3><p>A selection of beers with something to eat alongside. Contents and price {tbc("to be agreed")}.</p><p><button class="btn sm dk" type="button" data-add="demo-hamper-beer">Add sample to basket</button></p></article>
<article class="hcard rv"><p class="mono">Sample hamper</p><h3>Deli hamper</h3><p>Deli favourites made for sharing. Contents and price {tbc("to be agreed")}.</p><p><button class="btn sm dk" type="button" data-add="demo-hamper-deli">Add sample to basket</button></p></article>
<p class="note-s">Gift messages, wrapping and sending to another address are {tbc("to be confirmed")}.</p></div></div></div></section>'''

services = f'''<section class="services" id="services" aria-labelledby="s-h"><div class="wrap"><p class="mono">However you like to shop</p><h2 class="h2" id="s-h">Collect it, <em>or we send it.</em></h2>
<div class="svc">
<details><summary><span class="no">01</span><span class="nm">Click &amp; collect</span><span class="ar" aria-hidden="true">&rarr;</span></summary><div class="body"><p>Order online and pick it up from the shop at 13 Station Road. Collection is planned for the shop&rsquo;s opening hours, Wednesday to Monday, 11am to 7pm.</p><p>Days, time slots and lead time: {tbc("to be confirmed")}. Photo ID may be asked for when collecting alcohol.</p></div></details>
<details><summary><span class="no">02</span><span class="nm">Shipping</span><span class="ar" aria-hidden="true">&rarr;</span></summary><div class="body"><p>UK delivery, and international shipping where possible, is what the shop has asked for.</p><p>Countries, couriers, prices and the age check on delivery: {tbc("to be confirmed")}. Alcohol delivery rules need separate checking before launch.</p></div></details>
<details><summary><span class="no">03</span><span class="nm">Keg &amp; keezer hire</span><span class="ar" aria-hidden="true">&rarr;</span></summary><div class="body"><p>The shop is considering hiring out kegs and a keezer (a chest freezer set up with taps).</p><p>What is hired, price, deposit, dates and how people pick their dates: {tbc("all to be confirmed")}. Nothing is bookable yet.</p></div></details>
<details><summary><span class="no">04</span><span class="nm">Members</span><span class="ar" aria-hidden="true">&rarr;</span></summary><div class="body"><p>A members&rsquo; area was asked for. What members get, and how they sign in, is not decided, so there is no sign-in in this preview.</p></div></details></div></div></section>'''

index_body = hero + f'''
<section class="shelf cream" id="shelf" aria-labelledby="sh-h"><div class="wrap">
{shelf().replace('<h2 class="h2">', '<h2 class="h2" id="sh-h">')}</div></section>
{deli}
{hampers}
{services}'''
page("index", "Jack O’Beers & Deli | Craft beer, cider, wine, deli and gifts, Milngavie", index_body, S)

drinks_body = f'''<section class="page-top"><div class="wrap"><p class="mono">The shelf</p><h1 class="h2">Pick a glass, <em>any glass.</em></h1></div></section>
<section class="shelf cream" id="shelf" style="padding-top:4rem"><div class="wrap">{shelf(False)}</div></section>'''
page("drinks", "The shelf | Jack O’Beers & Deli", drinks_body, S, solid=True)

page("product", "Product | Jack O’Beers & Deli", '<section class="page-top"><div class="wrap"><p class="mono">Label</p><p class="h2" style="font-family:var(--serif)">On the shelf</p></div></section><section class="cream" style="background:var(--cream)"><div class="wrap"><div class="pdp" id="pdp"></div></div></section>', S, solid=True)
print("built")
