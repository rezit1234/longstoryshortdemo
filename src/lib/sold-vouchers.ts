import {
  ADMIN_VOUCHER_STATUS_LABELS,
  type AdminRedeemablePart,
  type AdminSoldVoucher,
  type AdminVoucherItemKind,
  type AdminVoucherShippingAddress,
  type AdminVoucherStatus,
} from "@/data/admin-vouchers";
import type { ShopId } from "@/data/admin-voucher-settings";
import { formatCzk } from "@/data/vouchers";
import {
  formatPaymentMethodLabel,
  isManualPaymentMethod,
  type ManualPaymentMethod,
} from "@/lib/voucher-payment-method";
import { parseRedeemableParts } from "@/lib/voucher-redemption";

export type SoldVoucherRow = {
  code: string;
  shop_id: string;
  product_name: string;
  unit_price_czk: number;
  shipping_fee_share_czk: number;
  status: string;
  purchased_at: string;
  valid_until: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  delivery_method: string;
  shipping_address: AdminVoucherShippingAddress | null;
  pdf_url?: string | null;
  item_kind?: string | null;
  remaining_czk?: number | null;
  redeemable_parts?: unknown;
  is_gift?: boolean | null;
  delivery_email?: string | null;
  recipient_name?: string | null;
  payment_method?: string | null;
  payment_method_note?: string | null;
  redeemed_note?: string | null;
  redeemed_at?: string | null;
};

function formatDateCs(isoOrDate: string) {
  const date = new Date(isoOrDate);
  if (Number.isNaN(date.getTime())) {
    // date-only YYYY-MM-DD
    const [y, m, d] = isoOrDate.split("-").map(Number);
    if (y && m && d) return `${d}. ${m}. ${y}`;
    return isoOrDate;
  }
  return `${date.getDate()}. ${date.getMonth() + 1}. ${date.getFullYear()}`;
}

/** Normalize DB date / timestamp to `YYYY-MM-DD`. */
export function toValidUntilIso(isoOrDate: string) {
  const trimmed = isoOrDate.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function deliveryLabel(method: string) {
  if (method === "post") return "Pošta - dárkové balení";
  if (method === "pickup") return "Vyzvednutí";
  return "E-mail";
}

function asStatus(value: string): AdminVoucherStatus {
  if (
    value === "active" ||
    value === "awaiting_shipment" ||
    value === "awaiting_pickup" ||
    value === "redeemed" ||
    value === "expired" ||
    value === "cancelled"
  ) {
    return value;
  }
  return "active";
}

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

function asItemKind(value: unknown): AdminVoucherItemKind | undefined {
  if (value === "amount" || value === "experience") return value;
  return undefined;
}

function formatValueLabel(row: SoldVoucherRow) {
  const unit = Number(row.unit_price_czk) || 0;
  const itemKind = asItemKind(row.item_kind);
  if (itemKind === "amount" && row.remaining_czk != null) {
    const remaining = Number(row.remaining_czk);
    if (Number.isFinite(remaining) && remaining !== unit) {
      return `${formatCzk(remaining)} / ${formatCzk(unit)}`;
    }
  }
  return formatCzk(unit);
}

export function mapSoldVoucherRow(row: SoldVoucherRow): AdminSoldVoucher {
  const status = asStatus(row.status);
  const packaging =
    row.shipping_fee_share_czk > 0 ? formatCzk(row.shipping_fee_share_czk) : null;
  const total = row.unit_price_czk + (row.shipping_fee_share_czk || 0);
  const parts = parseRedeemableParts(row.redeemable_parts) as
    | AdminRedeemablePart[]
    | null;
  const itemKind = asItemKind(row.item_kind);

  return {
    code: row.code,
    shopId: asShopId(row.shop_id),
    customer: row.buyer_name,
    email: row.buyer_email,
    phone: row.buyer_phone,
    product: row.product_name,
    value: formatValueLabel(row),
    packagingFee: packaging,
    totalPaid: formatCzk(total),
    purchasedAt: formatDateCs(row.purchased_at),
    validUntil: formatDateCs(row.valid_until),
    validUntilIso: toValidUntilIso(row.valid_until),
    deliveryMethod: deliveryLabel(row.delivery_method),
    status,
    statusLabel: ADMIN_VOUCHER_STATUS_LABELS[status],
    shippingAddress: row.shipping_address ?? undefined,
    pdfUrl:
      typeof row.pdf_url === "string" && row.pdf_url.trim()
        ? row.pdf_url.trim()
        : null,
    itemKind,
    unitPriceCzk: Number(row.unit_price_czk) || 0,
    remainingCzk:
      itemKind === "amount"
        ? row.remaining_czk == null
          ? Number(row.unit_price_czk) || 0
          : Number(row.remaining_czk)
        : null,
    redeemableParts: parts,
    isGift: Boolean(row.is_gift),
    deliveryEmail:
      typeof row.delivery_email === "string" && row.delivery_email.trim()
        ? row.delivery_email.trim()
        : null,
    recipientName:
      typeof row.recipient_name === "string" ? row.recipient_name : "",
    canUndo: false,
    paymentMethod: isManualPaymentMethod(row.payment_method)
      ? (row.payment_method as ManualPaymentMethod)
      : null,
    paymentMethodNote:
      typeof row.payment_method_note === "string" &&
      row.payment_method_note.trim()
        ? row.payment_method_note.trim()
        : null,
    paymentMethodLabel: formatPaymentMethodLabel(
      isManualPaymentMethod(row.payment_method) ? row.payment_method : null,
      row.payment_method_note,
    ),
    redeemedNote:
      typeof row.redeemed_note === "string" && row.redeemed_note.trim()
        ? row.redeemed_note.trim()
        : null,
    redeemedLabel:
      typeof row.redeemed_note === "string" && row.redeemed_note.trim()
        ? row.redeemed_note.trim()
        : status === "redeemed"
          ? "Uplatněno"
          : null,
  };
}
