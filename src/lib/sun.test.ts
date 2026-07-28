import { describe, expect, it } from 'vitest'
import {
  contrastRatio,
  lerpColor,
  paletteAt,
  sunTimes,
  surfacesOf,
  TEXT_TARGETS,
} from './sun'

describe('Arc', () => {
  it('lerp holds its endpoints', () => {
    expect(lerpColor([0, 0, 0, 0], [255, 255, 255, 1], 0)).toEqual([0, 0, 0, 0])
    expect(lerpColor([0, 0, 0, 0], [255, 255, 255, 1], 1)).toEqual([255, 255, 255, 1])
  })

  it('midday is full paper, deep night is charcoal, dusk sits between', () => {
    const sr = Date.UTC(2026, 6, 24, 10, 0) // arbitrary absolute times
    const ss = Date.UTC(2026, 6, 24, 24, 0)
    const noon = paletteAt((sr + ss) / 2, sr, ss)
    expect(noon.palette.bg).toEqual([250, 248, 244, 1])
    expect(noon.nightness).toBe(0)
    const night = paletteAt(ss + 3 * 3600_000, sr, ss)
    expect(night.palette.bg).toEqual([25, 23, 19, 1])
    expect(night.nightness).toBe(1)
    // Dusk itself is deliberately day-close now (July 28 ruling 4 — warm
    // paper last-lit); "between" is proven on the descent into night.
    const dusk = paletteAt(ss + 15 * 60_000, sr, ss)
    expect(dusk.palette.bg[0]).toBeLessThan(250)
    expect(dusk.palette.bg[0]).toBeGreaterThan(25)
  })

  it('the interpolation is continuous at the day boundary (no switch)', () => {
    const sr = Date.UTC(2026, 6, 24, 10, 0)
    const ss = Date.UTC(2026, 6, 24, 24, 0)
    const a = paletteAt(sr + 89 * 60_000, sr, ss).palette.bg
    const b = paletteAt(sr + 91 * 60_000, sr, ss).palette.bg
    for (let i = 0; i < 3; i++) expect(Math.abs(a[i] - b[i])).toBeLessThanOrEqual(3)
  })

  it('sunTimes lands in the right sky (NYC, June solstice)', () => {
    const t = sunTimes(new Date(Date.UTC(2026, 5, 21, 12)), 40.7, -74)
    expect(t).not.toBeNull()
    const riseUTC = t!.sunrise.getUTCHours()
    expect(riseUTC).toBeGreaterThanOrEqual(8) // ~5:25 EDT = ~9:25 UTC
    expect(riseUTC).toBeLessThanOrEqual(10)
    expect(t!.sunset.getTime() - t!.sunrise.getTime()).toBeGreaterThan(14 * 3600_000)
  })
})

/**
 * The legibility invariant (July 28 ruling 3): the full 24-hour cycle at
 * one-minute steps, at both solstice extremes plus the no-location
 * fallback. Every text token must hold its ruled contrast floor against
 * EVERY surface it can sit on, at every interpolated state — if any
 * minute of any day fails, the build fails. Illegible can't compile.
 *
 * Latitude 40.7°N stands in for Chris's until he supplies one (flagged in
 * DECISIONS); the schedule is sunrise/sunset-relative, so any latitude
 * whose transitions don't overlap sweeps the same palette states.
 */
describe('the legibility invariant — no minute of any day may fail', () => {
  const LAT = 40.7
  const LNG = -74
  const june = sunTimes(new Date(Date.UTC(2026, 5, 21, 12)), LAT, LNG)!
  const dec = sunTimes(new Date(Date.UTC(2026, 11, 21, 12)), LAT, LNG)!
  // the fallback's shape: 6:30 / 19:30 — absolute values don't matter,
  // the schedule is relative to the pair
  const fbRise = Date.UTC(2026, 6, 28, 6, 30)
  const fbSet = Date.UTC(2026, 6, 28, 19, 30)

  const scenarios: [string, number, number][] = [
    ['june solstice', june.sunrise.getTime(), june.sunset.getTime()],
    ['december solstice', dec.sunrise.getTime(), dec.sunset.getTime()],
    ['no-location fallback', fbRise, fbSet],
  ]

  for (const [name, sr, ss] of scenarios) {
    it(`${name}: every token holds its floor at every minute`, () => {
      const failures: string[] = []
      const start = sr - 12 * 3600_000
      for (let m = 0; m < 1440; m++) {
        const { palette } = paletteAt(start + m * 60_000, sr, ss)
        const surfaces = surfacesOf(palette)
        for (const [token, target] of Object.entries(TEXT_TARGETS)) {
          for (const s of surfaces) {
            const r = contrastRatio(palette[token], s)
            if (r < target) {
              failures.push(
                `minute ${m}: ${token} ${r.toFixed(2)} < ${target} vs [${s.join(',')}]`,
              )
            }
          }
        }
      }
      expect(failures).toEqual([])
    })
  }
})
