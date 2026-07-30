/**
 * The theme, two ways: light · dark — with SYSTEM as the default.
 *
 * Arc — the app lit by the real sun — was built (M6 T1, rebuilt July 28)
 * and REMOVED on July 30, 2026 (see DECISIONS.md). It cost a document-wide
 * style recalc and a 350ms full-viewport transition every 60 seconds,
 * forever; Safari reloaded the page for excessive energy use. Time-of-day
 * theming is out of scope for v2. What survives is the palette itself,
 * static, and the contrast floors — asserted once at build time in
 * contrast.test.ts instead of enforced every tick.
 *
 * No stored choice = follow the system (the CSS media query does that with
 * zero JavaScript). An explicit choice adds .light or .dark.
 */
const KEY = 'deb-theme'

export type Theme = 'system' | 'light' | 'dark'

export function getTheme(): Theme {
  const t = localStorage.getItem(KEY)
  return t === 'light' || t === 'dark' ? t : 'system'
}

function apply(theme: Theme): void {
  const root = document.documentElement
  root.classList.remove('dark', 'light')
  if (theme !== 'system') root.classList.add(theme)
}

export function initTheme(): void {
  // one-time migration: a stored 'arc' means nothing now — fall to system
  if (localStorage.getItem(KEY) === 'arc') localStorage.removeItem(KEY)
  apply(getTheme())
}

/** system → light → dark → system. Returns the new mode (for a label). */
export function cycleTheme(): Theme {
  const order: Theme[] = ['system', 'light', 'dark']
  const next = order[(order.indexOf(getTheme()) + 1) % order.length]
  if (next === 'system') localStorage.removeItem(KEY)
  else localStorage.setItem(KEY, next)
  apply(next)
  return next
}
