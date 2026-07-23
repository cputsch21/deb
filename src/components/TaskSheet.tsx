import { useState } from 'react'
import { Sheet } from './Sheet'
import { useGoals } from '../db/queries/goals'
import { useProjects } from '../db/queries/projects'
import { useTasks, useTaskMutations } from '../db/queries/tasks'
import { TITLE_MAX, type Task } from '../db/types'

/**
 * Task detail — rename, move between worlds (or back to the Bench),
 * complete, delete. Every edit applies instantly; delete gets the pill.
 */
export function TaskSheet({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { data: tasks = [] } = useTasks()
  const task = tasks.find((t) => t.id === taskId)
  if (!task) return null // deleted or rolled back under us — the sheet just goes
  return <TaskSheetInner key={task.id} task={task} onClose={onClose} />
}

function TaskSheetInner({ task, onClose }: { task: Task; onClose: () => void }) {
  const { data: projects = [] } = useProjects()
  const { data: goals = [] } = useGoals()
  const { update, setDone, remove } = useTaskMutations()
  const [title, setTitle] = useState(task.title)

  const projectGoals = goals.filter(
    (g) => g.project_id === task.project_id && g.status === 'active',
  )

  const commitTitle = () => {
    if (title.trim() && title.trim() !== task.title) update(task.id, { title })
  }

  const moveTo = (projectId: string | null) => {
    update(task.id, { project_id: projectId, goal_id: null })
  }

  const created = new Date(task.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <Sheet open onClose={onClose} label="Task">
      <div className="mt-5 flex flex-col gap-6">
        <input
          autoFocus
          value={title}
          maxLength={TITLE_MAX}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => e.key === 'Enter' && commitTitle()}
          className="rounded-xl bg-fill px-4 py-3 text-[15px] text-ink outline-none placeholder:text-dim"
        />

        <div className="flex flex-col gap-2">
          <span className="eyebrow text-dim">World</span>
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => moveTo(null)}
              className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm transition-colors duration-150 ${
                task.project_id === null ? 'bg-fill2 text-ink' : 'text-muted hover:bg-fill'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-silver opacity-60" />
              The Bench
            </button>
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => moveTo(p.id)}
                className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm transition-colors duration-150 ${
                  task.project_id === p.id ? 'bg-fill2 text-ink' : 'text-muted hover:bg-fill'
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {task.project_id !== null && projectGoals.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="eyebrow text-dim">Goal</span>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => update(task.id, { goal_id: null })}
                className={`rounded-xl px-3.5 py-2.5 text-left text-sm transition-colors duration-150 ${
                  task.goal_id === null ? 'bg-fill2 text-ink' : 'text-muted hover:bg-fill'
                }`}
              >
                None
              </button>
              {projectGoals.map((g) => (
                <button
                  key={g.id}
                  onClick={() => update(task.id, { goal_id: g.id })}
                  className={`rounded-xl px-3.5 py-2.5 text-left text-sm transition-colors duration-150 ${
                    task.goal_id === g.id ? 'bg-fill2 text-ink' : 'text-muted hover:bg-fill'
                  }`}
                >
                  {g.title}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-5">
          <button
            onClick={() => setDone(task.id, !task.done_at)}
            className="text-sm text-muted transition-colors duration-150 hover:text-ink"
          >
            {task.done_at ? 'Reopen' : 'Mark done'}
          </button>
          <button
            onClick={() => {
              onClose()
              remove(task.id)
            }}
            className="text-sm text-bad opacity-80 transition-opacity duration-150 hover:opacity-100"
          >
            Delete
          </button>
        </div>

        <span className="eyebrow text-dim">Added {created}</span>
      </div>
    </Sheet>
  )
}
