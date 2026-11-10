import {
  formatExperienceVatLabel,
  generateVoucherCode,
  normalizeVoucherCode,
  type ShopId,
} from "@/data/admin-voucher-settings";
import type { VoucherPdfPlacement } from "@/data/vouchers";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeVoucherSettings } from "@/lib/voucher-settings";
import { sendOpsFulfillmentEmail } from "@/lib/email/send-ops-fulfillment-email";
import {
  resolveVoucherEmailRecipient,
  sameEmail,
  sendVoucherEmail,
  type VoucherEmailAttachment,
} from "@/lib/email/send-voucher-email";
import {
  issueInvoiceForPaidOrder,
  type OrderInvoicePayload,
} from "@/lib/invoicing/issue-invoice-for-order";
import {
  generateA4VoucherPdf,
  shopUsesHardcodedA4Pdf,
} from "@/lib/voucher-a4-pdf";
import {
  fetchPdfTemplateBytes,
  stampVoucherPdf,
} from "@/lib/voucher-pdf-overlay";
import { redeemablePartsForExperienceId } from "@/lib/voucher-redemption";

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
  total_czk: number;
  buyer: Record<string, unknown>;
  delivery: Record<string, unknown>;
  invoice: OrderInvoicePayload | null;
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

async function loadShopSettings(
  admin: ReturnType<typeof createAdminClient>,
  shopId: ShopId,
) {
  const { data } = await admin
    .from("voucher_settings")
    .select("validity_months, amount_slots, amount_previews, experiences")
    .eq("shop_id", shopId)
    .maybeSingle();

  return normalizeVoucherSettings(
    {
      validityMonths:
        typeof data?.validity_months === "number"
          ? data.validity_months
          : undefined,
      amountSlots: Array.isArray(data?.amount_slots)
        ? (data.amount_slots as (number | null)[])
        : undefined,
      amountPreviews:
        data?.amount_previews && typeof data.amount_previews === "object"
          ? (data.amount_previews as Record<string, unknown>)
          : undefined,
      experiences: Array.isArray(data?.experiences)
        ? data.experiences
        : undefined,
    } as Parameters<typeof normalizeVoucherSettings>[0],
    shopId,
  );
}

function resolvePdfPlacement(
  settings: ReturnType<typeof normalizeVoucherSettings>,
  order: OrderRow,
): VoucherPdfPlacement | null {
  if (order.item_kind === "experience") {
    const experienceId = asString(order.item.id).trim();
    const experience = settings.experiences.find(
      (item) => item.id === experienceId,
    );
    if (!experience?.pdfTemplate?.url) return null;
    return {
      pdfTemplate: experience.pdfTemplate,
      codePosition: experience.codePosition,
      qrPosition: experience.qrPosition,
    };
  }

  const amount =
    typeof order.item.amount === "number"
      ? order.item.amount
      : order.unit_price_czk;
  const slotIndex = settings.amountSlots.findIndex((slot) => slot === amount);
  if (slotIndex >= 0) {
    return settings.amountPreviews.slotPdfs[slotIndex] ?? null;
  }
  return settings.amountPreviews.customPdf ?? null;
}

async function generateUniqueCodes(
  admin: ReturnType<typeof createAdminClient>,
  count: number,
  shopId: ShopId,
) {
  const codes: string[] = [];
  const normalized = new Set<string>();
  let attempts = 0;

  while (codes.length < count && attempts < count * 40) {
    attempts += 1;
    const code = generateVoucherCode(shopId);
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

function createIssuedPdfPath(shopId: ShopId, code: string) {
  const safe = normalizeVoucherCode(code) || code;
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `issued/${shopId}/${safe}-${id}.pdf`;
}

async function uploadIssuedPdf(params: {
  admin: ReturnType<typeof createAdminClient>;
  shopId: ShopId;
  code: string;
  bytes: Uint8Array;
}): Promise<{ url: string; bytes: Uint8Array }> {
  const path = createIssuedPdfPath(params.shopId, params.code);
  const { error: uploadError } = await params.admin.storage
    .from("voucher-pdfs")
    .upload(path, Buffer.from(params.bytes), {
      contentType: "application/pdf",
      upsert: false,
      cacheControl: "3600",
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const {
    data: { publicUrl },
  } = params.admin.storage.from("voucher-pdfs").getPublicUrl(path);

  return { url: publicUrl, bytes: params.bytes };
}

async function stampAndUploadPdf(params: {
  admin: ReturnType<typeof createAdminClient>;
  shopId: ShopId;
  code: string;
  placement: VoucherPdfPlacement;
  templateBytes: Uint8Array;
}): Promise<{ url: string; bytes: Uint8Array } | null> {
  if (!params.placement.codePosition && !params.placement.qrPosition) {
    return null;
  }

  const stamped = await stampVoucherPdf({
    templateBytes: params.templateBytes,
    code: params.code,
    codePosition: params.placement.codePosition,
    qrPosition: params.placement.qrPosition,
  });

  return uploadIssuedPdf({
    admin: params.admin,
    shopId: params.shopId,
    code: params.code,
    bytes: stamped,
  });
}

/**
 * Po Comgate PAID: vygeneruje kódy, uloží sold_vouchers a natiskne PDF.
 * Idempotentní - při opakovaném pushi nic neduplikuje.
 */
export async function fulfillPaidOrder(orderId: string) {
  const admin = createAdminClient();

  const { data: order, error: orderError } = await admin
    .from("voucher_orders")
    .select(
      "id, order_number, shop_id, status, item_kind, item, quantity, unit_price_czk, shipping_fee_czk, total_czk, buyer, delivery, invoice, paid_at",
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
    const typedExisting = order as unknown as OrderRow;
    let invoiceNumber: string | null = null;
    if (typedExisting.invoice && typeof typedExisting.invoice === "object") {
      try {
        const issued = await issueInvoiceForPaidOrder({
          orderId: typedExisting.id,
          orderNumber: typedExisting.order_number,
          shopId: typedExisting.shop_id,
          totalCzk: typedExisting.total_czk,
          shippingFeeCzk: typedExisting.shipping_fee_czk,
          quantity: typedExisting.quantity,
          productName: productNameFromOrder(typedExisting),
          buyerName: asString(typedExisting.buyer.name),
          invoice: typedExisting.invoice,
          paidAt: typedExisting.paid_at,
        });
        invoiceNumber = issued.invoiceNumber;
      } catch (error) {
        console.error("fulfillPaidOrder: invoice (retry) failed", error);
      }
    }
    return {
      created: 0,
      skipped: true as const,
      reason: "already_fulfilled" as const,
      invoiceNumber,
    };
  }

  const typed = order as unknown as OrderRow;
  const deliveryMethod = asString(typed.delivery.method, "email");
  const status = initialStatus(deliveryMethod);
  const purchasedAt = typed.paid_at ? new Date(typed.paid_at) : new Date();
  const settings = await loadShopSettings(admin, typed.shop_id);
  const validUntil = toDateOnly(addMonths(purchasedAt, settings.validityMonths));
  const codes = await generateUniqueCodes(admin, typed.quantity, typed.shop_id);
  const productName = productNameFromOrder(typed);
  const shippingAddress = shippingAddressFromDelivery(typed.delivery);
  const shippingShare = Math.floor(typed.shipping_fee_czk / typed.quantity);
  const placement = resolvePdfPlacement(settings, typed);
  const useA4 = shopUsesHardcodedA4Pdf(typed.shop_id);

  let templateBytes: Uint8Array | null = null;
  if (!useA4 && placement?.pdfTemplate?.url) {
    try {
      templateBytes = await fetchPdfTemplateBytes(placement.pdfTemplate.url);
    } catch (error) {
      console.error("fulfillPaidOrder: template download failed", error);
    }
  }

  const buyerName = asString(typed.buyer.name);
  const buyerEmail = asString(typed.buyer.email);
  const recipientName = asString(
    typed.buyer.recipientName,
    buyerName,
  );
  const deliveryEmail = asString(typed.delivery.email) || null;
  const message = asString(typed.buyer.message) || null;

  const experienceId =
    typed.item_kind === "experience" ? asString(typed.item.id).trim() : "";
  const isGift = asString(typed.buyer.recipient) === "other";
  const redeemableParts =
    typed.item_kind === "experience"
      ? redeemablePartsForExperienceId(experienceId)
      : null;

  const pdfUrls = new Map<string, string>();
  const pdfBytes = new Map<string, Uint8Array>();
  for (const code of codes) {
    try {
      if (useA4) {
        const bytes = await generateA4VoucherPdf({
          shopId: typed.shop_id,
          code,
          kind: typed.item_kind === "experience" ? "experience" : "amount",
          serviceTitle:
            typed.item_kind === "experience"
              ? productName
              : `${Math.round(typed.unit_price_czk).toLocaleString("cs-CZ")} Kč`,
          amountCzk: typed.unit_price_czk,
          recipientName,
          fromName: isGift ? buyerName : null,
          issuedAt: purchasedAt,
          validUntil,
          message,
        });
        const uploaded = await uploadIssuedPdf({
          admin,
          shopId: typed.shop_id,
          code,
          bytes,
        });
        pdfUrls.set(code, uploaded.url);
        pdfBytes.set(code, uploaded.bytes);
      } else if (templateBytes && placement) {
        const stamped = await stampAndUploadPdf({
          admin,
          shopId: typed.shop_id,
          code,
          placement,
          templateBytes,
        });
        if (stamped) {
          pdfUrls.set(code, stamped.url);
          pdfBytes.set(code, stamped.bytes);
        }
      }
    } catch (error) {
      console.error("fulfillPaidOrder: PDF failed", code, error);
    }
  }

  const rows = codes.map((code) => {
    let vatLabel: string | null =
      typed.item_kind === "amount" ? "Cenina bez DPH" : null;
    if (typed.item_kind === "experience") {
      const experience = settings.experiences.find(
        (item) => item.id === experienceId,
      );
      if (experience) {
        vatLabel = formatExperienceVatLabel(experience.vat, experience.price);
      }
    }

    return {
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
    buyer_name: buyerName,
    buyer_email: buyerEmail,
    buyer_phone: asString(typed.buyer.phone),
    recipient_name: recipientName,
    delivery_method: deliveryMethod,
    delivery_email: deliveryEmail,
    shipping_address: shippingAddress,
    message,
    vat_label: vatLabel,
    tax_regime: "vouchy" as const,
    pdf_url: pdfUrls.get(code) ?? null,
    remaining_czk:
      typed.item_kind === "amount" ? typed.unit_price_czk : null,
    redeemable_parts: redeemableParts,
    is_gift: isGift,
  };
  });

  const { error: insertError } = await admin.from("sold_vouchers").insert(rows);
  if (insertError) {
    throw new Error(insertError.message);
  }

  let invoiceAttachment: VoucherEmailAttachment | null = null;
  let invoiceNumber: string | null = null;
  if (typed.invoice && typeof typed.invoice === "object") {
    try {
      const issued = await issueInvoiceForPaidOrder({
        orderId: typed.id,
        orderNumber: typed.order_number,
        shopId: typed.shop_id,
        totalCzk: typed.total_czk,
        shippingFeeCzk: typed.shipping_fee_czk,
        quantity: typed.quantity,
        productName,
        buyerName,
        invoice: typed.invoice,
        paidAt: typed.paid_at,
      });
      invoiceNumber = issued.invoiceNumber;
      if (issued.pdfBytes) {
        invoiceAttachment = {
          filename: `faktura-${issued.invoiceNumber}.pdf`,
          content: issued.pdfBytes,
        };
      } else if (issued.pdfUrl) {
        try {
          const response = await fetch(issued.pdfUrl);
          if (response.ok) {
            invoiceAttachment = {
              filename: `faktura-${issued.invoiceNumber}.pdf`,
              content: Buffer.from(await response.arrayBuffer()),
            };
          }
        } catch (error) {
          console.error("fulfillPaidOrder: invoice re-fetch failed", error);
        }
      }
    } catch (error) {
      console.error("fulfillPaidOrder: invoice failed", error);
    }
  }

  const voucherTo = resolveVoucherEmailRecipient({
    deliveryMethod,
    deliveryEmail,
    buyerEmail,
  });
  const invoiceEmailRaw = asString(typed.invoice?.email).trim();
  // U dárku faktura defaultně na kupujícího (ne na obdarovaného).
  const invoiceTo = invoiceAttachment
    ? invoiceEmailRaw || (isGift ? buyerEmail : voucherTo || buyerEmail)
    : "";

  let emailsSent = 0;
  let invoiceDelivered = false;

  const validUntilLabel = (() => {
    const [y, m, d] = validUntil.split("-").map(Number);
    if (!y || !m || !d) return validUntil;
    return `${d}. ${m}. ${y}`;
  })();

  const voucherAttachments: VoucherEmailAttachment[] = [];
  for (const code of codes) {
    const bytes = pdfBytes.get(code);
    if (bytes) {
      voucherAttachments.push({
        filename: `poukaz-${code}.pdf`,
        content: Buffer.from(bytes),
      });
    }
  }

  const baseMail = {
    shopId: typed.shop_id,
    buyerName,
    recipientName,
    productName,
    code: codes[0] ?? "",
    codes,
    validUntil: validUntilLabel,
    orderNumber: typed.order_number,
    deliveryMethod,
  } as const;

  // 1) Poukaz(y) obdarovanému / zákazníkovi — fakturu u dárku nikdy nepřikládat.
  if (voucherTo) {
    const attachInvoiceHere = Boolean(
      invoiceAttachment &&
        invoiceTo &&
        !isGift &&
        sameEmail(invoiceTo, voucherTo),
    );
    const attachments = [
      ...voucherAttachments,
      ...(attachInvoiceHere && invoiceAttachment ? [invoiceAttachment] : []),
    ];
    try {
      const result = await sendVoucherEmail({
        ...baseMail,
        to: voucherTo,
        purpose: "voucher",
        message,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      if (result.ok) {
        emailsSent += 1;
        if (attachInvoiceHere) invoiceDelivered = true;
      }
    } catch (error) {
      console.error("fulfillPaidOrder: voucher email failed", error);
    }
  }

  // 2) U dárku potvrzení kupujícímu (+ faktura, pokud má jít na něj).
  if (
    isGift &&
    buyerEmail &&
    (!voucherTo || !sameEmail(buyerEmail, voucherTo))
  ) {
    const attachInvoiceToBuyer = Boolean(
      invoiceAttachment &&
        invoiceTo &&
        sameEmail(invoiceTo, buyerEmail) &&
        !invoiceDelivered,
    );
    try {
      const result = await sendVoucherEmail({
        ...baseMail,
        to: buyerEmail,
        purpose: "buyer_gift_confirmation",
        giftDeliveryEmail: voucherTo,
        message: null,
        attachments:
          attachInvoiceToBuyer && invoiceAttachment
            ? [invoiceAttachment]
            : undefined,
      });
      if (result.ok) {
        emailsSent += 1;
        if (attachInvoiceToBuyer) invoiceDelivered = true;
      }
    } catch (error) {
      console.error("fulfillPaidOrder: buyer confirmation failed", error);
    }
  }

  // 3) Faktura na samostatný e-mail (firma / účetní), pokud ještě neodešla.
  if (invoiceAttachment && invoiceTo && !invoiceDelivered) {
    try {
      const result = await sendVoucherEmail({
        ...baseMail,
        to: invoiceTo,
        purpose: "invoice_only",
        message: null,
        attachments: [invoiceAttachment],
      });
      if (result.ok) emailsSent += 1;
    } catch (error) {
      console.error("fulfillPaidOrder: invoice email failed", error);
    }
  }

  let opsEmailSent = false;
  if (deliveryMethod === "post" || deliveryMethod === "pickup") {
    try {
      const opsResult = await sendOpsFulfillmentEmail({
        shopId: typed.shop_id,
        deliveryMethod,
        productName,
        quantity: typed.quantity,
        codes,
        buyerName,
        buyerEmail,
        buyerPhone: asString(typed.buyer.phone),
        recipientName,
        recipientEmail: isGift ? deliveryEmail : null,
        shippingAddress,
        message,
        unitPriceCzk: typed.unit_price_czk,
        shippingFeeCzk: typed.shipping_fee_czk,
      });
      opsEmailSent = Boolean(opsResult.ok);
    } catch (error) {
      console.error("fulfillPaidOrder: ops email failed", error);
    }
  }

  return {
    created: rows.length,
    skipped: false as const,
    codes,
    pdfs: pdfUrls.size,
    emailsSent,
    opsEmailSent,
    invoiceNumber,
  };
}
