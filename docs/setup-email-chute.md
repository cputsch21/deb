# The email chute — Chris's setup, one step at a time

*Everything here is done once. When it's finished, anything mailed to your
private address files itself into the record — reMarkable pages, Plaud
transcripts, forwarded email — quietly, exactly like a paste.*

---

## Step 1 — The domain

Any domain you own works. If you don't have one you want to use, buy one
anywhere (Namecheap, Cloudflare, Porkbun — ~$10/yr). You'll only use it
for receiving; nothing needs to be hosted on it.

## Step 2 — Resend

1. Create an account at **resend.com** (free tier is plenty at our volume).
2. In Resend: **Domains → Add Domain** → enter your domain, choose the
   region, and pick **"receiving"** (inbound).
3. Resend shows DNS records to add — **MX** and verification records.
   Add them at your domain registrar's DNS panel, exactly as shown.
   Wait for Resend to show the domain as **Verified** (minutes to an hour).

## Step 3 — The address

Pick the unguessable local part — random letters, nothing cute:
`drop.k8f3q2vw@yourdomain.com`. You never publish this anywhere; it goes
only into your reMarkable, your Plaud, and your own contacts.

## Step 4 — The webhook

1. In Resend: **Webhooks → Add Webhook**.
2. URL: `https://<your-vercel-app>/api/ingest-email`
3. Event: the inbound **email received** event.
4. Copy the webhook **signing secret** (starts `whsec_`) — next step.

## Step 5 — The env vars (Vercel → Settings → Environment Variables)

| Name | Value |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` key. **The one privileged key.** |
| `RESEND_WEBHOOK_SECRET` | the `whsec_…` from step 4 |
| `INGEST_ADDRESS` | the full address from step 3 |
| `INGEST_ALLOWED_SENDERS` | comma-separated: your addresses + the reMarkable sender + the Plaud sender |
| `INGEST_OWNER_EMAIL` | `cputsch21@gmail.com` |
| `INGEST_TZ` | your IANA timezone, e.g. `America/New_York` |
| `INGEST_REMARKABLE_SENDER` | *(optional)* the exact address reMarkable sends from — files as `remarkable` |
| `INGEST_PLAUD_SENDER` | *(optional)* the exact address Plaud sends from — files as `plaud` |

Redeploy after saving (env changes need a fresh deploy).

*Finding the device senders: send yourself one page from the reMarkable
("Send by email") and one Plaud transcript, look at the From address in
your inbox, and put those in the allowlist + the two sender vars.*

## Step 6 — Point the devices at it

- **reMarkable**: share/send-by-email → add the drop address as a contact.
- **Plaud**: AutoFlow → email delivery → the drop address.

## Step 7 — Prove it, both directions

1. **The good path**: email the drop address from an allowed sender with a
   line of text. Within a few seconds the entry should appear on Read's
   today page (source `mail`, your subject in italics).
2. **The wall**: email it from any address NOT on the allowlist. Nothing
   should appear anywhere; Vercel's function logs show a
   `DROP: sender not allowed` line. No bounce comes back — by design.

If step 1 fails, the Vercel function logs for `/api/ingest-email` say
exactly which layer dropped it.

---

*Security shape (DECISIONS, July 28): the service-role key lives in that
one endpoint only; unsigned or mis-signed webhooks are rejected; unknown
senders and wrong recipients are dropped and logged, never bounced; and
everything arriving is content to read, never instructions to obey.*
