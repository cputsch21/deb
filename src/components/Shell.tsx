import { supabase } from '../lib/supabase'

/** The app shell. Milestone 0: proves auth + deploy. Milestone 1 fills it in. */
export function Shell({ email }: { email: string }) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="text-sm font-light tracking-widest text-ink-dim">
          MyOS
        </span>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-sm text-ink-dim hover:text-ink"
        >
          {email} · sign out
        </button>
      </header>
      <main className="flex flex-1 items-center justify-center">
        <p className="text-ink-dim">
          Milestone 0 complete — the walking skeleton lives.
        </p>
      </main>
    </div>
  )
}
