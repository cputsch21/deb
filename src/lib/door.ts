import { create } from 'zustand'

/**
 * The door into Reflect (T6, generalized under the T4 rulings, July 27):
 * tapping a margin note — or carrying a goal from a dossier or a task from
 * a card — opens Reflect with the thing on the table as a QUOTED OBJECT,
 * session-ephemeral, and Deb picks it up. Provenance law is absolute:
 * nothing is ever composed in Chris's voice; the permanent record only
 * holds words he actually wrote or said. The tap writes NO user row.
 */
export type MarginKnock = { type: 'margin'; content: string; noteKind: string; day: string }

/** A goal or task carried onto the table. `from` names where it was picked
 *  up ("the dossier", "the stack", "the Line"); `state` is its honest
 *  status line, already worded for reading. */
export type ObjectKnock = {
  type: 'object'
  object: 'goal' | 'task'
  content: string // its title — the quoted words
  from: string
  world: string | null
  state: string
}

export type Knock = MarginKnock | ObjectKnock

export const useDoor = create<{
  pending: Knock | null
  knock: (note: Knock) => void
  clear: () => void
}>((set) => ({
  pending: null,
  knock: (note) => set({ pending: note }),
  clear: () => set({ pending: null }),
}))
