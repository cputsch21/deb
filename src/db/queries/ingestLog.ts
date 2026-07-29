import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Arrival } from '../types'

/**
 * The Arrivals ledger, read side (July 28): everything that ever arrived
 * at the filing engine, newest first. Read-only by design AND by RLS —
 * no mutation hook exists for this table, deliberately. The last 30 days
 * by default; "earlier" reaches the whole record (capped).
 */
export const arrivalKeys = {
  list: (reach: 'recent' | 'all') => ['arrivals', reach] as const,
}

const RECENT_DAYS = 30
const REACH_CAP = 500

export function useArrivals(enabled: boolean, reach: 'recent' | 'all') {
  return useQuery({
    queryKey: arrivalKeys.list(reach),
    enabled,
    queryFn: async (): Promise<Arrival[]> => {
      let q = supabase
        .from('ingest_log')
        .select('id, source, sender, summary, outcome, entry_id, created_at')
        .order('created_at', { ascending: false })
        .limit(reach === 'all' ? REACH_CAP : 200)
      if (reach === 'recent') {
        q = q.gte(
          'created_at',
          new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000).toISOString(),
        )
      }
      const { data, error } = await q
      if (error) throw error
      return data as Arrival[]
    },
  })
}
