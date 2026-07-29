// Row shapes for the spine tables (supabase/2026-07-22_m1_spine.sql).
// user_id is deliberately absent: the database stamps and checks it —
// the client never sends or reads it.

/** Length caps — mirrored in the schema; enforced again at write time. */
export const NAME_MAX = 80
export const TITLE_MAX = 200
export const MESSAGE_MAX = 4000
export const MISSION_MAX = 200
export const DELEGATE_MAX = 80

export const FACT_MAX = 500
export const RAW_MAX = 60000
export const DISTILLATE_MAX = 8000

/** The record's surface rows (M5). The raw beneath lives in entry_raw,
 *  physically immutable — the client never reads it except one tap under
 *  the distillate (T5). */
export type EntrySource = 'plaud' | 'remarkable' | 'filed' | 'email'

/** What rode beside an emailed entry (E1, July 28): the raw stays
 *  verbatim; the envelope lives here. `unreadable` = the payload held no
 *  text we could reach — the honest couldn't-read state, never a silent
 *  drop. */
export type EntrySourceMeta = {
  channel?: 'email'
  from?: string
  subject?: string
  date?: string // the email's own Date header — her receipts may cite it
  attachments?: { name: string; type: string; text: boolean }[]
  unreadable?: boolean
}

export type EntryMeta = {
  id: string
  project_id: string | null
  source: EntrySource
  entry_day: string
}

/** A page's entry: the distillate on the page, the raw one tap beneath.
 *  `spoken_in` = the lens at the moment of filing (null = silver) — the
 *  thread ruling (July 28): the filed object renders where the paste
 *  happened; the entry lives in Read wearing its routed project_id. */
export type Entry = {
  id: string
  raw_id: string
  project_id: string | null
  spoken_in: string | null
  source: EntrySource
  source_meta: EntrySourceMeta | null
  distillate: string | null
  entry_day: string
  created_at: string
}

/** Deb's margin notes — five kinds (T6 + the ritual batch, July 28).
 *  'answer' carries `question`: the detected question it serves, anchored
 *  beside it on the page. */
export type NoteKind = 'receipt' | 'read' | 'keep' | 'question' | 'answer'

export type EntryNote = {
  id: string
  entry_id: string
  kind: NoteKind
  content: string
  question: string | null
  created_at: string
}

/** A living entry's superseded versions (ritual ruling 3): append-only —
 *  every raw snapshot kept, the surface beside it, immutability by RLS. */
export type EntryRevision = {
  id: string
  entry_id: string
  raw_id: string
  distillate: string | null
  created_at: string
}

/** Everything Deb knows — visible, editable, forgettable. Never hard-deleted. */
export type FactSource = 'conversation' | 'chris' | 'seed'

export type KnownFact = {
  id: string
  content: string
  source: FactSource
  created_at: string
  deleted_at: string | null
}

/** The one thread. Append-only in the DB; project_id = the lens it was said in. */
export type MessageRole = 'user' | 'deb'

export type Message = {
  id: string
  project_id: string | null
  role: MessageRole
  content: string
  created_at: string
}

export type Project = {
  id: string
  name: string
  color: string // #rrggbb
  /** One line, distilled from the intake interview. Null until the world is given. */
  mission: string | null
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
  /** THE one verdict field (M4): null = undecided (the stack deals it);
   *  Do → today; Delay → its chosen day (wakes on the Line, not the stack). */
  anchored_on: string | null
  /** ← Delegate: who + when, always together. Off the plate until chase day. */
  delegated_to: string | null
  chase_on: string | null
  /** M5: minted cards wear their source entry ("From Tuesday's Plaud call"). */
  source_entry_id: string | null
  materialized_on: string | null
  created_at: string
  deleted_at: string | null
}

/** One arrival at the filing engine (the Arrivals ledger, July 28) —
 *  append-only by RLS; rejects carry metadata only, never body content. */
export type ArrivalOutcome =
  | 'filed'
  | 'versioned'
  | 'unreadable'
  | 'duplicate'
  | 'dropped_sender'
  | 'dropped_signature'
  | 'dropped_recipient'
  | 'dropped_shape'
  | 'failed'

export type Arrival = {
  id: string
  source: 'composer' | 'email' | 'plaud' | 'remarkable'
  sender: string | null
  summary: string | null
  outcome: ArrivalOutcome
  entry_id: string | null
  created_at: string
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
