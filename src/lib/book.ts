import { create } from 'zustand'

/**
 * The book jump (T4 follow-up ruling 1, July 28): a filed object in the
 * thread is a door — tapping it opens Read on that entry's day. The July
 * 29 receipts ruling sharpened the landing: a jump may carry the entry
 * itself, and Read scrolls to that spot for the full surround. This
 * carries the request; ReadRoom consumes and clears it.
 */
export const useBook = create<{
  jump: { day: string; entryId: string | null } | null
  open: (day: string, entryId?: string) => void
  clear: () => void
}>((set) => ({
  jump: null,
  open: (day, entryId) => set({ jump: { day, entryId: entryId ?? null } }),
  clear: () => set({ jump: null }),
}))
