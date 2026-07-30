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

### July 30, 2026 — The parallel session: work built twice · GITHUB IS THE ONLY SHARED SURFACE
**What happened.** A local session on Chris's MacBook built design-reckoning
rulings 1, 2, and 12 — Deb's goal hands, the inline solemn signing, the
generalized card doors, the self-planting first message — and committed them
as `382d492`, never pushed. In parallel, a cloud session built the same
rulings and shipped them as `28a2b30` + `64c5bf1`. **Origin's version won
because origin's version is the one that deployed.** The local commit is
superseded in full; nothing in it is missing from main.

The same session also left ten uncommitted files carrying a partial build of
rulings 4/6/7/10/11 (the purple delegate token, the `:focus-visible`
deepened well, the floating composer, the silver home-dot gradient, the
verdict-scrim removal). Origin already shipped all of it. Six of those ten
files no longer exist on main at all — THE PAPER deleted `Shell.tsx`,
`LensRail.tsx`, `ReactRoom.tsx`, `ReadRoom.tsx`, `MobileHeader.tsx`,
`WorldSheet.tsx`; X1 deleted `sun.ts`. They were edits to a house already
torn down.

**Why it happened — the cause, not the symptom.** A cloud session cannot see
a local commit. GitHub is the only surface two sessions share. Local `main`
sat two commits ahead and **fifty-three behind** simultaneously, and
`git status` says only "ahead by 2" — the reassuring half of the truth. Both
sessions read that and each believed it held the current app.

**What was NOT done, deliberately.** No rebase. Rebasing `3212fee` would
have replayed a duplicate feature commit onto vanished files, and its one
genuine contribution — six mobile design prototypes — touches no source at
all. Its other half deleted seven components; six were already deleted on
main, and the seventh (`VerdictConfirm.tsx`) is still imported by
`Reflect.tsx` inside `Paper.tsx` and would have broken the build. The
correct operation was never a merge.

**What was done.**
- Everything — both commits, the ten edits, seven older scratch prototypes —
  archived intact to the pushed branch
  **`abandoned/local-parallel-2026-07-30`** (`d07e123`). It is never merged.
  A stash is local and invisible; a pushed branch is permanent and visible
  to every future session, and costs nothing.
- `main` reset to `origin/main` — the one authorized `reset --hard`, and only
  because the archive was already confirmed on the remote first.
- Six prototypes lifted across byte-identical as `b4e8855`; the diff against
  `bad1d86` is six static files and zero source lines.

**THE STANDING LAW, born here: GITHUB IS THE ONLY SHARED SURFACE.**
Work that is not committed and pushed does not exist to any other session.
Every working session ends with everything committed and pushed, or
deliberately archived to a branch — never with unpushed commits and never
with a dirty tree. **Corollary:** before starting work anywhere, fetch and
confirm local `main` is not behind. "2 ahead" while silently 53 behind is
exactly how one ticket gets built twice. Any future session that opens onto
a dirty tree enforces this out loud, before doing anything else.

**The escape hatch, tested — and a prediction that was wrong.** This session
claimed `git revert -m 1 bad1d86 85378a1` would fail because `bad1d86` is not
a merge and `-m 1` errors on non-merges. **It does not.** git 2.39.5 applies
the mainline flag only to the commits that are merges and reverts the rest
normally; the original one-liner runs clean, exit 0. The claim was asserted
from memory instead of tested, and testing is what caught it. Chris's command
stands, unchanged.

What the test DID find is a real hazard nobody had predicted: run from
today's `main`, "undo everything" **conflicts on `DECISIONS.md`, and only
`DECISIONS.md`** — every line of code reverts clean. The log is append-at-top,
so every ruling written after July 30 sits exactly where the X1/R2 entries
are being removed. **This recurs forever, and gets likelier with every entry.**
`docs/ESCAPE.md` now carries the one-line resolution (`--ours` — undoing a
build never erases the record of having built it) and `--no-edit`, so a
panicking founder is never dropped into vim. An untested escape hatch is a
superstition; this one is tested, and it was wrong in a direction nobody
guessed.

### July 30, 2026 — The token taxonomy · the mark-as-text audit · D1 cut
**The floors apply to TEXT tokens only.** Writing them as if they applied
to every token was a category error — it made decorative colors look like
failures. The taxonomy, recorded because it will come up every time a
token is added:

| class | tokens | rule |
|---|---|---|
| **TEXT** | ink · muted · dim | must clear the floors vs paper: ink ≥7:1, muted ≥5.5:1, dim ≥4.5:1. **Live values win** (13.84 / 6.29 / 5.14); the prototype's hex list is discarded for these three. |
| **SURFACE** | paper · well · well2 · hairline | never measured against text floors. Must only be reliably DISTINGUISHABLE — asserted as a perceptual separation, **ΔL\* ≥ 1.5**, measured on the wells AS RENDERED (they are rgba over paper, not flat hexes). |
| **MARK** | silver · gold · the six world colors | decorative. Not measured at all. |

`src/lib/contrast.test.ts` encodes all three tiers, so it stops
over-constraining. WCAG luminance is not perceptually uniform — the same
visible step measures 0.076 on paper and 0.009 on charcoal — so surface
separation uses CIE L\*, where one threshold works for both schemes.

**THE MARK EXCEPTION, and the audit it demanded:** a mark token rendered
AS TEXT is, in that use, a text token and must clear 4.5:1. Audited July
30 — **and it is a real bug, currently shipping:**
- `--t-accent` is silver at home and **the world's color in a lens**, and
  it is used as a text color in 16 places (lens name, note kinds, counts,
  "deb", the ✓, brief lines, the undo pill's action).
- Silver at home is fine: **#656a71 = 5.14:1**.
- World colors as text are not. Of the prototype's six: CTDI 3.68 · ISO
  4.08 · Fam 3.71 all **fail**; Subseven 4.79 · Poplar 5.00 · Cribl 5.18
  pass. `TriageFocus` also renders the world NAME in `world.color`.
- Worst of all, world colors are **user data** — `randomProjectColor()`
  can produce a default as low as **1.33:1**.
- Not yet fixed: the fix changes visible color and belongs to Chris's
  ruling. The proposal is a derived `--world-ink`, clamped to 4.5:1, used
  only where the world color renders as letterforms — colors that already
  pass render unchanged.

**D1 — CUT, NOT STARTED (by ruling):** reconcile SURFACE and MARK tokens
to the prototype (design law), leave TEXT tokens at the live values that
pass, and report before/after of the Record and the masthead so the change
can be ruled on. Text tokens are settled above and are out of D1's scope.

**Theme, settled:** it follows the system; there is no user-facing
control and none is to be added. The OS already knows the preference.
`theme.ts` is now only a migration that clears preferences left by the
old three-way toggle so nobody stays pinned to a mode they can no longer
change.

### July 30, 2026 — The distillate is a distillate (spec + hard ceiling)
**The bug:** a reMarkable page rendered as ~200 words of near-verbatim
re-flowed prose in the distillate slot, eating the whole column. The
cause was in the prompt, in writing: step 2 said *"this is a
distillation, not a summary: it may be long if the material earns it."*
That sentence is gone.

**What a distillate is — spec, not vibe. EXTRACTIVE, NOT ABSTRACTIVE.**
It is assembled from Chris's OWN phrases, selected and trimmed, and never
contains a sentence he did not write. No invented sentences, no new
facts, no editorialising, no third person. Phrases from different parts
of a page join with " · " or " — "; ellipsis never appears. **Deb's
reading of the page goes in her NOTE, never in the distillate** — the
note is visibly hers, the distillate visibly his, and the two are never
blurred. Target shapes: DAY-OPEN (the prayer/gratitude fragment + the
stated goals) · DAY-CLOSE (what happened + what's carried) · MEETING
(who + the decision or ask) · DUMP (the two or three load-bearing
phrases). The bar is the locked prototype's 24 words covering a full
page.

**The ceiling is enforced in code, not requested in the prompt:** 240
characters AND 36 words, whichever binds first, measured after generation
and before persist. Overrun behaviour, in order: (1) one regeneration at
a tightened budget with the overrun stated back to the model ("you
produced 210 words; the ceiling is 36"), (2) still over → a deterministic
extract from the page itself — its first complete sentence plus its
stated goals line when parseable, (3) never a mid-word truncation, never
an appended "…", never a persisted overrun. **Every path logs which one
fired**; path 3 firing regularly means the prompt is wrong, and that
should be visible in the logs rather than on the page.

**Provenance is tested, not hoped for.** `api/_lib/distill.test.ts`
asserts phrase-level provenance against a fixture page: every content
word of the output must trace back to the page. A distillate containing
a sentence Chris did not write fails the build.

**The raw doesn't go away, it goes behind.** The full page stays one tap
away, byte-identical. The raw well caps at ~40vh with a soft
paper-coloured fade and a single affordance — READ THE PAGE — with no
scrollbar inside the well. Display only; nothing is ever destroyed.

**No entry owns the column.** A collapsed entry's distillate is clamped
in layout independently of the ceiling — entries filed before this ruling
still hold long text, and one entry filling the column is a layout bug
regardless of how good the summary is.

**A provenance leak, fixed in the same pass:** a source subject
("Document from my reMarkable: 5. July") was rendering in italic quotes —
the styling reserved for Chris's own words — which implied he wrote a
machine-generated email subject. Source subjects now render as mono at
label scale, in dim: metadata, not voice.

*Flagged, not built:* the same ruling asked for day-first datelines
("5. July") to be added to "A2's reader". **No such reader exists** —
nothing in the codebase parses a date out of page content. `entry_day` is
the app-day the material arrived (the received-day rule approved with the
email chute). Stood down July 30: A2 is a ticket not yet filed, and
nothing about content-dated filing is in scope until it lands. The
styling fix was the right and only move.

**Forward note for A2 (asked and answered July 30):** the two-date model
— ARRIVED immutable, DATED driving filing, same-day merging keyed off
DATED — has **no structural blocker** in the current entry model.
`entries.created_at` and `ingest_log.created_at` already hold ARRIVED
immutably (the ledger is append-only by RLS), so A2 adds a nullable
`dated` column and repoints the filing day; no data is lost or rewritten.
Three consequences to decide *inside* A2, not after:
1. **The edition number** ("No. N" = days since the record began) reads
   the earliest entry day. If DATED drives it, back-dating an old page
   retroactively changes today's issue number. It should almost certainly
   key off ARRIVED.
2. **The brief and "today, in your words"** are built from the words of
   the drop being filed. A back-dated page must not drive today's brief —
   the brief should stay on ARRIVED/app-day while the page files to DATED.
3. **Version merging on DATED** means a page dated three weeks ago merges
   into that old day's entry rather than today's — correct for the model,
   but it means a drop can silently change a page well behind the current
   one, so the undo pill's copy needs to name the day it grew.

### July 30, 2026 — ARC REMOVED (reversal of the July 27–28 Arc rulings)
**Arc is cut — not deprecated, not feature-flagged. Removed.** This entry
is a REVERSAL, kept beside the rulings it overturns: the Arc entries of
July 27 (M6 T1) and July 28 (the legibility rebuild) describe a system
that no longer exists. They stand as the record of what was built and
why; this entry stands as the record of why it went.

**What Arc was:** the app lit by the real sun — four keyframe palettes
(night · dawn · day · dusk) interpolated in OKLCH, with every text token
re-derived each tick to a fixed contrast floor against the current
surfaces, plus a 24h × 1-minute sweep test (~104k assertions) proving no
minute of any day fell below the floors.

**Why it went — cost, not taste.** Safari reloaded the page for
excessive energy use. Profiled before removal (July 30):
- `setInterval(tick, 60_000)` ran for the entire session, always, for
  every user — Arc was the DEFAULT theme, and after the Paper landed
  there was no UI left to turn it off.
- Every tick recomputed the palette unconditionally, never checking
  whether a keyframe boundary had been crossed. Through the whole DAY
  phase it re-derived a bit-identical result ~600 times a day. Measured:
  114 µs/tick steady, 535 µs/tick interpolating — the JS itself was
  cheap.
- The real cost: each tick wrote 12 CSS custom properties onto
  `documentElement`. Custom properties on `:root` are inherited by every
  element, so each write invalidated style for the ENTIRE document, and
  `body` carries a 350ms `background-color` transition behind two
  full-viewport fixed radial-gradient layers. Every 60 seconds, forever,
  an idle page ran a full-document recalc and a 350ms full-screen
  composite. With a very tall entry mounted the recalc covered a much
  larger tree — which is how it surfaced.

**Time-of-day theming is out of scope for v2.** If it ever returns it
must be event-driven (a timeout to the next boundary, not a poll),
must not touch `:root` variables on a schedule, and must be provably
free when nothing is changing.

**What survives — these were never Arc:**
- The Warm Glass palette, now plainly STATIC in `src/index.css`
  (light + dark), and the world colors, untouched.
- **The contrast floors**, converted from a swept runtime invariant to a
  static build-time assertion: ink ≥ 7:1, muted ≥ 5.5:1, dim/eyebrow
  ≥ 4.5:1 against the paper of their own scheme. `src/lib/contrast.test.ts`
  reads the REAL tokens out of index.css (no second list to drift) and
  checks every block that defines a paper — light, system-dark, and the
  explicit `.dark` override. Edit a token below its floor and the build
  fails. Legibility by construction survives; only the sun goes away.
- The theme is now light · dark with SYSTEM as the default; a stored
  `'arc'` preference migrates to system on next load.

### July 29, 2026 — The page slot · the channel law, full triptych
**The channel law, recorded whole: the composer converses · email
files · the page slot files.** Anything needing her engagement goes
through the composer, always.

The page slot: a one-line, near-invisible well in the record column's
furniture — dim "Drop a note onto the page…", expanding a few lines on
focus (caret only, per law). Paste or type, ⌘Enter files it with
quiet-channel semantics: material through the standard engine (routing,
distillation, margins, answers, minting, versioning against the living
day-entry), spoken_in = the current lens, no conversational engagement
— the in-app equivalent of the email chute, not the composer. The
entry materializing under TAKEN DOWN is the receipt, the standard undo
pill the take-back. Arrivals logs it (entry source `filed`; the
ledger's FROM column names the page slot). Today only — an archive
page takes no drops. Mobile: same slot, same place; the bottom
composer bar untouched.

**The slot never grows buttons, attachments UI, or options.** It is a
slot, not an import screen — the moment it wants chrome, it is
violating the one-door spirit and gets cut back.

*Fence note:* the Paper fence (presentation only) was deliberately
crossed by two additive lines: `FilingOpts.ledgerFrom`, so a mouth with
no envelope can name itself in the ledger, plus the new `/api/file`
endpoint — the third inlet consuming the one throat under the user's
own JWT. One throat, forever; the engine's behavior is unchanged.

### July 29, 2026 — FINISHED moves to the center column (Paper re-ruling)
The center column reads top-to-bottom as the **obligation lifecycle**:
THE VERDICTS (undecided) → TO DO (decided, standing) → FINISHED (done,
with times). Today's completed tasks render under TO DO, not at the
record column's foot. A done-circle tap moves the row from TO DO to
FINISHED with a quiet settle — same row grammar, checkmark, muted —
undo pill intact.

The record column drops its FINISHED section **for today only**. The
archive keeps the whole day: a past day opened via EARLIER includes its
finishes — a past page has no live center column to defer to, and the
record's completeness law (Read is the scroll of the life) outranks
today's layout. The day's dealings colophon is unchanged.

Ticket homes adjusted: FINISHED-in-center belongs to P5 with TO DO;
P2 builds the record column without today's finishes but with the
past-page inclusion.

### July 29, 2026 — The Paper: cut approved (P1–P7) · the seven flags ruled
Chris approved the seven-ticket cut. The flag rulings, now law:
1. **Shadows** — the focus layer is the sheet family and inherits the
   sanctioned shadow, NARROWED to surfaces that genuinely float: the
   triage card, the conversation sheet, the choosers, the undo pill.
   Small furniture riding those surfaces (back buttons, verb pills,
   labels) stays flat wells. Fewest shadows that sell the elevation.
2. **Elevated surface** — never `#fff`; a token-derived elevated surface
   Arc can repaint (`--t-card` family).
3. **THE DAY renders as absence** — no empty scaffold, no placeholder.
   The section does not exist until the calendar pillar lands in V2.
   The page never shows a placeholder for a feature that isn't real.
4. **EARLIER** — the record pages back a day via a quiet mono door in
   the record column's furniture, same grammar as the Arrivals ledger.
5. **Enter finishes in triage, no new visual.** The law that makes it
   coherent: for chase cards ✓ was always a first-class verdict ("it
   came back done"); for ordinary cards Enter is the keyboard-only
   admission that the thing already happened between capture and
   triage. Both are verdicts — triage's jurisdiction still ends at the
   verdict; nothing is being dealt to do.
6. **World status recolors never** — "QUIET 6 DAYS" renders in the same
   muted mono as everything else. The word carries the information.
7. **The chooser slider opens at 3** (supersedes the July 29 default of
   2) — it matches the "in 3 days" preset's center of gravity.

**The issue number is time, not performance:** the masthead's "No. N"
is a pure edition count — days since the record began, incrementing
unconditionally whether or not a page was written that day. A
days-with-pages count is a streak wearing a monocle; the graveyard
takes it.

### July 29, 2026 — THE PAPER: the V2 shell. One page, two focus states
**The four-rooms shell is superseded.** The app becomes one page — The
Paper. No rooms, no tabs, no navigation. Masthead (date · epigraph ·
world dots · Arrivals chip) · left column THE RECORD · center THE
VERDICTS + TO DO · right DEB the columnist · THE WORLDS below the fold.
Two focus states: **CONVERSATION** (engaging the composer, her column,
or any door → the page recedes, the thread takes the stage at full
measure) and **TRIAGE** (engaging the seam → the card deals
center-stage). The four verbs survive as zones and states of one
surface; their functionality is untouched. Mobile is the same paper
stacked into one scroll, same focus states.

**The spec is the prototypes** — `docs/design-target-v2-desktop.html`
and `docs/design-target-v2-mobile.html`, committed as law. Layout,
spacing, type scale, motion, copy registers, and interaction
choreography come from those files, not from prose. They are reference
implementations, not source: mine them for exact values, reproduce in
the real architecture, never transplant prototype code. Where a
prototype detail contradicts a standing law, the law wins (flagged);
everywhere else the prototype wins. Where dummy-data behavior and the
real engine differ, the engine's law wins and the prototype's
choreography wins — collisions get flagged. The V1 design-target is
superseded (noted in its header, kept as record).

**The fence:** this migration touches presentation only. Untouchable:
everything under `api/`, the filing engine module, her tools and
prompts, the migrations, `lib/line.ts`'s derivation, the thread-scoping
law's storage, RLS, the caches. All existing tests stay green and
UNCHANGED throughout — a test edit means the fence was crossed; stop
and flag. New tests cover new derivations only.

**The epigraph — words, not state:** the morning goals already
extracted for the brief surface as one italic line under the date.
NOTHING may ever check, score, or strike the epigraph. It is his words,
reprinted — not a tracker. The columnist column is likewise a read of
existing thread data (the brief + her latest remarks), never new state.

**The working method (the safety rail):** built on branch
`claude/the-paper`; Vercel's preview deployment for that branch is
where Chris lives during the migration. Main stays the current app,
untouched, until he has lived in the Paper on preview — mornings,
verdicts, drops — and says "merge." **No partial merges to main, ever,
during this work.** Ticket cut proposed and approved before shell code;
each ticket leaves the preview walkable end-to-end.

### July 29, 2026 — The chooser's third row: a slider, not a calendar
**Replace, don't repair:** the delay and delegate choosers' fixed-date
field dies. In its place, a 1–5 day slider — quiet Warm Glass track, no
ticks screaming, thumb snaps to whole days, the row live-previewing the
resolved day as it moves ("chase in 2 days · AUG 1", same mono).
Drag-release commits, the same one-pause-deep cadence as the presets;
arrow keys nudge and Enter commits, matching the room's keyboard
grammar. The two presets above stay exactly as they were — the
no-thought path; the slider is the five-second path.

**The deliberate long-tail:** anything beyond five days out belongs to
the conversation — "chase Karthik in three weeks" — and Deb's delegate
hand takes any date. The chooser covers the near week; the conversation
covers the calendar.

**Flag, resolved in the same ticket:** the ruling's premise fought the
code — Deb had NO delegate hand (update_task did rename · re-home ·
goal · anchor only). The long-tail home had to exist before the date
field could die, so `update_task` grew `delegate` + `chase` (any date,
computed from his words; "none" takes it back on Chris; stamps
`delegated_on`; act-then-correct with the full undo).

### July 29, 2026 — Cards carry their receipt
At minting time the extractor captures the **source excerpt** — the
sentence or two from the material that justified the card, VERBATIM,
capped at 200 characters — stored on the task beside `source_entry_id`.
**Captured at mint, never re-derived**: the excerpt is a fact about why
the card exists; it doesn't drift as the entry versions.

Card anatomy grows one element: beneath the title, the excerpt as a
short quoted passage — italic serif, muted, visually the card's "raw" —
with the source line as its attribution ("from Tuesday's Plaud call ·
JUL 29"). The source line becomes a **door**: tap opens Read on that
entry, at that spot, for the full surround (the book jump now carries
the entry, and Read scrolls to it). Chase cards carry their own
receipt: who it was handed to, when (`delegated_on`, stamped at
hand-off), and the original excerpt.

**Restraint rule, recorded:** conversation-born cards show NO excerpt —
the title is the sentence; quoting it back is noise. Only material-born
cards (plaud / remarkable / email / filed) carry the receipt. An excerpt
that would exceed the card's calm truncates (3-line clamp), the door
carrying the rest. The standing Line list gets NO excerpts — those rows
stay one line each; the receipt's home is the card at verdict time,
where the decision happens.

Migration `supabase/2026-07-29_card_receipts.sql` (source_excerpt +
delegated_on) gates the deploy per the standing discipline.

### July 29, 2026 — React deals questions, never answers · the Line stands
**React is a triage pile, not a to-do list — its jurisdiction ends at the
verdict.** The dealt stage for Line cards is retired: it wasn't a rhythm,
it was a category error. A verdicted card returning to center stage
produced "wait, didn't I decide this?" — the feeling was the bug. The
stack deals only what needs a verdict (fresh · chase · stale re-deals);
when it runs dry, the sentence is the state, full stop. The Line is where
decided things stand; the day is where they get done.

The Line renders as a **standing list** at the room's edge:
- Desktop: right side, under the N ON THE LINE counter. Each row a quiet
  tonal well — world dot + title in sentence case, age in muted mono
  ("on the Line 2 days"), her ≤12-word why in the small italic serif on
  the **top card only** (it's her answer to "what now?"; a why on every
  row is noise). Order is the Line's order — her ranking.
- A done circle on each row: tap completes with the standard undo pill,
  the same gesture the Now strip taught. The row is a door per the
  standing law (long-press / right-click → Reflect, task on the table).
- **No drag-reorder, no editing in place** — the list is read-and-done;
  changes happen by telling Deb.
- Mobile: the right rail doesn't exist, so the N ON THE LINE counter
  itself is the door — tap opens the Line as a standard sheet, same rows,
  same exits per sheet law.

The three zoom levels survive, re-dressed: Deb speaks the top · the strip
glances the top · React shows all of it, standing, at the room's edge.
Completing the last Line item earns the room's full quiet — both empty
states resolve to the one sentence, never confetti, per the graveyard.

### July 28, 2026 — The Arrivals ledger: observability for the mouth
The filing engine gets a ledger: everything that ever arrives — the
composer's paste, the chute's mail, any future mouth — leaves a row in
`ingest_log` (when · from · what · outcome), **including what the door
turned away**, with the rejecting address shown. The outcome column is
load-bearing: filed (world dot + tag) · grew today's page · couldn't
read · dropped — sender not allowed · dropped — bad signature, in plain
warm sentences, never codes.

The laws:
- **Append-only by RLS**: select + insert, deliberately no update and no
  delete policy — a log that can be edited isn't a log.
- **Rejected mail logs metadata only** (sender, subject) — never body
  content. A bad-signature drop logs the bare fact alone.
- The **engine logs its own successes** (filed / versioned) for every
  mouth; each inlet logs its own drops. Logging is best-effort — a failed
  ledger line never breaks a filing.
- Surfaced as a **quiet mono ARRIVALS door in Read at silver**, in the
  page furniture, opening the standard Sheet (standard exits). Last 30
  days by default, a quiet "earlier" reach-back, honest failure state.
- **Read-only is law**: no actions in the surface except the doors —
  every row whose entry survives opens the book on its day. Fixing an
  allowlist stays where config lives.
- No counts, no badges, no unread-dots — it's a ledger, not a to-do
  (graveyard rules apply here as everywhere).

Migration `supabase/2026-07-28_arrivals_ledger.sql` gates the deploy per
the standing discipline.

### July 28, 2026 — The email chute pulled forward · the security ruling · one throat forever
**Pulled ahead of v1.0 by deliberate re-ruling** (supersedes the same-day
"first post-v1.0" sequencing): ritual friction confirmed on day one of
real use — the sequencing evidence bar was met. Cut E1–E6 approved. The
shape: one private inbound address on Chris's domain → Resend inbound →
`/api/ingest-email` → the same filing engine the composer uses. A second
mouth feeding the same throat; channel semantics per standing law —
file, chip at silver, silence.

**The security ruling — the first privileged key enters the codebase:**
- The service-role key is used by `/api/ingest-email` ONLY — never
  imported anywhere else. The invariant is documented at the import site
  and here.
- Defense in depth, all layers required: Resend webhook signature
  verification (unsigned/invalid rejected outright) · a hard sender
  allowlist (config, editable) · an unguessable local part on the address
  itself. Anything failing any layer is dropped and logged — never
  processed, never bounced (a bounce confirms the address exists).
- Under the service role, RLS guards nothing: every write stamps the
  owner explicitly and every read scopes to the owner, in code.
- This inlet triples the content-never-instructions law — strangers can
  technically mail it. Email-sourced material gets the hardened framing
  variant, mandatory.

**One throat, forever (the extraction ruling):** the filing engine is a
shared module (`api/_lib/filing.ts`) with explicit ownership on every
write. Any future inlet — voice, calendar, people-cards — consumes it. A
second pipeline is a bug by definition.

Resolutions, approved same day: source is SENDER-MAPPED (Plaud sender →
`plaud`, reMarkable → `remarkable`, all else `email`; the channel lives
in source_meta) — provenance labels are the tiebreaker over channel
purity · allowlist/address/secrets are env config, no settings UI (a
settings surface is move-in-findings material if ever) · owner resolved
from INGEST_OWNER_EMAIL at runtime, nothing hardcoded · unpdf for PDF
text, image-only PDFs take the honest couldn't-read state (visible in
Read, never a silent drop) · silent signature-gated brief refresh on
email day-entries · the chip at silver IS the filed object (spoken_in
null renders at silver under the thread law — two laws meeting, zero new
surface) · refile_entry moves open minted cards, finished ones stay
(credit lives where it was earned) · same-day version matching is
source-agnostic (the noon email grows the dawn page) · app-day is the
received day in Chris's local timezone (INGEST_TZ); the raw carries the
email's own dates for her receipts · easy always, as law: zero required
conventions — a subject world-name is honored as a routing hint, never
required; a bare forward with an empty body works · genuinely-unsure
routing files at silver with her margin QUESTION on the entry (a door;
Chris re-homes by answering — her refile_entry hand acts on it) ·
idempotency by Message-ID, enforced by the database.

### July 28, 2026 — The mark, final form: "d." with the dawn period
The sunrise as punctuation. Upright Fraunces at the mark's own axes —
opsz 144 / wght 500 / SOFT 60 / WONK 1 — the whole "d." unit rotated 2°
counterclockwise. The period drops silver for the DAWN gradient: rose
`#cd735a` at the rim to warm gold `#eebe78` at the offset highlight
(dark variant slightly brighter, to `#f0c37d`). Light on paper, dark on
charcoal; full set regenerated from the instanced face — icons,
maskable, favicon (embedded outlines, dark via media query), all
splashes. **Silver stays the in-app home-dot accent, unchanged** — the
dawn belongs to the mark. (Supersedes the same-day silver-period mark;
the OFL face for these axes is kept beside the generator.)

### July 28, 2026 — The daily ritual batch: five rulings (cut R1–R6 approved)
Ingestion reshaped around Chris's actual day: morning pages + goals on the
reMarkable at dawn, notes dropped mid-day to discuss, a written close-out
at night, one reMarkable page per day growing across drops. Amends the
parked V1.5 brief spec; all of it rides the work branch.
1. **The brief follows the pages.** No longer generated on first open — it
   generates as Deb's response to the morning drop: pages in, brief back,
   in the thread as her reply AND pinned atop Read's today page (one
   derivation, two zooms — the Line's law applied to the brief). Before
   any drop, today's page opens with one warm line: "Drop your morning
   pages and I'll build the day around them." Hard rails, graveyard law:
   an invitation, never a lock — "brief me" before pages gets her reason
   once (session-ephemeral: the thread itself is the only memory of
   having said it); "no pages today, brief me anyway" gets a spine-only
   brief with zero friction; a skipped day is never referenced afterward —
   no streaks, no state, no guilt. The brief gains "today, in your
   words": his written goals from the morning entry, her notes where the
   record has something to say. **The gate exists because the brief is
   honestly better informed after the pages; the moment it becomes
   pressure-shaped rather than accuracy-shaped, it reverts to open
   generation.**
2. **Channel semantics — chat converses, email files.** (Supersedes the
   composite-message ruling, dead; amends M5's filing-earns-silence
   default for the chat channel.) Anything dropped in the composer is
   conversation: it files as material exactly as built (filed object,
   distillation, minting) AND she engages it like any message — her
   honest take, questions, pushback; never a recital of what it says.
   "Just dropping this for context" or equivalent → chip only, restraint
   restored (her existing silence choice is the mechanism). The
   inbound-email chute, when it ships, is the quiet channel by nature:
   file, chip, silence.
3. **The living day-entry — the day has one page; drops grow it, never
   duplicate it.** A same-day filing that substantially contains an
   existing entry's content is a new VERSION: raw snapshot appended to
   entry_revisions (every version kept — immutability law), distillate
   and margins refreshed against the whole, cards minted only from the
   delta — no duplicate loops, ever. Matching is fuzzy containment, not
   exact prefix (handwriting conversion varies): deterministic
   length/overlap screen first (0.6 version / 0.25 new-entry, named
   constants, tuned at move-in), model judgment only in the ambiguous
   band; genuinely unsure → separate entry, merged by saying so. Read
   renders the current version as one living page; priors reachable
   beneath, raw-under-distillate style. Undo on a version drop restores
   the prior version, never deletes the entry.
4. **The fifth margin note: THE ANSWER.** Questions in his notes are
   found on ingest (question marks as the deterministic screen, model
   judgment for implicit interrogatives) and sorted into three species:
   answerable → a margin note of kind ANSWER beside the question,
   labeled per the honesty ladder (FACT with dated receipt / JUDGMENT
   CALL / OPINION) — a fabricated margin answer is the gravest possible
   violation of the receipts law; actually-a-loop → the minting engine
   deals it as a card, no duplicate note; honestly unanswerable → the
   margin says so plainly, optionally offering to hold the question.
   **Restraint scope clarified: the 0–2 margin limit governs her
   unprompted notes; questions are prompts — every detected question
   earns its answer, its card, or its honest can't.** Channel behavior
   follows ruling 2. Answer notes are doors — question and answer on the
   table. An answer resolving an open loop is not evidence the loop's
   task happened; the evidence bar stands.
5. **The inbound-email chute is first post-v1.0 work** (Resend lean per
   the spike doc; the service-role security ruling is due at build, not
   as a footnote). One address; reMarkable and Plaud both feed it; same
   filing engine, `source` marking the channel.

Approved judgment calls, same date: the day starts when the pages arrive
(no clock — a 2pm first drop births the brief at 2pm) · reason-once is
session-ephemeral only (she may repeat herself; the app never remembers
his behavior) · her engagement pass reads the distillate + a capped raw
excerpt (the record holds every word so she doesn't have to) · a version
drop's evidence at the site is her reply plus the living object updating
in place (the filed object stays at its first moment — one page, one
object).

### July 28, 2026 — The thread law: one mind, one record; display scoped by where words were spoken
Chris's call, overruling the folded-passages recommendation (both
recorded, per the log's habit of keeping reversals honest).
- **Display scoping.** The silver thread shows only whole-life dialogue —
  exchanges spoken at silver. A world's thread shows only exchanges
  spoken in that lens. No interleaving in either direction, no folds, no
  dividers. Storage untouched: one `messages` table, one history, one
  mind — a rendering law, not a data change.
- **Words live where they were said.** A message spoken at silver stays
  at silver even when its subject belongs to a world; no message ever
  migrates on content — where you said it is a fact, and the record keeps
  facts. Filed objects follow the same rule: the object renders in the
  thread where the paste happened (`entries.spoken_in`, recorded at
  filing; pre-ruling rows carry no such fact and stay at silver — the
  record does not invent facts), while the entry itself lives in Read
  wearing its routed world, as already built.
- **One mind is untouched — the acceptance test.** Context assembly stays
  whole-life in every lens: memory, goals, the Line, the full thread.
  Asking at silver about a world's exchanges gets her instant, specific
  answer even though those exchanges display only in that world's thread.
  If scoping the display ever narrows her knowledge, that is a bug
  against this ruling.
- **Doors land in their object's world.** A margin note, goal, or card
  door opens Reflect in the world its object belongs to (silver for
  whole-life objects; a retired world's goals talk at silver), quoted per
  provenance law — and her reply lands in that thread.
- **The day's dealings** — the piece that makes Read the scroll of the
  life: each day's page closes with a quiet derived ledger of what that
  day's conversations and verdicts actually did (finishes, additions,
  goal verdicts), one line each, world dot + mono tag, each line a door.
  Read-only, zero maintenance, a colophon not a dashboard; a day of pure
  conversation still leaves its story in the Book. Rides with the V1.5
  brief work (the evening face of the same day page). Scope note:
  anchor/delegation verdicts and mission-set carry no timestamps in the
  schema, so the ledger lists what is honestly derivable — and it never
  lists what DIDN'T happen (no missed-anchor lines: the graveyard law
  outranks completeness).

### July 28, 2026 — The room grammar, completed: Reflect is present tense, Read is past
Reflect is where you talk; Read is where you scroll. The thread was never
the biography — the Book is ("I can scroll my life in Read, can't I?").
The one-conversation law survives as what it always really meant: one
mind, one relationship — while the display is honest about registers.
Scrolling the life is Read's job, made fully true by the day's dealings
above.

### July 28, 2026 — Arc rebuilt: legibility by construction (bug fix + architecture ruling)
The 5:53am screenshot was finding 15 answering itself — text keyframes
interpolating independently of surface keyframes collapsed contrast at
states nobody ever inspected. Four rulings, executed:
- **Readable is not a palette attribute; it is a constraint the system
  enforces at every interpolated state.** Arc keyframes SURFACES only
  (background, wells, card, bloom). Every text token is pushed, at every
  tick, to a fixed floor against every surface it can sit on — the wells
  composited over the background and the white card included: ink ≥ 7:1,
  muted and the eyebrow ≥ 4.5:1, the accent's text-bearing uses (and
  ok/bad) ≥ 4.5:1, placeholder ≥ 3:1 (it rides the dim token, so it lands
  at 4.5 for free). No sky state can produce the screenshot again.
- **The discovered theorem, now law:** against a background of mid
  luminance (≈0.09–0.32) NO text color of any kind can reach 7:1 — so the
  surface path itself must step across that band, never linger inside.
  The gate moves bg and card in lockstep (a split would demand two
  opposite inks at once); the standing 350ms background transition
  smooths the one step into a quick brightening.
- **Interpolation runs in OKLCH** (hue on the shortest arc) — the
  gray-green wash was RGB blending detouring off the warm path.
- **The sweep lives in the suite:** the full 24-hour cycle at one-minute
  steps, both solstices plus the no-location fallback, every token
  against every surface (~104k assertions). A failing minute fails the
  build — illegible can't compile. *(Latitude 40.7°N stands in for
  Chris's until he supplies one; the schedule is sunrise-relative, so the
  sweep covers the same palette states regardless.)*
- **Dawn and dusk rebuilt on the warm axis** (warm paper faintly
  first-lit / last-lit, near the day palette; the rose and gold live in
  the BLOOM, never the text) — awaiting Chris's mood pass under the real
  sky, which can no longer approve anything illegible.

Flagged consequence, accepted into the stylesheet: the ruled floors moved
the approved LIGHT values — dim (was 3.0:1 vs the white card), silver
(3.2:1), and ok (3.7:1) darken to their floors, and index.css is synced so
manual light equals Arc's noon (one system).

**Same day, Chris's call — the floors separate so the hierarchy stays
real:** ink 7:1 · muted 5.5:1 · dim and the eyebrow 4.5:1. Floors are
minimums, so separation costs no legibility; hierarchy by hue alone is
too subtle on warm paper. Targets updated, sweep re-run, manual light
re-synced. The 40.7°N sweep latitude stands (he is near that parallel);
exact coordinates arrive only if the margin's sunrise line should be
to-the-minute — nothing else hangs on it.

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
*(Generation re-ruled same day by the ritual batch, above: the brief
follows the pages — drop-driven, never on-open; the rest of this spec
stands.)*
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
