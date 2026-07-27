import { supabase } from './supabase'

/**
 * The bridge to /api/chat (Seam: Deb's voice). Streams her turn as
 * newline-delimited JSON. The server has already persisted the user's line
 * and buffers the [[SILENT]] choice, so the client sees a `delta` only once
 * she has decided to speak; her reply is persisted server-side and reported
 * on `done`. A broken stream ends without `done` — the caller shows the
 * honest error line, never a half-saved message.
 */
export type DebEvent =
  | { type: 'delta'; text: string }
  | { type: 'action'; kind: 'task_created'; id: string; title: string }
  | { type: 'action'; kind: 'fact_remembered'; id: string; content: string }
  | { type: 'action'; kind: 'mission_set'; id: string; name: string; mission: string }
  | {
      type: 'action'
      kind: 'entry_filed'
      id: string
      worldName: string | null
      taskIds: string[]
    }
  | { type: 'done'; id: string; content: string; saved: boolean }
  | { type: 'silent' }
  | { type: 'error'; message: string }

const CANT_ANSWER = 'Deb could not answer just now.'

/**
 * What a turn can be (provenance law, July 24): a TEXT turn is words Chris
 * actually wrote; a MARGIN turn is a tap on one of Deb's own notes — no
 * words are synthesized in his voice, ever. The server frames the tap for
 * her and persists only HER reply.
 */
export type DebInput =
  | { kind: 'text'; content: string; pasted: boolean }
  | { kind: 'margin'; note: { content: string; noteKind: string; day: string } }

export async function streamDeb(
  input: DebInput,
  projectId: string | null,
  onEvent: (event: DebEvent) => void,
): Promise<void> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) {
    onEvent({ type: 'error', message: 'Signed out — sign in again.' })
    return
  }
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

  let res: Response
  try {
    res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(
        input.kind === 'text'
          ? { content: input.content, pasted: input.pasted, projectId, tz }
          : {
              marginNote: {
                content: input.note.content,
                kind: input.note.noteKind,
                day: input.note.day,
              },
              projectId,
              tz,
            },
      ),
    })
  } catch {
    onEvent({ type: 'error', message: CANT_ANSWER })
    return
  }
  if (!res.ok || !res.body) {
    onEvent({ type: 'error', message: CANT_ANSWER })
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      let nl: number
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim()
        buf = buf.slice(nl + 1)
        if (!line) continue
        try {
          onEvent(JSON.parse(line) as DebEvent)
        } catch {
          // a partial line — wait for the rest
        }
      }
    }
  } catch {
    onEvent({ type: 'error', message: CANT_ANSWER })
  }
}
