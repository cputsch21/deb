import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { DEB_IDENTITY, SILENT_SENTINEL } from './_lib/identity.js'
import {
  FACT_MAX,
  MESSAGE_MAX,
  TASK_TITLE_MAX,
  buildHistory,
  capText,
  factsBlock,
  loadContext,
  stateBlock,
  userClient,
} from './_lib/context.js'

/**
 * /api/chat — Deb's voice AND her hands.
 * One turn: persist the user's line, assemble her mind (three cache tiers +
 * windowed day-stamped history), then run her turn — she may act (create a
 * task, act-then-correct) before she speaks. Her spoken reply is streamed,
 * buffered for the [[SILENT]] choice, and persisted.
 *
 * Wire format: newline-delimited JSON —
 *   {type:'delta', text}
 *   {type:'action', kind:'task_created', id, title}   — a write she made
 *   {type:'done', id, content, saved}
 *   {type:'silent'}
 *   {type:'error', message}
 */

const MODEL = 'claude-opus-4-8'
const MAX_HOPS = 5

/** Her one hand for now: create a task. Server stamps the lens; she picks the words. */
const CREATE_TASK: Anthropic.Tool = {
  name: 'create_task',
  description: `Create a task on Chris's list when he says something actionable that is HIS to do ("I owe Larry an invoice", "remind me to call the contractor", "I need to book Grace's dentist"). Act-then-correct: it exists the instant you call this, and then your words carry the confirmation — briefly, in your voice. ONLY call it for a real to-do that belongs to Chris. Do NOT call it for something he is musing about, asking a question about, delegating to someone else, or that already exists on the list (check the current state first — never re-create a task that is already there). The task lands in whatever lens he is speaking from; you do not choose where it goes.`,
  input_schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description:
          'The task as a clean imperative, not a transcript: "Invoice Larry", not "i owe larry an invoice". Under 200 characters.',
      },
    },
    required: ['title'],
  },
}

/** Remember a durable fact — the write half of memory. Facts ride the slow cache tier. */
const REMEMBER: Anthropic.Tool = {
  name: 'remember',
  description: `Store a durable fact about Chris or his world when you learn something worth keeping across every future conversation — a stable preference, a relationship, a constraint, a commitment pattern ("Weekends are family time", "Larry is the CTDI auditor", "Prefers hard conversations early in the day"). Remember DELIBERATELY: durable truths, not the passing detail of today, and never something you already know (it is all in WHAT YOU KNOW, above). Everything you remember is visible to Chris — he can edit or forget any of it.`,
  input_schema: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'The fact in one clear sentence, in your own words. Under 500 characters.',
      },
    },
    required: ['content'],
  },
}

/** Recall — the read half: search her memory and the thread for something specific. */
const RECALL: Anthropic.Tool = {
  name: 'recall',
  description: `Search your memory and the thread for something specific — a name, a promise, a number, a moment — especially when it may be older than the recent conversation you can already see. Use it to ground a receipt in real dates before you assert a pattern; never invent a date. Returns matching facts and past lines with their dates.`,
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'A word or short phrase to search for.',
      },
    },
    required: ['query'],
  },
}

const TOOLS: Anthropic.Tool[] = [CREATE_TASK, REMEMBER, RECALL]

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
  const convo: Anthropic.MessageParam[] = [
    ...(buildHistory(ctx, userMessageId, tz) as Anthropic.MessageParam[]),
    {
      role: 'user',
      content: [
        { type: 'text', text: stateBlock(ctx, projectId, tz) },
        { type: 'text', text: content },
      ],
    },
  ]

  const anthropic = new Anthropic()
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))

      // The silence buffer, carried across tool hops: nothing reaches the
      // client until we know she is speaking (or she acts — acting is not
      // silence). While the text so far is a prefix of the sentinel, hold.
      let buffer = ''
      let decided = false
      let silent = false
      let acted = false
      let reply = '' // her spoken text, accumulated across hops

      const flushBuffer = () => {
        if (!decided) {
          decided = true
          silent = false
          if (buffer.trim()) send({ type: 'delta', text: buffer })
        }
      }

      try {
        for (let hop = 0; hop < MAX_HOPS; hop++) {
          const stream = anthropic.messages.stream({
            model: MODEL,
            max_tokens: 2048,
            thinking: { type: 'adaptive' },
            system,
            messages: convo,
            tools: TOOLS,
          })

          for await (const event of stream) {
            if (event.type !== 'content_block_delta' || event.delta.type !== 'text_delta') continue
            const text = event.delta.text
            if (decided) {
              if (!silent) send({ type: 'delta', text })
              continue
            }
            buffer += text
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
          const turnText = final.content
            .filter((b): b is Anthropic.TextBlock => b.type === 'text')
            .map((b) => b.text)
            .join('')
          if (silent !== true) reply += turnText

          const toolUses = final.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
          )
          if (final.stop_reason !== 'tool_use' || toolUses.length === 0) break

          // She acted — that is never silence. Flush any held preamble.
          acted = true
          flushBuffer()

          // Echo her turn back unchanged (thinking + tool_use blocks preserved),
          // then execute each tool and answer with its result.
          convo.push({
            role: 'assistant',
            content: final.content as unknown as Anthropic.MessageParam['content'],
          })
          const results: Anthropic.ToolResultBlockParam[] = []
          for (const use of toolUses) {
            const r =
              use.name === 'create_task'
                ? await createTask(db, use, projectId, send)
                : use.name === 'remember'
                  ? await remember(db, use, send)
                  : use.name === 'recall'
                    ? await recall(db, use)
                    : { content: `Unknown tool: ${use.name}`, is_error: true }
            results.push({
              type: 'tool_result',
              tool_use_id: use.id,
              content: r.content,
              is_error: r.is_error,
            })
          }
          convo.push({ role: 'user', content: results })
        }

        const trimmed = reply.trim()
        const nothingToSay =
          !trimmed || trimmed === SILENT_SENTINEL || trimmed.startsWith(SILENT_SENTINEL)

        if ((silent && !acted) || nothingToSay) {
          // She chose silence, or acted without narrating — no assistant row.
          // Any action she took already reached the client and the record.
          send({ type: 'silent' })
        } else {
          const replyId = randomUUID()
          const clean = capText(trimmed, MESSAGE_MAX)
          const { error: replyError } = await db.from('messages').insert({
            id: replyId,
            role: 'deb',
            content: clean,
            project_id: projectId,
          })
          send({ type: 'done', id: replyId, content: clean, saved: !replyError })
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

/** Execute create_task: RLS-scoped insert, length-capped, then tell the client. */
async function createTask(
  db: SupabaseClient,
  use: Anthropic.ToolUseBlock,
  projectId: string | null,
  send: (event: Record<string, unknown>) => void,
): Promise<{ content: string; is_error: boolean }> {
  const input = (use.input ?? {}) as { title?: unknown }
  const title = capText(String(input.title ?? ''), TASK_TITLE_MAX)
  if (!title) return { content: 'No title given — nothing was created.', is_error: true }

  const id = randomUUID()
  const { error } = await db.from('tasks').insert({ id, title, project_id: projectId })
  if (error) {
    console.error('[chat] create_task', error)
    return { content: 'The write failed — the task was NOT created. Tell Chris plainly.', is_error: true }
  }

  send({ type: 'action', kind: 'task_created', id, title })
  return {
    content: `Created "${title}" (id ${id}). It is on his list now — do not create it again.`,
    is_error: false,
  }
}

/** Execute remember: RLS-scoped insert into known_facts (the slow tier), then tell the client. */
async function remember(
  db: SupabaseClient,
  use: Anthropic.ToolUseBlock,
  send: (event: Record<string, unknown>) => void,
): Promise<{ content: string; is_error: boolean }> {
  const input = (use.input ?? {}) as { content?: unknown }
  const content = capText(String(input.content ?? ''), FACT_MAX)
  if (!content) return { content: 'No content given — nothing was remembered.', is_error: true }

  const id = randomUUID()
  const { error } = await db.from('known_facts').insert({ id, content, source: 'conversation' })
  if (error) {
    console.error('[chat] remember', error)
    return { content: 'The write failed — it was NOT remembered. Tell Chris plainly.', is_error: true }
  }

  send({ type: 'action', kind: 'fact_remembered', id, content })
  return {
    content: `Remembered: "${content}" (id ${id}). It is in your memory now — do not store it again.`,
    is_error: false,
  }
}

/** Execute recall: search known_facts + the thread for a term, dated, so receipts stay honest. */
async function recall(
  db: SupabaseClient,
  use: Anthropic.ToolUseBlock,
): Promise<{ content: string; is_error: boolean }> {
  const input = (use.input ?? {}) as { query?: unknown }
  const query = String(input.query ?? '')
    .trim()
    .slice(0, 200)
  if (!query) return { content: 'No query given.', is_error: true }
  const like = `%${query.replace(/[%_\\]/g, ' ')}%`

  const [facts, msgs] = await Promise.all([
    db
      .from('known_facts')
      .select('content, source, created_at')
      .is('deleted_at', null)
      .ilike('content', like)
      .limit(8),
    db
      .from('messages')
      .select('content, role, created_at')
      .ilike('content', like)
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const lines: string[] = []
  for (const f of facts.data ?? []) {
    const date = String(f.created_at).slice(0, 10)
    const tag = f.source === 'seed' ? ', inherited from TRUE' : ''
    lines.push(`- fact (${date}${tag}): ${f.content}`)
  }
  for (const m of msgs.data ?? []) {
    const date = String(m.created_at).slice(0, 10)
    const who = m.role === 'deb' ? 'you said' : 'Chris said'
    lines.push(`- ${who} (${date}): ${String(m.content).slice(0, 200)}`)
  }

  if (lines.length === 0) {
    return { content: `Nothing in memory or the thread matches "${query}".`, is_error: false }
  }
  return {
    content: `Matches for "${query}" (keep the dates honest):\n${lines.join('\n')}`,
    is_error: false,
  }
}
