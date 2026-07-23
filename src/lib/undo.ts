import { create } from 'zustand'

/**
 * The transient pill — the app's one ephemeral voice for writes.
 * kind 'undo': a delete happened; one tap brings it back.
 * kind 'notice': a background save failed and was rolled back.
 * Only one pill lives at a time; the newest wins.
 */
export type Pill =
  | { id: number; kind: 'undo'; label: string; undo: () => void }
  | { id: number; kind: 'notice'; label: string }

const LINGER_MS = { undo: 6000, notice: 4000 }

let nextId = 1

type PillInput =
  | { kind: 'undo'; label: string; undo: () => void }
  | { kind: 'notice'; label: string }

type PillState = {
  pill: Pill | null
  show: (pill: PillInput) => void
  dismiss: () => void
}

export const usePill = create<PillState>((set, get) => ({
  pill: null,
  show: (pill) => {
    const id = nextId++
    set({ pill: { ...pill, id } })
    setTimeout(() => {
      if (get().pill?.id === id) set({ pill: null })
    }, LINGER_MS[pill.kind])
  },
  dismiss: () => set({ pill: null }),
}))

/** Callable from anywhere, including outside React. */
export const transient = {
  undo: (label: string, undo: () => void) =>
    usePill.getState().show({ kind: 'undo', label, undo }),
  notice: (label: string) => usePill.getState().show({ kind: 'notice', label }),
}
