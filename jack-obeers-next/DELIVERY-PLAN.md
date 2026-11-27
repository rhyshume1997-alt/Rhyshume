# Local delivery and postcode eligibility: plan

## Where things stand

- The website now says local delivery to Milngavie, Baljaffray and Strathblane, with click and collect. It no longer promises UK-wide or international delivery.
- **No postcode is checked anywhere.** The three areas are wording only. A visitor outside those areas can still reach Shopify's checkout, and what happens there depends entirely on the shipping settings in Shopify.
- The website cannot read Shopify's shipping settings, and none were changed. They may still offer UK rates today. Check them in Shopify admin (Settings, Shipping and delivery) before checkout is switched on.
- The proposed 3 pm to 9 pm window is not shown or enforced. Michael has not confirmed delivery days or the licensing position.
- Checkout is off (`CHECKOUT_ENABLED` is not set). Nothing here switches it on.

## Can it be enforced with the existing Shopify setup?

Not by the website alone, and not today. Any check done only by the website is a message, not a control: a customer could still go to Shopify's checkout. Real enforcement has to happen inside Shopify's checkout, by only offering a delivery rate to eligible addresses. The options below are in the order to investigate. None of this was tested: there was no Shopify admin access, so each point needs to be confirmed in the admin or in Shopify's documentation for Michael's plan before it is promised.

1. **Shopify's built-in local delivery (investigate first).** Shopify has a local delivery setting for a shop location, where the delivery area can be set by postal codes (or a radius), with its own price, minimum order and delivery information text. If it is available on Michael's plan, the local rate is offered at checkout only when the address matches, and no other delivery rate is shown. It needs: the full postcode list from Michael; the UK-wide shipping rates removed or disabled in the shipping profile (a change to live Shopify settings, so approval first); and a test order on a development store or with a test payment gateway. Open questions to confirm in Shopify: how UK postcodes are matched (full, partial or outward code only), whether the setting needs the shop's address set as a location, and whether delivery time slots are supported (the information text is free text, not an enforced window).
2. **Shipping zones and rates.** Shopify's zones are normally by country or region, not by postcode, so this is unlikely to be enough on its own.
3. **A Shopify Function or app that hides delivery options unless the postcode is on a list.** This is real enforcement with more control (and could carry time slots or cut-offs), but it is a development task, and custom Functions may depend on the Shopify plan. It is a scope and price item.
4. **A postcode check on the website before checkout.** Useful as friendly information ("Yes, we deliver to G62") but NOT enforcement. If built, it must say so plainly ("This is a guide. Shopify checks your address again at checkout") and should only be added once option 1 or 3 is in place so that the message matches what checkout really does. It is a visual change to the basket, so it needs approval under the design freeze.

## Recommended order

1. Michael supplies the complete postcode list, delivery days and hours, charge, free-delivery threshold, minimum order, cut-off time and failed-delivery arrangement. Do not derive postcodes from place names: a village can span several postcode districts and a postcode can cross a boundary.
2. Michael confirms the premises licence and operating plan allow delivery and in what hours, and who checks age at checkout, at collection and at the door. Until then the 3 pm to 9 pm window stays unpublished.
3. Rhys checks in Shopify (development store first) whether option 1 works for these postcodes on Michael's plan.
4. If it does: set it up on the development store, run test orders with an eligible and an ineligible postcode, then (with approval) change the live settings, remove UK-wide rates, and only then turn checkout on.
5. If it does not: decide between option 3 (price it) and operating without enforcement (checking the address by hand before fulfilling, and refunding or contacting ineligible orders).
6. After enforcement exists, update the website wording to match what is enforced, and (if wanted) add the postcode message from option 4.

## What the website will say until then

"We are setting up local delivery to Milngavie, Baljaffray and Strathblane. Delivery days, times and charges will be confirmed before online ordering opens. The minimum order is £35." It never says a postcode is checked.

## Still unconfirmed in the code

- The basket's delivery bottle still fills toward £50 and says "free local delivery". £50 came from the earlier UK offer and is not confirmed for local delivery. Change `SHIPPING` in `src/lib/shipping.ts` (or ask for the bottle's wording to be removed) once Michael decides.
