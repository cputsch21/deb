import { useRef, useState, type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'

/**
 * The right-side sheet — where every record opens. Never a centered modal
 * (the lone exception, the verdict confirm, has its own component).
 * Motion law: 200ms enter, instant exit. Its soft shadow is the one
 * floating edge allowed in the app. Flush right with the 22px rounded
 * left edge, per the prototype's polish pass (T4 ruling 6).
 *
 * Mobile exits (July 28 ruling — no surface may lack one): a drag handle
 * that dismisses on drag-down, and an explicit mono CLOSE, ≥44px,
 * safe-area-cleared. Ownership by touch-start (standing law): only a
 * touch born on the handle drags the sheet — the content's own scroll
 * never fights it.
 */
export function Sheet({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean
  onClose: () => void
  label: string
  children: ReactNode
}) {
  const startY = useRef<number | null>(null)
  const [dy, setDy] = useState(0)

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0" />
        <Dialog.Content
          className="sheet fixed inset-y-0 right-0 w-[min(420px,calc(100vw-24px))] overflow-y-auto rounded-l-[22px] pt-[env(safe-area-inset-top)] md:pt-0"
          style={dy > 0 ? { transform: `translateY(${dy}px)`, animation: 'none' } : undefined}
          aria-describedby={undefined}
        >
          {/* the drag handle — the only element that owns a sheet drag */}
          <div
            className="flex min-h-8 items-end justify-center pb-1 md:hidden"
            onTouchStart={(e) => {
              startY.current = e.touches[0].clientY
            }}
            onTouchMove={(e) => {
              if (startY.current === null) return
              setDy(Math.max(0, e.touches[0].clientY - startY.current))
            }}
            onTouchEnd={() => {
              const flicked = dy > 60
              startY.current = null
              setDy(0)
              if (flicked) onClose() // instant, per the motion law
            }}
          >
            <div className="h-1 w-10 rounded-full bg-fill2" />
          </div>

          {/* the explicit way out — mono, ≥44px, clear of the notch */}
          <button
            onClick={onClose}
            className="eyebrow absolute top-[max(0.25rem,env(safe-area-inset-top))] right-2 z-10 flex min-h-11 items-center px-4 text-dim transition-colors active:text-ink md:hidden"
          >
            close
          </button>

          <Dialog.Title asChild>
            <div className="eyebrow px-6 pt-1 text-dim md:pt-6">{label}</div>
          </Dialog.Title>
          <div className="px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
