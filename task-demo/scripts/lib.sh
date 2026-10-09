#!/usr/bin/env bash
# 공통 helper — 다른 스크립트가 source 한다(직접 실행하는 파일이 아니다).
set -euo pipefail
# source 하기 전에 HERE(키트 폴더)와 ROOT(작업 폴더, mask 가 '.' 로 바꾼다)를 정해 둔다.

FAILED=0

# 색은 터미널이고 NO_COLOR 가 없을 때만 쓴다.
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  C_G=$'\033[32m'; C_R=$'\033[31m'; C_Y=$'\033[33m'; C_B=$'\033[1m'; C_0=$'\033[0m'
else
  C_G=''; C_R=''; C_Y=''; C_B=''; C_0=''
fi

step() { printf '\n%s[%s] %s%s\n' "$C_B" "$1" "$2" "$C_0"; }
ok()   { printf '  %s✔%s %s\n' "$C_G" "$C_0" "$*"; }
bad()  { printf '  %s✖%s %s\n' "$C_R" "$C_0" "$*"; FAILED=1; }
warn() { printf '  %s⚠%s %s\n' "$C_Y" "$C_0" "$*"; }
hint() { printf '    → %s\n' "$*"; }
# setup.sh 안에서 부르면(KIT_STEP=1) 마지막 안내를 setup.sh 가 대신 한다.
next() { [ -n "${KIT_STEP:-}" ] || printf '\n→ 다음에 할 일: %s\n' "$*"; }

# 안내문에 쓸 scripts 폴더 — 지금 위치(cwd)에서 본 상대경로다(task-demo 에서는 ./scripts).
SD="$(python3 -I -c 'import os,sys; p=os.path.relpath(sys.argv[1]); print(p if p.startswith(".") else "./" + p)' "$HERE/scripts" 2>/dev/null)" || SD=./scripts

# claude 가 없으면 안내하고 끝낸다(check-env.sh 를 뺀 스크립트 공용).
need_claude() {
  if ! command -v claude >/dev/null 2>&1; then
    bad "claude 를 찾을 수 없음"
    hint "$SD/check-env.sh 로 환경을 먼저 점검하세요"
    exit 1
  fi
}

# 출력에서 작업 폴더는 '.', 키트 폴더는 '<kit>', 홈은 '~' 로 가린다.
_re() { printf '%s' "$1" | sed 's/[][\.*^$#&|]/\\&/g'; }
mask() { sed -e "s#$(_re "$ROOT")#.#g" -e "s#$(_re "$HERE")#<kit>#g" -e "s#$(_re "$HOME")#~#g"; }

# 명령 출력($1)에서 마지막 ✘ 줄(없으면 마지막 줄)만, 경로를 가리고 한 줄 폭(88자)으로 단어 경계에서 줄여 보여 준다.
last_err() {
  printf '%s\n' "$1" | mask | python3 -I -c '
import sys
lines = [l for l in sys.stdin.read().splitlines() if l.strip()]
hit = [l for l in lines if "✘" in l]
line = (hit or lines or [""])[-1]
line = (line[line.find("✘"):] if "✘" in line else line).strip()
print(line if len(line) <= 88 else line[:87].rsplit(" ", 1)[0] + " …")' || true
}

# $1 = 대상 폴더(생략하면 키트 폴더). 실경로를 TARGET 에 담고 ROOT 를 맞춘다. 없는 폴더면 안내하고 끝낸다.
resolve_target() {
  if [ -d "${1:-$HERE}" ]; then
    TARGET="$(CDPATH= cd "${1:-$HERE}" && pwd -P)"; ROOT="$TARGET"
  else
    ROOT="$PWD"
    bad "대상 폴더가 없음: $(printf '%s' "$1" | mask)"
    hint "있는 폴더를 지정하세요: $(basename "$0") <폴더>"
    exit 1
  fi
}

# $1 의 settings.json 에 tui=fullscreen 을 병합한다(기존 키 보존, 한글 보존). $2=check 면 읽기만 한다.
# 없는 파일·빈 파일은 {} 로 본다. JSON 이 아니면(주석·끝 쉼표 등) 파일을 건드리지 않고 exit 2.
# merge 로 기존의 다른 tui 값을 바꿨으면 그 이전 값을 stdout 에 한 줄로 낸다.
settings_tui() {
  python3 -I - "$1" "${2:-merge}" <<'PY'
import json, os, sys
path, mode = sys.argv[1], sys.argv[2]
try:
    text = open(path, encoding="utf-8").read() if os.path.exists(path) else ""
    data = json.loads(text) if text.strip() else {}
    if not isinstance(data, dict):
        raise ValueError
except ValueError:
    sys.exit(2)
if mode == "merge" and data.get("tui") != "fullscreen":
    old = data.get("tui")
    data["tui"] = "fullscreen"
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path + ".tmp", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    os.replace(path + ".tmp", path)
    if old is not None:
        print(old)
PY
}

# $1=plugin id, $2=대상 폴더(실경로). cwd 가 대상 폴더여야 한다.
# plugin list --json 에서 scope=project · projectPath=대상 폴더인 행이 enabled 인가.
# exit 0=켜짐, 1=꺼짐·없음, 2=plugin list 를 읽지 못함(명령 실패·JSON 아님·최상위가 배열 아님·모양 이상).
plugin_on() {
  local json
  json="$(claude plugin list --json 2>/dev/null)" || return 2   # 파이프로 잇지 않아 pipefail 이 python 의 1 로 실패를 가리지 않는다
  # here-string 은 bash 3.2 에서 임시 파일을 만들어, 만들지 못하면 python 이 안 돌고 1(꺼짐)로 읽힌다 — 파이프로 넘긴다.
  printf '%s' "$json" | python3 -I -c '
import json, sys
try:
    rows = json.load(sys.stdin)
    if not isinstance(rows, list):
        raise TypeError("list 아님")
    rows = [r for r in rows
            if r["id"] == sys.argv[1] and r["scope"] == "project" and r.get("projectPath") == sys.argv[2]]
    on = bool(rows) and rows[0]["enabled"]
    if not isinstance(on, bool):
        raise TypeError("enabled 가 bool 아님")
except Exception:
    sys.exit(2)
sys.exit(0 if on else 1)' "$1" "$2" 2>/dev/null
}
