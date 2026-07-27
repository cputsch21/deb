import { create } from 'zustand'

/**
 * The margin door (T6): tapping one of Deb's margin notes opens Reflect
 * mid-conversation with that exact thing on the table. The tap authors the
 * line (a deliberate act, act-then-correct); Reflect consumes the pending
 * text on arrival and sends it as Chris's turn.
 */
export const useDoor = create<{
  pending: string | null
  knock: (text: string) => void
  clear: () => void
}>((set) => ({
  pending: null,
  knock: (text) => set({ pending: text }),
  clear: () => set({ pending: null }),
}))
