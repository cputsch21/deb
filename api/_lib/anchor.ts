/**
 * WHERE A TASK SITS — one derivation, read by the board AND by every hand
 * that describes a row it just wrote (law, Aug 3 2026).
 *
 * A HAND MAY NOT NAME WHERE A THING LANDED. THE ROW SAYS WHERE IT LANDED.
 *
 * `create_task` used to return the constant "It is on his list now"
 * regardless of what it wrote. The row it wrote had `anchored_on: null`,
 * which by the grammar means undecided — Triage, not the board. Deb can
 * only speak from what a tool result tells her, so she confidently told
 * Chris the opposite of where his task was, twice, and it read as a task
 * ghosting. Nothing was ever lost.
 *
 * This module exists so the sentence and the board cannot drift: both
 * import `landsOnBoard`. Change what "on the board" means and BOTH move,
 * because there is only one of it.
 *
 * It is deliberately dependency-free — a pure predicate, importable from
 * the server hands and from the client's line derivation alike.
 */

/** The two places a live task can be. Adding a third breaks
 *  `placementSentence` at compile time, by design. */
export type Placement = 'board' | 'triage'

/**
 * Does a task with this anchor belong on today's board?
 *
 * NO ANCHOR = UNDECIDED (the model grammar): it sits in Triage until it
 * earns a verdict. An anchor of today or earlier puts it on the board.
 * A future anchor is a Delay — it sleeps until its day.
 *
 * It is a TYPE GUARD, not a boolean: callers that pass the guard get
 * `anchoredOn` narrowed to `string`, so the board's own derivation cannot
 * route around this function to keep its narrowing. The coupling is
 * load-bearing rather than decorative.
 */
export function landsOnBoard(anchoredOn: string | null, today: string): anchoredOn is string {
  return anchoredOn !== null && anchoredOn <= today
}

export function placementOf(anchoredOn: string | null, today: string): Placement {
  return landsOnBoard(anchoredOn, today) ? 'board' : 'triage'
}

/**
 * The sentence a hand returns, DERIVED from the row it wrote.
 *
 * The exhaustive `never` is the construction guarantee: add a third
 * Placement and this stops compiling until the sentence for it exists. A
 * hand can no longer describe a placement nobody has written words for.
 */
export function placementSentence(p: Placement): string {
  switch (p) {
    case 'board':
      return 'It is on his list for today'
    case 'triage':
      return 'It is in Triage, waiting for his verdict — it is NOT on his list yet'
    default: {
      const unreachable: never = p
      return unreachable
    }
  }
}
