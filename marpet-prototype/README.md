# Marpet Fabrications redesign prototype

Design exploration for review. Not linked from the live site, listed in `.vercelignore`, and every page carries `noindex`. Vercel previews are switched off for the working branch in `vercel.json`.

## Run it

```bash
node build.mjs
```

```bash
npm install
```

```bash
npm run bundle
```

```bash
node serve.mjs
```

Open `http://localhost:4173/`. The server also prints an address for a phone on the same Wi-Fi; `phone-test.html` measures the interactive conveyor on that device. `npm install` and `npm run bundle` are only needed after editing `site/assets/viewer.js`; the bundled file is committed. Add `?intro=1` to replay the opening, `?static` to see the no-WebGL fallback.

## What is here

- `site/` built pages and assets. Start at `index.html`; `storyboard.html` has the storyboard, the concept comparison and a link to Concept B.
- `content/` JSON for company details, services, projects, team and LinkedIn posts. Edit and rebuild.
- `docs/discovery-and-direction.md` the written response to the brief.
- `docs/asset-register.md` every Marpet image with size and suitability.
- `review/` desktop (1440) and mobile (390) screenshots of each page type.

## Status

- Photographs and copy come from marpet.co.uk. Anything not verified is a yellow "placeholder" or "to confirm" label.
- The hero conveyor is an illustrative model, not a Marpet machine.
- The enquiry form sends nothing.
- Libraries: three.js 0.187 (MIT) and GSAP 3.15 (Webflow standard licence, free for commercial use), vendored unminified. Fonts: Barlow and Barlow Condensed (SIL OFL).

## Realism test (isolated)

`site/material-test.html` compares a Blender Cycles benchmark with the same model running live in Three.js, from identical camera angles, and tests one rendered navigation plate. Findings are in `docs/realism-assessment.md`; side-by-side stills are in `review/compare-*.jpg`.

Rebuilding the 3D assets needs Blender's Python module and glTF-Transform:

```bash
pip install bpy
```

```bash
python blender/conveyor.py hero.png --view hero --samples 160 --width 1600
```

```bash
python blender/conveyor.py check.png --samples 4 --width 160 --bake --glb conveyor-raw.glb
```

```bash
npx @gltf-transform/cli optimize conveyor-raw.glb site/assets/render/conveyor.glb --compress meshopt --meshopt-level high --join false --flatten false --instance false --simplify false --palette false --prune false
```

Views are `hero`, `drive`, `weld`, `foot` and `takeup`. The HDRI is Blender's bundled `studio.exr`. `blender/plate.py` renders the navigation plate.
