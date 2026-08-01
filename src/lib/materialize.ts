import { useEffect } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { localDayString, rhythmFiresOn } from './day'
import { taskKeys } from '../db/queries/tasks'
import { recordRhythmDrop } from '../db/queries/drops'

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
  // STOP SWALLOWING (ruling, July 31). A rhythm that fails to materialize
  // is not a rendering lie — it is work that should have happened and
  // silently didn't, which is NO SILENT DROPS, and that law's ledger is
  // F2's first move. Deliberately NOT built here: this throws so the
  // caller can see it, and nothing more. F2 inherits the recording.
  if (error) throw error
  if (!rhythms) return

  const today = new Date()
  const day = localDayString(today)
  let made = false
  const dropped: string[] = []

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
    // 23505 is the duplicate-index backstop: ALREADY MATERIALIZED TODAY,
    // which is a success. It must never reach the ledger — a ledger that
    // records non-drops as drops teaches you to stop reading it inside a
    // week, and then it is worse than nothing.
    if (insertError && insertError.code === '23505') continue
    if (insertError) {
      // NO SILENT DROPS (F2): the durable record first, then the throw.
      // Drops are still collected and raised AFTER the loop, never thrown
      // mid-flight — aborting here would drop every remaining rhythm to
      // report the first one, which is more silent dropping, not less.
      await recordRhythmDrop({
        rhythmId: String(r.id),
        title: String(r.title),
        code: insertError.code ?? null,
        message: insertError.message,
      })
      dropped.push(`${r.title}: ${insertError.message}`)
      continue
    }

    await supabase
      .from('recurring_tasks')
      .update({ last_materialized_on: day })
      .eq('id', r.id)
      .select('id')
    made = true
  }

  // whatever DID materialize lands first — a partial success is still a
  // success and the tasks belong on the page before anything is raised
  if (made) await qc.invalidateQueries({ queryKey: taskKeys.all })
  if (dropped.length > 0) {
    throw new Error(`${dropped.length} rhythm(s) did not materialize — ${dropped.join(' · ')}`)
  }
}

/** Runs at app open and whenever the app comes back into view. */
export function useMaterializer() {
  const qc = useQueryClient()
  useEffect(() => {
    const run = () =>
      void materializeDue(qc).catch((err) => {
        // Visible, not silent. The honest surface for a dropped rhythm is
        // F2's ledger; until it exists this is where it stops being
        // invisible, and it never takes the page down with it.
        console.error('[materialize] a rhythm did not materialize', err)
      })
    run()
    const onVisible = () => {
      if (document.visibilityState === 'visible') run()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [qc])
}
