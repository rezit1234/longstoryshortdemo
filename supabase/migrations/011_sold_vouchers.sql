-- Prodané poukazy (fulfillment po Comgate PAID)
-- Service role only.

create table if not exists public.sold_vouchers (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.voucher_orders (id) on delete cascade,
  shop_id text not null
    check (shop_id in ('lss', 'bistrocentral', 'culinaryacademy')),
  code text not null,
  code_normalized text not null,
  product_name text not null,
  item_kind text not null
    check (item_kind in ('amount', 'experience')),
  unit_price_czk int not null check (unit_price_czk > 0),
  shipping_fee_share_czk int not null default 0 check (shipping_fee_share_czk >= 0),
  status text not null default 'active'
    check (
      status in (
        'active',
        'awaiting_shipment',
        'awaiting_pickup',
        'redeemed',
        'expired',
        'cancelled'
      )
    ),
  purchased_at timestamptz not null default now(),
  valid_until date not null,
  redeemed_at timestamptz,
  buyer_name text not null default '',
  buyer_email text not null default '',
  buyer_phone text not null default '',
  recipient_name text not null default '',
  delivery_method text not null default 'email',
  delivery_email text,
  shipping_address jsonb,
  message text,
  vat_label text,
  tax_regime text not null default 'vouchy'
    check (tax_regime in ('vouchy', 'legacy')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists sold_vouchers_code_normalized_key
  on public.sold_vouchers (code_normalized);

create index if not exists sold_vouchers_order_id_idx
  on public.sold_vouchers (order_id);

create index if not exists sold_vouchers_shop_id_idx
  on public.sold_vouchers (shop_id);

create index if not exists sold_vouchers_status_idx
  on public.sold_vouchers (status);

alter table public.sold_vouchers enable row level security;

-- Žádné policies pro anon/authenticated — service role only.
