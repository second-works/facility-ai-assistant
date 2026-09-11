#!/usr/bin/env bash
set -Eeuo pipefail

grep -Fq "専門業者" docs/mvp-design.md
grep -Fq "判断不能" docs/mvp-design.md
grep -Fq "fallback" docs/mvp-design.md
grep -Fq "1 Issue = 1 PR" docs/issue-breakdown.md
grep -Fq "A-01" docs/demo-acceptance.md
grep -Fq "実Gemma" docs/demo-acceptance.md
node --test tests/documents.test.mjs tests/search.test.mjs tests/assistant.test.mjs tests/llm-adapter.test.mjs tests/safety-guard.test.mjs tests/ui.test.mjs
