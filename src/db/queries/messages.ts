import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Message } from '../types'

/**
 * The thread read — the thread ruling (July 28): display scopes by WHERE
 * WORDS WERE SPOKEN. Silver shows only whole-life dialogue; a world shows
 * only the exchanges spoken in that lens. No interleaving in either
 * direction; no message ever migrates on content. Storage is untouched —
 * one table, one history, one mind: the server's context always loads the
 * full thread, so her knowledge never narrows with the view.
 */
export const messageKeys = {
  all: ['messages'] as const,
  list: (lens: string | null) => ['messages', lens ?? 'home'] as const,
}

async function fetchMessages(lens: string | null): Promise<Message[]> {
  let q = supabase
    .from('messages')
    .select('id, project_id, role, content, created_at')
    .order('created_at')
  q = lens === null ? q.is('project_id', null) : q.eq('project_id', lens)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as Message[]
}

export function useMessages(lens: string | null) {
  return useQuery({ queryKey: messageKeys.list(lens), queryFn: () => fetchMessages(lens) })
}

/** Her canonical first words — the blank-start text (docs/deb-soul.md;
 *  DECISIONS July 24: no inheritance, ever). Must match the T6 SQL plant. */
const FIRST_MESSAGE = `We're starting from nothing — no history, no files, no assumptions. I'd rather earn what I know than inherit it.

Everything from here goes in the record: what you tell me, what you promise, what actually happens. Give it a few weeks and I'll have receipts.

So — what matters most right now?`

let plantAttempted = false

/**
 * The day-one plant, programmatic (T4 ruling 12): a brand-new account's
 * thread begins with her first message — code, not a hand-run script.
 * Idempotent: only when the thread holds nothing at all; one attempt per
 * session. Chris's account already carries it from the T6 SQL, so this is
 * a no-op there. Resolves true only when a plant actually landed.
 */
export async function plantFirstMessage(): Promise<boolean> {
  if (plantAttempted) return false
  plantAttempted = true
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
  if (error || count === null || count > 0) return false
  const { error: insertError } = await supabase
    .from('messages')
    .insert({ role: 'deb', content: FIRST_MESSAGE, project_id: null })
  return !insertError
}
