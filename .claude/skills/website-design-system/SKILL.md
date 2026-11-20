---
name: website-design-system
description: Apply Rhys Hume's website design system and critique process to a new website build or an existing concept: ask first, audit screenshots, study the reference library, show three directions, build, check at 390px and 1440px, take narrow feedback, hand off. Use for designing, critiquing or improving any website page or concept, and when a design reference needs recording.
---

# Website design system

This skill makes the project's design process portable. It does not replace `docs/design/`. It points at it.

## Before you start

Read, in this order:

1. `docs/design/DESIGN.md`: process, rules, motion standards, and the registry of existing concepts with what must be preserved.
2. `docs/design/references.md`: the reference library with verification status. Only cite a reference as inspected if it says so.
3. `docs/design/grokResearch.md`: the owner's Grok report. Everything in it is reported, not verified.

If these files are missing (for example this skill was copied into another repository), say so and ask the owner for them. Do not reconstruct them from memory.

## Process

1. Ask up to three questions that change the design.
2. If a design exists, audit it first from real screenshots at 1440px and 390px: five biggest problems, worst first, each with a fix. Then run the de-slop check (gradients, icon cards, pill badges, accent-coloured word, sparkle icons, fade-ups on everything, vague buttons, glass cards, a shadow on every element) and require a reason before removing anything.
3. Identify at least three relevant references, record their URLs, and state what is adapted and why.
4. Show three directions (safe, bold, unexpected) that differ in layout and idea. Recommend one. Wait.
5. Build the chosen one as original work, using the simplest technique (CSS first).
6. Check: screenshots at both widths, keyboard pass, reduced motion, performance, one-second test.
7. On feedback, change only what was named. Show before and after.
8. Hand off a short spec and three further improvements. Record decisions in `DESIGN.md`.

## Never

- Copy a reference, or import code or assets without a licence check.
- Buy anything.
- Change production sites or approved designs without approval.
- Invent reviews, staff, prices, awards or results.
- Make several concepts converge on one look.
- Describe unread or unreachable sources as inspected.

## Fable and Claude Code

Use a Fable reviewer for visual critique from screenshots (propose only, no edits). Use Claude Code to implement approved changes on a branch, then re-run the repository's checks and capture before and after screenshots.
