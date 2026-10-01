-- Profile details: photo (Google picture or an own upload), short bio and reading
-- preferences, plus a private Storage bucket for uploaded photos. Profiles stay private:
-- RLS from 0001 still limits every row to its owner.

-- Columns ---------------------------------------------------------------------------------

alter table public.profiles
  add column avatar_url text
    constraint profiles_avatar_url_https
    check (avatar_url ~ '^https://' and char_length(avatar_url) <= 2000),
  add column avatar_path text
    constraint profiles_avatar_path_length check (char_length(avatar_path) <= 300),
  add column bio text
    constraint profiles_bio_length check (char_length(bio) <= 600),
  add column preferred_formats public.edition_format[] not null default '{}',
  add column favourite_genres text[] not null default '{}'
    constraint profiles_favourite_genres_count check (cardinality(favourite_genres) <= 12);

comment on column public.profiles.avatar_url is 'Photo from the sign-in provider (https).';
comment on column public.profiles.avatar_path is
  'Own photo in the private avatars bucket (<user id>/<file>); wins over avatar_url.';

-- Names: trimmed, 1 to 80 characters. Tidy existing rows before adding the check.
update public.profiles
  set display_name = nullif(left(btrim(display_name), 80), '')
  where display_name is distinct from nullif(left(btrim(display_name), 80), '');

alter table public.profiles
  add constraint profiles_display_name_length
  check (char_length(btrim(display_name)) between 1 and 80);

-- Google photos for people who signed up before this migration.
update public.profiles p
  set avatar_url = left(coalesce(
    nullif(u.raw_user_meta_data ->> 'avatar_url', ''),
    u.raw_user_meta_data ->> 'picture'
  ), 2000)
  from auth.users u
  where u.id = p.id
    and p.avatar_url is null
    and coalesce(
      nullif(u.raw_user_meta_data ->> 'avatar_url', ''),
      u.raw_user_meta_data ->> 'picture'
    ) ~ '^https://';

-- New sign-ups also keep their provider photo. Same function as 0001, plus avatar_url.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_picture text := coalesce(
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    new.raw_user_meta_data ->> 'picture'
  );
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    nullif(left(btrim(coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(new.email, '@', 1)
    )), 80), ''),
    case when v_picture ~ '^https://' then left(v_picture, 2000) end
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Storage: private bucket for own photos ---------------------------------------------------
-- Files live at <user id>/<file name>. Only the owner can read or change them; the app
-- shows them through short-lived signed URLs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "avatars_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
