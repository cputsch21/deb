import { extractText, getDocumentProxy } from 'unpdf'
import { capText } from './context.js'

/**
 * The chute's payload pipeline (extracted July 29 so it can be tested):
 * tolerant webhook reading, HTML → text, attachment → text. The July 29
 * ledger diagnosis found Resend's email.received webhook is METADATA
 * ONLY — from/to/subject/attachment names arrive; the body and the
 * attachment bytes do not. The endpoint fetches them from Resend's API
 * as a follow-up step; these helpers stay source-agnostic and keep
 * reading inline text/html when a payload does carry it.
 */

export type Attachment = { filename: string; contentType: string; content: string | null }

export type InboundEmail = {
  /** Resend's id for the received email — the key to the follow-up fetch */
  emailId: string | null
  from: string
  to: string[]
  subject: string | null
  text: string | null
  html: string | null
  messageId: string | null
  date: string | null
  attachments: Attachment[]
}

type Row = Record<string, unknown>

function addr(value: unknown): string {
  // "Name <a@b>" | "a@b" | { email } | { address }
  if (value && typeof value === 'object') {
    const v = value as { email?: unknown; address?: unknown }
    if (typeof v.email === 'string') return v.email.toLowerCase().trim()
    if (typeof v.address === 'string') return v.address.toLowerCase().trim()
  }
  const s = String(value ?? '')
  const m = s.match(/<([^>]+)>/)
  return (m ? m[1] : s).toLowerCase().trim()
}

function firstString(...vals: unknown[]): string | null {
  for (const v of vals) if (typeof v === 'string' && v.trim()) return v
  return null
}

export function readEmail(body: unknown): InboundEmail | null {
  if (!body || typeof body !== 'object') return null
  const data = ((body as Row).data ?? body) as Row
  const from = addr(data.from)
  if (!from) return null
  const toRaw = data.to
  const to = (Array.isArray(toRaw) ? toRaw : [toRaw]).map(addr).filter(Boolean)
  const headers = data.headers as Row | Row[] | undefined
  let messageId = firstString(data.message_id, data.messageId, (data as Row)['message-id'])
  let date: string | null = null
  if (headers && !Array.isArray(headers) && typeof headers === 'object') {
    messageId = messageId ?? firstString(headers['message-id'], headers['Message-Id'], headers['Message-ID'])
    date = firstString(headers.date, headers.Date)
  } else if (Array.isArray(headers)) {
    for (const h of headers) {
      const name = String((h as Row).name ?? '').toLowerCase()
      const value = String((h as Row).value ?? '').trim()
      if (name === 'message-id' && !messageId && value) messageId = value
      if (name === 'date' && !date && value) date = value
    }
  }
  const attachments: Attachment[] = (Array.isArray(data.attachments) ? data.attachments : [])
    .map((a): Attachment => {
      const at = a as Row
      return {
        filename: String(at.filename ?? at.name ?? 'attachment'),
        contentType: String(at.content_type ?? at.contentType ?? at.type ?? '').toLowerCase(),
        content: typeof at.content === 'string' ? at.content : null,
      }
    })
  return {
    emailId: firstString(data.email_id, data.emailId, data.id),
    from,
    to,
    subject: firstString(data.subject),
    text: firstString(data.text),
    html: firstString(data.html),
    messageId: messageId ? capText(messageId, 300) : null,
    date: date ?? firstString(data.created_at, (body as Row).created_at),
    attachments,
  }
}

/* ---------- payload → text ---------- */

const named: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  mdash: '—',
  ndash: '–',
  hellip: '…',
}

export const htmlToText = (html: string): string =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => safeCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => safeCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, name: string) => named[name.toLowerCase()] ?? m)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

function safeCodePoint(code: number): string {
  try {
    return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ' '
  } catch {
    return ' '
  }
}

/** The body, however it shipped: text/plain when present, else text
 *  derived from the HTML part — never couldn't-read while words exist. */
export function bodyToText(text: string | null, html: string | null): string {
  return text?.trim() || (html ? htmlToText(html) : '')
}

/**
 * Attachment → text: text/* and PDFs with a text layer. A stroke-only
 * PDF (reMarkable's default export — drawn ink, no text layer) honestly
 * yields null: there are no words to reach; "convert to text" on the
 * device before sending is the documented path.
 */
export async function attachmentText(a: Attachment): Promise<string | null> {
  if (!a.content) return null
  try {
    const buf = Buffer.from(a.content, 'base64')
    if (a.contentType.startsWith('text/') || /\.(txt|md|csv)$/i.test(a.filename)) {
      return buf.toString('utf8').trim() || null
    }
    if (a.contentType === 'application/pdf' || /\.pdf$/i.test(a.filename)) {
      const pdf = await getDocumentProxy(new Uint8Array(buf))
      const { text } = await extractText(pdf, { mergePages: true })
      return (typeof text === 'string' ? text : String(text ?? '')).trim() || null
    }
  } catch (err) {
    console.error('[ingest] attachment extract', a.filename, err)
  }
  return null // image-only and unknown types: the honest couldn't-read path
}

/** Deterministic cruft-stripping for FORWARDED mail (source 'email' only):
 *  strippers first, model cleanup second, the raw kept verbatim. */
export function stripForwardCruft(text: string): string {
  let t = text
  // forwarding preambles
  t = t.replace(/^-{2,}\s*Forwarded message\s*-{2,}[\s\S]{0,400}?\n\n/im, '')
  t = t.replace(/^Begin forwarded message:[\s\S]{0,400}?\n\n/im, '')
  // signature blocks and phone sign-offs
  t = t.replace(/\n--\s*\n[\s\S]*$/, '\n')
  t = t.replace(/\n(Sent from my [^\n]{0,40}|Get Outlook for [^\n]{0,20})\s*$/i, '\n')
  // quoted reply chains: an "On ... wrote:" tail and deep > quoting
  t = t.replace(/\nOn [^\n]{5,120} wrote:\s*\n(>[^\n]*\n?)+[\s\S]*$/, '\n')
  const lines = t.split('\n')
  const quoted = lines.filter((l) => l.startsWith('>')).length
  if (quoted > 3 && quoted > lines.length * 0.5) {
    t = lines.filter((l) => !l.startsWith('>')).join('\n')
  }
  return t.trim()
}
