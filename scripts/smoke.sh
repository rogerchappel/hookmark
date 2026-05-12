#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"
rm -rf tmp
mkdir -p tmp
node dist/cli.js scan fixtures/risky --out tmp/risky.md
node dist/cli.js scan fixtures/risky --format json --out tmp/risky.json || true
if node dist/cli.js scan fixtures/risky --format json --fail-on high > tmp/fail-on.json; then
  echo "expected fail-on high to exit non-zero" >&2
  exit 1
fi
node dist/cli.js explain fixtures/husky/package.json --format markdown > tmp/explain.md
grep -q "HookMark Safety Map" tmp/risky.md
grep -q '"maxSeverity"' tmp/risky.json
grep -q "prepare" tmp/explain.md
printf 'smoke ok\n'
