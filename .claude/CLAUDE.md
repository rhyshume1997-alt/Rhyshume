# Design standards for this repository

This repository is the rhyshume.co.uk site (static HTML and CSS on Vercel) and also holds concept websites for Rhys Hume, including the eight Rev 6 concepts under `c-3e9a41b7d20f58c6/cinematic/` (branch `claude/cinematic-poc`).

Production site and approved designs are not changed without explicit approval. Do not merge, deploy or alter DNS. Do not purchase assets, templates or subscriptions. Do not import third-party code or assets without checking the licence first.

Design system and process:

- **Shared, single source:** the `website-design-system` skill in `.claude/skills/`. Its `references/` folder holds the reference library (Refero Styles as a major source, Emil Kowalski, Rive, 21st.dev, MotionSites, Scrolltide, 60fps.design, Landdding, Land Book, SceneAI, Scroll Shaders, Footer Design, and the X-supplied Grok research; "Tobi" pending), the research process, the Fable critique method and the accessibility checks. Do not copy the library into the project.
- **This repository only:** `docs/design/DESIGN.md` (identity rules, the eight concepts and what must be preserved) and `docs/design/references.md` (project-specific additions only). `docs/design/` is excluded from the Vercel deployment by `.vercelignore`.

Read `docs/design/DESIGN.md` before any design work here, and load the `website-design-system` skill for the process and the library.

## Design research workflow (always)

For a new website or redesign, follow the skill's eight steps: (1) inspect the client's existing identity and website if there is one; (2) research relevant examples, including Refero Styles, and record them; (3) identify three genuinely different creative directions; (4) present visual concepts for approval and wait; (5) create the project-specific `DESIGN.md`; (6) build original components; (7) test responsive layouts, keyboard, motion and accessibility; (8) capture and inspect real screenshots before delivery.

For an existing concept or site: ask first; audit from 1440px and 390px screenshots (five biggest problems, worst first, each with a fix); run the de-slop check and record a reason before removing anything; study at least three references from the shared library and record their URLs; show three directions (safe, bold, unexpected) that differ in layout and idea and wait for the owner's pick; build as original work (CSS first); check before showing (keyboard, reduced motion, performance, the one-second test); take feedback narrowly; hand off a short spec. Record decisions and sources in `DESIGN.md`.

Refero is research, not a template: never copy a complete Refero system, its HTML examples or its substitute fonts; its records are generated interpretations with unknown reuse terms.

## Rules that never bend

- Preserve each concept's approved identity and signature interaction. Do not make the concepts look alike. Do not replace a distinctive design because a reference looks fashionable.
- **Salt & Ember** (fire interactions, typography treatment, menu behaviour, visual identity) is kept intact unless testing shows a genuine, evidenced defect.
- No invented testimonials, reviews, staff, awards, prices, opening hours, credentials or results. Placeholders are labelled. Generated imagery is labelled as generated concept material.
- References are inspiration, not templates. Do not copy. Never call a reference "inspected" unless it was. Record access limits and licence restrictions. Every client website must remain visually distinctive.
- Never claim research that was not done. The Grok research is X-supplied (record: the skill's `references/research-records/`): no Reddit research exists.
- "Tobi" is an unresolved reference. Do not guess who is meant.

## Verify before proposing (always)

- Treat every reviewer, tool or model claim as a hypothesis. Re-measure it in a real browser (computed styles, bounding boxes, contrast from real colour values, source lines) before it becomes a fix. Record claims that did not reproduce so they are not repeated.
- Every proposed fix states: the affected file, the actual cause, the change, before and after evidence, and the regression risk. Confirmed functional, responsive and accessibility defects come before cosmetic improvements.
- Headless, software-rendered timings (LCP and similar) are a signal, not evidence. Measure before scrolling and on a real or throttled profile.

## One identity per project

The process and quality gates are shared. Identity is not. Never carry a palette, typeface, layout or signature interaction from one project into another, and never make a project resemble its siblings. Each project's identity lives only in its own `DESIGN.md` (template: `.claude/skills/website-design-system/templates/project-design-md.md`).

## Motion standards (Emil Kowalski, MIT, installed in `.claude/skills/`)

Ease-out for entering UI, never ease-in. UI transitions under about 300ms. Press feedback `scale(0.97)`. Never animate from `scale(0)`. Hover effects behind `(hover: hover) and (pointer: fine)`. Subtle or no bounce (a light spring only for direct manipulation). Animate `transform` and `opacity`. Reduced motion means fewer and gentler animations, not none. Use the installed skills (`animate`, `choreograph`, `gestures`, `mobile-native`, `break-ui`) and run `/review-animations` before finishing motion changes.

## Testing

Existing checks: `node --test` (static checks across the concept pages) and the shared browser checker described in `docs/concepts/`. Run them after any change to a concept page.
