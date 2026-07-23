import { useLens } from '../lib/lens'
import { useProjects } from '../db/queries/projects'

/**
 * The lens rail — thin, always present on desktop (UX ruling, open-1).
 * The Mentor's silver mark on top, then one dot per project world,
 * a quiet + at the bottom. No labels shouting, no counts nagging.
 */
export function LensRail({ onNewProject }: { onNewProject: () => void }) {
  const { lens, setLens } = useLens()
  const { data: projects = [] } = useProjects()

  return (
    <nav className="flex w-12 shrink-0 flex-col items-center gap-4 py-6">
      <button
        onClick={() => setLens(null)}
        title="Deb"
        aria-label="Home — the Mentor"
        className={`h-3 w-3 rotate-45 rounded-[3px] bg-silver transition-all duration-150 ${
          lens === null ? 'scale-110 opacity-100' : 'opacity-55 hover:opacity-100'
        }`}
      />

      <div className="mt-2 flex flex-col items-center gap-3">
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => setLens(p.id)}
            title={p.name}
            aria-label={p.name}
            className={`h-2.5 w-2.5 rounded-full transition-all duration-150 ${
              lens === p.id ? 'scale-125 opacity-100' : 'opacity-55 hover:opacity-100'
            }`}
            style={{ backgroundColor: p.color }}
          />
        ))}
      </div>

      <button
        onClick={onNewProject}
        title="New project"
        aria-label="New project"
        className="mt-auto text-lg leading-none text-dim transition-colors duration-150 hover:text-ink"
      >
        +
      </button>
    </nav>
  )
}
