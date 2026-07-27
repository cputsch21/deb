import { startArc, stopArc } from './sun'

/**
 * The theme, three ways (M6 T1): light · dark · Arc — with ARC THE DEFAULT.
 * Arc is the app lit by the real sun (see sun.ts); light and dark are the
 * manual overrides, honored exactly as before. A choice persists; no choice
 * means Arc. (One-time migration: the old two-way toggle's stored value is
 * cleared so Arc actually becomes the default it was ruled to be.)
 */
const KEY = 'deb-theme'
const MIGRATED = 'deb-theme-v2'

export type Theme = 'arc' | 'light' | 'dark'

export function getTheme(): Theme {
  const t = localStorage.getItem(KEY)
  return t === 'light' || t === 'dark' ? t : 'arc'
}

function apply(theme: Theme): void {
  const root = document.documentElement
  stopArc()
  root.classList.remove('dark', 'light')
  if (theme === 'arc') startArc()
  else root.classList.add(theme)
}

export function initTheme(): void {
  if (!localStorage.getItem(MIGRATED)) {
    localStorage.removeItem(KEY) // pre-Arc choice made under a two-way toggle
    localStorage.setItem(MIGRATED, '1')
  }
  apply(getTheme())
}

/** arc → light → dark → arc. Returns the new mode (for the toggle's label). */
export function cycleTheme(): Theme {
  const order: Theme[] = ['arc', 'light', 'dark']
  const next = order[(order.indexOf(getTheme()) + 1) % order.length]
  localStorage.setItem(KEY, next)
  apply(next)
  return next
}
