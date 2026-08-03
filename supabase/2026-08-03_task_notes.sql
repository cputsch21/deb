-- ============================================================
-- 2026-08-03 · X1 Phase A — task notes: a canvas that belongs to one task
-- Run by hand in the Supabase SQL editor BEFORE Phase F deploys, and
-- confirm to the session (migration-before-deploy law).
-- ADDITIVE ONLY. One nullable column. No table dropped, no column
-- renamed, no constraint narrowed, no policy changed.
--
-- WHY A COLUMN AND NOT A TABLE (the ticket's default, and the schema
-- agrees): a note belongs to exactly one task and cannot exist without
-- it. As a column it inherits the tasks table's RLS wholesale —
--   select  user_id = auth.uid()
--   insert  user_id = auth.uid()
--   update  user_id = auth.uid()  (with check)
--   delete  NO POLICY EXISTS
-- — which is exactly the shape wanted, and it is inherited rather than
-- re-declared, so it cannot drift from the row it describes. A separate
-- table would need all four restated and could be got wrong.
--
-- NOTES DIE WITH THE TASK, AND SURVIVE AN UNDO OF ITS COMPLETION. That
-- comes free from this shape and is worth stating: completion sets
-- `done_at`, it does not touch this column, so undo (which clears
-- `done_at`) brings the notes back with the row. They disappear from the
-- SURFACE when a task is complete; they are never destroyed on
-- completion, because a destroy could not be walked back and RED MARKS A
-- DOOR THAT CANNOT BE WALKED BACK THROUGH — completion is not that door.
-- A task's real deletion is already a soft delete (deleted_at), so the
-- notes follow the row into the same recoverable dark.
--
-- The length cap is the law applied at the schema as well as at write
-- time. 20000 sits between DISTILLATE_MAX (8000) and RAW_MAX (60000): a
-- canvas, not a document store.
-- ============================================================

alter table tasks add column if not exists notes text;

alter table tasks drop constraint if exists tasks_notes_len;
alter table tasks add constraint tasks_notes_len
  check (notes is null or char_length(notes) <= 20000);

-- No new policy. The column lives under the tasks table's existing RLS,
-- deliberately: inherited beats restated.
