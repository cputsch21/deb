// Row shapes for the spine tables (supabase/2026-07-22_m1_spine.sql).
// user_id is deliberately absent: the database stamps and checks it —
// the client never sends or reads it.

/** Length caps — mirrored in the schema; enforced again at write time. */
export const NAME_MAX = 80
export const TITLE_MAX = 200

export type Project = {
  id: string
  name: string
  color: string // #rrggbb
  created_at: string
  deleted_at: string | null
}

export type GoalStatus = 'active' | 'done' | 'dropped'

export type Goal = {
  id: string
  project_id: string
  title: string
  status: GoalStatus
  resolved_at: string | null
  created_at: string
  deleted_at: string | null
}

export type Task = {
  id: string
  project_id: string | null // null + null goal = the Bench
  goal_id: string | null
  recurring_id: string | null
  title: string
  done_at: string | null
  touched_at: string // the Bench-fade clock
  materialized_on: string | null
  created_at: string
  deleted_at: string | null
}

export type Cadence = 'daily' | 'weekly' | 'monthly'

export type RecurringTask = {
  id: string
  project_id: string | null
  title: string
  cadence: Cadence
  weekly_days: number[] | null // 0=Sun … 6=Sat
  monthly_day: number | null
  last_materialized_on: string | null
  created_at: string
  deleted_at: string | null
}
