import { create } from 'zustand'

/**
 * The object door (July 24 rulings): margin notes, goals, and cards all
 * open Reflect the same way — the tapped thing is carried in as a QUOTED
 * OBJECT, visibly what it is, and Deb picks it up. Provenance law is
 * absolute: nothing is ever composed in Chris's voice; the server writes
 * no user row for a tap, and only her reply enters the record.
 */
export type DoorKnock = {
  /** what kind of thing this is, for her and the chip: "margin note" · "goal" · "task" */
  label: string
  /** where it was tapped: "the margin · receipt · Jul 24" · "Review · ISO" · "the Line" */
  source: string
  /** the thing itself, verbatim */
  content: string
}

export const useDoor = create<{
  pending: DoorKnock | null
  knock: (k: DoorKnock) => void
  clear: () => void
}>((set) => ({
  pending: null,
  knock: (k) => set({ pending: k }),
  clear: () => set({ pending: null }),
}))
