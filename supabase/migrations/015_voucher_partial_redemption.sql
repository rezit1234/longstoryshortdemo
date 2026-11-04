-- Částečné uplatnění poukazů: zůstatek, části kombinací, historie + undo.

alter table public.sold_vouchers
  add column if not exists remaining_czk int
    check (remaining_czk is null or remaining_czk >= 0);

alter table public.sold_vouchers
  add column if not exists redeemable_parts jsonb;

alter table public.sold_vouchers
  add column if not exists is_gift boolean not null default false;

comment on column public.sold_vouchers.remaining_czk is
  'Zůstatek u amount poukazů; null u experience.';
comment on column public.sold_vouchers.redeemable_parts is
  'Snapshot uplatnitelných částí u kombinovaných zážitků.';
comment on column public.sold_vouchers.is_gift is
  'True když objednávka byla pro obdarovaného (recipient=other).';

-- Aktivní / čekající amount: zůstatek = nominál
update public.sold_vouchers
set remaining_czk = unit_price_czk
where item_kind = 'amount'
  and remaining_czk is null
  and status in ('active', 'awaiting_shipment', 'awaiting_pickup');

-- Už uplatněné amount: zůstatek 0
update public.sold_vouchers
set remaining_czk = 0
where item_kind = 'amount'
  and remaining_czk is null
  and status = 'redeemed';

-- Ostatní amount (expired/cancelled): nominál jako výchozí zůstatek
update public.sold_vouchers
set remaining_czk = unit_price_czk
where item_kind = 'amount'
  and remaining_czk is null;

-- is_gift z objednávky
update public.sold_vouchers sv
set is_gift = true
from public.voucher_orders vo
where sv.order_id = vo.id
  and coalesce(vo.buyer->>'recipient', '') = 'other';

-- Kombinované zážitky: odvodit části z item.id nebo názvu produktu
update public.sold_vouchers sv
set redeemable_parts = jsonb_build_array(
  jsonb_build_object('id', 'room', 'label', 'Ubytování', 'redeemed', sv.status = 'redeemed'),
  jsonb_build_object('id', 'chefs-table', 'label', 'Chef''s Table', 'redeemed', sv.status = 'redeemed')
)
from public.voucher_orders vo
where sv.order_id = vo.id
  and sv.item_kind = 'experience'
  and sv.redeemable_parts is null
  and (
    coalesce(vo.item->>'id', '') ~* '(the-arc|the-nook|the-big-one|the-flat).*(chefs-table|chef)'
    or coalesce(vo.item->>'id', '') ~* '(chefs-table|chef).*(the-arc|the-nook|the-big-one|the-flat)'
    or coalesce(vo.item->>'id', '') like '%-chefs-table'
  );

update public.sold_vouchers
set redeemable_parts = jsonb_build_array(
  jsonb_build_object('id', 'room', 'label', 'Ubytování', 'redeemed', status = 'redeemed'),
  jsonb_build_object('id', 'chefs-table', 'label', 'Chef''s Table', 'redeemed', status = 'redeemed')
)
where item_kind = 'experience'
  and redeemable_parts is null
  and (
    product_name ilike '%chef%table%'
    and (
      product_name ilike '%arc%'
      or product_name ilike '%nook%'
      or product_name ilike '%big one%'
      or product_name ilike '%flat%'
      or product_name ilike '%výklenek%'
      or product_name ilike '%koutek%'
      or product_name ilike '%byt%'
    )
  );

create table if not exists public.voucher_redemptions (
  id uuid primary key default gen_random_uuid(),
  sold_voucher_id uuid not null references public.sold_vouchers (id) on delete cascade,
  kind text not null check (kind in ('full', 'amount', 'part')),
  amount_czk int check (amount_czk is null or amount_czk > 0),
  part_id text,
  part_label text,
  remaining_czk_after int,
  state_before jsonb not null default '{}'::jsonb,
  undone_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists voucher_redemptions_sold_voucher_id_idx
  on public.voucher_redemptions (sold_voucher_id, created_at desc);

create index if not exists voucher_redemptions_created_at_idx
  on public.voucher_redemptions (created_at desc);

alter table public.voucher_redemptions enable row level security;
