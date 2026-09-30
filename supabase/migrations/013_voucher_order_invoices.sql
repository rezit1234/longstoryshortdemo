-- Faktury u voucher_orders + prefixované číselné řady (LSS/BC/CA-YYYY-NNNN)

alter table public.voucher_orders
  add column if not exists invoice_number text,
  add column if not exists invoice_pdf_url text;

create unique index if not exists voucher_orders_invoice_number_uidx
  on public.voucher_orders (invoice_number)
  where invoice_number is not null;

-- Přechod na (prefix, year) — bezpečně i když tabulka ještě nemá prefix.
alter table public.invoice_sequences
  add column if not exists prefix text;

update public.invoice_sequences
set prefix = 'LSS'
where prefix is null or btrim(prefix) = '';

alter table public.invoice_sequences
  alter column prefix set default 'LSS';

alter table public.invoice_sequences
  alter column prefix set not null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'invoice_sequences_pkey'
      and conrelid = 'public.invoice_sequences'::regclass
  ) then
    alter table public.invoice_sequences drop constraint invoice_sequences_pkey;
  end if;
exception
  when undefined_table then null;
end $$;

alter table public.invoice_sequences
  drop constraint if exists invoice_sequences_pkey;

alter table public.invoice_sequences
  add constraint invoice_sequences_pkey primary key (prefix, year);

drop function if exists public.get_next_invoice_number();
drop function if exists public.get_next_invoice_number(text);

create or replace function public.get_next_invoice_number(p_prefix text default 'LSS')
returns text
language plpgsql
as $$
declare
  v_year integer := extract(year from current_date)::integer;
  v_next integer;
  v_prefix text := upper(btrim(coalesce(p_prefix, 'LSS')));
begin
  if v_prefix = '' then
    v_prefix := 'LSS';
  end if;

  insert into public.invoice_sequences (prefix, year, last_number)
  values (v_prefix, v_year, 1)
  on conflict (prefix, year)
  do update set last_number = public.invoice_sequences.last_number + 1
  returning last_number into v_next;

  return v_prefix || '-' || v_year::text || '-' || lpad(v_next::text, 4, '0');
end;
$$;

grant execute on function public.get_next_invoice_number(text) to anon, authenticated, service_role;
