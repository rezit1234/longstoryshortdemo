import type { ShopId } from "@/data/admin-voucher-settings";

export type ComgateShopCredentials = {
  merchant: string;
  secret: string;
};

const SHOP_ENV_KEYS: Record<
  ShopId,
  { merchant: string; secret: string }
> = {
  lss: {
    merchant: "COMGATE_LSS_MERCHANT",
    secret: "COMGATE_LSS_SECRET",
  },
  bistrocentral: {
    merchant: "COMGATE_BISTROCENTRAL_MERCHANT",
    secret: "COMGATE_BISTROCENTRAL_SECRET",
  },
  culinaryacademy: {
    merchant: "COMGATE_CULINARYACADEMY_MERCHANT",
    secret: "COMGATE_CULINARYACADEMY_SECRET",
  },
};

export function isComgateTestMode() {
  return process.env.COMGATE_TEST !== "false";
}

export function getComgateCredentials(
  shopId: ShopId,
): ComgateShopCredentials {
  const keys = SHOP_ENV_KEYS[shopId];
  const merchant = process.env[keys.merchant]?.trim();
  const secret = process.env[keys.secret]?.trim();

  if (!merchant || !secret) {
    throw new Error(
      `Chybí Comgate credentials pro obchod ${shopId} (${keys.merchant} / ${keys.secret}).`,
    );
  }

  return { merchant, secret };
}

export function findShopIdByMerchant(merchant: string): ShopId | null {
  for (const shopId of Object.keys(SHOP_ENV_KEYS) as ShopId[]) {
    const configured = process.env[SHOP_ENV_KEYS[shopId].merchant]?.trim();
    if (configured && configured === merchant) return shopId;
  }
  return null;
}

type CreatePaymentInput = {
  shopId: ShopId;
  priceCzk: number;
  label: string;
  refId: string;
  email: string;
  fullName: string;
  phone?: string;
  /** Product name for Comgate stats (longer ok). */
  name?: string;
  delivery: "ELECTRONIC_DELIVERY" | "HOME_DELIVERY" | "PICKUP";
  urlPaid: string;
  urlCancelled: string;
  urlPending: string;
};

export type ComgateCreatePaymentResult = {
  code: number;
  message: string;
  transId?: string;
  redirect?: string;
};

export type ComgateStatusResult = {
  code: number;
  message: string;
  status?: "PENDING" | "PAID" | "CANCELLED" | "AUTHORIZED" | string;
  transId?: string;
  refId?: string;
  price?: string | number;
  curr?: string;
  method?: string;
};

function toHellers(czk: number) {
  return Math.round(czk * 100);
}

function truncateLabel(label: string) {
  const cleaned = label.replace(/\s+/g, " ").trim();
  return cleaned.slice(0, 16) || "Poukaz";
}

async function parseComgateBody(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  const raw = await response.text();

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return { code: 1500, message: raw || "Invalid JSON from Comgate" };
    }
  }

  const params = new URLSearchParams(raw);
  const result: Record<string, unknown> = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  if (typeof result.code === "string" && /^\d+$/.test(result.code)) {
    result.code = Number(result.code);
  }
  return result;
}

export async function createComgatePayment(
  input: CreatePaymentInput,
): Promise<ComgateCreatePaymentResult> {
  const credentials = getComgateCredentials(input.shopId);
  const test = isComgateTestMode();

  const body = new URLSearchParams({
    merchant: credentials.merchant,
    secret: credentials.secret,
    price: String(toHellers(input.priceCzk)),
    curr: "CZK",
    label: truncateLabel(input.label),
    refId: input.refId,
    method: "ALL",
    email: input.email,
    fullName: input.fullName,
    country: "CZ",
    lang: "cs",
    prepareOnly: "true",
    test: test ? "true" : "false",
    delivery: input.delivery,
    category:
      input.delivery === "ELECTRONIC_DELIVERY" ? "OTHER" : "PHYSICAL_GOODS_ONLY",
    url_paid: input.urlPaid,
    url_cancelled: input.urlCancelled,
    url_pending: input.urlPending,
  });

  if (input.phone?.trim()) {
    body.set("phone", input.phone.trim());
  }
  if (input.name?.trim()) {
    body.set("name", input.name.trim().slice(0, 255));
  }

  const response = await fetch("https://payments.comgate.cz/v1.0/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const data = await parseComgateBody(response);
  const code = typeof data.code === "number" ? data.code : Number(data.code);

  return {
    code: Number.isFinite(code) ? code : 1500,
    message: typeof data.message === "string" ? data.message : "Comgate error",
    transId: typeof data.transId === "string" ? data.transId : undefined,
    redirect: typeof data.redirect === "string" ? data.redirect : undefined,
  };
}

export async function getComgatePaymentStatus(
  shopId: ShopId,
  transId: string,
): Promise<ComgateStatusResult> {
  const credentials = getComgateCredentials(shopId);
  const body = new URLSearchParams({
    merchant: credentials.merchant,
    transId,
    secret: credentials.secret,
  });

  const response = await fetch("https://payments.comgate.cz/v1.0/status", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const data = await parseComgateBody(response);
  const code = typeof data.code === "number" ? data.code : Number(data.code);

  return {
    code: Number.isFinite(code) ? code : 1500,
    message: typeof data.message === "string" ? data.message : "Comgate error",
    status: typeof data.status === "string" ? data.status : undefined,
    transId: typeof data.transId === "string" ? data.transId : undefined,
    refId: typeof data.refId === "string" ? data.refId : undefined,
    price: data.price as string | number | undefined,
    curr: typeof data.curr === "string" ? data.curr : undefined,
    method: typeof data.method === "string" ? data.method : undefined,
  };
}
