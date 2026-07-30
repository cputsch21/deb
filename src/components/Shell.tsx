import { useEffect, useState } from 'react'
import { cycleTheme, getTheme } from '../lib/theme'
import { useSunTimes } from '../lib/sun'
import { supabase } from '../lib/supabase'
import { useLens } from '../lib/lens'
import { useRoom, type Room } from '../lib/rooms'
import { useIsMobile } from '../lib/useIsMobile'
import { useMaterializer } from '../lib/materialize'
import { paintWorld } from '../lib/worldTheme'
import { useProjects } from '../db/queries/projects'
import { LensRail } from './LensRail'
import { LoadFailed } from './LoadFailed'
import { RoomsNav } from './rooms/RoomsNav'
import { Reflect } from './rooms/Reflect'
import { Review } from './rooms/Review'
import { ReactRoom } from './rooms/ReactRoom'
import { ReadRoom } from './rooms/ReadRoom'
import { MobileHeader } from './mobile/MobileHeader'
import { RoomsPager } from './mobile/RoomsPager'
import { WorldSheet } from './mobile/WorldSheet'
import { ProjectSheet } from './ProjectSheet'
import { MemorySheet } from './MemorySheet'
import { UndoPill } from './UndoPill'

function sunLabel(ms: number): string {
  return new Date(ms)
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(/\s?[AP]M$/i, '')
}

/**
 * The app shell: one codebase, two arrangements. Desktop: the lens rail +
 * the rooms nav, one room at a time. Below the mobile breakpoint: the world
 * pill + bottom world sheet replace the rail, and the four rooms become a
 * horizontal pager (canonical order Read · Review · React · Reflect,
 * landing on Reflect). Same rooms, phone-shaped shell — no forks.
 */
export function Shell(_props: { email: string }) {
  const { lens, setLens } = useLens()
  const { room, setRoom } = useRoom()
  const isMobile = useIsMobile()
  const { data: projects = [], isFetched, isError, refetch } = useProjects()
  const world = projects.find((p) => p.id === lens) ?? null
  const [sheet, setSheet] = useState<'closed' | 'create' | 'edit'>('closed')
  const [memoryOpen, setMemoryOpen] = useState(false)
  const [worldsOpen, setWorldsOpen] = useState(false)
  const [theme, setTheme] = useState(getTheme())
  const sun = useSunTimes()

  // rhythms materialize as normal tasks at app open + on return
  useMaterializer()

  // If the active project disappears (deleted, rolled back), come home.
  useEffect(() => {
    if (lens !== null && isFetched && !world) setLens(null)
  }, [lens, world, isFetched, setLens])

  // The repaint: the whole app wears the world's color (silver at home).
  useEffect(() => {
    paintWorld(world?.color ?? null)
  }, [world?.color])

  // Rooms keys 1–4 — never while typing in the composer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      const map: Record<string, Room> = { '1': 'read', '2': 'review', '3': 'react', '4': 'reflect' }
      const next = map[e.key]
      if (next) {
        e.preventDefault()
        setRoom(next)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setRoom])

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  // The four rooms, canonical order — shared by both shells.
  const rooms = {
    read: <ReadRoom lens={lens} />,
    review: <Review lens={lens} />,
    react: <ReactRoom lens={lens} />,
    reflect: <Reflect lens={lens} />,
  }

  return (
    <div className="relative flex h-full">
      {!isMobile && <LensRail onNewProject={() => setSheet('create')} />}

      <main className="relative flex min-w-0 flex-1 flex-col">
        {isMobile ? (
          <MobileHeader world={world} onOpenWorlds={() => setWorldsOpen(true)} />
        ) : (
          <>
            <RoomsNav />

            {/* the world chip — top-left, only when scoped */}
            {world && (
              <div className="absolute top-6 left-8 z-10 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: world.color }} />
                <button
                  onClick={() => setSheet('edit')}
                  title="Project settings"
                  className="font-serif text-[15px] font-medium text-ink"
                >
                  {world.name}
                </button>
                <button
                  onClick={() => setLens(null)}
                  title="Back to whole life"
                  aria-label="Back to whole life"
                  className="ml-0.5 text-xs text-dim opacity-60 transition-opacity hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            )}

            {/* the margin date — the notepad's edge; the sun on hover (Arc) */}
            <div className="group absolute top-6 right-8 z-10 text-right">
              <div className="font-serif text-[15px] font-medium text-ink opacity-90">{today}</div>
              {sun.sunrise && sun.sunset && (
                <div className="mt-0.5 text-[10px] tracking-[0.06em] text-dim opacity-0 transition-opacity duration-250 group-hover:opacity-85">
                  ↑ {sunLabel(sun.sunrise)} &nbsp; ↓ {sunLabel(sun.sunset)}
                </div>
              )}
            </div>

            {/* the memory whisper — the visible half of memory, one tap away */}
            <button
              onClick={() => setMemoryOpen(true)}
              className="eyebrow absolute right-8 bottom-6 z-10 text-dim opacity-55 transition-opacity hover:opacity-100"
            >
              memory
            </button>

            {/* the quiet corner: theme + sign out */}
            <button
              onClick={() => setTheme(cycleTheme())}
              title="Theme: arc · light · dark"
              className="absolute bottom-6 left-5 z-10 flex items-center gap-1.5 text-xs text-dim opacity-40 transition-opacity hover:opacity-90"
            >
              ◐ <span className="eyebrow text-[0.58rem]">{theme}</span>
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              className="absolute bottom-6 left-24 z-10 text-xs text-dim opacity-40 transition-opacity hover:opacity-90"
            >
              sign out
            </button>
          </>
        )}

        {/* Law: a failed worlds load never renders as an empty board. */}
        {isError ? (
          <LoadFailed what="Your worlds" onRetry={() => void refetch()} />
        ) : isMobile ? (
          <RoomsPager>{[rooms.read, rooms.review, rooms.react, rooms.reflect]}</RoomsPager>
        ) : (
          <div key={room} className="room-rise flex min-h-0 flex-1 flex-col">
            {rooms[room]}
          </div>
        )}
      </main>

      {sheet !== 'closed' && (
        <ProjectSheet
          key={sheet === 'edit' ? (world?.id ?? 'edit') : 'create'}
          open
          onClose={() => setSheet('closed')}
          project={sheet === 'edit' ? world : null}
        />
      )}

      {isMobile && (
        <WorldSheet
          open={worldsOpen}
          world={world}
          projects={projects}
          onClose={() => setWorldsOpen(false)}
          onPick={setLens}
          onNew={() => setSheet('create')}
          onEditCurrent={() => setSheet('edit')}
          onMemory={() => setMemoryOpen(true)}
        />
      )}

      <MemorySheet open={memoryOpen} onClose={() => setMemoryOpen(false)} />

      <UndoPill />
    </div>
  )
}
