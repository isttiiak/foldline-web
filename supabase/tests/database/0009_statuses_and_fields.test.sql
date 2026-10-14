begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'a@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.test');

select has_table('public', 'custom_statuses', 'custom_statuses exists');
select has_table('public', 'custom_fields', 'custom_fields exists');
select has_column('public', 'reads', 'custom_status_id', 'reads have a custom status');
select has_column('public', 'works', 'custom_values', 'works have custom values');
select is(
  (select bool_and(relrowsecurity) from pg_class
   where oid in ('public.custom_statuses'::regclass, 'public.custom_fields'::regclass)),
  true,
  'RLS is enabled on custom_statuses and custom_fields'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}',
  true
);
insert into public.custom_statuses (id, name, base_state)
values ('b3000000-0000-0000-0000-000000000001', 'B status', 'planned');

select set_config(
  'request.jwt.claims',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}',
  true
);
insert into public.works (id, title) values ('a0000000-0000-0000-0000-000000000001', 'A book');
insert into public.reads (id, work_id) values
  ('a4000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001');

select lives_ok(
  $$insert into public.custom_statuses (id, name, base_state)
    values ('a3000000-0000-0000-0000-000000000001', 'Up next', 'planned')$$,
  'user A can create a custom status'
);
select lives_ok(
  $$update public.reads set custom_status_id = 'a3000000-0000-0000-0000-000000000001'
    where id = 'a4000000-0000-0000-0000-000000000001'$$,
  'user A can give a read their custom status'
);
select throws_ok(
  $$update public.reads set custom_status_id = 'b3000000-0000-0000-0000-000000000001'
    where id = 'a4000000-0000-0000-0000-000000000001'$$,
  '23503', null, 'user A cannot use user B''s status'
);
select lives_ok(
  $$insert into public.custom_fields (id, name, kind, options)
    values ('a5000000-0000-0000-0000-000000000001', 'Shelf colour', 'choice', '{red,blue}')$$,
  'user A can create a choice field'
);
select throws_ok(
  $$insert into public.custom_fields (name, kind) values ('Mood', 'choice')$$,
  '23514', null, 'a choice field needs options'
);
select lives_ok(
  $$update public.works set custom_values = '{"a5000000-0000-0000-0000-000000000001": "red"}'
    where id = 'a0000000-0000-0000-0000-000000000001'$$,
  'user A can store custom values'
);
select throws_ok(
  $$update public.works set custom_values = '[]'
    where id = 'a0000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'custom values are an object'
);

select set_config(
  'request.jwt.claims',
  '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}',
  true
);
select is(
  (select count(*)::int from public.custom_fields)
    + (select count(*)::int from public.custom_statuses
       where user_id <> '22222222-2222-2222-2222-222222222222'),
  0,
  'user B cannot see user A''s statuses or fields'
);
select is_empty(
  $$delete from public.custom_statuses
    where id = 'a3000000-0000-0000-0000-000000000001' returning 1$$,
  'user B cannot delete user A''s status'
);

select set_config(
  'request.jwt.claims',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}',
  true
);
delete from public.custom_statuses where id = 'a3000000-0000-0000-0000-000000000001';
select is(
  (select custom_status_id from public.reads where id = 'a4000000-0000-0000-0000-000000000001'),
  null,
  'removing a status clears it from reads'
);
select is(
  (select user_id from public.reads where id = 'a4000000-0000-0000-0000-000000000001'),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'the read keeps its owner'
);

select * from finish();
rollback;
