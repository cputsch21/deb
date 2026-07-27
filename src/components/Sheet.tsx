import type { ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'

/**
 * The right-side sheet — where every record opens. Never a centered modal
 * (the lone exception, the verdict confirm, has its own component).
 * Motion law: 200ms enter, instant exit. Its soft shadow is the one
 * floating edge allowed in the app. Flush right with the 22px rounded
 * left edge, per the prototype's polish pass (T4 ruling 6).
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
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0" />
        <Dialog.Content
          className="sheet fixed inset-y-0 right-0 w-[min(420px,calc(100vw-24px))] overflow-y-auto rounded-l-[22px]"
          aria-describedby={undefined}
        >
          <Dialog.Title asChild>
            <div className="eyebrow px-6 pt-6 text-dim">{label}</div>
          </Dialog.Title>
          <div className="px-6 pb-6">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
