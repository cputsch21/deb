-- ============================================================
-- 2026-07-24 · M2 T6 (revised): the thread's true beginning
-- Run by hand in DEB's Supabase SQL editor (service role bypasses RLS,
-- so the owner is resolved by email and user_id stamped explicitly).
--
-- Law (DECISIONS.md, July 24 2026 — reversal): NO TRUE inheritance, ever.
-- Deb starts blank by deliberate choice. T6 is now one move: plant her
-- canonical first message (docs/deb-soul.md, revised spec) as the first
-- line of the thread — before anything already said. Idempotent.
-- ============================================================

with owner as (
  select id from auth.users where email = 'cputsch21@gmail.com'
)
insert into messages (user_id, role, content, project_id, created_at)
select
  owner.id,
  'deb',
  $msg$We're starting from nothing — no history, no files, no assumptions. I'd rather earn what I know than inherit it.

Everything from here goes in the record: what you tell me, what you promise, what actually happens. Give it a few weeks and I'll have receipts.

So — what matters most right now?$msg$,
  null,
  coalesce(
    (select min(created_at) from messages m where m.user_id = owner.id),
    now()
  ) - interval '1 second'
from owner
where not exists (
  select 1 from messages m
  where m.user_id = owner.id
    and m.role = 'deb'
    and m.content like $q$We're starting from nothing%$q$
);
