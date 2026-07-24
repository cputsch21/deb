/**
 * Manual theme override (the world sheet's toggle). No stored choice =
 * follow the system; a choice persists and wins via the .dark/.light class.
 */
const KEY = 'deb-theme'

export function initTheme(): void {
  const stored = localStorage.getItem(KEY)
  if (stored === 'dark' || stored === 'light') {
    document.documentElement.classList.add(stored)
  }
}

export function isDarkNow(): boolean {
  const root = document.documentElement
  if (root.classList.contains('dark')) return true
  if (root.classList.contains('light')) return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function toggleTheme(): void {
  const next = isDarkNow() ? 'light' : 'dark'
  const root = document.documentElement
  root.classList.remove('dark', 'light')
  root.classList.add(next)
  localStorage.setItem(KEY, next)
}
