# Jack O'Beers website concept, Rev 1

Initial design concept by Rhys Hume. Not a live shop. Not an approved project, agreed scope or production build.

- Preview: `p-5c2e81a7f3b04d96/index.html` (design review: `p-5c2e81a7f3b04d96/review.html`). Served at `/p-5c2e81a7f3b04d96/`, noindex, no-referrer, no-store (header rule added to `vercel.json`). Private by obscurity only: not password protected, not in the sitemap or navigation.
- Source of requirements: the Client Workbook JSON for Jack O'Beers (not copied into the repository, it holds client details).
- Existing pages and the eight concepts are untouched. The only existing file changed is `vercel.json` (one added header rule).

## Creative decisions
1. Took Little Kettle's approach (arch window, flat colour, rounded forms, italic serif accents, tactile demos) and redrew everything. No layout or markup copied.
2. Palette: brown, gold and cream sampled from the supplied logo (approximate). Green and red from the brief were dropped in favour of the logo.
3. Type: Dubai requested and supplied, but its web licence is unverified (no licence in the zip; "All rights reserved" in the font data), so no font file is stored or served. Headings use Dubai only where installed, else Archivo. Newsreader italic for accents.
4. The supplied logo (355 px image, white background removed) is used in the header and hero. A vector file is needed.
5. Opening: the logo lies down and stands up (the client's idea), then a drawn bottle tips and a glass fills. Illustration, labelled as such. Reduced motion and no-JS show the finished state. "Becomes the next page" is not built.
6. Brown bottle cursor trails a mouse pointer only. The real cursor stays.
7. Shop: category, product, detail (flavour bars, pairings, allergens placeholder). Flavour dials re-order sample drinks.
8. Deli as counter-arch cards. Services as one tabbed section with a small demo each.
9. No child imagery. Age notice shown, method left undecided.

## Asset requirements
Logo (vector, variants), brand colour values, confirmed font and licence, shop and stock photography, professional video (existing clips to review), product data (names, descriptions, flavour, pairings, ABV, sizes, verified allergens), copy, address, hours.

## Missing client information
Trading name (workbook: "Jack O'Beers", logo: "Jack O'Beers & Deli"); Shopify store status (workbook says no website but lists Shopify); meaning of "keyser units" and the rental and charging rules; membership scope; DNA till integration needs; licensing, age-check and delivery position; who supplies content; domain and Shopify access (arranged safely).

## Proposed site structure
Home; Shop (Beer, Cider, Wine, product pages); Deli; Hampers; Click and collect and delivery; Equipment rental (to scope); Membership (to scope); About and find us; Contact; legal (privacy, terms, delivery and returns, age policy).

## Shopify
Lean (to confirm) towards a customised Shopify theme with product metafields for flavour, pairing and allergens; a separate front end only if a need is proven. Advantages, limits and dependencies are in `review.html`. No Shopify account was connected.

## Known risks
Alcohol licensing, age verification, delivery restrictions, payment and advertising rules all need verifying with the client (nothing here claims compliance); allergen accuracy; illustration standing in for photography; animation weight on phones; till and stock sync; Dubai licence; preview privacy is obscurity only.

## Test evidence (Playwright, Chromium, 20 Nov 2026; `evidence/`)
All 26 checks passed: category, product and detail journey; keyboard tab arrows; flavour dials; five service demos; hamper limit; rental and membership demos; banner text; no external requests; no non-GET requests; no cookies, storage or forms; no sideways scroll at 390 and 320 px; reduced motion runs no animations; no-JS keeps the hero. Screenshots: desktop, mobile, reduced motion, review page, animation frame strip. Recording: `opening-and-shop-demo.mp4`.
Not done: real-device testing, screen reader testing, Lighthouse, contrast audit beyond design intent. A local web server was blocked in this environment, so pages were served to the browser through Playwright routing. The expected 404 is the optional `jack-logo.png`.

---

# Rev 2: signature interaction (opening and beer-bottle cursor)

Evidence in `rev2/`: `1-opening-animation.mp4`, `2-desktop-beer-cursor.mp4`, `3-mobile-tap.mp4`, eight screenshots, `test-results.txt`, `test-suite.js`.
Standalone single-file copies (rebuilt): `standalone/`.

## What was built
- `signature.js`: reusable SVG components `Sig.Bottle` (separate body, neck, cap, label), `Sig.Stream`, `Sig.Liquid` (fill and foam, clipped to the glass with a clipPath) and `Sig.Glass`, driven by GSAP 3.15.1 (`vendor/gsap.min.js`, self-hosted). No React or Three.js.
- Opening (2.85 s): the supplied logo lies on the counter at an angle and rises; the glass settles in; a brown bottle enters, tips, a stream pours, the level rises, a foam head forms, the bottle returns upright, and the headline and copy fade in. The header, navigation and both calls to action are in the page and clickable from the first frame. Any click, key press, scroll or touch jumps to the finished state.
- Cursor (drinks section only, mouse only): the bottle follows the pointer with `gsap.quickTo`, offset down and right so the native pointer and text stay visible. Hovering a product tilts it over that product's own glass, a short stream pours, the glass fills and a foam head forms, and the product's information panel appears. Leaving drains the glass and returns the bottle.
- Mobile: no cursor. Tapping a card plays the same pour with the bottle appearing only for the pour, then leaving. The information panel opens on tap and stays; the details panel updates.
- Keyboard: focusing a card (Tab) shows its information and plays the pour with the bottle; Enter selects it and moves focus to the details.
- Static alternatives: `prefers-reduced-motion` shows the finished opening, no cursor, and cards show information on hover or focus with the glass shown full, no animation. A visible "Pouring animation" switch turns the pour off for anyone. With no JavaScript the finished scene is plain SVG.
- Information is never gated on animation: it is set by a class the moment a card is hovered, focused or tapped, and the details panel always has the same content.

## Content honesty
Product names are "Demo" entries. Descriptions read "[to be supplied by the shop]", allergens "[to be verified]", prices and ABV "[to be confirmed]". The flavour scores are sample values labelled "Flavour, sample data, not verified". No verified flavour information exists yet. Liquid colours are decorative.

## Test results (rev2/test-results.txt, 52 checks, 0 failing)
Headless Chromium 20 Nov 2026, desktop 1440 x 900 and an iPhone 13 profile.
- Accessibility (axe-core 4.14, WCAG 2.0/2.1/2.2 A and AA plus best practice): 0 violations on the concept (default, and with a card focused and its information open) and on the review page. One real issue found and fixed in testing: the product list had a tabpanel role on a list.
- Keyboard: Tab reaches cards, focus shows information and pours, Enter selects, moving on resets.
- Reduced motion: opening not run, no animations active, cursor not shown, information still shows.
- Click-through: the cursor layer has pointer-events none, and the element under the bottle receives hits. No `cursor: none` anywhere.
- Performance (indicative only, software-rendered headless, files served locally so network timing is not meaningful): 60 fps average, 95th percentile frame 16.7 ms, worst frame 16.8 ms during a pour with the cursor moving; no long tasks; layout shift 0.0008; largest paint 88 ms locally. JavaScript added: `signature.js` 6 KB gzip, GSAP 28 KB gzip. No external requests, nothing sent, no cookies or storage.
- Not done: real phones and desktop GPUs, screen reader testing, Lighthouse, a manual contrast audit beyond axe, Safari and Firefox. Treat the performance numbers as a floor check, not a field result.

## Decisions and risks
- The logo is the supplied 355 px PNG with its white background removed. The opening uses it as an `<image>`; swap `jack-logo.png` (or the `data-logo` attribute on `#sig-stage`) for the vector asset when it arrives, and recheck the rise pivot.
- GSAP's licence terms are unverified (see `vendor/README.md`). Read gsap.com/standard-license before launch.
- The pour logic lives only in `signature.js` and `jack.js`. Nothing touches Shopify, forms, checkout or navigation. In a Shopify theme, the same components can be dropped into a section with product cards rendered by Liquid; the info panels would be filled from product metafields once verified data exists.
- Not launched or merged. The preview stays on the private branch under the noindex path.

---

# Rev 3: photographic signature interaction

Evidence in `rev3/`: three recordings (`1-opening-animation.mp4`, `2-desktop-beer-cursor-and-pour.mp4`, `3-mobile-tap.mp4`), two side-by-side comparison recordings (`compare-opening.mp4`, `compare-hover.mp4`), nine screenshots, four comparison images, `test-results.txt`, `test-suite.js`, and `ASSET-SPEC.md`. The prototype lab page is `p-5c2e81a7f3b04d96/lab.html`.

## What changed from Rev 2
- **Cursor bottle:** the drawn bottle is replaced by a cut-out of the supplied amber-glass bottle photograph (real glass, condensation, reflections). Movement is weighted: the position trails the pointer on a long ease and the bottle swings against the direction of travel like something hanging from its neck, then settles to a resting angle. No bounce. Still mouse-only, drinks section only, `pointer-events: none`, GSAP `quickTo`.
- **Opening:** a layered scene. The pour footage is the plate, the client's logo sits on a plaque layer that lies flat on the counter (a perspective tilt) and stands up, with a slow camera push and the headline arriving while the pour runs. Timeline 2.8 s; the footage runs 5 s and holds its last frame. Nothing waits for it.
- **Product pour:** hovering, focusing or tapping a beer or cider opens a small window in the card onto the same footage (one shared video element, so it is fetched and decoded once). The cursor bottle tips towards the window and hands off.
- **No floating bottle:** the bottle in the footage always comes in from beyond the frame edge, and the card windows are cropped so that edge stays cut off. The cursor bottle fades out as the footage takes over instead of pouring in mid-air. (Raised in review: "so you can't see it isn't coming from a hand".)
- **Wine:** no footage was supplied, so wine cards show information only.
- **Fallback:** `?pour=svg`, or any failure to play the footage, falls back to the Rev 2 drawn pour. It stays functional but is explicitly temporary.
- Static alternatives are unchanged in behaviour: reduced motion shows the still frame and standing plaque, no cursor, and opens card windows on a still with information; the on/off switch; no-JS still frame.

## Honest limits
- The footage is a single 736 x 400, 5 s AI-generated clip. It is convincing at hero and card size but soft if enlarged, the glass is already part-filled when it starts (so the level does not rise from empty), and it shows one beer colour for every beer and cider.
- The bottle cut-out is one photograph used for every beer and cider card as a stand-in for product photography.
- The cream plaque is a flat layer with a perspective tilt and a soft contact shadow. It reads as an object on the counter but is not rendered into the scene.
- Neither reference is client photography. The second clip shows an invented "Jack O'Beers, Beer, Wine, Spirits" chalkboard, so it is not used. Commercial terms for the generated media are unchecked.
- A purpose-made film is specified in `rev3/ASSET-SPEC.md`.

## Bugs found by testing and fixed
- A class-name clash: a card's `open` class collided with the hero's `.open` section style, adding 120 px of padding and growing the product row on hover (the page jumped). Renamed `is-open`; rows also now have a fixed height. Layout shift fell from 0.074 to 0.0008.
- The cursor's fade-in from a previous card could override its hand-off fade. Fades now cancel each other.

## Test results (rev3/test-results.txt, 48 checks, 0 failing)
Headless Chromium, 20 Nov 2026, desktop 1440 x 900 and an iPhone 13 profile. Includes: nav and both shop actions usable while the opening plays, footage playing, opening timeline 2.85 s, any-key skip, cursor offset and click-through, weighted-movement check, hover opening the card window with footage playing and the cursor handing off, leaving closing it, keyboard focus, cider and wine, switch off, reduced motion, no JavaScript, `?pour=svg` fallback, mobile tap, scroll while open, no external requests, nothing sent, no storage, and axe-core (WCAG 2.2 AA plus best practice) with 0 violations on the concept, the concept with a card open and footage playing, the design review and the lab page.
Performance, indicative only (software-rendered headless, files served locally): 60 fps average and 16.8 ms worst frame during a pour with the cursor moving, no long tasks, layout shift 0.0008. First view weight about 0.9 MB including 371 KB of footage, 72 KB GSAP, 21 KB signature script. Not done: real phones and GPUs, Safari and Firefox, screen reader, Lighthouse, a manual contrast audit.
