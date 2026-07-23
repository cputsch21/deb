import { useState } from 'react'
import { GoalSection } from './GoalSection'
import { GoalSheet } from './GoalSheet'
import { TaskRow } from './TaskRow'
import { TaskSheet } from './TaskSheet'
import { useGoals } from '../db/queries/goals'
import { useTasks } from '../db/queries/tasks'
import { isToday } from '../lib/day'
import type { Project } from '../db/types'

/**
 * A project world: active goals with their tasks grouped under them,
 * then the project's loose tasks, then today's finished ones, dimmed.
 */
export function LensView({ world }: { world: Project }) {
  const { data: tasks = [] } = useTasks()
  const { data: goals = [] } = useGoals()
  const [openTask, setOpenTask] = useState<string | null>(null)
  const [goalSheet, setGoalSheet] = useState<'closed' | 'create' | string>('closed')

  const activeGoals = goals.filter(
    (g) => g.project_id === world.id && g.status === 'active',
  )
  const activeGoalIds = new Set(activeGoals.map((g) => g.id))

  const mine = tasks.filter(
    (t) => t.project_id === world.id && (!t.done_at || isToday(t.done_at)),
  )
  const open = mine.filter((t) => !t.done_at)
  // open tasks of a resolved goal fall back here — never lost
  const loose = open.filter((t) => !t.goal_id || !activeGoalIds.has(t.goal_id))
  const doneToday = mine.filter((t) => !!t.done_at)

  const editingGoal = activeGoals.find((g) => g.id === goalSheet) ?? null

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col px-7 pt-10 pb-4">
      {activeGoals.map((g) => (
        <GoalSection
          key={g.id}
          goal={g}
          world={world}
          tasks={open.filter((t) => t.goal_id === g.id)}
          onOpenGoal={() => setGoalSheet(g.id)}
          onOpenTask={setOpenTask}
        />
      ))}

      {loose.length > 0 && (
        <div className={`flex flex-col gap-1.5 ${activeGoals.length ? 'mt-7' : ''}`}>
          {loose.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              project={world}
              showTag={false}
              onOpen={() => setOpenTask(t.id)}
            />
          ))}
        </div>
      )}

      {doneToday.length > 0 && (
        <div className="mt-7 flex flex-col gap-1.5">
          {doneToday.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              project={world}
              showTag={false}
              onOpen={() => setOpenTask(t.id)}
            />
          ))}
        </div>
      )}

      <button
        onClick={() => setGoalSheet('create')}
        className="mt-8 self-start px-1 text-sm text-dim transition-colors duration-150 hover:text-ink"
      >
        + goal
      </button>

      {openTask && <TaskSheet taskId={openTask} onClose={() => setOpenTask(null)} />}
      {goalSheet !== 'closed' && (
        <GoalSheet
          key={goalSheet}
          goal={editingGoal}
          projectId={world.id}
          onClose={() => setGoalSheet('closed')}
        />
      )}
    </div>
  )
}
