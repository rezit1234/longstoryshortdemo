import {
  AMOUNT_VOUCHERS,
  createDefaultAmountPreviews,
  EXPERIENCE_VOUCHERS,
  type AmountPreviewSettings,
  type ExperienceGalleryImage,
  type ExperienceInfoLink,
} from "./vouchers";

/**
 * Celková max. délka nového kódu včetně prefixu.
 * LSS + 4 = LSSXXXX, BC/CA + 5 = BCXXXXX / CAXXXXX.
 */
export const VOUCHER_CODE_TOTAL_LENGTH = 7;
/** @deprecated Použij voucherCodeBodyLength(shopId) — délka body závisí na prefixu. */
export const VOUCHER_CODE_BODY_LENGTH = 5;
/** Max délka celého nového kódu (včetně prefixu). */
export const VOUCHER_CODE_LENGTH = VOUCHER_CODE_TOTAL_LENGTH;
/** Lookup / uplatnění — i legacy kódy z Vouchy bez LSS/BC/CA. */
export const VOUCHER_CODE_LEGACY_MAX_LENGTH = 32;
/** Max délka vstupu v UI (uplatnění i legacy). Nové vystavení limituje VOUCHER_CODE_LENGTH. */
export const VOUCHER_CODE_INPUT_MAX_LENGTH = VOUCHER_CODE_LEGACY_MAX_LENGTH;
export const MAX_AMOUNT_SLOTS = 4;
export const MAX_GALLERY_IMAGES = 3;
export const MAX_CHECKOUT_PREVIEW_IMAGES = 2;
export const MOCK_VOUCHER_CODE = "LSSK7M2";
export const MOCK_QR_URL = "https://www.longstoryshort.cz";

export type ShopId = "lss" | "bistrocentral" | "culinaryacademy";

/** Prefix kódu podle obchodu. CA u Culinary Academy je dočasné. */
export const SHOP_CODE_PREFIXES: Record<ShopId, string> = {
  lss: "LSS",
  bistrocentral: "BC",
  culinaryacademy: "CA",
};

/** Delší prefixy první (LSS před BC/CA). */
export const VOUCHER_CODE_PREFIXES = ["LSS", "BC", "CA"] as const;
export type VoucherCodePrefix = (typeof VOUCHER_CODE_PREFIXES)[number];

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCodeChar() {
  const index = Math.floor(Math.random() * CODE_ALPHABET.length);
  return CODE_ALPHABET[index] ?? "A";
}

export function shopCodePrefix(shopId: ShopId) {
  return SHOP_CODE_PREFIXES[shopId] ?? SHOP_CODE_PREFIXES.lss;
}

/** Počet náhodných znaků za prefixem, aby celkem vyšlo VOUCHER_CODE_TOTAL_LENGTH. */
export function voucherCodeBodyLength(shopIdOrPrefix: ShopId | string) {
  const prefix =
    shopIdOrPrefix in SHOP_CODE_PREFIXES
      ? shopCodePrefix(shopIdOrPrefix as ShopId)
      : String(shopIdOrPrefix);
  return Math.max(1, VOUCHER_CODE_TOTAL_LENGTH - prefix.length);
}

function generateCodeBody(length: number) {
  let body = "";
  for (let index = 0; index < length; index += 1) {
    body += randomCodeChar();
  }
  return body;
}

/** Náhodný kód: prefix + body, celkem max 7 znaků (např. LSSK7M2 / BCR6FE6). */
export function generateVoucherCode(shopId: ShopId = "lss") {
  const prefix = shopCodePrefix(shopId);
  return `${prefix}${generateCodeBody(voucherCodeBodyLength(shopId))}`;
}

function matchShopPrefix(cleaned: string): VoucherCodePrefix | null {
  for (const prefix of VOUCHER_CODE_PREFIXES) {
    if (cleaned.startsWith(prefix)) return prefix;
  }
  return null;
}

/**
 * Canonical kód pro lookup.
 * Nový formát: celkem max 7 znaků včetně prefixu; legacy (Vouchy) bez agresivního ořezu.
 */
export function normalizeVoucherCode(raw: string) {
  const cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!cleaned) return "";

  const prefix = matchShopPrefix(cleaned);
  if (prefix) {
    const rest = cleaned.slice(prefix.length);
    const maxBody = voucherCodeBodyLength(prefix);
    // Nový formát / rozepsané zadávání: prefix + body do limitu.
    // Delší zbytek = legacy kód, který náhodou začíná LSS/BC/CA.
    if (rest.length <= maxBody) {
      return `${prefix}${rest}`;
    }
    return cleaned.slice(0, VOUCHER_CODE_LEGACY_MAX_LENGTH);
  }

  return cleaned.slice(0, VOUCHER_CODE_LEGACY_MAX_LENGTH);
}

/** Doplní / přepíše prefix podle obchodu při vytváření. */
export function applyShopCodePrefix(raw: string, shopId: ShopId) {
  const prefix = shopCodePrefix(shopId);
  const cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!cleaned) return "";

  const existingPrefix = matchShopPrefix(cleaned);
  const body = (
    existingPrefix ? cleaned.slice(existingPrefix.length) : cleaned
  ).slice(0, voucherCodeBodyLength(shopId));

  if (!body) return "";
  return `${prefix}${body}`;
}

export function isValidNewVoucherCode(normalized: string) {
  return VOUCHER_CODE_PREFIXES.some((prefix) => {
    const bodyLen = voucherCodeBodyLength(prefix);
    return (
      normalized.length === prefix.length + bodyLen &&
      normalized.length === VOUCHER_CODE_TOTAL_LENGTH &&
      normalized.startsWith(prefix) &&
      /^[A-Z0-9]+$/.test(normalized.slice(prefix.length))
    );
  });
}

/**
 * Kandidáti pro lookup při uplatnění.
 * - s prefixem → jeden kód
 * - jen body (4 / 5 znaků) → doplní odpovídající prefixy (LSS / BC+CA)
 * - jinak → raw (legacy)
 */
export function resolveVoucherLookupCodes(raw: string): string[] {
  const cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!cleaned) return [];

  const prefix = matchShopPrefix(cleaned);
  if (prefix) {
    const normalized = normalizeVoucherCode(cleaned);
    return normalized ? [normalized] : [];
  }

  const candidates: string[] = [];
  for (const shopPrefix of VOUCHER_CODE_PREFIXES) {
    if (cleaned.length !== voucherCodeBodyLength(shopPrefix)) continue;
    candidates.push(`${shopPrefix}${cleaned}`);
  }

  if (candidates.length > 0) return candidates;
  return [cleaned];
}

/** Filtr vstupu v UI (uppercase, jen A–Z / 0–9). */
export function sanitizeVoucherCodeInput(
  raw: string,
  maxLength: number = VOUCHER_CODE_INPUT_MAX_LENGTH,
) {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, maxLength);
}

const EATERY_CHECKOUT_PREVIEW: ExperienceGalleryImage = {
  src: "/eatery-bakery.webp",
  alt: "Dárkový poukaz Eatery Bakery",
};

const HOSTEL_CHECKOUT_PREVIEW: ExperienceGalleryImage = {
  src: "/hostel.webp",
  alt: "Dárkový poukaz Hostel",
};

const ROOM_ID_MARKERS = [
  "the-arc",
  "the-nook",
  "the-big-one",
  "the-flat",
] as const;

/** Výchozí náhledy checkoutu podle typu varianty (1 = full, 2 = 50/50). */
export function defaultCheckoutPreviewForExperienceId(
  id: string,
): ExperienceGalleryImage[] {
  const normalized = id.toLowerCase();
  const hasRoom = ROOM_ID_MARKERS.some((marker) => normalized.includes(marker));
  const hasChefs = normalized.includes("chefs-table");

  if (hasRoom && hasChefs) {
    return [EATERY_CHECKOUT_PREVIEW, HOSTEL_CHECKOUT_PREVIEW];
  }

  if (hasChefs) {
    return [EATERY_CHECKOUT_PREVIEW];
  }

  return [HOSTEL_CHECKOUT_PREVIEW];
}

export type ExperiencePdfTemplate = {
  url: string;
  fileName: string;
};

export type VoucherCodePosition = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** 1-based číslo stránky PDF (výchozí 1). */
  page?: number;
};

export function normalizePositionPage(page: unknown, fallback = 1) {
  const value = Number(page);
  if (!Number.isFinite(value) || value < 1) return fallback;
  return Math.min(50, Math.floor(value));
}

export function createDefaultCodePosition(): VoucherCodePosition {
  return {
    x: 20,
    y: 18,
    width: 28,
    height: 5,
    page: 1,
  };
}

export function createDefaultQrPosition(): VoucherCodePosition {
  return {
    x: 44,
    y: 44,
    width: 12,
    height: 12,
    page: 1,
  };
}

export function createCenteredQrPosition(
  stageWidthPx: number,
  stageHeightPx: number,
  sizePercent = 12,
  page = 1,
): VoucherCodePosition {
  const width = Math.max(8, Math.min(40, sizePercent));
  const height =
    stageWidthPx > 0 && stageHeightPx > 0
      ? (width * stageWidthPx) / stageHeightPx
      : width;

  return {
    x: Math.max(0, (100 - width) / 2),
    y: Math.max(0, (100 - height) / 2),
    width,
    height,
    page: normalizePositionPage(page),
  };
}

export function formatCodePositionLabel(position: VoucherCodePosition): string {
  const page = normalizePositionPage(position.page);
  return `Str. ${page} · X ${Math.round(position.x)}, Y ${Math.round(position.y)}`;
}

export type ExperienceVatMode = "single" | "combined";

export type ExperienceVatSettings = {
  mode: ExperienceVatMode;
  /** Jedna sazba v % (12, 21 nebo vlastní). */
  singleRate: number;
  /** Kombinovaná: sazba A v %. */
  rateA: number;
  /** Kombinovaná: částka v Kč daněná sazbou A. */
  amountA: number;
  /** Kombinovaná: sazba B v % na zbytek ceny. */
  rateB: number;
};

export const DEFAULT_EXPERIENCE_VAT: ExperienceVatSettings = {
  mode: "single",
  singleRate: 21,
  rateA: 12,
  amountA: 0,
  rateB: 21,
};

export function formatExperienceVatLabel(
  vat: ExperienceVatSettings,
  price: number,
): string {
  if (vat.mode === "combined") {
    const amountA = Math.max(0, Math.min(price, vat.amountA));
    if (amountA <= 0) return `${formatVatPercent(vat.rateB)}`;
    if (amountA >= price) return `${formatVatPercent(vat.rateA)}`;
    return `${formatVatPercent(vat.rateA)} + ${formatVatPercent(vat.rateB)}`;
  }
  return formatVatPercent(vat.singleRate);
}

function formatVatPercent(rate: number) {
  const normalized = Number.isFinite(rate) ? rate : 0;
  const text = Number.isInteger(normalized)
    ? String(normalized)
    : String(Math.round(normalized * 100) / 100);
  return `${text} %`;
}

export type AdminExperienceForm = {
  id: string;
  title: string;
  subtitle: string;
  suitableFor: string;
  price: number;
  vat: ExperienceVatSettings;
  description: string;
  checkoutPreview: ExperienceGalleryImage[];
  gallery: ExperienceGalleryImage[];
  infoLinks: ExperienceInfoLink[];
  pdfTemplate: ExperiencePdfTemplate | null;
  codePosition: VoucherCodePosition | null;
  qrPosition: VoucherCodePosition | null;
};

function createExperienceId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `experience-${crypto.randomUUID()}`;
  }

  return `experience-${Date.now()}`;
}

export function createEmptyExperience(): AdminExperienceForm {
  return {
    id: createExperienceId(),
    title: "",
    subtitle: "",
    suitableFor: "",
    price: 0,
    vat: { ...DEFAULT_EXPERIENCE_VAT },
    description: "",
    checkoutPreview: [],
    gallery: [],
    infoLinks: [{ label: "", href: "" }],
    pdfTemplate: null,
    codePosition: null,
    qrPosition: null,
  };
}

export const DEFAULT_PICKUP_FEE = 20;
export const DEFAULT_POST_SHIPPING_FEE = 105;
export const DEFAULT_POST_SHIPPING_FEE_SK = 145;

function defaultVatForSeedExperience(
  experienceId: string,
  price: number,
): ExperienceVatSettings {
  // Sensible defaults matching the client’s DPH categories (demo seed only).
  if (experienceId.includes("arc") || experienceId.includes("vyklenek")) {
    return {
      mode: "combined",
      singleRate: 21,
      rateA: 12,
      amountA: Math.round(price * 0.45),
      rateB: 21,
    };
  }
  if (
    experienceId.includes("chefs-table") ||
    experienceId.includes("chef")
  ) {
    return { ...DEFAULT_EXPERIENCE_VAT, singleRate: 21 };
  }
  return { ...DEFAULT_EXPERIENCE_VAT, singleRate: 12 };
}

export type DeliveryMethodId = "email" | "post" | "pickup";

/** Zapnuté způsoby doručení poukazu ve widgetu (per shop). */
export type DeliveryMethodsSettings = {
  email: boolean;
  post: boolean;
  pickup: boolean;
};

export const DEFAULT_DELIVERY_METHODS: DeliveryMethodsSettings = {
  email: true,
  post: true,
  pickup: true,
};

export type AdminVoucherSettings = {
  validityMonths: number;
  amountSlots: (number | null)[];
  amountPreviews: AmountPreviewSettings;
  experiences: AdminExperienceForm[];
  /** Příplatek za dárkové balení při vyzvednutí na recepci. */
  pickupFee: number;
  /** Poštovné a balné při odeslání po ČR. */
  postShippingFee: number;
  /** Poštovné a balné při odeslání na Slovensko. */
  postShippingFeeSk: number;
  /** Které způsoby doručení jsou ve widgetu nabízené. */
  deliveryMethods: DeliveryMethodsSettings;
  heroImage: ExperienceGalleryImage | null;
};

export function createInitialVoucherSettings(
  shopId: ShopId | string = "lss",
): AdminVoucherSettings {
  const isLss = shopId === "lss";

  const amountSlots = Array.from({ length: MAX_AMOUNT_SLOTS }, (_, index) => {
    if (!isLss) return null;
    return AMOUNT_VOUCHERS[index]?.amount ?? null;
  });

  const experiences = isLss
    ? EXPERIENCE_VOUCHERS.map((experience) => ({
        id: experience.id,
        title: experience.title,
        subtitle: experience.subtitle ?? "",
        suitableFor: experience.suitableFor,
        price: experience.price,
        vat: defaultVatForSeedExperience(experience.id, experience.price),
        description: experience.description,
        checkoutPreview: defaultCheckoutPreviewForExperienceId(experience.id),
        gallery: (experience.gallery ?? []).slice(0, MAX_GALLERY_IMAGES),
        infoLinks:
          experience.infoLinks && experience.infoLinks.length > 0
            ? experience.infoLinks.map((link) => ({ ...link }))
            : [{ label: "", href: "" }],
        pdfTemplate: null,
        codePosition: null,
        qrPosition: null,
      }))
    : [];

  return {
    validityMonths: 12,
    amountSlots,
    amountPreviews: createDefaultAmountPreviews(amountSlots),
    experiences,
    pickupFee: DEFAULT_PICKUP_FEE,
    postShippingFee: DEFAULT_POST_SHIPPING_FEE,
    postShippingFeeSk: DEFAULT_POST_SHIPPING_FEE_SK,
    deliveryMethods: { ...DEFAULT_DELIVERY_METHODS },
    heroImage: null,
  };
}

export function normalizeDeliveryMethods(
  value: unknown,
  fallback: DeliveryMethodsSettings = DEFAULT_DELIVERY_METHODS,
): DeliveryMethodsSettings {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;

  const next: DeliveryMethodsSettings = {
    email: typeof record?.email === "boolean" ? record.email : fallback.email,
    post: typeof record?.post === "boolean" ? record.post : fallback.post,
    pickup:
      typeof record?.pickup === "boolean" ? record.pickup : fallback.pickup,
  };

  // Alespoň jedna metoda musí zůstat zapnutá.
  if (!next.email && !next.post && !next.pickup) {
    return { ...fallback };
  }
  return next;
}

export function enabledDeliveryMethods(
  methods: DeliveryMethodsSettings,
): DeliveryMethodId[] {
  const ids: DeliveryMethodId[] = [];
  if (methods.email) ids.push("email");
  if (methods.post) ids.push("post");
  if (methods.pickup) ids.push("pickup");
  return ids.length > 0 ? ids : (["email"] as DeliveryMethodId[]);
}
