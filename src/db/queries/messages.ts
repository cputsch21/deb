import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Message } from '../types'

/**
 * The thread read. The rail scopes the VIEW, never Deb's mind: home (lens
 * null) shows the whole life; a world shows only the lines said in it —
 * "same mind, narrowed." The server's context always loads the full thread.
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
  if (lens !== null) q = q.eq('project_id', lens)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as Message[]
}

export function useMessages(lens: string | null) {
  return useQuery({ queryKey: messageKeys.list(lens), queryFn: () => fetchMessages(lens) })
}
