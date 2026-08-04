import { describe, expect, it } from 'vitest'
import { BUCKETS, bucketOf, isClaimed, patchFor, positionBetween, sortColumn } from './bucket'
import type { Bucket } from './bucket'
import type { Task } from '../db/types'

const TODAY = '2026-08-04'

function task(over: Partial<Task> = {}): Task {
  return {
    id: 'T',
    project_id: null,
    goal_id: null,
    recurring_id: null,
    title: 'a thing',
    notes: null,
    done_at: null,
    touched_at: `${TODAY}T09:00:00.000Z`,
    anchored_on: null,
    delegated_to: null,
    chase_on: null,
    delegated_on: null,
    source_entry_id: null,
    source_excerpt: null,
    materialized_on: null,
    created_at: `${TODAY}T08:00:00.000Z`,
    deleted_at: null,
    position: null,
    ...over,
  }
}

/** A row already sitting in each bucket, built by hand rather than by
 *  patchFor — otherwise the round-trip below would be testing patchFor
 *  against itself and could agree with its own mistake. */
const SEED: Record<Bucket, Task> = {
  delay: task({ anchored_on: null }),
  delegate: task({ delegated_to: 'Marco', anchored_on: TODAY }),
  do: task({ anchored_on: TODAY }),
  done: task({ done_at: `${TODAY}T10:00:00.000Z`, anchored_on: TODAY }),
  deleted: task({ deleted_at: `${TODAY}T10:00:00.000Z`, anchored_on: TODAY }),
}

describe('bucketOf — precedence, first match wins', () => {
  it('seeds each bucket where it says it does', () => {
    for (const b of BUCKETS) expect(bucketOf(SEED[b], TODAY)).toBe(b)
  })

  it('a task that is BOTH completed and deleted lands in deleted', () => {
    const t = task({ done_at: `${TODAY}T10:00:00.000Z`, deleted_at: `${TODAY}T11:00:00.000Z` })
    expect(bucketOf(t, TODAY)).toBe('deleted')
  })

  it('a task that is BOTH delegated and anchored for today lands in delegate', () => {
    const t = task({ delegated_to: 'Marco', anchored_on: TODAY })
    expect(bucketOf(t, TODAY)).toBe('delegate')
  })

  // A PRODUCT FACT, NOT AN ACCIDENT — Chris ruled this knowingly.
  it('DELAY AND TRIAGE HOLD THE SAME ROWS: an un-anchored task lands in delay', () => {
    expect(bucketOf(task({ anchored_on: null }), TODAY)).toBe('delay')
  })

  it('a future anchor is a delay, not a do', () => {
    expect(bucketOf(task({ anchored_on: '2026-09-01' }), TODAY)).toBe('delay')
  })

  it('a past anchor still lands on the board', () => {
    expect(bucketOf(task({ anchored_on: '2026-07-01' }), TODAY)).toBe('do')
  })
})

/**
 * THE ROUND TRIP, AT THE SEAM. Not "does patchFor return the right
 * object" — that stops at the function boundary and cannot see a broken
 * wire. This asserts where the value is CONSUMED: apply the patch to a
 * real row, then ask bucketOf where the row actually is.
 *
 * Twenty cases, and they are the only proof the board is not lying
 * about where things went. Every one of them fails if patchFor ever
 * returns a partial: dragging Delegate → Do while writing only
 * `anchored_on` leaves `delegated_to` set, delegate still outranks do,
 * and the card silently snaps back.
 */
describe('patchFor → bucketOf round trip, all twenty moves', () => {
  for (const from of BUCKETS) {
    for (const to of BUCKETS) {
      if (from === to) continue
      it(`${from} → ${to} actually lands in ${to}`, () => {
        const moved = { ...SEED[from], ...patchFor(to, TODAY, 'Marco') }
        expect(bucketOf(moved, TODAY)).toBe(to)
      })
    }
  }

  it('do re-anchors to today rather than restoring the old date', () => {
    const stale = task({ anchored_on: '2026-07-01', done_at: `${TODAY}T10:00:00.000Z` })
    const moved = { ...stale, ...patchFor('do', TODAY) }
    expect(moved.anchored_on).toBe(TODAY)
  })

  it('delegate and done keep a dormant anchor rather than nulling it', () => {
    expect(patchFor('delegate', TODAY, 'Marco')).not.toHaveProperty('anchored_on')
    expect(patchFor('done', TODAY)).not.toHaveProperty('anchored_on')
  })

  it('deleted is reversible: every other bucket clears deleted_at', () => {
    for (const b of BUCKETS) {
      if (b === 'deleted') continue
      expect(patchFor(b, TODAY, 'Marco').deleted_at).toBeNull()
    }
  })
})

describe('ordering — a column is untouched or claimed, never half', () => {
  it('reads untouched while every position is null', () => {
    expect(isClaimed([task({ id: 'a' }), task({ id: 'b' })])).toBe(false)
  })

  it('one position claims the whole column', () => {
    expect(isClaimed([task({ id: 'a' }), task({ id: 'b', position: 1 })])).toBe(true)
  })

  it("leaves an untouched column in Deb's incoming order, untouched", () => {
    const cards = [task({ id: 'b' }), task({ id: 'a' })]
    expect(sortColumn(cards).map((t) => t.id)).toEqual(['b', 'a'])
  })

  it('sorts a claimed column by position', () => {
    const cards = [task({ id: 'b', position: 2048 }), task({ id: 'a', position: 1024 })]
    expect(sortColumn(cards).map((t) => t.id)).toEqual(['a', 'b'])
  })

  it('inserts between two neighbours in one value', () => {
    expect(positionBetween(1024, 2048)).toBe(1536)
    expect(positionBetween(null, 1024)).toBeLessThan(1024)
    expect(positionBetween(1024, null)).toBeGreaterThan(1024)
    expect(positionBetween(null, null)).toBeGreaterThan(0)
  })

  it('stays strictly between its neighbours, so the order it computes holds', () => {
    let lo = 1024
    const hi = 2048
    for (let i = 0; i < 20; i++) {
      const mid = positionBetween(lo, hi)
      expect(mid).toBeGreaterThan(lo)
      expect(mid).toBeLessThan(hi)
      lo = mid
    }
  })
})
