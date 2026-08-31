import { normalizeVoucherCode } from "@/data/admin-voucher-settings";

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
    code: "LSS-BRX4K9",
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
    code: "LSS-PS8K2M",
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
    code: "LSS-PK3W7N",
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
    code: "LSS-LQ8M2P",
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
    code: "LSS-ZT7N1C",
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
    code: "LSS-HK3V8D",
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
    code: "LSS-PW5J6A",
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
  {
    code: "LSS-MN2Q9E",
    customer: "Tomáš Krejčí",
    email: "tomas.krejci@email.cz",
    phone: "+420 602 118 774",
    product: "The Big One & Chef's Table",
    value: "9 500 Kč",
    packagingFee: "20 Kč",
    totalPaid: "9 520 Kč",
    purchasedAt: "17. 4. 2026",
    validUntil: "17. 4. 2027",
    deliveryMethod: "Pobočka - vyzvednutí na recepci",
    status: "awaiting_pickup",
    statusLabel: ADMIN_VOUCHER_STATUS_LABELS.awaiting_pickup,
  },
  {
    code: "LSS-CX1R4B",
    customer: "Kateřina Malá",
    email: "katerina.mala@email.cz",
    phone: "+420 731 552 901",
    product: "The Arc | „Výklenek“",
    value: "3 600 Kč",
    packagingFee: null,
    totalPaid: "3 600 Kč",
    purchasedAt: "16. 4. 2026",
    validUntil: "16. 4. 2027",
    deliveryMethod: "E-mail",
    status: "active",
    statusLabel: ADMIN_VOUCHER_STATUS_LABELS.active,
  },
  {
    code: "LSS-YF6T0S",
    customer: "Jakub Němec",
    email: "jakub.nemec@email.cz",
    phone: "+420 604 339 812",
    product: "Poukaz 2 000 Kč",
    value: "2 000 Kč",
    packagingFee: null,
    totalPaid: "2 000 Kč",
    purchasedAt: "15. 4. 2026",
    validUntil: "15. 4. 2027",
    deliveryMethod: "E-mail",
    status: "expired",
    statusLabel: ADMIN_VOUCHER_STATUS_LABELS.expired,
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
      `${voucher.code} ${voucher.customer} ${voucher.email} ${voucher.product} ${voucher.value}`,
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
  return vouchers.find((voucher) => voucher.code === normalized);
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
