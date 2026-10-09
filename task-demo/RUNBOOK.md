# RUNBOOK — 실습 01~09

위에서 아래로 따라 한다.

- 셸 명령은 `bash` 블록이다. 모두 `task-demo` 폴더에서 실행한다.
- 세션 안 입력은 `text` 블록이고 앞에 **(claude 세션 안에서)** 를 적었다.
- 터미널 창을 둘 쓰면 편하다. 하나는 `claude` 세션, 하나는 확인용 셸.
- **모델의 응답 문구와 동작은 매번 다르다.** 확인 포인트만 맞으면 된다.
- **모든 실습(01~09)은 필수다.** 건너뛰지 않고 순서대로 진행한다.

## 전체 흐름 한눈에

| 실습 | 하는 일 | 방식 | 명령 |
|------|---------|------|------|
| 01 | 폴더에서 시작 · 환경 점검 | 자동 | `./scripts/check-env.sh` |
| 02 | productivity 설치 | 자동 | `./scripts/setup.sh` 2단계 |
| 03 | 목록 · 배경 정보 · memory 초기화 | 세션 | `/productivity:start` |
| 04 | mod 파일 · validate / test | 자동 | `./scripts/setup.sh` 3단계 |
| 05 | mod 활성화 | 자동 | `./scripts/install-mod.sh` → `./scripts/verify.sh` |
| 06 | 상태줄 · pane 확인 | 세션 | `/tasks-pane` |
| 07 | 작업 추가 · 완료 | 세션 | 프롬프트 2개 |
| 08 | 갱신 요청 · 완료 보관 | 세션 | 프롬프트 1개 + `/clear` |
| 09 | 안 될 때 확인 · 마치기 | 자동 | `./scripts/verify.sh` · `./scripts/uninstall.sh` |

`./scripts/setup.sh` 한 번이면 01 · 02 · 04 · 05가 끝난다. 이미 했다면 "기대 결과"만 대조하고 넘어간다.

---

## 실습 01 — 폴더에서 시작하기

**하는 일** Claude Code 버전 · 로그인 · python3 · 터미널 폭을 점검한다.

**명령**

```bash
cd task-demo
claude --version
./scripts/check-env.sh
```

**기대 결과** 항목마다 `✔`가 나온다. 터미널 폭이 110칸 미만이면 `⚠`가 나온다. 실습은 계속할 수 있고, pane 우측 도킹만 안 된다.

```text
2.1.292 (Claude Code)
  ✔ claude 2.1.292 (2.1.287 이상)
  ✔ 로그인됨
  ✔ python3 3.9
  ✔ 터미널 폭 140칸

→ 다음에 할 일: ./scripts/setup.sh
```

**안 되면**

| 화면 | 해결 |
|------|------|
| `✖ claude 를 찾을 수 없음` | https://code.claude.com/docs/en/setup 의 설치 안내를 따른다(Windows는 WSL 안에서) |
| `✖ claude … 2.1.287 이상 필요` | `claude update` |
| `✖ 로그인 안 됨` | `claude auth login` |
| `✖ python3 를 쓸 수 없음` | python3를 설치한다(macOS: `xcode-select --install`) |
| `⚠ 터미널 폭 …칸` | 창을 넓히거나 글자 크기를 줄인다 |

---

## 실습 02 — productivity plugin 설치하기

**하는 일** `setup.sh`로 점검 · 설치 · 검증을 한 번에 한다. 2단계에서 공식 productivity plugin이 이 폴더(project scope)에 설치된다. 실습 03이 이 plugin을 쓰므로 건너뛰지 않는다.

**명령**

```bash
./scripts/setup.sh
```

2단계만 따로 하려면 아래 두 명령을 실행한다.

```bash
claude plugin marketplace add anthropics/knowledge-work-plugins --scope project
claude plugin install productivity@knowledge-work-plugins --scope project
```

**기대 결과** 5단계가 모두 `✔`로 끝나고 "다음에 할 일"이 나온다. 다시 실행해도 출력은 같다.

```text
[1/5] 환경 점검
  ✔ claude 2.1.292 (2.1.287 이상)
  ✔ 로그인됨
  ✔ python3 3.9
  ✔ 터미널 폭 140칸

[2/5] productivity 설치
  ✔ productivity@knowledge-work-plugins (project)

[3/5] tasks mod 검증
  ✔ validate: Validation passed
  ✔ test: 21 pass, 0 fail
    → mod 는 사용자 권한으로 실행됩니다. 소스를 읽어 보세요 (실습 04)

[4/5] tasks mod 설치 (project scope)
  ✔ marketplace workshop-mods 등록 (./mods)
  ✔ tasks@workshop-mods 설치 (project)
  ✔ .claude/settings.json 에 tui=fullscreen

[5/5] 최종 점검
  ✔ 로그인됨
  ✔ mod validate
  ✔ mod test
  ✔ tasks@workshop-mods 활성 (project)
  ✔ tui=fullscreen
  ✔ TASKS.md 섹션 4개
  ✔ productivity 활성

다음에 할 일
  1. claude          이 폴더에서 세션 시작
  2. /tasks-pane     세션 안에서 입력 — 목록 pane 열기
  따라 하기: RUNBOOK.md
```

세션에서 `/plugin`을 입력하면 productivity가 활성인지 볼 수 있다. 세션을 연 채로 설치했다면 `/reload-plugins`를 입력하거나 새 세션을 연다.

(claude 세션 안에서)

```text
/plugin
```

**안 되면** 로그인 · 네트워크 · 조직 정책에 따라 설치가 안 될 수 있다.

- 2단계에서 `✖`로 멈추고 3단계 이후는 실행되지 않는다.
- productivity는 실습 03에 필요하다. 아래 한 줄의 이유를 보고 접속 문제를 푼다.

```text
[2/5] productivity 설치
  ✖ productivity 설치 실패 — 이유는 아래 한 줄 (실습 03에 필요합니다)
    → ✘ Failed to add marketplace: Fetching the marketplace from GitHub failed on both …
    → 로그인 · 네트워크 · GitHub 접근을 확인한 뒤 ./scripts/setup.sh 를 다시 실행하세요
```

접속 문제를 푼 뒤 `./scripts/setup.sh`를 다시 실행한다.

---

## 실습 03 — 목록 · 배경 정보 · memory 초기화하기

**하는 일** `/productivity:start`로 `dashboard.html`을 준비하고, 작업 배경을 `memory/`에 기록한다. memory는 두 층이다.

```text
CLAUDE.md          ← hot cache. 세션마다 읽힌다. 짧게 유지하고 "memory/를 먼저 본다"는 한 줄만 둔다
memory/
  glossary.md      ← 용어 · 약어 · 별칭 전체 (decoder ring)
  projects/        ← 프로젝트별 상세
  context/         ← 팀 · 도구 · 프로세스
  people/          ← 사람별 프로필 (TASKS.md에 사람이 나오면 생긴다)
```

- 자주 쓰는 것은 `CLAUDE.md`, 전체는 `memory/`에 둔다. `CLAUDE.md`가 길어지면 지침이 잘 안 지켜진다(공식 권장은 200줄 이하).
- 이 `memory/`는 productivity plugin의 프로젝트 폴더용 기록이다. Claude Code가 `~/.claude/projects/…/memory/`에 따로 쌓는 auto memory와 다르다.

**왜 프롬프트를 지정하나** skill은 `CLAUDE.md`와 `memory/`가 **둘 다 없을 때만** memory를 만든다. 이 폴더에는 `CLAUDE.md`(실습 규칙)가 이미 있어서 그냥 실행하면 `memory/` 없이 끝난다. 그래서 아래 프롬프트로 memory 초기화를 직접 지시하고, 실습 규칙이 든 `CLAUDE.md`는 덮어쓰지 못하게 한다.

**명령**

```bash
claude
```

처음 여는 폴더면 신뢰 확인 화면(`Quick safety check`)이 뜬다.

- `Yes, I trust this folder`를 고른다.
- 기본 선택이 `No, exit`일 수 있다. 방향키로 옮긴 뒤 Enter를 누른다.
- 한 번 승인한 폴더는 다시 묻지 않는다.

명령과 지시를 한 번에 입력한다. 여러 줄이니 줄바꿈은 `Shift+Enter`(안 되면 `\` 뒤에 Enter)로 넣고, 마지막에 Enter로 보낸다.

(claude 세션 안에서)

```text
/productivity:start
memory 초기화(5~7단계)까지 한 번에 진행해 줘. 할 일은 TASKS.md 에 있어.
- 외부 연결 없이 로컬 파일만 사용하고, 종합 스캔은 건너뛰어.
- TASKS.md 는 수정하지 마.
- CLAUDE.md 는 덮어쓰지 말고, 기존 내용 아래에 "## Memory" 섹션만 추가해. "용어 · 프로젝트는 memory/glossary.md 를 먼저 본다"는 한 줄이면 돼.
- memory/glossary.md, memory/projects/access-policy.md, memory/context/company.md 를 만들어 줘.
- 내용은 TASKS.md 에서 확인되는 것만 쓰고, 모르는 것은 "미정"으로 둬. 지어내지 마.
```

**기대 결과** 질문 · 답변 · 파일 내용은 모델과 plugin 버전에 따라 다르다. 끝난 뒤 파일로 확인한다.

- `/productivity:start` 직후 `Stop hook error: 이번 턴에 파일을 바꿨는데 TASKS.md는 그대로다 …`가 보일 수 있다. `dashboard.html` 복사를 작업 파일 변경으로 본 tasks mod의 갱신 요청이다(실습 08 (A)). 모델이 "반영할 할 일이 없다"고 답하면 정상이다.

1. `dashboard.html`이 생겼다
2. `memory/glossary.md` · `memory/projects/access-policy.md` · `memory/context/company.md`가 생겼다
3. `TASKS.md`가 그대로다(섹션 4개, 기존 항목 유지)
4. `CLAUDE.md`에 실습 규칙(`mcp__tasks__add` · `mcp__tasks__complete`)이 남아 있고, 아래에 `## Memory` 섹션이 붙었다

```bash
ls dashboard.html memory memory/projects memory/context
cat memory/glossary.md
diff TASKS.md templates/TASKS.initial.md && echo "TASKS.md 그대로"
grep -n "mcp__tasks\|^## Memory" CLAUDE.md
```

- `glossary.md`에 `TASKS.md`에서 뽑은 용어(권한 정책 · 시안 · 팀 용어집 등)가 있고, 확인 안 된 항목이 "미정"으로 표시되면 된다.
- `memory/people/`은 안 생겨도 정상이다. `TASKS.md`에 사람 이름이 없다.
- 이후 세션에서 "디자인팀 건이 뭐였지?"처럼 물으면 `CLAUDE.md` → `memory/` 순으로 찾는다. 새 용어는 "X는 Y라는 뜻이야, 기억해 줘"로 `memory/glossary.md`에 더한다.

**안 되면**

- **`memory/`가 안 생겼다**: `/productivity:start`만 입력하고 아래 지시 줄을 빼먹은 것이다. 위 입력 전체를 다시 보낸다.
- **`CLAUDE.md`가 바뀌었거나 실습 규칙이 사라졌다 / `TASKS.md`가 바뀌었다**: `./scripts/reset.sh`로 되돌린 뒤 실습 03을 다시 한다. `reset.sh`는 `memory/` · `dashboard.html`도 지운다.

---

## 실습 04 — tasks mod의 파일과 동작 확인하기

**하는 일** mod를 이루는 파일을 보고 `validate`(정적 검증)와 `test`(단위 테스트)를 실행한다. `setup.sh` 3단계와 같은 일이다.

**명령**

```bash
ls -A mods mods/tasks mods/tasks/hooks
claude plugin validate ./mods/tasks
claude plugin test ./mods/tasks
```

**기대 결과**

- `ls -A`: manifest가 든 숨김 폴더 `.claude-plugin`까지 보인다.
- `validate`: `Validation passed`
- `test`: `0 fail`

```text
Validating plugin manifest: ./mods/tasks/.claude-plugin/plugin.json

Validating hooks: ./mods/tasks/hooks/hooks.json

  ❯ ./register.tsx hooks: session.start, session.end, classic.UserPromptSubmit, tool.call{tool=Edit|Write|NotebookEdit}, tool.call{tool=Bash}, classic.Stop, tool.call{tool=mcp__tasks__add}, tool.call{tool=mcp__tasks__complete}, command.run{command=tasks-pane}, ui.render{component=Pane}
  ❯ ./register.tsx answers its own command: command.run{command=tasks-pane}
  ❯ ./register.tsx gating hook without .catch: classic.UserPromptSubmit
  ❯ ./register.tsx gating hook without .catch: tool.call{tool=Edit|Write|NotebookEdit}
  ❯ ./register.tsx gating hook without .catch: tool.call{tool=Bash}
  ❯ ./register.tsx gating hook without .catch: classic.Stop
  ❯ ./register.tsx gating hook without .catch: tool.call{tool=mcp__tasks__add}
  ❯ ./register.tsx gating hook without .catch: tool.call{tool=mcp__tasks__complete}
  ❯ ./register.tsx calls: $.clock.every (via startPoll), $.command.register, $.fs.exists (via archiveDone), $.fs.read (via archiveDone, reload), $.fs.stat (via reload), $.fs.write (via archiveDone, save), $.session.root (via archiveDone, pathOf), $.tool.register, $.ui.close, $.ui.invalidate (via completeAt, reload), $.ui.open, $.ui.panes, $.ui.resolve, $.ui.status (via reload)

✔ Validation passed
```

```text
tests/register.test.ts:
(pass) register > pane을 연 채로 TASKS.md가 바뀌면 2초 안에 다시 그리게 한다 [29.38ms]
(pass) register > 파일을 바꾼 턴에 TASKS.md가 그대로면 종료를 한 번 막고, 두 번째는 통과시킨다 [15.52ms]
(pass) register > complete tool은 1건만 맞을 때 완료 처리하고, 여러 건이면 거절한다 [14.96ms]
(pass) register > complete tool은 빈 query로는 아무것도 완료하지 않는다 [12.09ms]
(pass) register > add tool은 섹션 맨 위에 넣고, section · title이 잘못되면 거절한다 [13.24ms]
(pass) register > 병렬로 온 add · complete가 서로의 변경을 덮어쓰지 않는다 [86.64ms]
(pass) register > poll의 읽기가 끝나기 전에는 add가 쓰지 않아, 늦게 돌아온 읽기가 앞선 추가를 되돌리지 못한다 [47.33ms]
(pass) register > TASKS.md를 읽지 못하면 add · complete를 거절하고, 파일이 돌아오면 mtime이 같아도 다시 한다 [18.31ms]
(pass) register > session이 끝나면 Done을 tasks-archive로 옮기고, Done이 비었으면 파일을 만들지 않는다 [12.79ms]
(pass) register > 같은 분에 같은 session이 다시 끝나도 먼저 보관한 Done을 잃지 않는다 [19.55ms]
(pass) register > 거절된 편집은 변경으로 세지 않고, 작업 파일은 경로가 정확히 TASKS.md일 때만 뺀다 [17.81ms]
(pass) register > pane 완료 버튼은 그 사이 바뀐 TASKS.md를 덮어쓰지 않고, 쓰기 실패를 pane에 보인다 [18.33ms]

tests/tasks-md.test.ts:
(pass) tasks-md > 섹션과 할 일을 읽는다 [1.66ms]
(pass) tasks-md > 완료 처리하면 Done 맨 위로 옮긴다 [0.26ms]
(pass) tasks-md > 이미 완료된 줄이나 할 일이 아닌 줄은 그대로 둔다 [0.18ms]
(pass) tasks-md > Done의 할 일 줄만 떼어 내고 섹션 제목은 남긴다 [0.27ms]
(pass) tasks-md > 할 일은 섹션 맨 위에 넣고, 섹션이 없으면 그대로 둔다 [0.17ms]
(pass) tasks-md > title · note의 개행은 공백으로 합쳐 섹션 구조를 바꾸지 못하게 한다 [0.21ms]
(pass) tasks-md > CRLF 파일도 읽고 고친다 [0.28ms]
(pass) tasks-md > 끝 공백이 있는 섹션 제목과 대문자 [X]도 같게 읽는다 [0.19ms]
(pass) tasks-md > 찾기는 열린 할 일만, 제목과 메모 모두에서 한다 [0.14ms]

 21 pass
 0 fail
Ran 21 tests across 2 files. [0.44s]
```

- `gating hook without .catch` 줄은 경고가 아니라 안내(note)다.
- `test`의 `[…ms]` 시간은 실행마다 다르다. `0 fail`이면 된다.
- **mod는 사용자 권한으로 실행된다.** 실행 전에 `mods/tasks/hooks/`의 소스와 validate의 `calls:` 줄을 읽는다.
- `calls:`에 나오는 것은 파일(`$.fs`) · 화면(`$.ui`) · 명령과 tool 등록 · 타이머 · session 경로뿐이다.

**안 되면**

- `mods/`를 고쳤다면 되돌린다. `mods/tasks`의 `hooks/` `tests/`는 원본 그대로여야 한다.
- `claude` 명령이 없다는 오류면 실습 01로 돌아간다.

---

## 실습 05 — 실습 폴더에 tasks mod 활성화하기

**하는 일** tasks mod를 이 폴더(project scope)에 설치 · 활성화하고 점검한다.

**명령**

```bash
./scripts/install-mod.sh
./scripts/verify.sh
```

손으로 하면 아래 두 명령이다. `install-mod.sh`는 여기에 `tui=fullscreen` 설정을 더한다. 다른 `tui` 값이 이미 있으면 바꾸고 이전 값을 알려 준다.

```bash
claude plugin marketplace add ./mods --scope project
claude plugin install tasks@workshop-mods --scope project
```

**기대 결과** `install-mod.sh`는 세 줄, `verify.sh`는 항목별 `✔`다. productivity가 없으면 마지막 줄이 `✖`다. 실습 02를 먼저 끝낸다.

```text
  ✔ marketplace workshop-mods 등록 (./mods)
  ✔ tasks@workshop-mods 설치 (project)
  ✔ .claude/settings.json 에 tui=fullscreen

→ 다음에 할 일: ./scripts/verify.sh
```

```text
  ✔ 로그인됨
  ✔ mod validate
  ✔ mod test
  ✔ tasks@workshop-mods 활성 (project)
  ✔ tui=fullscreen
  ✔ TASKS.md 섹션 4개
  ✔ productivity 활성

→ 다음에 할 일: claude 로 세션을 열고 /tasks-pane 입력
```

- 설치 정보는 `.claude/settings.json`에 기록된다. 각자의 절대경로가 들어가므로 공유하지 않는다(`.gitignore`가 막는다).
- 한 세션만 시험하려면 `claude --plugin-dir ./mods/tasks`도 된다. 일반 설치와 겹쳐 쓸 필요는 없다.

**안 되면**

| 화면 | 해결 |
|------|------|
| `✖ tasks@workshop-mods 가 이 폴더에서 꺼져 있음` | `./scripts/install-mod.sh`를 다시 실행 |
| `✖ .claude/settings.json 을 JSON 으로 읽지 못함` | 파일의 주석 · 끝 쉼표를 지우고 다시 실행(스크립트는 파일을 바꾸지 않았다) |
| 세션이 이미 열려 있다 | 세션에서 `/reload-plugins` 또는 새 세션 |

---

## 실습 06 — 목록을 화면에서 확인하기

**하는 일** 세션을 열어 상태줄을 보고, `/tasks-pane`으로 `TASKS.md`의 목록을 pane에 띄운다.

**명령**

```bash
claude
```

신뢰 확인 화면(`Quick safety check`)은 이미 승인했다면 나오지 않는다. 처음 뜨면 `Yes, I trust this folder`를 고른다(실습 03 참고).

(claude 세션 안에서)

```text
/tasks-pane
```

**기대 결과**

- 세션이 열리고 약 1초 뒤 상태줄에 `⚠ tasks: 할 일 Active 1 · Waiting On 1`이 보인다.
  - 앞의 `⚠ tasks:`는 mod 상태줄이 붙는 표시 형태다.
  - 뒤의 요약이 `TASKS.md`와 맞으면 정상이다.
- `/tasks-pane`을 입력하면 오른쪽에 pane이 도킹된다.
  - 기본 폭은 48칸이다. 환경에 따라 좌우 약 1:1로 나뉘기도 한다(아래 '폭').
  - `TASKS.md` 한 줄(제목 - 메모)이 pane의 한 줄이다. 폭을 넘으면 `…`로 잘린다.
- 모양은 대략 이렇다(터미널에 따라 다르다).

```text
Active (1)
1: 완료 실습 — 권한 정책 초안 작성 - docs/acces…

Waiting On (1)
2: 완료 디자인팀 — 신규 화면 시안 - since 2026-…

Someday (1)
· 팀 용어집 정리 - 여유가 생기면

Done (0)
```

알아 둘 점

- **폭**: `/tasks-pane 100`처럼 숫자를 붙이면 그 칸 수로 도킹된다.
  - 인자가 무시되고 좌우 약 1:1로 나뉘는 환경도 있다.
  - 메모가 잘려 보이면 폭을 늘린다.
- **숫자 키**: 포커스가 pane에 있을 때(연 직후) `1`, `2`가 완료 버튼이다.
  - 글자를 입력하면 입력창이 포커스를 가져간다. 이후 숫자는 글자로 들어간다.
  - pane이 열려 있어도 프롬프트는 입력할 수 있다.
- **지금은 `1` `2`를 누르지 않는다.** `1`은 실습 07의 대상 항목을 Done으로 보낸다. 눌렀다면 `./scripts/reset.sh`로 되돌린다.
- **닫기**: 입력창이 비어 있을 때 `Esc`, 또는 `/tasks-pane`을 다시 입력한다. 외부에서 `TASKS.md`를 고치면 2초 안팎에 pane에 반영된다.

**안 되면**

| 화면 | 해결 |
|------|------|
| 상태줄이나 `/tasks-pane`이 없다 | 세션에서 `/plugin`으로 tasks 활성 여부를 보고 `/reload-plugins`. 그래도 안 되면 셸에서 `./scripts/verify.sh` |
| 목록이 비어 있다 | `TASKS.md`에 `## Active` `## Waiting On` `## Someday` `## Done` 섹션이 있는지 확인 |
| pane이 입력창 위에 열린다(`일반 화면이라 prompt 위에 열었다`) | 터미널 폭이 110칸 미만이거나 fullscreen이 아니다 |

---

## 실습 07 — 작업을 추가하고 완료 처리하기

**하는 일** 모델에게 tasks 도구(`mcp__tasks__add`, `mcp__tasks__complete`)로 목록을 바꾸게 한다. 셸에서 tool 이름을 실행하는 것이 아니다.

**명령 (추가)** pane이 열려 있어도 프롬프트는 그대로 입력한다.

(claude 세션 안에서)

```text
tasks 도구로 Active에 "실습 — 검토 체크리스트 작성"을 추가해 줘. 아직 완료 처리하지 마.
```

**기대 결과 (추가)**

- `TASKS.md`의 Active 맨 위에 항목이 생긴다.
- 상태줄이 `Active 2 · Waiting On 1`로 바뀐다.
- pane이 열려 있으면 같은 항목이 2초 안팎에 나타난다(닫혀 있으면 `/tasks-pane`).

```bash
head -8 TASKS.md
```

- `mcp__tasks__add`의 **첫 호출이 인자 없이 실패**할 수 있다. 에러 한 줄이 남는다(`section은 Active · Waiting On · Someday 중 하나여야 한다`).
- 모델이 곧바로 다시 호출해 성공하면 정상이다.

**명령 (작업 진행 · 완료)**

(claude 세션 안에서)

```text
"실습 — 권한 정책 초안 작성"을 진행해 줘. docs/access-policy.md 에 초안을 쓰고, 끝나면 TASKS.md 상태를 반영해 줘.
```

**기대 결과 (완료)**

- `docs/access-policy.md`가 만들어진다.
- 해당 항목이 Done으로 옮겨진다. 상태줄은 `Active 1 · Waiting On 1`이 되고 Done 항목은 취소선으로 보인다.
- 날짜는 `TASKS.md`에서 확인한다(pane 폭이 좁으면 `…`로 잘린다).

```bash
cat docs/access-policy.md
cat TASKS.md
```

`TASKS.md`의 Done은 이런 형태다(날짜는 실행한 날).

```text
## Done
- [x] ~~**실습 — 권한 정책 초안 작성** - docs/access-policy.md 에 초안 작성~~ (YYYY-MM-DD)
```

**Done은 초안 작성이 끝났다는 뜻일 뿐, 정책의 검토 · 승인이 아니다.**

- pane 헤더 `Done (N)`은 열린 항목 수다. 완료 항목이 줄로 보여도 `Done (0)`이다.
- **세션을 닫지 않는다.** `/exit`하면 Done이 `tasks-archive/`로 옮겨져 `TASKS.md`에서 사라진다(실습 08).

**안 되면**

- **모델이 상태를 반영하지 않았다**: pane에서 해당 항목의 완료 숫자 키를 누르거나 정확한 제목으로 다시 요청한다.
  - pane 번호는 목록 순서라 항목이 추가되면 바뀐다. 누르기 전에 번호를 본다. 누른 항목의 줄 위치나 표시 내용이 그려진 뒤 달라졌으면 눌러도 아무 일도 없다. 새로 그려진 pane에서 다시 누른다.
- **완료가 거절된다**: 제목 · 메모에 해당 글자가 들어간 **열린 항목이 정확히 1건**이 아니라는 뜻이다. 거절 메시지에 후보가 나오니 정확한 제목으로 좁힌다.
- **열린 항목이 없다**: 이미 Done이거나 보관된 경우다(실습 06에서 숫자 키를 눌렀거나 `/exit`로 닫음). `./scripts/reset.sh`로 처음 상태로 되돌리고 다시 한다.

---

## 실습 08 — 갱신 요청과 완료 보관 확인하기

**하는 일** 두 동작을 본다. 실습 07에서 Done 항목을 만든 상태로 시작한다.

- (A) 작업 파일을 바꿨는데 `TASKS.md`가 그대로면, 종료 직전에 모델에게 갱신을 한 번 요청한다.
- (B) Done이 있는 상태에서 `/clear`하면 Done이 `tasks-archive/`로 보관된다.

**명령 (A) 갱신 요청** 파일 변경이 확실히 감지되도록 Bash로 쓰게 한다.

(claude 세션 안에서)

```text
Bash 도구로 mkdir -p docs && echo "## 검토 메모" >> docs/access-policy.md 를 실행해 줘. TASKS.md 는 건드리지 마.
```

**기대 결과 (A)**

- 화면에 `Ran 1 shell command`와 모델의 답이 보인다.
- 이어서 **모델의 두 번째 답**이 나온다("반영할 작업이 없습니다 … TASKS.md는 요청대로 건드리지 않았습니다" 같은 취지).
- 이 두 번째 답이 갱신 요청이 있었다는 간접 증거다.

알아 둘 점

- **갱신 요청 문구 자체는 TUI에 표시되지 않는다.** 모델의 추가 응답으로만 보인다. 문구는 `mods/tasks/hooks/register.tsx`의 `STOP_REASON`에 있다.
- 항상 나타나는 동작이 아니다. 이미 목록을 갱신했다면 요청이 없을 수 있다. 한 번 요청한 뒤에는 다시 막지 않는다.
- Bash 실행 허가를 묻는 화면이 나오면 이번 한 번 허용한다(권한 모드에 따라 다르다).

**명령 (B) 완료 보관** `/clear`는 대화 context도 함께 비운다.

(claude 세션 안에서)

```text
/clear
```

다른 터미널(같은 폴더)에서 확인한다.

```bash
ls tasks-archive
cat tasks-archive/*-TASKS.md
cat TASKS.md
```

**기대 결과 (B)**

- `tasks-archive/{yyyyMMddHHmm}-{세션ID}-TASKS.md`가 생기고 그 안에 Done 항목이 있다.
- `TASKS.md`의 Done은 비어 있다.
- 이 파일은 완료 작업 목록이지 대화 전사본이 아니다.
- 세션을 끝낼 때(`/exit`)도 같은 보관이 일어난다.

**안 되면**

- **Done이 비어 있었다**: 보관 파일이 안 만들어진다(정상). 실습 07로 돌아가 항목을 완료한 뒤 다시 `/clear`한다.
- **이미 `/exit`로 끝냈다**: 보관은 그때 일어났다. `ls tasks-archive`로 확인한다.
- **`TASKS.md`가 꼬였다**: `./scripts/reset.sh`.

---

## 실습 09 — 안 될 때 확인하고 마치기

**하는 일** 목록 · 상태줄 · pane이 같은 작업을 보여 주는지 확인한다. 안 될 때 볼 곳을 익히고, 필요하면 plugin을 끈다.

**명령** 점검한다. 세션에서 명령이 안 보이면 `/plugin`으로 활성 여부를 보고 `/reload-plugins`를 입력한다.

```bash
./scripts/verify.sh
```

(claude 세션 안에서)

```text
/plugin
/reload-plugins
```

끄려면 다음을 실행한다. 이 폴더의 tasks · productivity만 제거하고 작업 파일은 남긴다.

```bash
./scripts/uninstall.sh
```

**기대 결과** 처음엔 `제거함`, 다시 실행하면 `이미 제거됨`이다(둘 다 정상). 제거 뒤에는 새 세션이나 `/reload-plugins`가 필요하다.

```text
  ✔ tasks@workshop-mods 제거함
  ✔ productivity@knowledge-work-plugins 제거함
    → TASKS.md · tasks-archive/ · docs/ 는 그대로 남아 있습니다
    → 열린 세션은 /reload-plugins 또는 새 세션으로 반영하세요

→ 다음에 할 일: 다시 쓰려면 ./scripts/setup.sh
```

```text
  ✔ tasks@workshop-mods 이미 제거됨
  ✔ productivity@knowledge-work-plugins 이미 제거됨
    → TASKS.md · tasks-archive/ · docs/ 는 그대로 남아 있습니다
    → 열린 세션은 /reload-plugins 또는 새 세션으로 반영하세요

→ 다음에 할 일: 다시 쓰려면 ./scripts/setup.sh
```

**안 되면** 아래 [문제 해결](#문제-해결) 표를 본다.

---

## 문제 해결

| 증상 | 확인 | 해결 |
|------|------|------|
| `/tasks-pane` 명령이 없다 | 세션에서 `/plugin`으로 tasks 활성 여부 | `/reload-plugins`, 안 되면 `./scripts/install-mod.sh` 후 새 세션 |
| 상태줄 · pane에 목록이 없다 | 이 폴더의 `TASKS.md`와 섹션 4개 | `./scripts/verify.sh`. 섹션이 깨졌으면 `./scripts/reset.sh` |
| 상태줄이 `⚠ tasks:`로 시작한다 | 뒤의 요약이 `TASKS.md`와 맞는가 | 맞으면 정상(표시 형태) |
| pane 폭이 안 바뀐다 | 폭 인자(`/tasks-pane 100`)를 붙였는가 | `Esc`로 닫고 숫자를 붙여 다시 입력한다. 그래도 그대로면 메모만 잘릴 뿐 제목과 상태는 보이니 진행한다 |
| 숫자 키가 안 먹는다 | 그 사이에 글자를 입력했는가(입력창이 포커스를 가져간다) | 입력창을 비우고 `/tasks-pane`을 두 번 입력해 닫았다 다시 연다(열 때 포커스가 pane으로 간다) |
| add 도중 에러 한 줄 | `section은 Active · Waiting On · Someday 중 하나여야 한다` | 모델이 다시 호출해 성공했으면 정상 |
| 완료가 거절된다 | 제목 · 메모에 맞는 열린 항목이 1건인가 | 정확한 제목으로 요청 |
| 모델이 목록을 안 바꿨다 | `TASKS.md`를 직접 확인 | pane 완료 키 또는 정확한 제목을 넣은 요청 |
| 갱신 요청 뒤 모델의 두 번째 답이 안 나온다 | 이미 갱신했거나 작업 파일 변경이 감지되지 않았을 수 있다 | 실습 08 (A)의 Bash 프롬프트로 다시 |
| `verify.sh`에서 `✖` | 항목 아래 `→` 안내 | `./scripts/install-mod.sh` 다시 실행 |
| productivity 설치가 `✖` | 네트워크 · GitHub · 조직 정책 | 접속 문제를 푼 뒤 `./scripts/setup.sh` (실습 03에 필요) |
| 실습 03 뒤에도 `memory/`가 없다 | `CLAUDE.md`가 이미 있어 skill이 초기화를 건너뛴 것 | 실습 03의 프롬프트로 memory 초기화를 직접 지시 |

## 정리 · 재실습

| 하려는 것 | 명령 | 하는 일 |
|-----------|------|---------|
| 처음부터 다시 | `./scripts/reset.sh` | `TASKS.md` · `CLAUDE.md`를 처음 상태로 복원, `tasks-archive/` · `docs/access-policy.md` · `memory/` · `dashboard.html` 삭제 |
| 끄기 | `./scripts/uninstall.sh` | 이 폴더의 tasks · productivity 제거 (작업 파일은 남김) |
| 다시 켜기 | `./scripts/setup.sh` | 설치 · 검증 (재실행해도 안전) |

```text
  ✔ TASKS.md 를 처음 상태로 복원
  ✔ CLAUDE.md 를 처음 상태로 복원
  ✔ tasks-archive/ 삭제 (파일 1개)
  ✔ docs/access-policy.md 삭제
  ✔ memory/ 삭제
  ✔ dashboard.html 삭제

→ 다음에 할 일: claude 로 새 세션을 열어 RUNBOOK 의 실습 03 부터 다시
```

- `reset.sh`는 `memory/` · `dashboard.html`(실습 03이 만든 것)도 지운다. 남겨 두면 skill이 "이미 초기화됨"으로 보고 memory를 다시 만들지 않는다.
- `uninstall.sh`는 plugin만 제거한다. `workshop-mods` marketplace 등록은 사용자 전역에 1건(이름 → 이 키트의 `mods` 경로) 남는다. 해롭지 않다.
- 이 폴더의 `.claude/settings.json`에는 `tui: fullscreen`과 marketplace 선언이 남는다.
  - 지우려면 그 파일(또는 `.claude/`)을 삭제한다. `setup.sh`가 다시 만든다.
- 등록까지 지우려면 `claude plugin marketplace remove workshop-mods --scope project`를 쓴다.
  - 같은 marketplace로 다른 폴더에 설치한 mod도 함께 제거된다.
- `knowledge-work-plugins`는 지우지 않는다. 전역 productivity까지 지워질 수 있다.
