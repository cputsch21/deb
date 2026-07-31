import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useProjects } from '../../db/queries/projects'
import { taskKeys, useTasks, useTaskMutations } from '../../db/queries/tasks'
import { useEntryMeta } from '../../db/queries/entries'
import { proven } from '../../db/proof'
import { Proof } from '../Proof'
import { supabase } from '../../lib/supabase'
import { DELEGATE_MAX, type EntryMeta, type Project, type Task } from '../../db/types'
import { useBook } from '../../lib/book'
import { useDoor } from '../../lib/door'
import { useLens } from '../../lib/lens'
import { useRoom } from '../../lib/rooms'
import { useIsMobile } from '../../lib/useIsMobile'
import { transient } from '../../lib/undo'
import { addDays, ageInDays, daysBetween, dealStack, shortDay, todayKey, type CardKind } from '../../lib/line'

/**
 * TRIAGE focus (P4) — the Paper's second focus state. The stack deals
 * QUESTIONS only, one card center-stage on the elevated surface (one of
 * the four sanctioned shadows), the four verbs as flat-well zones around
 * it. The verdict machinery is the V1 room's, carried whole: drag
 * physics, arrow keys, act-then-correct with the undo pill, choosers
 * with presets + the 1–5 slider (opens at 3, flag 7), stale returns,
 * chase cards, the extractor's not-a-thing learning.
 *
 * Enter finishes the front card with no visual (flag 5 law): for chase
 * cards ✓ was always a first-class verdict; for ordinary cards it is
 * the keyboard-only admission the thing already happened. Esc walks the
 * cascade: chooser → the page. When the stack runs dry the sentence is
 * the state, and the page quietly returns.
 */

const FLY_MS = 220
const CLEAR_RETURN_MS = 1600

type Dir = 'right' | 'left' | 'up' | 'down'
type Chooser =
  | { mode: 'delay'; task: Task; kind: CardKind }
  | { mode: 'delegate'; task: Task; kind: CardKind }
type Exiting = { task: Task; kind: CardKind; dir: Dir }

/**
 * EMPTINESS MUST BE EARNED, and this surface earns it first (ruling,
 * July 31). Every other failure on the page renders a lie you can
 * refresh away. Here the verdicts are PERMANENT — VerdictConfirm exists
 * precisely because they cannot be walked back — so a card dealt from a
 * half-loaded stack is an irreversible answer to an incomplete question.
 * It is the only failure in twenty whose consequence outlives the page.
 * Nothing deals until all three reads are proven.
 */
export function TriageFocus({ lens }: { lens: string | null }) {
  const tasks = proven(useTasks())
  const projects = proven(useProjects())
  const entryMeta = proven(useEntryMeta())

  return (
    <Proof of={[tasks, projects, entryMeta]} line="The verdicts aren't loading" center>
      {([tasks, projects, entryMeta]) => (
        <TriageStage lens={lens} tasks={tasks} projects={projects} entryMeta={entryMeta} />
      )}
    </Proof>
  )
}

/** The stage takes proven rows — it cannot be rendered without them. */
function TriageStage({
  lens,
  tasks,
  projects,
  entryMeta,
}: {
  lens: string | null
  tasks: Task[]
  projects: Project[]
  entryMeta: EntryMeta[]
}) {
  const { setRoom } = useRoom()
  const isMobile = useIsMobile()
  const { update, setDone, remove } = useTaskMutations()
  const qc = useQueryClient()
  const today = todayKey()

  const stack = useMemo(() => dealStack(tasks, lens, today), [tasks, lens, today])
  const dealt = stack.length > 0 ? stack[0] : null
  const [exiting, setExiting] = useState<Exiting | null>(null)
  const [chooser, setChooser] = useState<Chooser | null>(null)
  const [lit, setLit] = useState<Dir | null>(null)

  /* ---------- the verdicts (act-then-correct, carried whole) ---------- */

  const snapshot = (t: Task) => ({
    anchored_on: t.anchored_on,
    delegated_to: t.delegated_to,
    chase_on: t.chase_on,
    delegated_on: t.delegated_on,
  })

  const fly = (dir: Dir) => {
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
        transient.undo(`On the list · ${task.title.slice(0, 32)}`, () => update(task.id, prev))
      }
    } else if (dir === 'down') {
      setExiting({ task, kind, dir })
      remove(task.id)
      // the extractor must visibly learn (T4): only after the undo window
      if (task.source_entry_id) {
        const entryId = task.source_entry_id
        setTimeout(() => {
          const stillDeleted = !qc.getQueryData<Task[]>(taskKeys.all)?.some((t) => t.id === task.id)
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

  /** Enter — the verdict "it already happened" (flag 5): no visual. */
  const finish = () => {
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
      update(task.id, { chase_on: day })
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
      delegated_on: today,
      anchored_on: null,
    })
    transient.undo(`Waiting on ${who.slice(0, 24)} · chase ${shortDay(chaseOn)}`, () =>
      update(task.id, prev),
    )
  }

  useEffect(() => {
    if (!exiting) return
    const t = setTimeout(() => setExiting(null), FLY_MS)
    return () => clearTimeout(t)
  }, [exiting])

  /* ---------- clear: the sentence, then the page returns ---------- */
  const clear = !dealt && !exiting
  useEffect(() => {
    if (!clear) return
    const t = setTimeout(() => setRoom('read'), CLEAR_RETURN_MS)
    return () => clearTimeout(t)
  }, [clear, setRoom])

  /* ---------- keyboard grammar: arrows · Enter · Esc cascade ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (chooser) setChooser(null)
        else setRoom('read')
        return
      }
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return
      if (chooser) return // the chooser owns its own keys
      const map: Record<string, Dir> = {
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
        finish()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (clear) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-8 text-center">
        <span className="eyebrow text-dim">Triage clear</span>
        <p className="mt-3.5 max-w-[36ch] font-serif text-[22px] leading-[1.5] text-muted italic">
          Clear. Every loop has a verdict. Go live it.
        </p>
      </div>
    )
  }

  const staged = exiting ?? dealt!
  const world = projects.find((p) => p.id === staged.task.project_id) ?? null
  const position = stack.length > 0 ? stack.length : 1

  const verb = (dir: Dir, label: string, extra = '') => (
    <button
      onClick={() => fly(dir)}
      className={`eyebrow flex min-h-11 items-center justify-center rounded-full px-4.5 whitespace-nowrap transition-colors ${
        lit === dir ? 'bg-fill2 text-ink' : 'bg-fill text-muted hover:bg-fill2 hover:text-ink'
      } ${extra}`}
    >
      {label}
    </button>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4 pb-6 md:gap-5">
      <span className="eyebrow text-[0.6rem] text-muted">
        Card 1 of {position}
      </span>

      {/* the compass: flat-well verbs around the one floating card */}
      {isMobile ? (
        <div className="flex min-h-0 w-full flex-1 flex-col gap-1.5">
          {verb('up', '↑ delay', 'w-full')}
          <div className="flex min-h-0 flex-1 items-stretch gap-1.5">
            {verb('left', '← delegate', 'w-13 [writing-mode:vertical-rl] rotate-180')}
            <div className="flex min-w-0 flex-1 items-center">
              <TriageCard
                staged={staged}
                world={world}
                entry={entryMeta.find((e) => e.id === staged.task.source_entry_id) ?? null}
                today={today}
                exiting={exiting}
                onFly={fly}
                onLit={setLit}
              />
            </div>
            {verb('right', 'do →', 'w-13 [writing-mode:vertical-rl]')}
          </div>
          {verb('down', '↓ delete', 'w-full')}
        </div>
      ) : (
        <div className="grid grid-cols-[130px_460px_130px] grid-rows-[auto_auto_auto] items-center justify-items-center gap-4">
          <div className="col-start-2 row-start-1">{verb('up', '↑ delay')}</div>
          <div className="col-start-1 row-start-2">{verb('left', '← delegate')}</div>
          <div className="col-start-2 row-start-2 w-[460px]">
            <TriageCard
              staged={staged}
              world={world}
              entry={entryMeta.find((e) => e.id === staged.task.source_entry_id) ?? null}
              today={today}
              exiting={exiting}
              onFly={fly}
              onLit={setLit}
            />
          </div>
          <div className="col-start-3 row-start-2">{verb('right', 'do →')}</div>
          <div className="col-start-2 row-start-3">{verb('down', '↓ delete')}</div>
        </div>
      )}

      {/* the choosers — floating surfaces (flag 1) */}
      {chooser &&
        (chooser.mode === 'delay' ? (
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
        ))}
    </div>
  )
}

/* ================= the card ================= */

function TriageCard({
  staged,
  world,
  entry,
  today,
  exiting,
  onFly,
  onLit,
}: {
  staged: { task: Task; kind: CardKind }
  world: { id: string; name: string; color: string } | null
  entry: EntryMeta | null
  today: string
  exiting: Exiting | null
  onFly: (dir: Dir) => void
  onLit: (dir: Dir | null) => void
}) {
  const { task, kind } = staged
  const el = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number } | null>(null)
  const [dxy, setDxy] = useState<{ dx: number; dy: number } | null>(null)

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
    setLens(task.project_id)
    knock({
      type: 'object',
      object: 'task',
      content: task.title,
      from: 'triage',
      world: world?.name ?? null,
      state: provenance(task, kind, entry),
    })
    setRoom('reflect')
  }

  const openSource = entry
    ? () => {
        setLens(entry.project_id)
        useBook.getState().open(entry.entry_day, entry.id)
        setRoom('read')
      }
    : null
  const receipt = task.source_excerpt

  useEffect(() => {
    if (!dxy) {
      onLit(null)
      return
    }
    const big = Math.max(Math.abs(dxy.dx), Math.abs(dxy.dy)) > 16
    onLit(
      big
        ? Math.abs(dxy.dx) > Math.abs(dxy.dy)
          ? dxy.dx > 0
            ? 'right'
            : 'left'
          : dxy.dy > 0
            ? 'down'
            : 'up'
        : null,
    )
  }, [dxy, onLit])

  const exitDir = exiting?.dir ?? null
  const transform = exitDir
    ? {
        right: 'translate(720px, 0) rotate(12deg)',
        left: 'translate(-720px, 0) rotate(-12deg)',
        up: 'translate(0, -900px)',
        down: 'translate(0, 900px)',
      }[exitDir]
    : dxy
      ? `translate(${dxy.dx}px, ${dxy.dy}px) rotate(${Math.max(-12, Math.min(12, dxy.dx * 0.04))}deg)`
      : undefined

  return (
    <div
      ref={el}
      data-own-touch
      className={`w-full cursor-grab rounded-[18px] bg-[var(--t-card)] px-7 py-7 select-none md:px-9 md:py-8 ${
        exitDir ? 'transition-all duration-[220ms] ease-out' : dxy ? '' : 'rise'
      } shadow-[0_30px_80px_rgba(25,23,19,0.16),0_6px_18px_rgba(25,23,19,0.09)]`}
      style={{ touchAction: 'none', transform, opacity: exitDir ? 0 : 1 }}
      onContextMenu={(e) => {
        e.preventDefault()
        carry()
      }}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, y: e.clientY }
        el.current?.setPointerCapture(e.pointerId)
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
      <span className="eyebrow block text-[0.58rem] text-dim">
        {provenance(task, kind, entry)}
      </span>
      <div className="mt-2.5 font-serif text-[21px] leading-[1.3] font-medium tracking-[-0.005em] text-ink md:text-[22px]">
        {kind === 'chase' ? `Chase ${task.delegated_to} — ${task.title}` : task.title}
      </div>
      {receipt && (
        <>
          <p className="mt-3 line-clamp-3 font-serif text-[14.5px] leading-[1.55] text-muted italic md:text-[15px]">
            &ldquo;{receipt}&rdquo;
          </p>
          {entry && openSource && (
            <button
              onClick={openSource}
              className="eyebrow -mb-2 mt-0.5 flex min-h-11 items-center text-[0.56rem] text-dim transition-colors hover:text-ink"
            >
              {fromLine(entry)} · {shortDay(entry.entry_day)}
            </button>
          )}
        </>
      )}
      <div className="mt-4 flex items-center gap-2.5">
        <span
          className="h-[9px] w-[9px] rounded-full"
          style={{ backgroundColor: world?.color ?? 'var(--t-silver)' }}
        />
        <span
          className="font-mono text-[0.6rem] tracking-[0.14em] uppercase"
          style={{ color: world ? world.color : 'var(--t-dim)' }}
        >
          {world?.name ?? 'bench'}
        </span>
        <span className="ml-2 font-mono text-[0.6rem] tracking-[0.12em] text-dim uppercase">
          {ageLine(task, kind, today)}
        </span>
      </div>
    </div>
  )
}

/* ================= provenance ================= */

function provenance(task: Task, kind: CardKind, entry: EntryMeta | null): string {
  if (kind === 'chase') {
    return task.delegated_on
      ? `handed to ${task.delegated_to} ${shortDay(task.delegated_on)} · chase ${shortDay(task.chase_on!)}`
      : `waiting on ${task.delegated_to} · chase ${shortDay(task.chase_on!)}`
  }
  if (kind === 'stale') return `standing since ${shortDay(task.anchored_on!)} — still real?`
  if (entry) return fromLine(entry)
  return `from the thread · ${shortDay(task.created_at.slice(0, 10))}`
}

function fromLine(entry: EntryMeta): string {
  const [y, m, d] = entry.entry_day.split('-').map(Number)
  const weekday = new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long' })
  if (entry.source === 'plaud') return `from ${weekday}'s Plaud call`
  if (entry.source === 'remarkable') return `from ${weekday}'s reMarkable page`
  if (entry.source === 'email') return `from ${weekday}'s mail`
  return `from ${weekday}'s filing`
}

function ageLine(task: Task, kind: CardKind, today: string): string {
  if (kind === 'stale') {
    const n = daysBetween(task.anchored_on!, today)
    return `${n} days standing`
  }
  const n = ageInDays(task.created_at, today)
  return n === 0 ? 'opened today' : `open ${n} day${n === 1 ? '' : 's'}`
}

/* ================= the choosers (floating, flag 1) ================= */

const CHOOSER_SHADOW = 'shadow-[0_18px_50px_rgba(25,23,19,0.14),0_3px_10px_rgba(25,23,19,0.06)]'

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
  const [n, setN] = useState(3) // opens at 3 (flag 7)
  const picks = [
    { label: 'tomorrow', day: addDays(today, 1) },
    { label: 'next week', day: addDays(today, 7) },
  ]
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return
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
    <div
      className={`rise fixed bottom-0 left-0 z-50 w-full rounded-[14px] rounded-b-none bg-[var(--t-card)] px-5 py-4.5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:static md:w-[min(460px,92vw)] md:rounded-[14px] md:pb-4.5 ${CHOOSER_SHADOW}`}
    >
      <span className="eyebrow block text-[0.58rem] text-dim">
        {kind === 'chase' ? 'chase again on…' : 'sleep until…'}
      </span>
      <div className="mt-3 flex flex-col gap-2">
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
  const [n, setN] = useState(3) // opens at 3 (flag 7)
  const picks = [
    { label: 'chase in 3 days', day: addDays(today, 3) },
    { label: 'chase next week', day: addDays(today, 7) },
  ]
  const commit = (day: string) => {
    if (who.trim()) onCommit(who.trim(), day)
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
    <div
      className={`rise fixed bottom-0 left-0 z-50 w-full rounded-[14px] rounded-b-none bg-[var(--t-card)] px-5 py-4.5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:static md:w-[min(460px,92vw)] md:rounded-[14px] md:pb-4.5 ${CHOOSER_SHADOW}`}
    >
      <span className="eyebrow block text-[0.58rem] text-dim">hand it to…</span>
      <div className="mt-3 flex flex-col gap-2">
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
        {/* the near week lives here; the calendar lives in the conversation */}
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
