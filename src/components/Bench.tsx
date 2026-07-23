import { useState } from 'react'
import { TaskRow } from './TaskRow'
import { TaskSheet } from './TaskSheet'
import { useTasks } from '../db/queries/tasks'
import { benchOpacity, isToday } from '../lib/day'

/**
 * The Bench — loose tasks sitting at home with dignity, fading honestly
 * after 14 untouched days (floor at 30 — always readable, never a nag).
 */
export function Bench() {
  const { data: tasks = [] } = useTasks()
  const [openTask, setOpenTask] = useState<string | null>(null)

  const loose = tasks.filter(
    (t) => t.project_id === null && t.goal_id === null && (!t.done_at || isToday(t.done_at)),
  )
  const open = loose.filter((t) => !t.done_at)
  const doneToday = loose.filter((t) => !!t.done_at)

  if (loose.length === 0) return null // the void stays calm

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-1.5 px-7 pt-10 pb-4">
      <span className="eyebrow mb-2 text-dim">Bench</span>
      {open.map((t) => (
        <TaskRow
          key={t.id}
          task={t}
          project={null}
          showTag={false}
          onOpen={() => setOpenTask(t.id)}
          style={{ opacity: benchOpacity(t.touched_at) }}
        />
      ))}
      {doneToday.map((t) => (
        <TaskRow
          key={t.id}
          task={t}
          project={null}
          showTag={false}
          onOpen={() => setOpenTask(t.id)}
        />
      ))}
      {openTask && <TaskSheet taskId={openTask} onClose={() => setOpenTask(null)} />}
    </div>
  )
}
