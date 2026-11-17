# Conveyor realism: Blender benchmark and interactive Three.js test

Isolated test. The homepage, its layout and its copy are unchanged. Nothing is deployed or merged.

Open `site/material-test.html` (see the README for how to serve it). Side-by-side stills are also saved in `review/compare-hero.jpg`, `compare-drive.jpg` and `compare-weld.jpg`.

## Where this stands

- **Blender Cycles is the visual benchmark.** One master model, `blender/conveyor.py`, produces both the benchmark renders and the browser model.
- **The Three.js version is much closer than it was, and still short of Blender.** The brushed side panel, fasteners, take-up and end plate now hold up at the same camera angle. The floor, the light under the machine and the leg highlights do not.
- **Frame rate on a real phone is not measured.** This environment has no GPU. CPU cost and download sizes are measured; the rest needs a phone in hand.

## The master model

Reconstructed from four Marpet photographs. Every dimension is an estimate.

| Feature | Taken from |
|---|---|
| Folded side frame with top return lip, paired button-head screws | `IMG_0272.jpg` |
| Bolted end plate, hex bolts on washers, threaded belt take-up with two nuts | `header2.jpg` |
| Orange two-bolt flange bearing housings, square legs, threaded adjustable feet | `header7.jpg` |
| Blue flat belt wrapping an end drum | `header2.jpg` |
| Leg gussets and TIG fillet welds | `IMG_0276.jpg` (table frame); placement on the conveyor is assumed |
| MF mark on the side panel | `IMG_0276.jpg`. The model uses the existing logo artwork on a riveted plate |

Not modelled because no photograph shows it clearly: motor and gearbox, belt return rollers, the underside, control gear, guarding.

Materials (starting values, to be calibrated against a clean daylight photograph):

| Material | Settings |
|---|---|
| Brushed sheet | Metallic 1.0, roughness 0.25 to 0.41 along the grain, anisotropy 0.55, off-axis scratches, soft wipe marks, 4% tone variation, 0.3 to 0.45 mm oil-canning in the sheet |
| Brushed tube | As sheet, grain running up the leg, roughness about 0.34 |
| Laser-cut plate | Roughness about 0.36, lower anisotropy |
| Polished turned parts | Roughness 0.16 |
| Fasteners | Roughness 0.27 |
| Welds | Roughness 0.46, slight straw heat tint, rippled bead |
| Bearing housings | Orange thermoplastic, roughness 0.33 |
| Belt | Blue PU, roughness 0.42, 7 mm sag on the return run |

Lighting: Blender's bundled `studio.exr` HDRI at strength 0.2 for ambient and reflections, plus nine area lamps (key softbox, overhead, five tall strips, rim, low fill). No bloom.

## Why the first Three.js version looked flat

1. **No occlusion.** Every surface reflected the whole studio, including inside joints and under the frame.
2. **No grounding.** One hard shadow map, and a floor that could not reflect the machine.
3. **Surface detail was lost.** Blender's procedural grain, scratches and smudges do not export to GLB.
4. **Light levels were wrong.** My first setup had the HDRI five times too bright and the lamps sixteen times too bright.
5. **The model was unoptimised.** 418 separate parts and 370,000 triangles.

## What the pipeline does now

| Step | Detail |
|---|---|
| Export | Parts joined into 13 meshes by assembly group, so they can still move separately |
| Baked detail | Ambient occlusion baked in Cycles into vertex colour; it dims reflections in crevices |
| Compression | glTF-Transform with meshopt: 5.2 MB to 1.4 MB |
| Environment | Same HDRI at the same strength, plus a light card for each Blender lamp at the same position, size and output |
| Materials | `MeshPhysicalMaterial`, metalness 1, the Blender roughness values, anisotropy, one 4096 px roughness texture mapped once across the whole side panel |
| Shadows | Soft key shadow, an overhead spot that puts the pool of light and the shadow under the machine, blurred contact shadows that follow moving parts |
| Floor | Dark mirror at low strength on desktop; off on phones |
| Tone mapping | AgX, as in Blender |
| Interaction | Drag to rotate, scroll or pinch to zoom, three camera presets, assembly play and scrub, running belt and drums |
| Rendering | Draws only when something changes; stops when off screen |

## What real time still does not match

- **Light bouncing between parts.** Cycles lights the legs from the floor and the frame from the belt. Three.js lights each surface from the studio only.
- **The floor.** Cycles gives a soft reflection that fades with distance and a graded pool of light. Three.js gives a sharp mirror and a flatter pool.
- **Legs.** They read as flat white in Three.js. They need their own roughness texture and gentler direct light.
- **Depth of field and sub-pixel grain.** Cycles has both. Three.js is sharp everywhere.
- **Assembly ghosts.** The baked occlusion is for the finished machine, so darker patches show where a part has not yet arrived. Fixable by baking per part.
- **Weld bead edges** show slight stair-stepping close up.

Options not yet tried, in order of likely value: screen-space ambient occlusion, a blurred floor reflection, per-part occlusion bakes, baked normal maps for welds, a higher resolution studio HDRI.

## Sizes

| Asset | On disk | Compressed transfer |
|---|---|---|
| Conveyor model (`conveyor.glb`) | 1.40 MB | 0.81 MB |
| Studio HDRI | 98 KB | 96 KB |
| Three.js as vendored (unminified) | 2.13 MB | 422 KB |
| Three.js once bundled and minified (estimate) | about 700 KB | about 180 KB |
| Loaders, controls, reflector, decoder | | 99 KB |
| Viewer code | 17 KB | 6 KB |
| Benchmark stills (three JPEGs) | 213 KB | |
| Rendered navigation plate | 18 KB | |

Model: 56,000 faces, 112,000 triangles, 13 meshes, about 40 draw calls for the model.

## Performance measured here

Software rendering only (no GPU in this environment), with Blender rendering on the same four cores at the time.

| Run | Time to interactive | CPU per frame, rotating with belt running | CPU per frame, assembling | Horizontal overflow |
|---|---|---|---|---|
| Desktop 1440x900 | 6.8 s | 2.8 ms | 4.0 ms | none |
| Phone profile (Pixel 7), CPU slowed 4x | 9.8 s | 8.4 ms | 14.2 ms | none |

Reading this:

- CPU cost per frame stays under the 16.7 ms needed for 60 frames a second, even slowed four times.
- Frame rate itself was 0 to 1 here because the GPU is emulated. It says nothing about real devices.
- On phones the mirror floor is off, pixel ratio is capped at 1.5 and shadow maps are halved.
- During assembly the scene is drawn three times a frame (view plus two shadow maps), about 350,000 triangles. That is the number to watch on older phones.
- Reduced motion: the model loads assembled and nothing plays by itself. The slider and buttons work from the keyboard.

## References studied

| Reference | Finding |
|---|---|
| `nesdesignco/FormDrive` (MIT; models CC BY 4.0) | Three.js 0.180 with React Three Fiber. No HDRI and no post-processing. ACES tone mapping, a stack of five lamps, cloned GLB materials with raised environment intensity, clearcoat paint, a glossy clearcoat floor, shadow maps only. Pixel ratio capped at 1.8. Orbit limits and damped camera presets |
| `ASTRICKK/PorscheLab` (README only; all rights reserved, ideas only) | Three.js r176 with React Three Fiber. Poly Haven HDRIs at 2K or 4K with ground projection, accumulated soft shadows, light bloom and vignette, GSAP camera tours |
| blankstudio.it Polestar research | Not reviewed. The host is outside this session's network allowlist |

Taken from them: orbit limits with damping, camera presets, a reflective floor, a pixel ratio cap, clone-and-patch materials after load. Not copied: any code or assets.

## Recommendation

1. Keep Blender as the master asset and the quality benchmark.
2. Use the interactive Three.js conveyor where the visitor handles the machine: rotate, zoom, assemble, run.
3. Do not yet replace the homepage opening with it. Decide that after a real-phone test and one more pass on the floor and legs.
4. If the opening must match Blender exactly, a short Cycles-rendered sequence for the opening, handing over to the live model once it settles, remains available. A draft render path exists (`conveyor.py --anim`). It was not completed in this round.

## Reference material needed from Marpet

- Three-quarter, side-on, end-on and plan photographs of one complete conveyor, from the same distance
- Close-ups of the drive end, tail end, a leg foot, a frame joint and a finished weld
- The drive side: motor, gearbox and mounting
- Underside and belt return
- Belt type, colour and pitch
- Overall length, width, belt height, sheet thickness, leg section, fastener sizes
- A general arrangement drawing or STEP export, if one exists
- The steel finish specified, and a straight-on photograph of a clean panel in daylight
- Which conveyor Marpet wants shown, and confirmation it may be shown

## Navigation plate

The plate on the test page is a Cycles render of a 4 mm brushed plate with four socket screws, used as a nine-slice image so one 18 KB file fits any size. Lettering is dark, like laser marking. A band of reflected light follows the pointer. It is on the test page only and has not been applied to the site.
