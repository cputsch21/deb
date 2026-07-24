import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { messageKeys, useMessages } from '../../db/queries/messages'
import { useProjects } from '../../db/queries/projects'
import { taskKeys, useTaskMutations } from '../../db/queries/tasks'
import { factKeys, useFactMutations } from '../../db/queries/facts'
import { MESSAGE_MAX } from '../../db/types'
import { streamDeb } from '../../lib/deb'
import { transient } from '../../lib/undo'

/** UI-only for now — a rotating set, tap to freeze. Context-wiring rides a later ticket. */
const QUOTES = [
  'Busy is not the same as forward.',
  'You can do anything, but not everything.',
  'The days are long, the years are short.',
  'What you schedule is what actually gets lived.',
  'Presence is the rent you pay for a life worth rereading.',
]

/** One in-flight turn. 'waiting' = the silent gap (nothing shown but your line);
 *  'speaking' = she's decided to speak (the dots); 'error' = the honest line + retry. */
type Turn = { text: string; phase: 'waiting' | 'speaking' | 'error' }

export function Reflect({ lens }: { lens: string | null }) {
  const qc = useQueryClient()
  const { data: messages = [] } = useMessages(lens)
  const { data: projects = [] } = useProjects()
  const { remove: removeTask } = useTaskMutations()
  const { forget: forgetFact } = useFactMutations()
  const world = projects.find((p) => p.id === lens) ?? null
  const [turn, setTurn] = useState<Turn | null>(null)
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Stay pinned to the newest line.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, turn])

  const send = async (raw: string) => {
    const content = raw.trim()
    if (!content) return
    if (turn && turn.phase !== 'error') return // one turn at a time (retry allowed)
    const projectId = lens
    setDraft('')
    setTurn({ text: content, phase: 'waiting' })

    let resolved = false
    await streamDeb(content, projectId, (e) => {
      if (e.type === 'delta') {
        // First delta = she's decided to speak. Now the dots may show.
        setTurn((t) => (t && t.phase === 'waiting' ? { ...t, phase: 'speaking' } : t))
      } else if (e.type === 'action') {
        // Act-then-correct: she made a write. It exists now — the pill is the undo.
        if (e.kind === 'task_created') {
          void qc.invalidateQueries({ queryKey: taskKeys.all })
          const id = e.id
          transient.undo(`Added · ${e.title.slice(0, 40)}`, () => removeTask(id, false))
        } else if (e.kind === 'fact_remembered') {
          void qc.invalidateQueries({ queryKey: factKeys.all })
          const id = e.id
          transient.undo(`Noted · ${e.content.slice(0, 40)}`, () => forgetFact(id, false))
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

  const daymark = world
    ? `${world.name} · same mind, narrowed`
    : new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Quote />

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[640px] flex-col gap-7 px-8 pt-7 pb-4">
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
                className="rise ml-auto max-w-[78%] text-right text-[14px] leading-relaxed text-ink opacity-80"
              >
                {m.content}
              </p>
            ),
          )}

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
                    onClick={() => send(turn.text)}
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

      {/* Deb's door — the one composer */}
      <div className="mx-auto w-full max-w-[640px] px-8 pt-3 pb-7">
        <div className="flex items-center gap-3 rounded-2xl bg-fill2 px-5 py-4 backdrop-blur">
          <span className="text-lg leading-none font-light text-dim opacity-60">+</span>
          <input
            autoFocus
            value={draft}
            maxLength={MESSAGE_MAX}
            placeholder="Talk, drop, or ask anything…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                send(draft)
              }
            }}
            className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-dim"
          />
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

function Quote() {
  const [i, setI] = useState(() => Math.floor(Math.random() * QUOTES.length))
  const [frozen, setFrozen] = useState(false)
  return (
    <button
      onClick={() => {
        if (frozen) {
          setFrozen(false)
          setI((n) => (n + 1) % QUOTES.length)
        } else {
          setFrozen(true)
        }
      }}
      title={frozen ? 'tap to release' : 'tap to hold'}
      className={`mx-auto mt-14 block max-w-[640px] px-8 text-center font-serif text-[15px] italic transition-colors duration-500 ${
        frozen ? 'text-accent opacity-100' : 'text-dim opacity-85'
      }`}
    >
      &ldquo;{QUOTES[i]}&rdquo;
    </button>
  )
}
