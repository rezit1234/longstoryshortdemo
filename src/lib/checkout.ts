import type { ShopId } from "@/data/admin-voucher-settings";
import { isShopEnabled } from "@/data/shops";
import { normalizeAppBaseUrl } from "@/lib/app-base-url";
import {
  experienceSupportsSeatQuantity,
  SEAT_QUANTITY_MAX,
  SEAT_QUANTITY_MIN,
} from "@/lib/voucher-redemption";

export type CheckoutDeliveryMethod = "email" | "post" | "pickup";
export type CheckoutItemKind = "amount" | "experience";

/** Osobní zpráva pro příjemce (včetně mezer). */
export const PERSONAL_MESSAGE_MAX_LENGTH = 40;

export type CheckoutAmountItem = {
  kind: "amount";
  amount: number;
};

export type CheckoutExperienceItem = {
  kind: "experience";
  id: string;
  title: string;
  subtitle?: string;
  price: number;
};

export type CheckoutCartItem = CheckoutAmountItem | CheckoutExperienceItem;

export type CheckoutFormPayload = {
  recipient: "other" | "self";
  quantity: number;
  buyerName: string;
  buyerEmail: string;
  recipientName: string;
  message: string;
  phone: string;
  delivery: CheckoutDeliveryMethod;
  deliveryEmail: string;
  wantInvoice: boolean;
  invoiceRecipientType: "company" | "person" | null;
  companyId: string;
  companyName: string;
  vatId: string;
  invoiceEmail: string;
  invoiceFirstName: string;
  invoiceLastName: string;
  invoiceAddressLine1: string;
  invoiceCity: string;
  invoicePostalCode: string;
  invoiceNote: string;
  shippingName: string;
  addressLine1: string;
  city: string;
  postalCode: string;
  country: string;
};

export type CreatePaymentRequestBody = {
  shopId: ShopId;
  item: CheckoutCartItem;
  form: CheckoutFormPayload;
};

export type VoucherOrderStatus =
  | "pending"
  | "paid"
  | "cancelled"
  | "failed";

export function isShopId(value: unknown): value is ShopId {
  return (
    value === "lss" ||
    value === "bistrocentral" ||
    value === "culinaryacademy"
  );
}

export function generateOrderNumber(shopId: ShopId) {
  const prefix =
    shopId === "lss" ? "LSS" : shopId === "bistrocentral" ? "BC" : "CA";
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${y}${m}${d}-${rand}`;
}

export function unitPriceFromItem(item: CheckoutCartItem) {
  return item.kind === "amount" ? item.amount : item.price;
}

export function itemLabel(item: CheckoutCartItem) {
  if (item.kind === "amount") {
    return `Poukaz ${item.amount} Kč`;
  }
  return item.title.trim() || "Zážitek";
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function validateCheckoutPayload(body: CreatePaymentRequestBody): string | null {
  if (!isShopId(body.shopId)) return "Neplatný obchod.";
  if (!isShopEnabled(body.shopId)) {
    return "Tento obchod je dočasně vypnutý.";
  }
  if (!body.item || (body.item.kind !== "amount" && body.item.kind !== "experience")) {
    return "Neplatná položka.";
  }

  const form = body.form;
  if (!form) return "Chybí formulář.";

  const quantity = Number(form.quantity);
  const seatProduct =
    body.item.kind === "experience" &&
    experienceSupportsSeatQuantity(body.item.id);
  const maxQty = seatProduct ? SEAT_QUANTITY_MAX : 15;
  const minQty = seatProduct ? SEAT_QUANTITY_MIN : 1;
  if (!Number.isInteger(quantity) || quantity < minQty || quantity > maxQty) {
    return seatProduct ? "Neplatný počet osob." : "Neplatné množství.";
  }

  const unit = unitPriceFromItem(body.item);
  if (!Number.isFinite(unit) || unit < 100 || unit > 500_000) {
    return "Neplatná částka.";
  }

  if (!form.buyerName?.trim()) return "Vyplňte jméno.";
  if (!isValidEmail(form.buyerEmail ?? "")) return "Neplatný e-mail.";
  if (!form.phone?.trim()) return "Vyplňte telefon.";

  if (form.recipient === "other" && !form.recipientName?.trim()) {
    return "Vyplňte jméno příjemce.";
  }

  if (
    typeof form.message === "string" &&
    form.message.length > PERSONAL_MESSAGE_MAX_LENGTH
  ) {
    return `Osobní zpráva smí mít nejvýše ${PERSONAL_MESSAGE_MAX_LENGTH} znaků.`;
  }

  if (form.delivery === "email" && !isValidEmail(form.deliveryEmail ?? "")) {
    return "Neplatný e-mail pro doručení.";
  }

  if (form.delivery === "post") {
    if (
      !form.shippingName?.trim() ||
      !form.addressLine1?.trim() ||
      !form.city?.trim() ||
      !form.postalCode?.trim()
    ) {
      return "Vyplňte doručovací adresu.";
    }
  }

  const itemsTotal = unit * quantity;
  const invoiceRequired = itemsTotal >= 10_000;
  if (invoiceRequired && !form.wantInvoice) {
    return "Pro částku od 10 000 Kč je daňový doklad povinný.";
  }

  if (form.wantInvoice) {
    if (!form.invoiceRecipientType) {
      return "Zvolte typ daňového dokladu.";
    }
    if (!isValidEmail(form.invoiceEmail ?? "")) {
      return "Neplatný e-mail pro daňový doklad.";
    }
    if (form.invoiceRecipientType === "company") {
      const ico = (form.companyId ?? "").replace(/\D/g, "");
      if (ico.length !== 8) return "Vyplňte platné 8místné IČO.";
      if (!(form.companyName ?? "").trim()) {
        return "Doplňte název firmy (ARES podle IČO nebo našeptávání).";
      }
    }
    if (form.invoiceRecipientType === "person") {
      if (
        !form.invoiceFirstName?.trim() ||
        !form.invoiceLastName?.trim() ||
        !form.invoiceAddressLine1?.trim() ||
        !form.invoiceCity?.trim() ||
        !form.invoicePostalCode?.trim()
      ) {
        return "Vyplňte údaje daňového dokladu na jméno.";
      }
    }
  }

  return null;
}

export function getAppBaseUrl(requestUrl: string) {
  const configured = normalizeAppBaseUrl(process.env.NEXT_PUBLIC_APP_URL);
  if (configured) return configured;
  return new URL(requestUrl).origin;
}
