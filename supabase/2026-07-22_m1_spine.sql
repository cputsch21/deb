-- ============================================================
-- 2026-07-22 · M1 T1: the spine — projects · goals · tasks · recurring
-- Apply by hand in the Supabase SQL editor. Safe to run more than once.
--
-- Law applied here (DECISIONS.md):
--   · RLS on every table from its first migration; owner-only access.
--   · No DELETE policy exists on any table — rows can never be hard-
--     deleted from the app. "Delete" = setting deleted_at (soft delete).
--   · Length caps live in the schema, not just the client.
--   · Recurring materialization is idempotent: a rhythm can produce at
--     most one task per day, enforced by the database itself.
-- ============================================================

create extension if not exists pgcrypto;

-- ── projects — the worlds ───────────────────────────────────
create table if not exists projects (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id),
  name       text not null check (char_length(name) between 1 and 80),
  color      text not null check (color ~* '^#[0-9a-f]{6}$'),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ── goals — finishable outcomes ─────────────────────────────
-- status is a permanent verdict once it leaves 'active' (done/dropped);
-- permanence is guarded by the app's one centered confirm.
create table if not exists goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id),
  project_id  uuid not null references projects (id),
  title       text not null check (char_length(title) between 1 and 200),
  status      text not null default 'active'
              check (status in ('active', 'done', 'dropped')),
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

-- ── recurring_tasks — the rhythms ───────────────────────────
-- Exactly three cadences (ruling, July 22 2026):
--   daily · weekly on chosen days (0=Sun … 6=Sat) · monthly on a date.
create table if not exists recurring_tasks (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null default auth.uid() references auth.users (id),
  project_id           uuid references projects (id),
  title                text not null check (char_length(title) between 1 and 200),
  cadence              text not null check (cadence in ('daily', 'weekly', 'monthly')),
  weekly_days          smallint[]
                       check (cadence <> 'weekly'
                              or (array_length(weekly_days, 1) between 1 and 7
                                  and weekly_days <@ '{0,1,2,3,4,5,6}'::smallint[])),
  monthly_day          smallint
                       check (cadence <> 'monthly' or monthly_day between 1 and 31),
  last_materialized_on date,
  created_at           timestamptz not null default now(),
  deleted_at           timestamptz
);

-- ── tasks — including the Bench ─────────────────────────────
-- A task belongs to a goal (then project_id mirrors the goal's project),
-- or to a project directly, or to nothing at all — that's the Bench.
-- touched_at is the Bench-fade clock: any meaningful edit resets it.
create table if not exists tasks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id),
  project_id      uuid references projects (id),
  goal_id         uuid references goals (id),
  recurring_id    uuid references recurring_tasks (id),
  title           text not null check (char_length(title) between 1 and 200),
  done_at         timestamptz,
  touched_at      timestamptz not null default now(),
  materialized_on date,
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  check (goal_id is null or project_id is not null)
);

-- One task per rhythm per day, enforced by the database — materialization
-- can run twice (two tabs, phone + desktop) and never duplicate.
create unique index if not exists tasks_one_per_rhythm_day
  on tasks (recurring_id, materialized_on)
  where recurring_id is not null;

create index if not exists tasks_project_idx on tasks (project_id);
create index if not exists tasks_goal_idx on tasks (goal_id);
create index if not exists goals_project_idx on goals (project_id);

-- ── RLS: owner-only, and no hard delete exists ──────────────
do $$
declare t text;
begin
  foreach t in array array['projects', 'goals', 'recurring_tasks', 'tasks'] loop
    execute format('alter table %I enable row level security', t);

    execute format('drop policy if exists %1$s_select on %1$I', t);
    execute format(
      'create policy %1$s_select on %1$I for select using (user_id = auth.uid())', t);

    execute format('drop policy if exists %1$s_insert on %1$I', t);
    execute format(
      'create policy %1$s_insert on %1$I for insert with check (user_id = auth.uid())', t);

    execute format('drop policy if exists %1$s_update on %1$I', t);
    execute format(
      'create policy %1$s_update on %1$I for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t);

    -- deliberately NO delete policy: soft delete via deleted_at only.
  end loop;
end $$;
