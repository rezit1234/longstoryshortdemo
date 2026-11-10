import type { ShopId } from "@/data/admin-voucher-settings";
import { getShopBrand } from "@/data/shops";
import { sendBrevoEmail } from "@/lib/email/brevo";
import { emailDetailRows } from "@/lib/email/email-detail-rows";

export type VoucherEmailAttachment = {
  filename: string;
  content: Buffer;
};

export type SendVoucherEmailInput = {
  shopId: ShopId;
  to: string;
  buyerName: string;
  recipientName?: string;
  productName: string;
  /** Primární / první kód (zpětná kompatibilita). */
  code: string;
  /** Všechny kódy objednávky — jeden mail i při množství > 1. */
  codes?: string[];
  validUntil: string;
  orderNumber?: string;
  deliveryMethod: string;
  message?: string | null;
  /** PDF poukazů (+ faktura) v jednom mailu. */
  attachments?: VoucherEmailAttachment[];
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function appBaseUrl() {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://longstoryshortdemo.vercel.app";
  return raw.replace(/\/$/, "");
}

function shopLogoUrl(logoSrc: string) {
  if (/^https?:\/\//i.test(logoSrc)) return logoSrc;
  const path = logoSrc.startsWith("/") ? logoSrc : `/${logoSrc}`;
  return `${appBaseUrl()}${path}`;
}

function resolveCodes(input: Pick<SendVoucherEmailInput, "code" | "codes">) {
  const fromList = (input.codes ?? [])
    .map((code) => code.trim())
    .filter(Boolean);
  if (fromList.length > 0) {
    return [...new Set(fromList)];
  }
  const single = input.code.trim();
  return single ? [single] : [];
}

function classifyAttachments(attachments: VoucherEmailAttachment[]) {
  const hasInvoice = attachments.some((file) =>
    /faktura|invoice/i.test(file.filename),
  );
  const voucherCount = attachments.filter((file) =>
    /poukaz|voucher/i.test(file.filename),
  ).length;
  const hasVoucher =
    voucherCount > 0 || (attachments.length > 0 && !hasInvoice);
  return {
    count: attachments.length,
    voucherCount: hasVoucher
      ? Math.max(voucherCount, hasInvoice ? attachments.length - 1 : attachments.length)
      : 0,
    hasInvoice,
    hasVoucher,
  };
}

function deliveryCopyCs(
  method: string,
  files: ReturnType<typeof classifyAttachments>,
  voucherCount: number,
) {
  const plural = voucherCount > 1;
  const voucherWord = plural ? "poukazy" : "poukaz";
  const digitalWord = plural ? "digitální verze" : "digitální verzi";

  if (method === "post") {
    if (files.hasVoucher && files.hasInvoice) {
      return `Poukaz${plural ? "y" : ""} vám pošleme poštou v dárkovém balení. Pro jistotu přikládáme ${digitalWord} i fakturu v PDF.`;
    }
    if (files.hasVoucher) {
      return `Poukaz${plural ? "y" : ""} vám pošleme poštou v dárkovém balení. Pro jistotu přikládáme i ${digitalWord} v PDF.`;
    }
    return `Poukaz${plural ? "y" : ""} vám pošleme poštou v dárkovém balení. Kód${plural ? "y" : ""} níže stačí k uplatnění.`;
  }

  if (method === "pickup") {
    if (files.hasVoucher && files.hasInvoice) {
      return `Poukaz${plural ? "y" : ""} si vyzvednete osobně. Pro jistotu přikládáme ${digitalWord} i fakturu v PDF.`;
    }
    if (files.hasVoucher) {
      return `Poukaz${plural ? "y" : ""} si vyzvednete osobně. Pro jistotu přikládáme i ${digitalWord} v PDF.`;
    }
    return `Poukaz${plural ? "y" : ""} si vyzvednete osobně. Kód${plural ? "y" : ""} níže stačí k uplatnění.`;
  }

  if (files.hasVoucher && files.hasInvoice) {
    return `V příloze tohoto e-mailu najdete dárkový ${voucherWord} i fakturu k objednávce ve formátu PDF.`;
  }
  if (files.hasVoucher) {
    return `V příloze najdete dárkový ${voucherWord} v PDF. Stačí ${plural ? "je" : "ho"} otevřít nebo vytisknout.`;
  }
  if (files.hasInvoice) {
    return `V příloze tohoto e-mailu najdete fakturu k objednávce ve formátu PDF. Kód${plural ? "y" : ""} poukazu ${plural ? "jsou" : "je"} níže.`;
  }
  return `Kód${plural ? "y" : ""} poukazu najdete níže — stačí ${plural ? "je" : "ho"} uvést při uplatnění.`;
}

function attachmentFootnoteCs(
  files: ReturnType<typeof classifyAttachments>,
  voucherCount: number,
) {
  const plural = voucherCount > 1;
  if (files.hasVoucher && files.hasInvoice) {
    return plural
      ? "PDF všech poukazů a faktury k objednávce jsou v příloze tohoto e-mailu."
      : "PDF poukazu a faktury k objednávce jsou v příloze tohoto e-mailu.";
  }
  if (files.hasVoucher) {
    return plural
      ? "PDF všech poukazů jsou v příloze tohoto e-mailu."
      : "PDF poukazu je v příloze tohoto e-mailu.";
  }
  if (files.hasInvoice) {
    return "Faktura k objednávce je v příloze tohoto e-mailu.";
  }
  return "Kód výše stačí k uplatnění.";
}

function buildVoucherEmailHtml(input: SendVoucherEmailInput) {
  const brand = getShopBrand(input.shopId);
  const name = escapeHtml(input.recipientName || input.buyerName || "vážení");
  const product = escapeHtml(input.productName);
  const codes = resolveCodes(input);
  const voucherCount = Math.max(codes.length, 1);
  const plural = voucherCount > 1;
  const validUntil = escapeHtml(input.validUntil);
  const brandName = escapeHtml(brand.brandName);
  const website = escapeHtml(brand.websiteUrl);
  const logoUrl = escapeHtml(shopLogoUrl(brand.logoSrc));
  const files = classifyAttachments(input.attachments ?? []);
  const message = input.message?.trim()
    ? `<p style="margin:16px 0 0;padding:12px 14px;background:#f5f5f5;border-radius:8px;"><strong>Vzkaz:</strong><br/>${escapeHtml(input.message.trim())}</p>`
    : "";

  const codesHtml = codes
    .map(
      (code) =>
        `<strong style="letter-spacing:0.08em;">${escapeHtml(code)}</strong>`,
    )
    .join("<br/>");

  const detailRows = [
    { label: "Produkt", valueHtml: `<strong>${product}</strong>` },
    plural
      ? {
          label: "Množství",
          valueHtml: `<strong>${voucherCount}×</strong>`,
        }
      : null,
    {
      label: plural ? "Kódy poukazů" : "Kód poukazu",
      valueHtml: codesHtml || "—",
      valueStyle: "font-size:16px;",
    },
    {
      label: "Platnost do",
      valueHtml: `<strong>${validUntil}</strong>`,
    },
  ];

  return `<!DOCTYPE html>
<html lang="cs">
<body style="margin:0;padding:0;background:#f3f3f3;font-family:Arial,Helvetica,sans-serif;color:#111;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;padding:28px 24px;">
          <tr>
            <td style="text-align:left;">
              <div style="margin:0 0 18px;text-align:left;">
                <img src="${logoUrl}" alt="${brandName}" width="96" style="display:block;max-width:96px;width:96px;height:auto;border:0;outline:none;text-decoration:none;" />
              </div>
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;text-align:left;font-weight:700;">${
                plural ? "Vaše dárkové poukazy" : "Váš dárkový poukaz"
              }</h1>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">Dobrý den, ${name},</p>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">děkujeme za nákup. ${deliveryCopyCs(
                input.deliveryMethod,
                files,
                voucherCount,
              )}</p>
              <table role="presentation" width="100%" style="margin:20px 0;border-collapse:collapse;">
                ${emailDetailRows(detailRows)}
              </table>
              ${message}
              <p style="margin:18px 0 0;font-size:14px;line-height:1.5;color:#444;">${attachmentFootnoteCs(
                files,
                voucherCount,
              )}</p>
              <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#777;">
                ${brandName}<br/>
                <a href="${website}" style="color:#111;">${website.replace(/^https?:\/\//, "")}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export { buildVoucherEmailHtml };

export function voucherEmailSubject(
  input: Pick<SendVoucherEmailInput, "shopId" | "attachments" | "code" | "codes">,
) {
  const brand = getShopBrand(input.shopId);
  const codes = resolveCodes(input);
  const plural = codes.length > 1;
  const hasInvoice = (input.attachments ?? []).some((file) =>
    /faktura|invoice/i.test(file.filename),
  );
  if (hasInvoice) {
    return plural
      ? `Vaše dárkové poukazy a faktura - ${brand.brandName}`
      : `Váš dárkový poukaz a faktura - ${brand.brandName}`;
  }
  return plural
    ? `Vaše dárkové poukazy - ${brand.brandName}`
    : `Váš dárkový poukaz - ${brand.brandName}`;
}

/**
 * Jeden zákaznický e-mail po platbě: všechny poukazy (+ faktura) v přílohách.
 */
export async function sendVoucherEmail(input: SendVoucherEmailInput) {
  const files = input.attachments ?? [];

  return sendBrevoEmail({
    to: input.to,
    toName: input.recipientName || input.buyerName,
    subject: voucherEmailSubject(input),
    htmlContent: buildVoucherEmailHtml(input),
    shopId: input.shopId,
    attachments: files.map((file) => ({
      name: file.filename,
      content: file.content,
    })),
  });
}

export function resolveVoucherEmailRecipient(params: {
  deliveryMethod: string;
  deliveryEmail?: string | null;
  buyerEmail?: string | null;
}) {
  const delivery = params.deliveryEmail?.trim() || "";
  const buyer = params.buyerEmail?.trim() || "";
  if (params.deliveryMethod === "email" && delivery) return delivery;
  return buyer || delivery;
}
