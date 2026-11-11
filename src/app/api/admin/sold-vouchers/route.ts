import { getSessionProfile } from "@/lib/admin-session";
import { canCreateVoucher } from "@/lib/auth";
import {
  createManualSoldVoucher,
  type CreateManualSoldVoucherInput,
  type ManualVoucherKind,
} from "@/lib/create-manual-sold-voucher";
import { normalizeVoucherCode } from "@/data/admin-voucher-settings";
import { enrichVouchersCanUndo } from "@/lib/redeem-sold-voucher";
import { mapSoldVoucherRow, type SoldVoucherRow } from "@/lib/sold-vouchers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ShopId } from "@/data/admin-voucher-settings";
import { isShopEnabled } from "@/data/shops";
import { NextResponse } from "next/server";

const LIST_SELECT =
  "id, code, shop_id, product_name, item_kind, unit_price_czk, shipping_fee_share_czk, status, purchased_at, valid_until, buyer_name, buyer_email, buyer_phone, delivery_method, delivery_email, recipient_name, shipping_address, pdf_url, remaining_czk, redeemable_parts, is_gift, payment_method, payment_method_note, redeemed_note, redeemed_at, note, tracking_number, seats, remaining_seats";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

export const runtime = "nodejs";

function parseShopId(value: unknown): ShopId | null {
  if (
    value === "lss" ||
    value === "bistrocentral" ||
    value === "culinaryacademy"
  ) {
    return value;
  }
  return null;
}

function parseKind(value: unknown): ManualVoucherKind | null {
  if (value === "amount" || value === "experience") return value;
  return null;
}

const STATUS_FILTERS = new Set([
  "active",
  "awaiting_shipment",
  "awaiting_pickup",
  "redeemed",
  "expired",
  "cancelled",
]);

export async function GET(request: Request) {
  const session = await getSessionProfile();
  if (!session) {
    return NextResponse.json({ error: "Nejste přihlášeni." }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1) || 1);
    const rawSize = Number(url.searchParams.get("pageSize") || DEFAULT_PAGE_SIZE);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number.isFinite(rawSize) ? rawSize : DEFAULT_PAGE_SIZE),
    );
    const statusParam = url.searchParams.get("status")?.trim() || "all";
    const qRaw = url.searchParams.get("q")?.trim() || "";
    const q = qRaw.slice(0, 80);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const admin = createAdminClient();
    let query = admin
      .from("sold_vouchers")
      .select(LIST_SELECT, { count: "exact" })
      .order("purchased_at", { ascending: false })
      .order("code", { ascending: false })
      .range(from, to);

    if (statusParam !== "all" && STATUS_FILTERS.has(statusParam)) {
      query = query.eq("status", statusParam);
    }

    if (q) {
      const normalized = normalizeVoucherCode(q);
      const safe = q.replace(/[%_,]/g, " ").trim();
      const parts = [
        `buyer_name.ilike.%${safe}%`,
        `product_name.ilike.%${safe}%`,
        `code.ilike.%${safe}%`,
      ];
      if (normalized) {
        parts.push(`code_normalized.ilike.%${normalized}%`);
      }
      query = query.or(parts.join(","));
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("sold-vouchers list", error);
      const missingColumns =
        /remaining_czk|redeemable_parts|is_gift|item_kind|redeemed_note/i.test(
          error.message,
        );
      const missingPayment = /payment_method/i.test(error.message);
      return NextResponse.json(
        {
          error: missingPayment
            ? "Chybí migrace 019 (payment_method) - spusť ji v Supabase."
            : missingColumns
              ? "Chybí migrace 015/021 - spusť ji v Supabase."
              : error.message.includes("sold_vouchers")
                ? "Chybí tabulka sold_vouchers - spusť migraci 011."
                : error.message,
        },
        { status: 500 },
      );
    }

    const rows = (data ?? []) as Array<SoldVoucherRow & { id: string }>;
    const idsByCode = new Map(rows.map((row) => [row.code, row.id]));
    let vouchers = rows.map(mapSoldVoucherRow);
    try {
      vouchers = await enrichVouchersCanUndo(admin, vouchers, idsByCode);
    } catch (enrichError) {
      console.error("sold-vouchers canUndo enrich", enrichError);
    }

    const total = count ?? vouchers.length;
    return NextResponse.json({
      vouchers,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (error) {
    console.error("sold-vouchers list fatal", error);
    return NextResponse.json(
      { error: "Nepodařilo se načíst poukazy." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getSessionProfile();
  if (!session) {
    return NextResponse.json({ error: "Nejste přihlášeni." }, { status: 401 });
  }

  if (!canCreateVoucher(session.profile.role)) {
    return NextResponse.json(
      { error: "Nemáte oprávnění vystavit poukaz." },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Neplatný JSON." }, { status: 400 });
  }

  const shopId = parseShopId(body.shopId);
  const kind = parseKind(body.kind);
  if (!shopId) {
    return NextResponse.json({ error: "Vyberte obchod." }, { status: 400 });
  }
  if (!isShopEnabled(shopId)) {
    return NextResponse.json(
      { error: "Tento obchod je dočasně vypnutý." },
      { status: 400 },
    );
  }
  if (!kind) {
    return NextResponse.json({ error: "Vyberte typ poukazu." }, { status: 400 });
  }

  const input: CreateManualSoldVoucherInput = {
    shopId,
    kind,
    experienceId:
      typeof body.experienceId === "string" ? body.experienceId : undefined,
    seats:
      typeof body.seats === "number"
        ? body.seats
        : typeof body.seats === "string"
          ? Number(body.seats)
          : undefined,
    amountCzk:
      typeof body.amountCzk === "number"
        ? body.amountCzk
        : typeof body.amountCzk === "string"
          ? Number(body.amountCzk)
          : undefined,
    buyerName: typeof body.buyerName === "string" ? body.buyerName : "",
    buyerEmail: typeof body.buyerEmail === "string" ? body.buyerEmail : "",
    buyerPhone: typeof body.buyerPhone === "string" ? body.buyerPhone : "",
    code: typeof body.code === "string" ? body.code : undefined,
    sendEmail: body.sendEmail !== false,
    issuedBy: session.userId,
    paymentMethod:
      typeof body.paymentMethod === "string" ? body.paymentMethod : undefined,
    paymentMethodNote:
      typeof body.paymentMethodNote === "string"
        ? body.paymentMethodNote
        : null,
    invoice:
      body.invoice && typeof body.invoice === "object"
        ? (() => {
            const raw = body.invoice as Record<string, unknown>;
            return {
              wantInvoice: raw.wantInvoice === true,
              recipientType:
                raw.recipientType === "person" || raw.recipientType === "company"
                  ? raw.recipientType
                  : null,
              companyId:
                typeof raw.companyId === "string" ? raw.companyId : undefined,
              companyName:
                typeof raw.companyName === "string"
                  ? raw.companyName
                  : undefined,
              vatId: typeof raw.vatId === "string" ? raw.vatId : undefined,
              email: typeof raw.email === "string" ? raw.email : undefined,
              firstName:
                typeof raw.firstName === "string" ? raw.firstName : undefined,
              lastName:
                typeof raw.lastName === "string" ? raw.lastName : undefined,
              addressLine1:
                typeof raw.addressLine1 === "string"
                  ? raw.addressLine1
                  : undefined,
              city: typeof raw.city === "string" ? raw.city : undefined,
              postalCode:
                typeof raw.postalCode === "string" ? raw.postalCode : undefined,
              note: typeof raw.note === "string" ? raw.note : undefined,
            };
          })()
        : null,
  };

  try {
    const result = await createManualSoldVoucher(input);
    return NextResponse.json({
      ok: true,
      voucher: result.voucher,
      emailSent: result.emailSent,
      pdfGenerated: result.pdfGenerated,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Poukaz se nepodařilo uložit.";
    const status =
      message.includes("existuje") ||
      message.includes("Vyplňte") ||
      message.includes("Zadejte") ||
      message.includes("Vyberte") ||
      message.includes("Uveďte") ||
      message.includes("Kód musí") ||
      message.includes("daňového dokladu") ||
      message.includes("IČO")
        ? 400
        : 500;
    console.error("sold-vouchers create", error);
    return NextResponse.json({ error: message }, { status });
  }
}
