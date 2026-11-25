# Jack O' Beers & Deli: implementation preparation

Date: 25 November 2026. Status: **planning only**. Nothing here has been built, deployed or connected to any live system.

Labels used throughout: **[CONFIRMED]** came from the client workbook, the quote PDF or the client's emails. **[ASSUMED]** is my reading, needs a yes/no. **[SUGGESTED]** is my idea, not agreed.

## 0. Read this first: three findings

1. **The quote and the brief do not describe the same job.** Quote Q-2026-0101 (12 Nov 2026) is "Website, Standard", £2,000, with "Online shop: existing, no extra cost: we connect the new website to the shop you already run". A headless Next.js storefront on the Shopify Storefront API, with custom product pages, click and collect, delivery rules and customer accounts, is a larger build than "connect to an existing shop". I have not changed the price or the scope. Decide with the client, in writing, which of these applies before work starts (see section 6).
2. **There is no Next.js repo for this project.** This repository (`Rhyshume`) is a static HTML site on Vercel. The only Next.js repo reachable is Build AI Here, a different business, which its own instructions say not to touch. "Use the existing stack" therefore means a new, separate Next.js project. I have not scaffolded it (see section 8).
3. **Start is gated.** The quote says the start date depends on the grant being approved and it is not a contract until signed. I can't see a signed copy. No paid implementation should begin until grant approval and written acceptance, as you set out.

## 1. Confirmed requirements

From the workbook (`meet` section, client's own words) and the quote.

| Area | Confirmed |
|---|---|
| Business | Best of British beers, ciders, wines and British food. Mix of customers, main target young families. Reached via Google, Instagram, Facebook. |
| Systems | Shopify store exists. DNA till service exists. No current website. Client has the domain. |
| Main goal | Buy online. Also: click and collect, shipping, hampers, rental (keezer) units. |
| Pages/features ticked | Services, gallery, contact, catalogue, shop, customer accounts, plus "membership area". |
| Product pages | Two-click route: click a beer, see a description underneath with in-depth flavour profile, food pairings, allergens. |
| Look | Warm, friendly, rounded, homey, "New York deli". Colours and fonts from the logo. Client mentioned the Dubai font. |
| Logo | Client says the logo is perfect. Lying-down logo animates to stand up and leads into the next page. |
| Motion | Bottle filling a glass; brown beer-bottle cursor; vector/rounded, soft faded corners that blend into the background, "not blocky". |
| Imagery | Client will take new photos of the shop. Some beer photos exist; more needed. Some videos exist; "need some professional ones". |
| Content | Client supplies all content. |
| Keezer idea | Two kegs for keezer units; charge for what is used; customer picks dates. |
| Access | Client's note: "need access to the API". |
| Commercial | £2,000 one-off, not VAT registered. 50% (£1,000) before work, 50% on completion. Care plan £60/month, kept apart. Domain, hosting, platform fees separate. Dates depend on client content and answers. Quote valid to 12 Dec 2026. |
| Law | Scottish jurisdiction noted in the workbook. |

**Not confirmed** (so not requirements yet): Dubai font licence, membership design, keezer booking and pricing, international alcohol delivery, whether accounts are wanted at launch, animation scope.

## 2. Missing client assets and access

| Need | Why | Status |
|---|---|---|
| Signed quote and grant approval | Gate for starting | Not seen |
| Shopify store URL (`xxx.myshopify.com`) and a collaborator or staff invite for Rhys | Everything below | Not supplied |
| Which Shopify plan, which apps installed (POS, DNA sync, shipping, age check) | Decides what is possible | Unknown |
| How DNA till data reaches Shopify (native sync, third-party connector, manual) | Stock accuracy | **Unknown. Must be established before any integration is proposed.** |
| Product data: titles, descriptions, flavour, pairings, allergens, ABV, size, images | Product pages | Partly in Shopify (unchecked) |
| Logo in vector (SVG/AI/PDF), exact colours, lying-down version | Branding and animation | Client says have logo; file not received |
| Dubai font licence (web use) | Font | Unverified |
| Shop photos and video (Rhys shooting) | Imagery | Planned, not done |
| Premises licence and operating plan; whether off-sales and delivery are covered | Alcohol sales | Not seen |
| Delivery area, couriers, prices, click and collect times and process | Checkout rules | Unset |
| Opening hours (Tuesday unconfirmed), phone, email, social links, Google profile | Contact page | Mostly known, Tuesday open |
| Hamper contents and prices | Hampers page | Unset |
| Domain registrar login route (not the password; use delegated access or have the client make DNS changes) | Go live | Client owns domain |
| Privacy contact details and who is data controller | Legal pages | Unset |

## 3. Shopify integration plan

Principle: Shopify stays the only system for products, stock, cart, orders and hosted checkout. The website holds no product database, stock or payments.

**Nothing below has been tested against the real store.** The earlier JS adapter only ran against a mocked endpoint.

1. **Storefront API.** GraphQL, public access token (safe in the browser by design, limited to storefront read and cart). Create a custom app or Headless channel in Shopify admin. Version pinned (for example the latest stable at build time; check before use).
   - Storefront scopes needed: read products and variants, read collections, read inventory ("unauthenticated_read_product_inventory"), read product tags, read metaobjects/metafields, write and read checkouts/carts (`unauthenticated_write_checkouts`, `unauthenticated_read_checkouts`), customer read/write only if accounts approved.
   - Admin API token: **not needed** for the core build. If ever needed, server only, in Vercel environment variables, never in the browser.
2. **Products and collections.** Collections: Beer, Cider, Wine, Deli, Hampers (names to confirm). Products carry metafields in a `custom` namespace for flavour profile, pairings, allergens, ABV, volume, origin. These must be created and filled in Shopify admin by the client or by Rhys with access. **[SUGGESTED]**
3. **Inventory and availability.** Read `availableForSale` and `quantityAvailable` from the Storefront API. If DNA does not sync to Shopify, the site can show only what Shopify believes; overselling risk then sits with the shop. Output of the DNA investigation decides whether online ordering of stock-limited items is safe.
4. **Cart.** Use Storefront `cartCreate`, `cartLinesAdd`, `cartLinesUpdate`, `cartLinesRemove`, `cartAttributesUpdate`. Store only the cart ID in a cookie/localStorage so the cart survives reloads.
5. **Checkout.** Redirect to `cart.checkoutUrl` (Shopify-hosted). No custom payment form, no card data on the site.
6. **Click and collect.** Preferred: Shopify local pickup at the shop location, which gives a native pickup option at checkout. Site shows pickup hours and instructions. Needs: the shop set up as a Shopify location with pickup enabled. Collection must include an age check at handover (see section 7).
7. **Delivery.** Configured in Shopify shipping profiles and zones, not in site code. The site shows the information page and may show an estimate from the cart's `deliveryGroups`. Alcohol delivery stays off at launch.
8. **Customer accounts.** Shopify's new customer accounts use the Customer Account API and OAuth with hosted login. Only if approved. The simplest option is a link to Shopify's hosted account page, which is cheaper and safer. Membership is out of scope until specified.
9. **Credentials needed from the client (never pasted into chat or committed):** store domain, a collaborator invitation, and a Storefront access token generated in admin, placed straight into Vercel environment variables (`SHOPIFY_STORE_DOMAIN`, `SHOPIFY_STOREFRONT_TOKEN`). Passwords, card details and private keys are never requested.
10. **Webhooks/revalidation.** Optional later: Shopify webhook to revalidate cached pages when products change. Needs a secret in env vars. **[SUGGESTED]**

## 4. Proposed website structure

All pages **[SUGGESTED]** except where the workbook lists the feature.

- Home (logo stands up, leads into the shop; featured collections; find us)
- Beer: catalogue and product pages (flavour profile, pairings, allergens, ABV)
- Cider and wine: same templates
- Deli: catalogue and product pages
- Gift hampers
- Cart, then Shopify hosted checkout
- Click and collect
- Delivery information
- About
- Contact and event enquiries (form with spam protection, goes to sales@jackobeers.com)
- Account (link to Shopify hosted account, if approved)
- Legal: privacy, cookies, terms, allergen notice, alcohol and age policy
- Held back until separately approved: keezer rental, membership, international delivery

## 5. Photography and video specification

Rhys is shooting. Design uses real images, with clearly labelled placeholders only where a shot is missing.

| Subject | Shots | Ratio and size | Format and budget |
|---|---|---|---|
| Exterior | Front, signage, street, day and golden hour | 16:9 and 4:5, 3000px long edge | Source RAW/HEIC; deliver AVIF + WebP + JPEG, hero ≤ 200 KB, other ≤ 120 KB |
| Interior | Counter, shelves, fridges, seating | 16:9, 3:2 | Same |
| Beer and cider | Each product front-on, plain or soft background, plus mood shots | 4:5 product, 1:1 card; 2000px | ≤ 80 KB card, ≤ 150 KB detail |
| Wine | Bottles, labels readable | 4:5 | Same |
| Deli | Counter, produce, close-ups | 4:3, 1:1 | Same |
| Hampers | Whole hamper, contents laid out | 4:5, 3:2 | Same |
| Pouring footage | Pour into a glass, side-on, steady, plain background | 16:9 and 9:16; shoot 4K 50/60 fps | Delivered H.264 and AV1/VP9 or HEVC where supported; 1080p, ≤ 1.5 MB per 6 s loop hero, ≤ 3 MB maximum; muted, poster frame |
| Keezer equipment | Unit, taps, kegs (for later phase) | 3:2 | Same as images |
| Logo animation | Vector logo and a lying-down version, separate layers | SVG | Prefer CSS/SVG animation, under 30 KB; fallback is a static logo |

Accessibility: every image gets meaningful alt text written with the client; decorative images get empty alt. Video is muted, never autoplays under `prefers-reduced-motion` (poster shown instead), has no essential information in it, and has a captions or text equivalent where speech is used.

Total page weight target **[SUGGESTED]**: home under 1.5 MB on first load excluding video; video loads lazily.

## 6. Scope: inclusions and exclusions

Quote basis (confirmed): website, Standard, connected to the existing Shopify shop, £2,000.

| Item | Position |
|---|---|
| Responsive website using real photos | Within quote **[ASSUMED]** |
| Connect to existing shop | Within quote (stated) |
| Homepage, About, Contact, product/collection pages | Within quote **[ASSUMED]**, page count not in the quote PDF |
| Hosted checkout via Shopify | Within quote **[ASSUMED]** |
| Click and collect (via Shopify pickup) | Needs decision |
| Delivery information page | Needs decision (information only is cheap; delivery rules are Shopify config) |
| Gift hampers | Needs decision (a collection page is small; a builder is not) |
| Custom headless Storefront API build in Next.js | **Needs decision. Likely larger than Standard.** |
| Customer accounts | Needs decision |
| Animations (logo stand-up, pour, bottle cursor) | Needs decision; ideas from the meeting, not approved extras |
| Keezer rental with dates and usage pricing | **Excluded** until separately scoped and priced |
| Membership area | **Excluded** until separately scoped |
| International alcohol delivery | **Excluded** |
| Alcohol delivery at launch | **Excluded** until compliance verified |
| Photography and video production | Client/Rhys supply; not in the quote |
| Domain, hosting, Shopify fees | Separate, paid to providers |
| £60/month care plan | Separate monthly |

Any item marked "needs decision" that goes ahead beyond Standard should be quoted separately and accepted in writing. The £2,000 does not change silently.

## 7. Legal and technical blockers

Prompts to verify with the client, the licensing board and a Scottish licensing solicitor. This is not legal advice.

- **Premises licence and operating plan**: confirm it permits off-sales, and whether it covers sales by mail order, online or delivery.
- **Licensed hours for off-sales**: the website must not take or release alcohol orders outside permitted hours; collection windows must sit inside them.
- **Age verification**: a self-declared "I am over 18" gate is not verification. Needs a decision on the check at order, at collection and at delivery.
- **Courier handover checks**: courier must be contractually required to check age on handover and refuse if unverified.
- **Minimum unit pricing** (Scotland): every alcohol line must meet the minimum price per unit. Check prices against current rate before listing.
- **Delivery records**: licensing rules expect records for deliveries (what, where, when, who received). Decide how Shopify orders become that record.
- **Destination restrictions**: where the shop may deliver, and what is allowed to leave Scotland or the UK. Out of the UK is excluded.
- **Payment capture**: manual capture is not assumed to satisfy the licensing law. Shopify's normal capture settings are not to be changed without approval.
- **Food allergen information**: allergens must be shown for deli and any food product, and consistent at the point of sale.
- **Privacy and cookies**: privacy notice, cookie banner only if non-essential cookies/analytics are used, contact form data handling.
- **Technical**: DNA till to Shopify sync unknown; Shopify plan features; custom domain DNS; Dubai font licence; GSAP licence terms if used (unverified).

Until these are resolved: alcohol checkout and delivery stay disabled; click and collect for alcohol stays off.

## 8. Implementation sequence

Nothing starts before grant approval and written acceptance.

1. Written acceptance of requirements and quote; scope decisions from section 6.
2. Shopify discovery: store access, plan, apps, DNA sync, products and metafields (read-only).
3. Compliance review with client; decide alcohol policy.
4. Create a **new** private repo for the site (not this one, not Build AI Here). Next.js App Router, TypeScript strict, Tailwind, Vitest, Playwright, pnpm. Justify dependencies.
5. Isolated design prototypes with placeholder data and real photos as they arrive. No credentials.
6. Shopify read-only integration against a development store or the real store's catalogue with a read-only token.
7. Cart and hosted checkout redirect, tested with Shopify's test mode on a development store, not with live payments.
8. Content, product metafields, legal pages.
9. Accessibility, performance, security review.
10. Client review, written approval, then DNS and launch by the client or with their approval.
11. Care plan begins.

Why I have not scaffolded the app yet: your own rule says no implementation before grant approval and written acceptance, and it is undecided whether this is the Standard build or a larger one.

## 9. Testing and acceptance checklist

Nothing below has been run for this new build. For the earlier static preview I ran Chromium checks only (axe zero violations, header overlap, reduced motion, mobile tap); no real store, no real devices.

- [ ] Typecheck, lint, unit tests pass
- [ ] Product, collection, cart flows against a development store
- [ ] Cart persists across reload; quantity limits respect inventory
- [ ] Checkout redirect lands on Shopify hosted page; no card fields on our domain
- [ ] Click and collect option appears and shows correct hours
- [ ] Alcohol checkout and delivery remain disabled, verified by trying to order
- [ ] Allergens, ABV and flavour data show on every product page
- [ ] Keyboard-only navigation, visible focus, screen reader labels
- [ ] WCAG 2.2 AA via axe plus manual checks
- [ ] `prefers-reduced-motion` honoured; no autoplay video
- [ ] Mobile layouts at 320, 360, 390, 768 px; real iPhone and Android devices
- [ ] Core Web Vitals on a throttled mobile profile; image and video budgets met
- [ ] Contact and event form: spam protection, delivery to the correct inbox
- [ ] Privacy, cookie and allergen pages present
- [ ] No secrets in the repo; environment variables only
- [ ] Client sign-off in writing

## 10. Questions that genuinely block development

1. Is the grant approved, and has the quote been signed? (Blocks starting.)
2. Does the client accept a custom Next.js storefront (vs a Standard connection to the existing shop), and if larger, will the quote be revised in writing?
3. Shopify store access: URL, plan and a collaborator invite.
4. How does the DNA till sync to Shopify, if at all?
5. Does the premises licence cover off-sales and online or delivery sales, and what are the permitted hours? (Blocks any alcohol checkout.)
6. Who verifies age at collection and delivery, and how?
7. Do customer accounts launch at day one?
8. Is the Dubai font licensed for web use?

Everything else can proceed with placeholders.
