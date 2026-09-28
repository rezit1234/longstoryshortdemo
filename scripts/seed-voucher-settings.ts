import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { createInitialVoucherSettings } from "../src/data/admin-voucher-settings";

function loadEnv() {
  const env = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const get = (key: string) =>
    (env.match(new RegExp(`^${key}=(.*)$`, "m")) || [])[1]?.trim();
  return {
    url: get("NEXT_PUBLIC_SUPABASE_URL"),
    serviceRole: get("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

function feePreview(settings: ReturnType<typeof createInitialVoucherSettings>) {
  return {
    ...settings.amountPreviews,
    pickupFee: settings.pickupFee,
    postShippingFee: settings.postShippingFee,
    postShippingFeeSk: settings.postShippingFeeSk,
  };
}

async function upsertShop(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  shopId: "lss" | "bistrocentral" | "culinaryacademy",
) {
  const settings = createInitialVoucherSettings(shopId);
  const amountPreviews = feePreview(settings);

  const { data, error } = await admin
    .from("voucher_settings")
    .upsert(
      {
        shop_id: shopId,
        validity_months: settings.validityMonths,
        amount_slots: settings.amountSlots,
        amount_previews: amountPreviews,
        experiences: settings.experiences,
        pickup_fee: settings.pickupFee,
        post_shipping_fee: settings.postShippingFee,
        post_shipping_fee_sk: settings.postShippingFeeSk,
        hero_image: settings.heroImage,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "shop_id" },
    )
    .select("shop_id, validity_months")
    .single();

  if (error) {
    console.error(`SEED_ERROR_${shopId}`, error.message, error.details, error.hint);
    process.exit(1);
  }

  console.log("SEEDED", data.shop_id, "validity", data.validity_months);
}

async function main() {
  const { url, serviceRole } = loadEnv();
  if (!url || !serviceRole) {
    throw new Error("Missing Supabase env vars");
  }

  const admin = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  await upsertShop(admin, "lss");
  await upsertShop(admin, "bistrocentral");
  await upsertShop(admin, "culinaryacademy");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
