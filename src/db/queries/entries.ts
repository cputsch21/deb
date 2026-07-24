import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { assertRowChanged } from '../mutate'
import type { EntryMeta } from '../types'

/**
 * The record's surface, client side (M5). Only the meta the rooms need:
 * provenance for minted cards ("From Tuesday's Plaud call") and the
 * filing undo. The raw is never fetched here — it stays beneath the
 * distillate, one tap away, in the Read room (T5).
 */
export const entryKeys = { meta: ['entries-meta'] as const }

async function fetchEntryMeta(): Promise<EntryMeta[]> {
  const { data, error } = await supabase
    .from('entries')
    .select('id, project_id, source, entry_day')
    .is('deleted_at', null)
    .order('entry_day', { ascending: false })
    .limit(200)
  if (error) throw error
  return data as EntryMeta[]
}

export function useEntryMeta() {
  return useQuery({ queryKey: entryKeys.meta, queryFn: fetchEntryMeta })
}

/** Hide the entry surface (undo-of-filing). The raw beneath is untouchable. */
export function useEntryMutations() {
  const qc = useQueryClient()

  const hide = async (id: string) => {
    const { data, error } = await supabase
      .from('entries')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
      .select('id')
    assertRowChanged(data, error, `hide entry ${id}`)
    void qc.invalidateQueries({ queryKey: entryKeys.meta })
  }

  const unhide = async (id: string) => {
    const { data, error } = await supabase
      .from('entries')
      .update({ deleted_at: null })
      .eq('id', id)
      .select('id')
    assertRowChanged(data, error, `restore entry ${id}`)
    void qc.invalidateQueries({ queryKey: entryKeys.meta })
  }

  return { hide, unhide }
}
