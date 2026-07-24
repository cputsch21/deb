# Deb — Decisions Log

> The running record of deliberate rulings: what changed, why, and what it
> supersedes. Every meaningful product or architecture decision adds a dated
> entry here. When this log and any other doc disagree, **this log is newer —
> trust it and fix the older doc.** (A pattern proven in TRUE.)

---

## Current product state

**Deb** (formerly MyOS) is a personal operating system for turning goals into
reality — one AI mentor (Deb) across **one rail and four rooms** (Read · Review
· React · Reflect), one door for everything, quiet structure, honest reflection.
Product law, newest first: `docs/prd.md` (the intention) + `docs/design-target.html`
(the approved clickable prototype — the design target) · then `docs/feature-list.md`
and `docs/ux-foundation.md` (v1, superseded where they conflict — see July 24) ·
`docs/build-plan.md` (the milestones) · `docs/master-inventory.md` (the cross-app
archaeology it was all distilled from). Currently at **Milestone 2 — The Mentor**
(the Reflect room): the soul doc, the append-only thread tables, and the
`/api/chat` voice engine are in; the thread UI is next.

---

## The log (newest first)

### July 24, 2026 — The mobile grammar (TRUE's, layered with the rooms)
Responsive, one codebase: below ~768px the shell re-arranges; desktop is
untouched. No separate app, no forked components — the same rooms wearing a
phone-shaped shell. Rulings:
- **The world pill replaces the rail.** Top center: `● WORLD ▾` in a soft
  well — silver + Deb at home, the world's color and name in a lens. The
  repaint works exactly as on desktop. Tapping opens the world sheet.
- **The world sheet** (bottom sheet, TRUE's grammar): drag handle, current
  world in a filled well (tap = its settings), hairline, every held world as
  a row, `+ new world` in mono, bottom row = theme toggle · memory · sign
  out. 200ms slide up, instant dismiss on flick-down/tap-away. Its floating
  edge shares the design system's ONE sanctioned shadow.
- **Rooms are a horizontal pager** — the ruling. Canonical order READ ·
  REVIEW · REACT · REFLECT; landing room Reflect; indicator = the four verbs
  in tiny mono under the pill (current ink, rest muted, each tappable as the
  discoverability fallback); flat 200ms slide, no bounce, no parallax.
- **Gesture ownership is decided by touch-start target, period.** A touch
  beginning on an element marked `data-own-touch` (the React card when M4
  ships it; the Now strip; any horizontal scroller) belongs to that element
  — the pager never moves. A touch beginning anywhere else belongs to the
  pager. No velocity heuristics, no mostly-horizontal guessing. The React
  card must be tested on a real device before M4 calls it done.
- **Act receipts on mobile: the small inline pill chip** (`● Filed — 1 task
  added` pattern). An explicit MOBILE amendment to the July 22 "no receipt
  chips in-thread" ruling — chips are session-ephemeral UI, mobile-only; the
  append-only thread table stays pure conversation; desktop stays words-only.
  (TRUE's mono attribution lines were NOT adopted — they conflict with the
  July 22 no-signed-lines law; flagged for Chris's call.)
- **The Now strip** (above the composer in Reflect): the Line's glance level
  as horizontally scrolling soft cards — world dot + tag, title, done
  circle; momentum scroll, no pagination dots. Until M4 ships the Line it
  glances open tasks — same shape, upgraded source later.
- **The composer:** full-width soft well, "Tell Deb anything…", round accent
  send button (≥44px). **Voice capture is deferred entirely — the composer
  reserves no space for a mic.** Shift+Enter newline kept for external
  keyboards.
- **Phone hygiene is law:** viewport-fit=cover + safe-area insets (composer
  clears the home indicator, pill clears the notch) · 100dvh never 100vh ·
  inputs ≥16px below the breakpoint (no iOS zoom-jump) · overscroll
  contained (no page rubber-banding) · tap targets ≥44px · momentum
  scrolling on the thread and the strip.
- **PWA install shell pulled forward from M6:** manifest (name "Deb", Warm
  Glass theme colors), icons (warm paper + the silver home dot), standalone
  display — Add to Home Screen loses the browser chrome. Arc and the rest of
  M6 stay parked.
- **A manual theme toggle exists** (the sheet's bottom row): persisted
  override, system preference when unset.
- The honest failure states apply to every mobile surface identically (same
  components, no forks).

### July 24, 2026 — The empty-board incident: two standing disciplines
The M3 T2 deploy selected `projects.mission` before the by-hand migration
had been run. Every projects read failed ("column does not exist"), the
failed fetch defaulted to an empty list, and the app rendered a bare rail —
worlds *appeared* wiped. No data was ever touched: reads failed, nothing
wrote; running the missions migration restores the fetch. Two laws so this
class of failure cannot recur:
1. **A failed load never renders as an empty board.** Empty says "your life
   is gone," and that's a silent lie. Every load-bearing read (the rail +
   rooms via the worlds query, the thread, the dossiers, the memory room)
   now shows an honest failure state — what didn't load, "nothing is lost,"
   and a retry. Extends the errors-are-never-silent law to reads; applies
   to every future surface from its first query.
2. **Migration before deploy.** Code that requires a schema change does not
   get pushed until its migration has been run in Supabase and confirmed by
   Chris. Migrations stay additive and idempotent, so already-deployed code
   keeps working the moment the migration lands (expand first, never
   break-then-fix). The push waits; never again "deploy now, migrate
   quickly."

### July 24, 2026 — Standing correction: nothing is special about six
Worlds are just Chris's current projects — could be 2, could be 10, changes
over time. Standing law:
- **No count-language in operative docs or completion criteria.** M3's done
  is: the intake works end-to-end and every world *currently* held has a
  mission — a moving target by design, never a number. (Scrubbed this date:
  Deb's prompt intro, PRD's "six dossiers," build-plan's M1 line,
  ux-foundation's Friday line, and the M3 criterion below.)
- **No UI, copy, layout, or logic may assume a world count.** Verified: the
  rail, the Review grid, context assembly, and the prompt all read the live
  list; nothing caps or hardcodes. ("The six instincts," the six-app
  archaeology, and the six color *presets* are not world counts and stand.)
- **The world lifecycle is complete and verified from M1:** create (rail +),
  rename, recolor, and retire. Retire = soft delete with undo — the dot
  leaves the rail, the entire record stays (tasks, goals, mission, rhythms,
  thread lines — no delete policy exists in the DB, nothing cascades). UI
  copy aligned from "Delete" to "Retire" this date. A quiet "finished shelf"
  in Review may surface retired worlds later; the preservation is the law
  today.
- **Deb may have opinions about the count — LOAD gives her standing — but it
  is commentary, never a constraint. She never blocks a world's creation.**
  (Soul doc gains the matching line.)

### July 24, 2026 — M2 closed · M3 T2: the interview is the onboarding
M2 (Reflect: voice, hands, memory, the first message) is closed — the T6 SQL
ran; her first words are the blank-start text.
- **The intake interview is Deb's real onboarding** (now that inheritance is
  gone): Chris walks the rail and gives her each world in conversation. She
  interviews per the soul doc — organic, one warm question at a time, never a
  survey, never announcing the process — distills a ONE-line mission in his
  words, and writes it herself (`set_mission`, act-then-correct with the
  normal undo/redo). Durable facts from the interview land in memory the
  normal, visible way ("Noted" pill). The soul doc gains the matching
  section (this date).
- **`projects.mission`** (nullable, ≤200, check in schema, cap in code) is
  the one new column; Review hangs it over the world's mantle. A world
  without a mission simply hasn't been given to her yet — the state block
  says so honestly.
- **M3 closes when the intake works end-to-end and every world currently
  held has a mission** — a moving target by design, never a number (amended
  same day; see the standing correction above); then M4 (React).
- Two Reflect quiets, same date: the composer is a growing textarea
  (Enter sends, Shift+Enter breaks a line, ~5 lines then internal scroll);
  **the quote is removed from Reflect with its breathing room preserved** —
  it may return elsewhere later.

### July 24, 2026 — Reversal: NO TRUE inheritance, ever
Supersedes the inheritance ruling (feature S38 / inventory G7, "TRUE's data
as the seed") and the July 22 "TRUE's data seeds Deb's memory" line. **Deb
starts blank by deliberate choice.** Too much of TRUE's context is not wanted
clouding her; anything worth carrying, Chris tells her himself or adds in the
memory room.
- The T6 inheritance migration is void and deleted; the TRUE-side export SQL
  is void. T6 shrinks to one move: plant her first message as the thread's
  true beginning.
- The soul doc's memory section loses its inheritance clauses; the canonical
  first message is replaced with the blank-start text (recorded in
  `docs/deb-soul.md`, this date).
- The `known_facts.source = 'seed'` value stays in the schema as a dead
  letter (harmless; nothing will ever write it). The prompt and UI no longer
  speak of inheritance.
- PRD phrases like "what TRUE knew before her (inherited, labeled as such)"
  are superseded on this point by this entry.

### July 24, 2026 — The milestone re-cut, mapped to rooms (approved)
Supersedes M3–M6 of build-plan v2. M2 (Reflect: voice, hands, memory, the
thread) is closing. The remaining milestones map one-to-one onto rooms:
- **M3 — Review:** the read-only dossiers over M1's spine. Six world cards at
  a glance; a world's dossier (Goals · Recently · Next · Waiting-on as its
  data arrives). Derived, never maintained; nothing tappable into action.
- **M4 — React:** the one stack + the Line — the four D's + the punch,
  species-aware Delete, the Now two-chip window in Reflect. Cards minted from
  the spine first (stale Bench, undecided tasks, broken rhythms); the
  from-people species stays V2.
- **M5 — Read:** ingestion + the record — the private ingest address, Plaud +
  reMarkable (raw kept beside the distillate), days as pages, the four margin
  annotations (each a door into Reflect), the record building invisibly.
- **M6 — Presence & polish:** Arc, the context-wired quote engine,
  sunrise/sunset, PWA, keyboard pass, trash restore.
Order rationale: Review is derivable today (cheapest whole-feeling win),
React is the second daily driver and runs on spine-minted cards, Read is the
largest new surface and lands once both its dependents are steady.

### July 24, 2026 — The four rooms (PRD + design target are the law now)
A major product evolution, locked in Cowork. Two artifacts land as the top of
the law stack: `docs/prd.md` (the product intention) and `docs/design-target.html`
(the approved clickable prototype — composition, spacing, type sizes, colors,
motion timings, and interaction behavior incl. drag physics are extracted from
it, not invented; when in doubt, match the prototype). **Where these conflict
with `feature-list.md` or `ux-foundation.md` (v1), the PRD and the design target
win** — ux-foundation v1 is superseded on every point of conflict; what it still
uniquely covers remains reference.

- **One rail, four rooms.** The app is four verbs across the top —
  **READ** (what happened: ingested days as pages, Deb's four kinds of margin
  annotation), **REVIEW** (where things stand: a read-only warm dossier per
  world), **REACT** (decide + do: one card stack — the four D's + the punch —
  and the Line), **REFLECT** (what it means: the one thread with Deb). One
  spine under all four; nothing exists in two rooms; each room does one verb
  completely.
- **The rail is the sole global filter.** Silver = whole life; a world dot
  scopes every room at once and repaints the app in its color. *Where you are*
  is one decision, made in one place. Supersedes any per-room or per-screen
  filtering.
- **Review is read-only, by law.** Everything derived, nothing maintained,
  nothing tappable into action — read-only is the feature. The moment Review
  lets you edit, it becomes a workspace, and workspaces become chores (the
  graveyard's verdict). To act, walk to another room.
- **React is one stack over one queue.** The old Deck / Now / Instrument
  concepts merge into React: exactly ONE stack of cards and exactly ONE queue
  (the Line). Two card species — from-my-notes (V1) and from-people (V2) —
  share the same gesture; Delete verdicts are species-aware (the extractor
  learns vs the mail filter learns). The Now strip survives only as a two-chip
  window onto the Line inside Reflect. Three zoom levels, one truth, no second
  list anywhere, ever.
- **The stack is never a second inbox** (the entry bar). From-people cards
  enter only over a high bar — the ball is on you · it truly matters · you
  asked to be told; the rest stay in their source, unpunished.
- **Read is where ingestion lands; no in-app writing in V1.** The reMarkable is
  the pen. Distillation on the page, the verbatim raw one tap beneath (keep the
  raw). Every margin note is a door into Reflect.

**Impact on the build:** all of the approved M2 work — the thread, her voice,
her hands, her memory, the inheritance from TRUE — survives unchanged. It *is*
the Reflect room. M2 continues exactly as ticketed, now built inside a minimal
rooms shell (top nav + rail per the prototype) with Read / Review / React as
empty stubs behind the nav. A milestone re-cut mapped to rooms is proposed when
M2 lands: React absorbs the old Deck + Now milestones, Read absorbs ingestion +
the record's surfaces, Review grows from M1's spine data.

### July 23, 2026 — M2 opening rulings
- **Design polish is deferred until the app is functionally complete** —
  deliberate, not drift. The Warm Glass foundation ships as-is through the
  functional milestones; the dedicated polish pass comes after.
- **`docs/deb-soul.md` is locked law for Deb's behavior.** Her system
  prompt is built from that document and only that document. Changes to
  her character go through the soul doc (and an entry here), never
  directly into prompt code.
- **Messages are append-only, enforced by the database** — no update or
  delete permission exists on the thread, period. If redaction of
  accidentally pasted sensitive content is ever needed, it arrives as its
  own narrow, deliberate mechanism via a future ruling here — never a
  general edit/delete door.
- **The memory room opens from a quiet "memory" whisper in the home
  header.** Everything Deb knows: visible, editable, forgettable.

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
