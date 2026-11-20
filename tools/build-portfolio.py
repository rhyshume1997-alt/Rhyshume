"""Builds website-concepts/index.html, the public portfolio of the eight fictional concepts. Run from the repository root."""
import html, re
e = html.escape
NOTICE = 'Concept by Rhys Hume, not a live site.'
KEYS = {'olive-ivory': 'oi-hero-window-16x9', 'bright-circuit': 'bright-circuit-16x9', 'salt-ember': 'se-hero-fire-16x9', 'sunny-hours': 'sunny-hours-16x9', 'clear-ground': 'clear-ground-16x9', 'little-kettle': 'little-kettle-16x9', 'corner-shelf': 'corner-shelf-16x9', 'oak-razor': 'oak-razor-16x9'}
C = [
 dict(id='olive-ivory', n='01', name='Olive & Ivory', kind='Wedding photographer', lay='a', tags='gallery enquiry',
  pitch='A soft, editorial site that feels like a photographer\'s contact sheet.',
  treat='The name writes itself in handwriting beside a film window. Scrolling slides a photograph into a proof sheet, where visitors mark favourite frames Keep or Pass before they get in touch.',
  demo=['Photo gallery with a big-photo viewer', 'Favourites that carry into the enquiry', 'A calm film opening'],
  pal=['#f6f0e7', '#2c2a25', '#5b6f55'], fonts='Newsreader and a handwriting script', bg='#f6f0e7', fg='#2c2a25', ac='#5b6f55',
  alt='Sheer curtains moving beside a tall window with a wedding dress hanging in it.'),
 dict(id='bright-circuit', n='02', name='Bright Circuit Electrical', kind='Electrician', lay='b', tags='enquiry',
  pitch='A bold, technical site for an electrician, built like a drawing.',
  treat='One circuit line runs down the page and powers up each section as you scroll. Services are switches you can flip, and an emergency call button never leaves the screen.',
  demo=['Service switches that open details', 'Step-by-step service enquiry', 'An always-visible urgent call button'],
  pal=['#f1f1ec', '#17212d', '#f1b400'], fonts='Archivo and IBM Plex Sans', bg='#17212d', fg='#f1f1ec', ac='#f1b400',
  alt='An electrician in yellow gloves working at a consumer unit, with tools on a shelf beside it.'),
 dict(id='salt-ember', n='03', name='Salt & Ember', kind='Restaurant', lay='c', tags='menu booking',
  pitch='A dark, warm restaurant site built around real fire.',
  treat='The name lights up letter by letter beside the film. Scrolling carries you from the fire into the menu, where each course you pick changes the photograph.',
  demo=['Menu with photographs', 'Table booking request', 'Film in the opening'],
  pal=['#1f1612', '#f2e7d6', '#dd6b40'], fonts='Newsreader and IBM Plex Sans', bg='#1f1612', fg='#f2e7d6', ac='#dd6b40',
  alt='A steak searing on a charcoal grill with flames rising behind it.'),
 dict(id='sunny-hours', n='04', name='Sunny Hours Club', kind='After school club', lay='d', tags='planner enquiry',
  pitch='A playful activity board for an after school club.',
  treat='Flat, bright shapes and big tilted type. Parents build a week by dragging, tapping or using the keyboard to place activities on days, then ask about places.',
  demo=['Interactive weekly planner', 'Clear practical information for parents', 'Parent enquiry'],
  pal=['#fff6df', '#1d2947', '#e5432a', '#12907f', '#ffc830'], fonts='Archivo and IBM Plex Sans', bg='#fff6df', fg='#1d2947', ac='#e5432a',
  alt='Children playing a board game at a table with coloured pens and paper, bunting behind.'),
 dict(id='clear-ground', n='05', name='Clear Ground Coaching', kind='Coach', lay='a', tags='enquiry',
  pitch='A calm, spacious site for a coach.',
  treat='One hand-drawn line follows the reader down the page. A few gentle questions become an enquiry that feels like a conversation rather than a form.',
  demo=['Guided enquiry', 'A scrolling story with one drawn line', 'A calm film window'],
  pal=['#ebe8df', '#1d2a24', '#2f5d4b'], fonts='Newsreader and IBM Plex Sans', bg='#ebe8df', fg='#1d2a24', ac='#2f5d4b',
  alt='A green wall with leaf shadows, an armchair with a throw and a stone coffee table.'),
 dict(id='little-kettle', n='06', name='Little Kettle Café', kind='Café', lay='b', tags='menu booking',
  pitch='A warm café site with a specials board you can play with.',
  treat='Coffee is poured inside a café-window shape. Specials tiles flip over, and the menu turns into an order for the table.',
  demo=['Flip-tile specials board', 'Tabbed menu and table order', 'Booking request'],
  pal=['#fbf3e4', '#3a2418', '#e0674a', '#4f7a5a'], fonts='Newsreader and IBM Plex Sans', bg='#fbf3e4', fg='#3a2418', ac='#e0674a',
  alt='Coffee being poured into a speckled mug from a copper espresso machine, steam rising.'),
 dict(id='corner-shelf', n='07', name='The Corner Shelf', kind='Gift and home shop', lay='c', tags='shop gallery',
  pitch='A catalogue-style site for a gift and home shop.',
  treat='Drawn products sit on staggered shelves. Filter by category, turn a product over to look closely, and add things to a basket. The basket is a demonstration with no payment.',
  demo=['Category filters', 'Product viewer', 'Basket (demonstration only)'],
  pal=['#f2eee6', '#1d1c19', '#c4442b'], fonts='Archivo and IBM Plex Sans', bg='#f2eee6', fg='#1d1c19', ac='#c4442b',
  alt='A wooden shelf with a jug of red berry branches, cards, bowls and candles against a terracotta wall.'),
 dict(id='oak-razor', n='08', name='Oak & Razor', kind='Barber', lay='d', tags='booking menu',
  pitch='A dark, confident site for a barber.',
  treat='Huge lettering that moves with the film. Services open as you tap them, then a step-by-step appointment request asks for a day and a time. The times are examples only.',
  demo=['Expanding services list', 'Appointment picker with example times', 'Lettering tied to the film'],
  pal=['#1a1a1d', '#ece6d8', '#c9a05a'], fonts='Archivo and IBM Plex Sans', bg='#1a1a1d', fg='#ece6d8', ac='#c9a05a',
  alt='A leather barber chair beside a wooden counter and mirror, lit by brass lamps.'),
]
FEATURED = ('sunny-hours', 'little-kettle', 'bright-circuit', 'corner-shelf')
C.sort(key=lambda c: (c['id'] not in FEATURED, FEATURED.index(c['id']) if c['id'] in FEATURED else 0))
for i, c in enumerate(C):
    c['n'] = '%02d' % (i + 1)
FILTERS = [('all', 'All eight'), ('enquiry', 'Enquiry journeys'), ('booking', 'Booking and appointments'), ('shop', 'Shop and basket'), ('gallery', 'Galleries'), ('menu', 'Menus and boards'), ('planner', 'Planners')]
def ex(c):
    sw = ''.join('<li><span class="sw" style="background:%s"></span><span class="hex">%s</span></li>' % (p, p) for p in c['pal'])
    dm = ''.join('<li>%s</li>' % e(x) for x in c['demo'])
    return f'''<article class="ex ex-{c['lay']}" id="{c['id']}" data-tags="{c['tags']}" style="--bg:{c['bg']};--fg:{c['fg']};--ac:{c['ac']}" aria-labelledby="{c['id']}-h">
  <header class="ex-head"><span class="ex-n">{c['n']}</span><div><p class="label">{"Featured: " if c['id'] in FEATURED else ""}{e(c['kind'])}, a made-up business</p><h2 id="{c['id']}-h">{e(c['name'])}</h2></div></header>
  <figure class="ex-film">
    <video muted loop playsinline preload="none" poster="/images/concepts/{c['id']}-poster.webp" data-webm="/website-concepts/video/{KEYS[c['id']]}.webm" data-mp4="/website-concepts/video/{KEYS[c['id']]}.mp4" aria-label="Moving preview of the {e(c['name'])} concept. {e(c['alt'])}" width="736" height="400"></video>
    <button class="ex-play" type="button" aria-pressed="false" aria-label="Play the moving preview of {e(c['name'])}"><span aria-hidden="true">Play</span></button>
    <figcaption>Generated concept footage</figcaption>
  </figure>
  <img class="ex-phone" src="/images/concepts/{c['id']}-phone.webp" width="234" height="506" loading="lazy" decoding="async" alt="The {e(c['name'])} concept on a phone.">
  <div class="ex-copy">
    <p class="ex-pitch">{e(c['pitch'])}</p>
    <p>{e(c['treat'])}</p>
    <div class="ex-cols">
      <div><h3 class="label">What it demonstrates</h3><ul class="ex-demo">{dm}</ul></div>
      <div><h3 class="label">Colours and type</h3><ul class="ex-sw">{sw}</ul><p class="ex-fonts">{e(c['fonts'])}</p></div>
    </div>
    <p class="ex-demo-link"><a class="demo-link" href="/website-concepts/{c['id']}">Explore this concept</a><a class="ask-link" href="/contact">Want something like this for your business?</a></p>
  </div>
</article>'''
nav = ''.join('<li><a href="#%s"><span>%s</span>%s</a></li>' % (c['id'], c['n'], e(c['name'])) for c in C)
chips = ''.join('<button type="button" class="chip" data-filter="%s" aria-pressed="%s">%s</button>' % (k, 'true' if k == 'all' else 'false', e(l)) for k, l in FILTERS)
page = f'''<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Eight interactive website concepts for small businesses | Rhys Hume</title>
<meta name="description" content="Eight interactive website concepts for small businesses, from a parent booking enquiry to a shop basket. Fictional demonstrations you can try, not client work.">
<meta name="theme-color" content="#f4f4f0">
<link rel="canonical" href="https://www.rhyshume.co.uk/website-concepts/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Rhys Hume">
<meta property="og:locale" content="en_GB">
<meta property="og:url" content="https://www.rhyshume.co.uk/website-concepts/">
<meta property="og:title" content="Eight interactive website concepts for small businesses | Rhys Hume">
<meta property="og:description" content="Eight fictional website concepts you can try, from a parent booking enquiry to a shop basket. Concepts, not client work.">
<meta property="og:image" content="https://www.rhyshume.co.uk/images/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/fonts/archivo-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/ibm-plex-sans-latin.woff2" as="font" type="font/woff2" crossorigin>
<script>document.documentElement.classList.add("js")</script>
<link rel="stylesheet" href="/home.css">
<link rel="stylesheet" href="/website-concepts/portfolio.css">
<script src="/home.js" defer></script>
<script src="/website-concepts/portfolio.js" defer></script>
</head>
<body class="dcp">
<a class="skip" href="#main">Skip to content</a>

<header class="masthead">
  <div class="wrap">
    <a class="wordmark" href="/" aria-label="Rhys Hume, home">Rhys Hume</a>
    <nav class="site-nav" aria-label="Main">
      <a href="/websites">Websites</a>
      <a href="/seo-and-ai-visibility">SEO and AI visibility</a>
      <a href="/automation">Automation</a>
      <a href="/engineering">Engineering</a>
      <a href="/website-concepts/" aria-current="page">Website concepts</a>
      <a href="/automation-demos">Demonstrations</a>
      <a href="/about">About</a>
      <a href="/contact">Contact</a>
    </nav>
    <a class="btn" href="/local-business#enquiry">Request a free business review</a>
  </div>
</header>

<main id="main">
<section class="dc-hero" aria-labelledby="dc-h">
  <div class="wrap dc-hero-grid">
    <div>
      <p class="label fade">Design concepts</p>
      <h1 id="dc-h" class="rise" style="--y:14px">Eight interactive website concepts. See what yours could do.</h1>
      <p class="sub rise" style="--d:120ms;--y:10px">Explore different designs and try the features for yourself, from a parent booking enquiry to a shop basket. Every concept demonstrates what&rsquo;s possible for a small business.</p>
    </div>
    <aside class="dc-notice fade" style="--d:240ms" aria-labelledby="dc-n">
      <h2 id="dc-n" class="label">Read this first</h2>
      <p><b>{NOTICE}</b> These are fictional demonstrations, not client projects or real businesses. The films and pictures are generated concept material, so they are not photographs of any real place or work. Start with the first four. The other four follow.</p>
      <p>These show what is possible. Advanced film openings, custom interactions and integrations are quoted for your own project and are not part of the starting prices. My real work is on the <a href="/#proof">home page</a> and in the <a href="/work/jnr-engineering">JNR Engineering case study</a>.</p>
    </aside>
  </div>
</section>

<section class="dc-tools" aria-label="Choose what to look at">
  <div class="wrap">
    <p class="label" id="dc-f">Show me concepts with</p>
    <div class="dc-chips" role="group" aria-labelledby="dc-f">{chips}</div>
    <p class="dc-count" role="status" aria-live="polite" id="dc-count">Showing all eight</p>
  </div>
</section>

<div class="wrap dc-layout">
  <nav class="dc-index" aria-label="The eight concepts"><ol>{nav}</ol></nav>
  <div class="dc-list">
{chr(10).join(ex(c) for c in C)}
  </div>
</div>

<section class="last" aria-labelledby="last-h">
  <div class="wrap">
    <h2 id="last-h">Want something like this for your business?</h2>
    <p>Yours would be its own design. I don&rsquo;t reuse these, and I only use photographs you have the right to use. Ask for a free preview and I&rsquo;ll email you a first look at what yours could be.</p>
    <a class="btn btn-on-ink" href="/contact">Get a free website preview</a>
  </div>
</section>
</main>

<footer class="colophon">
  <div class="wrap">
    <div class="ctrl">
      <div>
        <a class="wordmark" href="/" aria-label="Rhys Hume, home">Rhys Hume</a>
        <p class="about-line">Websites, SEO and AI visibility, automation and business systems, from Glasgow.</p>
      </div>
      <div>
        <h2>Contents</h2>
        <ul><li><a href="/websites">Websites</a></li><li><a href="/local-business">Websites for small businesses</a></li><li><a href="/seo-and-ai-visibility">SEO and AI visibility</a></li><li><a href="/automation">Automation</a></li><li><a href="/automation-demos">Automation demonstrations</a></li><li><a href="/engineering">Engineering systems</a></li><li><a href="/local-business#enquiry">Request a free business review</a></li><li><a href="/website-concepts/">Website concepts</a></li><li><a href="/tolra">Tolra</a></li><li><a href="/csv">Computer system validation</a></li><li><a href="/work/jnr-engineering">JNR Engineering case study</a></li><li><a href="/council-digital-grants">Council digital grants</a></li><li><a href="/insights">Insights</a></li><li><a href="/about">About</a></li></ul>
      </div>
      <div>
        <h2>Contact</h2>
        <ul>
          <li><a href="tel:+447908041480">07908 041480</a></li>
          <li><a href="mailto:rhys@rhyshume.co.uk">rhys@rhyshume.co.uk</a></li>
          <li>Glasgow</li>
        </ul>
      </div>
    </div>
    <div class="endline">
      <span>&copy; 2026 Rhys Hume, Glasgow</span>
      <a href="/privacy">Privacy</a>
    </div>
  </div>
</footer>

<nav class="callbar" aria-label="Call or book">
  <a class="call" href="tel:+447908041480">Call 07908 041480</a>
  <a class="book" href="/contact">Free preview</a>
</nav>
</body>
</html>
'''
open('website-concepts/index.html', 'w', encoding='utf-8').write(page)
print('website-concepts/index.html', len(page))
