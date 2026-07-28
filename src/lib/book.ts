import { create } from 'zustand'

/**
 * The book jump (T4 follow-up ruling 1, July 28): a filed object in the
 * thread is a door — tapping it opens Read on that entry's day. This
 * carries the requested page; ReadRoom consumes and clears it.
 */
export const useBook = create<{
  jump: string | null // an entry_day (yyyy-mm-dd)
  open: (day: string) => void
  clear: () => void
}>((set) => ({
  jump: null,
  open: (day) => set({ jump: day }),
  clear: () => set({ jump: null }),
}))
