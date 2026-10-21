#!/usr/bin/env bash
# Installs the Claude Code skill ZIPs from dist/claude-code/ into your user skills folder.
# Safe by design: verifies checksums first, never overwrites an existing skill, never uses sudo,
# never edits settings.json, adds no hooks.
#
# Usage:
#   ./install-claude-code-skills.sh              # install into ~/.claude/skills
#   ./install-claude-code-skills.sh --dry-run    # show what would happen
#   ./install-claude-code-skills.sh --dir PATH   # install somewhere else (for example a project's .claude/skills)
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
zips_dir="$here/dist/claude-code"
target="${HOME}/.claude/skills"
dry=0

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) dry=1 ;;
    --dir) shift; target="${1:?--dir needs a path}" ;;
    -h|--help) sed -n 2,11p "$0"; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

command -v unzip >/dev/null || { echo "unzip is required" >&2; exit 1; }
command -v sha256sum >/dev/null || command -v shasum >/dev/null || { echo "sha256sum or shasum is required" >&2; exit 1; }

echo "Verifying checksums in $zips_dir ..."
( cd "$zips_dir" && if command -v sha256sum >/dev/null; then sha256sum -c SHA256SUMS.txt; else shasum -a 256 -c SHA256SUMS.txt; fi )

echo
echo "Target skills folder: $target"
[ "$dry" = 1 ] && echo "(dry run: nothing will be written)"
[ "$dry" = 1 ] || mkdir -p "$target"

installed=0; skipped=0
for z in "$zips_dir"/*.zip; do
  name="$(basename "$z" .zip)"
  if [ -e "$target/$name" ]; then
    echo "SKIP    $name  (already exists at $target/$name; back it up or remove it first if you want to replace it)"
    skipped=$((skipped+1))
    continue
  fi
  if [ "$dry" = 1 ]; then
    echo "WOULD INSTALL  $name"
  else
    unzip -q "$z" -d "$target"
    echo "INSTALL $name"
  fi
  installed=$((installed+1))
done

echo
echo "Done. installed=$installed skipped=$skipped"
echo
echo "Restart Claude Code (or start a new session) so it picks up the new skills."
echo
echo "Plugins to add yourself inside Claude Code (not run by this script):"
echo "  /plugin marketplace add mattpocock/skills"
echo "  /plugin install mattpocock-skills@mattpocock"
echo "  /plugin marketplace add cathrynlavery/diagram-design"
echo "  /plugin install diagram-design@diagram-design"
echo "Optional:"
echo "  /plugin marketplace add blader/humanizer"
echo "  /plugin install humanizer@humanizer"
