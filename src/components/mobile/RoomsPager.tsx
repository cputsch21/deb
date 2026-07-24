import { useState, type ReactNode } from 'react'
import { ROOMS, useRoom } from '../../lib/rooms'

/**
 * The rooms as a horizontal pager (mobile ruling, July 24 2026): the four
 * rooms side by side in canonical order READ · REVIEW · REACT · REFLECT;
 * a flat 200ms slide, no bounce, no parallax.
 *
 * Gesture ownership is decided by TOUCH-START TARGET, period: a touch that
 * begins inside any element carrying `data-own-touch` (the React card, the
 * Now strip, any horizontal scroller) belongs to that element — the pager
 * never moves. A touch that begins anywhere else belongs to the pager.
 * No velocity heuristics. Within pager-owned touches, a small axis lock
 * (first ~10px) separates a page-swipe from the thread's native vertical
 * scroll — that's scroll plumbing, not ownership.
 */
type Drag = { x: number; y: number; dx: number; locked: 'h' | 'v' | null }

export function RoomsPager({ children }: { children: ReactNode[] }) {
  const { room, setRoom } = useRoom()
  const index = Math.max(
    0,
    ROOMS.findIndex((r) => r.id === room),
  )
  const [drag, setDrag] = useState<Drag | null>(null)

  return (
    <div
      className="min-h-0 flex-1 overflow-hidden"
      onTouchStart={(e) => {
        // Ownership: the touch-start target decides. data-own-touch wins.
        if ((e.target as HTMLElement).closest('[data-own-touch]')) return
        const t = e.touches[0]
        setDrag({ x: t.clientX, y: t.clientY, dx: 0, locked: null })
      }}
      onTouchMove={(e) => {
        if (!drag) return
        const t = e.touches[0]
        const dx = t.clientX - drag.x
        const dyAbs = Math.abs(t.clientY - drag.y)
        let locked = drag.locked
        if (!locked && Math.max(Math.abs(dx), dyAbs) > 10) {
          locked = Math.abs(dx) > dyAbs ? 'h' : 'v'
        }
        setDrag({ ...drag, dx: locked === 'h' ? dx : 0, locked })
      }}
      onTouchEnd={() => {
        if (!drag) return
        if (drag.locked === 'h' && Math.abs(drag.dx) > 80) {
          const next = Math.min(ROOMS.length - 1, Math.max(0, index + (drag.dx < 0 ? 1 : -1)))
          setRoom(ROOMS[next].id)
        }
        setDrag(null)
      }}
      onTouchCancel={() => setDrag(null)}
    >
      <div
        className="flex h-full"
        style={{
          width: `${ROOMS.length * 100}%`,
          touchAction: 'pan-y',
          transform: `translateX(calc(${(-index * 100) / ROOMS.length}% + ${
            drag?.locked === 'h' ? drag.dx : 0
          }px))`,
          transition: drag?.locked === 'h' ? 'none' : 'transform 200ms ease-out',
        }}
      >
        {children.map((child, i) => (
          <div key={ROOMS[i]?.id ?? i} className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
            {child}
          </div>
        ))}
      </div>
    </div>
  )
}
