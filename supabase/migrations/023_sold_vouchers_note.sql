-- Interní poznámka k poukazu (editovatelná recepcí a vlastníkem po vytvoření).
alter table public.sold_vouchers
  add column if not exists note text;

comment on column public.sold_vouchers.note is
  'Interní poznámka k poukazu (upravuje recepce/vlastník).';
