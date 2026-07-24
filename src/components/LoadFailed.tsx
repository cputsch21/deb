/**
 * The honest failure state (law, July 24 2026 — the empty-board incident):
 * a failed load must NEVER render as an empty board. Empty says "your life
 * is gone," and that's a silent lie. Name what didn't load, say the record
 * is safe, offer retry. Errors are never silent.
 */
export function LoadFailed({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
      <span className="eyebrow text-bad">didn&rsquo;t load</span>
      <p className="max-w-sm font-serif text-lg text-muted">
        {what} couldn&rsquo;t be loaded. Nothing is lost — this screen just
        can&rsquo;t see the record right now.
      </p>
      <button
        onClick={onRetry}
        className="rounded-xl bg-fill2 px-4 py-2 text-sm text-ink transition-colors duration-150 hover:bg-fill"
      >
        Try again
      </button>
    </div>
  )
}
