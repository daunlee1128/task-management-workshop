import type { On } from 'claude-code'
import { describe, expect, mock, test, tier } from 'claude-code/testing'

tier('user')

const SESSION = { surface: 'terminal', isInteractive: true, cwd: '/work' } as const
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * 엔진 아래(파일 · UI · 등록)를 메모리로 답한다. `file`을 바꾸면 TASKS.md가 바뀐 것이다.
 */
function worldOf(on: On) {
  // lagMs: 읽기 · 쓰기가 늦어지는 만큼, failStat · failRead · failWrite: TASKS.md 접근 실패,
  // keepMtime: 쓰기가 mtime을 올리지 않는다, hold: 다음 읽기 하나가 이게 풀릴 때까지 돌아오지 않는다
  const file = {
    text: '## Active\n- [ ] **A**\n- [ ] **B 작업**\n\n## Done\n',
    mtimeMs: 1,
    lagMs: 0,
    failStat: false,
    failRead: false,
    failWrite: false,
    keepMtime: false,
    hold: null as Promise<void> | null,
  }
  const seen = { invalidated: 0, writes: {} as Record<string, string> }

  const clock = mock.clock(on)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.end', ($, e) => ({ sessionId: e.sessionId }))
  on('session.root', () => ({ value: '/work' }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('tool.register', ($, e) => ({ value: { tool: `mcp__tasks__${e.name}` } }))
  on('command.run', () => ({ text: '' }))
  on('ui.panes', () => ({ value: [] }))
  on('ui.open', () => ({ value: undefined }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.invalidate', () => {
    seen.invalidated++
    return { value: undefined }
  })
  on('fs.stat', () => {
    if (file.failStat) {
      throw new Error('EIO')
    }
    return { value: { kind: 'file', size: 1, mtimeMs: file.mtimeMs, isLink: false } }
  })
  on('fs.exists', ($, e) => ({ value: e.path in seen.writes }))
  on('fs.read', async ($, e) => {
    if (file.failRead && e.path === '/work/TASKS.md') {
      throw new Error('EIO')
    }
    const text = e.path === '/work/TASKS.md' ? file.text : seen.writes[e.path]!
    const hold = file.hold

    file.hold = null
    await hold
    if (file.lagMs) {
      await sleep(file.lagMs)
    }
    return { value: text }
  })
  on('fs.write', async ($, e) => {
    if (file.lagMs) {
      await sleep(file.lagMs)
    }
    if (e.path !== '/work/TASKS.md') {
      seen.writes[e.path] = e.text
      return { value: undefined }
    }
    if (file.failWrite) {
      throw new Error('EACCES')
    }
    file.text = e.text
    if (!file.keepMtime) {
      file.mtimeMs++
    }
    return { value: undefined }
  })

  return { file, seen, clock }
}

describe('register', () => {
  test('pane을 연 채로 TASKS.md가 바뀌면 2초 안에 다시 그리게 한다', async ($, on) => {
    const { file, seen, clock } = worldOf(on)

    await $.session.start(SESSION)
    await $.command.run({
      command: 'tasks-pane',
      args: '',
      origin: { kind: 'composer' },
      presentation: { isFullscreen: true, columns: 160 },
    })
    const before = seen.invalidated

    file.text += '- [ ] C\n'
    file.mtimeMs = 99
    await clock.advance(2000)

    expect(seen.invalidated).toBeGreaterThan(before)
  })

  test('파일을 바꾼 턴에 TASKS.md가 그대로면 종료를 한 번 막고, 두 번째는 통과시킨다', async ($, on) => {
    worldOf(on)
    on('classic.UserPromptSubmit', () => ({}))
    on('classic.Stop', () => ({}))
    on('tool.call', () => ({ result: 'ok' }))
    const base = { session_id: 's', transcript_path: '/t', cwd: '/work' }

    // test kit의 Engine type에는 classic이 없지만 실제로는 있다.
    const { classic } = $ as unknown as {
      classic: Record<'UserPromptSubmit' | 'Stop', (e: unknown) => Promise<{ block?: string; additionalContext?: string[] }>>
    }

    await $.session.start(SESSION)
    const submitted = await classic.UserPromptSubmit({ ...base, hook_event_name: 'UserPromptSubmit', prompt: 'x' })
    expect(submitted.additionalContext?.join('')).toContain('B 작업')

    await $.tool.call({ tool: 'Edit', file_path: '/work/a.ts', old_string: 'a', new_string: 'b' })
    const first = await classic.Stop({ ...base, hook_event_name: 'Stop', stop_hook_active: false })
    const second = await classic.Stop({ ...base, hook_event_name: 'Stop', stop_hook_active: true })

    expect(first.block).toContain('TASKS.md는 그대로다')
    expect(second.block).toBeUndefined()
  })

  test('complete tool은 1건만 맞을 때 완료 처리하고, 여러 건이면 거절한다', async ($, on) => {
    const { file } = worldOf(on)
    file.text = '## Active\n- [ ] **A**\n- [ ] **B 작업**\n- [ ] **B 후속**\n\n## Done\n'
    await $.session.start(SESSION)

    const ambiguous = await $.tool.call({ tool: 'mcp__tasks__complete', query: 'B' } as never)
    const done = await $.tool.call({ tool: 'mcp__tasks__complete', query: 'B 작업' } as never)

    expect(ambiguous.deny).toContain('2건')
    expect(done.deny).toBeUndefined()
    expect(file.text).toContain('## Done\n- [x] ~~**B 작업**~~')
  })

  test('complete tool은 빈 query로는 아무것도 완료하지 않는다', async ($, on) => {
    const { file } = worldOf(on)
    file.text = '## Active\n- [ ] **only**\n\n## Done\n'
    await $.session.start(SESSION)

    for (const query of ['', '  ', undefined]) {
      const denied = await $.tool.call({ tool: 'mcp__tasks__complete', query } as never)
      expect(denied.deny).toContain('query가 비었다')
    }
    expect(file.text).toBe('## Active\n- [ ] **only**\n\n## Done\n')
  })

  test('add tool은 섹션 맨 위에 넣고, section · title이 잘못되면 거절한다', async ($, on) => {
    const { file } = worldOf(on)
    await $.session.start(SESSION)

    const added = await $.tool.call({ tool: 'mcp__tasks__add', section: 'Active', title: 'N', note: '메모' } as never)
    expect(added.deny).toBeUndefined()
    expect(file.text).toContain('## Active\n- [ ] **N** - 메모\n- [ ] **A**')

    const before = file.text
    const bad = [{ section: 'Done', title: 'x' }, {}, { section: 'Active', title: '  ' }, { section: 'Active' }, { section: 'Active', title: 'x', note: 42 }]
    for (const input of bad) {
      const denied = await $.tool.call({ tool: 'mcp__tasks__add', ...input } as never)
      expect(denied.deny).toBeDefined()
    }
    expect(file.text).toBe(before)
  })

  test('병렬로 온 add · complete가 서로의 변경을 덮어쓰지 않는다', async ($, on) => {
    const { file } = worldOf(on)
    file.lagMs = 5
    await $.session.start(SESSION)

    await Promise.all([
      $.tool.call({ tool: 'mcp__tasks__add', section: 'Active', title: 'T1' } as never),
      $.tool.call({ tool: 'mcp__tasks__add', section: 'Active', title: 'T2' } as never),
      $.tool.call({ tool: 'mcp__tasks__complete', query: 'B 작업' } as never),
    ])

    expect(file.text).toContain('**T1**')
    expect(file.text).toContain('**T2**')
    expect(file.text).toContain('~~**B 작업**~~')

    // 쓰기가 mtime을 올리지 않는 파일시스템에서도 save 뒤 읽기가 새 내용을 보게 한다
    file.keepMtime = true
    await Promise.all([
      $.tool.call({ tool: 'mcp__tasks__add', section: 'Active', title: 'T3' } as never),
      $.tool.call({ tool: 'mcp__tasks__add', section: 'Active', title: 'T4' } as never),
    ])

    expect(file.text).toContain('**T3**')
    expect(file.text).toContain('**T4**')
  })

  test('poll의 읽기가 끝나기 전에는 add가 쓰지 않아, 늦게 돌아온 읽기가 앞선 추가를 되돌리지 못한다', async ($, on) => {
    const { file, clock } = worldOf(on)
    await $.session.start(SESSION)
    await $.command.run({
      command: 'tasks-pane',
      args: '',
      origin: { kind: 'composer' },
      presentation: { isFullscreen: true, columns: 160 },
    })

    // 밖에서 한 줄이 생겼고, 그걸 읽는 poll의 읽기가 늦게 돌아온다.
    let release = () => {}
    file.hold = new Promise<void>(resolve => (release = resolve))
    file.text = file.text.replace('## Active\n', '## Active\n- [ ] **밖에서 추가**\n')
    file.mtimeMs = 99
    await clock.advance(2000)

    const adds = Promise.all([
      $.tool.call({ tool: 'mcp__tasks__add', section: 'Active', title: 'T1' } as never),
      $.tool.call({ tool: 'mcp__tasks__add', section: 'Active', title: 'T2' } as never),
    ])
    await sleep(20)
    expect(file.text).not.toContain('**T1**')

    release()
    await adds
    for (const title of ['밖에서 추가', 'T1', 'T2']) {
      expect(file.text).toContain(`**${title}**`)
    }
  })

  test('TASKS.md를 읽지 못하면 add · complete를 거절하고, 파일이 돌아오면 mtime이 같아도 다시 한다', async ($, on) => {
    const { file, seen } = worldOf(on)
    const add = (title: string) => $.tool.call({ tool: 'mcp__tasks__add', section: 'Active', title } as never)
    const complete = () => $.tool.call({ tool: 'mcp__tasks__complete', query: 'B 작업' } as never)
    file.text += '- [x] ~~**Z**~~ (2026-09-23)\n'
    await $.session.start(SESSION)

    // stat이 실패한 뒤 mtime은 그대로다
    file.failStat = true
    const untouched = file.text
    expect((await add('N')).deny).toContain('읽지 못했다')
    expect((await complete()).deny).toContain('읽지 못했다')
    expect(file.text).toBe(untouched)

    file.failStat = false
    expect((await add('N')).deny).toBeUndefined()
    expect(file.text).toContain('**N**')

    // read가 실패한다
    file.failRead = true
    file.mtimeMs = 99
    const kept = file.text
    expect((await add('M')).deny).toContain('읽지 못했다')
    expect((await complete()).deny).toContain('읽지 못했다')
    // session 끝의 보관도 읽지 못했으면 묵은 내용으로 덮어쓰지 않는다
    await $.session.end({ reason: 'prompt_input_exit', sessionId: 'sid', resume: { id: 'sid' } })
    expect(seen.writes).toEqual({})
    expect(file.text).toBe(kept)

    file.failRead = false
    expect((await complete()).deny).toBeUndefined()
    expect(file.text).toContain('~~**B 작업**~~')
  })

  test('session이 끝나면 Done을 tasks-archive로 옮기고, Done이 비었으면 파일을 만들지 않는다', async ($, on) => {
    const { file, seen } = worldOf(on)
    file.text += '- [x] ~~**Z**~~ (2026-09-23)\n'
    await $.session.start(SESSION)

    await $.session.end({ reason: 'clear', sessionId: 'sid', resume: { id: 'sid' } })
    await $.session.end({ reason: 'prompt_input_exit', sessionId: 'sid2', resume: { id: 'sid2' } })

    const paths = Object.keys(seen.writes)
    expect(paths).toHaveLength(1)
    expect(paths[0]).toMatch(/^\/work\/tasks-archive\/\d{12}-sid-TASKS\.md$/)
    expect(seen.writes[paths[0]!]).toBe('## Done\n- [x] ~~**Z**~~ (2026-09-23)\n')
    expect(file.text).toBe('## Active\n- [ ] **A**\n- [ ] **B 작업**\n\n## Done\n')
  })

  test('같은 분에 같은 session이 다시 끝나도 먼저 보관한 Done을 잃지 않는다', async ($, on) => {
    const { file, seen } = worldOf(on)
    file.text += '- [x] ~~**Y**~~ (2026-09-23)\n'
    await $.session.start(SESSION)

    // 분이 바뀌는 순간에 걸치면 보관 파일이 둘이 된다 — 다음 분이 시작될 때까지 기다린다.
    while (new Date().getSeconds() >= 58) {
      await sleep(100)
    }
    await $.session.end({ reason: 'prompt_input_exit', sessionId: 'sid', resume: { id: 'sid' } })
    file.text += '- [x] ~~**Z**~~ (2026-09-24)\n'
    file.mtimeMs = 99
    await $.session.end({ reason: 'prompt_input_exit', sessionId: 'sid', resume: { id: 'sid' } })

    const paths = Object.keys(seen.writes)
    expect(paths).toHaveLength(1)
    expect(seen.writes[paths[0]!]).toBe('## Done\n- [x] ~~**Y**~~ (2026-09-23)\n- [x] ~~**Z**~~ (2026-09-24)\n')
  })

  test('거절된 편집은 변경으로 세지 않고, 작업 파일은 경로가 정확히 TASKS.md일 때만 뺀다', async ($, on) => {
    worldOf(on)
    on('classic.UserPromptSubmit', () => ({}))
    on('classic.Stop', () => ({}))
    let answer: object = { deny: 'no' }
    on('tool.call', () => answer as never)
    const base = { session_id: 's', transcript_path: '/t', cwd: '/work' }
    const { classic } = $ as unknown as {
      classic: Record<'UserPromptSubmit' | 'Stop', (e: unknown) => Promise<{ block?: string }>>
    }
    const stopAfter = async (call: object) => {
      await classic.UserPromptSubmit({ ...base, hook_event_name: 'UserPromptSubmit', prompt: 'x' })
      await $.tool.call(call as never)
      return classic.Stop({ ...base, hook_event_name: 'Stop', stop_hook_active: false })
    }
    const edit = (file_path: string) => ({ tool: 'Edit', file_path, old_string: 'a', new_string: 'b' })
    const bash = { tool: 'Bash', command: 'touch /work/x' }

    await $.session.start(SESSION)
    expect((await stopAfter(edit('/work/a.ts'))).block).toBeUndefined()
    expect((await stopAfter(bash)).block).toBeUndefined()

    // 오류는 일부 변경이 있었을 수 있어 Bash만 기록을 남긴다(편집은 거절과 같이 뺀다).
    answer = { isError: true, result: 'fail', text: 'fail' }
    expect((await stopAfter(edit('/work/a.ts'))).block).toBeUndefined()
    expect((await stopAfter(bash)).block).toContain('TASKS.md는 그대로다')

    answer = { result: 'ok' }
    expect((await stopAfter(bash)).block).toContain('TASKS.md는 그대로다')
    expect((await stopAfter(edit('/work/TASKS.md'))).block).toBeUndefined()
    for (const path of ['/work/docs/SUBTASKS.md', '/work/tasks-archive/1-TASKS.md', '/work/sub/TASKS.md']) {
      expect((await stopAfter(edit(path))).block).toContain('TASKS.md는 그대로다')
    }
  })

  test('pane 완료 버튼은 그 사이 바뀐 TASKS.md를 덮어쓰지 않고, 쓰기 실패를 pane에 보인다', async ($, on) => {
    const { file, clock } = worldOf(on)
    await $.session.start(SESSION)
    await $.command.run({
      command: 'tasks-pane',
      args: '',
      origin: { kind: 'composer' },
      presentation: { isFullscreen: true, columns: 160 },
    })
    const pane = { title: 'Tasks', isFocused: true, columns: 48, rows: 20 }
    const ui = await $.ui.mount({ plugin: 'tasks', surface: 'terminal', component: 'Pane', requestId: 'tasks', props: pane } as never)

    // 그려진 뒤 밖에서 맨 위에 한 줄이 생겼다 — 1번 줄(done:1)은 더 이상 A가 아니다.
    file.text = file.text.replace('## Active\n', '## Active\n- [ ] **밖에서 추가**\n')
    file.mtimeMs = 99
    await ui.press({ key: 'done:1' })
    expect(file.text).toContain('- [ ] **밖에서 추가**')
    expect(file.text).toContain('- [ ] **A**')

    // 다시 그리면 A는 2번 줄이다. 이번에는 쓰기가 실패한다.
    await ui.redraw()
    file.failWrite = true
    await ui.press({ key: 'done:2' })
    await ui.redraw()
    expect(await ui.find({ type: 'Text', text: /쓰지 못했다/ })).toBeDefined()

    // 파일이 다시 쓰이게 되면 다음 poll에서 오류가 풀리고, 같은 버튼이 이번에는 완료한다.
    file.failWrite = false
    await clock.advance(2000)
    await ui.redraw()

    // 읽지 못하는 동안 바뀐 파일을 묵은 내용으로 덮어쓰지 않는다.
    file.failStat = true
    file.text += '- [x] ~~**Z**~~ (2026-09-23)\n'
    file.mtimeMs = 100
    await ui.press({ key: 'done:2' })
    expect(file.text).toContain('~~**Z**~~')
    file.failStat = false

    await ui.press({ key: 'done:2' })
    expect(file.text).toContain('- [x] ~~**A**~~')
    expect(file.text).toContain('- [ ] **밖에서 추가**')
    await ui.unmount()
  })
})
