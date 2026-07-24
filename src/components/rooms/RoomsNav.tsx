import { ROOMS, useRoom } from '../../lib/rooms'

/**
 * The four verbs, top-center. Active reads in the accent (silver at home,
 * the world's color in a lens) with a small dot marker — quieter than an
 * underline. The one nav that never scrolls away.
 */
export function RoomsNav() {
  const { room, setRoom } = useRoom()
  return (
    <nav className="absolute top-6 left-1/2 z-10 flex -translate-x-1/2 gap-7">
      {ROOMS.map((r) => {
        const on = room === r.id
        return (
          <button
            key={r.id}
            onClick={() => setRoom(r.id)}
            className={`eyebrow relative py-1 transition-opacity duration-150 ${
              on ? 'text-ink opacity-100' : 'text-dim opacity-50 hover:opacity-100'
            }`}
          >
            {r.label}
            {on && (
              <span className="absolute -bottom-1.5 left-1/2 h-[3.5px] w-[3.5px] -translate-x-1/2 rounded-full bg-accent" />
            )}
          </button>
        )
      })}
    </nav>
  )
}
