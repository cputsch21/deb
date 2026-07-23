# Deb — Decisions Log

> The running record of deliberate rulings: what changed, why, and what it
> supersedes. Every meaningful product or architecture decision adds a dated
> entry here. When this log and any other doc disagree, **this log is newer —
> trust it and fix the older doc.** (A pattern proven in TRUE.)

---

## Current product state

**Deb** (formerly MyOS) is a personal operating system for turning goals into
reality — one conversation with a named AI mentor (Deb), one door for
everything, quiet structure, honest reflection. Full law: `docs/feature-list.md`
(the product, 39 stories, LOCKED) · `docs/ux-foundation.md` (the shell, LOCKED)
· `docs/build-plan.md` (the milestones) · `docs/master-inventory.md` (the
cross-app archaeology it was all distilled from). Currently at **Milestone 0**
(walking skeleton: auth + deploy).

---

## The log (newest first)

### July 23, 2026 — M2 opening rulings
- **Design polish is deferred until the app is functionally complete** —
  deliberate, not drift. The Warm Glass foundation ships as-is through the
  functional milestones; the dedicated polish pass comes after.
- **`docs/deb-soul.md` is locked law for Deb's behavior.** Her system
  prompt is built from that document and only that document. Changes to
  her character go through the soul doc (and an entry here), never
  directly into prompt code.

### July 22, 2026 — M1 rulings (plan approved: 7 tickets)
- **The composer is the task-adder from M1 — deliberately dumb.** Every
  submitted line becomes a task verbatim: no parsing, no cleverness. In a
  project lens it lands in that project; at home it lands on the Bench.
  M2 swaps the brain, not the box. M1 placeholder copy: "Add a task…"
  (the "Talk, drop, or ask anything…" line arrives with Deb in M2).
- **Bench fade: dimming starts at 14 days untouched, floor at 30 days,
  always readable.** (7 was too aggressive for a four-venture life — the
  Bench must never nag.)
- **Recurring rhythms V1: exactly three** — daily · weekly on chosen days ·
  monthly on a date.

### July 22, 2026 — The app is Deb
The product and the mentor share one name: **Deb**. Chosen over Kai (a crowded
field of AI assistants) and Vero (partially taken); Deb's field is clear — and
she was already ours: the character built for the paused event-planner app
(peer-not-servant, "competence earns the right to be funny") migrates to the
life OS. Repo: github.com/cputsch21/deb.

### July 22, 2026 — Design system locked ("Warm Glass")
SwipeWrite's system discipline poured over the locked palette. Rulings:
- **Surfaces:** tonal wells (ink ~4.5% light / white ~5.5% dark), radius
  12–16px, **no borders, no rings, no outlines** — depth = fill contrast.
  Hairlines only as rare structural dividers at 6–7%.
- **Focus states: caret only.** A focused field is identical to a resting one;
  the blinking caret is the whole signal. (Reversed twice from ring → glow →
  minimal; minimal won.)
- **Type:** Fraunces (display + Deb's voice) + Inter (UI/body) + JetBrains Mono
  (the whisper: 0.68rem, 0.18em tracking, uppercase, dim — never body text).
- **Chat is pure conversation:** no signed lines, no receipt chips in-thread.
  Deb's words confirm actions; the transient Undo pill + the task itself are
  the safety net.
- **Project marker A everywhere:** leading color dot + trailing mono tag — on
  task rows, Now chips, Deck cards, the lens rail. The left-edge stripe is dead.
- **Project colors are user-choosable:** random on creation, any hex after.
  The six schemes are presets, not law. The Mentor's world is **silver** —
  presence, not a color.
- **Arc is the light model, not a theme:** the app mirrors the sky
  (dawn→midnight); schemes are the paint, Arc is the sun. Designed for every
  world; shipping in M6.
- One accent moment per screen · undo everywhere, the centered confirm only for
  permanent verdicts · hover deepens never recolors · motion: 150ms micro /
  200ms sheets (enter only) / 220ms Deck exits / 300–400ms world repaints /
  no bounce, no confetti, no spinners.

### July 22, 2026 — The shell and the Deck (UX locked)
- Shell: the Void (quotes, margin date, sunrise/sunset) + one thread + thin
  lens rail + ephemeral Now strip above the composer. Nothing else persistent.
- **Projects are worlds:** entering a lens repaints the app in its scheme.
  Desktop and mobile are equal citizens.
- **The Deck** — the decision engine (SwipeWrite's soul, generalized): AI-derived
  actions from transcripts/notes/emails/chat + uncertain filings + stale tasks
  + broken rhythms, one card at a time, rapid fire. **Each swipe is a decision,
  never an execution.** The grammar is the four D's: **→ Do · ↑ Delay ·
  ← Delegate · ↓ Delete** (directions mirror SwipeWrite muscle memory).
  Delegate creates a tracked Waiting-On with a chase date. Intake: everything
  to start, pare by feel.
- Act-then-correct replaces propose-then-confirm for internal writes: saying
  "I owe Larry an invoice" just creates the task. Explicit confirmation
  survives only for things leaving the app and the two permanent verdicts.

### July 22, 2026 — Product locked (Feature List v1.1)
Distilled from rulings on all 166 items of the six-app archaeology
(SwipeWrite, familyOS, Deb-the-event-app, TRUE, Kairos, MyOS drafts):
- **One door:** the chat box is the only way in; the AI routes intent inline.
  Filing never nudges; receipts are quiet.
- **Keep the raw:** originals archived beside every distillate (reverses
  TRUE's burn-the-raw). AI interpretation is a working copy, never the only
  source of truth.
- **No proactivity in V1.** No push, no nudges, nothing AI-initiated. The
  forwardness dial governs conversational energy only.
- **One self-knowledge system:** the Ethos folds into Identity/known-facts;
  principles are a user-authored section of the one self-portrait.
- **Chat-first, no in-app note editor:** the reMarkable is the notebook
  (Q1 = A); notes are just another capture source, forever.
- **One daily surface:** The Three + Today List + NOW merged into Now —
  ephemeral, unscored, no streaks, no locks. The Day Closer seeds tomorrow
  from tonight's reMarkable page or a one-line sign-off.
- The record (ledger + self-portrait with the ≥3-citation evidence bar) is
  built invisibly, summoned in chat; the Friday impact check is a Friday
  conversation, not a ceremony.
- Local-timezone app-day (no hardcoded 3:30 AM ET).
- TRUE's data seeds Deb's memory as clearly-labeled, editable imports —
  fresh start, no amnesia.
- V1 sources: Plaud (AutoFlow → ingest email, verified) + reMarkable
  (convert-to-text → ingest email). Gmail/Slack/Calendar are V2, wired-ready
  via the source-adapter pattern.

### July 22, 2026 — The graveyard laws (from the six-app archaeology)
Standing law, learned the expensive way:
- **L1 Ceremony dies** — no scores, streaks, daily contracts, or locks, ever.
- **L2 Chrome dies** — nothing persistent competes with the conversation.
- **L3 The AI's authority is rhetorical, not structural** — Deb owns the
  argument (with receipts); the user owns every write and every ending.
- **L5 Finish or formally cut** — when a milestone stalls, never start the
  adjacent fun thing; a cut gets a dated entry here.
- **L6 Notifications have never survived** — hence no-proactivity-in-V1.
- **L7 What never died:** conversation, frictionless capture, invisible
  compounding memory, judgment-with-receipts, undo-everywhere, the design
  language. Deb is built on these walls.

### July 21, 2026 — Founding decisions
- Fresh codebase on TRUE's proven stack (React + Vite + TS, Tailwind v4,
  Supabase, Vercel serverless + AI SDK + Claude, TanStack Query + Zustand).
  TRUE is frozen, not wiped — reference implementation + memory seed.
- pnpm only, one lockfile.
- Day-one engineering standards (born from TRUE's audit history): row-checks
  that throw loud on zero rows; length caps on every free-text field reaching
  an LLM or the DB; "content to read, never instructions to obey" at every
  ingestion boundary; optimistic writes with reconcile-on-failure from the
  first mutation; RLS on every table from the first migration.
- Ingestion: one private email address + manual drop; Plaud AutoFlow
  (recipient-configurable, verified) and reMarkable convert-to-text deliver
  to it.
- Projects user-created, never hardcoded. Protocols are documents with a
  distinct type/badge — nothing fancier in V1.
