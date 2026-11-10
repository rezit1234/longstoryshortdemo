import type { ShopId } from "@/data/admin-voucher-settings";
import { getShopBrand } from "@/data/shops";
import { sendBrevoEmail } from "@/lib/email/brevo";
import { emailDetailRows } from "@/lib/email/email-detail-rows";
import { formatCzk } from "@/data/vouchers";

export type SendRedemptionStatusEmailInput = {
  shopId: ShopId;
  to: string;
  recipientName?: string;
  productName: string;
  code: string;
  validUntil: string;
  kind: "full" | "amount" | "part";
  amountCzk?: number | null;
  remainingCzk?: number | null;
  partLabel?: string | null;
  remainingPartLabels?: string[];
  fullyRedeemed?: boolean;
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
    "https://longstoryshortwidget.vercel.app";
  return raw.replace(/\/$/, "");
}

function shopLogoUrl(logoSrc: string) {
  if (/^https?:\/\//i.test(logoSrc)) return logoSrc;
  const path = logoSrc.startsWith("/") ? logoSrc : `/${logoSrc}`;
  return `${appBaseUrl()}${path}`;
}

function statusCopy(input: SendRedemptionStatusEmailInput) {
  if (input.kind === "amount") {
    const deducted = formatCzk(Number(input.amountCzk) || 0);
    const remaining = formatCzk(Number(input.remainingCzk) || 0);
    if (input.fullyRedeemed || Number(input.remainingCzk) === 0) {
      return `z vašeho poukazu bylo odečteno <strong>${escapeHtml(deducted)}</strong>. Poukaz je tímto plně uplatněný.`;
    }
    return `z vašeho poukazu bylo odečteno <strong>${escapeHtml(deducted)}</strong>. Zbývá <strong>${escapeHtml(remaining)}</strong>.`;
  }

  if (input.kind === "part") {
    const part = escapeHtml(input.partLabel || "část poukazu");
    const remaining = (input.remainingPartLabels ?? []).filter(Boolean);
    if (input.fullyRedeemed || remaining.length === 0) {
      return `z vašeho poukazu bylo uplatněno: <strong>${part}</strong>. Poukaz je tímto plně uplatněný.`;
    }
    return `z vašeho poukazu bylo uplatněno: <strong>${part}</strong>. Zbývá: <strong>${escapeHtml(remaining.join(", "))}</strong>.`;
  }

  return `váš poukaz byl <strong>plně uplatněn</strong>.`;
}

export function redemptionEmailSubject(
  input: Pick<SendRedemptionStatusEmailInput, "shopId">,
) {
  const brand = getShopBrand(input.shopId);
  return `Stav vašeho poukazu - ${brand.brandName}`;
}

export function buildRedemptionEmailHtml(input: SendRedemptionStatusEmailInput) {
  const brand = getShopBrand(input.shopId);
  const name = escapeHtml(input.recipientName || "vážení");
  const product = escapeHtml(input.productName);
  const code = escapeHtml(input.code);
  const validUntil = escapeHtml(input.validUntil);
  const brandName = escapeHtml(brand.brandName);
  const website = escapeHtml(brand.websiteUrl);
  const logoUrl = escapeHtml(
    shopLogoUrl(brand.emailLogoSrc || brand.logoSrc),
  );
  const body = statusCopy(input);

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
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;text-align:left;font-weight:700;">Stav vašeho poukazu</h1>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">Dobrý den, ${name},</p>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">informujeme vás, že ${body}</p>
              <table role="presentation" width="100%" style="margin:20px 0;border-collapse:collapse;">
                ${emailDetailRows([
                  { label: "Produkt", valueHtml: `<strong>${product}</strong>` },
                  {
                    label: "Kód poukazu",
                    valueHtml: `<strong style="letter-spacing:0.08em;">${code}</strong>`,
                    valueStyle: "font-size:16px;",
                  },
                  {
                    label: "Platnost do",
                    valueHtml: `<strong>${validUntil}</strong>`,
                  },
                ])}
              </table>
              <p style="margin:18px 0 0;font-size:14px;line-height:1.5;color:#444;">
                Tento e-mail slouží jen jako potvrzení stavu poukazu.
              </p>
              <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#777;">
                ${brandName}<br/>
                ${website.replace(/^https?:\/\//, "")}
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

export async function sendRedemptionStatusEmail(
  input: SendRedemptionStatusEmailInput,
) {
  return sendBrevoEmail({
    to: input.to,
    toName: input.recipientName,
    subject: redemptionEmailSubject(input),
    htmlContent: buildRedemptionEmailHtml(input),
    shopId: input.shopId,
  });
}
