import {
  AMOUNT_VOUCHERS,
  createDefaultAmountPreviews,
  EXPERIENCE_VOUCHERS,
  type AmountPreviewSettings,
  type ExperienceGalleryImage,
  type ExperienceInfoLink,
} from "./vouchers";

export const VOUCHER_CODE_PREFIX = "LSS";
export const VOUCHER_CODE_SEPARATOR = "-";
export const VOUCHER_CODE_PREFIX_DISPLAY = `${VOUCHER_CODE_PREFIX}${VOUCHER_CODE_SEPARATOR}`;
export const VOUCHER_CODE_SUFFIX_LENGTH = 6;
export const MAX_AMOUNT_SLOTS = 4;
export const MAX_GALLERY_IMAGES = 4;
export const MAX_CHECKOUT_PREVIEW_IMAGES = 2;
export const MOCK_VOUCHER_CODE = `${VOUCHER_CODE_PREFIX_DISPLAY}1A2B3C`;
export const MOCK_QR_URL = "https://www.longstoryshort.cz";

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

export function buildVoucherCode(suffix: string) {
  const normalized = suffix.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return `${VOUCHER_CODE_PREFIX_DISPLAY}${normalized.slice(0, VOUCHER_CODE_SUFFIX_LENGTH)}`;
}

/** Vytáhne 6znakový suffix z libovolného zápisu (1A2B3C / LSS-1A2B3C / LSS1A2B3C). */
export function extractVoucherCodeSuffix(raw: string) {
  let value = raw.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");

  if (value.startsWith(`${VOUCHER_CODE_PREFIX}-`)) {
    value = value.slice(VOUCHER_CODE_PREFIX_DISPLAY.length);
  } else if (value.startsWith(VOUCHER_CODE_PREFIX)) {
    value = value.slice(VOUCHER_CODE_PREFIX.length);
  }

  return value.replace(/[^A-Z0-9]/g, "").slice(0, VOUCHER_CODE_SUFFIX_LENGTH);
}

export function normalizeVoucherCode(raw: string) {
  const suffix = extractVoucherCodeSuffix(raw);
  if (!suffix) return "";
  return buildVoucherCode(suffix);
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
};

export function createDefaultCodePosition(): VoucherCodePosition {
  return {
    x: 20,
    y: 18,
    width: 28,
    height: 5,
  };
}

export function createDefaultQrPosition(): VoucherCodePosition {
  return {
    x: 44,
    y: 44,
    width: 12,
    height: 12,
  };
}

export function createCenteredQrPosition(
  stageWidthPx: number,
  stageHeightPx: number,
  sizePercent = 12,
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
  };
}

export function formatCodePositionLabel(position: VoucherCodePosition): string {
  return `X ${Math.round(position.x)}, Y ${Math.round(position.y)}`;
}

export type AdminExperienceForm = {
  id: string;
  title: string;
  subtitle: string;
  suitableFor: string;
  price: number;
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

export type AdminVoucherSettings = {
  validityMonths: number;
  amountSlots: (number | null)[];
  amountPreviews: AmountPreviewSettings;
  experiences: AdminExperienceForm[];
  /** Příplatek za dárkové balení při vyzvednutí na recepci. */
  pickupFee: number;
  /** Poštovné a balné při odeslání poštou. */
  postShippingFee: number;
};

export function createInitialVoucherSettings(): AdminVoucherSettings {
  const amountSlots = Array.from({ length: MAX_AMOUNT_SLOTS }, (_, index) => {
    return AMOUNT_VOUCHERS[index]?.amount ?? null;
  });

  const experiences = EXPERIENCE_VOUCHERS.map((experience) => ({
    id: experience.id,
    title: experience.title,
    subtitle: experience.subtitle ?? "",
    suitableFor: experience.suitableFor,
    price: experience.price,
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
  }));

  return {
    validityMonths: 12,
    amountSlots,
    amountPreviews: createDefaultAmountPreviews(amountSlots),
    experiences,
    pickupFee: DEFAULT_PICKUP_FEE,
    postShippingFee: DEFAULT_POST_SHIPPING_FEE,
  };
}
