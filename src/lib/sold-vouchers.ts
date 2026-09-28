import {
  ADMIN_VOUCHER_STATUS_LABELS,
  type AdminSoldVoucher,
  type AdminVoucherShippingAddress,
  type AdminVoucherStatus,
} from "@/data/admin-vouchers";
import type { ShopId } from "@/data/admin-voucher-settings";
import { formatCzk } from "@/data/vouchers";

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

export function mapSoldVoucherRow(row: SoldVoucherRow): AdminSoldVoucher {
  const status = asStatus(row.status);
  const packaging =
    row.shipping_fee_share_czk > 0 ? formatCzk(row.shipping_fee_share_czk) : null;
  const total = row.unit_price_czk + (row.shipping_fee_share_czk || 0);

  return {
    code: row.code,
    shopId: asShopId(row.shop_id),
    customer: row.buyer_name,
    email: row.buyer_email,
    phone: row.buyer_phone,
    product: row.product_name,
    value: formatCzk(row.unit_price_czk),
    packagingFee: packaging,
    totalPaid: formatCzk(total),
    purchasedAt: formatDateCs(row.purchased_at),
    validUntil: formatDateCs(row.valid_until),
    deliveryMethod: deliveryLabel(row.delivery_method),
    status,
    statusLabel: ADMIN_VOUCHER_STATUS_LABELS[status],
    shippingAddress: row.shipping_address ?? undefined,
    pdfUrl:
      typeof row.pdf_url === "string" && row.pdf_url.trim()
        ? row.pdf_url.trim()
        : null,
  };
}
