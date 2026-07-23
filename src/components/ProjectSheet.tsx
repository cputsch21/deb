import { useState } from 'react'
import { Sheet } from './Sheet'
import { useLens } from '../lib/lens'
import { cadenceLabel } from '../lib/day'
import { isValidHex, randomProjectColor } from '../lib/worldTheme'
import { useProjectMutations } from '../db/queries/projects'
import { useRecurring, useRecurringMutations } from '../db/queries/recurring'
import type { Cadence, Project } from '../db/types'
import { NAME_MAX, TITLE_MAX } from '../db/types'

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/**
 * A project's rhythms (ruling: exactly three cadences — daily, weekly on
 * chosen days, monthly on a date). Each materializes as a normal task on
 * its day. Retire with undo; the tasks it made stay.
 */
function Rhythms({ projectId }: { projectId: string }) {
  const { data: rhythms = [] } = useRecurring()
  const { create, remove } = useRecurringMutations()
  const [title, setTitle] = useState('')
  const [cadence, setCadence] = useState<Cadence>('daily')
  const [weeklyDays, setWeeklyDays] = useState<number[]>([])
  const [monthlyDay, setMonthlyDay] = useState(1)

  const mine = rhythms.filter((r) => r.project_id === projectId)

  const add = () => {
    if (!title.trim()) return
    if (cadence === 'weekly' && weeklyDays.length === 0) return
    create(title, {
      cadence,
      weeklyDays,
      monthlyDay,
      projectId,
    })
    setTitle('')
    setWeeklyDays([])
  }

  const toggleDay = (d: number) =>
    setWeeklyDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()))

  return (
    <div className="flex flex-col gap-3">
      <span className="eyebrow text-dim">Rhythms</span>

      {mine.map((r) => (
        <div key={r.id} className="group flex items-center gap-3 rounded-xl bg-fill px-3.5 py-2.5">
          <span className="min-w-0 flex-1 truncate text-sm text-ink">{r.title}</span>
          <span className="eyebrow shrink-0 text-dim">{cadenceLabel(r)}</span>
          <button
            onClick={() => remove(r.id)}
            aria-label={`Retire ${r.title}`}
            className="shrink-0 text-sm text-dim opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:text-bad"
          >
            ×
          </button>
        </div>
      ))}

      <input
        value={title}
        maxLength={TITLE_MAX}
        placeholder="Add a rhythm…"
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
        className="rounded-xl bg-fill px-4 py-2.5 text-sm text-ink outline-none placeholder:text-dim"
      />

      <div className="flex items-center gap-2">
        {(['daily', 'weekly', 'monthly'] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCadence(c)}
            className={`rounded-lg px-3 py-1.5 text-xs transition-colors duration-150 ${
              cadence === c ? 'bg-fill2 text-ink' : 'text-muted hover:bg-fill'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {cadence === 'weekly' && (
        <div className="flex items-center gap-1.5">
          {DAY_LETTERS.map((letter, d) => (
            <button
              key={d}
              onClick={() => toggleDay(d)}
              aria-label={`Weekday ${d}`}
              className={`h-7 w-7 rounded-lg font-mono text-xs transition-colors duration-150 ${
                weeklyDays.includes(d) ? 'bg-fill2 text-ink' : 'text-dim hover:bg-fill'
              }`}
            >
              {letter}
            </button>
          ))}
        </div>
      )}

      {cadence === 'monthly' && (
        <input
          type="number"
          min={1}
          max={31}
          value={monthlyDay}
          onChange={(e) => setMonthlyDay(Math.max(1, Math.min(31, Number(e.target.value) || 1)))}
          className="w-24 rounded-xl bg-fill px-4 py-2.5 font-mono text-sm text-ink outline-none"
        />
      )}
    </div>
  )
}

/** Muted presets in the Warm Glass register — starting points, not law. */
const PRESETS = ['#c0674f', '#b98d4f', '#7f9471', '#5f8f8b', '#6f7f96', '#8d6f96']

/**
 * Create or edit a project. project = null → create mode.
 * Edits apply instantly (act-then-correct); create commits on Enter.
 */
export function ProjectSheet({
  open,
  onClose,
  project,
}: {
  open: boolean
  onClose: () => void
  project: Project | null
}) {
  const { create, update, remove } = useProjectMutations()
  const { setLens } = useLens()

  const [name, setName] = useState(project?.name ?? '')
  const [color, setColor] = useState(project?.color ?? randomProjectColor())
  const [hexDraft, setHexDraft] = useState('')

  const pickColor = (hex: string) => {
    setColor(hex)
    if (project) update(project.id, { color: hex })
  }

  const commitName = () => {
    if (project && name.trim() && name.trim() !== project.name) {
      update(project.id, { name })
    }
  }

  const commitCreate = () => {
    if (!name.trim()) return
    const id = create(name, color)
    onClose()
    if (id) setLens(id) // step straight into the new world
  }

  const commitHex = () => {
    const hex = hexDraft.startsWith('#') ? hexDraft : `#${hexDraft}`
    if (isValidHex(hex)) pickColor(hex.toLowerCase())
    setHexDraft('')
  }

  const deleteProject = () => {
    if (!project) return
    onClose()
    setLens(null)
    remove(project.id)
  }

  return (
    <Sheet open={open} onClose={onClose} label={project ? 'Project' : 'New project'}>
      <div className="mt-5 flex flex-col gap-6">
        <input
          autoFocus
          value={name}
          maxLength={NAME_MAX}
          placeholder="Name it…"
          onChange={(e) => setName(e.target.value)}
          onBlur={() => project && commitName()}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            if (project) commitName()
            else commitCreate()
          }}
          className="rounded-xl bg-fill px-4 py-3 font-serif text-lg text-ink outline-none placeholder:text-dim"
        />

        <div className="flex flex-col gap-3">
          <span className="eyebrow text-dim">Color</span>
          <div className="flex items-center gap-3">
            <span
              className="h-5 w-5 rounded-full transition-colors duration-150"
              style={{ backgroundColor: color }}
            />
            {PRESETS.map((hex) => (
              <button
                key={hex}
                onClick={() => pickColor(hex)}
                aria-label={`Use ${hex}`}
                className="h-3.5 w-3.5 rounded-full opacity-70 transition-all duration-150 hover:opacity-100"
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
          <input
            value={hexDraft}
            placeholder="or any hex — #a85f3a"
            onChange={(e) => setHexDraft(e.target.value)}
            onBlur={() => hexDraft && commitHex()}
            onKeyDown={(e) => e.key === 'Enter' && commitHex()}
            className="rounded-xl bg-fill px-4 py-2.5 font-mono text-sm text-ink outline-none placeholder:text-dim"
          />
        </div>

        {project && <Rhythms projectId={project.id} />}

        {project ? (
          <button
            onClick={deleteProject}
            className="self-start text-sm text-bad opacity-80 transition-opacity duration-150 hover:opacity-100"
          >
            Delete project
          </button>
        ) : (
          <button
            onClick={commitCreate}
            className="self-start rounded-xl bg-fill2 px-5 py-2.5 text-sm text-ink transition-colors duration-150"
          >
            Create
          </button>
        )}
      </div>
    </Sheet>
  )
}
