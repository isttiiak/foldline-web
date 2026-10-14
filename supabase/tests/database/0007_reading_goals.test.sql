begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'a@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.test');

select has_table('public', 'reading_goals', 'reading_goals exists');
select is(
  (select relrowsecurity from pg_class where oid = 'public.reading_goals'::regclass),
  true,
  'RLS is enabled on reading_goals'
);

-- Act as user A.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}',
  true
);

select lives_ok(
  $$insert into public.reading_goals (id, metric, period, starts_on, ends_on, target)
    values ('a0000000-0000-0000-0000-000000000001', 'books', 'year',
            '2026-01-01', '2026-12-31', 24)$$,
  'user A can create a goal'
);
select is(
  (select user_id from public.reading_goals where id = 'a0000000-0000-0000-0000-000000000001'),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'user_id defaults to the signed-in user'
);
select lives_ok(
  $$update public.reading_goals set target = 30, hidden = true, label = 'This year'
    where id = 'a0000000-0000-0000-0000-000000000001'$$,
  'user A can change their goal'
);
select throws_ok(
  $$insert into public.reading_goals (metric, period, starts_on, ends_on, target)
    values ('pages', 'custom', '2026-05-02', '2026-05-01', 100)$$,
  '23514', null, 'a goal cannot end before it starts'
);
select throws_ok(
  $$insert into public.reading_goals (metric, period, starts_on, ends_on, target)
    values ('books', 'year', '2026-01-01', '2026-12-31', 0)$$,
  '23514', null, 'a target is at least 1'
);
select throws_ok(
  $$insert into public.reading_goals (metric, period, starts_on, ends_on, target)
    values ('books', 'year', '2026-01-01', '2026-12-31', 10001)$$,
  '23514', null, 'a books target has a sensible maximum'
);
select lives_ok(
  $$insert into public.reading_goals (metric, period, starts_on, ends_on, target)
    values ('pages', 'month', '2026-10-01', '2026-10-31', 10001)$$,
  'a pages target may be larger'
);
select throws_ok(
  $$insert into public.reading_goals (metric, period, starts_on, ends_on, target)
    values ('books', 'custom', '2026-01-01', '2030-01-01', 5)$$,
  '23514', null, 'a goal spans at most about three years'
);
select throws_ok(
  $$insert into public.reading_goals (metric, period, starts_on, ends_on, target, label)
    values ('books', 'year', '2026-01-01', '2026-12-31', 5, '  ')$$,
  '23514', null, 'a blank label is rejected'
);
select throws_ok(
  $$insert into public.reading_goals (user_id, metric, period, starts_on, ends_on, target)
    values ('22222222-2222-2222-2222-222222222222', 'books', 'year',
            '2026-01-01', '2026-12-31', 5)$$,
  '42501', null, 'user A cannot create a goal for user B'
);
select throws_ok(
  $$update public.reading_goals set user_id = '22222222-2222-2222-2222-222222222222'
    where id = 'a0000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'user A cannot move a goal to user B'
);

-- Act as user B.
select set_config(
  'request.jwt.claims',
  '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}',
  true
);

select is(
  (select count(*)::int from public.reading_goals),
  0,
  'user B cannot see user A''s goals'
);
select is_empty(
  $$update public.reading_goals set target = 1
    where id = 'a0000000-0000-0000-0000-000000000001' returning 1$$,
  'user B cannot change user A''s goal'
);
select is_empty(
  $$delete from public.reading_goals
    where id = 'a0000000-0000-0000-0000-000000000001' returning 1$$,
  'user B cannot delete user A''s goal'
);

-- Back as user A: the goal is untouched.
select set_config(
  'request.jwt.claims',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}',
  true
);
select is(
  (select target from public.reading_goals where id = 'a0000000-0000-0000-0000-000000000001'),
  30,
  'user A''s goal is unchanged by user B'
);

select * from finish();
rollback;
