#!/usr/bin/env bash
# Build distributable Acadia packages.
#   ./build.sh             -> builds both acadia-<version>.xpi (Firefox) and acadia-<version>-chrome.zip
#   ./build.sh xpi         -> Firefox only
#   ./build.sh chrome      -> Chrome only
# Run from the repo root.

set -euo pipefail

TARGET="${1:-both}"
VERSION="$(node -e "console.log(require('./manifest.json').version)" 2>/dev/null || echo "dev")"

XPI_OUT="acadia-${VERSION}.xpi"
ZIP_OUT="acadia-${VERSION}-chrome.zip"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Stage only the extension files — strip docs, build script, git, markdown, build artifacts.
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

build_firefox() {
  rm -f "$XPI_OUT"
  (cd "$TMP" && zip -r "$OLDPWD/$XPI_OUT" . > /dev/null)
  echo "  Firefox: $XPI_OUT ($(du -h "$XPI_OUT" | cut -f1))"
}

build_chrome() {
  rm -f "$ZIP_OUT"
  (cd "$TMP" && zip -r "$OLDPWD/$ZIP_OUT" . > /dev/null)
  echo "  Chrome:  $ZIP_OUT ($(du -h "$ZIP_OUT" | cut -f1))"
}

echo "Building Acadia v${VERSION}…"
case "$TARGET" in
  xpi|firefox)    build_firefox ;;
  zip|chrome)     build_chrome ;;
  both|"")        build_firefox; build_chrome ;;
  *)              echo "Unknown target: $TARGET"; exit 1 ;;
esac
echo "Done."
