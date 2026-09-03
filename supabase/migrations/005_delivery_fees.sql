-- Příplatky za vyzvednutí na recepci a odeslání poštou
alter table public.voucher_settings
  add column if not exists pickup_fee int not null default 20,
  add column if not exists post_shipping_fee int not null default 105;
