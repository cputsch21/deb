import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { transient } from '../../lib/undo'
import { assertRowChanged, capText, optimisticWrite } from '../mutate'
import { TITLE_MAX, type Goal, type GoalStatus } from '../types'

export const goalKeys = { all: ['goals'] as const }

async function fetchGoals(): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('id, project_id, title, status, resolved_at, created_at, deleted_at')
    .is('deleted_at', null)
    .order('created_at')
  if (error) throw error
  return data
}

export function useGoals() {
  return useQuery({ queryKey: goalKeys.all, queryFn: fetchGoals })
}

const nowISO = () => new Date().toISOString()

export function useGoalMutations() {
  const qc = useQueryClient()
  const patchAll = (fn: (old: Goal[]) => Goal[]) =>
    qc.setQueryData<Goal[]>(goalKeys.all, (old = []) => fn(old))

  const create = (projectId: string, title: string): string | null => {
    const row: Goal = {
      id: crypto.randomUUID(),
      project_id: projectId,
      title: capText(title, TITLE_MAX),
      status: 'active',
      resolved_at: null,
      created_at: nowISO(),
      deleted_at: null,
    }
    if (!row.title) return null
    void optimisticWrite(qc, {
      keys: [goalKeys.all],
      patch: () => patchAll((old) => [...old, row]),
      persist: async () => {
        const { error } = await supabase
          .from('goals')
          .insert({ id: row.id, project_id: row.project_id, title: row.title })
        if (error) throw error
      },
      onFail: `Couldn't create "${row.title}" — removed.`,
    })
    return row.id
  }

  const update = (id: string, fields: Partial<Pick<Goal, 'title'>>) => {
    const next = { ...fields }
    if (next.title !== undefined) {
      next.title = capText(next.title, TITLE_MAX)
      if (!next.title) return
    }
    void optimisticWrite(qc, {
      keys: [goalKeys.all],
      patch: () => patchAll((old) => old.map((g) => (g.id === id ? { ...g, ...next } : g))),
      persist: async () => {
        const { data, error } = await supabase
          .from('goals')
          .update(next)
          .eq('id', id)
          .select('id')
        assertRowChanged(data, error, `goal ${id}`)
      },
      onFail: "That change didn't save — put back.",
    })
  }

  /**
   * The permanent verdict — done forever or dropped forever.
   * The UI's one centered confirm guards this; the database guard
   * (.eq status active) makes re-verdicting impossible even by accident.
   * Deliberately no undo.
   */
  const verdict = (id: string, status: Exclude<GoalStatus, 'active'>) => {
    const stamp = nowISO()
    void optimisticWrite(qc, {
      keys: [goalKeys.all],
      patch: () =>
        patchAll((old) =>
          old.map((g) => (g.id === id ? { ...g, status, resolved_at: stamp } : g)),
        ),
      persist: async () => {
        const { data, error } = await supabase
          .from('goals')
          .update({ status, resolved_at: stamp })
          .eq('id', id)
          .eq('status', 'active')
          .select('id')
        assertRowChanged(data, error, `goal ${id} → ${status}`)
      },
      onFail: "The verdict didn't save — the goal is still open.",
    })
  }

  const restore = (row: Goal) => {
    void optimisticWrite(qc, {
      keys: [goalKeys.all],
      patch: () => patchAll((old) => [...old, { ...row, deleted_at: null }]),
      persist: async () => {
        const { data, error } = await supabase
          .from('goals')
          .update({ deleted_at: null })
          .eq('id', row.id)
          .select('id')
        assertRowChanged(data, error, `restore goal ${row.id}`)
      },
      onFail: "Couldn't bring it back — try again.",
    })
  }

  /** Soft delete + the undo pill (deleting a goal ≠ a verdict on it). */
  const remove = (id: string) => {
    const row = qc.getQueryData<Goal[]>(goalKeys.all)?.find((g) => g.id === id)
    void optimisticWrite(qc, {
      keys: [goalKeys.all],
      patch: () => patchAll((old) => old.filter((g) => g.id !== id)),
      persist: async () => {
        const { data, error } = await supabase
          .from('goals')
          .update({ deleted_at: nowISO() })
          .eq('id', id)
          .is('deleted_at', null)
          .select('id')
        assertRowChanged(data, error, `delete goal ${id}`)
      },
      onFail: "Couldn't delete that — it's back.",
    })
    if (row) transient.undo(`"${row.title}" deleted`, () => restore(row))
  }

  return { create, update, verdict, remove, restore }
}
