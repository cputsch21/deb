import Anthropic from '@anthropic-ai/sdk'
import { userClient } from './_lib/context.js'
import {
  distillOnly,
  overruns,
  requiredWords,
  violatesFloor,
  wordCount,
  FLOOR_ABS_MAX,
  FLOOR_ABS_MIN,
  FLOOR_MIN_SOURCE_WORDS,
  FLOOR_RATIO,
  type CeilingPath,
} from './_lib/distill.js'

/**
 * /api/redistill — the ONE-TIME corpus re-distill (R2, July 30 2026).
 *
 * Entries filed before the extractive spec + ceiling kept their old,
 * over-long distillates; the display clamp only hides that. This job
 * re-derives each one FROM ITS UNTOUCHED RAW under the new rules.
 *
 * The laws it works under:
 *   · THE RAW IS NEVER TOUCHED. Only `entries.distillate` is written —
 *     entry_raw has no update policy at all (immutability by RLS), so
 *     this physically cannot destroy an original.
 *   · NOTHING ELSE MOVES. No routing, no minting, no margin notes: the
 *     entry's world, its cards and its notes are already settled. This
 *     re-derives the distillate and only the distillate.
 *   · IDEMPOTENT AND RE-RUNNABLE. Default mode touches only entries whose
 *     current distillate breaks the ceiling, so a completed pass makes the
 *     next run a no-op — it converges. `mode: "all"` forces a full
 *     re-derive; `dryRun: true` reports without writing.
 *   · Runs under the caller's own JWT: RLS scopes it to his rows. No
 *     service role, per the standing invariant.
 *
 * It reports which enforcement path fired per entry (clean · regenerated ·
 * fallback). A high fallback rate means the prompt is still wrong, and
 * that should be visible here rather than on the page.
 */

const BATCH_DEFAULT = 8 // serverless timeouts are real; the job resumes

type Row = Record<string, unknown>

export async function POST(request: Request): Promise<Response> {
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'unauthorized' }, 401)
  const db = userClient(token)
  const { data: userData, error: authError } = await db.auth.getUser(token)
  if (authError || !userData?.user) return json({ error: 'unauthorized' }, 401)

  let body: { mode?: unknown; dryRun?: unknown; limit?: unknown } = {}
  try {
    body = (await request.json()) as typeof body
  } catch {
    // an empty body is fine — the defaults are the safe path
  }
  const mode = body.mode === 'all' ? 'all' : 'over'
  const dryRun = body.dryRun === true
  const limit = Math.min(Math.max(Number(body.limit) || BATCH_DEFAULT, 1), 25)

  const { data: entries, error } = await db
    .from('entries')
    .select('id, raw_id, distillate, entry_day, source')
    .is('deleted_at', null)
    .order('entry_day', { ascending: true })
  if (error) {
    console.error('[redistill] load failed', error)
    return json({ error: 'could not load the record' }, 500)
  }

  const all = (entries ?? []) as Row[]
  // the work list: everything, or only what currently breaks the ceiling
  const candidates = all.filter((e) => {
    const d = typeof e.distillate === 'string' ? e.distillate : ''
    if (mode === 'all') return d.length > 0 || !!e.raw_id
    return d.length > 0 && overruns(d)
  })
  const batch = candidates.slice(0, limit)

  const anthropic = new Anthropic()
  const paths: Record<CeilingPath, number> = { clean: 0, regenerated: 0, fallback: 0 }
  // Every measure carries its UNIT in its name. The July 30 report called
  // a word count `before`, it was read as characters, and the conclusion
  // drawn from it was wrong. An instrument that can be misread is a bug in
  // the instrument.
  type Result = {
    id: string
    day: string
    beforeWords: number
    beforeChars: number
    afterWords: number
    afterChars: number
    /** afterWords / beforeWords — 0.03 is the "Agenda" rewrite */
    kept: number
    path: CeilingPath
    distillate: string
  }
  const results: Result[] = []
  const refusals: (Result & { requiredWords: number; keptDistillate: string })[] = []
  let failed = 0

  for (const entry of batch) {
    const id = String(entry.id)
    const existing = typeof entry.distillate === 'string' ? entry.distillate : ''
    const beforeWords = wordCount(existing)
    try {
      const { data: rawRow, error: rawError } = await db
        .from('entry_raw')
        .select('content')
        .eq('id', String(entry.raw_id))
        .single()
      if (rawError || !rawRow) throw rawError ?? new Error('raw missing')
      const raw = String((rawRow as Row).content ?? '')
      if (!raw.trim()) {
        console.warn(`[redistill] ${id}: empty raw, skipped`)
        continue
      }

      const out = await distillOnly(anthropic, raw)
      if (!out || !out.text) throw new Error('no distillate produced')

      const measured: Result = {
        id,
        day: String(entry.entry_day),
        beforeWords,
        beforeChars: existing.length,
        afterWords: wordCount(out.text),
        afterChars: out.text.length,
        kept: beforeWords > 0 ? Number((wordCount(out.text) / beforeWords).toFixed(3)) : 1,
        path: out.path,
        distillate: out.text,
      }

      // A REWRITE MAY NEVER BE WORSE THAN THE STATUS QUO. A refusal is a
      // FAILURE, not a path: the existing line stays, nothing is written,
      // and it is counted and itemized rather than left to be inferred.
      if (violatesFloor(beforeWords, out.text)) {
        refusals.push({ ...measured, requiredWords: requiredWords(beforeWords), keptDistillate: existing })
        console.error(
          `[redistill] ${id} REFUSED — would have gone ${beforeWords} → ${measured.afterWords} words: ${JSON.stringify(out.text)}`,
        )
        continue
      }

      if (!dryRun) {
        // the ONLY write this job performs — the raw beneath is untouched
        const { data: updated, error: writeError } = await db
          .from('entries')
          .update({ distillate: out.text })
          .eq('id', id)
          .select('id')
        if (writeError || !updated || updated.length === 0) {
          throw writeError ?? new Error('zero rows updated')
        }
      }

      paths[out.path]++
      results.push(measured)
      console.log(
        `[redistill] ${id} (${String(entry.entry_day)}): ${beforeWords} → ${measured.afterWords} words · ${out.path}`,
      )
    } catch (err) {
      failed++
      console.error(`[redistill] ${id} FAILED`, err)
    }
  }

  const longest = [...results].sort((a, b) => b.afterWords - a.afterWords).slice(0, 5)
  // the mirror of `longest`, and the one that would have caught July 30:
  // the rewrites that threw the most away
  const mostReduced = [...results].sort((a, b) => a.kept - b.kept).slice(0, 5)
  const fallbackRate = results.length ? paths.fallback / results.length : 0

  const report = {
    dryRun,
    mode,
    floor: {
      ratio: FLOOR_RATIO,
      absMin: FLOOR_ABS_MIN,
      absMax: FLOOR_ABS_MAX,
      bindsAbove: FLOOR_MIN_SOURCE_WORDS,
    },
    entriesInRecord: all.length,
    needingWork: candidates.length,
    processed: batch.length,
    rewritten: results.length,
    refused: refusals.length,
    failed,
    // A counter that structurally cannot reach zero gets ignored within two
    // runs, and then it is decoration. `pending` is work the job can still
    // do and must converge to zero; `refused` is work it has correctly
    // declined and will decline again until the extractor changes. Two
    // facts, two numbers, neither able to hide inside the other.
    remaining: {
      pending: Math.max(0, candidates.length - batch.length),
      refused: refusals.length,
    },
    paths,
    fallbackRate: Number(fallbackRate.toFixed(2)),
    stillOverCeiling: results.filter((r) => overruns(r.distillate)).length,
    longest,
    mostReduced,
    refusals,
  }
  console.log(
    '[redistill] report',
    JSON.stringify({ ...report, longest: longest.length, mostReduced: mostReduced.length }),
  )
  return json(report)
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
