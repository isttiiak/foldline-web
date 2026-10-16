begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'a@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.test');

select has_table('public', 'undo_entries', 'undo_entries exists');
select is(
  (select relrowsecurity from pg_class where oid = 'public.undo_entries'::regclass),
  true,
  'RLS is enabled on undo_entries'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}',
  true
);

select lives_ok(
  $$insert into public.undo_entries (id, kind, label, payload)
    values ('a8000000-0000-0000-0000-000000000001', 'bulk', 'Tagged 2 books', '{"tags": []}')$$,
  'user A can save an undo entry'
);
select throws_ok(
  $$insert into public.undo_entries (kind, label, payload) values ('other', 'x', '{}')$$,
  '23514', null, 'an unknown kind is refused'
);
select throws_ok(
  $$insert into public.undo_entries (kind, label, payload) values ('bulk', 'x', '[]')$$,
  '23514', null, 'the payload must be an object'
);
select ok(
  (select expires_at > now() + interval '23 hours' from public.undo_entries),
  'an entry lives for about a day'
);

select set_config(
  'request.jwt.claims',
  '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}',
  true
);
select is(
  (select count(*)::int from public.undo_entries),
  0,
  'user B cannot see user A''s undo entries'
);
select is_empty(
  $$update public.undo_entries set label = 'B' returning 1$$,
  'user B cannot change user A''s undo entries'
);
select is_empty(
  $$delete from public.undo_entries returning 1$$,
  'user B cannot delete user A''s undo entries'
);

select * from finish();
rollback;
