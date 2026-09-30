import { getSessionProfile } from "@/lib/admin-session";
import {
  createManualSoldVoucher,
  type CreateManualSoldVoucherInput,
  type ManualVoucherKind,
} from "@/lib/create-manual-sold-voucher";
import { mapSoldVoucherRow, type SoldVoucherRow } from "@/lib/sold-vouchers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ShopId } from "@/data/admin-voucher-settings";
import { NextResponse } from "next/server";

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

export async function GET() {
  const session = await getSessionProfile();
  if (!session) {
    return NextResponse.json({ error: "Nejste přihlášeni." }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("sold_vouchers")
      .select(
        "code, shop_id, product_name, unit_price_czk, shipping_fee_share_czk, status, purchased_at, valid_until, buyer_name, buyer_email, buyer_phone, delivery_method, shipping_address, pdf_url",
      )
      .order("purchased_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("sold-vouchers list", error);
      return NextResponse.json(
        {
          error:
            error.message.includes("sold_vouchers")
              ? "Chybí tabulka sold_vouchers — spusť migraci 011."
              : error.message,
        },
        { status: 500 },
      );
    }

    const vouchers = ((data ?? []) as SoldVoucherRow[]).map(mapSoldVoucherRow);
    return NextResponse.json({ vouchers });
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
  if (!kind) {
    return NextResponse.json({ error: "Vyberte typ poukazu." }, { status: 400 });
  }

  const input: CreateManualSoldVoucherInput = {
    shopId,
    kind,
    experienceId:
      typeof body.experienceId === "string" ? body.experienceId : undefined,
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
      message.includes("Kód musí")
        ? 400
        : 500;
    console.error("sold-vouchers create", error);
    return NextResponse.json({ error: message }, { status });
  }
}
