import { readableInk, rgbToHsl, toHex, hslToRgb, parseHex, contrastRatio } from './contrast'

/**
 * The world repaint: entering a project tints the whole app in its color
 * by swapping CSS variables — markup never changes, the paint does.
 * (300–400ms crossfade lives in index.css.)
 *
 * TWO variables, per the July 30 mark-exception ruling:
 *   --world      the TRUE color — marks keep it (dots, rails, stripes,
 *                slider thumbs, the send button)
 *   --world-ink  the derived readable variant — letterforms use it, so a
 *                world name never renders below 4.5:1. A color that
 *                already clears the floor derives to itself, bit-identical.
 *
 * The derivation is scheme-directional, so it is re-run when the system
 * scheme flips. That is an EVENT listener, never a timer — Arc's removal
 * (July 30) is not quietly undone here.
 */

const TEXT_FLOOR = 4.5

let painted: string | null = null

/** The paper we are actually rendering on, read from the live tokens. */
function currentPaper(): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--t-bg').trim()
  return parseHex(value) ? value : '#faf8f4'
}

export function paintWorld(hex: string | null) {
  painted = hex
  const root = document.documentElement
  if (hex) {
    root.style.setProperty('--world', hex)
    root.style.setProperty('--world-ink', readableInk(hex, currentPaper(), TEXT_FLOOR))
    root.classList.add('in-world')
  } else {
    root.style.removeProperty('--world')
    root.style.removeProperty('--world-ink')
    root.classList.remove('in-world')
  }
}

// the scheme can flip under us (system dark at dusk, or the OS setting):
// re-derive the ink for the new paper. No polling — the browser tells us.
if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (painted) paintWorld(painted)
  })
}

export function isValidHex(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value)
}

/**
 * Random default on creation (ruling: user-choosable, any hex after).
 *
 * THE GAMUT (July 30): the old range could hand out a color at 1.33:1
 * against paper — unreadable the moment it was used as a world name.
 * Lightness alone cannot fix that (a yellow at lightness 0.34 still only
 * reaches 3.08:1), so the color is DERIVED through the same clamp the ink
 * uses: pick a hue and saturation, then let the floor decide the
 * lightness. Hue is never compromised.
 */
export function randomProjectColor(): string {
  const h = Math.floor(Math.random() * 360)
  const s = 0.42 + Math.random() * 0.24
  const l = 0.4 + Math.random() * 0.1
  const start = toHex(hslToRgb(h, s, l))
  // clamped against the light paper: legible where the record is read
  return readableInk(start, '#faf8f4', TEXT_FLOOR)
}

/** Exposed for the property test: what the floor actually yields. */
export function inkContrast(color: string, paper: string): number {
  const a = parseHex(readableInk(color, paper, TEXT_FLOOR))
  const b = parseHex(paper)
  return a && b ? contrastRatio(a, b) : 0
}

/** Exposed for the property test: hue must survive the derivation. */
export function hueOf(color: string): number {
  const rgb = parseHex(color)
  return rgb ? rgbToHsl(rgb)[0] : 0
}
