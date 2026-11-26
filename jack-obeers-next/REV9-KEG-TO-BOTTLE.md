# Rev 9: From keg to bottle (tap wall section only)

Private preview, Behind the Counter look only. Changed: `TapsSection.tsx` (a new `KegToBottle` block), the look-effects hook (one selector added), and a CSS block
scoped to `.taps-new`. Not touched: About, Deli, Pick a Shelf, the opening, navigation, Shopify, the basket, `KegBlurb.tsx`, and every other section.
The live (indexable) site and the earlier looks still show the original tap wall block.

## KegBlurb check
`KegBlurb` is used in three places: this section, the beer panel under Pick a Shelf (`ShopTiles`), and the range pages (`CategoryPage`, /beers). Its wording was not edited, so
the beer panel and /beers are unchanged (a test checks both still show the original wording, and that the new closing statement appears on neither). In the preview the
new section simply no longer renders `KegBlurb`; the closing statement is its own element.

## What it is
- Heading, introduction, both captions and the closing statement use your exact wording. Numbered details: 01 Fresh from the tap, 02 The perfect pour.
- The same two videos (both 16 by 9, aspect ratio kept), each in a thin brass frame with a fine rule just inside it. No thick frame, no card, no shadow.
- Desktop: the first frame is wider, the second is set lower. A brass fitting sits on the first frame, a fine line runs across, turns down, ends at a small ferrule, and a small amber
  drop hangs above the second frame, like the fittings and rail on the real wall. Phone and tablet: the frames stack and the same line runs down the left, from the 01 fitting to the drop by 02.
- The closing statement is a pull quote in Gloock with a short brass rule above it; no box. It keeps 8rem of scroll margin so the fixed phone bar cannot sit on it.
- Motion: when the feature first comes into view the line draws once (1.3 s, ease-out) and the drop settles. With reduced motion everything is already drawn.
- Gloock and Source Serif 4 throughout. No added animation or decoration.

## Removed from this section in the preview
The round "Bottled fresh from keg" seal and the old "keeps for up to two weeks" paragraph are not in the new block. Both are unverified-duration wording you asked not to carry in. The seal and
paragraph still exist on the live site and the other looks. The old block's "a sealed bottle keeps up to two weeks" line also remains in the beer panel (via KegBlurb); that is unchanged and still needs Michael's confirmation.

## Verification
- Rendered at 360, 390, 768 and 1440 px; automated checks at each width: no text boxes overlap, no text over a frame, the rail never crosses a video or any text, frames stay inside the screen, no sideways scroll, both videos stay 16 by 9.
- The fixed phone action bar does not hide the closing statement.
- Page audit across 8 pages and five widths (40 checks): 0 flagged for overflow, overlap, cropped pictures, axe violations or layout shift.
- Full test suite: see the hand-over for counts.

## Limits
- Not tried on a real phone, Safari or Firefox.
- The brass line and drop are CSS (borders and one small inline drop shape), so the geometry depends on the desktop two-column layout; it is checked at 864 px and wider, and the stacked version below that.
- The "The numbered taps" caption at the top right of the section is the existing Rev 7 caption and is now very faint over the darker backdrop.
