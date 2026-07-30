import { useMemo, useState } from 'react'
import { useProjects } from '../../db/queries/projects'
import { useEntries, useEntryNotes, useEntryRaw } from '../../db/queries/entries'
import { useDoor } from '../../lib/door'
import { useRoom } from '../../lib/rooms'
import { addDays, shortDay, todayKey } from '../../lib/line'
import { LoadFailed } from '../LoadFailed'
import type { Entry, EntryNote, EntrySource, Project } from '../../db/types'

/**
 * READ — what happened. Today as a page in a book: entries laid on it in
 * the serif's warmth, the distillate on the page, the verbatim raw one tap
 * beneath (never only a summary — the raw is always kept). Deb annotates
 * in the margin, four kinds only, and every note is a door: tap it and
 * Reflect opens mid-conversation with that exact thing on the table.
 * Typography IS the feature here — measured against the design target.
 *
 * Scoped to a world it becomes that world's journal; whole-life entries
 * stay on the page (they belong to every world's story).
 */
export function ReadRoom({ lens }: { lens: string | null }) {
  const entriesQ = useEntries()
  const notesQ = useEntryNotes()
  const { data: projects = [] } = useProjects()
  const today = todayKey()
  const [cursor, setCursor] = useState<string>(today)

  const scoped = useMemo(
    () =>
      (entriesQ.data ?? []).filter(
        (e) => lens === null || e.project_id === lens || e.project_id === null,
      ),
    [entriesQ.data, lens],
  )

  // The book's spine: every day that has a page, newest first, today always.
  const days = useMemo(() => {
    const set = new Set(scoped.map((e) => e.entry_day))
    set.add(today)
    return [...set].sort((a, b) => b.localeCompare(a))
  }, [scoped, today])

  if (entriesQ.isError || notesQ.isError) {
    return (
      <LoadFailed
        what="The record"
        onRetry={() => {
          void entriesQ.refetch()
          void notesQ.refetch()
        }}
      />
    )
  }

  const world = projects.find((p) => p.id === lens) ?? null
  const day = days.includes(cursor) ? cursor : today
  const pageEntries = scoped.filter((e) => e.entry_day === day)
  const dayIndex = days.indexOf(day)
  const older = days[dayIndex + 1] ?? null
  const newer = dayIndex > 0 ? days[dayIndex - 1] : null

  // Chapter n = this day's position in the book, counted from the first page.
  const chapter =
    [...days].reverse().indexOf(day) + 1

  const dateLabel = new Date(...dayParts(day)).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  const subtitle = world
    ? `the ${world.name} pages · whole-life entries stay`
    : pageEntries.length > 0
      ? `Chapter ${chapter} · a ${weekdayOf(day)} in ${monthOf(day)}`
      : 'nothing filed this day'

  if (scoped.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
        <span className="eyebrow text-dim">Read</span>
        <p className="font-serif text-lg text-muted">
          Your days will land here — paste a page, a call, a braindump into
          Reflect and the book begins.
        </p>
      </div>
    )
  }

  return (
    <div className="momentum min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[720px] px-5 pt-6 pb-14 md:pt-19 md:pr-[110px] md:pl-11">
        <h1 className="font-serif text-[34px] font-medium tracking-[-0.015em] text-ink">
          {dateLabel}
        </h1>
        <p className="mt-1.5 mb-9 border-b border-hair pb-5 font-serif text-[12.5px] text-dim italic">
          {subtitle}
        </p>

        {pageEntries.length === 0 ? (
          <p className="py-10 font-serif text-[15px] text-muted">
            Nothing landed on this page.
          </p>
        ) : (
          pageEntries.map((e) => (
            <PageEntry
              key={e.id}
              entry={e}
              notes={(notesQ.data ?? []).filter((n) => n.entry_id === e.id)}
              world={projects.find((p) => p.id === e.project_id) ?? null}
              showWorld={lens === null}
              day={day}
            />
          ))
        )}

        {/* the page corners */}
        <div className="mt-2 flex items-center gap-4.5">
          {older && (
            <button
              onClick={() => setCursor(older)}
              className="flex min-h-11 items-center px-2 text-[12.5px] text-dim transition-colors hover:text-ink"
            >
              ← {older === addDays(day, -1) ? 'yesterday' : shortDay(older)}
            </button>
          )}
          {day !== today && (
            <button
              onClick={() => setCursor(today)}
              className="flex min-h-11 items-center px-2 text-[12.5px] text-dim transition-colors hover:text-ink"
            >
              today
            </button>
          )}
          {newer && (
            <button
              onClick={() => setCursor(newer)}
              className="flex min-h-11 items-center px-2 text-[12.5px] text-dim transition-colors hover:text-ink"
            >
              {newer === today ? 'today' : shortDay(newer)} →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ================= one entry on the page ================= */

function PageEntry({
  entry,
  notes,
  world,
  showWorld,
  day,
}: {
  entry: Entry
  notes: EntryNote[]
  world: Project | null
  showWorld: boolean
  day: string
}) {
  const [rawOpen, setRawOpen] = useState(false)

  return (
    <div className="relative mb-9">
      <span className="eyebrow mb-2 block text-[0.6rem] text-dim opacity-85">
        {timeOf(entry.created_at)} · {sourceLabel(entry.source)}
        {showWorld && world && (
          <>
            {' · '}
            <span style={{ color: world.color }}>{world.name}</span>
          </>
        )}
        {'  '}
        <button
          onClick={() => setRawOpen((v) => !v)}
          className="-my-3 inline-flex min-h-11 items-center px-2 align-middle font-mono text-[0.58rem] tracking-[0.12em] text-dim uppercase opacity-70 transition-opacity hover:text-ink hover:opacity-100"
        >
          raw {rawOpen ? '▴' : '▾'}
        </button>
      </span>

      <div className="max-w-[62ch] text-[15px] leading-[1.8] text-ink">
        {entry.distillate ? (
          renderDistillate(entry.distillate)
        ) : (
          <em className="text-muted">
            Not yet distilled — the raw is kept, one tap up there.
          </em>
        )}
      </div>

      {rawOpen && <RawBlock rawId={entry.raw_id} />}

      {/* Deb's hand — desktop: in the actual margin; mobile: inline below */}
      {notes.map((n) => (
        <MarginNote key={n.id} note={n} day={day} />
      ))}
    </div>
  )
}

/** The margin note — accent serif italic, a hairline of her own. A door. */
function MarginNote({ note, day }: { note: EntryNote; day: string }) {
  const { knock } = useDoor()
  const { setRoom } = useRoom()
  const open = () => {
    // Provenance law: the tap carries HER note as a quoted object — it never
    // composes words in Chris's voice.
    knock({
      label: 'margin note',
      source: `the margin · ${note.kind} · ${shortDay(day)}`,
      content: note.content,
    })
    setRoom('reflect')
  }
  const body = (
    <>
      <span className="absolute top-[3px] bottom-[3px] left-[-10px] w-[1.5px] rounded bg-accent opacity-40" />
      {note.content}
    </>
  )
  return (
    <>
      {/* desktop: hanging in the right margin */}
      <button
        onClick={open}
        className="absolute top-0.5 left-full ml-3 hidden w-[104px] text-left font-serif text-[12px] leading-[1.55] text-accent italic opacity-90 transition-opacity hover:underline hover:opacity-100 hover:underline-offset-3 md:block"
      >
        <span className="relative block">{body}</span>
      </button>
      {/* mobile: inline, same hand */}
      <button
        onClick={open}
        className="relative mt-2.5 ml-2.5 block max-w-[46ch] text-left font-serif text-[12.5px] leading-[1.55] text-accent italic opacity-90 active:underline md:hidden"
      >
        <span className="relative block pl-1">{body}</span>
      </button>
    </>
  )
}

/** The raw, one tap beneath — mono, quiet, and honest when it can't load. */
function RawBlock({ rawId }: { rawId: string }) {
  const rawQ = useEntryRaw(rawId, true)
  if (rawQ.isError) {
    return (
      <div className="mt-2.5 rounded-xl bg-fill2 px-4 py-3 text-[12px] text-muted">
        The raw couldn&rsquo;t be loaded — it is safe.{' '}
        <button onClick={() => void rawQ.refetch()} className="underline underline-offset-2">
          try again
        </button>
      </div>
    )
  }
  return (
    <div className="mt-2.5 rounded-xl bg-fill2 px-4 py-3 font-mono text-[11px] leading-[1.85] tracking-[0.01em] whitespace-pre-wrap text-muted">
      {rawQ.data ?? '…'}
    </div>
  )
}

/* ================= small helpers ================= */

/** Distillates carry *promises* in asterisks — render them as true italics. */
function renderDistillate(text: string) {
  return text.split(/\*([^*\n]+)\*/g).map((part, i) =>
    i % 2 === 1 ? (
      <em key={i} className="text-muted">
        {part}
      </em>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

function sourceLabel(source: EntrySource): string {
  if (source === 'plaud') return 'call'
  if (source === 'remarkable') return 'reMarkable'
  return 'filed'
}

function dayParts(day: string): [number, number, number] {
  const [y, m, d] = day.split('-').map(Number)
  return [y, m - 1, d]
}

function weekdayOf(day: string): string {
  return new Date(...dayParts(day)).toLocaleDateString('en-US', { weekday: 'long' })
}

function monthOf(day: string): string {
  return new Date(...dayParts(day)).toLocaleDateString('en-US', { month: 'long' })
}

function timeOf(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(/\s?[AP]M$/i, '')
}
