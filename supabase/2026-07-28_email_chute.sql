-- ============================================================
-- 2026-07-28 · E1: the email chute's spine — source 'email' ·
--                  Message-ID idempotency · source_meta
-- Run by hand in the Supabase SQL editor BEFORE the chute deploys
-- (migration-before-deploy law). Additive, idempotent.
--
-- Laws (DECISIONS, July 28 — the chute pulled forward):
--   · Source is SENDER-MAPPED: the Plaud sender files 'plaud', the
--     reMarkable sender 'remarkable', all else 'email' — provenance
--     labels are the tiebreaker; the channel lives in source_meta.
--   · Idempotency by Message-ID, enforced by the DATABASE: the same
--     email arriving twice files once (unique partial index).
--   · The raw stays verbatim; from/subject/the email's own dates ride
--     beside it in source_meta for her receipts, size-capped.
-- ============================================================

alter table entries drop constraint if exists entries_source_check;
alter table entries add constraint entries_source_check
  check (source in ('plaud', 'remarkable', 'filed', 'email'));

alter table entries add column if not exists message_id text
  check (message_id is null or char_length(message_id) between 1 and 300);

create unique index if not exists entries_message_id_idx
  on entries (user_id, message_id) where message_id is not null;

alter table entries add column if not exists source_meta jsonb
  check (source_meta is null or pg_column_size(source_meta) <= 8192);
