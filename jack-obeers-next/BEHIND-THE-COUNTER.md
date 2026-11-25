# Rev 5: Behind the Counter (selected direction)

A private preview. It lives on the beers branch, behind the preview-only look switch. It is the default look on previews
(`/`), and the earlier looks stay available until this one is approved: `?look=original`, `?look=classic`, `?look=backbar`,
`?look=cinematic`. None of this is rendered on the live (indexable) site. Nothing was merged or deployed to production.

## What it is, in one line
The real tap wall in dark mahogany and deep green, one continuous movement into a warm cream shop, three tactile shelves
with real photographs, and one real beer pour. Newsreader for headings, Source Sans 3 for the interface, the real logo,
pills and rounded corners, no glows.

## How it differs from the other looks

| | Original | Back Bar | Cinematic | **Behind the Counter** |
|---|---|---|---|---|
| Opening | Saloon doors and Jack, scroll-driven opening that auto-scrolls once | Dark tap-wall hero, brass buttons, square corners | Four full-screen video scenes, letterbox bars, grain | Real tap wall, headline left, one short hero, shop visible beneath it. No auto-scroll, no lock |
| Type | Newsreader + Source Sans | Cormorant Garamond + Lora, uppercase labels | Cormorant Garamond + Lora | Newsreader (italic only on "come on in." and one word per section) + Source Sans 3 |
| Buttons | Pills | Sharp, uppercase, tracked | Sharp, uppercase, tracked | Pills, sentence case |
| Logo | In the arch and header | Header only | Header only | Original client logo on a cream sign that straddles the dark/cream edge, plus the header |
| After the opening | About, then the shelf | Same as Original | Four scenes, then the shop | The shelf comes first, straight after the opening |
| Shelf | Cartoon glasses, a floating bottle cursor, 1.5 s wait before the range scrolled in | Same as Original | Same as Original | Three photo tiles, real pour inside Beer, range appears at once, no floating bottle |
| Deli | Dark section with background video and cards | same | same | Deep green block, arched real photo, menu-board list (not cards) |
| Surfaces | Cream with dark bands | Dark hero then cream | Black scenes then cream | Dark opening, then warm cream and natural surfaces |

## Specification, item by item

1. **Inspect and reuse.** Built on the existing code: Shopify, content, real media, logo, navigation, basket, Pick a Shelf.
   New files: `BehindHero.tsx`, `PourWindow.tsx`, plus a CSS block keyed to `html[data-look="behind"]`. Emil Kowalski motion rules
   applied (ease-out, nothing from scale(0), short press and hover timings, hover only on a real pointer, interruptible). Tobia
   Donadon principles used for composition only (alternating dark and warm surfaces, one family with controlled italic,
   rounded forms, honest labelling). No proprietary work copied.
2. **Opening.** Real tap wall as the picture; mahogany and deep green lighting wash; headline "Welcome, come on in."; original
   logo; Shop drinks in the first screen on every size tested. Phone has its own composition (wall framed on the numbered
   taps, headline over its lower edge, no empty areas). No full-screen intro, nothing delays products.
3. **Cinematic transition.** One movement: the wall drifts down and darkens (scroll-driven, transform and opacity only) while the
   cream shop with rounded top corners slides over it. A small amber line with a bead runs from the opening into the shelf heading.
   No black gaps, no scroll locking, nothing to wait for. Reduced motion, and browsers without scroll-driven animation: the same
   composition, still.
4. **Product discovery.** Pick a Shelf kept. The range now appears and starts scrolling as the click lands (measured 8 to 44 ms
   after the click in the browser tests; it was a deliberate 1.5 s wait). The same fix applies to every look. Two clicks from
   choosing a category to the basket, tested for beer, cider and wine on desktop and phone. Checkout stays off: no "Buy now"
   appears (tested), and the existing "Sold out" and delivery wording is unchanged.
5. **Signature pour.** One interaction, real footage from the shop: a bottle tips in from the top edge of the frame into a pint. It
   plays inside the Beer tile on hover, keyboard focus, tap, or while Beer is open; otherwise a still frame. Not loaded until first
   use. The floating bottle cursor and the cartoon liquid are not used in this look, so nothing floats and nothing covers text or controls.
6. **Supporting sections.** Cream and natural surfaces after the dark opening; real photography including Michael and Tanya;
   the deli has its own composition; the information about the shop and its services is unchanged. The Find me a beer box no longer
   inherits the footer's wood band and padding (fixed for every look).
7. **Typography and finish.** Newsreader and Source Sans 3 (provisional pairing), real logo, brand colours from the existing palette.
   No glow effects, no glass effects, gradients only as lighting over photographs. Rounded and friendly.
8. **Scope.** No product information or price changed. No membership or rental functionality added. Shopify checkout code untouched.
   No production system connected. Alcohol retail compliance (age checks, delivery rules) stays marked for separate verification.

## Test results (all run on this branch, not on a phone)
- Live-mode build: the existing suite plus a guard that the preview features do not exist there. Behind the Counter build:
  `tests/behind.spec.ts` (desktop and iPhone 13 profile). Final full run: 112 passed, 2 skipped by design (hover-only on a phone, touch-only on desktop), 0 failed.
- Overflow and clipping audit: 5 looks x 9 pages x phone and desktop, nothing flagged.
- Accessibility (axe, WCAG 2.2 AA plus best practice): Behind the Counter clean on 9 pages, phone and desktop. One contrast failure found
  (the heading italic in the taps section) and fixed.
- Layout shift: 0.001 or less on the pages measured.
- Sizes looked at: 1440x900, 1280x720, 1024x768, 820x1180, 768x1024, 360x740.

## Known limitations
- Not tried on a real phone or in Firefox or Safari. The scroll-driven transition needs Chrome, Edge or Safari 26; elsewhere it shows still.
- Tested on the test shop, not real Shopify data: very long product names, real stock and real images are unchecked here.
- The pour footage shows Michael's book on the shop counter and a hand; Michael should confirm he is happy with it on the home page.
- On a phone, the logo sign sits under the fixed Call, Directions bar in the very first screen; it appears as the visitor scrolls.
- Portrait tablets use the phone composition.
- The notes drawer saves only in the browser it is used in (nothing is connected to collect notes).
- The older looks keep their cartoon bull sprites and bottle cursor. Only the 1.5 s shelf wait was removed for every look.
