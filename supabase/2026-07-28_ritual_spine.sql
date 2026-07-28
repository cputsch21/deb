-- ============================================================
-- 2026-07-28 · R1: the daily ritual's spine — entry_revisions ·
--                  the fifth margin kind · the anchored question
-- Run by hand in the Supabase SQL editor BEFORE the work branch
-- deploys (migration-before-deploy law). Additive, idempotent.
-- Joins brief_cache at the merge gate.
--
-- Laws (DECISIONS, July 28 — the ritual batch):
--   · The day has one page; drops grow it, never duplicate it. A living
--     entry keeps EVERY raw snapshot: entry_revisions is append-only
--     (select + insert only — immutability by RLS, like entry_raw), with
--     the superseded surface (distillate) beside each superseded raw so
--     an undone version drop restores the prior version exactly.
--   · The fifth margin note: THE ANSWER. entry_notes admits kind
--     'answer'; `question` anchors the answer to the question it serves.
-- ============================================================

-- ── entry_revisions — the living page's history ──────────────
create table if not exists entry_revisions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id),
  entry_id   uuid not null references entries (id),
  raw_id     uuid not null references entry_raw (id),
  distillate text check (distillate is null or char_length(distillate) between 1 and 8000),
  created_at timestamptz not null default now()
);

create index if not exists entry_revisions_entry_idx
  on entry_revisions (entry_id, created_at);

alter table entry_revisions enable row level security;

drop policy if exists entry_revisions_select on entry_revisions;
create policy entry_revisions_select on entry_revisions
  for select using (user_id = auth.uid());

drop policy if exists entry_revisions_insert on entry_revisions;
create policy entry_revisions_insert on entry_revisions
  for insert with check (user_id = auth.uid());

-- deliberately NO update and NO delete policy: history is beyond reach.

-- ── the fifth margin kind + the anchored question ────────────
alter table entry_notes drop constraint if exists entry_notes_kind_check;
alter table entry_notes add constraint entry_notes_kind_check
  check (kind in ('receipt', 'read', 'keep', 'question', 'answer'));

alter table entry_notes add column if not exists question text
  check (question is null or char_length(question) between 1 and 300);
