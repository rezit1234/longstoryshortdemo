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

async function main() {
  const { url, serviceRole } = loadEnv();
  if (!url || !serviceRole) {
    throw new Error("Missing Supabase env vars");
  }

  const admin = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const settings = createInitialVoucherSettings();

  const { data, error } = await admin
    .from("voucher_settings")
    .upsert(
      {
        id: 1,
        validity_months: settings.validityMonths,
        amount_slots: settings.amountSlots,
        amount_previews: settings.amountPreviews,
        experiences: settings.experiences,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("id, validity_months")
    .single();

  if (error) {
    console.error("SEED_ERROR", error.message, error.details, error.hint);
    process.exit(1);
  }

  console.log(
    "SEEDED",
    data.id,
    "validity",
    data.validity_months,
    "experiences",
    settings.experiences.length,
    "amounts",
    settings.amountSlots.filter((slot) => slot !== null).length,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
