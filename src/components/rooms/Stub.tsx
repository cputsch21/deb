/**
 * A room that isn't built yet — not bare, but calm. Its whisper and one
 * line in the product voice, so an empty room still feels like Deb's.
 */
export function Stub({ eyebrow, line }: { eyebrow: string; line: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
      <span className="eyebrow text-dim">{eyebrow}</span>
      <p className="font-serif text-lg text-muted">{line}</p>
    </div>
  )
}
