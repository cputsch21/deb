import { ROOMS, useRoom } from '../../lib/rooms'
import type { Project } from '../../db/types'

/**
 * The mobile masthead: the world pill (the rail's phone form) top-center —
 * `● WORLD ▾` in a soft well; silver + Deb at home, the world's color and
 * name in a lens. Beneath it, the four verbs in tiny mono as the pager
 * indicator — current in ink, the rest muted, each tappable (the
 * discoverability fallback for swiping). Safe-area padded past the notch.
 */
export function MobileHeader({
  world,
  onOpenWorlds,
}: {
  world: Project | null
  onOpenWorlds: () => void
}) {
  const { room, setRoom } = useRoom()

  return (
    <header className="flex flex-col items-center pt-[max(0.75rem,env(safe-area-inset-top))]">
      <button
        onClick={onOpenWorlds}
        aria-label="Choose a world"
        className="flex min-h-11 items-center gap-2.5 rounded-full bg-fill px-4.5 py-2.5 transition-colors duration-150 active:bg-fill2"
      >
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={world ? { backgroundColor: world.color } : undefined}
          data-home={!world || undefined}
        >
          {!world && <span className="block h-full w-full rounded-full bg-silver" />}
        </span>
        <span className="eyebrow text-ink">{world ? world.name : 'Deb'}</span>
        <span className="text-[10px] text-dim">▾</span>
      </button>

      <nav className="mt-0.5 flex items-center gap-5">
        {ROOMS.map((r) => (
          <button
            key={r.id}
            onClick={() => setRoom(r.id)}
            className={`eyebrow flex min-h-11 items-center px-1 transition-opacity duration-150 ${
              room === r.id ? 'text-ink opacity-100' : 'text-dim opacity-55'
            }`}
          >
            {r.label}
          </button>
        ))}
      </nav>
    </header>
  )
}
