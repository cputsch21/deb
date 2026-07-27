# Spike: Plaud autoflow — an inbound address that files itself
*M5 T7 · July 24, 2026 · timeboxed findings, not a commitment. Manual paste
ships regardless; productionizing belongs to V2 Pillar 5 if the move-in
findings want it. The decision is Chris's.*

## The shape (either provider)
`deb@⟨his-domain⟩` → provider receives the email → POST to a new
`/api/ingest` on Vercel → the existing pipeline (raw → entry_raw, distill,
route, mint, margins) with `source: 'plaud'`. Plaud's AutoFlow can already
auto-send transcripts to a configured recipient, so calls would file
themselves minutes after they end.

## Option A — Cloudflare Email Routing + Email Workers
- **Cost: $0.** Inbound routing is free; the Worker tier covers this volume
  thousands of times over. Requires the domain's DNS on Cloudflare.
- We write a small Worker: parse the MIME (postal-mime), extract the
  transcript text, POST it to `/api/ingest` with a shared secret.
- Trade: we own the parsing edge cases; Cloudflare's newer email *service*
  is in public beta (April 2026), though inbound Routing itself is the
  long-stable half.

## Option B — Resend inbound
- **Cost: $0 at our volume** (free tier 3,000 emails/mo; paid starts $20/mo
  at 50k — a life of calls won't approach it). GA and mature.
- Resend does the parsing and delivers clean JSON to our webhook with
  signature verification (svix). No Worker, no MIME code.
- Trade: one more third party holding mail content in transit.

## The real build cost (same for both): identity
Today every write runs AS Chris via his session token — the server holds no
privileged key. An inbound email has no session, so `/api/ingest` needs the
service-role key (env slot already reserved) plus an explicit stamp to his
user id, and hard bars at the door: **sender allowlist** (only Plaud's
sending address / his own) + a shared secret in the address or headers —
anyone who learns a bare address could inject material otherwise. The
content-never-instructions law already covers what arrives. Estimated
effort: Resend ~2–3h; Cloudflare ~half a day.

> **Standing note for future-us (ruling, July 24, 2026):** parked; decision
> deferred to V2 Pillar 5 with **Resend as the standing lean**. When we
> productionize, the identity change — a service-role key entering a
> codebase that today holds **no privileged key at all** — is the real cost
> and gets its **own dated security ruling** in DECISIONS (key scope,
> storage, the allowlist, and the blast radius), not a footnote in a
> feature ticket.

## Recommendation (one line)
Resend inbound — managed parsing, GA, free at our volume, fastest to
trustworthy — unless the domain already lives on Cloudflare DNS and zero
third parties matters more than the Worker we'd maintain. Audio files ride
V2's voice pillar; the transcript is the raw for now.

Sources: [Cloudflare Email Service docs](https://developers.cloudflare.com/email-service/) · [Cloudflare email pricing](https://developers.cloudflare.com/email-service/platform/pricing/) · [Resend vs Cloudflare comparisons](https://www.sequenzy.com/versus/cloudflare-email-vs-resend) · [forwardemail.net comparison](https://forwardemail.net/en/blog/resend-vs-cloudflare-email-routing-email-service-comparison)
