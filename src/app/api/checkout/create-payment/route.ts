import {
  DEFAULT_DELIVERY_METHODS,
  DEFAULT_PICKUP_FEE,
  DEFAULT_POST_SHIPPING_FEE,
  DEFAULT_POST_SHIPPING_FEE_SK,
  normalizeDeliveryMethods,
  type DeliveryMethodsSettings,
} from "@/data/admin-voucher-settings";
import {
  createComgatePayment,
  getComgatePaymentStatus,
  isComgateTestMode,
} from "@/lib/comgate";
import {
  generateOrderNumber,
  getAppBaseUrl,
  itemLabel,
  unitPriceFromItem,
  validateCheckoutPayload,
  type CreatePaymentRequestBody,
  type CheckoutFormPayload,
  type CheckoutCartItem,
} from "@/lib/checkout";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type DeliveryFees = {
  pickupFee: number;
  postShippingFee: number;
  postShippingFeeSk: number;
};

type ShopDeliveryConfig = DeliveryFees & {
  deliveryMethods: DeliveryMethodsSettings;
};

const DEFAULT_FEES: DeliveryFees = {
  pickupFee: DEFAULT_PICKUP_FEE,
  postShippingFee: DEFAULT_POST_SHIPPING_FEE,
  postShippingFeeSk: DEFAULT_POST_SHIPPING_FEE_SK,
};

const DEFAULT_DELIVERY_CONFIG: ShopDeliveryConfig = {
  ...DEFAULT_FEES,
  deliveryMethods: { ...DEFAULT_DELIVERY_METHODS },
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function deliveryMethodsFromRecord(
  value: unknown,
): DeliveryMethodsSettings | undefined {
  const record = asRecord(value);
  if (!record.deliveryMethods || typeof record.deliveryMethods !== "object") {
    return undefined;
  }
  return normalizeDeliveryMethods(record.deliveryMethods);
}

function configFromRow(
  data: {
    pickup_fee?: number | null;
    post_shipping_fee?: number | null;
    post_shipping_fee_sk?: number | null;
    amount_previews?: unknown;
  },
  shopId: string,
): ShopDeliveryConfig {
  const previews = asRecord(data.amount_previews);
  const bag = asRecord(previews.__shops);
  const embeddedShop = asRecord(bag[shopId]);
  const methodsSource =
    deliveryMethodsFromRecord(previews) ??
    deliveryMethodsFromRecord(embeddedShop);

  const pickupFee =
    typeof data.pickup_fee === "number"
      ? data.pickup_fee
      : typeof embeddedShop.pickupFee === "number"
        ? embeddedShop.pickupFee
        : typeof previews.pickupFee === "number"
          ? previews.pickupFee
          : DEFAULT_FEES.pickupFee;
  const postShippingFee =
    typeof data.post_shipping_fee === "number"
      ? data.post_shipping_fee
      : typeof embeddedShop.postShippingFee === "number"
        ? embeddedShop.postShippingFee
        : typeof previews.postShippingFee === "number"
          ? previews.postShippingFee
          : DEFAULT_FEES.postShippingFee;
  const postShippingFeeSk =
    typeof data.post_shipping_fee_sk === "number"
      ? data.post_shipping_fee_sk
      : typeof embeddedShop.postShippingFeeSk === "number"
        ? embeddedShop.postShippingFeeSk
        : typeof previews.postShippingFeeSk === "number"
          ? previews.postShippingFeeSk
          : DEFAULT_FEES.postShippingFeeSk;

  return {
    pickupFee,
    postShippingFee,
    postShippingFeeSk,
    deliveryMethods: methodsSource ?? { ...DEFAULT_DELIVERY_METHODS },
  };
}

async function loadShopDeliveryConfig(
  shopId: string,
): Promise<ShopDeliveryConfig> {
  try {
    const admin = createAdminClient();
    const native = await admin
      .from("voucher_settings")
      .select(
        "pickup_fee, post_shipping_fee, post_shipping_fee_sk, amount_previews",
      )
      .eq("shop_id", shopId)
      .maybeSingle();

    if (!native.error && native.data) {
      return configFromRow(native.data, shopId);
    }

    const legacy = await admin
      .from("voucher_settings")
      .select(
        "pickup_fee, post_shipping_fee, post_shipping_fee_sk, amount_previews",
      )
      .eq("id", 1)
      .maybeSingle();

    if (!legacy.error && legacy.data) {
      return configFromRow(legacy.data, shopId);
    }

    return DEFAULT_DELIVERY_CONFIG;
  } catch {
    return DEFAULT_DELIVERY_CONFIG;
  }
}

function shippingFeeFor(
  form: CheckoutFormPayload,
  fees: DeliveryFees,
) {
  if (form.delivery === "email") return 0;
  if (form.delivery === "pickup") return fees.pickupFee;
  return form.country === "SK" ? fees.postShippingFeeSk : fees.postShippingFee;
}

function comgateDelivery(form: CheckoutFormPayload) {
  if (form.delivery === "email") return "ELECTRONIC_DELIVERY" as const;
  if (form.delivery === "pickup") return "PICKUP" as const;
  return "HOME_DELIVERY" as const;
}

function buyerPayload(form: CheckoutFormPayload) {
  return {
    name: form.buyerName.trim(),
    email: form.buyerEmail.trim(),
    phone: form.phone.trim(),
    recipient: form.recipient,
    recipientName:
      form.recipient === "self"
        ? form.buyerName.trim()
        : form.recipientName.trim(),
    message: form.message.trim(),
  };
}

function deliveryPayload(form: CheckoutFormPayload) {
  return {
    method: form.delivery,
    email: form.deliveryEmail.trim(),
    shippingName: form.shippingName.trim(),
    addressLine1: form.addressLine1.trim(),
    city: form.city.trim(),
    postalCode: form.postalCode.trim(),
    country: form.country.trim() || "CZ",
  };
}

function invoicePayload(form: CheckoutFormPayload) {
  if (!form.wantInvoice) return null;
  return {
    recipientType: form.invoiceRecipientType,
    companyId: form.companyId.trim(),
    vatId: form.vatId.trim(),
    email: form.invoiceEmail.trim(),
    firstName: form.invoiceFirstName.trim(),
    lastName: form.invoiceLastName.trim(),
    addressLine1: form.invoiceAddressLine1.trim(),
    city: form.invoiceCity.trim(),
    postalCode: form.invoicePostalCode.trim(),
    note: form.invoiceNote.trim(),
  };
}

function itemPayload(item: CheckoutCartItem) {
  if (item.kind === "amount") {
    return { kind: "amount", amount: item.amount };
  }
  return {
    kind: "experience",
    id: item.id,
    title: item.title,
    subtitle: item.subtitle ?? "",
    price: item.price,
  };
}

export async function POST(request: Request) {
  let body: CreatePaymentRequestBody;
  try {
    body = (await request.json()) as CreatePaymentRequestBody;
  } catch {
    return NextResponse.json({ error: "Neplatný JSON." }, { status: 400 });
  }

  const validationError = validateCheckoutPayload(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const deliveryConfig = await loadShopDeliveryConfig(body.shopId);
  if (!deliveryConfig.deliveryMethods[body.form.delivery]) {
    return NextResponse.json(
      { error: "Tento způsob doručení není u obchodu dostupný." },
      { status: 400 },
    );
  }

  const unitPrice = unitPriceFromItem(body.item);
  const quantity = body.form.quantity;
  const shippingFee = shippingFeeFor(body.form, deliveryConfig);
  const itemsTotal = unitPrice * quantity;
  const total = itemsTotal + shippingFee;
  const orderNumber = generateOrderNumber(body.shopId);
  const baseUrl = getAppBaseUrl(request.url);
  const label = itemLabel(body.item);

  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("checkout create-payment admin", error);
    return NextResponse.json(
      { error: "Server není připravený na platby (Supabase)." },
      { status: 500 },
    );
  }

  const { data: order, error: insertError } = await admin
    .from("voucher_orders")
    .insert({
      order_number: orderNumber,
      shop_id: body.shopId,
      status: "pending",
      item_kind: body.item.kind,
      item: itemPayload(body.item),
      quantity,
      unit_price_czk: unitPrice,
      shipping_fee_czk: shippingFee,
      items_total_czk: itemsTotal,
      total_czk: total,
      currency: "CZK",
      buyer: buyerPayload(body.form),
      delivery: deliveryPayload(body.form),
      invoice: invoicePayload(body.form),
      comgate_test: isComgateTestMode(),
    })
    .select("id, order_number")
    .single();

  if (insertError || !order) {
    console.error("checkout insert order", insertError);
    return NextResponse.json(
      {
        error:
          insertError?.message?.includes("voucher_orders")
            ? "Chybí tabulka voucher_orders - spusť migraci 010."
            : "Objednávku se nepodařilo uložit.",
      },
      { status: 500 },
    );
  }

  let payment;
  try {
    payment = await createComgatePayment({
      shopId: body.shopId,
      priceCzk: total,
      label,
      refId: order.order_number,
      email: body.form.buyerEmail.trim(),
      fullName: body.form.buyerName.trim(),
      phone: body.form.phone.trim(),
      name: label,
      delivery: comgateDelivery(body.form),
      urlPaid: `${baseUrl}/platba/vysledek?status=paid&refId=${encodeURIComponent(order.order_number)}`,
      urlCancelled: `${baseUrl}/platba/vysledek?status=cancelled&refId=${encodeURIComponent(order.order_number)}`,
      urlPending: `${baseUrl}/platba/vysledek?status=pending&refId=${encodeURIComponent(order.order_number)}`,
    });
  } catch (error) {
    console.error("checkout comgate create", error);
    await admin
      .from("voucher_orders")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", order.id);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Comgate credentials chybí nebo jsou neplatné.",
      },
      { status: 500 },
    );
  }

  if (payment.code !== 0 || !payment.redirect || !payment.transId) {
    console.error("checkout comgate response", payment);
    await admin
      .from("voucher_orders")
      .update({
        status: "failed",
        comgate_status: payment.message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);
    return NextResponse.json(
      {
        error: `Comgate: ${payment.message || "platbu se nepodařilo založit."}`,
      },
      { status: 502 },
    );
  }

  await admin
    .from("voucher_orders")
    .update({
      comgate_trans_id: payment.transId,
      comgate_status: "PENDING",
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  // Ověření, že platba existuje (volitelné sanity check).
  try {
    await getComgatePaymentStatus(body.shopId, payment.transId);
  } catch {
    // ignore
  }

  return NextResponse.json({
    orderNumber: order.order_number,
    redirectUrl: payment.redirect,
    transId: payment.transId,
  });
}
