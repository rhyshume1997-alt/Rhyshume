# Follow-up review (from commit 60750a7)

Branch `claude/jack-obeers-beers` only. Design frozen. No live Shopify setting changed, no checkout activated, no paid app started, nothing merged, no deployment triggered (automatic Vercel deployments are disabled; pushes to the branch only create cancelled build records). Nothing here guesses a price, ABV, allergen, product identity or membership benefit.

## 1. Why the website sees 34 of Shopify's 37 active products

**What the website can see.** The deployed preview reads the real store. The real pages show 23 beers, 6 ciders and 5 wines (34). They also show: no hampers, no deli products (the page shows its fixed placeholder list of deli items instead), no event tickets, no subscription plans. So **none of the missing three is a beer, cider, wine, deli item, hamper, event or subscription** that the website recognises.

**So the three are one of these, and I cannot tell which from here:**
1. **Active but not published to the sales channel the website's token reads.** The Storefront API returns only products that are active AND published to that channel. A product that is active in the Shopify admin but not published there is invisible to the website and cannot be seen by any code of ours. The audit found an Appstle lifetime plan on an old event product and Appstle's own products; apps often keep their products off public sales channels.
2. **Active with a product type the website does not list** (blank, "Gift Card", "Merchandise", "Artwork" and so on). The website silently shows nothing for these.
3. **Active with no variant** (dropped when read).

**Is the filtering intentional? Yes, every rule is deliberate, but the silence was a gap.** The rules (now in one place, `src/lib/categories.ts`, used by both the website and the audit script):
- the product type picks the page (beer, cider, wine, deli, hampers, events, subscriptions); a type that matches none is "other" and has no page;
- subscription and membership products are not sold through the basket (they are joined another way);
- an event with no date tag, or a date that has passed, is not listed;
- a product Shopify returns with no variant is dropped;
- drafts, archived products and products not on the channel are never returned by Shopify.

What I added so nobody has to guess again:
- **A server log line** (`[catalogue] Shopify returned N products; ... not shown by design: handle (reason)`), written once whenever it changes. After the next deployment, Vercel's runtime logs name every hidden product and why.
- **A visibility report in `scripts/shopify-audit.mjs`** (`websiteVisibility`): every product the Storefront API returns, which part of the website shows it, and the exact reason for any it hides. Rhys runs it with the real token (read-only), then compares its handles with the Shopify admin's 37 active products. Anything in the admin but missing from the report is case 1.
- Tested (`tests/hardening.spec.ts`) and dry-run against the test shop.

**Naming the three: not possible from this environment, and one command will do it.** The Storefront token is encrypted in Vercel and I did not decrypt it, the sandbox cannot reach Shopify, and the Chrome audit's list of active products was not supplied. The audit script now also takes the admin's own product export and names every active product the website does not show, with the reason for each:

```bash
# Shopify admin: Products, Export, "All products", CSV for Excel. Then, with the two values from Vercel:
SHOPIFY_STORE_DOMAIN=... SHOPIFY_STOREFRONT_TOKEN=... node scripts/shopify-audit.mjs --admin-csv products_export.csv
```

The `adminComparison` section lists each active product that is not shown, as one of: not published to the sales channel the token reads (the export's Published column is FALSE, or the Storefront API did not return it), or returned but hidden by design (unknown product type, subscription, undated or past event). It reads the file only and needs no credential beyond the token the site already uses. Tested against the test shop with an export file (`tests/hardening.spec.ts`). If Rhys sends the export (or the Chrome audit's product names) the three can be named without any credential.

**Decision needed (not Michael's business decision; a scope question for Rhys):** if the three turn out to be artwork, merchandise or gift cards, showing them needs a page design and a basket rule, which is the "artwork and merchandise flows" scope item. Nothing was built.

A latent risk I noticed and did **not** change: the category rule matches words inside the product type (for example "ale" also matches inside a type like "Wholesale", which would then be treated as beer). The real types are fine today. Tightening it could reclassify real products, so it is left for review.

## 2. Why the date of birth is saved to Shopify orders

**What happens.** The basket asks for a date of birth and a tick. The checkout route works out the age on the server and refuses under 18 (and now refuses anything that is not a clean real date or a believable age). It then saves the typed date on the Shopify cart as the attribute `age_declared_dob`, together with a note "Photo ID required at collection or delivery. 18+ only." Checkout is off, so **no date of birth has been stored anywhere so far.**

**Why it was saved.** The code comment says the declaration is checked on the server and photo ID is still checked at collection or delivery. The date was kept on the order so staff could see what the customer declared.

**Is it necessary? No, on the evidence I can see.**
- The check that matters is the photo ID at collection or the door. The staff member compares the ID with the person; the typed date adds nothing to that.
- The server only needs to know "18 or over?" to refuse an under-18. It can work that out and then forget the date.
- A typed date of birth is not age verification. It is a declaration. Storing it does not make the sale safer.
- I cannot find a legal requirement to store it. Whether keeping a record helps the shop show it took reasonable steps is a question for a licensing adviser, and it would be satisfied by a record that an 18+ declaration was made, not by the date itself.

**Why it is a risk.**
- A date of birth is personal data. It would sit on every order, visible to staff and to any app that can read orders (Appstle, EasyRoutes and Pickeasy are installed), and be kept as long as orders are.
- The site has no privacy notice (the footer link is hidden until the page exists), so customers are not told what happens to it.
- Collecting less is the safer default: data that is never stored cannot leak.

**Done in the final round.** The date box and the server check are unchanged. The date is now used once to work out "18 or over?" and dropped. What Shopify receives about age is only two cart attributes: `age_declaration` ("Customer declared online on <today> that they are 18 or over. Declaration only, not verified.") and `id_check` ("Photo ID required at collection or delivery. 18+ only."). `age_declared_dob` is gone. The route never logs the request body. The basket now says: "We use your date of birth once, to check you are 18 or over. We do not save it." (a statement about this website's code; hosting-platform logs were not inspected). Regression tests: the cart sent to Shopify contains no date of birth or part of one and only those two attributes; a refused under-18 request saves nothing; after pressing Checkout and reloading, the browser holds no date of birth in local storage, session storage or cookies and the field is empty; a source test fails if any code writes a date of birth to a cart, log, storage or cookie.

**What this does and does not claim.** An online declaration is not age verification and this change does not claim it satisfies alcohol licensing requirements. Whether the declaration, the photo ID rule and the 18+ wording meet the shop's licence conditions is for the licence holder and a licensing adviser to confirm. One thing outside our control: the date field uses the browser's standard "birthday" autofill hint (it helps accessibility), so a browser may offer to fill it from the user's own saved profile. That is stored by the user's browser, not by the website.

**Privacy notices: what exists and what is missing.** Existing: the newsletter consent line ("Yes, send me news and offers. I can unsubscribe at any time."), the basket's age wording and the new line above. **Missing:** a privacy notice page (the footer link is hidden until one exists). It would need, from the shop and not from me: who is responsible for the data; what is collected (newsletter email; at checkout, order details held by Shopify; the date of birth used once); why; how long Shopify keeps orders; which services handle data (Shopify, Vercel hosting, Cloudflare Turnstile on forms, the newsletter provider once chosen, Google for maps and reviews); and how to ask for data to be removed. Also missing: a note on what the browser keeps for the site to work (the basket in local storage, a session flag that skips the opening, sign-in cookies for the owners and members areas). No privacy text was written, because it is a legal document for the shop to approve.

**Done now (no policy change):** the route accepts only a clean, real `YYYY-MM-DD` date for an age of 18 to 120, and saves exactly that text. Before, any text that happened to parse as a date was accepted, an impossible age such as the year 0001 passed, and the text was saved as typed. Tested (`tests/checkout.spec.ts`): 13 bad inputs refused, including malformed, impossible, too old, 17 years old, text with markup or SQL, numbers and null.

## 3. The checkout rate limit

**Measured** against two real server instances (same build, checkout on, the fake Shopify, no orders). The limit is 8 checkout requests a minute per visitor; each visitor sent 12 requests to each server:

| Case | Allowed | Refused |
|---|---|---|
| A. One visitor, one instance | 8 | 4 |
| B. The same visitor, two instances | **16 (8 on each)** | 8 |
| C. Visitor changes `x-forwarded-for` every time, but the platform address stays the same (after the fix) | 8 | 4 |
| D. Visitor changes `x-forwarded-for` every time and no platform address exists (local runs, tests, any host that does not set one) | **12 (never limited)** | 0 |

**Weaknesses found and what was done**
1. **The visitor's address could be chosen by the visitor (case D).** The code used the first value of `x-forwarded-for`, which a visitor controls on any host that does not overwrite it. **Fixed:** it now prefers the address the platform sets itself (`x-vercel-forwarded-for`, then `x-real-ip`) and uses `x-forwarded-for` only when neither exists. Case C shows it holds. That these two Vercel headers cannot be set by a visitor is Vercel's documented behaviour, which I could not verify from here; it should be confirmed with a request through the real preview. Unit tested.
2. **Anyone could wipe every counter.** When the table passed 5,000 keys the old code emptied it completely, so 5,001 requests under made-up names would clear every other counter, including the one counting wrong passwords on an owner's account. **Fixed:** the table is capped at 20,000 keys and, when full, forgets finished windows first and then the least-hit keys, so a counter that is at its limit is the last to go. Tested: a counter at its limit survives 30,000 made-up keys.
3. **Several instances multiply the limit (case B). Not fixed, and cannot be fixed in code alone.** Each instance counts for itself, so a visitor whose requests reach N warm instances gets about N times the limit, and a fresh instance starts at zero. Real fixes are a shared store (Upstash Redis or Vercel KV) or a Vercel Firewall rate-limit rule. Both change a live service and may cost money, so they need Rhys's approval. Checkout is off, and every request it would let through still has to pass the minimum, age and basket checks, so the practical harm is Shopify carts being created in bulk, which Shopify rate-limits itself.

4. **IPv6 visitors rotated addresses freely (fixed in the final round).** An IPv6 visitor normally owns a whole /64 range, so counting each address separately gave them a new allowance for every request. IPv6 addresses are now counted by /64 prefix (IPv4-mapped addresses count as the IPv4 one). Tested: 20 requests from different addresses in one /64 get 8 allowed, not 20.

The limits themselves (8 a minute, 5 login tries and so on) are unchanged: commercial policy was not touched.

**Why an in-memory limiter does not protect every deployment, and what would.** Each running server instance counts for itself, so the same visitor got 16 allowed across two instances and a new instance starts at zero. Nothing in code alone changes that. The options, none activated:
- **Vercel Firewall rate-limiting rule** (a project setting; no code change). It counts across all instances at Vercel's edge, before the request reaches the site. Whether it is included in Rhys's current Vercel plan, and its limits, were not checked and are unverified. Changing it alters a live project setting, so it needs Rhys's approval.
- **A shared counter in a hosted store** (for example Upstash Redis through the Vercel Marketplace). The limiter's single function would call the store with an atomic increment and an expiry. It adds a service, a credential and a small delay to each checkout request, and may have a free tier; its current free-tier limits and any charge were not verified. It would need Rhys's approval and a test against the real service, which cannot be done here.
- Either way the existing in-memory limiter is still useful as a first layer and for the forms.

## 4. Unknown stock and the maximum of 24

**Verified:** the maximum of 24 cannot make anything available.
- Whether a product can be bought is decided by Shopify's `availableForSale` flag, nothing else. The 24 only limits how many.
- No stock figure and not on sale: the card and the product page show Sold out, there is no Add control and nothing can be bought. The checkout route also refuses it (`unavailable`).
- No stock figure and on sale: it can be added, but never more than 24, and no stock claim is shown (no "Only N left").
- A stock figure of 0 or below (Shopify allows this when overselling is on): the website refuses it ("none left in stock") even though Shopify would sell it. This is stricter than Shopify on purpose, so a missing or zero figure is never read as plenty.
- Shopify's checkout remains the final authority on real stock.
- Tested with four fixtures (unknown and on sale, unknown and sold out, zero, negative), in the browser.

**Wording fixed in the final round:** the product page said "In stock" whenever Shopify said a product was for sale. With no stock figure that is Shopify's availability flag, not a count, so it now says "In stock" only when Shopify shares a stock figure of 1 or more, and "Available" otherwise (and "Sold out" when not for sale). Today no real product has a stock figure, so the real preview would show "Available" everywhere. Products with sizes show no stock claim. Tested. No other wording of this kind exists on the site (the basket messages only talk about stock when a figure exists).

## 5. Every way a purchase can start

Checked again by reading all source and now **enforced by a test** (`tests/entrypoints.spec.ts`, which fails if a new route appears):
- Only `src/app/api/checkout/route.ts` talks to Shopify's cart (`cartCreate`, `checkoutUrl`).
- Nothing builds a Shopify cart or checkout link (no `/cart/...`, no `/checkouts/...`, no `myshopify.com/cart`).
- The checkout route is called from one place (the basket's Checkout button), and the only navigation to Shopify uses the address that route returns.
- Every Add and Buy control is in a known file; Buy now and Buy tickets are buttons, never links; the Buy now handler adds to the basket and opens it, it does not navigate.
- `CHECKOUT_ENABLED` is read in three known places, and no Shopify token is public or in browser code.
- Also now enforced: the customer is only sent to an `https://` address (a test answers the route with an `http://` one and it is refused).

**Bypasses only Shopify can close (documented in `CHECKOUT-SAFETY.md`):** no minimum order in Shopify (direct cart links skip the £35); age verification not configured; UK shipping rates still configured; direct Shopify cart and checkout links; discounts and plans reduce the paid total after the £35 check.

## 6. The 500 ml and 1 litre choice is inactive for products without approved variants

**Verified on the real data:** I ran the size rules over the real variants of all 34 products. 34 of 34 have exactly one variant, titled "Default Title". Size picker: 0 products. Size-managed (purchases restricted to sizes): 0. The real rendered pages for beers, ciders, wines and the home page contain no size picker markup. Unit tests also cover "Default Title", "750ml", "440ml", "Case of 12", two variants that are not online sizes, and a 250ml plus 500ml pair with no 1 litre: none shows a picker. It only appears for a product that has both a 500ml and a 1 litre variant.

## 7. Tests and design

- **Complete regression suite: 294 passed, 3 skipped by design, 0 failed** (desktop and iPhone, live-mode and preview builds, fake Shopify).
- **Design unchanged:** nine pages (home, beers, product, FAQ, events, Draught Club, About, craft beer, gift boxes) at 390 and 1440 wide, before and after, preview look: **18 of 18 pixel-identical.** The only visible-text change in this round's code is none: the changes are in the server, tests, a log line and a script.

## Remaining blockers, split by who must act

**Code fixes done this round:** shared category rule and hidden-product log line; audit visibility report; rate limiter (trusted address, no counter wipe); strict date-of-birth validation; https-only checkout address; tests for stock, hidden products, entry points, rate limit and the inactive size choice.

**Website work still possible without a business decision:**
- Confirm on the real preview that Vercel's `x-vercel-forwarded-for` and `x-real-ip` hold the visitor's address (one test request, once deployments are re-enabled for the preview).
- Read the new `[catalogue]` log line after the next deployment to name the three hidden products.
- Optionally tighten the category rule's word matching (risk of reclassifying real products, so review first).

**Decisions that are Rhys's (not Michael's business decisions):**
- Approve the privacy notice and cookie/storage wording before checkout opens (section 2). The date of birth is already no longer saved.
- Pay for a shared rate limit store or a Vercel Firewall rule (section 3).
- If the hidden three are artwork, merchandise or gift cards: whether to build a page and basket rule for them (additional scope).

**Michael's information (unchanged, still blocking):** tap names, keg-label ABVs, verified allergens, 1 litre prices, the postcode list and delivery details, licensing and who checks age, collection rules, events, and which Shopify mechanism backs the Regular and the Legend.

**Live Shopify approvals (none made):** unchanged from `SHOPIFY-READINESS.md` and `CONSOLIDATED-REVIEW.md`. This round adds: run the audit script's visibility report with the real token and, if the three are unpublished, decide whether they should be published to the website's channel.

**Still NOT READY: checkout stays disabled.** Blockers outside website code: no minimum order in Shopify, no age verification configured, UK shipping rates still configured, direct Shopify links cannot be blocked, plus the items above.
