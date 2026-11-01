#!/bin/bash
# SessionStart hook (see .claude/settings.json): installs dependencies in
# Claude Code cloud sessions. Exits immediately on local machines.
# Skips `npm ci` while the lockfile and every workspace package.json are
# unchanged since the last successful install.

if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" || exit 1

hashes=node_modules/.cloud-install.sha256
files="scripts/cloud-install.sh package.json package-lock.json apps/web/package.json apps/mobile/package.json packages/shared/package.json"

if ! sha256sum --check --status "$hashes" 2>/dev/null; then
  # Delete the old hashes first, so a failed install runs again next time
  rm -f "$hashes"
  if npm ci; then
    sha256sum $files > "$hashes" || rm -f "$hashes"
  fi
fi

exit 0
