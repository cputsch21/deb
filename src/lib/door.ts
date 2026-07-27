import { create } from 'zustand'

/**
 * The margin door (T6, reworked under the provenance redline, July 24):
 * tapping one of Deb's margin notes opens Reflect with the note carried in
 * as a QUOTED OBJECT — visibly hers, brought from the margin — and she
 * picks it up and says more. Nothing is ever composed in Chris's voice:
 * the permanent record only holds words he actually wrote or said.
 */
export type MarginKnock = { content: string; noteKind: string; day: string }

export const useDoor = create<{
  pending: MarginKnock | null
  knock: (note: MarginKnock) => void
  clear: () => void
}>((set) => ({
  pending: null,
  knock: (note) => set({ pending: note }),
  clear: () => set({ pending: null }),
}))
