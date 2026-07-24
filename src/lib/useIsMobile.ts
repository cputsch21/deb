import { useEffect, useState } from 'react'

/**
 * The one mobile breakpoint (<768px): below it the shell re-arranges —
 * world pill + bottom sheet + rooms pager. Same rooms, phone-shaped shell.
 */
const QUERY = '(max-width: 767px)'

export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => window.matchMedia(QUERY).matches)
  useEffect(() => {
    const q = window.matchMedia(QUERY)
    const onChange = (e: MediaQueryListEvent) => setMobile(e.matches)
    q.addEventListener('change', onChange)
    return () => q.removeEventListener('change', onChange)
  }, [])
  return mobile
}
