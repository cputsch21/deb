import { useLens } from '../../lib/lens'
import { LoadFailed } from '../LoadFailed'
import { useProjects } from '../../db/queries/projects'
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
 * Not here yet, honestly: the mission line (arrives with the intake
 * interview) and Waiting-on (arrives with People in M4). Empty sections
 * stay silent rather than performing fullness.
 */
export function Review({ lens }: { lens: string | null }) {
  const projectsQ = useProjects()
  const goalsQ = useGoals()
  const tasksQ = useTasks()
  const projects = projectsQ.data ?? []
  const goals = goalsQ.data ?? []
  const tasks = tasksQ.data ?? []
  const world = projects.find((p) => p.id === lens) ?? null

  // Law: a failed dossier load never renders as an empty study.
  if (projectsQ.isError || goalsQ.isError || tasksQ.isError) {
    const retry = () => {
      void projectsQ.refetch()
      void goalsQ.refetch()
      void tasksQ.refetch()
    }
    return <LoadFailed what="The dossiers" onRetry={retry} />
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {world ? (
        <Dossier world={world} goals={goals} tasks={tasks} />
      ) : (
        <WorldGrid projects={projects} goals={goals} tasks={tasks} />
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
    <div className="mx-auto max-w-[860px] px-11 pt-21 pb-10">
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
  const wGoals = goals.filter((g) => g.project_id === world.id)
  const wTasks = tasks.filter((t) => t.project_id === world.id)
  const next = wTasks.filter((t) => !t.done_at).slice(0, 6)

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
    <div className="mx-auto max-w-[640px] px-8 pt-21 pb-12">
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
              <div
                key={g.id}
                className="flex items-baseline gap-3 border-b border-hair py-2.5 last:border-b-0"
              >
                <span className="flex-1 font-serif text-[16.5px] font-medium text-ink">
                  {g.title}
                </span>
                <span className="text-[11px] text-dim">{goalStatus(g)}</span>
              </div>
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
            {next.map((t) => (
              <div key={t.id} className="flex items-center gap-2.5 py-2 text-[13.5px] text-ink">
                <span
                  className="h-1.5 w-1.5 flex-none rounded-full opacity-80"
                  style={{ backgroundColor: world.color }}
                />
                {t.title}
              </div>
            ))}
          </div>
        </section>
      )}

      {wGoals.length === 0 && recent.length === 0 && next.length === 0 && (
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
