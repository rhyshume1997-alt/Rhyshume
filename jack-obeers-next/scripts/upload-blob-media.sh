#!/usr/bin/env bash
# Uploads the large videos to the Vercel Blob store "jack-obeers-media" (public).
# Run this on your own computer, in a clone of the jack-obeers-media repo's videos folder, with the store's
# read-write token set. Do not paste the token anywhere else.
#
#   export BLOB_READ_WRITE_TOKEN=...      (Vercel > Storage > jack-obeers-media > .env.local)
#   MEDIA_DIR=/path/to/jack-obeers-media ./scripts/upload-blob-media.sh
#
# Then set BLOB_LIVE to true in src/lib/media.ts (or NEXT_PUBLIC_BLOB_LIVE=true) and check BLOB_BASE matches
# the URL printed below.
set -euo pipefail
: "${BLOB_READ_WRITE_TOKEN:?set BLOB_READ_WRITE_TOKEN first}"
: "${MEDIA_DIR:?set MEDIA_DIR to your jack-obeers-media folder}"
for f in events-ilkley-brewery-tall michael-welcome; do
  file="$MEDIA_DIR/videos/$f.mp4"
  [ -f "$file" ] || { echo "skip $f (not found)"; continue; }
  npx --yes vercel@latest blob put "$file" --pathname "videos/$f.mp4" --rw-token "$BLOB_READ_WRITE_TOKEN" --content-type video/mp4 --allow-overwrite
done
