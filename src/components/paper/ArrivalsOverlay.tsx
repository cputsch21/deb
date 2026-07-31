import { useEffect, useState } from 'react'
import { useArrivals } from '../../db/queries/ingestLog'
import { useEntries, useEntryRaw } from '../../db/queries/entries'
import { useProjects } from '../../db/queries/projects'
import { Proof } from '../Proof'
import type { Arrival, Entry, Project } from '../../db/types'

/**
 * ARRIVALS — the full-page overlay (P6, per the V2 target): everything
 * that reached the paper, and what became of it. When · From · What ·
 * Outcome, newest first; rejected rows sit muted and closed (metadata
 * only, by law); every row whose entry survives clicks through to the
 * RAW — kept exactly as it came. Read-only is law: no actions here but
 * the doors. No counts, no badges — a ledger, not a to-do.
 */
export function ArrivalsOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [reach, setReach] = useState<'recent' | 'all'>('recent')
  const [rawFor, setRawFor] = useState<Arrival | null>(null)
  const arrivalsQ = useArrivals(open, reach)
  const { data: entries = [] } = useEntries()
  const projectsP = useProjects()

  // Esc walks the cascade: raw → the table → the page
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      if (rawFor) setRawFor(null)
      else onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, rawFor, onClose])

  useEffect(() => {
    if (!open) setRawFor(null)
  }, [open])

  if (!open) return null
  const rows = arrivalsQ.data ?? []

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg pt-[env(safe-area-inset-top)]">
      <div className="mx-auto max-w-[1180px] px-5 pt-8 pb-20 md:px-14 md:pt-10">
        {rawFor ? (
          <RawView
            arrival={rawFor}
            entry={entries.find((e) => e.id === rawFor.entry_id) ?? null}
            onBack={() => setRawFor(null)}
          />
        ) : (
          <>
            <button
              onClick={onClose}
              className="eyebrow -ml-3.5 flex min-h-11 items-center rounded-full px-3.5 text-muted transition-colors hover:bg-fill hover:text-ink"
            >
              ← back
            </button>
            <h2 className="mt-4 font-serif text-[36px] font-medium tracking-[-0.015em] md:text-[52px]">
              Arrivals
            </h2>
            <p className="mt-2 font-serif text-[15.5px] text-muted italic">
              Everything that reached the paper, and what became of it.
            </p>

            {!projectsP.proven ? (
              <div className="mt-8">
                <Proof of={[projectsP]} line="The ledger isn't loading">
                  {() => null}
                </Proof>
              </div>
            ) : arrivalsQ.isError ? (
              <div className="mt-8 rounded-xl bg-fill2 px-4 py-3 text-[12.5px] text-muted">
                The ledger couldn&rsquo;t be loaded — the rows are safe.{' '}
                <button
                  onClick={() => void arrivalsQ.refetch()}
                  className="underline underline-offset-2"
                >
                  try again
                </button>
              </div>
            ) : rows.length === 0 && !arrivalsQ.isPending ? (
              <p className="mt-8 font-serif text-[14.5px] text-dim italic">
                {reach === 'recent'
                  ? 'Nothing has arrived in the last thirty days.'
                  : 'Nothing has ever arrived — the ledger begins with the first drop.'}
              </p>
            ) : (
              <div className="mt-9">
                <div className="hidden grid-cols-[150px_240px_1fr_280px] gap-4 px-4.5 pb-3 md:grid">
                  {['when', 'from', 'what', 'outcome'].map((h) => (
                    <span key={h} className="eyebrow text-[0.56rem] text-dim">
                      {h}
                    </span>
                  ))}
                </div>
                <div className="flex flex-col gap-2.5">
                  {rows.map((a) => (
                    <ArrivalRow
                      key={a.id}
                      arrival={a}
                      entry={a.entry_id ? (entries.find((e) => e.id === a.entry_id) ?? null) : null}
                      projects={projectsP.value}
                      onOpen={() => setRawFor(a)}
                    />
                  ))}
                </div>
              </div>
            )}

            {reach === 'recent' && !arrivalsQ.isError && (
              <button
                onClick={() => setReach('all')}
                className="eyebrow mt-5 flex min-h-11 items-center text-[0.6rem] text-dim transition-colors hover:text-ink"
              >
                earlier
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ================= one row ================= */

function ArrivalRow({
  arrival,
  entry,
  projects,
  onOpen,
}: {
  arrival: Arrival
  entry: Entry | null
  projects: Project[]
  onOpen: () => void
}) {
  const world = entry?.project_id ? (projects.find((p) => p.id === entry.project_id) ?? null) : null
  const clickable = entry !== null
  const inner = (
    <>
      <span className="eyebrow text-[0.58rem] leading-[1.7] font-medium tracking-[0.13em] text-dim">
        {when(arrival.created_at)}
      </span>
      <span className="truncate font-mono text-[10px] tracking-[0.06em] text-muted">
        {fromLabel(arrival)}
      </span>
      <span className="truncate font-serif text-[15.5px] font-medium">
        {arrival.summary ?? '—'}
      </span>
      <span className="flex items-center gap-2 text-[13px] text-muted">
        {world && (
          <span
            className="h-2 w-2 flex-none rounded-full"
            style={{ backgroundColor: world.color }}
          />
        )}
        <span className="truncate">
          {outcomeLabel(arrival)}
          {arrival.outcome === 'filed' && world ? ` → ${world.name}` : ''}
        </span>
      </span>
    </>
  )
  const grid =
    'grid grid-cols-1 gap-1 rounded-xl bg-fill px-4.5 py-3.5 md:grid-cols-[150px_240px_1fr_280px] md:items-baseline md:gap-4'
  return clickable ? (
    <button onClick={onOpen} className={`${grid} text-left transition-colors hover:bg-fill2`}>
      {inner}
    </button>
  ) : (
    <div className={`${grid} opacity-40`}>{inner}</div>
  )
}

/* ================= the raw, kept exactly as it came ================= */

function RawView({
  arrival,
  entry,
  onBack,
}: {
  arrival: Arrival
  entry: Entry | null
  onBack: () => void
}) {
  return (
    <div className="rise">
      <button
        onClick={onBack}
        className="eyebrow -ml-3.5 flex min-h-11 items-center rounded-full px-3.5 text-muted transition-colors hover:bg-fill hover:text-ink"
      >
        ← arrivals
      </button>
      <div className="eyebrow mt-6 text-[0.58rem] text-dim">
        {when(arrival.created_at)} · {fromLabel(arrival)}
      </div>
      <h3 className="mt-2 font-serif text-[24px] font-medium md:text-[30px]">
        {arrival.summary ?? 'What arrived'}
      </h3>
      {entry ? (
        <RawBody rawId={entry.raw_id} />
      ) : (
        <p className="mt-5 font-serif text-[14.5px] text-dim italic">
          The entry no longer stands on the shelf — the ledger row remains.
        </p>
      )}
    </div>
  )
}

function RawBody({ rawId }: { rawId: string }) {
  const rawQ = useEntryRaw(rawId, true)
  if (rawQ.isError) {
    return (
      <div className="mt-5 rounded-xl bg-fill2 px-4 py-3 text-[12.5px] text-muted">
        The raw couldn&rsquo;t be loaded — it is safe.{' '}
        <button onClick={() => void rawQ.refetch()} className="underline underline-offset-2">
          try again
        </button>
      </div>
    )
  }
  return (
    <div className="mt-5 max-w-[760px] rounded-[14px] bg-fill2 px-5 py-4.5 text-[13.5px] leading-[1.7] whitespace-pre-wrap text-muted md:px-6">
      {rawQ.data ?? '…'}
    </div>
  )
}

/* ================= small helpers ================= */

function outcomeLabel(a: Arrival): string {
  switch (a.outcome) {
    case 'filed':
      return 'filed'
    case 'versioned':
      return "grew today's page"
    case 'unreadable':
      return "couldn't read — the raw is kept exactly as it came"
    case 'duplicate':
      return 'already on the page'
    case 'dropped_sender':
      return 'dropped — sender not allowed'
    case 'dropped_signature':
      return 'dropped — bad signature'
    case 'dropped_recipient':
      return 'dropped — wrong address'
    case 'dropped_shape':
      return "dropped — couldn't read the payload"
    case 'failed':
      return 'failed to file'
    default:
      return a.outcome
  }
}

function fromLabel(a: Arrival): string {
  if (a.sender) return a.sender
  if (a.source === 'composer') return 'composer'
  return a.source
}

function when(iso: string): string {
  const d = new Date(iso)
  const day = d
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    .toUpperCase()
  const time = d
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase()
    .replace(' ', '')
  return `${day} ${time}`
}
