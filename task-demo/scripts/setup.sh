#!/usr/bin/env bash
# 원클릭 설정 — 환경 점검 → productivity → mod 검증 → mod 설치 → 최종 점검. 다시 실행해도 안전하다.
set -euo pipefail
HERE="$(CDPATH= cd "$(dirname "$0")/.." && pwd -P)"; ROOT="$HERE"
. "$HERE/scripts/lib.sh"
cd "$HERE"
export KIT_STEP=1   # 하위 스크립트의 '다음에 할 일' 안내는 끝에서 한 번만

step 1/5 "환경 점검"
"$HERE/scripts/check-env.sh" || { bad "환경 점검 실패 — 위 → 안내대로 해결한 뒤 다시 실행하세요"; exit 1; }

step 2/5 "productivity 설치"
if out="$(claude plugin marketplace add anthropics/knowledge-work-plugins --scope project 2>&1 &&
          claude plugin install productivity@knowledge-work-plugins --scope project 2>&1)"; then
  ok "productivity@knowledge-work-plugins (project)"
else
  bad "productivity 설치 실패 — 이유는 아래 한 줄 (실습 03에 필요합니다)"
  hint "$(last_err "$out")"
  hint "로그인 · 네트워크 · GitHub 접근을 확인한 뒤 $SD/setup.sh 를 다시 실행하세요"
  exit 1
fi

step 3/5 "tasks mod 검증"
if out="$(claude plugin validate ./mods/tasks 2>&1)"; then
  ok "validate: Validation passed"
else
  bad "validate 실패"; printf '%s\n' "$out" | mask | sed 's/^/    /'; exit 1
fi
# grep -q 는 일찍 끝나 pipefail 에서 printf 가 141 이 되고, here-string 은 임시 파일이 필요하다 — 끝까지 읽는 grep 에 파이프로 넘긴다.
if out="$(claude plugin test ./mods/tasks 2>&1)" && printf '%s\n' "$out" | grep '^ 0 fail$' >/dev/null &&
   n="$(printf '%s\n' "$out" | sed -n 's/^ \([1-9][0-9]*\) pass$/\1/p')" && [ -n "$n" ]; then
  ok "test: $n pass, 0 fail"
else
  bad "test 실패 (pass 가 없거나 fail 이 있음)"; printf '%s\n' "$out" | mask | sed 's/^/    /'; exit 1
fi
hint "mod 는 사용자 권한으로 실행됩니다. 소스를 읽어 보세요 (실습 04)"

step 4/5 "tasks mod 설치 (project scope)"
"$HERE/scripts/install-mod.sh" "$HERE"

step 5/5 "최종 점검"
"$HERE/scripts/verify.sh" "$HERE" || { bad "최종 점검 실패 — 위 → 안내대로 해결한 뒤 $SD/setup.sh 를 다시 실행하세요"; exit 1; }

printf '\n%s다음에 할 일%s\n' "$C_B" "$C_0"
printf '  1. claude          이 폴더에서 세션 시작\n'
printf '  2. /tasks-pane     세션 안에서 입력 — 목록 pane 열기\n'
printf '  따라 하기: RUNBOOK.md\n'
