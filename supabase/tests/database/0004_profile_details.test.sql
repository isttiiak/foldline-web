begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

-- New sign-ups keep their provider photo; plain http and junk are dropped.
insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'a@example.test',
   '{"full_name": "Reader A", "avatar_url": "https://lh3.googleusercontent.com/a/photo"}'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.test',
   '{"picture": "http://insecure.example/photo.jpg"}');

select is(
  (select avatar_url from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'https://lh3.googleusercontent.com/a/photo',
  'the signup trigger stores the Google photo'
);
select is(
  (select avatar_url from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  null,
  'a non-https photo is not stored'
);
select is(
  (select preferred_formats from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  '{}'::public.edition_format[],
  'preferred_formats defaults to empty'
);
select is(
  (select favourite_genres from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  '{}'::text[],
  'favourite_genres defaults to empty'
);

-- Act as user A.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}',
  true
);

select lives_ok(
  $$update public.profiles
    set bio = 'Slow reader of long novels.',
        preferred_formats = '{paperback,audiobook}',
        favourite_genres = '{Fiction,History}'
    where id = '11111111-1111-1111-1111-111111111111'$$,
  'user A can fill in their profile details'
);

select throws_ok(
  $$update public.profiles set bio = repeat('x', 601)
    where id = '11111111-1111-1111-1111-111111111111'$$,
  '23514', null, 'bio is at most 600 characters'
);
select throws_ok(
  $$update public.profiles
    set favourite_genres = array_fill('g'::text, array[13])
    where id = '11111111-1111-1111-1111-111111111111'$$,
  '23514', null, 'at most 12 genres'
);
select throws_ok(
  $$update public.profiles set avatar_url = 'javascript:alert(1)'
    where id = '11111111-1111-1111-1111-111111111111'$$,
  '23514', null, 'avatar_url must be https'
);
select throws_ok(
  $$update public.profiles set display_name = '   '
    where id = '11111111-1111-1111-1111-111111111111'$$,
  '23514', null, 'a display name cannot be blank'
);
select throws_ok(
  $$update public.profiles set display_name = repeat('n', 81)
    where id = '11111111-1111-1111-1111-111111111111'$$,
  '23514', null, 'a display name is at most 80 characters'
);
select throws_ok(
  $$update public.profiles set preferred_formats = '{scroll}'
    where id = '11111111-1111-1111-1111-111111111111'$$,
  '22P02', null, 'preferred_formats only takes known formats'
);

-- A cannot see or change B's details.
select is_empty(
  $$select bio from public.profiles where id = '22222222-2222-2222-2222-222222222222'$$,
  'user A cannot read user B''s profile details'
);
update public.profiles set bio = 'hacked' where id = '22222222-2222-2222-2222-222222222222';

-- Storage: A works inside their own folder only.
select lives_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('avatars', '11111111-1111-1111-1111-111111111111/avatar-1.webp')$$,
  'user A can upload a photo to their own folder'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('avatars', '22222222-2222-2222-2222-222222222222/avatar-1.webp')$$,
  '42501', null, 'user A cannot upload into user B''s folder'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('avatars', 'avatar-1.webp')$$,
  '42501', null, 'user A cannot upload outside a user folder'
);

reset role;
insert into storage.objects (bucket_id, name)
values ('avatars', '22222222-2222-2222-2222-222222222222/avatar-b.webp');
set local role authenticated;

select results_eq(
  $$select name from storage.objects where bucket_id = 'avatars'$$,
  $$values ('11111111-1111-1111-1111-111111111111/avatar-1.webp'::text)$$,
  'user A sees only their own photos'
);
-- (No direct DELETE here: Storage may forbid SQL deletes; the app uses the Storage API.)
update storage.objects set name = '11111111-1111-1111-1111-111111111111/stolen.webp'
  where name = '22222222-2222-2222-2222-222222222222/avatar-b.webp';
select throws_ok(
  $$update storage.objects set name = '22222222-2222-2222-2222-222222222222/gift.webp'
    where name = '11111111-1111-1111-1111-111111111111/avatar-1.webp'$$,
  '42501', null, 'user A cannot move a photo into user B''s folder'
);

-- Anonymous visitors see no photos.
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select is_empty(
  $$select name from storage.objects where bucket_id = 'avatars'$$,
  'anon sees no photos'
);

-- Back to the superuser.
reset role;

select is(
  (select bio from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  null,
  'user A could not change user B''s bio'
);
select is(
  (select count(*) from storage.objects
    where name = '22222222-2222-2222-2222-222222222222/avatar-b.webp'),
  1::bigint,
  'user A could not take user B''s photo'
);
select is(
  (select public from storage.buckets where id = 'avatars'),
  false,
  'the avatars bucket is private'
);
select is(
  (select favourite_genres from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  '{Fiction,History}'::text[],
  'user A''s details were saved'
);

select * from finish();

rollback;
