/**
 * THE PAGE GRID, IN ONE PLACE — because the board's card width is
 * DERIVED FROM IT, not typed (B1, Aug 4 2026).
 *
 * X2 killed the last magic number in this app. "Make the cards 1.25× the
 * To Do rows" is exactly the kind of instruction that reintroduces one:
 * the obvious move is to measure the rows once, multiply, and hardcode
 * the answer — which is correct on the day it is written and silently
 * wrong the moment a column ratio changes.
 *
 * So the ratio is the source and the width is computed from it. Change
 * a column here and the cards resize with it. `pageGrid.test.ts` asserts
 * that Paper.tsx's grid classes still carry these same numbers, so the
 * two cannot drift apart without failing the gate.
 */

/** The three columns of the closed page, in `fr`. */
export const COLUMNS = { record: 1.35, tasks: 1, deb: 1.04 } as const

/** The board takes The Record's width and the tasks column's, together. */
export const BOARD_FR = COLUMNS.record + COLUMNS.tasks

/** The tasks column's own left+right padding (`md:px-10` = 2.5rem each). */
export const TASKS_GUTTER_REM = 5

/** Chris's ruling: a board card is 1.25× a closed-board To Do row. */
export const CARD_SCALE = 1.25

/**
 * A readability floor. On a phone the closed To Do row is nearly the
 * full screen, so 1.25× of it is wider than the screen — the ratio stops
 * meaning anything and the columns would collapse to slivers. This is
 * the narrowest a card may get, not a second opinion about the ratio:
 * above this width the ratio is what decides.
 */
export const CARD_MIN_REM = 17

/**
 * THE DERIVATION.
 *
 *   a To Do row  = gridWidth × (tasks / total) − gutter
 *   the board    = gridWidth × (BOARD_FR / total)
 *
 * `100%` inside the board IS the board's width, so `total` cancels:
 *
 *   card = CARD_SCALE × (100% / BOARD_FR − gutter)
 *        = 100% × CARD_SCALE / BOARD_FR − gutter × CARD_SCALE
 *
 * Nothing about the third column survives the algebra, which is why the
 * cards keep their 1.25× relationship even though the board is open and
 * the tasks column it is measured against is not on screen.
 */
export const BOARD_CARD_WIDTH = `max(calc(${(100 * CARD_SCALE) / BOARD_FR}% - ${
  TASKS_GUTTER_REM * CARD_SCALE
}rem), ${CARD_MIN_REM}rem)`
