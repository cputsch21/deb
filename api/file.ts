import Anthropic from '@anthropic-ai/sdk'
import { generateBrief } from './_lib/brief.js'
import { capText, RAW_MAX, userClient } from './_lib/context.js'
import { performFiling } from './_lib/filing.js'

/**
 * /api/file — the page slot's mouth (July 29 channel-law triptych: the
 * composer converses · email files · the page slot files). The third
 * inlet, feeding the one throat: material goes through the standard
 * engine — routing, distillation, margins, answers, minting, versioning
 * against the living day-entry — with NO conversational engagement. The
 * in-app equivalent of the email chute, under the user's own JWT (RLS
 * does the guarding; no service role here). The engine logs the arrival
 * with the slot named in the ledger's FROM column.
 *
 * Quiet-channel semantics: no message rows, no `say`, no stream. The
 * materialization on the page is the receipt; the response carries what
 * the standard undo pill needs.
 */
export async function POST(request: Request): Promise<Response> {
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'unauthorized' }, 401)
  const db = userClient(token)
  const { data: userData, error: authError } = await db.auth.getUser(token)
  if (authError || !userData?.user) return json({ error: 'unauthorized' }, 401)

  let body: { text?: unknown; lens?: unknown; tz?: unknown }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return json({ error: 'bad request' }, 400)
  }
  const raw = capText(String(body.text ?? ''), RAW_MAX)
  if (!raw) return json({ error: 'nothing to file' }, 400)
  const lens = typeof body.lens === 'string' && body.lens ? body.lens : null
  const tz = typeof body.tz === 'string' && body.tz ? body.tz : 'UTC'

  try {
    const filing = await performFiling(db, raw, tz, {
      spokenIn: lens, // the thread law: where the words were dropped
      channel: 'chat', // his own words, in-app — standard framing
      ledgerFrom: 'the page slot',
    })

    // the brief follows the pages (drop-driven), quietly — the pin stays
    // honest; a refresh failure never breaks the filing
    try {
      await generateBrief(db, new Anthropic(), tz, filing.todayWords)
    } catch (err) {
      console.error('[file] brief refresh', err)
    }

    return json({
      entryId: filing.entryId,
      worldName: filing.worldName,
      taskIds: filing.taskIds,
      versioned: filing.versioned,
    })
  } catch (err) {
    console.error('[file] filing failed', err)
    return json({ error: 'That could not be filed — nothing was lost. Try again.' }, 500)
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
