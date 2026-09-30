import {
  generateVoucherCode,
  normalizeVoucherCode,
  formatExperienceVatLabel,
  type ShopId,
  VOUCHER_CODE_LENGTH,
} from "@/data/admin-voucher-settings";
import type { VoucherPdfPlacement } from "@/data/vouchers";
import {
  resolveVoucherEmailRecipient,
  sendVoucherEmail,
} from "@/lib/email/send-voucher-email";
import { mapSoldVoucherRow, type SoldVoucherRow } from "@/lib/sold-vouchers";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeVoucherSettings } from "@/lib/voucher-settings";
import {
  fetchPdfTemplateBytes,
  stampVoucherPdf,
} from "@/lib/voucher-pdf-overlay";

export type ManualVoucherKind = "amount" | "experience";

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
};

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

  const path = createIssuedPdfPath(params.shopId, params.code);
  const { error: uploadError } = await params.admin.storage
    .from("voucher-pdfs")
    .upload(path, Buffer.from(stamped), {
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

  return { url: publicUrl, bytes: stamped };
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
    code = generateVoucherCode();
  }
  const codeNormalized = normalizeVoucherCode(code);
  if (!codeNormalized || codeNormalized.length !== VOUCHER_CODE_LENGTH) {
    throw new Error(`Kód musí mít přesně ${VOUCHER_CODE_LENGTH} znaků.`);
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
  if (placement) {
    try {
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
    } catch (error) {
      console.error("createManualSoldVoucher: PDF stamp failed", error);
    }
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
  };

  const { data: inserted, error: insertError } = await admin
    .from("sold_vouchers")
    .insert(row)
    .select(
      "code, shop_id, product_name, unit_price_czk, shipping_fee_share_czk, status, purchased_at, valid_until, buyer_name, buyer_email, buyer_phone, delivery_method, shipping_address, pdf_url",
    )
    .single();

  if (insertError || !inserted) {
    if (insertError?.message?.includes("order_id")) {
      throw new Error(
        "Chybí migrace 014 (order_id nullable) — spusť ji v Supabase.",
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
        const result = await sendVoucherEmail({
          shopId,
          to,
          buyerName,
          recipientName: buyerName,
          productName,
          code: codeNormalized,
          validUntil: formatValidUntilLabel(validUntil),
          deliveryMethod: "email",
          attachments: pdfBytes
            ? [
                {
                  filename: `poukaz-${codeNormalized}.pdf`,
                  content: Buffer.from(pdfBytes),
                },
              ]
            : undefined,
        });
        emailSent = Boolean(result.ok);
      } catch (error) {
        console.error("createManualSoldVoucher: email failed", error);
      }
    }
  }

  return {
    voucher: mapSoldVoucherRow(inserted as SoldVoucherRow),
    emailSent,
    pdfGenerated: Boolean(pdfUrl),
  };
}
