#!/usr/bin/env bash
set -Eeuo pipefail

for path in README.md AGENTS.md docs/mvp-design.md docs/acceptance-scenarios.md docs/issue-breakdown.md src/documents.mjs src/search.mjs src/assistant.mjs src/llm-adapter.mjs src/safety-guard.mjs web/index.html web/app.mjs web/demo-data.mjs web/styles.css tests/documents.test.mjs tests/search.test.mjs tests/assistant.test.mjs tests/llm-adapter.test.mjs tests/safety-guard.test.mjs tests/ui.test.mjs; do
  test -s "$path"
done

for path in data/samples/*.txt; do
  test -s "$path"
done

node --check src/documents.mjs
node --check src/search.mjs
node --check src/assistant.mjs
node --check src/llm-adapter.mjs
node --check src/safety-guard.mjs
node --check web/app.mjs
node --check web/demo-data.mjs
node --check tests/documents.test.mjs
node --check tests/search.test.mjs
node --check tests/assistant.test.mjs
node --check tests/llm-adapter.test.mjs
node --check tests/safety-guard.test.mjs
node --check tests/ui.test.mjs
