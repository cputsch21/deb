import { create } from 'zustand'

/**
 * The focus bridge (THE PAPER, July 29). The V1 rooms are gone; the
 * store survives because every door in the app speaks its language:
 *   'read'    → the page (no focus)
 *   'reflect' → CONVERSATION focus (the thread at full measure)
 *   'react'   → TRIAGE focus (the card center-stage)
 *   'review'  → the dossier
 * setRoom('reflect') from any door is "open the conversation" — the
 * plumbing carried over whole when the rooms became focus states.
 */
export type Room = 'read' | 'review' | 'react' | 'reflect'

export const useRoom = create<{ room: Room; setRoom: (room: Room) => void }>((set) => ({
  room: 'read', // the Paper opens on the page
  setRoom: (room) => set({ room }),
}))
