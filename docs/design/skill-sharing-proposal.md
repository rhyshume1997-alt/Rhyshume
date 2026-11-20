# Proposal: sharing the `website-design-system` skill with future projects

**Status: proposal only. Nothing in this document has been done.** The Build AI Here installation has its own proposal: `build-ai-here-implementation-proposal.md`.

## Architecture (as validated)

- **One shared library, no copies.** The skill's `references/` folder is the single source for the reference library (Refero Styles as a major source, and the others), the research process, the Fable critique method, the accessibility checks and dated research records.
- **Each project keeps only:** its own `DESIGN.md` (identity and rules) and `docs/design/references.md` containing only its project-specific additions. Because nothing is copied between them, nothing needs synchronising.
- **Identity never travels.** The skill folder contains no palette, typeface, layout or signature interaction, and no portfolio concept names (scanned: 0 hits). Validation shows two client projects and two portfolio concepts keep distinct identities.
- **Version.** The skill records its validated version in `VERSION.md` (a content hash of every skill file, the source commit, and the validation record), so a project can confirm it holds exactly the validated version.

## Distribution options

| Option | How | Pros | Cons |
| --- | --- | --- | --- |
| A. Copy per project | Copy `.claude/skills/website-design-system/` into each repository and keep the `VERSION.md` | Simplest; works offline; no new service | Copies can drift; updates are manual (the content hash shows when they have) |
| B. Shared source repository | A small private repository holding only the skill; each project copies from a tagged revision | One source of truth; versioned; reviewable changes | A new repository to create and maintain (needs owner approval); whether the `npx skills` installer can use a private source is **unverified** |
| C. User level | Put the skill in `~/.claude/skills/` on the owner's machine | Available in every project automatically | Not shared with collaborators or cloud sessions; invisible in a repository |
| D. Cloud environment | A setup script fetches the skill when a container starts | Available in cloud sessions | Changes the environment; needs owner approval; the script cannot use secrets |

**Recommendation:** A now (for Build AI Here), then B once the skill has proved itself, with C for the owner's own machine.

## What a project must do when it adopts the skill

1. Copy the skill folder and its `VERSION.md`.
2. Add a short pointer to the project's `CLAUDE.md`.
3. Keep or create the project's own `DESIGN.md` from `templates/project-design-md.md`.
4. Keep `docs/design/references.md` to project-specific additions only (`templates/project-references.md`). Anything already in the shared library is not repeated.
5. Re-run the validation prompts (see `audit-2026-11-20/skill-validation.md`) in the new repository.

## Risks

- **Drift** between copies: mitigated by the version hash in `VERSION.md` and, later, by option B.
- **Over-trusting a skill:** a model following instructions is not a guarantee. The skill requires measuring before fixing; review diffs.
- **Licence of linked references:** the library records restrictions (21st.dev terms, paid plans on Scrolltide, Scroll Shaders and SceneAI, Refero's unknown reuse terms and its font-licensing caution). Nothing was bought and no third-party code or asset was imported.

## Decisions for the owner

1. Approve option A for Build AI Here (see its own proposal)?
2. Create the shared source repository (option B), and under which account? Not created.
3. Should future client projects each get a project `DESIGN.md` from the template before any build starts? (The skill requires it.)
