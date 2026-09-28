import {
  ADMIN_VOUCHER_STATUS_LABELS,
  type AdminVoucherStatus,
} from "@/data/admin-vouchers";
import { normalizeVoucherCode } from "@/data/admin-voucher-settings";
import { getSessionProfile } from "@/lib/admin-session";
import { mapSoldVoucherRow, type SoldVoucherRow } from "@/lib/sold-vouchers";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ALLOWED: AdminVoucherStatus[] = [
  "active",
  "awaiting_shipment",
  "awaiting_pickup",
  "redeemed",
  "expired",
  "cancelled",
];

export async function PATCH(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const session = await getSessionProfile();
  if (!session) {
    return NextResponse.json({ error: "Nejste přihlášeni." }, { status: 401 });
  }

  const { code: rawCode } = await context.params;
  const code = normalizeVoucherCode(decodeURIComponent(rawCode));
  if (!code) {
    return NextResponse.json({ error: "Neplatný kód." }, { status: 400 });
  }

  let body: { status?: string };
  try {
    body = (await request.json()) as { status?: string };
  } catch {
    return NextResponse.json({ error: "Neplatný JSON." }, { status: 400 });
  }

  const status = body.status as AdminVoucherStatus | undefined;
  if (!status || !ALLOWED.includes(status)) {
    return NextResponse.json({ error: "Neplatný stav." }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const patch: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
      redeemed_at: status === "redeemed" ? new Date().toISOString() : null,
    };

    const { data, error } = await admin
      .from("sold_vouchers")
      .update(patch)
      .eq("code_normalized", code)
      .select(
        "code, shop_id, product_name, unit_price_czk, shipping_fee_share_czk, status, purchased_at, valid_until, buyer_name, buyer_email, buyer_phone, delivery_method, shipping_address, pdf_url",
      )
      .maybeSingle();

    if (error) {
      console.error("sold-vouchers patch", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Poukaz nenalezen." }, { status: 404 });
    }

    const voucher = mapSoldVoucherRow(data as SoldVoucherRow);
    voucher.statusLabel = ADMIN_VOUCHER_STATUS_LABELS[voucher.status];
    return NextResponse.json({ voucher });
  } catch (error) {
    console.error("sold-vouchers patch fatal", error);
    return NextResponse.json(
      { error: "Nepodařilo se aktualizovat poukaz." },
      { status: 500 },
    );
  }
}
