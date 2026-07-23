import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { transient } from '../../lib/undo'
import { assertRowChanged, capText, optimisticWrite } from '../mutate'
import { NAME_MAX, type Project } from '../types'

export const projectKeys = { all: ['projects'] as const }

async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, color, created_at, deleted_at')
    .is('deleted_at', null)
    .order('created_at')
  if (error) throw error
  return data
}

export function useProjects() {
  return useQuery({ queryKey: projectKeys.all, queryFn: fetchProjects })
}

const nowISO = () => new Date().toISOString()

export function useProjectMutations() {
  const qc = useQueryClient()
  const patchAll = (fn: (old: Project[]) => Project[]) =>
    qc.setQueryData<Project[]>(projectKeys.all, (old = []) => fn(old))

  /** Returns the new project's id (usable immediately — id is client-born). */
  const create = (name: string, color: string): string | null => {
    const row: Project = {
      id: crypto.randomUUID(),
      name: capText(name, NAME_MAX),
      color,
      created_at: nowISO(),
      deleted_at: null,
    }
    if (!row.name) return null
    void optimisticWrite(qc, {
      keys: [projectKeys.all],
      patch: () => patchAll((old) => [...old, row]),
      persist: async () => {
        const { error } = await supabase
          .from('projects')
          .insert({ id: row.id, name: row.name, color: row.color })
        if (error) throw error
      },
      onFail: `Couldn't create "${row.name}" — removed.`,
    })
    return row.id
  }

  const update = (id: string, fields: Partial<Pick<Project, 'name' | 'color'>>) => {
    const next = { ...fields }
    if (next.name !== undefined) {
      next.name = capText(next.name, NAME_MAX)
      if (!next.name) return
    }
    void optimisticWrite(qc, {
      keys: [projectKeys.all],
      patch: () => patchAll((old) => old.map((p) => (p.id === id ? { ...p, ...next } : p))),
      persist: async () => {
        const { data, error } = await supabase
          .from('projects')
          .update(next)
          .eq('id', id)
          .select('id')
        assertRowChanged(data, error, `project ${id}`)
      },
      onFail: "That change didn't save — put back.",
    })
  }

  const restore = (row: Project) => {
    void optimisticWrite(qc, {
      keys: [projectKeys.all],
      patch: () => patchAll((old) => [...old, { ...row, deleted_at: null }]),
      persist: async () => {
        const { data, error } = await supabase
          .from('projects')
          .update({ deleted_at: null })
          .eq('id', row.id)
          .select('id')
        assertRowChanged(data, error, `restore project ${row.id}`)
      },
      onFail: "Couldn't bring it back — try again.",
    })
  }

  /** Soft delete + the undo pill. Never a confirm, never a hard delete. */
  const remove = (id: string) => {
    const row = qc.getQueryData<Project[]>(projectKeys.all)?.find((p) => p.id === id)
    void optimisticWrite(qc, {
      keys: [projectKeys.all],
      patch: () => patchAll((old) => old.filter((p) => p.id !== id)),
      persist: async () => {
        const { data, error } = await supabase
          .from('projects')
          .update({ deleted_at: nowISO() })
          .eq('id', id)
          .is('deleted_at', null)
          .select('id')
        assertRowChanged(data, error, `delete project ${id}`)
      },
      onFail: "Couldn't delete that — it's back.",
    })
    if (row) transient.undo(`${row.name} deleted`, () => restore(row))
  }

  return { create, update, remove, restore }
}
