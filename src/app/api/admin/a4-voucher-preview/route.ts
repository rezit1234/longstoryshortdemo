import { NextResponse } from "next/server";
import { generateVoucherCode, type ShopId } from "@/data/admin-voucher-settings";
import { getSessionProfile } from "@/lib/admin-session";
import {
  generateA4VoucherPdf,
  shopUsesHardcodedA4Pdf,
} from "@/lib/voucher-a4-pdf";

function asShopId(value: unknown): ShopId | null {
  if (value === "lss" || value === "bistrocentral" || value === "culinaryacademy") {
    return value;
  }
  return null;
}

function asPositiveNumber(value: unknown, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.round(n);
}

export async function GET(request: Request) {
  const session = await getSessionProfile();
  if (!session) {
    return NextResponse.json({ error: "Nejste přihlášeni." }, { status: 401 });
  }

  const url = new URL(request.url);
  const shopId = asShopId(url.searchParams.get("shopId"));
  if (!shopId || !shopUsesHardcodedA4Pdf(shopId)) {
    return NextResponse.json(
      { error: "Náhled A4 je jen pro Long Story Short a Bistro Central." },
      { status: 400 },
    );
  }

  const kindParam = url.searchParams.get("kind");
  const kind = kindParam === "amount" ? "amount" : "experience";
  const serviceTitle =
    url.searchParams.get("title")?.trim() ||
    (kind === "amount" ? "Dárkový poukaz" : "Chef's Table");
  const amountCzk = asPositiveNumber(url.searchParams.get("amount"), 1000);
  const recipientName =
    url.searchParams.get("recipient")?.trim() || "Jan Novák";
  const fromName = url.searchParams.get("from")?.trim() || "Petr Svoboda";
  const message =
    url.searchParams.get("message")?.trim() || "Užijte si to!";

  const issuedAt = new Date();
  const validUntil = new Date(issuedAt);
  validUntil.setMonth(validUntil.getMonth() + 12);

  const bytes = await generateA4VoucherPdf({
    shopId,
    code: generateVoucherCode(shopId),
    kind,
    serviceTitle,
    amountCzk,
    recipientName,
    fromName,
    issuedAt,
    validUntil,
    message,
  });

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="nahled-poukazu.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
