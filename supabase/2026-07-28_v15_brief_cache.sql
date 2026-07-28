-- ============================================================
-- 2026-07-28 · V1.5: the morning brief's cache
-- Run by hand in the Supabase SQL editor BEFORE deploying the brief
-- (migration-before-deploy law). Idempotent.
--
-- brief_cache mirrors line_cache (M4 T1): one row per user, overwritten
-- in place, signature-gated — the model runs once per app-day and again
-- only if the underlying spine changed. items: the derived facts with
-- her notes merged in. No history kept; no read-tracking of any kind
-- (graveyard law — the brief is never a guilt surface).
-- ============================================================

create table if not exists brief_cache (
  user_id    uuid primary key default auth.uid() references auth.users (id),
  app_day    date not null,
  signature  text not null check (char_length(signature) between 1 and 128),
  items      jsonb not null check (pg_column_size(items) <= 16384),
  created_at timestamptz not null default now()
);

alter table brief_cache enable row level security;

drop policy if exists brief_cache_select on brief_cache;
create policy brief_cache_select on brief_cache
  for select using (user_id = auth.uid());

drop policy if exists brief_cache_insert on brief_cache;
create policy brief_cache_insert on brief_cache
  for insert with check (user_id = auth.uid());

drop policy if exists brief_cache_update on brief_cache;
create policy brief_cache_update on brief_cache
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- deliberately NO delete policy: overwritten in place, never emptied.
