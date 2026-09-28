-- Culinary Academy: výchozí řádek nastavení poukazů
-- Bezpečné i při opakovaném spuštění.

insert into public.voucher_settings (
  shop_id,
  validity_months,
  amount_slots,
  amount_previews,
  experiences,
  pickup_fee,
  post_shipping_fee,
  post_shipping_fee_sk,
  hero_image
)
select
  'culinaryacademy',
  12,
  '[null, null, null, null]'::jsonb,
  jsonb_build_object(
    'pickupFee', 20,
    'postShippingFee', 105,
    'postShippingFeeSk', 145,
    'slotPreviews', '[null, null, null, null]'::jsonb,
    'customPreview', null
  ),
  '[]'::jsonb,
  20,
  105,
  145,
  null
where not exists (
  select 1 from public.voucher_settings where shop_id = 'culinaryacademy'
);
