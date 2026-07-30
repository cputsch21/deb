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
 * THE FLOORS (ruled July 28, kept through Arc's removal July 30): each
 * text token against the paper it sits on. Minimums, not targets — the
 * muted/dim hierarchy is real lightness, and separation costs nothing.
 */
export const TEXT_FLOORS = {
  ink: 7,
  muted: 5.5,
  dim: 4.5, // the eyebrow token — labels ride it
} as const
