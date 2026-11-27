# Consolidated catalogue and checkout review

Branch `claude/jack-obeers-beers` only. Nothing merged, nothing deployed to production, no live Shopify change, no product, price, plan or stock created, no order placed. Checkout is OFF and stays off. Design frozen.

## Readiness decision

- **Checkout: NOT READY. Keep it disabled.** Four blockers sit outside website code (below). The internal bypasses the website could close have been closed.
- **Website on the preview: ready for Michael's review.** It is not ready to merge or go live until the live Shopify items and Michael's information are settled.
- **Everything unapproved is disabled or hidden:** checkout (`CHECKOUT_ENABLED` unset), size choice (no product has size variants), postcode check (empty list, not wired in), selling plans and membership purchase (not built), delivery and collection (disabled in Shopify, wording only on the site).

## Code changes and commits (all on `claude/jack-obeers-beers`)

| Commit | What |
|---|---|
| `f9bf0d9` | Buy now and Buy tickets no longer use a Shopify cart permalink: they are buttons (same look) that put the item in the website basket and open it, so the £35 minimum and the age declaration always apply. One shared limit of 24 per item and size (`src/lib/limits.ts`) used by the basket, the quantity control and the checkout route. The route now refuses instead of silently cutting or dropping lines: quantity over 24 (also across two lines of the same item), more than 50 lines, a sold-out or unknown line, a named size we do not offer. A basket saved with more than 24 is brought down to 24 on load. Missing stock is never read as unlimited. Shopify descriptions are shown in full so allergen wording at the end is never cut off. Test fixtures for events with no date or a past date, a product with no variants and a product with no information |
| `bca0f6e` | A checkout refusal with a reason (sold out, over the limit, too many tries) is now explained in the basket instead of the generic "pop in or call" box. `CHECKOUT-SAFETY.md` and `PRODUCT-RECONCILIATION.md` |
| `4859435` | Membership: how entitlement, included beers and discounts could be enforced beyond the frontend (assessment only) |
| `7064c33` | Product reconciliation updated with the tap guide reference's descriptions, ABV conflicts and allergen notes |

Files: `src/lib/limits.ts` (new), `src/lib/rev5.ts`, `src/app/api/checkout/route.ts`, `src/lib/catalogue.ts`, `src/lib/cards.ts`, `src/components/AddToBasket.tsx`, `src/components/ProductGrid.tsx`, `src/components/HomeSections.tsx`, `src/app/product/[handle]/page.tsx`, `src/app/events/page.tsx`, `tests/checkout.spec.ts`, `tests/functional.spec.ts`, `tests/fake-shopify.cjs`, `MICHAEL-EDITING-GUIDE.md`, `.gitignore`, plus the documents named above.

## Test results

Complete regression suite on the final code: **275 passed, 3 skipped by design, 0 failed** (desktop and iPhone, live-mode build and preview build, run against the fake Shopify).

New or changed coverage this round:
- **Checkout** (a separate build with checkout switched on, fake Shopify, no real order): no cart or checkout link anywhere on the site; Buy now stays on the site, opens the basket and leaves checkout disabled under £35; a hamper over £35 still waits for the age declaration and then calls the site's own route with the date of birth and confirmation; Buy now is visibly different from Add to basket; the basket stops at 24 and says so; a saved basket of 30 loads as 24; the route refuses 25, 99, 0, -1, 1.5, text and null quantities, counts two lines of one item together, refuses a basket with a sold-out or unknown line whole, refuses more than 50 lines and a size that is not offered; refusals are explained in the basket and a real failure still shows the pop in or call box; checkout is off by default.
- **Catalogue behaviour:** events with no date or a past date never show and a real upcoming one does; a product Shopify returns with no variants is left out; a product with no information renders without "undefined", "NaN" or "null" and with no invented allergen text; a sold-out product shows Sold out, cannot be added and keeps its price; a description with its allergen sentence at the end is shown in full.
- **Sizes** (from the previous round, re-run): the picker appears only for products with 500ml and 1 litre variants, a 250ml variant is never offered, the default is 500ml, missing stock shows no figure and applies only the 24 cap.

## Visual and layout evidence, and the "18 identical" question

- **Preview look:** nine pages (home, beers, product, FAQ, events, Draught Club, About, craft beer, gift boxes) at 390 and 1440 wide, before and after this round: **18 of 18 pixel-identical**.
- **Reconciling the earlier report.** The earlier "18 of 18 identical" covered the **preview look only**. The mobile Add button correction was a fix to the **live-mode look** (no `data-look`), which that comparison never photographed, so the two statements do not conflict: the preview look did not change, and the live look was deliberately changed because it was broken. Measured before the fix: on a 390 wide phone the Add button ran 30 px past its card (right edge 382 against 354 for the card) and the page was 411 px wide; at 360 wide it ran 58 px past (382 against 324). Measured after: right edge 336 against 354 (390 wide) and 306 against 324 (360 wide), and the page is exactly the screen width (390 and 360). A before photograph exists (`live-card.png`, sent with the report); the live look has no full-page baseline, so this is a measured fix, not a pixel comparison. There was also an interim state in which a CSS merge of mine changed the Add button width in the preview look on five phone pages; it was found by the comparison and corrected before the final 18-of-18 result.

## Limits of the evidence

- Everything for products and checkout was tested against the **fake Shopify** (`tests/fake-shopify.cjs`). It mimics the Storefront API for products and `cartCreate`, and records the cart it is given. It does not model Shopify's real checkout, shipping rates, discounts, inventory, taxes, age checks or payment. Nothing was tested against the real store's checkout.
- The real catalogue was read only through the deployed preview's rendered pages (34 beer, cider and wine products). Stock, selling plans, metafields and Storefront permissions of the real store are unverified; `scripts/shopify-audit.mjs` checks them read-only and must be run by Rhys with the real token.
- Not tested: Safari, Firefox, real phones, real size variants, selling plans.
- The tap guide .xlsx was received later and checked against the Markdown reference: no differences (see `PRODUCT-RECONCILIATION.md`).

## Unresolved checkout risks

Blockers (checkout stays off until each is settled): (1) no minimum order in Shopify, so direct Shopify links skip the £35; (2) age verification not configured in Shopify; (3) UK shipping rates still configured; (4) direct Shopify cart or checkout links cannot be blocked by the website. Also: discounts and plans lower the paid total after the £35 check; a £0.00 published price would be sold at £0.00; the date of birth is stored on the order as a cart attribute; the rate limit is per server instance. Details in `CHECKOUT-SAFETY.md`.

## What is left, in four lists

**1. Website work (no new approval needed, or small decisions)**
- Run `scripts/shopify-audit.mjs` against the real token (Rhys) and then record the result: permissions, selling plans, metafields.
- Wire the postcode check in only after an approved list exists, worded as information, never as enforcement.
- Show allergen text only from a verified metafield, once one exists and the audit confirms it is exposed.
- When real size variants exist, check the size choice on the real data at 360, 390, 768 and 1440.
- Decide: a guard refusing a £0.00 drink; storing "18 or over confirmed" instead of the date of birth on orders; whether Buy now opening the basket is how Rhys wants it to work.
- Review the "Delivery: How we send things" menu wording once the delivery decision is made.

**2. Michael's information**
- The tap guide checks: names for taps 5, 12, 22; tap 8; tap 18 name; frizzante producer; spritz recipe; keg labels for ABV (tap 2 has a 4.0% draught version, tap 11 has three different figures); verified allergen declarations; which taps are sold online; 1 litre prices; the Shopify prices against the guide (two Sheppy's ciders differ); which wall-tagged products are still on tap.
- Better photographs for the low-resolution products; supplier documents for allergens.
- The postcode list, delivery days, hours, charge, minimum, cut-off; collection rules; licensing and who checks age.
- Events and weekly notice text; which Shopify mechanism backs the Regular and the Legend.

**3. Live Shopify changes needing approval (none made)**
- Everything in the twelve-row table in `SHOPIFY-READINESS.md` (local delivery with an approved list; removing UK rates; pickup; minimum order mechanism; £50 rule; age verification; token permissions and marking the token Sensitive; ABV and allergen metafields; 500 ml and 1 litre variants, prices and keg stock model; Beer Club and membership mechanism; Pickeasy; checkout switch last).
- Plus from this review: unpublish or retag the wall-tagged products that are off tap; tidy the Švyturys, Ursus, Sheppy's and Jet Lag description wording; archive the leftover sample and expired events; fix the draft £0.00 price before it is published; check inventory counts before granting "Read inventory".

**4. Additional scope needing Rhys's approval and a price**
- Membership purchase and enforcement (customer sign-in, subscription contract checks, discounts, included beers); member-only products; keezer booking; a Shopify-side minimum order and age gate (a Function or app); postcode enforcement in Shopify (local delivery area or a Function); a "What's happening this week" section; allergen and ABV display from metafields; supermarket comparisons and substitution; Christmas look; sponsorship section; artwork and merchandise flows.
