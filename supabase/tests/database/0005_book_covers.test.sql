begin;

create extension if not exists pgtap with schema extensions;

select plan(7);

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'a@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.test');

insert into storage.objects (bucket_id, name)
values ('covers', '22222222-2222-2222-2222-222222222222/cover-b.webp');

select is(
  (select public from storage.buckets where id = 'covers'),
  false,
  'the covers bucket is private'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}',
  true
);

select lives_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('covers', '11111111-1111-1111-1111-111111111111/cover-a.webp')$$,
  'user A can upload a cover to their own folder'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('covers', '22222222-2222-2222-2222-222222222222/planted.webp')$$,
  '42501', null, 'user A cannot upload into user B''s folder'
);
select results_eq(
  $$select name from storage.objects where bucket_id = 'covers'$$,
  $$values ('11111111-1111-1111-1111-111111111111/cover-a.webp'::text)$$,
  'user A sees only their own covers'
);
select throws_ok(
  $$update storage.objects set name = '22222222-2222-2222-2222-222222222222/gift.webp'
    where name = '11111111-1111-1111-1111-111111111111/cover-a.webp'$$,
  '42501', null, 'user A cannot move a cover into user B''s folder'
);

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select is_empty(
  $$select name from storage.objects where bucket_id = 'covers'$$,
  'anon sees no covers'
);

reset role;
select is(
  (select count(*) from storage.objects
    where name = '22222222-2222-2222-2222-222222222222/cover-b.webp'),
  1::bigint,
  'user B''s cover is untouched'
);

select * from finish();

rollback;
