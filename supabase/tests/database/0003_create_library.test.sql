begin;

create extension if not exists pgtap with schema extensions;

select plan(87);

-- Structure ------------------------------------------------------------------------------

select ok(
  (select bool_and(relrowsecurity) from pg_class
    where oid in (
      'public.works'::regclass, 'public.authors'::regclass, 'public.work_authors'::regclass,
      'public.editions'::regclass, 'public.reads'::regclass,
      'public.progress_events'::regclass, 'public.provider_cache'::regclass
    )),
  'RLS is enabled on every library table'
);

select has_index('public', 'works', 'works_title_trgm_idx', 'works.title has a trigram index');
select has_index('public', 'authors', 'authors_name_trgm_idx', 'authors.name has a trigram index');
select has_index(
  'public', 'progress_events', 'progress_events_read_id_occurred_at_idx',
  'progress_events has a (read_id, occurred_at desc) index'
);

-- Two users. B's library is seeded as the superuser.
insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'a@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.test');

insert into public.works (id, user_id, title)
values ('b0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'B''s book');
insert into public.authors (id, user_id, name)
values ('b0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'B''s author');
insert into public.work_authors (id, user_id, work_id, author_id)
values (
  'b0000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222',
  'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002'
);
insert into public.editions (id, user_id, work_id, format, isbn_13)
values (
  'b0000000-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222',
  'b0000000-0000-0000-0000-000000000001', 'paperback', '9780140449136'
);
insert into public.reads (id, user_id, work_id, edition_id, state, rating)
values (
  'b0000000-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222',
  'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004',
  'reading', 8
);
insert into public.progress_events (id, user_id, read_id, unit, value, fraction)
values (
  'b0000000-0000-0000-0000-000000000006', '22222222-2222-2222-2222-222222222222',
  'b0000000-0000-0000-0000-000000000005', 'pages', 42, 0.2
);

-- Act as user A ---------------------------------------------------------------------------

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}',
  true
);

-- A cannot see B's rows.
select is_empty('select id from public.works', 'user A sees no works of user B');
select is_empty('select id from public.authors', 'user A sees no authors of user B');
select is_empty('select id from public.work_authors', 'user A sees no work_authors of user B');
select is_empty('select id from public.editions', 'user A sees no editions of user B');
select is_empty('select id from public.reads', 'user A sees no reads of user B');
select is_empty('select id from public.progress_events', 'user A sees no progress of user B');

-- A cannot insert rows owned by B.
select throws_ok(
  $$insert into public.works (user_id, title)
    values ('22222222-2222-2222-2222-222222222222', 'planted')$$,
  '42501', null, 'user A cannot insert a work for user B'
);
select throws_ok(
  $$insert into public.authors (user_id, name)
    values ('22222222-2222-2222-2222-222222222222', 'planted')$$,
  '42501', null, 'user A cannot insert an author for user B'
);
select throws_ok(
  $$insert into public.work_authors (user_id, work_id, author_id)
    values ('22222222-2222-2222-2222-222222222222',
            'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002')$$,
  '42501', null, 'user A cannot insert a work_author for user B'
);
select throws_ok(
  $$insert into public.editions (user_id, work_id)
    values ('22222222-2222-2222-2222-222222222222', 'b0000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'user A cannot insert an edition for user B'
);
select throws_ok(
  $$insert into public.reads (user_id, work_id)
    values ('22222222-2222-2222-2222-222222222222', 'b0000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'user A cannot insert a read for user B'
);
select throws_ok(
  $$insert into public.progress_events (user_id, read_id, unit, value)
    values ('22222222-2222-2222-2222-222222222222',
            'b0000000-0000-0000-0000-000000000005', 'pages', 1)$$,
  '42501', null, 'user A cannot insert progress for user B'
);

-- A's updates and deletes of B's rows silently match nothing (checked below as superuser).
update public.works set title = 'hacked' where id = 'b0000000-0000-0000-0000-000000000001';
update public.authors set name = 'hacked' where id = 'b0000000-0000-0000-0000-000000000002';
update public.work_authors set position = 9 where id = 'b0000000-0000-0000-0000-000000000003';
update public.editions set publisher = 'hacked' where id = 'b0000000-0000-0000-0000-000000000004';
update public.reads set reflection = 'hacked' where id = 'b0000000-0000-0000-0000-000000000005';
update public.progress_events set device = 'hacked' where id = 'b0000000-0000-0000-0000-000000000006';

delete from public.progress_events where id = 'b0000000-0000-0000-0000-000000000006';
delete from public.reads where id = 'b0000000-0000-0000-0000-000000000005';
delete from public.editions where id = 'b0000000-0000-0000-0000-000000000004';
delete from public.work_authors where id = 'b0000000-0000-0000-0000-000000000003';
delete from public.authors where id = 'b0000000-0000-0000-0000-000000000002';
delete from public.works where id = 'b0000000-0000-0000-0000-000000000001';

-- A builds their own library; user_id defaults to auth.uid().
select lives_ok(
  $$insert into public.works (id, title) values
      ('a0000000-0000-0000-0000-000000000001', 'A''s book'),
      ('a0000000-0000-0000-0000-000000000007', 'A''s other book')$$,
  'user A can add works'
);
select lives_ok(
  $$insert into public.authors (id, name) values ('a0000000-0000-0000-0000-000000000002', 'A''s author')$$,
  'user A can add an author'
);
select lives_ok(
  $$insert into public.work_authors (id, work_id, author_id)
    values ('a0000000-0000-0000-0000-000000000003',
            'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002')$$,
  'user A can credit their author on their work'
);
select lives_ok(
  $$insert into public.editions (id, work_id, format, isbn_13, title) values
      ('a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
       'ebook', '9780140449136', 'A''s translated title'),
      ('a0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000007',
       'audiobook', null, null)$$,
  'user A can add editions, even with an ISBN-13 user B also has'
);
select lives_ok(
  $$insert into public.reads (id, work_id, edition_id, state, started_on, finished_on, rating)
    values ('a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001',
            'a0000000-0000-0000-0000-000000000004', 'finished', '2026-01-01', '2026-02-01', 10)$$,
  'user A can add a read'
);
select lives_ok(
  $$insert into public.progress_events (id, read_id, unit, value, fraction, source)
    values ('a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000005',
            'percent', 100, 1, 'kindle')$$,
  'user A can log progress'
);

select results_eq(
  'select user_id from public.works',
  $$values ('11111111-1111-1111-1111-111111111111'::uuid),
           ('11111111-1111-1111-1111-111111111111'::uuid)$$,
  'user A sees exactly their own works, owned by them'
);
select is((select count(*) from public.authors), 1::bigint, 'user A sees their own author');
select is((select count(*) from public.work_authors), 1::bigint, 'user A sees their own credit');
select is((select count(*) from public.editions), 2::bigint, 'user A sees their own editions');
select is((select count(*) from public.reads), 1::bigint, 'user A sees their own read');
select is((select count(*) from public.progress_events), 1::bigint, 'user A sees their own progress');

-- A cannot hand their rows over to B.
select throws_ok(
  $$update public.works set user_id = '22222222-2222-2222-2222-222222222222'
    where id = 'a0000000-0000-0000-0000-000000000007'$$,
  '42501', null, 'user A cannot move a work to user B'
);
select throws_ok(
  $$update public.progress_events set user_id = '22222222-2222-2222-2222-222222222222'
    where id = 'a0000000-0000-0000-0000-000000000006'$$,
  '42501', null, 'user A cannot move progress to user B'
);

-- Cross-user references are impossible, even with a known id.
select throws_ok(
  $$insert into public.reads (work_id) values ('b0000000-0000-0000-0000-000000000001')$$,
  '23503', null, 'user A cannot attach a read to user B''s work'
);
select throws_ok(
  $$insert into public.editions (work_id) values ('b0000000-0000-0000-0000-000000000001')$$,
  '23503', null, 'user A cannot attach an edition to user B''s work'
);
select throws_ok(
  $$insert into public.work_authors (work_id, author_id)
    values ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002')$$,
  '23503', null, 'user A cannot credit user B''s author'
);
select throws_ok(
  $$insert into public.work_authors (work_id, author_id)
    values ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002')$$,
  '23503', null, 'user A cannot credit on user B''s work'
);
select throws_ok(
  $$insert into public.progress_events (read_id, unit, value)
    values ('b0000000-0000-0000-0000-000000000005', 'pages', 1)$$,
  '23503', null, 'user A cannot log progress on user B''s read'
);
select throws_ok(
  $$insert into public.reads (work_id, edition_id)
    values ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004')$$,
  '23503', null, 'user A cannot use user B''s edition for a read'
);
select throws_ok(
  $$update public.reads set work_id = 'b0000000-0000-0000-0000-000000000001', edition_id = null
    where id = 'a0000000-0000-0000-0000-000000000005'$$,
  '23503', null, 'user A cannot repoint a read at user B''s work'
);
select throws_ok(
  $$insert into public.reads (work_id, edition_id)
    values ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000008')$$,
  '23503', null, 'a read''s edition must belong to the read''s work'
);

-- Check constraints.
select throws_ok(
  $$insert into public.works (title) values ('   ')$$,
  '23514', null, 'a work needs a non-blank title'
);
select throws_ok(
  $$insert into public.authors (name) values ('')$$,
  '23514', null, 'an author needs a name'
);
select throws_ok(
  $$insert into public.authors (name, provider_ids) values ('X', '[]')$$,
  '23514', null, 'provider_ids must be an object'
);
select throws_ok(
  $$insert into public.editions (work_id, isbn_13)
    values ('a0000000-0000-0000-0000-000000000001', '978-0140449136')$$,
  '23514', null, 'isbn_13 is stored normalised (digits only)'
);
select throws_ok(
  $$insert into public.editions (work_id, isbn_10)
    values ('a0000000-0000-0000-0000-000000000001', '014044913')$$,
  '23514', null, 'isbn_10 must have ten characters'
);
select throws_ok(
  $$insert into public.editions (work_id, cover_url)
    values ('a0000000-0000-0000-0000-000000000001', 'javascript:alert(1)')$$,
  '23514', null, 'cover_url must be https'
);
select throws_ok(
  $$insert into public.editions (work_id, page_count)
    values ('a0000000-0000-0000-0000-000000000001', 0)$$,
  '23514', null, 'page_count must be positive'
);
select throws_ok(
  $$insert into public.editions (work_id, isbn_13)
    values ('a0000000-0000-0000-0000-000000000007', '9780140449136')$$,
  '23505', null, 'an ISBN-13 appears once per user'
);
select throws_ok(
  $$insert into public.reads (work_id, started_on, finished_on)
    values ('a0000000-0000-0000-0000-000000000001', '2026-02-01', '2026-01-01')$$,
  '23514', null, 'a read cannot finish before it starts'
);
select throws_ok(
  $$insert into public.reads (work_id, started_on, stopped_on)
    values ('a0000000-0000-0000-0000-000000000001', '2026-02-01', '2026-01-01')$$,
  '23514', null, 'a read cannot stop before it starts'
);
select throws_ok(
  $$insert into public.reads (work_id, rating) values ('a0000000-0000-0000-0000-000000000001', 11)$$,
  '23514', null, 'rating is at most 10'
);
select throws_ok(
  $$insert into public.reads (work_id, rating) values ('a0000000-0000-0000-0000-000000000001', 0)$$,
  '23514', null, 'rating is at least 1'
);
select throws_ok(
  $$insert into public.progress_events (read_id, unit, value, fraction)
    values ('a0000000-0000-0000-0000-000000000005', 'pages', 10, 1.5)$$,
  '23514', null, 'fraction is at most 1'
);
select throws_ok(
  $$insert into public.progress_events (read_id, unit, value, fraction)
    values ('a0000000-0000-0000-0000-000000000005', 'pages', 10, -0.1)$$,
  '23514', null, 'fraction is at least 0'
);
select throws_ok(
  $$insert into public.progress_events (read_id, unit, value)
    values ('a0000000-0000-0000-0000-000000000005', 'percent', 120)$$,
  '23514', null, 'percent is at most 100'
);
select throws_ok(
  $$insert into public.progress_events (read_id, unit, value)
    values ('a0000000-0000-0000-0000-000000000005', 'pages', -1)$$,
  '23514', null, 'progress value is not negative'
);
select throws_ok(
  $$insert into public.work_authors (work_id, author_id)
    values ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002')$$,
  '23505', null, 'an author is credited once per role on a work'
);
select lives_ok(
  $$insert into public.work_authors (work_id, author_id, role)
    values ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002',
            'translator')$$,
  'the same author can hold a second role'
);

-- Deleting an edition keeps the read and clears its edition.
select lives_ok(
  $$delete from public.editions where id = 'a0000000-0000-0000-0000-000000000004'$$,
  'user A can delete their edition'
);
select is(
  (select edition_id from public.reads where id = 'a0000000-0000-0000-0000-000000000005'),
  null,
  'deleting an edition clears it from the read'
);
select is(
  (select work_id from public.reads where id = 'a0000000-0000-0000-0000-000000000005'),
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'the read keeps its work'
);

-- Deleting a work removes everything hanging off it.
select lives_ok(
  $$delete from public.works where id = 'a0000000-0000-0000-0000-000000000001'$$,
  'user A can delete their work'
);
select is_empty('select id from public.reads', 'reads go with their work');
select is_empty('select id from public.progress_events', 'progress goes with its read');
select is_empty('select id from public.work_authors', 'credits go with their work');
select is((select count(*) from public.authors), 1::bigint, 'authors stay when a work is deleted');

-- Anonymous visitors cannot touch any library table -------------------------------------

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

select throws_ok('select id from public.works', '42501', null, 'anon cannot read works');
select throws_ok('select id from public.authors', '42501', null, 'anon cannot read authors');
select throws_ok('select id from public.work_authors', '42501', null, 'anon cannot read work_authors');
select throws_ok('select id from public.editions', '42501', null, 'anon cannot read editions');
select throws_ok('select id from public.reads', '42501', null, 'anon cannot read reads');
select throws_ok('select id from public.progress_events', '42501', null, 'anon cannot read progress');
select throws_ok('select * from public.provider_cache', '42501', null, 'anon cannot read provider_cache');

-- Back to the superuser: B's rows survived A's updates and deletes -----------------------

reset role;

select is(
  (select title from public.works where id = 'b0000000-0000-0000-0000-000000000001'),
  'B''s book', 'user A could not change or delete user B''s work'
);
select is(
  (select name from public.authors where id = 'b0000000-0000-0000-0000-000000000002'),
  'B''s author', 'user A could not change or delete user B''s author'
);
select is(
  (select position from public.work_authors where id = 'b0000000-0000-0000-0000-000000000003'),
  0::smallint, 'user A could not change or delete user B''s credit'
);
select is(
  (select publisher from public.editions where id = 'b0000000-0000-0000-0000-000000000004'),
  null, 'user A could not change user B''s edition'
);
select is(
  (select count(*) from public.editions where id = 'b0000000-0000-0000-0000-000000000004'),
  1::bigint, 'user A could not delete user B''s edition'
);
select is(
  (select reflection from public.reads where id = 'b0000000-0000-0000-0000-000000000005'),
  null, 'user A could not change user B''s read'
);
select is(
  (select device from public.progress_events where id = 'b0000000-0000-0000-0000-000000000006'),
  null, 'user A could not change user B''s progress'
);
select is(
  (select count(*) from public.progress_events where id = 'b0000000-0000-0000-0000-000000000006'),
  1::bigint, 'user A could not delete user B''s progress'
);

-- updated_at is maintained by the trigger.
update public.works set title = 'B''s book, revised', updated_at = '2000-01-01'
  where id = 'b0000000-0000-0000-0000-000000000001';
select is(
  (select updated_at from public.works where id = 'b0000000-0000-0000-0000-000000000001'),
  now(), 'updated_at is set by the trigger'
);

-- Deleting an account removes the whole library.
delete from auth.users where id = '22222222-2222-2222-2222-222222222222';
select is(
  (select count(*) from public.works where user_id = '22222222-2222-2222-2222-222222222222')
  + (select count(*) from public.authors where user_id = '22222222-2222-2222-2222-222222222222')
  + (select count(*) from public.work_authors where user_id = '22222222-2222-2222-2222-222222222222')
  + (select count(*) from public.editions where user_id = '22222222-2222-2222-2222-222222222222')
  + (select count(*) from public.reads where user_id = '22222222-2222-2222-2222-222222222222')
  + (select count(*) from public.progress_events where user_id = '22222222-2222-2222-2222-222222222222'),
  0::bigint, 'deleting a user removes all their library rows'
);

-- provider_cache is server-only ---------------------------------------------------------

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}',
  true
);
select throws_ok(
  'select * from public.provider_cache', '42501', null,
  'authenticated users cannot read provider_cache'
);
select throws_ok(
  $$insert into public.provider_cache (provider, cache_key, payload, expires_at)
    values ('openlibrary', 'isbn:9780140449136', '{}', now() + interval '1 day')$$,
  '42501', null, 'authenticated users cannot write provider_cache'
);

reset role;
set local role service_role;

select lives_ok(
  $$insert into public.provider_cache (provider, cache_key, payload, expires_at)
    values ('openlibrary', 'isbn:9780140449136', '{"title": "x"}', now() + interval '1 day')$$,
  'the server can write provider_cache'
);
select is(
  (select payload ->> 'title' from public.provider_cache
    where provider = 'openlibrary' and cache_key = 'isbn:9780140449136'),
  'x', 'the server can read provider_cache'
);
select throws_ok(
  $$insert into public.provider_cache (provider, cache_key, payload, expires_at)
    values ('openlibrary', 'isbn:9780140449136', '{}', now() + interval '1 day')$$,
  '23505', null, 'one cache row per provider and key'
);
select throws_ok(
  $$insert into public.provider_cache (provider, cache_key, payload, expires_at)
    values ('amazon', 'isbn:9780140449136', '{}', now() + interval '1 day')$$,
  '23514', null, 'only known providers are cached'
);

reset role;

select * from finish();

rollback;
