-- Long Story Short — admin users / team
-- Spusť v Supabase → SQL Editor → New query → Run

create type public.admin_role as enum ('owner', 'admin', 'staff');

create table public.admin_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  full_name text not null,
  role public.admin_role not null default 'staff',
  created_at timestamptz not null default now(),
  constraint admin_profiles_username_format
    check (username ~ '^[a-z0-9._-]{2,32}$'),
  constraint admin_profiles_username_unique unique (username)
);

create index admin_profiles_created_at_idx
  on public.admin_profiles (created_at desc);

alter table public.admin_profiles enable row level security;

-- Přihlášení členové můžou číst seznam týmu.
-- Zápis (create/delete) jde jen přes service role v API routách.
create policy "Authenticated users can read admin profiles"
  on public.admin_profiles
  for select
  to authenticated
  using (true);

-- Doporučení v Auth nastavení projektu:
-- Authentication → Providers → Email → vypnout "Confirm email"
-- (jde o interní admin účty, potvrzení e-mailu nepotřebujeme)
