import { useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { cycleTheme, getTheme } from '../../lib/theme'
import type { Project } from '../../db/types'

/**
 * The world sheet — the rail's phone form, mirroring TRUE's grammar: drag
 * handle, the current world in a soft filled well, a hairline, every held
 * world as a row, + NEW WORLD in mono, and a quiet bottom row (theme ·
 * memory · sign out). Slides up 200ms; dismisses instantly on flick-down
 * or tap-away. Its floating edge is the one sanctioned shadow.
 */
export function WorldSheet({
  open,
  world,
  projects,
  onClose,
  onPick,
  onNew,
  onEditCurrent,
  onMemory,
}: {
  open: boolean
  world: Project | null
  projects: Project[]
  onClose: () => void
  onPick: (id: string | null) => void
  onNew: () => void
  onEditCurrent: () => void
  onMemory: () => void
}) {
  const startY = useRef<number | null>(null)
  const [dy, setDy] = useState(0)
  const [theme, setTheme] = useState(getTheme())
  if (!open) return null

  const pick = (id: string | null) => {
    onClose() // the sheet drops instantly…
    onPick(id) // …and the app repaints into the lens
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/10" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-label="Worlds"
        className="sheet-up fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-bg px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        style={dy > 0 ? { transform: `translateY(${dy}px)`, animation: 'none' } : undefined}
        onTouchStart={(e) => {
          startY.current = e.touches[0].clientY
        }}
        onTouchMove={(e) => {
          if (startY.current === null) return
          setDy(Math.max(0, e.touches[0].clientY - startY.current))
        }}
        onTouchEnd={() => {
          const flicked = dy > 60
          startY.current = null
          setDy(0)
          if (flicked) onClose() // instant, per the motion law
        }}
      >
        {/* drag handle */}
        <div className="mx-auto mt-3 mb-4 h-1 w-10 rounded-full bg-fill2" />

        {/* the current world, in its well */}
        <button
          onClick={() => {
            if (world) {
              onClose()
              onEditCurrent()
            }
          }}
          className="flex min-h-11 w-full items-center gap-3 rounded-2xl bg-fill px-4 py-3.5 text-left"
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: world?.color ?? 'var(--t-silver)' }}
          />
          <span className="flex-1 font-serif text-[16px] font-medium text-ink">
            {world ? world.name : 'Deb'}
          </span>
          <span className="eyebrow text-dim">{world ? 'settings' : 'whole life'}</span>
        </button>

        <div className="my-4 h-px bg-hair" />

        {/* every held world */}
        <div className="momentum flex max-h-[45dvh] flex-col overflow-y-auto">
          {world && (
            <button
              onClick={() => pick(null)}
              className="flex min-h-11 items-center gap-3 rounded-xl px-2 py-3 text-left active:bg-fill"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-silver" />
              <span className="text-[15px] text-ink">Deb — whole life</span>
            </button>
          )}
          {projects
            .filter((p) => p.id !== world?.id)
            .map((p) => (
              <button
                key={p.id}
                onClick={() => pick(p.id)}
                className="flex min-h-11 items-center gap-3 rounded-xl px-2 py-3 text-left active:bg-fill"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="text-[15px] text-ink">{p.name}</span>
              </button>
            ))}
          <button
            onClick={() => {
              onClose()
              onNew()
            }}
            className="eyebrow flex min-h-11 items-center gap-3 px-2 py-3 text-left text-dim active:text-ink"
          >
            + new world
          </button>
        </div>

        <div className="mt-2 mb-1 h-px bg-hair" />

        {/* the quiet bottom row */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setTheme(cycleTheme())}
            aria-label="Theme: arc, light, or dark"
            className="flex min-h-11 items-center gap-2 px-2 text-dim active:text-ink"
          >
            <span className="text-lg">◐</span>
            <span className="eyebrow">{theme}</span>
          </button>
          <button
            onClick={() => {
              onClose()
              onMemory()
            }}
            className="eyebrow flex min-h-11 items-center px-3 text-dim active:text-ink"
          >
            memory
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex min-h-11 items-center px-2 text-xs text-dim active:text-ink"
          >
            sign out
          </button>
        </div>
      </div>
    </>
  )
}
