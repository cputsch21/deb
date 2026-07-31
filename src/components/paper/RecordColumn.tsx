import { useEffect, useMemo, useRef, useState } from 'react'
import { useEntries, useEntryNotes, useEntryRaw, useEntryRevisions } from '../../db/queries/entries'
import { useProjects } from '../../db/queries/projects'
import { useTasks } from '../../db/queries/tasks'
import { useBook } from '../../lib/book'
import { useDoor } from '../../lib/door'
import { useLens } from '../../lib/lens'
import { useRoom } from '../../lib/rooms'
import { localDayString } from '../../lib/day'
import { addDays, shortDay, todayKey } from '../../lib/line'
import { DaysDealings } from '../rooms/DaysDealings'
import { Proof } from '../Proof'
import { PageSlot } from './PageSlot'
import type { Entry, EntryNote, EntrySource, Project, Task } from '../../db/types'

/**
 * THE RECORD — the Paper's left column (P2). Today's page as the V2
 * target draws it: TAKEN DOWN (the entries, distillate on the page,
 * margin notes as doors, the raw one tap beneath), the day's dealings
 * colophon (unchanged by the July 29 re-ruling), and the quiet mono
 * EARLIER paging the record back a day.
 *
 * FINISHED renders here ONLY on past pages (July 29 re-ruling): today's
 * finishes live in the center column's lifecycle; a past page has no
 * live center column to defer to, and the record's completeness law —
 * Read is the scroll of the life — outranks today's layout.
 *
 * THE DAY (calendar events) renders as absence per flag 3: the section
 * does not exist until the calendar pillar is real.
 */
export function RecordColumn({ lens }: { lens: string | null }) {
  const tasks = useTasks()
  const projects = useProjects()
  const entries = useEntries()
  const notes = useEntryNotes()
  return (
    <Proof of={[tasks, projects, entries, notes]} line="The record isn't loading">
      {([tasks, projects, entries, notes]) => (
        <Record lens={lens} tasks={tasks} projects={projects} entries={entries} notes={notes} />
      )}
    </Proof>
  )
}

function Record({
  lens,
  tasks,
  projects,
  entries,
  notes,
}: {
  lens: string | null
  tasks: Task[]
  projects: Project[]
  entries: Entry[]
  notes: EntryNote[]
}) {
  const today = todayKey()
  const [cursor, setCursor] = useState<string>(today)

  // doors land on a day — and at a spot (the book jump, July 28/29)
  const jump = useBook((s) => s.jump)
  const [landAt, setLandAt] = useState<string | null>(null)
  useEffect(() => {
    if (!jump) return
    setCursor(jump.day)
    setLandAt(jump.entryId)
    useBook.getState().clear()
  }, [jump])
  useEffect(() => {
    if (!landAt) return
    const el = document.querySelector(`[data-entry-id="${landAt}"]`)
    if (!el) return // the entry isn't on this page yet — wait, don't clear
    el.scrollIntoView({ block: 'start', behavior: 'auto' })
    setLandAt(null)
  })

  const scoped = useMemo(
    () =>
      entries.filter(
        (e) => lens === null || e.project_id === lens || e.project_id === null,
      ),
    [entries, lens],
  )

  // the book's spine: every day that has a page, newest first, today always
  const days = useMemo(() => {
    const set = new Set(scoped.map((e) => e.entry_day))
    set.add(today)
    return [...set].sort((a, b) => b.localeCompare(a))
  }, [scoped, today])

  const day = days.includes(cursor) ? cursor : today
  const pageEntries = scoped.filter((e) => e.entry_day === day)
  const dayIndex = days.indexOf(day)
  const older = days[dayIndex + 1] ?? null
  const newer = dayIndex > 0 ? days[dayIndex - 1] : null

  // a past page keeps its finishes (completeness law)
  const pastFinishes =
    day === today
      ? []
      : tasks
          .filter(
            (t) =>
              t.done_at &&
              localDayString(new Date(t.done_at)) === day &&
              (lens === null || t.project_id === lens),
          )
          .sort((a, b) => (a.done_at ?? '').localeCompare(b.done_at ?? ''))

  return (
    <div>
      {/* the page slot (July 29): the quiet third mouth — today only;
          an archive page takes no drops */}
      {day === today && <PageSlot lens={lens} />}

      {/* a past page announces itself — the reader always knows the day */}
      {day !== today && (
        <p className="mb-4 font-serif text-[14.5px] text-dim italic">
          The page for {longDay(day)}.
        </p>
      )}

      {/* ---------- TAKEN DOWN ---------- */}
      <div className="eyebrow mt-8 mb-3 first:mt-0">Taken Down</div>
      {pageEntries.length === 0 ? (
        <p className="py-2 font-serif text-[14.5px] text-dim italic">
          Nothing on the record in this lens{day === today ? ' today' : ' this day'}.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {pageEntries.map((e, i) => (
            <EntryCard
              key={e.id}
              entry={e}
              lead={i === 0}
              notes={notes.filter((n) => n.entry_id === e.id)}
              world={projects.find((p) => p.id === e.project_id) ?? null}
              showWorld={lens === null}
              day={day}
            />
          ))}
        </div>
      )}

      {/* ---------- FINISHED — past pages only ---------- */}
      {pastFinishes.length > 0 && (
        <>
          <div className="eyebrow mt-8 mb-3">
            Finished <span className="ml-1 text-accent-ink">{pastFinishes.length}</span>
          </div>
          <div className="flex flex-col gap-2.5">
            {pastFinishes.map((t) => (
              <FinishedRow
                key={t.id}
                task={t}
                world={projects.find((p) => p.id === t.project_id) ?? null}
              />
            ))}
          </div>
        </>
      )}

      {/* ---------- the colophon (unchanged) ---------- */}
      <DaysDealings day={day} lens={lens} />

      {/* ---------- the record's furniture: EARLIER ---------- */}
      <div className="mt-4 flex items-center gap-1.5">
        {older && (
          <button
            onClick={() => setCursor(older)}
            className="eyebrow -ml-2 flex min-h-11 items-center px-2 text-[0.6rem] text-dim transition-colors hover:text-ink"
          >
            ← earlier{older === addDays(day, -1) ? '' : ` · ${shortDay(older)}`}
          </button>
        )}
        {day !== today && (
          <button
            onClick={() => setCursor(today)}
            className="eyebrow flex min-h-11 items-center px-2 text-[0.6rem] text-dim transition-colors hover:text-ink"
          >
            today
          </button>
        )}
        {newer && newer !== today && (
          <button
            onClick={() => setCursor(newer)}
            className="eyebrow flex min-h-11 items-center px-2 text-[0.6rem] text-dim transition-colors hover:text-ink"
          >
            {shortDay(newer)} →
          </button>
        )}
      </div>
    </div>
  )
}

/* ================= one entry, taken down ================= */

function EntryCard({
  entry,
  lead,
  notes,
  world,
  showWorld,
  day,
}: {
  entry: Entry
  lead: boolean
  notes: EntryNote[]
  world: Project | null
  showWorld: boolean
  day: string
}) {
  const [rawOpen, setRawOpen] = useState(false)

  return (
    <article
      data-entry-id={entry.id}
      className="scroll-mt-6 rounded-[14px] bg-fill px-5 pt-4.5 pb-4"
    >
      {/* marker A: leading dot + trailing mono tag */}
      <div className="flex items-center gap-2">
        <span
          className="h-[9px] w-[9px] flex-none rounded-full"
          style={{ backgroundColor: world?.color ?? 'var(--t-silver)' }}
        />
        <span className="eyebrow min-w-0 truncate text-[0.6rem] font-medium text-dim">
          {sourceLabel(entry.source)}
          {entry.source_meta?.channel === 'email' && entry.source_meta.from && (
            <> · {entry.source_meta.from.split('@')[0]}</>
          )}
          {showWorld && world && <> · {world.name}</>}
          {' · '}
          {timeOf(entry.created_at)}
        </span>
      </div>

      {/* The envelope, not the letter — and not his voice either (R2,
          July 30): a source subject is machine-generated metadata, so it
          renders as a mono label in dim. Italic quotes are the styling for
          Chris's own words and must never wrap a string he didn't write. */}
      {entry.source_meta?.subject && (
        <p className="eyebrow mt-2.5 text-[0.56rem] leading-[1.5] text-dim normal-case">
          {entry.source_meta.subject}
        </p>
      )}

      {/* NO ENTRY OWNS THE COLUMN (R2, July 30): the 36-word ceiling makes
          new distillates short, but entries filed before it still hold long
          text — so the collapsed height is also guarded here. Opening the
          raw un-clamps it; the full page is always one tap away. */}
      <div
        className={`mt-3 font-serif leading-[1.55] text-ink ${
          lead ? 'text-[20px] leading-[1.5]' : 'text-[17.5px]'
        } ${rawOpen ? '' : 'line-clamp-[9]'}`}
      >
        {entry.distillate ? (
          renderDistillate(entry.distillate)
        ) : entry.source_meta?.unreadable ? (
          <em className="text-[15px] text-muted">
            I couldn&rsquo;t read this one — nothing textual arrived that I can reach. The raw
            is kept exactly as it came.
          </em>
        ) : (
          <em className="text-[15px] text-muted">
            Not yet distilled — the raw is kept, one tap below.
          </em>
        )}
      </div>

      {/* her margin, in the card: each note a door onto the thread */}
      {notes.map((n) => (
        <MarginNote key={n.id} note={n} day={day} worldId={entry.project_id} />
      ))}

      <button
        onClick={() => setRawOpen((v) => !v)}
        className="eyebrow -mb-1 -ml-2.5 mt-3 flex min-h-11 items-center rounded-lg px-2.5 text-[0.6rem] text-dim transition-colors hover:bg-fill2 hover:text-ink"
      >
        raw {rawOpen ? '▴' : '▾'}
      </button>
      {rawOpen && (
        <>
          <RawWell rawId={entry.raw_id} />
          <PriorVersions entryId={entry.id} />
        </>
      )}
    </article>
  )
}

/** A margin note as the target draws it: a paper well inside the card,
 *  the kind in mono, her hand in italic serif — and the whole thing a
 *  door (provenance law: her words travel as a quoted object). */
function MarginNote({
  note,
  day,
  worldId,
}: {
  note: EntryNote
  day: string
  worldId: string | null
}) {
  const { knock } = useDoor()
  const { setRoom } = useRoom()
  const { setLens } = useLens()
  return (
    <button
      onClick={() => {
        setLens(worldId)
        knock({
          type: 'margin',
          content: note.content,
          noteKind: note.kind,
          day: shortDay(day),
          question: note.question ?? undefined,
        })
        setRoom('reflect')
      }}
      className="group mt-3 block w-full rounded-xl bg-[var(--t-bg)] px-4 py-3 text-left transition-colors hover:bg-fill2"
    >
      <span className="flex items-baseline justify-between gap-3">
        <span className="eyebrow text-[0.56rem] font-semibold text-accent-ink">
          the {note.kind}
        </span>
        <span className="eyebrow text-[0.56rem] text-dim opacity-0 transition-opacity group-hover:opacity-100">
          open in thread →
        </span>
      </span>
      {note.kind === 'answer' && note.question && (
        <span className="mt-1.5 block truncate text-[12px] text-dim">{note.question}</span>
      )}
      <span className="mt-1.5 block font-serif text-[15px] leading-[1.55] text-muted italic">
        {note.content}
      </span>
    </button>
  )
}

/** A past page's finish — same row grammar as the center column's. */
function FinishedRow({ task, world }: { task: Task; world: Project | null }) {
  return (
    <div className="grid grid-cols-[20px_1fr_auto] items-center gap-x-2.5 rounded-xl bg-fill px-3.5 py-3">
      <span className="grid w-5 place-items-center text-[12px] text-accent-ink">✓</span>
      <span className="flex min-w-0 items-center gap-2">
        <span
          className="h-2 w-2 flex-none rounded-full"
          style={{ backgroundColor: world?.color ?? 'var(--t-silver)' }}
        />
        <span className="truncate text-[14px] font-medium text-muted">{task.title}</span>
      </span>
      <span className="eyebrow text-[0.56rem] text-dim">{timeOf(task.done_at!)}</span>
    </div>
  )
}

/**
 * The raw beneath — a deeper well, honest when it can't load.
 *
 * DISPLAY CAP (R2, July 30): a long page is capped at ~40vh with a soft
 * paper-coloured fade and ONE affordance — READ THE PAGE — that opens it
 * fully. No scrollbar inside the well. Nothing is destroyed; the raw is
 * byte-identical either way, this is display only.
 */
function RawWell({ rawId }: { rawId: string }) {
  const rawQ = useEntryRaw(rawId, true)
  const [full, setFull] = useState(false)
  const [clipped, setClipped] = useState(false)
  const bodyRef = useRef<HTMLDivElement | null>(null)

  // measure once the text lands: is there more page than the cap shows?
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    setClipped(el.scrollHeight > el.clientHeight + 4)
  }, [rawQ, full])

  if (!rawQ.proven) {
    return (
      <div className="mt-2">
        <Proof of={[rawQ]} line="The raw isn't loading">{() => null}</Proof>
      </div>
    )
  }

  return (
    <div className="mt-2">
      <div className="relative">
        <div
          ref={bodyRef}
          style={full ? undefined : { maxHeight: '40vh', overflow: 'hidden' }}
          className="rounded-xl bg-fill2 px-4 py-3.5 text-[13px] leading-[1.65] whitespace-pre-wrap text-muted"
        >
          {rawQ.value}
        </div>
        {!full && clipped && (
          // the fade sits ON the well, paper-coloured, and never eats taps
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 rounded-b-xl bg-gradient-to-t from-[var(--t-bg)] to-transparent" />
        )}
      </div>
      {clipped && (
        <button
          onClick={() => setFull((v) => !v)}
          className="eyebrow -ml-2.5 mt-1 flex min-h-11 items-center rounded-lg px-2.5 text-[0.58rem] text-dim transition-colors hover:bg-fill2 hover:text-ink"
        >
          {full ? 'shorter' : 'read the page'}
        </button>
      )}
    </div>
  )
}

/** A living page's history (ritual ruling 3): every prior version kept,
 *  one lift beneath the current raw. */
function PriorVersions({ entryId }: { entryId: string }) {
  const revisionsQ = useEntryRevisions(entryId, true)
  // Prior versions render as absence only when absence is proven — an
  // unproven read must not imply the page was never revised.
  if (!revisionsQ.proven) {
    return <Proof of={[revisionsQ]} line="Earlier versions aren't loading">{() => null}</Proof>
  }
  const revisions = revisionsQ.value
  if (revisions.length === 0) return null
  return (
    <div className="mt-2">
      {revisions.map((r) => (
        <div key={r.id} className="mt-2">
          <span className="eyebrow block text-[0.56rem] text-dim opacity-70">
            earlier that day · {timeOf(r.created_at)}
          </span>
          <RawWell rawId={r.raw_id} />
        </div>
      ))}
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
  if (source === 'email') return 'mail'
  return 'filed'
}

function longDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function timeOf(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(/\s?([AP])M$/i, (_, p: string) => p.toLowerCase())
}
