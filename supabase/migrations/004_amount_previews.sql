-- Náhledy checkoutu pro varianty na částku (4 sloty + vlastní)
alter table public.voucher_settings
  add column if not exists amount_previews jsonb not null default jsonb_build_object(
    'slotPreviews', jsonb_build_array(null, null, null, null),
    'customPreview', null
  );
