-- Volný popis uplatnění z legacy Excelu (kdy / kde).
alter table public.sold_vouchers
  add column if not exists redeemed_note text;

comment on column public.sold_vouchers.redeemed_note is
  'Volný popis uplatnění z legacy Excelu (kdy/kde); u native redemptions se bere historie.';
