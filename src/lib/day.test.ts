import { describe, expect, it } from 'vitest'
import { benchOpacity, cadenceLabel, localDayString, rhythmFiresOn } from './day'

const rhythm = (over: object) => ({
  cadence: 'daily' as const,
  weekly_days: null,
  monthly_day: null,
  ...over,
})

describe('rhythmFiresOn', () => {
  it('daily fires every day', () => {
    expect(rhythmFiresOn(rhythm({}), new Date(2026, 6, 23))).toBe(true)
  })

  it('weekly fires only on chosen days', () => {
    const r = rhythm({ cadence: 'weekly', weekly_days: [1, 3, 5] }) // Mon Wed Fri
    expect(rhythmFiresOn(r, new Date(2026, 6, 22))).toBe(true) // Wed
    expect(rhythmFiresOn(r, new Date(2026, 6, 23))).toBe(false) // Thu
  })

  it('monthly fires on its date', () => {
    const r = rhythm({ cadence: 'monthly', monthly_day: 15 })
    expect(rhythmFiresOn(r, new Date(2026, 6, 15))).toBe(true)
    expect(rhythmFiresOn(r, new Date(2026, 6, 16))).toBe(false)
  })

  it('monthly clamps honestly in short months', () => {
    const r = rhythm({ cadence: 'monthly', monthly_day: 31 })
    expect(rhythmFiresOn(r, new Date(2026, 1, 28))).toBe(true) // Feb 28 2026
    expect(rhythmFiresOn(r, new Date(2026, 3, 30))).toBe(true) // Apr 30
    expect(rhythmFiresOn(r, new Date(2026, 3, 29))).toBe(false)
  })
})

describe('localDayString', () => {
  it('uses local calendar components', () => {
    expect(localDayString(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('cadenceLabel', () => {
  it('labels each cadence quietly', () => {
    expect(cadenceLabel(rhythm({}))).toBe('daily')
    expect(cadenceLabel(rhythm({ cadence: 'weekly', weekly_days: [1, 3] }))).toBe('mon · wed')
    expect(cadenceLabel(rhythm({ cadence: 'monthly', monthly_day: 3 }))).toBe('the 3rd')
    expect(cadenceLabel(rhythm({ cadence: 'monthly', monthly_day: 11 }))).toBe('the 11th')
  })
})

describe('benchOpacity', () => {
  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()

  it('holds full presence for 14 days, floors at 30', () => {
    expect(benchOpacity(daysAgo(2))).toBe(1)
    expect(benchOpacity(daysAgo(22))).toBeCloseTo(0.725, 2)
    expect(benchOpacity(daysAgo(45))).toBe(0.45)
  })
})
