import { describe, expect, test, tier } from 'claude-code/testing'

import { addItem, markDone, openItemsMatching, parse, takeDone } from '../hooks/tasks-md'

tier('user')

const MD = [
  '# Tasks',
  '',
  '## Active',
  '- [ ] **A** - 설명',
  '- [ ] **B**',
  '',
  '## Done',
  '- [x] ~~**Z**~~ (2026-09-22)',
].join('\n')

describe('tasks-md', () => {
  test('섹션과 할 일을 읽는다', async () => {
    const sections = parse(MD)

    expect(sections.map(s => s.name)).toEqual(['Active', 'Done'])
    expect(sections[0]!.items).toEqual([
      { line: 3, isDone: false, text: 'A - 설명' },
      { line: 4, isDone: false, text: 'B' },
    ])
    expect(sections[1]!.items[0]!.isDone).toBe(true)
  })

  test('완료 처리하면 Done 맨 위로 옮긴다', async () => {
    const out = markDone(MD, 3, '2026-09-23')

    expect(out).toContain('## Done\n- [x] ~~**A** - 설명~~ (2026-09-23)\n- [x] ~~**Z**~~')
    expect(out).not.toContain('- [ ] **A**')
  })

  test('이미 완료된 줄이나 할 일이 아닌 줄은 그대로 둔다', async () => {
    expect(markDone(MD, 7, '2026-09-23')).toBe(MD)
    expect(markDone(MD, 0, '2026-09-23')).toBe(MD)
  })

  test('Done의 할 일 줄만 떼어 내고 섹션 제목은 남긴다', async () => {
    const { md, done } = takeDone(MD)

    expect(done).toEqual(['- [x] ~~**Z**~~ (2026-09-22)'])
    expect(md).toBe(MD.replace('\n- [x] ~~**Z**~~ (2026-09-22)', ''))
    expect(takeDone(md).done).toEqual([])
  })

  test('할 일은 섹션 맨 위에 넣고, 섹션이 없으면 그대로 둔다', async () => {
    expect(addItem(MD, 'Active', 'C', '메모')).toContain('## Active\n- [ ] **C** - 메모\n- [ ] **A**')
    expect(addItem(MD, 'Someday', 'C')).toBe(MD)
  })

  test('title · note의 개행은 공백으로 합쳐 섹션 구조를 바꾸지 못하게 한다', async () => {
    const out = addItem(MD, 'Active', 'X\n## Done\n', 'a\r\nb')
    const sections = parse(out)

    expect(sections.map(s => s.name)).toEqual(['Active', 'Done'])
    expect(sections[0]!.items.map(i => i.text)).toEqual(['X ## Done - a b', 'A - 설명', 'B'])
    expect(takeDone(out).done).toEqual(['- [x] ~~**Z**~~ (2026-09-22)'])
    expect(addItem(MD, 'Active', 'C', ' \r\n ')).toContain('## Active\n- [ ] **C**\n- [ ] **A**')
  })

  test('CRLF 파일도 읽고 고친다', async () => {
    const crlf = MD.replace(/\n/g, '\r\n')

    expect(parse(crlf)).toEqual(parse(MD))
    expect(markDone(crlf, 3, '2026-09-23')).toBe(markDone(MD, 3, '2026-09-23'))
    expect(addItem(crlf, 'Active', 'C', '메모')).toBe(addItem(MD, 'Active', 'C', '메모'))
    expect(takeDone(crlf)).toEqual(takeDone(MD))
    expect(markDone(crlf, 7, '2026-09-23')).toBe(crlf)
    expect(addItem(crlf, 'Someday', 'C')).toBe(crlf)
  })

  test('끝 공백이 있는 섹션 제목과 대문자 [X]도 같게 읽는다', async () => {
    const md = '## Active\n- [ ] **A**\n- [X] **B**\n\n## Done \n'

    expect(parse(md)[0]!.items.map(i => i.isDone)).toEqual([false, true])
    expect(markDone(md, 2, 'd')).toBe(md)
    expect(markDone(md, 1, 'd')).toBe('## Active\n- [X] **B**\n\n## Done \n- [x] ~~**A**~~ (d)\n')
    expect(addItem(md, 'Done', 'C')).toContain('## Done \n- [ ] **C**')
  })

  test('찾기는 열린 할 일만, 제목과 메모 모두에서 한다', async () => {
    expect(openItemsMatching(MD, '설명').map(i => i.text)).toEqual(['A - 설명'])
    expect(openItemsMatching(MD, 'Z')).toEqual([])
  })
})
