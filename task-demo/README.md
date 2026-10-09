# task-demo — tasks mod 실습 키트

**tasks mod**(Claude Code 안에서 도는 plugin)를 직접 설치하고 써 보는 실습 폴더다. `TASKS.md` 한 파일을 상태줄 · pane · tool로 다룬다.

## 준비물

- Claude Code **2.1.287 이상**, 로그인 완료 (`claude auth login`)
- macOS 또는 Linux (Windows는 WSL 안에서)
- python3
- 터미널 폭 **110칸 이상** 권장 (`/tasks-pane`이 우측에 도킹되는 폭)
- productivity 설치(실습 02)에는 GitHub 접근이 필요하다

## 3줄로 시작

```bash
cd task-demo
./scripts/setup.sh    # 환경 점검 → 설치 → 검증 (다시 실행해도 안전)
claude                # 이 폴더에서 세션 시작
```

- `Permission denied`: 압축을 풀며 실행 권한이 빠진 것이다. `chmod +x scripts/*.sh`를 한 번 실행한다.
- 처음 여는 폴더라 `claude`가 신뢰 여부를 묻는다(`Quick safety check`).
  - 기본 선택이 `No, exit`일 수 있다.
  - 방향키로 `Yes, I trust this folder`를 골라 Enter를 누른다.

세션 안에서 입력한다.

```text
/tasks-pane
```

## 폴더 설명

```text
task-demo/
├── RUNBOOK.md        실습 01~09 따라 하기 (여기서 시작)
├── TASKS.md          실습용 시작 데이터
├── CLAUDE.md         세션이 읽는 실습 안내
├── mods/             tasks mod — hooks · tests · manifest
├── scripts/          setup · check-env · install-mod · verify · reset · uninstall
└── templates/        TASKS.initial.md · CLAUDE.initial.md — reset.sh가 복원하는 원본
```

설치와 실습이 만드는 `.claude/` · `tasks-archive/` · `docs/access-policy.md`는 `.gitignore`에 들어 있다.

## 스크립트

| 명령 | 하는 일 |
|------|---------|
| `./scripts/setup.sh` | 환경 점검 → productivity → mod 검증 → mod 설치 → 최종 점검 |
| `./scripts/check-env.sh` | 환경 점검만 |
| `./scripts/install-mod.sh [폴더]` | tasks mod만 설치 (기본: 이 폴더) |
| `./scripts/verify.sh [폴더]` | 설치 상태 점검, `✖`가 있으면 종료코드 1 |
| `./scripts/reset.sh` | `TASKS.md` · `CLAUDE.md`를 처음 상태로, 실습이 만든 파일(`memory/` · `dashboard.html` 포함) 삭제 |
| `./scripts/uninstall.sh` | 이 폴더의 plugin 제거 (작업 파일은 남김) |

## 다음

[RUNBOOK.md](RUNBOOK.md)의 실습 01부터 따라 한다. 막히면 RUNBOOK 맨 아래 문제 해결 표를 본다.

알아 둘 점

- mod는 **사용자 권한으로 실행**된다. 실행 전에 `mods/` 소스를 읽는다.
- `setup.sh`는 이 폴더에 `.claude/settings.json`을 만든다.
- 사용자 전역(`~/.claude/plugins`)에 marketplace 등록이 남는다.
  - `workshop-mods`와 `knowledge-work-plugins`.
  - `uninstall.sh` 뒤에도 일부가 남는다.
- 되돌리는 방법은 RUNBOOK 맨 아래 '정리 · 재실습'.
