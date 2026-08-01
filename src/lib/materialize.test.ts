import { describe, expect, it, vi, beforeEach } from 'vitest'

/**
 * F2 — THE FALSE-POSITIVE GUARD, and the one most likely to rot silently.
 *
 * 23505 is the duplicate-index backstop: the rhythm was ALREADY
 * materialized today, which is a success. A ledger that records non-drops
 * as drops teaches you to stop reading it inside a week, and then it is
 * worse than nothing. This test is what decides whether the ledger stays
 * worth reading.
 */

const dropsRecorded: unknown[] = []
vi.mock('../db/queries/drops', () => ({
  recordRhythmDrop: (input: unknown) => {
    dropsRecorded.push(input)
    return Promise.resolve()
  },
}))

let insertError: { code?: string; message: string } | null = null
vi.mock('./supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'recurring_tasks') {
        const chain = {
          select: () => chain,
          is: () =>
            Promise.resolve({
              // one daily rhythm, due today, never materialized
              data: [
                {
                  id: 'r-1',
                  project_id: null,
                  title: 'Morning pages',
                  cadence: 'daily',
                  weekly_days: null,
                  monthly_day: null,
                  last_materialized_on: null,
                },
              ],
              error: null,
            }),
          update: () => chain,
          eq: () => chain,
        }
        return chain
      }
      return { insert: () => Promise.resolve({ error: insertError }) }
    },
  },
}))

const qc = { invalidateQueries: () => Promise.resolve() } as never

beforeEach(() => {
  dropsRecorded.length = 0
  insertError = null
})

describe('materializeDue', () => {
  it('23505 WRITES NO ROW — a duplicate is an already-materialized success', async () => {
    const { materializeDue } = await import('./materialize')
    insertError = { code: '23505', message: 'duplicate key value violates unique constraint' }
    await materializeDue(qc)
    expect(dropsRecorded).toHaveLength(0)
  })

  it('a real failure DOES write a row, with the payload a repair would need', async () => {
    const { materializeDue } = await import('./materialize')
    insertError = { code: '42501', message: 'permission denied for table tasks' }
    await expect(materializeDue(qc)).rejects.toThrow(/did not materialize/)
    expect(dropsRecorded).toHaveLength(1)
    expect(dropsRecorded[0]).toMatchObject({
      rhythmId: 'r-1',
      title: 'Morning pages',
      code: '42501',
    })
  })

  it('a clean run writes nothing to the ledger', async () => {
    const { materializeDue } = await import('./materialize')
    insertError = null
    await materializeDue(qc)
    expect(dropsRecorded).toHaveLength(0)
  })
})
