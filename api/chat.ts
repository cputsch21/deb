import Anthropic from '@anthropic-ai/sdk'
import { randomUUID } from 'node:crypto'
import { DEB_IDENTITY, SILENT_SENTINEL } from './_lib/identity'
import {
  MESSAGE_MAX,
  buildHistory,
  capText,
  factsBlock,
  loadContext,
  stateBlock,
  userClient,
} from './_lib/context'

/**
 * /api/chat — Deb's voice.
 * One turn: persist the user's line, assemble her mind (three cache
 * tiers + windowed day-stamped history), stream her reply, persist it.
 * The [[SILENT]] choice is buffered server-side: the client sees nothing
 * until she has decided to speak.
 *
 * Wire format: newline-delimited JSON —
 *   {type:'delta', text}  {type:'done', id, content}  {type:'silent'}  {type:'error', message}
 */

const MODEL = 'claude-opus-4-8'

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

  let body: { content?: unknown; projectId?: unknown; tz?: unknown }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Bad request.' }, 400)
  }
  const content = capText(String(body.content ?? ''), MESSAGE_MAX)
  if (!content) return json({ error: 'Nothing to say.' }, 400)
  const projectId = typeof body.projectId === 'string' ? body.projectId : null
  const tz = typeof body.tz === 'string' && body.tz ? body.tz : 'UTC'

  // The user's line joins the thread first — the thread is truth even if
  // the model call fails after this point.
  const userMessageId = randomUUID()
  const { error: insertError } = await db.from('messages').insert({
    id: userMessageId,
    role: 'user',
    content,
    project_id: projectId,
  })
  if (insertError) return json({ error: 'Your message could not be saved.' }, 500)

  const ctx = await loadContext(db)

  const system = [
    { type: 'text' as const, text: DEB_IDENTITY, cache_control: { type: 'ephemeral' as const } },
    { type: 'text' as const, text: factsBlock(ctx.facts), cache_control: { type: 'ephemeral' as const } },
  ]
  const messages = [
    ...buildHistory(ctx, userMessageId, tz),
    {
      role: 'user' as const,
      content: [
        { type: 'text' as const, text: stateBlock(ctx, projectId, tz) },
        { type: 'text' as const, text: content },
      ],
    },
  ]

  const anthropic = new Anthropic()
  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 2048,
    thinking: { type: 'adaptive' },
    system,
    messages,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))

      // The silence buffer: nothing reaches the client until we know
      // she's speaking. While the text so far is a prefix of the
      // sentinel, keep holding.
      let buffer = ''
      let decided = false
      let silent = false

      try {
        for await (const event of stream) {
          if (event.type !== 'content_block_delta' || event.delta.type !== 'text_delta') continue
          if (decided) {
            if (!silent) send({ type: 'delta', text: event.delta.text })
            continue
          }
          buffer += event.delta.text
          const sofar = buffer.trimStart()
          if (sofar.startsWith(SILENT_SENTINEL)) {
            decided = true
            silent = true
          } else if (!SILENT_SENTINEL.startsWith(sofar)) {
            decided = true
            send({ type: 'delta', text: buffer })
          }
        }

        const final = await stream.finalMessage()
        const full = final.content
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('')
        const trimmed = full.trim()

        if (!decided) {
          // stream ended while still ambiguous (very short output)
          silent = trimmed === '' || trimmed.startsWith(SILENT_SENTINEL)
          if (!silent) send({ type: 'delta', text: full })
        }

        if (silent || !trimmed) {
          send({ type: 'silent' })
        } else {
          const replyId = randomUUID()
          const reply = capText(trimmed, MESSAGE_MAX)
          const { error: replyError } = await db.from('messages').insert({
            id: replyId,
            role: 'deb',
            content: reply,
            project_id: projectId,
          })
          // honest either way: the client learns whether her words landed in the record
          send({ type: 'done', id: replyId, content: reply, saved: !replyError })
        }
      } catch (err) {
        console.error('[chat]', err)
        send({ type: 'error', message: 'Deb could not answer just now.' })
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
