import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { transient } from '../../lib/undo'
import { assertRowChanged, capText, optimisticWrite } from '../mutate'
import { TITLE_MAX, type Cadence, type RecurringTask } from '../types'

export const recurringKeys = { all: ['recurring'] as const }

async function fetchRecurring(): Promise<RecurringTask[]> {
  const { data, error } = await supabase
    .from('recurring_tasks')
    .select(
      'id, project_id, title, cadence, weekly_days, monthly_day, last_materialized_on, created_at, deleted_at',
    )
    .is('deleted_at', null)
    .order('created_at')
  if (error) throw error
  return data
}

export function useRecurring() {
  return useQuery({ queryKey: recurringKeys.all, queryFn: fetchRecurring })
}

const nowISO = () => new Date().toISOString()

export function useRecurringMutations() {
  const qc = useQueryClient()
  const patchAll = (fn: (old: RecurringTask[]) => RecurringTask[]) =>
    qc.setQueryData<RecurringTask[]>(recurringKeys.all, (old = []) => fn(old))

  const create = (
    title: string,
    spec: {
      cadence: Cadence
      weeklyDays?: number[]
      monthlyDay?: number
      projectId?: string
    },
  ): string | null => {
    const row: RecurringTask = {
      id: crypto.randomUUID(),
      project_id: spec.projectId ?? null,
      title: capText(title, TITLE_MAX),
      cadence: spec.cadence,
      weekly_days: spec.cadence === 'weekly' ? (spec.weeklyDays ?? []) : null,
      monthly_day: spec.cadence === 'monthly' ? (spec.monthlyDay ?? 1) : null,
      last_materialized_on: null,
      created_at: nowISO(),
      deleted_at: null,
    }
    if (!row.title) return null
    if (row.cadence === 'weekly' && !row.weekly_days?.length) return null
    void optimisticWrite(qc, {
      keys: [recurringKeys.all],
      patch: () => patchAll((old) => [...old, row]),
      persist: async () => {
        const { error } = await supabase.from('recurring_tasks').insert({
          id: row.id,
          project_id: row.project_id,
          title: row.title,
          cadence: row.cadence,
          weekly_days: row.weekly_days,
          monthly_day: row.monthly_day,
        })
        if (error) throw error
      },
      onFail: `Couldn't save the rhythm "${row.title}" — removed.`,
    })
    return row.id
  }

  const restore = (row: RecurringTask) => {
    void optimisticWrite(qc, {
      keys: [recurringKeys.all],
      patch: () => patchAll((old) => [...old, { ...row, deleted_at: null }]),
      persist: async () => {
        const { data, error } = await supabase
          .from('recurring_tasks')
          .update({ deleted_at: null })
          .eq('id', row.id)
          .select('id')
        assertRowChanged(data, error, `restore rhythm ${row.id}`)
      },
      onFail: "Couldn't bring it back — try again.",
    })
  }

  /** Retiring a rhythm never touches the tasks it already made. */
  const remove = (id: string) => {
    const row = qc.getQueryData<RecurringTask[]>(recurringKeys.all)?.find((r) => r.id === id)
    void optimisticWrite(qc, {
      keys: [recurringKeys.all],
      patch: () => patchAll((old) => old.filter((r) => r.id !== id)),
      persist: async () => {
        const { data, error } = await supabase
          .from('recurring_tasks')
          .update({ deleted_at: nowISO() })
          .eq('id', id)
          .is('deleted_at', null)
          .select('id')
        assertRowChanged(data, error, `delete rhythm ${id}`)
      },
      onFail: "Couldn't retire that — it's back.",
    })
    if (row) transient.undo(`Rhythm "${row.title}" retired`, () => restore(row))
  }

  return { create, remove, restore }
}
