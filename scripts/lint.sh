#!/usr/bin/env bash
set -Eeuo pipefail

for path in README.md AGENTS.md docs/mvp-design.md docs/acceptance-scenarios.md docs/issue-breakdown.md src/documents.mjs src/search.mjs src/assistant.mjs tests/documents.test.mjs tests/search.test.mjs tests/assistant.test.mjs; do
  test -s "$path"
done

for path in data/samples/*.txt; do
  test -s "$path"
done

node --check src/documents.mjs
node --check src/search.mjs
node --check src/assistant.mjs
node --check tests/documents.test.mjs
node --check tests/search.test.mjs
node --check tests/assistant.test.mjs
