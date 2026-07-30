import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { entryKeys, useEntryMutations } from '../../db/queries/entries'
import { taskKeys, useTaskMutations } from '../../db/queries/tasks'
import { briefKey } from '../../lib/brief'
import { supabase } from '../../lib/supabase'
import { transient } from '../../lib/undo'
import { RAW_MAX } from '../../db/types'

/**
 * THE PAGE SLOT (July 29 channel-law triptych: the composer converses ·
 * email files · the page slot files). A one-line, near-invisible well in
 * the record column's furniture: paste or type, ⌘Enter files it through
 * the standard engine with quiet-channel semantics — no conversational
 * engagement, ever. The entry materializing under TAKEN DOWN is the
 * receipt; the standard undo pill is the take-back.
 *
 * LAW: the slot never grows buttons, attachments UI, or options. It is
 * a slot, not an import screen — the moment it wants chrome, it is
 * violating the one-door spirit and gets cut back.
 */
export function PageSlot({ lens }: { lens: string | null }) {
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const qc = useQueryClient()
  const { hide, revertVersion } = useEntryMutations()
  const { remove: removeTask } = useTaskMutations()

  const file = async () => {
    const raw = text.trim()
    if (!raw || busy) return
    setBusy(true)
    setFailed(false)
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) throw new Error('no session')
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      const res = await fetch('/api/file', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: raw, lens, tz }),
      })
      if (!res.ok) throw new Error(`file ${res.status}`)
      const filing = (await res.json()) as {
        entryId: string
        worldName: string | null
        taskIds: string[]
        versioned: {
          prevRawId: string
          prevDistillate: string | null
          newNoteIds: string[]
          oldNoteIds: string[]
        } | null
      }

      // the materialization is the receipt
      void qc.invalidateQueries({ queryKey: entryKeys.pages })
      void qc.invalidateQueries({ queryKey: entryKeys.meta })
      void qc.invalidateQueries({ queryKey: entryKeys.notes })
      void qc.invalidateQueries({ queryKey: taskKeys.all })
      void qc.invalidateQueries({ queryKey: briefKey })
      void qc.invalidateQueries({ queryKey: ['arrivals'] })

      // the standard undo pill — the whole filing comes back out
      const v = filing.versioned
      if (v) {
        transient.undo(`Grew today's page`, () => {
          void revertVersion({
            entryId: filing.entryId,
            prevRawId: v.prevRawId,
            prevDistillate: v.prevDistillate,
            newNoteIds: v.newNoteIds,
            oldNoteIds: v.oldNoteIds,
          })
          for (const tid of filing.taskIds) removeTask(tid, false)
        })
      } else {
        transient.undo(
          `Filed${filing.worldName ? ` → ${filing.worldName}` : ''} · ${raw.slice(0, 28)}`,
          () => {
            void hide(filing.entryId)
            for (const tid of filing.taskIds) removeTask(tid, false)
          },
        )
      }
      setText('')
    } catch (err) {
      console.error('[page slot]', err)
      setFailed(true) // his words stay in the slot — never lost
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-5">
      <textarea
        value={text}
        rows={focused || text ? 4 : 1}
        maxLength={RAW_MAX}
        disabled={busy}
        placeholder="Drop a note onto the page…"
        aria-label="Drop a note onto the page"
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            void file()
          }
        }}
        className={`w-full resize-none rounded-xl px-3.5 py-2.5 text-[14px] leading-[1.6] text-ink transition-[background-color,height] duration-150 outline-none placeholder:text-dim ${
          focused || text ? 'bg-fill' : 'bg-fill/50 hover:bg-fill'
        } ${busy ? 'opacity-60' : ''}`}
      />
      {busy && <span className="eyebrow block px-1 pt-1 text-[0.55rem] text-dim">filing…</span>}
      {failed && !busy && (
        <p className="px-1 pt-1 text-[12.5px] text-muted">
          That couldn&rsquo;t be filed — nothing was lost.{' '}
          <button onClick={() => void file()} className="underline underline-offset-2">
            try again
          </button>
        </p>
      )}
      {(focused || text) && !busy && !failed && (
        <span className="eyebrow block px-1 pt-1 text-[0.55rem] text-dim">⌘↵ files it</span>
      )}
    </div>
  )
}
