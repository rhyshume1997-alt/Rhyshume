# Rev 7: photo treatment system

Private preview, Behind the Counter look only (`html[data-look="behind"]`, previews only). The earlier looks still show their own frames. Nothing was merged or
deployed. Checkout, payments, stock, accounts and delivery rules are untouched. No business claims were added (captions only describe what the photographs show).

## The system: three treatments, three jobs
| Treatment | Used for | What it is |
|---|---|---|
| Cinematic | The opening, and the numbered-taps band | The picture runs the full width with no frame. The headline and copy are set around it on a mahogany and green wash (`.taps-cine`). No card, no border |
| Editorial mount | Deli, the shop interiors, supporting pictures | A picture mounted on a cream card with a fine printed line inside the mount and a short caption with a small amber rule. Three variations: **a** mount with the caption below; **b** a printed plate with the caption set in its foot margin, right aligned; **c** the caption set beside the picture |
| Polaroid | Michael and Tanya only | A small print: off white border, heavier bottom margin, a slight turn (about 1.4 degrees), a little grain over the picture only (never over the border), a handwritten-style caption |

Where each is used: About → Polaroid (Michael and Tanya) with a beer mat; Deli → a tall mount (variation a) with a beer mat, and a wide mount (variation c) lower down;
the two shop photographs under About → mounts (variations b and a), the second stepped down so they are not a pair of identical cards; the tap-wall band → cinematic;
the walk-in and product pictures use a plain mount. The old black awning frame is no longer around any photograph in this look.

## The beer mat
A real-object motif used twice, never more: tucked behind the deli mount and behind the Polaroid. It is a card coaster with a printed ring and the supplied round Jack badge
(`jack-mascot.svg`), not an invented crest. It is decorative (`aria-hidden`, no pointer events). Motion: when its picture first comes into view the mat slides about 1.7rem
out from behind it and settles (0.85 s, ease-out); the Polaroid eases from a slightly lower, more tilted position into place (0.7 s). Both run once. With reduced motion they are already in place.
A test checks a mat never sits over text or a control.

## Mobile
Polaroid: centred, at most 22rem wide, mat smaller and on the left edge. Mounts: variation c stacks (caption under the picture); the deli lead mount is 4 by 3 and the mat tucks
at its corner above the heading. The cinematic band keeps the headline over the darkest part of the wall and puts the Bottled-fresh seal under the copy.

## Fixes found while building
- The Polaroid shifted the page while its picture loaded (layout shift 0.126). The picture's box is now sized by the box, so nothing moves (0.009).
- Two photographs had a caption identical to their alt text (an accessibility warning); captions now say something different.

## Critique
- **Designed in or placed on?** The Polaroid and the deli mount read as designed objects: they have a physical edge, a caption with a job, and the mat gives the mount a reason to be there. The
  numbered-taps band is the strongest use, because the type is set into the picture rather than under it.
- **Too gimmicky, fake, childlike or AI?** The Polaroid is restrained: small rotation, grain only on the picture, no tape, no scrapbook. The mats are the riskiest element; kept to two, small, and mostly hidden.
  They are a decoration, not information. If Michael finds them cute rather than classy they come out with one rule (`.beermat { display: none }`).
- **Still weak:** the two mounts under About are the least distinctive photographs on the page; they are tidy but could belong to any independent business. The cream mount on the dark green deli
  is brighter than anything around it and pulls the eye; it may want to be a warmer, darker paper.
- **Typography:** captions use the same readable serif as the interface, the Polaroid caption uses its italic once, headlines are unchanged. No heading was touched.

## Limits
- The deli list shows names without prices or Add to basket buttons, locally and on the deployed preview, because the deli items are not set up as products in Shopify yet (only popcorn has a confirmed price). This is the existing fallback, not a change in Rev 7. The Rev 6 "before" screenshots happened to be taken with deli products present, which is why the before and after deli shots differ in that one respect.
- Not checked on a real phone, Safari or Firefox.
- The Polaroid and mount crops were chosen by eye on the supplied photographs; they should be reviewed if the photographs change.
