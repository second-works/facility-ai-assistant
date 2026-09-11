#!/usr/bin/env bash
set -Eeuo pipefail

node --check src/documents.mjs
node --check src/search.mjs
node --check src/assistant.mjs
node --check src/llm-adapter.mjs
node --check src/safety-guard.mjs
node --check web/app.mjs
node --check web/demo-data.mjs
git diff --check
