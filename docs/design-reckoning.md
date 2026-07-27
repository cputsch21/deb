# The design reckoning — M6 T4 findings
*July 24, 2026 · Audit of every surface against the design law (Warm Glass +
the design target + the dated rulings). Findings only — nothing fixed
silently; the rulings are Chris's. Includes the amnesty round: things
noticed and left alone during M4–M6.*

> **Ruled July 27, 2026 — all fifteen; 1–14 executed, 15 deliberately
> untouched.** The rulings live in `DECISIONS.md` (which always wins);
> these findings stand as the audit record.

**Severity: HIGH = functional gap or law breach with real cost · MED = law
tension needing a ruling · LOW = divergence or debt, cheap either way.**

1. **HIGH — Goals are orphaned in the rooms shell.** The M1 goal surfaces
   (GoalSection, GoalSheet, and VerdictConfirm — the app's one solemn
   confirm for done-forever/dropped-forever) are mounted nowhere since the
   shell landed. Goals cannot be created, edited, or resolved in any room:
   Review shows them read-only by law, React deals tasks only, and Deb has
   no goal hands. The "finishable outcomes" spine is display-only in V1.
   Needs a ruling on where goals live now (Deb grows goal hands in
   Reflect? a goal door somewhere that respects Review's read-only law?).
2. **HIGH — Task detail is likewise unreachable.** TaskSheet (rename,
   re-home, goal assignment) isn't mounted; the only task mutations left
   are verdicts and the punch. A typo in a task title is permanent short
   of delete-and-recreate. *(Amnesty: noticed during M4, left alone.)*
3. **MED — Desktop Reflect lacks the Line glance.** The one-queue law gives
   Reflect a two-chip window onto the Line; the Now strip shipped
   mobile-only under the mobile-pass ruling. Desktop "what now?" is
   voice-only. *(Amnesty: noticed at M4 T4.)*
4. **MED — Keyboard focus is invisible app-wide.** The caret-only law
   (written for inputs) is currently applied to everything; buttons,
   cards, and choosers have no focus-visible treatment, so tab navigation
   is blind. Needs a ruling: an allowed non-input focus treatment (e.g.
   the deepened well, honoring hover-deepens-never-recolors) or an
   explicit mouse/touch-first acceptance.
5. **MED — Sub-44px tap targets on the Book.** Read's page corners and the
   `raw ▾` toggle are small text buttons with no padding — under the
   mobile pass's ≥44px law. *(Amnesty: shipped small in T5.)*
6. **MED — The composer diverges from the design target's polish pass.**
   The prototype's composer floats (glass blur + its sanctioned soft
   shadow); ours is a flat well with blur only. The desktop sheet's
   rounded left edge (22px in the prototype) also differs. The prototype
   is law; these are unapplied lines of it.
7. **LOW — ← DELEGATE's lit color deviates from the prototype** (purple
   #8a6ea8 there; no purple token exists, so it lights ink here).
   Deliberate at M4 — needs a blessing or a token.
8. **LOW — One `font-semibold`** on Waiting-on names in Review, against the
   no-bold-for-emphasis law (ink vs muted is the tool).
9. **LOW — The raw block's 2px left edge** exceeds hairline weight — the
   only 2px edge in the app. It comes from the prototype's own `.raw`
   style, so two laws point in opposite directions; needs one line of
   ruling.
10. **LOW — The mobile world pill's home dot is flat silver**; the
    prototype's home dot is a silver gradient.
11. **LOW — Dead code rides in the bundle:** the orphaned M1 surfaces from
    findings 1–2, the verdict-scrim CSS, and the Bench-fade helper are
    all unreachable but shipped. Kept deliberately pending finding 1's
    ruling — deleting would foreclose re-homing them.
12. **LOW — A brand-new account's thread is silent** before any first
    message exists (the first-message plant covered Chris's account by
    SQL). Single-user V1; noting for completeness.
13. **LOW — The Bench's honest fade has no surface.** Loose tasks appear
    only as BENCH-tagged cards; benchOpacity (the 14→30-day dimming law)
    renders nowhere in the shell. *(Amnesty: since the shell landed.)*
14. **LOW — Desktop room switches have no enter motion** (the prototype's
    260ms roomin rise). The pager, sheets, deck, and repaint all honor
    their timings; this is the one missing row of the motion table.
15. **LOW — Arc's dawn/dusk palettes are my invention** within Warm Glass —
    no design-target reference exists for those hours. Flagged for a
    taste pass at real dawn and real dusk.
