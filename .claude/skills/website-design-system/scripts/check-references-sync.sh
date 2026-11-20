#!/usr/bin/env bash
# Fails if the skill's portable copy of the reference library differs from docs/design/references.md.
# Run from the repository root. Skips quietly if the project has no docs/design/references.md.
set -euo pipefail
skill=".claude/skills/website-design-system/references/reference-library.md"
canon="docs/design/references.md"
[ -f "$canon" ] || { echo "no $canon in this project: nothing to compare"; exit 0; }
[ -f "$skill" ] || { echo "missing $skill"; exit 1; }
if diff -q <(sed '1,/<!-- begin copy -->/d' "$skill") "$canon" >/dev/null; then
  echo "reference library copy is in sync"
else
  echo "reference library copy differs from $canon: re-copy it" >&2
  exit 1
fi
