/**
 * TASKS.md 형식 — `## 섹션` 아래 `- [ ] 할 일` / `- [x] ~~할 일~~ (날짜)`.
 */
export type Item = { line: number; isDone: boolean; text: string }
export type Section = { name: string; items: Item[] }

const ITEM = /^- \[([ xX])\] (.*)$/
const HEADING = /^## (.+)$/
const EOL = /\r?\n/

/**
 * 섹션과 할 일을 읽는다. 섹션 밖의 할 일과 다른 줄은 버린다.
 */
export function parse(md: string): Section[] {
  const sections: Section[] = []

  md.split(EOL).forEach((raw, line) => {
    const heading = HEADING.exec(raw)
    const item = ITEM.exec(raw)

    if (heading) {
      sections.push({ name: heading[1]!.trim(), items: [] })
    } else if (item && sections.length > 0) {
      sections.at(-1)!.items.push({
        line,
        isDone: item[1] !== ' ',
        text: item[2]!.replace(/\*\*|~~/g, ''),
      })
    }
  })

  return sections
}

/**
 * `## name` 줄의 위치 — parse처럼 제목 끝 공백은 무시한다. 없으면 -1.
 */
function sectionAt(lines: string[], name: string): number {
  return lines.findIndex(raw => HEADING.exec(raw)?.[1]!.trim() === name)
}

/**
 * `line`의 할 일을 완료로 바꿔 `## Done` 맨 위로 옮긴다. Done 섹션이 없으면 끝에 만든다.
 */
export function markDone(md: string, line: number, today: string): string {
  const lines = md.split(EOL)
  const item = ITEM.exec(lines[line] ?? '')

  if (!item || item[1] !== ' ') {
    return md
  }

  lines.splice(line, 1)

  const done = `- [x] ~~${item[2]}~~ (${today})`
  const at = sectionAt(lines, 'Done')

  if (at === -1) {
    lines.push('', '## Done', done)
  } else {
    lines.splice(at + 1, 0, done)
  }

  return lines.join('\n')
}

/**
 * `## Done`의 할 일 줄을 떼어 낸다 — 남은 md와 떼어 낸 줄.
 */
export function takeDone(md: string): { md: string; done: string[] } {
  const lines = md.split(EOL)
  const taken = new Set(
    parse(md)
      .filter(section => section.name === 'Done')
      .flatMap(section => section.items.map(item => item.line)),
  )

  return {
    md: lines.filter((_, i) => !taken.has(i)).join('\n'),
    done: lines.filter((_, i) => taken.has(i)),
  }
}

/**
 * `section` 맨 위에 `- [ ] **title** - note`를 넣는다. 섹션이 없으면 md를 그대로 돌려준다.
 */
export function addItem(md: string, section: string, title: string, note?: string): string {
  const lines = md.split(EOL)
  const at = sectionAt(lines, section)

  if (at === -1) {
    return md
  }

  // 개행이 들어가면 줄이 둘이 되어 섹션 구조가 바뀐다 — 한 줄로 합친다
  const oneLine = (text: string) => text.replace(/[\r\n]+/g, ' ').trim()
  const memo = oneLine(note ?? '')

  lines.splice(at + 1, 0, `- [ ] **${oneLine(title)}**${memo ? ` - ${memo}` : ''}`)
  return lines.join('\n')
}

/**
 * 아직 안 끝난 할 일 중 `query`를 포함하는 것.
 */
export function openItemsMatching(md: string, query: string): Item[] {
  return parse(md)
    .flatMap(section => section.items)
    .filter(item => !item.isDone && item.text.includes(query))
}

/**
 * status 한 줄 — `할 일 Active 3 · Waiting On 1`.
 */
export function summaryOf(md: string): string {
  const counts = parse(md)
    .filter(section => ['Active', 'Waiting On'].includes(section.name))
    .map(section => `${section.name} ${section.items.filter(i => !i.isDone).length}`)

  return `할 일 ${counts.join(' · ')}`
}

/**
 * 모델에게 매 턴 넘기는 Active · Waiting On의 열린 할 일.
 */
export function contextOf(md: string): string {
  const open = parse(md)
    .filter(section => ['Active', 'Waiting On'].includes(section.name))
    .map(section => [
      `## ${section.name}`,
      ...section.items.filter(i => !i.isDone).map(i => `- ${i.text}`),
    ].join('\n'))

  return [
    'TASKS.md의 열린 할 일이다. 할 일을 시작 · 끝내거나 새로 생기면 mcp__tasks__add · mcp__tasks__complete로 반영한다(TASKS.md를 직접 편집하지 않는다).',
    ...open,
  ].join('\n\n')
}
