import { useState } from 'react'
import { TaskRow } from './TaskRow'
import { TaskSheet } from './TaskSheet'
import { useTasks } from '../db/queries/tasks'
import { isToday } from '../lib/day'
import type { Project } from '../db/types'

/** A project world: its open tasks, plus today's finished ones, dimmed. */
export function LensView({ world }: { world: Project }) {
  const { data: tasks = [] } = useTasks()
  const [openTask, setOpenTask] = useState<string | null>(null)

  const mine = tasks.filter(
    (t) => t.project_id === world.id && (!t.done_at || isToday(t.done_at)),
  )
  const open = mine.filter((t) => !t.done_at)
  const doneToday = mine.filter((t) => !!t.done_at)

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-1.5 px-7 pt-10 pb-4">
      {open.map((t) => (
        <TaskRow
          key={t.id}
          task={t}
          project={world}
          showTag={false}
          onOpen={() => setOpenTask(t.id)}
        />
      ))}
      {doneToday.map((t) => (
        <TaskRow
          key={t.id}
          task={t}
          project={world}
          showTag={false}
          onOpen={() => setOpenTask(t.id)}
        />
      ))}
      {openTask && <TaskSheet taskId={openTask} onClose={() => setOpenTask(null)} />}
    </div>
  )
}
