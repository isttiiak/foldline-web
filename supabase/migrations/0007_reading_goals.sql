-- Opt-in reading goals: books or pages over a year, a month or a custom range.
--
-- Nothing exists until a reader creates a goal. Progress is calculated in TypeScript from
-- reads and progress_events; this table stores only what the reader chose. A reader may
-- have several goals at once and may hide or remove any of them.
--   period         how the range was picked ('year', 'month' or 'custom'); the dates are
--                  always stored, so the app never has to recompute them.
--   hidden         kept, but left off the library card and folded away on the goals page.
--   celebrated_at  when the "goal reached" moment was shown, so it plays only once.

create type public.goal_metric as enum ('books', 'pages');
create type public.goal_period as enum ('year', 'month', 'custom');

create table public.reading_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  metric public.goal_metric not null,
  period public.goal_period not null,
  starts_on date not null,
  ends_on date not null,
  target integer not null check (target >= 1),
  label text check (char_length(btrim(label)) between 1 and 80),
  hidden boolean not null default false,
  celebrated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reading_goals_ends_after_starts check (ends_on >= starts_on),
  constraint reading_goals_span_max check (ends_on - starts_on <= 1100),
  constraint reading_goals_target_max check (
    (metric = 'books' and target <= 10000) or (metric = 'pages' and target <= 10000000)
  )
);

comment on table public.reading_goals is
  'Opt-in reading goals (books or pages between two dates). Private to the owner.';

create index reading_goals_user_id_ends_on_idx on public.reading_goals (user_id, ends_on);

create trigger reading_goals_set_updated_at
  before update on public.reading_goals
  for each row execute function public.set_updated_at();

alter table public.reading_goals enable row level security;

create policy "reading_goals_select_own" on public.reading_goals
  for select to authenticated using (user_id = (select auth.uid()));
create policy "reading_goals_insert_own" on public.reading_goals
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "reading_goals_update_own" on public.reading_goals
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "reading_goals_delete_own" on public.reading_goals
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on table public.reading_goals from anon, authenticated;
grant select, insert, update, delete on table public.reading_goals to authenticated;
grant select, insert, update, delete on table public.reading_goals to service_role;
