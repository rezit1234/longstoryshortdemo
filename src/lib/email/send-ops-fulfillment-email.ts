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
  deliveryMethod: "post" | "pickup";
  productName: string;
  quantity: number;
  codes: string[];
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  recipientName?: string;
  /** E-mail obdarovaného (když se kupuje pro někoho jiného). */
  recipientEmail?: string | null;
  shippingAddress?: OpsFulfillmentShippingAddress | null;
  message?: string | null;
  unitPriceCzk: number;
  shippingFeeCzk: number;
};

const DEFAULT_OPS_NOTIFY_EMAIL = "tomas@rezit.cz";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Příjemce interních notifikací: per-shop → OPS_NOTIFY_EMAIL → výchozí test. */
export function resolveOpsNotifyEmail(shopId: ShopId): string {
  const perShopKey = {
    lss: "OPS_NOTIFY_EMAIL_LSS",
    bistrocentral: "OPS_NOTIFY_EMAIL_BISTROCENTRAL",
    culinaryacademy: "OPS_NOTIFY_EMAIL_CULINARYACADEMY",
  }[shopId];

  return (
    process.env[perShopKey]?.trim() ||
    process.env.OPS_NOTIFY_EMAIL?.trim() ||
    DEFAULT_OPS_NOTIFY_EMAIL
  );
}

function formatCzk(amount: number) {
  return `${Math.round(amount).toLocaleString("cs-CZ")} Kč`;
}

function deliveryMethodLabel(method: "post" | "pickup") {
  return method === "post"
    ? "Odeslání poštou"
    : "Vyzvednutí na pobočce";
}

export function opsFulfillmentEmailSubject(
  input: Pick<SendOpsFulfillmentEmailInput, "shopId" | "deliveryMethod">,
) {
  const brand = getShopBrand(input.shopId);
  const kind =
    input.deliveryMethod === "post" ? "k odeslání" : "k vyzvednutí";
  return `Právě jste prodali dárkový poukaz (${kind}) — ${brand.brandName}`;
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

function detailRow(
  label: string,
  valueHtml: string,
  options?: { first?: boolean; last?: boolean; valueStyle?: string },
) {
  const borderTop = options?.first ? "" : "border-top:1px solid #eee;";
  const borderBottom = options?.last ? "border-bottom:1px solid #eee;" : "";
  const valueStyle = options?.valueStyle ?? "";
  return `<tr>
    <td style="padding:8px 0;${borderTop}${borderBottom}font-size:14px;color:#666;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:8px 0;${borderTop}${borderBottom}font-size:14px;text-align:right;${valueStyle}">${valueHtml}</td>
  </tr>`;
}

function personBlock(name: string, email?: string | null) {
  const safeName = escapeHtml(name);
  const safeEmail = email?.trim() ? escapeHtml(email.trim()) : "";
  if (!safeEmail) return safeName;
  return `${safeName}<br/>${safeEmail}`;
}

export function buildOpsFulfillmentEmailHtml(
  input: SendOpsFulfillmentEmailInput,
) {
  const brand = getShopBrand(input.shopId);
  const isPost = input.deliveryMethod === "post";
  const total = input.unitPriceCzk * input.quantity + input.shippingFeeCzk;
  const brandName = escapeHtml(brand.brandName);
  const website = escapeHtml(brand.websiteUrl);
  const logoUrl = escapeHtml(shopLogoUrl(brand.logoSrc));
  const amountLabel = escapeHtml(formatCzk(input.unitPriceCzk));
  const soldIntro =
    input.quantity > 1
      ? `prodali jste ${input.quantity} dárkové poukazy na částku ${amountLabel}`
      : `prodali jste dárkový poukaz na částku ${amountLabel}`;
  const action =
    input.deliveryMethod === "post"
      ? "Připravte prosím dárkové balení a následně poukaz odešlete poštou."
      : "Připravte prosím poukaz k osobnímu vyzvednutí na pobočce.";
  const introHtml = `Dobrý den, ${soldIntro}. ${action}`;

  const recipientName = input.recipientName?.trim() || "";
  const recipientEmail = input.recipientEmail?.trim() || "";
  const isGift =
    Boolean(recipientName) &&
    recipientName.toLowerCase() !== input.buyerName.trim().toLowerCase();

  const codesHtml = input.codes
    .map(
      (code) =>
        `<strong style="letter-spacing:0.08em;">${escapeHtml(code)}</strong>`,
    )
    .join("<br/>");

  const addressHtml =
    isPost && input.shippingAddress
      ? `${escapeHtml(input.shippingAddress.name)}<br/>${escapeHtml(input.shippingAddress.address)}<br/>${escapeHtml(input.shippingAddress.postalCode)} ${escapeHtml(input.shippingAddress.city)}<br/>${escapeHtml(input.shippingAddress.country)}`
      : "";

  const message = input.message?.trim()
    ? `<p style="margin:16px 0 0;padding:12px 14px;background:#f5f5f5;border-radius:8px;"><strong>Vzkaz:</strong><br/>${escapeHtml(input.message.trim())}</p>`
    : "";

  const productLabel =
    input.quantity > 1
      ? `${escapeHtml(input.productName)} · ${input.quantity}×`
      : escapeHtml(input.productName);

  const ctaLabel =
    input.codes.length === 1
      ? "Otevřít poukaz v administraci"
      : "Otevřít poukazy v administraci";
  const ctaHref = escapeHtml(`${appBaseUrl()}/admin/poukazy`);

  const rows = [
    detailRow(
      "Zakoupil",
      personBlock(input.buyerName, input.buyerEmail),
      { first: true },
    ),
    isGift
      ? detailRow("Pro", personBlock(recipientName, recipientEmail))
      : "",
    detailRow(
      "Způsob doručení",
      escapeHtml(deliveryMethodLabel(input.deliveryMethod)),
    ),
    addressHtml ? detailRow("Adresa", addressHtml) : "",
    detailRow("Telefon", escapeHtml(input.buyerPhone || "—")),
    detailRow("Produkt", `<strong>${productLabel}</strong>`),
    input.shippingFeeCzk > 0
      ? detailRow("Doprava", escapeHtml(formatCzk(input.shippingFeeCzk)))
      : "",
    detailRow("Kód poukazu", codesHtml, {
      valueStyle: "font-size:16px;",
    }),
    detailRow("Celkem", `<strong>${escapeHtml(formatCzk(total))}</strong>`),
  ]
    .filter(Boolean)
    .join("");

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
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;text-align:left;font-weight:700;">Právě jste prodali dárkový poukaz</h1>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">${introHtml}</p>
              <table role="presentation" width="100%" style="margin:20px 0;border-collapse:collapse;">
                ${rows}
              </table>
              ${message}
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:22px 0 0;">
                <tr>
                  <td style="border-radius:999px;background:#111;">
                    <a href="${ctaHref}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;line-height:1;color:#ffffff;text-decoration:none;border-radius:999px;">
                      ${escapeHtml(ctaLabel)}
                    </a>
                  </td>
                </tr>
              </table>
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
 * Interní mail pro provoz: jen pošta / vyzvednutí po zaplacení.
 */
export async function sendOpsFulfillmentEmail(
  input: SendOpsFulfillmentEmailInput,
) {
  if (input.deliveryMethod !== "post" && input.deliveryMethod !== "pickup") {
    return {
      ok: false as const,
      skipped: true as const,
      reason: "not_physical" as const,
    };
  }

  const to = resolveOpsNotifyEmail(input.shopId);

  return sendBrevoEmail({
    to,
    subject: opsFulfillmentEmailSubject(input),
    htmlContent: buildOpsFulfillmentEmailHtml(input),
    shopId: input.shopId,
  });
}
