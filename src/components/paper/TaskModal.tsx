import { useEffect, useRef, useState } from 'react'
import { useTaskMutations } from '../../db/queries/tasks'
import { NOTES_MAX, type Project, type Task } from '../../db/types'
import { shortDay } from '../../lib/line'

/**
 * THE TASK MODAL (X1 Phase F).
 *
 * IT MIRRORS THE CONVERSATION SHEET — no fifth floating surface is spent.
 * Same centred float, same `w-[720px] max-w-[92vw]`, same `rounded-[18px]
 * bg-bg`, same sanctioned shadow. It was the right one to mirror for three
 * reasons: it is already the app's large centred workspace, it is already
 * one of the four sanctioned floating surfaces, and it already lives
 * inside the focus layer — so this inherits the glass backdrop, the
 * click-outside dismissal and the Esc cascade from Phase E for free,
 * rather than reimplementing any of them.
 *
 * Details at the top, blank canvas underneath. Notion is the reference for
 * how a page FEELS when it is both a record and a workspace — not a
 * feature list, and not a clone.
 *
 * THE NOTES DIE WITH THE TASK AND SURVIVE AN UNDO OF ITS COMPLETION. That
 * is free from the shape: completion sets `done_at` and never touches the
 * notes column, so the undo pill brings them back with the row. They
 * disappear from the SURFACE when a task is complete; they are never
 * destroyed by it, because RED MARKS A DOOR THAT CANNOT BE WALKED BACK
 * THROUGH and completion is not that door.
 */
export function TaskModal({
  task,
  world,
  onClose,
}: {
  task: Task
  world: Project | null
  onClose: () => void
}) {
  const { update } = useTaskMutations()
  const [draft, setDraft] = useState(task.notes ?? '')
  const saved = useRef(task.notes ?? '')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // NO SAVE BUTTON. This rides the existing optimistic-write path —
  // `update` patches the cache synchronously, persists in the background,
  // and on failure restores the snapshot AND shows the transient notice.
  // A failed save is therefore visible, which is the whole point: silence
  // about a failed save is the disease this run of tickets has been about.
  // No second autosave mechanism was invented.
  const flush = (text: string) => {
    if (text === saved.current) return
    saved.current = text
    update(task.id, { notes: text.length ? text : null })
  }

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => flush(draft), 800)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  // whatever is in the box when it closes is committed — never lost to a
  // debounce that did not get to fire
  useEffect(() => () => flush(draft), [draft])

  const done = task.done_at !== null

  return (
    <div className="flex min-h-0 flex-1 items-start justify-center overflow-hidden px-6 pb-8">
      <div className="flex h-full w-[720px] max-w-[92vw] flex-col overflow-hidden rounded-[18px] bg-bg shadow-[0_30px_80px_rgba(25,23,19,0.18),0_6px_20px_rgba(25,23,19,0.1)]">
        {/* ---------- the record half ---------- */}
        <div className="flex-none px-7 pt-7 pb-4">
          <span className="flex items-center gap-2">
            <span
              className="h-[9px] w-[9px] flex-none rounded-full"
              style={{ backgroundColor: world?.color ?? 'var(--t-silver)' }}
            />
            <span className="eyebrow text-[0.58rem] text-dim">{world?.name ?? 'bench'}</span>
            {task.anchored_on && (
              <span className="eyebrow text-[0.58rem] text-dim">
                · anchored {shortDay(task.anchored_on)}
              </span>
            )}
            {task.delegated_to && (
              <span className="eyebrow text-[0.58rem] text-dim">
                · waiting on {task.delegated_to}
              </span>
            )}
          </span>
          <h2 className="mt-2.5 font-serif text-[26px] leading-[1.2] font-medium tracking-[-0.01em] text-ink">
            {task.title}
          </h2>
          {task.source_excerpt && (
            <p className="mt-2.5 font-serif text-[14px] leading-[1.6] text-muted italic">
              {task.source_excerpt}
            </p>
          )}
        </div>

        {/* ---------- the workspace half ---------- */}
        <div className="min-h-0 flex-1 px-7 pb-7">
          {done ? (
            // the notes are not shown on a completed task — and not deleted
            <p className="font-serif text-[14.5px] text-dim italic">
              Finished. Its notes close with it.
            </p>
          ) : (
            <textarea
              value={draft}
              maxLength={NOTES_MAX}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => flush(draft)}
              placeholder="Anything you need beside this…"
              className="h-full w-full resize-none bg-transparent font-serif text-[15px] leading-[1.7] text-ink outline-none placeholder:text-dim"
            />
          )}
        </div>

        <div className="flex-none px-7 pb-5">
          <button
            onClick={onClose}
            className="eyebrow -my-2 flex min-h-11 items-center text-[0.58rem] text-dim transition-colors hover:text-ink"
          >
            ← the page
          </button>
        </div>
      </div>
    </div>
  )
}
