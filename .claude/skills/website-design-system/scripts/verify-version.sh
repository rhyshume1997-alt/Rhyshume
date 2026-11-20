#!/usr/bin/env bash
# Confirms this copy of the skill is exactly the validated version recorded in VERSION.md.
# Run from anywhere: bash .claude/skills/website-design-system/scripts/verify-version.sh
set -euo pipefail
dir="$(cd "$(dirname "$0")/.." && pwd)"
actual=$(cd "$dir" && find . -type f ! -name VERSION.md | LC_ALL=C sort | xargs sha256sum | sha256sum | cut -d' ' -f1)
recorded=$(grep -E '^content-sha256:' "$dir/VERSION.md" | awk '{print $2}')
if [ "$actual" = "$recorded" ]; then
  echo "OK: skill content matches the validated version ($(grep -E '^version:' "$dir/VERSION.md" | awk '{print $2}'))"
else
  echo "DIFFERENT: this copy does not match the validated version" >&2
  echo "  recorded: $recorded" >&2
  echo "  actual:   $actual" >&2
  exit 1
fi
