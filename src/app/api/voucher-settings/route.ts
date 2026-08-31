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
};

function rowToPayload(row: SettingsRow): VoucherSettingsPayload {
  return normalizeVoucherSettings({
    validityMonths: row.validity_months,
    amountSlots: row.amount_slots as VoucherSettingsPayload["amountSlots"],
    amountPreviews: row.amount_previews as VoucherSettingsPayload["amountPreviews"],
    experiences: row.experiences as VoucherSettingsPayload["experiences"],
  });
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("voucher_settings")
      .select("validity_months, amount_slots, amount_previews, experiences")
      .eq("id", 1)
      .maybeSingle();

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
    .select("validity_months, amount_slots, amount_previews, experiences")
    .single();

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
