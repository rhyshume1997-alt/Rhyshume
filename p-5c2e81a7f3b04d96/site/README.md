# Jack O'Beers site (private build, not live)

## Quick connect to Shopify (the site is built for this)
Everything Shopify-related is in **one file, `assets/js/config.js`**. Nothing else in the site needs to change.
1. In Shopify admin: Settings > Apps and sales channels > Develop apps (or install the **Headless** channel) and create an app with the **Storefront API**. Scopes: read products and inventory, read and write checkouts.
2. Copy the **Storefront API public access token**.
3. In `config.js` set `shopifyDomain` (the `your-store.myshopify.com` address) and `storefrontToken`. Leave `apiBase` empty.
4. Make sure collections exist with the handles `beers`, `ciders`, `wines`, `kegs`, `hampers`. Optional product metafields (namespace `custom`) fill the descriptions: `descriptor`, `blurb`, `flavour_sweet/bitter/fruity/body` (0-5), `pairings`, `allergens`, `abv`.
5. Reload: the "Sample" labels disappear, products, prices and stock come from Shopify, and **Checkout** goes to Shopify's own checkout. In Shopify turn on local pickup for click & collect.
Until both values are set the site stays in demo mode (sample products, nothing is charged). Details below.

## Final polish pass (what changed for the showing)
Search (`search.html`, header icon), sort on every shelf, related products and shelf breadcrumb on product pages, a proper empty-basket state, light-dismiss on popups (`closedby="any"` with a Safari fallback; the age notice cannot be dismissed), smooth page-to-page transitions (cross-document view transitions, off with reduced motion), a gentle "shelf strip", rounder cards, LocalBusiness structured data from the shop's own details, and `robots.txt` (blocks everything while private). Explanatory copy was removed: pages now just do the thing. Temporary AI imagery carries a small "Temporary AI-generated imagery" tag. Guidance used: Google's modern-web-guidance guides `light-dismiss-a-dialog`, `cross-document-transitions` and `navbar`; Emil Kowalski's motion rules (ease-out, short timings, 0.97 press, hover on fine pointers only); Tobia Donadon-style ideas only (round cards, pill buttons, small-caps labels, endless strip), nothing copied.
At launch: delete `robots.txt`'s Disallow, remove the `noindex` meta in `_src/build.py`, set the real domain, add a sitemap.

## Gimmick: Jack headbutts the page (and the logo animations to supply)
Jack the bull lies down in the footer. Click any link and he gets up and headbutts the page out of the way; the next page is revealed underneath (`assets/js/transition.js` + the `view-transition` rules at the end of `site.css`). It uses cross-document view transitions (Chrome, Edge, Safari 18.2+); other browsers and reduced-motion visitors navigate normally, and back/forward never play it. It currently uses the supplied logo as a stand-in. The animation brief for the real clips is `docs/concepts/jack-obeers/logo-animation-spec.md`.
**How it works** rows (basket, calendar, card, glass; box, van, ID for delivery; shop for collection) are flat SVG illustrations in `_src/illu.py`, shown on the home, click & collect and shipping pages.

## Shop details on the site (supplied by the shop by email, Nov 2026)
Name Jack O'Beers & Deli; tagline "Fresh from keg to bottle - no foam, no fuss."; 13 Station Road, Milngavie, G62 8PG; 07405 480950; sales@jackobeers.com; open Wednesday to Monday, 11am to 7pm (Tuesday not mentioned, shown as to be confirmed). They also said: they use Shopify for products, stock and payments; equal space for craft beer and deli including gift hampers; click & collect, UK delivery and international shipping where possible; premises licence includes off-sales; they want event enquiries. Prices, quote and personal names from the emails are deliberately not used. All of this lives in `BUSINESS` at the top of `_src/build.py`.
**Placeholder links** (Instagram, YouTube, Google page) are in `SOCIAL` in `_src/build.py`. Put the real address between the quotes, run `python3 _src/build.py`, and the link goes live (opens in a new tab). Until then they show "link to be added" and do nothing.

Static multi-page site: HTML + one CSS file + small vanilla JS modules, GSAP only for the opening and the draining glass.
Shopify is the back end through the Storefront API; **checkout is Shopify's own**. With no credentials the site runs in **demo mode** on `data/products.json` and charges nothing.

## Run, edit, build
- Pages are generated: edit `_src/build.py`, then `python3 _src/build.py`. Commit the generated `.html` files.
- Any static host works (Vercel serves it with `cleanUrls`). The private path stays `noindex` via `vercel.json`; **remove noindex only at launch**.

## Connect Shopify (one file: `assets/js/config.js`)
1. In Shopify: create a custom app (or the Headless channel), enable the **Storefront API** with scopes `unauthenticated_read_product_listings`, `unauthenticated_read_product_inventory`, `unauthenticated_read_metaobjects` (if used), `unauthenticated_write_checkouts`, `unauthenticated_read_checkouts`. Copy the **public Storefront access token**. Never use an Admin token in the browser.
2. Set `shopifyDomain` (the `.myshopify.com` domain), `storefrontToken`, and keep `apiVersion` current.
3. Create collections with these **handles**: `beers`, `ciders`, `wines`, `kegs`, `hampers` (the page `data-collection` matches the handle).
4. Optional product metafields (namespace `custom`): `descriptor`, `kind`, `flavour_sweet`, `flavour_bitter`, `flavour_fruity`, `flavour_body` (0-5), `pairings` (JSON list or comma text), `allergens`, `abv`. Missing values show as "to be confirmed", never invented.
5. Products load from Shopify; cart is a Storefront `Cart` (id in `localStorage`); **Checkout** sends the buyer to `cart.checkoutUrl`. Payment methods are whatever the shop enables in Shopify (cards, Apple Pay, Google Pay, PayPal, etc.).
6. Click & collect: enable **local pickup** in Shopify shipping settings. The chosen slot is saved as cart attributes `delivery_method`, `collection_date`, `collection_window` and appears on the order. Slot rules (days, windows, lead time) are placeholders in `config.js`.
7. Members: set `accountUrl` to Shopify's customer-account sign-in. The sign-in dialog on `members.html` is a **demonstration wall only**; it is not security. Real gating must be server-side (Shopify customer accounts, or a server check).
8. Newsletter: set `newsletterEndpoint` to a form-POST endpoint (Shopify Forms, Klaviyo, Mailchimp or your own).
Tested against a mocked Storefront endpoint (collection, product, cartCreate, cartLinesAdd, cartAttributesUpdate, redirect to `checkoutUrl`). **Not tested against a real store.**

## Pages and the two-click rule
Every page is one click from the header or footer; the shop shelves are two (Shop > Beers); products are two from home (home > shelf > product).
`index, shop, beers, ciders, wines, kegs, hampers, product (?h=handle), deli, click-and-collect, shipping, newsletter, about, members, cart, privacy, terms, returns, age-policy, 404`.

## Real photos, video, menus
- Product photos come from Shopify (`featuredImage`). Until set, a dashed **Photo slot** shows.
- **Scroll-drain pint (beers page): TEMPORARY, AI-generated stand-in images (v2 set).** `assets/media/beer-1.webp` (full) to `beer-6.webp` (empty), plus phone versions `beer-N-sm.webp`. They are **AI-generated pictures of a pint, not shop photography and not the shop's own**; the page says so. **Commercial-use terms for these generated images have NOT been checked.** Replace them with real photos or stills from footage **using the same filenames**, same framing, glass position, scale and lighting in every frame, 3:2 landscape, at least 1920 px wide.
  - Sizes: supplied 1536 x 1024 px PNGs (3:2, about 2.4 MB each). Desktop WebPs are the native 1536 x 1024 (not upscaled), 150-216 KB each, **about 1.1 MB for the set**. Phone WebPs are the middle 760 px of the frame (where the glass interior shows on a tall screen) scaled to 668 x 900, 60-105 KB each, **about 480 KB for the set**.
  - Originals stay out of the deployed folder: `docs/concepts/jack-obeers/pint-frames-v2-1536px-originals/` (current) and `pint-frames-v1-506px/` (the superseded first set and its WebPs).
  - Phone files are used on screens up to 900 px wide and on portrait touch devices; everything else gets the full frames. Crop: `object-fit: cover; object-position: 50% 25%`, which keeps the foam head and the beer level in view on laptops, 1080p monitors, tablets and tall phones; on ultra-wide windows (about 2:1 or wider) only a band of the frame shows, so the foam and the last beer level cannot both be visible.
  - Behaviour (`assets/js/pint.js`): fixed full-viewport layers behind the content, no frame or border. Scroll maps to the six frames in order; only opacity animates, with an eased, settling blend. Frame 1 loads at once, 2-6 when idle; nothing runs while the tab is hidden. Reduced motion: one still frame (full). If frame 1 fails to load, the generated-beer fallback (`beer.js`, WebGL) takes over.
  - The level gauge (right edge) reads 100% (frame 1) to 0% (frame 6) and hides when the footer arrives.
- **Keezer scroll-fill background (separate TEST page, `keezer-test.html`, not linked from the site): TEMPORARY, AI-generated stand-in images.** `assets/media/keezer-1.webp` (empty glass) to `keezer-6.webp` (full pint) plus phone versions `keezer-N-sm.webp`. They are **AI-generated pictures of a keezer, not shop photography and not the shop's own equipment**; the page says so. **Commercial-use terms for these generated images have NOT been checked.** Replace them with real photos **using the same filenames**, same framing, keezer, taps, glass position, scale and lighting in every frame, 3:2 landscape, at least 1920 px wide.
  - It reuses `pint.js`, the gauge and the `beer.js` fallback. The only differences are set by data attributes on the `.pint` element (`pint_markup()` in `_src/build.py`): `data-prefix="keezer-"`, `data-dir="fill"` (frame 1 empty at the top of the page, frame 6 full at the bottom; the gauge reads 0% to 100%), `data-pos="50% 45%"` (crop). Reduced motion shows one still frame: the full pour (frame 6).
  - Sizes: supplied 1536 x 1024 px PNGs (3:2, about 2.7 MB each). Desktop WebPs are the native size (not upscaled), about 230 KB each, **about 1.39 MB for the set** (under 1.5 MB). Phone WebPs are the middle 760 px scaled to 668 x 900, about 114 KB each, **about 684 KB for the set**. Originals: `docs/concepts/jack-obeers/keezer-frames-originals/` (outside the deployed folder). Alignment: 0 px shift across all six, none applied.
  - Crop: laptop, 1080p, tablet and tall phone keep the taps and the glass in view; on ultra-wide windows only a band shows (taps' lower half and the glass), so handles and the drip tray are cropped.
  - **Waiting on the shop's say-so:** the Kegs page is unchanged. Renaming it, changing its Buy now buttons or copy, or putting this background on it needs approval. A "keezer" is read here as a chest freezer converted to serve kegs through taps; rental price, dates, deposit, kegs per unit, delivery and collection are all "to be confirmed" placeholders. Nothing is invented.
- Hero film `assets/media/pour.*` is **AI-generated reference footage**, not the shop. The bottle image is also AI-generated. Replace both with the shop's own film/photos.
- Deli menu: `deli.html` has sample categories; supply real items, prices and allergens.
- Logo: supplied 355 px PNG used as-is; a vector/high-res file is needed.

## Fonts
Source Sans 3 (closest open match to Dubai), Newsreader (headlines), IBM Plex Mono (labels), all SIL OFL, self-hosted. Dubai is **not** included (licence unverified). See `assets/fonts/OFL-NOTICES.txt`.

## Launch checklist (not done)
- [ ] Client confirms trading name, brand colours (palette is provisional), logo files
- [ ] Alcohol compliance reviewed by the client's adviser: licensing, age verification (the gate is a self-declaration only), delivery rules, advertising, payment/sale process
- [ ] Legal pages written/checked (privacy, terms, returns, age policy are placeholders); cookie/analytics consent if analytics added
- [ ] Real products, prices, ABV, allergens, photos, deli menu, address, hours, collection and delivery rules
- [ ] GSAP licence terms read (https://gsap.com/standard-license)
- [ ] SEO: pages are noindex; collection/product content is rendered by JS, so add prerendering or a Shopify-theme/Hydrogen approach before relying on search
- [ ] Server-side member gating; Shopify customer accounts
- [ ] Test with a real Shopify store (checkout, local pickup, taxes, shipping zones, age-check app)
- [ ] Performance pass with real photos/video; accessibility re-test; remove `noindex`

## Build AI design rules (buildaihere/website `skills/website-design-director`, buildaihere/agent-skills `design-library`)
Applied: motion durations and curves (drawer 500ms edge-sheet curve, menus 180ms, press scale .97, ease-out only), hover effects for fine pointers only, 44px minimum touch targets, tabular figures for prices, 65-character reading width, labelled gaps instead of filler, a "what we are not" section, reduced-motion fallbacks, worst-case data stress test (long and unbroken names, missing images/prices, emoji, non-Latin, HTML in titles: no overflow, text escaped).
Not applied, because the client-approved Rev 4 direction wins: "flat colour, no gradients" (the dark stage uses gradients) and "avoid repeated card grids" (product shelves are a functional grid).
Their `check-previews.mjs --site` run: all pages pass overflow, console, keyboard-focus checks. It still flags the beers page ("fixed layer covers text"): that is the full-screen draining-glass layer, which sits *behind* the content (z-index -1) and is not covering anything; confirmed in screenshots. Axe was run separately (no violations).
