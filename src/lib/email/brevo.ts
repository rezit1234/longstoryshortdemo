import type { ShopId } from "@/data/admin-voucher-settings";

type BrevoAttachment = {
  name: string;
  content: Buffer;
};

type SendBrevoEmailInput = {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  attachments?: BrevoAttachment[];
  /** Odesílatel podle obchodu (EMAIL_FROM_LSS / …). */
  shopId?: ShopId;
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

export async function sendBrevoEmail(input: SendBrevoEmailInput) {
  const to = input.to.trim();
  if (!to) {
    return { ok: false as const, skipped: true as const, reason: "no_recipient" as const };
  }

  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) {
    console.warn("sendBrevoEmail: chybí BREVO_API_KEY - e-mail přeskočen.");
    return { ok: false as const, skipped: true as const, reason: "no_api_key" as const };
  }

  const sender = resolveEmailSender(input.shopId);
  if (!sender) {
    console.warn(
      "sendBrevoEmail: chybí EMAIL_FROM / odesílatel obchodu - e-mail přeskočen.",
    );
    return { ok: false as const, skipped: true as const, reason: "no_sender" as const };
  }

  const attachments = (input.attachments ?? []).map((file) => ({
    name: file.name,
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
        name: input.toName?.trim() || undefined,
      },
    ],
    subject: input.subject,
    htmlContent: input.htmlContent,
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
  } | null;

  if (!response.ok) {
    const message = body?.message || `Brevo API error (${response.status})`;
    console.error("sendBrevoEmail failed", body);
    return { ok: false as const, skipped: false as const, error: message };
  }

  return { ok: true as const, id: body?.messageId ?? null };
}
