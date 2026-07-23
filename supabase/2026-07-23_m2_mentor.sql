-- ============================================================
-- 2026-07-23 · M2 T1: the mentor's tables — messages · known_facts
-- Apply by hand in the Supabase SQL editor. Safe to run more than once.
--
-- Law applied here (DECISIONS.md):
--   · messages are APPEND-ONLY, enforced by the database: select and
--     insert policies exist; update and delete policies do not — the
--     thread physically cannot be edited or erased. (Redaction, if ever
--     needed, arrives as its own narrow mechanism via a future ruling.)
--   · known_facts: nothing Deb knows is hidden — visible, editable,
--     forgettable (forget = soft delete via deleted_at; no hard delete).
--   · RLS owner-only on both from line one; length caps in the schema.
-- ============================================================

-- ── messages — the one thread, forever ──────────────────────
-- project_id records the lens a line was said in (null = home).
-- The view is scoped by lens; Deb's mind never is.
create table if not exists messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id),
  project_id uuid references projects (id),
  role       text not null check (role in ('user', 'deb')),
  content    text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists messages_thread_idx on messages (user_id, created_at);

-- ── known_facts — her memory, all of it visible ─────────────
-- source: 'conversation' = she chose to remember it mid-thread
--         'chris'        = authored or edited by Chris directly
--         'seed'         = inherited from TRUE — history she inherited,
--                          never conversations she had
create table if not exists known_facts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id),
  content    text not null check (char_length(content) between 1 and 500),
  source     text not null default 'conversation'
             check (source in ('conversation', 'chris', 'seed')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ── RLS ─────────────────────────────────────────────────────
alter table messages enable row level security;

drop policy if exists messages_select on messages;
create policy messages_select on messages
  for select using (user_id = auth.uid());

drop policy if exists messages_insert on messages;
create policy messages_insert on messages
  for insert with check (user_id = auth.uid());

-- deliberately NO update and NO delete policy on messages: append-only.

alter table known_facts enable row level security;

drop policy if exists known_facts_select on known_facts;
create policy known_facts_select on known_facts
  for select using (user_id = auth.uid());

drop policy if exists known_facts_insert on known_facts;
create policy known_facts_insert on known_facts
  for insert with check (user_id = auth.uid());

drop policy if exists known_facts_update on known_facts;
create policy known_facts_update on known_facts
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- deliberately NO delete policy on known_facts: forget = deleted_at.
