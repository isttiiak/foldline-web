-- Copies and loans.
--
-- copies  a copy of a book the reader has (or has had) in hand: how they hold it (owned,
--         borrowed, from a library, through a subscription), optionally which edition,
--         where it lives, when it arrived and a note.
-- loans   a copy going out (lent to someone) or coming in (borrowed from someone or a
--         library), with dates. A loan is open until returned_on is set.

create type public.copy_ownership as enum ('owned', 'borrowed', 'library', 'subscription');
create type public.loan_direction as enum ('lent', 'borrowed');

create table public.copies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  work_id uuid not null,
  edition_id uuid,
  ownership public.copy_ownership not null default 'owned',
  location text check (char_length(location) <= 120),
  acquired_on date,
  note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint copies_id_user_id_key unique (id, user_id),
  constraint copies_work_id_user_id_fkey foreign key (work_id, user_id)
    references public.works (id, user_id) on delete cascade,
  -- The edition must belong to the same work; deleting it keeps the copy.
  constraint copies_edition_id_work_id_user_id_fkey foreign key (edition_id, work_id, user_id)
    references public.editions (id, work_id, user_id)
    on update cascade on delete set null (edition_id)
);

comment on table public.copies is 'Copies of a book the reader holds: owned, borrowed or loaned.';

create index copies_user_id_idx on public.copies (user_id);
create index copies_work_id_idx on public.copies (work_id);

create trigger copies_set_updated_at
  before update on public.copies
  for each row execute function public.set_updated_at();

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  copy_id uuid not null,
  direction public.loan_direction not null,
  person text not null check (char_length(btrim(person)) between 1 and 80),
  started_on date not null,
  due_on date,
  returned_on date,
  note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint loans_due_after_start check (due_on >= started_on),
  constraint loans_returned_after_start check (returned_on >= started_on),
  constraint loans_copy_id_user_id_fkey foreign key (copy_id, user_id)
    references public.copies (id, user_id) on delete cascade
);

comment on table public.loans is
  'A copy lent to someone or borrowed from someone; open until returned_on is set.';

create index loans_user_id_idx on public.loans (user_id) where returned_on is null;
create index loans_copy_id_idx on public.loans (copy_id, started_on desc);
-- At most one open loan per copy.
create unique index loans_one_open_per_copy on public.loans (copy_id) where returned_on is null;

create trigger loans_set_updated_at
  before update on public.loans
  for each row execute function public.set_updated_at();

alter table public.copies enable row level security;
alter table public.loans enable row level security;

create policy "copies_select_own" on public.copies
  for select to authenticated using (user_id = (select auth.uid()));
create policy "copies_insert_own" on public.copies
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "copies_update_own" on public.copies
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "copies_delete_own" on public.copies
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "loans_select_own" on public.loans
  for select to authenticated using (user_id = (select auth.uid()));
create policy "loans_insert_own" on public.loans
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "loans_update_own" on public.loans
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "loans_delete_own" on public.loans
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on table public.copies, public.loans from anon, authenticated;
grant select, insert, update, delete on table public.copies, public.loans
  to authenticated, service_role;
