-- Poštovné na Slovensko (CZ fee zůstává v post_shipping_fee)
alter table public.voucher_settings
  add column if not exists post_shipping_fee_sk int not null default 145;
