import type { UseQueryResult } from '@tanstack/react-query'

/**
 * EMPTINESS MUST BE EARNED (law, July 31 2026).
 *
 * No surface may render an empty, complete, or celebratory state unless
 * its queries have ACTUALLY SUCCEEDED. Not "did not error" — succeeded.
 * Absence of failure is not evidence of success.
 *
 * The mechanism is this type. A `Proven<T>` has no `.length`, no `.map`,
 * no `.filter` — the payload is unreachable until `proven` is checked, so
 * a surface that renders rows without proving them does not COMPILE. The
 * law is enforced by the type checker, not by remembering it. Same
 * argument as RLS immutability: the capability does not exist.
 *
 * The three states, and why the split is where it is:
 *
 *   proven            → the query succeeded. Render the real thing,
 *                       including a genuinely empty one.
 *   'loading'         → nothing has gone wrong yet. Render NOTHING
 *                       (no skeletons, by law).
 *   'stalled'         → something has gone wrong. Render the line.
 *
 * RULING (July 31): the boundary is `fetchFailureCount`, NOT paused-ness.
 * A query that has failed even once is not loading — it is not going
 * well, and the surface says so. Splitting on paused/pending instead
 * would leave ~7s of visible-tab backoff rendering as empty; splitting
 * here takes the lie window to zero. On a clean load failureCount is 0
 * throughout, so the happy path never flashes.
 *
 * The known, accepted cost: a query that fails once and recovers on
 * retry 2 shows the line for a second. That flash is TRUE. If it proves
 * frequent the threshold moves to 2 — a one-line change here. It is
 * never softened with a timer; a delay before showing the truth is a
 * state machine wearing a costume.
 */
export type Proven<T> =
  | { proven: true; value: T }
  | { proven: false; state: 'loading' }
  | { proven: false; state: 'stalled'; retry: () => void }

/** Turn a query result into proof. The only sanctioned way to read one. */
export function proven<T>(q: UseQueryResult<T, Error>): Proven<T> {
  if (q.status === 'success') return { proven: true, value: q.data }
  if (q.failureCount === 0) return { proven: false, state: 'loading' }
  return { proven: false, state: 'stalled', retry: () => void q.refetch() }
}

/**
 * A DERIVED VALUE WITH NO PROOF PRINTS NO VALUE (law, July 31 2026).
 * Edition numbers, counts, glances — absence, always. `issueNumber(null)`
 * returning 1 told Chris his record began this morning; a derived number
 * is a claim about history and an unproven claim is not made.
 */
export function derive<T, R>(p: Proven<T>, f: (value: T) => R): R | null {
  return p.proven ? f(p.value) : null
}
