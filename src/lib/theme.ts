/**
 * THE THEME FOLLOWS THE SYSTEM. There is no user-facing control, by
 * ruling (July 30, 2026): the OS already knows the preference and does
 * not need a second one. Dark earns its place at 10:30pm; the media query
 * in index.css does that with zero JavaScript.
 *
 * Arc — the app lit by the real sun — was built (M6 T1, rebuilt July 28)
 * and REMOVED July 30, 2026 (see DECISIONS.md): it cost a document-wide
 * style recalc and a 350ms full-viewport transition every 60 seconds,
 * forever, and Safari reloaded the page for excessive energy. The palette
 * and the contrast floors survive it — the floors as a static build-time
 * assertion in contrast.test.ts.
 *
 * All this function does now is clear preferences left by the old
 * three-way toggle, so nobody stays pinned to a mode they can no longer
 * change. It can be deleted once no live browser carries the key.
 */
const KEY = 'deb-theme'
const LEGACY_MIGRATION_KEY = 'deb-theme-v2'

export function initTheme(): void {
  localStorage.removeItem(KEY)
  localStorage.removeItem(LEGACY_MIGRATION_KEY)
  // any class the old toggle left on the root would outrank the media query
  document.documentElement.classList.remove('dark', 'light')
}
