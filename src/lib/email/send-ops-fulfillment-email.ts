import type { ShopId } from "@/data/admin-voucher-settings";
import { getShopBrand } from "@/data/shops";
import { sendBrevoEmail } from "@/lib/email/brevo";

export type OpsFulfillmentShippingAddress = {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
};

export type SendOpsFulfillmentEmailInput = {
  shopId: ShopId;
  orderNumber: string;
  deliveryMethod: "post" | "pickup";
  productName: string;
  quantity: number;
  codes: string[];
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  recipientName?: string;
  shippingAddress?: OpsFulfillmentShippingAddress | null;
  message?: string | null;
  unitPriceCzk: number;
  shippingFeeCzk: number;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Příjemce interních notifikací: per-shop override, jinak společný OPS_NOTIFY_EMAIL. */
export function resolveOpsNotifyEmail(shopId: ShopId): string | null {
  const perShopKey = {
    lss: "OPS_NOTIFY_EMAIL_LSS",
    bistrocentral: "OPS_NOTIFY_EMAIL_BISTROCENTRAL",
    culinaryacademy: "OPS_NOTIFY_EMAIL_CULINARYACADEMY",
  }[shopId];

  const perShop = process.env[perShopKey]?.trim();
  if (perShop) return perShop;

  const shared = process.env.OPS_NOTIFY_EMAIL?.trim();
  return shared || null;
}

function formatCzk(amount: number) {
  return `${Math.round(amount).toLocaleString("cs-CZ")} Kč`;
}

function buildOpsFulfillmentEmailHtml(input: SendOpsFulfillmentEmailInput) {
  const brand = getShopBrand(input.shopId);
  const isPost = input.deliveryMethod === "post";
  const title = isPost
    ? "Nová objednávka k odeslání"
    : "Nová objednávka k vyzvednutí";
  const action = isPost
    ? "Připravte dárkové balení a odešlete poukaz poštou."
    : "Připravte poukaz k osobnímu vyzvednutí na pobočce.";

  const addressBlock =
    isPost && input.shippingAddress
      ? `<tr>
          <td style="padding:8px 0;border-top:1px solid #eee;font-size:14px;color:#666;vertical-align:top;">Adresa</td>
          <td style="padding:8px 0;border-top:1px solid #eee;font-size:14px;text-align:right;">
            ${escapeHtml(input.shippingAddress.name)}<br/>
            ${escapeHtml(input.shippingAddress.address)}<br/>
            ${escapeHtml(input.shippingAddress.postalCode)} ${escapeHtml(input.shippingAddress.city)}<br/>
            ${escapeHtml(input.shippingAddress.country)}
          </td>
        </tr>`
      : "";

  const codes = input.codes
    .map(
      (code) =>
        `<li style="margin:0 0 4px;letter-spacing:0.06em;"><strong>${escapeHtml(code)}</strong></li>`,
    )
    .join("");

  const message = input.message?.trim()
    ? `<p style="margin:16px 0 0;padding:12px 14px;background:#f5f5f5;border-radius:8px;"><strong>Vzkaz zákazníka:</strong><br/>${escapeHtml(input.message.trim())}</p>`
    : "";

  const adminUrl = (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://longstoryshortdemo.vercel.app"
  ).replace(/\/$/, "");

  return `<!DOCTYPE html>
<html lang="cs">
<body style="margin:0;padding:0;background:#f3f3f3;font-family:Arial,Helvetica,sans-serif;color:#111;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;padding:28px 24px;">
          <tr>
            <td>
              <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#666;">${escapeHtml(brand.brandName)} · interní</p>
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">${title}</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">${action}</p>
              <table role="presentation" width="100%" style="margin:0;border-collapse:collapse;">
                <tr>
                  <td style="padding:8px 0;border-top:1px solid #eee;font-size:14px;color:#666;">Objednávka</td>
                  <td style="padding:8px 0;border-top:1px solid #eee;font-size:14px;text-align:right;"><strong>${escapeHtml(input.orderNumber)}</strong></td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-top:1px solid #eee;font-size:14px;color:#666;">Produkt</td>
                  <td style="padding:8px 0;border-top:1px solid #eee;font-size:14px;text-align:right;"><strong>${escapeHtml(input.productName)}</strong></td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-top:1px solid #eee;font-size:14px;color:#666;">Počet</td>
                  <td style="padding:8px 0;border-top:1px solid #eee;font-size:14px;text-align:right;">${input.quantity}×</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-top:1px solid #eee;font-size:14px;color:#666;">Částka</td>
                  <td style="padding:8px 0;border-top:1px solid #eee;font-size:14px;text-align:right;">${escapeHtml(formatCzk(input.unitPriceCzk * input.quantity + input.shippingFeeCzk))}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-top:1px solid #eee;font-size:14px;color:#666;">Zákazník</td>
                  <td style="padding:8px 0;border-top:1px solid #eee;font-size:14px;text-align:right;">
                    ${escapeHtml(input.buyerName)}<br/>
                    ${escapeHtml(input.buyerEmail)}<br/>
                    ${escapeHtml(input.buyerPhone || "—")}
                  </td>
                </tr>
                ${
                  input.recipientName &&
                  input.recipientName.trim() !== input.buyerName.trim()
                    ? `<tr>
                  <td style="padding:8px 0;border-top:1px solid #eee;font-size:14px;color:#666;">Příjemce</td>
                  <td style="padding:8px 0;border-top:1px solid #eee;font-size:14px;text-align:right;">${escapeHtml(input.recipientName)}</td>
                </tr>`
                    : ""
                }
                ${addressBlock}
              </table>
              <p style="margin:18px 0 6px;font-size:14px;color:#666;">Kódy poukazů</p>
              <ul style="margin:0;padding-left:1.1rem;font-size:15px;">${codes}</ul>
              ${message}
              <p style="margin:22px 0 0;font-size:13px;line-height:1.5;">
                <a href="${escapeHtml(`${adminUrl}/admin/poukazy`)}" style="color:#111;">Otevřít poukazy v adminu</a>
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

export { buildOpsFulfillmentEmailHtml };

/**
 * Interní mail pro provoz: pošta / vyzvednutí po zaplacení.
 */
export async function sendOpsFulfillmentEmail(
  input: SendOpsFulfillmentEmailInput,
) {
  if (input.deliveryMethod !== "post" && input.deliveryMethod !== "pickup") {
    return { ok: false as const, skipped: true as const, reason: "not_physical" as const };
  }

  const to = resolveOpsNotifyEmail(input.shopId);
  if (!to) {
    console.warn(
      "sendOpsFulfillmentEmail: chybí OPS_NOTIFY_EMAIL — interní e-mail přeskočen.",
    );
    return { ok: false as const, skipped: true as const, reason: "no_recipient" as const };
  }

  const brand = getShopBrand(input.shopId);
  const kindLabel =
    input.deliveryMethod === "post" ? "k odeslání" : "k vyzvednutí";
  const subject = `${brand.brandName}: objednávka ${input.orderNumber} ${kindLabel}`;

  return sendBrevoEmail({
    to,
    subject,
    htmlContent: buildOpsFulfillmentEmailHtml(input),
  });
}
