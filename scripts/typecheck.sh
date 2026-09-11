#!/usr/bin/env bash
set -Eeuo pipefail

bash -n scripts/verify.sh scripts/security-preflight.sh bin/setup bin/doctor
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
