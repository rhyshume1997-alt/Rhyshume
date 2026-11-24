# Wake Jack (concept for discussion)

Open `index.html` (served over http; the logo path is `../../site/assets/media/jack-logo.png`). Files: `index.html`, `concept.css`, `concept.js`, `fonts/`.

## What it keeps from the approved preview
Same tokens in one `:root` block (exact palette, no extras), dark mahogany stage hero, wooden counter lip at the top of every room, cream shelves, forest tiles, very round cards (26 to 30 px), pill nav with the Shop dropdown, pill buttons, round product cards with Sample chips, the flat illustrated how-it-works row (SVGs copied from `illu.py`, plus one new deli illustration and flat product marks in the same style), Newsreader / Source Sans 3 / IBM Plex Mono, italic tagline, press scale 0.97, ease-out, hover only on `(hover:hover) and (pointer:fine)`.

## What is different
The page is a "stage with rooms", not a long scroll. A dark curtain (the hero) covers the shop. Jack's framed logo sign lies on its side asleep on a wooden counter with three drifting "z"s. Rooms: Shop (three equal ranges plus the shelf), Deli, Click & collect (how it works), Shipping, About, Find us, Newsletter, Members. Footer (contact, 18+ line, "Let Jack sleep") is always present. Layout is sparse and theatrical: one centred hero, then cream shelves. Suits the shop because the logo is a bull and the preview already had a "Jack lies down in the footer" gag; here it becomes the front door.

## Signature interaction and the real object it comes from
"Wake Jack" button, tapping Jack, Enter or Space (both are real buttons), or any nav link while asleep: Jack stands up (rotate from -90deg with a small overshoot and hop, 420 ms), winds back (leans, backs off the left edge, 360 ms), then headbutts: the dark curtain is shoved to the right off screen with Jack pushing at its edge (transform only, 700 ms, ease-out). After that every nav link and in-page button does the same shove: the current room is pinned in place and slides right with Jack, the target room is already underneath. Real object: a bull butting a pub door open / a bar-room curtain, and the sleeping bull on the counter.
- In-page only: updates the URL hash (`#deli` etc.), moves focus to the new room heading, announces via a live region, Back/Forward swap instantly, deep links such as `#about` open the room directly with Jack awake.
- "Let Jack sleep" (footer, appears when awake): scrolls to top, the curtain slides back in from the right, Jack lies down, focus lands on Jack.
- Reduced motion: no shoving, no runner, no breathing or z loops; instant swap with a 180 ms fade, static z's.
- Caption present in the hero and footer: "Jack's animation is a stand-in: real logo animation to be supplied". The logo is only rotated and moved (supplied PNG, framed in a paper sign as in the preview), never redrawn or recoloured.

## Trade-offs
- Only one room shows at a time, so there is no single scrolling page and no scroll-based anchors. Without JS everything stacks as a normal long page.
- The shove takes about 1.3 s the first time (stand, wind back, headbutt) and 0.7 s after; clicks during a shove are ignored.
- Search and Basket buttons only show a toast (no drawer or Shopify). Basket count updates on Add to basket.
- The room being left is pinned `position:fixed` for the slide so the page can jump to the top without a visible jump.
- Product titles have "Demo" removed and carry a Sample chip; prices are shown as "sample price".

## Assumed or missing (all marked on the page)
Deli menu, hamper contents, ABV, allergens, prices, shipping rates and zones, collection slots, Tuesday hours, keg and keezer rental terms, off-sales licence details, our story, members offer, Instagram/YouTube/Google links (`href="#"`, toast says "link to be added"). The Members room is a "not open yet" card, with no invented perks or sign-in. The "Opening hours" and Get directions use the shop's address and a Google Maps search URL. No AI media is used, so there is no "Temporary AI-generated imagery" tag. No third-party code or assets.

## Fonts
Copied from `site/assets/fonts/`: Source Sans 3, Newsreader, IBM Plex Mono, all SIL OFL 1.1 (licence notes copied beside them; per-family copyright lines not re-checked, as in the preview). No extra accent family. Page weight: HTML 36 KB, CSS about 25 KB, JS about 14 KB, fonts about 210 KB, plus the shared 74 KB logo.

## Contrast (WCAG ratios, text pairs used)
ink on cream 14.7, paper 15.9, cream-2 13.2; ink-2 on cream 9.1, paper 9.9, cream-2 8.2; amber-d labels on cream 6.0, paper 6.4, cream-2 5.3; paper on mahogany 16.6; amber-hi on mahogany 10.2; lede #e6d9bd on mahogany 13.4; caption #d8c8a6 on mahogany 11.3; paper on forest 13.7; amber-hi on forest 8.5; #e1d6b8 on forest 10.7; ink on amber button 7.3; ink on amber-hi 9.8; paper on forest-2 (active filter) 11.1; forest-2 links on cream 10.2; placeholder tag #5a3a08 on #efe0b8 7.8; amber-hi on #3a2417 (footer tags) 8.0. Focus ring: forest-2 on light areas (10.2 against cream), amber-hi on dark areas.

## Tested (Playwright through the routing helper, Chromium)
- Screenshots viewed at 1366x850 and 390x844 for asleep, mid-wake, every room and after "Let Jack sleep"; reveals checked by scrolling before full-page capture.
- No console errors; no horizontal overflow in any state at both sizes.
- axe (wcag2a/aa, 2.1, 2.2 aa, best-practice): 0 violations for asleep and for all 8 rooms at both sizes. (An initial "page must have a level-one heading" failure when awake was fixed with a visually hidden h1.)
- Keyboard: Tab to "Wake Jack", Enter wakes; focus ends on the room heading, hash `#shop`. Nav clicks give hash, focus on heading, no stuck `is-leaving` pins. Sleep returns focus to Jack and clears the hash. Back button restores the earlier room.
- Header: no overlap, clipping or overflow at any width from 320 to 1440 in 10 px steps (menu collapses at 80rem).
- Reduced motion: instant swap, no runner, no animations left running, focus and hash correct.
- Not tested: real touch devices, Safari/Firefox, screen readers, the mid-animation look as video (sampled only by transform values and screenshots).
