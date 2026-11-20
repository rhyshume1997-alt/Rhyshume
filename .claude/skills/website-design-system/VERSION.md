# website-design-system: version record

version: 1.1.0
validated: 2026-11-20
content-sha256: d1851dc8c91eaecceac2c7e62e4afcec9a2acd2c95f698fc1794cd8ff5977ced
files-in-hash: 11 (every file in this folder except this one)
validated-source-commit: c530aeb5fb4ecdba24079f947d9eec6e790f8f06
source-repository: https://github.com/rhyshume1997-alt/Rhyshume (branch claude/design-system-docs, draft pull request 33)
validation-record: docs/design/audit-2026-11-20/skill-validation.md in the source repository

## What "validated" means

The content above was loaded in fresh Claude Code sessions and exercised: discovery and loading, two portfolio concepts keeping distinct identities, always-on rules, portability to a copy of another project's own DESIGN.md, an empty project, two fictional clients using the client-first Refero flow, and the sibling check. The last discovery and rules checks were re-run on the exact commit named above. See the validation record for the prompts, the evidence and the limits (one run per scenario, read-only proposals).

## Using this version in another project

1. Copy this whole folder into the project's `.claude/skills/`. Do not edit it in place; change the source and re-validate.
2. Run `bash .claude/skills/website-design-system/scripts/verify-version.sh`. It prints OK only if the copy matches the hash above.
3. Keep the project's own `DESIGN.md` and a `docs/design/references.md` with project-specific additions only.
4. If the project's formatter checks Markdown (for example Prettier), exclude `.claude` from it rather than reformatting the skill, which would change the hash.
