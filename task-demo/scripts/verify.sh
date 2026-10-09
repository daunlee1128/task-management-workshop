#!/usr/bin/env bash
# 비대화형 점검 — 항목별 ✔/✖. productivity 도 필수다. ✖ 가 하나라도 있으면 exit 1.
set -euo pipefail
HERE="$(CDPATH= cd "$(dirname "$0")/.." && pwd -P)"; ROOT="$HERE"
. "$HERE/scripts/lib.sh"
resolve_target "${1:-}"
need_claude
cd "$TARGET"

if claude auth status >/dev/null 2>&1; then ok "로그인됨"
else bad "로그인 안 됨"; hint "claude auth login"; fi

if claude plugin validate "$HERE/mods/tasks" >/dev/null 2>&1; then ok "mod validate"
else bad "mod validate 실패"; hint "claude plugin validate ./mods/tasks 로 원인 확인"; fi

if claude plugin test "$HERE/mods/tasks" >/dev/null 2>&1; then ok "mod test"
else bad "mod test 실패"; hint "claude plugin test ./mods/tasks 로 원인 확인"; fi

if plugin_on tasks@workshop-mods "$TARGET"; then ok "tasks@workshop-mods 활성 (project)"
else bad "tasks@workshop-mods 가 이 폴더에서 꺼져 있음"; hint "$SD/install-mod.sh 를 다시 실행"; fi

if python3 -I -c 'import json,sys; sys.exit(json.load(open(sys.argv[1])).get("tui") != "fullscreen")' \
     "$TARGET/.claude/settings.json" 2>/dev/null; then ok "tui=fullscreen"
else bad "tui=fullscreen 설정 없음 (pane 우측 도킹 불가)"; hint "$SD/install-mod.sh 를 다시 실행"; fi

sections=1
for s in Active "Waiting On" Someday Done; do
  grep -qx "## $s" "$TARGET/TASKS.md" 2>/dev/null || sections=0
done
if [ "$sections" -eq 1 ]; then ok "TASKS.md 섹션 4개"
else warn "TASKS.md 가 없거나 섹션이 부족함"; hint "## Active · Waiting On · Someday · Done 이 있어야 목록이 보입니다"; fi

rc=0; plugin_on productivity@knowledge-work-plugins "$TARGET" || rc=$?
case "$rc" in
  0) ok "productivity 활성" ;;
  1) bad "productivity 가 이 폴더에서 꺼져 있음 (실습 03에 필요)"; hint "$SD/setup.sh 를 다시 실행" ;;
  *) bad "productivity 상태를 읽지 못함"; hint "claude plugin list --json 이 실패했거나 JSON 이 아닙니다" ;;
esac

if [ "$FAILED" -eq 0 ]; then
  next "claude 로 세션을 열고 /tasks-pane 입력"
else
  next "✖ 항목의 → 안내대로 해결한 뒤 $SD/verify.sh 를 다시 실행"
fi
exit "$FAILED"
