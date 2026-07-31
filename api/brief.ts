import { todayKeyInTz, userClient } from './_lib/context.js'

/**
 * /api/brief — READ-ONLY since ritual ruling 1 (July 28): the brief
 * follows the pages. Generation is drop-driven (api/chat files the pages
 * and builds the brief as part of that turn) or asked-for through her
 * generate_brief hand — this endpoint only reports what's waiting.
 * No cache for today → `invited: true`, and the page shows the one warm
 * line. Nothing here tracks whether anything was read.
 */

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

export async function POST(request: Request): Promise<Response> {
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Not signed in.' }, 401)
  const db = userClient(token)
  const { data: userData, error: authError } = await db.auth.getUser(token)
  if (authError || !userData?.user) return json({ error: 'Not signed in.' }, 401)

  let tz = 'UTC'
  try {
    const body = (await request.json()) as { tz?: unknown }
    if (typeof body.tz === 'string' && body.tz) tz = body.tz
  } catch {
    /* default tz */
  }

  try {
    const today = todayKeyInTz(tz)
    const { data, error } = await db
      .from('brief_cache')
      .select('app_day, items')
      .maybeSingle()
    if (error) throw error
    if (data?.app_day === today) {
      return json({ appDay: today, items: data.items, noted: true, invited: false }, 200)
    }
    // no brief yet today — the page opens with the invitation
    return json({ appDay: today, items: null, noted: false, invited: true }, 200)
  } catch (err) {
    // AN EMPTY RESULT AND A FAILED READ MUST BE DIFFERENT ON THE WIRE
    // (law, July 31). This used to answer 200 with items:null — the same
    // shape as "no brief yet" — which does not merely lie to the client,
    // it makes the client's proof UNSOUND: Proven<T> infers success from
    // the transport, so the gate would mark a failed read proven and
    // render "no brief" as a verified fact about Chris's morning. A hole
    // under the floor, not a crack in the wall.
    //
    // The legitimate empty case still answers 200 with invited:true, and
    // MorningBrief's invitation path is untouched.
    console.error('[brief]', err)
    return json({ error: 'The brief could not be read.' }, 500)
  }
}
