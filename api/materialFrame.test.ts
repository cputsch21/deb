import { describe, expect, it } from 'vitest'
import { materialFrame } from './chat.js'
import type { FilingResult } from './_lib/filing.js'

/**
 * F5 ITEM 4 — a paste over MATERIAL_MIN files as an entry instead of
 * entering the thread as Chris's message. That path is invisible from
 * outside: he did not know it existed. SILENCE ABOUT A FILING IS THE SAME
 * FAILURE AS SILENCE ABOUT A DROP, one layer up in the product.
 *
 * The receipt already exists as an OBJECT (the filed card in the thread).
 * What was missing is Deb saying it. This asserts the instruction reaches
 * her frame — the seam where the value is consumed, not just produced.
 */
const base: FilingResult = {
  entryId: 'e-1',
  worldName: '150 Poplar',
  routedProjectId: 'p-1',
  taskIds: [],
  mintedTitles: [],
  distillate: 'Roof quote came in at 14k · decide by Friday',
  raw: 'a long pasted page',
  todayWords: [],
  firstOfDay: false,
  versioned: null,
} as unknown as FilingResult

describe('materialFrame', () => {
  it('tells her to name the filing once, in one short clause', () => {
    const f = materialFrame(base)
    expect(f).toMatch(/SAY SO, ONCE/)
    expect(f).toMatch(/went to the record/)
  })

  it('says WHERE it went, so her clause can be specific', () => {
    expect(materialFrame(base)).toContain('150 Poplar')
    expect(materialFrame({ ...base, worldName: null } as FilingResult)).toContain('at silver')
  })

  it('forbids the three failure modes: apology, mechanism, and making it the subject', () => {
    const f = materialFrame(base)
    expect(f).toMatch(/never apologise for filing/)
    expect(f).toMatch(/never explain the mechanism/)
    expect(f).toMatch(/never make it the subject/)
  })

  it('a version drop still carries the instruction', () => {
    const f = materialFrame({ ...base, versioned: { prevRawId: 'r' } } as unknown as FilingResult)
    expect(f).toMatch(/SAY SO, ONCE/)
    expect(f).toContain("GREW today's living page")
  })
})
