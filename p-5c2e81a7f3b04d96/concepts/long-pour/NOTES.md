# Concept: The Long Pour

## What it is
The preview's pint-emptying idea taken to the whole home page. Six photo frames (`beer-1` full to `beer-6` empty) sit in a fixed full-viewport stage behind everything. The page is a run of near-solid panels (dark mahogany, forest, cream) with "windows" between them where the glass shows. A slim level gauge shows how much is left. The hero is the pour film with the Jack sign and the tagline; the pint frames take over as soon as you scroll.

## Taken from the preview
Palette (exact tokens, one `:root` block), Newsreader / Source Sans 3 / IBM Plex Mono, pill header with Shop dropdown, round cards and tiles, mahogany hero with framed Jack sign, wooden counter lip, round product cards with Sample chip, the flat illustrated how-it-works row (CSS and SVG copied from `illu.py` / `site.css`), tbc chips, press scale 0.97, ease-out, hover only on fine pointers, the `pint.js` approach (opacity only, smootherstep blend, frame 1 first, rest on idle, `-sm` files on small screens, reduced motion = one full still, paused in hidden tabs, dark stage fallback).

## Different, and why it suits the shop
One idea per screen, long and calm, big Newsreader headlines. The glass is the shop's own product, and the page is the act of drinking it. Beer, deli and hampers get equal-size tiles in one panel.

## Signature interaction: finishing the pint
Real object: a pint glass. It empties as you scroll (frames cross-fade, gauge and the percentage drop). At the very bottom a "Last drop" panel holds find us plus a "Fill it up again" button. It scrolls back to the top with an eased, interruptible scroll (wheel, touch, key or pointer stops it), the glass refills on the way, and focus lands on the page top. Works by mouse, touch and keyboard (Enter/Space on the button). Reduced motion: one still full pint, static gauge, the button just jumps to the top.

## Tested (Playwright, Chromium)
- No console errors; no horizontal overflow at 390 or 1366.
- Header: no overlapping items at 320, 360, 390, 600, 768, 1024, 1152, 1200, 1280, 1366, 1440. Tabs collapse into a Menu button at 1200 px and below. At 320 and 360 the header wraps to two rows (no overlap).
- axe (wcag2a/aa, 21a/aa, 22aa, best-practice) at 1366 and 390: 0 violations. Colour contrast over the fixed photo is reported "incomplete" by axe, so I computed it by hand (below).
- Scrolled to bottom: all six frames loaded, gauge 0%. Refill via keyboard Enter: reached top, gauge 100%, only frame 1 visible, focus on `#top`.
- All `.rv` reveals become visible after scrolling (0 left hidden).
- Add to basket updates the count. Newsletter form is demo-only with validation messages.
- Reduced motion: 1 frame loaded, 100%, film paused, content visible, refill jumps to y=0.
- Images blocked: stage falls back to dark, gauge still works.
- Full-page screenshots at 1366x850 and 390x844 reviewed; fixed the missing glass fill in the "Enjoy" illustration, the header wrapping on phones and the tags covering hero buttons.
- Not tested: real devices, Safari/Firefox, screen reader.

## Contrast (4.5:1 minimum; worst case = brightest photo area under the panel's transparency)
paper on dark panel 15.4; lede #e6d9bd on dark 12.4; amber-hi on dark 9.5; paper on forest panel 12.8; #e1d4b3 on forest-2 tile 8.5; amber-hi on forest-2 6.8; ink on cream 14.7; ink-2 on cream 9.1; amber-d mono on cream 6.0; ink-2 on paper card 9.9; ink on amber button 7.3; paper on forest button 13.7; tbc chip 7.8; Sample chip 8.2; photo-slot text 7.1; tags 13.4; forest-2 link on cream 10.2; amber-hi on header 10.2. Hero text sits on the film under a dark gradient (about 9.5 in the worst assumed case); text over video was not measured frame by frame.

## Fonts
Self-hosted copies from the site (`fonts/`): Source Sans 3, Newsreader, IBM Plex Mono, all SIL OFL 1.1 (see `fonts/OFL-NOTICES.txt`; upstream copyright lines not re-checked). No extra accent family.

## Trade-offs, assumptions, unfinished
- Page is long (about 9,000 px desktop, 14,000 px phone). Windows add scroll to show the glass; reduce `.win` height if too long.
- Level captions ("about 80%") are approximate and decorative.
- Pages other than the home page do not exist: links are `href="#"` and show a "not part of the concept" toast, or jump to the matching section.
- All prices, ABV, allergens, hamper contents, social links and Tuesday hours are labelled placeholders. Product photos are dashed "Photo to come" slots. Imagery is tagged "Temporary AI-generated imagery".
- Page weight excluding shared media: about 55 KB of HTML, CSS and JS plus about 245 KB of fonts.
