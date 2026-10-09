# task-management-workshop

Claude Code의 **tasks mod**(상태줄 · pane · tool)로 `TASKS.md` 한 파일의 할 일을 다루는 실습 자료다.

## 시작하기

```bash
cd task-demo
./scripts/setup.sh
claude
```

세션 안에서 `/tasks-pane`을 입력한다. 전체 순서는 [RUNBOOK.md](task-demo/RUNBOOK.md)(실습 01~09).

## 요구 환경

- Claude Code **2.1.287 이상**, 로그인 완료
- macOS 또는 Linux (Windows는 WSL 안에서)
- python3
- 터미널 폭 110칸 이상 권장 (pane 우측 도킹)
- productivity 설치(실습 02)에는 GitHub 접근이 필요하다

## 설치가 남기는 것

- 이 폴더: `.claude/settings.json`
- 사용자 전역: marketplace 등록 `workshop-mods` 1건
- 되돌리는 방법: RUNBOOK 맨 아래 '정리 · 재실습'
