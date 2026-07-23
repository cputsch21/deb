import { TaskRow } from './TaskRow'
import type { Goal, Project, Task } from '../db/types'

/** A goal inside its world: plain header, its open tasks as wells below. */
export function GoalSection({
  goal,
  world,
  tasks,
  onOpenGoal,
  onOpenTask,
}: {
  goal: Goal
  world: Project
  tasks: Task[]
  onOpenGoal: () => void
  onOpenTask: (id: string) => void
}) {
  return (
    <div className="mt-7 flex flex-col gap-1.5 first:mt-0">
      <button
        onClick={onOpenGoal}
        className="group mb-1 flex items-baseline gap-3 px-1 text-left"
      >
        <span className="font-serif text-[17px] font-medium text-ink">{goal.title}</span>
        <span className="eyebrow text-dim opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          open
        </span>
      </button>
      {tasks.map((t) => (
        <TaskRow
          key={t.id}
          task={t}
          project={world}
          showTag={false}
          onOpen={() => onOpenTask(t.id)}
        />
      ))}
    </div>
  )
}
