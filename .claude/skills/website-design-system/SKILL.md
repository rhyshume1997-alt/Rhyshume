---
name: website-design-system
description: Research and design websites with a shared process and quality gates: inspect the client's existing identity, research examples (Refero Styles and the shared reference library), find three genuinely different directions, present visual concepts, write a project-specific DESIGN.md, build original components, test responsive layout, keyboard, motion and accessibility, and inspect real screenshots before delivery. Also audits existing sites with Fable critique and measured evidence. Carries process, research and checks, never appearance: every client site keeps its own distinct identity in its own DESIGN.md.
---

# Website design system (portable)

## Two layers, kept apart on purpose

1. **Shared (this skill):** the process, the research library, the evidence rules and the quality gates.
2. **Per project (never shared):** the identity: palette, typefaces, shape language, tone, signature interaction. It lives only in that project's own `DESIGN.md`.

**This skill must never carry a palette, a typeface, a layout or a signature interaction from one project into another, and it must never carry one in from a reference.** Two client sites built with it should be free to look nothing alike. If a proposal resembles a sibling project, or looks like the dominant look in the references, treat that as a defect and push it further.

## One library, no copies

The shared reference library is `references/reference-library.md` in this skill. It is the single source for sources, verification labels, licence notes and attributions. A project keeps only:

- its own `DESIGN.md` (identity and rules), and
- `docs/design/references.md` with **only its project-specific additions** (template: `templates/project-references.md`).

Nothing is duplicated, so nothing needs synchronising. Research records (for example the X-supplied Grok research) are in `references/research-records/`. The skill's validated version is in `VERSION.md`.

## Before you start

1. Find the project's own `DESIGN.md` (`docs/design/DESIGN.md` or `DESIGN.md`). If it exists it is the authority on identity and on what must be preserved. Read it first.
2. If there is none, you are starting a new design: follow the process below and create one from `templates/project-design-md.md`. Never borrow another project's.
3. Read the project's `docs/design/references.md` if present (its additions) and the shared library when you need sources. If a file you need is missing, say so and ask. Do not reconstruct it from memory.

## The process for a new website or redesign

1. **Inspect the client's existing identity and website, if there is one.** Record what was read or viewed (URL, date), the palette, typefaces, imagery and tone, and what the client clearly values. Refero widens the options; it never replaces the client. If there is no existing identity, say so.
2. **Research relevant examples, including Refero Styles.** Follow `references/refero-research.md`: choose three to six records that differ in mood, theme and density, read their Components and Do's and Don'ts (not just colours), extract *roles*, and compare them against this client's job. Add other library sources where they fit (motion, composition, footers, components). Label each source as inspected only if it was.
3. **Identify three genuinely different creative directions** (safe, bold, unexpected). They must differ in layout and idea, not only colour. Each gets a name, one sentence, a rough wireframe, its colour and type roles, its signature interaction, and what makes it different from the siblings and from the trend. **Sibling check:** compare each direction's display face and palette with the other projects' `DESIGN.md` files where they are available (a project lists them in its `DESIGN.md` section 10 or in `docs/design/sibling-projects.md`), and do not reuse a sibling's display face or palette unless this client already uses it. Models tend to reach for the same few faces; choose for the client.
4. **Present visual concepts for approval.** Show rendered concepts at 1440px and 390px (static mock-ups are enough), recommend one, and wait for the owner's pick. Do not build yet.
5. **Create the project-specific `DESIGN.md`** from the template, recording the approved identity, rules, and a provenance table: for each decision, *taken from* (record URL), *changed*, or *not used*.
6. **Build original components** from the approved direction, with the simplest technique (CSS first). Never copy a reference.
7. **Test** responsive layouts across a width sweep, keyboard access, reduced motion, and accessibility, with the measurements in `references/accessibility-checks.md`.
8. **Capture and inspect real screenshots before delivery** at 1440px and 390px (and intermediate widths), look at them, fix overlaps, clipping and drift, then deliver with the evidence.

Take feedback narrowly: change only what was named, and show before and after.

## The process for an existing site or concept (audit mode)

Ask first; audit from real screenshots (`templates/audit-checklist.md`); run the de-slop check; verify every claim in a browser before it becomes a fix (`references/fable-critique.md`); fix by priority, defects before taste, one commit per fix; regress with pixel comparison. Where a design is protected, change it only for a demonstrated defect.

## Using Refero well

- It is a research tool, not a template. **Do not copy a complete Refero system**, its HTML examples (Refero says they are reconstructions) or its substitute fonts.
- Records are third-party, generated interpretations, not official brand guides. Reuse terms are unknown: check licences before taking any font, code or asset.
- Refero's own substitute lists default heavily to one typeface and its examples favour warm paper and white gallery looks. Use it to understand structure, then deliberately differ. Record what you did differently.
- Record provenance for every decision that came from a record.

## Shared quality gates (thresholds and measurements in `references/accessibility-checks.md`)

- Text contrast at least 4.5:1 (large text 3:1); focus indicators at least 3:1 against what they sit on; touch targets at least 44px; every control reachable by keyboard.
- Motion (Emil Kowalski, MIT): ease-out for entering UI, never ease-in; UI transitions under about 300ms; press feedback `scale(0.97)`; never animate from `scale(0)`; hover behind `(hover: hover) and (pointer: fine)`; subtle or no bounce; animate `transform` and `opacity`; reduced motion means fewer and gentler, not none.
- Heavy media never blocks the first view. Measure on a real or throttled profile; headless software-rendered numbers are a signal only.
- Honest content: no invented testimonials, reviews, staff, awards, prices or results. Label generated imagery and placeholders. Never describe a rule-based tool as AI-powered.

## Never

- Copy a reference or a complete Refero system, or import code or assets without a licence check. Buy anything. Change production or approved designs without approval.
- Claim a source was inspected if it was not, or claim research that was not done (the Grok research is X-supplied; no Reddit research exists).
- Make several client sites converge on one look, or on the dominant look in the references.

## Fable and Claude Code

Use a Fable reviewer for visual critique from screenshots and source (propose only, then verify its claims). Use Claude Code to implement approved changes on a branch, re-run the project's own checks, and capture before and after screenshots.

## Supporting files (read when the step calls for them)

| File | Read it when |
| --- | --- |
| `references/refero-research.md` | step 2: how to research with Refero, the patterns measured across 54 records, the playbook by area, the licence and homogenisation warnings |
| `references/reference-library.md` | step 2: choosing at least three references; checking a source's licence, cost or access limits |
| `references/research-process.md` | gathering or recording sources; incorporating someone else's research report; deciding what may be called "inspected" |
| `references/research-records/` | looking up a dated research record (currently the X-supplied Grok research) |
| `references/fable-critique.md` | running or briefing a Fable critique; verifying claims; producing before and after evidence |
| `references/accessibility-checks.md` | step 7 and any audit: thresholds and the measurements that prove them |
| `templates/project-design-md.md` | step 5, or a project has no `DESIGN.md` |
| `templates/project-references.md` | recording a project's own reference additions |
| `templates/audit-checklist.md` | auditing an existing page |
| `VERSION.md` and `scripts/verify-version.sh` | recording which validated version of this skill a project uses, and confirming a copy still matches it |
