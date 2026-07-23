/**
 * The world repaint: entering a project tints the whole app in its color
 * by swapping CSS variables — markup never changes, the paint does.
 * (300–400ms crossfade lives in index.css.)
 */
export function paintWorld(hex: string | null) {
  const root = document.documentElement
  if (hex) {
    root.style.setProperty('--world', hex)
    root.classList.add('in-world')
  } else {
    root.style.removeProperty('--world')
    root.classList.remove('in-world')
  }
}

export function isValidHex(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value)
}

/** Random default on creation (ruling: user-choosable, any hex after). */
export function randomProjectColor(): string {
  const h = Math.floor(Math.random() * 360)
  const s = 0.45 + Math.random() * 0.2
  const l = 0.52 + Math.random() * 0.12
  return hslToHex(h, s, l)
}

function hslToHex(h: number, s: number, l: number): string {
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}
