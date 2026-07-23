import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { transient } from '../../lib/undo'
import { assertRowChanged, capText, optimisticWrite } from '../mutate'
import { TITLE_MAX, type Task } from '../types'

export const taskKeys = { all: ['tasks'] as const }

async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(
      'id, project_id, goal_id, recurring_id, title, done_at, touched_at, materialized_on, created_at, deleted_at',
    )
    .is('deleted_at', null)
    .order('created_at')
  if (error) throw error
  return data
}

export function useTasks() {
  return useQuery({ queryKey: taskKeys.all, queryFn: fetchTasks })
}

const nowISO = () => new Date().toISOString()

export function useTaskMutations() {
  const qc = useQueryClient()
  const patchAll = (fn: (old: Task[]) => Task[]) =>
    qc.setQueryData<Task[]>(taskKeys.all, (old = []) => fn(old))

  /**
   * Every submitted line becomes a task verbatim (M1 composer ruling).
   * No project and no goal = the Bench.
   */
  const create = (
    title: string,
    home: { projectId?: string; goalId?: string } = {},
  ): string | null => {
    const row: Task = {
      id: crypto.randomUUID(),
      project_id: home.projectId ?? null,
      goal_id: home.goalId ?? null,
      recurring_id: null,
      title: capText(title, TITLE_MAX),
      done_at: null,
      touched_at: nowISO(),
      materialized_on: null,
      created_at: nowISO(),
      deleted_at: null,
    }
    if (!row.title) return null
    void optimisticWrite(qc, {
      keys: [taskKeys.all],
      patch: () => patchAll((old) => [...old, row]),
      persist: async () => {
        const { error } = await supabase.from('tasks').insert({
          id: row.id,
          project_id: row.project_id,
          goal_id: row.goal_id,
          title: row.title,
        })
        if (error) throw error
      },
      onFail: `Couldn't save "${row.title}" — removed.`,
    })
    return row.id
  }

  /** Any meaningful edit resets the Bench-fade clock (touched_at). */
  const update = (
    id: string,
    fields: Partial<Pick<Task, 'title' | 'project_id' | 'goal_id' | 'done_at'>>,
  ) => {
    const next = { ...fields, touched_at: nowISO() }
    if (next.title !== undefined) {
      next.title = capText(next.title, TITLE_MAX)
      if (!next.title) return
    }
    void optimisticWrite(qc, {
      keys: [taskKeys.all],
      patch: () => patchAll((old) => old.map((t) => (t.id === id ? { ...t, ...next } : t))),
      persist: async () => {
        const { data, error } = await supabase
          .from('tasks')
          .update(next)
          .eq('id', id)
          .select('id')
        assertRowChanged(data, error, `task ${id}`)
      },
      onFail: "That change didn't save — put back.",
    })
  }

  const setDone = (id: string, done: boolean) =>
    update(id, { done_at: done ? nowISO() : null })

  const restore = (row: Task) => {
    void optimisticWrite(qc, {
      keys: [taskKeys.all],
      patch: () => patchAll((old) => [...old, { ...row, deleted_at: null }]),
      persist: async () => {
        const { data, error } = await supabase
          .from('tasks')
          .update({ deleted_at: null, touched_at: nowISO() })
          .eq('id', row.id)
          .select('id')
        assertRowChanged(data, error, `restore task ${row.id}`)
      },
      onFail: "Couldn't bring it back — try again.",
    })
  }

  /** Soft delete + the undo pill. Never a confirm, never a hard delete. */
  const remove = (id: string) => {
    const row = qc.getQueryData<Task[]>(taskKeys.all)?.find((t) => t.id === id)
    void optimisticWrite(qc, {
      keys: [taskKeys.all],
      patch: () => patchAll((old) => old.filter((t) => t.id !== id)),
      persist: async () => {
        const { data, error } = await supabase
          .from('tasks')
          .update({ deleted_at: nowISO() })
          .eq('id', id)
          .is('deleted_at', null)
          .select('id')
        assertRowChanged(data, error, `delete task ${id}`)
      },
      onFail: "Couldn't delete that — it's back.",
    })
    if (row) transient.undo(`"${row.title}" deleted`, () => restore(row))
  }

  return { create, update, setDone, remove, restore }
}
