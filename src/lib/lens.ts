import { create } from 'zustand'

/**
 * The active lens: null = the Mentor's world (home, silver),
 * otherwise a project id — same mind, narrowed focus.
 */
export const useLens = create<{
  lens: string | null
  setLens: (lens: string | null) => void
}>((set) => ({
  lens: null,
  setLens: (lens) => set({ lens }),
}))
