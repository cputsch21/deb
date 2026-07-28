import { useProjects } from '../../db/queries/projects'
import { afterDawn, useBrief } from '../../lib/brief'

/**
 * The morning face of Read's today page (V1.5, July 28 ruling): today's
 * shape from the spine in the Book's own typography — part of the day's
 * page, not a widget. Her note where she has one, in her margin hand.
 * Empty morning: one warm sentence, no skeleton. Model failure: the
 * facts stand without her notes, with the standard honest retry. No
 * loading state renders — the brief is simply there, or not yet.
 */

// Proposed copy, pending Chris's approval (DECISIONS, July 28).
const EMPTY_MORNING = 'A clear morning — nothing on the Line, nothing owed. It’s yours to shape.'

export function MorningBrief() {
  const dawn = afterDawn()
  const brief = useBrief(dawn)
  const { data: projects = [] } = useProjects()

  if (!dawn || brief.isPending) return null // no skeletons, by law

  // Honest failure: never silently absent when the ask itself broke.
  if (brief.isError || brief.data?.items === null) {
    return (
      <div className="mb-9 border-b border-hair pb-6">
        <p className="text-[12.5px] text-muted">
          The morning brief couldn&rsquo;t load — nothing is lost.{' '}
          <button
            onClick={() => void brief.refetch()}
            className="underline underline-offset-2 hover:text-ink"
          >
            try again
          </button>
        </p>
      </div>
    )
  }

  const items = brief.data?.items ?? []

  if (items.length === 0) {
    return (
      <div className="mb-9 border-b border-hair pb-6">
        <span className="eyebrow block text-[0.6rem] text-dim opacity-85">this morning</span>
        <p className="mt-2.5 max-w-[62ch] font-serif text-[15px] leading-[1.8] text-muted italic">
          {EMPTY_MORNING}
        </p>
      </div>
    )
  }

  return (
    <div className="mb-9 border-b border-hair pb-6">
      <span className="eyebrow block text-[0.6rem] text-dim opacity-85">this morning</span>
      <div className="mt-3 flex flex-col gap-2.5">
        {items.map((it) => {
          const color =
            projects.find((p) => p.id === it.projectId)?.color ?? 'var(--t-silver)'
          return (
            <div key={`${it.kind}-${it.id}`} className="max-w-[62ch]">
              <div className="flex items-center gap-2.5 text-[15px] leading-[1.6]">
                <span
                  className="h-1.5 w-1.5 flex-none rounded-full opacity-80"
                  style={{ backgroundColor: color }}
                />
                <span className="min-w-0 flex-1 truncate font-serif text-ink">{it.title}</span>
                <span className="flex-none text-[11px] text-dim">{it.detail}</span>
              </div>
              {it.note && (
                <p className="mt-1 ml-4 max-w-[46ch] font-serif text-[12.5px] leading-[1.55] text-accent italic opacity-90">
                  {it.note}
                </p>
              )}
            </div>
          )
        })}
      </div>
      {!brief.data?.noted && (
        <p className="mt-3 text-[11px] text-dim">
          her notes couldn&rsquo;t be written — the facts stand.{' '}
          <button
            onClick={() => void brief.refetch()}
            className="underline underline-offset-2 hover:text-ink"
          >
            try again
          </button>
        </p>
      )}
    </div>
  )
}
