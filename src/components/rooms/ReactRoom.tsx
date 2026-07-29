import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useProjects } from '../../db/queries/projects'
import { taskKeys, useTasks, useTaskMutations } from '../../db/queries/tasks'
import { useEntryMeta } from '../../db/queries/entries'
import { supabase } from '../../lib/supabase'
import { DELEGATE_MAX, type EntryMeta, type Project, type Task } from '../../db/types'
import { useBook } from '../../lib/book'
import { useDoor } from '../../lib/door'
import { useLens } from '../../lib/lens'
import { useRoom } from '../../lib/rooms'
import { transient } from '../../lib/undo'
import { useLineWhys, type LineWhys } from '../../lib/lineWhys'
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
import { Sheet } from '../Sheet'
import { LoadFailed } from '../LoadFailed'

/**
 * REACT — decide. A triage pile, not a to-do list: its jurisdiction ends
 * at the verdict (July 29 ruling). The stage deals QUESTIONS only — fresh
 * loops, chases, stale re-deals — one card at a time; a verdicted card
 * never returns to center. When the stack runs dry, the sentence is the
 * state, full stop. The Line — decided things, standing — renders as a
 * quiet list at the room's edge (desktop rail; a sheet behind the counter
 * on mobile). The day is where decided things get done.
 *
 * The four D's by drag (desktop physics per the design target) or arrow
 * keys; the punch beneath finishes the front card. Every verdict is
 * act-then-correct — it lands instantly, the undo pill offers the
 * take-back, the next card deals. No confirms anywhere in this room.
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

  // the stage deals questions, never answers: the stack only
  const dealt = stack.length > 0 ? stack[0] : null

  const [exiting, setExiting] = useState<Exiting | null>(null)
  const [chooser, setChooser] = useState<Chooser | null>(null)
  const [lineOpen, setLineOpen] = useState(false)

  /* ---------- the verdicts (act-then-correct, no confirms) ---------- */

  const snapshot = (t: Task) => ({
    anchored_on: t.anchored_on,
    delegated_to: t.delegated_to,
    chase_on: t.chase_on,
    delegated_on: t.delegated_on,
  })

  const fly = (dir: Exiting['dir']) => {
    if (!dealt || exiting || chooser) return
    const { task, kind } = dealt
    const prev = snapshot(task)

    if (dir === 'right') {
      if (kind === 'chase') {
        setExiting({ task, kind, dir })
        update(task.id, { delegated_to: null, chase_on: null, delegated_on: null, anchored_on: today })
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

  /** The Line's done circle — the same gesture the Now strip taught. */
  const finish = (task: Task) => {
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
    update(task.id, {
      delegated_to: who,
      chase_on: chaseOn,
      delegated_on: today, // the hand-off's own receipt (July 29)
      anchored_on: null,
    })
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
  const behind = nDecide - 1
  const staged = exiting ?? dealt
  const world = staged ? (projects.find((p) => p.id === staged.task.project_id) ?? null) : null
  const accent = world?.color ?? 'var(--t-accent)'

  return (
    <div className="relative flex min-h-0 flex-1">
      {/* ---------- the stage: questions only ---------- */}
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-8">
        {/* counts — information, not guilt. Mobile: the Line's counter IS
            its door (no rail there); desktop: the rail carries the counter */}
        <span className="eyebrow absolute top-16 right-8 text-dim md:top-20">
          {nDecide > 0 ? `${nDecide} to decide` : ''}
          {nDecide > 0 && nLine > 0 && <span className="md:hidden"> · </span>}
          {nLine > 0 && (
            <button
              onClick={() => setLineOpen(true)}
              className="-my-4 inline-flex min-h-11 items-center align-middle transition-colors hover:text-ink md:hidden"
            >
              {nLine} on the line
            </button>
          )}
        </span>

        {!staged ? (
          /* the stack ran dry: the sentence is the state, full stop */
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="eyebrow text-dim">React</span>
            <h2 className="font-serif text-[26px] font-medium text-ink">Clear.</h2>
            <p className="text-sm text-muted">Every loop has a verdict. Go live it.</p>
          </div>
        ) : (
          <>
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
                key={staged.task.id + staged.kind}
                task={staged.task}
                kind={staged.kind}
                entry={entryMeta.find((e) => e.id === staged.task.source_entry_id) ?? null}
                worldName={world?.name ?? null}
                accent={accent}
                today={today}
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
          </>
        )}
      </div>

      {/* ---------- the Line, standing (desktop rail) ---------- */}
      {nLine > 0 && (
        <aside className="hidden min-h-0 w-[280px] flex-none flex-col pt-20 pr-7 pb-8 md:flex">
          <span className="eyebrow text-dim">{nLine} on the line</span>
          <div className="momentum mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
            {line.map((t, i) => (
              <LineRow
                key={t.id}
                task={t}
                world={projects.find((p) => p.id === t.project_id) ?? null}
                why={i === 0 ? whys.byId.get(t.id) : undefined}
                today={today}
                onDone={finish}
              />
            ))}
          </div>
        </aside>
      )}

      {/* ---------- the Line as a sheet (mobile — the counter's door) ---------- */}
      <LineSheet
        open={lineOpen}
        onClose={() => setLineOpen(false)}
        line={line}
        projects={projects}
        whys={whys}
        today={today}
        onDone={finish}
      />
    </div>
  )
}

/* ================= the standing Line ================= */

/**
 * One decided thing, standing. Read-and-done: the done circle completes
 * (standard undo pill); long-press / right-click is the door onto
 * Reflect's table. No drag-reorder, no editing in place — changes happen
 * by telling Deb. Order is the Line's order (her ranking); the why rides
 * the top card only — it's her answer to "what now?".
 */
function LineRow({
  task,
  world,
  why,
  today,
  onDone,
  onCarried,
}: {
  task: Task
  world: Project | null
  why: string | undefined
  today: string
  onDone: (task: Task) => void
  onCarried?: () => void
}) {
  const { knock } = useDoor()
  const { setRoom } = useRoom()
  const { setLens } = useLens()
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const clearHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current)
    holdTimer.current = null
  }
  const carry = () => {
    clearHold()
    // the door lands in the task's world (thread ruling, July 28)
    setLens(task.project_id)
    knock({
      type: 'object',
      object: 'task',
      content: task.title,
      from: 'the Line',
      world: world?.name ?? null,
      state: 'on the Line',
    })
    setRoom('reflect')
    onCarried?.()
  }

  const n = daysBetween(task.anchored_on!, today)
  const age = n === 0 ? 'anchored today' : `on the Line ${n} day${n === 1 ? '' : 's'}`

  return (
    <div
      className="flex items-center gap-1.5 rounded-xl bg-fill py-2.5 pr-1 pl-3.5"
      onContextMenu={(e) => {
        e.preventDefault()
        carry()
      }}
      onPointerDown={(e) => {
        if (e.pointerType !== 'touch') return
        start.current = { x: e.clientX, y: e.clientY }
        clearHold()
        holdTimer.current = setTimeout(carry, 500)
      }}
      onPointerMove={(e) => {
        // a scroll is a scroll — real movement cancels the hold
        if (!start.current) return
        if (
          Math.max(Math.abs(e.clientX - start.current.x), Math.abs(e.clientY - start.current.y)) >
          12
        )
          clearHold()
      }}
      onPointerUp={clearHold}
      onPointerCancel={clearHold}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className="h-[7px] w-[7px] flex-none rounded-full"
            style={{ backgroundColor: world?.color ?? 'var(--t-silver)' }}
          />
          <span className="truncate text-[13.5px] text-ink">{task.title}</span>
        </div>
        <div className="mt-1 pl-[15px] font-mono text-[0.58rem] tracking-[0.12em] text-dim uppercase">
          {age}
        </div>
        {why && (
          <p className="mt-1 max-w-[36ch] pl-[15px] font-serif text-[11.5px] leading-[1.5] text-muted italic">
            {why}
          </p>
        )}
      </div>
      <button
        aria-label={`Done: ${task.title}`}
        onClick={() => onDone(task)}
        className="flex h-11 w-11 flex-none items-center justify-center transition-opacity active:opacity-80"
      >
        <span
          className="block h-[22px] w-[22px] rounded-full"
          style={{ backgroundColor: world?.color ?? 'var(--t-accent)' }}
        />
      </button>
    </div>
  )
}

/** Mobile's Line: the standard Sheet behind the counter — same rows,
 *  same exits per the sheet law. The glance levels survive, re-dressed:
 *  Deb speaks the top · the strip glances the top · this shows all of it. */
function LineSheet({
  open,
  onClose,
  line,
  projects,
  whys,
  today,
  onDone,
}: {
  open: boolean
  onClose: () => void
  line: Task[]
  projects: Project[]
  whys: LineWhys
  today: string
  onDone: (task: Task) => void
}) {
  return (
    <Sheet open={open} onClose={onClose} label="on the line">
      <div className="mt-4 flex flex-col gap-2">
        {line.length === 0 ? (
          <p className="font-serif text-[13.5px] text-muted">Nothing stands decided right now.</p>
        ) : (
          line.map((t, i) => (
            <LineRow
              key={t.id}
              task={t}
              world={projects.find((p) => p.id === t.project_id) ?? null}
              why={i === 0 ? whys.byId.get(t.id) : undefined}
              today={today}
              onDone={onDone}
              onCarried={onClose}
            />
          ))
        )}
      </div>
    </Sheet>
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
  exitingDir,
  onFly,
}: {
  task: Task
  kind: CardKind
  entry: EntryMeta | null
  worldName: string | null
  accent: string
  today: string
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
      from: 'the stack',
      world: worldName,
      state: provenance(task, kind, entry),
    })
    setRoom('reflect')
  }

  // The receipt's door (July 29): the source line opens Read on the
  // entry, at that spot, for the full surround. Lands in the entry's
  // world per the thread ruling.
  const openSource = entry
    ? () => {
        setLens(entry.project_id)
        useBook.getState().open(entry.entry_day, entry.id)
        setRoom('read')
      }
    : null
  // A fresh card's top line IS the source line; with a receipt shown, it
  // moves beneath the excerpt as its attribution (one element, not two).
  const receipt = task.source_excerpt
  const topLine = !(kind === 'fresh' && receipt && entry)

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
      {topLine &&
        (kind === 'fresh' && openSource ? (
          <button
            onClick={openSource}
            className="eyebrow -my-3 inline-flex min-h-11 items-center text-dim transition-colors hover:text-ink"
          >
            {provenance(task, kind, entry)}
          </button>
        ) : (
          <span className="eyebrow block text-dim">{provenance(task, kind, entry)}</span>
        ))}

      <div className="mt-4 font-serif text-[22px] leading-[1.25] font-medium tracking-[-0.01em] text-ink">
        {kind === 'chase' ? `Chase ${task.delegated_to} — ${task.title}` : task.title}
      </div>

      {/* the receipt (July 29): why this card exists, in his words —
          verbatim at mint, the card's own "raw"; conversation-born cards
          carry none. Truncated calm; the door beneath holds the rest. */}
      {receipt && (
        <>
          <p className="mx-auto mt-3.5 line-clamp-3 max-w-[40ch] font-serif text-[13.5px] leading-[1.6] text-muted italic">
            &ldquo;{receipt}&rdquo;
          </p>
          {entry && openSource && (
            <button
              onClick={openSource}
              className="eyebrow mx-auto -mb-3 mt-1 flex min-h-11 items-center text-[0.58rem] text-dim transition-colors hover:text-ink"
            >
              {fromLine(entry)} · {shortDay(entry.entry_day)}
            </button>
          )}
        </>
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
          {ageLine(task, today)}
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
  if (kind === 'chase') {
    // the chase card's receipt (July 29): who it was handed to, and when
    return task.delegated_on
      ? `handed to ${task.delegated_to} ${shortDay(task.delegated_on)} · chase ${shortDay(task.chase_on!)}`
      : `waiting on ${task.delegated_to} · chase ${shortDay(task.chase_on!)}`
  }
  if (kind === 'stale') return `on the Line since ${shortDay(task.anchored_on!)} — still real?`
  if (entry) return fromLine(entry)
  return `from Reflect · ${shortDay(task.created_at.slice(0, 10))}`
}

/** "from Tuesday's Plaud call" — the entry's own line, shared by the top
 *  eyebrow and the receipt's attribution door. */
function fromLine(entry: EntryMeta): string {
  const [y, m, d] = entry.entry_day.split('-').map(Number)
  const weekday = new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long' })
  if (entry.source === 'plaud') return `from ${weekday}'s Plaud call`
  if (entry.source === 'remarkable') return `from ${weekday}'s reMarkable page`
  if (entry.source === 'email') return `from ${weekday}'s mail`
  return `from ${weekday}'s filing`
}

/** Age in the same muted mono as everything else. Information, never guilt. */
function ageLine(task: Task, today: string): string {
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

/**
 * The third row (July 29 ruling — replace, don't repair): a 1–5 day
 * slider, quiet Warm Glass track, whole-day snaps, live preview of the
 * resolved day. Drag-release commits — the same one-pause-deep cadence
 * as the presets; arrow keys nudge, Enter commits, per the room's
 * keyboard grammar. Anything past five days is the conversation's job:
 * tell Deb, her delegate hand takes any date.
 */
function DaySlider({
  n,
  setN,
  today,
  prefix,
  disabled,
  onCommit,
}: {
  n: number
  setN: (n: number) => void
  today: string
  prefix: string
  disabled?: boolean
  onCommit: (day: string) => void
}) {
  const day = addDays(today, n)
  return (
    <div
      className={`flex flex-col gap-2.5 rounded-xl bg-fill px-4 py-3 ${disabled ? 'opacity-40' : ''}`}
    >
      <div className="flex min-h-5 items-center justify-between text-[15px] text-ink">
        <span>
          {prefix} {n} day{n === 1 ? '' : 's'}
        </span>
        <span className="eyebrow text-dim">{shortDay(day)}</span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={n}
        disabled={disabled}
        aria-label={`${prefix} how many days`}
        onChange={(e) => setN(Number(e.target.value))}
        onPointerUp={() => !disabled && onCommit(addDays(today, n))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !disabled) {
            e.preventDefault()
            onCommit(day)
          }
        }}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-fill2 outline-none [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-accent [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent"
      />
    </div>
  )
}

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
  const [n, setN] = useState(2)
  const picks = [
    { label: 'tomorrow', day: addDays(today, 1), key: '1' },
    { label: 'next week', day: addDays(today, 7), key: '2' },
  ]
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return
      if (e.key === 'Escape') onCancel()
      if (e.key === '1') onPick(picks[0].day)
      if (e.key === '2') onPick(picks[1].day)
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') setN(Math.max(1, n - 1))
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') setN(Math.min(5, n + 1))
      if (e.key === 'Enter') onPick(addDays(today, n))
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
        <DaySlider
          n={n}
          setN={setN}
          today={today}
          prefix={kind === 'chase' ? 'chase in' : 'in'}
          onCommit={onPick}
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
  const [n, setN] = useState(2)
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
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') setN(Math.max(1, n - 1))
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') setN(Math.min(5, n + 1))
      if (e.key === 'Enter') commit(addDays(today, n))
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
        {/* the near week lives here; the calendar lives in the
            conversation — "chase Karthik in three weeks" is Deb's hand */}
        <DaySlider
          n={n}
          setN={setN}
          today={today}
          prefix="chase in"
          disabled={!who.trim()}
          onCommit={commit}
        />
        <button onClick={onCancel} className="min-h-11 text-sm text-dim hover:text-ink">
          never mind
        </button>
      </div>
    </div>
  )
}
