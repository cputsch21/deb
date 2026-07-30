import { daysBetween } from './line'
import type { BriefItem } from './brief'

/**
 * The Paper's small derivations (P1). Pure functions, tested — the fence
 * says new tests cover new derivations only.
 */

/**
 * The masthead's edition count — TIME, NOT PERFORMANCE (July 29 ruling):
 * days since the record began, incrementing unconditionally whether or
 * not a page was written that day. A days-with-pages count would be a
 * streak wearing a monocle; the graveyard takes it.
 */
export function issueNumber(firstEntryDay: string | null, today: string): number {
  if (!firstEntryDay || firstEntryDay > today) return 1
  return daysBetween(firstEntryDay, today) + 1
}

/**
 * The epigraph — words, not state (July 29 ruling): the goals already
 * extracted from the morning entry for the brief, reprinted as one
 * italic line. Nothing may ever check, score, or strike it. Null when
 * the morning holds no written goals — absence, never a placeholder.
 */
export function epigraphLine(items: BriefItem[] | null | undefined): string | null {
  if (!items) return null
  const words = items.filter((i) => i.kind === 'today').map((i) => i.title.trim()).filter(Boolean)
  if (words.length === 0) return null
  return words.join('  ·  ')
}
