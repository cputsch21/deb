import { create } from 'zustand'

/**
 * Which task's modal is open (X1 Phase F). A store rather than local
 * state because the rows that open it live three components down from the
 * focus layer that renders it — the same shape as `useDoor` and `useBook`,
 * not a new pattern.
 */
export const useOpenTask = create<{
  taskId: string | null
  open: (id: string) => void
  close: () => void
}>((set) => ({
  taskId: null,
  open: (id) => set({ taskId: id }),
  close: () => set({ taskId: null }),
}))
