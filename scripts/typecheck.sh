#!/usr/bin/env bash
set -Eeuo pipefail
bash -n scripts/verify.sh scripts/security-preflight.sh bin/setup bin/doctor
