import { NextResponse } from "next/server";
import { createInitialVoucherSettings } from "@/data/admin-voucher-settings";
import { canManageTeam } from "@/lib/auth";
import { getSessionProfile } from "@/lib/admin-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeVoucherSettings,
  type VoucherSettingsPayload,
} from "@/lib/voucher-settings";

type SettingsRow = {
  validity_months: number;
  amount_slots: unknown;
  amount_previews?: unknown;
  experiences: unknown;
  pickup_fee?: number | null;
  post_shipping_fee?: number | null;
};

const SETTINGS_SELECT =
  "validity_months, amount_slots, amount_previews, experiences, pickup_fee, post_shipping_fee";

const SETTINGS_SELECT_LEGACY =
  "validity_months, amount_slots, amount_previews, experiences";

function feesFromAmountPreviews(value: unknown): {
  pickupFee?: number;
  postShippingFee?: number;
} {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  return {
    pickupFee:
      typeof record.pickupFee === "number" ? record.pickupFee : undefined,
    postShippingFee:
      typeof record.postShippingFee === "number"
        ? record.postShippingFee
        : undefined,
  };
}

function amountPreviewsForStorage(settings: VoucherSettingsPayload) {
  return {
    ...settings.amountPreviews,
    pickupFee: settings.pickupFee,
    postShippingFee: settings.postShippingFee,
  };
}

function rowToPayload(row: SettingsRow): VoucherSettingsPayload {
  const embedded = feesFromAmountPreviews(row.amount_previews);
  return normalizeVoucherSettings({
    validityMonths: row.validity_months,
    amountSlots: row.amount_slots as VoucherSettingsPayload["amountSlots"],
    amountPreviews: row.amount_previews as VoucherSettingsPayload["amountPreviews"],
    experiences: row.experiences as VoucherSettingsPayload["experiences"],
    pickupFee: row.pickup_fee ?? embedded.pickupFee,
    postShippingFee: row.post_shipping_fee ?? embedded.postShippingFee,
  });
}

export async function GET() {
  try {
    const supabase = await createClient();
    let { data, error } = await supabase
      .from("voucher_settings")
      .select(SETTINGS_SELECT)
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      ({ data, error } = await supabase
        .from("voucher_settings")
        .select(SETTINGS_SELECT_LEGACY)
        .eq("id", 1)
        .maybeSingle());
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({
        settings: createInitialVoucherSettings(),
        source: "fallback",
      });
    }

    return NextResponse.json({
      settings: rowToPayload(data as SettingsRow),
      source: "database",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Nepodařilo se načíst nastavení.",
        settings: createInitialVoucherSettings(),
        source: "fallback",
      },
      { status: 200 },
    );
  }
}

export async function PUT(request: Request) {
  const session = await getSessionProfile();
  if (!session) {
    return NextResponse.json({ error: "Nejste přihlášeni." }, { status: 401 });
  }

  if (!canManageTeam(session.profile.role)) {
    return NextResponse.json(
      { error: "Nemáte oprávnění upravovat nastavení poukazů." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    settings?: VoucherSettingsPayload;
  } | null;

  if (!body?.settings) {
    return NextResponse.json({ error: "Chybí settings." }, { status: 400 });
  }

  const settings = normalizeVoucherSettings(body.settings);

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Chybí SUPABASE_SERVICE_ROLE_KEY v .env.local." },
      { status: 500 },
    );
  }

  const baseRow = {
    id: 1,
    validity_months: settings.validityMonths,
    amount_slots: settings.amountSlots,
    amount_previews: amountPreviewsForStorage(settings),
    experiences: settings.experiences,
    updated_at: new Date().toISOString(),
  };

  let { data, error } = await admin
    .from("voucher_settings")
    .upsert(
      {
        ...baseRow,
        pickup_fee: settings.pickupFee,
        post_shipping_fee: settings.postShippingFee,
      },
      { onConflict: "id" },
    )
    .select(SETTINGS_SELECT)
    .single();

  if (error) {
    ({ data, error } = await admin
      .from("voucher_settings")
      .upsert(baseRow, { onConflict: "id" })
      .select(SETTINGS_SELECT_LEGACY)
      .single());
  }

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Nastavení se nepodařilo uložit." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    settings: rowToPayload(data as SettingsRow),
    source: "database",
  });
}
