import { describe, expect, it, beforeEach } from 'vitest'
import { logArrival, landedOutcome } from './filing.js'

/**
 * F4 — THE WIRE, not the pieces.
 *
 * F2's tests checked `landedOutcome()` in isolation and every one passed
 * while `logArrival` silently discarded the `detail` it returned: the two
 * writers pass `...landedOutcome(...)`, and TypeScript does not run
 * excess-property checks through a spread. The unit was right, the seam
 * was broken, and nothing tested the seam.
 *
 * These tests go through logArrival to the insert payload.
 */

const inserted: Record<string, unknown>[] = []
const db = {
  from: (table: string) => ({
    insert: (row: Record<string, unknown>) => {
      inserted.push({ table, ...row })
      return Promise.resolve({ error: null })
    },
  }),
} as never

beforeEach(() => {
  inserted.length = 0
})

describe('logArrival', () => {
  it('THE SEAM: detail survives the trip to the insert payload', async () => {
    await logArrival(db, {
      source: 'composer',
      outcome: 'distillate_refused',
      entryId: 'e-1',
      detail: { stage: 'floor', candidate: 'Agenda', gotWords: 1, requiredWords: 10 },
    })
    expect(inserted[0].detail).toEqual({
      stage: 'floor',
      candidate: 'Agenda',
      gotWords: 1,
      requiredWords: 10,
    })
  })

  it('the F2 writers spread landedOutcome through it and keep their payload', async () => {
    const raw = Array(200).fill('word').join(' ')
    await logArrival(db, {
      source: 'remarkable',
      entryId: 'e-2',
      ...landedOutcome('filed', { distillateRejected: 'Agenda' } as never, raw),
    })
    expect(inserted[0].outcome).toBe('distillate_refused')
    expect(inserted[0].detail).toMatchObject({ candidate: 'Agenda', sourceWords: 200 })
  })

  it('a clean arrival writes detail null, never undefined', async () => {
    await logArrival(db, { source: 'email', outcome: 'filed', entryId: 'e-3' })
    expect(inserted[0].detail).toBeNull()
  })

  it("BUILD ITEM 1: Deb's own hand files as a composer arrival with its stage", async () => {
    // the shape chat.ts writes — a filing that DID produce a distillate
    // must never be recorded as a drop
    await logArrival(db, {
      source: 'composer',
      sender: null,
      summary: 'Notes from the Karthik call',
      outcome: 'filed',
      detail: { stage: 'file_entry' },
      entryId: 'e-4',
    })
    expect(inserted[0]).toMatchObject({
      table: 'ingest_log',
      source: 'composer',
      outcome: 'filed',
      entry_id: 'e-4',
      detail: { stage: 'file_entry' },
    })
  })

  it('and records the genuine empty case as a drop, not as filed', async () => {
    await logArrival(db, {
      source: 'composer',
      outcome: 'no_distillate',
      detail: { stage: 'file_entry', cause: 'nothing to distil — the content was empty' },
      entryId: 'e-5',
    })
    expect(inserted[0].outcome).toBe('no_distillate')
  })
})
