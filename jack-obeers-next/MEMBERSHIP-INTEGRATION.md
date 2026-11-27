# Memberships and selling plans: how they could connect to the website

Status: ASSESSMENT ONLY. Nothing here creates a plan, changes billing, activates a purchase, or touches the existing membership cards. The two cards (The Regular £24.99 a month, The Legend £39.99 a month) and their design are unchanged.

## What exists today

On the website (checked in the code):
- The two tiers are fixed content on `/draught-club` (prices typed in from the leaflet). The button is "Ask about joining", a phone link. Nothing sells them.
- There is no selling plan code anywhere: no `sellingPlanGroups` in the product query, no plan id in a basket line, no `sellingPlanId` sent at checkout.
- Products whose Shopify type contains "subscription" or "membership" are sorted into a `subscriptions` category and deliberately kept out of the basket.
- The members area runs only as a demo (`MEMBERS_DEMO`). Its sign-in cookie is a preview tool and must never be used live. No real sign-in or membership check exists.

In Shopify (from the second audit, as reported to me; I have no Shopify admin access and could not check it):
- Appstle Memberships and Appstle Subscriptions are installed.
- Appstle has an active "Beer Club" selling plan on 53 products: a monthly purchase option with 10% off. No active subscriptions.
- An unrelated £11.99 draft membership, and an Appstle lifetime plan attached to an old event product.

Installing an app is not evidence that it works with a headless website. Appstle's storefront widgets are built for Shopify themes. This site has to draw its own plan choice and send the plan to Shopify itself.

## Is the 53-product plan actually available to customers?

Not confirmed. A plan existing in Appstle does not mean the website can offer it. For the headless site to offer a plan, all of these must hold:
1. The plan group is attached to the product AND available to the sales channel the website's Storefront token uses.
2. The Storefront token has the permission to read selling plans (`unauthenticated_read_selling_plans`).
3. The plan appears on the variant the site sells (`sellingPlanAllocations`).

I could not test any of these from here. `scripts/shopify-audit.mjs` tests exactly this, read-only: it reports whether the token can read selling plans at all, which plan groups it sees, on how many products and with which plan ids. If it reports `sellingPlans.readable: false`, or the Beer Club group is missing from `groups`, the plan is NOT available to this website, whatever the Appstle dashboard says. Run it on your own computer with the two Shopify values from Vercel; do not paste them into a chat.

## How a selling plan would reach the current basket (design, not built)

1. Read: a separate, optional product query (like the existing stock query, so a missing permission can never break the catalogue) returns each variant's `sellingPlanAllocations` (plan id, name, options, price adjustment).
2. Choose: a plan choice appears only on products that have a plan, and only after Michael approves its place on the card (a design change, so frozen until then).
3. Carry: a basket line gains an optional `sp` (selling plan id), next to the optional variant `v` already added. A line with a plan and the same product without one must be different lines.
4. Send: `/api/checkout` adds `sellingPlanId` to the cart line. The server must NOT trust the id from the browser: it must check that the id is one of that variant's real plan allocations from Shopify, otherwise ignore it. Prices must then come from the plan's own price adjustment, not the variant price, or the £35 minimum and the totals shown will be wrong (10% off changes the real price).
5. Buy: Shopify's checkout takes the payment and creates the subscription contract. Appstle then manages it. Whether that works for a cart made by a custom site has to be proven by a test purchase on a development store or a Shopify test-mode gateway. It has not been tried. Shopify subscription checkouts normally require the customer to have an account; confirm how that behaves from a Storefront-API cart.

Why it is not built: it needs the audit result above, a decision on which Shopify mechanism backs which offer (next section), and a design for the plan choice. Building it before then would mean guessing.

## The Beer Club plan and the two membership cards are different things

- Beer Club (Appstle selling plan): "subscribe to a product, monthly, 10% off" on 53 products.
- The Regular and The Legend (website cards): a monthly membership with benefits (10% off fills, members-only beers, event priority, included beers on the leaflet).
These are not the same offer, and the audit found nothing in Shopify that sells either tier today. Decisions needed from Michael and Rhys, in this order:
1. Is the Beer Club plan wanted at all, and is it meant to be the same thing as a tier? (If not, it is a separate product subscription and should not be offered next to the tiers without a clear explanation.)
2. Which Shopify product and plan sells The Regular at £24.99 and The Legend at £39.99? The £11.99 draft and the lifetime plan do not match either tier and should not be reused or deleted without approval.
3. Is a tier a recurring monthly charge (a selling plan) or something else? The checklist also asks for a card-style, non-recurring concept; that is a different build.

## How membership status would be verified before giving member benefits

Rule: membership status must be decided on the server from Shopify's records for a signed-in customer. It must never come from the browser (a cookie, a local storage flag, a URL).

Needed, none of it built:
1. Real customer sign-in. Shopify's customer accounts are the intended route (the code already says so in `src/lib/members.ts`). The preview-only `jo_member` demo cookie must be removed from the live build or stay disabled.
2. A source of truth for "this customer has an active tier": for example an active subscription contract from Appstle, or a customer tag or metafield that Appstle Memberships sets. Which one Appstle Memberships actually writes, and whether the website can read it with a Storefront or Customer Account token or only with an Admin token, must be confirmed with a test customer. The site must never hold an Admin token in the browser.
3. Benefits enforced in Shopify, not on the website: member discounts as Shopify discounts tied to the customer, so a customer cannot get a benefit by editing the page. The website should show or hide offers, never decide prices.
4. Expiry and cancellation: the check must run at each use and at checkout, not once at sign-in.

## Exact things that need approval before any of this can proceed

See "Shopify configuration actions requiring approval" in `SHOPIFY-READINESS.md`.
