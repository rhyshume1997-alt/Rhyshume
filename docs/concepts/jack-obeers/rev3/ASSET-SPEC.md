# Asset specification: purpose-made pour film and bottle (Jack O'Beers)

Why this is needed. The supplied AI-generated pour clip (736 x 400, 5 s) is convincing at card and hero size but soft if enlarged, starts with the glass already part-filled, shows one beer colour, and was not made with the client's real product. This specification is for the clips that replace it. The current page works with the supplied clip, and with a drawn fallback (`?pour=svg`), until these arrive.

Rights first. The supplied references are AI-generated and contain invented branding (a chalkboard reading "Jack O'Beers, Beer, Wine, Spirits, Deli, Good Times"). None of that text is used. The commercial-use terms of whichever tool or studio makes the final assets must be confirmed in writing before launch. Nothing in the frame may show a logo, label text, date or establishment claim that is not the client's own.

## A. Hero pour film (desktop and tablet)
- Content: one locked-off shot on a deli counter (warm wood, soft background with shelves and food, no readable signs). An amber glass bottle, the same bottle as in section C, enters from beyond the left frame edge, already tipped, so no hand or body is needed and its base is never visible. It pours into an **empty** clean pint glass. The level rises steadily, a foam head forms and settles, the stream thins and stops, the bottle withdraws out of frame. 5 to 7 seconds.
- Glass: the same glass as section B, clean, with condensation developing.
- Frame: 16:9, 3840 x 2160 master, delivered at 2560 x 1440 and 1920 x 1080. 24 or 25 fps, constant. No audio track.
- Composition: glass centre-right (about 60 to 70 percent across), bottle neck entering from top left. Leave the lower-left third of the frame calm, because the logo plaque sits there.
- First and last frames: the first frame is the empty glass with the bottle already in position, so the page can show it as a still. The last frame is the settled full glass, the bottle gone, so the page can hold on it.
- Delivery: WebM (VP9) and MP4 (H.264, High profile, yuv420p, faststart), plus a first-frame still and a last-frame still as WebP, same dimensions. Target under 1.2 MB per clip at 1920 x 1080. Constant exposure, no flicker, no camera drift.

## B. Product pour film (cards, 4:5 and 3:2 crops)
- Same bottle, glass and counter as A so the page stays consistent, composed to survive both crops. Subject centred, bottle entering from beyond the **left** frame edge (the card window is cropped on that side, so the bottle must come from outside it).
- 3 seconds, loop-safe or ending on a settled full glass. 1280 x 720 master, delivered at 960 x 540. Same encoding as A.
- Liquid variants, one clip each, same shot: lager (pale gold, white head), amber ale, stout (near black, tan head), cider (clear gold, thin fizzy head), and a still-wine variant (no foam) once wine photography is agreed. If keyed liquid is delivered instead, supply a clean plate and a matte for the liquid.
- Product info must never rely on the film: it is decorative.

## C. Bottle, cut-out, for the cursor and product slots
- Real photograph or render of the same amber glass bottle used in A and B, on a clean background, with an alpha channel (PNG or lossless WebP), 2000 px tall minimum, true proportions, condensation, no label text. Provide a version with a plain crown cap and a version with no cap, plus a layered file (glass, liquid, highlights, droplets) if rendered.
- Each real product, once photographed, as its own cut-out with the client's real label, replaces the stand-in.
- Edge quality: clean transparent edges with no white halo when placed on cream, brown and near-black. Include a mask.

## D. Phone composition
- Portrait 4:5 version of A (1080 x 1350), composed separately, not cropped from landscape. Same rules, 5 to 6 seconds, under 900 KB.

## E. Rendered route (Blender or similar), if a render is preferred over filming
- Glass: IOR 1.5 with real wall thickness and a slightly thicker base. Liquid: IOR 1.33, absorption tuned to the target colour, no flat fill. Foam: a bubbly volume or particle cap with believable settle time (about 2 to 4 s), a thin brighter ring where it meets the glass.
- Stream: a fluid simulation (not a cylinder), with a thin neck, entrainment of air, small splash and rising bubbles at impact, and a stream that thins and breaks cleanly at the end.
- Bottle: condensation droplets as displaced geometry, a subtle condensation roll-off, a visible liquid line and bubbles inside as the bottle tips.
- Counter: timber with believable reflections of the glass. Soft overhead warm key, cooler rim light, shallow depth of field. Denoise without smearing droplets.
- Render passes for the page: beauty, liquid matte, glass highlights, shadow, so any can be re-graded.

## F. Video-generation route (if generated)
- Prompt outline: "Locked-off camera, deli counter, warm wood, soft blurred shelves of food. An amber glass beer bottle enters from the left edge already tilted and pours a steady stream into an empty pint glass. The level rises, a creamy white head forms and settles, the stream thins and stops, the bottle leaves frame. Natural liquid physics. Condensation on the glass. No hands, no people."
- Negative guidance: no text, no logos, no labels, no signs or chalkboards, no hands, no extra bottles, no liquid defying gravity, no glass morphing, no camera movement, no flicker, no watermark.
- Accept only clips where the glass starts empty, the level rises monotonically, the glass keeps its shape and size, the bottle neither shrinks nor changes colour, and the final frame is stable. Reject and regenerate otherwise.

## G. Acceptance checks
Plays in current Chrome, Safari and Firefox on desktop and a mid-range phone; no visible stretching at 1x and 2x; first and last frames match the stills; file sizes within budget; audit that no text or logo appears; written licence terms for commercial use; delivered with source or generation settings so variants can be reproduced.
