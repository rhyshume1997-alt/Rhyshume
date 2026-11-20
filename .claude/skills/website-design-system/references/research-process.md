# Research process

How design references and third-party research are gathered, verified, recorded and used. This is the process actually followed on the Rev 6 concepts and Build AI Here, written so it can be repeated on any project.

## 1. Gather

For each source record: name, exact URL, creator or owner attribution as published, what it is, what it is useful for (typography, interaction, motion, composition, component design, creative direction), and the licence or terms position.

Classify every source by its real use, not by where it was found.

## 2. Verify, and label exactly what was done

Use one label per source and never upgrade it:

| Label | Meaning |
| --- | --- |
| Verified: read | Page text or files were fetched and read |
| Verified: viewed | Also looked at in a rendered screenshot (note when third-party media did not load) |
| Reported | Named in someone else's report; not opened |
| Not inspected | Could not be read (say why: blocked, login wall, host unreachable) |
| Pending | Not yet identified (for example a designer mentioned by name only) |

Rules:
- Never describe a source as inspected unless it was. If a page returns a script shell or blocks automated access, say so and record what little was read.
- Never claim research that was not done. If a report says a channel could not be read (the Grok report said Reddit was blocked), record "not researched" and do not fill the gap.
- Do not guess who an unidentified reference means. Record it as pending and carry on.

## 3. Access limits

If a host is unreachable, read the environment's network documentation, then ask the owner to approve adding the exact hosts (no wildcards). Do not try to route around a block. Record the approval and its scope in the references file. Third-party images and video may still not load, so judge layout and type, not media.

## 4. Incorporating a third-party research report

1. Record provenance: who compiled it, when, how it reached you, which model or tool produced it.
2. Keep original source links and creator handles exactly as given.
3. Mark every statement `[Report]` (what the report says) or `[Claude]` (your reading, adaptation or caveat).
4. Reproduce prompts verbatim only when public and attributed; otherwise summarise.
5. Convert findings into practice: a numbered process, checklists, and rules. Mark which numeric rules are defaults and which are hard limits.
6. List items the report skipped and why (for example paid or unverifiable).

### Methodology adopted from the Grok report (reported, not verified)

A "senior designer" process:
1. Ask up to three questions that change the design: audience, the page's one job, how it should feel.
2. For an existing screen, audit first: the five biggest problems, worst first, each with a fix.
3. Show three directions: safe, bold, unexpected. They must differ in layout and idea, not only colour. Name each, one sentence, a rough wireframe. Recommend one and wait.
4. Build the chosen one with real content, one focal point, tokens before screens, every state designed (empty, loading, error, hover, focus), contrast at least 4.5:1, touch targets at least 44px.
5. Write real copy: buttons say what happens; errors say what went wrong and how to fix it.
6. Motion only where it explains a change, 150 to 250ms, ease-out, respect reduced motion.
7. Check at 390px and 1440px from screenshots, then tab through it.
8. On feedback change only what was named; show before and after.
9. Hand off a short spec and the three improvements you would make with more time.

A "de-slop" screenshot audit: list everything that looks like an AI default (gradients, icon cards, pill badges, an accent-coloured word, sparkle icons, fade-ups, vague buttons), give one replacement based on what the product actually does, add no new claims.

Adaptation: the numeric rules (4px spacing, five type sizes, at most three colours, one accent) are defaults for product UI. A deliberately art-directed site may deviate if it records why.

## 5. Use references as inspiration

At least three relevant references per major page or component. For each: the URL, the principle adapted, why it fits this project, and what was deliberately not copied. Never copy a layout, component, prompt or asset. Check licences before importing anything. Never buy templates, plans or component packs without the owner's approval.

## 6. Record

Write decisions, sources and evidence into the project's own `DESIGN.md`. Keep the reference library and the research record as separate dated files so claims stay traceable.

## 7. Where things live

- The shared reference library, research guides and dated research records are in this skill (`reference-library.md`, `refero-research.md`, `research-records/`). They are the single source; projects do not copy them.
- A project records only its own additions in `docs/design/references.md` (template: `templates/project-references.md`) and its identity and decisions in its own `DESIGN.md`.
- Refero Styles is a major structured source: use `refero-research.md` for the method, measured patterns and warnings.
- Third-party research reports are stored as dated records in `research-records/`, labelled by who compiled them and by what was and was not verified.
