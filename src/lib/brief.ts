import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'

/**
 * The V1.5 morning brief (July 28 ruling) — today's shape from the spine,
 * her note where she has one. The server derives, gates by signature, and
 * caches per app-day; this hook only asks. Waiting-on-arrival by law: it
 * runs on load, never on a timer, and nothing here tracks whether the
 * brief was read.
 */
export type BriefItem = {
  id: string
  kind: 'line' | 'chase' | 'goal' | 'keep'
  title: string
  world: string | null
  projectId: string | null
  detail: string
  note: string | null
}

export type Brief = { appDay: string | null; items: BriefItem[] | null; noted: boolean }

/** The brief belongs to the morning: it generates on first load after 4am
 *  local. Before that, today's page simply opens plain. */
export function afterDawn(): boolean {
  return new Date().getHours() >= 4
}

async function fetchBrief(): Promise<Brief> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return { appDay: null, items: null, noted: false }
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const res = await fetch('/api/brief', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ tz }),
  })
  if (!res.ok) throw new Error('brief fetch failed')
  return (await res.json()) as Brief
}

export const briefKey = ['brief'] as const

export function useBrief(enabled: boolean) {
  return useQuery({
    queryKey: briefKey,
    queryFn: fetchBrief,
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
  })
}
