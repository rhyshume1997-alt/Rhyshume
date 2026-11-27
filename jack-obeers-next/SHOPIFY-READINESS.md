# Shopify readiness report (second audit)

Branch: `claude/jack-obeers-beers` only. Nothing merged, nothing deployed to production, no Shopify setting changed, no app trial started, no plan, price or variant created. Design frozen: the membership cards, homepage layout, animations, styling and navigation are untouched.

## How to read this report

- **Audit (reported):** facts from the second read-only Shopify audit you passed on. I have no Shopify admin access and the build environment cannot reach Shopify, so I could not check them myself.
- **Verified here:** checked in the code, against the test shop (a fake Storefront API in `tests/fake-shopify.cjs`), or on the deployed preview's public pages. The test shop is not the real store.
- **Not verified:** stated plainly each time.

## 1. Memberships

| Item | Finding | Source |
|---|---|---|
| Two tiers, The Regular £24.99 and The Legend £39.99 | Kept exactly. Fixed content on `/draught-club`, not sold anywhere | Verified (code) |
| £11.99 draft membership; Appstle lifetime plan on an old event product | Unrelated to the tiers. Left alone. A draft is never returned by the Storefront API, so it cannot reach the site | Audit (reported); draft rule is Shopify behaviour |
| Appstle Beer Club selling plan, 53 products, monthly, 10% off | **Not confirmed as available to customers.** The website has no selling plan code, so it cannot offer it today. Whether Shopify exposes it to this site's Storefront token is unknown | Not verified. `scripts/shopify-audit.mjs` tests it |
| No active subscriptions | Nothing to migrate or break | Audit (reported) |
| Appstle apps installed | Not evidence the apps work with a headless site | By your instruction; see `MEMBERSHIP-INTEGRATION.md` |

How a selling plan would join the basket, and how membership would be verified, are in `MEMBERSHIP-INTEGRATION.md`. Short version: plan ids must be read from Shopify and checked on the server, a plan changes the real price (so the £35 check and totals must use the plan price), and membership status must come from Shopify for a signed-in customer, never from the browser. Not built, because it depends on the audit script's result and decisions listed below.

## 2. Delivery and the £35 / £50 rules

| Item | Finding | Source |
|---|---|---|
| Areas Milngavie, Baljaffray, Strathblane; window 3 pm to 9 pm | Areas are wording only. The window is not shown or enforced | Verified (code) |
| Local delivery and shop pickup disabled in Shopify | So today Shopify offers neither | Audit (reported) |
| UK shipping rates still configured | **Discrepancy:** the website says local only, but a Shopify checkout would still offer UK rates. Turning on local delivery does not remove them. They must be removed or disabled as a separate, approved step, then proved with a test order | Audit (reported) |
| £35 minimum | Exists only in the website (basket button and `/api/checkout`). **Not verified in Shopify.** Shopify has no minimum order setting of its own, so it is not enforced there | Verified (code); Shopify side not verified |
| £50 free delivery | Matches an existing Shopify (UK) rate. **Not an approved local delivery rule.** It only drives the basket bottle, which now says "free local delivery". Kept visible as an open discrepancy | Audit (reported) + code |
| Postcode eligibility | `src/lib/delivery-areas.ts` is ready for an approved list (whole postcode, sector written with a space like "G62 8", or district like "G62"). The list is EMPTY, the check answers "unconfigured", nothing on the site calls it, and it is not described anywhere as enforcement. Tested | Verified (unit tests) |
| Rates by Zip Code (no paid plan), EasyRoutes (no deliveries) | Not usable as they are. No trial started | Audit (reported) |

### Postcode check: what it can and cannot do
The website cannot enforce a postcode: a visitor can still reach Shopify's checkout, which decides what an address can buy. The postcode is typed into Shopify's own checkout, which this site never sees, so the server cannot re-check it. The most the site can do is show a message ("we deliver to this area", from the approved list) and prefill the address. Only Shopify can refuse a rate. See `DELIVERY-PLAN.md`.

### Possible checkout bypasses found (nothing changed, all need a decision)
These matter only once checkout is switched on. Checkout is OFF everywhere.
1. **"Buy now" bypasses everything.** When checkout is on, Buy now is a Shopify cart permalink (`/cart/VARIANT:1`). It skips the website's £35 minimum, the date-of-birth declaration and the cart attributes. It also always buys the default size and one item. Fix before go-live: send Buy now through the same basket checkout path, or remove it.
2. **Shopify's own storefront.** Anyone can build a Shopify cart or checkout link for a product directly on the shop's Shopify address (if the Online Store channel or cart permalinks are reachable). That skips the website's £35 and age declaration entirely. Shopify has no native minimum or age gate; both need a Shopify-side mechanism (a Function or app).
3. **SB Age Verification is not configured**, so Shopify's checkout has no age gate. The site's declaration is only a typed date of birth saved as a cart note, with photo ID asked for at collection or delivery.
4. **Discounts and plans lower the real total after the check.** The £35 check uses full variant prices. A 10% Beer Club price or a discount code can bring the paid total under £35.
5. **Quantity mismatch.** The basket lets a customer add up to 99 in one go (and more in total). `/api/checkout` silently caps each line at 24. A customer could see 30 in the basket and be checked out with 24 without being told, and the £35 check would use 24. Fix: show the same limit in the basket, or reject instead of capping.
6. **Stock is not checked on the website server.** Shopify checkout enforces inventory, so this is not a bypass, but the basket can hold more than is in stock when stock numbers are not shared.
7. **Closed doors, for the record:** prices and variants always come from Shopify, never the browser; subscription and membership products cannot be bought through the basket; a size the customer names must be one the site offers (a 250ml id is ignored); another site cannot call `/api/checkout` (same-origin check); and requests are rate limited.

## 3. Draught beer sizes

Only 500 ml and 1 litre are to be sold online. No current draught product has size variants (audit, reported). Built, and invisible today:
- A product with more than one variant that includes a 500ml or 1 litre one is "size managed". Only the 500ml and 1 litre variants can be bought. A 250ml variant, if Shopify ever has one, is never offered, shown or sold, even if a basket asks for it.
- On such a product the card, product page, shelf and basket show a two-button size choice (500ml first and selected by default, each with its Shopify price), using the existing segmented control. The chosen size travels with the basket line, shows in the basket ("(1 litre) × 2"), is priced per line, and is the variant sent to Shopify. Each size is its own line.
- If the 500ml is sold out the 1 litre is the default. If both are sold out the product shows Sold out.
- Single-variant products behave exactly as before (a lone "750ml" wine is unaffected).
- No variant or price was created. Every figure comes from Shopify.
- Limitation: the card's headline price shows the default (500ml) size; the 1 litre price is in the size button.

### Both sizes from one keg without false stock figures
Shopify counts stock per variant, so selling a 1 litre does not reduce the 500ml count. Showing per-size stock would be wrong. Behaviour built: for a size-managed product the site shows no "Only N left" and applies no stock limit. Options for Michael (decision needed):
- **A. Do not track stock per size for draught (recommended to start).** Availability is controlled by hand: mark the product or the size sold out when a keg is empty. No counts shown.
- **B. One keg-unit product with real stock** (for example one unit = 500 ml), the 500ml variant using 1 unit and the 1 litre using 2, through Shopify's bundle feature or an app. This would give honest counts, but whether it works with a Storefront API cart has to be proven on a development store first.
- **C. Update both counts by hand after every fill.** Not recommended: easy to get wrong.

## 4. Other findings

- SB Age Verification: not configured. No age setting was touched.
- Pickeasy: not fully inspected (data access was requested). Nothing assumed about it.
- Rates by Zip Code: no active paid plan. EasyRoutes: no deliveries. No app was installed and no trial started.
- Appstle Memberships and Subscriptions: installed, not proven to work headless.

## 5. Safe development tasks: what was done

1. **Product and cart integration against the real catalogue.** Read-only, without changing live data. I cannot call Shopify from here, so I checked the deployed preview's public pages (the preview reads the real store): 29 product pages for beer, cider and wine were listed in its sitemap and rendered. Basket and checkout handoff were tested against the test shop only. NOT verified against the real store: stock, variants, selling plans and metafields (the token's values are encrypted in Vercel and I did not decrypt them). `scripts/shopify-audit.mjs` does that read-only check with the real token and must be run by you (see step 3).
2. **Drafts, unavailable products, variants, descriptions.** Verified in code and the test shop: drafts are never returned by the Storefront API; sold-out and unavailable variants show Sold out and cannot be bought; the checkout route refuses them (tests); Shopify descriptions show and win over the built-in text (tests); size handling above.
3. **Metafields and Storefront permissions (ABV, allergens).** Today the site reads ABV from the product title and shows no allergens, and it reads no metafields. Whether ABV or allergen metafields exist and are exposed to the Storefront API, and whether the token can read inventory and selling plans, is NOT known. `scripts/shopify-audit.mjs` reports each of these.
4. **Selling plans and the basket.** Assessed in `MEMBERSHIP-INTEGRATION.md`. Not built, by instruction.
5. **Postcode check.** Prepared with an empty configuration. Not wired in. Not enforcement.
6. **£35 / £50 reconciled** and bypasses listed above.
7. **Complete test suite and visual regression.** See "Evidence" below.
8. **Report updated.** This file, `REV1-CHECKLIST-STATUS.md` (addendum) and `MICHAEL-NEEDS.md`.

## Evidence
(see the section at the end of this file)

## Blockers

1. Shopify still offers UK shipping rates and has local delivery and pickup disabled. Website wording and Shopify disagree until Shopify is changed with approval.
2. No approved postcode list, delivery days, charges, minimum or cut-off.
3. Delivery window and licensing not confirmed (not shown on the site).
4. The real store's Storefront permissions, selling plans and metafields are unverified until the audit script is run.
5. "Buy now", the 24 versus 99 quantity mismatch, the absent Shopify minimum and the unconfigured age verification must be settled before checkout is enabled.
6. Which Shopify mechanism backs The Regular and The Legend is undecided.
7. 500ml and 1 litre variants and prices do not exist; stock model for one keg undecided.
8. Michael's items in `MICHAEL-NEEDS.md` (tap names, allergens, events and the rest).

## Shopify configuration actions requiring approval (none done)

| # | Action | Needs first |
|---|---|---|
| 1 | Enable local delivery for the 13 Station Road location with the approved postcode list, charge, minimum and delivery text | Michael's postcode list, charge, minimum, days; licensing confirmed |
| 2 | Remove or disable the UK shipping rates (do not assume step 1 does it), then run test orders to a UK and a local postcode | Decision that no UK delivery is offered; development store or test gateway |
| 3 | Enable shop pickup for the location, with ready-time text | Michael's pickup rules |
| 4 | Decide how the £35 minimum is enforced in Shopify (a Function or app), or accept website-only and close the bypasses | Scope and price if an app or Function |
| 5 | Decide whether £50 free delivery applies to local delivery, and align the Shopify rate and the basket bottle | Michael |
| 6 | Configure age verification at checkout (SB Age Verification or another), and decide who checks at collection and the door | Licensing and operating plan; app cost |
| 7 | Storefront token permissions: Read inventory; Read selling plans if plans will be used; metafield access if used. Mark `SHOPIFY_STOREFRONT_TOKEN` as Sensitive in Vercel (it is currently flagged readable) | Rhys |
| 8 | Define ABV and allergen metafields and expose them to the Storefront API | Verified allergen data from supplier documents |
| 9 | Create the 500ml and 1 litre variants and prices on draught products, and pick the keg stock model (A, B or C above) | Michael's prices; stock decision |
| 10 | Confirm the Beer Club plan group is available to the Storefront channel; decide which mechanism sells The Regular and The Legend; clean up the £11.99 draft and the lifetime plan | Michael and Rhys; nothing deleted without approval |
| 11 | Pickeasy: grant the requested data access, if inspection is wanted | Rhys. No trial, no install |
| 12 | Set `CHECKOUT_ENABLED=true` in Vercel (last step) | Everything above settled and a full test order passed |

## Evidence

**Complete test suite, final run on this branch:** 263 passed, 3 skipped by design, 0 failed (desktop and iPhone, live-mode build and preview build, run against the test shop). The earlier runs in this round found and I fixed: two size-test expectations (quantity stays after an add, by design), and a real layout bug (below).

New tests this round:
- Sizes in the browser: two sizes show with 500ml first and selected; 250ml never offered; no stock figure or cap; the chosen size is what enters the basket; each size is its own line, priced separately (2 x £9.00 + 2 x £5.50 = £29.00 shown); a sold-out size cannot be chosen and the other becomes the default.
- Sizes at checkout: the chosen 1 litre variant is the one handed to Shopify; a 250ml id falls back to 500ml; no size named gives 500ml.
- Size rules as pure functions, including a lone "750ml" wine and "Default Title" products behaving as before.
- Postcode check: unconfigured until a list is supplied; whole postcode, sector ("G61 4") and district ("G63") matching; "G6" is not "G63"; "G6 1" is not "G61"; the shipped list is empty.
- Checkout handoff against the FAKE Shopify: off by default; valid basket handed over with the right variant and quantity; refused for under £35, no or under-18 age declaration, foreign origin, sold-out product and empty basket.

**Visual regression:** nine pages (home, beers, product, FAQ, events, Draught Club, About, craft beer, gift boxes) at 390 and 1440 wide were photographed before and after this round and compared pixel by pixel: 18 of 18 identical. The membership cards, homepage layout, animations, styling and navigation are untouched. The screenshots use the standard test shop, so no size products appear in them.

**Size layout check:** the size choice was photographed at 360, 390, 768 and 1440 wide with a test product (`sz-all.png`, sent with the delivery message). At 1440 the first version squeezed the beer name to a few letters; fixed with a small rule that applies only to cards that have sizes.

**A bug found and fixed on the way:** in the non-preview (live) look on a phone, the Add button ran 30 px (390 wide) to 60 px (360 wide) past its card, and the page became 411 px wide on a 390 px phone. Contained in every look; the preview look is unchanged (pixel-identical above).

**Not tested, stated plainly:** anything against the real Shopify store; real size variants; selling plans; metafields; real checkout; Safari, Firefox and real phones.
