import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function AuthScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    setBusy(false)
  }

  // Warm Glass: tonal wells, no borders, no rings — the caret is the focus state.
  const well =
    'w-full rounded-xl bg-fill px-4 py-3.5 text-ink placeholder:text-dim outline-none'

  return (
    <div className="flex h-full items-center justify-center px-7">
      <form onSubmit={submit} className="w-full max-w-xs space-y-4">
        <div className="pb-4 text-center">
          <div className="eyebrow text-dim">Your operating system</div>
          <h1 className="font-serif text-4xl font-medium tracking-tight text-ink">
            Deb
          </h1>
        </div>
        <input
          type="email"
          required
          autoFocus
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={well}
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={well}
        />
        {error && <p className="text-sm text-bad">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-accent px-4 py-3 font-medium text-bg disabled:opacity-40 dark:text-bg"
        >
          {mode === 'signin' ? 'Sign in' : 'Create the account'}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="w-full text-sm text-dim transition-colors hover:text-ink"
        >
          {mode === 'signin' ? 'First time? Create the account' : 'Back to sign in'}
        </button>
      </form>
    </div>
  )
}
