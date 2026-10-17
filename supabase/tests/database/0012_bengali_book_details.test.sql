begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'a@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.test');

insert into public.works (id, user_id, title)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'আদর্শ হিন্দু হোটেল');
insert into public.editions (id, user_id, work_id, format)
values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'paperback'
);

select col_is_null('public', 'works', 'title_romanized', 'title_romanized is optional');
select col_is_null('public', 'editions', 'edition_statement', 'edition_statement is optional');

-- Act as user A.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}',
  true
);

select lives_ok(
  $$update public.works set title_romanized = 'Adarsha Hindu Hotel'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  'the owner can set a romanised title'
);
select lives_ok(
  $$update public.editions set edition_statement = '৩য় মুদ্রণ, ২০২৩'
    where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'$$,
  'the owner can set an edition statement'
);
select is(
  (select title_romanized from public.works where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'Adarsha Hindu Hotel',
  'the romanised title is stored'
);
select throws_ok(
  $$update public.works set title_romanized = repeat('x', 1001)
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  '23514', null, 'title_romanized is at most 1000 characters'
);
select throws_ok(
  $$update public.editions set edition_statement = repeat('x', 201)
    where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'$$,
  '23514', null, 'edition_statement is at most 200 characters'
);

-- Act as user B.
select set_config(
  'request.jwt.claims',
  '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}',
  true
);

select is(
  (select count(*)::int from public.works where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0,
  'user B cannot see user A''s work'
);
select is_empty(
  $$update public.works set title_romanized = 'hijacked'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' returning 1$$,
  'user B cannot change user A''s romanised title'
);
select is_empty(
  $$update public.editions set edition_statement = 'hijacked'
    where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' returning 1$$,
  'user B cannot change user A''s edition statement'
);

select * from finish();
rollback;
