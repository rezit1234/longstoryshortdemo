-- Ruční poukazy nemají online objednávku.
alter table public.sold_vouchers
  alter column order_id drop not null;
