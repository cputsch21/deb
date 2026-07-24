import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLens } from '../lib/lens'
import { useRoom, type Room } from '../lib/rooms'
import { useMaterializer } from '../lib/materialize'
import { paintWorld } from '../lib/worldTheme'
import { useProjects } from '../db/queries/projects'
import { LensRail } from './LensRail'
import { RoomsNav } from './rooms/RoomsNav'
import { Reflect } from './rooms/Reflect'
import { Review } from './rooms/Review'
import { Stub } from './rooms/Stub'
import { ProjectSheet } from './ProjectSheet'
import { MemorySheet } from './MemorySheet'
import { UndoPill } from './UndoPill'

/**
 * The app shell: the lens rail (the one global filter) + the four rooms.
 * M2 builds Reflect — the thread with Deb — inside this shell; Read, Review,
 * and React are calm stubs until their milestones land. The M1 spine (data,
 * optimistic writes, sheets, undo) is untouched beneath, waiting to re-home
 * into Review (read-only) and React (the stack).
 */
export function Shell(_props: { email: string }) {
  const { lens, setLens } = useLens()
  const { room, setRoom } = useRoom()
  const { data: projects = [], isFetched } = useProjects()
  const world = projects.find((p) => p.id === lens) ?? null
  const [sheet, setSheet] = useState<'closed' | 'create' | 'edit'>('closed')
  const [memoryOpen, setMemoryOpen] = useState(false)

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

  return (
    <div className="relative flex h-full">
      <LensRail onNewProject={() => setSheet('create')} />

      <main className="relative flex min-w-0 flex-1 flex-col">
        <RoomsNav />

        {/* the world chip — top-left, only when scoped; name opens settings, ✕ steps out */}
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

        {/* the margin date — the notepad's edge */}
        <div className="absolute top-6 right-8 z-10 text-right">
          <div className="font-serif text-[15px] font-medium text-ink opacity-90">{today}</div>
        </div>

        {/* the memory whisper — the visible half of memory, one tap away */}
        <button
          onClick={() => setMemoryOpen(true)}
          className="eyebrow absolute right-8 bottom-6 z-10 text-dim opacity-55 transition-opacity hover:opacity-100"
        >
          memory
        </button>

        {/* sign out — a quiet corner */}
        <button
          onClick={() => supabase.auth.signOut()}
          className="absolute bottom-6 left-5 z-10 text-xs text-dim opacity-40 transition-opacity hover:opacity-90"
        >
          sign out
        </button>

        {room === 'reflect' && <Reflect lens={lens} />}
        {room === 'read' && <Stub eyebrow="Read" line="Your days will land here." />}
        {room === 'review' && <Review lens={lens} />}
        {room === 'react' && <Stub eyebrow="React" line="Nothing to decide yet." />}
      </main>

      {sheet !== 'closed' && (
        <ProjectSheet
          key={sheet === 'edit' ? (world?.id ?? 'edit') : 'create'}
          open
          onClose={() => setSheet('closed')}
          project={sheet === 'edit' ? world : null}
        />
      )}

      <MemorySheet open={memoryOpen} onClose={() => setMemoryOpen(false)} />

      <UndoPill />
    </div>
  )
}
