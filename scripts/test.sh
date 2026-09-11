#!/usr/bin/env bash
set -Eeuo pipefail
grep -Fq "専門業者確認" docs/mvp-design.md
grep -Fq "判断不能" docs/mvp-design.md
grep -Fq "fallback" docs/mvp-design.md
grep -Fq "1 Issue = 1 PR" docs/issue-breakdown.md
