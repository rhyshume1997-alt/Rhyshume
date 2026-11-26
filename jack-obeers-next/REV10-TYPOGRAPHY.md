# Rev 10: typography consistency audit

Private preview, Behind the Counter look. Typography only: no layout, photograph, animation, colour or catalogue change. The selected system is locked:
**Gloock** for display (main headings, editorial headlines, category names, the 01/02 numerals) and **Source Serif 4** for everything else (body, navigation, buttons,
product information, filters, prices, labels, form controls). The logo is an image and was not touched.

## How it was investigated
Computed styles read from the rendered pages in a browser, not from the CSS alone: every visible text node and every input, button, select, summary and placeholder on 11 pages
(Home with its Beer, Cider and Wine panels, Find me a beer and the basket open, Beer, Cider, Wine, a product page, About, Events, Draught Club, Members, FAQ, West Highland Way) at 390 and 1440 px.
Plus a walk of every stylesheet rule that sets a font, a probe that builds each control class in the right context on the homepage panel and the dedicated pages, and a check of the font files
that actually loaded. The audit was run on a build that uses the Shopify-style test catalogue, because an earlier local build used the sample catalogue (no style tags on ciders),
which is why the Cider filter never appeared in my earlier screenshots.

## What was wrong (exact)
| # | Finding | Evidence | Where |
|---|---|---|---|
| 1 | **`.pg-chip` (the filter on Cider and Wine) was in the system font** (`font: 600 .9rem system-ui`). Beer uses the segmented `.seg-btn` filter, which got Source Serif 4 in Rev 6. So Cider looked different from Beer. It was also a black and white pill where Beer's is an underlined tab | computed `system-ui / 600 / 14.4px` on /ciders and in the homepage Cider panel; Beer's `.seg-btn` was `Source Serif 4 / 600 / 15.2px` | Cider and Wine pages, homepage Cider panel |
| 2 | `.pg-more`, `.pg-flav li`, `.range-close` also named `system-ui` in the base stylesheet. In the Behind look a later override already won, so they rendered correctly there, but in every other look (and any page the override missed) they fell back to the system font | rule list: 4 declarations naming `system-ui` | base CSS, all other looks |
| 3 | **Prices in the display face:** the Draught Club plan prices (£24.99, £39.99) and the product page price were Gloock 600, while every other price is Source Serif 4 | price scan of all pages | /draught-club, /product/… |
| 4 | **Faux bold:** Gloock has one weight (400) but was asked for 600 and 700 in places (the header "O’" in Jack O’Beers, the product names in the Best sellers strip, the plan prices). The browser smears a fake bold | weight scan: Gloock at 600 and 700 | header, Best sellers, Draught Club |
| 5 | Source Serif 4 was asked for weights 500 and 700 with files only for 400 and 600; the browser picked the nearest, which worked but only by luck | weight scan: 98 elements at 700 | everywhere |
| 6 | **A setting could swap the type system.** `?type=a|b|c` (the Rev 6 comparison) was stored in the tab (`jo_type`), so one visit to a comparison link changed every page's typography for the rest of that tab | `sessionStorage.jo_type` | preview only |
| 7 | The two selected fonts were not preloaded on previews, so a page could briefly flash a fallback serif before the real face | no preload for Gloock or Source Serif 4 | preview only |

Checked and found fine: all other controls (500 checked: inputs, selects, buttons, summaries and placeholders), the navigation, footer, basket, the mobile action bar, product names, About, Deli, Events, FAQ,
Members, West Highland Way. No font file failed to load. The `01`/`02` numerals stay in Gloock on purpose. The brand text and the logo image were not touched.

## Fixes
1. The four older rules now use `var(--ui)` instead of `system-ui` (root cause; every look now uses its own interface font and there is no system font left in the stylesheet except the last-resort fallback inside `--ui`).
2. Cider and Wine now use the same underlined-tab filter as Beer, with the same size, weight and selected style (amber underline) on the dedicated pages and in the homepage panel.
3. The font files state the weights they stand for (Gloock 400 to 900 maps to its one weight; Source Serif 4: 300 to 500 to the 400 file, 600 to 800 to the 600 file), and `font-synthesis: none` is set, so nothing is ever faux bold or faux italic. The few elements that declared a bold Gloock are set to 400.
4. The Draught Club and product page prices are Source Serif 4 (size and weight unchanged).
5. `?type=` applies to the page it is on only; a value left in the tab by an earlier visit is cleared.
6. Gloock and Source Serif 4 are preloaded on previews.

## Evidence
- After the fixes, in the browser: 0 of every visible text element and 0 of 500 controls outside Gloock and Source Serif 4, on 11 pages at two widths. No font file failed.
- Beer, Cider and Wine: heading, product name, brewery line, meta line, price, Add to basket and count compute identically on all three pages and in the homepage panel (a test checks it), and the panel matches the dedicated page.
- Page audit: 8 pages at 360, 390, 430, 768 and 1440 px, 0 flagged for overflow, overlapping text, cropped pictures, axe violations or layout shift.
- Automated tests added (see the hand-over for totals): a typography check on every page, Cider against Beer, same content same typeface across all three categories, every price in Source Serif 4, no faux weights, fonts loaded, `?type=` not remembered, no clipping at four widths, and a live-mode check that no control uses the system font.

## Not changed / limits
- Deliberate hierarchy is untouched (sizes, weights 400 and 600, the numerals).
- Not tried on a real phone, Safari or Firefox.
- The test catalogue has no flavour tags or "See flavour profile" links on Cider; those controls were checked by building each class in context rather than on real data.
- The earlier looks (Original, Classic, Back Bar, Cinematic) keep their own typefaces; only the stray system font in their controls was fixed.
