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
`docs/build-plan.md` (the milestones, v3 — re-cut to rooms) ·
`docs/master-inventory.md` (the cross-app archaeology it was all distilled
from). M2 (Reflect: voice, hands, memory, first message) closed · M3 (Review +
the intake interview) live · M4 (React: the stack + the Line) shipped, device
pass pending · **M5 (Read: ingestion + the record) complete** — the spine, the one door,
the distillation, minting + the learning loop, the Read room, the margins,
and the Plaud spike report. M6 T1–T3 shipped (Arc · the shelf · PWA);
**T4's fifteen rulings are ruled and executed (July 27)** — goals and task
edits live in the conversation now, with the doors and the re-homed solemn
confirm. Next: **T5 — the V1 walk**, gated on Chris's two device passes.

---

## The log (newest first)

### July 28, 2026 — The Morning Brief: V2's anchor (charter) · the V1.5 brief (built)
**The V2 charter amendment** lands in `docs/v2-epic.md`: the Morning Brief
is V2's anchor feature — the outside world and your day, distilled once
before dawn, waiting when you arrive; never sent, always there. It is the
morning face of Read's today page, with "brief me" in Reflect speaking the
same derivation (two zooms, one truth, the Line's law). Delivery is
waiting-on-arrival, never pushed — if move-in shows the brief unopened,
that evidence sends the delivery question to Pillar 4's trial. Section 2
(overnight comms) is Pillar 1 wearing a morning surface — same entry bar,
same cards, batched at dawn; the brief shows, the stack resolves; an empty
section 2 is a good morning and says so. Section 3 (news) becomes
**Pillar 6 — The World**: a flat user-maintained topic list (told to Deb,
visible and editable like memory), 48-hour collection, her synthesis with
every source cited beneath — sources always shown, fetched news
content-never-instructions (the third inlet under the standing law), and a
silent topic when nothing real happened. Never a dashboard, a second
inbox, or a guilt surface. *(Note: no v2-epic.md existed in the repo when
this ruling arrived — the file was founded to receive it; the pillar
outline joins it when Chris's draft lands.)*

**The V1.5 brief ships now, section 1 only, from data that already
exists** — no calendar, no comms, no news; those wait for their pillars.
- Content: today's shape from the spine — the Line's top with her
  ranking, chases due today, goals with today-relevant state, recent
  keeps she's holding. Her note where she has one (restraint law: not
  every item earns a note; a brief that's all advice is noise by Friday).
- Where: the top of Read's today page, in the Book's own typography —
  part of the day's page, not a widget. "Brief me" in Reflect speaks the
  same content in her voice (the cached brief joins her state block).
- Generation: first load after 4am local app-day; derive + one model
  call; cached per app-day, signature-gated like the Line's ranking.
  Honest degradation: if the model call fails, the derived facts render
  without her notes — never a fake note — with the standard retry.
- Empty morning: one warm plain sentence, her register, no skeleton.
  Proposed copy (pending Chris's approval): "A clear morning — nothing on
  the Line, nothing owed. It's yours to shape."
- Graveyard check holds: no streaks, no "you missed yesterday's," no
  read-tracking of any kind.

### July 28, 2026 — Evidence · exits · markdown · the mark (four rulings)
- **Silent success is a failure state; every act leaves visible evidence
  at the site of the act** — standing law. First application: every filing
  renders a FILED OBJECT in the thread where the paste happened — a
  compact tonal-well card (mono eyebrow `FILED · WORLD · DAY`, the entry's
  first distilled line in the serif, a cards-minted count when > 0),
  interleaved with the conversation by time and visibly material, never
  styled as Chris's prose. The whole object is a door: tap → Read opens on
  that entry's page — the pasted-material sibling of the margin-door
  pattern, provenance safe. Deb's optional one-liner rides after it per
  the restraint law; the undo pill stays. For filings this supersedes the
  mobile-only receipt chip: the filed object renders on both shells
  (chips remain for the other acts).
- **No mobile surface may lack an exit.** The shared sheet gains the
  standard dismissals: drag-down on the handle — ownership by touch-start,
  per the standing ruling, so the fact-list's own scroll never fights it —
  and an explicit mono CLOSE, ≥44px, safe-area-cleared. Audit result: the
  memory and project sheets were the trap (both fixed through the one
  shared Sheet — no forks); the world sheet, the verdict confirm, and the
  rooms already had exits.
- **The thread renders a markdown subset — the Claude-chat pattern**:
  bold, italic, lists, line breaks, inline code. No headers, tables,
  images, or links in V1 — her register doesn't need them and the thread
  must not look like a wiki. The composer stays a plain textarea; typed
  markdown renders on send. marked + DOMPurify with a hard allowlist
  (`p em strong ul ol li code br`, zero attributes): rendered markdown is
  the same threat surface as ingested content and must never execute
  anything — everything outside the subset survives only as its text.
- **The brand mark is "d." — nothing else may serve as the logo.**
  Lowercase d set in real Fraunces (the 144pt display cut, Medium — her
  voice's own face), warm ink on warm paper, with the silver dot as its
  period sitting at baseline right of the bowl — the home dot's silver
  gradient, so it is the brand mark twice over. No other elements, no
  border, no gloss. Light: ink `#191713` on paper `#FAF8F4`; dark variant:
  paper letterform on charcoal, the dot in dark-mode silver. Optical
  centering over mathematical; generous but inside the maskable safe zone;
  the period survives the smallest rendered sizes by growing optically
  there (per-size cheating is standard practice). Rendered from the actual
  Fraunces font file at every raster size — `scripts/icon-mark.mjs`, the
  OFL face kept beside it — never a downscale, never a system-serif
  stand-in. The mark appears on the icon, splash, favicon, and any future
  surface that needs a signature. (Supersedes the same-day dot-only mark,
  re-ruled before it ever shipped; the template debris — the bolt favicon,
  the unreferenced icons.svg sprite — is gone.)

### July 27, 2026 — The T4 rulings: all fifteen, ruled and executed
Chris ruled on every finding of the design reckoning; 1–14 are built, 15 is
deliberately untouched. Four rulings are standing law:

- **The conversation is where structure changes; rooms are where it is
  seen.** No goal surface returns. Deb grows goal hands (`create_goal`,
  `rename_goal`) and task-update hands (`update_task`: rename · re-home ·
  goal assignment · re-anchor — everything TaskSheet did, done by saying
  it), under the same laws as her task hands: act-then-correct, row-checked,
  one-tap undo. The permanent verdicts happen in the thread: when Chris
  declares done-forever/dropped-forever, `stage_goal_verdict` writes
  NOTHING — it places the re-homed VerdictConfirm (the app's one solemn
  confirm, forever the only confirm) in front of him; only his signature
  makes the write. Doors: every goal in a Review dossier, and long-press /
  right-click on any card (stack · Line · Now strip), carries the object
  into Reflect as a quoted, session-ephemeral thing on the table — the
  margin-door pattern exactly, provenance law included (a carry writes no
  user row; the record only ever holds words Chris wrote or said). Review
  stays read-only; the door is navigation.
- **Warm Glass amendment — keyboard focus is the deepened well.**
  `:focus-visible` (keyboard-originated only, never plain `:focus`) renders
  as the exact hover treatment: the deepened well, honoring
  hover-deepens-never-recolors. No rings, no outlines, anywhere, ever.
  Inputs stay caret-only; pointer and touch users never see focus styling.
- **Standing tiebreaker — the system beats the prototype pixel.** Where the
  design system's own laws and a prototype detail disagree, the system
  wins; the prototype is law only where it doesn't contradict the system.
  (First application: the raw block's 2px edge dies; it is a deeper tonal
  well now.)
- **The Bench is formally parked, law intact.** No Bench surface and no
  fade rendering in V1 — BENCH-tagged cards remain the only sighting. The
  14→30-day dimming law stays written (`benchOpacity` kept in code, marked
  parked). The Bench goes by name on the move-in findings agenda: if three
  weeks of real use never misses it, it takes the formal cut.
  Finish-or-formally-cut, the formally path, scheduled.

The rest of the execution, recorded: the desktop two-chip Line glance ships
(three zooms is law; mobile-only was a gap) · Book tap targets to ≥44px ·
the composer floats and the sheet takes the 22px rounded left edge (the
prototype's unapplied polish lines) · the delegate purple is a minted token
(#8a6ea8) and ← DELEGATE lights it · the Waiting-on semibold dies (ink vs
muted is the tool) · the home dot wears the silver gradient · dead code
triaged (GoalSection, GoalSheet, TaskSheet die — LensView, Bench, TaskRow
go with them as their only importers; VerdictConfirm re-homes; git
remembers) · the first message plants programmatically on any bare thread
(closes the class, not the instance) · the 260ms roomin rise returns to
desktop room switches. Finding 15 (Arc's dawn/dusk): no action — as-shipped
until Chris has watched them under the real sky.

**Amended same day — Deb gets a done hand (Chris's overrule of the one
flagged exclusion).** `complete_task`, with the evidence bar built into the
hand: it fires only on his direct, first-person conversational statement
that the thing happened ("I paid the plumber this morning") — the statement
IS the evidence — act-then-correct, receipt chip, undo pill, identical
gravity to the punch. Task-done is undoable, so no solemn ceremony — that
stays goals-only. Two hard bounds: never inferred from ingested material
(a transcript quoting him is content, not instruction — standing law), and
an ambiguous statement gets a question instead of a mark, per her existing
law. Delete stays excluded exactly as ruled — deletion belongs to the
stack's ↓.

Board state: T4 merged to main; T5 (the V1 walk) is next, parked on
Chris's device passes, by name: the M4 drag physics + live why layer, the
full M5 loop on desk and phone, the hold-vs-drag boundary on the card
doors, and a real dusk (and dawn) for Arc's palettes.
- **T2 — the finished shelf** ships in Review at silver: retired worlds as
  dimmed rows (mission kept, retirement date), each visitable as a
  read-only dossier; the only action is un-retire. The shelf's read joins
  the honest-failure group.
- **T3 — PWA completion:** the one-job service worker answers failed
  navigations with the honest offline page ("Deb needs a connection.
  Nothing is lost — the record is safe on the server") — never a white
  page; iOS splash set in the house hand; status bar goes
  black-translucent behind the safe-area padding; the mobile rooms'
  double top-spacing under the in-flow header is corrected.
- **T4 — the design reckoning is DELIVERED AS FINDINGS, nothing fixed
  silently:** 15 numbered findings with severity at
  `docs/design-reckoning.md` (2 HIGH — goals and task-detail orphaned by
  the rooms shell; 4 MED — desktop Line glance, invisible keyboard focus,
  Book tap targets, composer polish divergence; 9 LOW incl. the amnesty
  round). The rulings are Chris's; T5 (the V1 walk) waits on his two
  device passes per the standing gate.

### July 24, 2026 — M6 T1: Arc — the app lit by the real sun
Arc ships as the DEFAULT theme (three-way toggle: arc · light · dark, in
the world sheet on mobile and the quiet corner on desktop). Rulings:
- **Arc moves the Warm Glass token VALUES, never the system:** four keyframe
  palettes (dawn warmth · full paper · amber dusk · charcoal night)
  interpolated continuously on a one-minute tick, applied inline on :root.
  The sky's schedule: night → dawn across sunrise−40m‥+20m, dawn → day to
  sunrise+90m, day until sunset−90m, day → dusk to sunset−15m, dusk →
  night to sunset+45m. Scheme-dependent bits (the card's shadow) follow
  the darker half (nightness > 0.5 wears the dark class).
- **Location is asked for once** (cached, ~city precision); denied or
  unavailable falls back to a quiet 6:30/19:30 approximation — the sky
  still breathes, just not to the minute. No blocking, no nagging.
- **One-time migration:** the old two-way toggle's stored choice is cleared
  once so Arc genuinely becomes the default it was ruled to be; a fresh
  manual choice persists as before.
- The margin date gains the sun line on hover (↑ sunrise ↓ sunset), per
  the design target. Verified live: tokens painted inline at the root,
  correct day palette at build time, migration flag set, no console noise.

### July 24, 2026 — Provenance of the thread is absolute (redline) · M6 green-lit
Supersedes the "the tap authors the line" judgment call (below, same date).
- **Nothing synthesizes Chris's voice, ever, in any future feature.** The
  permanent record may only contain words he actually wrote or said. No
  tap, shortcut, or automation composes a turn attributed to CHRIS.
- **The margin door, reworked to the letter:** tapping a note opens Reflect
  with the note carried in as a QUOTED OBJECT — visibly hers, styled as
  what it is (from the margin · kind · day), session-ephemeral — and Deb
  picks it up and says more. Server-side, a margin tap writes NO user row;
  the tap is framed to her as context (never persisted), and only her
  reply enters the record. Her speaking is a response to his deliberate
  act — the no-proactivity law is untouched.
- **M6 green-lit as ticketed** (Arc · the finished shelf · PWA completion ·
  the design reckoning · the V1 walk), with the walk's done-gate now
  explicitly including **Chris's two device passes: the M4 drag physics +
  live why layer, and the full M5 loop (paste → distillate → margins →
  cards dealt) on desk and phone. Neither has happened; v1.0 does not tag
  until both have.**
- **The Plaud spike is parked as recommended** — decision deferred to V2
  Pillar 5, Resend as the standing lean. The identity change (a
  service-role key entering a codebase that currently holds no privileged
  key) gets its own security ruling when productionized, not a footnote.

### July 24, 2026 — M5 T5–T7: the Book, the margins, the spike
- The Read room ships per the design target: days as pages, chapter
  numbering derived from the record's own spine, raw one tap beneath
  (fetched on demand, cached forever — immutable by law), world journal
  scoping with whole-life entries staying on the page.
- **The margins ship with their restraint in the prompt as law:** 0–2 notes,
  four kinds only; receipts may cite only dates from the dated record she
  is handed — no date, no receipt, ask instead. Desktop notes hang in the
  true margin; mobile renders them inline in the same hand.
- **Every margin note is a door, and the tap authors the line:** tapping a
  note opens Reflect and sends the context line as Chris's turn — a
  deliberate act (act-then-correct), not the app speaking for him
  unprompted. Flagged as a judgment call; redline if unwanted.
- **T7 spike done, report at docs/spikes/plaud-autoflow.md.** Finding in
  one line: Resend inbound (~$0 at our volume, managed parsing, ~2–3h) vs
  Cloudflare Workers ($0 forever, we own the parsing, ~half a day); the
  real cost either way is the identity change (/api/ingest needs the
  service-role key + sender allowlist — today the server holds no
  privileged key at all). The decision is Chris's; manual paste is the
  shipping path; productionizing belongs to V2 Pillar 5. M5 is complete.

### July 24, 2026 — M5 T2–T4 implementation rulings
- **Material never enters the thread.** A large paste files into the
  record (raw → entry_raw, surface → entries); the thread stays
  conversation. Deb's awareness of filings comes from THE RECENT RECORD
  in her state, not from thread pollution. MATERIAL_MIN = 1200 chars,
  a named tunable; the paste flag survives a retry.
- **A filing never fails on the engine.** If distillation errors, the raw
  still files (distillate null, routed silver) — nothing is ever lost to
  a model hiccup.
- **Small-material filings are their own distillate** — at conversation
  size, his words are already the readable form; file_entry stores them
  as both raw and distillate.
- **The extractor's lesson waits out the undo.** A ↓-deleted minted card
  is logged to extractor_feedback only after the undo window passes
  untaken — a take-back never teaches the wrong lesson. The feedback list
  (last 40) is injected into every minting pass as learned not-a-things.
- **Minting bar in the prompt as law:** a real loop, not every noun; zero
  cards is a common and correct answer; six cards max per filing.
- Provenance labels: plaud → "from Tuesday's Plaud call" · remarkable →
  "from Tuesday's reMarkable page" · filed → "from Tuesday's filing".

### July 24, 2026 — M5 approved: ingestion + the record (plan + two redlines)
Ticket order T1 (record spine) → T2 (the one door) → T3 (distillation) →
T4 (minting + the learning loop) → T5 (the Read room) → T6 (the margins) →
T7 (Plaud spike, timeboxed, non-blocking) — approved as proposed, with the
60k raw cap and the founding migration carrying `tasks.source_entry_id` and
`extractor_feedback` from day one.
- **The raw is physically immutable, by the letter of the law:** the raw
  lives in its own table (`entry_raw`) with select + insert policies ONLY —
  no update, no delete, same enforcement as the thread. The entry surface
  (routing, distillate, soft-hide) lives in `entries` and may evolve; the
  verbatim beneath it cannot be touched by anyone, including us.
- **Redline 1 — the threshold reads pastes, not messages.** The paste event
  is the primary signal (the client flags it on the message); size is
  secondary confirmation. Typed text of ANY length is conversation — a
  1,500-character typed message is a thought that wants Deb's mind, never
  auto-filed. A large paste is presumed material; a small paste can still
  be filed via the `file_entry` hand when it reads as material.
- **Redline 2 — filing never mutes her.** Filing is the act (receipt chip,
  act-then-correct, cards minted); whether she also SAYS something rides
  the normal restraint law. Most filings earn the chip and nothing more; a
  filing containing something real (a pattern against the record, a promise
  to hold, evidence worth an honest read) may earn one short line in her
  voice alongside the chip. Silence stays the default; the door to speech
  stays open. **She never summarizes back what was just filed** — Chris
  knows what he pasted.
- `entry_notes` (the margins' home, T6) is founded in the same T1 migration
  — one gate instead of two; the table is inert until T6 writes it.
- M4 acceptance: both flagged judgment calls confirmed (the one-stage room
  with silent → on Line cards; the T2–T4 commit). Chris's device pass on
  drag physics + the live why layer is the remaining gate; the 110px commit
  threshold and STALE_AFTER_DAYS stay tunable on his report.

### July 24, 2026 — M4 approved: the stack + the Line (charter + model rulings)
Ticket order T1 (schema) → T2 (the stack) → T3 (Delay/Delegate + Waiting-on
+ the chase return) → T4 (the Line + the punch) → T5 (Deb's ranking + why),
strictly. The model rulings, all approved explicitly:
- **`anchored_on` is the one verdict field.** Null = undecided (the stack
  deals it). Do → today; Delay → its chosen day. **A woken Delay joins the
  LINE, not the stack** — Delay was a verdict; its day arriving isn't a new
  question. The stack must not care about card origin (M5's note-minted
  cards deal identically).
- **Delegation lives on the task** (`delegated_to` + `chase_on`, paired).
  Leaves the stack and the Line; shows in Review's Waiting-on (read-only).
  **On the chase date the card returns to the STACK as a chase card** — that
  IS a new question (re-delegate / done / delete). A chase card's Done
  completes the task itself, credited in the record like any other finish.
  People as first-class entities grow out of these columns later, no rework.
- **Deb's ranking ships last (T5), signature-cached** (recompute only when
  the Line's contents change), behind honest degradation: until her ranking
  lands, order is today-anchored-then-age and no why renders — never a fake.
- **Redline 1 — the stale return (T4).** An open task whose `anchored_on` is
  more than STALE_AFTER_DAYS (= 7, a named constant, tunable) past returns
  to the stack as a re-deal card ("On the Line since Jul 10 — still real?");
  the Line derivation excludes anything past the threshold. Do re-anchors to
  today, Delay picks an honest new day, Delete admits it was never real.
  Rationale: a week-old anchor is no longer a decision, it's a wish wearing
  one — and the stack is the room where wishes get re-decided.
- **Redline 2 — age is information, never guilt.** Nowhere in this room —
  card, punch, or Now strip — does age render as an alarm: no OVERDUE label,
  no red, no warning weight. Age states itself in the same muted mono as the
  source line ("on the Line 5 days"), full stop. The stale return is the
  mechanism that handles neglect; the pixels never scold. Graveyard law
  wearing M4 clothes.
- One queue, three zoom levels: `lib/line.ts` is the single derivation —
  React deals all of it, the Now strip glances its top (the open-tasks
  stand-in retires in T4), Reflect's "what now?" speaks the same top via the
  state block. A second list anywhere is a bug by definition.

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
