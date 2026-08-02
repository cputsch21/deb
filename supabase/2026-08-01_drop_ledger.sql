-- ============================================================
-- 2026-08-01 · F2 — NO SILENT DROPS: the drop ledger
-- Run by hand in the Supabase SQL editor BEFORE this deploys, and
-- confirm to the session that it succeeded (migration-before-deploy law).
-- ADDITIVE ONLY. No column dropped, no column renamed, no enum value
-- removed — the two CHECKs are replaced with strictly WIDER ones.
--
-- Laws (DECISIONS, Aug 1 2026):
--   · ONE LEDGER, NOT THREE. Three paths where something is handed in or
--     derived and fails to land are the same fact in three costumes.
--     Payload differences are what a discriminator and a jsonb column are
--     for, not what a second table is for.
--   · A DROP RECORD IS IMMUTABLE. This table already has select + insert
--     and deliberately NO update and NO delete policy. Nothing below
--     changes that, and nothing may add one.
--   · A ROW RECORDS A FACT; A ROOM CHOOSES THE WORDS. `detail` carries
--     reconstruction payload, never user-facing sentences.
--
-- ONE-WAY DOOR, on the record: once a single row carries one of the new
-- outcome values, the narrow CHECK can never be restored — re-adding it
-- would fail against existing rows, and the no-delete policy makes
-- removing them impossible by design. Accepted deliberately (Ruling E).
-- ============================================================

-- 1 · the reconstruction payload. Nullable; existing rows keep NULL.
alter table ingest_log add column if not exists detail jsonb;

-- 2 · a rhythm that never materialized has no mouth — it is the one
--     tenant that did not "arrive". It gets its own source value.
alter table ingest_log drop constraint if exists ingest_log_source_check;
alter table ingest_log add constraint ingest_log_source_check
  check (source in ('composer', 'email', 'plaud', 'remarkable', 'rhythm'));

-- 3 · three new outcomes. Every prior value is retained verbatim.
--     no_distillate      the extractor produced nothing usable
--     distillate_refused the floor rejected a candidate (detail.candidate)
--     not_materialized   a due rhythm did not become a task
alter table ingest_log drop constraint if exists ingest_log_outcome_check;
alter table ingest_log add constraint ingest_log_outcome_check
  check (outcome in (
    'filed', 'versioned', 'unreadable', 'duplicate',
    'dropped_sender', 'dropped_signature', 'dropped_recipient', 'dropped_shape',
    'failed',
    'no_distillate', 'distillate_refused', 'not_materialized'
  ));

-- NO BACKFILL (Ruling D). Historical rows keep detail NULL and their
-- current outcomes, including `filed` rows that should have said
-- `distillate_refused`. Those rows are wrong AND they are the honest
-- record of what the system believed at the time. Pre-existing damage
-- surfaces through /api/drops, derived from current state.

-- Still deliberately NO update and NO delete policy on this table.
