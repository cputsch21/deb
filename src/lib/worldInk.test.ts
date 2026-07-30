import { describe, expect, it } from 'vitest'
import { contrastRatio, parseHex, readableInk, rgbToHsl, toHex, hslToRgb } from './contrast'
import { randomProjectColor } from './worldTheme'

/**
 * WORLD-INK — the mark exception, made safe (ruled July 30, 2026).
 *
 * A mark color rendered AS TEXT is a text token in that use and must clear
 * 4.5:1. These are PROPERTY tests: rather than pinning a handful of hexes,
 * they sweep the hue/saturation/lightness space and assert the invariants
 * hold for every color a user could possibly choose or be given.
 */

const LIGHT_PAPER = '#faf8f4'
const DARK_PAPER = '#191713'
const FLOOR = 4.5

/** A deterministic sweep of the color space — no randomness in the test. */
function sweep(): string[] {
  const out: string[] = []
  for (let h = 0; h < 360; h += 11) {
    for (const s of [0.15, 0.4, 0.65, 0.9]) {
      for (const l of [0.12, 0.3, 0.5, 0.7, 0.92]) {
        out.push(toHex(hslToRgb(h, s, l)))
      }
    }
  }
  return out
}

const COLORS = sweep()
const hueOf = (hex: string) => rgbToHsl(parseHex(hex)!)[0]
const ratio = (hex: string, paper: string) =>
  contrastRatio(parseHex(hex)!, parseHex(paper)!)

describe.each([
  ['light paper', LIGHT_PAPER],
  ['dark paper', DARK_PAPER],
])('readableInk on %s', (_label, paper) => {
  it(`every color in the sweep clears ${FLOOR}:1 after derivation`, () => {
    const failures = COLORS.map((c) => ({ c, ink: readableInk(c, paper, FLOOR) }))
      .filter(({ ink }) => ratio(ink, paper) < FLOOR - 0.01)
    expect(failures.slice(0, 5)).toEqual([])
  })

  it('preserves hue — the world still reads as itself', () => {
    const drifted = COLORS.filter((c) => {
      const ink = readableInk(c, paper, FLOOR)
      if (ink === c) return false
      const before = hueOf(c)
      const after = hueOf(ink)
      // near-greys have no meaningful hue; ignore those
      const [, sat] = rgbToHsl(parseHex(c)!)
      if (sat < 0.1) return false
      // signed circular difference, folded to [0, 180]
      const delta = Math.abs((((before - after + 180) % 360) + 360) % 360 - 180)
      return delta > 2 // more than 2° of drift
    })
    expect(drifted.slice(0, 5)).toEqual([])
  })

  it('returns already-passing colors BIT-IDENTICAL', () => {
    const passing = COLORS.filter((c) => ratio(c, paper) >= FLOOR)
    expect(passing.length).toBeGreaterThan(0)
    for (const c of passing) {
      expect(readableInk(c, paper, FLOOR)).toBe(c)
    }
  })

  it('is idempotent — deriving twice changes nothing', () => {
    for (const c of COLORS) {
      const once = readableInk(c, paper, FLOOR)
      expect(readableInk(once, paper, FLOOR)).toBe(once)
    }
  })

  it('moves lightness in the direction the scheme demands', () => {
    const towardDark = paper === LIGHT_PAPER
    for (const c of COLORS) {
      const ink = readableInk(c, paper, FLOOR)
      if (ink === c) continue
      const before = rgbToHsl(parseHex(c)!)[2]
      const after = rgbToHsl(parseHex(ink)!)[2]
      if (towardDark) expect(after).toBeLessThanOrEqual(before + 0.001)
      else expect(after).toBeGreaterThanOrEqual(before - 0.001)
    }
  })

  it('never invents a color from unparseable input', () => {
    expect(readableInk('not-a-color', paper, FLOOR)).toBe('not-a-color')
  })
})

describe('randomProjectColor gamut', () => {
  it('never hands out a default that fails the floor on paper', () => {
    // the old range could produce 1.33:1; sample widely
    for (let i = 0; i < 400; i++) {
      const c = randomProjectColor()
      expect(parseHex(c), `${c} is not a valid hex`).not.toBeNull()
      expect(ratio(c, LIGHT_PAPER)).toBeGreaterThanOrEqual(FLOOR - 0.01)
    }
  })

  it('still spans the hue circle — legibility did not collapse the palette', () => {
    const hues = new Set<number>()
    for (let i = 0; i < 400; i++) hues.add(Math.floor(hueOf(randomProjectColor()) / 30))
    expect(hues.size).toBeGreaterThanOrEqual(10) // at least 10 of 12 sectors
  })
})
