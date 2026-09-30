import { normalizeVoucherCode, type ShopId } from "@/data/admin-voucher-settings";

export type AdminVoucherStatus =
  | "active"
  | "awaiting_shipment"
  | "awaiting_pickup"
  | "redeemed"
  | "expired"
  | "cancelled";

export type AdminVoucherShippingAddress = {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
};

export type AdminSoldVoucher = {
  code: string;
  shopId: ShopId;
  customer: string;
  email: string;
  phone: string;
  product: string;
  /** Face value of the voucher (without packaging / shipping fee). */
  value: string;
  /** Packaging / shipping surcharge, if any. */
  packagingFee: string | null;
  /** value + packagingFee */
  totalPaid: string;
  purchasedAt: string;
  validUntil: string;
  deliveryMethod: string;
  status: AdminVoucherStatus;
  statusLabel: string;
  shippingAddress?: AdminVoucherShippingAddress;
  /** Veřejná URL vygenerovaného PDF (kód + QR). */
  pdfUrl?: string | null;
};

export const ADMIN_VOUCHER_STATUS_LABELS: Record<AdminVoucherStatus, string> = {
  active: "Aktivní",
  awaiting_shipment: "Čeká na odeslání",
  awaiting_pickup: "Čeká na vyzvednutí",
  redeemed: "Uplatněný",
  expired: "Expirovaný",
  cancelled: "Stornovaný",
};

export const ADMIN_SOLD_VOUCHERS: AdminSoldVoucher[] = [];

function normalizeSearch(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function searchAdminVouchers(
  query: string,
  vouchers: AdminSoldVoucher[] = [],
) {
  const normalized = normalizeSearch(query);
  if (!normalized) return [];

  return vouchers.filter((voucher) => {
    const haystack = normalizeSearch(
      `${voucher.code} ${voucher.customer} ${voucher.email} ${voucher.product} ${voucher.value} ${voucher.shopId}`,
    );
    return haystack.includes(normalized);
  });
}

export function getAdminVoucherByCode(
  code: string,
  vouchers: AdminSoldVoucher[] = [],
) {
  const normalized = normalizeVoucherCode(code);
  if (!normalized) return undefined;
  return vouchers.find(
    (voucher) => normalizeVoucherCode(voucher.code) === normalized,
  );
}

export function getRecentAdminVouchers(
  limit = 4,
  vouchers: AdminSoldVoucher[] = [],
) {
  return vouchers.slice(0, limit);
}

export function getRecentAdminCustomers(
  limit = 4,
  vouchers: AdminSoldVoucher[] = [],
) {
  const seen = new Set<string>();
  const customers: { customer: string; voucher: AdminSoldVoucher }[] = [];

  for (const voucher of vouchers) {
    if (seen.has(voucher.customer)) continue;
    seen.add(voucher.customer);
    customers.push({ customer: voucher.customer, voucher });
    if (customers.length >= limit) break;
  }

  return customers;
}
