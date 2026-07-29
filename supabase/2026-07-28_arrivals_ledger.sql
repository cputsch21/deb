-- ============================================================
-- 2026-07-28 · The Arrivals ledger — observability for the mouth
-- Run by hand in the Supabase SQL editor BEFORE this deploys
-- (migration-before-deploy law). Additive, idempotent.
--
-- Laws (DECISIONS, July 28):
--   · Everything that arrives at the filing engine leaves a row — every
--     source, every outcome, including what the door turned away.
--   · APPEND-ONLY BY RLS: select + insert, no update, no delete — a log
--     that can be edited isn't a log.
--   · Rejected mail logs METADATA only (sender, subject) — never body
--     content. A bad-signature drop logs the bare fact alone.
-- ============================================================

create table if not exists ingest_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id),
  source     text not null check (source in ('composer', 'email', 'plaud', 'remarkable')),
  sender     text check (sender is null or char_length(sender) between 1 and 200),
  summary    text check (summary is null or char_length(summary) between 1 and 200),
  outcome    text not null check (outcome in (
    'filed', 'versioned', 'unreadable', 'duplicate',
    'dropped_sender', 'dropped_signature', 'dropped_recipient', 'dropped_shape',
    'failed'
  )),
  entry_id   uuid references entries (id),
  created_at timestamptz not null default now()
);

create index if not exists ingest_log_time_idx on ingest_log (user_id, created_at desc);

alter table ingest_log enable row level security;

drop policy if exists ingest_log_select on ingest_log;
create policy ingest_log_select on ingest_log
  for select using (user_id = auth.uid());

drop policy if exists ingest_log_insert on ingest_log;
create policy ingest_log_insert on ingest_log
  for insert with check (user_id = auth.uid());

-- deliberately NO update and NO delete policy: the ledger is beyond reach.
