import { describe, expect, it, beforeEach } from 'vitest'
import { createTask } from './chat.js'
import { landsOnBoard, placementOf, placementSentence } from './_lib/anchor.js'

/**
 * F6 — A HAND MAY NOT NAME WHERE A THING LANDED.
 *
 * At the SEAM, not the boundary: these drive the hand and read the string
 * it hands back to Deb, because the string is the only thing she can speak
 * from. Asserting on `placementSentence` alone would have passed happily
 * while `createTask` returned its old constant.
 */

const rows: Record<string, unknown>[] = []
const db = {
  from: () => ({
    insert: (row: Record<string, unknown>) => {
      rows.push(row)
      return Promise.resolve({ error: null })
    },
  }),
} as never

const use = (input: Record<string, unknown>) =>
  ({ input, name: 'create_task', type: 'tool_use', id: 't' }) as never

beforeEach(() => {
  rows.length = 0
})

describe('create_task', () => {
  it('TOLD: Chris asked for it, so it is anchored and she says it is on the list', async () => {
    const r = await createTask(db, use({ title: 'Invoice Larry', told: true }), null, 'UTC', () => {})
    expect(rows[0].anchored_on).not.toBeNull()
    expect(r.content).toContain('on his list for today')
    expect(r.content).not.toContain('Triage')
  })

  it('INFERRED: she guessed, so it is unanchored and she says it awaits a verdict', async () => {
    const r = await createTask(db, use({ title: 'Call the roofer' }), null, 'UTC', () => {})
    expect(rows[0].anchored_on).toBeNull()
    expect(r.content).toContain('Triage')
    expect(r.content).toContain('NOT on his list yet')
  })

  it('the default is INFERRED — the safe default asks rather than assumes', async () => {
    await createTask(db, use({ title: 'x', told: 'yes' }), null, 'UTC', () => {})
    expect(rows[0].anchored_on).toBeNull() // a non-boolean is not a yes
  })

  it('THE DEFECT ITSELF: the sentence tracks the row, not a constant', async () => {
    const told = await createTask(db, use({ title: 'a', told: true }), null, 'UTC', () => {})
    const inferred = await createTask(db, use({ title: 'b' }), null, 'UTC', () => {})
    // the old code returned the same sentence for both — that was the bug
    expect(told.content).not.toBe(inferred.content)
  })
})

describe('the shared derivation', () => {
  it('the board and the sentence read the SAME predicate', () => {
    // if this ever disagrees with deriveLine, deriveLine no longer compiles:
    // it consumes landsOnBoard as a type guard for its own narrowing
    expect(landsOnBoard('2026-08-03', '2026-08-03')).toBe(true)
    expect(landsOnBoard('2026-08-04', '2026-08-03')).toBe(false) // a Delay sleeps
    expect(landsOnBoard(null, '2026-08-03')).toBe(false) // undecided
  })

  it('placementSentence covers every Placement — a third breaks the build', () => {
    expect(placementSentence(placementOf('2026-08-03', '2026-08-03'))).toMatch(/on his list/)
    expect(placementSentence(placementOf(null, '2026-08-03'))).toMatch(/Triage/)
  })
})
