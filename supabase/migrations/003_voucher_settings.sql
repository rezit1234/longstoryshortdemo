-- Voucher settings (singleton JSON document matching admin UI)
-- Spusť v Supabase → SQL Editor → Run

create table if not exists public.voucher_settings (
  id int primary key default 1 check (id = 1),
  validity_months int not null default 12,
  amount_slots jsonb not null default '[null, null, null, null]'::jsonb,
  experiences jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.voucher_settings enable row level security;

drop policy if exists "Anyone can read voucher settings" on public.voucher_settings;
create policy "Anyone can read voucher settings"
  on public.voucher_settings
  for select
  to anon, authenticated
  using (true);

-- Zápis jen přes service role v API (admin/owner).

-- Bucket pro nové fotky galerie (stávající /public cesty zůstanou)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voucher-images',
  'voucher-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
