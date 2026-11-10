import { normalizeVoucherCode } from "@/data/admin-voucher-settings";
import { getSessionProfile } from "@/lib/admin-session";
import { regenerateSoldVoucherPdfIfSupported } from "@/lib/regenerate-sold-voucher-pdf";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Stažení PDF poukazu (auth required).
 * LSS/BC: vždy znovu vygeneruje aktuální A4 (oprava starých „prázdných“ razítek).
 */
export async function GET(
  _request: Request,
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

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("sold_vouchers")
      .select(
        "code, shop_id, product_name, item_kind, unit_price_czk, valid_until, purchased_at, buyer_name, recipient_name, message, pdf_url, is_gift",
      )
      .eq("code_normalized", code)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Poukaz nenalezen." }, { status: 404 });
    }

    const regenerated = await regenerateSoldVoucherPdfIfSupported(data);
    if (regenerated) {
      return new NextResponse(new Uint8Array(regenerated.bytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="poukaz-${data.code}.pdf"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    if (!data.pdf_url) {
      return NextResponse.json(
        { error: "PDF pro tento poukaz ještě není vygenerované." },
        { status: 404 },
      );
    }

    const pdfUrl = String(data.pdf_url);
    const marker = "/voucher-pdfs/";
    const markerIndex = pdfUrl.indexOf(marker);
    if (markerIndex >= 0) {
      const path = decodeURIComponent(
        pdfUrl.slice(markerIndex + marker.length).split("?")[0] ?? "",
      );
      if (path) {
        const { data: file, error: downloadError } = await admin.storage
          .from("voucher-pdfs")
          .download(path);
        if (!downloadError && file) {
          const bytes = await file.arrayBuffer();
          return new NextResponse(bytes, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="poukaz-${data.code}.pdf"`,
              "Cache-Control": "private, no-store",
            },
          });
        }
      }
    }

    return NextResponse.redirect(pdfUrl);
  } catch (error) {
    console.error("sold-vouchers pdf download", error);
    return NextResponse.json(
      { error: "Nepodařilo se stáhnout PDF." },
      { status: 500 },
    );
  }
}
