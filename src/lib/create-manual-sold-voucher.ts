import {
  applyShopCodePrefix,
  generateVoucherCode,
  isValidNewVoucherCode,
  normalizeVoucherCode,
  formatExperienceVatLabel,
  type ShopId,
} from "@/data/admin-voucher-settings";
import type { VoucherPdfPlacement } from "@/data/vouchers";
import {
  resolveVoucherEmailRecipient,
  sendVoucherEmail,
} from "@/lib/email/send-voucher-email";
import {
  issueInvoicePdf,
  type OrderInvoicePayload,
} from "@/lib/invoicing/issue-invoice-for-order";
import { mapSoldVoucherRow, type SoldVoucherRow } from "@/lib/sold-vouchers";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeVoucherSettings } from "@/lib/voucher-settings";
import {
  generateA4VoucherPdf,
  shopUsesHardcodedA4Pdf,
} from "@/lib/voucher-a4-pdf";
import {
  fetchPdfTemplateBytes,
  stampVoucherPdf,
} from "@/lib/voucher-pdf-overlay";
import {
  experienceSupportsSeatQuantity,
  formatPersonsCs,
  MANUAL_VOUCHER_QUANTITY_MAX,
  MANUAL_VOUCHER_QUANTITY_MIN,
  redeemablePartsForExperienceId,
  SEAT_QUANTITY_MAX,
  SEAT_QUANTITY_MIN,
} from "@/lib/voucher-redemption";
import {
  formatPaymentMethodLabel,
  normalizeManualPaymentMethodInput,
  type ManualPaymentMethod,
} from "@/lib/voucher-payment-method";

export type ManualVoucherKind = "amount" | "experience";

export type ManualInvoiceInput = OrderInvoicePayload & {
  wantInvoice: boolean;
};

export type CreateManualSoldVoucherInput = {
  shopId: ShopId;
  kind: ManualVoucherKind;
  experienceId?: string;
  /** Počet osob (jen Chef's Table varianty) — 1 poukaz × N osob. */
  seats?: number;
  /** Počet kusů částkového poukazu (každý kus = vlastní kód + PDF). */
  quantity?: number;
  amountCzk?: number;
  buyerName: string;
  /** Volitelný — bez e-mailu se nic neodesílá. */
  buyerEmail?: string;
  buyerPhone?: string;
  code?: string;
  sendEmail?: boolean;
  /** admin_profiles.id — kdo poukaz ručně vystavil */
  issuedBy?: string | null;
  paymentMethod?: ManualPaymentMethod | string;
  paymentMethodNote?: string | null;
  invoice?: ManualInvoiceInput | null;
};

function asTrimmed(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

const INVALID_CODE_MESSAGE =
  "Kód musí mít celkem 7 znaků včetně prefixu (např. LSSK7M2 nebo BCR6FE6).";

function validateManualInvoice(invoice: ManualInvoiceInput | null | undefined) {
  if (!invoice?.wantInvoice) return null;

  if (
    invoice.recipientType !== "person" &&
    invoice.recipientType !== "company"
  ) {
    throw new Error("Zvolte typ daňového dokladu.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(asTrimmed(invoice.email))) {
    throw new Error("Zadejte platný e-mail pro daňový doklad.");
  }
  if (invoice.recipientType === "company") {
    const ico = asTrimmed(invoice.companyId).replace(/\D/g, "");
    if (ico.length !== 8) throw new Error("Vyplňte platné 8místné IČO.");
  }
  if (invoice.recipientType === "person") {
    if (
      !asTrimmed(invoice.firstName) ||
      !asTrimmed(invoice.lastName) ||
      !asTrimmed(invoice.addressLine1) ||
      !asTrimmed(invoice.city) ||
      !asTrimmed(invoice.postalCode)
    ) {
      throw new Error("Vyplňte údaje daňového dokladu na jméno.");
    }
  }

  return {
    recipientType: invoice.recipientType,
    companyId: asTrimmed(invoice.companyId) || undefined,
    companyName: asTrimmed(invoice.companyName) || undefined,
    vatId: asTrimmed(invoice.vatId) || undefined,
    email: asTrimmed(invoice.email),
    firstName: asTrimmed(invoice.firstName) || undefined,
    lastName: asTrimmed(invoice.lastName) || undefined,
    addressLine1: asTrimmed(invoice.addressLine1) || undefined,
    city: asTrimmed(invoice.city) || undefined,
    postalCode: asTrimmed(invoice.postalCode) || undefined,
    note: asTrimmed(invoice.note) || undefined,
  } satisfies OrderInvoicePayload;
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

function formatValidUntilLabel(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return value;
  return `${d}. ${m}. ${y}`;
}

function createIssuedPdfPath(shopId: ShopId, code: string) {
  const safe = normalizeVoucherCode(code) || code;
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `issued/${shopId}/${safe}-${id}.pdf`;
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

function resolvePlacement(
  settings: ReturnType<typeof normalizeVoucherSettings>,
  kind: ManualVoucherKind,
  experienceId: string | undefined,
  amountCzk: number,
): VoucherPdfPlacement | null {
  if (kind === "experience") {
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

  const slotIndex = settings.amountSlots.findIndex((slot) => slot === amountCzk);
  if (slotIndex >= 0) {
    return settings.amountPreviews.slotPdfs[slotIndex] ?? null;
  }
  return settings.amountPreviews.customPdf ?? null;
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
}): Promise<{ url: string; bytes: Uint8Array } | null> {
  if (
    !params.placement.pdfTemplate?.url ||
    (!params.placement.codePosition && !params.placement.qrPosition)
  ) {
    return null;
  }

  const templateBytes = await fetchPdfTemplateBytes(
    params.placement.pdfTemplate.url,
  );
  const stamped = await stampVoucherPdf({
    templateBytes,
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
 * Vrátí N unikátních kódů (včetně prefixu obchodu), které ještě nejsou v evidenci.
 * Ruční kód se použije jen u jednoho kusu; u více kusů se kódy generují.
 */
async function allocateVoucherCodes(params: {
  admin: ReturnType<typeof createAdminClient>;
  shopId: ShopId;
  count: number;
  requestedCode?: string;
}): Promise<string[]> {
  if (params.count === 1 && params.requestedCode) {
    const normalized = applyShopCodePrefix(params.requestedCode, params.shopId);
    if (!isValidNewVoucherCode(normalized)) {
      throw new Error(INVALID_CODE_MESSAGE);
    }
    const { data: existing } = await params.admin
      .from("sold_vouchers")
      .select("id")
      .eq("code_normalized", normalized)
      .maybeSingle();
    if (existing) {
      throw new Error("Tento kód už v evidenci existuje.");
    }
    return [normalized];
  }

  const candidates = new Set<string>();
  let attempts = 0;
  while (candidates.size < params.count) {
    attempts += 1;
    if (attempts > params.count * 50) {
      throw new Error("Nepodařilo se vygenerovat unikátní kódy.");
    }
    const candidate = applyShopCodePrefix(
      generateVoucherCode(params.shopId),
      params.shopId,
    );
    if (isValidNewVoucherCode(candidate)) candidates.add(candidate);
  }

  const list = [...candidates];
  const { data: existingRows } = await params.admin
    .from("sold_vouchers")
    .select("code_normalized")
    .in("code_normalized", list);
  if (existingRows && existingRows.length > 0) {
    // Vyjímečná kolize s existujícím kódem — vygenerovat znovu.
    return allocateVoucherCodes(params);
  }
  return list;
}

export async function createManualSoldVoucher(
  input: CreateManualSoldVoucherInput,
) {
  const shopId = input.shopId;
  const buyerName = input.buyerName.trim();
  const buyerEmail = (input.buyerEmail ?? "").trim();
  const buyerPhone = (input.buyerPhone ?? "").trim();

  if (!buyerName) {
    throw new Error("Vyplňte jméno a příjmení.");
  }
  if (buyerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
    throw new Error("Zadejte platný e-mail.");
  }

  const payment = normalizeManualPaymentMethodInput({
    paymentMethod: input.paymentMethod,
    paymentMethodNote: input.paymentMethodNote,
  });
  const invoicePayload = validateManualInvoice(input.invoice);

  const admin = createAdminClient();
  const settings = await loadShopSettings(admin, shopId);

  let productName = "";
  let unitPrice = 0;
  let experienceId: string | undefined;
  let vatLabel: string | null = null;
  let seats: number | null = null;
  let quantity = 1;

  if (input.kind === "experience") {
    experienceId = (input.experienceId ?? "").trim();
    const experience = settings.experiences.find(
      (item) => item.id === experienceId,
    );
    if (!experience) {
      throw new Error("Vyberte platný zážitek.");
    }
    productName = experience.title;
    unitPrice = experience.price;
    if (experienceSupportsSeatQuantity(experienceId)) {
      const count = Math.round(Number(input.seats ?? SEAT_QUANTITY_MIN));
      if (
        !Number.isInteger(count) ||
        count < SEAT_QUANTITY_MIN ||
        count > SEAT_QUANTITY_MAX
      ) {
        throw new Error("Neplatný počet osob.");
      }
      seats = count;
      // Stejně jako u objednávky z webu: cena je za všechny osoby dohromady.
      unitPrice = experience.price * count;
      if (count > 1) {
        productName = `${experience.title} pro ${formatPersonsCs(count)}`;
      }
    }
    if (!experienceSupportsSeatQuantity(experienceId)) {
      // Ostatní zážitky: počet kusů = počet samostatných poukazů (kódů).
      const rawQuantity = Math.round(Number(input.quantity ?? 1));
      if (
        !Number.isInteger(rawQuantity) ||
        rawQuantity < MANUAL_VOUCHER_QUANTITY_MIN ||
        rawQuantity > MANUAL_VOUCHER_QUANTITY_MAX
      ) {
        throw new Error("Neplatný počet kusů.");
      }
      quantity = rawQuantity;
    }
    vatLabel = formatExperienceVatLabel(experience.vat, experience.price);
  } else {
    const amount = Number(input.amountCzk);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Zadejte platnou částku.");
    }
    const rawQuantity = Math.round(Number(input.quantity ?? 1));
    if (
      !Number.isInteger(rawQuantity) ||
      rawQuantity < MANUAL_VOUCHER_QUANTITY_MIN ||
      rawQuantity > MANUAL_VOUCHER_QUANTITY_MAX
    ) {
      throw new Error("Neplatný počet kusů.");
    }
    quantity = rawQuantity;
    unitPrice = Math.round(amount);
    productName = `Poukaz ${unitPrice.toLocaleString("cs-CZ")} Kč`;
    vatLabel = "Cenina bez DPH";
  }

  const requestedCode = (input.code ?? "").trim().toUpperCase();
  const codes = await allocateVoucherCodes({
    admin,
    shopId,
    count: quantity,
    requestedCode: requestedCode || undefined,
  });

  const purchasedAt = new Date();
  const validUntil = toDateOnly(
    addMonths(purchasedAt, settings.validityMonths),
  );

  const placement = resolvePlacement(
    settings,
    input.kind,
    experienceId,
    unitPrice,
  );

  const makePdf = async (
    codeNormalized: string,
  ): Promise<{ url: string; bytes: Uint8Array } | null> => {
    try {
      if (shopUsesHardcodedA4Pdf(shopId)) {
        const bytes = await generateA4VoucherPdf({
          shopId,
          code: codeNormalized,
          kind: input.kind === "experience" ? "experience" : "amount",
          serviceTitle:
            input.kind === "experience"
              ? productName
              : `${Math.round(unitPrice).toLocaleString("cs-CZ")} Kč`,
          amountCzk: unitPrice,
          recipientName: buyerName,
          fromName: null,
          issuedAt: purchasedAt,
          validUntil,
          message: null,
        });
        return await uploadIssuedPdf({
          admin,
          shopId,
          code: codeNormalized,
          bytes,
        });
      }
      if (placement) {
        return await stampAndUploadPdf({
          admin,
          shopId,
          code: codeNormalized,
          placement,
        });
      }
      return null;
    } catch (error) {
      console.error("createManualSoldVoucher: PDF failed", error);
      return null;
    }
  };

  const pdfs: Array<{ code: string; url: string; bytes: Uint8Array } | null> =
    [];
  for (const codeNormalized of codes) {
    const pdf = await makePdf(codeNormalized);
    pdfs.push(pdf ? { code: codeNormalized, ...pdf } : null);
  }

  let invoiceNumber: string | null = null;
  let invoicePdfBytes: Buffer | null = null;
  if (invoicePayload) {
    const paymentLabel =
      formatPaymentMethodLabel(
        payment.paymentMethod,
        payment.paymentMethodNote,
      ) || "Ruční platba";
    const issued = await issueInvoicePdf({
      shopId,
      totalCzk: unitPrice * quantity,
      productName:
        quantity > 1 ? `${productName} (${quantity}×)` : productName,
      buyerName,
      invoice: invoicePayload,
      paymentMethodLabel: paymentLabel,
      footerNote: `Tato faktura byla vystavena k ručně evidovanému poukazu. Platba: ${paymentLabel}.`,
      issuedAt: purchasedAt,
    });
    invoiceNumber = issued.invoiceNumber;
    invoicePdfBytes = issued.pdfBytes;
  }

  const rows = codes.map((codeNormalized, index) => ({
    order_id: null,
    shop_id: shopId,
    code: codeNormalized,
    code_normalized: codeNormalized,
    product_name: productName,
    item_kind: input.kind,
    unit_price_czk: unitPrice,
    shipping_fee_share_czk: 0,
    status: "active",
    purchased_at: purchasedAt.toISOString(),
    valid_until: validUntil,
    buyer_name: buyerName,
    buyer_email: buyerEmail,
    buyer_phone: buyerPhone,
    recipient_name: buyerName,
    delivery_method: "email",
    delivery_email: buyerEmail || null,
    shipping_address: null,
    message: null,
    vat_label: vatLabel,
    tax_regime: "vouchy",
    pdf_url: pdfs[index]?.url ?? null,
    remaining_czk: input.kind === "amount" ? unitPrice : null,
    redeemable_parts:
      input.kind === "experience"
        ? redeemablePartsForExperienceId(experienceId)
        : null,
    is_gift: false,
    seats,
    remaining_seats: seats,
    issued_by: input.issuedBy?.trim() || null,
    payment_method: payment.paymentMethod,
    payment_method_note: payment.paymentMethodNote,
  }));

  const { data: inserted, error: insertError } = await admin
    .from("sold_vouchers")
    .insert(rows)
    .select(
      "code, shop_id, product_name, item_kind, unit_price_czk, shipping_fee_share_czk, status, purchased_at, valid_until, buyer_name, buyer_email, buyer_phone, delivery_method, delivery_email, recipient_name, shipping_address, pdf_url, remaining_czk, redeemable_parts, is_gift, payment_method, payment_method_note",
    );

  if (insertError || !inserted || inserted.length === 0) {
    if (insertError?.message?.includes("order_id")) {
      throw new Error(
        "Chybí migrace 014 (order_id nullable) - spusť ji v Supabase.",
      );
    }
    if (insertError?.message?.includes("issued_by")) {
      throw new Error(
        "Chybí migrace 018 (issued_by) - spusť ji v Supabase.",
      );
    }
    if (
      insertError?.message &&
      /payment_method/i.test(insertError.message)
    ) {
      throw new Error(
        "Chybí migrace 019 (payment_method) - spusť ji v Supabase.",
      );
    }
    throw new Error(insertError?.message || "Poukaz se nepodařilo uložit.");
  }

  const vouchers = (inserted as SoldVoucherRow[]).map((row) =>
    mapSoldVoucherRow(row),
  );

  let emailSent = false;
  if (input.sendEmail !== false && buyerEmail) {
    const to = resolveVoucherEmailRecipient({
      deliveryMethod: "email",
      deliveryEmail: buyerEmail,
      buyerEmail,
    });
    if (to) {
      try {
        const invoiceEmail = asTrimmed(invoicePayload?.email);
        const attachInvoiceHere = Boolean(
          invoicePdfBytes &&
            invoiceNumber &&
            (!invoiceEmail || invoiceEmail.toLowerCase() === to.toLowerCase()),
        );
        // Všechny kusy přijdou v jednom e-mailu (každý kód vlastní PDF).
        const attachments: Array<{ filename: string; content: Buffer }> = [];
        for (const pdf of pdfs) {
          if (!pdf) continue;
          attachments.push({
            filename: `poukaz-${pdf.code}.pdf`,
            content: Buffer.from(pdf.bytes),
          });
        }
        if (attachInvoiceHere && invoicePdfBytes && invoiceNumber) {
          attachments.push({
            filename: `faktura-${invoiceNumber}.pdf`,
            content: invoicePdfBytes,
          });
        }
        const result = await sendVoucherEmail({
          shopId,
          to,
          buyerName,
          recipientName: buyerName,
          productName,
          code: codes[0],
          codes,
          validUntil: formatValidUntilLabel(validUntil),
          deliveryMethod: "email",
          purpose: "voucher",
          attachments: attachments.length > 0 ? attachments : undefined,
        });
        emailSent = Boolean(result.ok);

        // Samostatný e-mail jen s fakturou (jiná fakturační adresa).
        if (
          invoicePdfBytes &&
          invoiceNumber &&
          invoiceEmail &&
          invoiceEmail.toLowerCase() !== to.toLowerCase()
        ) {
          await sendVoucherEmail({
            shopId,
            to: invoiceEmail,
            buyerName,
            recipientName: buyerName,
            productName,
            code: codes[0],
            validUntil: formatValidUntilLabel(validUntil),
            deliveryMethod: "email",
            purpose: "invoice_only",
            attachments: [
              {
                filename: `faktura-${invoiceNumber}.pdf`,
                content: invoicePdfBytes,
              },
            ],
          });
        }
      } catch (error) {
        console.error("createManualSoldVoucher: email failed", error);
      }
    }
  }

  return {
    voucher: vouchers[0],
    vouchers,
    emailSent,
    pdfGenerated: pdfs.some((pdf) => pdf !== null),
    invoiceNumber,
  };
}
