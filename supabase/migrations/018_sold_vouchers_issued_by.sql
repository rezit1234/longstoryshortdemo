-- Autor ručního vystavení poukazu (admin_profiles.id).
-- Online prodeje z widgetu zůstávají bez issued_by.

alter table public.sold_vouchers
  add column if not exists issued_by uuid
    references public.admin_profiles (id) on delete set null;

create index if not exists sold_vouchers_issued_by_idx
  on public.sold_vouchers (issued_by)
  where issued_by is not null;

create index if not exists voucher_redemptions_created_by_idx
  on public.voucher_redemptions (created_by)
  where created_by is not null;

comment on column public.sold_vouchers.issued_by is
  'Admin, který poukaz ručně vystavil; null u online objednávek.';
