import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { DEB_IDENTITY, SILENT_SENTINEL } from './_lib/identity.js'
import { runDistill, DISTILLATE_MAX } from './_lib/distill.js'
import {
  FACT_MAX,
  MATERIAL_MIN,
  MESSAGE_MAX,
  MISSION_MAX,
  RAW_MAX,
  TASK_TITLE_MAX,
  todayKeyInTz,
  type DebContext,
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

/** Write a world's mission — the distillation of the intake interview. */
const SET_MISSION: Anthropic.Tool = {
  name: 'set_mission',
  description: `Write (or rewrite) a world's one-line mission — the distillation of an intake interview, in Chris's words more than yours. Act-then-correct: it lands the moment you call this, hangs over that world's mantle in Review, and he can redo it by simply saying so. ONLY call this when the conversation has actually surfaced what the world is for — never guess a mission to fill the field, and never announce that you are "running an interview." Defaults to the world he is speaking from; pass a world name only when the conversation clearly settled a different one.`,
  input_schema: {
    type: 'object',
    properties: {
      mission: {
        type: 'string',
        description: 'One line, under 200 characters. His words, distilled — not corporate speak.',
      },
      world: {
        type: 'string',
        description: 'Optional: the world name. Omit to use the lens he is speaking from.',
      },
    },
    required: ['mission'],
  },
}

/** File the current message as an entry — the small-material hand. */
const FILE_ENTRY: Anthropic.Tool = {
  name: 'file_entry',
  description: `File Chris's latest message into the record as an entry — at this size his words ARE the readable entry. Use when what he sent is MATERIAL rather than conversation: a note or log he clearly wants kept, or when he says "file this". Pass the world it belongs to by content; omit when genuinely unsure (it files at silver — never block a filing on doubt, ask your one short question instead). The receipt chip is the confirmation; add words only if something real needs saying, and NEVER summarize the content back to him.`,
  input_schema: {
    type: 'object',
    properties: {
      world: {
        type: 'string',
        description: 'Exact world name; omit if unsure (files at silver).',
      },
    },
  },
}

/** Goal hands (ruling, July 24): goals live in the conversation. */
const CREATE_GOAL: Anthropic.Tool = {
  name: 'create_goal',
  description: `Create a goal — a finishable outcome — when Chris states one ("the goal for ISO is closing the audit by September"). Act-then-correct: it exists the instant you call this; your words confirm briefly. Goals LIVE IN WORLDS (the schema requires it): use the world he's speaking from or the one he names; from home with no world named, ask which world first — one short question. Never re-create a goal already in the current state.`,
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'The outcome, clean, under 200 characters.' },
      world: { type: 'string', description: 'Exact world name; omit to use the lens.' },
    },
    required: ['title'],
  },
}

const RENAME_GOAL: Anthropic.Tool = {
  name: 'rename_goal',
  description: `Rename an existing ACTIVE goal when Chris rewords it. Refer to it by its current title (from the current state). Act-then-correct with undo; verify against the current state first.`,
  input_schema: {
    type: 'object',
    properties: {
      goal: { type: 'string', description: 'The current title, as shown in the state.' },
      title: { type: 'string', description: 'The new title, under 200 characters.' },
      world: { type: 'string', description: 'Optional world name to disambiguate.' },
    },
    required: ['goal', 'title'],
  },
}

const STAGE_GOAL_VERDICT: Anthropic.Tool = {
  name: 'stage_goal_verdict',
  description: `Stage the app's ONE solemn confirm when Chris declares a goal finished forever or dropped forever. This does NOT write the verdict — the signing belongs to Chris alone: calling this places the solemn confirm in front of him, inline in the thread. Never claim the verdict happened; after staging, acknowledge in one short line and stop. Only for the two permanent verdicts; nothing else ever uses this.`,
  input_schema: {
    type: 'object',
    properties: {
      goal: { type: 'string', description: 'The goal title, as shown in the state.' },
      verdict: { type: 'string', enum: ['done', 'dropped'] },
      world: { type: 'string', description: 'Optional world name to disambiguate.' },
    },
    required: ['goal', 'verdict'],
  },
}

/** Task update hand (ruling, July 24): rename · re-world · re-anchor. */
const UPDATE_TASK: Anthropic.Tool = {
  name: 'update_task',
  description: `Update an OPEN task when Chris asks — rename it, move it to another world, or change its anchor ("push the invoice to Friday", "that one belongs to ISO", "rename it to X"). Refer to it by its current title from the state. anchor: "today", "none" (back to undecided — the stack re-deals it), or a YYYY-MM-DD day. Act-then-correct with undo. Never invent a task; verify it in the state first.`,
  input_schema: {
    type: 'object',
    properties: {
      task: { type: 'string', description: 'The current title, as shown in the state.' },
      title: { type: 'string', description: 'New title, under 200 characters (omit to keep).' },
      world: { type: 'string', description: 'New world by exact name (omit to keep).' },
      anchor: {
        type: 'string',
        description: '"today", "none", or YYYY-MM-DD (omit to keep).',
      },
    },
    required: ['task'],
  },
}

const TOOLS: Anthropic.Tool[] = [
  CREATE_TASK,
  UPDATE_TASK,
  REMEMBER,
  RECALL,
  SET_MISSION,
  FILE_ENTRY,
  CREATE_GOAL,
  RENAME_GOAL,
  STAGE_GOAL_VERDICT,
]

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

  let body: {
    content?: unknown
    projectId?: unknown
    tz?: unknown
    pasted?: unknown
    tap?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Bad request.' }, 400)
  }
  const projectId = typeof body.projectId === 'string' ? body.projectId : null
  const tz = typeof body.tz === 'string' && body.tz ? body.tz : 'UTC'

  // The object door (provenance redline, July 24): a tapped margin note,
  // goal, or card. NOTHING is written in Chris's voice — no user row at
  // all; the tap is framed to her as his deliberate ask, and only HER
  // reply enters the record.
  const margin = parseTap(body.tap)

  const rawInput = margin ? '' : String(body.content ?? '').trim()
  if (!margin && !rawInput) return json({ error: 'Nothing to say.' }, 400)
  const pasted = body.pasted === true

  // THE DOOR (M5 T2, redline law): the paste EVENT is the primary signal,
  // size the secondary confirmation. A large paste is material — it files
  // into the record and never enters the thread. Typed text of any length
  // is conversation.
  if (!margin && pasted && rawInput.length >= MATERIAL_MIN) {
    return fileMaterial(db, rawInput.slice(0, RAW_MAX), projectId, tz)
  }

  const content = capText(rawInput, MESSAGE_MAX)

  // The user's line joins the thread first — the thread is truth even if
  // the model call fails after this point. (A margin tap writes nothing:
  // the record may only ever hold words Chris actually wrote or said.)
  const userMessageId = margin ? '' : randomUUID()
  if (!margin) {
    const { error: insertError } = await db.from('messages').insert({
      id: userMessageId,
      role: 'user',
      content,
      project_id: projectId,
    })
    if (insertError) return json({ error: 'Your message could not be saved.' }, 500)
  }

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
        { type: 'text', text: margin ? marginFrame(margin) : content },
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
                    : use.name === 'set_mission'
                      ? await setMission(db, use, projectId, ctx.projects, send)
                      : use.name === 'file_entry'
                        ? await fileEntryTool(db, use, content, ctx, tz, send)
                        : use.name === 'create_goal'
                          ? await createGoal(db, use, projectId, ctx, send)
                          : use.name === 'rename_goal'
                            ? await renameGoal(db, use, projectId, ctx, send)
                            : use.name === 'stage_goal_verdict'
                              ? stageGoalVerdict(use, projectId, ctx, send)
                              : use.name === 'update_task'
                                ? await updateTask(db, use, projectId, ctx, tz, send)
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
    lines.push(`- fact (${date}): ${f.content}`)
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

/** Execute set_mission: resolve the world (lens by default), row-checked update, tell the client. */
async function setMission(
  db: SupabaseClient,
  use: Anthropic.ToolUseBlock,
  lensProjectId: string | null,
  projects: Record<string, unknown>[],
  send: (event: Record<string, unknown>) => void,
): Promise<{ content: string; is_error: boolean }> {
  const input = (use.input ?? {}) as { mission?: unknown; world?: unknown }
  const mission = capText(String(input.mission ?? ''), MISSION_MAX)
  if (!mission) return { content: 'No mission given — nothing was written.', is_error: true }

  const worldName = String(input.world ?? '').trim()
  const target = worldName
    ? projects.find((p) => String(p.name).toLowerCase() === worldName.toLowerCase())
    : projects.find((p) => p.id === lensProjectId)
  if (!target) {
    return {
      content: worldName
        ? `No world named "${worldName}" exists — do not invent worlds; ask Chris.`
        : 'No world is in focus — ask Chris to step into the world on the rail (or name it).',
      is_error: true,
    }
  }

  const { data, error } = await db
    .from('projects')
    .update({ mission })
    .eq('id', String(target.id))
    .select('id')
  if (error || !data || data.length === 0) {
    console.error('[chat] set_mission', error)
    return { content: 'The write failed — the mission was NOT set. Tell Chris plainly.', is_error: true }
  }

  send({ type: 'action', kind: 'mission_set', id: String(target.id), name: String(target.name), mission })
  return {
    content: `Mission written for ${String(target.name)}: "${mission}". It hangs over the mantle in Review now — he can redo it by saying so.`,
    is_error: false,
  }
}


/**
 * The material path (M5 T2+T3): a large paste files straight into the
 * record — raw into entry_raw (immutable), the distilled entry over it,
 * routed to a world by content (silver when unsure). It never enters the
 * thread. Filing never fails on the engine: if distillation errors, the
 * raw still files (distillate lands later; nothing is ever lost).
 * Redline law: filing never mutes her — `say` streams and persists only
 * when the engine found something real; the chip alone is the default.
 */
async function fileMaterial(
  db: SupabaseClient,
  raw: string,
  lensProjectId: string | null,
  tz: string,
): Promise<Response> {
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      try {
        const ctx = await loadContext(db)
        const fb = await db
          .from('extractor_feedback')
          .select('title')
          .order('created_at', { ascending: false })
          .limit(40)
        const notAThings = (fb.data ?? []).map((r) => String(r.title))
        const anthropic = new Anthropic()
        const result = await runDistill(anthropic, ctx, raw, tz, notAThings).catch((err) => {
          console.error('[chat] distill', err)
          return null
        })
        const target = result?.world
          ? ctx.projects.find(
              (p) => String(p.name).toLowerCase() === result.world!.toLowerCase(),
            )
          : undefined

        const { entryId, worldName } = await insertEntry(db, {
          raw,
          projectId: target ? String(target.id) : null,
          worldName: target ? String(target.name) : null,
          distillate: result?.distillate ?? null,
          tz,
        })
        // Mint the open loops (T4): high bar, source worn on the card.
        const taskIds: string[] = []
        for (const title of result?.cards ?? []) {
          const t = capText(title, TASK_TITLE_MAX)
          if (!t) continue
          const taskId = randomUUID()
          const { error: mintError } = await db.from('tasks').insert({
            id: taskId,
            title: t,
            project_id: target ? String(target.id) : null,
            source_entry_id: entryId,
          })
          if (!mintError) taskIds.push(taskId)
          else console.error('[chat] mint', mintError)
        }
        // Her margin notes (T6): restraint already applied by the engine.
        for (const note of result?.notes ?? []) {
          const { error: noteError } = await db.from('entry_notes').insert({
            entry_id: entryId,
            kind: note.kind,
            content: note.content,
          })
          if (noteError) console.error('[chat] margin note', noteError)
        }
        send({ type: 'action', kind: 'entry_filed', id: entryId, worldName, taskIds })

        const say = result?.say ?? null
        if (say) {
          send({ type: 'delta', text: say })
          const replyId = randomUUID()
          const { error: replyError } = await db.from('messages').insert({
            id: replyId,
            role: 'deb',
            content: capText(say, MESSAGE_MAX),
            project_id: lensProjectId,
          })
          send({ type: 'done', id: replyId, content: say, saved: !replyError })
        } else {
          send({ type: 'silent' })
        }
      } catch (err) {
        console.error('[chat] file', err)
        send({ type: 'error', message: 'That could not be filed — nothing was lost. Try again.' })
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

/** The shared write: raw first (immutable), then the entry surface over it. */
async function insertEntry(
  db: SupabaseClient,
  input: {
    raw: string
    projectId: string | null
    worldName: string | null
    distillate: string | null
    tz: string
  },
): Promise<{ entryId: string; worldName: string | null }> {
  const rawId = randomUUID()
  const { error: rawError } = await db
    .from('entry_raw')
    .insert({ id: rawId, content: input.raw })
  if (rawError) throw new Error(`raw insert failed: ${rawError.message}`)

  const entryId = randomUUID()
  const { error: entryError } = await db.from('entries').insert({
    id: entryId,
    raw_id: rawId,
    project_id: input.projectId,
    source: 'filed',
    distillate: input.distillate,
    entry_day: todayKeyInTz(input.tz),
  })
  if (entryError) throw new Error(`entry insert failed: ${entryError.message}`)
  return { entryId, worldName: input.worldName }
}

/** Execute file_entry: the message itself becomes the entry (it is already
 *  the readable form at conversation size — its own distillate). */
async function fileEntryTool(
  db: SupabaseClient,
  use: Anthropic.ToolUseBlock,
  content: string,
  ctx: DebContext,
  tz: string,
  send: (event: Record<string, unknown>) => void,
): Promise<{ content: string; is_error: boolean }> {
  const input = (use.input ?? {}) as { world?: unknown }
  const worldName = String(input.world ?? '').trim()
  const target = worldName
    ? ctx.projects.find((p) => String(p.name).toLowerCase() === worldName.toLowerCase())
    : undefined
  if (worldName && !target) {
    return {
      content: `No world named "${worldName}" — file at silver (omit world) or use a real one.`,
      is_error: true,
    }
  }
  try {
    const { entryId } = await insertEntry(db, {
      raw: content,
      projectId: target ? String(target.id) : null,
      worldName: target ? String(target.name) : null,
      distillate: capText(content, DISTILLATE_MAX),
      tz,
    })
    send({
      type: 'action',
      kind: 'entry_filed',
      id: entryId,
      worldName: target ? String(target.name) : null,
      taskIds: [],
    })
    return {
      content: `Filed to ${target ? String(target.name) : 'silver'} (entry ${entryId}). The chip is his receipt — do not repeat the content back.`,
      is_error: false,
    }
  } catch (err) {
    console.error('[chat] file_entry', err)
    return { content: 'The filing failed — tell Chris plainly.', is_error: true }
  }
}


function parseTap(
  value: unknown,
): { label: string; source: string; content: string } | null {
  if (!value || typeof value !== 'object') return null
  const v = value as { label?: unknown; source?: unknown; content?: unknown }
  const label = capText(String(v.label ?? ''), 40)
  const source = capText(String(v.source ?? ''), 80)
  const content = capText(String(v.content ?? ''), 300)
  if (!label || !content) return null
  return { label, source, content }
}

/**
 * The tap, framed for her. This text is CONTEXT for the model only — it is
 * never persisted; the thread's provenance stays absolute.
 */
function marginFrame(m: { label: string; source: string; content: string }): string {
  return [
    '<object-tap>',
    `Chris tapped a ${m.label} — "${m.content}" (${m.source}) — bringing it to the table.`,
    'The tap is him asking YOU to pick it up: say more — the state of it,',
    "what's under it, what he might do with it. If it is a goal or a task,",
    'its live state is in <current-state>; if it is your own margin note,',
    'speak from the note. He is addressing you, so answer (this is not a',
    'moment for silence). He typed no words — never quote or paraphrase him.',
    '</object-tap>',
  ].join('\n')
}


/* ============ the goal + task hands (rulings 1–2, July 24) ============ */

function worldByName(ctx: DebContext, name: string) {
  return ctx.projects.find((p) => String(p.name).toLowerCase() === name.toLowerCase())
}

/** Resolve a goal by title (CI), optionally scoped; ambiguity is an honest error. */
function findGoal(ctx: DebContext, title: string, worldId: string | null) {
  const t = title.trim().toLowerCase()
  const hits = ctx.goals.filter(
    (g) =>
      String(g.title).toLowerCase() === t && (worldId === null || g.project_id === worldId),
  )
  return hits
}

async function createGoal(
  db: SupabaseClient,
  use: Anthropic.ToolUseBlock,
  lensProjectId: string | null,
  ctx: DebContext,
  send: (event: Record<string, unknown>) => void,
): Promise<{ content: string; is_error: boolean }> {
  const input = (use.input ?? {}) as { title?: unknown; world?: unknown }
  const title = capText(String(input.title ?? ''), TASK_TITLE_MAX)
  if (!title) return { content: 'No title given — nothing was created.', is_error: true }
  const worldName = String(input.world ?? '').trim()
  const target = worldName ? worldByName(ctx, worldName) : ctx.projects.find((p) => p.id === lensProjectId)
  if (!target) {
    return {
      content: worldName
        ? `No world named "${worldName}".`
        : 'Goals live in worlds and no world is in focus — ask Chris which world this goal belongs to (one short question).',
      is_error: true,
    }
  }
  const id = randomUUID()
  const { error } = await db
    .from('goals')
    .insert({ id, project_id: String(target.id), title })
  if (error) {
    console.error('[chat] create_goal', error)
    return { content: 'The write failed — the goal was NOT created. Tell Chris plainly.', is_error: true }
  }
  send({ type: 'action', kind: 'goal_created', id, title, worldName: String(target.name) })
  return { content: `Goal set in ${String(target.name)}: "${title}".`, is_error: false }
}

async function renameGoal(
  db: SupabaseClient,
  use: Anthropic.ToolUseBlock,
  lensProjectId: string | null,
  ctx: DebContext,
  send: (event: Record<string, unknown>) => void,
): Promise<{ content: string; is_error: boolean }> {
  const input = (use.input ?? {}) as { goal?: unknown; title?: unknown; world?: unknown }
  const from = String(input.goal ?? '').trim()
  const title = capText(String(input.title ?? ''), TASK_TITLE_MAX)
  if (!from || !title) return { content: 'Need the current title and the new one.', is_error: true }
  const worldName = String(input.world ?? '').trim()
  const scope = worldName ? (worldByName(ctx, worldName)?.id ?? null) : lensProjectId
  let hits = findGoal(ctx, from, typeof scope === 'string' ? scope : null)
  if (hits.length === 0 && !worldName && !lensProjectId) hits = findGoal(ctx, from, null)
  if (hits.length === 0) return { content: `No goal titled "${from}" — check the state.`, is_error: true }
  if (hits.length > 1)
    return { content: `"${from}" exists in more than one world — name the world.`, is_error: true }
  const goal = hits[0]
  const { data, error } = await db
    .from('goals')
    .update({ title })
    .eq('id', String(goal.id))
    .select('id')
  if (error || !data || data.length === 0) {
    console.error('[chat] rename_goal', error)
    return { content: 'The rename failed — nothing changed. Tell Chris plainly.', is_error: true }
  }
  send({ type: 'action', kind: 'goal_renamed', id: String(goal.id), title, prev: String(goal.title) })
  return { content: `Renamed to "${title}".`, is_error: false }
}

/** Stage only — the signing is Chris's alone (the one solemn confirm). */
function stageGoalVerdict(
  use: Anthropic.ToolUseBlock,
  lensProjectId: string | null,
  ctx: DebContext,
  send: (event: Record<string, unknown>) => void,
): { content: string; is_error: boolean } {
  const input = (use.input ?? {}) as { goal?: unknown; verdict?: unknown; world?: unknown }
  const title = String(input.goal ?? '').trim()
  const verdict = String(input.verdict ?? '')
  if (!title || (verdict !== 'done' && verdict !== 'dropped'))
    return { content: 'Need the goal and a verdict of done or dropped.', is_error: true }
  const worldName = String(input.world ?? '').trim()
  const scope = worldName ? (worldByName(ctx, worldName)?.id ?? null) : lensProjectId
  let hits = findGoal(ctx, title, typeof scope === 'string' ? scope : null).filter(
    (g) => g.status === 'active',
  )
  if (hits.length === 0 && !worldName && !lensProjectId)
    hits = findGoal(ctx, title, null).filter((g) => g.status === 'active')
  if (hits.length === 0)
    return { content: `No ACTIVE goal titled "${title}" — check the state.`, is_error: true }
  if (hits.length > 1)
    return { content: `"${title}" is active in more than one world — name the world.`, is_error: true }
  const goal = hits[0]
  send({
    type: 'action',
    kind: 'goal_verdict_staged',
    id: String(goal.id),
    title: String(goal.title),
    verdict,
  })
  return {
    content: `Staged. The solemn confirm is in front of him now — the signing is HIS. Do not claim the verdict happened; acknowledge in one short line and stop.`,
    is_error: false,
  }
}

async function updateTask(
  db: SupabaseClient,
  use: Anthropic.ToolUseBlock,
  lensProjectId: string | null,
  ctx: DebContext,
  tz: string,
  send: (event: Record<string, unknown>) => void,
): Promise<{ content: string; is_error: boolean }> {
  const input = (use.input ?? {}) as {
    task?: unknown
    title?: unknown
    world?: unknown
    anchor?: unknown
  }
  const from = String(input.task ?? '').trim().toLowerCase()
  if (!from) return { content: 'Which task? Give its current title.', is_error: true }
  const open = ctx.tasks.filter((t) => !t.done_at)
  let hits = open.filter(
    (t) =>
      String(t.title).toLowerCase() === from &&
      (lensProjectId === null || t.project_id === lensProjectId),
  )
  if (hits.length === 0) hits = open.filter((t) => String(t.title).toLowerCase() === from)
  if (hits.length === 0) return { content: `No open task titled "${String(input.task)}".`, is_error: true }
  if (hits.length > 1)
    return { content: `More than one open task is titled that — narrow it (which world?).`, is_error: true }
  const task = hits[0]

  const fields: Record<string, unknown> = {}
  if (typeof input.title === 'string' && input.title.trim()) {
    fields.title = capText(input.title, TASK_TITLE_MAX)
  }
  if (typeof input.world === 'string' && input.world.trim()) {
    const w = worldByName(ctx, input.world.trim())
    if (!w) return { content: `No world named "${input.world}".`, is_error: true }
    fields.project_id = String(w.id)
  }
  if (typeof input.anchor === 'string' && input.anchor.trim()) {
    const a = input.anchor.trim().toLowerCase()
    if (a === 'today') fields.anchored_on = todayKeyInTz(tz)
    else if (a === 'none') fields.anchored_on = null
    else if (/^\d{4}-\d{2}-\d{2}$/.test(a)) fields.anchored_on = a
    else return { content: 'anchor must be "today", "none", or YYYY-MM-DD.', is_error: true }
  }
  if (Object.keys(fields).length === 0)
    return { content: 'Nothing to change — give a new title, world, or anchor.', is_error: true }

  const { data, error } = await db
    .from('tasks')
    .update(fields)
    .eq('id', String(task.id))
    .select('id')
  if (error || !data || data.length === 0) {
    console.error('[chat] update_task', error)
    return { content: 'The update failed — nothing changed. Tell Chris plainly.', is_error: true }
  }
  send({
    type: 'action',
    kind: 'task_updated',
    id: String(task.id),
    title: String(fields.title ?? task.title),
    prev: {
      title: String(task.title),
      project_id: task.project_id ?? null,
      anchored_on: task.anchored_on ?? null,
    },
    changed: Object.keys(fields),
  })
  return { content: `Updated "${String(fields.title ?? task.title)}".`, is_error: false }
}
