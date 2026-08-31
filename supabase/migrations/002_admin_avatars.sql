-- Avatar support for admin profiles
-- Spusť v Supabase → SQL Editor → Run

alter table public.admin_profiles
  add column if not exists avatar_url text;

-- Veřejný bucket pro profilové fotky
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Čtení veřejné (bucket je public), upload/mazání přes service role v API
