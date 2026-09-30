begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.rate_limits'::regclass),
  'RLS is enabled on rate_limits'
);

-- The server (service_role) counts hits.
set local role service_role;

select results_eq(
  $$select allowed, remaining from public.rate_limit_hit('test:a', 2, 60)$$,
  $$values (true, 1)$$,
  'first hit is allowed, one left'
);

select results_eq(
  $$select allowed, remaining from public.rate_limit_hit('test:a', 2, 60)$$,
  $$values (true, 0)$$,
  'second hit is allowed, none left'
);

select results_eq(
  $$select allowed, remaining from public.rate_limit_hit('test:a', 2, 60)$$,
  $$values (false, 0)$$,
  'third hit in the same window is refused'
);

select results_eq(
  $$select allowed from public.rate_limit_hit('test:b', 2, 60)$$,
  $$values (true)$$,
  'buckets are counted separately'
);

select ok(
  (select reset_at > now() and reset_at <= now() + interval '60 seconds'
     from public.rate_limit_hit('test:c', 5, 60)),
  'reset_at is the end of the current window'
);

select throws_ok(
  $$select * from public.rate_limit_hit('test:d', 0, 60)$$,
  '22023',
  null,
  'a zero limit is rejected'
);

select throws_ok(
  $$select * from public.rate_limit_hit('test:d', 5, 100000)$$,
  '22023',
  null,
  'windows longer than a day are rejected'
);

-- Finished windows of a bucket are cleaned up on its next hit.
reset role;
insert into public.rate_limits (bucket, window_start, hits)
values ('test:e', now() - interval '2 hours', 9);
set local role service_role;
select ok(
  (select allowed from public.rate_limit_hit('test:e', 5, 60)),
  'a stale window does not count against the current one'
);
reset role;

select is(
  (select count(*) from public.rate_limits where bucket = 'test:e'),
  1::bigint,
  'old windows of a bucket are removed'
);

-- Signed-in users and anonymous visitors can neither call it nor read the table.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}',
  true
);

select throws_ok(
  $$select * from public.rate_limit_hit('test:x', 5, 60)$$,
  '42501',
  null,
  'authenticated users cannot call rate_limit_hit'
);

select throws_ok(
  $$select * from public.rate_limits$$,
  '42501',
  null,
  'authenticated users cannot read rate_limits'
);

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

select throws_ok(
  $$select * from public.rate_limit_hit('test:x', 5, 60)$$,
  '42501',
  null,
  'anon cannot call rate_limit_hit'
);

reset role;

select * from finish();

rollback;
