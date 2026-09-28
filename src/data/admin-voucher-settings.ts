import {
  AMOUNT_VOUCHERS,
  createDefaultAmountPreviews,
  EXPERIENCE_VOUCHERS,
  type AmountPreviewSettings,
  type ExperienceGalleryImage,
  type ExperienceInfoLink,
} from "./vouchers";

export const VOUCHER_CODE_LENGTH = 8;
export const VOUCHER_CODE_INPUT_MAX_LENGTH = 16;
export const MAX_AMOUNT_SLOTS = 4;
export const MAX_GALLERY_IMAGES = 3;
export const MAX_CHECKOUT_PREVIEW_IMAGES = 2;
export const MOCK_VOUCHER_CODE = "K7M2P9QX";
export const MOCK_QR_URL = "https://www.longstoryshort.cz";

export type ShopId = "lss" | "bistrocentral" | "culinaryacademy";

/** Legacy brand prefixes still accepted on lookup. */
const LEGACY_CODE_PREFIXES = ["LSS", "BC"] as const;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCodeChar() {
  const index = Math.floor(Math.random() * CODE_ALPHABET.length);
  return CODE_ALPHABET[index] ?? "A";
}

/** Náhodný kód bez brand prefixu (8 znaků). */
export function generateVoucherCode() {
  let code = "";
  for (let index = 0; index < VOUCHER_CODE_LENGTH; index += 1) {
    code += randomCodeChar();
  }
  return code;
}

/**
 * Canonical kód pro lookup/uložení.
 * Nové: 8 alfanumerických znaků.
 * Legacy: LSS-XXXXXX / BC-XXXXXX.
 */
export function normalizeVoucherCode(raw: string) {
  const cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  if (!cleaned) return "";

  for (const prefix of LEGACY_CODE_PREFIXES) {
    const withSep = `${prefix}-`;
    if (cleaned.startsWith(withSep)) {
      const suffix = cleaned
        .slice(withSep.length)
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 6);
      return suffix ? `${prefix}-${suffix}` : "";
    }
  }

  // Legacy bez pomlčky jen u LSS (LSS + 6 znaků = 9). BC+6 by kolidovalo s novým 8znakým formátem.
  if (cleaned.startsWith("LSS") && cleaned.length === 9) {
    const suffix = cleaned.slice(3);
    if (/^[A-Z0-9]{6}$/.test(suffix)) {
      return `LSS-${suffix}`;
    }
  }

  return cleaned.replace(/[^A-Z0-9]/g, "").slice(0, VOUCHER_CODE_LENGTH);
}

/** Filtr vstupu v UI (uppercase, bez mezer; pomlčka jen u legacy). */
export function sanitizeVoucherCodeInput(raw: string) {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, VOUCHER_CODE_INPUT_MAX_LENGTH);
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
    heroImage: null,
  };
}
