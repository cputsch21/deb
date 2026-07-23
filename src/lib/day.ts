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
