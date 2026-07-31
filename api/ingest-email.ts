import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { Resend } from 'resend'
import { generateBrief } from './_lib/brief.js'
import { capText, RAW_MAX } from './_lib/context.js'
import { insertEntry, logArrival, performFiling } from './_lib/filing.js'
import {
  attachmentText,
  bodyToText,
  readEmail,
  stripForwardCruft,
  type Attachment,
} from './_lib/email.js'

/**
 * /api/ingest-email — the second mouth, feeding the same throat (chute
 * rulings, July 28). Resend inbound webhook → defense in depth → the
 * shared filing engine. Channel semantics: file, chip at silver, silence.
 *
 * THE TWO-STEP READ (July 29 ledger diagnosis): Resend's email.received
 * webhook is METADATA ONLY — from/to/subject and attachment names ship
 * in the event; the body and attachment bytes do not. After the gates,
 * the endpoint fetches the full content from Resend's API (RESEND_API_KEY,
 * retried). If that fetch fails while the payload carried no inline body,
 * the endpoint answers 500 so Resend redelivers — Message-ID idempotency
 * makes the retry safe, and the ledger records each failed attempt.
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
 * Then the content fetch, Message-ID idempotency (DB-enforced), payload →
 * text, and the one filing path. Everything arriving is content to read,
 * never instructions to obey — the engine gets the hardened email framing.
 */

const SIGNATURE_TOLERANCE_S = 5 * 60
const ATTACHMENT_MAX_BYTES = 15 * 1024 * 1024 // skip anything larger, honestly manifested

/**
 * ═══ DO NOT "FIX" THIS TO RETURN AN ERROR STATUS ═══
 *
 * This endpoint answers 200 even when it drops or fails, and that is the
 * SECURITY RULING OF JULY 28, not an oversight. It is the deliberate
 * exception to the July 31 law that an empty result and a failed read
 * must be different on the wire.
 *
 * What breaks if you change it: the chute's third defence layer is an
 * unguessable local part on the address. A non-2xx answer tells whoever
 * sent the probe that something is listening and that their mail was
 * rejected rather than ignored — which is exactly the signal an attacker
 * needs to confirm the address exists and start guessing in earnest. A
 * bounce, or anything a sender can distinguish from silence, converts an
 * unguessable address into a confirmable one and burns the layer.
 *
 * Every drop is still fully visible — to CHRIS, in the Arrivals ledger,
 * which is where observability belongs. It is withheld from the SENDER,
 * and only from the sender. The failure is never silent; it is silent in
 * one direction, on purpose.
 *
 * If you are here because the new law flagged three 2xx-on-failure sites
 * in api/, this is the one that stays. The other two (brief, line) were
 * real and are fixed.
 */
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

/* ---------- the follow-up fetch: the body ships separately ---------- */

type FullContent = {
  text: string | null
  html: string | null
  messageId: string | null
  date: string | null
  attachments: Attachment[]
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Fetch the full email from Resend's Receiving API — body, headers, and
 *  every attachment's bytes (signed download_url, size-capped). Retried;
 *  null after the last attempt means the content is genuinely out of
 *  reach right now. */
async function fetchFullEmail(emailId: string, apiKey: string): Promise<FullContent | null> {
  const resend = new Resend(apiKey)
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(attempt === 1 ? 500 : 1500)
    try {
      const { data: full, error } = await resend.emails.receiving.get(emailId)
      if (error || !full) {
        console.error('[ingest] receiving.get failed', error)
        continue
      }

      const attachments: Attachment[] = []
      if (full.attachments && full.attachments.length > 0) {
        try {
          const { data: list, error: listError } = await resend.emails.receiving.attachments.list({
            emailId,
          })
          if (listError || !list) throw listError ?? new Error('no attachment list')
          for (const a of list.data) {
            const filename = a.filename ?? 'attachment'
            const contentType = (a.content_type ?? '').toLowerCase()
            if (a.size > ATTACHMENT_MAX_BYTES) {
              attachments.push({ filename, contentType, content: null })
              continue
            }
            try {
              const res = await fetch(a.download_url)
              if (!res.ok) throw new Error(`download ${res.status}`)
              const buf = Buffer.from(await res.arrayBuffer())
              attachments.push({ filename, contentType, content: buf.toString('base64') })
            } catch (err) {
              console.error('[ingest] attachment download', filename, err)
              attachments.push({ filename, contentType, content: null })
            }
          }
        } catch (err) {
          // the body still counts; attachments join the manifest unreadable
          console.error('[ingest] attachments.list failed', err)
          for (const a of full.attachments) {
            attachments.push({
              filename: a.filename ?? 'attachment',
              contentType: (a.content_type ?? '').toLowerCase(),
              content: null,
            })
          }
        }
      }

      const headerDate = full.headers
        ? (full.headers.date ?? full.headers.Date ?? null)
        : null
      return {
        text: full.text ?? null,
        html: full.html ?? null,
        messageId: full.message_id ? capText(full.message_id, 300) : null,
        date: headerDate ?? full.created_at ?? null,
        attachments,
      }
    } catch (err) {
      console.error('[ingest] receiving.get attempt', attempt + 1, err)
    }
  }
  return null
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
  const resendKey = process.env.RESEND_API_KEY ?? ''

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
    const parsed = JSON.parse(payload) as Record<string, unknown>
    // the debugging window (July 29): the payload's SHAPE, never its
    // content — enough to compare against Resend's docs when this drifts
    const data = (parsed.data ?? {}) as Record<string, unknown>
    console.log('[ingest] payload shape', Object.keys(parsed).join(','), '· data:', Object.keys(data).join(','))
    email = readEmail(parsed)
  } catch {
    email = null
  }
  if (!email) {
    console.error('[ingest] DROP: unreadable payload shape')
    await ledger({ outcome: 'dropped_shape' })
    // 200 BY THE JULY 28 SECURITY RULING — see the ok() helper. A
    // distinguishable answer confirms the address exists. The drop is
    // visible to Chris in the Arrivals ledger, never to the sender.
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

  // ---- the two-step read: the webhook is metadata-only; fetch the body.
  // Inline text/html is honored if a payload ever carries it.
  const needsBody = !email.text && !email.html
  const needsAttachmentBytes = email.attachments.some((a) => !a.content)
  if ((needsBody || needsAttachmentBytes) && email.emailId) {
    if (!resendKey) {
      console.error('[ingest] RESEND_API_KEY missing — cannot fetch the body')
    } else {
      const full = await fetchFullEmail(email.emailId, resendKey)
      if (full) {
        email.text = email.text ?? full.text
        email.html = email.html ?? full.html
        email.messageId = email.messageId ?? full.messageId
        email.date = email.date ?? full.date
        if (needsAttachmentBytes && full.attachments.length > 0) {
          email.attachments = full.attachments
        }
      } else if (needsBody) {
        // honest failure: the content exists at Resend but is out of reach
        // right now. Answer 500 so Resend redelivers — idempotency makes
        // the retry safe; the ledger records this attempt.
        console.error('[ingest] body fetch failed — asking Resend to redeliver')
        await ledger({
          outcome: 'failed',
          source,
          sender: email.from,
          summary: email.subject
            ? `${email.subject} (body fetch failed — will retry)`
            : 'body fetch failed — will retry',
        })
        return new Response('content fetch failed', { status: 500 })
      }
    }
  }

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
    const bodyText = bodyToText(email.text, email.html)
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
      // faithfully, marked as a manifest — never a silent drop. (A
      // stroke-only reMarkable PDF lands here by design: drawn ink has
      // no text layer; convert-to-text on the device is the way in.)
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

    // 200 BY THE JULY 28 SECURITY RULING — see the ok() helper. A
    // distinguishable answer confirms the address exists. The drop is
    // visible to Chris in the Arrivals ledger, never to the sender.
    return ok({ received: true, entryId: filing.entryId })
  } catch (err) {
    // a unique-index collision is the idempotency backstop, not a failure
    const code = (err as { code?: string })?.code
    if (code === '23505' || String(err).includes('23505')) {
      await ledger({ outcome: 'duplicate', source, sender: email.from, summary: email.subject })
    // 200 BY THE JULY 28 SECURITY RULING — see the ok() helper. A
    // distinguishable answer confirms the address exists. The drop is
    // visible to Chris in the Arrivals ledger, never to the sender.
      return ok({ received: true, duplicate: true })
    }
    console.error('[ingest] filing failed', err)
    await ledger({ outcome: 'failed', source, sender: email.from, summary: email.subject })
    return ok() // never bounce, never retry-storm; the log is the record
  }
}
