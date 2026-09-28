import {
  generateVoucherCode,
  normalizeVoucherCode,
  type ShopId,
} from "@/data/admin-voucher-settings";
import { createAdminClient } from "@/lib/supabase/admin";

type OrderRow = {
  id: string;
  order_number: string;
  shop_id: ShopId;
  status: string;
  item_kind: "amount" | "experience";
  item: Record<string, unknown>;
  quantity: number;
  unit_price_czk: number;
  shipping_fee_czk: number;
  buyer: Record<string, unknown>;
  delivery: Record<string, unknown>;
  paid_at: string | null;
};

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function productNameFromOrder(order: OrderRow) {
  if (order.item_kind === "amount") {
    const amount =
      typeof order.item.amount === "number"
        ? order.item.amount
        : order.unit_price_czk;
    return `Poukaz ${amount.toLocaleString("cs-CZ")} Kč`;
  }
  const title = asString(order.item.title).trim();
  return title || "Zážitek";
}

function initialStatus(deliveryMethod: string) {
  if (deliveryMethod === "post") return "awaiting_shipment" as const;
  if (deliveryMethod === "pickup") return "awaiting_pickup" as const;
  return "active" as const;
}

function shippingAddressFromDelivery(delivery: Record<string, unknown>) {
  const method = asString(delivery.method);
  if (method !== "post") return null;
  return {
    name: asString(delivery.shippingName),
    address: asString(delivery.addressLine1),
    city: asString(delivery.city),
    postalCode: asString(delivery.postalCode),
    country: asString(delivery.country, "CZ") === "SK" ? "Slovensko" : "Česko",
  };
}

async function loadValidityMonths(
  admin: ReturnType<typeof createAdminClient>,
  shopId: ShopId,
) {
  const { data } = await admin
    .from("voucher_settings")
    .select("validity_months")
    .eq("shop_id", shopId)
    .maybeSingle();
  const months =
    typeof data?.validity_months === "number" && data.validity_months > 0
      ? data.validity_months
      : 12;
  return months;
}

async function generateUniqueCodes(
  admin: ReturnType<typeof createAdminClient>,
  count: number,
) {
  const codes: string[] = [];
  const normalized = new Set<string>();
  let attempts = 0;

  while (codes.length < count && attempts < count * 40) {
    attempts += 1;
    const code = generateVoucherCode();
    const norm = normalizeVoucherCode(code);
    if (!norm || normalized.has(norm)) continue;

    const { data } = await admin
      .from("sold_vouchers")
      .select("id")
      .eq("code_normalized", norm)
      .maybeSingle();

    if (data) continue;
    normalized.add(norm);
    codes.push(code);
  }

  if (codes.length < count) {
    throw new Error("Nepodařilo se vygenerovat unikátní kódy poukazů.");
  }

  return codes;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function toDateOnly(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Po Comgate PAID: vygeneruje kódy a uloží sold_vouchers.
 * Idempotentní — při opakovaném pushi nic neduplikuje.
 */
export async function fulfillPaidOrder(orderId: string) {
  const admin = createAdminClient();

  const { data: order, error: orderError } = await admin
    .from("voucher_orders")
    .select(
      "id, order_number, shop_id, status, item_kind, item, quantity, unit_price_czk, shipping_fee_czk, buyer, delivery, paid_at",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    throw new Error(orderError?.message || "Objednávka nenalezena.");
  }

  if (order.status !== "paid") {
    return { created: 0, skipped: true as const, reason: "not_paid" as const };
  }

  const { count, error: countError } = await admin
    .from("sold_vouchers")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId);

  if (countError) {
    throw new Error(countError.message);
  }

  if ((count ?? 0) > 0) {
    return { created: 0, skipped: true as const, reason: "already_fulfilled" as const };
  }

  const typed = order as unknown as OrderRow;
  const deliveryMethod = asString(typed.delivery.method, "email");
  const status = initialStatus(deliveryMethod);
  const purchasedAt = typed.paid_at ? new Date(typed.paid_at) : new Date();
  const validityMonths = await loadValidityMonths(admin, typed.shop_id);
  const validUntil = toDateOnly(addMonths(purchasedAt, validityMonths));
  const codes = await generateUniqueCodes(admin, typed.quantity);
  const productName = productNameFromOrder(typed);
  const shippingAddress = shippingAddressFromDelivery(typed.delivery);
  const shippingShare = Math.floor(typed.shipping_fee_czk / typed.quantity);

  const rows = codes.map((code) => ({
    order_id: typed.id,
    shop_id: typed.shop_id,
    code,
    code_normalized: normalizeVoucherCode(code),
    product_name: productName,
    item_kind: typed.item_kind,
    unit_price_czk: typed.unit_price_czk,
    shipping_fee_share_czk: shippingShare,
    status,
    purchased_at: purchasedAt.toISOString(),
    valid_until: validUntil,
    buyer_name: asString(typed.buyer.name),
    buyer_email: asString(typed.buyer.email),
    buyer_phone: asString(typed.buyer.phone),
    recipient_name: asString(typed.buyer.recipientName, asString(typed.buyer.name)),
    delivery_method: deliveryMethod,
    delivery_email: asString(typed.delivery.email) || null,
    shipping_address: shippingAddress,
    message: asString(typed.buyer.message) || null,
    vat_label:
      typed.item_kind === "amount" ? "Cenina bez DPH" : null,
    tax_regime: "vouchy" as const,
  }));

  const { error: insertError } = await admin.from("sold_vouchers").insert(rows);
  if (insertError) {
    throw new Error(insertError.message);
  }

  return { created: rows.length, skipped: false as const, codes };
}
