import {
  ADMIN_VOUCHER_STATUS_LABELS,
  type AdminVoucherStatus,
} from "@/data/admin-vouchers";
import { normalizeVoucherCode } from "@/data/admin-voucher-settings";
import { getSessionProfile } from "@/lib/admin-session";
import {
  canCancelVoucher,
  canEditVoucherNote,
  canEditVoucherValidity,
} from "@/lib/auth";
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

const CANCELABLE_STATUSES = new Set<AdminVoucherStatus>([
  "active",
  "awaiting_shipment",
  "awaiting_pickup",
  "expired",
]);

const SELECT_FIELDS =
  "code, shop_id, product_name, item_kind, unit_price_czk, shipping_fee_share_czk, status, purchased_at, valid_until, buyer_name, buyer_email, buyer_phone, delivery_method, delivery_email, recipient_name, shipping_address, pdf_url, remaining_czk, redeemable_parts, is_gift, payment_method, payment_method_note, redeemed_note, redeemed_at, note";

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

  let body: { status?: string; validUntil?: string; note?: string | null };
  try {
    body = (await request.json()) as {
      status?: string;
      validUntil?: string;
      note?: string | null;
    };
  } catch {
    return NextResponse.json({ error: "Neplatný JSON." }, { status: 400 });
  }

  const status = body.status as AdminVoucherStatus | undefined;
  const hasStatus = Boolean(status);
  const hasValidUntil = body.validUntil !== undefined;
  const hasNote = body.note !== undefined;

  if (!hasStatus && !hasValidUntil && !hasNote) {
    return NextResponse.json(
      { error: "Chybí status, platnost nebo poznámka." },
      { status: 400 },
    );
  }

  let noteValue: string | null = null;
  if (hasNote) {
    if (!canEditVoucherNote(session.profile.role)) {
      return NextResponse.json(
        { error: "Poznámku může upravit jen recepce nebo vlastník." },
        { status: 403 },
      );
    }
    const trimmed = typeof body.note === "string" ? body.note.trim() : "";
    if (trimmed.length > 500) {
      return NextResponse.json(
        { error: "Poznámka může mít nejvýše 500 znaků." },
        { status: 400 },
      );
    }
    noteValue = trimmed || null;
  }

  if (hasStatus && (!status || !ALLOWED.includes(status))) {
    return NextResponse.json({ error: "Neplatný stav." }, { status: 400 });
  }

  if (hasValidUntil && !canEditVoucherValidity(session.profile.role)) {
    return NextResponse.json(
      { error: "Platnost poukazu může upravit jen recepce nebo vlastník." },
      { status: 403 },
    );
  }

  if (hasValidUntil && !isValidUntilInput(body.validUntil)) {
    return NextResponse.json(
      { error: "Neplatné datum platnosti." },
      { status: 400 },
    );
  }

  try {
    const admin = createAdminClient();
    const { data: current, error: currentError } = await admin
      .from("sold_vouchers")
      .select("status, valid_until")
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
      return NextResponse.json({ error: "Poukaz nenalezen." }, { status: 404 });
    }

    const currentStatus = String(current.status) as AdminVoucherStatus;
    const today = todayDateOnly();

    if (hasStatus && status) {
      const cancelling = status === "cancelled" && currentStatus !== "cancelled";
      const restoring = currentStatus === "cancelled" && status !== "cancelled";
      if ((cancelling || restoring) && !canCancelVoucher(session.profile.role)) {
        return NextResponse.json(
          { error: "Storno poukazu může jen vlastník." },
          { status: 403 },
        );
      }

      if (cancelling && !CANCELABLE_STATUSES.has(currentStatus)) {
        return NextResponse.json(
          { error: "Tento poukaz nelze stornovat." },
          { status: 400 },
        );
      }

      if (restoring) {
        if (status !== "active" && status !== "expired") {
          return NextResponse.json(
            { error: "Obnovit lze jen na aktivní nebo expirovaný stav." },
            { status: 400 },
          );
        }
      }
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (hasNote) {
      patch.note = noteValue;
    }

    if (hasStatus && status) {
      let nextStatus = status;
      if (currentStatus === "cancelled" && status === "active") {
        const validUntilIso =
          typeof current.valid_until === "string"
            ? current.valid_until.slice(0, 10)
            : "";
        nextStatus =
          validUntilIso && validUntilIso < today ? "expired" : "active";
      }
      patch.status = nextStatus;
      patch.redeemed_at =
        nextStatus === "redeemed" ? new Date().toISOString() : null;
    }

    if (hasValidUntil && body.validUntil) {
      const validUntil = toValidUntilIso(body.validUntil);
      patch.valid_until = validUntil;

      // Keep active/expired in sync when only the date changes.
      if (!hasStatus) {
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

/** Definitivní smazání — jen stornované poukazy, jen owner/developer. */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const session = await getSessionProfile();
  if (!session) {
    return NextResponse.json({ error: "Nejste přihlášeni." }, { status: 401 });
  }
  if (!canCancelVoucher(session.profile.role)) {
    return NextResponse.json(
      { error: "Smazat poukaz může jen vlastník." },
      { status: 403 },
    );
  }

  const { code: rawCode } = await context.params;
  const code = normalizeVoucherCode(decodeURIComponent(rawCode));
  if (!code) {
    return NextResponse.json({ error: "Neplatný kód." }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { data: current, error: currentError } = await admin
      .from("sold_vouchers")
      .select("status")
      .eq("code_normalized", code)
      .maybeSingle();

    if (currentError) {
      console.error("sold-vouchers delete read", currentError);
      return NextResponse.json(
        { error: currentError.message },
        { status: 500 },
      );
    }
    if (!current) {
      return NextResponse.json({ error: "Poukaz nenalezen." }, { status: 404 });
    }
    if (String(current.status) !== "cancelled") {
      return NextResponse.json(
        { error: "Smazat lze jen stornovaný poukaz." },
        { status: 400 },
      );
    }

    const { error } = await admin
      .from("sold_vouchers")
      .delete()
      .eq("code_normalized", code);

    if (error) {
      console.error("sold-vouchers delete", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, code });
  } catch (error) {
    console.error("sold-vouchers delete fatal", error);
    return NextResponse.json(
      { error: "Nepodařilo se smazat poukaz." },
      { status: 500 },
    );
  }
}
