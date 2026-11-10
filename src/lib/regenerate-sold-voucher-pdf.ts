import {
  normalizeVoucherCode,
  type ShopId,
} from "@/data/admin-voucher-settings";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateA4VoucherPdf,
  shopUsesHardcodedA4Pdf,
  type A4VoucherKind,
} from "@/lib/voucher-a4-pdf";

export type SoldVoucherPdfSource = {
  code: string;
  shop_id: string;
  product_name: string | null;
  item_kind: string | null;
  unit_price_czk: number | null;
  buyer_name: string | null;
  recipient_name: string | null;
  message: string | null;
  purchased_at: string | null;
  valid_until: string | null;
  is_gift: boolean | null;
};

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

function formatAmountTitle(amountCzk: number) {
  return `${Math.round(amountCzk).toLocaleString("cs-CZ")} Kč`;
}

function createIssuedPdfPath(shopId: ShopId, code: string) {
  const safe = normalizeVoucherCode(code) || code;
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `issued/${shopId}/${safe}-${id}.pdf`;
}

/**
 * Znovu vygeneruje A4 PDF pro LSS/BC ze záznamu sold_vouchers
 * a uloží novou URL. Culinary (šablona) nechává beze změny.
 */
export async function regenerateSoldVoucherPdfIfSupported(
  row: SoldVoucherPdfSource,
): Promise<{ bytes: Buffer; url: string; regenerated: boolean } | null> {
  const shopId = asShopId(String(row.shop_id));
  if (!shopUsesHardcodedA4Pdf(shopId)) {
    return null;
  }

  const code = String(row.code || "").trim().toUpperCase();
  if (!code) return null;

  const kind: A4VoucherKind =
    row.item_kind === "experience" ? "experience" : "amount";
  const amountCzk = Number(row.unit_price_czk) || 0;
  const productName = String(row.product_name || "").trim() || "Dárkový poukaz";
  const recipientName =
    String(row.recipient_name || "").trim() ||
    String(row.buyer_name || "").trim() ||
    null;
  const fromName = row.is_gift
    ? String(row.buyer_name || "").trim() || null
    : null;
  const message = String(row.message || "").trim() || null;
  const issuedAt = row.purchased_at ? new Date(row.purchased_at) : new Date();
  const validUntil = String(row.valid_until || "").trim() || issuedAt;

  const bytes = await generateA4VoucherPdf({
    shopId,
    code,
    kind,
    serviceTitle:
      kind === "experience" ? productName : formatAmountTitle(amountCzk),
    amountCzk,
    recipientName,
    fromName,
    issuedAt,
    validUntil,
    message,
  });

  const admin = createAdminClient();
  const path = createIssuedPdfPath(shopId, code);
  const { error: uploadError } = await admin.storage
    .from("voucher-pdfs")
    .upload(path, Buffer.from(bytes), {
      contentType: "application/pdf",
      upsert: false,
      cacheControl: "3600",
    });
  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const {
    data: { publicUrl },
  } = admin.storage.from("voucher-pdfs").getPublicUrl(path);

  const { error: updateError } = await admin
    .from("sold_vouchers")
    .update({ pdf_url: publicUrl })
    .eq("code_normalized", normalizeVoucherCode(code));
  if (updateError) {
    throw new Error(updateError.message);
  }

  return {
    bytes: Buffer.from(bytes),
    url: publicUrl,
    regenerated: true,
  };
}
