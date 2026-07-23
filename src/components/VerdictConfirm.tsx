import * as Dialog from '@radix-ui/react-dialog'

/**
 * The one centered confirm in the whole app — reserved for permanent
 * verdicts (a goal done forever or dropped forever). Everything else
 * is act-then-correct with undo; this is the deliberate exception.
 */
export function VerdictConfirm({
  question,
  detail,
  confirmLabel,
  tone,
  onConfirm,
  onCancel,
}: {
  question: string
  detail: string
  confirmLabel: string
  tone: 'ok' | 'bad'
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Dialog.Root open onOpenChange={(next) => !next && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="verdict-scrim fixed inset-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 w-[min(380px,calc(100vw-48px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-bg p-6"
        >
          <Dialog.Title asChild>
            <p className="font-serif text-lg leading-snug font-medium text-ink">
              {question}
            </p>
          </Dialog.Title>
          <p className="mt-2 text-sm leading-relaxed text-muted">{detail}</p>
          <div className="mt-6 flex items-center justify-end gap-5">
            <button
              onClick={onCancel}
              className="text-sm text-muted transition-colors duration-150 hover:text-ink"
            >
              Not yet
            </button>
            <button
              onClick={onConfirm}
              className={`rounded-xl bg-fill2 px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                tone === 'ok' ? 'text-ok' : 'text-bad'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
