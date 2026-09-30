begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

-- Two users; the signup trigger should create a profile for each.
insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'a@example.test', '{"full_name": "Reader A"}'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.test', '{}');

select is(
  (select count(*) from public.profiles
    where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')),
  2::bigint,
  'signup trigger creates one profile per user'
);

select is(
  (select display_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'Reader A',
  'display_name comes from full_name metadata'
);

select is(
  (select display_name from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'b',
  'display_name falls back to the email local part'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'RLS is enabled on profiles'
);

-- Act as user A.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}',
  true
);

select results_eq(
  'select id from public.profiles',
  $$values ('11111111-1111-1111-1111-111111111111'::uuid)$$,
  'user A sees only their own profile'
);

select lives_ok(
  $$update public.profiles set display_name = 'A renamed' where id = '11111111-1111-1111-1111-111111111111'$$,
  'user A can update their own profile'
);

update public.profiles set display_name = 'hacked'
  where id = '22222222-2222-2222-2222-222222222222';

delete from public.profiles where id = '22222222-2222-2222-2222-222222222222';

select throws_ok(
  $$insert into public.profiles (id) values ('33333333-3333-3333-3333-333333333333')$$,
  '42501',
  null,
  'user A cannot insert a profile for someone else'
);

select throws_ok(
  $$update public.profiles set id = '22222222-2222-2222-2222-222222222222' where id = '11111111-1111-1111-1111-111111111111'$$,
  '42501',
  null,
  'user A cannot move their profile onto another id'
);

-- Anonymous visitors see nothing.
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

select is_empty('select id from public.profiles', 'anon sees no profiles');

-- Back to the superuser to inspect what really happened to user B.
reset role;

select is(
  (select display_name from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'b',
  'user A could not update user B''s profile'
);

select is(
  (select count(*) from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  1::bigint,
  'user A could not delete user B''s profile'
);

select isnt(
  (select updated_at from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  null,
  'updated_at is set'
);

select * from finish();

rollback;
