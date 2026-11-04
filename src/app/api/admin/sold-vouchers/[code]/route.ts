import {
  ADMIN_VOUCHER_STATUS_LABELS,
  type AdminVoucherStatus,
} from "@/data/admin-vouchers";
import { normalizeVoucherCode } from "@/data/admin-voucher-settings";
import { getSessionProfile } from "@/lib/admin-session";
import {
  mapSoldVoucherRow,
  toValidUntilIso,
  type SoldVoucherRow,
} from "@/lib/sold-vouchers";
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

const SELECT_FIELDS =
  "code, shop_id, product_name, item_kind, unit_price_czk, shipping_fee_share_czk, status, purchased_at, valid_until, buyer_name, buyer_email, buyer_phone, delivery_method, delivery_email, recipient_name, shipping_address, pdf_url, remaining_czk, redeemable_parts, is_gift";

function todayDateOnly() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isValidUntilInput(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

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

  let body: { status?: string; validUntil?: string };
  try {
    body = (await request.json()) as { status?: string; validUntil?: string };
  } catch {
    return NextResponse.json({ error: "Neplatný JSON." }, { status: 400 });
  }

  const status = body.status as AdminVoucherStatus | undefined;
  const hasStatus = Boolean(status);
  const hasValidUntil = body.validUntil !== undefined;

  if (!hasStatus && !hasValidUntil) {
    return NextResponse.json(
      { error: "Chybí status nebo platnost." },
      { status: 400 },
    );
  }

  if (hasStatus && (!status || !ALLOWED.includes(status))) {
    return NextResponse.json({ error: "Neplatný stav." }, { status: 400 });
  }

  if (hasValidUntil && !isValidUntilInput(body.validUntil)) {
    return NextResponse.json(
      { error: "Neplatné datum platnosti." },
      { status: 400 },
    );
  }

  try {
    const admin = createAdminClient();
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (hasStatus && status) {
      patch.status = status;
      patch.redeemed_at =
        status === "redeemed" ? new Date().toISOString() : null;
    }

    if (hasValidUntil && body.validUntil) {
      const validUntil = toValidUntilIso(body.validUntil);
      patch.valid_until = validUntil;

      // Keep active/expired in sync when only the date changes.
      if (!hasStatus) {
        const { data: current, error: currentError } = await admin
          .from("sold_vouchers")
          .select("status")
          .eq("code_normalized", code)
          .maybeSingle();

        if (currentError) {
          console.error("sold-vouchers patch read", currentError);
          return NextResponse.json(
            { error: currentError.message },
            { status: 500 },
          );
        }
        if (!current) {
          return NextResponse.json(
            { error: "Poukaz nenalezen." },
            { status: 404 },
          );
        }

        const currentStatus = String(current.status);
        const today = todayDateOnly();
        if (currentStatus === "expired" && validUntil >= today) {
          patch.status = "active";
          patch.redeemed_at = null;
        } else if (currentStatus === "active" && validUntil < today) {
          patch.status = "expired";
        }
      }
    }

    const { data, error } = await admin
      .from("sold_vouchers")
      .update(patch)
      .eq("code_normalized", code)
      .select(SELECT_FIELDS)
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
