import { supabase } from '../../lib/supabase'

/**
 * THE CLIENT-SIDE DROP WRITER (F2, Aug 1 2026).
 *
 * `materialize.ts` runs in the browser, so the one drop it can record has
 * to be written from there. RLS permits the insert (`user_id = auth.uid()`)
 * and that is correct.
 *
 * WHAT IS NOT CORRECT is a general-purpose client-side arrival writer. The
 * browser would then be able to author rows attributed to the email chute
 * — a forged arrival, in the one table whose entire value is that nothing
 * can edit it afterwards. RLS cannot tell a real chute row from a forged
 * one; both are `user_id = auth.uid()`.
 *
 * TYPES CAN. This function has no `source` parameter and no `outcome`
 * parameter — not ones that happen to be passed correctly, ones that do
 * not exist. A chute-shaped call is a compile error, and
 * `src/db/proof.compile-test.tsx` holds that error in place. Same argument
 * as `Proven<T>`: remove the capability and the discipline is not required.
 *
 * Best-effort, exactly like `logArrival` on the server: a failed ledger
 * write must never break the thing it was recording.
 */
export async function recordRhythmDrop(input: {
  rhythmId: string
  title: string
  /** the Postgres error code, when there was one */
  code: string | null
  message: string
}): Promise<void> {
  const { error } = await supabase.from('ingest_log').insert({
    source: 'rhythm',
    outcome: 'not_materialized',
    // the rhythm's title is the only human-readable handle it has; it is
    // metadata about the thing that was lost, not a sentence about it
    summary: input.title.slice(0, 200),
    sender: null,
    entry_id: null,
    detail: {
      stage: 'materialize',
      rhythmId: input.rhythmId,
      title: input.title,
      code: input.code,
      message: input.message.slice(0, 500),
    },
  })
  if (error) console.error('[drops] rhythm drop not recorded', error)
}
