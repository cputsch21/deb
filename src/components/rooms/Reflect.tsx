import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { messageKeys, useMessages } from '../../db/queries/messages'
import { projectKeys, useProjects, useProjectMutations } from '../../db/queries/projects'
import { taskKeys, useTaskMutations } from '../../db/queries/tasks'
import { factKeys, useFactMutations } from '../../db/queries/facts'
import { entryKeys, useEntryMutations } from '../../db/queries/entries'
import { useDoor } from '../../lib/door'
import { RAW_MAX } from '../../db/types'
import { streamDeb } from '../../lib/deb'
import { LoadFailed } from '../LoadFailed'
import { NowStrip } from '../mobile/NowStrip'
import { useIsMobile } from '../../lib/useIsMobile'
import { transient } from '../../lib/undo'

/** One in-flight turn. 'waiting' = the silent gap (nothing shown but your line);
 *  'speaking' = she's decided to speak (the dots); 'error' = the honest line + retry.
 *  `pasted` rides along so a RETRY of a failed material paste stays material. */
type Turn = { text: string; phase: 'waiting' | 'speaking' | 'error'; pasted: boolean }

export function Reflect({ lens }: { lens: string | null }) {
  const qc = useQueryClient()
  const { data: messages = [], isError, refetch } = useMessages(lens)
  const { data: projects = [] } = useProjects()
  const { remove: removeTask } = useTaskMutations()
  const { forget: forgetFact } = useFactMutations()
  const { update: updateProject } = useProjectMutations()
  const { hide: hideEntry } = useEntryMutations()
  const world = projects.find((p) => p.id === lens) ?? null
  const isMobile = useIsMobile()
  const [turn, setTurn] = useState<Turn | null>(null)
  const [draft, setDraft] = useState('')
  // Act receipts (mobile thread ruling, July 24): small inline pill chips,
  // session-ephemeral — the append-only thread stays pure conversation.
  const [receipts, setReceipts] = useState<{ id: string; label: string }[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  // Redline (July 24): the paste EVENT is the primary material signal —
  // typed text of any length is conversation. The flag rides the message.
  const pastedRef = useRef(false)

  // Stay pinned to the newest line.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, turn])

  // The composer grows with the draft (to ~5 lines, then scrolls inside).
  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [draft])

  // The margin door (T6): a tapped note arrives as a pending line — the tap
  // authored it — and sends the moment the thread is free.
  const pendingKnock = useDoor((s) => s.pending)
  useEffect(() => {
    if (!pendingKnock || (turn && turn.phase !== 'error')) return
    useDoor.getState().clear()
    void send(pendingKnock)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingKnock])

  const send = async (raw: string, pastedOverride?: boolean) => {
    const content = raw.trim()
    if (!content) return
    if (turn && turn.phase !== 'error') return // one turn at a time (retry allowed)
    const projectId = lens
    const pasted = pastedOverride ?? pastedRef.current
    pastedRef.current = false
    setDraft('')
    setTurn({ text: content, phase: 'waiting', pasted })

    let resolved = false
    await streamDeb(content, projectId, pasted, (e) => {
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
          // Filing is the act; the chip is the receipt; undo un-files —
          // the entry surface hides, minted cards go with it. The raw
          // beneath stays kept, as law.
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
          setReceipts((r) => [...r, { id: entryId, label }])
          transient.undo(label, () => {
            void hideEntry(entryId)
            for (const tid of taskIds) removeTask(tid, false)
            setReceipts((r) => r.filter((x) => x.id !== entryId))
          })
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

          {messages.map((m) =>
            m.role === 'deb' ? (
              <p key={m.id} className="rise max-w-[88%] font-serif text-[16.5px] leading-[1.68] text-ink">
                {m.content}
              </p>
            ) : (
              <p
                key={m.id}
                className="rise ml-auto max-w-[78%] text-right text-[15px] leading-relaxed text-ink opacity-80 md:text-[14px]"
              >
                {m.content}
              </p>
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

          {turn && (
            <>
              <p className="rise ml-auto max-w-[78%] text-right text-[14px] leading-relaxed text-ink opacity-80">
                {turn.text}
              </p>
              {turn.phase === 'speaking' && <Dots />}
              {turn.phase === 'error' && (
                <p className="max-w-[88%] font-serif text-[15px] text-bad">
                  Deb could not answer just now.{' '}
                  <button
                    onClick={() => send(turn.text, turn.pasted)}
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

      {/* Deb's door — the one composer. Enter sends; Shift+Enter breaks a line
          (kept for external keyboards); the well grows to ~5 lines, then
          scrolls inside. Focus stays caret-only. Mobile: 16px input (no iOS
          zoom-jump), the round accent send button, safe-area clearance. */}
      <div className="mx-auto w-full max-w-[640px] px-5 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:px-8 md:pt-3 md:pb-7">
        <div className="flex items-end gap-3 rounded-2xl bg-fill2 px-4 py-2.5 backdrop-blur md:items-start md:px-5 md:py-4">
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

