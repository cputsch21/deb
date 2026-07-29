import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { extractText, getDocumentProxy } from 'unpdf'
import { generateBrief } from './_lib/brief.js'
import { capText, RAW_MAX } from './_lib/context.js'
import { insertEntry, logArrival, performFiling } from './_lib/filing.js'

/**
 * /api/ingest-email — the second mouth, feeding the same throat (chute
 * rulings, July 28). Resend inbound webhook → defense in depth → the
 * shared filing engine. Channel semantics: file, chip at silver, silence.
 *
 * ── THE SERVICE-ROLE INVARIANT (DECISIONS, July 28) ─────────────────
 * SUPABASE_SERVICE_ROLE_KEY is read in THIS FILE and nowhere else in the
 * codebase. It exists because inbound mail carries no user JWT. Under it,
 * RLS guards nothing: every read and write goes through the filing
 * engine's explicit owner scoping. Never import this key elsewhere;
 * never add a write here outside performFiling/insertEntry/generateBrief
 * and the engine's own Arrivals ledger (logArrival).
 * ────────────────────────────────────────────────────────────────────
 *
 * Defense in depth, all layers required (fail any → dropped and logged,
 * never processed, never bounced — a bounce confirms the address exists):
 *   1. Svix webhook signature (unsigned/invalid → 401; genuine Resend
 *      traffic always passes, so retries never hammer a reject)
 *   2. recipient must be the unguessable INGEST_ADDRESS
 *   3. sender must be on the INGEST_ALLOWED_SENDERS allowlist
 * Then Message-ID idempotency (DB-enforced), payload → text, and the one
 * filing path. Everything arriving is content to read, never instructions
 * to obey — the engine gets the hardened email framing.
 */

const SIGNATURE_TOLERANCE_S = 5 * 60

const ok = (body: unknown = { received: true }) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

/* ---------- layer 1: the Svix signature ---------- */

function verifySignature(payload: string, headers: Headers, secret: string): boolean {
  try {
    const id = headers.get('svix-id') ?? ''
    const timestamp = headers.get('svix-timestamp') ?? ''
    const signatures = headers.get('svix-signature') ?? ''
    if (!id || !timestamp || !signatures) return false
    const ts = Number(timestamp)
    if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > SIGNATURE_TOLERANCE_S) {
      return false
    }
    const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
    const expected = createHmac('sha256', key)
      .update(`${id}.${timestamp}.${payload}`)
      .digest('base64')
    const expectedBuf = Buffer.from(expected)
    for (const part of signatures.split(' ')) {
      const sig = part.includes(',') ? part.slice(part.indexOf(',') + 1) : part
      const sigBuf = Buffer.from(sig)
      if (sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf)) {
        return true
      }
    }
    return false
  } catch {
    return false
  }
}

/* ---------- tolerant payload reading ---------- */

type Attachment = { filename: string; contentType: string; content: string | null }

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

function readEmail(body: unknown): {
  from: string
  to: string[]
  subject: string | null
  text: string | null
  html: string | null
  messageId: string | null
  date: string | null
  attachments: Attachment[]
} | null {
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

type Row = Record<string, unknown>

/* ---------- payload → text ---------- */

const htmlToText = (html: string): string =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

async function attachmentText(a: Attachment): Promise<string | null> {
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
function stripForwardCruft(text: string): string {
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

/* ---------- owner resolution (nothing hardcoded) ---------- */

let cachedOwnerId: string | null = null

async function resolveOwner(db: SupabaseClient, email: string): Promise<string | null> {
  if (cachedOwnerId) return cachedOwnerId
  try {
    const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 200 })
    if (error) throw error
    const hit = data.users.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase())
    cachedOwnerId = hit?.id ?? null
    return cachedOwnerId
  } catch (err) {
    console.error('[ingest] owner lookup', err)
    return null
  }
}

/* ---------- the endpoint ---------- */

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  const address = (process.env.INGEST_ADDRESS ?? '').toLowerCase().trim()
  const allowed = (process.env.INGEST_ALLOWED_SENDERS ?? '')
    .split(',')
    .map((s) => s.toLowerCase().trim())
    .filter(Boolean)
  const ownerEmail = process.env.INGEST_OWNER_EMAIL ?? ''
  const tz = process.env.INGEST_TZ || 'UTC'
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // THE ONLY READ OF THIS KEY

  if (!secret || !address || !allowed.length || !ownerEmail || !url || !serviceKey) {
    console.error('[ingest] misconfigured — missing env; dropping')
    return ok() // never reveal configuration state to a caller
  }

  const payload = await request.text()

  // the client and owner come first so every drop below can leave its row
  // in the Arrivals ledger (metadata only, never body content)
  const db = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: class NoWebSocket {} as never },
  })
  const ownerId = await resolveOwner(db, ownerEmail)
  const ledger = (row: {
    outcome: string
    sender?: string | null
    summary?: string | null
    entryId?: string | null
    source?: 'email' | 'plaud' | 'remarkable'
  }) =>
    ownerId
      ? logArrival(db, { source: row.source ?? 'email', ...row, ownerId })
      : Promise.resolve()

  // layer 1 — signature: unsigned/invalid rejected outright; the ledger
  // records the bare fact alone (nothing unsigned earns a parse)
  if (!verifySignature(payload, request.headers, secret)) {
    console.error('[ingest] DROP: bad or missing signature')
    await ledger({ outcome: 'dropped_signature' })
    return new Response('invalid signature', { status: 401 })
  }

  let email: ReturnType<typeof readEmail> = null
  try {
    email = readEmail(JSON.parse(payload))
  } catch {
    email = null
  }
  if (!email) {
    console.error('[ingest] DROP: unreadable payload shape')
    await ledger({ outcome: 'dropped_shape' })
    return ok()
  }

  // layer 2 — the unguessable address must be the recipient
  if (!email.to.includes(address)) {
    console.error('[ingest] DROP: recipient mismatch', email.to.join(','))
    await ledger({ outcome: 'dropped_recipient', sender: email.from, summary: email.subject })
    return ok()
  }

  // layer 3 — the hard sender allowlist: the rejecting address shown
  if (!allowed.includes(email.from)) {
    console.error('[ingest] DROP: sender not allowed', email.from)
    await ledger({ outcome: 'dropped_sender', sender: email.from, summary: email.subject })
    return ok()
  }

  if (!ownerId) {
    console.error('[ingest] DROP: owner could not be resolved')
    return ok()
  }

  // sender-mapped source (E1 resolution): provenance labels win
  const plaudSender = (process.env.INGEST_PLAUD_SENDER ?? '').toLowerCase().trim()
  const remarkableSender = (process.env.INGEST_REMARKABLE_SENDER ?? '').toLowerCase().trim()
  const source =
    plaudSender && email.from === plaudSender
      ? ('plaud' as const)
      : remarkableSender && email.from === remarkableSender
        ? ('remarkable' as const)
        : ('email' as const)

  try {
    // idempotency — the same email arriving twice files once
    if (email.messageId) {
      const { data: dupe } = await db
        .from('entries')
        .select('id')
        .eq('user_id', ownerId)
        .eq('message_id', email.messageId)
        .limit(1)
      if (dupe && dupe.length > 0) {
        await ledger({
          outcome: 'duplicate',
          source,
          sender: email.from,
          summary: email.subject,
          entryId: String(dupe[0].id),
        })
        return ok({ received: true, duplicate: true })
      }
    }

    // payload → text: body, text/pdf attachments — easy always, zero conventions
    const parts: string[] = []
    const bodyText = email.text?.trim() || (email.html ? htmlToText(email.html) : '')
    if (bodyText) parts.push(bodyText)
    const manifest: { name: string; type: string; text: boolean }[] = []
    for (const a of email.attachments) {
      const t = await attachmentText(a)
      manifest.push({ name: a.filename, type: a.contentType || 'unknown', text: t !== null })
      if (t) parts.push(t)
    }

    const sourceMeta = {
      channel: 'email',
      from: capText(email.from, 200),
      subject: email.subject ? capText(email.subject, 300) : undefined,
      date: email.date ? capText(email.date, 60) : undefined,
      attachments: manifest.length ? manifest : undefined,
      unreadable: parts.length === 0 || undefined,
    }

    if (parts.length === 0) {
      // the honest couldn't-read state: the raw records what arrived —
      // faithfully, marked as a manifest — never a silent drop
      const manifestText = [
        `From: ${email.from}`,
        email.subject ? `Subject: ${email.subject}` : null,
        email.date ? `Date: ${email.date}` : null,
        manifest.length
          ? `Attachments (no readable text): ${manifest.map((m) => m.name).join(', ')}`
          : 'No readable text arrived.',
      ]
        .filter(Boolean)
        .join('\n')
      const { entryId } = await insertEntry(db, {
        raw: manifestText,
        projectId: null,
        spokenIn: null,
        worldName: null,
        distillate: null,
        tz,
        source,
        messageId: email.messageId,
        sourceMeta,
        ownerId,
      })
      await ledger({
        outcome: 'unreadable',
        source,
        sender: email.from,
        summary: email.subject,
        entryId,
      })
      return ok({ received: true, unreadable: true })
    }

    const raw = capText(parts.join('\n\n'), RAW_MAX)
    const distillInput = source === 'email' ? stripForwardCruft(raw) || raw : raw

    const filing = await performFiling(db, raw, tz, {
      spokenIn: null, // the quiet channel speaks at silver
      source,
      sourceMeta,
      messageId: email.messageId,
      subject: email.subject,
      channel: 'email',
      ownerId,
      distillInput,
    })

    // the pin stays honest; the channel stays quiet (approved call 5)
    try {
      await generateBrief(db, new Anthropic(), tz, filing.todayWords, ownerId)
    } catch (err) {
      console.error('[ingest] brief refresh', err)
    }

    return ok({ received: true, entryId: filing.entryId })
  } catch (err) {
    // a unique-index collision is the idempotency backstop, not a failure
    const code = (err as { code?: string })?.code
    if (code === '23505' || String(err).includes('23505')) {
      await ledger({ outcome: 'duplicate', source, sender: email.from, summary: email.subject })
      return ok({ received: true, duplicate: true })
    }
    console.error('[ingest] filing failed', err)
    await ledger({ outcome: 'failed', source, sender: email.from, summary: email.subject })
    return ok() // never bounce, never retry-storm; the log is the record
  }
}
