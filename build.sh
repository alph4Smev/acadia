#!/usr/bin/env bash
# Builds a distributable Acadia .xpi from the working tree.
# Run from the repo root.

set -euo pipefail

OUT="${1:-acadia.xpi}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Copy only what should ship in the extension (no docs, no .git, no markdown).
rsync -a \
  --exclude='.git' \
  --exclude='.gitignore' \
  --exclude='docs/' \
  --exclude='build.sh' \
  --exclude='*.md' \
  --exclude='*.xpi' \
  --exclude='*.zip' \
  --exclude='node_modules/' \
  --exclude='.DS_Store' \
  ./ "$TMP/"

(
  cd "$TMP"
  zip -r "$OLDPWD/$OUT" . > /dev/null
)

echo "Built: $OUT"
ls -lh "$OUT"
