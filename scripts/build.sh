#!/usr/bin/env bash
set -Eeuo pipefail

node --check src/documents.mjs
node --check src/search.mjs
node --check src/assistant.mjs
git diff --check
