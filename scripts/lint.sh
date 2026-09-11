#!/usr/bin/env bash
set -Eeuo pipefail
for path in README.md AGENTS.md docs/mvp-design.md docs/acceptance-scenarios.md docs/issue-breakdown.md; do
  test -s "$path"
done
