# Skill validation: `website-design-system` v1.1.0

Revalidated on 2026-11-20 after the skill was restructured (single shared library, Refero research, client-first process, sibling check, version record). Each test is a **fresh Claude Code session** (a separate `claude -p` run with new context). Edits and notebook tools were disabled; where a test needed research, only `curl`, Read, Grep, Glob and the Skill tool were allowed. Transcripts were read for the tool calls that actually happened. Source revision and content hash: `.claude/skills/website-design-system/VERSION.md` (hash `d1851dc8…7ced`, validated commit `c530aeb`).

## Contents check

| Required | Where | Result |
| --- | --- | --- |
| Research process | `references/research-process.md` | present |
| Fable critique methodology | `references/fable-critique.md` | present |
| Reference library (single shared source) | `references/reference-library.md`; Refero Styles as a major source in `references/refero-research.md`; Grok's X research in `references/research-records/` | present; all Build AI Here reference URLs (17 of 17) are covered |
| Accessibility checks | `references/accessibility-checks.md` | present |
| Templates | `templates/project-design-md.md`, `project-references.md`, `audit-checklist.md` | present |
| Portfolio identity absent | scan of the skill folder for concept names, concept fonts, palettes and project names | **0 hits** |
| Version pinning | `VERSION.md` plus `scripts/verify-version.sh` | prints OK for the validated copy; fails (exit 1) on a modified copy |

## Fresh-session tests

| # | Test | Result |
| --- | --- | --- |
| 1 | **Discovery and loading** | The skill is in the start-up skill list and the session invokes it through the `Skill` tool, opening no files. Its answers matched the skill: the eight steps, the Refero rules, the single-source library, the identity rule. Re-run on the final committed content (including the script and sibling rule): same result |
| 2 | **Protected concept (Salt & Ember)**, neutral request to improve its hero | Used the skill and project docs; identified the concept as protected; declined a restyle; offered only bounded, defect-level options |
| 3 | **Unprotected concept (Sunny Hours)**, same request | Identified it as not protected; kept its palette, tilted shapes and planner; three genuinely different hero ideas inside that identity; volunteered that it had not yet done the screenshot audit or studied the required references |
| 2+3 | **Identity separation, mechanical check** | Proposal sections: zero markers of the other concept in either direction; each named its own typefaces, palette and signature interaction |
| 4 | **Always-on rules**, all file tools disabled | Correct with zero tool calls, now including: the shared library lives in the skill and a project keeps only its own `DESIGN.md` and project additions; Refero is research, never a template; Tobi unresolved. Re-run on the final commit: same |
| 5 | **Portability to Build AI Here** (a scratch copy of its own `DESIGN.md`; the real repository untouched) | Took the identity from that file (Paper, teal, Instrument Serif, the technical grid), kept Tolra's graphite and amber for Tolra, and carried nothing from any portfolio concept (no concept fonts or colours in its directions) |
| 6 | **Project with no `DESIGN.md`** | Said there was no identity source, declined to invent one, labelled its colours and fonts provisional |
| 7 | **New client with an existing identity (fictional solicitors)**, using Refero | Read the brief and existing identity **before** its first Refero fetch; fetched 5 real Refero style records and cited only URLs it had fetched; stated how deeply it read each; listed what it deliberately did not take (palettes, fonts, Refero's Inter substitutes, the dominant mood); kept the client's navy and brass; three genuinely different directions with licence notes; did not build |
| 8 | **Second client (fictional garden nursery)**, same flow | Same process evidence (4 records fetched, nothing cited that was not fetched); kept the client's green, brown and yellow; palettes and typefaces differ sharply from client 7 |
| 9 | **Sibling check** (client 7 re-run with a note listing client 8's typefaces and palette) | Read the sibling file, listed what the sibling uses, and avoided every one of its typefaces and colours in all three directions (mechanical check: none appear). The first run of tests 7 and 8 had both reached for the same display face in one direction; this is why the sibling check was added |

## Limits

- One run per scenario. A model following instructions shows the skill is discovered, loaded and understood, not that it will always behave identically.
- The sessions produced proposals, not built pages. Fonts named in the client runs were checked "from memory" by the sessions and are flagged by them for licence verification.
- Tests 7 to 9 used fictional clients. Refero was reached through `curl` in this environment; its records are third-party interpretations with unknown reuse terms.
- Test 5 used only a copy of Build AI Here's `DESIGN.md`; Build AI Here itself was not modified.
