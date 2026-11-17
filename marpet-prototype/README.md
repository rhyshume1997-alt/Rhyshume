# Marpet Fabrications redesign prototype

Design exploration for review. Not deployed, not linked from the live site, excluded from Vercel by `.vercelignore`. Every page carries `noindex`.

## Run it

```bash
node build.mjs
```

```bash
cd site && python3 -m http.server 4173
```

Open `http://localhost:4173/`. Add `?intro=1` to replay the opening, `?static` to see the no-WebGL fallback.

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
