import { useEffect } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { localDayString, rhythmFiresOn } from './day'
import { taskKeys } from '../db/queries/tasks'

/**
 * Materialization: each rhythm becomes a normal task on its day, in the
 * user's local timezone. A day the app never opened is simply a day the
 * task never existed — a missed one is noise, never a backlog (S21).
 * Idempotent three ways: the last_materialized_on stamp, the database's
 * one-task-per-rhythm-per-day index, and 23505 (duplicate) treated as done.
 */
export async function materializeDue(qc: QueryClient): Promise<void> {
  const { data: rhythms, error } = await supabase
    .from('recurring_tasks')
    .select('id, project_id, title, cadence, weekly_days, monthly_day, last_materialized_on')
    .is('deleted_at', null)
  if (error || !rhythms) return

  const today = new Date()
  const day = localDayString(today)
  let made = false

  for (const r of rhythms) {
    if (r.last_materialized_on === day) continue
    if (!rhythmFiresOn(r, today)) continue

    const { error: insertError } = await supabase.from('tasks').insert({
      id: crypto.randomUUID(),
      title: r.title,
      project_id: r.project_id,
      recurring_id: r.id,
      materialized_on: day,
    })
    if (insertError && insertError.code !== '23505') continue // fail quiet, retry next open

    await supabase
      .from('recurring_tasks')
      .update({ last_materialized_on: day })
      .eq('id', r.id)
      .select('id')
    made = true
  }

  if (made) await qc.invalidateQueries({ queryKey: taskKeys.all })
}

/** Runs at app open and whenever the app comes back into view. */
export function useMaterializer() {
  const qc = useQueryClient()
  useEffect(() => {
    void materializeDue(qc)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void materializeDue(qc)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [qc])
}
