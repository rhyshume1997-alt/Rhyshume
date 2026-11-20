# Design standards for this repository

This repository is the rhyshume.co.uk site (static HTML and CSS on Vercel) and also holds concept websites for Rhys Hume, including the eight Rev 6 concepts under `c-3e9a41b7d20f58c6/cinematic/` (branch `claude/cinematic-poc`).

Production site and approved designs are not changed without explicit approval. Do not merge, deploy or alter DNS. Do not purchase assets, templates or subscriptions. Do not import third-party code or assets without checking the licence first.

Design system and process live in `docs/design/` (excluded from the Vercel deployment by `.vercelignore`):

- `docs/design/DESIGN.md`: process, rules, motion standards, the eight concepts and what must be preserved.
- `docs/design/references.md`: the reference library, with exactly what was verified and what was only reported.
- `docs/design/grokResearch.md`: the owner's Grok research record. Everything in it is "reported, not verified" unless `references.md` says otherwise.

Read `DESIGN.md` and `references.md` before any design work. The `website-design-system` skill in `.claude/skills/` applies the same process.

## Design research workflow (always)

1. **Ask first.** Up to three questions that would change the design: who it is for, the one job of the page, how it should feel.
2. **Audit existing work before changing it.** Capture desktop (1440px) and mobile (390px) screenshots and look at them. List the five biggest problems, worst first, each with a fix. Run the de-slop check for AI-default patterns, and record a reason before removing anything.
3. **Study references.** Identify at least three relevant examples from `references.md`, record their URLs, say which principles are worth adapting and why they suit this concept.
4. **Show three directions** (safe, bold, unexpected) that differ in layout and idea, not only colour. Recommend one. Wait for the owner's pick before building.
5. **Build the chosen direction** as an original design. Choose the simplest technique (CSS first, then Motion, then Rive or another tool) and justify it.
6. **Check before showing.** Screenshots at 390px and 1440px, a keyboard-only pass, reduced motion, performance, and the one-second test (is the main thing obvious?). Fix overlaps, clipping and drift.
7. **Take feedback narrowly.** Change only what was named. If a note would make the design worse, say so once, then do it. Show before and after.
8. **Hand off** a short spec and the three things to improve with more time. Record decisions and sources in `DESIGN.md`.

## Rules that never bend

- Preserve each concept's approved identity and signature interaction. Do not make the concepts look alike. Do not replace a distinctive design because a reference looks fashionable.
- **Salt & Ember** (fire interactions, typography treatment, menu behaviour, visual identity) is kept intact unless testing shows a genuine, evidenced defect.
- No invented testimonials, reviews, staff, awards, prices, opening hours, credentials or results. Placeholders are labelled. Generated imagery is labelled as generated concept material.
- References are inspiration, not templates. Do not copy. Never call a reference "inspected" unless it was. Record access limits and licence restrictions.
- Never claim research that was not done. The Grok report is X-only: no Reddit research exists.
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
