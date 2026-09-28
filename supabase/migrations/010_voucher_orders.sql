-- Objednávky dárkových poukazů (Comgate + fulfillment)
-- Service role only — žádný veřejný RLS přístup.

create table if not exists public.voucher_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  shop_id text not null
    check (shop_id in ('lss', 'bistrocentral', 'culinaryacademy')),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'cancelled', 'failed')),
  item_kind text not null
    check (item_kind in ('amount', 'experience')),
  item jsonb not null default '{}'::jsonb,
  quantity int not null check (quantity >= 1 and quantity <= 15),
  unit_price_czk int not null check (unit_price_czk > 0),
  shipping_fee_czk int not null default 0 check (shipping_fee_czk >= 0),
  items_total_czk int not null check (items_total_czk > 0),
  total_czk int not null check (total_czk > 0),
  currency text not null default 'CZK',
  buyer jsonb not null default '{}'::jsonb,
  delivery jsonb not null default '{}'::jsonb,
  invoice jsonb,
  comgate_trans_id text,
  comgate_status text,
  comgate_method text,
  comgate_test boolean not null default true,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists voucher_orders_shop_id_idx
  on public.voucher_orders (shop_id);

create index if not exists voucher_orders_status_idx
  on public.voucher_orders (status);

create index if not exists voucher_orders_comgate_trans_id_idx
  on public.voucher_orders (comgate_trans_id);

create unique index if not exists voucher_orders_comgate_trans_id_unique
  on public.voucher_orders (comgate_trans_id)
  where comgate_trans_id is not null;

alter table public.voucher_orders enable row level security;

-- Žádné policies pro anon/authenticated — zápis/čtení jen service role.
