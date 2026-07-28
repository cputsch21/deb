import { useProjects } from '../../db/queries/projects'
import { useBrief } from '../../lib/brief'

/**
 * The morning face of Read's today page (V1.5; ritual ruling 1, July 28:
 * the brief follows the pages). Before any drop, the page opens with one
 * warm line — an invitation, never a lock. Once the pages arrive (or
 * Chris asks anyway), the brief is pinned here: "today, in your words"
 * first, then the day's shape, her notes in the margin hand. Book
 * typography — part of the page, not a widget. No skeletons; model
 * failure shows the facts with the standard honest retry; a skipped day
 * is never referenced anywhere, because nothing stores one.
 */

// Approved copy (DECISIONS, July 28).
const EMPTY_MORNING = 'A clear morning — nothing on the Line, nothing owed. It’s yours to shape.'
const INVITATION = 'Drop your morning pages and I’ll build the day around them.'

export function MorningBrief() {
  const brief = useBrief(true)
  const { data: projects = [] } = useProjects()

  if (brief.isPending) return null // no skeletons, by law

  // The invitation — today has no brief yet, and that is not a failure.
  if (brief.data?.invited) {
    return (
      <div className="mb-9 border-b border-hair pb-6">
        <p className="max-w-[62ch] font-serif text-[15px] leading-[1.8] text-muted italic">
          {INVITATION}
        </p>
      </div>
    )
  }

  // Honest failure: never silently absent when the ask itself broke.
  if (brief.isError || brief.data?.items == null) {
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

  const items = brief.data.items

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

  const todayWords = items.filter((i) => i.kind === 'today')
  const rest = items.filter((i) => i.kind !== 'today')

  return (
    <div className="mb-9 border-b border-hair pb-6">
      <span className="eyebrow block text-[0.6rem] text-dim opacity-85">this morning</span>

      {/* today, in his words — the pages lead the page */}
      {todayWords.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          {todayWords.map((it) => (
            <div key={it.id} className="max-w-[62ch]">
              <p className="font-serif text-[15px] leading-[1.6] text-ink italic">
                {it.title}
              </p>
              {it.note && (
                <p className="mt-0.5 ml-4 max-w-[46ch] font-serif text-[12.5px] leading-[1.55] text-accent italic opacity-90">
                  {it.note}
                </p>
              )}
            </div>
          ))}
          <span className="eyebrow mt-0.5 text-[0.58rem] text-dim opacity-70">
            today · in your words
          </span>
        </div>
      )}

      <div className={`${todayWords.length > 0 ? 'mt-4' : 'mt-3'} flex flex-col gap-2.5`}>
        {rest.map((it) => {
          const color = projects.find((p) => p.id === it.projectId)?.color ?? 'var(--t-silver)'
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

      {!brief.data.noted && (
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
