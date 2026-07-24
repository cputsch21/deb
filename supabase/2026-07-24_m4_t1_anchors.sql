-- ============================================================
-- 2026-07-24 · M4 T1: the stack + the Line — anchors · delegation · ranking cache
-- Run by hand in DEB's Supabase SQL editor. Additive + idempotent (safe to
-- re-run). Migration-before-deploy: NO M4 code deploys until this has run.
--
-- The model (DECISIONS, this date):
--   · anchored_on is THE one verdict field. null = undecided → the stack
--     deals it. Do → today · Delay → its chosen day (wakes on the LINE,
--     not the stack — Delay was a verdict). The Line = open, not delegated,
--     anchored_on <= app-day and no more than STALE_AFTER_DAYS (7, in code)
--     past — older anchors return to the stack as re-deal cards.
--   · Delegation lives on the task: delegated_to + chase_on, paired.
--     Off the plate (stack + Line both exclude it), visible in Review's
--     Waiting-on; on the chase day it returns to the STACK as a chase card.
--   · line_cache: Deb's ranking + one-line whys, signature-gated — one row
--     per user, overwritten in place, recomputed only when the Line's
--     contents actually change.
-- ============================================================

-- ── tasks grow the verdict grammar ──────────────────────────
alter table tasks add column if not exists anchored_on date;

alter table tasks add column if not exists delegated_to text
  check (delegated_to is null or char_length(delegated_to) between 1 and 80);

alter table tasks add column if not exists chase_on date;

-- a delegation is who + when, together — never one without the other
alter table tasks drop constraint if exists tasks_delegation_pair;
alter table tasks add constraint tasks_delegation_pair
  check ((delegated_to is null) = (chase_on is null));

-- the Line's read path: open tasks by owner + anchor day
create index if not exists tasks_line_idx
  on tasks (user_id, anchored_on)
  where done_at is null and deleted_at is null;

-- ── line_cache — Deb's ranking, signature-gated ─────────────
-- One row per user. items: [{ id, why }] in her order. Overwritten in
-- place on recompute; no history kept (the ledger lives elsewhere).
create table if not exists line_cache (
  user_id    uuid primary key default auth.uid() references auth.users (id),
  signature  text not null check (char_length(signature) between 1 and 128),
  items      jsonb not null check (pg_column_size(items) <= 16384),
  created_at timestamptz not null default now()
);

alter table line_cache enable row level security;

drop policy if exists line_cache_select on line_cache;
create policy line_cache_select on line_cache
  for select using (user_id = auth.uid());

drop policy if exists line_cache_insert on line_cache;
create policy line_cache_insert on line_cache
  for insert with check (user_id = auth.uid());

drop policy if exists line_cache_update on line_cache;
create policy line_cache_update on line_cache
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- deliberately NO delete policy: the cache is overwritten, never erased.
