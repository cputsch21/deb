-- ============================================================
-- 2026-07-29 · Cards carry their receipt — the source excerpt
--                + when a task was handed off
-- Run by hand in the Supabase SQL editor BEFORE this deploys
-- (migration-before-deploy law). Additive, idempotent.
--
-- Laws (DECISIONS, July 29):
--   · At minting time the extractor captures the sentence or two from
--     the material that justified the card, VERBATIM, capped — stored
--     at mint, never re-derived (the excerpt is a fact about why this
--     card exists; it doesn't drift as the entry versions).
--   · Conversation-born cards carry no excerpt — the title is the
--     sentence. Only material-born cards wear the receipt.
--   · delegated_on: when a task was handed off — the chase card's
--     receipt needs who AND when.
-- ============================================================

alter table tasks add column if not exists source_excerpt text
  check (source_excerpt is null or char_length(source_excerpt) between 1 and 200);

alter table tasks add column if not exists delegated_on date;
