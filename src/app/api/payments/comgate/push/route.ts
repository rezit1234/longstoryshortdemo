import {
  findShopIdByMerchant,
  getComgateCredentials,
  getComgatePaymentStatus,
} from "@/lib/comgate";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function readPushPayload(request: Request): Promise<Record<string, string>> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const json = (await request.json()) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(json)) {
      if (value == null) continue;
      out[key] = String(value);
    }
    return out;
  }

  const raw = await request.text();
  const params = new URLSearchParams(raw);
  const out: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    out[key] = value;
  }
  return out;
}

function mapComgateStatusToOrder(
  status: string | undefined,
): "paid" | "cancelled" | "pending" | null {
  if (status === "PAID") return "paid";
  if (status === "CANCELLED") return "cancelled";
  if (status === "PENDING" || status === "AUTHORIZED") return "pending";
  return null;
}

export async function POST(request: Request) {
  let payload: Record<string, string>;
  try {
    payload = await readPushPayload(request);
  } catch {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const transId = payload.transId?.trim();
  const merchant = payload.merchant?.trim();
  const secret = payload.secret?.trim();

  if (!transId || !merchant) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const shopId =
    findShopIdByMerchant(merchant) ??
    // fallback: resolve from DB order later
    null;

  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("comgate push admin", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }

  const { data: order } = await admin
    .from("voucher_orders")
    .select("id, shop_id, status, order_number, total_czk")
    .eq("comgate_trans_id", transId)
    .maybeSingle();

  const resolvedShopId = shopId ?? (order?.shop_id as typeof shopId);

  if (!resolvedShopId) {
    console.error("comgate push unknown merchant/order", { merchant, transId });
    return new NextResponse("OK", { status: 200 });
  }

  try {
    const credentials = getComgateCredentials(resolvedShopId);
    if (secret && secret !== credentials.secret) {
      console.error("comgate push secret mismatch", { merchant, transId });
      return new NextResponse("Forbidden", { status: 403 });
    }
  } catch (error) {
    console.error("comgate push credentials", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }

  let verified;
  try {
    verified = await getComgatePaymentStatus(resolvedShopId, transId);
  } catch (error) {
    console.error("comgate push status", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }

  if (verified.code !== 0) {
    console.error("comgate push status code", verified);
    return new NextResponse("Internal Server Error", { status: 500 });
  }

  const nextStatus = mapComgateStatusToOrder(verified.status);
  if (!nextStatus || nextStatus === "pending") {
    if (order) {
      await admin
        .from("voucher_orders")
        .update({
          comgate_status: verified.status ?? payload.status,
          comgate_method: verified.method ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);
    }
    return new NextResponse("OK", { status: 200 });
  }

  if (!order) {
    console.error("comgate push order missing", { transId, refId: verified.refId });
    return new NextResponse("OK", { status: 200 });
  }

  // Idempotent: don't downgrade paid.
  if (order.status === "paid" && nextStatus === "cancelled") {
    return new NextResponse("OK", { status: 200 });
  }
  if (order.status === nextStatus) {
    return new NextResponse("OK", { status: 200 });
  }

  const patch: Record<string, unknown> = {
    status: nextStatus,
    comgate_status: verified.status,
    comgate_method: verified.method ?? null,
    updated_at: new Date().toISOString(),
  };
  if (nextStatus === "paid") {
    patch.paid_at = new Date().toISOString();
  }

  const { error } = await admin
    .from("voucher_orders")
    .update(patch)
    .eq("id", order.id);

  if (error) {
    console.error("comgate push update", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }

  if (nextStatus === "paid") {
    try {
      const { fulfillPaidOrder } = await import("@/lib/fulfill-order");
      const result = await fulfillPaidOrder(order.id);
      console.info("comgate fulfill", order.order_number, result);
    } catch (fulfillError) {
      console.error("comgate fulfill failed", fulfillError);
      // Push musí vrátit 200 i při dočasném fail fulfillmentu —
      // jinak Comgate spamuje. Fulfill lze dorazit ručně / retry.
    }
  }

  return new NextResponse("OK", { status: 200 });
}
