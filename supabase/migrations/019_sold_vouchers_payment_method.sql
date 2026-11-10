-- Způsob platby u ručního vystavení poukazu (kasa / dar / faktura / jiné).
-- Online objednávky a starší záznamy zůstávají null.

alter table public.sold_vouchers
  add column if not exists payment_method text
    check (
      payment_method is null
      or payment_method in ('kasa', 'dar', 'faktura', 'jine')
    );

alter table public.sold_vouchers
  add column if not exists payment_method_note text;

comment on column public.sold_vouchers.payment_method is
  'Způsob platby při ručním vystavení; null u online / starších záznamů.';
comment on column public.sold_vouchers.payment_method_note is
  'Volný popis při payment_method = jine.';
