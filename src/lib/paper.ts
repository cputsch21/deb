import { daysBetween, shortDay } from './line'
import { localDayString } from './day'
import type { BriefItem } from './brief'
import type { Task } from '../db/types'

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

/**
 * The worlds-band glance (P6) — honest derivations from the spine, and
 * only what is honestly derivable. Status renders in muted mono, never
 * recolored (flag 6): the word carries the information, guilt-free.
 *   settled — no open loops standing anywhere in the world
 *   quiet N days — open loops exist but nothing has moved in a while
 *   moving — open loops with recent activity
 */
export type WorldGlance = {
  status: string
  next: string | null
  owed: string | null
  week: string
}

const QUIET_AFTER_DAYS = 4

export function worldGlance(
  projectId: string,
  tasks: Task[],
  entryDays: { project_id: string | null; entry_day: string }[],
  line: Task[],
  today: string,
): WorldGlance {
  const mine = tasks.filter((t) => t.project_id === projectId && !t.deleted_at)
  const open = mine.filter((t) => !t.done_at)
  const finishedWeek = mine.filter(
    (t) => t.done_at && daysBetween(localDayString(new Date(t.done_at)), today) <= 6,
  ).length

  // the most recent day anything in this world moved: a page filed, a
  // task finished, a loop opened
  const touchDays = [
    ...entryDays.filter((e) => e.project_id === projectId).map((e) => e.entry_day),
    ...mine.filter((t) => t.done_at).map((t) => localDayString(new Date(t.done_at!))),
    ...mine.map((t) => localDayString(new Date(t.created_at))),
  ]
  const lastTouch = touchDays.length ? touchDays.reduce((a, b) => (a > b ? a : b)) : null
  const quietDays = lastTouch ? daysBetween(lastTouch, today) : null

  const status =
    open.length === 0
      ? 'settled'
      : quietDays !== null && quietDays >= QUIET_AFTER_DAYS
        ? `quiet ${quietDays} days`
        : 'moving'

  const next = line.find((t) => t.project_id === projectId)?.title ?? null
  const owedTask = open.find((t) => t.delegated_to && t.chase_on)
  const owed = owedTask ? `${owedTask.delegated_to} · chase ${shortDay(owedTask.chase_on!)}` : null
  const week = `${finishedWeek} finished · ${open.length} open`

  return { status, next, owed, week }
}
