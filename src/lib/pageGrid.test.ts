import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  BOARD_CARD_WIDTH,
  BOARD_FR,
  CARD_MIN_REM,
  CARD_SCALE,
  COLUMNS,
  TASKS_GUTTER_REM,
} from './pageGrid'

const PAPER = readFileSync(new URL('../components/paper/Paper.tsx', import.meta.url), 'utf8')

/**
 * THE DRIFT GUARD, AND IT IS THE WHOLE POINT OF THE FILE IT GUARDS.
 *
 * The board's card width is derived from the page's column ratios. That
 * derivation is only true while `pageGrid.ts` and the actual Tailwind
 * grid classes in Paper.tsx agree — and Tailwind classes must be literal
 * strings, so they cannot be generated from the constants.
 *
 * Two sources for one fact is the setup for exactly the drift anchor.ts
 * and bucket.ts were written to prevent. A constant that no longer
 * describes the layout does not fail loudly; it quietly makes every
 * card the wrong width, and "1.25×" becomes a comment that lies.
 *
 * So the seam gets asserted: change a column ratio in one place and this
 * fails the gate until the other place agrees. It is the closest thing
 * to construction available when one of the two sides is a string a
 * bundler has to see at compile time.
 */
describe('the page grid and the board card width cannot drift apart', () => {
  it('Paper still lays the closed page out in these three columns', () => {
    expect(PAPER).toContain(
      `md:grid-cols-[${COLUMNS.record}fr_${COLUMNS.tasks}fr_${COLUMNS.deb}fr]`,
    )
  })

  it('Paper still gives the open board The Record’s width plus the tasks column’s', () => {
    expect(PAPER).toContain(`md:grid-cols-[${BOARD_FR}fr_${COLUMNS.deb}fr]`)
    expect(BOARD_FR).toBe(COLUMNS.record + COLUMNS.tasks)
  })

  it('the tasks column still carries the gutter the derivation subtracts', () => {
    // md:px-10 = 2.5rem each side. TASKS_GUTTER_REM is both sides.
    expect(PAPER).toContain('md:px-10')
    expect(TASKS_GUTTER_REM).toBe(2.5 * 2)
  })

  it('a card is 1.25× a closed-board To Do row, floored for the phone', () => {
    expect(CARD_SCALE).toBe(1.25)
    expect(BOARD_CARD_WIDTH).toBe(
      `max(calc(${(100 * CARD_SCALE) / BOARD_FR}% - ${TASKS_GUTTER_REM * CARD_SCALE}rem), ${CARD_MIN_REM}rem)`,
    )
  })

  it('the derivation is arithmetically what it claims at a real width', () => {
    const grid = 1200
    const total = COLUMNS.record + COLUMNS.tasks + COLUMNS.deb
    const todoRow = grid * (COLUMNS.tasks / total) - TASKS_GUTTER_REM * 16
    const board = grid * (BOARD_FR / total)
    const card = board * ((100 * CARD_SCALE) / BOARD_FR / 100) - TASKS_GUTTER_REM * CARD_SCALE * 16
    expect(card).toBeCloseTo(todoRow * CARD_SCALE, 6)
    // and it is genuinely fatter than what it replaced
    expect(card).toBeGreaterThan(todoRow)
  })
})
