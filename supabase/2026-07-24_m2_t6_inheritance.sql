-- ============================================================
-- 2026-07-24 · M2 T6: the inheritance — TRUE's memory becomes Deb's seed
-- Run in DEB's Supabase SQL editor (service role — RLS is bypassed here,
-- so we resolve the owner by email and stamp user_id explicitly).
--
-- Two moves:
--   1) plant TRUE's durable facts as labeled `seed` facts (history she
--      inherited, never conversations she had — kept honest by source +
--      the original TRUE dates).
--   2) plant her canonical first message as the thread's true beginning.
--
-- Both are idempotent (guarded), so re-running is safe.
--
-- ── STEP 0 (in TRUE's Supabase, first): discover the schema ──────────
--   select table_name, column_name
--   from information_schema.columns
--   where table_schema = 'public'
--     and (table_name ilike '%fact%' or table_name ilike '%memor%'
--          or table_name ilike '%identit%')
--   order by table_name, ordinal_position;
--
-- ── STEP 1 (in TRUE's Supabase): export durable facts as paste-ready rows ──
--   Adjust the table/column names to match STEP 0. This emits one string of
--   VALUES rows shaped exactly for STEP 2 below.
--
--   select string_agg(
--            format('(%L, timestamptz %L)', content, created_at),
--            E',\n' order by created_at)
--   from known_facts          -- ← TRUE's facts table (rename if different)
--   where deleted_at is null;  -- ← drop this line if TRUE has no soft-delete
--
--   (The Life Doc / Identity sections can be exported the same way — one
--    fact per durable claim — and pasted in alongside.)
-- ============================================================

-- The owner. Change the email if the account differs.
-- (Used by both inserts below via a CTE.)

-- ── 1) Seed facts — paste TRUE's STEP 1 output into the VALUES list ──
with owner as (
  select id from auth.users where email = 'cputsch21@gmail.com'
)
insert into known_facts (user_id, content, source, created_at)
select owner.id, v.content, 'seed', v.created_at
from owner,
     (values
        -- ↓↓↓ REPLACE this sample with TRUE's exported rows ↓↓↓
        ('Weekends are family time — plan around them, never through them.', timestamptz '2026-01-01'),
        ('Larry is the CTDI auditor contact; promises to him have a perfect kept streak.', timestamptz '2026-01-01'),
        ('Prefers hard conversations early in the day.', timestamptz '2026-01-01')
        -- ↑↑↑ REPLACE with the real export ↑↑↑
     ) as v(content, created_at)
where not exists (
  -- only seed once: if any inherited fact already exists, skip the whole insert
  select 1 from known_facts k where k.user_id = owner.id and k.source = 'seed'
);

-- ── 2) The canonical first message — the thread's true beginning ─────
-- Sits before every existing line (one second before the current earliest),
-- so it opens the thread. Planted once.
with owner as (
  select id from auth.users where email = 'cputsch21@gmail.com'
)
insert into messages (user_id, role, content, project_id, created_at)
select
  owner.id,
  'deb',
  $msg$I'm here — and I didn't arrive empty. Everything TRUE knew about you came with me, labeled as inherited, so we never mistake old history for something we actually talked through. I know your worlds and your promises — the kept ones and the ones you'd rather I didn't mention. One rule between us: I tell you what's true, with the dates to back it. Which means now and then you'll feel called out. That's the point, not a bug. So — what's actually on you today?$msg$,
  null,
  coalesce(
    (select min(created_at) from messages m where m.user_id = owner.id),
    now()
  ) - interval '1 second'
from owner
where not exists (
  select 1 from messages m
  where m.user_id = owner.id and m.role = 'deb' and m.content like $msg$I'm here — and I didn't arrive empty.%$msg$
);
