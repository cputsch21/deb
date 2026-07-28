import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'

/**
 * The morning brief (V1.5; ritual ruling 1, July 28 — the brief follows
 * the pages). This hook only READS: generation is drop-driven (her reply
 * to the morning pages) or asked for through her generate_brief hand.
 * `invited: true` means no brief exists today — the page opens with the
 * one warm line. Nothing here tracks whether anything was read.
 */
export type BriefItem = {
  id: string
  kind: 'today' | 'line' | 'chase' | 'goal' | 'keep'
  title: string
  world: string | null
  projectId: string | null
  detail: string
  note: string | null
}

export type Brief = {
  appDay: string | null
  items: BriefItem[] | null
  noted: boolean
  invited?: boolean
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
