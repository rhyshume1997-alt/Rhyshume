# Rev 8: final visual refinement (fix, not redesign)

Private preview, Behind the Counter look only. Same selected design: tap-wall opening, Gloock and Source Serif 4, the illustrated Pick a Shelf, Jack,
cream and mahogany. No new concepts and no new animation. Nothing merged or deployed. Checkout and shopping code untouched.

## What was wrong (reproduced from the phone screenshots)
The Polaroid collapsed to the width of its caption at every screen size, desktop included. In Rev 7 its picture was made absolutely positioned (to stop a layout
shift), which left the figure with no width of its own, and the old `.about-people` grid rules (from an earlier layout) were still applying to it. So the photograph
vanished, its caption and the beer mat spilled over the video caption and the introduction. My Rev 7 tests did not check the Polaroid's size; they passed.

## What changed
- **About recomposed as one block.** Desktop: Michael's video mounted on cream with a fine printed line and a matching caption, with the Polaroid beside it,
  centred against it, then the introduction and hours below, then the two shop photographs. Phone: video, then the Polaroid, then the introduction, in that order.
  The Polaroid has its own width (at most 24rem, 21rem on a phone), the old grid rules are switched off for it, and the written introduction always starts below the
  photographs and the beer mat.
- **Polaroid:** a complete frame, a square crop on Michael and Tanya (both clearly visible at 360, 390 and 430 px), a larger bottom margin (4.3rem) so the caption always fits, grain on the picture only.
- **Beer mat:** on desktop it sits behind the Polaroid's left edge, in the gutter between the video and the print. On a phone it tucks behind the lower right corner, below the print
  and above the text, so it stays visible. It is behind the photograph, never over text, one slide into place (the existing one), and nothing else.
- **Deli:** the cream mount is a warmer paper against the green; on tablets the pictures are capped in size so they do not dominate.
- **The video** takes the same mounted treatment as the other editorial pictures.
- **Not every photograph has a border:** the opening, the numbered-taps band and the two clips in the tap-wall section have none.

## How it was checked
- Real browser screenshots of About and Deli at 360, 390, 430, 768 and 1440 px (see the before and after images).
- A page audit of 8 pages (home, About, Events, West Highland Way, product, beers, Draught Club, FAQ) at those five widths: no sideways scroll, no overlapping text
  boxes, no photograph cropped off the page, no axe violations, layout shift under 0.05 (40 page and width checks, 0 flagged). The first pass of the overlap checker
  flagged text inside closed accordions and wrapped inline links; those were false alarms in the checker, and it was corrected, not the page.
- New automated tests: for each of the five widths the Polaroid is a whole, square, correctly sized print; its caption is inside it; nothing overlaps it; the mat is behind it, inside the
  screen, clear of all text and of the video; and the introduction starts below the photographic block.

## Remaining issues
- Not tried on a real phone, Safari or Firefox.
- The two deli pictures are two views of the same cabinet; a different photograph (the fridges, or a close-up of a pie) would add more.
- The deli list shows names without prices and buttons while the deli items are not products in Shopify (unchanged).
- The Polaroid and mount crops are chosen by eye on the supplied photographs.
