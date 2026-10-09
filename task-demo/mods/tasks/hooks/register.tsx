import type { EngineInterface, Register, Timer } from 'claude-code'

import { addItem, contextOf, markDone, openItemsMatching, parse, summaryOf, takeDone } from './tasks-md'

const FILE = 'TASKS.md'
// session이 끝날 때 Done을 옮겨 두는 곳. project root 기준.
const ARCHIVE_DIR = 'tasks-archive'
// pane에 보이는 Done 건수. 나머지는 파일에만 있다.
const DONE_SHOWN = 5
const PANE = 'tasks'
const POLL_MS = 2000
const DOCK_COLUMNS = 48
// 완료 버튼을 다는 섹션. 나머지는 읽기만 한다.
const ACTIONABLE = ['Active', 'Waiting On']
const SECTIONS = ['Active', 'Waiting On', 'Someday']
const EDITING_TOOLS = ['Edit', 'Write', 'NotebookEdit'] as const
// 작업 파일이 아닌 곳 — memory · scratchpad 쓰기는 할 일 갱신 대상이 아니다.
const NOT_WORK = /\/\.claude\/|^\/(private\/)?tmp\//
// ponytail: Bash가 파일을 바꿨는지 명령 문자열로 짐작한다. 놓치거나 잘못 잡으면 패턴을 고친다.
const BASH_WRITES = /(^|[^0-9&])>(?!&)|\btee\b|\bsed -i|\b(mv|cp|rm|mkdir|touch)\b|\bpython3? -|\bgit (commit|add)\b/
const STOP_REASON =
  '이번 턴에 파일을 바꿨는데 TASKS.md는 그대로다. 작업 상태가 바뀌었으면 mcp__tasks__add · mcp__tasks__complete로 반영하고, 반영할 게 없으면 그 이유를 한 줄로 말하고 끝낸다.'

// 한 session에 pane 하나라 상태도 하나다.
const state = {
  md: '',
  mtimeMs: -1,
  error: '',
  poll: null as Timer | null,
  // 턴 단위: 시작 때 TASKS.md mtime, 이번 턴에 Claude가 바꾼 작업 파일
  turnMtimeMs: -1,
  touched: new Set<string>(),
}

// $.fs의 상대경로는 cwd 기준이라 Bash `cd`에 끌려간다 — shell cd로 안 바뀌는 project root에 붙인다.
async function pathOf($: EngineInterface) {
  return `${await $.session.root()}/${FILE}`
}

// 읽기→수정→쓰기를 한 번에 하나씩 돌린다 — 병렬 tool 호출 · pane 버튼이 서로의 변경을 덮어쓰지 않게.
// 진입점(add · complete · pane 버튼 · 보관)에서만 감싼다. 안에서 다시 감싸면 서로를 기다리며 멈춘다.
let queue: Promise<unknown> = Promise.resolve()

function serial<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job)
  queue = run.catch(() => {})
  return run
}

// $는 이 파일 최상위 함수에만 넘길 수 있다(engine 규칙).
async function reload($: EngineInterface) {
  try {
    const path = await pathOf($)
    const stat = await $.fs.stat(path)

    // 오류가 남아 있으면 mtime이 같아도 다시 읽어 푼다.
    if (stat.mtimeMs !== state.mtimeMs || state.error) {
      state.md = await $.fs.read(path)
      state.mtimeMs = stat.mtimeMs
      state.error = ''
      $.ui.status(summaryOf(state.md))
      $.ui.invalidate('ui.render')
    }
  } catch (e) {
    state.error = `${FILE}을 읽지 못했다: ${String(e)}`
    $.ui.status(undefined)
    $.ui.invalidate('ui.render')
  }
}

// 큐 밖(poll · hook)의 reload도 같은 큐에 태운다 — 늦게 돌아온 읽기가 큐 안의 변경을 되돌리지 못하게. 큐 안에서는 reload를 그대로 쓴다.
function refresh($: EngineInterface) {
  return serial(() => reload($))
}

async function save($: EngineInterface, md: string) {
  await $.fs.write(await pathOf($), md)
  state.mtimeMs = -1 // 쓰기가 mtime을 안 바꾸는 파일시스템에서도 reload가 새 내용을 읽게 한다
  await reload($)
}

function today(): string {
  return new Date().toLocaleDateString('sv-SE') // YYYY-MM-DD, 로컬 시간대
}

// yyyyMMddHHmm, 로컬 시간대
function minuteStamp(): string {
  return new Date().toLocaleString('sv-SE').replace(/\D/g, '').slice(0, 12)
}

// Done을 `tasks-archive/{yyyyMMddHHmm}-{sessionId}-TASKS.md`로 옮긴다. 보관 파일을 먼저 쓰고 TASKS.md를 줄인다.
async function archiveDone($: EngineInterface, sessionId: string) {
  await reload($)
  const { md, done } = takeDone(state.md)

  if (state.error || done.length === 0) {
    return
  }
  const path = `${await $.session.root()}/${ARCHIVE_DIR}/${minuteStamp()}-${sessionId}-${FILE}`
  // 같은 분에 같은 session이 다시 끝나면 먼저 보관한 Done 뒤에 잇는다(덮어쓰면 유실된다).
  const head = (await $.fs.exists(path)) ? await $.fs.read(path) : '## Done\n'
  await $.fs.write(path, head + [...done, ''].join('\n'))
  await save($, md)
}

// pane 완료 버튼 — 그려진 뒤 파일이 바뀌었을 수 있어 다시 읽고, 그 줄에 같은 할 일이 열려 있을 때만 옮긴다.
async function completeAt($: EngineInterface, line: number, text: string) {
  try {
    await serial(async () => {
      await reload($)
      const item = parse(state.md).flatMap(section => section.items).find(i => i.line === line)

      if (!state.error && item && !item.isDone && item.text === text) {
        await save($, markDone(state.md, line, today()))
      }
    })
  } catch (e) {
    state.error = `${FILE}을 쓰지 못했다: ${String(e)}`
    $.ui.invalidate('ui.render')
  }
}

// session.start에서 만든 timer는 실제 터미널에서 돌지 않았다 — 이후 hook에서 처음 한 번 만든다.
function startPoll($: EngineInterface) {
  state.poll ??= $.clock.every(POLL_MS, () => void refresh($))
}

/**
 * TASKS.md를 세 가지로 다룬다.
 * - 보기: 상태줄 한 줄 요약(항상), `/tasks-pane [폭]` pane(fullscreen이면 우측 도킹, 아니면 prompt 위)
 * - 갱신: 모델용 tool `mcp__tasks__add` · `mcp__tasks__complete`, pane의 숫자 hotkey 완료 버튼
 * - 강제: 매 턴 열린 할 일을 context로 넘기고, 파일을 바꾼 턴에 TASKS.md가 그대로면 종료를 한 번 막는다
 */
export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'tasks-pane',
      description: 'TASKS.md 할 일 pane 열기 · 닫기 (fullscreen에서 우측 도킹)',
      argumentHint: '[폭]',
    })
    await $.tool.register({
      name: 'add',
      description: 'TASKS.md의 섹션 맨 위에 할 일을 추가한다.',
      inputSchema: {
        type: 'object',
        properties: {
          section: { type: 'string', enum: SECTIONS },
          title: { type: 'string' },
          note: { type: 'string', description: '근거 · 조건 · 기한 등 한 줄' },
        },
        required: ['section', 'title'],
      },
    })
    await $.tool.register({
      name: 'complete',
      description: 'TASKS.md에서 제목 · 메모에 query가 들어간 열린 할 일 1건을 완료 처리해 Done으로 옮긴다.',
      inputSchema: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
    })
    await refresh($)
    return next(e)
  })

  // exit · /clear · resume 모두 여기로 온다(/clear 뒤에는 session.start가 없다). kill -9는 다음 session 끝에 함께 옮겨진다.
  on('session.end', async ($, e, next) => {
    await serial(() => archiveDone($, e.sessionId))
    return next(e)
  })

  // H1': 매 턴 열린 할 일을 모델에게 넘기고, 턴 기록을 새로 시작한다.
  on('classic.UserPromptSubmit', async ($, e, next) => {
    startPoll($)
    await refresh($)
    state.turnMtimeMs = state.mtimeMs
    state.touched.clear()

    const result = await next(e)
    return { ...result, additionalContext: [...(result.additionalContext ?? []), contextOf(state.md)] }
  })

  // H2' (기록): 이번 턴에 Claude가 바꾼 작업 파일
  on('tool.call', { tool: EDITING_TOOLS }, async ($, e, next) => {
    const result = await next(e)
    // tool 인자는 e에 바로 펼쳐져 온다(e.file_path).
    const path = e.tool === 'NotebookEdit' ? e.notebook_path : e.file_path
    // 거절됐거나 실패한 편집은 파일을 바꾸지 않았다.
    const isApplied = result.deny === undefined && !result.isError

    if (isApplied && path && path !== (await pathOf($)) && !NOT_WORK.test(path)) {
      state.touched.add(path)
    }
    return result
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const result = await next(e)
    if (result.deny === undefined && BASH_WRITES.test(e.command)) {
      state.touched.add(`Bash: ${e.command.slice(0, 60)}`)
    }
    return result
  })

  // H2' (강제): 파일을 바꿨는데 TASKS.md가 그대로면 한 번 막는다.
  on('classic.Stop', async ($, e, next) => {
    const result = await next(e)

    if (e.stop_hook_active || state.touched.size === 0) {
      return result
    }

    await refresh($)
    return state.mtimeMs === state.turnMtimeMs ? { ...result, block: STOP_REASON } : result
  })

  on('tool.call', { tool: 'mcp__tasks__add' }, ($, e, next) => serial(async () => {
    const input = e as unknown as { section: string; title: string; note?: string }

    if (!SECTIONS.includes(input.section)) {
      return { deny: `section은 ${SECTIONS.join(' · ')} 중 하나여야 한다` }
    }
    if (typeof input.title !== 'string' || !input.title.trim()) {
      return { deny: 'title이 비었다' }
    }
    if (input.note !== undefined && typeof input.note !== 'string') {
      return { deny: 'note는 문자열이어야 한다' }
    }
    await reload($)
    if (state.error) {
      return { deny: state.error }
    }
    const md = addItem(state.md, input.section, input.title, input.note)

    if (md === state.md) {
      return { deny: `TASKS.md에 "## ${input.section}" 섹션이 없다` }
    }
    await save($, md)
    return { result: `${input.section}에 추가했다: ${input.title}` }
  }))

  on('tool.call', { tool: 'mcp__tasks__complete' }, ($, e, next) => serial(async () => {
    const { query } = e as unknown as { query: string }

    if (typeof query !== 'string' || !query.trim()) {
      return { deny: 'query가 비었다. 완료할 할 일을 찾을 글자를 넣는다.' }
    }
    await reload($)
    if (state.error) {
      return { deny: state.error }
    }
    const matches = openItemsMatching(state.md, query)

    if (matches.length !== 1) {
      const found = matches.map(item => `- ${item.text}`).join('\n')
      return { deny: `"${query}"에 맞는 열린 할 일이 ${matches.length}건이다. 1건만 맞게 query를 좁힌다.\n${found}` }
    }
    await save($, markDone(state.md, matches[0]!.line, today()))
    return { result: `완료 처리했다: ${matches[0]!.text}` }
  }))

  on('command.run', { command: 'tasks-pane' }, async ($, e, next) => {
    const isOpen = (await $.ui.panes()).some(pane => pane.id === PANE)

    if (isOpen && !e.args.trim()) {
      await $.ui.close({ id: PANE })
      return { text: 'tasks pane을 닫았다' }
    }

    startPoll($)
    await refresh($)
    // columns는 fullscreen에서 우측 도킹될 때의 폭 요청이다. 사람이 끌어서 바꾼 폭이 우선한다.
    await $.ui.open({
      id: PANE,
      title: 'Tasks',
      focus: true,
      closeOnEscape: true,
      columns: Number(e.args) > 0 ? Number(e.args) : DOCK_COLUMNS,
    })
    return e.presentation.isFullscreen
      ? {}
      : { text: '일반 화면이라 prompt 위에 열었다. 우측 도킹은 fullscreen 레이아웃 · 110 columns 이상에서만 된다.' }
  })

  on('ui.render', { component: 'Pane' }, async ($, e, next) => {
    if (e.requestId !== PANE) {
      return next(e)
    }

    const { Box, Text, Button } = await $.ui.resolve(e)

    if (state.error) {
      return <Text color="red">{state.error}</Text>
    }

    let hotkey = 0

    return (
      <Box flexDirection="column">
        {parse(state.md).map(section => (
          <Box key={section.name} flexDirection="column" marginBottom={1}>
            <Text bold>
              {section.name} ({section.items.filter(i => !i.isDone).length})
            </Text>
            {(section.name === 'Done' ? section.items.slice(0, DONE_SHOWN) : section.items).map(item => {
              const canComplete =
                !item.isDone && ACTIONABLE.includes(section.name) && hotkey < 9

              return (
                <Box key={`l${item.line}`} gap={1}>
                  {canComplete ? (
                    <Button
                      key={`done:${item.line}`}
                      label="완료"
                      hotkey={String(++hotkey)}
                      plain
                      onPress={() => completeAt($, item.line, item.text)}
                    />
                  ) : (
                    <Text dimColor>{item.isDone ? '✓' : '·'}</Text>
                  )}
                  <Text dimColor={item.isDone} strikethrough={item.isDone} wrap="truncate-end">
                    {item.text}
                  </Text>
                </Box>
              )
            })}
          </Box>
        ))}
      </Box>
    )
  })
}
