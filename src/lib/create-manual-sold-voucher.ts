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
import { redeemablePartsForExperienceId } from "@/lib/voucher-redemption";
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
  amountCzk?: number;
  buyerName: string;
  buyerEmail: string;
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

export async function createManualSoldVoucher(
  input: CreateManualSoldVoucherInput,
) {
  const shopId = input.shopId;
  const buyerName = input.buyerName.trim();
  const buyerEmail = input.buyerEmail.trim();
  const buyerPhone = (input.buyerPhone ?? "").trim();

  if (!buyerName) {
    throw new Error("Vyplňte jméno a příjmení.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
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
    vatLabel = formatExperienceVatLabel(experience.vat, experience.price);
  } else {
    const amount = Number(input.amountCzk);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Zadejte platnou částku.");
    }
    unitPrice = Math.round(amount);
    productName = `Poukaz ${unitPrice.toLocaleString("cs-CZ")} Kč`;
    vatLabel = "Cenina bez DPH";
  }

  let code = (input.code ?? "").trim().toUpperCase();
  if (!code) {
    code = generateVoucherCode(shopId);
  }
  const codeNormalized = applyShopCodePrefix(code, shopId);
  if (!isValidNewVoucherCode(codeNormalized)) {
    throw new Error(
      "Kód musí mít prefix obchodu a 7 znaků (např. LSSK7M2P9A).",
    );
  }

  const { data: existing } = await admin
    .from("sold_vouchers")
    .select("id")
    .eq("code_normalized", codeNormalized)
    .maybeSingle();

  if (existing) {
    throw new Error("Tento kód už v evidenci existuje.");
  }

  const purchasedAt = new Date();
  const validUntil = toDateOnly(
    addMonths(purchasedAt, settings.validityMonths),
  );

  let pdfUrl: string | null = null;
  let pdfBytes: Uint8Array | null = null;
  const placement = resolvePlacement(
    settings,
    input.kind,
    experienceId,
    unitPrice,
  );
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
      const uploaded = await uploadIssuedPdf({
        admin,
        shopId,
        code: codeNormalized,
        bytes,
      });
      pdfUrl = uploaded.url;
      pdfBytes = uploaded.bytes;
    } else if (placement) {
      const stamped = await stampAndUploadPdf({
        admin,
        shopId,
        code: codeNormalized,
        placement,
      });
      if (stamped) {
        pdfUrl = stamped.url;
        pdfBytes = stamped.bytes;
      }
    }
  } catch (error) {
    console.error("createManualSoldVoucher: PDF failed", error);
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
      totalCzk: unitPrice,
      productName,
      buyerName,
      invoice: invoicePayload,
      paymentMethodLabel: paymentLabel,
      footerNote: `Tato faktura byla vystavena k ručně evidovanému poukazu. Platba: ${paymentLabel}.`,
      issuedAt: purchasedAt,
    });
    invoiceNumber = issued.invoiceNumber;
    invoicePdfBytes = issued.pdfBytes;
  }

  const row = {
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
    delivery_email: buyerEmail,
    shipping_address: null,
    message: null,
    vat_label: vatLabel,
    tax_regime: "vouchy",
    pdf_url: pdfUrl,
    remaining_czk: input.kind === "amount" ? unitPrice : null,
    redeemable_parts:
      input.kind === "experience"
        ? redeemablePartsForExperienceId(experienceId)
        : null,
    is_gift: false,
    issued_by: input.issuedBy?.trim() || null,
    payment_method: payment.paymentMethod,
    payment_method_note: payment.paymentMethodNote,
  };

  const { data: inserted, error: insertError } = await admin
    .from("sold_vouchers")
    .insert(row)
    .select(
      "code, shop_id, product_name, item_kind, unit_price_czk, shipping_fee_share_czk, status, purchased_at, valid_until, buyer_name, buyer_email, buyer_phone, delivery_method, delivery_email, recipient_name, shipping_address, pdf_url, remaining_czk, redeemable_parts, is_gift, payment_method, payment_method_note",
    )
    .single();

  if (insertError || !inserted) {
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

  let emailSent = false;
  if (input.sendEmail !== false) {
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
        const attachments: Array<{ filename: string; content: Buffer }> = [];
        if (pdfBytes) {
          attachments.push({
            filename: `poukaz-${codeNormalized}.pdf`,
            content: Buffer.from(pdfBytes),
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
          code: codeNormalized,
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
            code: codeNormalized,
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
    voucher: mapSoldVoucherRow(inserted as SoldVoucherRow),
    emailSent,
    pdfGenerated: Boolean(pdfUrl),
    invoiceNumber,
  };
}
