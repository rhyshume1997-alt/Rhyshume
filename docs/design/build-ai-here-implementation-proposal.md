# Implementation proposal: installing the `website-design-system` skill in `buildaihere/website`

**Status: proposal only.** The Build AI Here repository was not modified while preparing this. Every check below used a scratch copy or read-only inspection.

## Principle

Build AI Here **inherits the shared methodology** (the process, the research library including Refero Styles, the Fable critique method, the accessibility checks) and **keeps its own identity**: the approved hybrid direction (light editorial foundation, Instrument Serif, deep teal, a technical grid) with the provisional graphite and amber Tolra treatment. It inherits no identity, font, colour or layout from any portfolio concept. The skill carries none (scan of the skill folder for concept names, fonts and palettes: 0 hits).

## What Build AI Here has today (inspected read-only)

- `docs/design/DESIGN.md`: the approved hybrid identity, tokens, motion principles and decisions. Stays the authority on identity.
- `docs/design/references.md`: a full reference list from Phase 0. **All 17 distinct URLs it cites are already in the shared library** (checked: 17 of 17 present), so reducing it to project-specific additions loses no citation.
- `CLAUDE.md` and `AGENTS.md`: standing instructions, including the design standards and "Tobi unresolved".
- No `.claude/skills/` folder. PR #1 (Phase 0) is ready for review and not merged; its branch is `claude/amazing-gauss-91vfx6`.

## Exact changes (one draft pull request, three commits, nothing else touched)

1. **Add the skill** (10 files and `VERSION.md`) under `.claude/skills/website-design-system/`: `SKILL.md`, `references/` (`accessibility-checks.md`, `fable-critique.md`, `reference-library.md`, `refero-research.md`, `research-process.md`, `research-records/grok-x-design-research-2026-11-20.md`), `templates/` (`audit-checklist.md`, `project-design-md.md`, `project-references.md`), `VERSION.md`. Copy byte for byte so the content hash in `VERSION.md` verifies.
2. **Make the repository's checks accept it.** All 10 skill files **fail Build AI Here's Prettier check** (verified against its `.prettierrc.json`), which would turn CI red. Reformatting would change the validated hash, so add one line to `.prettierignore`: `.claude`. (The skill contains no code, so ESLint, TypeScript and the Next build are unaffected.)
3. **Point the project at it.** In `CLAUDE.md`, replace the sentence that names `docs/design/references.md` as the reference library with: "The shared reference library and design process are in the `website-design-system` skill (`.claude/skills/website-design-system/`). This project's identity is `docs/design/DESIGN.md` (hybrid direction, Tolra dark treatment). `docs/design/references.md` holds only this project's additions. Never take identity from any other project or from a reference."
4. **Reduce `docs/design/references.md` to project-specific additions** (template `templates/project-references.md`): the access notes, "Tobi unresolved", and any source specific to Build AI Here. The full list stays in the shared library and in git history.

**Not changed:** `DESIGN.md` identity and tokens, anything under `src/`, CI workflows, `package.json`, the Phase 1 branch plan, Tolra, and the approved Phase 0 pull request.

## Acceptance tests (run in the Build AI Here repository after install)

1. `pnpm check` and `pnpm build` pass; GitHub CI is green.
2. **Version:** the content hash of the installed skill equals the `VERSION.md` hash.
3. **Discovery and loading** in a fresh Claude Code session: the skill appears in the skill list and loads through the `Skill` tool.
4. **Identity test:** a fresh session asked for three homepage hero directions takes the identity from Build AI Here's `DESIGN.md` (Paper, teal, Instrument Serif, the 56px grid), keeps graphite and amber for Tolra only, and mentions no portfolio concept's fonts, colours or interactions. (A scratch-copy run of this test passed; see `audit-2026-11-20/skill-validation.md`.)
5. **Client-first flow:** asked to start a redesign, the session inspects existing identity first, researches with Refero (records actually fetched, listed), and proposes three genuinely different directions without building.

## How Phase 1 would use it (next steps, after approval)

1. Approve and merge Phase 0 PR #1 (the owner's decision; not done).
2. Install the skill as above.
3. Phase 1 step 1 (the reference pass) uses the skill's research flow: Refero records chosen for the **hybrid** direction (light editorial plus technical detail), each with a provenance row in `DESIGN.md` (taken from, changed, not used), plus the motion, component and footer references the Phase 1 plan already names.
4. Produce three genuinely different homepage concepts from the approved identity, present rendered previews at 1440px and 390px, recommend one, wait for the owner's pick, then build.
5. Run the accessibility checks and capture real screenshots before each delivery.

## Risks and rollback

- **CI:** the `.prettierignore` line is required; without it the format check fails.
- **Drift:** the version hash in `VERSION.md` shows when the copy differs from the validated version.
- **Over-trust:** the skill requires measuring before fixing; keep reviewing diffs.
- **Rollback:** delete `.claude/skills/website-design-system/`, revert the `CLAUDE.md` sentence and the `.prettierignore` line. Nothing else depends on it.

## Decisions for the owner

1. Approve this install as one draft PR on a new Build AI Here branch (needs your permission to push it)? Should it stack on Phase 0 PR #1 or wait until it merges?
2. Approve reducing Build AI Here's `references.md` to project additions in the same PR (as a separate commit)?
3. Approve the `.prettierignore` line?
