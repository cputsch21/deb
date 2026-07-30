/**
 * WCAG contrast math — all that survives of Arc's legibility machinery
 * (Arc removed July 30, 2026; see DECISIONS.md).
 *
 * Arc enforced the floors by DERIVING every text token against the current
 * surfaces, 1,440 times a day. The floors were the point; the sweep was the
 * cost. Now the palette is static and the floors are asserted once, at build
 * time, against the real values in index.css — see contrast.test.ts. If a
 * token is ever edited below its floor, the build fails.
 */

export type RGB = [number, number, number]

/** "#rrggbb" → channels. Returns null for anything that isn't a plain hex. */
export function parseHex(value: string): RGB | null {
  const m = /^#([0-9a-f]{6})$/i.exec(value.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const toLinear = (channel: number): number => {
  const x = channel / 255
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
}

/** WCAG relative luminance of an opaque color. */
export function luminance([r, g, b]: RGB): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

/** WCAG contrast ratio between two opaque colors (order-independent). */
export function contrastRatio(a: RGB, b: RGB): number {
  const la = luminance(a)
  const lb = luminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * THE TOKEN TAXONOMY (ruled July 30, 2026 — DECISIONS.md). The floors
 * apply to TEXT tokens ONLY; measuring every token against them was a
 * category error that made decorative colors look like failures.
 *
 *   TEXT     ink · muted · dim      → must clear the contrast floors below
 *   SURFACE  paper · well · well2   → not measured against text floors;
 *                                     must only be reliably DISTINGUISHABLE
 *   MARK     silver · gold · worlds → decorative, not measured at all
 *
 * THE MARK EXCEPTION: a mark token rendered AS TEXT is, in that use, a
 * text token and must clear 4.5:1. See the July 30 audit in DECISIONS.
 */

/** TEXT tokens: each against the paper of its own scheme. Minimums, not
 *  targets — the muted/dim hierarchy is real lightness. */
export const TEXT_FLOORS = {
  ink: 7,
  muted: 5.5,
  dim: 4.5, // the eyebrow token — labels ride it
} as const

/** MARK tokens: decorative by default, exempt from the text floors.
 *  Listed so the test can assert they are deliberately NOT measured. */
export const MARK_TOKENS = ['silver', 'accent', 'purple', 'ok', 'bad', 'card', 'bloom'] as const

/** SURFACE separation floor, in CIE L* units — perceptually uniform, so
 *  one number works for both schemes (WCAG luminance is not: the same
 *  visible step measures 0.076 on paper and 0.009 on charcoal). Real
 *  separations run 2.0–6.5 L*; below ~1.5 a well stops reading as a well. */
export const SURFACE_MIN_DELTA_L = 1.5

/** CIE L* — perceptual lightness, 0 (black) … 100 (white). */
export function lstar(c: RGB): number {
  const y = luminance(c)
  return y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y
}

/** An alpha overlay composited onto an opaque surface — how the wells
 *  actually render (`--t-fill` is rgba over the paper, never a flat hex). */
export function composite(fg: RGB, alpha: number, bg: RGB): RGB {
  return [
    Math.round(alpha * fg[0] + (1 - alpha) * bg[0]),
    Math.round(alpha * fg[1] + (1 - alpha) * bg[1]),
    Math.round(alpha * fg[2] + (1 - alpha) * bg[2]),
  ]
}

/** `rgba(r, g, b, a)` → channels + alpha. Returns null for anything else. */
export function parseRgba(value: string): { rgb: RGB; alpha: number } | null {
  const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(value.trim())
  if (!m) return null
  return {
    rgb: [Number(m[1]), Number(m[2]), Number(m[3])],
    alpha: m[4] === undefined ? 1 : Number(m[4]),
  }
}
