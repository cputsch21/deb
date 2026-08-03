import { userClient } from './_lib/context.js'

/**
 * /api/drops — READ-ONLY DIAGNOSTIC (F2, Aug 1 2026).
 *
 * The evidence path, in the pattern that already worked for redistill:
 * Chris hits it from his own browser session, so RLS applies unchanged,
 * no service-role key is involved, and no new credential exists.
 *
 * COUNTS AND SHAPES ONLY. No raw entry content in a response body, ever —
 * ids, counts and word-lengths are enough to answer "how bad has it been"
 * and nothing more is owed to a diagnostic.
 *
 * It is DIAGNOSTIC, NOT A GATE. The ledger records going forward
 * regardless of what this says; this only measures what already happened.
 *
 * NO BACKFILL (Ruling D): pre-existing damage surfaces HERE, derived from
 * current state — an entry whose distillate is null is real evidence.
 * Inventing ledger rows for events nobody observed would be manufacturing
 * evidence to make history look consistent, which is an unearned empty
 * state pointed backwards.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

type Row = Record<string, unknown>

export async function POST(request: Request): Promise<Response> {
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'unauthorized' }, 401)
  const db = userClient(token)
  const { data: userData, error: authError } = await db.auth.getUser(token)
  if (authError || !userData?.user) return json({ error: 'unauthorized' }, 401)

  try {
    // 1 · the ledger's own histogram — what it has recorded
    const { data: log, error: logError } = await db
      .from('ingest_log')
      .select('source, outcome, entry_id, created_at')
      .order('created_at', { ascending: false })
      .limit(1000)
    if (logError) throw logError

    const byOutcome: Record<string, number> = {}
    const bySource: Record<string, number> = {}
    for (const r of (log ?? []) as Row[]) {
      byOutcome[String(r.outcome)] = (byOutcome[String(r.outcome)] ?? 0) + 1
      bySource[String(r.source)] = (bySource[String(r.source)] ?? 0) + 1
    }

    // 2 · pre-existing damage, DERIVED — entries the record shows with no
    //     distillate. These predate the ledger and were never logged.
    const { data: entries, error: entriesError } = await db
      .from('entries')
      .select('id, entry_day, source, distillate')
      .is('deleted_at', null)
      .order('entry_day', { ascending: false })
    if (entriesError) throw entriesError

    const rows = (entries ?? []) as Row[]
    const undistilled = rows.filter((e) => !e.distillate || !String(e.distillate).trim())

    // THE JOIN (F4). `outcome: 'filed'` was the only thing the old code
    // could say about a landing, so it said it whether or not a distillate
    // came with it. This counts how often it was covering an empty page —
    // the question F2 was built on, answered with a number instead of an
    // argument. Counts only; no ids of entry CONTENT cross the wire.
    const filedIds = new Set(
      ((log ?? []) as Row[])
        .filter((r) => r.outcome === 'filed' && r.entry_id)
        .map((r) => String(r.entry_id)),
    )
    const undistilledIds = new Set(undistilled.map((e) => String(e.id)))
    const filedAndUndistilled = [...filedIds].filter((id) => undistilledIds.has(id)).length

    return json({
      generatedFor: 'diagnosis only — the ledger records regardless',
      ledger: {
        rowsScanned: (log ?? []).length,
        byOutcome,
        bySource,
      },
      overlap: {
        filedRowsWithAnEntry: filedIds.size,
        // how many `filed` rows were covering an entry with no distillate
        filedAndUndistilled,
      },
      record: {
        entries: rows.length,
        withoutDistillate: undistilled.length,
        // SHAPES, NOT CONTENT: the day and the mouth locate it; the raw
        // is never echoed into a response body.
        undistilled: undistilled.slice(0, 50).map((e) => ({
          id: String(e.id),
          day: String(e.entry_day),
          source: String(e.source ?? 'unknown'),
        })),
      },
    })
  } catch (err) {
    console.error('[drops]', err)
    // an empty result and a failed read are different on the wire
    return json({ error: 'the diagnosis could not be read' }, 500)
  }
}
