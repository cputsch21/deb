-- ============================================================
-- 2026-07-24 · M5 T1: the record spine — entry_raw · entries ·
--                     entry_notes · extractor_feedback · source links
-- Run by hand in DEB's Supabase SQL editor. Additive + idempotent.
-- Migration-before-deploy: NO M5 code deploys until this has run.
--
-- The law applied here (DECISIONS, this date):
--   · KEEP THE RAW, physically: the verbatim lives in entry_raw with
--     select + insert policies ONLY — no update, no delete, exactly like
--     the thread. Nothing and no one edits or destroys an original.
--   · The entry surface (routing, distillate, soft-hide) lives in
--     entries and may evolve; deleting an entry hides the surface only.
--   · entry_notes (the margins, T6) and extractor_feedback (the delete-
--     learning loop, T4) are founded now — tables wanted on day one.
--   · Length caps in the schema, mirrored in code. RLS owner-only on
--     everything from line one. Local-timezone app-day.
-- ============================================================

-- ── entry_raw — the immutable verbatim ──────────────────────
create table if not exists entry_raw (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id),
  content    text not null check (char_length(content) between 1 and 60000),
  created_at timestamptz not null default now()
);

alter table entry_raw enable row level security;

drop policy if exists entry_raw_select on entry_raw;
create policy entry_raw_select on entry_raw
  for select using (user_id = auth.uid());

drop policy if exists entry_raw_insert on entry_raw;
create policy entry_raw_insert on entry_raw
  for insert with check (user_id = auth.uid());

-- deliberately NO update and NO delete policy: the raw is beyond reach.

-- ── entries — the readable surface over the raw ─────────────
-- project_id null = filed at silver (unrouted / whole-life).
-- source: 'plaud' | 'remarkable' | 'filed' (the composer's one door).
-- entry_day: the local app-day the entry belongs to (timezone law).
-- deleted_at hides the SURFACE only; the raw beneath is untouchable.
create table if not exists entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id),
  raw_id     uuid not null references entry_raw (id),
  project_id uuid references projects (id),
  source     text not null check (source in ('plaud', 'remarkable', 'filed')),
  distillate text check (distillate is null or char_length(distillate) between 1 and 8000),
  entry_day  date not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists entries_day_idx on entries (user_id, entry_day desc);

alter table entries enable row level security;

drop policy if exists entries_select on entries;
create policy entries_select on entries
  for select using (user_id = auth.uid());

drop policy if exists entries_insert on entries;
create policy entries_insert on entries
  for insert with check (user_id = auth.uid());

drop policy if exists entries_update on entries;
create policy entries_update on entries
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- deliberately NO delete policy: soft delete via deleted_at only.

-- ── entry_notes — Deb's margins (written in T6; founded now) ─
-- kind: the four hands only — receipt · read · keep · question.
create table if not exists entry_notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id),
  entry_id   uuid not null references entries (id),
  kind       text not null check (kind in ('receipt', 'read', 'keep', 'question')),
  content    text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists entry_notes_entry_idx on entry_notes (entry_id);

alter table entry_notes enable row level security;

drop policy if exists entry_notes_select on entry_notes;
create policy entry_notes_select on entry_notes
  for select using (user_id = auth.uid());

drop policy if exists entry_notes_insert on entry_notes;
create policy entry_notes_insert on entry_notes
  for insert with check (user_id = auth.uid());

drop policy if exists entry_notes_update on entry_notes;
create policy entry_notes_update on entry_notes
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- deliberately NO delete policy: a dismissed note is a soft delete.

-- ── extractor_feedback — every ↓ Delete of a minted card ────
-- Append-only log the minting prompt reads as "learned not-a-things";
-- the extractor must visibly learn what Chris considers not a thing.
create table if not exists extractor_feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id),
  entry_id   uuid references entries (id),
  title      text not null check (char_length(title) between 1 and 200),
  created_at timestamptz not null default now()
);

alter table extractor_feedback enable row level security;

drop policy if exists extractor_feedback_select on extractor_feedback;
create policy extractor_feedback_select on extractor_feedback
  for select using (user_id = auth.uid());

drop policy if exists extractor_feedback_insert on extractor_feedback;
create policy extractor_feedback_insert on extractor_feedback
  for insert with check (user_id = auth.uid());

-- deliberately NO update and NO delete policy: it is a log.

-- ── tasks wear their source ─────────────────────────────────
-- Minted cards point at the entry they were mined from ("From Tuesday's
-- Plaud call"). Null for tasks born in conversation or by hand.
alter table tasks add column if not exists source_entry_id uuid references entries (id);
