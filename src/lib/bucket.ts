import { landsOnBoard } from '../../api/_lib/anchor.js'
import type { Task } from '../db/types'

/**
 * WHICH COLUMN A TASK IS IN — one derivation, and the board is not
 * allowed a second opinion (B1 Phase C).
 *
 * This is the sibling of `api/_lib/anchor.ts`, and it IMPORTS that file
 * rather than restating it. `landsOnBoard` is the single definition of
 * "on today's board"; re-deriving `anchored_on !== null && <= today`
 * here would be exactly the drift anchor.ts was written to end. It is a
 * type guard, so the coupling is load-bearing rather than decorative —
 * the 'do' case cannot route around it and keep its narrowing.
 *
 * A HAND MAY NOT NAME WHERE A THING LANDED. After a drop, a card's
 * column comes from `bucketOf()` re-reading the row — never from what
 * the drag handler believed it did.
 */

/** The five columns. Adding a sixth breaks `bucketLabel` at compile
 *  time, by design — the same drift guard anchor.ts carries. */
export type Bucket = 'delay' | 'delegate' | 'do' | 'done' | 'deleted'

export const BUCKETS: readonly Bucket[] = ['delay', 'delegate', 'do', 'done', 'deleted']

/**
 * PRECEDENCE, FIRST MATCH WINS. The order is the whole meaning of this
 * function: a task can carry several markers at once, and this decides
 * which one speaks. Deleted outranks done outranks delegated outranks
 * anchored, because that is the order in which a marker overrides the
 * ones beneath it.
 *
 * NOTE ON THE COLUMN NAMES: the ticket calls the completion marker
 * `completed`. The column is and has always been `done_at`
 * (src/db/types.ts:132). Nothing was renamed to match the ticket —
 * renaming a live column to fit a sentence is how a migration becomes
 * a data-loss event.
 *
 * Total. No null return, no fallthrough — every task has a column.
 */
export function bucketOf(task: Task, today: string): Bucket {
  if (task.deleted_at !== null) return 'deleted'
  if (task.done_at !== null) return 'done'
  if (task.delegated_to !== null) return 'delegate'
  if (landsOnBoard(task.anchored_on, today)) return 'do'
  return 'delay'
}

/**
 * THE DRIFT GUARD. This switch has no `default`, so a sixth Bucket
 * fails to compile here — `never` stops accepting the value. Same
 * construction as `placementSentence` in anchor.ts, and it is the
 * reason a new column cannot be added silently.
 */
export function bucketLabel(b: Bucket): string {
  switch (b) {
    case 'delay':
      return 'Delay'
    case 'delegate':
      return 'Delegate'
    case 'do':
      return 'Do'
    case 'done':
      return 'Done'
    case 'deleted':
      return 'Deleted'
  }
  const exhaustive: never = b
  return exhaustive
}

/** Every field the precedence chain reads. A drop writes all of them. */
export type TaskPatch = Partial<
  Pick<Task, 'deleted_at' | 'done_at' | 'delegated_to' | 'anchored_on' | 'position'>
>

/**
 * THE COMPLETE ROW STATE FOR A COLUMN — not a partial (B1 amendment).
 *
 * THE BUG THIS EXISTS TO MAKE IMPOSSIBLE: because `bucketOf` is a
 * precedence chain, moving a card DOWN the chain requires clearing
 * every marker ABOVE the destination. Setting the destination's own
 * marker alone leaves the card exactly where it was, and the drag
 * appears to silently revert. Dragging a delegated task to Do while
 * only writing `anchored_on` is the worked example: `delegated_to` is
 * still set, still outranks it, and the card snaps back to Delegate.
 *
 * So no drag handler may assemble a patch by hand. Every drop calls
 * this. WHERE A PROPERTY CAN BE GUARANTEED BY CONSTRUCTION, DO NOT
 * VERIFY IT BY INSPECTION — a hand-built partial is precisely how the
 * silent revert gets back in.
 *
 * 'DO' RE-ANCHORS TO TODAY rather than restoring an old date, and that
 * is deliberate: a task coming back from Done was anchored to whenever
 * it was originally due. That date is in the past, `landsOnBoard` would
 * still accept it, but a card dragged out of Done in August wearing a
 * July anchor is a card that lies about its age. Today is the honest
 * answer to "when did you decide this again".
 *
 * `anchored_on unchanged` for delegate/done/deleted means OMITTED, not
 * nulled — those buckets outrank the anchor, so the anchor is dormant
 * and worth keeping for when the task returns.
 */
export function patchFor(bucket: Bucket, today: string, name?: string): TaskPatch {
  const now = new Date().toISOString()
  switch (bucket) {
    case 'delay':
      // back to undecided — this is the same row-state Triage deals from
      return { deleted_at: null, done_at: null, delegated_to: null, anchored_on: null }
    case 'delegate':
      return { deleted_at: null, done_at: null, delegated_to: name ?? null }
    case 'do':
      return { deleted_at: null, done_at: null, delegated_to: null, anchored_on: today }
    case 'done':
      return { deleted_at: null, done_at: now, delegated_to: null }
    case 'deleted':
      return { deleted_at: now }
  }
  const exhaustive: never = bucket
  return exhaustive
}

/**
 * FRACTIONAL INDEXING — the position for a card dropped between two
 * neighbours. One write per gesture instead of renumbering the column.
 * See the migration for the ~50-consecutive-inserts float64 limit.
 */
export const POSITION_STEP = 1024

export function positionBetween(prev: number | null, next: number | null): number {
  if (prev === null && next === null) return POSITION_STEP
  if (prev === null) return next! - POSITION_STEP
  if (next === null) return prev + POSITION_STEP
  return (prev + next) / 2
}

/**
 * A COLUMN IS EITHER UNTOUCHED OR CLAIMED — never half of each
 * (B1 Phase D). Untouched means every position is null and the order is
 * Deb's ranking. Claimed means the order is Chris's hand. A column that
 * is half one and half the other is a column whose order nobody can
 * explain, so there is no third state.
 */
export function isClaimed(cards: Task[]): boolean {
  return cards.some((t) => t.position !== null)
}

/**
 * Sort a column. Claimed → by position. Untouched → the caller's
 * incoming order, which is Deb's ranking, untouched.
 */
export function sortColumn(cards: Task[]): Task[] {
  if (!isClaimed(cards)) return cards
  return [...cards].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
}
