-- Core library: works, authors, work_authors, editions, reads, progress_events (per user)
-- and provider_cache (global, server-only).
--
-- The catalog is per user: every row belongs to exactly one user and RLS scopes it to
-- auth.uid(). Child tables reference their parent through (id, user_id) pairs, so a row
-- can only ever point at a parent owned by the same user, whoever writes it.

create extension if not exists pg_trgm with schema extensions;

-- Enums ---------------------------------------------------------------------------------

create type public.edition_format as enum ('paperback', 'hardcover', 'ebook', 'audiobook', 'other');
create type public.read_state as enum ('planned', 'reading', 'resting', 'finished', 'dnf');
create type public.progress_unit as enum ('pages', 'percent', 'location', 'minutes', 'chapter');
create type public.progress_source as enum ('manual', 'koreader', 'kindle', 'import', 'audiobookshelf');
create type public.work_author_role as enum ('author', 'translator', 'editor', 'illustrator', 'narrator');

-- works ---------------------------------------------------------------------------------

create table public.works (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 1000),
  subtitle text check (char_length(subtitle) <= 1000),
  original_title text check (char_length(original_title) <= 1000),
  original_language text check (char_length(original_language) <= 35),
  description text check (char_length(description) <= 20000),
  series_name text check (char_length(series_name) <= 500),
  series_position numeric check (series_position >= 0),
  field_locks text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint works_id_user_id_key unique (id, user_id)
);

comment on table public.works is 'A book as an idea (title, series). One row per user per book.';

-- authors -------------------------------------------------------------------------------

create table public.authors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 500),
  sort_name text check (char_length(sort_name) <= 500),
  provider_ids jsonb not null default '{}'::jsonb check (jsonb_typeof(provider_ids) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint authors_id_user_id_key unique (id, user_id)
);

comment on table public.authors is 'People credited on works. Namesakes are allowed.';

-- work_authors --------------------------------------------------------------------------

create table public.work_authors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  work_id uuid not null,
  author_id uuid not null,
  role public.work_author_role not null default 'author',
  position smallint not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_authors_work_id_author_id_role_key unique (work_id, author_id, role),
  constraint work_authors_work_id_user_id_fkey foreign key (work_id, user_id)
    references public.works (id, user_id) on delete cascade,
  constraint work_authors_author_id_user_id_fkey foreign key (author_id, user_id)
    references public.authors (id, user_id) on delete cascade
);

comment on table public.work_authors is 'Who is credited on a work, in which role and order.';

-- editions ------------------------------------------------------------------------------

create table public.editions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  work_id uuid not null,
  title text check (char_length(btrim(title)) between 1 and 1000),
  subtitle text check (char_length(subtitle) <= 1000),
  format public.edition_format not null default 'other',
  isbn_10 text check (isbn_10 ~ '^[0-9]{9}[0-9X]$'),
  isbn_13 text check (isbn_13 ~ '^97[89][0-9]{10}$'),
  publisher text check (char_length(publisher) <= 500),
  published_date text check (char_length(published_date) <= 50),
  page_count integer check (page_count > 0),
  duration_minutes integer check (duration_minutes > 0),
  language text check (char_length(language) <= 35),
  cover_url text check (cover_url ~ '^https://' and char_length(cover_url) <= 2000),
  cover_storage_path text check (char_length(cover_storage_path) <= 500),
  provider_ids jsonb not null default '{}'::jsonb check (jsonb_typeof(provider_ids) = 'object'),
  field_locks text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint editions_id_user_id_key unique (id, user_id),
  constraint editions_id_work_id_user_id_key unique (id, work_id, user_id),
  constraint editions_work_id_user_id_fkey foreign key (work_id, user_id)
    references public.works (id, user_id) on update cascade on delete cascade
);

comment on table public.editions is
  'A concrete form of a work (format, ISBN, pages). title/subtitle override the work''s.';

-- reads ---------------------------------------------------------------------------------

create table public.reads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  work_id uuid not null,
  edition_id uuid,
  state public.read_state not null default 'planned',
  started_on date,
  finished_on date,
  stopped_on date,
  rating smallint check (rating between 1 and 10),
  reflection text check (char_length(reflection) <= 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reads_id_user_id_key unique (id, user_id),
  constraint reads_finished_after_started check (finished_on >= started_on),
  constraint reads_stopped_after_started check (stopped_on >= started_on),
  constraint reads_work_id_user_id_fkey foreign key (work_id, user_id)
    references public.works (id, user_id) on delete cascade,
  -- The edition must belong to the same work; deleting it keeps the read.
  constraint reads_edition_id_work_id_user_id_fkey foreign key (edition_id, work_id, user_id)
    references public.editions (id, work_id, user_id)
    on update cascade on delete set null (edition_id)
);

comment on table public.reads is
  'One reading attempt of a work; rereads are more rows. rating is 1-10 (half stars on 5).';

-- progress_events -----------------------------------------------------------------------

create table public.progress_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  read_id uuid not null,
  occurred_at timestamptz not null default now(),
  unit public.progress_unit not null,
  value numeric not null check (value >= 0),
  fraction numeric check (fraction between 0 and 1),
  source public.progress_source not null default 'manual',
  device text check (char_length(device) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint progress_events_percent_max check (unit <> 'percent' or value <= 100),
  constraint progress_events_read_id_user_id_fkey foreign key (read_id, user_id)
    references public.reads (id, user_id) on delete cascade
);

comment on table public.progress_events is
  'Progress logged against a read, in any unit. fraction (0..1) is the normalised position.';

-- Indexes -------------------------------------------------------------------------------

create index works_user_id_idx on public.works (user_id);
create index works_title_trgm_idx on public.works using gin (title extensions.gin_trgm_ops);
create index authors_user_id_idx on public.authors (user_id);
create index authors_name_trgm_idx on public.authors using gin (name extensions.gin_trgm_ops);
create index work_authors_user_id_idx on public.work_authors (user_id);
create index work_authors_work_id_position_idx on public.work_authors (work_id, position);
create index work_authors_author_id_idx on public.work_authors (author_id);
create index editions_work_id_idx on public.editions (work_id);
create unique index editions_user_id_isbn_13_key on public.editions (user_id, isbn_13)
  where isbn_13 is not null;
create index reads_user_id_state_idx on public.reads (user_id, state);
create index reads_work_id_idx on public.reads (work_id);
create index reads_edition_id_idx on public.reads (edition_id);
create index progress_events_read_id_occurred_at_idx
  on public.progress_events (read_id, occurred_at desc);
create index progress_events_user_id_occurred_at_idx
  on public.progress_events (user_id, occurred_at desc);

-- updated_at triggers -------------------------------------------------------------------

create trigger works_set_updated_at
  before update on public.works
  for each row execute function public.set_updated_at();
create trigger authors_set_updated_at
  before update on public.authors
  for each row execute function public.set_updated_at();
create trigger work_authors_set_updated_at
  before update on public.work_authors
  for each row execute function public.set_updated_at();
create trigger editions_set_updated_at
  before update on public.editions
  for each row execute function public.set_updated_at();
create trigger reads_set_updated_at
  before update on public.reads
  for each row execute function public.set_updated_at();
create trigger progress_events_set_updated_at
  before update on public.progress_events
  for each row execute function public.set_updated_at();

-- RLS: each user sees and changes only their own rows -----------------------------------

alter table public.works enable row level security;
alter table public.authors enable row level security;
alter table public.work_authors enable row level security;
alter table public.editions enable row level security;
alter table public.reads enable row level security;
alter table public.progress_events enable row level security;

create policy "works_select_own" on public.works
  for select to authenticated using (user_id = (select auth.uid()));
create policy "works_insert_own" on public.works
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "works_update_own" on public.works
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "works_delete_own" on public.works
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "authors_select_own" on public.authors
  for select to authenticated using (user_id = (select auth.uid()));
create policy "authors_insert_own" on public.authors
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "authors_update_own" on public.authors
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "authors_delete_own" on public.authors
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "work_authors_select_own" on public.work_authors
  for select to authenticated using (user_id = (select auth.uid()));
create policy "work_authors_insert_own" on public.work_authors
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "work_authors_update_own" on public.work_authors
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "work_authors_delete_own" on public.work_authors
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "editions_select_own" on public.editions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "editions_insert_own" on public.editions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "editions_update_own" on public.editions
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "editions_delete_own" on public.editions
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "reads_select_own" on public.reads
  for select to authenticated using (user_id = (select auth.uid()));
create policy "reads_insert_own" on public.reads
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "reads_update_own" on public.reads
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "reads_delete_own" on public.reads
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "progress_events_select_own" on public.progress_events
  for select to authenticated using (user_id = (select auth.uid()));
create policy "progress_events_insert_own" on public.progress_events
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "progress_events_update_own" on public.progress_events
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "progress_events_delete_own" on public.progress_events
  for delete to authenticated using (user_id = (select auth.uid()));

-- Grants: signed-in users get row access (RLS still applies), anonymous visitors none.

revoke all on table
  public.works, public.authors, public.work_authors,
  public.editions, public.reads, public.progress_events
  from anon, authenticated;

grant select, insert, update, delete on table
  public.works, public.authors, public.work_authors,
  public.editions, public.reads, public.progress_events
  to authenticated;

grant select, insert, update, delete on table
  public.works, public.authors, public.work_authors,
  public.editions, public.reads, public.progress_events
  to service_role;

-- provider_cache ------------------------------------------------------------------------
-- Shared cache of metadata provider responses. Not user-owned: like rate_limits, RLS is on
-- with NO policies and anon/authenticated have no grants, so only the server can use it.

create table public.provider_cache (
  provider text not null check (provider in ('openlibrary', 'googlebooks', 'hardcover')),
  cache_key text not null check (char_length(cache_key) between 1 and 500),
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (provider, cache_key)
);

comment on table public.provider_cache is
  'Metadata provider responses keyed by provider and normalised query or ISBN. Server-only.';

create index provider_cache_expires_at_idx on public.provider_cache (expires_at);

alter table public.provider_cache enable row level security;

revoke all on table public.provider_cache from anon, authenticated;
grant select, insert, update, delete on table public.provider_cache to service_role;
