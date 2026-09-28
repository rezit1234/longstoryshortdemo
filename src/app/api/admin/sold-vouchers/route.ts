import { getSessionProfile } from "@/lib/admin-session";
import { mapSoldVoucherRow, type SoldVoucherRow } from "@/lib/sold-vouchers";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

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
