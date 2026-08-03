import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { DROP_OUTCOMES, isDrop, type ArrivalOutcome } from './types'

/**
 * F2 — NO SILENT DROPS. Three writers, three tests, plus the negative one
 * that decides whether the ledger stays worth reading.
 */

const inserted: Record<string, unknown>[] = []
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        inserted.push({ table, ...row })
        return Promise.resolve({ error: null })
      },
    }),
  },
}))

beforeEach(() => {
  inserted.length = 0
})

describe('the drop set', () => {
  it('every drop outcome is classified as a drop', () => {
    for (const o of DROP_OUTCOMES) expect(isDrop(o)).toBe(true)
  })
  it('landing outcomes are NOT drops — the door must not show successes', () => {
    for (const o of ['filed', 'versioned', 'duplicate'] as ArrivalOutcome[]) {
      expect(isDrop(o)).toBe(false)
    }
  })
  it('duplicate is a success, not a drop — the false-positive guard', () => {
    // a ledger that records non-drops as drops teaches you to stop reading
    // it inside a week, and then it is worse than nothing
    expect(isDrop('duplicate')).toBe(false)
    expect((DROP_OUTCOMES as readonly string[]).includes('duplicate')).toBe(false)
  })
})

describe('the client-side rhythm writer', () => {
  it('WRITER 3: a rhythm drop lands with its reconstruction payload', async () => {
    const { recordRhythmDrop } = await import('./queries/drops')
    await recordRhythmDrop({
      rhythmId: 'r-1',
      title: 'Weekly ISO review',
      code: '42501',
      message: 'permission denied',
    })
    expect(inserted).toHaveLength(1)
    const row = inserted[0]
    expect(row.table).toBe('ingest_log')
    expect(row.source).toBe('rhythm')
    expect(row.outcome).toBe('not_materialized')
    expect(row.summary).toBe('Weekly ISO review')
    // repair-complete: the rhythm can be found and the insert re-run
    expect(row.detail).toMatchObject({
      stage: 'materialize',
      rhythmId: 'r-1',
      code: '42501',
      message: 'permission denied',
    })
  })

  it('carries no user-facing sentence — a row records a fact, a room chooses the words', async () => {
    const { recordRhythmDrop } = await import('./queries/drops')
    await recordRhythmDrop({ rhythmId: 'r-2', title: 'x', code: null, message: 'boom' })
    expect(Object.keys(inserted[0])).not.toContain('reason')
  })
})

/**
 * X1 Phase F — THE NOTES SURVIVE AN UNDO OF A COMPLETION.
 *
 * Not a behaviour that was built; a behaviour that falls out of the shape,
 * and these assert the shape so nobody "optimises" it away later by
 * clearing notes on completion.
 */
/**
 * X1 Phase F — THE NOTES SURVIVE AN UNDO OF A COMPLETION.
 *
 * Not a behaviour that was built; one that falls out of the shape. These
 * assert the SHAPE, so nobody later "tidies up" by clearing notes on
 * completion and quietly makes the undo unable to restore them.
 */
describe('task notes and completion', () => {
  const src = readFileSync(new URL('./queries/tasks.ts', import.meta.url), 'utf8')

  it('setDone writes done_at and NOTHING else — notes are never touched', () => {
    const setDone = src.slice(src.indexOf('const setDone'), src.indexOf('const restore'))
    expect(setDone).toMatch(/done_at:/)
    expect(setDone).not.toMatch(/notes/)
  })

  it('nothing in the task layer clears notes on completion', () => {
    // a destroy on completion could not be walked back, and RED MARKS A
    // DOOR THAT CANNOT BE WALKED BACK THROUGH — completion is not it
    expect(src).not.toMatch(/notes:\s*null[^,]*\/\/\s*complet/i)
    expect(src).not.toMatch(/done_at[^}]*notes:\s*null/s)
  })

  it('the client cap mirrors the database CHECK', async () => {
    const { NOTES_MAX } = await import('./types')
    expect(NOTES_MAX).toBe(20000)
  })
})
