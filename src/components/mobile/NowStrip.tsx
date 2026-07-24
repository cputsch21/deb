import { useProjects } from '../../db/queries/projects'
import { useTasks, useTaskMutations } from '../../db/queries/tasks'
import { applyDebOrder, deriveLine, todayKey } from '../../lib/line'
import { useLineWhys } from '../../lib/lineWhys'
import { transient } from '../../lib/undo'

/**
 * The Now strip (mobile, above the composer in Reflect): the Line's glance
 * level — the same one queue React deals, top first, as horizontally
 * scrolling soft cards. World dot + tag, title, Deb's why when her ranking
 * has landed (an honest "on the line" until then), and the done circle.
 * Momentum scroll, no pagination dots. `data-own-touch`: a touch starting
 * here scrolls the strip, never the pager.
 */
export function NowStrip({ lens }: { lens: string | null }) {
  const { data: tasks = [] } = useTasks()
  const { data: projects = [] } = useProjects()
  const { setDone } = useTaskMutations()
  const whys = useLineWhys(true)

  const line = applyDebOrder(deriveLine(tasks, lens, todayKey()), whys.order).slice(0, 6)
  if (line.length === 0) return null

  return (
    <div
      data-own-touch
      className="momentum mx-auto flex w-full max-w-[640px] gap-2.5 overflow-x-auto px-5 pb-2 md:hidden"
      style={{ touchAction: 'pan-x pan-y', scrollbarWidth: 'none' }}
    >
      {line.map((t) => {
        const p = projects.find((pp) => pp.id === t.project_id) ?? null
        const why = whys.byId.get(t.id)
        return (
          <div
            key={t.id}
            className="flex w-[220px] flex-none items-center gap-2 rounded-2xl bg-fill py-3 pr-1 pl-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 flex-none rounded-full"
                  style={{ backgroundColor: p?.color ?? 'var(--t-silver)' }}
                />
                <span className="truncate font-mono text-[0.58rem] tracking-[0.14em] text-dim uppercase">
                  {p ? p.name : 'bench'}
                </span>
              </div>
              <div className="mt-1 truncate text-[13px] text-ink">{t.title}</div>
              <div className="mt-0.5 truncate font-serif text-[11px] text-dim italic">
                {why ?? 'on the line'}
              </div>
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
