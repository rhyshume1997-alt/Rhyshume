# Photographic motion: what changed

Direction (November 2026): the site should feel like cinematic industrial photography that moves. The supplied
reference board (five AI-generated concept images) sets the look: dark tungsten-and-teal grade, crushed
blacks, directional light, haze, shallow focus, macro steel. The reference images themselves are **not** used
anywhere on the site, as the brief requires approval before any generated image is published.

The 3D and Blender work has stopped. `src/viewer.js`, `site/assets/viewer.min.js`, `blender/`, the model and the
renders are unchanged and still used on the test pages. The homepage no longer loads any 3D code or model.

## Imagery: genuine Marpet photographs only

`tools/cine.py` makes graded copies of Marpet's own photographs in `site/assets/img/cine/`. The grade
changes tone and colour only. It does not add, remove or invent anything:

- darker exposure, crushed blacks, an S-curve
- red resin floors and loud cyan belts muted
- teal shadows, tungsten highlights, soft bloom on the brightest steel
- light falling away towards the ceiling and the edges

It also writes a blurred backdrop copy of each photograph (for layered depth), two close-ups cut from the
1024 px originals (the brushed side panel in IMG_0272, and the side frame with the Marpet logo plate in
IMG_0283), a film-grain tile and a brushed-steel sheet texture made from noise.

Re-run it after adding photographs: `python3 tools/cine.py`.

## Homepage

**Opening, about 6.4 seconds, GSAP timeline.**
1. Starts close on the brushed side panel of a Marpet conveyor, out of focus, and pulls into focus while a warm light travels along the steel. The camera drifts along the panel.
2. Dissolves to the side frame and Marpet logo plate, still close, and draws back.
3. Dissolves and pulls back into the production hall. The headline and the enquiry button arrive as the camera settles.

"Skip intro", Escape, the mouse wheel or a touch scroll end it at once. Returning visitors land on the
finished frame, and "Replay opening" runs it again. The header, menu and "Request a quote" work throughout.

**Scroll scenes.** The stage stays pinned while scroll moves the camera through four photographs: the hall,
then one per service (conveyor systems, general fabrication, production lines). Each scene has three
layers: a soft backdrop that moves slowly, the sharp photograph dollying in, and a blurred foreground copy
that rises faster than both. A brushed steel sheet crosses the frame between scenes (from the right, from
below, from the left), and the photograph changes behind it. The chapter copy arrives with its scene.
Scroll position is eased, so the camera carries a little weight.

**Below the scenes**, every section uses the dark palette (charcoal and dark brushed steel, tungsten accents), and
steel sheets lift or part to reveal sections as before.

## Services

- Full-bleed graded header (the production hall), settling from a push-in, with light, haze and grain.
- Viewing frame: two brushed steel shutters close over the frame, the photographs change behind them, and
  they part on the new service. The new photographs settle from a push-in and the caption rises after.
- Service pages: layered header (blurred backdrop of the service's own photograph behind the sharp, graded photograph).

## Our Work and project pages

- Each project is a full-width scene: soft backdrop, then the large graded photograph, then the caption, each moving at its own rate.
- Two steel panels cover each photograph and slide apart as the scene arrives.
- Selecting a project expands the photograph into the project page header, which uses the same layered treatment.

## About, Team, Contact

Full-bleed graded headers (Marpet van and roller table; the brushed side panel; the table and belt conveyor),
the same atmosphere layers, and the dark palette. Body text, forms and navigation are unchanged in
structure. The enquiry form keeps white fields with dark text.

## Accessibility and fallbacks

- Reduced motion: no opening, no scene scrubbing, no sheets, shutters or panels, no grain or haze movement. A still, graded photograph. Tested.
- No JavaScript: every page reads normally and photographs are never covered. Tested.
- If the scripts never arrive, the headline still appears after five seconds.
- axe-core reports no serious or critical problems on any page at 1440, 820 and 412 px.

## Limits, and the assets that would remove them

| Limit | Why | What would fix it |
|---|---|---|
| No true weld macro in the opening | Marpet's library has no weld or close-detail photographs. The opening uses the closest genuine material: a brushed panel and the logo plate, cut from 1024 px photographs | A short session photographing welds, brushed panels, bearings and fixings at full resolution (any recent phone, in raw if possible) |
| Close-ups are soft | They are crops of 1024 px photographs, enlarged about 2.5 times. Grain and depth of field hide some of it | Originals at full camera resolution |
| Most photographs are small | 52 of the 66 photographs are under 700 px wide. Chapter scenes use 652 px images enlarged | Originals, or new photography of recent jobs |
| No footage | All motion is camera movement over stills. Nothing in the frame moves by itself (no belt running, no sparks) | 5 to 10 second clips: a belt running, a weld being laid, the workshop floor. Each would drop straight into a scene |
| The reference look is partly lighting | Bright, evenly lit production halls can be darkened and toned, but not relit | New photography lit for mood |
| Concept imagery | The five reference images are not used | Your approval, if you want any of them used (for example as an abstract texture), clearly labelled |

## Files changed

`build.mjs`, `site/assets/styles.css`, `site/assets/app.js`, `src/motion.js` → `site/assets/motion.min.js`,
`tools/cine.py` (new), `site/assets/img/cine/` (new), `test/site.test.mjs`, `test/browser.cjs`,
`package.json` (the 3D bundle is now built only by `npm run bundle:viewer`).
