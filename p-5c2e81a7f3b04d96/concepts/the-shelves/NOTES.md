# The Shelves (concept for discussion)

## What I took from the preview
Palette tokens (one `:root` block, unchanged), Source Sans 3 / Newsreader / IBM Plex Mono (self-hosted in `fonts/`, OFL; the OFL text for Source Sans 3 is included, upstream copyright lines for the other two were not re-checked, as in the preview), dark mahogany header with pill tabs and Shop dropdown, mahogany hero with the logo on a framed sign, wooden counter lip, forest tiles, very round paper cards, pill buttons (press 0.97, hover only on fine pointers), the flat `illu.py` how-it-works illustrations, "Sample" chips, "Temporary AI-generated imagery" tag, tbc chips, the tagline in italics. Logo PNG used as is.

## What is different, and why it suits the shop
- The page is a shop floor. A short dark hero band, then a left rail with the three ranges (craft beer, deli, gift hampers, equal forest tiles) and long wooden-lip shelves on a cream-2 wall, with brass counter lips between ranges. Beer, deli and hampers each get the same heading tile and a shelf, which mirrors the shop's "equal space" wish.
- Two card types: round product cards (beer shelf) and ticket-stub cards (deli and hampers): side notches, dashed tear line, price-tag corner. Deli items have no price yet, so their tag says TBC.
- Own SVGs in the preview style, extended with shelf-edge details: jars, bottles, hanging price tags, cheese, pie, shortbread, hamper. How-it-works pictures sit on a wooden lip with a price-tag number.
- Mobile: rail becomes three stacked tiles, shelves become one column, dials are two per row.

## Signature interaction: "Find your drink"
Real object: the person at the counter asking "sweet or dry? hoppy? light or full?" and reaching for the right shelf. Four sliders (Sweet, Bitter, Fruity, Body, 0 to 5) are native `input[type=range]`, so keyboard (arrows, Home/End), touch and mouse work and screen readers get a value text ("3 · Medium"). Moving a dial re-orders the 8 craft beer shelf cards by closeness, split four per shelf. The best match gets "Closest to your taste" (ties all get it), the next three get a brass ring, and each card shows its own sum ("Gap 3 of 20 (1 + 0 + 2 + 0)"). Gap = sum of absolute differences between the dials and the product's sample flavour numbers from `products.json`. Items with no flavour numbers (the Demo Beer Hamper, placed 3rd by default) drop to the end. Cards move with FLIP (transform only, 280 ms, ease-out; an interrupted move continues from where the card is). A live line says what is showing; a debounced copy goes to a `role=status` region. Reset restores the order. Reduced motion: instant re-order, no reveal animations. The strip states the flavour data is sample data.
Interpretation note: the deli stubs and the hamper shelf below are not matched (no flavour data); the Demo Beer Hamper appears on both the beer shelf (so it can visibly drop to the end) and the hampers shelf, as a real shop might list it in two places.

## Trade-offs
- Four-up planks need about 1100 px; below that planks wrap to fewer columns. Mobile page is long (about 14,000 px) because every card is shown.
- Header collapses to the Menu button below 78rem (1248 px) so the seven tabs never overlap.
- Basket is a count only; search, Members and several tabs are `#` placeholders with a toast. Nothing is stored or sent.
- Hero uses the existing poster still, not the video, to keep the band short and light.

## Placeholders and assumptions
Prices, ABV, allergens, hamper contents, deli range, rental terms, licence details, Tuesday hours and social links are labelled tbc or "link to be added". Deli item names come from the demo catalogue's pairings. Page weight excluding shared media and fonts is about 80 KB.

## Contrast (WCAG ratios, computed)
ink on cream 14.7; ink on paper 15.9; ink-2 on paper 9.9, on cream 9.1, on cream-2 8.2, on slot tan 7.3; amber-d mono labels on cream 6.0, paper 6.4, cream-2 5.3; amber-hi on forest 8.5; e1d6b8 on forest 10.7; paper on forest 13.7; ink on amber 7.3; ink on amber-hi 9.8; forest-2 on paper 11.1; forest-2 on cream-2 (dial chips) 9.2; tbc chip 7.8; paper on mahogany 16.6; e6d9bd on mahogany 13.4; amber-hi on mahogany 10.2; footer links 15.3. Hero text sits on a flat mahogany to .84 overlay; axe could not compute those over the photo (reported as "incomplete") so it was checked by eye.

## Tested (Playwright, Chromium)
No console errors; no horizontal overflow at 390 and 1366; header has no overlap at 14 widths from 320 to 1440; axe (wcag2a/aa/21/22 and best-practice) zero violations at 1366 and 390; keyboard dial changes, mouse drag, reset and basket count work; reduced motion gives no animations and visible content; reveals all become visible after scrolling. Not tested: Safari/Firefox, real touch hardware, screen reader speech.
