import { useState } from 'react'
import { Sheet } from './Sheet'
import { useFacts, useFactMutations } from '../db/queries/facts'
import { FACT_MAX, type KnownFact } from '../db/types'

/**
 * The memory room — the visible half of memory. Everything Deb knows, nothing
 * hidden: read it, edit it, forget it (always with undo). Opens from the quiet
 * "memory" whisper. Source is labeled honestly — what she inherited from TRUE
 * says so.
 */
export function MemorySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: facts = [] } = useFacts()
  const { remember } = useFactMutations()
  const [draft, setDraft] = useState('')

  const add = () => {
    const text = draft.trim()
    if (!text) return
    remember(text, 'chris')
    setDraft('')
  }

  return (
    <Sheet open={open} onClose={onClose} label="Memory">
      <h2 className="mt-2 font-serif text-xl font-medium text-ink">What Deb knows</h2>
      <p className="mt-1 text-[13px] text-muted">
        Nothing hidden. Edit or forget any of it — she&rsquo;ll follow.
      </p>

      <div className="mt-5 rounded-xl bg-fill px-4 py-3">
        <input
          value={draft}
          maxLength={FACT_MAX}
          placeholder="Teach Deb something…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          className="w-full bg-transparent text-[13.5px] text-ink outline-none placeholder:text-dim"
        />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {facts.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-dim">
            Nothing yet — an empty memory is the honest place to start.
          </p>
        ) : (
          facts.map((f) => <FactRow key={f.id} fact={f} />)
        )}
      </div>
    </Sheet>
  )
}

function FactRow({ fact }: { fact: KnownFact }) {
  const { edit, forget } = useFactMutations()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(fact.content)

  const commit = () => {
    setEditing(false)
    const next = value.trim()
    if (next && next !== fact.content) edit(fact.id, next)
    else setValue(fact.content)
  }

  return (
    <div className="flex items-start gap-3 rounded-xl bg-fill px-4 py-3">
      {editing ? (
        <input
          autoFocus
          value={value}
          maxLength={FACT_MAX}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') {
              setValue(fact.content)
              setEditing(false)
            }
          }}
          className="flex-1 bg-transparent text-[13px] leading-relaxed text-ink outline-none"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          title="Edit"
          className="flex-1 text-left text-[13px] leading-relaxed text-ink"
        >
          {fact.content}
        </button>
      )}
      <span className="mt-0.5 font-mono text-[0.58rem] tracking-wide text-dim uppercase">
        {fact.source === 'seed' ? 'inherited' : fact.source}
      </span>
      <button
        onClick={() => forget(fact.id)}
        title="Forget this"
        aria-label="Forget this"
        className="mt-0.5 text-xs text-dim transition-colors hover:text-bad"
      >
        ✕
      </button>
    </div>
  )
}
