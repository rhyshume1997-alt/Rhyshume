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
