import type { ShopId } from "@/data/admin-voucher-settings";
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

const DEFAULT_FEES: DeliveryFees = {
  pickupFee: 20,
  postShippingFee: 105,
  postShippingFeeSk: 145,
};

async function loadDeliveryFees(shopId: string): Promise<DeliveryFees> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("voucher_settings")
      .select("pickup_fee, post_shipping_fee, post_shipping_fee_sk")
      .eq("shop_id", shopId)
      .maybeSingle();

    if (!data) return DEFAULT_FEES;

    return {
      pickupFee:
        typeof data.pickup_fee === "number"
          ? data.pickup_fee
          : DEFAULT_FEES.pickupFee,
      postShippingFee:
        typeof data.post_shipping_fee === "number"
          ? data.post_shipping_fee
          : DEFAULT_FEES.postShippingFee,
      postShippingFeeSk:
        typeof data.post_shipping_fee_sk === "number"
          ? data.post_shipping_fee_sk
          : DEFAULT_FEES.postShippingFeeSk,
    };
  } catch {
    return DEFAULT_FEES;
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

  const fees = await loadDeliveryFees(body.shopId);
  const unitPrice = unitPriceFromItem(body.item);
  const quantity = body.form.quantity;
  const shippingFee = shippingFeeFor(body.form, fees);
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
            ? "Chybí tabulka voucher_orders — spusť migraci 010."
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
