-- Počet osob u degustačních poukazů (Chef's Table) — jeden poukaz, uplatnění po osobách.
alter table public.sold_vouchers
  add column if not exists seats int
    check (seats is null or seats >= 1),
  add column if not exists remaining_seats int
    check (remaining_seats is null or remaining_seats >= 0);

comment on column public.sold_vouchers.seats is
  'Celkový počet osob na poukazu (Chef''s Table). Null = nepočítá se po osobách.';
comment on column public.sold_vouchers.remaining_seats is
  'Zbývající počet osob k uplatnění.';

alter table public.voucher_redemptions
  drop constraint if exists voucher_redemptions_kind_check;

alter table public.voucher_redemptions
  add constraint voucher_redemptions_kind_check
  check (kind in ('full', 'amount', 'part', 'seats'));

alter table public.voucher_redemptions
  add column if not exists seats_count int
    check (seats_count is null or seats_count > 0),
  add column if not exists remaining_seats_after int
    check (remaining_seats_after is null or remaining_seats_after >= 0);

comment on column public.voucher_redemptions.seats_count is
  'Počet osob uplatněných v tomto kroku (kind = seats).';
comment on column public.voucher_redemptions.remaining_seats_after is
  'Zbývající počet osob po tomto uplatnění.';
