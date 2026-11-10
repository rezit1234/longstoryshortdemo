-- Volitelný zdroj importu (legacy Excel Vouchy vs. native).
alter table public.sold_vouchers
  add column if not exists import_source text;

comment on column public.sold_vouchers.import_source is
  'Zdroj importu (např. vouchy_excel); null u native / widget / ručního vystavení.';

create index if not exists sold_vouchers_import_source_idx
  on public.sold_vouchers (import_source)
  where import_source is not null;
