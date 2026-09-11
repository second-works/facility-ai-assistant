#!/usr/bin/env bash
set -Eeuo pipefail

grep -Fq "専門業者" docs/mvp-design.md
grep -Fq "判断不能" docs/mvp-design.md
grep -Fq "fallback" docs/mvp-design.md
grep -Fq "1 Issue = 1 PR" docs/issue-breakdown.md
node --test tests/documents.test.mjs tests/search.test.mjs tests/assistant.test.mjs
