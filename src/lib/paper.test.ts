import { describe, expect, it } from 'vitest'
import { epigraphLine, issueNumber, worldGlance } from './paper'
import type { BriefItem } from './brief'
import type { Task } from '../db/types'

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

/* ================= the worlds-band glance ================= */

const TODAY = '2026-07-29'
let n = 0
const task = (over: Partial<Task>): Task => ({
  id: `t${++n}`,
  project_id: 'w1',
  goal_id: null,
  recurring_id: null,
  title: `task ${n}`,
  notes: null,
  done_at: null,
  touched_at: '2026-07-20T10:00:00.000Z',
  anchored_on: null,
  delegated_to: null,
  chase_on: null,
  delegated_on: null,
  source_entry_id: null,
  source_excerpt: null,
  materialized_on: null,
  created_at: '2026-07-20T10:00:00.000Z',
  deleted_at: null,
  position: null,
  ...over,
})

describe('the worlds-band glance — honest, muted, guilt-free', () => {
  it('settled: no open loops standing', () => {
    const done = task({ done_at: '2026-07-28T15:00:00.000Z' })
    const g = worldGlance('w1', [done], [], [], TODAY)
    expect(g.status).toBe('settled')
    expect(g.week).toBe('1 finished · 0 open')
  })
  it('moving: open loops with recent activity', () => {
    const open = task({ created_at: '2026-07-28T09:00:00.000Z' })
    const g = worldGlance('w1', [open], [], [], TODAY)
    expect(g.status).toBe('moving')
  })
  it('quiet N days: the word carries it — no recolor, no scold', () => {
    const open = task({ created_at: '2026-07-20T09:00:00.000Z' })
    const g = worldGlance(
      'w1',
      [open],
      [{ project_id: 'w1', entry_day: '2026-07-23' }],
      [],
      TODAY,
    )
    expect(g.status).toBe('quiet 6 days')
  })
  it('NEXT is the top standing item; OWED names the chase', () => {
    const standing = task({ anchored_on: TODAY, title: 'Chase Karthik — HXD scope' })
    const owed = task({ delegated_to: 'Manish', chase_on: '2026-08-01' })
    const g = worldGlance('w1', [standing, owed], [], [standing], TODAY)
    expect(g.next).toBe('Chase Karthik — HXD scope')
    expect(g.owed).toBe('Manish · chase Aug 1')
  })
})
