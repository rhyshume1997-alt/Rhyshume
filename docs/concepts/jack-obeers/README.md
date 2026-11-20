# Jack O'Beers website concept, Rev 1

Initial design concept by Rhys Hume. Not a live shop. Not an approved project, agreed scope or production build.

- Preview: `p-5c2e81a7f3b04d96/index.html` (design review: `p-5c2e81a7f3b04d96/review.html`). Served at `/p-5c2e81a7f3b04d96/`, noindex, no-referrer, no-store (header rule added to `vercel.json`). Private by obscurity only: not password protected, not in the sitemap or navigation.
- Source of requirements: the Client Workbook JSON for Jack O'Beers (not copied into the repository, it holds client details).
- Existing pages and the eight concepts are untouched. The only existing file changed is `vercel.json` (one added header rule).

## Creative decisions
1. Took Little Kettle's approach (arch window, flat colour, rounded forms, italic serif accents, tactile demos) and redrew everything. No layout or markup copied.
2. Placeholder palette: cream, bottle green, red, brown and amber. Chosen from the brief ("cream with green and red"), not sampled from the logo.
3. Type: Archivo (heavy) with Newsreader italic, both already hosted in the repo under open licences. Dubai was requested but is a Microsoft font with an unchecked web licence, so it is not used. Decision open.
4. The logo was sent as an image in chat and could not be saved to the repo. A text wordmark is used, labelled temporary. `jack-logo.png` placed in the preview folder appears in the header automatically.
5. Opening: letters lie down and stand up in sequence (the client's lying-logo idea), then a drawn bottle tips and a glass fills. Illustration, labelled as such. Reduced motion and no-JS show the finished state. "Becomes the next page" is not built.
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
