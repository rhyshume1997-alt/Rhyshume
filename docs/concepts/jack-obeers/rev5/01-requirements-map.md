# Rev 5: requirements map

Source of recorded requirements: the client workbook `Client_workbook_Jack_OBeers.json` (discovery meeting, 20 Nov 2026) and the client's emails. The workbook is a discovery record, not an approved specification. "Combine Salt & Ember with Little Kettle Cafe" is Rhys's proposed creative direction, not a client requirement. Nothing below is invented to justify a design choice; items with no source are marked **Design proposal**.

Status key: Done (built in Rev 5), Partly, Placeholder (built, real content needed), Not built (needs a decision).

| # | Recorded requirement | Source | Rev 5 implementation | Status |
|---|---|---|---|---|
| 1 | Main goal: buy online | workbook `meet/main = buy` | Shop is the first action in the opening and in the header; basket and Buy now on every product; checkout is a labelled demo until Shopify is connected | Done (demo) |
| 2 | Other actions: click and collect, shipping, hampers, rental units, "keyser units" | `meet/otherAction` | Services index (01 Click & collect, 02 Shipping, 03 Hampers, 04 Keg and keezer hire) with honest placeholders. "Keyser units" is read as keezer; unconfirmed | Placeholder |
| 3 | Best of British beers, ciders, wines; British food | `meet/a/does` | Drinks shelf (beer, cider, wine, kegs), deli section | Done |
| 4 | Warm, friendly, rounded, welcoming, curious | `meet/feel`, `pref/mood` | Round arches and medallions, soft radii, warm copy, no hard rectangles in the opening | Done |
| 5 | Homey, New York deli feel | `pref/mood` | Awning scallops, ticket stubs, enamel sign, tile and wood materials | Partly |
| 6 | Colours to match the logo | `pref/colours`, `have/colfont` | Palette sampled from the logo file (browns, cream, gold); forest green is the supporting colour and is not in the logo. Client colour values still to be confirmed | Partly |
| 7 | Dubai font | `pref/fonts` | Not used: licence not verified. Source Sans 3 is the open stand-in | Not built (decision) |
| 8 | Logo is perfect; lying-down logo that gets up and becomes the next page | `have/logo/note` | The logo medallion lies on the counter, gets up when the pour starts, and headbutts the opening away into the shop (stand-in animation built from the supplied PNG; real animation to be supplied) | Done (stand-in) |
| 9 | Animation: beer bottle filling a glass | `pref/anims` | Opening is the pour film in an arch window; headline lights with the pour; each product glass fills when selected | Done |
| 10 | Cursor: brown beer bottle | `notes/s2` | Weighted photographic bottle cursor on the drinks shelf only, never over text or controls; tap, keyboard and reduced-motion alternatives | Done |
| 11 | Image treatment: "vector, rounded, sharp, faded on the corners, match into the background, not blocky" (note sits beside the cursor note, so read as the bottle and image treatment) | `notes/s2` | Bottle and imagery have soft or feathered edges and sit on matching backgrounds; interpretation to confirm with client | Partly |
| 12 | 2-click page: click beer, descriptor underneath, foods, flavour profile in depth, allergens | `pref/layouts` | Header or index row (click 1) to product panel (click 2) with descriptor, flavour dials, food pairings, allergens (placeholder). Tested | Done (sample data) |
| 13 | Membership area | `otherFeat` | Described in Services; no sign-in built (not approved) | Not built |
| 14 | Features: services, gallery, contact, catalogue, shop, customer area | `meet/feat` | Services, photo slots, Find us, catalogue, shop. Customer area = members (not built) | Partly |
| 15 | Shopify and DNA till | `meet/a/systems` | Shopify-ready data layer from the earlier build; nothing connected; till sync unknown | Not built |
| 16 | Has domain; needs API access | `notes/s0`, `s4` | Documented in go-live list; no credentials used | Not built |
| 17 | Two kegs for keezer units, charge for use, pick dates | `notes/s1` | Shown only as a labelled placeholder; not implemented | Placeholder |
| 18 | Client photos of stock and the shop; professional video needed | `pref/photos`, `have/videos` | Photo slots, temporary AI imagery labelled; asset spec in 04-assets | Placeholder |
| 19 | Audience mixed, mainly young families; Google, Instagram, Facebook | `a/customers` | No child imagery near alcohol; Instagram, YouTube, Google page placeholders. Marketing to young families is a compliance question | Partly |
| 20 | Online alcohol sale, delivery, age checks | email (off-sales licence stated) | Age notice and 18+ line only; verification and delivery rules not built or claimed | Not built (compliance) |

## Design proposals (no client source)
Dark cinematic stage into warm cream shelves; arch window; editorial index rows; ticket-stub deli list; headline lit by the pour; the headbutt transition (Rhys's reading of "get up and become the new page").
