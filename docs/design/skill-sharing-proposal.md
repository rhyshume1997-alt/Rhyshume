# Proposal: sharing the `website-design-system` skill

**Status: proposal only. Nothing in this document has been done.** Build AI Here, other repositories and the owner's machine are unchanged.

## Why this is safe to share

The skill carries process and quality gates, never appearance. Each project's identity (palette, typefaces, shape language, signature interaction) lives only in that project's own `DESIGN.md`. Validation (see `audit-2026-11-20/skill-validation.md`) showed, in fresh sessions:

- the skill is discovered at start-up and invoked through the `Skill` tool;
- two different concepts kept their own identities with zero cross-contamination, and a protected concept was not restyled;
- with a copy of Build AI Here's own `DESIGN.md`, a fresh session used Build AI Here's identity and kept Tolra's graphite and amber out of the hero;
- with no `DESIGN.md`, it refused to invent or borrow an identity.

## What is shared and what is not

| Shared (portable) | Never shared |
| --- | --- |
| Process (ask, audit, three directions, build, check, feedback, hand-off) | Palette, typefaces, layouts |
| Evidence rules and the Fable critique methodology | Signature interactions |
| Accessibility, motion and responsive checks | Any project's `DESIGN.md` or registry |
| The reference library (with verification labels) | The Grok research record (`grokResearch.md`), which is a dated project document |
| Templates (project `DESIGN.md`, audit checklist) | Tolra-specific decisions |

The skill does not bundle Emil Kowalski's skills. They are separate MIT-licensed skills that projects install on their own (this repository pins them in `skills-lock.json`).

## Distribution options

| Option | How | Pros | Cons |
| --- | --- | --- | --- |
| A. Copy per project | Copy `.claude/skills/website-design-system/` (8 files) into each repository | Simplest; works offline; no new service | Copies drift; fixes must be re-copied by hand |
| B. Shared source repository | A small private repository holding the skill; each project copies from it and records the commit | One source of truth; versioned; reviewable changes | A new repository to create and maintain (needs owner approval); whether the `npx skills` installer can pull from a private source is **unverified** |
| C. User level | Put the skill in `~/.claude/skills/` on the owner's machine | Available in every project automatically | Not shared with collaborators or cloud sessions; invisible in a repository |
| D. Cloud environment | An environment setup script fetches the skill when a container starts | Available in cloud sessions | Changes the environment; needs owner approval; the script cannot use secrets |

**Recommendation:** B as the source of truth, with A (copy at a recorded commit) into each project, and C for the owner's own machine. Do A first for Build AI Here; decide on B once it has proved useful.

## Exact steps for Build AI Here (after approval)

1. New branch in Build AI Here from its current head. Do not touch its approved pull request.
2. Copy the skill folder to `.claude/skills/website-design-system/`.
3. Add this pointer to Build AI Here's `CLAUDE.md`: "For design work follow the `website-design-system` skill. This project's identity is `docs/design/DESIGN.md` (hybrid direction, Tolra dark treatment). Do not take identity from any other project."
4. Keep Build AI Here's own `docs/design/DESIGN.md` and `references.md`. **Do not run `scripts/check-references-sync.sh` there:** it compares the skill's copy with the project's `references.md`, and Build AI Here's file is a different, project-specific document.
5. Re-run the validation tests in Build AI Here: discovery and loading, an identity test on its homepage, and the always-on rules test.
6. Open a draft pull request. Do not merge without approval.

## Decisions for the owner

1. Approve option A for Build AI Here now?
2. Create the shared source repository (option B), and under which account? Not created.
3. Should the reference library live once, inside the skill, with each project's `references.md` reduced to its own additions? (Today this repository keeps a full `references.md` and a synchronised copy in the skill.)
4. Should the research record from Grok (`grokResearch.md`) stay project-local, as proposed?

## Risks

- **Drift** between copies: mitigated by recording the source commit in each project and by option B.
- **Over-trusting a skill:** a model following instructions is not a guarantee. Keep the verification step (measure before fixing) and review diffs.
- **Licence of linked references:** the library records restrictions (21st.dev terms, paid plans on Scrolltide, Scroll Shaders and SceneAI). Nothing was bought and no third-party code or asset was imported.
