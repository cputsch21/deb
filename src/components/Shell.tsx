import { supabase } from '../lib/supabase'
import { UndoPill } from './UndoPill'

/** The app shell. Milestone 0: proves auth + deploy, wearing the Warm Glass. */
export function Shell({ email }: { email: string }) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="relative flex h-full flex-col">
      <header className="flex items-center justify-between px-7 py-5">
        <span className="eyebrow text-dim">Deb</span>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-sm text-dim transition-colors hover:text-ink"
        >
          sign out
        </button>
      </header>

      {/* the margin date — the notepad's edge */}
      <div className="absolute top-14 right-7 text-right">
        <div className="font-serif text-base font-medium text-ink">{today}</div>
      </div>

      <main className="flex flex-1 flex-col items-center justify-center px-7 text-center">
        <p className="max-w-md font-serif text-2xl leading-snug font-medium text-ink">
          The skeleton lives.
        </p>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
          Auth, deploy, and the Warm Glass are real. Next: your worlds.
        </p>
        <p className="eyebrow mt-8 text-dim">Milestone 0 · {email}</p>
      </main>

      <UndoPill />
    </div>
  )
}
