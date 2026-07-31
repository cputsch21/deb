import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'
import { proven, type Proven } from '../db/proof'

/**
 * Deb's ranking + one-line whys for the Line (/api/line, signature-gated
 * server-side).
 *
 * This file used to carry a comment claiming "honest degradation is the
 * law" while catching every failure and resolving as SUCCESS with no
 * items. It was the opposite of honest, and the comment was worse than
 * the code because it told the next reader not to look. Both are gone.
 * Failures now propagate; the ranking is Proven<T> like every other read.
 */
export type LineWhys = { order: string[] | null; byId: Map<string, string> }

const EMPTY: LineWhys = { order: null, byId: new Map() }

async function fetchWhys(): Promise<{ items: { id: string; why: string }[] | null }> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return { items: null }
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const res = await fetch('/api/line', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ tz }),
  })
  if (!res.ok) throw new Error(`line ${res.status}`)
  return (await res.json()) as { items: { id: string; why: string }[] | null }
}

export const lineWhysKey = ['line-whys'] as const

export function useLineWhys(enabled: boolean): Proven<LineWhys> {
  const q = proven(
    useQuery({
      queryKey: lineWhysKey,
      queryFn: fetchWhys,
      enabled,
      staleTime: 30_000,
    }),
  )
  return useMemo(() => {
    if (!q.proven) return q
    const items = q.value.items
    if (!items || items.length === 0) return { proven: true, value: EMPTY }
    return {
      proven: true,
      value: {
        order: items.map((i) => i.id),
        byId: new Map(items.map((i) => [i.id, i.why])),
      },
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.proven, q.proven ? q.value : null])
}

/**
 * The ranking is an ENHANCEMENT, not content. An unproven ranking means
 * the Line renders in its own honest default order with no why lines —
 * nothing is missing from view, so nothing claims to be, and no failure
 * line is owed. Callers must ask for this BY NAME; it is no longer
 * hidden inside a catch where it read as success.
 */
export function orDefaultOrder(p: Proven<LineWhys>): LineWhys {
  return p.proven ? p.value : EMPTY
}
