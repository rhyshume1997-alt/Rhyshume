# Product reconciliation: Shopify catalogue against Michael's tap guide

Date of the Shopify read: 27 November 2026. Nothing here was published, created, changed or deleted in Shopify or on the website.

## Sources and their limits (read this first)

| Source | What was used | Limit |
|---|---|---|
| **Shopify (current source)** | The deployed preview's beer, cider and wine pages, which are rendered from the real store through the Storefront API. This shows exactly what the website can see: published, active products only. 34 products: 23 beers, 6 ciders, 5 wines | Drafts are never returned by the Storefront API, so the 23 drafts reported by the Chrome audit are invisible to the website and were not inspected. Deli, hampers, events and subscriptions were not individually read. Image resolution cannot be checked from here |
| **Michael's tap guide** | "Tap Guide Reference Rev 1" (Markdown made from Michael's `JackOBeers_Tap_Guide.xlsx`, 27 November 2026): 23 taps and one special, each with ABV, 250 ml and 500 ml price, a description, an allergen note and source links. The checklist's own transcription agrees with it | The .xlsx file itself was not seen, only this reference. Its prices and ABVs are Michael's reference values, not checked against kegs. Its allergen notes all say "check the keg", and several descriptions are marked "Style guide" (generic to the style, not about the product) |
| **Chrome audit** | Its figures as reported: 60 products, 37 active, 23 drafts | Its product list was not supplied; the numbers were used as stated, not re-verified. 34 of the 37 active products are the beer, cider and wine pages above; the other three (at most) are deli, hamper, event or subscription items that were not read |

Matching rule: a tap and a Shopify product are only called a match when the brewery AND the beer name both appear in the Shopify title (**Confirmed**). Where only the ABV and price agree it is listed as **Probable** for Michael to confirm and is never merged. Everything else is **Not in Shopify**. No automatic or fuzzy matching decided anything.

## 1. What the real catalogue looks like to the website

- **34 of 34 products have a single variant ("Default Title")**: there are no 500 ml or 1 litre variants anywhere, so the size picker correctly stays hidden for every product.
- **All 34 are available for sale.** None is sold out.
- **No stock number is shared for any product (34 of 34).** The website therefore shows no "Only N left" and applies no stock limit; the most it will take of one item is 24 (see `CHECKOUT-SAFETY.md`). Missing stock is not treated as unlimited.
- Every product has a description and a photograph. 12 descriptions are long text that my read did not capture; the other 22 were read.
- Draught: **8 products carry the "fromthewall" tag** and 22 carry "fromthefridge" (cans and bottles); 4 (wines) have neither.
- At least two draught descriptions say the price is for a 500 ml bottle (Jet Lag: "Priced in 500ml Bottles"; Waterpistol: "Priced for 500ml"). No 1 litre price exists in Shopify or in the guide.
- 30 of 34 titles are in capital letters and put the ABV in the title. The website tidies this for display; Shopify was not touched.

## 2. Tap guide against Shopify, tap by tap

| Tap | Guide product | Guide ABV | Guide 500 ml | Match | Shopify product | Shopify price | Shopify ABV | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | 71 Brewing, 71 Lager | 4.4% | £5.70 | Not in Shopify | | | |  |
| 2 | Sheppy's, Cider with Raspberry | 3.4% | £5.00 | **Confirmed** (brewery and name) | Sheppy's - Cider With Raspberry Abv 3.4% | £4.70 | 3.4% | ABV matches. Price differs: guide £5.00, Shopify £4.70. |
| 3 | Datum Attitude, Airspace Nitro Stout | 4.2% | £6.20 | Not in Shopify | | | |  |
| 4 | Ilkley, Fridge Over Troubled Water | 5.0% | £6.00 | Not in Shopify | | | |  |
| 5 | (name missing) | 4.0% | £5.90 | Cannot match: name missing | | | |  |
| 6 | Wylam, Peggy's Drift Nitro Stout | 4.0% | £5.80 | Not in Shopify | | | |  |
| 7 | Italian Frizzante, lightly sparkling wine | 10.5% | £9.50 | **Probable, Michael to confirm** (name differs) | Vino Bianco Frizzante Abv 10.5% | £9.50 | 10.5% | ABV and price both match, but the guide has no producer and Shopify calls it Vino Bianco Frizzante. Not merged. |
| 8 | (no row in the guide) |  |  | Cannot match: confirm whether the tap is in use | | | |  |
| 9 | Bini Brew Co, Feeling Strangely Fine | 8.0% | £7.00 | Not in Shopify | | | |  |
| 10 | Amity, Six Summers | 6.6% | £6.50 | Not in Shopify | | | |  |
| 11 | Sheppy's, 200 Medium Cider | 4.8% | £5.00 | **Confirmed** (brewery and name) | Sheppy's - 200 Medium Cider Abv 4.9% | £4.50 | 4.9% | **ABV conflict:** guide 4.8%, Shopify 4.9%. Check the label. Price differs: guide £5.00, Shopify £4.50. |
| 12 | (name missing) | 4.0% | £5.00 | Cannot match: name missing | | | |  |
| 13 | Campervan, Leith Juice | 4.7% | £6.00 | Not in Shopify | | | |  |
| 14 | Hawkstone, Black Nitro Stout | 4.2% | £6.00 | Not in Shopify | | | |  |
| 15 | Amity, Waterpistol | 4.6% | £5.50 | **Confirmed** (brewery and name) | Amity - Waterpistol - Juicy Pale Ale - Abv 4.6% | £5.50 | 4.6% | ABV and price both match. |
| 16 | Amity, Even Bigger Boat | 10.0% | £8.50 | Not in Shopify (a different product) | | | | Shopify has Amity Bigger Boat DIPA at 8.0%, £6.00. Different name and ABV, so it is NOT treated as the same beer. |
| 17 | Ilkley, Easy Landing | 4.6% | £5.80 | Not in Shopify | | | |  |
| 18 | Ilkley, Ricky Stien / Sup Up, Junge | 4.8% | £6.00 | Not in Shopify (name to confirm first) | | | |  |
| 19 | Ilkley, Alpha Beta | 4.5% | £5.60 | Not in Shopify | | | |  |
| 20 | Datum Attitude, Wokka Wokka | 4.8% | £5.50 | Not in Shopify | | | |  |
| 21 | Wylam, Jakehead IPA | 6.3% | £6.20 | Not in Shopify | | | |  |
| 22 | (name missing) | 5.7% | £6.00 | Cannot match: name missing | | | |  |
| 23 | Datum Attitude, Velocity Never Exceed | 6.0% | £6.00 | Not in Shopify | | | |  |
| Special | Frizzante Elderflower Spritz | 5.9% | (no price) | Not in Shopify (Shopify's Sheppy's Elderflower Cider, 4.0%, is a different product) | | | |  |

Totals: **3 confirmed** (taps 2, 11, 15), **1 probable** (tap 7), **16 not in Shopify** (taps 1, 3, 4, 6, 9, 10, 13, 14, 16, 17, 18, 19, 20, 21, 23 and the special), **3 impossible to match because the guide has no name** (taps 5, 12, 22), **1 with no row** (tap 8).

### Differences on the matches
- **Tap 11, Sheppy's 200 Medium Cider: ABV conflict.** Guide 4.8%, Shopify 4.9%. Both cannot be right. Check the label before either is used. (The website shows what Shopify says.)
- **Prices differ** on two confirmed taps: Sheppy's Raspberry (guide £5.00, Shopify £4.70) and Sheppy's 200 Medium (guide £5.00, Shopify £4.50). The guide's prices are reference only. Shopify stays the source for published prices, so nothing was changed. Michael to say which is current.
- Tap 15, Waterpistol: ABV and price agree.

### What the reference adds (none of it published)

**Descriptions.** For the three confirmed matches and the one probable match, Shopify already has a fuller description than the reference, so **no description change is suggested and nothing is overwritten**. For the 16 taps with no Shopify product, the reference text is draft copy for products that do not exist yet. It should only be used after the product is created with approval and its facts are verified. Six descriptions are marked "Style guide" in the reference (taps 3, 4, 7, 17, 18, 23) and the special says "Profile based on the drink name": those describe the style in general, not the actual beer, so they must not be published as product facts.

**ABV needs checking on more than one tap.** The reference itself says: tap 2 "Sheppy's has also listed a 4.0% draught version"; tap 11 "a producer brochure lists 50 L draught at 5.0% and medium-sweet". For tap 11 there are therefore three figures: guide 4.8%, Shopify 4.9%, brochure 5.0%. None should be published until the keg label is read.

**Allergen notes: none can be published.** Every note in the reference says to check the keg or supplier. The ones that matter most:

| Tap | Reference note (summary) | Consequence |
|---|---|---|
| 2, 11 | Sulphites declared by Sheppy's | Consistent with the "ALLERGEN ADVICE ... sulphites" text already in Shopify. Keg ABV still to confirm |
| 15 Waterpistol | "Check keg for the specific cereals" | **Shopify already shows "Contains: Barley, Wheat, Oats, Hops, Yeast, Water" for this beer.** That wording is not yet confirmed for the keg. Michael to verify, since the website publishes it as written |
| 7 | Check sulphites and any milk or egg residues from fining; producer unknown | Cannot be written until the producer is known |
| 13 Leith Juice, 19 Alpha Beta | The canned versions are labelled gluten-free | **The gluten-free claim must NOT be repeated for draught** until the keg specification confirms it. Nothing on the website says it |
| 14 Hawkstone Black | Cans list barley, wheat, oats; FSA wheat notice on certain cans | Confirm with the keg specification |
| 3, 6 | Obtain the full cereal declaration and check milk or lactose (nitro stouts) | Open |
| 10, 16, 21 | Producers list barley, wheat, oats (or oats) | Open for the keg |
| Special spritz | Check the wine, the elderflower mixer and any garnish against the recipe | Recipe not supplied |

**Other points the reference raises:** tap 17's style appears under two names (East Coast IPA and East Coast Hazy Pale) and tap 18's name is uncertain, so neither can be matched or described yet. Tap 16 is Even Bigger Boat, a Triple IPA at 10.0%, which confirms it is a different product from Shopify's Amity Bigger Boat DIPA at 8.0%. The reference also asks to "check current Shopify matches to avoid duplicate products": that is what the table above does, and no product was created.

### Shopify products tagged "on the wall" that are not in the guide
These are either off tap now (and should be unpublished or retagged in Shopify, which needs Michael's approval) or the guide is incomplete:
- Ilkley West Coast IPA Jet Lag, 5.7%, £6.00
- Amity Festoon Helles Lager, 4.6%, £5.50
- Kirkby Lonsdale Devils Bridge IPA, 5.2%, £5.50
- Sheppy's Cider with Elderflower, 4.0%, £4.80 (the guide's special is a different drink, a 5.9% Frizzante Elderflower Spritz)

### Missing information (needed before any of this is published)
- Names for taps 5, 12 and 22; whether tap 8 is in use; the exact name on tap 18; the producer, ingredients and recipe for the frizzante and the spritz.
- **1 litre prices for every draught product.** None exists in the guide or in Shopify. None was invented.
- ABV for the 16 taps that have no Shopify product, checked against the keg labels, and a verified allergen declaration for every draught product (the reference says "check the keg" for all of them).

## 3. Descriptions: what the website shows and what needs a decision

- The website shows the description written in Shopify and never overwrites it. The tap guide's wording was not applied anywhere, and no Shopify description was changed.
- **Allergen wording already exists in some Shopify descriptions.** In the 22 descriptions read, six carry it: Amity Waterpistol ("Contains: Barley, Wheat, Oats, Hops, Yeast, Water"), the three Sheppy's ciders ("ALLERGEN ADVICE ... contain sulphites"), and Švyturys and Ursus ("Contains: Barley Malt (Gluten)"). The other 16 read descriptions have none, and 12 long ones were not read. These statements are published on the website exactly as Shopify has them, and they have not been checked against labels. Michael must verify them; the website cannot.
- **A fix made in this round:** the website used to cut a description at about 400 characters. These allergen sentences sit at the end, so a cut would have hidden them. Descriptions are now shown in full.
- Copy to tidy in Shopify (Michael's approval): the Švyturys and Ursus descriptions start with the stray word "Description"; the Sheppy's descriptions run "ALLERGEN ADVICE" into the sentence before it with no space; Jet Lag says "1L bottles may be used for larger orders", which will conflict once real 1 litre variants exist.

## 4. The Chrome findings

| Finding | Can the website fix it? | Who must act |
|---|---|---|
| About 14 active products have low-resolution images | **No.** The website cannot create or enlarge images and must not invent them. Image sizes could not be checked from here | Michael supplies better photos; adding them in Shopify is his or Rhys's change (approval) |
| 19 active descriptions lack allergen wording; metafields not inspected | **No.** The website can only show allergen text that someone has verified. It currently reads no allergen metafield | Michael supplies supplier documents; Rhys runs `scripts/shopify-audit.mjs` to see whether allergen metafields exist and are exposed; defining them in Shopify needs approval |
| A draft product has a £0.00 price | **Not reachable today:** drafts never reach the website, and none of the 34 live products is £0.00. **Risk:** if it were published at £0.00 the website would sell it at £0.00 (and nothing blocks it). A website guard is possible but is a business-rule decision, so it was not added | Michael fixes the price before it is published (approval). Decision for Rhys: add a guard that refuses a £0.00 drink |
| A sample event and an expired event remain | **Already handled.** The website hides events with no date or a past date (tested), and the real preview's Events page shows "Events coming soon". They do not appear | Optional tidy: archive or delete them in Shopify (Michael's approval) |
| Several collections are empty | **No effect.** The website does not use Shopify collections; it sorts by product type and tags | Optional tidy in Shopify |
| Some inventory counts may be placeholders | **They cannot leak today:** no stock figure is shared (34 of 34 are "not shared"). **If "Read inventory" is switched on later, a placeholder between 1 and 5 would show "Only N left" and a small one would cap orders** | Check the counts in Shopify before granting that permission (approval) |

## 5. Sizes and the shared keg

See `SHOPIFY-READINESS.md` section 3 for the three stock options. Verified this round against the variant model:
- A product only gets a size choice when Shopify gives it a variant named 500ml and a variant named 1 litre (several spellings accepted, for example "500 ml", "0.5L", "1L", "1000ml"). Today none does, so nothing shows.
- Tested: the size picker is absent for all single-variant products; a 250 ml variant is never offered or sold and is refused if a basket names it; if the 500 ml is sold out the 1 litre is the default; if both are sold out the product shows Sold out.
- A product with sizes shows **no stock figure** and **never treats missing stock as unlimited**: it is capped at 24 per size in an order and Shopify's checkout is the final authority.

## 6. The real catalogue as the website sees it (27 November 2026)

| Collection | Product (as in Shopify) | Price | ABV | Tag | Sizes | Stock figure |
|---|---|---|---|---|---|---|
| beers | ALDARIS KRSU - CHERRY BEER ABV 4.5% | £5.00 | 4.5% | fridge | Default Title | not shared |
| beers | AMITY - FESTOON - HELLES LAGER - ABV 4.6% | £5.50 | 4.6% | on the wall | Default Title | not shared |
| beers | AMITY - WATERPISTOL - JUICY PALE ALE - ABV 4.6% | £5.50 | 4.6% | on the wall | Default Title | not shared |
| beers | AMITY BREW CO - BIGGER BOAT - DIPA ABV 8.0% | £6.00 | 8% | fridge | Default Title | not shared |
| beers | AMITY BREW CO - SYNC RATE - AMERICAN RED ALE abv 4.8% | £5.00 | 4.8% | fridge | Default Title | not shared |
| beers | AMITY BREW CO x GOOD WORD BREWING - FIRST EDITION - PALE ALE ABV 5.1% | £5.00 | 5.1% | fridge | Default Title | not shared |
| beers | BINI BREW CO - HELLES YEAH! - HELLES LAGER ABV 5.0% | £5.00 | 5% | fridge | Default Title | not shared |
| beers | ILKLEY - West Coast IPA Jet Lag, ABV 5.7% | £6.00 | 5.7% | on the wall | Default Title | not shared |
| beers | ILKLEY BREWERY - PALE ABV 4.2% | £4.50 | 4.2% | fridge | Default Title | not shared |
| beers | ILKLEY BREWERY - SLAKE - LAGER ABV 4.5% | £4.50 | 4.5% | fridge | Default Title | not shared |
| beers | KIRKBY LONSDALE - DEVILS BRIDGE - IPA ABV 5.2% | £5.50 | 5.2% | on the wall | Default Title | not shared |
| beers | OTHERWORLD BREWING - BA NYX - BARREL AGED HISTORIC PORTER ABV 7.1% | £6.00 | 7.1% | fridge | Default Title | not shared |
| beers | OTHERWORLD BREWING - BLOSSOM - JASMINE BLOSSOM - NEIPA ABV 6.4% | £5.50 | 6.4% | fridge | Default Title | not shared |
| beers | OTHERWORLD BREWING - PITCH - CZECH DARK LAGER ABV 4.9% | £5.00 | 4.9% | fridge | Default Title | not shared |
| beers | SVYTURYS - EKSTRA PREMIUM LAGER ABV 5.2% | £4.50 | 5.2% | fridge | Default Title | not shared |
| beers | TWO TOWNS DOWN BREWING - BELTER - LAGER ABV 4.5% | £4.50 | 4.5% | fridge | Default Title | not shared |
| beers | TWO TOWNS DOWN BREWING - THESE STREETS - PAISELY PALE ALE ABV 4.0% | £4.50 | 4% | fridge | Default Title | not shared |
| beers | URSUS BREWERIES - PREMIUM BLONDE BEER (LAGER) ABV 5.0% | £4.50 | 5% | fridge | Default Title | not shared |
| beers | VAULT CITY BREWING - IRON BREW SOUR OF SCOTLAND - SOUR ABV 4.8% | £5.00 | 4.8% | fridge | Default Title | not shared |
| beers | VAULT CITY BREWING - RADLER - FRUITED BEER SOUR ABV 3.4% | £3.50 | 3.4% | fridge | Default Title | not shared |
| beers | VAULT CITY BREWING - RASPBERRY SOUR ABV 5.0% | £5.00 | 5% | fridge | Default Title | not shared |
| beers | VOLFAS ENGELMAN - IMPERIAL PORTERIS ABV 6.0% | £5.00 | 6% | fridge | Default Title | not shared |
| beers | VOLFAS ENGELMAN - KRIEK BELGIAN TYPE CHERRY BEER ABV 4.0% | £5.00 | 4% | fridge | Default Title | not shared |
| ciders | FIZZ CIDER APPLE CIDER ABV 4.5% | £3.00 | 4.5% | fridge | Default Title | not shared |
| ciders | FIZZ STRAWBERRY TASTE CIDER ABV 4.0% | £3.00 | 4% | fridge | Default Title | not shared |
| ciders | SHEPPY'S - 200 MEDIUM CIDER ABV 4.9% | £4.50 | 4.9% | on the wall | Default Title | not shared |
| ciders | SHEPPY'S - CIDER WITH ELDERFLOWER ABV 4.0% | £4.80 | 4% | on the wall | Default Title | not shared |
| ciders | SHEPPY's - CIDER WITH RASPBERRY ABV 3.4% | £4.70 | 3.4% | on the wall | Default Title | not shared |
| ciders | VOLFAS ENGELMAN - APPLE CIDER SEMI DRY ABV 4.5% | £3.00 | 4.5% | fridge | Default Title | not shared |
| wines | ASKANELI BROTHERS TSINANDALI – WHITE DRY – 750ML BOTTLE (13.0% ABV) | £14.00 | 13% | (neither) | Default Title | not shared |
| wines | KINDZMARULI MARANI ALAZANI VALLEY RED SEMI-SWEET – 750ML BOTTLE (12.5% ABV) | £14.00 | 12.5% | (neither) | Default Title | not shared |
| wines | KINDZMARULI MARANI ALAZANI VALLEY WHITE SEMI-SWEET – 750ML BOTTLE (11.5% ABV) | £13.00 | 11.5% | (neither) | Default Title | not shared |
| wines | KINDZMARULI MARANI SAPERAVI RED DRY – 750ML BOTTLE (13.0% ABV) | £14.00 | 13% | (neither) | Default Title | not shared |
| wines | VINO BIANCO FRIZZANTE ABV 10.5% | £9.50 | 10.5% | on the wall | Default Title | not shared |
