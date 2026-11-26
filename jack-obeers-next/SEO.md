# SEO and AEO (search and AI answer engines)

Everything here is built on the server, so search bots and AI crawlers read the full page without running any scripts.
The facts come from one place, `src/lib/site.ts` (name, address, phone, links, hours) and `src/lib/faq.ts` (the answers),
so the footer, the page schema, `/llms.txt` and the FAQ always say the same thing.

## 1. Audit before the work

Measured on the build before this pass (title, description, canonical, share tags, robots, headings, JSON-LD, images).

| Check | Before |
|---|---|
| Title | One per page, but thin ("Beer \| Jack O’Beers & Deli") with none of the words people search |
| Meta description | The same one on every page |
| Canonical | None on any page |
| Open Graph and Twitter | Present, but the same text on every page |
| robots | Every page `noindex, nofollow`, and `robots.txt` blocked the whole site |
| sitemap.xml | 2 addresses (home and the old `/drinks` page). No ranges, no products |
| JSON-LD | None |
| One `h1` per page | Yes on every page except the old `/product` page, which has none |
| Image alt text | Every `<img>` had alt. Two images had no width and height (the events and About posters) |
| `/faq`, `/west-highland-way`, `/llms.txt` | Did not exist (404) |
| Name | "Jack O’Beers & Deli" in some places, "Jack O’Beers" in others |
| Product pages | None. Products only opened in a pop-up, so there was nothing to index or mark up |
| About page | Still showed "photo coming soon" placeholders |

## 2. Gaps and fixes

| Gap | Fix |
|---|---|
| Thin titles and one shared description | A unique title and description on every page, using the words people search (see the table below). Plain tone, no hype |
| No canonical | `alternates.canonical` on every page, resolved against `https://jackobeers.com` |
| Share cards the same everywhere | Per-page Open Graph and Twitter tags |
| Site blocked | Indexing is on for the live (production) site only, or when `SITE_INDEXABLE=true`. Previews and local runs stay blocked. See "Launch switch" below |
| Sitemap too small | `sitemap.xml` is built from the routes and the live Shopify products (136 products in the test). Left out: `/api` (forms, checkout), `/owners`, `/members`, the old `/drinks` and `/product` pages, and products while the site is on sample data |
| robots.txt | Allows Googlebot, Bingbot, Applebot, GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, PerplexityBot and Google-Extended, and blocks `/api/`, `/owners`, `/members` and `/drinks`. Points to the sitemap |
| No structured data | See section 3 |
| No question pages | New `/faq` (9 short answers, with FAQPage schema) |
| Nothing for walkers | New `/west-highland-way` page (verified facts only) |
| Nothing for AI engines | New `/llms.txt`: a short plain summary with the address, phone, hours and links |
| No product pages | New `/product/[handle]` for every product, server rendered, with Product and Offer schema. Names on the cards now link to them |
| Old shelf pages | `/drinks` and `/product` are `noindex` (`/drinks` points to `/beers`) |
| Name varied | One name everywhere: **Jack O’Beers and Deli** |
| Images without size | Every image now has width, height and alt. The one exception is the decorative tap-wall background, which fills its box and cannot shift the page |
| About page placeholders | Now Michael’s words, the photo and the hours |

### Titles and descriptions

Each title is followed by " | Jack O’Beers and Deli" and kept to about 60 characters. Descriptions are 150 to 160.

| Page | Title | Search words |
|---|---|---|
| `/` | Craft beer shop in Milngavie | craft beer shop Milngavie, fresh draught beer to take away, deli pies and cheese |
| `/beers` | Craft beer to take away in Milngavie | fresh draught beer to take away Milngavie |
| `/ciders` | Cider to take away in Milngavie | cider Milngavie |
| `/wines` | Wine and Georgian wine in Milngavie | Georgian wine Milngavie |
| `/west-highland-way` | Bottle shop near West Highland Way | bottle shop near West Highland Way start |
| `/faq` | Questions and answers | the shop’s questions |
| `/events` | Events at the shop, Milngavie | events Milngavie |
| `/draught-club` | The Draught Club subscription | beer subscription |
| `/about` | About us, Michael and Tanya | who runs the shop |
| `/product/…` | Name and style | one per beer, cider and wine |

"Deli pies and cheese Milngavie" is in the home page description, the deli section and the FAQ. There is no separate
deli page. Add one if you want that search to have its own page.

## 3. Structured data (JSON-LD)

- **Store**, on every page: name, address (13 Station Road, Milngavie, G62 8PG), phone 07405 480950, email, opening hours
  (Monday, then Wednesday to Sunday, 11:00 to 19:00; Tuesday is not listed, so it reads as closed), the Google map link,
  and `sameAs`.
- **WebSite**, on every page.
- **Product with one Offer**, on every product page: price, `GBP` and `InStock` or `OutOfStock`, all from Shopify. No
  ratings or reviews, because there are none to show.
- **BreadcrumbList**, on every page except home.
- **FAQPage**, on `/faq`. The schema text matches the visible answers. The "[Michael to confirm]" markers are not in it.
- **Geo coordinates**: not included. They are only added when Rhys supplies them (`GEO` in `src/lib/site.ts`).
- **sameAs**: kept in one list, `SAME_AS` in `src/lib/site.ts`. It holds Instagram and the Google listing. Add the other
  profiles there as they are created (see section 6).

## 4. Things Michael needs to confirm

These show on the pages as "[Michael to confirm]" or are flagged here.

- **Opening hours**: Wednesday to Monday 11am to 7pm, closed Tuesday. They came from the shop’s own details and Rhys, not
  from Google. Used in the schema, the FAQ, `/llms.txt` and the footer.
- **About 200 metres from the West Highland Way start**: from the West Highland Way listing, not from Michael. On the FAQ
  and the walkers page.
- **Online ordering**: the FAQ says "Not yet". Change the answer in `src/lib/faq.ts` when checkout opens.
- **Georgian wines named in the FAQ** (Tsinandali, Saperavi): taken from the shop’s product list. Check they are in stock.
- **Supplier spellings** in the About text: "Jarvis Pickle", "Hammond", "Belhaven" are as the transcription heard them.
- **Shop name**: written everywhere as "Jack O’Beers and Deli" (no "&").

## 5. Performance (mobile)

Lab numbers from a production build running on this computer, on an emulated Pixel 5 with a slow 4G connection
(about 1.6 Mbit/s, 150 ms delay) and a CPU slowed 4 times. They are a guide, not field data. Real numbers need the live site
(Search Console, Core Web Vitals report, once there are visitors).

| Page | FCP | LCP | CLS | Blocking time | Weight |
|---|---|---|---|---|---|
| `/` | 0.9 s | 1.1 s (hero poster image) | 0.005 | ~170 ms | 5.1 MB |
| `/beers` | 1.2 s | 1.2 s (text) | 0.008 | ~400 ms | 0.3 MB |
| `/faq` | 0.9 s | 0.9 s (text) | 0.000 | ~130 ms | 0.3 MB |
| `/west-highland-way` | 0.9 s | 4.3 s (background poster) | 0.000 | ~110 ms | 3.4 MB |
| `/product/…` | 0.9 s | 3.9 s (footer poster) | 0.001 | ~90 ms | 0.5 MB |

Targets: LCP 2.5 s or less, CLS 0.1 or less. CLS passes everywhere. LCP on `/` is now 1.1 s (it was 5.0 s: median of 5 runs
each). The walkers and product pages still miss, because their largest item is a background poster picture; the test
connection is also deliberately slow.

What was done:

- Layout shift: fonts are preloaded (CLS on `/faq` and the walkers page fell from 0.06 to 0.00). Images and posters carry width and height.
- The hero picture is a small WebP (38 KB on phones, 46 KB on desktop, down from 215 and 304 KB), preloaded first with high priority,
  sized for the screen, with the video on top. The 150 KB Jack sprites and one font are requested only after the page has loaded.
  Before this, the wide poster loaded on phones and the first frame arrived at 8.5 s.
- Videos start after the page has loaded, only when near the screen, pause when off screen, and are skipped on save-data
  or slow connections and with reduced motion (poster only). The footer loop waits for the first scroll.
- Posters and shelf pictures below the first screen load only when needed (page weight on `/` fell from 6.7 MB to 5.0 MB).

Still to do: the landing loops are 14 MB each on Blob in the full version. The site uses 4 to 5 MB web copies until they are uploaded.

## 6. Off-site steps for Rhys

Use exactly the same name, address and phone everywhere: **Jack O’Beers and Deli, 13 Station Road, Milngavie, G62 8PG,
07405 480950**, website `https://jackobeers.com`.

1. **Google Business Profile**: claim or verify the listing (the Google link on the site). Check the name, address, phone,
   website, categories (for example Beer store, Deli, Wine store), and the hours, including Tuesday closed. Add photos and
   the Instagram link. Ask for the latitude and longitude from the map pin, then add them to `GEO` in `src/lib/site.ts`.
2. **Google reviews**: ask happy customers to leave one, using the review link from the profile (a QR code at the till
   works). Reply to every review. Do not offer anything in exchange.
3. **Bing Places**: https://www.bingplaces.com. Import from the Google profile, then check it matches.
4. **Apple Business Connect**: https://businessconnect.apple.com. Add the shop so it shows in Apple Maps.
5. **Untappd venue**: claim the venue and update the address, hours and website link
   (https://untappd.com/v/jack-obeers-and-deli/13987213).
6. **CAMRA WhatPub**: the listing says there is no website. Use "Update this pub" on the page (https://camra.org.uk/pubs/jack-obeers-milngavie-200076),
   add the website and the hours.
7. **West Highland Way listing**: ask the listing owner to link to `https://jackobeers.com/west-highland-way`, and check the
   200 metre figure with Michael.
8. **Social and others**: add the Facebook page and any other profile to `SAME_AS`.
9. **Search Console**: add `https://jackobeers.com`, submit `https://jackobeers.com/sitemap.xml`, and check the Core Web Vitals
   report after a few weeks. Add the site to Bing Webmaster Tools too.

## 7. Launch switch

Search engines are only allowed in when the site is the live production deployment, or when `SITE_INDEXABLE=true` is set in
Vercel. Preview builds always stay blocked. Merging this branch into the live branch turns indexing on. That is the launch
decision, so check section 4 first. Product pages are `noindex` while the site is still on sample data.

## 8. Not touched

Checkout and the payment hold rule (`CHECKOUT_ENABLED`, the 18+ declaration, the £35 minimum) are unchanged.

## 9. Facts read from the shop-front photo

The window says "23 taps from the wall", "craft beer", "cider" and "frizzante", and "Walkers welcome". The site already says
23 taps (Michael's welcome says it too), so no extra marker was added. There is an old fashioned popcorn machine in the shop. Popcorn is sold at 3.50 pounds, confirmed by Michael, and is in the
deli copy, the FAQ and `/llms.txt`.

## Round 2 (landing pages and checks)

- New landing pages: `/craft-beer-milngavie`, `/bottle-shop-milngavie`, `/beer-gift-boxes`. `/draught-club` has its own title, description and an
  explainer. All use only confirmed facts (23 taps, popcorn 3.50, Draught Club 24.99 and 39.99, "5 star reviews on Google" with no count).
- Store schema is now `["LiquorStore", "Store"]`, with the coordinates and `sameAs` holding the Google shop link and the review link.
- robots.txt also blocks `/cart`, `/checkout` and `/account` (the shop has no such pages today; they are blocked in case they appear).
- FAQ gained: minimum order, delivery price, collection (pending) and the Draught Club.
- `tests/seo.spec.ts` checks every page for a unique title and description, canonical, Open Graph, one h1, alt text, no em dashes, the Store
  schema, Product and FAQPage schema, the footer address, phone and hours, robots.txt and the sitemap. It runs against the live-mode build.
