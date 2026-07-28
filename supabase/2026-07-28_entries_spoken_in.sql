-- ============================================================
-- 2026-07-28 · The thread ruling: entries remember where they were spoken
-- Run by hand in the Supabase SQL editor BEFORE deploying the thread
-- scoping (migration-before-deploy law). Additive, idempotent.
--
-- Law (DECISIONS, July 28): words live where they were said — the filed
-- object renders in the thread where the paste happened, while the entry
-- itself lives in Read wearing its routed world. `spoken_in` records the
-- lens at the moment of filing (null = silver). Rows filed before this
-- column existed stay null and render at silver — the fact was not
-- recorded at the time, and the record does not invent facts.
-- ============================================================

alter table entries add column if not exists spoken_in uuid references projects (id);
