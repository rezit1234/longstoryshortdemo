-- URL vygenerovaného PDF s natisknutým kódem + QR
alter table public.sold_vouchers
  add column if not exists pdf_url text;
