import type { ShopId } from "@/data/admin-voucher-settings";
import { getShopBrand } from "@/data/shops";
import { sendBrevoEmail } from "@/lib/email/brevo";

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
  code: string;
  validUntil: string;
  orderNumber?: string;
  deliveryMethod: string;
  message?: string | null;
  /** PDF poukazu a později i faktura - jeden mail, víc příloh. */
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

function classifyAttachments(attachments: VoucherEmailAttachment[]) {
  const hasInvoice = attachments.some((file) =>
    /faktura|invoice/i.test(file.filename),
  );
  const hasVoucher = attachments.some((file) =>
    /poukaz|voucher/i.test(file.filename),
  );
  return {
    count: attachments.length,
    hasInvoice,
    hasVoucher: hasVoucher || (attachments.length > 0 && !hasInvoice),
  };
}

function deliveryCopyCs(
  method: string,
  files: ReturnType<typeof classifyAttachments>,
) {
  if (method === "post") {
    if (files.hasVoucher && files.hasInvoice) {
      return "Poukaz vám pošleme poštou v dárkovém balení. Pro jistotu přikládáme digitální poukaz i fakturu v PDF.";
    }
    if (files.hasVoucher) {
      return "Poukaz vám pošleme poštou v dárkovém balení. Pro jistotu přikládáme i digitální verzi v PDF.";
    }
    return "Poukaz vám pošleme poštou v dárkovém balení. Kód níže stačí k uplatnění.";
  }

  if (method === "pickup") {
    if (files.hasVoucher && files.hasInvoice) {
      return "Poukaz si vyzvednete osobně. Pro jistotu přikládáme digitální poukaz i fakturu v PDF.";
    }
    if (files.hasVoucher) {
      return "Poukaz si vyzvednete osobně. Pro jistotu přikládáme i digitální verzi v PDF.";
    }
    return "Poukaz si vyzvednete osobně. Kód níže stačí k uplatnění.";
  }

  if (files.hasVoucher && files.hasInvoice) {
    return "V příloze najdete dárkový poukaz a fakturu ve formátu PDF.";
  }
  if (files.hasVoucher) {
    return "V příloze najdete dárkový poukaz v PDF. Stačí ho otevřít nebo vytisknout.";
  }
  if (files.hasInvoice) {
    return "V příloze najdete fakturu ve formátu PDF. Kód poukazu je níže.";
  }
  return "Kód poukazu najdete níže - stačí ho uvést při uplatnění.";
}

function attachmentFootnoteCs(files: ReturnType<typeof classifyAttachments>) {
  if (files.hasVoucher && files.hasInvoice) {
    return "PDF poukazu a faktury jsou v příloze tohoto e-mailu.";
  }
  if (files.hasVoucher) {
    return "PDF poukazu je v příloze tohoto e-mailu.";
  }
  if (files.hasInvoice) {
    return "Faktura v PDF je v příloze tohoto e-mailu.";
  }
  return "Digitální PDF zatím není k dispozici - kód výše stačí k uplatnění.";
}

function buildVoucherEmailHtml(input: SendVoucherEmailInput) {
  const brand = getShopBrand(input.shopId);
  const name = escapeHtml(input.recipientName || input.buyerName || "vážení");
  const product = escapeHtml(input.productName);
  const code = escapeHtml(input.code);
  const validUntil = escapeHtml(input.validUntil);
  const brandName = escapeHtml(brand.brandName);
  const website = escapeHtml(brand.websiteUrl);
  const logoUrl = escapeHtml(shopLogoUrl(brand.logoSrc));
  const files = classifyAttachments(input.attachments ?? []);
  const message = input.message?.trim()
    ? `<p style="margin:16px 0 0;padding:12px 14px;background:#f5f5f5;border-radius:8px;"><strong>Vzkaz:</strong><br/>${escapeHtml(input.message.trim())}</p>`
    : "";

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
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;text-align:left;font-weight:700;">Váš dárkový poukaz</h1>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">Dobrý den, ${name},</p>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">děkujeme za nákup. ${deliveryCopyCs(input.deliveryMethod, files)}</p>
              <table role="presentation" width="100%" style="margin:20px 0;border-collapse:collapse;">
                <tr>
                  <td style="padding:8px 0;border-top:1px solid #eee;font-size:14px;color:#666;">Produkt</td>
                  <td style="padding:8px 0;border-top:1px solid #eee;font-size:14px;text-align:right;"><strong>${product}</strong></td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-top:1px solid #eee;font-size:14px;color:#666;">Kód poukazu</td>
                  <td style="padding:8px 0;border-top:1px solid #eee;font-size:16px;text-align:right;letter-spacing:0.08em;"><strong>${code}</strong></td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-top:1px solid #eee;border-bottom:1px solid #eee;font-size:14px;color:#666;">Platnost do</td>
                  <td style="padding:8px 0;border-top:1px solid #eee;border-bottom:1px solid #eee;font-size:14px;text-align:right;"><strong>${validUntil}</strong></td>
                </tr>
              </table>
              ${message}
              <p style="margin:18px 0 0;font-size:14px;line-height:1.5;color:#444;">${attachmentFootnoteCs(files)}</p>
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

export function voucherEmailSubject(input: Pick<SendVoucherEmailInput, "shopId" | "attachments">) {
  const brand = getShopBrand(input.shopId);
  const hasInvoice = (input.attachments ?? []).some((file) =>
    /faktura|invoice/i.test(file.filename),
  );
  return hasInvoice
    ? `Váš dárkový poukaz a faktura - ${brand.brandName}`
    : `Váš dárkový poukaz - ${brand.brandName}`;
}

/**
 * Jeden zákaznický e-mail po platbě: poukaz (+ později faktura ve stejné příloze).
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
