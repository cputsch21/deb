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

  return (
    <div className="flex h-full items-center justify-center">
      <form onSubmit={submit} className="w-80 space-y-4">
        <h1 className="text-center text-2xl font-light tracking-widest text-ink">
          MyOS
        </h1>
        <input
          type="email"
          required
          autoFocus
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md bg-surface px-3 py-2 text-ink outline-none focus:ring-1 focus:ring-accent"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md bg-surface px-3 py-2 text-ink outline-none focus:ring-1 focus:ring-accent"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-accent px-3 py-2 font-medium text-bg disabled:opacity-50"
        >
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="w-full text-sm text-ink-dim hover:text-ink"
        >
          {mode === 'signin' ? 'First time? Create the account' : 'Back to sign in'}
        </button>
      </form>
    </div>
  )
}
