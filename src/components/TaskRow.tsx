import type { CSSProperties } from 'react'
import { useTaskMutations } from '../db/queries/tasks'
import type { Project, Task } from '../db/types'

/**
 * A task as a tonal well wearing marker A: the leading dot is the project
 * color (silver-dim on the Bench) and doubles as the complete button;
 * the trailing mono tag names the world when the context is mixed.
 */
export function TaskRow({
  task,
  project,
  showTag,
  onOpen,
  style,
}: {
  task: Task
  project: Project | null
  showTag: boolean
  onOpen: () => void
  style?: CSSProperties
}) {
  const { setDone } = useTaskMutations()
  const done = !!task.done_at

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      style={style}
      className={`group flex w-full cursor-pointer items-center gap-3.5 rounded-xl bg-fill px-4 py-3 text-left transition-colors duration-150 hover:bg-fill2 ${
        done ? 'opacity-50' : ''
      }`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          setDone(task.id, !done)
        }}
        aria-label={done ? 'Reopen' : 'Complete'}
        title={done ? 'Reopen' : 'Done'}
        className="h-3.5 w-3.5 shrink-0 rounded-full transition-all duration-150 hover:scale-110"
        style={{
          backgroundColor: done ? 'var(--t-ok)' : (project?.color ?? 'var(--t-silver)'),
          opacity: done ? 1 : 0.55,
        }}
      />
      <span
        className={`min-w-0 flex-1 truncate text-[15px] ${
          done ? 'text-muted line-through' : 'text-ink'
        }`}
      >
        {task.title}
      </span>
      {showTag && project && (
        <span className="eyebrow shrink-0 text-dim">{project.name}</span>
      )}
    </div>
  )
}
