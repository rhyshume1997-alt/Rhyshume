# Skill validation: `website-design-system`

The skill was validated in fresh Claude Code sessions (separate `claude -p` runs, new context each time), with edits, shell and notebook tools disabled. Transcripts were read for the tool calls that actually happened.

## Does it contain what it should?

| Required content | Where | Check |
| --- | --- | --- |
| The actual research process | `references/research-process.md` (64 lines): gather, verify labels (read, viewed, reported, not inspected, pending), access limits, how to incorporate a third-party report (with the Grok methodology and the "no Reddit research" rule), inspiration-not-templates | present |
| Fable critique methodology | `references/fable-critique.md` (83 lines): evidence capture, the reviewer brief template, claim verification (with examples of refuted claims), before and after, documenting each fix, regression | present |
| Reference library | `references/reference-library.md` (93 lines), portable copy of `docs/design/references.md` | present; `scripts/check-references-sync.sh` reports it in sync |
| Accessibility and responsive checks | `references/accessibility-checks.md` (58 lines): thresholds and the measurements that prove them (focus ring against its band, opacity-blended contrast, mid-word breaks across widths, pinned chrome, overlap, first view) | present |
| Templates | `templates/project-design-md.md`, `templates/audit-checklist.md` | present |

## Fresh-session tests

| # | Test | Result |
| --- | --- | --- |
| 1 | **Discovery and loading.** Fresh session in the docs worktree asked to list skills, then to use the skill without opening files | The skill appeared in the session's start-up skill list; the transcript shows a `Skill` tool call for `website-design-system` and no manual file reads; the answer (first three steps, supporting files and when to read them, the "never carry identity" rule) matched the skill text exactly |
| 2 | **Concept A: Salt & Ember (protected).** Neutral request to improve its hero | Used the skill and the project's `DESIGN.md`; identified the concept as **protected**; declined a restyle; offered only bounded, defect-level options keeping ignition, Newsreader and the ember palette; listed nothing from the other concepts as borrowed |
| 3 | **Concept B: Sunny Hours Club (not protected).** Same request | Used the skill and the project docs and CSS; identified the concept as **not** protected; kept its five-colour palette, tilted shapes and planner; proposed three genuinely different hero ideas within that identity |
| 2+3 | **Distinct identities preserved (mechanical check)** | Salt & Ember's proposal section contained **none** of the Sunny Hours markers (navy, tilted, sticker, planner, sun yellow, teal); Sunny Hours' proposal section contained **none** of the Salt & Ember markers (ember, ignition, fire, hearth, Newsreader); each correctly named its own typefaces, palette and signature interaction; neither session edited anything |
| 4 | **Always-on rules.** Fresh session, all file tools disabled, asked what the project's loaded instructions say | Answered correctly with zero tool calls: Salt & Ember protected (defect-only changes), "Tobi" unresolved (do not guess), reviewer claims must be re-measured before becoming a fix |
| 5 | **Portability to Build AI Here.** Skill copied into a scratch project with a **copy** of Build AI Here's own `DESIGN.md` (the real repository was not touched) | Took the identity from that file (Paper, Ink, teal, Instrument Serif and Sans, Plex Mono, the technical grid), kept Tolra's graphite and amber out of the hero, noted that no `references.md` existed and so claimed no inspected sources, and carried in nothing from the Rhys concepts |
| 6 | **Project with no `DESIGN.md`** | Said there was no identity source, declined to invent one, labelled its colours and fonts as provisional placeholders, and borrowed nothing from other projects |

## Limits

- A model following instructions is evidence that the skill is discoverable, loaded and understood, not proof it will always behave the same. The tests used one run each.
- The sessions were read-only and produced proposals, not built pages.
- Test 5 used a copy of Build AI Here's `DESIGN.md` only; Build AI Here itself was not modified.
