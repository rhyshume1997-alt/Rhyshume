---
name: website-design-system
description: Apply a shared design process and quality gates to any website build, client project or existing concept: ask first, audit real screenshots, study the reference library, show three directions, build, check at 390px and 1440px, take narrow feedback, hand off. Includes the research process, the Fable critique methodology, the reference library and measured accessibility checks. Carries process, never appearance: each project keeps its own identity in its own DESIGN.md. Use for designing, critiquing or improving any page, and when a design reference needs recording.
---

# Website design system (portable)

## What this skill is, and is not

Two layers, kept apart on purpose:

1. **Shared (this skill):** the process, the evidence rules, the quality gates (accessibility, motion, performance, honesty) and the reference library.
2. **Per project (never shared):** the identity. Palette, typefaces, shape language, tone, signature interaction. These live only in that project's own `DESIGN.md`.

**This skill must never carry a palette, a typeface, a layout or a signature interaction from one project into another.** Two client sites built with it should be free to look nothing alike. If a proposal makes a project resemble another one, treat that as a defect and say so.

## Before you start

1. Find the project's own design file (`docs/design/DESIGN.md` or `DESIGN.md`). If it exists, it is the authority on identity and on what must be preserved. Read it first.
2. If the project has none, create one from `templates/project-design-md.md` after the discovery questions. Do not borrow another project's.
3. Read `references.md` (in the project's `docs/design/`, or the shared copy) for sources and their verification status. If the reference files are missing, say so and ask. Do not reconstruct them from memory.

## Supporting files (read when the step calls for them)

| File | Read it when |
| --- | --- |
| `references/research-process.md` | gathering or recording sources; incorporating someone else's research report; deciding what may be called "inspected" |
| `references/reference-library.md` | choosing at least three references for a page or component; checking a source's licence, cost or access limits |
| `references/fable-critique.md` | running or briefing a Fable visual critique; verifying a reviewer's claims; producing before and after evidence |
| `references/accessibility-checks.md` | auditing or finishing any page: thresholds and the measurements that prove them |
| `templates/project-design-md.md` | a project has no `DESIGN.md` of its own |
| `templates/audit-checklist.md` | running an audit |
| `scripts/check-references-sync.sh` | after editing a project's `docs/design/references.md`, to confirm the portable copy matches |

## Process

1. **Ask** up to three questions that change the design: audience, the page's one job, how it should feel.
2. **Audit first** if something exists: capture 1440px and 390px screenshots, look at them, list the five biggest problems worst first, each with a fix. Use `templates/audit-checklist.md`.
3. **De-slop check:** list AI-default patterns (gradients, icon cards, pill badges, an accent-coloured word, sparkle icons, fade-ups on everything, vague buttons, glass cards, a shadow on every element). Require a reason before removing anything: a device that carries the project's tone may stay.
4. **Verify before you propose** (see `references/fable-critique.md`). A reviewer's claim is a hypothesis. Measure it (computed styles, bounding boxes, contrast from real colour values, source lines) and record the file, the actual cause, the change, before and after evidence and the regression risk. Defects (functional, responsive, accessibility) come before taste.
5. **Study references** (see `references/research-process.md` and `references/reference-library.md`): at least three relevant ones, with URLs, the principle adapted and why it fits this project.
6. **Three directions** (safe, bold, unexpected) that differ in layout and idea. Recommend one. Wait for the pick.
7. **Build** as original work with the simplest technique (CSS first).
8. **Check:** screenshots at both widths, keyboard pass, reduced motion, performance, the one-second test.
9. **Feedback:** change only what was named; show before and after.
10. **Hand off:** a short spec and the three improvements you would make with more time; record decisions and sources in the project's `DESIGN.md`.

## Shared quality gates (apply to every project; thresholds and measurements in `references/accessibility-checks.md`)

- Text contrast at least 4.5:1 (large text 3:1); focus indicators at least 3:1 against what they sit on; touch targets at least 44px; every control reachable by keyboard.
- Motion (Emil Kowalski, MIT): ease-out for entering UI, never ease-in; UI transitions under about 300ms; press feedback `scale(0.97)`; never animate from `scale(0)`; hover behind `(hover: hover) and (pointer: fine)`; subtle or no bounce; animate `transform` and `opacity`; reduced motion means fewer and gentler, not none.
- Heavy media never blocks the first view. Measure on a real or throttled profile; headless software-rendered numbers are a signal only.
- Honest content: no invented testimonials, reviews, staff, awards, prices or results. Label generated imagery and placeholders.

## Protected designs

If a project marks a design as protected, change it only for a demonstrated defect, name the defect with evidence, and keep the fix minimal. Never restyle a protected design for fashion.

## Never

- Copy a reference or import code or assets without a licence check. Buy anything. Change production or approved designs without approval.
- Claim a source was inspected if it was not, or claim research that was not done.
- Describe a rule-based tool as AI-powered.

## Fable and Claude Code

Use a Fable reviewer for visual critique from screenshots and source (propose only, then verify its claims). Use Claude Code to implement approved changes on a branch, re-run the project's own checks, and capture before and after screenshots.

## Reusing this skill

Copy this folder into a project's `.claude/skills/`, or into `~/.claude/skills/` for every project on a machine. Add a project `DESIGN.md` and a `references.md` (or link the shared one). Nothing else carries over, by design.
