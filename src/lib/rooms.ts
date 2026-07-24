import { create } from 'zustand'

/**
 * The four rooms (top nav). One spine under all four; Reflect is the default —
 * the thread with Deb is where the app opens.
 */
export type Room = 'read' | 'review' | 'react' | 'reflect'

export const ROOMS: { id: Room; label: string }[] = [
  { id: 'read', label: 'Read' },
  { id: 'review', label: 'Review' },
  { id: 'react', label: 'React' },
  { id: 'reflect', label: 'Reflect' },
]

export const useRoom = create<{ room: Room; setRoom: (room: Room) => void }>((set) => ({
  room: 'reflect',
  setRoom: (room) => set({ room }),
}))
