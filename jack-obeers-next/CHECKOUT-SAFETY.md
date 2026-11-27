# Checkout safety review

Checkout is OFF everywhere: `CHECKOUT_ENABLED` is not set in Vercel, and `/api/checkout` answers 503 "off" unless it is exactly `true`. Nothing in this review switches it on, and it must stay off until the items marked **blocker** are settled and approved. No chargeable order was placed: all checkout tests ran against a fake Shopify that only records the cart it is given.

## Every way into checkout

| # | Entry point | Before | Now |
|---|---|---|---|
| 1 | Basket "Checkout" button, then `/api/checkout`, then a Shopify cart and Shopify's own checkout page | Min £35, date-of-birth declaration, and server checks. But each line was silently cut to 24, unavailable lines were silently dropped, and every failure showed the same "pop in or call" box | Same checks. The server now **refuses** (with a reason) any quantity over 24, any basket line that names a size we do not offer or that is sold out, a total over 24 for one product and size, and more than 50 lines. Nothing is cut or dropped. The basket explains the reason in plain words instead of the generic box |
| 2 | **Buy now** (shelf cards, product pages, hampers) | A Shopify cart permalink (`/cart/VARIANT:1`): **skipped the £35 minimum and the age declaration** | Fixed. It is now a button that puts the item in the website basket and opens it, so every check applies. It looks the same (same classes). It never builds a Shopify link |
| 3 | **Buy tickets** (events page) | Same permalink bypass | Fixed the same way |
| 4 | Add to basket (all places), pairing "Add", shelf label | Basket only, no checkout | Unchanged, plus the 24 limit |
| 5 | A Shopify cart or checkout link made directly on Shopify's own address | Not under the website's control | **Cannot be fixed by the website. Blocker.** See below |

Tested (`tests/checkout.spec.ts`, against a separate build with checkout switched on and the fake Shopify): no page on the site contains a cart or checkout link; Buy now stays on the site, opens the basket and leaves checkout disabled under £35; a hamper over £35 still waits for the age declaration, then calls the site's own route with the date of birth and confirmation; Buy now is visually different from Add to basket; the basket stops at 24 and a saved basket holding 30 is brought down to 24; the route refuses 25, 99, 0, -1, 1.5, text and null quantities, counts two lines of the same item together, refuses a basket with a sold-out or unknown line whole, and refuses more than 50 lines.

## The one limit

The basket let a customer add 99 of an item while checkout silently cut each line to 24, so a customer could pay for fewer items than the basket showed. There is now one constant (`MAX_PER_LINE = 24`, `src/lib/limits.ts`) used by the basket, the quantity control and the route. The 24 already existed in the checkout code; it is not a new business rule. The £35 is shared the same way (`MIN_ORDER_GBP`).

**Missing stock data is never treated as unlimited.** No product returns a stock figure today, so the 24 cap always applies and the website makes no "in stock" quantity claim. Shopify's checkout remains the final authority on real stock.

## What the website cannot guarantee (needs Shopify enforcement or a decision)

1. **Minimum order (£35), blocker.** Shopify has no minimum order setting. The website enforces it, but anyone who reaches Shopify's checkout another way (a cart permalink on the shop's Shopify address, or any Shopify cart link) is not held to it. Enforcing it in Shopify needs a Shopify Function or an app (scope and price).
2. **Age verification, blocker.** SB Age Verification is not configured. The website's date-of-birth declaration is only a typed date and a tick, saved as a note on the cart. It is not verification. Photo ID at collection or the door is an operating rule, not code. Alcohol-sale compliance needs the premises licence and operating plan confirmed by Michael, and a Shopify-side age gate if one is required.
3. **Discounts and plans lower the real total after the £35 check.** The check uses full prices. A discount code, an automatic discount or a selling plan price can bring the paid total under £35. Fixing it needs a Shopify-side rule.
4. **UK shipping rates are still configured in Shopify, blocker.** The website says local delivery only, but a Shopify checkout would still offer UK rates until they are removed (an approved Shopify change).
5. **Direct Shopify links, blocker.** See entry 5 above and item 1.
6. **A £0.00 price.** The website would sell a published product at £0.00. Drafts never reach the website, so today nothing is affected. A guard is a business-rule decision (see `PRODUCT-RECONCILIATION.md`).
7. **Date of birth: fixed.** It is used once to check "18 or over" and is no longer saved on the Shopify cart or order (only a record that an online declaration was made, plus the photo ID rule). A declaration is not age verification and does not by itself satisfy licensing. A privacy notice is still missing (`FOLLOW-UP-REVIEW.md` section 2).
8. **The rate limit (8 checkouts a minute per visitor) is kept in memory on each server instance.** Measured: the same visitor got 16 allowed across two instances. The visitor-address, counter-wipe and IPv6 weaknesses were fixed; the per-instance count needs a shared store or a Vercel Firewall rule (Rhys's approval; costs unverified). See `FOLLOW-UP-REVIEW.md` section 3.
9. **The basket lives in the visitor's browser.** Prices and variants are never taken from it (the server re-reads both from Shopify), so changing it cannot change a price, but it can be edited. The server checks every line.

## Limitations of this evidence

Everything above was tested against a fake Shopify (`tests/fake-shopify.cjs`) that mimics the Storefront API for products and `cartCreate`. It does not model Shopify's real checkout, shipping rates, discounts, inventory enforcement, taxes, age checks or payment. Nothing was tested against the real store's checkout, because the rules were to keep checkout off and place no orders. A real test order on a development store or with a test gateway is still needed before checkout is enabled.
