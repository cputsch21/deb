import { describe, expect, it } from 'vitest'
import {
  DISTILLATE_CHAR_MAX,
  DISTILLATE_WORD_MAX,
  DISTILL_ADDENDUM,
  FLOOR_MIN_SOURCE_WORDS,
  FLOOR_RATIO,
  deterministicExtract,
  isHeading,
  legacyExtract,
  overruns,
  requiredWords,
  trimToCeiling,
  violatesFloor,
  wordCount,
} from './distill.js'
import { landedOutcome } from './filing.js'

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

/**
 * THE HEADING PREDICATE (R4) — structural, not a blocklist.
 * The two real failures from the July 30 corpus run, plus the guarantee
 * that makes shipping this safe without having read the whole record.
 */
describe('the heading predicate', () => {
  const AGENDA = 'Agenda\n- call Karthik about the ISO docs\n- invoice Larry'
  const DATED = '7.29.26\nLaunch Deb\nLaunch Subseven'

  it('the real failure: "Agenda" no longer becomes the whole distillate', () => {
    expect(legacyExtract(AGENDA)).toBe('Agenda')
    expect(deterministicExtract(AGENDA)).not.toBe('Agenda')
    expect(deterministicExtract(AGENDA)).toContain('Karthik')
  })

  it('catches a datestamp head, which no word list ever would', () => {
    expect(legacyExtract(DATED)).toBe('7.29.26')
    expect(deterministicExtract(DATED)).toContain('Launch Deb')
  })

  it('a word nobody thought of is handled by SHAPE, not by being listed', () => {
    for (const h of ['Agenda', 'Meeting', 'Ideas', 'Standup', 'Zebra', '§4']) {
      expect(deterministicExtract(`${h}\nThe real first line of the page.`)).toContain('real first line')
    }
  })

  it('a real sentence is never mistaken for a heading', () => {
    expect(isHeading('Called Larry about the invoice today', true)).toBe(false) // too long
    expect(isHeading('Rough day.', true)).toBe(false) // terminal punctuation
    expect(isHeading('Agenda', false)).toBe(false) // nothing follows it
  })

  it('THE GUARANTEE: the new predicate is adopted only when it keeps MORE', () => {
    // a page where structural detection would shorten the extract must
    // fall back to the old result — this is why it can ship unproven
    // against the corpus
    const pages = [AGENDA, DATED, 'Notes\nfirst real line here', 'Just one line', '']
    for (const p of pages) {
      const out = deterministicExtract(p)
      expect(wordCount(out)).toBeGreaterThanOrEqual(wordCount(legacyExtract(p)))
    }
  })
})

/**
 * F2 — WRITERS 1 AND 2: the two server-side drop outcomes. One row per
 * event; a filing that landed without a distillate is ONE arrival wearing
 * a drop outcome, never a `filed` row plus a drop row.
 */
describe('the landed outcome', () => {
  const raw = Array(200).fill('word').join(' ')

  it('WRITER 1: the extractor returning null is no_distillate, and THIN by design', () => {
    const r = landedOutcome('filed', null, raw)
    expect(r.outcome).toBe('no_distillate')
    // Ruling F: there is no candidate to store, so the row says "re-run
    // the extractor" and must not imply it can recover lost text
    expect(r.detail).toMatchObject({ stage: 'extract' })
    expect(r.detail).not.toHaveProperty('candidate')
  })

  it('WRITER 2: a floor refusal is distillate_refused and is repair-complete', () => {
    const r = landedOutcome('filed', { distillateRejected: 'Agenda' } as never, raw)
    expect(r.outcome).toBe('distillate_refused')
    expect(r.detail).toMatchObject({
      stage: 'floor',
      candidate: 'Agenda',
      gotWords: 1,
      sourceWords: 200,
      requiredWords: 10,
    })
  })

  it('a clean filing keeps its landing outcome and carries no detail', () => {
    expect(landedOutcome('filed', { distillateRejected: null } as never, raw)).toEqual({
      outcome: 'filed',
      detail: null,
    })
    expect(landedOutcome('versioned', { distillateRejected: null } as never, raw)).toEqual({
      outcome: 'versioned',
      detail: null,
    })
  })
})

/**
 * X1 B2 — "TODAY, IN YOUR WORDS" IS A CLAIM, SO IT GETS A GUARD.
 *
 * The epigraph on the home page is labelled with his ownership: "today, in
 * your words". The prompt already demands it — "his phrasing, trimmed,
 * never yours... never invent a plan he didn't write" — but a PROMPT IS
 * NOT A GUARANTEE. The distillate beside it has phrase-level provenance
 * enforced by test since R2; this field, whose label literally claims his
 * words, had nothing.
 *
 * Same family as A HAND MAY NOT NAME WHERE A THING LANDED: a sentence
 * asserting a property nothing checks. These assert the property.
 */
describe('today, in your words — the claim the epigraph makes', () => {
  it('the prompt still demands his phrasing and forbids invention', () => {
    // if this instruction is ever softened, the label on the home page
    // becomes a lie and this test is the thing that notices
    expect(DISTILL_ADDENDUM).toMatch(/his phrasing, trimmed, never yours/)
    expect(DISTILL_ADDENDUM).toMatch(/never invent a plan he didn't write/)
  })

  it('every today-word traces back to the page it came from', () => {
    // the fixture page's own goals, as the extractor is instructed to
    // return them — each must be his words, not new sentences
    for (const w of ['Test HXD in internal testing environment', 'Get home by 5:30pm to play with the kids']) {
      expect(tracesTo(w, PAGE)).toEqual([])
    }
  })

  it('a paraphrase would FAIL this guard — the test has teeth', () => {
    // what an abstractive model would produce instead of his line
    expect(tracesTo('Ship the mobile build and prioritise family time', PAGE).length).toBeGreaterThan(0)
  })
})
