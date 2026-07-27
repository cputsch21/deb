import { useRef, type ReactNode } from 'react'
import { useProjects } from '../../db/queries/projects'
import { useTasks, useTaskMutations } from '../../db/queries/tasks'
import { useDoor } from '../../lib/door'
import { useRoom } from '../../lib/rooms'
import { applyDebOrder, deriveLine, todayKey } from '../../lib/line'
import { useIsMobile } from '../../lib/useIsMobile'
import { useLineWhys } from '../../lib/lineWhys'
import { transient } from '../../lib/undo'
import type { Task } from '../../db/types'

/**
 * The Now strip (above the composer in Reflect): the Line's glance level —
 * the same one queue React deals, top first, as soft cards. World dot +
 * tag, title, Deb's why when her ranking has landed (an honest "on the
 * line" until then), and the done circle. Mobile: up to six, momentum
 * scroll, no pagination dots; `data-own-touch` so a touch starting here
 * scrolls the strip, never the pager. Desktop: the two-chip window onto
 * the Line, per the one-queue law (T4 ruling 3 closed the gap).
 */
export function NowStrip({ lens }: { lens: string | null }) {
  const { data: tasks = [] } = useTasks()
  const { data: projects = [] } = useProjects()
  const { setDone } = useTaskMutations()
  const isMobile = useIsMobile()
  const whys = useLineWhys(true)

  const line = applyDebOrder(deriveLine(tasks, lens, todayKey()), whys.order).slice(
    0,
    isMobile ? 6 : 2,
  )
  if (line.length === 0) return null

  return (
    <div
      data-own-touch
      className="momentum mx-auto flex w-full max-w-[640px] gap-2.5 overflow-x-auto px-5 pb-2 md:overflow-visible md:px-8 md:pb-3"
      style={{ touchAction: 'pan-x pan-y', scrollbarWidth: 'none' }}
    >
      {line.map((t) => {
        const p = projects.find((pp) => pp.id === t.project_id) ?? null
        const why = whys.byId.get(t.id)
        return (
          <Chip key={t.id} task={t} worldName={p?.name ?? null}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 flex-none rounded-full"
                  style={{ backgroundColor: p?.color ?? 'var(--t-silver)' }}
                />
                <span className="truncate font-mono text-[0.58rem] tracking-[0.14em] text-dim uppercase">
                  {p ? p.name : 'bench'}
                </span>
              </div>
              <div className="mt-1 truncate text-[13px] text-ink">{t.title}</div>
              <div className="mt-0.5 truncate font-serif text-[11px] text-dim italic">
                {why ?? 'on the line'}
              </div>
            </div>
            <button
              aria-label={`Done: ${t.title}`}
              onClick={() => {
                setDone(t.id, true)
                transient.undo(`Done · ${t.title.slice(0, 30)}`, () => setDone(t.id, false))
              }}
              className="flex h-11 w-11 flex-none items-center justify-center active:opacity-80"
            >
              <span
                className="block h-[22px] w-[22px] rounded-full"
                style={{ backgroundColor: p?.color ?? 'var(--t-accent)' }}
              />
            </button>
          </Chip>
        )
      })}
    </div>
  )
}

/**
 * One chip — and a door (T4 ruling 2): long-press / right-click carries
 * the task onto Reflect's table as a quoted object. A touch that scrolls
 * the strip cancels the hold; the tap targets inside stay taps.
 */
function Chip({
  task,
  worldName,
  children,
}: {
  task: Task
  worldName: string | null
  children: ReactNode
}) {
  const { knock } = useDoor()
  const { setRoom } = useRoom()
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const clearHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current)
    holdTimer.current = null
  }
  const carry = () => {
    clearHold()
    knock({
      type: 'object',
      object: 'task',
      content: task.title,
      from: 'the Line',
      world: worldName,
      state: 'on the Line',
    })
    setRoom('reflect')
  }
  return (
    <div
      className="flex w-[220px] flex-none items-center gap-2 rounded-2xl bg-fill py-3 pr-1 pl-4"
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
      {children}
    </div>
  )
}
