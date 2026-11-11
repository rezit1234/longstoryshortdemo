-- Podací číslo zásilky (poštovní balík s poukazem). Lze doplnit u libovolného poukazu.
alter table public.sold_vouchers
  add column if not exists tracking_number text;

comment on column public.sold_vouchers.tracking_number is
  'Podací číslo poštovní zásilky s poukazem (doplňuje recepce/vlastník).';
