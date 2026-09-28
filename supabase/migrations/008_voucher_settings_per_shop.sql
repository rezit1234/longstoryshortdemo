-- Oddělení nastavení poukazů podle obchodu + výchozí banner (hero)
-- Bezpečné i při opakovaném spuštění / částečně doběěhlé migraci.

alter table public.voucher_settings
  drop constraint if exists voucher_settings_id_check;

alter table public.voucher_settings
  add column if not exists shop_id text;

update public.voucher_settings
set shop_id = 'lss'
where shop_id is null;

alter table public.voucher_settings
  alter column shop_id set not null;

create unique index if not exists voucher_settings_shop_id_key
  on public.voucher_settings (shop_id);

alter table public.voucher_settings
  add column if not exists hero_image jsonb;

-- Poplatky (mohly chybět, pokud neběžely migrace 005/006)
alter table public.voucher_settings
  add column if not exists pickup_fee int not null default 20;

alter table public.voucher_settings
  add column if not exists post_shipping_fee int not null default 105;

alter table public.voucher_settings
  add column if not exists post_shipping_fee_sk int not null default 145;

-- Nové řádky: id už není vázané na singleton
alter table public.voucher_settings
  alter column id drop default;

do $$
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'S'
      and n.nspname = 'public'
      and c.relname = 'voucher_settings_id_seq'
  ) then
    create sequence public.voucher_settings_id_seq;
  end if;
end $$;

alter table public.voucher_settings
  alter column id set default nextval('public.voucher_settings_id_seq');

select setval(
  'public.voucher_settings_id_seq',
  greatest(coalesce((select max(id) from public.voucher_settings), 1), 1)
);

insert into public.voucher_settings (
  shop_id,
  validity_months,
  amount_slots,
  amount_previews,
  experiences,
  pickup_fee,
  post_shipping_fee,
  post_shipping_fee_sk,
  hero_image
)
select
  'bistrocentral',
  12,
  '[null, null, null, null]'::jsonb,
  jsonb_build_object(
    'pickupFee', 20,
    'postShippingFee', 105,
    'postShippingFeeSk', 145,
    'slotPreviews', '[null, null, null, null]'::jsonb,
    'customPreview', null
  ),
  '[]'::jsonb,
  20,
  105,
  145,
  null
where not exists (
  select 1 from public.voucher_settings where shop_id = 'bistrocentral'
);
