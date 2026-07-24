import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'

/**
 * Deb's ranking + one-line whys for the Line (/api/line, signature-gated
 * server-side). Honest degradation is the law: any failure returns no
 * order and no whys — the room falls back to the honest default order and
 * simply renders no why line. Never a fake.
 */
export type LineWhys = { order: string[] | null; byId: Map<string, string> }

const EMPTY: LineWhys = { order: null, byId: new Map() }

async function fetchWhys(): Promise<{ items: { id: string; why: string }[] | null }> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return { items: null }
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  try {
    const res = await fetch('/api/line', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ tz }),
    })
    if (!res.ok) return { items: null }
    return (await res.json()) as { items: { id: string; why: string }[] | null }
  } catch {
    return { items: null }
  }
}

export const lineWhysKey = ['line-whys'] as const

export function useLineWhys(enabled: boolean): LineWhys {
  const q = useQuery({
    queryKey: lineWhysKey,
    queryFn: fetchWhys,
    enabled,
    staleTime: 30_000,
    retry: false,
  })
  return useMemo(() => {
    const items = q.data?.items
    if (!items || items.length === 0) return EMPTY
    return {
      order: items.map((i) => i.id),
      byId: new Map(items.map((i) => [i.id, i.why])),
    }
  }, [q.data])
}
