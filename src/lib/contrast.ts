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

/* ---------- HSL, for lightness-only adjustment ---------- */

/** RGB → HSL. Hue in degrees, s/l in 0…1. */
export function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  const R = r / 255
  const G = g / 255
  const B = b / 255
  const max = Math.max(R, G, B)
  const min = Math.min(R, G, B)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return [0, 0, l]
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === R) h = ((G - B) / d + (G < B ? 6 : 0)) * 60
  else if (max === G) h = ((B - R) / d + 2) * 60
  else h = ((R - G) / d + 4) * 60
  return [h, s, l]
}

/** HSL → RGB. */
export function hslToRgb(h: number, s: number, l: number): RGB {
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))
  return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))]
}

export const toHex = ([r, g, b]: RGB): string =>
  `#${[r, g, b].map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('')}`

/**
 * WORLD-INK (ruled July 30, 2026 — the mark exception). A mark color
 * rendered AS TEXT must clear 4.5:1, so this DERIVES a readable variant:
 *
 *   · lightness-only — the hue is never touched, so the world still reads
 *     as itself, just deeper (or, on charcoal, brighter)
 *   · directional by scheme — darken toward black on paper, lighten
 *     toward white on charcoal
 *   · a color that already clears the floor is returned BIT-IDENTICAL, so
 *     worlds that were always legible do not move at all
 *
 * Marks keep the true color; only letterforms use this.
 */
export function readableInk(color: string, paper: string, floor = 4.5): string {
  const rgb = parseHex(color)
  const bg = parseHex(paper)
  if (!rgb || !bg) return color // unparseable: never invent a color
  if (contrastRatio(rgb, bg) >= floor) return color // already legible — untouched

  const [h, s, l] = rgbToHsl(rgb)
  // on light paper text runs darker; on charcoal it runs lighter
  const towardDark = lstar(bg) > 50
  let lo = towardDark ? 0 : l
  let hi = towardDark ? l : 1
  let best = hslToRgb(h, s, towardDark ? 0 : 1)

  // 24 halvings resolve lightness far finer than 8-bit channels can show
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    const candidate = hslToRgb(h, s, mid)
    if (contrastRatio(candidate, bg) >= floor) {
      best = candidate
      // keep as much of the original lightness as the floor allows
      if (towardDark) lo = mid
      else hi = mid
    } else if (towardDark) {
      hi = mid
    } else {
      lo = mid
    }
  }
  return toHex(best)
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
