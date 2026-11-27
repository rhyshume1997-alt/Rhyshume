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

## Addendum: enforcing entitlement, included beers and discounts without trusting the frontend

The two cards, their prices and their advertised benefits stay exactly as they are. Shopify's membership configuration does not yet match them (it has an unrelated £11.99 draft, an Appstle lifetime plan on an old event product, and a Beer Club plan on 53 products), and nothing here changes Appstle plans or turns on recurring payments. This is what would have to exist for each benefit to be real. None of it is built, and each item needs Rhys's approval and a price.

The rule for all of it: the browser is only ever allowed to show a benefit. The decision that someone is a member, and every discount or allowance, must be made on a server or in Shopify, from Shopify's own record, every time it is used.

| Benefit on the cards | What enforces it | Can the website alone enforce it? |
|---|---|---|
| **Being an active Regular or Legend** | The state of the person's subscription contract in Shopify (active, paused, cancelled, past due), read server-side with a server-only credential for a signed-in customer, checked at each use, never from a cookie or stored flag. Which tool writes that state (Appstle Memberships, Appstle Subscriptions or a customer tag) has to be proven with a test customer, because installing the apps shows nothing about a headless site | **No.** It needs customer sign-in (not built) and a server credential held only in Vercel |
| **10% off all fills** | In the shop: staff apply it at the till against the customer. Online: a Shopify automatic discount restricted to eligible customers (a customer segment based on a tag or subscription status; whether the plan supports it has to be checked). The website may show the discount; Shopify applies it, so it cannot be gained by editing a page | **No.** Shopify must apply it |
| **Included beers each month (3 x 500 ml in The Regular, 5 x 500 ml in The Legend)** | Shopify has no monthly allowance. Realistic options: (a) the subscription itself carries the included beers as part of what the monthly charge covers and they are prepared for collection; (b) a monthly store credit or gift-card balance topped up when the contract renews and spent at checkout; (c) counted by hand at the till. Whatever is chosen, the count must live in Shopify or an app, not on the website | **No.** Needs a Shopify mechanism or app, plus an approved rule for unused beers and for cancelling mid-month |
| **Members-only beers, early access to kegs, event priority** | Hiding a product on the website is not enforcement: anyone with its Shopify address could still buy it. For a real restriction Shopify must refuse the sale unless the customer is eligible (a checkout validation Function or an app; whether a custom Function is allowed depends on the Shopify plan). The website's own `/api/checkout` can also check entitlement before it makes a cart, but that does not stop a direct Shopify link | **Partly.** The website can hide it and refuse its own checkout; only Shopify can stop a direct purchase |
| **Free event ticket (The Legend)** | A discount or a $0 ticket line tied to the same entitlement and limited to the right events, with a limit of one per customer per event | **No.** Same as above |
| **Stopping benefits when someone cancels or lapses** | The same live check on every use. Cancellation and pause are handled by the Appstle or Shopify customer portal | **No.** Needs the live check |

### What the website's checkout would need (when approved)
1. Real customer sign-in through Shopify's customer accounts (the preview-only demo cookie is switched off for the live site and must stay off).
2. A server-held credential with read access to subscription contracts or customer tags, used only on the server.
3. In `/api/checkout`: confirm the customer is signed in, look up their current contract status, and then apply the discount through the cart's discount code or leave it to a Shopify automatic discount. The browser sends no price, no discount and no "I am a member".
4. Recorded on the order (as cart attributes or the contract itself) so Michael can see on each order that a benefit was applied and why.

### Questions that decide the design
1. Is a tier a recurring monthly charge through an Appstle selling plan, or a different kind of card? (The checklist also describes a one-off, card-style concept. These are two different builds.)
2. What does "included beers" mean in practice if a member does not collect them, or cancels mid-month?
3. Is "fills" the in-shop draught fill only, or also bottled products online?
4. Does the Beer Club plan (10% off a monthly product subscription) stay, change or go? It is not the same offer as either card.
