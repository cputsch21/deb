import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { assertRowChanged } from '../mutate'
import type { Entry, EntryMeta, EntryNote } from '../types'

/**
 * The record's surface, client side (M5). Only the meta the rooms need:
 * provenance for minted cards ("From Tuesday's Plaud call") and the
 * filing undo. The raw is never fetched here — it stays beneath the
 * distillate, one tap away, in the Read room (T5).
 */
export const entryKeys = {
  meta: ['entries-meta'] as const,
  pages: ['entries-pages'] as const,
  notes: ['entry-notes'] as const,
  raw: (rawId: string) => ['entry-raw', rawId] as const,
}

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
    void qc.invalidateQueries({ queryKey: entryKeys.pages })
  }

  const unhide = async (id: string) => {
    const { data, error } = await supabase
      .from('entries')
      .update({ deleted_at: null })
      .eq('id', id)
      .select('id')
    assertRowChanged(data, error, `restore entry ${id}`)
    void qc.invalidateQueries({ queryKey: entryKeys.meta })
    void qc.invalidateQueries({ queryKey: entryKeys.pages })
  }

  return { hide, unhide }
}


/** The pages: recent entries in full (distillate included; raw stays behind). */
async function fetchEntries(): Promise<Entry[]> {
  const { data, error } = await supabase
    .from('entries')
    .select('id, raw_id, project_id, spoken_in, source, distillate, entry_day, created_at')
    .is('deleted_at', null)
    .order('entry_day', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(120)
  if (error) throw error
  return data as Entry[]
}

export function useEntries() {
  return useQuery({ queryKey: entryKeys.pages, queryFn: fetchEntries })
}

/** Deb's margin notes for the recent pages. */
async function fetchEntryNotes(): Promise<EntryNote[]> {
  const { data, error } = await supabase
    .from('entry_notes')
    .select('id, entry_id, kind, content, created_at')
    .is('deleted_at', null)
    .order('created_at')
    .limit(300)
  if (error) throw error
  return data as EntryNote[]
}

export function useEntryNotes() {
  return useQuery({ queryKey: entryKeys.notes, queryFn: fetchEntryNotes })
}

/** The raw beneath — fetched only when the tap asks for it. */
export function useEntryRaw(rawId: string, enabled: boolean) {
  return useQuery({
    queryKey: entryKeys.raw(rawId),
    enabled,
    staleTime: Infinity, // the raw is immutable by law — it cannot change
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase
        .from('entry_raw')
        .select('content')
        .eq('id', rawId)
        .single()
      if (error) throw error
      return String(data.content)
    },
  })
}
