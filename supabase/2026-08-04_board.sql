-- ─────────────────────────────────────────────────────────────
-- B1 PHASE A — THE BOARD  (Aug 4 2026)
--
-- Additive only. No column dropped, none renamed, no constraint
-- narrowed, no policy changed. Safe to run twice.
--
-- RLS: nothing here needs a policy. Both columns live on `tasks`,
-- which already carries select · insert · update scoped to
-- user_id = auth.uid(), and deliberately no delete policy
-- (2026-07-22_m1_spine.sql:90-111). A column on an existing table
-- inherits all of it. A separate table would mean restating all of
-- it, and the restatement is where the divergence gets in — the
-- same reasoning that put `notes` on the row (2026-08-03).
--
-- PHASE B, VERIFIED NOT ASSUMED: the update policy reads
--   using (user_id = auth.uid()) with check (user_id = auth.uid())
-- and says NOTHING about deleted_at. So a soft-deleted row stays
-- visible to the very statement that would undelete it. The board's
-- Deleted column is genuinely reversible at the database. There is
-- no RLS trap and this migration needs no policy amendment.
-- ─────────────────────────────────────────────────────────────

-- ── delegated_to — already present since the M4 anchors migration.
-- Kept here because this file must be runnable standalone, and
-- `if not exists` makes the re-declaration a no-op rather than a lie.
alter table tasks add column if not exists delegated_to text;

alter table tasks drop constraint if exists tasks_delegated_to_len;
alter table tasks add constraint tasks_delegated_to_len
  check (delegated_to is null or char_length(delegated_to) <= 120);

-- ── position — the hand-order within a board column.
--
-- DOUBLE PRECISION, NOT INTEGER, AND THIS IS THE REASON:
-- a drag inserts a card between two neighbours at (prev + next) / 2.
-- With integers there is no value between 3 and 4, so every drag
-- would have to renumber every row below it — N writes for one
-- gesture, each one a chance to half-fail. Fractional indexing makes
-- it exactly one write, always, regardless of column length.
--
-- THE KNOWN LIMIT, recorded now so nobody rediscovers it in
-- production: float64 has ~52 bits of mantissa, so repeatedly halving
-- the SAME gap exhausts it after roughly 50 consecutive inserts —
-- prev and next become adjacent doubles, the midpoint equals one of
-- them, and two cards collide on one position. It takes 50 drags into
-- the identical slot with no intervening reshuffle, which is not a
-- today problem for a single-user app. The fix when it arrives is a
-- renormalisation pass over the column (respace 0,1,2,…), NOT a
-- migration to integers. This is a scar-in-waiting, not a scar.
alter table tasks add column if not exists position double precision;

-- Sorting a column is `order by position nulls last` over one user's
-- live rows; this keeps that off a sequential scan as the table grows.
create index if not exists tasks_position_idx
  on tasks (user_id, position)
  where deleted_at is null;
