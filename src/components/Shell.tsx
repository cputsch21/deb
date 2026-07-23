import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLens } from '../lib/lens'
import { useMaterializer } from '../lib/materialize'
import { paintWorld } from '../lib/worldTheme'
import { useProjects } from '../db/queries/projects'
import { useTaskMutations } from '../db/queries/tasks'
import { Bench } from './Bench'
import { LensRail } from './LensRail'
import { LensView } from './LensView'
import { ProjectSheet } from './ProjectSheet'
import { UndoPill } from './UndoPill'

/** The app shell: lens rail + the active world + the one door. */
export function Shell(_props: { email: string }) {
  const { lens, setLens } = useLens()
  const { data: projects = [], isFetched } = useProjects()
  const world = projects.find((p) => p.id === lens) ?? null
  const [sheet, setSheet] = useState<'closed' | 'create' | 'edit'>('closed')
  const [draft, setDraft] = useState('')
  const { create: createTask } = useTaskMutations()

  // rhythms materialize as normal tasks at app open + on return
  useMaterializer()

  // If the active project disappears (deleted, rolled back), come home.
  useEffect(() => {
    if (lens !== null && isFetched && !world) setLens(null)
  }, [lens, world, isFetched, setLens])

  // The repaint: the whole app wears the world's color.
  useEffect(() => {
    paintWorld(world?.color ?? null)
  }, [world?.color])

  // M1 ruling: the composer is deliberately dumb — every submitted line
  // becomes a task verbatim. M2 swaps the brain, not the box.
  const submitDraft = () => {
    if (!draft.trim()) return
    createTask(draft, world ? { projectId: world.id } : {})
    setDraft('')
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="relative flex h-full">
      <LensRail onNewProject={() => setSheet('create')} />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between py-5 pr-7 pl-2">
          {world ? (
            <button
              onClick={() => setSheet('edit')}
              title="Project settings"
              className="flex items-center gap-2.5 opacity-90 transition-opacity duration-150 hover:opacity-100"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: world.color }}
              />
              <span className="eyebrow text-dim">{world.name}</span>
            </button>
          ) : (
            <span className="eyebrow text-dim">Deb</span>
          )}
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm text-dim transition-colors hover:text-ink"
          >
            sign out
          </button>
        </header>

        {/* the margin date — the notepad's edge */}
        <div className="absolute top-14 right-7 text-right">
          <div className="font-serif text-base font-medium text-ink">{today}</div>
        </div>

        <main className="flex-1 overflow-y-auto">
          {world ? <LensView world={world} /> : <Bench />}
        </main>

        {/* the one door */}
        <footer className="px-7 pt-3 pb-7">
          <input
            autoFocus
            value={draft}
            maxLength={200}
            placeholder="Add a task…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitDraft()}
            className="mx-auto block w-full max-w-xl rounded-2xl bg-fill px-5 py-4 text-[15px] text-ink outline-none placeholder:text-dim"
          />
        </footer>
      </div>

      {sheet !== 'closed' && (
        <ProjectSheet
          key={sheet === 'edit' ? (world?.id ?? 'edit') : 'create'}
          open
          onClose={() => setSheet('closed')}
          project={sheet === 'edit' ? world : null}
        />
      )}

      <UndoPill />
    </div>
  )
}
