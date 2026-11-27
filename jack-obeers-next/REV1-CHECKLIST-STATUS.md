# Website updates and content checklist (Rev 1, 27 November 2026): status

Source: the .docx export of the Google Doc "Jack O' Beers & Deli Website Updates and Content Checklist Rev 1" (the Google link itself could not be opened from the build environment). Also read: the repository, the grant approval letter (not part of this scope), the client workbook JSON (its quote and scope sections are empty, so there was no quote to compare against), and the Vercel environment variable NAMES for the project (no values). The tap guide spreadsheet itself was not supplied, only its transcription in section 10 of the checklist.

The checklist records requests, not approvals. DESIGN FREEZE applied: no CSS, layout, typography, animation or component styling was changed in this round. The only visible differences are wording (see "Design freeze evidence" at the end).

Status key: **Done** = built and tested (evidence named). **Partly** = some of it works, the rest is listed. **Missing** = safe to build later, not built. **Blocked** = needs a decision or information from Michael. **Scope** = needs separate approval and price, not built.

## 1. Products, sizes and stock

| Request | Status | Detail and evidence |
|---|---|---|
| Sell draught products in 500 ml and 1 litre sizes, with correct prices and stock | **Partly, Blocked** | The basket, price and checkout code now choose a size by Shopify variant (`src/lib/variants.ts`, optional `v` on a basket line, optional `variant` on `AddToBasket`). No size picker was built (it would change the product card) and no variant was created or priced. The tap guide gives 250 ml and 500 ml prices only, so 1 litre prices are a decision for Michael. Tested: pure functions (`tests/functional.spec.ts`), checkout route reads `v` (`tests/checkout.spec.ts`). Not tested in a browser with a real two-size product, because none exists in Shopify or in the test shop. |
| Keep a current product list in Shopify (beer, cider, wine, deli, hampers) | **Done in code, content unverified** | The site reads every product from the Shopify Storefront API and sorts it by Shopify product type (Beer, Cider, Wine, deli words, Hamper, Event). Vercel has `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_STOREFRONT_TOKEN` set for preview and production. The deployed preview's sitemap lists 29 real product pages from the live store. Whether the store holds every current product, deli item and hamper was not checked (no Shopify admin access). |
| Use the latest tap guide; check missing names, ABVs, prices, allergens | **Blocked** | Nothing from the guide was published or written into Shopify. Taps 5, 12 and 22 have no names, tap 8 has no row, tap 18 name is uncertain, allergens are pending. See `MICHAEL-NEEDS.md`. |
| Useful beer descriptions (style, taste, strength, pairing where confirmed) | **Partly** | New: the description written in Shopify is now shown on the product page and the shelf label, and wins over the built-in text in `src/data/profiles.json` (tested with the test shop). Style and ABV come from the product title and tags. Pairings stay hidden unless confirmed. Allergens are not shown anywhere (see section 8). |
| Explain how staff update descriptions, prices, photos, availability in Shopify | **Done (guide), steps untested** | `MICHAEL-EDITING-GUIDE.md`. The site side of each step is tested against the test shop. The Shopify admin screens were not available, so the clicks themselves were not tested. |
| What happens when something sells out; alternatives; supermarket comparisons | **Partly, Scope** | Sold out works: the card shows Sold out, the checkout route ignores unavailable variants (tested). Suggested alternatives and supermarket comparisons are not built (see the scope list). |
| Artwork for sale; merchandise | **Scope** | Not built. Any product in Shopify with a product type the site does not recognise is not listed. |

## 2. Local delivery, collection and checkout

| Request | Status | Detail and evidence |
|---|---|---|
| Shopify for checkout and payments | **Done in code, switched off** | Basket, then `/api/checkout`, then a Shopify cart and Shopify's own checkout page. Prices and variants always come from Shopify, never the browser. Checkout is OFF everywhere (`CHECKOUT_ENABLED` is not set in Vercel). Tested against the FAKE Shopify only: valid basket hands over the right variant and quantity; refused for under £35, no or under-18 age declaration, foreign origin, sold-out product, empty basket (`tests/checkout.spec.ts`). Never tested against a real store. |
| Keep click and collect | **Partly** | Wording kept on the home page and in the FAQ. Whether Shopify is set up with a pickup location is not known and was not changed. |
| Local delivery only, remove UK-wide | **Done (website wording)** | Home page panel, the "or we deliver" heading, the FAQ and the basket's delivery bottle now say local delivery to Milngavie, Baljaffray and Strathblane. All UK-wide and "internationally" wording is gone (`tests/functional.spec.ts`). International delivery is not offered; it needs an explicit decision if wanted. Live Shopify shipping zones and rates were NOT touched, so they may still offer UK delivery at checkout. |
| Local areas: Strathblane, Baljaffray, Milngavie; confirm full postcode list | **Blocked** | Shown as wording only. No postcode is checked anywhere. Michael has not supplied the list. |
| Show the proposed 3 pm to 9 pm window | **Held** | Not shown. Not published until delivery days, operations and licensing are confirmed. |
| Check the postcode before payment and say if eligible | **Missing, Blocked** | Not built. See `DELIVERY-PLAN.md` for what could really enforce it. |
| What "postcode acceptance at delivery" means | **Blocked** | Question for Michael (see section 5 of the decisions list below). |
| Show 13 Station Road and how it affects delivery | **Partly** | Address is in the footer on every page. How it should influence delivery information is undecided. |
| Delivery charges, minimum order, cut-off, days, failed delivery | **Partly, Blocked** | Minimum order £35 is enforced in the basket and again on the server (tested). The free-delivery fill in the basket bottle still uses the old £50 figure from the UK offer; it is NOT confirmed for local delivery. Charges, cut-off, days and failed delivery arrangements are not decided. |

## 3. Membership card and member offers

**Scope, not built.** Today: the Draught Club page describes the two monthly plans (£24.99 and £39.99). The members area exists only as a demo behind `MEMBERS_DEMO` and no real sign-in is built. Nothing sells a card, restricts a product or gives a member price. See the scope list.

## 4. Events, homepage and Christmas

| Request | Status | Detail |
|---|---|---|
| Upcoming events prominent on the homepage | **Partly** | Events already come from Shopify (product type "Event Tickets" with a `date:YYYY-MM-DD` tag and optional `time:HH:MM`) and show on `/events` and as the Event Tickets tile. Making them more prominent on the homepage is a layout change (frozen) and is listed as a proposal. |
| "What's happening this week" with a simple staff process | **Missing, proposed** | No such section or editable source exists. A proposal is in the scope list. Nothing was built. |
| Owners page to add events | **Not usable today** | The page exists, but Vercel has no `OWNER_USERS`, `SHOPIFY_ADMIN_TOKEN` or `SHOPIFY_PUBLICATION_ID`, so nobody can sign in and events would only be kept in memory. The Shopify event creation code has never been run against a real store. The simplest reliable route is to create the event product in Shopify directly. |
| Enquiry link, booking link or ticket checkout per event | **Blocked** | Michael's decision per event. |
| Christmas look, with an automatic start and end | **Built on the dev branch, scope not confirmed** | 1 Dec 2026 to 1 Jan 2027, London time. Details in `CHRISTMAS-AND-HOMEPAGE.md`. Additional scope for Rhys to agree with Michael: not claimed as inside the £2,000. Not merged or deployed. |
| Permanent "What's Happening This Week" and "Events" homepage sections | **Built on the dev branch, scope not confirmed** | Weekly section needs a Shopify blog `this-week` and the Storefront "Read content" permission (Rhys, awaiting approval). Events reuses the existing event products. |

## 5. Keezer rental and events equipment

**Scope, not built.** No keezer page, booking, availability, deposit or usage-based charging exists in the code.

## 6. Sponsorship, branding and trust

| Request | Status |
|---|---|
| Sponsorships and community involvement | **Scope**, not built. Needs verified names and permission. |
| Consistent branding, original logo | **Done.** The original artwork is used on the home page. |
| Copyright wording, trade mark | **Blocked.** The site makes no trade mark claim (nothing says "registered"); no change made. Needs evidence from Michael. |
| Address, hours, contact, Google Business Profile | **Partly.** Address, phone, hours are in the footer and the Store schema, with the review link and map coordinates. The Google Business Profile itself was not checked. |

## 7. Editing, staff training and handover

| Request | Status |
|---|---|
| Edit products and descriptions in Shopify | **Done (guide), see `MICHAEL-EDITING-GUIDE.md`.** Description changes appear on the site (tested with the test shop). |
| Photos, prices, stock, availability | **Done (guide).** Stock numbers show only if the Storefront token has the "Read inventory" permission (not confirmed). |
| Events, weekly notices, seasonal content | **Partly.** Events through Shopify products only. No weekly notice or seasonal mechanism exists. |
| Membership offers management | **Scope.** |
| Staff guide, tested before handover | **Guide written. Handover test with Michael not done.** |

## 10. Tap guide

Not imported. Not written into Shopify. Not shown on the site. The checks listed in `MICHAEL-NEEDS.md` are all still open.

## Design freeze evidence

Full-page screenshots of nine pages at 390 and 1440 wide were taken before and after the changes, and compared pixel by pixel (see the delivery message for results). The only expected differences are the wording in the home page delivery panel and heading, the FAQ, and the product description line.

## Files changed in this round

`src/lib/shipping.ts`, `src/lib/variants.ts` (new), `src/lib/rev5.ts`, `src/lib/catalogue.ts`, `src/lib/cards.ts`, `src/lib/faq.ts`, `src/app/page.tsx`, `src/app/product/[handle]/page.tsx`, `src/app/api/checkout/route.ts`, `src/components/AddToBasket.tsx`, `tests/functional.spec.ts` (new), `tests/checkout.spec.ts` (new), `tests/seo.spec.ts`, `tests/fake-shopify.cjs`, `playwright.config.ts`, and the documents `REV1-CHECKLIST-STATUS.md`, `DELIVERY-PLAN.md`, `MICHAEL-EDITING-GUIDE.md`, `MICHAEL-NEEDS.md`.

## Remaining decisions needed from Michael

1. The full list of postcodes for local delivery, plus any extra areas. (Do not guess from place names.)
2. Delivery days, hours, charge, free-delivery threshold, minimum order, cut-off time, failed delivery arrangements.
3. What "postcode acceptance at delivery" means: a check before payment, a confirmation at the door, or both.
4. Whether international delivery is wanted at all (the website now says no).
5. Premises licence and operating plan: does it allow delivery, and in which hours? Who checks age at checkout, collection and the door?
6. Click and collect: is a pickup location set up in Shopify, and when is an order ready?
7. 500 ml and 1 litre prices for every draught product, and whether 250 ml is still sold.
8. Names for taps 5, 12 and 22, whether tap 8 is in use, tap 18 exact name, the frizzante producer and spritz recipe.
9. Allergen information from supplier documents for every product, and delivery information for deli items.
10. Which tap products are sold online and which only in the shop.
11. Event dates, venues, ticket prices or booking links, and the weekly announcement text.
12. First release versus later: which items are essential for launch.

## Changes that need scope and price approval (not built)

| Item | What it needs | Likely effect |
|---|---|---|
| Membership card purchase, eligibility, member discounts | Shopify customer accounts, a membership product, member tagging, discount rules or an app, sign-in and cancellation flow, replacing the demo members area | New build, new Shopify setup, possibly an app subscription |
| Restricted or member-only products and pricing | Shopify customer accounts with enforced access (store-level rules or an app); the website alone cannot hide prices securely | New build, depends on Shopify plan and apps |
| Keezer rental booking, usage charges, payments | Booking calendar, availability, deposits, how consumption is recorded, final charge capture, terms | Large new build, payment and compliance review |
| New event ticket checkout | Ticket inventory per event, booking links or checkout, confirmation emails | Extends the existing Shopify event products |
| "What's happening this week" section | Built on the dev branch (see `CHRISTMAS-AND-HOMEPAGE.md`); still needs the Shopify blog and permission, and scope approval | Small build, additional to the agreed scope until confirmed |
| Artwork and merchandise flows | Product types, photos, artist credits, variants, delivery or collection rules | Mostly Shopify content; website work only if new layouts are wanted |
| Christmas homepage look | Built on the dev branch with automatic dates; scope and price to agree | Design work, additional to the agreed scope until confirmed |
| Sponsorship section and third-party logos | Verified names, permissions, a new section | Small design and content build |
| Automatic substitution or supermarket comparisons | Product matching, price data source, wording approval, accuracy and legal review | New build and ongoing data cost |
| Trade mark or legal notice changes | Evidence of registration, approved wording | Content only once evidence is supplied |
| Custom delivery rules beyond Shopify settings (postcode enforcement by custom logic, time slots) | A Shopify Function or an app, depending on plan | New build, see `DELIVERY-PLAN.md` |

## Addendum: second Shopify audit (27 November 2026)

Full detail is in `SHOPIFY-READINESS.md` (findings, checkout bypasses, blockers, and the exact Shopify actions needing approval) and `MEMBERSHIP-INTEGRATION.md`. Changes to the statuses above:

- **500 ml and 1 litre sizes: Partly (was Partly, Blocked).** The website now shows a two-button size choice, buys the chosen size, prices each line and sends that variant to Shopify, but only when a product has those variants. Today none does, so nothing looks different. 250 ml is never offered. No variant or price was created. Tested in the browser and at checkout against the test shop. Not tested against real size variants (none exist).
- **One keg, two sizes:** per-size stock would be false, so size products show no stock figure and apply no stock limit. Stock model decision for Michael (options A, B, C in the readiness report).
- **Postcode eligibility: Prepared, not wired.** `src/lib/delivery-areas.ts` takes an approved list later (empty today, answers "unconfigured"), is unit tested, and is not described anywhere as enforcement.
- **Membership and selling plans: assessed, not built.** Whether the 53-product Appstle plan is available to this website is NOT confirmed; `scripts/shopify-audit.mjs` tests it read-only with the real token and must be run by Rhys.
- **Checkout bypasses found** (checkout is off): Buy now permalink, Shopify's own cart URLs, no Shopify-side minimum, no age verification, discounts after the £35 check, and a 24 versus 99 quantity mismatch. See the readiness report.
- **Fixed on the way:** on a phone the Add button ran 30 to 60 px past its card in the non-preview (live) look, which also made the page wider than the screen. Now contained in every look.
