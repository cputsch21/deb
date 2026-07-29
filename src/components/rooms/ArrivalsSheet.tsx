import { useState } from 'react'
import { useEntries } from '../../db/queries/entries'
import { useProjects } from '../../db/queries/projects'
import { useArrivals } from '../../db/queries/ingestLog'
import { useBook } from '../../lib/book'
import { useLens } from '../../lib/lens'
import { useRoom } from '../../lib/rooms'
import { Sheet } from '../Sheet'
import type { Arrival, Entry, Project } from '../../db/types'

/**
 * The Arrivals ledger (July 28) — observability for the mouth. Everything
 * that ever arrived at the filing engine, newest first: when, from, what,
 * and what became of it — including what the door turned away, with the
 * rejecting address shown. Every row opens (July 29 polish): tap for the
 * full context in plain text — the whole summary, the envelope, and the
 * entry's own words when it survived — with the door into Read inside.
 * Read-only is law: no actions here except the doors; fixing an allowlist
 * stays where config lives. No counts, no badges, no unread dots — it's
 * a ledger, not a to-do.
 */
export function ArrivalsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [reach, setReach] = useState<'recent' | 'all'>('recent')
  const arrivalsQ = useArrivals(open, reach)
  const { data: entries = [] } = useEntries()
  const { data: projects = [] } = useProjects()

  const rows = arrivalsQ.data ?? []

  return (
    <Sheet open={open} onClose={onClose} label="arrivals">
      <p className="mt-3 max-w-[38ch] font-serif text-[13px] leading-[1.6] text-muted italic">
        Everything that has arrived at the door — and what became of it.
      </p>

      {arrivalsQ.isError ? (
        // the honest failure state: the ledger itself couldn't be read
        <div className="mt-5 rounded-xl bg-fill2 px-4 py-3 text-[12.5px] text-muted">
          The ledger couldn&rsquo;t be loaded — the rows are safe.{' '}
          <button
            onClick={() => void arrivalsQ.refetch()}
            className="underline underline-offset-2"
          >
            try again
          </button>
        </div>
      ) : rows.length === 0 && !arrivalsQ.isPending ? (
        <p className="mt-5 font-serif text-[13.5px] text-muted">
          {reach === 'recent'
            ? 'Nothing has arrived in the last thirty days.'
            : 'Nothing has ever arrived — the ledger begins with the first drop.'}
        </p>
      ) : (
        <div className="mt-4">
          {rows.map((a) => (
            <ArrivalRow
              key={a.id}
              arrival={a}
              entries={entries}
              projects={projects}
              onDoorTaken={onClose}
            />
          ))}
        </div>
      )}

      {/* the quiet reach-back — the rest of the record, no ceremony */}
      {reach === 'recent' && !arrivalsQ.isError && (
        <button
          onClick={() => setReach('all')}
          className="eyebrow mt-4 flex min-h-11 items-center text-[0.6rem] text-dim transition-colors hover:text-ink"
        >
          earlier
        </button>
      )}
    </Sheet>
  )
}

/* ================= one arrival ================= */

function ArrivalRow({
  arrival,
  entries,
  projects,
  onDoorTaken,
}: {
  arrival: Arrival
  entries: Entry[]
  projects: Project[]
  onDoorTaken: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const openBook = useBook((s) => s.open)
  const { setRoom } = useRoom()
  const { setLens } = useLens()

  // a row is a door only while its entry survives on the shelf
  const entry = arrival.entry_id ? (entries.find((e) => e.id === arrival.entry_id) ?? null) : null
  const world = entry?.project_id ? (projects.find((p) => p.id === entry.project_id) ?? null) : null

  // the door lands in the entry's world, at that spot (thread ruling)
  const door = entry
    ? () => {
        setLens(entry.project_id)
        openBook(entry.entry_day, entry.id)
        setRoom('read')
        onDoorTaken()
      }
    : null

  return (
    <div className={`rounded-xl transition-colors ${expanded ? 'bg-fill2' : 'hover:bg-fill2'}`}>
      {/* the row itself opens: the full context, in plain text */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="block w-full px-2.5 py-2.5 text-left"
      >
        <span className="eyebrow block text-[0.6rem] text-dim opacity-85">
          {when(arrival.created_at)} · {fromLabel(arrival)}
        </span>
        {arrival.summary && (
          <span className="mt-0.5 block truncate text-[13px] text-ink">{arrival.summary}</span>
        )}
        <span className="mt-0.5 block text-[12.5px] text-muted">
          {outcomeLabel(arrival)}
          {arrival.outcome === 'filed' && world && (
            <>
              {' → '}
              <span
                className="mr-1 inline-block size-[7px] rounded-full align-baseline"
                style={{ background: world.color }}
              />
              <span className="eyebrow text-[0.6rem]">{world.name}</span>
            </>
          )}
        </span>
      </button>

      {expanded && (
        <div className="px-2.5 pt-0.5 pb-3 text-[12.5px] leading-[1.7] text-muted">
          <div className="whitespace-pre-wrap">{detailText(arrival)}</div>

          {/* the actual context: the entry's own words, plainly */}
          {entry && (entry.distillate || entry.source_meta?.unreadable) && (
            <div className="mt-2 rounded-lg bg-fill px-3 py-2.5 text-[12px] leading-[1.75] whitespace-pre-wrap text-ink">
              {entry.distillate ??
                'Nothing textual could be read — the raw is kept exactly as it came.'}
            </div>
          )}

          {door && (
            <button
              onClick={door}
              className="eyebrow mt-2 flex min-h-11 items-center text-[0.6rem] text-dim transition-colors hover:text-ink"
            >
              open in read →
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ================= small helpers ================= */

/** The expanded row: the whole envelope, plainly — nothing truncated. */
function detailText(a: Arrival): string {
  const lines = [
    `arrived ${fullWhen(a.created_at)}`,
    `source: ${a.source}`,
    a.sender ? `from: ${a.sender}` : null,
    a.summary ? `subject: ${a.summary}` : null,
    `outcome: ${outcomeLabel(a)}`,
  ]
  return lines.filter(Boolean).join('\n')
}

/** The outcome is load-bearing — plain warm sentences, never codes. */
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
  const day = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const time = d
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase()
    .replace(' ', '')
  return `${day} · ${time}`
}

function fullWhen(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })}, ${d
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase()}`
}
