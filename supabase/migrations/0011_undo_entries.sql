-- Undo for library-wide changes.
--
-- undo_entries  a snapshot of what a bulk edit, a merge or an import changed, so the reader
--               can put it back for a day. kind says how to replay it (checked in TypeScript
--               as well); payload holds the snapshot. Expired entries are swept by the app
--               on the next change, so no cron job is needed.

create table public.undo_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('bulk', 'merge-works', 'merge-editions', 'import')),
  label text not null check (char_length(label) between 1 and 200),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '1 day',
  constraint undo_entries_payload_size check (pg_column_size(payload) <= 2000000)
);

comment on table public.undo_entries is
  'Snapshots of bulk edits, merges and imports, kept for a day so they can be undone.';

create index undo_entries_user_id_created_at_idx on public.undo_entries (user_id, created_at desc);
create index undo_entries_expires_at_idx on public.undo_entries (expires_at);

alter table public.undo_entries enable row level security;

create policy "undo_entries_select_own" on public.undo_entries
  for select to authenticated using (user_id = (select auth.uid()));
create policy "undo_entries_insert_own" on public.undo_entries
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "undo_entries_update_own" on public.undo_entries
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "undo_entries_delete_own" on public.undo_entries
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on table public.undo_entries from anon, authenticated;
grant select, insert, update, delete on table public.undo_entries to authenticated, service_role;
