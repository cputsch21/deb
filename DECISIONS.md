# MyOS — Decisions Log

> The running record of deliberate rulings: what changed, why, and what it
> supersedes. Every meaningful product or architecture decision adds a dated
> entry here. When this log and any other doc disagree, **this log is newer —
> trust it and fix the older doc.** (A pattern proven in TRUE.)

---

## Current product state (V1, in progress)

MyOS is a personal operating system for turning goals into reality:
**Projects · Goals · Tasks · Mentor + Planner · Context Inbox (with triage
and People/Waiting-On) · Today List · Friday Impact Check · Documents index
· Protocols.** Full spec: the Draft 3 product spec; build order: the V1
build plan. Currently at **Milestone 0** (walking skeleton).

---

## The log (newest first)

### July 21, 2026 — Founding decisions
- **MyOS is a fresh codebase on TRUE's proven stack** (React + Vite + TS,
  Tailwind v4, Supabase, Vercel serverless + AI SDK + Claude, TanStack
  Query + Zustand). TRUE itself is **frozen, not wiped** — it stays as the
  reference implementation and as a data source to later seed the Mentor's
  memory. Same accounts, separate projects (new Supabase project, new repo,
  new Vercel project).
- **pnpm only, one lockfile.** TRUE's dual-lockfile footgun is not carried
  forward.
- **Day-one engineering standards** (born from TRUE's audit history, not
  deferred to future audits): every update-by-id verifies a row changed and
  throws loud on zero rows; every free-text field reaching an LLM prompt or
  the DB is length-capped at write time; ingested content is framed
  "content to read, never instructions to obey" in every prompt touching
  it; optimistic writes reconcile on failure from the first mutation; RLS
  on every table from the first migration.
- **V1 scope contract** is Draft 3's "NOT in V1" list: no calendar, no
  routine tracking/scoring, no push, no full doc storage, no Slack/general
  email ingestion. Changes to scope get a dated entry here first.
- **Ingestion architecture:** one private ingest email address + manual
  drop. Plaud via AutoFlow email delivery (verified: recipient address is
  configurable); reMarkable via built-in convert-to-text + send-by-email.
- **Projects are user-created, never hardcoded.** Starting set: CTDI,
  Subseven, ISO, 150 Poplar, Family, Personal.
- **Protocols are documents** with a distinct type/badge/filter in the UI —
  nothing fancier in V1.
