# Conveyor realism: Blender benchmark and interactive Three.js test

Isolated test. The production homepage, its layout and its copy are unchanged. Nothing is merged.

- Test page: `site/material-test.html`
- Phone test page: `site/phone-test.html`
- Side-by-side stills: `review/compare-hero.jpg`, `compare-drive.jpg`, `compare-weld.jpg`

## Where this stands (round 2)

- **Blender Cycles is the benchmark.** One master model, `blender/conveyor.py`, produces the benchmark renders and the browser model.
- **The four defects from round 1 are addressed.** Details below.
- **Real-phone results: none yet.** This environment has no GPU. The phone test page measures the device it runs on; it needs to be opened on a phone.

## The four defects

| Defect | Cause | Fix | Result |
|---|---|---|---|
| Overbright legs | Bright direct lamps, and the reflected studio had a bright floor | Lamps cut to shadow-casting strength. The reflected environment now contains the dark floor and its pool of light. Legs have their own vertical grain texture | Legs read as grey steel. Slightly darker than Cycles |
| Assembly ghosting | Occlusion was baked for the finished machine | Occlusion baked one part at a time in Blender | No dark patches where parts have not arrived |
| Floor reflection and contact shadows | Sharp full-strength mirror, flat floor light, weak shadows | Low-resolution mirror (soft), hidden by a painted pool of light as distance grows. Two soft shadow maps (long shadow and under-machine shadow) plus contact shadows at the feet | Soft reflection near the machine, clear shadow under it. Not the graded falloff of Cycles |
| Mobile loading | Unminified library, uncompressed server, eager loading | One minified bundle, brotli compression, 3D loads only when a viewer nears the screen, lighter textures and shadow maps on phones | Download 4,320 KB to 1,089 KB. Time to interactive 9.8 s to 2.6 s on the phone profile |

Tried and rejected: a simplified phone model (0.81 MB). It saved about 180 KB compressed but visibly faceted the side panel.

## What still falls short of Cycles

- Light bouncing between parts.
- The floor: graded reflection and light falloff.
- Depth of field and sub-pixel grain.
- Weld bead edges show slight stair-stepping close up.
- Plates sitting on the frame no longer darken the frame beneath them (the cost of removing the ghosting).

## Loading measurements

Measured against `serve.mjs` (brotli), in headless Chromium.

| Run | Network | Download | Time to interactive |
|---|---|---|---|
| Desktop 1440x900 | unthrottled | 1,089 KB | 1.8 s |
| Phone profile (Pixel 7), CPU slowed 4x | Fast 4G (9 Mbps) | 1,089 KB | 2.6 s |
| Phone profile (Pixel 7), CPU slowed 4x | Slow 4G (1.6 Mbps) | 1,089 KB | 7.6 s |
| Round 1, phone profile, CPU slowed 4x | local, unthrottled | 4,320 KB | 9.8 s |

Download breakdown: model and HDRI 771 KB, script 199 KB, page, styles and fonts 120 KB.

Of the 2.6 s, about 1.0 s is fetching the model and about 0.9 s is building the scene (environment, textures, shadows).

## Frame rate

Not measurable here. The GPU in this environment is emulated in software, so the figures it produces (6 frames a second rotating) describe the emulator, not a phone. The phone test page was run end to end here to confirm it works and reports correctly.

What is known:

- Model: 112,000 triangles, 13 meshes.
- Phones draw the scene up to three times a frame while parts are moving (view plus two shadow maps), about 350,000 triangles. Shadows are not redrawn when nothing moves.
- Phones get no mirror floor, a pixel ratio cap of 1.5 and 1024 px shadow maps.

## Testing on a real phone

1. On a computer on the same Wi-Fi as the phone, in `marpet-prototype`:

```bash
node serve.mjs
```

2. It prints an address such as `http://192.168.1.20:4173/phone-test.html`. Open that on the phone.
3. Wait for "Model ready", rotate and pinch, then press **Run phone test**. It takes about 12 seconds.
4. Press **Copy results** and send them back.

The results include frames per second while rotating and while assembling, the slowest 5% of frames, the GPU, screen size, load time and download size.

No install is needed to serve the page; Node 18 or later is enough.

## Preview deployments

Pushing this branch did trigger automatic Vercel preview builds: one for each of the first two pushes (commits `083849e` and `56c937e`). Both are previews, not production. The Vercel project has login protection on every deployment except the custom domain, so they are not public.

`marpet-prototype` is listed in `.vercelignore`. I have not opened those previews to confirm the folder is absent, because doing so from here means creating a share link on the deployment.

From this commit on, `vercel.json` switches off deployments for this branch only, so further pushes build nothing.

## References studied

| Reference | Finding |
|---|---|
| `nesdesignco/FormDrive` (MIT; models CC BY 4.0) | Three.js with React Three Fiber. No HDRI, no post-processing. ACES tone mapping, five lamps, cloned GLB materials with raised environment intensity, a clearcoat floor, shadow maps. Pixel ratio capped at 1.8. Orbit limits and damped camera presets |
| `ASTRICKK/PorscheLab` (README only; all rights reserved) | Poly Haven HDRIs at 2K or 4K with ground projection, accumulated soft shadows, light bloom and vignette, GSAP camera tours |
| Blank Studio, Polestar 3 | A short case study without figures. Method named: retopology, texture baking, web-ready PBR materials, Three.js and Next.js |

All three point the same way: optimise and bake in the 3D tool, keep the browser scene simple. No code or assets were copied.

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

Materials (starting values, to be calibrated against a clean daylight photograph): brushed sheet at metallic 1.0, roughness 0.25 to 0.41 along the grain, anisotropy 0.55, with off-axis scratches, soft wipe marks and slight oil-canning; tube about 0.34 to 0.40; plate 0.36; polished turned parts 0.16; fasteners 0.27; welds 0.46 with a slight heat tint.

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

A Cycles render of a 4 mm brushed plate with four socket screws, used as a nine-slice image so one 18 KB file fits any size. On the test page only; not applied to the site.
