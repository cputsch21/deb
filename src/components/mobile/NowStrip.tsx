import { useProjects } from '../../db/queries/projects'
import { useTasks, useTaskMutations } from '../../db/queries/tasks'
import { transient } from '../../lib/undo'

/**
 * The Now strip (mobile, above the composer in Reflect): the Line's glance
 * level as horizontally scrolling soft cards — world dot + tag, title, and
 * the done circle. Momentum scroll, no pagination dots. Until React ships
 * the true Line (M4), this glances open tasks — same shape, upgraded
 * source later. `data-own-touch`: a touch starting here scrolls the strip,
 * never the pager.
 */
export function NowStrip({ lens }: { lens: string | null }) {
  const { data: tasks = [] } = useTasks()
  const { data: projects = [] } = useProjects()
  const { setDone } = useTaskMutations()

  const open = tasks
    .filter((t) => !t.done_at && (lens === null || t.project_id === lens))
    .slice(-8)
    .reverse()
  if (open.length === 0) return null

  return (
    <div
      data-own-touch
      className="momentum mx-auto flex w-full max-w-[640px] gap-2.5 overflow-x-auto px-5 pb-2 md:hidden"
      style={{ touchAction: 'pan-x pan-y', scrollbarWidth: 'none' }}
    >
      {open.map((t) => {
        const p = projects.find((pp) => pp.id === t.project_id) ?? null
        return (
          <div
            key={t.id}
            className="flex w-[210px] flex-none items-center gap-2 rounded-2xl bg-fill py-3 pr-1 pl-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 flex-none rounded-full"
                  style={{ backgroundColor: p?.color ?? 'var(--t-silver)' }}
                />
                <span className="truncate font-mono text-[0.58rem] tracking-[0.14em] text-dim uppercase">
                  {p ? p.name : 'bench'} · open
                </span>
              </div>
              <div className="mt-1 truncate text-[13px] text-ink">{t.title}</div>
            </div>
            <button
              aria-label={`Done: ${t.title}`}
              onClick={() => {
                setDone(t.id, true)
                transient.undo(`Done · ${t.title.slice(0, 30)}`, () => setDone(t.id, false))
              }}
              className="flex h-11 w-11 flex-none items-center justify-center active:opacity-80"
            >
              <span
                className="block h-[22px] w-[22px] rounded-full"
                style={{ backgroundColor: p?.color ?? 'var(--t-accent)' }}
              />
            </button>
          </div>
        )
      })}
    </div>
  )
}
