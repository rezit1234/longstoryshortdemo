import nodemailer from "nodemailer";
import type { ShopId } from "@/data/admin-voucher-settings";
import { getShopBrand } from "@/data/shops";

type BrevoAttachment = {
  name: string;
  content: Buffer;
};

type SendBrevoEmailInput = {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  /** Plain-text alternativa — lepší signál transakční pošty u filtrů (Seznam). */
  textContent?: string;
  attachments?: BrevoAttachment[];
  /** Odesílatel podle obchodu (EMAIL_FROM_LSS / …). */
  shopId?: ShopId;
};

type ParsedSender = { name: string; email: string };

const BREVO_SMTP_HOST = "smtp-relay.brevo.com";
const BREVO_SMTP_PORT = 587;
/** Content-ID loga v HTML (`src="cid:brand-logo"`). */
const INLINE_LOGO_CID = "brand-logo";

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

const SHOP_SENDER_ENV: Record<ShopId, string> = {
  lss: "EMAIL_FROM_LSS",
  bistrocentral: "EMAIL_FROM_BISTROCENTRAL",
  culinaryacademy: "EMAIL_FROM_CULINARYACADEMY",
};

/** Výchozí odesílatelé (fallback, když env chybí). */
const DEFAULT_SHOP_SENDERS: Record<ShopId, string> = {
  lss: "Dárkové poukazy LSS <lss-darkovepoukazy@longstoryshort.cz>",
  bistrocentral:
    "Dárkové poukazy Bistro Central <bc-darkovepoukazy@longstoryshort.cz>",
  culinaryacademy:
    "Dárkové poukazy Culinary Academy <ca-darkovepoukazy@longstoryshort.cz>",
};

export function resolveEmailSender(shopId?: ShopId): ParsedSender | null {
  if (shopId) {
    const fromShop =
      parseSender(process.env[SHOP_SENDER_ENV[shopId]]) ||
      parseSender(DEFAULT_SHOP_SENDERS[shopId]);
    if (fromShop) return fromShop;
  }

  return (
    parseSender(process.env.EMAIL_FROM) ||
    parseSender(process.env.BREVO_SENDER_EMAIL)
  );
}

function appBaseUrl() {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://longstoryshortwidget.vercel.app";
  return raw.replace(/\/$/, "");
}

/** Absolutní URL loga e-mailu daného obchodu (stejná logika jako v šablonách). */
function shopEmailLogoUrl(shopId: ShopId): string {
  const brand = getShopBrand(shopId);
  const logoSrc = brand.emailLogoSrc || brand.logoSrc;
  if (/^https?:\/\//i.test(logoSrc)) return logoSrc;
  const path = logoSrc.startsWith("/") ? logoSrc : `/${logoSrc}`;
  return `${appBaseUrl()}${path}`;
}

function smtpCredentials(): { user: string; pass: string } | null {
  const user = process.env.BREVO_SMTP_LOGIN?.trim();
  const pass = process.env.BREVO_SMTP_KEY?.trim();
  if (!user || !pass) return null;
  return { user, pass };
}

/**
 * Stáhne logo a připraví ho jako inline přílohu (cid). Brevo API / tracking
 * přepisuje vzdálené URL obrázků na vlastní doménu (sendibt…), což někde
 * končí jako rozbitý obrázek. Inline příloha přes SMTP tohle obejde.
 */
async function loadInlineLogo(logoUrl: string) {
  try {
    const response = await fetch(logoUrl, { cache: "no-store" });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "image/png";
    if (!contentType.startsWith("image/")) return null;
    const content = Buffer.from(await response.arrayBuffer());
    return { content, contentType };
  } catch {
    return null;
  }
}

async function sendViaSmtp(
  input: SendBrevoEmailInput,
  credentials: { user: string; pass: string },
  sender: ParsedSender,
) {
  let html = input.htmlContent;
  const inlineAttachments: {
    filename: string;
    content: Buffer;
    contentType: string;
    cid: string;
    contentDisposition: "inline";
  }[] = [];

  if (input.shopId) {
    const logoUrl = shopEmailLogoUrl(input.shopId);
    const logo = await loadInlineLogo(logoUrl);
    if (logo && html.includes(`src="${logoUrl}"`)) {
      html = html.split(`src="${logoUrl}"`).join(`src="cid:${INLINE_LOGO_CID}"`);
      inlineAttachments.push({
        filename: `${input.shopId}-logo.png`,
        content: logo.content,
        contentType: logo.contentType,
        cid: INLINE_LOGO_CID,
        contentDisposition: "inline",
      });
    }
  }

  const transport = nodemailer.createTransport({
    host: BREVO_SMTP_HOST,
    port: BREVO_SMTP_PORT,
    secure: false,
    requireTLS: true,
    auth: credentials,
  });

  try {
    const info = await transport.sendMail({
      from: { name: sender.name, address: sender.email },
      to: input.toName?.trim()
        ? { name: input.toName.trim(), address: input.to }
        : input.to,
      subject: input.subject,
      html,
      text: input.textContent?.trim() || undefined,
      attachments: [
        ...(input.attachments ?? []).map((file) => ({
          filename: file.name,
          content: file.content,
        })),
        ...inlineAttachments,
      ],
    });
    return { ok: true as const, id: info.messageId ?? null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "SMTP odeslání selhalo";
    console.error("sendBrevoEmail (SMTP) failed", message);
    return { ok: false as const, skipped: false as const, error: message };
  } finally {
    transport.close();
  }
}

export type BrevoSendResult =
  | { ok: true; id: string | null; skipped?: false; error?: undefined; reason?: undefined }
  | {
      ok: false;
      skipped: boolean;
      reason?: "no_recipient" | "no_sender" | "no_api_key";
      error?: string;
      id?: undefined;
    };

export async function sendBrevoEmail(input: SendBrevoEmailInput): Promise<BrevoSendResult> {
  const to = input.to.trim();
  if (!to) {
    return { ok: false as const, skipped: true as const, reason: "no_recipient" as const };
  }

  const sender = resolveEmailSender(input.shopId);
  if (!sender) {
    console.warn(
      "sendBrevoEmail: chybí EMAIL_FROM / odesílatel obchodu - e-mail přeskočen.",
    );
    return { ok: false as const, skipped: true as const, reason: "no_sender" as const };
  }

  const smtp = smtpCredentials();
  if (smtp) {
    return sendViaSmtp({ ...input, to }, smtp, sender);
  }

  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) {
    console.warn("sendBrevoEmail: chybí BREVO_API_KEY - e-mail přeskočen.");
    return { ok: false as const, skipped: true as const, reason: "no_api_key" as const };
  }

  const attachments = (input.attachments ?? []).map((file) => ({
    name: file.name,
    content: file.content.toString("base64"),
  }));

  // Seznam Email Profi řadí Brevo maily s trackingem (sendibt*) do Newsletters.
  // Vypnutí: Brevo → Settings → Contacts → Per-contact pixel tracking consent = Yes
  // a „Track contacts whose consent is unknown“ = No. API pak s false níže
  // tracking neaplikuje (bez sendibt odkazů / open pixelu).
  const payload: Record<string, unknown> = {
    sender: {
      name: sender.name,
      email: sender.email,
    },
    to: [
      {
        email: to,
        name: input.toName?.trim() || undefined,
        contactPixelTrackingConsent: false,
      },
    ],
    subject: input.subject,
    htmlContent: input.htmlContent,
    tags: ["transactional", "voucher"],
  };

  const textContent = input.textContent?.trim();
  if (textContent) {
    payload.textContent = textContent;
  }

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
  } | null;

  if (!response.ok) {
    const message = body?.message || `Brevo API error (${response.status})`;
    console.error("sendBrevoEmail failed", body);
    return { ok: false as const, skipped: false as const, error: message };
  }

  return { ok: true as const, id: body?.messageId ?? null };
}
