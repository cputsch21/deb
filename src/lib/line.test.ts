import { describe, expect, it } from 'vitest'
import { addDays, applyDebOrder, dealStack, deriveLine, STALE_AFTER_DAYS } from './line'
import type { Task } from '../db/types'

const TODAY = '2026-07-24'

let n = 0
const task = (over: Partial<Task>): Task => ({
  id: `t${++n}`,
  project_id: null,
  goal_id: null,
  recurring_id: null,
  title: `task ${n}`,
  done_at: null,
  touched_at: '2026-07-20T10:00:00.000Z',
  anchored_on: null,
  delegated_to: null,
  chase_on: null,
  source_entry_id: null,
  materialized_on: null,
  created_at: '2026-07-20T10:00:00.000Z',
  deleted_at: null,
  ...over,
})

describe('the one queue', () => {
  it('deals fresh loops to the stack, oldest first', () => {
    const older = task({ created_at: '2026-07-10T08:00:00.000Z' })
    const newer = task({ created_at: '2026-07-22T08:00:00.000Z' })
    const dealt = dealStack([newer, older], null, TODAY)
    expect(dealt.map((c) => c.task.id)).toEqual([older.id, newer.id])
    expect(dealt[0].kind).toBe('fresh')
  })

  it('a decided task leaves the stack and joins the Line on its day — not before', () => {
    const sleeping = task({ anchored_on: addDays(TODAY, 3) })
    const woken = task({ anchored_on: TODAY })
    expect(dealStack([sleeping, woken], null, TODAY)).toHaveLength(0)
    const line = deriveLine([sleeping, woken], null, TODAY)
    expect(line.map((t) => t.id)).toEqual([woken.id]) // the future one is asleep
  })

  it('the stale return: >STALE_AFTER_DAYS past goes back to the stack, the boundary stays on the Line', () => {
    const atBoundary = task({ anchored_on: addDays(TODAY, -STALE_AFTER_DAYS) })
    const pastIt = task({ anchored_on: addDays(TODAY, -(STALE_AFTER_DAYS + 1)) })
    const line = deriveLine([atBoundary, pastIt], null, TODAY)
    expect(line.map((t) => t.id)).toEqual([atBoundary.id])
    const dealt = dealStack([atBoundary, pastIt], null, TODAY)
    expect(dealt.map((c) => [c.task.id, c.kind])).toEqual([[pastIt.id, 'stale']])
  })

  it('delegation leaves the plate entirely, then returns to the stack as a chase on its day', () => {
    const waiting = task({ delegated_to: 'Larry', chase_on: addDays(TODAY, 2) })
    const due = task({ delegated_to: 'Tyler', chase_on: TODAY })
    expect(deriveLine([waiting, due], null, TODAY)).toHaveLength(0)
    const dealt = dealStack([waiting, due], null, TODAY)
    expect(dealt.map((c) => [c.task.id, c.kind])).toEqual([[due.id, 'chase']])
  })

  it('chase cards deal before stale, before fresh', () => {
    const fresh = task({})
    const stale = task({ anchored_on: addDays(TODAY, -10) })
    const chase = task({ delegated_to: 'Kelly', chase_on: TODAY })
    const kinds = dealStack([fresh, stale, chase], null, TODAY).map((c) => c.kind)
    expect(kinds).toEqual(['chase', 'stale', 'fresh'])
  })

  it('the lens scopes both stages; done and deleted never appear', () => {
    const inWorld = task({ project_id: 'w1' })
    const elsewhere = task({ project_id: 'w2', anchored_on: TODAY })
    const finished = task({ project_id: 'w1', done_at: '2026-07-23T12:00:00.000Z' })
    const removed = task({ project_id: 'w1', deleted_at: '2026-07-23T12:00:00.000Z' })
    const all = [inWorld, elsewhere, finished, removed]
    expect(dealStack(all, 'w1', TODAY).map((c) => c.task.id)).toEqual([inWorld.id])
    expect(deriveLine(all, 'w1', TODAY)).toHaveLength(0)
    expect(deriveLine(all, null, TODAY).map((t) => t.id)).toEqual([elsewhere.id])
  })

  it('the Line orders today-anchored first, then older anchors; Deb reorders when present', () => {
    const yesterday = task({ anchored_on: addDays(TODAY, -1) })
    const anchoredToday = task({ anchored_on: TODAY })
    const line = deriveLine([yesterday, anchoredToday], null, TODAY)
    expect(line.map((t) => t.id)).toEqual([anchoredToday.id, yesterday.id])
    const reordered = applyDebOrder(line, [yesterday.id, anchoredToday.id])
    expect(reordered.map((t) => t.id)).toEqual([yesterday.id, anchoredToday.id])
    expect(applyDebOrder(line, null).map((t) => t.id)).toEqual([anchoredToday.id, yesterday.id])
  })
})
