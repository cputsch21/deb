import { localDayString } from './day'
import type { Task } from '../db/types'

/**
 * THE ONE QUEUE (M4 law): this file is the single derivation of the stack
 * and the Line. React deals the STACK — questions, never answers (July 29
 * ruling): a verdicted card never returns to center. The Line STANDS at
 * the room's edge as a list; the Now strip glances its top; Reflect's
 * "what now?" speaks the same top via the server's state block
 * (api/_lib/context.ts mirrors these rules — KEEP THEM IN SYNC). If you
 * are about to build a second list anywhere, stop and reread this.
 *
 * The model: anchored_on is the one verdict field.
 *   null            → undecided: the stack deals it (a FRESH card).
 *   today or future → decided. On its day it joins the LINE.
 *   > STALE_AFTER_DAYS past → the anchor has gone stale: back to the
 *     stack as a re-deal card ("still real?"). A week-old anchor is no
 *     longer a decision, it's a wish wearing one.
 * Delegated (delegated_to + chase_on): off the plate entirely until the
 * chase day, when it returns to the STACK as a chase card — that IS a
 * new question.
 */

/** Tunable during move-in (DECISIONS, July 24 2026). */
export const STALE_AFTER_DAYS = 7

export type CardKind = 'fresh' | 'chase' | 'stale'
export type DealtCard = { task: Task; kind: CardKind }

const parseDay = (day: string): Date => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayKey = (): string => localDayString(new Date())

export function addDays(day: string, n: number): string {
  const d = parseDay(day)
  d.setDate(d.getDate() + n)
  return localDayString(d)
}

/** Whole days between two yyyy-mm-dd keys (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86_400_000)
}

export function shortDay(day: string): string {
  return parseDay(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Days since an ISO timestamp, in local app-days. */
export function ageInDays(iso: string, today: string): number {
  return Math.max(0, daysBetween(localDayString(new Date(iso)), today))
}

const open = (t: Task) => !t.done_at && !t.deleted_at
const inLens = (t: Task, lens: string | null) => lens === null || t.project_id === lens
const delegated = (t: Task) => t.delegated_to !== null

/**
 * The stack: every undecided open loop, one at a time. Deal order:
 * chase cards (a person owes you an answer), then stale re-deals (an old
 * anchor asking "still real?"), then fresh loops oldest-first (they've
 * waited longest). The stack must not care where a task came from —
 * M5's note-minted cards deal through this same door.
 */
export function dealStack(tasks: Task[], lens: string | null, today: string): DealtCard[] {
  const mine = tasks.filter((t) => open(t) && inLens(t, lens))
  const chase = mine
    .filter((t) => delegated(t) && t.chase_on !== null && t.chase_on <= today)
    .sort((a, b) => (a.chase_on ?? '').localeCompare(b.chase_on ?? ''))
  const stale = mine
    .filter(
      (t) =>
        !delegated(t) &&
        t.anchored_on !== null &&
        daysBetween(t.anchored_on, today) > STALE_AFTER_DAYS,
    )
    .sort((a, b) => (a.anchored_on ?? '').localeCompare(b.anchored_on ?? ''))
  const fresh = mine
    .filter((t) => !delegated(t) && t.anchored_on === null)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
  return [
    ...chase.map((task) => ({ task, kind: 'chase' as const })),
    ...stale.map((task) => ({ task, kind: 'stale' as const })),
    ...fresh.map((task) => ({ task, kind: 'fresh' as const })),
  ]
}

/**
 * The Line: today's moves. Open, not delegated, anchored for today or
 * recently past (within the stale window). Honest default order —
 * today-anchored first, then older anchors — with Deb's ranking applied
 * on top when her cached order is available (T5); until then, no why
 * renders and this order stands. Never a fake.
 */
export function deriveLine(tasks: Task[], lens: string | null, today: string): Task[] {
  return tasks
    .filter(
      (t) =>
        open(t) &&
        inLens(t, lens) &&
        !delegated(t) &&
        t.anchored_on !== null &&
        t.anchored_on <= today &&
        daysBetween(t.anchored_on, today) <= STALE_AFTER_DAYS,
    )
    .sort(
      (a, b) =>
        (b.anchored_on ?? '').localeCompare(a.anchored_on ?? '') ||
        a.touched_at.localeCompare(b.touched_at),
    )
}

/** Deb's cached order applied over the honest default (unknown ids keep place). */
export function applyDebOrder(line: Task[], order: string[] | null): Task[] {
  if (!order || order.length === 0) return line
  const rank = new Map(order.map((id, i) => [id, i]))
  return [...line].sort(
    (a, b) => (rank.get(a.id) ?? line.indexOf(a) + order.length) - (rank.get(b.id) ?? line.indexOf(b) + order.length),
  )
}
