#!/usr/bin/env bash
# 재실습 — TASKS.md · CLAUDE.md 를 처음 상태로 되돌리고, 실습이 만든 tasks-archive/ · docs/access-policy.md · memory/ · dashboard.html 을 지운다.
set -euo pipefail
HERE="$(CDPATH= cd "$(dirname "$0")/.." && pwd -P)"; ROOT="$HERE"
. "$HERE/scripts/lib.sh"
cd "$HERE"

cp templates/TASKS.initial.md TASKS.md
ok "TASKS.md 를 처음 상태로 복원"
cp templates/CLAUDE.initial.md CLAUDE.md   # /productivity:start 가 덮어쓸 수 있다(실습 03)
ok "CLAUDE.md 를 처음 상태로 복원"

if [ -d tasks-archive ]; then
  n="$(find tasks-archive -type f | wc -l | tr -d ' ')"
  rm -rf tasks-archive
  ok "tasks-archive/ 삭제 (파일 ${n}개)"
else
  ok "tasks-archive/ 는 이미 없음"
fi

if [ -e docs/access-policy.md ]; then
  rm -f docs/access-policy.md
  rmdir docs 2>/dev/null || true   # 비었을 때만 지워진다
  ok "docs/access-policy.md 삭제"
else
  ok "docs/access-policy.md 는 이미 없음"
fi

# 실습 03(/productivity:start)이 만든 것 — 남아 있으면 skill 이 '이미 초기화됨'으로 보고 memory 를 다시 만들지 않는다.
if [ -d memory ]; then
  rm -rf memory
  ok "memory/ 삭제"
else
  ok "memory/ 는 이미 없음"
fi
if [ -e dashboard.html ]; then
  rm -f dashboard.html
  ok "dashboard.html 삭제"
else
  ok "dashboard.html 은 이미 없음"
fi

next "claude 로 새 세션을 열어 RUNBOOK 의 실습 03 부터 다시"
