import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useProjects } from '../../db/queries/projects'
import { useTasks } from '../../db/queries/tasks'
import { useFirstEntryDay } from '../../db/queries/entries'
import { messageKeys, plantFirstMessage } from '../../db/queries/messages'
import { useBrief } from '../../lib/brief'
import { useLens } from '../../lib/lens'
import { useRoom } from '../../lib/rooms'
import { useMaterializer } from '../../lib/materialize'
import { useIsMobile } from '../../lib/useIsMobile'
import { paintWorld } from '../../lib/worldTheme'
import { dealStack, todayKey } from '../../lib/line'
import { epigraphLine, issueNumber } from '../../lib/paper'
import { LoadFailed } from '../LoadFailed'
import { ProjectSheet } from '../ProjectSheet'
import { MemorySheet } from '../MemorySheet'
import { ArrivalsSheet } from '../rooms/ArrivalsSheet'
import { UndoPill } from '../UndoPill'
import { ReadRoom } from '../rooms/ReadRoom'
import { ReactRoom } from '../rooms/ReactRoom'
import { Review } from '../rooms/Review'
import { Reflect } from '../rooms/Reflect'
import type { Project } from '../../db/types'

/**
 * THE PAPER — the V2 shell (July 29 ruling): the app is one page. No
 * rooms, no tabs, no navigation. Masthead · THE RECORD · THE VERDICTS +
 * TO DO · DEB the columnist · THE WORLDS below the fold. Two focus
 * states — CONVERSATION and TRIAGE — where the page recedes and the
 * thread or the card takes the stage. The spec is the V2 design targets
 * in docs/; the fence says presentation only.
 *
 * P1 (the skeleton) migrates by strangler: the masthead, grid, lens,
 * worlds band, and focus choreography are real; the columns and focus
 * stages host the existing room components as interim organs, replaced
 * ticket by ticket (P2–P6), retired in P7. The old `room` store is the
 * focus bridge: every existing door that calls setRoom('reflect') now
 * opens CONVERSATION focus — the door plumbing carries over whole.
 */
export function Paper() {
  const { lens, setLens } = useLens()
  const { room, setRoom } = useRoom()
  const isMobile = useIsMobile()
  const { data: projects = [], isFetched, isError, refetch } = useProjects()
  const { data: tasks = [] } = useTasks()
  const firstDayQ = useFirstEntryDay()
  const briefQ = useBrief(true)
  const world = projects.find((p) => p.id === lens) ?? null
  const [sheet, setSheet] = useState<'closed' | 'create' | 'edit'>('closed')
  const [memoryOpen, setMemoryOpen] = useState(false)
  const [arrivalsOpen, setArrivalsOpen] = useState(false)
  const [hoverName, setHoverName] = useState<string | null>(null)
  const today = todayKey()

  // rhythms materialize as normal tasks at app open + on return
  useMaterializer()

  // the paper opens on the page, not a focus (the store's V1 default
  // was the Reflect room — on the Paper, 'read' IS the page)
  useEffect(() => {
    useRoom.getState().setRoom('read')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A brand-new account's thread is never silent (T4 ruling 12).
  const qc = useQueryClient()
  useEffect(() => {
    void plantFirstMessage().then((planted) => {
      if (planted) void qc.invalidateQueries({ queryKey: messageKeys.all })
    })
  }, [qc])

  // If the active world disappears (retired, rolled back), come home.
  useEffect(() => {
    if (lens !== null && isFetched && !world) setLens(null)
  }, [lens, world, isFetched, setLens])

  // The repaint: the whole paper wears the world's color (silver at home).
  useEffect(() => {
    paintWorld(world?.color ?? null)
  }, [world?.color])

  // Escape walks back to the page (triage keeps its own Esc for
  // choosers — its exit is the back button until P4 unifies the cascade)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (room === 'reflect' || room === 'review') setRoom('read')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [room, setRoom])

  const focus = room !== 'read'
  const stack = useMemo(() => dealStack(tasks, lens, today), [tasks, lens, today])
  const epigraph = epigraphLine(briefQ.data?.items)
  const edition = issueNumber(firstDayQ.data ?? null, today)

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  if (isError) {
    return <LoadFailed what="The paper" onRetry={() => void refetch()} />
  }

  return (
    <div className="relative h-full overflow-y-auto">
      {/* ================= THE PAGE ================= */}
      <div
        className={`mx-auto max-w-[1420px] px-5 pt-7 pb-24 transition-[opacity,transform] duration-200 md:px-14 md:pt-9 md:pb-18 ${
          focus ? 'pointer-events-none scale-[0.985] opacity-40 select-none' : ''
        }`}
      >
        {/* ---------- masthead ---------- */}
        <header>
          <div className="flex items-center justify-between pb-5 md:pb-6">
            <span className="eyebrow text-dim">
              Deb · The whole life, daily · No. {edition}
            </span>
            <button
              onClick={() => setArrivalsOpen(true)}
              className="eyebrow -my-2 flex min-h-11 items-center rounded-full px-3.5 text-muted transition-colors hover:bg-fill hover:text-ink"
            >
              arrivals ↗
            </button>
          </div>
          <div className="flex flex-col gap-4 pb-5 md:flex-row md:items-end md:justify-between md:gap-10 md:pb-6">
            <div className="min-w-0">
              <h1 className="font-serif text-[38px] leading-[0.95] font-medium tracking-[-0.018em] whitespace-nowrap md:text-[88px] md:leading-[0.92]">
                {dateLabel}
              </h1>
              {/* the epigraph — words, not state: reprinted, never checked */}
              {epigraph && (
                <p className="mt-2.5 font-serif text-[15px] text-muted italic">
                  <span className="eyebrow mr-3.5 align-[2px] text-[0.55rem] text-dim not-italic">
                    today, in your words
                  </span>
                  {epigraph}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 md:flex-col md:items-end md:gap-2.5 md:pb-2">
              <span className="eyebrow order-2 min-h-[13px] truncate text-accent md:order-1">
                {hoverName ?? (world ? world.name : 'Whole life')}
              </span>
              <div className="order-1 flex gap-1 overflow-x-auto md:order-2" style={{ scrollbarWidth: 'none' }}>
                <LensDot
                  active={lens === null}
                  label="Whole life"
                  onHover={setHoverName}
                  onPick={() => setLens(null)}
                >
                  <span
                    className="block rounded-full"
                    style={{
                      width: 15,
                      height: 15,
                      background: 'radial-gradient(circle at 35% 30%, #dedbd4, #807c74)',
                    }}
                  />
                </LensDot>
                {projects.map((p) => (
                  <LensDot
                    key={p.id}
                    active={lens === p.id}
                    label={p.name}
                    onHover={setHoverName}
                    onPick={() => setLens(lens === p.id ? null : p.id)}
                  >
                    <span
                      className="block rounded-full"
                      style={{ width: 15, height: 15, backgroundColor: p.color }}
                    />
                  </LensDot>
                ))}
              </div>
            </div>
          </div>
          <hr className="border-0 border-t border-hair" />
          {/* the strap: the scoped world's standing line (+ its doors) */}
          {world && (
            <div className="flex min-h-5 items-center gap-2.5 px-0.5 pt-3.5 font-serif text-[15px] text-muted italic">
              <span
                className="h-[9px] w-[9px] flex-none rounded-full"
                style={{ backgroundColor: world.color }}
              />
              <span className="min-w-0 truncate">
                {world.name}
                {world.mission ? ` — ${world.mission}` : ''}
              </span>
              <button
                onClick={() => setRoom('review')}
                className="eyebrow -my-3 ml-auto flex min-h-11 flex-none items-center px-2 text-[0.58rem] text-dim not-italic transition-colors hover:text-ink"
              >
                dossier →
              </button>
              <button
                onClick={() => setSheet('edit')}
                className="eyebrow -my-3 flex min-h-11 flex-none items-center px-2 text-[0.58rem] text-dim not-italic transition-colors hover:text-ink"
              >
                settings
              </button>
            </div>
          )}
        </header>

        {/* ---------- the sheet: record · verdicts · deb ---------- */}
        <div className="mt-6 grid grid-cols-1 items-start md:grid-cols-[1.35fr_1fr_1.04fr]">
          {/* LEFT — THE RECORD (interim organ: the V1 Read room; P2 lays
              the true column: taken down · finished · dealings · earlier) */}
          <section className="min-w-0 md:pr-11">
            <div className="eyebrow mb-3">The Record</div>
            <ReadRoom lens={lens} />
          </section>

          {/* CENTER — THE VERDICTS seam (triage lives behind it) */}
          <section className="mt-8 min-w-0 border-hair md:mt-0 md:border-l md:px-10">
            <div className="eyebrow mb-3">The Verdicts</div>
            {stack.length === 0 ? (
              <>
                <div className="eyebrow mt-3 text-[0.6rem] text-dim">Triage clear</div>
                <p className="mt-3 font-serif text-[18px] leading-[1.5] text-muted italic">
                  Clear. Every loop has a verdict. Go live it.
                </p>
              </>
            ) : (
              <>
                <div className="eyebrow mt-3 text-[0.6rem] text-accent">
                  {stack.length} loop{stack.length === 1 ? '' : 's'} need
                  {stack.length === 1 ? 's' : ''} verdicts
                </div>
                <button
                  onClick={() => setRoom('react')}
                  className="mt-3 block w-full rounded-[14px] bg-[var(--t-card)] px-5 py-4.5 text-left transition-colors"
                >
                  <span className="eyebrow block text-[0.58rem] text-dim">
                    {stack[0].kind === 'chase'
                      ? 'a chase came due'
                      : stack[0].kind === 'stale'
                        ? 'an old anchor asks'
                        : 'from the record'}
                  </span>
                  <span className="mt-2 block font-serif text-[17.5px] leading-[1.3] font-medium text-ink">
                    {stack[0].task.title}
                  </span>
                  <span className="mt-3 flex items-center gap-2">
                    <span
                      className="h-[9px] w-[9px] rounded-full"
                      style={{
                        backgroundColor:
                          projects.find((p) => p.id === stack[0].task.project_id)?.color ??
                          'var(--t-silver)',
                      }}
                    />
                    <span className="eyebrow text-[0.6rem] text-muted">
                      {projects.find((p) => p.id === stack[0].task.project_id)?.name ?? 'bench'}
                    </span>
                    <span className="eyebrow ml-auto text-[0.58rem] text-dim">
                      give verdicts →
                    </span>
                  </span>
                </button>
              </>
            )}
          </section>

          {/* RIGHT — DEB, THE COLUMNIST (interim: the doors are real; the
              column itself is laid in P3) */}
          <section className="mt-8 flex min-w-0 flex-col border-hair md:mt-0 md:min-h-full md:border-l md:pl-10">
            <div className="eyebrow mb-3">Deb</div>
            <button
              onClick={() => setRoom('reflect')}
              className="-mx-3.5 rounded-[14px] px-3.5 py-2 pb-1.5 text-left transition-colors hover:bg-fill"
            >
              <span className="eyebrow mt-2 block text-[0.58rem] text-dim">
                open the thread →
              </span>
            </button>
            <div className="flex-1" />
            {/* the composer is a door: engaging it is CONVERSATION focus */}
            {!isMobile && (
              <div className="sticky bottom-0 mt-9 bg-gradient-to-t from-[var(--t-bg)] from-[78%] to-transparent pt-6 pb-4">
                <ComposerDoor onOpen={() => setRoom('reflect')} />
              </div>
            )}
          </section>
        </div>

        {/* ---------- THE WORLDS, below the fold ---------- */}
        <section className="mt-16">
          <hr className="mb-5 border-0 border-t border-hair" />
          <div className="eyebrow">The Worlds</div>
          <div className="mt-3.5 grid grid-cols-1 gap-x-6 gap-y-2.5 md:grid-cols-3">
            {projects.map((p) => (
              <WorldTile
                key={p.id}
                world={p}
                active={lens === p.id}
                dimmed={lens !== null && lens !== p.id}
                onPick={() => setLens(lens === p.id ? null : p.id)}
              />
            ))}
            <button
              onClick={() => setSheet('create')}
              className="eyebrow flex min-h-11 items-center rounded-[14px] px-5 text-dim transition-colors hover:bg-fill hover:text-ink"
            >
              + new world
            </button>
          </div>
        </section>

        {/* ---------- colophon ---------- */}
        <div className="mt-14 flex items-center justify-center gap-6 text-center">
          <span className="eyebrow text-[0.55rem] text-dim">
            Printed this morning by Deb · Nothing leaves this page
          </span>
          <button
            onClick={() => setMemoryOpen(true)}
            className="eyebrow -my-2 flex min-h-11 items-center text-[0.55rem] text-dim opacity-70 transition-opacity hover:opacity-100"
          >
            memory
          </button>
        </div>
      </div>

      {/* ---------- mobile: the bottom bar (composer door) ---------- */}
      {isMobile && !focus && (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-[var(--t-bg)] from-[78%] to-transparent px-4 pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <ComposerDoor onOpen={() => setRoom('reflect')} />
        </div>
      )}

      {/* ================= THE FOCUS LAYER ================= */}
      {focus && (
        <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-[var(--t-bg)]/60 pt-[env(safe-area-inset-top)]">
          <div className="flex-none px-3 pt-2.5 pb-1 md:px-8 md:pt-5">
            <button
              onClick={() => setRoom('read')}
              className="eyebrow flex min-h-11 items-center rounded-full bg-fill px-4 text-muted transition-colors hover:bg-fill2 hover:text-ink"
            >
              ← the page
            </button>
          </div>
          <div className="roomin flex min-h-0 flex-1 flex-col">
            {room === 'reflect' && <Reflect lens={lens} />}
            {room === 'react' && <ReactRoom lens={lens} />}
            {room === 'review' && <Review lens={lens} />}
          </div>
        </div>
      )}

      {/* ---------- the standing sheets ---------- */}
      {sheet !== 'closed' && (
        <ProjectSheet
          key={sheet === 'edit' ? (world?.id ?? 'edit') : 'create'}
          open
          onClose={() => setSheet('closed')}
          project={sheet === 'edit' ? world : null}
        />
      )}
      <MemorySheet open={memoryOpen} onClose={() => setMemoryOpen(false)} />
      <ArrivalsSheet open={arrivalsOpen} onClose={() => setArrivalsOpen(false)} />
      <UndoPill />
    </div>
  )
}

/* ================= masthead furniture ================= */

function LensDot({
  active,
  label,
  onHover,
  onPick,
  children,
}: {
  active: boolean
  label: string
  onHover: (name: string | null) => void
  onPick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onPick}
      onMouseEnter={() => onHover(label)}
      onMouseLeave={() => onHover(null)}
      aria-label={label}
      className={`grid h-[34px] w-[34px] flex-none place-items-center rounded-full transition-colors hover:bg-fill2 ${
        active ? 'bg-fill2' : ''
      }`}
    >
      <span className={`transition-transform duration-150 ${active ? 'scale-[1.18]' : ''}`}>
        {children}
      </span>
    </button>
  )
}

/** The composer bar on the page is a DOOR — engaging it opens the
 *  conversation; the real composer lives in the focus (Reflect's own). */
function ComposerDoor({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-2.5 rounded-full bg-fill py-2 pr-2 pl-5 text-left transition-colors hover:bg-fill2"
    >
      <span className="flex-1 text-[14px] text-dim">Tell Deb anything…</span>
      <span
        className="grid h-9 w-9 flex-none place-items-center rounded-full text-[15px] text-white"
        style={{ backgroundColor: 'var(--t-accent)' }}
      >
        ↑
      </span>
    </button>
  )
}

/* ================= the worlds band ================= */

function WorldTile({
  world,
  active,
  dimmed,
  onPick,
}: {
  world: Project
  active: boolean
  dimmed: boolean
  onPick: () => void
}) {
  return (
    <button
      onClick={onPick}
      className={`rounded-[14px] px-5 py-4 text-left transition-[background-color,opacity] duration-200 hover:bg-fill ${
        active ? 'bg-fill' : ''
      } ${dimmed ? 'opacity-35 hover:opacity-70' : ''}`}
    >
      <span className="flex items-center gap-2">
        <span
          className="h-[9px] w-[9px] flex-none rounded-full"
          style={{ backgroundColor: world.color }}
        />
        {active && <span className="eyebrow text-[0.58rem] text-accent">in the lens</span>}
      </span>
      <span
        className={`mt-2.5 block font-serif font-medium tracking-[-0.005em] transition-[font-size] duration-200 ${
          active ? 'text-[22px]' : 'text-[20px]'
        }`}
      >
        {world.name}
      </span>
      {world.mission && (
        <span className="mt-1 block font-serif text-[14px] leading-[1.5] text-muted italic">
          {world.mission}
        </span>
      )}
    </button>
  )
}
