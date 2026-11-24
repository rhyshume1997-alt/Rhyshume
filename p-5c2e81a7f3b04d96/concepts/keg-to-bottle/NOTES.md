# Keg to Bottle (concept for discussion)

Folder: `concepts/keg-to-bottle/` (`index.html`, `concept.css`, `concept.js`, `fonts/`). Vanilla HTML/CSS/JS, no network requests, about 67 KB of own code plus 215 KB of fonts. Shared media only by relative path (`../../site/assets/media/`): the logo as supplied, and the temporary AI-generated pour video and poster in the hero (tagged).

## What was taken from the preview
Dark mahogany stage hero with the logo on a framed brass sign and the pour footage; wooden counter lip between sections; warm cream shelves; forest-green rounded cards and tiles; pill header tabs with the Shop dropdown; amber pill buttons (press 0.97, ease-out, hover only on fine pointers); Newsreader headlines, Source Sans 3 text, IBM Plex Mono caps labels; round `.slot` photo placeholders and Sample chips; the flat illustrated how-it-works row (illustrations copied from `illu.py`, blue removed); tagline in italics; footer with the 18+ line; the pint-style eased scroll (`pos += (target - pos) * .12`).

## What is different, and why it suits the shop
The tagline is "Fresh from keg to bottle, no foam, no fuss", so the home page is that journey. One vertical beer line runs down the page with a joint at each of five stops: keg (craft beer range), tap (the deli), bottle being filled (ordering steps), hamper (gift hampers), shop door (hours and address). The three ranges get one stop each, so beer, deli and hampers have equal weight. The page goes from the dark stage to cream shelves as you scroll (background gradient behind solid cards, so text always sits on a known colour). After the journey: the shelf of 8 sample products, a three-range recap for people who skipped, the illustrated how-it-works row, find us, newsletter, footer. Voice is plain and a little wry ("The tap pours. The counter does the rest.", "Yes, that glass is full. No foam, as promised.").

## Signature interaction: the beer line (a real object)
Real object: a draught line, the pipe that carries beer from keg to tap. Scrolling pushes amber liquid down it.
- The pipe is a wood casing with a brass bead and an amber fill. Fill length follows scroll position at an anchor 60% down the viewport, eased like the preview's pint (`pos += (target - pos) * .12` per frame; settles, never jumps). Animated with transform only: `scaleY` on the fill, `translateY` on the amber head dot.
- Each joint is measured from the DOM (re-measured on resize, font load and content resize), so the fill reaches a joint exactly as its stop arrives. Arrived stops light up (joint and arm turn amber, figure goes from 50% opacity and slightly lowered to full, card border turns amber). Scrolling back up drains the line again.
- Extras that follow the same idea: the tap handle turns from tilted to upright, the bottle liquid rises from 12% to full (scaleY, ease-out, no scale from zero), a drop and stream animate gently once lit.
- A fixed "Stop 2 of 5 · The tap" counter with a small bar appears while the journey is on screen. It is `aria-hidden` because every stop already has a visible "Stop N of 5" label in its own heading.
- "Skip the journey": a ghost pill in the hero and another at the top of the journey jump to the shelf, and focus moves to the shelf section for keyboard users. Also the usual "Skip to the content" link first in the tab order. Tab order is the normal document order; the pipe is not focusable.
- Reduced motion: the pipe is fully filled and static, no head dot, every stop lit, no reveal offsets, hero video paused, no drip or stream. The counter still updates from scroll position (text only).
- No scroll-jacking: scroll is native. No marquee.

## Header fix
The preview's header overlapped around 1000 to 1100 px. Here the tabs collapse into the Menu button at 1248 px and below (78rem). On phones the Basket label and Menu text become visually hidden (the accessible names remain), and below 376 px the wordmark text is visually hidden (the logo and an accessible name remain). Tested every 20 px from 320 to 1440 for overlapping boxes, items outside the viewport and horizontal overflow: no failures.

## Contrast (WCAG ratios, computed from the palette hex values)
- Paper on mahogany 16.6:1; amber-hi on mahogany 10.2:1; #e6d9bd on mahogany 13.4:1; cream on mahogany (counter, label) 15.3:1
- #e6dcc0 on forest (stop card text) 11.3:1; amber-hi on forest (card headings, labels) 8.5:1; #e1d6b8 on forest (tile text) 10.7:1
- Ink on paper 15.9:1; ink-2 on paper 9.8:1; amber-d on paper 6.4:1, on cream 6.0:1, on cream-2 5.3:1; forest-2 on paper 11.1:1
- Ink on amber (buttons) 7.3:1; paper on forest (dark buttons) 13.7:1; #5a3a08 on #efe0b8 ("to be confirmed" chips) 7.8:1; #5a3a08 on photo slot 7.1:1
- axe (wcag2a, wcag2aa, wcag21a/aa, wcag22aa, best-practice) reports 0 violations at 1366 and 390 wide.

## Fonts and licences
Source Sans 3, Newsreader and IBM Plex Mono, copied from the preview's `site/assets/fonts/` into `fonts/` (SIL Open Font Licence 1.1; see `fonts/OFL-NOTICES.txt` and `SOURCE-SANS-3-OFL.txt`). The notices file says each family's own upstream copyright line should be added before launch. No extra accent font was added.

## Trade-offs and things assumed
- The journey is long on phones (about 14,000 px for the whole page at 390 wide). The skip links and the sticky header exist for that reason.
- The pipe's joints are fixed at five. Adding a stop means adding a `section.stop`; the code measures them.
- The pipe position depends on JS. Without JS, the pipe is fully filled and every stop is shown (the `js` class gates the dimmed and empty states).
- Section backgrounds are a gradient from mahogany to cream behind the journey. Text sits only on solid cards or on the dark top of the gradient, never on the mid-tones.
- Shelf products: 8 of the 15 samples, inlined in `concept.js`. Photos are dashed "Photo to be supplied" placeholders (the shared `bottle-amber.webp` was not used). Prices are shown as "Sample price". Basket is in memory with a small summary dialog; checkout is not connected. Search, Members, social links, Age policy, Privacy and Terms are placeholders that show a toast ("Concept only").
- Header links point to sections on this page (for example Click & collect and Shipping both go to the how-it-works row) because no other pages exist in the concept.
- All illustrations are my own flat SVG in the palette (keg, tap with a glass and cheese, bottle filling, hamper, shop front). The bull logo is used as supplied and never redrawn.
- Stated facts only from the shop's emails; keg and keezer rental, hamper contents, deli range, delivery details, Tuesday hours, events details and licence details are labelled "to be confirmed" or "to be supplied". "International shipping where we can" is from the brief.
- The checkbox in the newsletter form is 22 px, but its whole label row is the 44 px target.
