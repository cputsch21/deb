import { useLens } from '../../lib/lens'
import { useDoor } from '../../lib/door'
import { useRoom } from '../../lib/rooms'
import { LoadFailed } from '../LoadFailed'
import { dealStack, deriveLine, shortDay as lineShortDay, todayKey } from '../../lib/line'
import { useState } from 'react'
import { useProjects, useProjectMutations, useRetiredProjects } from '../../db/queries/projects'
import { transient } from '../../lib/undo'
import { useGoals } from '../../db/queries/goals'
import { useTasks } from '../../db/queries/tasks'
import type { Goal, Project, Task } from '../../db/types'

/**
 * REVIEW — where things stand. A warm, read-only dossier per world
 * (M3 T1, per the re-cut). Everything on this screen is DERIVED from the
 * spine — nothing maintained, nothing tappable into action (the law:
 * read-only is the feature). The one allowed tap is navigation: a world
 * card steps into that world, exactly like the rail.
 *
 * Next draws from the same queue React works — the one-queue law — and
 * Waiting-on shows who owes what (delegations, chase dates). Read-only,
 * like everything here. Empty sections stay silent rather than performing
 * fullness.
 */
export function Review({ lens }: { lens: string | null }) {
  const projectsQ = useProjects()
  const retiredQ = useRetiredProjects()
  const goalsQ = useGoals()
  const tasksQ = useTasks()
  const { restore } = useProjectMutations()
  const projects = projectsQ.data ?? []
  const retired = retiredQ.data ?? []
  const goals = goalsQ.data ?? []
  const tasks = tasksQ.data ?? []
  const world = projects.find((p) => p.id === lens) ?? null
  // The finished shelf (M6 T2): a retired world being visited, read-only.
  const [shelfId, setShelfId] = useState<string | null>(null)
  const shelfWorld = retired.find((p) => p.id === shelfId) ?? null

  // Law: a failed dossier load never renders as an empty study — the shelf
  // included (a missing shelf would be a silent lie about retired worlds).
  if (projectsQ.isError || goalsQ.isError || tasksQ.isError || retiredQ.isError) {
    const retry = () => {
      void projectsQ.refetch()
      void goalsQ.refetch()
      void tasksQ.refetch()
      void retiredQ.refetch()
    }
    return <LoadFailed what="The dossiers" onRetry={retry} />
  }

  return (
    <div className="momentum min-h-0 flex-1 overflow-y-auto">
      {shelfWorld ? (
        <div className="pb-12">
          {/* the shelf view: a finished thing, visited without being resurrected */}
          <div className="mx-auto flex max-w-[640px] items-center gap-4 px-8 pt-8 md:pt-21">
            <button
              onClick={() => setShelfId(null)}
              className="text-[12.5px] text-dim transition-colors hover:text-ink"
            >
              ← the study
            </button>
            <span className="eyebrow text-dim">
              the shelf{shelfWorld.deleted_at ? ` · retired ${shortDate(shelfWorld.deleted_at)}` : ''}
            </span>
            <button
              onClick={() => {
                const row = shelfWorld
                setShelfId(null)
                restore(row)
                transient.notice(`${row.name} returned to the rail`)
              }}
              className="eyebrow ml-auto text-dim transition-colors hover:text-ink"
            >
              un-retire
            </button>
          </div>
          <div className="opacity-80">
            <Dossier world={shelfWorld} goals={goals} tasks={tasks} />
          </div>
        </div>
      ) : world ? (
        <Dossier world={world} goals={goals} tasks={tasks} />
      ) : (
        <>
          <WorldGrid projects={projects} goals={goals} tasks={tasks} />
          {retired.length > 0 && (
            <div className="mx-auto max-w-[860px] px-6 pb-12 md:px-11">
              <span className="eyebrow block text-dim opacity-70">the finished shelf</span>
              <div className="mt-3 flex flex-col">
                {retired.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setShelfId(p.id)}
                    className="flex min-h-11 items-center gap-3 rounded-xl px-2 py-2.5 text-left opacity-55 transition-opacity hover:opacity-90"
                  >
                    <span
                      className="h-2 w-2 flex-none rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="font-serif text-[15px] font-medium text-ink">{p.name}</span>
                    {p.mission && (
                      <span className="min-w-0 flex-1 truncate font-serif text-[12.5px] text-muted italic">
                        &ldquo;{p.mission}&rdquo;
                      </span>
                    )}
                    {p.deleted_at && (
                      <span className="ml-auto flex-none text-[11px] text-dim">
                        {shortDate(p.deleted_at)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ---------- home: every world at a glance ---------- */

function WorldGrid({
  projects,
  goals,
  tasks,
}: {
  projects: Project[]
  goals: Goal[]
  tasks: Task[]
}) {
  const { setLens } = useLens()

  return (
    <div className="mx-auto max-w-[860px] px-6 pt-6 pb-10 md:px-11 md:pt-21">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-medium text-ink">Review</h1>
        <p className="mt-1 font-serif text-[12.5px] text-dim italic">
          Every world, at a glance — pick one to sit down with it.
        </p>
      </div>

      {projects.length === 0 ? (
        <p className="py-14 text-center font-serif text-lg text-muted">
          No worlds yet — make one on the rail, and its dossier grows here.
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
          {projects.map((p) => (
            <WorldCard
              key={p.id}
              project={p}
              goals={goals.filter((g) => g.project_id === p.id)}
              tasks={tasks.filter((t) => t.project_id === p.id)}
              onOpen={() => setLens(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function WorldCard({
  project,
  goals,
  tasks,
  onOpen,
}: {
  project: Project
  goals: Goal[]
  tasks: Task[]
  onOpen: () => void
}) {
  const open = tasks.filter((t) => !t.done_at)
  const done = tasks.filter((t) => t.done_at)
  const active = goals.filter((g) => g.status === 'active')
  const momentum = tasks.length ? done.length / tasks.length : 0

  return (
    <button
      onClick={onOpen}
      className="group relative overflow-hidden rounded-[20px] bg-fill px-6 py-5 text-left transition-all duration-200 hover:-translate-y-[3px] hover:bg-fill2"
    >
      {/* the world's tint, felt not seen */}
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(165deg, color-mix(in oklab, ${project.color} 7%, transparent), transparent 50%)`,
        }}
      />
      <span className="relative flex items-center gap-2.5">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: project.color }} />
        <span className="font-serif text-[18px] font-medium text-ink">{project.name}</span>
      </span>
      <span className="relative mt-2.5 block text-[12.5px] leading-relaxed text-muted">
        {statusLine(active.length, open.length, done)}
      </span>
      <span
        className="relative mt-4 block h-[3px] overflow-hidden rounded-full"
        style={{ background: `color-mix(in oklab, ${project.color} 16%, transparent)` }}
      >
        <span
          className="block h-full rounded-full"
          style={{ width: `${Math.round(momentum * 100)}%`, backgroundColor: project.color }}
        />
      </span>
    </button>
  )
}

/** The honest one-liner: what's open, and when this world last finished something. */
function statusLine(activeGoals: number, openTasks: number, done: Task[]): string {
  const parts: string[] = []
  if (activeGoals) parts.push(`${activeGoals} goal${activeGoals === 1 ? '' : 's'} active`)
  if (openTasks) parts.push(`${openTasks} open`)
  const lastDone = done.map((t) => t.done_at!).sort().at(-1)
  if (lastDone) parts.push(`last finish ${shortDate(lastDone)}`)
  return parts.length ? parts.join(' · ') : 'quiet — nothing open'
}

/* ---------- a world: the dossier ---------- */

function Dossier({ world, goals, tasks }: { world: Project; goals: Goal[]; tasks: Task[] }) {
  const { knock } = useDoor()
  const { setRoom } = useRoom()
  // Ruling 1: Review stays read-only, but a goal is a DOOR — tap it and
  // Reflect opens with it quoted on the table (provenance law: her pickup,
  // never words in his voice). The conversation is the editor.
  const openGoal = (g: Goal) => {
    knock({ label: 'goal', source: `Review · ${world.name}`, content: g.title })
    setRoom('reflect')
  }
  const wGoals = goals.filter((g) => g.project_id === world.id)
  const wTasks = tasks.filter((t) => t.project_id === world.id)
  // Next = the same queue React deals (the one-queue law): the Line's moves,
  // then what's still waiting for a verdict.
  const today = todayKey()
  const next = [
    ...deriveLine(tasks, world.id, today).map((t) => ({ task: t, tag: 'on the line' })),
    ...dealStack(tasks, world.id, today).map((c) => ({ task: c.task, tag: 'to decide' })),
  ].slice(0, 6)
  const waiting = wTasks.filter((t) => !t.done_at && t.delegated_to !== null)

  // Recently: a dated ledger of what actually happened — finishes and verdicts.
  const recent: { date: string; text: string }[] = [
    ...wTasks
      .filter((t) => t.done_at)
      .map((t) => ({ date: t.done_at!, text: `Finished — ${t.title}` })),
    ...wGoals
      .filter((g) => g.resolved_at)
      .map((g) => ({
        date: g.resolved_at!,
        text: `${g.status === 'done' ? 'Goal done' : 'Goal dropped'} — ${g.title}`,
      })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7)

  return (
    <div className="mx-auto max-w-[640px] px-6 pt-6 pb-12 md:px-8 md:pt-21">
      <h1 className="font-serif text-[26px] font-medium text-ink">{world.name}</h1>
      {world.mission && (
        <p className="mt-1.5 font-serif text-[15px] text-muted italic">
          &ldquo;{world.mission}&rdquo;
        </p>
      )}

      {wGoals.length > 0 && (
        <section className="mt-8">
          <span className="eyebrow block text-dim">Goals</span>
          <div className="mt-2">
            {wGoals.map((g) => (
              <button
                key={g.id}
                onClick={() => openGoal(g)}
                className="flex min-h-11 w-full items-baseline gap-3 border-b border-hair py-2.5 text-left transition-colors duration-150 last:border-b-0 hover:bg-fill"
              >
                <span className="flex-1 font-serif text-[16.5px] font-medium text-ink">
                  {g.title}
                </span>
                <span className="text-[11px] text-dim">{goalStatus(g)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section className="mt-8">
          <span className="eyebrow block text-dim">Recently</span>
          <div className="mt-2">
            {recent.map((r, i) => (
              <div key={i} className="flex gap-3.5 py-2 text-[13.5px] leading-relaxed text-ink">
                <span className="w-13 flex-none pt-0.5 font-mono text-[0.62rem] tracking-wide text-dim">
                  {shortDate(r.date)}
                </span>
                <span>{r.text}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {next.length > 0 && (
        <section className="mt-8">
          <span className="eyebrow block text-dim">Next</span>
          <div className="mt-2">
            {next.map(({ task, tag }) => (
              <div key={task.id} className="flex items-center gap-2.5 py-2 text-[13.5px] text-ink">
                <span
                  className="h-1.5 w-1.5 flex-none rounded-full opacity-80"
                  style={{ backgroundColor: world.color }}
                />
                <span className="min-w-0 flex-1 truncate">{task.title}</span>
                <span className="text-[11px] text-dim">{tag}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {waiting.length > 0 && (
        <section className="mt-8">
          <span className="eyebrow block text-dim">Waiting on</span>
          <div className="mt-2">
            {waiting.map((t) => (
              <div key={t.id} className="flex items-center gap-2.5 py-2 text-[13.5px]">
                <span className="font-semibold text-ink">{t.delegated_to}</span>
                <span className="min-w-0 flex-1 truncate text-ink">— {t.title}</span>
                <span className="text-[11px] text-accent">
                  chase {t.chase_on ? lineShortDay(t.chase_on) : ''}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {wGoals.length === 0 && recent.length === 0 && next.length === 0 && waiting.length === 0 && (
        <p className="mt-10 font-serif text-lg text-muted">
          Quiet — nothing open, nothing owed. That&rsquo;s allowed.
        </p>
      )}
    </div>
  )
}

function goalStatus(g: Goal): string {
  if (g.status === 'active') return 'active'
  const when = g.resolved_at ? ` · ${shortDate(g.resolved_at)}` : ''
  return `${g.status}${when}`
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
