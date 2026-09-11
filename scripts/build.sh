#!/usr/bin/env bash
set -Eeuo pipefail

node --check src/documents.mjs
node --check src/search.mjs
git diff --check
