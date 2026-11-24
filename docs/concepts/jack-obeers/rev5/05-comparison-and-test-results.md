# Rev 5: comparison with the previous preview, and test results

Branch `claude/jack-obeers-rev5` (off `claude/jolly-einstein-ihxj1o`, which is untouched). Code: `p-5c2e81a7f3b04d96/rev5/` (`index.html`, `drinks.html`, `product.html`, `rev5.css`, `rev5.js`, `build.py`). Reuses the sample data, fonts and media in `site/`. Nothing merged, nothing deployed to production, no Shopify or payment connection.

## What materially improved
| Area | Previous preview | Rev 5 |
|---|---|---|
| Opening | Footage behind a headline, small logo on a hard square plate | Very large headline, tall arch window with the pour (bottle enters from the top edge of the arch, cropped by the frame), wooden counter, round enamel logo medallion that lies down then gets up. The headline is lit letter by letter by the pour's progress |
| Opening to site | Thin wood strip | Scroll carries the arch to full bleed, the medallion lunges, the counter slides away, the cream shelf rises under a wooden lip |
| Beer cursor (workbook) | Missing from the site | Weighted brown-bottle cursor on the shelf only; tips to a glass and fills it in that beer's colour; hides over text and controls; tap, keyboard and reduced-motion versions |
| Product discovery | Mega menu to a grid of identical cards | Big numbered index rows (Corner Shelf idea) then glasses on a shelf; label panel with descriptor, flavour dials, pairings, allergens (placeholder); two clicks |
| Deli | A card grid | Full-bleed forest band, scalloped awning edge, ticket stubs that swap the photo slot |
| Hampers, services | Tiles | Arch photo slot with sample hamper cards; numbered accordion rows that stay honest about what is unconfirmed |
| Logo treatment | Hard square plate | Round medallion; the workbook's "rounded, not blocky" note is respected (interpretation to confirm) |
| Materials | Flat colour | Wood grain, paper grain, contact shadows, brass trim |

## What still needs work
- The pour clip is 736 x 400 AI footage: fine in the arch, soft full screen (visible when the arch fills the screen). A real 4K pour is needed.
- The bottle cursor image is a small AI cut-out with a slightly hard edge; needs a photographed bottle with soft edges.
- The logo animation is a stand-in made from the 244 px PNG; real animation and a vector logo are needed.
- All photo slots are empty ("Photo coming soon"); no real product, deli, hamper or shop photography.
- Only the home page, shelf and product pages are redesigned; About, Shipping, Click & collect and Members exist as sections, not separate pages.
- Dubai font not used (licence). Colours are provisional.
- Checkout is a demo dialog; age check, delivery rules and licensing are not built.
- Not tested in Safari, Firefox or on a real phone.

## Test results (Playwright, Chromium)
Run with `NODE_PATH=/opt/node22/lib/node_modules node r5i.js` and `r5hdr.js` (scratch scripts, not committed).
- Beer cursor: shown over a glass; glass fills; hidden over the tag, Add button, page heading and shelf bar: PASS.
- Two clicks: header Shop > Ciders (1), product (2) opens the label panel with flavour, pairings and allergens: PASS. Home: Beers row (1), product (2): PASS.
- Basket count updates from the panel: PASS.
- Keyboard focus fills the glass: PASS.
- Reduced motion: all headline letters lit, video paused, no bottle element, glass fills on hover: PASS.
- Mobile (iPhone 13 profile): no sideways scroll on home and shelf; tap shows the bottle drop; panel opens after the pour: PASS.
- axe-core (wcag2a, aa, 2.1, 2.2, best-practice) on home, shelf, product: 0 violations. axe cannot judge text over moving video; the hero text is on a dark overlay and was checked by eye.
- Header overlap at 12 widths from 320 to 1440, menu closed and open: 0 failures.
- Console errors: none.
- Correction: my first run of these checks used a faulty assertion style that reported false passes and failures; they were rewritten and the results above are from the corrected run.
- Visual review: I looked at desktop and mobile screenshots and frames from all four recordings, and fixed the hero headline wrapping, the medallion covering buttons, low-contrast labels on the green band, and the mobile hero layout.

## Files
Screenshots: `rev5/screenshots/`. Recordings (opening, scroll transitions, beer interaction, mobile tap): `rev5/recordings/` (mp4 and webm).
