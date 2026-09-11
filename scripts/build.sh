#!/usr/bin/env bash
set -Eeuo pipefail

node --check src/documents.mjs
git diff --check
