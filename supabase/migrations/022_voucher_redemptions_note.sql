-- Volitelná poznámka ke konkrétnímu uplatnění (např. přenos starých poukazů mezi středisky).
alter table public.voucher_redemptions
  add column if not exists note text;

comment on column public.voucher_redemptions.note is
  'Volitelná poznámka k uplatnění (zadává recepce/obsluha u uplatnění).';
