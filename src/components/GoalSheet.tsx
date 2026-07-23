import { useState } from 'react'
import { Sheet } from './Sheet'
import { VerdictConfirm } from './VerdictConfirm'
import { useGoalMutations } from '../db/queries/goals'
import { TITLE_MAX, type Goal } from '../db/types'

/**
 * Create or edit a goal. goal = null → create mode (inside the given
 * project). The two permanent verdicts live here, each behind the one
 * centered confirm.
 */
export function GoalSheet({
  goal,
  projectId,
  onClose,
}: {
  goal: Goal | null
  projectId: string
  onClose: () => void
}) {
  const { create, update, verdict, remove } = useGoalMutations()
  const [title, setTitle] = useState(goal?.title ?? '')
  const [confirming, setConfirming] = useState<'done' | 'dropped' | null>(null)

  const commitTitle = () => {
    if (!title.trim()) return
    if (goal) {
      if (title.trim() !== goal.title) update(goal.id, { title })
    } else {
      create(projectId, title)
      onClose()
    }
  }

  const settle = (status: 'done' | 'dropped') => {
    if (!goal) return
    verdict(goal.id, status)
    setConfirming(null)
    onClose()
  }

  return (
    <Sheet open onClose={onClose} label={goal ? 'Goal' : 'New goal'}>
      <div className="mt-5 flex flex-col gap-6">
        <input
          autoFocus
          value={title}
          maxLength={TITLE_MAX}
          placeholder="A finishable outcome…"
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => goal && commitTitle()}
          onKeyDown={(e) => e.key === 'Enter' && commitTitle()}
          className="rounded-xl bg-fill px-4 py-3 font-serif text-lg text-ink outline-none placeholder:text-dim"
        />

        {goal ? (
          <>
            <div className="flex flex-col items-start gap-3">
              <span className="eyebrow text-dim">The verdict — permanent</span>
              <div className="flex items-center gap-5">
                <button
                  onClick={() => setConfirming('done')}
                  className="text-sm text-ok transition-opacity duration-150 hover:opacity-100"
                >
                  Done, forever
                </button>
                <button
                  onClick={() => setConfirming('dropped')}
                  className="text-sm text-muted transition-colors duration-150 hover:text-ink"
                >
                  Dropped, forever
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                onClose()
                remove(goal.id)
              }}
              className="self-start text-sm text-bad opacity-80 transition-opacity duration-150 hover:opacity-100"
            >
              Delete
            </button>
          </>
        ) : (
          <button
            onClick={commitTitle}
            className="self-start rounded-xl bg-fill2 px-5 py-2.5 text-sm text-ink transition-colors duration-150"
          >
            Create
          </button>
        )}
      </div>

      {confirming === 'done' && goal && (
        <VerdictConfirm
          question={`"${goal.title}" — done, forever?`}
          detail="This is the clean yes. It becomes part of the record and never reopens."
          confirmLabel="Done forever"
          tone="ok"
          onConfirm={() => settle('done')}
          onCancel={() => setConfirming(null)}
        />
      )}
      {confirming === 'dropped' && goal && (
        <VerdictConfirm
          question={`Drop "${goal.title}" — forever?`}
          detail="An honest ending, not a failure. It becomes part of the record and never reopens."
          confirmLabel="Drop forever"
          tone="bad"
          onConfirm={() => settle('dropped')}
          onCancel={() => setConfirming(null)}
        />
      )}
    </Sheet>
  )
}
