begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'a@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.test');

insert into public.works (id, user_id, title)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Book A');
insert into public.editions (id, user_id, work_id, format)
values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'paperback'
);

select col_is_null('public', 'editions', 'cover_design', 'cover_design is optional');
select col_is_null('public', 'editions', 'bought_from', 'bought_from is optional');

-- Act as user A.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}',
  true
);

select lives_ok(
  $$update public.editions
    set cover_design = 'dusk', bought_from = 'https://www.rokomari.com/book/1'
    where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'$$,
  'the owner can set a cover design and where it was bought'
);
select is(
  (select cover_design from public.editions where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
  'dusk',
  'the design is stored'
);
select throws_ok(
  $$update public.editions set cover_design = ''
    where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'$$,
  '23514', null, 'an empty design id is rejected'
);
select throws_ok(
  $$update public.editions set bought_from = repeat('x', 501)
    where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'$$,
  '23514', null, 'bought_from is at most 500 characters'
);

-- Act as user B.
select set_config(
  'request.jwt.claims',
  '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}',
  true
);

select is(
  (select count(*)::int from public.editions where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
  0,
  'user B cannot see user A''s edition notes'
);
select is_empty(
  $$update public.editions set bought_from = 'hijacked'
    where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' returning 1$$,
  'user B cannot change user A''s edition notes'
);

select * from finish();
rollback;
