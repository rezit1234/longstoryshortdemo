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
};

export const ADMIN_VOUCHER_STATUS_LABELS: Record<AdminVoucherStatus, string> = {
  active: "Aktivní",
  awaiting_shipment: "Čeká na odeslání",
  awaiting_pickup: "Čeká na vyzvednutí",
  redeemed: "Uplatněný",
  expired: "Expirovaný",
  cancelled: "Stornovaný",
};

export const ADMIN_SOLD_VOUCHERS: AdminSoldVoucher[] = [
  {
    code: "K7M2P9QX",
    shopId: "lss",
    customer: "Jana Nováková",
    email: "jana.novakova@email.cz",
    phone: "+420 777 123 456",
    product: "Chef's Table",
    value: "1 876 Kč",
    packagingFee: null,
    totalPaid: "1 876 Kč",
    purchasedAt: "22. 4. 2026",
    validUntil: "22. 4. 2027",
    deliveryMethod: "E-mail",
    status: "active",
    statusLabel: ADMIN_VOUCHER_STATUS_LABELS.active,
  },
  {
    code: "H4N8R2TW",
    shopId: "bistrocentral",
    customer: "Marie Králová",
    email: "marie.kralova@email.cz",
    phone: "+420 777 222 333",
    product: "Poukaz 1 000 Kč",
    value: "1 000 Kč",
    packagingFee: null,
    totalPaid: "1 000 Kč",
    purchasedAt: "28. 4. 2026",
    validUntil: "28. 4. 2027",
    deliveryMethod: "E-mail",
    status: "active",
    statusLabel: ADMIN_VOUCHER_STATUS_LABELS.active,
  },
  {
    code: "C8A2L5MY",
    shopId: "culinaryacademy",
    customer: "Petra Horáková",
    email: "petra.horakova@email.cz",
    phone: "+420 777 444 555",
    product: "Poukaz 1 500 Kč",
    value: "1 500 Kč",
    packagingFee: null,
    totalPaid: "1 500 Kč",
    purchasedAt: "26. 4. 2026",
    validUntil: "26. 4. 2027",
    deliveryMethod: "E-mail",
    status: "active",
    statusLabel: ADMIN_VOUCHER_STATUS_LABELS.active,
  },
  {
    code: "Q1W4E7RT",
    shopId: "culinaryacademy",
    customer: "Tomáš Malý",
    email: "tomas.maly@email.cz",
    phone: "+420 603 888 999",
    product: "Poukaz 3 000 Kč",
    value: "3 000 Kč",
    packagingFee: "20 Kč",
    totalPaid: "3 020 Kč",
    purchasedAt: "25. 4. 2026",
    validUntil: "25. 4. 2027",
    deliveryMethod: "Vyzvednutí",
    status: "awaiting_pickup",
    statusLabel: ADMIN_VOUCHER_STATUS_LABELS.awaiting_pickup,
  },
  {
    code: "P3K9M6YA",
    shopId: "bistrocentral",
    customer: "Ondřej Bílek",
    email: "ondrej.bilek@email.cz",
    phone: "+420 605 111 222",
    product: "Poukaz 2 000 Kč",
    value: "2 000 Kč",
    packagingFee: "105 Kč",
    totalPaid: "2 105 Kč",
    purchasedAt: "27. 4. 2026",
    validUntil: "27. 4. 2027",
    deliveryMethod: "Pošta - dárkové balení",
    status: "awaiting_shipment",
    statusLabel: ADMIN_VOUCHER_STATUS_LABELS.awaiting_shipment,
    shippingAddress: {
      name: "Ondřej Bílek",
      address: "Náměstí 3",
      city: "Olomouc",
      postalCode: "779 00",
      country: "Česko",
    },
  },
  {
    code: "LSS-BRX4K9",
    shopId: "lss",
    customer: "Legacy Test",
    email: "legacy@email.cz",
    phone: "+420 777 000 001",
    product: "Chef's Table",
    value: "1 876 Kč",
    packagingFee: null,
    totalPaid: "1 876 Kč",
    purchasedAt: "10. 4. 2026",
    validUntil: "10. 4. 2027",
    deliveryMethod: "E-mail",
    status: "active",
    statusLabel: ADMIN_VOUCHER_STATUS_LABELS.active,
  },
  {
    code: "N8Q2V5ZB",
    shopId: "lss",
    customer: "Anna Veselá",
    email: "anna.vesela@email.cz",
    phone: "+420 777 888 111",
    product: "The Nook | „Koutek“",
    value: "4 400 Kč",
    packagingFee: "105 Kč",
    totalPaid: "4 505 Kč",
    purchasedAt: "26. 4. 2026",
    validUntil: "26. 4. 2027",
    deliveryMethod: "Pošta - dárkové balení",
    status: "awaiting_shipment",
    statusLabel: ADMIN_VOUCHER_STATUS_LABELS.awaiting_shipment,
    shippingAddress: {
      name: "Anna Veselá",
      address: "Palackého 12",
      city: "Olomouc",
      postalCode: "779 00",
      country: "Česko",
    },
  },
  {
    code: "R6T4W9XC",
    shopId: "lss",
    customer: "David Procházka",
    email: "david.prochazka@email.cz",
    phone: "+420 602 445 778",
    product: "Poukaz 2 000 Kč",
    value: "2 000 Kč",
    packagingFee: "20 Kč",
    totalPaid: "2 020 Kč",
    purchasedAt: "25. 4. 2026",
    validUntil: "25. 4. 2027",
    deliveryMethod: "Pobočka - vyzvednutí na recepci",
    status: "awaiting_pickup",
    statusLabel: ADMIN_VOUCHER_STATUS_LABELS.awaiting_pickup,
  },
  {
    code: "M2Y7K4PD",
    shopId: "lss",
    customer: "Petr Svoboda",
    email: "petr.svoboda@email.cz",
    phone: "+420 603 221 984",
    product: "The Nook | „Koutek“",
    value: "4 400 Kč",
    packagingFee: null,
    totalPaid: "4 400 Kč",
    purchasedAt: "21. 4. 2026",
    validUntil: "21. 4. 2027",
    deliveryMethod: "E-mail",
    status: "redeemed",
    statusLabel: ADMIN_VOUCHER_STATUS_LABELS.redeemed,
  },
  {
    code: "W5H3N8QE",
    shopId: "lss",
    customer: "Lucie Dvořáková",
    email: "lucie.dvorakova@email.cz",
    phone: "+420 608 445 102",
    product: "Poukaz 1 500 Kč",
    value: "1 500 Kč",
    packagingFee: null,
    totalPaid: "1 500 Kč",
    purchasedAt: "20. 4. 2026",
    validUntil: "20. 4. 2027",
    deliveryMethod: "E-mail",
    status: "expired",
    statusLabel: ADMIN_VOUCHER_STATUS_LABELS.expired,
  },
  {
    code: "Z9C6J2RF",
    shopId: "lss",
    customer: "Martin Černý",
    email: "martin.cerny@email.cz",
    phone: "+420 724 908 311",
    product: "Poukaz 1 000 Kč",
    value: "1 000 Kč",
    packagingFee: null,
    totalPaid: "1 000 Kč",
    purchasedAt: "19. 4. 2026",
    validUntil: "19. 4. 2027",
    deliveryMethod: "E-mail",
    status: "cancelled",
    statusLabel: ADMIN_VOUCHER_STATUS_LABELS.cancelled,
  },
  {
    code: "T4B8X5SG",
    shopId: "lss",
    customer: "Eva Horáková",
    email: "eva.horakova@email.cz",
    phone: "+420 775 640 228",
    product: "Chef's Table s vinným párováním",
    value: "2 543 Kč",
    packagingFee: "105 Kč",
    totalPaid: "2 648 Kč",
    purchasedAt: "18. 4. 2026",
    validUntil: "18. 4. 2027",
    deliveryMethod: "Pošta - dárkové balení",
    status: "awaiting_shipment",
    statusLabel: ADMIN_VOUCHER_STATUS_LABELS.awaiting_shipment,
    shippingAddress: {
      name: "Eva Horáková",
      address: "Masarykova 8",
      city: "Brno",
      postalCode: "602 00",
      country: "Česko",
    },
  },
];

function normalizeSearch(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function searchAdminVouchers(
  query: string,
  vouchers: AdminSoldVoucher[] = ADMIN_SOLD_VOUCHERS,
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
  vouchers: AdminSoldVoucher[] = ADMIN_SOLD_VOUCHERS,
) {
  const normalized = normalizeVoucherCode(code);
  if (!normalized) return undefined;
  return vouchers.find(
    (voucher) => normalizeVoucherCode(voucher.code) === normalized,
  );
}

export function getRecentAdminVouchers(
  limit = 4,
  vouchers: AdminSoldVoucher[] = ADMIN_SOLD_VOUCHERS,
) {
  return vouchers.slice(0, limit);
}

export function getRecentAdminCustomers(
  limit = 4,
  vouchers: AdminSoldVoucher[] = ADMIN_SOLD_VOUCHERS,
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
