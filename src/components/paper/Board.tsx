import { useMemo, useState } from 'react'
import { useDeletedTasks, useTaskMutations, useTasks } from '../../db/queries/tasks'
import { useProjects } from '../../db/queries/projects'
import { useOpenTask } from '../../lib/openTask'
import { transient } from '../../lib/undo'
import { todayKey } from '../../lib/line'
import {
  BUCKETS,
  POSITION_STEP,
  bucketLabel,
  bucketOf,
  isClaimed,
  patchFor,
  positionBetween,
  sortColumn,
  type Bucket,
} from '../../lib/bucket'
import { Proof } from '../Proof'
import type { Proven } from '../../db/proof'
import { DelegateChooser } from './TriageFocus'
import type { Project, Task } from '../../db/types'

const PAGE = 10

/**
 * THE BOARD (B1 Phase E).
 *
 * IT IS NOT A FLOATING SURFACE, AND THIS IS THE POINT: it is an in-page
 * MODE, exactly like Triage. It opens leftward inside the page grid and
 * pushes The Record off screen — no backdrop, no shadow, nothing lifted
 * off the paper. The July 29 four-surface ruling is untouched, no fifth
 * surface is spent, and this is written down here so it is not
 * relitigated later.
 *
 * A HAND MAY NOT NAME WHERE A THING LANDED. After a drop, a card's
 * column is `bucketOf()` re-reading the row — never what the drag
 * handler believed it did. Drop into Do and the row says 'do' or the
 * card does not move.
 *
 * EMPTINESS MUST BE EARNED, FIVE TIMES OVER. Five columns is five
 * chances to show a clean empty box over a broken query, so every one
 * of them renders behind its own `Proof` gate. The four live columns
 * share one proof (one query feeds them); Deleted has its own, because
 * it is a separate read and can fail on its own.
 */
export function Board({ lens, onClose }: { lens: string | null; onClose: () => void }) {
  const tasksP = useTasks()
  const deletedP = useDeletedTasks(true)
  const projectsP = useProjects()
  const { move, claimOrder } = useTaskMutations()
  const today = todayKey()

  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<Bucket | null>(null)
  const [pending, setPending] = useState<Task | null>(null) // awaiting a name
  const [page, setPage] = useState<Record<string, number>>({})

  const live = tasksP.proven ? tasksP.value : null
  const gone = deletedP.proven ? deletedP.value : null

  /** Every column, derived once. The lens filters the board the same way
   *  it filters the page — a world's board shows that world. */
  const columns = useMemo(() => {
    const inLens = (t: Task) => lens === null || t.project_id === lens
    const all = [...(live ?? []), ...(gone ?? [])].filter(inLens)
    const map = {} as Record<Bucket, Task[]>
    for (const b of BUCKETS) map[b] = []
    for (const t of all) map[bucketOf(t, today)].push(t)
    for (const b of BUCKETS) map[b] = sortColumn(map[b])
    return map
  }, [live, gone, lens, today])

  const dragged = [...(live ?? []), ...(gone ?? [])].find((t) => t.id === dragId) ?? null

  /**
   * A DROP. The patch is never assembled here — `patchFor` returns the
   * complete row state for the destination, every field the precedence
   * chain reads. Building a partial by hand is the silent-revert bug,
   * and the way to make it impossible is to have no hand-built patch.
   */
  const drop = (bucket: Bucket, at: number, name?: string, chase?: string) => {
    const task = dragged
    setDragId(null)
    setOver(null)
    if (!task) return
    if (bucketOf(task, today) === bucket && task.position === null && at < 0) return

    const cards = columns[bucket].filter((t) => t.id !== task.id)

    // THE COLUMN CLAIMS ITS ORDER on the first drag into it — every
    // visible card at once, in one statement, in their current order.
    // A column is untouched or claimed and never half of each.
    let positions = cards.map((t) => t.position)
    if (!isClaimed(cards) && cards.length > 0) {
      const claimed = cards.map((t, i) => ({ id: t.id, position: POSITION_STEP * (i + 1) }))
      claimOrder(claimed)
      positions = claimed.map((c) => c.position)
    }

    const i = at < 0 ? cards.length : Math.min(at, cards.length)
    const position = positionBetween(positions[i - 1] ?? null, positions[i] ?? null)

    // Non-chain fields ride ALONGSIDE the patch, never instead of part
    // of it: `chase_on` and `delegated_on` are the delegate receipt and
    // are not read by `bucketOf`, so they cannot mask a missing clear.
    // A NEW POSITION IS COMPUTED IN THE DESTINATION — a card never
    // carries its old column's position across.
    const extra =
      bucket === 'delegate'
        ? { chase_on: chase ?? null, delegated_on: today }
        : bucket === 'delay'
          ? { chase_on: null, delegated_on: null }
          : {}

    move(task, { ...patchFor(bucket, today, name), ...extra, position })

    if (bucket === 'deleted') {
      // DELETED IS NOT RED. It is reversible — the tasks update policy
      // says nothing about deleted_at, so the row stays visible to the
      // statement that brings it back. RED MARKS A DOOR THAT CANNOT BE
      // WALKED BACK THROUGH, and this one can be dragged straight out.
      transient.undo(`"${task.title.slice(0, 32)}" deleted`, () =>
        move({ ...task, deleted_at: today }, patchFor(bucketOf(task, today), today, name)),
      )
    }
  }

  const projects = projectsP.proven ? projectsP.value : []

  return (
    <section
      // col-span-full is the MOBILE span (one column, board takes it).
      // On desktop it must claim exactly ONE grid cell — the wide first
      // one — or it spans both and folds Deb onto a second row.
      className="order-2 col-span-full min-w-0 md:order-none md:col-span-1 md:flex md:h-full md:min-h-0 md:flex-col"
      // DISMISSING IS NEVER THE SAME GESTURE AS MOVING A CARD: the
      // click-outside lives on the page behind this, and this stops the
      // event before it gets there. A drop that lands inside the board
      // can never read as "he clicked away".
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="eyebrow">The Board</span>
        <button
          onClick={onClose}
          className="eyebrow -my-2 flex min-h-11 items-center text-[0.58rem] text-dim transition-colors hover:text-ink"
        >
          ← the page
        </button>
      </div>

      {/* FIVE EQUAL COLUMNS OF THE SPACE THE BOARD WAS GIVEN. The card
          width is `1fr` of this grid and the grid spans the Record's
          column as well as the tasks column — so cards are wider than a
          To Do row by construction. No pixel value is typed anywhere;
          X2 killed the last magic number and this does not add one. */}
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-5">
        {BUCKETS.map((b) => (
          <Column
            key={b}
            bucket={b}
            proof={b === 'deleted' ? deletedP : tasksP}
            cards={columns[b]}
            projects={projects}
            page={page[b] ?? 0}
            setPage={(n) => setPage((p) => ({ ...p, [b]: n }))}
            dragging={dragId !== null}
            over={over === b}
            onDragStart={setDragId}
            onDragOver={() => setOver(b)}
            onDrop={(at) => {
              // Delegate is the one column that cannot be entered
              // without an answer, so it opens the chooser instead of
              // writing. Same chooser Triage uses — not a new one.
              if (b === 'delegate') setPending(dragged)
              else drop(b, at)
            }}
          />
        ))}
      </div>

      {pending && (
        <div className="fixed inset-0 z-50 grid place-items-center px-6">
          <DelegateChooser
            task={pending}
            today={today}
            onCommit={(who, chaseOn) => {
              setDragId(pending.id)
              setPending(null)
              drop('delegate', -1, who, chaseOn)
            }}
            onCancel={() => {
              setPending(null)
              setDragId(null)
            }}
          />
        </div>
      )}
    </section>
  )
}

function Column({
  bucket,
  proof,
  cards,
  projects,
  page,
  setPage,
  dragging,
  over,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  bucket: Bucket
  proof: Proven<Task[]>
  cards: Task[]
  projects: Project[]
  page: number
  setPage: (n: number) => void
  dragging: boolean
  over: boolean
  onDragStart: (id: string) => void
  onDragOver: () => void
  onDrop: (at: number) => void
}) {
  const pages = Math.max(1, Math.ceil(cards.length / PAGE))
  const p = Math.min(page, pages - 1)
  const shown = cards.slice(p * PAGE, p * PAGE + PAGE)

  return (
    <div className="flex min-h-0 flex-col">
      <div className="mb-2.5 flex items-baseline gap-2">
        <span className="eyebrow text-[0.58rem]">{bucketLabel(bucket)}</span>
        {cards.length > 0 && (
          <span className="eyebrow text-[0.58rem] text-accent-ink">{cards.length}</span>
        )}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          onDragOver()
        }}
        onDrop={(e) => {
          e.preventDefault()
          onDrop(-1)
        }}
        className={`momentum min-h-0 flex-1 space-y-2 overflow-y-auto rounded-xl p-1.5 transition-colors duration-150 ${
          over ? 'bg-fill' : dragging ? 'bg-fill/40' : ''
        }`}
      >
        {/* THE PER-COLUMN PROOF. A failed read prints the failure, never
            a tidy empty column — five columns is five chances to lie
            about a broken query and none of them is taken. */}
        <Proof of={[proof]} line={`${bucketLabel(bucket)} isn't loading`}>
          {() =>
            cards.length === 0 ? (
              <p className="px-1.5 py-1 font-serif text-[13.5px] text-dim italic">Nothing here.</p>
            ) : (
              <>
                {shown.map((t, i) => (
                  <Card
                    key={t.id}
                    task={t}
                    world={projects.find((w) => w.id === t.project_id) ?? null}
                    onDragStart={() => onDragStart(t.id)}
                    onDrop={() => onDrop(p * PAGE + i)}
                  />
                ))}
              </>
            )
          }
        </Proof>
      </div>

      {pages > 1 && (
        <div className="mt-2 flex items-center gap-2">
          <button
            disabled={p === 0}
            onClick={() => setPage(p - 1)}
            className="eyebrow min-h-8 px-1 text-[0.56rem] text-dim transition-colors not-disabled:hover:text-ink disabled:opacity-30"
          >
            ‹
          </button>
          <span className="eyebrow text-[0.56rem] text-dim">
            {p + 1}/{pages}
          </span>
          <button
            disabled={p === pages - 1}
            onClick={() => setPage(p + 1)}
            className="eyebrow min-h-8 px-1 text-[0.56rem] text-dim transition-colors not-disabled:hover:text-ink disabled:opacity-30"
          >
            ›
          </button>
        </div>
      )}
    </div>
  )
}

/** One card. Wider than a To Do row, and still a door. */
function Card({
  task,
  world,
  onDragStart,
  onDrop,
}: {
  task: Task
  world: Project | null
  onDragStart: () => void
  onDrop: () => void
}) {
  const openTask = useOpenTask((s) => s.open)
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onDrop()
      }}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => openTask(task.id)}
      className="cursor-pointer rounded-xl bg-fill px-3 py-2.5 transition-colors duration-150 hover:bg-fill2"
    >
      <span className="flex items-start gap-2">
        <span
          className="mt-[5px] h-2 w-2 flex-none rounded-full"
          style={{ backgroundColor: world?.color ?? 'var(--t-silver)' }}
        />
        <span className="min-w-0 text-[13.5px] leading-[1.45] font-medium break-words text-ink">
          {task.title}
        </span>
      </span>
      {task.delegated_to && (
        <span className="eyebrow mt-1.5 block pl-4 text-[0.54rem] text-dim">
          with {task.delegated_to}
        </span>
      )}
    </div>
  )
}
