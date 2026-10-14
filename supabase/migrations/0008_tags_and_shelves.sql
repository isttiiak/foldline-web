-- Tags, manual shelves and smart shelves.
--
-- tags         the reader's own labels (genres, moods, anything). Names are unique per reader,
--              ignoring case. tone is one of the app's warm colours (checked in TypeScript).
-- work_tags    which books carry which tags.
-- shelves      'manual' shelves hold the books the reader puts on them (shelf_items);
--              'smart' shelves are a saved library view (query jsonb: search, state, format,
--              tag, status, sort), validated in TypeScript and evaluated in the app.
-- shelf_items  the books on a manual shelf.
--
-- Same-owner references use composite foreign keys, like the library tables (0003).

-- tags -------------------------------------------------------------------------------------

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  tone text check (char_length(tone) <= 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tags_id_user_id_key unique (id, user_id)
);

comment on table public.tags is 'The reader''s own labels for books. Private to the owner.';

create unique index tags_user_id_name_key on public.tags (user_id, lower(btrim(name)));

create trigger tags_set_updated_at
  before update on public.tags
  for each row execute function public.set_updated_at();

-- work_tags --------------------------------------------------------------------------------

create table public.work_tags (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  work_id uuid not null,
  tag_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (work_id, tag_id),
  constraint work_tags_work_id_user_id_fkey foreign key (work_id, user_id)
    references public.works (id, user_id) on delete cascade,
  constraint work_tags_tag_id_user_id_fkey foreign key (tag_id, user_id)
    references public.tags (id, user_id) on delete cascade
);

comment on table public.work_tags is 'Which of the reader''s books carry which of their tags.';

create index work_tags_user_id_idx on public.work_tags (user_id);
create index work_tags_tag_id_idx on public.work_tags (tag_id);

-- shelves ----------------------------------------------------------------------------------

create type public.shelf_kind as enum ('manual', 'smart');

create table public.shelves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  description text check (char_length(description) <= 280),
  kind public.shelf_kind not null default 'manual',
  query jsonb,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shelves_id_user_id_key unique (id, user_id),
  -- A smart shelf is its saved view; a manual shelf has none.
  constraint shelves_query_matches_kind check (
    (kind = 'smart' and query is not null and jsonb_typeof(query) = 'object')
    or (kind = 'manual' and query is null)
  ),
  constraint shelves_query_size check (query is null or pg_column_size(query) <= 2000)
);

comment on table public.shelves is
  'Manual shelves (books placed by hand) and smart shelves (a saved library view).';

create index shelves_user_id_idx on public.shelves (user_id, position);

create trigger shelves_set_updated_at
  before update on public.shelves
  for each row execute function public.set_updated_at();

-- shelf_items ------------------------------------------------------------------------------

create table public.shelf_items (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  shelf_id uuid not null,
  work_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (shelf_id, work_id),
  constraint shelf_items_shelf_id_user_id_fkey foreign key (shelf_id, user_id)
    references public.shelves (id, user_id) on delete cascade,
  constraint shelf_items_work_id_user_id_fkey foreign key (work_id, user_id)
    references public.works (id, user_id) on delete cascade
);

comment on table public.shelf_items is 'The books on a manual shelf.';

create index shelf_items_user_id_idx on public.shelf_items (user_id);
create index shelf_items_work_id_idx on public.shelf_items (work_id);

-- A smart shelf holds no items (checked when an item is added).
create function public.shelf_items_manual_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.shelves s where s.id = new.shelf_id and s.kind <> 'manual'
  ) then
    raise exception 'books can only be placed on a manual shelf' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger shelf_items_manual_only
  before insert or update on public.shelf_items
  for each row execute function public.shelf_items_manual_only();

-- RLS ----------------------------------------------------------------------------------------

alter table public.tags enable row level security;
alter table public.work_tags enable row level security;
alter table public.shelves enable row level security;
alter table public.shelf_items enable row level security;

create policy "tags_select_own" on public.tags
  for select to authenticated using (user_id = (select auth.uid()));
create policy "tags_insert_own" on public.tags
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "tags_update_own" on public.tags
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "tags_delete_own" on public.tags
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "work_tags_select_own" on public.work_tags
  for select to authenticated using (user_id = (select auth.uid()));
create policy "work_tags_insert_own" on public.work_tags
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "work_tags_update_own" on public.work_tags
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "work_tags_delete_own" on public.work_tags
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "shelves_select_own" on public.shelves
  for select to authenticated using (user_id = (select auth.uid()));
create policy "shelves_insert_own" on public.shelves
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "shelves_update_own" on public.shelves
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "shelves_delete_own" on public.shelves
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "shelf_items_select_own" on public.shelf_items
  for select to authenticated using (user_id = (select auth.uid()));
create policy "shelf_items_insert_own" on public.shelf_items
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "shelf_items_update_own" on public.shelf_items
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "shelf_items_delete_own" on public.shelf_items
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on table public.tags, public.work_tags, public.shelves, public.shelf_items
  from anon, authenticated;
grant select, insert, update, delete
  on table public.tags, public.work_tags, public.shelves, public.shelf_items
  to authenticated, service_role;
revoke all on function public.shelf_items_manual_only() from public, anon, authenticated;
