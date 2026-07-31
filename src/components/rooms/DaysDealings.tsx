import { useGoals } from '../../db/queries/goals'
import { useProjects } from '../../db/queries/projects'
import { useTasks } from '../../db/queries/tasks'
import { Proof } from '../Proof'
import type { Project, Task } from '../../db/types'
import { useDoor } from '../../lib/door'
import { useLens } from '../../lib/lens'
import { useRoom } from '../../lib/rooms'
import { localDayString } from '../../lib/day'

/**
 * The day's dealings (thread ruling pt 5, July 28) — the colophon that
 * makes Read the scroll of the life: what this day's conversations and
 * verdicts actually DID, derived from the spine. Read-only, zero
 * maintenance, one line each — world dot + mono tag — and each line a
 * door onto Reflect's table. A day of pure conversation still leaves its
 * story in the Book.
 *
 * Restraint, twice: it lists only what is honestly derivable (finishes,
 * additions, goal verdicts — anchor/delegation verdicts and missions
 * carry no timestamps in the schema, so they wait until they do), and it
 * NEVER lists what didn't happen — no missed-anchor lines, ever: the
 * graveyard law outranks completeness. A colophon, not a dashboard.
 */

type Dealing = {
  key: string
  object: 'task' | 'goal'
  title: string
  projectId: string | null
  did: string
  state: string
}

export function DaysDealings({ day, lens }: { day: string; lens: string | null }) {
  const tasks = useTasks()
  const projects = useProjects()
  return (
    <Proof of={[tasks, projects]} line="The day's dealings aren't loading">
      {([tasks, projects]) => (
        <Dealings day={day} lens={lens} tasks={tasks} projects={projects} />
      )}
    </Proof>
  )
}

/**
 * A colophon that vanishes on a failed read is the quietest lie on the
 * page — the day looks like it held nothing. It renders absence only when
 * absence is proven.
 */
function Dealings({
  day,
  lens,
  tasks,
  projects,
}: {
  day: string
  lens: string | null
  tasks: Task[]
  projects: Project[]
}) {
  const { data: goals = [] } = useGoals()
  const { knock } = useDoor()
  const { setRoom } = useRoom()
  const { setLens } = useLens()

  const onDay = (iso: string | null | undefined): boolean =>
    !!iso && localDayString(new Date(iso)) === day
  const inLens = (pid: string | null): boolean => lens === null || pid === lens

  const dealings: Dealing[] = [
    ...tasks
      .filter((t) => onDay(t.done_at) && inLens(t.project_id))
      .map((t) => ({
        key: `fin-${t.id}`,
        object: 'task' as const,
        title: t.title,
        projectId: t.project_id,
        did: 'finished',
        state: 'finished this day',
      })),
    ...goals
      .filter((g) => onDay(g.resolved_at) && inLens(g.project_id))
      .map((g) => ({
        key: `res-${g.id}`,
        object: 'goal' as const,
        title: g.title,
        projectId: g.project_id,
        did: g.status === 'done' ? 'goal · done forever' : 'goal · dropped',
        state: `${g.status} forever`,
      })),
    ...tasks
      .filter((t) => onDay(t.created_at) && !onDay(t.done_at) && inLens(t.project_id))
      .map((t) => ({
        key: `add-${t.id}`,
        object: 'task' as const,
        title: t.title,
        projectId: t.project_id,
        did: 'added',
        state: t.done_at ? 'since finished' : 'open',
      })),
    ...goals
      .filter((g) => onDay(g.created_at) && !onDay(g.resolved_at) && inLens(g.project_id))
      .map((g) => ({
        key: `goa-${g.id}`,
        object: 'goal' as const,
        title: g.title,
        projectId: g.project_id,
        did: 'goal · set',
        state: g.status === 'active' ? 'active' : `${g.status} forever`,
      })),
  ]

  // empty days close without ceremony — no section, no skeleton
  if (dealings.length === 0) return null

  return (
    <div className="mt-10 border-t border-hair pt-5">
      <span className="eyebrow block text-[0.6rem] text-dim opacity-85">
        the day&rsquo;s dealings
      </span>
      <div className="mt-2 flex flex-col">
        {dealings.map((d) => {
          const w = projects.find((p) => p.id === d.projectId) ?? null
          return (
            <button
              key={d.key}
              onClick={() => {
                // a door, like every other object in the app: onto the
                // table in Reflect, in the world the thing belongs to
                setLens(d.projectId)
                knock({
                  type: 'object',
                  object: d.object,
                  content: d.title,
                  from: "the day's page",
                  world: w?.name ?? null,
                  state: d.state,
                })
                setRoom('reflect')
              }}
              className="-mx-2 flex min-h-9 items-center gap-2.5 rounded-lg px-2 text-left transition-colors duration-150 hover:bg-fill"
            >
              <span
                className="h-1.5 w-1.5 flex-none rounded-full opacity-80"
                style={{ backgroundColor: w?.color ?? 'var(--t-silver)' }}
              />
              <span className="min-w-0 flex-1 truncate text-[13px] text-muted">{d.title}</span>
              <span className="eyebrow flex-none text-[0.58rem] text-dim">{d.did}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
