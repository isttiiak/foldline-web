-- Custom statuses and custom fields. (Rating scales need no table: the reader's choice lives
-- in profiles.settings.rating_scale and ratings stay 1-10 in reads.rating.)
--
-- custom_statuses  the reader's own names inside a reading state ("Up next" inside Planned,
--                  "Book club" inside Reading). base_state is the built-in state it belongs
--                  to; a read with a custom status is always in that state (kept in TypeScript).
-- reads.custom_status_id  the read's custom status, if any. Removing a status clears it.
-- custom_fields    extra fields the reader adds to every book (kind: text, number, date,
--                  yes/no or a choice from options).
-- works.custom_values  the values, as { "<field id>": value }, validated in TypeScript.

create table public.custom_statuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  base_state public.read_state not null,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint custom_statuses_id_user_id_key unique (id, user_id)
);

comment on table public.custom_statuses is
  'The reader''s own statuses, each inside one built-in reading state.';

create unique index custom_statuses_user_id_name_key
  on public.custom_statuses (user_id, lower(btrim(name)));

create trigger custom_statuses_set_updated_at
  before update on public.custom_statuses
  for each row execute function public.set_updated_at();

alter table public.reads add column custom_status_id uuid;
alter table public.reads add constraint reads_custom_status_id_user_id_fkey
  foreign key (custom_status_id, user_id) references public.custom_statuses (id, user_id)
  on delete set null (custom_status_id);
create index reads_custom_status_id_idx on public.reads (custom_status_id)
  where custom_status_id is not null;

create type public.custom_field_kind as enum ('text', 'number', 'date', 'boolean', 'choice');

create table public.custom_fields (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  kind public.custom_field_kind not null,
  options text[] not null default '{}' check (cardinality(options) <= 30),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint custom_fields_choice_has_options check (kind <> 'choice' or cardinality(options) >= 1)
);

comment on table public.custom_fields is 'Extra fields the reader adds to their books.';

create unique index custom_fields_user_id_name_key
  on public.custom_fields (user_id, lower(btrim(name)));

create trigger custom_fields_set_updated_at
  before update on public.custom_fields
  for each row execute function public.set_updated_at();

alter table public.works add column custom_values jsonb not null default '{}'::jsonb;
alter table public.works add constraint works_custom_values_shape check (
  jsonb_typeof(custom_values) = 'object' and pg_column_size(custom_values) <= 20000
);

alter table public.custom_statuses enable row level security;
alter table public.custom_fields enable row level security;

create policy "custom_statuses_select_own" on public.custom_statuses
  for select to authenticated using (user_id = (select auth.uid()));
create policy "custom_statuses_insert_own" on public.custom_statuses
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "custom_statuses_update_own" on public.custom_statuses
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "custom_statuses_delete_own" on public.custom_statuses
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "custom_fields_select_own" on public.custom_fields
  for select to authenticated using (user_id = (select auth.uid()));
create policy "custom_fields_insert_own" on public.custom_fields
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "custom_fields_update_own" on public.custom_fields
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "custom_fields_delete_own" on public.custom_fields
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on table public.custom_statuses, public.custom_fields from anon, authenticated;
grant select, insert, update, delete on table public.custom_statuses, public.custom_fields
  to authenticated, service_role;
