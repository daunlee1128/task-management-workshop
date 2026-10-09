#!/usr/bin/env bash
# tasks mod 만 TARGET_DIR(기본: 이 키트 폴더)에 project scope 로 설치하고 tui=fullscreen 을 병합한다.
# marketplace 는 전역 1건이라 어느 TARGET 이든 항상 이 키트의 mods 를 add 한다.
set -euo pipefail
HERE="$(CDPATH= cd "$(dirname "$0")/.." && pwd -P)"; ROOT="$HERE"
. "$HERE/scripts/lib.sh"
resolve_target "${1:-}"

need_claude

cd "$TARGET"   # project scope 는 cwd 기준이다
SETTINGS="$TARGET/.claude/settings.json"

# JSON 이 아니면 아무것도 바꾸기 전에 멈춘다.
if ! settings_tui "$SETTINGS" check; then
  bad ".claude/settings.json 을 JSON 으로 읽지 못함"
  hint "주석·끝 쉼표를 지우고 다시 실행하세요 (파일은 바꾸지 않았습니다)"
  exit 1
fi

if out="$(claude plugin marketplace add "$HERE/mods" --scope project 2>&1)"; then
  ok "marketplace workshop-mods 등록 ($(printf '%s' "$HERE/mods" | mask))"
else
  bad "marketplace 등록 실패"; hint "$(last_err "$out")"; exit 1
fi

if out="$(claude plugin install tasks@workshop-mods --scope project 2>&1)"; then
  ok "tasks@workshop-mods 설치 (project)"
else
  bad "tasks 설치 실패"; hint "$(last_err "$out")"; exit 1
fi

prev="$(settings_tui "$SETTINGS")"
if [ -n "$prev" ]; then ok ".claude/settings.json 의 tui: $prev → fullscreen 으로 변경"
else ok ".claude/settings.json 에 tui=fullscreen"; fi

next "$SD/verify.sh"
