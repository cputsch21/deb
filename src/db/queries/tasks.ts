import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { transient } from '../../lib/undo'
import { proven, type Proven } from '../proof'
import { assertRowChanged, capText, optimisticWrite } from '../mutate'
import { DELEGATE_MAX, NOTES_MAX, TITLE_MAX, type Task } from '../types'

export const taskKeys = { all: ['tasks'] as const }

async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(
      TASK_COLS,
    )
    .is('deleted_at', null)
    .order('created_at')
  if (error) throw error
  return data
}

const TASK_COLS =
  'id, project_id, goal_id, recurring_id, title, notes, done_at, touched_at, anchored_on, delegated_to, chase_on, delegated_on, source_entry_id, source_excerpt, materialized_on, created_at, deleted_at, position'

/**
 * THE BOARD'S DELETED COLUMN — a SECOND query, deliberately not a
 * widening of the first (B1 Phase B, the trap one layer above RLS).
 *
 * The database is happy to undelete: the tasks update policy is
 * `using (user_id = auth.uid())` and says nothing about deleted_at, so
 * a soft-deleted row stays visible to the statement that would bring it
 * back. But `fetchTasks` filters `.is('deleted_at', null)`, so those
 * rows never reach the client at all — the Deleted column would have
 * rendered permanently, provably empty while holding real rows, and
 * "drag it back out" would have been a promise with nothing to grab.
 *
 * Relaxing that filter was the tempting fix and the wrong one: every
 * other reader of `useTasks` — the Line, Triage, the counts — assumes
 * deleted rows are absent, and each would have had to re-filter. One
 * forgotten re-filter is a deleted task reappearing on the board. So
 * the deleted rows get their own door, and only the board opens it.
 */
export const deletedTaskKeys = { all: ['tasks', 'deleted'] as const }

export function useDeletedTasks(enabled: boolean): Proven<Task[]> {
  return proven(
    useQuery({
      queryKey: deletedTaskKeys.all,
      enabled,
      queryFn: async (): Promise<Task[]> => {
        const { data, error } = await supabase
          .from('tasks')
          .select(TASK_COLS)
          .not('deleted_at', 'is', null)
          .order('deleted_at', { ascending: false })
          .limit(100)
        if (error) throw error
        return data
      },
    }),
  )
}

/**
 * EMPTINESS MUST BE EARNED: this hook does not hand out an array. A
 * caller cannot reach the rows without proving the read succeeded, so
 * `const { data: tasks = [] } = useTasks()` — the line that rendered
 * "Clear. Every loop has a verdict" over a dead connection — no longer
 * compiles. See src/db/proof.ts.
 */
export function useTasks(): Proven<Task[]> {
  return proven(useQuery({ queryKey: taskKeys.all, queryFn: fetchTasks }))
}

const nowISO = () => new Date().toISOString()

/** Replace the row if the cache already holds it, append if not — so a
 *  card arriving in a cache it had left does not duplicate. */
const upsertRow = (old: Task[], row: Task): Task[] =>
  old.some((t) => t.id === row.id) ? old.map((t) => (t.id === row.id ? row : t)) : [...old, row]

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
      notes: null,
      done_at: null,
      touched_at: nowISO(),
      anchored_on: null,
      delegated_to: null,
      chase_on: null,
      delegated_on: null,
      source_entry_id: null,
      source_excerpt: null,
      materialized_on: null,
      created_at: nowISO(),
      deleted_at: null,
      position: null, // untouched column — Deb's ranking still holds
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

  /** Any meaningful edit resets the Bench-fade clock (touched_at).
   *  The M4 verdicts ride this same door: anchored_on (Do/Delay) and the
   *  delegated_to + chase_on pair (Delegate) — capped at write time. */
  const update = (
    id: string,
    fields: Partial<
      Pick<
        Task,
        | 'title'
        | 'project_id'
        | 'goal_id'
        | 'done_at'
        | 'anchored_on'
        | 'delegated_to'
        | 'chase_on'
        | 'delegated_on'
        | 'notes'
        // B1: the board writes both. `deleted_at` is here because the
        // Deleted column is a two-way door — soft delete and its
        // reversal are the same statement in opposite directions, and
        // `remove()` only ever goes one way.
        | 'deleted_at'
        | 'position'
      >
    >,
  ) => {
    const next = { ...fields, touched_at: nowISO() }
    if (next.title !== undefined) {
      next.title = capText(next.title, TITLE_MAX)
      if (!next.title) return
    }
    if (next.notes != null) next.notes = capText(next.notes, NOTES_MAX)
    if (next.delegated_to != null) {
      next.delegated_to = capText(next.delegated_to, DELEGATE_MAX)
      if (!next.delegated_to) return
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

  /**
   * Soft delete. Never a confirm, never a hard delete. `announce` shows the
   * undo pill (the default); Deb's act-then-correct undo passes false — the
   * "Added" pill is already the safety net, so undoing it shouldn't chain a
   * second "deleted" pill.
   */
  const remove = (id: string, announce = true) => {
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
    if (announce && row) transient.undo(`"${row.title}" deleted`, () => restore(row))
  }

  /**
   * A BOARD DROP. One row, one write, and it may cross the live/deleted
   * boundary in either direction — so it patches BOTH caches rather
   * than the live one only. `update()` cannot do this: it patches
   * `taskKeys.all`, and a card dragged into Deleted would vanish from
   * the live cache and never appear in the deleted one until a refetch.
   *
   * The patch is never assembled here. It arrives from `patchFor()`,
   * whole. See src/lib/bucket.ts for why a partial is the bug.
   */
  const move = (task: Task, patch: Partial<Task>) => {
    const next = { ...task, ...patch, touched_at: nowISO() }
    const nowDeleted = next.deleted_at !== null
    void optimisticWrite(qc, {
      keys: [taskKeys.all, deletedTaskKeys.all],
      patch: () => {
        patchAll((old) =>
          nowDeleted ? old.filter((t) => t.id !== task.id) : upsertRow(old, next),
        )
        qc.setQueryData<Task[]>(deletedTaskKeys.all, (old = []) =>
          nowDeleted ? upsertRow(old, next) : old.filter((t) => t.id !== task.id),
        )
      },
      persist: async () => {
        const { data, error } = await supabase
          .from('tasks')
          .update({ ...patch, touched_at: nowISO() })
          .eq('id', task.id)
          .select('id')
        assertRowChanged(data, error, `move task ${task.id}`)
      },
      onFail: "That move didn't save — put back.",
    })
  }

  /**
   * A COLUMN CLAIMS ITS ORDER — every visible card in it, in their
   * current order, in ONE statement (B1 Phase D).
   *
   * THIS IS THE ONLY PLACE IN THE BOARD WHERE ONE GESTURE WRITES MANY
   * ROWS, and how it is bounded matters: it is a single `upsert`, not a
   * loop of `update`s. A loop of N round trips can half-succeed, and a
   * half-claimed column is exactly the half-Deb half-hand state that
   * Phase D exists to forbid — it would fail INTO the illegal state.
   * One statement either lands or does not.
   *
   * It is bounded a second way: it only ever writes the cards the
   * column is showing (one page, ten), never the whole table.
   */
  const claimOrder = (rows: { id: string; position: number }[]) => {
    if (rows.length === 0) return
    const byId = new Map(rows.map((r) => [r.id, r.position]))
    void optimisticWrite(qc, {
      keys: [taskKeys.all],
      patch: () =>
        patchAll((old) =>
          old.map((t) => (byId.has(t.id) ? { ...t, position: byId.get(t.id)! } : t)),
        ),
      persist: async () => {
        const { data, error } = await supabase
          .from('tasks')
          .upsert(rows, { onConflict: 'id' })
          .select('id')
        assertRowChanged(data, error, `claim order (${rows.length} rows)`)
      },
      onFail: "That order didn't save — put back.",
    })
  }

  return { create, update, setDone, remove, restore, move, claimOrder }
}
