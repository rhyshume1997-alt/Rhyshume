# Flagship redesign pass: what changed

Branch `claude/flagship-redesign`. Private preview only. Not merged, not live.

## Added
- `design-concepts.html`, `design-concepts.css`, `design-concepts.js`: the eight fictional concepts as a curated portfolio. Four different compositions, each in its concept's own colours, with a moving preview (plays in view, pause button, off for reduced motion and data saver), a phone view, colours and type, what it demonstrates, and the notice "Concept by Rhys Hume, not a live site." Filter chips (enquiry journeys, booking, shop, galleries, menus, planners) and a sticky index.
- `images/concepts/*` (poster, thumbnail and phone view for each) and `video/concepts/*` (the supplied clips, loop-safe encodes, 736 x 400, never enlarged beyond the layout).
- `design-concepts-private.js`: points the page at the hidden working demonstrations. Loaded only on preview and local hosts. **Delete before any public launch** unless the concept routes are approved for publishing.
- Home page: a building example in the hero (pick phone call, quote request or booking and the example changes its picture, colours and button), a routes band, the eight concepts strip, and a "Real work and work in progress" divider before the Marpet before and after and the JNR result.
- Navigation: "Design concepts" added to the menu on every page and the footer contents.
- Sitemap entry. Tests: `test/flagship.test.js`.

## Kept as it was (approved earlier)
- The home headline, sub line, preview button, booking link and phone number.
- The Marpet before and after slider (still labelled launching soon), the JNR result line, the three services and their from prices (£1,500, £150, £200, care plan from £35 a month, listings from £120), the three steps, the engineering tile with Tolra in pilot, the structured data.
- Validation (computer system validation) stays linked from the footer on the home page, as the existing test requires, and from the menu on the other pages.
- Existing booking and contact routes.

## Decisions to confirm
- **Prices.** The brief quotes "Standard website from £2,200, website plus quote workflow from £3,800, care plan £60 a month". The live site and the workbook say from £1,500, from £3,800 and from £35 a month. No price was changed. Tell me which is right before launch.
- **Concept demonstrations.** They are never offered on the public site: the buttons only appear on preview hosts. Publishing them needs your approval.
- **Validation on the home page.** An earlier test requires validation to be linked only from the footer. I kept that.
