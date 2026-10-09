#!/usr/bin/env bash
# 이 폴더(project scope)의 plugin 만 제거한다. 작업 파일은 남긴다.
# marketplace remove 는 전역 등록과 다른 프로젝트의 설치까지 지우므로, disable 은 재실행 시 실패하므로 쓰지 않는다.
set -euo pipefail
HERE="$(CDPATH= cd "$(dirname "$0")/.." && pwd -P)"; ROOT="$HERE"
. "$HERE/scripts/lib.sh"
cd "$HERE"

need_claude

for id in tasks@workshop-mods productivity@knowledge-work-plugins; do
  # 설치돼 있지 않거나(not found) 다른 scope·폴더에만 있어서(not installed in project scope · scope, not project) 실패하면
  # 이 폴더에서는 이미 제거된 것이므로 정상으로 본다. 그 밖의 실패는 ✖ 로 알린다.
  if out="$(claude plugin uninstall "$id" --scope project 2>&1)"; then r="제거함"
  elif [[ "$out" == *"not found in installed plugins"* || "$out" == *"not installed in project scope"* || "$out" == *"scope, not project"* ]]; then r="이미 제거됨"
  else bad "$id 제거 실패"; hint "$(last_err "$out")"; continue; fi
  rc=0; plugin_on "$id" "$HERE" || rc=$?
  case "$rc" in
    0) bad "$id 가 아직 켜져 있음"; hint "claude plugin uninstall $id --scope project 의 메시지를 확인하세요" ;;
    1) ok "$id $r" ;;
    *) bad "$id 상태를 읽지 못함"; hint "claude plugin list --json 이 실패했거나 JSON 이 아닙니다" ;;
  esac
done

hint "TASKS.md · tasks-archive/ · docs/ 는 그대로 남아 있습니다"
hint "열린 세션은 /reload-plugins 또는 새 세션으로 반영하세요"
next "다시 쓰려면 $SD/setup.sh"
exit "$FAILED"
