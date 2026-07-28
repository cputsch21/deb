import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useProjects } from '../../db/queries/projects'
import { taskKeys, useTasks, useTaskMutations } from '../../db/queries/tasks'
import { useEntryMeta } from '../../db/queries/entries'
import { supabase } from '../../lib/supabase'
import { DELEGATE_MAX, type EntryMeta, type Task } from '../../db/types'
import { useDoor } from '../../lib/door'
import { useLens } from '../../lib/lens'
import { useRoom } from '../../lib/rooms'
import { transient } from '../../lib/undo'
import { useLineWhys } from '../../lib/lineWhys'
import {
  addDays,
  ageInDays,
  applyDebOrder,
  daysBetween,
  dealStack,
  deriveLine,
  shortDay,
  todayKey,
  type CardKind,
} from '../../lib/line'
import { LoadFailed } from '../LoadFailed'

/**
 * REACT — decide and do. One stage, one card at a time: every undecided
 * open loop first (fresh · chase · stale re-deals), then the Line's moves,
 * each with Deb's why when her ranking has landed. The four D's by drag
 * (desktop physics per the design target) or arrow keys; the punch beneath
 * finishes the front card. Every verdict is act-then-correct — it lands
 * instantly, the undo pill offers the take-back, the next card deals.
 * No confirms anywhere in this room.
 *
 * Age is information, never guilt (redline law): age renders in the same
 * muted mono as the source line — no OVERDUE, no red, no warning weight.
 * The stale return is the mechanism that handles neglect; these pixels
 * never scold.
 */

const FLY_MS = 220 // the deck exit, per the motion table
const NO_TASKS: Task[] = []
const NO_PROJECTS: never[] = []

type Chooser =
  | { mode: 'delay'; task: Task; kind: CardKind }
  | { mode: 'delegate'; task: Task; kind: CardKind }

type Exiting = { task: Task; kind: CardKind; dir: 'right' | 'left' | 'up' | 'down' }

export function ReactRoom({ lens }: { lens: string | null }) {
  const { room } = useRoom()
  const tasksQ = useTasks()
  const projectsQ = useProjects()
  const tasks = tasksQ.data ?? NO_TASKS
  const projects = projectsQ.data ?? NO_PROJECTS
  const { update, setDone, remove } = useTaskMutations()
  const { data: entryMeta = [] } = useEntryMeta()
  const qc = useQueryClient()
  const today = todayKey()

  const stack = useMemo(() => dealStack(tasks, lens, today), [tasks, lens, today])
  const whys = useLineWhys(room === 'react')
  const line = useMemo(
    () => applyDebOrder(deriveLine(tasks, lens, today), whys.order),
    [tasks, lens, today, whys.order],
  )

  // → on a Line card passes it (view-only, silent, no write). Cycles.
  const [passed, setPassed] = useState<string[]>([])
  const lineView = useMemo(() => {
    const remaining = line.filter((t) => !passed.includes(t.id))
    return remaining.length > 0 ? remaining : line
  }, [line, passed])

  const dealt = useMemo(
    () =>
      stack.length > 0
        ? stack[0]
        : lineView.length > 0
          ? { task: lineView[0], kind: 'line' as const }
          : null,
    [stack, lineView],
  )

  const [exiting, setExiting] = useState<Exiting | null>(null)
  const [chooser, setChooser] = useState<Chooser | null>(null)

  /* ---------- the verdicts (act-then-correct, no confirms) ---------- */

  const snapshot = (t: Task) => ({
    anchored_on: t.anchored_on,
    delegated_to: t.delegated_to,
    chase_on: t.chase_on,
  })

  const fly = (dir: Exiting['dir']) => {
    if (!dealt || exiting || chooser) return
    const { task, kind } = dealt
    const prev = snapshot(task)

    if (dir === 'right') {
      if (kind === 'line') {
        // pass — silent, view-only
        setExiting({ task, kind, dir })
        setPassed((p) => (p.includes(task.id) ? p : [...p, task.id]))
      } else if (kind === 'chase') {
        setExiting({ task, kind, dir })
        update(task.id, { delegated_to: null, chase_on: null, anchored_on: today })
        transient.undo(`Back on you · ${task.title.slice(0, 32)}`, () => update(task.id, prev))
      } else {
        setExiting({ task, kind, dir })
        update(task.id, { anchored_on: today })
        transient.undo(`On the Line · ${task.title.slice(0, 32)}`, () => update(task.id, prev))
      }
    } else if (dir === 'down') {
      setExiting({ task, kind, dir })
      remove(task.id) // soft delete + the standard pill
      // The extractor must visibly learn (T4): a deleted MINTED card is
      // logged as not-a-thing — but only after the undo window has passed
      // untaken, so a take-back never teaches the wrong lesson.
      if (task.source_entry_id) {
        const entryId = task.source_entry_id
        setTimeout(() => {
          const stillDeleted = !qc
            .getQueryData<Task[]>(taskKeys.all)
            ?.some((t) => t.id === task.id)
          if (stillDeleted) {
            void supabase
              .from('extractor_feedback')
              .insert({ title: task.title, entry_id: entryId })
              .then(({ error }) => {
                if (error) console.error('[extractor_feedback]', error)
              })
          }
        }, 6500)
      }
    } else if (dir === 'up') {
      setChooser({ mode: 'delay', task, kind })
    } else {
      setChooser({ mode: 'delegate', task, kind })
    }
  }

  const punch = () => {
    if (!dealt || exiting || chooser) return
    const { task, kind } = dealt
    setExiting({ task, kind, dir: 'right' })
    setDone(task.id, true)
    transient.undo(`Done · ${task.title.slice(0, 32)}`, () => setDone(task.id, false))
  }

  const commitDelay = (day: string) => {
    if (!chooser) return
    const { task, kind } = chooser
    const prev = snapshot(task)
    setChooser(null)
    setExiting({ task, kind, dir: 'up' })
    if (kind === 'chase') {
      update(task.id, { chase_on: day }) // the chase moves; the delegation stands
      transient.undo(`Chase moved to ${shortDay(day)}`, () => update(task.id, prev))
    } else {
      update(task.id, { anchored_on: day })
      transient.undo(`Sleeping until ${shortDay(day)}`, () => update(task.id, prev))
    }
  }

  const commitDelegate = (who: string, chaseOn: string) => {
    if (!chooser) return
    const { task, kind } = chooser
    const prev = snapshot(task)
    setChooser(null)
    setExiting({ task, kind, dir: 'left' })
    update(task.id, { delegated_to: who, chase_on: chaseOn, anchored_on: null })
    transient.undo(`Waiting on ${who.slice(0, 24)} · chase ${shortDay(chaseOn)}`, () =>
      update(task.id, prev),
    )
  }

  // the flight: verdict already landed; the card finishes leaving, next deals
  useEffect(() => {
    if (!exiting) return
    const t = setTimeout(() => setExiting(null), FLY_MS)
    return () => clearTimeout(t)
  }, [exiting])

  /* ---------- arrow keys: first-class input (desktop) ---------- */
  useEffect(() => {
    if (room !== 'react') return
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return
      if (chooser) return // the chooser owns its own keys
      const map: Record<string, Exiting['dir']> = {
        ArrowRight: 'right',
        ArrowLeft: 'left',
        ArrowUp: 'up',
        ArrowDown: 'down',
      }
      if (map[e.key]) {
        e.preventDefault()
        fly(map[e.key])
      } else if (e.key === 'Enter') {
        e.preventDefault()
        punch()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /* ---------- reads must fail honest ---------- */
  if (tasksQ.isError || projectsQ.isError) {
    return (
      <LoadFailed
        what="The stack"
        onRetry={() => {
          void tasksQ.refetch()
          void projectsQ.refetch()
        }}
      />
    )
  }

  const nDecide = stack.length
  const nLine = line.length
  const behind = (nDecide > 0 ? nDecide : lineView.length) - 1

  /* ---------- both stages dry: the plain warm sentence ---------- */
  if (!dealt && !exiting) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
        <span className="eyebrow text-dim">React</span>
        <h2 className="font-serif text-[26px] font-medium text-ink">Clear.</h2>
        <p className="text-sm text-muted">Every loop has a verdict. Go live it.</p>
      </div>
    )
  }

  const show = exiting ?? dealt!
  const world = projects.find((p) => p.id === show.task.project_id) ?? null
  const accent = world?.color ?? 'var(--t-accent)'
  const why = show.kind === 'line' ? whys.byId.get(show.task.id) : undefined

  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-8">
      {/* counts — information, not guilt */}
      <span className="eyebrow absolute top-16 right-8 text-dim md:top-20">
        {nDecide > 0 ? `${nDecide} to decide` : ''}
        {nDecide > 0 && nLine > 0 ? ' · ' : ''}
        {nLine > 0 ? `${nLine} on the line` : ''}
      </span>

      {/* the four directions */}
      <Dir pos="top" label="↑ delay" />
      <Dir pos="right" label="do →" />
      <Dir pos="left" label="← delegate" />
      <Dir pos="bottom" label="↓ delete" />

      {chooser ? (
        chooser.mode === 'delay' ? (
          <DelayChooser
            kind={chooser.kind}
            today={today}
            onPick={commitDelay}
            onCancel={() => setChooser(null)}
          />
        ) : (
          <DelegateChooser
            task={chooser.task}
            today={today}
            onCommit={commitDelegate}
            onCancel={() => setChooser(null)}
          />
        )
      ) : (
        <Card
          key={show.task.id + show.kind}
          task={show.task}
          kind={show.kind}
          entry={entryMeta.find((e) => e.id === show.task.source_entry_id) ?? null}
          worldName={world?.name ?? null}
          accent={accent}
          today={today}
          why={why}
          exitingDir={exiting?.dir ?? null}
          onFly={fly}
        />
      )}

      {/* the punch — finishing the front card */}
      {!chooser && (
        <button
          onClick={punch}
          aria-label="Done"
          className="mt-9 flex h-[74px] w-[74px] items-center justify-center rounded-full text-2xl text-white transition-transform duration-150 hover:scale-105 active:scale-95"
          style={{ backgroundColor: accent }}
        >
          ✓
        </button>
      )}

      {behind > 0 && (
        <span className="eyebrow absolute bottom-7 left-1/2 -translate-x-1/2 text-dim">
          {behind} behind this one
        </span>
      )}
    </div>
  )
}

/* ================= the card ================= */

function Card({
  task,
  kind,
  entry,
  worldName,
  accent,
  today,
  why,
  exitingDir,
  onFly,
}: {
  task: Task
  kind: CardKind
  entry: EntryMeta | null
  worldName: string | null
  accent: string
  today: string
  why: string | undefined
  exitingDir: Exiting['dir'] | null
  onFly: (dir: Exiting['dir']) => void
}) {
  const el = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number } | null>(null)
  const [dxy, setDxy] = useState<{ dx: number; dy: number } | null>(null)

  // The table door (T4 ruling 2): long-press (mobile) / right-click
  // (desktop) carries this card into Reflect as a quoted object — the
  // margin-door pattern, provenance law included. A held touch that
  // hasn't moved is a carry, not a drag.
  const { knock } = useDoor()
  const { setRoom } = useRoom()
  const { setLens } = useLens()
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clearHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current)
    holdTimer.current = null
  }
  const carry = () => {
    clearHold()
    drag.current = null
    setDxy(null)
    // the door lands in the task's world (thread ruling, July 28)
    setLens(task.project_id)
    knock({
      type: 'object',
      object: 'task',
      content: task.title,
      from: kind === 'line' ? 'the Line' : 'the stack',
      world: worldName,
      state: provenance(task, kind, entry),
    })
    setRoom('reflect')
  }

  const lit =
    dxy && Math.max(Math.abs(dxy.dx), Math.abs(dxy.dy)) > 16
      ? Math.abs(dxy.dx) > Math.abs(dxy.dy)
        ? dxy.dx > 0
          ? 'right'
          : 'left'
        : dxy.dy > 0
          ? 'down'
          : 'up'
      : null

  const transform = exitingDir
    ? {
        right: 'translate(720px, 0) rotate(12deg)',
        left: 'translate(-720px, 0) rotate(-12deg)',
        up: 'translate(0, -900px)',
        down: 'translate(0, 900px)',
      }[exitingDir]
    : dxy
      ? `translate(${dxy.dx}px, ${dxy.dy}px) rotate(${Math.max(-12, Math.min(12, dxy.dx * 0.04))}deg)`
      : undefined

  // The card owns its touches (gesture-ownership ruling): data-own-touch +
  // touch-action none — the pager never moves for a touch born here.
  return (
    <div
      ref={el}
      data-own-touch
      className={`deck-card relative w-[min(430px,86vw)] cursor-grab rounded-[22px] px-8 py-8 text-center select-none ${
        exitingDir ? 'transition-all duration-[220ms] ease-out' : dxy ? '' : 'rise'
      }`}
      style={{
        touchAction: 'none',
        transform,
        opacity: exitingDir ? 0 : 1,
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        carry()
      }}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, y: e.clientY }
        el.current?.setPointerCapture(e.pointerId)
        // a 500ms hold with no real movement = the carry, for touch
        if (e.pointerType === 'touch') {
          clearHold()
          holdTimer.current = setTimeout(carry, 500)
        }
      }}
      onPointerMove={(e) => {
        if (!drag.current) return
        const dx = e.clientX - drag.current.x
        const dy = e.clientY - drag.current.y
        if (Math.max(Math.abs(dx), Math.abs(dy)) > 12) clearHold()
        setDxy({ dx, dy })
      }}
      onPointerUp={() => {
        clearHold()
        const d = dxy
        drag.current = null
        setDxy(null)
        if (!d) return
        const ax = Math.abs(d.dx)
        const ay = Math.abs(d.dy)
        if (Math.max(ax, ay) > 110) {
          onFly(ax > ay ? (d.dx > 0 ? 'right' : 'left') : d.dy > 0 ? 'down' : 'up')
        }
      }}
      onPointerCancel={() => {
        clearHold()
        drag.current = null
        setDxy(null)
      }}
    >
      <span className="eyebrow block text-dim">{provenance(task, kind, entry)}</span>

      <div className="mt-4 font-serif text-[22px] leading-[1.25] font-medium tracking-[-0.01em] text-ink">
        {kind === 'chase' ? `Chase ${task.delegated_to} — ${task.title}` : task.title}
      </div>

      {why && (
        <p className="mx-auto mt-3.5 max-w-[40ch] font-serif text-[14px] leading-[1.55] text-muted italic">
          {why}
        </p>
      )}

      <div className="mt-5 flex items-center justify-center gap-2.5">
        <span className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: accent }} />
        <span
          className="font-mono text-[0.6rem] tracking-[0.14em] uppercase"
          style={{ color: worldName ? accent : 'var(--t-dim)' }}
        >
          {worldName ?? 'bench'}
        </span>
        <span className="ml-2 font-mono text-[0.6rem] tracking-[0.12em] text-dim uppercase">
          {ageLine(task, kind, today)}
        </span>
      </div>
      {/* the drag hints light through the parent Dir components via `lit` —
          rendered here so the card and hints stay in one gesture */}
      <DirLit lit={lit} />
    </div>
  )
}

/** The source line — where this loop came from. Minted cards wear their entry. */
function provenance(task: Task, kind: CardKind, entry: EntryMeta | null): string {
  if (kind === 'chase') return `waiting on ${task.delegated_to} · chase ${shortDay(task.chase_on!)}`
  if (kind === 'stale') return `on the Line since ${shortDay(task.anchored_on!)} — still real?`
  if (kind === 'line') return 'on the Line'
  if (entry) {
    const [y, m, d] = entry.entry_day.split('-').map(Number)
    const weekday = new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long' })
    if (entry.source === 'plaud') return `from ${weekday}'s Plaud call`
    if (entry.source === 'remarkable') return `from ${weekday}'s reMarkable page`
    return `from ${weekday}'s filing`
  }
  return `from Reflect · ${shortDay(task.created_at.slice(0, 10))}`
}

/** Age in the same muted mono as everything else. Information, never guilt. */
function ageLine(task: Task, kind: CardKind, today: string): string {
  if (kind === 'line') {
    const n = daysBetween(task.anchored_on!, today)
    return n === 0 ? 'anchored today' : `on the Line ${n} day${n === 1 ? '' : 's'}`
  }
  const n = ageInDays(task.created_at, today)
  return n === 0 ? 'opened today' : `open ${n} day${n === 1 ? '' : 's'}`
}

/* ================= direction hints ================= */

function Dir({ pos, label }: { pos: 'top' | 'right' | 'bottom' | 'left'; label: string }) {
  const place = {
    top: 'top-[4.5rem] left-1/2 -translate-x-1/2 md:top-24',
    bottom: 'bottom-16 left-1/2 -translate-x-1/2',
    left: 'left-6 top-1/2 -translate-y-1/2',
    right: 'right-6 top-1/2 -translate-y-1/2',
  }[pos]
  return (
    <span
      data-dir={pos}
      className={`eyebrow pointer-events-none absolute ${place} text-dim opacity-40 transition-opacity duration-100`}
    >
      {label}
    </span>
  )
}

/** Lights the matching hint while dragging — colors per the design target. */
function DirLit({ lit }: { lit: 'up' | 'down' | 'left' | 'right' | null }) {
  useEffect(() => {
    const colors: Record<string, string> = {
      right: 'var(--t-ok)',
      up: 'var(--t-accent)',
      left: 'var(--t-purple)', // the minted delegate purple (T4 ruling 7)
      down: 'var(--t-bad)',
    }
    const map: Record<string, string> = { up: 'top', down: 'bottom', left: 'left', right: 'right' }
    for (const d of ['up', 'down', 'left', 'right']) {
      const el = document.querySelector<HTMLElement>(`[data-dir="${map[d]}"]`)
      if (!el) continue
      const on = lit === d
      el.style.opacity = on ? '1' : ''
      el.style.color = on ? colors[d] : ''
    }
    return () => {
      for (const pos of ['top', 'bottom', 'left', 'right']) {
        const el = document.querySelector<HTMLElement>(`[data-dir="${pos}"]`)
        if (el) {
          el.style.opacity = ''
          el.style.color = ''
        }
      }
    }
  }, [lit])
  return null
}

/* ================= the two choosers (one tap deep) ================= */

function DelayChooser({
  kind,
  today,
  onPick,
  onCancel,
}: {
  kind: CardKind
  today: string
  onPick: (day: string) => void
  onCancel: () => void
}) {
  const picks = [
    { label: 'tomorrow', day: addDays(today, 1), key: '1' },
    { label: 'next week', day: addDays(today, 7), key: '2' },
  ]
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === '1') onPick(picks[0].day)
      if (e.key === '2') onPick(picks[1].day)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  return (
    <div className="deck-card w-[min(430px,86vw)] rounded-[22px] px-7 py-7">
      <span className="eyebrow block text-center text-dim">
        {kind === 'chase' ? 'chase again on…' : 'sleep until…'}
      </span>
      <div className="mt-4 flex flex-col gap-2">
        {picks.map((p) => (
          <button
            key={p.label}
            onClick={() => onPick(p.day)}
            className="flex min-h-11 items-center justify-between rounded-xl bg-fill px-4 text-[15px] text-ink transition-colors duration-150 hover:bg-fill2"
          >
            <span>{p.label}</span>
            <span className="eyebrow text-dim">{shortDay(p.day)}</span>
          </button>
        ))}
        <input
          type="date"
          min={addDays(today, 1)}
          onChange={(e) => e.target.value && onPick(e.target.value)}
          aria-label="Pick a date"
          className="min-h-11 rounded-xl bg-fill px-4 text-[15px] text-ink outline-none"
        />
        <button onClick={onCancel} className="min-h-11 text-sm text-dim hover:text-ink">
          never mind
        </button>
      </div>
    </div>
  )
}

function DelegateChooser({
  task,
  today,
  onCommit,
  onCancel,
}: {
  task: Task
  today: string
  onCommit: (who: string, chaseOn: string) => void
  onCancel: () => void
}) {
  const [who, setWho] = useState(task.delegated_to ?? '')
  const picks = [
    { label: 'chase in 3 days', day: addDays(today, 3), key: '1' },
    { label: 'chase next week', day: addDays(today, 7), key: '2' },
  ]
  const commit = (day: string) => {
    if (who.trim()) onCommit(who.trim(), day)
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  return (
    <div className="deck-card w-[min(430px,86vw)] rounded-[22px] px-7 py-7">
      <span className="eyebrow block text-center text-dim">hand it to…</span>
      <div className="mt-4 flex flex-col gap-2">
        <input
          autoFocus
          value={who}
          maxLength={DELEGATE_MAX}
          placeholder="who?"
          onChange={(e) => setWho(e.target.value)}
          className="min-h-11 rounded-xl bg-fill px-4 text-[16px] text-ink outline-none placeholder:text-dim"
        />
        {picks.map((p) => (
          <button
            key={p.label}
            onClick={() => commit(p.day)}
            disabled={!who.trim()}
            className="flex min-h-11 items-center justify-between rounded-xl bg-fill px-4 text-[15px] text-ink transition-colors duration-150 not-disabled:hover:bg-fill2 disabled:opacity-40"
          >
            <span>{p.label}</span>
            <span className="eyebrow text-dim">{shortDay(p.day)}</span>
          </button>
        ))}
        <input
          type="date"
          min={addDays(today, 1)}
          onChange={(e) => e.target.value && commit(e.target.value)}
          disabled={!who.trim()}
          aria-label="Pick a chase date"
          className="min-h-11 rounded-xl bg-fill px-4 text-[15px] text-ink outline-none disabled:opacity-40"
        />
        <button onClick={onCancel} className="min-h-11 text-sm text-dim hover:text-ink">
          never mind
        </button>
      </div>
    </div>
  )
}
