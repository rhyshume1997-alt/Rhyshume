# The Tap Room (concept for discussion)

Open `index.html` (needs the shared media at `../../site/assets/media/`; only the logo is used). Vanilla HTML, CSS, JS. No network calls at runtime. Page is about 60 KB plus 80 KB of fonts.

## Palette (contrast measured, WCAG ratio)
| Hex | Role | Pairs |
|---|---|---|
| #1b2024 slate | page background | chalk on slate 13.6:1; dim on slate 7.9:1 |
| #242a2f charcoal | boards and cards | chalk 12.0:1; dim 6.9:1 |
| #efe9da chalk | body text, headings | |
| #b9b3a4 dim chalk | secondary text, annotations | |
| #cda64f brass | rules, labels, numbers | on slate 7.2:1; on charcoal 6.3:1 |
| #f2aa3a amber | the one highlight: buttons, tags, beer | slate text on amber 8.3:1 |
| #e0905c copper | not used for text (reserved) | |
Hop green was left out on purpose: one highlight only. The tap-handle brown (#7a4426) is decoration. The logo sits on a cream plate (#f3ead7) because its brown lettering fails on dark; the logo itself is unchanged.

## Type
Barlow Condensed 600/700 (display, caps) and IBM Plex Mono 400/500 (body and details). Both SIL OFL 1.1, from @fontsource, latin subset woff2, 80 KB total.

## Layout
Wide margins, strict left rail: each section has a mono label ("03 / The shelf") in a fixed 200 px column with the heading beside it. The shelf is a ruled tap list (number, name and pairing, style, four 5-pip flavour dials, "from" price tagged Sample, Add to basket). Boards have a double brass line like a framed chalkboard; texture is CSS gradients only. Illustrations are thin-line technical drawings with annotations (tap and pint in section, keg, cheese and jar, hamper, four step icons joined by a dashed "pipe").

## Signature interaction: the tap handle
Real object: a beer tap handle on a bar font. Drag or press-and-hold the handle (mouse, touch), or focus it and hold Arrow Down or Space. While it is pulled past the valve angle, a stream runs and the glass fills (liquid and foam head via transform scale and translate); release stops it and the handle springs back with one small overshoot. When full, a caption names one sample beer (cycles through five, liquid colour changes) with a link that scrolls to its row on the tap list and flags the row. The "Pour a pint" button runs the whole pour for keyboard and screen reader users (press again to stop); Enter on the handle does the same. Reduced motion: the button fills the glass instantly, the handle does not spring.

## Why it suits Jack O'Beers
- Tap list shelf: the shop sells by the keg and bottle, so a beer-menu board makes the range feel at home and scans quickly.
- Pour-a-pint hero: it says "keg" before any words are read and is a small treat for a visitor.
- Slate, brass and amber: warm like a pub interior, and the bull logo sits well on a cream plate.
- Dry, plain voice: matches "no foam, no fuss".
- Three equal range cards: beer, deli and hampers get the same size and weight, as requested.

## Trade-offs
Best at: beer and drinks personality, a memorable hero, clear product scanning. Worst at: the deli and homey, rounded warmth (it is more pub than New York deli, and the squared corners are less "rounded" than asked); dark theme makes food look less appetising; Plex Mono body copy is less friendly than a rounded sans.

## Missing or assumed
- Product data is sample data, labelled Sample. Hamper dials say "No dials". Allergens, ABV, rental terms, delivery areas, Tuesday hours, deli range, members area, social links all shown as "to be confirmed" or "link to be added" (social href="#").
- Nav: Shop sub-links (Beer, Cider, Wine) go to the tap list; Kegs, Hampers, Deli to the ranges section; Click & collect and Shipping to the how-it-works strip; About to Find us; Members to the newsletter section. No separate pages exist in this concept.
- Basket is a demonstration (count and a small list); no checkout.
- No temporary imagery is used; only the supplied logo.
