import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { proven, type Proven } from '../proof'
import { transient } from '../../lib/undo'
import { assertRowChanged, capText, optimisticWrite } from '../mutate'
import { FACT_MAX, type FactSource, type KnownFact } from '../types'

/** The visible half of memory: read, edit, forget — all with undo, nothing hidden. */
export const factKeys = { all: ['facts'] as const }

async function fetchFacts(): Promise<KnownFact[]> {
  const { data, error } = await supabase
    .from('known_facts')
    .select('id, content, source, created_at, deleted_at')
    .is('deleted_at', null)
    .order('created_at')
  if (error) throw error
  return data as KnownFact[]
}

export function useFacts(): Proven<KnownFact[]> {
  return proven(useQuery({ queryKey: factKeys.all, queryFn: fetchFacts }))
}

const nowISO = () => new Date().toISOString()

export function useFactMutations() {
  const qc = useQueryClient()
  const patchAll = (fn: (old: KnownFact[]) => KnownFact[]) =>
    qc.setQueryData<KnownFact[]>(factKeys.all, (old = []) => fn(old))

  /** Teach Deb something durable. From the memory room, that's Chris's own hand. */
  const remember = (content: string, source: FactSource = 'chris'): string | null => {
    const row: KnownFact = {
      id: crypto.randomUUID(),
      content: capText(content, FACT_MAX),
      source,
      created_at: nowISO(),
      deleted_at: null,
    }
    if (!row.content) return null
    void optimisticWrite(qc, {
      keys: [factKeys.all],
      patch: () => patchAll((old) => [...old, row]),
      persist: async () => {
        const { error } = await supabase
          .from('known_facts')
          .insert({ id: row.id, content: row.content, source: row.source })
        if (error) throw error
      },
      onFail: "Couldn't save that — removed.",
    })
    return row.id
  }

  const edit = (id: string, content: string) => {
    const next = capText(content, FACT_MAX)
    if (!next) return
    void optimisticWrite(qc, {
      keys: [factKeys.all],
      patch: () => patchAll((old) => old.map((f) => (f.id === id ? { ...f, content: next } : f))),
      persist: async () => {
        const { data, error } = await supabase
          .from('known_facts')
          .update({ content: next })
          .eq('id', id)
          .select('id')
        assertRowChanged(data, error, `fact ${id}`)
      },
      onFail: "That edit didn't save — put back.",
    })
  }

  const restore = (row: KnownFact) => {
    void optimisticWrite(qc, {
      keys: [factKeys.all],
      patch: () => patchAll((old) => [...old, { ...row, deleted_at: null }]),
      persist: async () => {
        const { data, error } = await supabase
          .from('known_facts')
          .update({ deleted_at: null })
          .eq('id', row.id)
          .select('id')
        assertRowChanged(data, error, `restore fact ${row.id}`)
      },
      onFail: "Couldn't bring it back — try again.",
    })
  }

  /** Forget = soft delete (deleted_at). Never a hard delete; always an undo. */
  const forget = (id: string, announce = true) => {
    const row = qc.getQueryData<KnownFact[]>(factKeys.all)?.find((f) => f.id === id)
    void optimisticWrite(qc, {
      keys: [factKeys.all],
      patch: () => patchAll((old) => old.filter((f) => f.id !== id)),
      persist: async () => {
        const { data, error } = await supabase
          .from('known_facts')
          .update({ deleted_at: nowISO() })
          .eq('id', id)
          .is('deleted_at', null)
          .select('id')
        assertRowChanged(data, error, `forget fact ${id}`)
      },
      onFail: "Couldn't forget that — it's back.",
    })
    if (announce && row) transient.undo('Forgotten', () => restore(row))
  }

  return { remember, edit, forget, restore }
}
