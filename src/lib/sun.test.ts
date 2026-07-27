import { describe, expect, it } from 'vitest'
import { lerpColor, paletteAt, sunTimes } from './sun'

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
    const dusk = paletteAt(ss - 30 * 60_000, sr, ss)
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
