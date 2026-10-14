begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'a@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.test');

select has_table('public', 'tags', 'tags exists');
select has_table('public', 'work_tags', 'work_tags exists');
select has_table('public', 'shelves', 'shelves exists');
select has_table('public', 'shelf_items', 'shelf_items exists');
select is(
  (select bool_and(relrowsecurity) from pg_class
   where oid in ('public.tags'::regclass, 'public.work_tags'::regclass,
                 'public.shelves'::regclass, 'public.shelf_items'::regclass)),
  true,
  'RLS is enabled on all four tables'
);

-- Act as user B first: a book of their own, to try mixing owners later.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}',
  true
);
insert into public.works (id, title) values ('b0000000-0000-0000-0000-000000000001', 'B book');
insert into public.tags (id, name) values ('b1000000-0000-0000-0000-000000000001', 'B tag');

-- Act as user A.
select set_config(
  'request.jwt.claims',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}',
  true
);
insert into public.works (id, title) values ('a0000000-0000-0000-0000-000000000001', 'A book');

select lives_ok(
  $$insert into public.tags (id, name, tone)
    values ('a1000000-0000-0000-0000-000000000001', 'Cosy', 'amber')$$,
  'user A can create a tag'
);
select throws_ok(
  $$insert into public.tags (name) values ('  cosy ')$$,
  '23505', null, 'tag names are unique per reader, ignoring case and spaces'
);
select lives_ok(
  $$insert into public.tags (name) values ('B tag')$$,
  'another reader''s tag name is free to use'
);
select lives_ok(
  $$insert into public.work_tags (work_id, tag_id)
    values ('a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001')$$,
  'user A can tag their book'
);
select throws_ok(
  $$insert into public.work_tags (work_id, tag_id)
    values ('a0000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001')$$,
  '23503', null, 'user A cannot use user B''s tag'
);
select lives_ok(
  $$insert into public.shelves (id, name)
    values ('a2000000-0000-0000-0000-000000000001', 'Favourites')$$,
  'user A can create a manual shelf'
);
select lives_ok(
  $$insert into public.shelves (id, name, kind, query)
    values ('a2000000-0000-0000-0000-000000000002', 'Unread cosy', 'smart',
            '{"state": "planned"}')$$,
  'user A can create a smart shelf'
);
select throws_ok(
  $$insert into public.shelves (name, kind) values ('Broken', 'smart')$$,
  '23514', null, 'a smart shelf needs a saved view'
);
select throws_ok(
  $$insert into public.shelves (name, query) values ('Broken', '{}')$$,
  '23514', null, 'a manual shelf has no saved view'
);
select lives_ok(
  $$insert into public.shelf_items (shelf_id, work_id)
    values ('a2000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001')$$,
  'user A can put a book on a manual shelf'
);
select throws_ok(
  $$insert into public.shelf_items (shelf_id, work_id)
    values ('a2000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001')$$,
  '23514', null, 'books cannot be placed on a smart shelf'
);
select throws_ok(
  $$insert into public.shelf_items (shelf_id, work_id)
    values ('a2000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001')$$,
  '23503', null, 'user A cannot shelve user B''s book'
);

-- Act as user B.
select set_config(
  'request.jwt.claims',
  '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}',
  true
);
select is(
  (select count(*)::int from public.tags where user_id <> '22222222-2222-2222-2222-222222222222'),
  0,
  'user B cannot see user A''s tags'
);
select is(
  (select count(*)::int from public.shelves) + (select count(*)::int from public.shelf_items)
    + (select count(*)::int from public.work_tags),
  0,
  'user B cannot see user A''s shelves, shelf items or book tags'
);
select is_empty(
  $$update public.shelves set name = 'Mine' returning 1$$,
  'user B cannot rename user A''s shelves'
);
select is_empty(
  $$delete from public.tags where id = 'a1000000-0000-0000-0000-000000000001' returning 1$$,
  'user B cannot delete user A''s tag'
);

-- Back as user A: deleting the book empties the shelf and drops its tags.
select set_config(
  'request.jwt.claims',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}',
  true
);
delete from public.works where id = 'a0000000-0000-0000-0000-000000000001';
select is(
  (select count(*)::int from public.shelf_items) + (select count(*)::int from public.work_tags),
  0,
  'deleting a book removes it from shelves and tags'
);

select * from finish();
rollback;
