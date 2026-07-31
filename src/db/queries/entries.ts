import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { assertRowChanged } from '../mutate'
import { proven, type Proven } from '../proof'
import type { Entry, EntryMeta, EntryNote, EntryRevision } from '../types'

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
  revisions: (entryId: string) => ['entry-revisions', entryId] as const,
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

export function useEntryMeta(): Proven<EntryMeta[]> {
  return proven(useQuery({ queryKey: entryKeys.meta, queryFn: fetchEntryMeta }))
}

/** The day the record began — the masthead's edition count runs from it
 *  (time, not performance; July 29). Includes hidden entries: the record
 *  began when it began. */
export function useFirstEntryDay(): Proven<string | null> {
  return proven(
    useQuery({
      queryKey: ['first-entry-day'] as const,
      staleTime: 60 * 60_000, // it changes once, ever
      queryFn: async (): Promise<string | null> => {
        const { data, error } = await supabase
          .from('entries')
          .select('entry_day')
          .order('entry_day', { ascending: true })
          .limit(1)
        if (error) throw error
        return data && data.length > 0 ? String(data[0].entry_day) : null
      },
    }),
  )
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

  /**
   * Undo of a version drop (ritual ruling 3, approved JC): restore the
   * prior version — surface back, new notes aside, old notes returned.
   * Never deletes the entry; the appended revision row stays (append-only
   * history tolerates a superseded snapshot that came back).
   */
  const revertVersion = async (input: {
    entryId: string
    prevRawId: string
    prevDistillate: string | null
    newNoteIds: string[]
    oldNoteIds: string[]
  }) => {
    const { data, error } = await supabase
      .from('entries')
      .update({ raw_id: input.prevRawId, distillate: input.prevDistillate })
      .eq('id', input.entryId)
      .select('id')
    assertRowChanged(data, error, `revert entry ${input.entryId}`)
    if (input.newNoteIds.length > 0) {
      await supabase
        .from('entry_notes')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', input.newNoteIds)
    }
    if (input.oldNoteIds.length > 0) {
      await supabase.from('entry_notes').update({ deleted_at: null }).in('id', input.oldNoteIds)
    }
    void qc.invalidateQueries({ queryKey: entryKeys.meta })
    void qc.invalidateQueries({ queryKey: entryKeys.pages })
    void qc.invalidateQueries({ queryKey: entryKeys.notes })
  }

  /** Move an entry between worlds (E5's undo path) — row-checked. */
  const refile = async (entryId: string, projectId: string | null) => {
    const { data, error } = await supabase
      .from('entries')
      .update({ project_id: projectId })
      .eq('id', entryId)
      .select('id')
    assertRowChanged(data, error, `refile entry ${entryId}`)
    void qc.invalidateQueries({ queryKey: entryKeys.meta })
    void qc.invalidateQueries({ queryKey: entryKeys.pages })
  }

  return { hide, unhide, revertVersion, refile }
}


/** The pages: recent entries in full (distillate included; raw stays behind). */
async function fetchEntries(): Promise<Entry[]> {
  const { data, error } = await supabase
    .from('entries')
    .select('id, raw_id, project_id, spoken_in, source, source_meta, distillate, entry_day, created_at')
    .is('deleted_at', null)
    .order('entry_day', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(120)
  if (error) throw error
  return data as Entry[]
}

export function useEntries(): Proven<Entry[]> {
  return proven(useQuery({ queryKey: entryKeys.pages, queryFn: fetchEntries }))
}

/** Deb's margin notes for the recent pages. */
async function fetchEntryNotes(): Promise<EntryNote[]> {
  const { data, error } = await supabase
    .from('entry_notes')
    .select('id, entry_id, kind, content, question, created_at')
    .is('deleted_at', null)
    .order('created_at')
    .limit(300)
  if (error) throw error
  return data as EntryNote[]
}

export function useEntryNotes(): Proven<EntryNote[]> {
  return proven(useQuery({ queryKey: entryKeys.notes, queryFn: fetchEntryNotes }))
}

/** A living entry's prior versions (ritual ruling 3), newest first —
 *  fetched only when the reader lifts the page. */
export function useEntryRevisions(entryId: string, enabled: boolean): Proven<EntryRevision[]> {
  return proven(useQuery({
    queryKey: entryKeys.revisions(entryId),
    enabled,
    queryFn: async (): Promise<EntryRevision[]> => {
      const { data, error } = await supabase
        .from('entry_revisions')
        .select('id, entry_id, raw_id, distillate, created_at')
        .eq('entry_id', entryId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as EntryRevision[]
    },
  }))
}

/** The raw beneath — fetched only when the tap asks for it. */
export function useEntryRaw(rawId: string, enabled: boolean): Proven<string> {
  return proven(useQuery({
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
  }))
}
