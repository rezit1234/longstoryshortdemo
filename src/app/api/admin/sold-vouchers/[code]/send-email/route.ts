import { normalizeVoucherCode } from "@/data/admin-voucher-settings";
import type { ShopId } from "@/data/admin-voucher-settings";
import { getSessionProfile } from "@/lib/admin-session";
import {
  resolveVoucherEmailRecipient,
  sendVoucherEmail,
} from "@/lib/email/send-voucher-email";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function asShopId(value: string): ShopId {
  if (
    value === "lss" ||
    value === "bistrocentral" ||
    value === "culinaryacademy"
  ) {
    return value;
  }
  return "lss";
}

function formatValidUntil(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return value;
  return `${d}. ${m}. ${y}`;
}

async function downloadPdfBytes(
  admin: ReturnType<typeof createAdminClient>,
  pdfUrl: string,
) {
  const marker = "/voucher-pdfs/";
  const markerIndex = pdfUrl.indexOf(marker);
  if (markerIndex >= 0) {
    const path = decodeURIComponent(
      pdfUrl.slice(markerIndex + marker.length).split("?")[0] ?? "",
    );
    if (path) {
      const { data, error } = await admin.storage
        .from("voucher-pdfs")
        .download(path);
      if (!error && data) {
        return Buffer.from(await data.arrayBuffer());
      }
    }
  }

  const response = await fetch(pdfUrl, { cache: "no-store" });
  if (!response.ok) return null;
  return Buffer.from(await response.arrayBuffer());
}

/** Ruční znovuodeslání e-mailu s PDF (pro test / zákaznický support). */
export async function POST(
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
        "code, shop_id, product_name, valid_until, buyer_name, buyer_email, recipient_name, delivery_method, delivery_email, message, pdf_url",
      )
      .eq("code_normalized", code)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Poukaz nenalezen." }, { status: 404 });
    }

    const to = resolveVoucherEmailRecipient({
      deliveryMethod: data.delivery_method,
      deliveryEmail: data.delivery_email,
      buyerEmail: data.buyer_email,
    });
    if (!to) {
      return NextResponse.json(
        { error: "U poukazu chybí e-mail příjemce." },
        { status: 400 },
      );
    }

    let attachment: { filename: string; content: Buffer } | undefined;
    if (data.pdf_url) {
      const bytes = await downloadPdfBytes(admin, String(data.pdf_url));
      if (bytes) {
        attachment = {
          filename: `poukaz-${data.code}.pdf`,
          content: bytes,
        };
      }
    }

    const result = await sendVoucherEmail({
      shopId: asShopId(String(data.shop_id)),
      to,
      buyerName: String(data.buyer_name || ""),
      recipientName: String(data.recipient_name || data.buyer_name || ""),
      productName: String(data.product_name || "Dárkový poukaz"),
      code: String(data.code),
      validUntil: formatValidUntil(String(data.valid_until)),
      deliveryMethod: String(data.delivery_method || "email"),
      message: data.message ? String(data.message) : null,
      attachments: attachment ? [attachment] : undefined,
    });

    if (result.skipped && result.reason === "no_api_key") {
      return NextResponse.json(
        {
          error:
            "Chybí BREVO_API_KEY v prostředí (Vercel / .env.local).",
        },
        { status: 500 },
      );
    }

    if (result.skipped && result.reason === "no_sender") {
      return NextResponse.json(
        {
          error:
            "Chybí EMAIL_FROM (ověřený odesílatel v Brevo).",
        },
        { status: 500 },
      );
    }

    if (!result.ok) {
      return NextResponse.json(
        { error: "error" in result ? result.error : "E-mail se nepodařilo odeslat." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, to, id: result.id });
  } catch (error) {
    console.error("sold-vouchers send-email", error);
    return NextResponse.json(
      { error: "Nepodařilo se odeslat e-mail." },
      { status: 500 },
    );
  }
}
