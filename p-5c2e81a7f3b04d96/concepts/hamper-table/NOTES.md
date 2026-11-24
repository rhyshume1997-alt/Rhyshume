# The Hamper Table (concept for Jack O'Beers & Deli)

## Taken from the preview
Palette tokens in one `:root` block (plus a few tints and shades of them, labelled), Newsreader / Source Sans 3 / IBM Plex Mono, dark mahogany stage hero with the logo on a framed sign, wooden counter lip, cream shelves, very round cards, forest tiles, pill nav and buttons with the Shop dropdown, round product cards with Sample chips, the four illustrated how-it-works rows (SVGs copied from `illu.py`), find us, footer. Press scale 0.97, ease-out, hover only on fine pointers.

## What is different, and why
- Gifting leads. The hero is a centred dark counter stage: the tagline, then a flat SVG of an open hamper box on a wooden counter (amber and brass ribbon, gift tag, bottles, cheese, jar, tin). Beer, deli and gifts then get three equal tiles. The shelf has drinks and both sample hampers.
- A cream "table" section directly under the hero holds the builder. It sits on the counter lip, so the stage reads as the shop and the table as the thing you do in it.
- The film is replaced by illustration (same flat style as the how-it-works SVGs). No photo or AI media is used apart from the supplied logo PNG, so there are no "Temporary AI-generated imagery" tags. The hero carries a small "flat illustration, sample hamper" note.

## Signature interaction: pack a hamper (a real act)
Six sample items: Demo Amber Ale (£3.80), Demo Dark Stout (£4.20), Demo Red (£11.00) from `products.json`, and Cheese, Chutney, Shortbread as labelled placeholders ("Deli item to be confirmed", no price; the names follow the sample pairings and are not stock claims).
- Tap, click or Enter/Space on an item: its drawing flies into its slot in the box (FLIP, transform only, 260 ms, ease-out) and the box lists it. Press again, or use Remove in the list, to take it out (it flies back).
- "Sample total" adds drinks only, and says deli items, box and wrapping are to be confirmed.
- Gift tag: text field, max 60 characters, mirrored onto the tag with `textContent` (checked with `<b>` input: no markup is created).
- "Wrap it": the open lid drops away, the closed lid comes down and the ribbon and bow settle in (transform and opacity, under 300 ms). "Unwrap" reverses. Changing items unwraps.
- "Add hamper to basket" (wraps first if needed) raises the header basket count; the basket button opens a small summary dialog. Shelf cards also add to the basket. "Pack another hamper" resets the box.
- Real object: a gift hamper being packed and tied at a shop counter.
- Reduced motion: no flight, no lid or ribbon transitions, instant state; reveals are instant.
- Keyboard: items are toggle buttons (`aria-pressed`), a polite status line announces each change, focus moves sensibly after Remove and after adding.

## Tested (Playwright, Chromium)
- 1366 and 390 wide: no console errors, no horizontal overflow, full-page screenshots reviewed after scrolling reveals into view.
- Builder click and keyboard (Enter) flows, flight clone present mid-animation and removed after, total £14.80 for ale + cheese + red + chutney, tag escaped, add to basket (count 1), pack another, remove, shelf add (count 2), reduced-motion path.
- Header: no overlap or wrap at 320, 360, 390, 480, 600, 768, 900, 1000, 1100, 1200, 1201, 1280, 1366, 1440 (tabs collapse to a Menu button at 1200 and below; wordmark hides under 352 px; search moves into the menu under 768 px).
- axe (wcag2a/aa, 2.1, 2.2 AA, best-practice): 0 violations at 1366 and 390. Interactive targets all 44 px or more (measured).
- Not tested: real touch devices, Safari/Firefox, screen readers.

## Contrast (WCAG ratios, computed)
ink on paper 15.9; ink-2 on paper 9.9; ink-2 on cream-2 8.2; amber-d on paper 6.4 and on cream-2 5.3 (mono labels); paper on mahogany 16.6; amber-hi on mahogany 10.2; #e6d9bd on mahogany-2 12.4 and on forest 11.0; amber-hi on forest-2 6.8; #e1d6b8 on forest-2 8.6; paper on forest-2 11.1; ink on amber 7.3; paper on forest 13.7; note chips #5a3a08 on #efe0b8 7.8; forest-2 on paper 11.1 and on cream-2 9.2; #d8c9a4 on forest 9.4; cream on mahogany 15.3. Disabled buttons are exempt.

## Trade-offs and assumptions
- Mobile: the box sits above the items, so it scrolls out of view while you pick lower items. A sticky "Hamper: n items, see the box" pill covers that, and the flight is skipped when the box is off screen.
- Each item can be added once (six slots). Quantities are not part of this concept.
- Nav links go to sections of this one page (the preview's other pages are not rebuilt); Kegs, Members and Search have no destination. Social links are `href="#"` placeholders. Checkout is not connected, the basket is in memory only (lost on reload). No age gate in this concept.
- The hero hamper contents and the tag text "For you, with love" are illustration only.
- Fonts: Source Sans 3, Newsreader and IBM Plex Mono, SIL OFL 1.1, copied from the preview (`fonts/OFL-NOTICES.txt`; upstream per-family copyright lines were not re-checked in the preview either). No extra accent font added. No third-party code.
- Page weight: about 83 KB of HTML, CSS and JS plus the fonts, plus the shared logo PNG.
