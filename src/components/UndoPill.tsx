import { usePill } from '../lib/undo'

/**
 * The transient pill: "X deleted · Undo" after any delete, or a quiet
 * notice when a background save failed and was rolled back. The only
 * safety net — never a confirm dialog.
 */
export function UndoPill() {
  const pill = usePill((s) => s.pill)
  const dismiss = usePill((s) => s.dismiss)
  if (!pill) return null

  return (
    <div
      key={pill.id}
      className="pill fixed bottom-6 left-1/2 z-50 flex items-center gap-4 rounded-full bg-fill2 px-5 py-2.5 text-sm text-ink backdrop-blur-sm"
    >
      <span>{pill.label}</span>
      {pill.kind === 'undo' && (
        <button
          onClick={() => {
            pill.undo()
            dismiss()
          }}
          className="eyebrow text-accent"
        >
          Undo
        </button>
      )}
    </div>
  )
}
