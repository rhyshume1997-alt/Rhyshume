#!/usr/bin/env bash
# Builds the signed nightcity.riv the pages load.
# Needs the Rive CLI (https://rive.app/cli) and, once per machine: rive login
set -euo pipefail
cd "$(dirname "$0")"
rive rive --verify
rive rive --publish
cp rive/build/nightcity.riv nightcity.riv
echo "wrote $(pwd)/nightcity.riv"
