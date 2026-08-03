import { useMemo, useRef } from 'react'
import { useProjects } from '../../db/queries/projects'
import { useTasks, useTaskMutations } from '../../db/queries/tasks'
import { useDoor } from '../../lib/door'
import { useLens } from '../../lib/lens'
import { useRoom } from '../../lib/rooms'
import { orDefaultOrder, useLineWhys } from '../../lib/lineWhys'
import { localDayString } from '../../lib/day'
import { applyDebOrder, daysBetween, deriveLine, todayKey } from '../../lib/line'
import { transient } from '../../lib/undo'
import { useOpenTask } from '../../lib/openTask'
import { Proof } from '../Proof'
import type { Project, Task } from '../../db/types'

/**
 * TO DO + FINISHED — the center column's lower half (P5, under the
 * July 29 re-ruling): the obligation lifecycle reads top to bottom —
 * TRIAGE (undecided) → TO DO (decided, standing) → FINISHED
 * (done, with times). The list is the Line, standing: her ranking, her
 * ≤12-word why on the top row only, age in muted mono, a done circle
 * per row (tap → the row settles into FINISHED beneath, same grammar,
 * undo pill intact). Rows are doors per the standing law; no reorder,
 * no editing in place — changes happen by telling Deb.
 */
export function TodoList({ lens }: { lens: string | null }) {
  const tasks = useTasks()
  const projects = useProjects()
  // Header and count both live inside, because the count is derived and a
  // derived value with no proof prints no value. On failure the well's own
  // sentence names the section ("The list isn't loading"), so nothing is
  // left unlabelled.
  return (
    <div className="mt-8">
      <Proof of={[tasks, projects]} line="The list isn't loading">
        {([tasks, projects]) => <TodoLists lens={lens} tasks={tasks} projects={projects} />}
      </Proof>
    </div>
  )
}

function TodoLists({
  lens,
  tasks,
  projects,
}: {
  lens: string | null
  tasks: Task[]
  projects: Project[]
}) {
  const { setDone } = useTaskMutations()
  const whys = orDefaultOrder(useLineWhys(true))
  const today = todayKey()

  const line = useMemo(
    () => applyDebOrder(deriveLine(tasks, lens, today), whys.order),
    [tasks, lens, today, whys.order],
  )
  const finished = useMemo(
    () =>
      tasks
        .filter(
          (t) =>
            t.done_at &&
            localDayString(new Date(t.done_at)) === today &&
            (lens === null || t.project_id === lens),
        )
        .sort((a, b) => (a.done_at ?? '').localeCompare(b.done_at ?? '')),
    [tasks, lens, today],
  )

  const finish = (task: Task) => {
    setDone(task.id, true)
    transient.undo(`Done · ${task.title.slice(0, 32)}`, () => setDone(task.id, false))
  }

  return (
    <>
      <div>
        <div className="eyebrow mb-3">
          To Do{line.length > 0 && <span className="ml-2 text-accent-ink">{line.length}</span>}
        </div>
        {line.length === 0 ? (
          <p className="py-1 font-serif text-[14.5px] text-dim italic">
            Nothing standing in this lens.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {line.map((t, i) => (
              <TodoRow
                key={t.id}
                task={t}
                world={projects.find((p) => p.id === t.project_id) ?? null}
                why={i === 0 ? whys.byId.get(t.id) : undefined}
                today={today}
                onDone={finish}
              />
            ))}
          </div>
        )}
      </div>

      {finished.length > 0 && (
        <div className="mt-8">
          <div className="eyebrow mb-3">
            Finished <span className="ml-2 text-accent-ink">{finished.length}</span>
          </div>
          <div className="flex flex-col gap-2.5">
            {finished.map((t) => (
              <div
                key={t.id}
                className="rise grid grid-cols-[20px_1fr_auto] items-center gap-x-2.5 rounded-xl bg-fill px-3.5 py-3"
              >
                <span className="grid w-5 place-items-center text-[12px] text-accent-ink">✓</span>
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2 w-2 flex-none rounded-full"
                    style={{
                      backgroundColor:
                        projects.find((p) => p.id === t.project_id)?.color ?? 'var(--t-silver)',
                    }}
                  />
                  <span className="truncate text-[14px] font-medium text-muted">{t.title}</span>
                </span>
                <span className="eyebrow text-[0.56rem] text-dim">{timeOf(t.done_at!)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

/** One decided thing, standing — read-and-done, and a door. */
function TodoRow({
  task,
  world,
  why,
  today,
  onDone,
}: {
  task: Task
  world: Project | null
  why: string | undefined
  today: string
  onDone: (task: Task) => void
}) {
  const { knock } = useDoor()
  const { setRoom } = useRoom()
  const { setLens } = useLens()
  const openTask = useOpenTask((s) => s.open)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const clearHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current)
    holdTimer.current = null
  }
  const carry = () => {
    clearHold()
    setLens(task.project_id)
    knock({
      type: 'object',
      object: 'task',
      content: task.title,
      from: 'the list',
      world: world?.name ?? null,
      state: 'standing, decided',
    })
    setRoom('reflect')
  }

  const n = daysBetween(task.anchored_on!, today)
  const age = n === 0 ? 'today' : `${n} day${n === 1 ? '' : 's'}`

  return (
    <div
      className="grid cursor-pointer grid-cols-[20px_1fr_auto] items-start gap-x-2.5 rounded-xl bg-fill px-3.5 py-3 transition-colors hover:bg-fill2"
      onClick={() => openTask(task.id)}
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
      <button
        aria-label={`Done: ${task.title}`}
        onClick={(e) => {
          // THE DECISION WINS. The done circle sits inside a row that
          // opens the modal, so without this a completion would also open
          // it. Same care as the Triage backdrop: an action region never
          // doubles as a navigation region.
          e.stopPropagation()
          onDone(task)
        }}
        className="-m-2.5 grid h-11 w-11 place-items-center"
      >
        <span className="block h-[19px] w-[19px] rounded-full bg-fill2 transition-colors hover:bg-[var(--t-silver)]" />
      </button>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 flex-none rounded-full"
            style={{ backgroundColor: world?.color ?? 'var(--t-silver)' }}
          />
          <span className="truncate text-[14px] leading-[1.35] font-medium text-ink">
            {task.title}
          </span>
        </div>
        {why && (
          <p className="mt-1 pl-4 font-serif text-[13.5px] leading-[1.5] text-muted italic">
            {why}
          </p>
        )}
      </div>
      <span className="eyebrow mt-0.5 text-[0.56rem] text-dim">{age}</span>
    </div>
  )
}

function timeOf(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(/\s?([AP])M$/i, (_, p: string) => p.toLowerCase())
}
