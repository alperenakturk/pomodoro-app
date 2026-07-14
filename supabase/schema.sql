-- ============================================================================
-- Pomodoro app — Supabase/PostgreSQL schema
--
-- Maps every field currently produced by src/lib/storage.js's normalize*()
-- functions (localStorage) onto 9 tables, one per storage key. This file is
-- schema only — no data migration, no client code, nothing has been run
-- against a real Supabase project yet. Paste directly into the Supabase SQL
-- Editor.
--
-- Design notes (see the longer explanation in chat for the full reasoning):
--
-- 1. `userId` (JS) collapses into `user_id` (SQL) — every table in storage.js
--    already carries a userId field (added in an earlier "backend-readiness"
--    pass, currently always the placeholder 'local'). That is the exact same
--    concept this schema's required `user_id uuid references auth.users(id)`
--    column represents once real auth exists — there is deliberately only
--    ONE user_id column per table, not a leftover text column plus a new
--    uuid one.
--
-- 2. `categoryIds` (JS array of category-id strings) -> `category_ids uuid[]`
--    (native Postgres array), NOT a junction table. Postgres cannot place an
--    FK constraint on individual array elements, so this column is an
--    intentionally *unenforced* reference — which is exactly today's
--    behavior (storage.js: "no cascade delete... anything referencing its id
--    afterward fails to resolve it and falls back to no category"). A
--    junction table (e.g. inventory_categories(inventory_id, category_id))
--    would be the more "textbook normalized" option and was considered — it
--    would need four separate junction tables (one per table that carries
--    category_ids) for a feature that's currently just a flat tag list with
--    no per-tag metadata, and even with ON DELETE CASCADE on its own FK it
--    only reaches parity with, not improves on, what the array already does
--    here. Arrays also map more directly to how the data is actually queried
--    (RecordsLog's "matches ANY selected tag" filter, Reports' per-category
--    breakdown) via `&&` (overlap) / `@>` (contains), backed by a GIN index.
--
-- 3. `timer_state` and `settings` are singletons in the JS layer (one object
--    per browser, not a list — loadTimerState()/loadSettings() never
--    .map() over an array). Their SQL tables get a UNIQUE constraint on
--    user_id so each user has at most one row, the natural multi-user
--    equivalent of "one per browser."
--
-- 4. created_at/updated_at are NOT NULL DEFAULT now() here, even though
--    today's JS normalizeMeta() defaults them to `null` for pre-existing
--    records. That null-tolerant path exists only because localStorage
--    already has old data lacking these fields; a fresh Postgres table has
--    no such legacy rows — every insert gets a real timestamp from the
--    database itself. A one-time migration script backfills real values
--    (or `now()`) for any row whose JS-side createdAt/updatedAt was null.
--
-- 5. HH:MM fields (activity_log.time, void_log.time) keep the JS's exact
--    current nullability: `record.time ?? ''` never produces null, so these
--    are `text NOT NULL DEFAULT ''`, not a native `time` column — a real
--    `time` type can't represent the empty-string "blank" sentinel the app
--    currently relies on without turning it into NULL, which would be a
--    quiet behavior change. timetable.start/end have no such fallback (the
--    add form requires both before submitting), so those two *do* use the
--    native `time` type.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- categories  (pomodoro_categories / normalizeCategory)
-- ----------------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  color       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index categories_user_id_idx on public.categories(user_id);

comment on table public.categories is
  'User-defined category tags (name + hex color, e.g. #4a8c82). Referenced '
  'by id from the category_ids arrays below — deliberately no FK, see file '
  'header note 2; deleting a category just leaves those ids unresolved.';

alter table public.categories enable row level security;

create policy "categories_select_own" on public.categories
  for select using (user_id = auth.uid());
create policy "categories_insert_own" on public.categories
  for insert with check (user_id = auth.uid());
create policy "categories_update_own" on public.categories
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "categories_delete_own" on public.categories
  for delete using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- inventory  (pomodoro_inventory / normalizeInventoryItem)
-- ----------------------------------------------------------------------------
create table public.inventory (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  text          text not null,
  estimate      integer,
  notes         text not null default '',
  category_ids  uuid[] not null default '{}'::uuid[],
  deadline      date,
  unplanned     boolean not null default false,
  done          boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index inventory_user_id_idx on public.inventory(user_id);
create index inventory_category_ids_idx on public.inventory using gin(category_ids);

alter table public.inventory enable row level security;

create policy "inventory_select_own" on public.inventory
  for select using (user_id = auth.uid());
create policy "inventory_insert_own" on public.inventory
  for insert with check (user_id = auth.uid());
create policy "inventory_update_own" on public.inventory
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "inventory_delete_own" on public.inventory
  for delete using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- today_tasks  (pomodoro_today_tasks / normalizeTodayTask)
-- ----------------------------------------------------------------------------
create table public.today_tasks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  text          text not null,
  estimate      integer,
  realized      integer not null default 0,
  internal      integer not null default 0,
  external      integer not null default 0,
  category_ids  uuid[] not null default '{}'::uuid[],
  notes         text not null default '',
  unplanned     boolean not null default false,
  urgent        boolean not null default false,
  done          boolean not null default false,
  inventory_id  uuid references public.inventory(id) on delete set null,
  reestimate1   integer,
  reestimate2   integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index today_tasks_user_id_idx on public.today_tasks(user_id);
create index today_tasks_category_ids_idx on public.today_tasks using gin(category_ids);
create index today_tasks_inventory_id_idx on public.today_tasks(inventory_id);

comment on column public.today_tasks.inventory_id is
  'Real FK (unlike category_ids) — this is a single back-reference to the '
  'Inventory item a task was sent from, not a many-to-many tag list. '
  'ON DELETE SET NULL: if the source Inventory row is gone, the task just '
  'loses its back-reference rather than the row failing to exist at all.';

alter table public.today_tasks enable row level security;

create policy "today_tasks_select_own" on public.today_tasks
  for select using (user_id = auth.uid());
create policy "today_tasks_insert_own" on public.today_tasks
  for insert with check (user_id = auth.uid());
create policy "today_tasks_update_own" on public.today_tasks
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "today_tasks_delete_own" on public.today_tasks
  for delete using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- activity_log  (pomodoro_activity_log / normalizeActivityRecord)
-- ----------------------------------------------------------------------------
create table public.activity_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  date          date not null,
  time          text not null default '',
  activity      text not null,
  category_ids  uuid[] not null default '{}'::uuid[],
  notes         text not null default '',
  estimate      integer,
  reestimate1   integer,
  reestimate2   integer,
  real          integer not null default 0,
  diff          integer,
  diff_i        integer,
  diff_ii       integer,
  internal      integer not null default 0,
  external      integer not null default 0,
  unplanned     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index activity_log_user_id_idx on public.activity_log(user_id);
create index activity_log_category_ids_idx on public.activity_log using gin(category_ids);
create index activity_log_date_idx on public.activity_log(date);

comment on column public.activity_log.diff_i is 'JS field diffI — real minus reestimate1.';
comment on column public.activity_log.diff_ii is 'JS field diffII — real minus reestimate2.';

alter table public.activity_log enable row level security;

create policy "activity_log_select_own" on public.activity_log
  for select using (user_id = auth.uid());
create policy "activity_log_insert_own" on public.activity_log
  for insert with check (user_id = auth.uid());
create policy "activity_log_update_own" on public.activity_log
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "activity_log_delete_own" on public.activity_log
  for delete using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- ticks  (pomodoro_ticks / normalizeTick)
-- ----------------------------------------------------------------------------
create table public.ticks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null check (type in ('pomodoro', 'interruption-internal', 'interruption-external')),
  date        date not null,
  "timestamp" timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index ticks_user_id_idx on public.ticks(user_id);
create index ticks_date_idx on public.ticks(date);

comment on column public.ticks."timestamp" is
  'The original app-level event time (set once, at the moment the tick '
  'happened) — distinct from created_at/updated_at, which are the newer '
  'backend-readiness metadata. In practice the two are set within the same '
  'instant today, but they are separate JS fields and kept separate here.';

alter table public.ticks enable row level security;

create policy "ticks_select_own" on public.ticks
  for select using (user_id = auth.uid());
create policy "ticks_insert_own" on public.ticks
  for insert with check (user_id = auth.uid());
create policy "ticks_update_own" on public.ticks
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "ticks_delete_own" on public.ticks
  for delete using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- timetable  (pomodoro_timetable / normalizeTimetableBlock)
-- ----------------------------------------------------------------------------
create table public.timetable (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  start       time not null,
  "end"       time not null,
  label       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index timetable_user_id_idx on public.timetable(user_id);
create index timetable_date_idx on public.timetable(date);

alter table public.timetable enable row level security;

create policy "timetable_select_own" on public.timetable
  for select using (user_id = auth.uid());
create policy "timetable_insert_own" on public.timetable
  for insert with check (user_id = auth.uid());
create policy "timetable_update_own" on public.timetable
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "timetable_delete_own" on public.timetable
  for delete using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- void_log  (pomodoro_void_log / normalizeVoidEntry)
-- ----------------------------------------------------------------------------
create table public.void_log (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  date             date not null,
  time             text not null default '',
  activity         text,
  category_ids     uuid[] not null default '{}'::uuid[],
  elapsed_seconds  integer not null default 0,
  reason           text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index void_log_user_id_idx on public.void_log(user_id);
create index void_log_category_ids_idx on public.void_log using gin(category_ids);

comment on table public.void_log is
  'Voided-Pomodoro journal (Rule 1) — self-observation only. The app never '
  'aggregates this table into Reports metrics; keep it that way if you '
  'build Reports queries on top of this schema.';

alter table public.void_log enable row level security;

create policy "void_log_select_own" on public.void_log
  for select using (user_id = auth.uid());
create policy "void_log_insert_own" on public.void_log
  for insert with check (user_id = auth.uid());
create policy "void_log_update_own" on public.void_log
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "void_log_delete_own" on public.void_log
  for delete using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- timer_state  (pomodoro_timer_state / normalizeTimerState)
-- Singleton per user — see file header note 3.
-- ----------------------------------------------------------------------------
create table public.timer_state (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users(id) on delete cascade,
  session_type  text not null default 'work' check (session_type in ('work', 'shortBreak', 'longBreak')),
  seconds_left  integer not null default 1500, -- DEFAULT_WORK_SECONDS = 25 * 60
  is_running    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.timer_state is
  'One row per user (user_id is UNIQUE) — the multi-user equivalent of '
  'localStorage''s single pomodoro_timer_state snapshot. Upsert on '
  '(user_id), never insert a second row per user.';

alter table public.timer_state enable row level security;

create policy "timer_state_select_own" on public.timer_state
  for select using (user_id = auth.uid());
create policy "timer_state_insert_own" on public.timer_state
  for insert with check (user_id = auth.uid());
create policy "timer_state_update_own" on public.timer_state
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "timer_state_delete_own" on public.timer_state
  for delete using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- settings  (pomodoro_settings / DEFAULT_SETTINGS + loadSettings)
-- Singleton per user — see file header note 3. Unlike the other 8 tables,
-- the current JS object has no createdAt/updatedAt fields at all (it's a
-- plain merge of DEFAULT_SETTINGS with whatever's saved, never run through
-- a normalize*() step) — these two columns are added here anyway per the
-- schema-wide convention, not because a JS field already exists to mirror.
-- ----------------------------------------------------------------------------
create table public.settings (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null unique references auth.users(id) on delete cascade,
  cycle_length          integer not null default 4,
  theme                 text not null default 'dark' check (theme in ('dark', 'light')),
  chime_style           text not null default 'classic' check (chime_style in ('classic', 'soft', 'alert')),
  language              text check (language in ('en', 'tr')),
  -- No longer written or read by the client (the welcome-card feature it
  -- backed was removed in favor of the 'timer-intro' coach mark — see
  -- seen_coach_marks below). Left in place rather than dropped: dropping a
  -- column needs its own manual migration same as adding one, and an unused
  -- column here is harmless — DEFAULT_SETTINGS simply no longer has this key.
  onboarding_dismissed  boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.settings is
  'One row per user (user_id is UNIQUE) — the multi-user equivalent of '
  'localStorage''s single pomodoro_settings object. language is nullable: '
  'null means "not yet explicitly chosen," matching resolveLanguage()''s '
  'auto-detect-from-browser fallback in src/lib/i18n/index.js.';

alter table public.settings enable row level security;

create policy "settings_select_own" on public.settings
  for select using (user_id = auth.uid());
create policy "settings_insert_own" on public.settings
  for insert with check (user_id = auth.uid());
create policy "settings_update_own" on public.settings
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "settings_delete_own" on public.settings
  for delete using (user_id = auth.uid());

-- ============================================================================
-- Base privileges (must run after all 9 CREATE TABLEs above — GRANT ... ON
-- ALL TABLES IN SCHEMA only affects tables that already exist at the time it
-- runs).
--
-- RLS policies alone are not enough: PostgREST/Supabase checks the
-- underlying Postgres GRANT first, and creating tables via raw SQL (this
-- file) — instead of the Supabase Table Editor UI, which does this step
-- automatically — does not grant anything to `anon`/`authenticated` by
-- default. Without this block every request gets "permission denied for
-- table ..." regardless of what the RLS policies say.
--
-- `anon` deliberately gets nothing here — guest/offline usage runs entirely
-- through localStorage (storage.js), never through Supabase, so the
-- unauthenticated Postgres role has no reason to touch these tables at all.
-- Only `authenticated` (a real logged-in Supabase Auth user) gets access,
-- and RLS still scopes every one of those rows to `user_id = auth.uid()`.
-- ============================================================================

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ============================================================================
-- Self-service account deletion (Settings > Danger Zone > Delete Account,
-- signed-in users only).
--
-- The browser client only ever holds the anon/authenticated key, never the
-- service-role key `supabase.auth.admin.deleteUser()` requires — that call
-- can only be made from a trusted server context, which this app (a static
-- SPA with no backend) doesn't have. A SECURITY DEFINER function is the
-- standard Supabase-recommended workaround: it runs with the privileges of
-- whichever role pastes this file into the SQL Editor (typically `postgres`,
-- which can reach the auth schema), but it only ever deletes the CALLING
-- user's own row — `auth.uid()` comes from the caller's own JWT, so a
-- signed-in user cannot pass in (or otherwise reach) someone else's id.
--
-- Deleting the auth.users row cascades (every user_id FK above is `on delete
-- cascade`) through all 9 tables automatically — no need to delete from each
-- one first.
-- ============================================================================

create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.delete_user() to authenticated;

-- ============================================================================
-- Custom Fullscreen Focus Mode backgrounds (Settings > General, signed-in
-- users only — see src/lib/backgroundStorage.js, src/components/
-- SettingsModal.jsx, and CLAUDE.md's Fullscreen Focus Mode section).
--
-- Two parts:
--   1. One new column on the existing `settings` singleton table — the
--      Storage *path* (not a URL; the bucket below is private, so the app
--      resolves a short-lived signed URL at read time — see
--      getFullscreenBackgroundUrl() in backgroundStorage.js). The image is
--      always shown as-is (no dimming overlay setting).
--   2. A new private Storage bucket, `fullscreen-backgrounds`, with RLS
--      policies restricting every operation to the caller's own folder.
--      Path convention: `{user_id}/background` — one fixed key per user
--      (no extension; content-type is set via upload options), so
--      re-uploading always overwrites the same object instead of
--      accumulating orphaned files. RLS is enforced via
--      `storage.foldername(name)`, the standard Supabase per-user-folder
--      recipe: for a path like `abc123/background`,
--      `storage.foldername(name)` returns `{abc123}`, so
--      `(storage.foldername(name))[1] = auth.uid()::text` is exactly
--      "the first path segment is my own user id."
--
--      The bucket is deliberately NOT public — a public bucket would let
--      anyone with the URL view the image with no auth check at all, which
--      doesn't satisfy "each user can only access their own image." Size/
--      type limits are set on the bucket itself (file_size_limit,
--      allowed_mime_types) as a server-side backstop alongside the
--      client-side check in backgroundStorage.js's validateBackgroundFile —
--      a client-only check is trivially bypassable.
-- ============================================================================

alter table public.settings
  add column if not exists fullscreen_background_path text;

comment on column public.settings.fullscreen_background_path is
  'Supabase Storage path (fullscreen-backgrounds bucket), e.g. "{user_id}/background" — '
  'null when no custom background is set. Never a URL: the bucket is private, '
  'so the client resolves a short-lived signed URL from this path on demand.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fullscreen-backgrounds',
  'fullscreen-backgrounds',
  false,
  5242880, -- 5 MB, matches backgroundStorage.js's MAX_BACKGROUND_BYTES
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "fullscreen_backgrounds_select_own" on storage.objects
  for select using (
    bucket_id = 'fullscreen-backgrounds'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "fullscreen_backgrounds_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'fullscreen-backgrounds'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "fullscreen_backgrounds_update_own" on storage.objects
  for update using (
    bucket_id = 'fullscreen-backgrounds'
    and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'fullscreen-backgrounds'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "fullscreen_backgrounds_delete_own" on storage.objects
  for delete using (
    bucket_id = 'fullscreen-backgrounds'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- Schema-drift fix: settings/timer_state/ticks were falling behind the JS
-- side (root-caused via chat while investigating a "Couldn't sync your
-- data" banner that showed even when most data had actually synced fine —
-- see CLAUDE.md's Cloud sync section and remoteProvider.js's
-- initializeRemoteData() comment for the full write-up). Two concrete,
-- verified mismatches between this file and storage.js/usePomodoro.js:
--
--   1. `ticks.type`'s CHECK constraint only allowed 'pomodoro' /
--      'interruption-internal' / 'interruption-external' — but
--      usePomodoro.js's pause() has written a 'pause'-typed tick ever since
--      the Pause/Resume feature shipped. Any account with even one
--      guest-recorded pause before their first sign-in had that tick
--      rejected by Postgres, which poisoned the *entire* migration (see the
--      comment above initializeRemoteData for why one bad row used to do
--      that) even though every other collection had already synced fine.
--   2. `settings.theme`'s CHECK constraint only allowed 'dark' / 'light' —
--      but DEFAULT_SETTINGS.theme in storage.js is 'light-terracotta', and
--      lib/theme.js defines five real palette ids plus the 'custom' meta-
--      value. Essentially every real settings object (including a brand
--      new user's *default* one) violated this constraint, so the settings
--      row for practically every account failed to ever get created.
--
-- Also adds every `settings`/`timer_state` column that DEFAULT_SETTINGS/
-- normalizeTimerState in storage.js has actually sent since — this file's
-- original CREATE TABLE statements for these two tables were only ever
-- updated piecemeal (e.g. the Fullscreen-background block above added just
-- one column), never reconciled against the full current settings shape.
-- ============================================================================

alter table public.settings drop constraint if exists settings_theme_check;
alter table public.settings
  add constraint settings_theme_check
  check (theme in ('dark', 'light-terracotta', 'light-sage', 'light-sand', 'light-dusty-blue', 'custom'));

alter table public.ticks drop constraint if exists ticks_type_check;
alter table public.ticks
  add constraint ticks_type_check
  check (type in ('pomodoro', 'interruption-internal', 'interruption-external', 'pause'));

alter table public.settings
  add column if not exists work_minutes integer not null default 25,
  add column if not exists short_break_minutes integer not null default 5,
  add column if not exists long_break_minutes integer not null default 15,
  add column if not exists auto_start_breaks boolean not null default false,
  add column if not exists auto_start_pomodoros boolean not null default false,
  add column if not exists sound_volume integer not null default 100,
  add column if not exists ambient_volume integer not null default 100,
  add column if not exists ambient_sound text not null default 'none',
  add column if not exists check_to_bottom boolean not null default false,
  add column if not exists display_name text not null default '',
  add column if not exists custom_theme_general text,
  add column if not exists custom_theme_focus text,
  add column if not exists custom_theme_short_break text,
  add column if not exists custom_theme_long_break text;

alter table public.timer_state
  add column if not exists end_at timestamptz;

-- ----------------------------------------------------------------------------
-- Contextual onboarding coach marks (seenCoachMarks in DEFAULT_SETTINGS) —
-- ids of the per-section methodology hints (Timer/Planning/Reports/Settings)
-- the user has already dismissed or engaged with, so each shows at most
-- once. Stored as jsonb (a JS string array), matching how every other
-- Postgres-side array field in this schema round-trips a JS array, and
-- defaulting to an empty array so an existing row that predates this column
-- reads back exactly like a fresh account (no coach marks seen yet).
-- Client-side degrades gracefully if this column hasn't been applied yet —
-- see storage.js's DEFAULT_SETTINGS.seenCoachMarks comment.
-- ----------------------------------------------------------------------------
alter table public.settings
  add column if not exists seen_coach_marks jsonb not null default '[]'::jsonb;

-- ----------------------------------------------------------------------------
-- Daily Pomodoro goal (dailyPomodoroGoal in DEFAULT_SETTINGS) — captured
-- (optionally) in AccountSetupFlow's last step, also editable afterward in
-- Settings and referenced by Reports' "Pomodoros today" stat. Nullable, no
-- default: null means "never set," not defaulted to a specific number, which
-- would misrepresent an unset goal as a real choice. Client-side degrades
-- gracefully if this column hasn't been applied yet — same reasoning as
-- seen_coach_marks above.
-- ----------------------------------------------------------------------------
alter table public.settings
  add column if not exists daily_pomodoro_goal integer;
