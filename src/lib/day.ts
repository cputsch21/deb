/** Day math — always the user's local timezone (DECISIONS.md law). */

export function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isToday(iso: string): boolean {
  return sameLocalDay(new Date(iso), new Date())
}

/** Local calendar day as yyyy-mm-dd — the app-day everywhere. */
export function localDayString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Does a rhythm fire on this date? (Ruling: exactly three cadences.)
 * Monthly clamps honestly: "the 31st" fires on Feb 28 / Apr 30.
 */
export function rhythmFiresOn(
  r: { cadence: 'daily' | 'weekly' | 'monthly'; weekly_days: number[] | null; monthly_day: number | null },
  d: Date,
): boolean {
  if (r.cadence === 'daily') return true
  if (r.cadence === 'weekly') return !!r.weekly_days?.includes(d.getDay())
  if (r.monthly_day == null) return false
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  return d.getDate() === Math.min(r.monthly_day, daysInMonth)
}

const DAY_ABBREV = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

/** A rhythm's cadence as a quiet mono label. */
export function cadenceLabel(r: {
  cadence: 'daily' | 'weekly' | 'monthly'
  weekly_days: number[] | null
  monthly_day: number | null
}): string {
  if (r.cadence === 'daily') return 'daily'
  if (r.cadence === 'weekly')
    return (r.weekly_days ?? []).map((d) => DAY_ABBREV[d]).join(' · ')
  const n = r.monthly_day ?? 1
  const suffix = n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'
  return `the ${n}${suffix}`
}

/**
 * The Bench fade (ruling, July 22 2026): full presence until 14 days
 * untouched, then an honest dimming to a floor at 30 days — always
 * readable, never a nag.
 */
export function benchOpacity(touchedAt: string): number {
  const days = (Date.now() - new Date(touchedAt).getTime()) / 86_400_000
  if (days <= 14) return 1
  if (days >= 30) return 0.45
  return 1 - ((days - 14) / 16) * 0.55
}
