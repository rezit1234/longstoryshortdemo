import type { ShopId } from "@/data/admin-voucher-settings";
import { getShopBrand } from "@/data/shops";

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
  attachments?: VoucherEmailAttachment[];
};

type ParsedSender = { name: string; email: string };

function parseSender(raw: string | undefined): ParsedSender | null {
  const value = raw?.trim();
  if (!value) return null;

  const angled = value.match(/^(.*)<([^>]+)>$/);
  if (angled) {
    const email = angled[2].trim();
    const name = angled[1].trim().replace(/^["']|["']$/g, "");
    if (!email.includes("@")) return null;
    return { name: name || "Dárkové poukazy", email };
  }

  if (value.includes("@")) {
    return { name: "Dárkové poukazy", email: value };
  }

  return null;
}

function resolveSender(): ParsedSender | null {
  return (
    parseSender(process.env.EMAIL_FROM) ||
    parseSender(process.env.BREVO_SENDER_EMAIL)
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function deliveryCopy(method: string) {
  if (method === "post") {
    return "Poukaz vám pošleme poštou v dárkovém balení. Pro jistotu přikládáme i digitální verzi v PDF.";
  }
  if (method === "pickup") {
    return "Poukaz si vyzvednete osobně. Pro jistotu přikládáme i digitální verzi v PDF.";
  }
  return "V příloze najdete dárkový poukaz v PDF. Stačí ho otevřít nebo vytisknout.";
}

function buildHtml(input: SendVoucherEmailInput) {
  const brand = getShopBrand(input.shopId);
  const name = escapeHtml(input.recipientName || input.buyerName || "vážení");
  const product = escapeHtml(input.productName);
  const code = escapeHtml(input.code);
  const validUntil = escapeHtml(input.validUntil);
  const brandName = escapeHtml(brand.brandName);
  const website = escapeHtml(brand.websiteUrl);
  const message = input.message?.trim()
    ? `<p style="margin:16px 0 0;padding:12px 14px;background:#f5f5f5;border-radius:8px;"><strong>Vzkaz:</strong><br/>${escapeHtml(input.message.trim())}</p>`
    : "";
  const hasPdf = (input.attachments?.length ?? 0) > 0;

  return `<!DOCTYPE html>
<html lang="cs">
<body style="margin:0;padding:0;background:#f3f3f3;font-family:Arial,Helvetica,sans-serif;color:#111;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;padding:28px 24px;">
          <tr>
            <td>
              <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;color:#666;">${brandName}</p>
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">Váš dárkový poukaz</h1>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">Dobrý den, ${name},</p>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">děkujeme za nákup. ${deliveryCopy(input.deliveryMethod)}</p>
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
              ${
                hasPdf
                  ? `<p style="margin:18px 0 0;font-size:14px;line-height:1.5;color:#444;">PDF poukazu je v příloze tohoto e-mailu.</p>`
                  : `<p style="margin:18px 0 0;font-size:14px;line-height:1.5;color:#444;">Digitální PDF zatím není k dispozici — kód výše stačí k uplatnění.</p>`
              }
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

/**
 * Odešle e-mail s poukazem přes Brevo Transactional API.
 * Bez BREVO_API_KEY / odesílatele jen zaloguje a vrátí skipped.
 */
export async function sendVoucherEmail(input: SendVoucherEmailInput) {
  const to = input.to.trim();
  if (!to) {
    return { ok: false as const, skipped: true as const, reason: "no_recipient" as const };
  }

  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) {
    console.warn("sendVoucherEmail: chybí BREVO_API_KEY — e-mail přeskočen.");
    return { ok: false as const, skipped: true as const, reason: "no_api_key" as const };
  }

  const sender = resolveSender();
  if (!sender) {
    console.warn(
      "sendVoucherEmail: chybí EMAIL_FROM / BREVO_SENDER_EMAIL — e-mail přeskočen.",
    );
    return { ok: false as const, skipped: true as const, reason: "no_sender" as const };
  }

  const brand = getShopBrand(input.shopId);
  const subject = `Váš dárkový poukaz ${input.code} – ${brand.brandName}`;

  const attachments = (input.attachments ?? []).map((file) => ({
    name: file.filename,
    content: file.content.toString("base64"),
  }));

  const payload: Record<string, unknown> = {
    sender: {
      name: sender.name,
      email: sender.email,
    },
    to: [
      {
        email: to,
        name: (input.recipientName || input.buyerName || "").trim() || undefined,
      },
    ],
    subject,
    htmlContent: buildHtml(input),
  };

  if (attachments.length > 0) {
    payload.attachment = attachments;
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => null)) as {
    messageId?: string;
    message?: string;
    code?: string;
  } | null;

  if (!response.ok) {
    const message =
      body?.message || `Brevo API error (${response.status})`;
    console.error("sendVoucherEmail failed", body);
    return { ok: false as const, skipped: false as const, error: message };
  }

  return { ok: true as const, id: body?.messageId ?? null };
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
