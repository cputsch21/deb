import { describe, expect, it } from 'vitest'
import { epigraphLine } from './paper'
import { issueNumber } from './paper'
import type { BriefItem } from './brief'

const item = (kind: BriefItem['kind'], title: string): BriefItem => ({
  id: title,
  kind,
  title,
  world: null,
  projectId: null,
  detail: '',
  note: null,
})

describe('the issue number — time, not performance', () => {
  it('counts days since the record began, unconditionally', () => {
    expect(issueNumber('2026-01-01', '2026-01-01')).toBe(1)
    expect(issueNumber('2026-01-01', '2026-01-31')).toBe(31)
    // pages written or not, the edition still increments — pure time
    expect(issueNumber('2026-01-01', '2026-07-29')).toBe(210)
  })
  it('a record not yet begun is edition one', () => {
    expect(issueNumber(null, '2026-07-29')).toBe(1)
  })
})

describe('the epigraph — words, not state', () => {
  it('reprints the morning goals as one line', () => {
    const items = [
      item('today', 'Test HXD in internal testing'),
      item('line', 'Chase Karthik'),
      item('today', 'home by 5:30 to play with the kids'),
    ]
    expect(epigraphLine(items)).toBe(
      'Test HXD in internal testing  ·  home by 5:30 to play with the kids',
    )
  })
  it('absence when the morning holds no written goals — never a placeholder', () => {
    expect(epigraphLine(null)).toBeNull()
    expect(epigraphLine([])).toBeNull()
    expect(epigraphLine([item('line', 'Chase Karthik')])).toBeNull()
  })
})
