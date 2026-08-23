export type AdminVoucherStatus = "active" | "redeemed" | "expired" | "cancelled";

export type AdminSoldVoucher = {
  code: string;
  customer: string;
  email: string;
  phone: string;
  product: string;
  value: string;
  purchasedAt: string;
  validUntil: string;
  deliveryMethod: string;
  status: AdminVoucherStatus;
  statusLabel: string;
};

export const ADMIN_SOLD_VOUCHERS: AdminSoldVoucher[] = [
  {
    code: "BRX4K9",
    customer: "Jana Nováková",
    email: "jana.novakova@email.cz",
    phone: "+420 777 123 456",
    product: "Chef's Table",
    value: "1 290 Kč",
    purchasedAt: "22. 4. 2026",
    validUntil: "22. 4. 2027",
    deliveryMethod: "E-mailem (PDF)",
    status: "active",
    statusLabel: "Aktivní",
  },
  {
    code: "LQ8M2P",
    customer: "Petr Svoboda",
    email: "petr.svoboda@email.cz",
    phone: "+420 603 221 984",
    product: "The Nook | „Koutek“",
    value: "2 490 Kč",
    purchasedAt: "21. 4. 2026",
    validUntil: "21. 4. 2027",
    deliveryMethod: "E-mailem (PDF)",
    status: "redeemed",
    statusLabel: "Uplatněný",
  },
  {
    code: "ZT7N1C",
    customer: "Lucie Dvořáková",
    email: "lucie.dvorakova@email.cz",
    phone: "+420 608 445 102",
    product: "Poukaz 1 500 Kč",
    value: "1 800 Kč",
    purchasedAt: "20. 4. 2026",
    validUntil: "20. 4. 2027",
    deliveryMethod: "E-mailem (PDF)",
    status: "expired",
    statusLabel: "Expirovaný",
  },
  {
    code: "HK3V8D",
    customer: "Martin Černý",
    email: "martin.cerny@email.cz",
    phone: "+420 724 908 311",
    product: "Poukaz 500 Kč",
    value: "500 Kč",
    purchasedAt: "19. 4. 2026",
    validUntil: "19. 4. 2027",
    deliveryMethod: "E-mailem (PDF)",
    status: "cancelled",
    statusLabel: "Stornovaný",
  },
  {
    code: "PW5J6A",
    customer: "Eva Horáková",
    email: "eva.horakova@email.cz",
    phone: "+420 775 640 228",
    product: "Chef's Table s vinným párováním",
    value: "1 100 Kč",
    purchasedAt: "18. 4. 2026",
    validUntil: "18. 4. 2027",
    deliveryMethod: "E-mailem (PDF)",
    status: "active",
    statusLabel: "Aktivní",
  },
  {
    code: "MN2Q9E",
    customer: "Tomáš Krejčí",
    email: "tomas.krejci@email.cz",
    phone: "+420 602 118 774",
    product: "The Big One & Chef's Table",
    value: "3 200 Kč",
    purchasedAt: "17. 4. 2026",
    validUntil: "17. 4. 2027",
    deliveryMethod: "E-mailem (PDF)",
    status: "redeemed",
    statusLabel: "Uplatněný",
  },
  {
    code: "CX1R4B",
    customer: "Kateřina Malá",
    email: "katerina.mala@email.cz",
    phone: "+420 731 552 901",
    product: "The Arc | „Výklenek“",
    value: "750 Kč",
    purchasedAt: "16. 4. 2026",
    validUntil: "16. 4. 2027",
    deliveryMethod: "E-mailem (PDF)",
    status: "active",
    statusLabel: "Aktivní",
  },
  {
    code: "YF6T0S",
    customer: "Jakub Němec",
    email: "jakub.nemec@email.cz",
    phone: "+420 604 339 812",
    product: "Poukaz 2 000 Kč",
    value: "1 990 Kč",
    purchasedAt: "15. 4. 2026",
    validUntil: "15. 4. 2027",
    deliveryMethod: "E-mailem (PDF)",
    status: "expired",
    statusLabel: "Expirovaný",
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
  const normalized = code.trim().toUpperCase();
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
