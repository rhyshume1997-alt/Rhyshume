"""Markup for the four featured concepts on the home page (written to /tmp/featured.html by build-home.py)."""
K = {'sunny-hours': 'sunny-hours-16x9', 'little-kettle': 'little-kettle-16x9', 'bright-circuit': 'bright-circuit-16x9', 'corner-shelf': 'corner-shelf-16x9'}
def film(slug, alt, name):
    k = K[slug]
    return f'''<figure class="ft-film"><video class="mv" muted loop playsinline preload="none" width="736" height="400" poster="/images/concepts/{slug}-poster.webp" data-webm="/website-concepts/video/{k}.webm" data-mp4="/website-concepts/video/{k}.mp4" aria-label="Moving preview of the {name} concept. {alt}"></video><button class="mv-btn" type="button" aria-pressed="false" aria-label="Play the moving preview of {name}"><span aria-hidden="true">Play</span></button><figcaption>Generated concept footage</figcaption></figure>'''
def actions(slug, note):
    return f'''<p class="ft-actions"><a class="ft-btn" href="/website-concepts/{slug}">Explore this concept</a><a class="ft-ask" href="/contact">Want something like this for your business?</a></p><p class="ft-note">Concept by Rhys Hume, not a live site. {note}</p>'''
def head(n, kind, name, hid):
    return f'<header class="ft-head"><span class="ft-n" aria-hidden="true">{n}</span><div><p class="ft-kind">{kind}, a made-up business</p><h3 id="{hid}">{name}</h3></div></header>'
days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']; full = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
sun_days = ''.join(f'<div class="sp-day"><b>{d}</b>' + ''.join(f'<button type="button" class="sp-slot" data-day="{full[i]}" data-n="{r+1}" aria-label="{full[i]}, activity {r+1}, empty"><span>Empty</span></button>' for r in range(2)) + '</div>' for i, d in enumerate(days))
sun = f'''<article class="ft ft-sun rv" id="ft-sunny-hours" aria-labelledby="sun-h"><div class="wrap ft-grid">
  {head('01', 'After school club', 'Sunny Hours Club', 'sun-h')}
  {film('sunny-hours', 'Children playing a board game at a table with coloured pens and paper.', 'Sunny Hours Club')}
  <div class="ft-copy"><p class="ft-lead">A colourful activity board with a weekly planner parents can really use.</p><p>Flat, bright shapes and big type, with a planner you fill by tapping or with the keyboard. It works the same on a phone.</p></div>
  <div class="ft-demo" role="group" aria-labelledby="sun-d"><h4 id="sun-d" class="label">Try it: plan a week</h4>
    <div class="sp-tiles" role="group" aria-label="Choose an activity"><button type="button" class="sp-tile" data-a="Make" aria-pressed="false">Make</button><button type="button" class="sp-tile" data-a="Move" aria-pressed="false">Move</button><button type="button" class="sp-tile" data-a="Play" aria-pressed="false">Play</button><button type="button" class="sp-tile" data-a="Read" aria-pressed="false">Read</button></div>
    <div class="sp-week">{sun_days}</div>
    <p class="sp-sum" role="status" aria-live="polite">Pick an activity, then a slot. 0 sessions chosen.</p>
    <button type="button" class="ft-small" data-act="sp-clear">Clear the week</button></div>
  {actions('sunny-hours', 'A fictional club. Nothing is sent or saved.')}
</div></article>'''
tiles = [('Pour', 'Flat white'), ('Bake', 'Cheese scone'), ('Soup', 'Soup of the day'), ('Sweet', 'Tray bake'), ('Sip', 'Iced tea'), ('Toast', 'Beans on toast')]
kt = ''.join(f'<button type="button" class="kt-tile" aria-pressed="false" data-back="{b}"><span class="kt-f">{a}</span><span class="kt-b" aria-hidden="true">{b}</span><span class="visually-hidden kt-sr"> Turn over to see the special.</span></button>' for a, b in tiles)
kettle = f'''<article class="ft ft-kettle rv" id="ft-little-kettle" aria-labelledby="kt-h"><div class="wrap ft-grid">
  {head('02', 'Café', 'Little Kettle Café', 'kt-h')}
  {film('little-kettle', 'Coffee being poured into a speckled mug from a copper espresso machine, steam rising.', 'Little Kettle Café')}
  <div class="ft-copy"><p class="ft-lead">Coffee poured in a café-window shape, a specials board you can play with, and a menu that becomes an order for the table.</p><p>The footage sits inside the design instead of behind it, and the board works by touch, mouse or keyboard.</p></div>
  <div class="ft-demo" role="group" aria-labelledby="kt-d"><h4 id="kt-d" class="label">Try it: today&rsquo;s board</h4>
    <div class="kt-board">{kt}</div>
    <p class="kt-sum" role="status" aria-live="polite">Eight tiles in the full concept. Turn a tile over to see a sample special. 0 turned.</p>
    <button type="button" class="ft-small" data-act="kt-all">Turn them all over</button><button type="button" class="ft-small" data-act="kt-back">Turn them back</button></div>
  {actions('little-kettle', 'A fictional café. The specials are samples. No prices, nothing is ordered.')}
</div></article>'''
circuit = f'''<article class="ft ft-circuit rv" id="ft-bright-circuit" aria-labelledby="bc-h"><div class="wrap ft-grid">
  {head('03', 'Electrician', 'Bright Circuit Electrical', 'bc-h')}
  {film('bright-circuit', 'An electrician in yellow gloves working at a consumer unit.', 'Bright Circuit Electrical')}
  <div class="ft-copy"><p class="ft-lead">An industrial, technical look. One circuit runs down the page and powers each section as you reach it.</p><p>Services are switches. A step-by-step enquiry and an emergency call button stay in reach.</p></div>
  <div class="ft-demo" role="group" aria-labelledby="bc-d"><h4 id="bc-d" class="label">Try it: flip a breaker</h4>
    <svg class="bc-svg" viewBox="0 0 420 150" role="img" aria-label="A circuit with three branches that light up as the switches are turned on" focusable="false"><path class="bc-bus" d="M10 20 H410"/><g><path class="bc-br" id="bc-p1" d="M70 20 V120"/><path class="bc-br" id="bc-p2" d="M210 20 V120"/><path class="bc-br" id="bc-p3" d="M350 20 V120"/></g><circle class="bc-node" id="bc-n1" cx="70" cy="125" r="8"/><circle class="bc-node" id="bc-n2" cx="210" cy="125" r="8"/><circle class="bc-node" id="bc-n3" cx="350" cy="125" r="8"/></svg>
    <div class="bc-sw"><button type="button" role="switch" aria-checked="false" data-i="1"><span>Fault finding</span><i aria-hidden="true">Off</i></button><button type="button" role="switch" aria-checked="false" data-i="2"><span>Lighting</span><i aria-hidden="true">Off</i></button><button type="button" role="switch" aria-checked="false" data-i="3"><span>Sockets and units</span><i aria-hidden="true">Off</i></button></div>
    <p class="bc-sum" role="status" aria-live="polite">All three circuits are off. Flip a switch to power it.</p>
    <button type="button" class="ft-call" data-act="bc-call">Emergency call (concept)</button><p class="bc-call" role="status" aria-live="polite"></p></div>
  {actions('bright-circuit', 'A fictional electrician. The call button is a demonstration and calls nobody. No qualifications are claimed.')}
</div></article>'''
objs = [('Berry jug', 'kitchen', 'M20 60 q-8 -30 10 -45 h22 q18 15 10 45 z'), ('Pillar candle', 'candles', 'M28 10 h14 v50 h-14 z'), ('Greeting card', 'cards', 'M16 14 h36 v46 h-36 z'), ('Speckled mug', 'kitchen', 'M16 18 h30 v36 h-30 z M46 26 h8 v18 h-8'), ('Taper pair', 'candles', 'M24 8 h6 v52 h-6 z M40 14 h6 v46 h-6 z'), ('Notebook', 'cards', 'M14 12 h38 v48 h-38 z M22 12 v48')]
so = ''.join(f'<button type="button" class="sh-obj" data-cat="{c}" data-name="{n}" aria-pressed="false"><svg viewBox="0 0 70 70" aria-hidden="true" focusable="false"><path d="{d}"/></svg><span>{n}</span></button>' for n, c, d in objs)
shelf = f'''<article class="ft ft-shelf rv" id="ft-corner-shelf" aria-labelledby="sh-h"><div class="wrap ft-grid">
  {head('04', 'Gift and home shop', 'The Corner Shelf', 'sh-h')}
  {film('corner-shelf', 'A wooden shelf with a jug of red berry branches, cards, bowls and candles.', 'The Corner Shelf')}
  <div class="ft-copy"><p class="ft-lead">A catalogue-style shop. Drawn products sit on shelves you can filter, inspect and add to a basket.</p><p>No product photos exist for a made-up shop, so every object is drawn. The basket is a demonstration with no payment.</p></div>
  <div class="ft-demo" role="group" aria-labelledby="sh-d"><h4 id="sh-d" class="label">Try it: the shelf</h4>
    <div class="sh-chips" role="group" aria-label="Filter the shelf"><button type="button" data-f="all" aria-pressed="true">All</button><button type="button" data-f="kitchen" aria-pressed="false">Kitchen</button><button type="button" data-f="candles" aria-pressed="false">Candles</button><button type="button" data-f="cards" aria-pressed="false">Cards and paper</button></div>
    <div class="sh-shelf">{so}</div>
    <div class="sh-insp" role="status" aria-live="polite"><b class="sh-name">Choose an object to look closer.</b><span class="sh-price"></span><button type="button" class="ft-small sh-turn" hidden>Turn it over</button><button type="button" class="ft-small sh-add" hidden>Add to the basket (demonstration)</button></div>
    <p class="sh-basket" role="status" aria-live="polite">Basket: 0 items. Demonstration only, no payment.</p></div>
  {actions('corner-shelf', 'A fictional shop. The basket takes no payment and stores nothing.')}
</div></article>'''
thumbs = [('olive-ivory', 'Olive &amp; Ivory', 'Wedding photographer', 'Curtains beside a window with a wedding dress.'), ('bright-circuit', 'Bright Circuit Electrical', 'Electrician', 'An electrician working at a consumer unit.'), ('salt-ember', 'Salt &amp; Ember', 'Restaurant', 'A steak on a charcoal grill with flames.'), ('sunny-hours', 'Sunny Hours Club', 'After school club', 'Children playing a board game.'), ('clear-ground', 'Clear Ground Coaching', 'Coach', 'A green wall with an armchair.'), ('little-kettle', 'Little Kettle Caf&eacute;', 'Caf&eacute;', 'Coffee being poured from an espresso machine.'), ('corner-shelf', 'The Corner Shelf', 'Gift and home shop', 'A wooden shelf with a jug, cards and candles.'), ('oak-razor', 'Oak &amp; Razor', 'Barber', 'A leather barber chair under brass lamps.')]
strip = ''.join(f'<li class="rv" style="--d:{(i%4)*70}ms"><a href="/website-concepts/{s}"><img src="/images/concepts/{s}-thumb.webp" width="480" height="270" loading="lazy" decoding="async" alt="{a}"><span class="cc-n">{i+1:02d}</span><b>{n}</b><span>{k}</span></a></li>' for i, (s, n, k, a) in enumerate(thumbs))
html = f'''<section class="featured" id="work" aria-labelledby="ft-h">
  <div class="wrap">
    <div class="sec-head rv">
      <p class="label">Selected concepts, made up</p>
      <h2 class="title" id="ft-h">Four websites that don&rsquo;t exist, built to show what yours could do</h2>
      <p class="lede">Each is a working concept. Try the planner, the board, the switches and the shelf below. They are fictional businesses, not clients, and none of them is a live site. <a class="text-link" href="/website-concepts/">Open all eight</a></p>
    </div>
  </div>
{sun}
{kettle}
{circuit}
{shelf}
</section>

<section class="concepts" id="concepts" aria-labelledby="cc-h">
  <div class="wrap">
    <div class="sec-head rv">
      <p class="label">All eight concepts</p>
      <h2 class="title" id="cc-h">Every concept opens as a working demonstration</h2>
      <p class="lede">Open any of them and use it. Nothing is sent, booked, bought or saved, and none of them is a real business.</p>
    </div>
    <ol class="cc-strip">{strip}</ol>
    <p class="cc-note rv">Concept by Rhys Hume, not a live site. Fictional businesses. The films and pictures are generated concept material.</p>
  </div>
</section>

<section class="kind" aria-label="Real work"><div class="wrap"><p class="label">Real work and work in progress</p></div></section>

'''
open('/tmp/featured.html', 'w', encoding='utf-8').write(html)
print(len(html))
