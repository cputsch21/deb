/// <reference types="node" />
// Node types are pulled in for THIS FILE ONLY (a test that reads the real
// stylesheet off disk). The app's tsconfig stays browser-scoped, so nothing
// in src/ can reach for Node globals by accident. `?raw` was the first
// choice and does not work here — Tailwind v4's plugin intercepts .css and
// hands back an empty string.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { contrastRatio, parseHex, TEXT_FLOORS } from './contrast'

/**
 * LEGIBILITY BY CONSTRUCTION, after Arc (removed July 30, 2026).
 *
 * Arc pushed every text token to its floor at runtime, every minute. That
 * machinery is gone; the guarantee is not. This test reads the REAL tokens
 * out of src/index.css — not a copy — and fails the build if any text token
 * sits below its floor against the paper of its own scheme.
 *
 * It checks EVERY block that declares a --t-bg, so a scheme added later
 * (or the duplicated explicit-dark block) is covered automatically. There
 * is no second list of hexes to keep in sync, deliberately.
 */

const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8')

type Block = { label: string; tokens: Record<string, string> }

/** Every `{ … }` block in index.css that declares a --t-bg, with the
 *  selector text that introduces it as its label. */
function tokenBlocks(): Block[] {
  const blocks: Block[] = []
  // blocks that DEFINE a paper hex — not ones that merely reference
  // var(--t-bg), like @theme
  for (const m of css.matchAll(/([^{}]*)\{([^{}]*--t-bg\s*:\s*#[0-9a-fA-F]{6}[^{}]*)\}/g)) {
    const tokens: Record<string, string> = {}
    for (const t of m[2].matchAll(/--t-([a-z0-9]+)\s*:\s*(#[0-9a-fA-F]{6})/g)) {
      tokens[t[1]] = t[2]
    }
    const label = m[1].split('\n').filter(Boolean).pop()?.trim() ?? '(unnamed)'
    blocks.push({ label, tokens })
  }
  return blocks
}

const blocks = tokenBlocks()

describe('the palette declares schemes at all', () => {
  it('finds a light and a dark token block, at minimum', () => {
    expect(blocks.length, 'no --t-bg token blocks found in index.css').toBeGreaterThanOrEqual(2)
  })
})

describe.each(blocks.map((b) => [b.label, b] as const))(
  'contrast floors hold in: %s',
  (_label, block) => {
    it('declares the paper and every text token as a plain hex', () => {
      for (const name of ['bg', ...Object.keys(TEXT_FLOORS)]) {
        expect(block.tokens[name], `--t-${name} missing from this block`).toBeDefined()
        expect(parseHex(block.tokens[name]), `--t-${name} must be #rrggbb`).not.toBeNull()
      }
    })

    for (const [token, floor] of Object.entries(TEXT_FLOORS)) {
      it(`${token} clears ${floor}:1 against the paper`, () => {
        const paper = parseHex(block.tokens.bg)!
        const text = parseHex(block.tokens[token])!
        const ratio = contrastRatio(text, paper)
        // the message carries the number so a failure names the shortfall
        expect(
          Number(ratio.toFixed(2)),
          `--t-${token} (${block.tokens[token]}) on --t-bg (${block.tokens.bg}) is ${ratio.toFixed(2)}:1, floor ${floor}:1`,
        ).toBeGreaterThanOrEqual(floor)
      })
    }
  },
)
