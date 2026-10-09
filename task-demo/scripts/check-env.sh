#!/usr/bin/env bash
# 환경 점검만 한다 — claude 버전·로그인·python3·터미널 폭. setup.sh 1단계이며 단독 실행도 된다.
set -euo pipefail
HERE="$(CDPATH= cd "$(dirname "$0")/.." && pwd -P)"; ROOT="$HERE"
. "$HERE/scripts/lib.sh"

MIN=2.1.287

if ! command -v claude >/dev/null 2>&1; then
  bad "claude 를 찾을 수 없음"
  hint "설치 안내: https://code.claude.com/docs/en/setup"
else
  v="$(claude --version 2>/dev/null | awk '{print $1}')" || v=''
  if [ -n "$v" ] && [ "$(printf '%s\n%s\n' "$MIN" "$v" | sort -V | head -n 1)" = "$MIN" ]; then
    ok "claude $v ($MIN 이상)"
  else
    bad "claude ${v:-버전 확인 실패} — $MIN 이상 필요"
    hint "업데이트: claude update"
  fi
  if claude auth status >/dev/null 2>&1; then
    ok "로그인됨"
  else
    bad "로그인 안 됨"
    hint "로그인: claude auth login"
  fi
fi

if py="$(python3 -c 'import sys; print("%d.%d" % sys.version_info[:2])' 2>/dev/null)"; then
  ok "python3 $py"
else
  bad "python3 를 쓸 수 없음"
  hint "설치한 뒤 다시 실행 (macOS: xcode-select --install)"
fi

cols="$(stty size 2>/dev/null | awk '{print $2}')" || cols=0   # tput 은 stderr 가 터미널이 아니면 80 을 돌려준다
case "$cols" in ''|*[!0-9]*) cols=0 ;; esac
if [ "$cols" -ge 110 ]; then
  ok "터미널 폭 ${cols}칸"
else
  warn "터미널 폭 $([ "$cols" -gt 0 ] && echo "${cols}칸" || echo '미확인') — 110칸 이상 권장"
  hint "창을 넓히거나 글자 크기를 줄이세요 (pane 우측 도킹에 필요)"
fi

if [ "$FAILED" -eq 0 ]; then
  next "$SD/setup.sh"
else
  next "위 → 안내대로 해결한 뒤 $SD/check-env.sh 를 다시 실행"
fi
exit "$FAILED"
