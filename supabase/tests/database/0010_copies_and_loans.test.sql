begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'a@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.test');

select has_table('public', 'copies', 'copies exists');
select has_table('public', 'loans', 'loans exists');
select is(
  (select bool_and(relrowsecurity) from pg_class
   where oid in ('public.copies'::regclass, 'public.loans'::regclass)),
  true,
  'RLS is enabled on copies and loans'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}',
  true
);
insert into public.works (id, title) values ('b0000000-0000-0000-0000-000000000001', 'B book');

select set_config(
  'request.jwt.claims',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}',
  true
);
insert into public.works (id, title) values
  ('a0000000-0000-0000-0000-000000000001', 'A book'),
  ('a0000000-0000-0000-0000-000000000002', 'Another A book');
insert into public.editions (id, work_id, format) values
  ('a6000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'paperback');

select lives_ok(
  $$insert into public.copies (id, work_id, location)
    values ('a7000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
            'Living room')$$,
  'user A can add a copy'
);
select throws_ok(
  $$insert into public.copies (work_id) values ('b0000000-0000-0000-0000-000000000001')$$,
  '23503', null, 'user A cannot add a copy of user B''s book'
);
select throws_ok(
  $$insert into public.copies (work_id, edition_id)
    values ('a0000000-0000-0000-0000-000000000001', 'a6000000-0000-0000-0000-000000000001')$$,
  '23503', null, 'a copy''s edition belongs to the same book'
);
select lives_ok(
  $$insert into public.loans (copy_id, direction, person, started_on, due_on)
    values ('a7000000-0000-0000-0000-000000000001', 'lent', 'Rumi', '2026-10-01', '2026-11-01')$$,
  'user A can lend a copy'
);
select throws_ok(
  $$insert into public.loans (copy_id, direction, person, started_on)
    values ('a7000000-0000-0000-0000-000000000001', 'lent', 'Tara', '2026-10-02')$$,
  '23505', null, 'a copy has at most one open loan'
);
select throws_ok(
  $$update public.loans set returned_on = '2026-09-01'$$,
  '23514', null, 'a loan cannot be returned before it started'
);
select lives_ok(
  $$update public.loans set returned_on = '2026-10-10'$$,
  'user A can mark a loan returned'
);
select lives_ok(
  $$insert into public.loans (copy_id, direction, person, started_on)
    values ('a7000000-0000-0000-0000-000000000001', 'lent', 'Tara', '2026-10-12')$$,
  'after a return the copy can go out again'
);

select set_config(
  'request.jwt.claims',
  '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}',
  true
);
select is(
  (select count(*)::int from public.copies) + (select count(*)::int from public.loans),
  0,
  'user B cannot see user A''s copies or loans'
);
select is_empty(
  $$update public.loans set person = 'B' returning 1$$,
  'user B cannot change user A''s loans'
);

select set_config(
  'request.jwt.claims',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}',
  true
);
delete from public.copies where id = 'a7000000-0000-0000-0000-000000000001';
select is(
  (select count(*)::int from public.loans),
  0,
  'deleting a copy removes its loans'
);
select is(
  (select count(*)::int from public.works),
  2,
  'user A''s books are untouched'
);

select * from finish();
rollback;
