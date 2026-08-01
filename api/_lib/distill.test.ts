import { describe, expect, it } from 'vitest'
import {
  DISTILLATE_CHAR_MAX,
  DISTILLATE_WORD_MAX,
  FLOOR_MIN_SOURCE_WORDS,
  FLOOR_RATIO,
  deterministicExtract,
  overruns,
  requiredWords,
  trimToCeiling,
  violatesFloor,
  wordCount,
} from './distill.js'

/**
 * THE DISTILLATE IS A DISTILLATE (R2, July 30 2026).
 *
 * The bug this guards: a reMarkable page rendered as ~200 words of
 * near-verbatim re-flowed prose in the distillate slot — the raw wearing
 * the distillate's clothes.
 *
 * Two invariants are tested here:
 *   1. THE CEILING — 240 characters AND 36 words, whichever binds first;
 *      never a mid-word truncation, never an appended ellipsis.
 *   2. PHRASE-LEVEL PROVENANCE — every phrase in the distillate traces
 *      back to the page. A distillate containing a sentence Chris did not
 *      write is a test failure.
 */

/** The fixture: a real-shaped reMarkable morning page. */
const PAGE = `Journal
Lord Jesus Christ, have mercy on me

Gratitude
I am grateful for my family

Goals
Test HXD in internal testing environment
Get home by 5:30pm to play with the kids`

/** Words that carry meaning — the units provenance is checked against. */
function contentWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9:\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
}

/** Every content word in `candidate` must appear in `source`. */
function tracesTo(candidate: string, source: string): string[] {
  const have = new Set(contentWords(source))
  return contentWords(candidate).filter((w) => !have.has(w))
}

describe('the ceiling', () => {
  it('the reference distillate from the locked prototype fits', () => {
    const reference =
      'Lord Jesus Christ, have mercy on me. Grateful for my family. Today: HXD into internal testing — and home by 5:30 to play with the kids.'
    expect(wordCount(reference)).toBeLessThanOrEqual(DISTILLATE_WORD_MAX)
    expect(reference.length).toBeLessThanOrEqual(DISTILLATE_CHAR_MAX)
    expect(overruns(reference)).toBe(false)
  })

  it('catches the bug: ~200 words of re-flowed prose overruns', () => {
    const reflowed = Array.from(
      { length: 40 },
      (_, i) => `clause ${i} of the original page restated at length`,
    ).join(' ')
    expect(wordCount(reflowed)).toBeGreaterThan(200)
    expect(overruns(reflowed)).toBe(true)
  })

  it('binds on words even when characters are under the cap', () => {
    const many = Array.from({ length: 40 }, () => 'a').join(' ') // 40 words, 79 chars
    expect(many.length).toBeLessThanOrEqual(DISTILLATE_CHAR_MAX)
    expect(overruns(many)).toBe(true)
  })

  it('trims on a word boundary — never mid-word, never an ellipsis', () => {
    const long = `${'alpha bravo charlie delta echo foxtrot golf hotel '.repeat(12)}end`
    const out = trimToCeiling(long)
    expect(overruns(out)).toBe(false)
    expect(out).not.toContain('…')
    expect(out).not.toContain('...')
    // the tail is a whole word from the source, not a fragment
    const words = long.split(/\s+/)
    expect(words).toContain(out.split(' ').at(-1))
  })

  it('leaves an already-fitting distillate untouched', () => {
    const fine = 'Lord Jesus Christ, have mercy on me. Today: HXD into internal testing.'
    expect(trimToCeiling(fine)).toBe(fine)
  })
})

describe('phrase-level provenance against the fixture page', () => {
  const extract = deterministicExtract(PAGE)

  it('produces something', () => {
    expect(extract.length).toBeGreaterThan(0)
  })

  it('fits the ceiling', () => {
    expect(overruns(extract)).toBe(false)
  })

  it('contains no word Chris did not write', () => {
    // the load-bearing assertion: a sentence he did not write fails here
    expect(tracesTo(extract, PAGE)).toEqual([])
  })

  it('carries the page opener and the stated goals', () => {
    expect(extract).toContain('Lord Jesus Christ, have mercy on me')
    expect(extract.toLowerCase()).toContain('hxd')
    expect(extract).toContain('5:30')
  })

  it('never editorialises — no third person, no Deb voice', () => {
    expect(extract.toLowerCase()).not.toContain('chris plans')
    // whole words only — "the kids" is his phrase and must survive
    expect(extract).not.toMatch(/\b(he|she|they)\b/i)
    expect(extract).not.toContain('…')
  })

  it('a fabricated distillate is caught by the provenance check', () => {
    const fabricated =
      'Chris plans to ship HXD and reports feeling optimistic about the quarter.'
    expect(tracesTo(fabricated, PAGE)).not.toEqual([])
  })
})

describe('the deterministic extract on other page species', () => {
  it('MEETING: takes the first complete sentence', () => {
    const meeting = `Karthik can't start the build until the spec lands. Manish flagged the reporting dependency again, second call in a row. Decision: panel copy freezes Friday.`
    const out = deterministicExtract(meeting)
    expect(overruns(out)).toBe(false)
    expect(tracesTo(out, meeting)).toEqual([])
    expect(out).toContain("Karthik can't start the build until the spec lands")
  })

  it('DUMP: an inline goals line is picked up', () => {
    const dump = `slept bad. head clear tho.\nToday: hxd sync, plumber invoice, ISO binder`
    const out = deterministicExtract(dump)
    expect(overruns(out)).toBe(false)
    expect(tracesTo(out, dump)).toEqual([])
    expect(out).toContain('hxd sync')
  })

  it('an empty page yields an empty extract, never invented prose', () => {
    expect(deterministicExtract('   \n  \n')).toBe('')
  })
})

/**
 * THE FLOOR (R3, July 31 2026) — Chris's ruling table, executable.
 * The rows are the real July 30 corpus run plus the two synthetic cases
 * that define the clamps. If a threshold moves, these say what changed.
 */
describe('the floor', () => {
  const cases: [string, number, number, number | null, boolean][] = [
    // label,                      before, after, required, refused
    ['"Agenda" — 172 → 1',            172,     1,      8.6,  true],
    ['"7.29.26 · Launch…" — 210 → 7', 210,     7,     10.5,  true],
    ['the android page — 207 → 35',   207,    35,    10.35, false],
    ['THE HOLE: 900 → 30',            900,    30,       12, false],
    ['short-but-not-tiny — 30 → 3',    30,     3,        6,  true],
    ['genuinely short — 15 → 3',       15,     3,        0, false],
  ]
  for (const [label, before, after, required, refused] of cases) {
    it(label, () => {
      expect(requiredWords(before)).toBeCloseTo(required ?? 0, 5)
      expect(violatesFloor(before, Array(after).fill('w').join(' '))).toBe(refused)
    })
  }

  it('the upper clamp is what closes the hole: the floor never out-demands the ceiling', () => {
    // a bare ratio would require 45 words of a 900-word page — more than
    // the 36-word CEILING allows, so nothing could ever pass
    expect(FLOOR_RATIO * 900).toBeGreaterThan(DISTILLATE_WORD_MAX)
    expect(requiredWords(900)).toBeLessThanOrEqual(DISTILLATE_WORD_MAX / 3)
  })

  it('below the binding threshold the floor does not bind at all', () => {
    expect(requiredWords(FLOOR_MIN_SOURCE_WORDS - 1)).toBe(0)
    expect(violatesFloor(FLOOR_MIN_SOURCE_WORDS - 1, 'one')).toBe(false)
  })
})
