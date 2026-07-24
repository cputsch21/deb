-- ============================================================
-- 2026-07-24 · M3 T2: the mission — one line per world
-- Run by hand in DEB's Supabase SQL editor. Safe to run more than once.
--
-- The intake interview (Deb's real onboarding, post-reversal) distills a
-- one-line mission per world. Nullable — a world without a mission simply
-- hasn't been given to her yet. Written by Deb via set_mission
-- (act-then-correct), redoable by Chris; hangs over the mantle in Review.
-- Length cap mirrored in code (MISSION_MAX = 200). RLS on projects
-- already covers it (owner-only select/insert/update, no delete).
-- ============================================================

alter table projects add column if not exists mission text
  check (mission is null or char_length(mission) between 1 and 200);
