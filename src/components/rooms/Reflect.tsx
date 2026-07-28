import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { messageKeys, useMessages } from '../../db/queries/messages'
import { projectKeys, useProjects, useProjectMutations } from '../../db/queries/projects'
import { taskKeys, useTasks, useTaskMutations } from '../../db/queries/tasks'
import { factKeys, useFactMutations } from '../../db/queries/facts'
import { goalKeys, useGoalMutations } from '../../db/queries/goals'
import { entryKeys, useEntries, useEntryMutations } from '../../db/queries/entries'
import { useBook } from '../../lib/book'
import { useLens } from '../../lib/lens'
import { Markdown } from '../../lib/markdown'
import { useDoor, type Knock } from '../../lib/door'
import { useRoom } from '../../lib/rooms'
import { shortDay } from '../../lib/line'
import { RAW_MAX, type Entry, type Message, type Project } from '../../db/types'
import { streamDeb, type DebInput } from '../../lib/deb'
import { LoadFailed } from '../LoadFailed'
import { NowStrip } from '../mobile/NowStrip'
import { VerdictConfirm } from '../VerdictConfirm'
import { useIsMobile } from '../../lib/useIsMobile'
import { transient } from '../../lib/undo'

/** One in-flight turn. 'waiting' = the silent gap (nothing shown but your line);
 *  'speaking' = she's decided to speak (the dots); 'error' = the honest line + retry.
 *  `retry` carries the exact input shape, so a failed material paste stays
 *  material and a failed margin tap stays a margin tap. `userLine` is null
 *  for margin turns — the quoted note is the visible object, and nothing is
 *  ever rendered (or stored) in Chris's voice that he didn't write. */
type Turn = { userLine: string | null; retry: DebInput; phase: 'waiting' | 'speaking' | 'error' }

export function Reflect({ lens }: { lens: string | null }) {
  const qc = useQueryClient()
  const { data: messages = [], isError, refetch } = useMessages(lens)
  const { data: projects = [] } = useProjects()
  const { data: filedEntries = [] } = useEntries()
  const { data: allTasks = [] } = useTasks()
  const { remove: removeTask, update: updateTask, setDone: setTaskDone } = useTaskMutations()
  const { forget: forgetFact } = useFactMutations()
  const { update: updateProject } = useProjectMutations()
  const { update: updateGoal, verdict: goalVerdict, remove: removeGoal } = useGoalMutations()
  const { hide: hideEntry, revertVersion: revertEntryVersion } = useEntryMutations()
  const world = projects.find((p) => p.id === lens) ?? null
  const isMobile = useIsMobile()
  const [turn, setTurn] = useState<Turn | null>(null)
  const [draft, setDraft] = useState('')
  // Act receipts (mobile thread ruling, July 24): small inline pill chips,
  // session-ephemeral — the append-only thread stays pure conversation.
  const [receipts, setReceipts] = useState<{ id: string; label: string }[]>([])
  // Things brought through the door — margin notes (her words) and carried
  // goals/tasks (his objects) — quoted, session-ephemeral.
  const [quotes, setQuotes] = useState<(Knock & { id: string })[]>([])
  // The re-homed solemn moment (T4 ruling 1): Deb staged a permanent
  // verdict; the one centered confirm renders here, and only Chris's
  // signature makes the write. Cancel is "Not yet" — nothing happens.
  const [staged, setStaged] = useState<{
    id: string
    title: string
    verdict: 'done' | 'dropped'
  } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  // Redline (July 24): the paste EVENT is the primary material signal —
  // typed text of any length is conversation. The flag rides the message.
  const pastedRef = useRef(false)

  // The thread with its evidence (July 28 ruling: silent success is a
  // failure state): filed entries render as objects IN the thread, at
  // their moment, interleaved with the conversation by time. Visibly
  // material — never styled as Chris's prose.
  const timeline = useMemo(() => {
    // The thread ruling (July 28): the filed object renders in the thread
    // where the PASTE happened (spoken_in), not where the entry routed —
    // words live where they were said. Pre-ruling rows carry no spoken_in
    // and stay at silver: the record does not invent facts.
    const scoped = filedEntries.filter((e) =>
      lens === null ? e.spoken_in === null : e.spoken_in === lens,
    )
    const items: ({ at: string; kind: 'msg'; msg: Message } | { at: string; kind: 'entry'; entry: Entry })[] = [
      ...messages.map((m) => ({ at: m.created_at, kind: 'msg' as const, msg: m })),
      ...scoped.map((e) => ({ at: e.created_at, kind: 'entry' as const, entry: e })),
    ]
    return items.sort((a, b) => a.at.localeCompare(b.at))
  }, [messages, filedEntries, lens])

  // Stay pinned to the newest line.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [timeline, turn])

  // The composer grows with the draft (to ~5 lines, then scrolls inside).
  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [draft])

  // The door (provenance redline, July 24; generalized July 27): a tapped
  // margin note or a carried goal/task arrives as a quoted object and Deb
  // picks it up. No words are synthesized in Chris's voice, ever.
  const pendingKnock = useDoor((s) => s.pending)
  useEffect(() => {
    if (!pendingKnock || (turn && turn.phase !== 'error')) return
    useDoor.getState().clear()
    setQuotes((q) => [...q, { ...pendingKnock, id: crypto.randomUUID() }])
    void run(
      pendingKnock.type === 'margin'
        ? { kind: 'margin', note: pendingKnock }
        : {
            kind: 'object',
            object: {
              object: pendingKnock.object,
              content: pendingKnock.content,
              from: pendingKnock.from,
              world: pendingKnock.world,
              state: pendingKnock.state,
            },
          },
      null,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingKnock])

  const send = async (raw: string, pastedOverride?: boolean) => {
    const content = raw.trim()
    if (!content) return
    const pasted = pastedOverride ?? pastedRef.current
    pastedRef.current = false
    setDraft('')
    await run({ kind: 'text', content, pasted }, content)
  }

  const run = async (input: DebInput, userLine: string | null) => {
    if (turn && turn.phase !== 'error') return // one turn at a time (retry allowed)
    const projectId = lens
    setTurn({ userLine, retry: input, phase: 'waiting' })

    let resolved = false
    await streamDeb(input, projectId, (e) => {
      if (e.type === 'delta') {
        // First delta = she's decided to speak. Now the dots may show.
        setTurn((t) => (t && t.phase === 'waiting' ? { ...t, phase: 'speaking' } : t))
      } else if (e.type === 'action') {
        // Act-then-correct: she made a write. It exists now — the pill is the undo.
        if (e.kind === 'task_created') {
          void qc.invalidateQueries({ queryKey: taskKeys.all })
          const id = e.id
          transient.undo(`Added · ${e.title.slice(0, 40)}`, () => removeTask(id, false))
          setReceipts((r) => [...r, { id, label: 'Filed — 1 task added' }])
        } else if (e.kind === 'fact_remembered') {
          void qc.invalidateQueries({ queryKey: factKeys.all })
          const id = e.id
          transient.undo(`Noted · ${e.content.slice(0, 40)}`, () => forgetFact(id, false))
          setReceipts((r) => [...r, { id, label: 'Noted — memory updated' }])
        } else if (e.kind === 'entry_filed') {
          // Filing is the act; the FILED OBJECT in the thread is the
          // evidence (July 28 ruling — no more silent success); the pill
          // is the undo. Un-filing hides the entry surface and its minted
          // cards; the raw beneath stays kept, as law.
          void qc.invalidateQueries({ queryKey: entryKeys.meta })
          void qc.invalidateQueries({ queryKey: entryKeys.pages })
          void qc.invalidateQueries({ queryKey: entryKeys.notes })
          void qc.invalidateQueries({ queryKey: taskKeys.all })
          const entryId = e.id
          const taskIds = e.taskIds
          const where = e.worldName ?? 'silver'
          const label =
            taskIds.length > 0
              ? `Filed to ${where} — ${taskIds.length} card${taskIds.length === 1 ? '' : 's'} minted`
              : `Filed to ${where}`
          transient.undo(label, () => {
            void hideEntry(entryId)
            for (const tid of taskIds) removeTask(tid, false)
          })
        } else if (e.kind === 'entry_versioned') {
          // The living page grew (ritual ruling 3). The undo restores the
          // prior version — never deletes the entry.
          void qc.invalidateQueries({ queryKey: entryKeys.meta })
          void qc.invalidateQueries({ queryKey: entryKeys.pages })
          void qc.invalidateQueries({ queryKey: entryKeys.notes })
          void qc.invalidateQueries({ queryKey: taskKeys.all })
          const v = e
          const where = e.worldName ?? 'silver'
          const label =
            v.taskIds.length > 0
              ? `Page grown (${where}) — ${v.taskIds.length} new card${v.taskIds.length === 1 ? '' : 's'}`
              : `Page grown (${where})`
          transient.undo(label, () => {
            void revertEntryVersion({
              entryId: v.id,
              prevRawId: v.prevRawId,
              prevDistillate: v.prevDistillate,
              newNoteIds: v.newNoteIds,
              oldNoteIds: v.oldNoteIds,
            })
            for (const tid of v.taskIds) removeTask(tid, false)
          })
        } else if (e.kind === 'goal_created') {
          void qc.invalidateQueries({ queryKey: goalKeys.all })
          const id = e.id
          transient.undo(`Goal added · ${e.title.slice(0, 40)}`, () => removeGoal(id, false))
          setReceipts((r) => [...r, { id, label: `Goal added — ${e.worldName}` }])
        } else if (e.kind === 'goal_renamed') {
          void qc.invalidateQueries({ queryKey: goalKeys.all })
          const id = e.id
          const prevTitle = e.prevTitle
          transient.undo(`Renamed · ${e.title.slice(0, 40)}`, () =>
            updateGoal(id, { title: prevTitle }),
          )
          setReceipts((r) => [...r, { id, label: 'Goal renamed' }])
        } else if (e.kind === 'task_updated') {
          void qc.invalidateQueries({ queryKey: taskKeys.all })
          const id = e.id
          const prev = e.prev
          transient.undo(e.label.slice(0, 60), () => updateTask(id, prev))
          setReceipts((r) => [...r, { id: `${id}-${crypto.randomUUID()}`, label: 'Task updated' }])
        } else if (e.kind === 'task_completed') {
          // The done hand (July 27): his statement was the evidence; the
          // undo pill is the take-back — identical gravity to the punch.
          void qc.invalidateQueries({ queryKey: taskKeys.all })
          const id = e.id
          transient.undo(`Done · ${e.title.slice(0, 40)}`, () => setTaskDone(id, false))
          setReceipts((r) => [...r, { id: `${id}-done`, label: `Done — ${e.title.slice(0, 32)}` }])
        } else if (e.kind === 'verdict_staged') {
          // Not a write: she set the pen down in front of Chris. The one
          // solemn confirm renders; only his signature makes the verdict.
          setStaged({ id: e.id, title: e.title, verdict: e.verdict })
        } else if (e.kind === 'mission_set') {
          // Redo path: undo restores whatever the mission was before (often nothing).
          const prev =
            qc.getQueryData<typeof projects>(projectKeys.all)?.find((p) => p.id === e.id)
              ?.mission ?? null
          void qc.invalidateQueries({ queryKey: projectKeys.all })
          const id = e.id
          transient.undo(`Mission set · ${e.name}`, () => updateProject(id, { mission: prev }))
          setReceipts((r) => [...r, { id, label: `Mission set — ${e.name}` }])
        }
      } else if (e.type === 'done' || e.type === 'silent') {
        // The DB is truth now (user line always persisted; her reply too, on done).
        resolved = true
        setTurn(null)
        void qc.invalidateQueries({ queryKey: messageKeys.all })
      } else if (e.type === 'error') {
        resolved = true
        setTurn((t) => (t ? { ...t, phase: 'error' } : t))
      }
    })
    // Stream closed with no terminal event → honest error, never a half-saved reply.
    if (!resolved) setTurn((t) => (t ? { ...t, phase: 'error' } : t))
  }

  // Law: a failed thread load never renders as an empty thread.
  if (isError) return <LoadFailed what="The thread" onRetry={() => void refetch()} />

  const daymark = world
    ? `${world.name} · same mind, narrowed`
    : new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* The quote is quiet for now (July 24 ruling) — it may return elsewhere.
          Its breathing room stays exactly: an invisible line box of the same
          type metrics, so the thread never shifts. */}
      <div
        aria-hidden
        className="invisible mx-auto mt-14 block max-w-[640px] px-8 text-center font-serif text-[15px] italic"
      >
        &ldquo;&rdquo;
      </div>

      <div ref={scrollRef} className="momentum min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[640px] flex-col gap-7 px-5 pt-7 pb-4 md:px-8">
          <div className="text-center">
            <span className="eyebrow text-dim opacity-70">{daymark}</span>
          </div>

          {timeline.map((item) =>
            item.kind === 'entry' ? (
              <FiledCard
                key={item.entry.id}
                entry={item.entry}
                world={projects.find((p) => p.id === item.entry.project_id) ?? null}
                minted={allTasks.filter((t) => t.source_entry_id === item.entry.id).length}
                lens={lens}
              />
            ) : item.msg.role === 'deb' ? (
              <Markdown
                key={item.msg.id}
                className="rise max-w-[88%] font-serif text-[16.5px] leading-[1.68] text-ink"
                text={item.msg.content}
              />
            ) : (
              <Markdown
                key={item.msg.id}
                className="rise ml-auto max-w-[78%] text-right text-[15px] leading-relaxed text-ink opacity-80 md:text-[14px]"
                text={item.msg.content}
              />
            ),
          )}

          {receipts.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-2 self-start rounded-full bg-fill px-3 py-1.5 md:hidden"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="font-mono text-[11px] text-muted">{r.label}</span>
            </div>
          ))}

          {quotes.map((q) => (
            <blockquote
              key={q.id}
              className="rise relative max-w-[88%] pl-4 font-serif text-[14px] leading-[1.6] text-accent italic"
            >
              <span className="absolute top-[3px] bottom-[3px] left-0 w-[1.5px] rounded bg-accent opacity-40" />
              <span className="eyebrow mb-1 block text-[0.58rem] text-dim not-italic">
                {q.type === 'margin'
                  ? `from the margin · ${q.noteKind} · ${q.day}`
                  : `from ${q.from} · ${q.object}${q.world ? ` · ${q.world}` : ''}`}
              </span>
              {q.type === 'margin' && q.question && (
                <span className="mb-1 block text-[13px] text-muted not-italic">
                  {q.question}
                </span>
              )}
              &ldquo;{q.content}&rdquo;
            </blockquote>
          ))}

          {turn && (
            <>
              {turn.userLine && (
                <Markdown
                  className="rise ml-auto max-w-[78%] text-right text-[15px] leading-relaxed text-ink opacity-80 md:text-[14px]"
                  text={turn.userLine}
                />
              )}
              {turn.phase === 'speaking' && <Dots />}
              {turn.phase === 'error' && (
                <p className="max-w-[88%] font-serif text-[15px] text-bad">
                  Deb could not answer just now.{' '}
                  <button
                    onClick={() => run(turn.retry, turn.userLine)}
                    className="underline underline-offset-2 hover:opacity-80"
                  >
                    try again
                  </button>
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <NowStrip lens={lens} />

      {/* The solemn moment, re-homed (T4 ruling 1): the app's ONE confirm,
          reserved for the permanent verdicts, now staged from conversation.
          Deb set the pen down; the signature — and the write — are Chris's. */}
      {staged &&
        (staged.verdict === 'done' ? (
          <VerdictConfirm
            question={`"${staged.title}" — done, forever?`}
            detail="This is the clean yes. It becomes part of the record and never reopens."
            confirmLabel="Done forever"
            tone="ok"
            onConfirm={() => {
              goalVerdict(staged.id, 'done')
              setStaged(null)
            }}
            onCancel={() => setStaged(null)}
          />
        ) : (
          <VerdictConfirm
            question={`Drop "${staged.title}" — forever?`}
            detail="An honest ending, not a failure. It becomes part of the record and never reopens."
            confirmLabel="Drop forever"
            tone="bad"
            onConfirm={() => {
              goalVerdict(staged.id, 'dropped')
              setStaged(null)
            }}
            onCancel={() => setStaged(null)}
          />
        ))}

      {/* Deb's door — the one composer. Enter sends; Shift+Enter breaks a line
          (kept for external keyboards); the well grows to ~5 lines, then
          scrolls inside. Focus stays caret-only. Mobile: 16px input (no iOS
          zoom-jump), the round accent send button, safe-area clearance. */}
      <div className="mx-auto w-full max-w-[640px] px-5 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:px-8 md:pt-3 md:pb-7">
        <div className="composer flex items-end gap-3 rounded-[18px] px-4 py-2.5 md:items-start md:px-5 md:py-4">
          <span className="hidden text-lg leading-none font-light text-dim opacity-60 md:block">
            +
          </span>
          <textarea
            ref={taRef}
            autoFocus={!isMobile}
            rows={1}
            value={draft}
            maxLength={RAW_MAX}
            onPaste={() => {
              pastedRef.current = true
            }}
            placeholder={isMobile ? 'Tell Deb anything…' : 'Talk, drop, or ask anything…'}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(draft)
              }
            }}
            className="max-h-[120px] w-full resize-none self-center bg-transparent text-[16px] text-ink outline-none placeholder:text-dim md:text-[15px]"
          />
          <button
            onClick={() => send(draft)}
            aria-label="Send"
            disabled={!draft.trim()}
            className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-bg transition-opacity duration-150 disabled:opacity-35 md:hidden"
            style={{ backgroundColor: 'var(--t-accent)' }}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * The filed object (July 28 ruling): every filing leaves visible evidence
 * in the thread at the site of the act — a compact card in a tonal well,
 * visibly MATERIAL, never styled as Chris's prose. The whole object is a
 * door: tap → Read, open on that entry's page. The pasted-material sibling
 * of the margin-door pattern.
 */
function FiledCard({
  entry,
  world,
  minted,
  lens,
}: {
  entry: Entry
  world: Project | null
  minted: number
  lens: string | null
}) {
  const { setRoom } = useRoom()
  const { setLens } = useLens()
  const firstLine = (entry.distillate ?? '').split('\n').find((l) => l.trim()) ?? null

  return (
    <button
      onClick={() => {
        // The book door lands where the entry is visible: a world-routed
        // entry opens its world's pages (whole-life entries show anywhere).
        if (entry.project_id && entry.project_id !== lens) setLens(entry.project_id)
        useBook.getState().open(entry.entry_day)
        setRoom('read')
      }}
      className="rise ml-auto w-fit max-w-[78%] rounded-2xl bg-fill px-4 py-3 text-left transition-colors duration-150 hover:bg-fill2"
    >
      <span className="eyebrow block text-[0.58rem] text-dim">
        filed · {world?.name ?? 'silver'} · {shortDay(entry.entry_day)}
      </span>
      <span className="mt-1.5 block truncate font-serif text-[14px] leading-snug text-ink">
        {firstLine ?? <em className="text-muted">Filed — the raw is kept; distilling.</em>}
      </span>
      {minted > 0 && (
        <span className="mt-1 block text-[11px] text-muted">
          {minted} card{minted === 1 ? '' : 's'} dealt to React
        </span>
      )}
    </button>
  )
}

function Dots() {
  return (
    <div className="flex gap-1.5 py-1" aria-label="Deb is composing">
      {[0, 150, 300].map((d) => (
        <span
          key={d}
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-dim"
          style={{ animationDelay: `${d}ms` }}
        />
      ))}
    </div>
  )
}

