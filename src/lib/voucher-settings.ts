import {
  createInitialVoucherSettings,
  defaultCheckoutPreviewForExperienceId,
  MAX_AMOUNT_SLOTS,
  MAX_CHECKOUT_PREVIEW_IMAGES,
  MAX_GALLERY_IMAGES,
  type AdminExperienceForm,
  type AdminVoucherSettings,
  type VoucherCodePosition,
} from "@/data/admin-voucher-settings";
import {
  createDefaultAmountPreviews,
  type AmountPreviewSettings,
  type AmountVoucher,
  type ExperienceGalleryImage,
  type ExperienceVoucher,
} from "@/data/vouchers";

export type VoucherSettingsPayload = AdminVoucherSettings;

export function normalizeVoucherSettings(
  input: Partial<AdminVoucherSettings> | null | undefined,
): AdminVoucherSettings {
  const fallback = createInitialVoucherSettings();
  const amountSlots = Array.from({ length: MAX_AMOUNT_SLOTS }, (_, index) => {
    const value = input?.amountSlots?.[index];
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
  });

  const experiences = Array.isArray(input?.experiences)
    ? input.experiences.map(normalizeExperience)
    : fallback.experiences;

  const validityMonths = Number(input?.validityMonths);
  return {
    validityMonths: [6, 12, 24].includes(validityMonths)
      ? validityMonths
      : fallback.validityMonths,
    amountSlots,
    amountPreviews: normalizeAmountPreviews(
      input?.amountPreviews,
      amountSlots,
    ),
    experiences,
  };
}

function normalizeAmountPreviewImage(
  value: unknown,
): ExperienceGalleryImage | null {
  if (!value || typeof value !== "object") return null;
  const image = value as Partial<ExperienceGalleryImage>;
  if (typeof image.src !== "string" || !image.src.trim()) return null;
  return {
    src: image.src.trim(),
    alt: String(image.alt ?? ""),
  };
}

function normalizeAmountPreviews(
  input: Partial<AmountPreviewSettings> | null | undefined,
  amountSlots: (number | null)[],
): AmountPreviewSettings {
  if (!input || typeof input !== "object") {
    return createDefaultAmountPreviews(amountSlots);
  }

  const slotPreviews = Array.from({ length: MAX_AMOUNT_SLOTS }, (_, index) => {
    const value = input.slotPreviews?.[index];
    return normalizeAmountPreviewImage(value);
  });

  return {
    slotPreviews,
    customPreview: normalizeAmountPreviewImage(input.customPreview),
  };
}

function normalizeGalleryImages(
  images: unknown,
  max: number,
): ExperienceGalleryImage[] {
  if (!Array.isArray(images)) return [];
  return images
    .filter((image) => image && typeof image === "object")
    .map((image) => image as Partial<ExperienceGalleryImage>)
    .filter((image) => typeof image.src === "string" && image.src)
    .map((image) => ({
      src: String(image.src),
      alt: String(image.alt ?? ""),
    }))
    .slice(0, max);
}

function normalizeExperience(
  experience: Partial<AdminExperienceForm>,
): AdminExperienceForm {
  const id = String(experience.id || `experience-${Date.now()}`);
  const hasCheckoutPreviewKey = Object.prototype.hasOwnProperty.call(
    experience,
    "checkoutPreview",
  );

  return {
    id,
    title: String(experience.title ?? ""),
    subtitle: String(experience.subtitle ?? ""),
    suitableFor: String(experience.suitableFor ?? ""),
    price: Number.isFinite(Number(experience.price))
      ? Math.max(0, Number(experience.price))
      : 0,
    description: String(experience.description ?? ""),
    checkoutPreview: hasCheckoutPreviewKey
      ? normalizeGalleryImages(
          experience.checkoutPreview,
          MAX_CHECKOUT_PREVIEW_IMAGES,
        )
      : defaultCheckoutPreviewForExperienceId(id),
    gallery: normalizeGalleryImages(experience.gallery, MAX_GALLERY_IMAGES),
    infoLinks: Array.isArray(experience.infoLinks)
      ? experience.infoLinks.map((link) => ({
          label: String(link?.label ?? ""),
          href: String(link?.href ?? ""),
        }))
      : [{ label: "", href: "" }],
    pdfTemplate:
      experience.pdfTemplate &&
      typeof experience.pdfTemplate.url === "string" &&
      experience.pdfTemplate.url
        ? {
            url: String(experience.pdfTemplate.url),
            fileName: String(
              experience.pdfTemplate.fileName || "poukaz.pdf",
            ),
          }
        : null,
    codePosition: normalizeCodePosition(experience.codePosition),
    qrPosition: normalizeCodePosition(experience.qrPosition),
  };
}

function normalizeCodePosition(
  value: Partial<VoucherCodePosition> | null | undefined,
): VoucherCodePosition | null {
  if (!value || typeof value !== "object") return null;

  const x = Number(value.x);
  const y = Number(value.y);
  const width = Number(value.width);
  const height = Number(value.height);

  if (![x, y, width, height].every(Number.isFinite)) return null;

  return {
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y)),
    width: Math.max(1, Math.min(100, width)),
    height: Math.max(1, Math.min(100, height)),
  };
}

export function settingsToAmountVouchers(
  settings: AdminVoucherSettings,
): AmountVoucher[] {
  return settings.amountSlots
    .map((amount, index) =>
      amount === null || amount === undefined
        ? null
        : {
            id: `amount-${amount}-${index}`,
            amount,
          },
    )
    .filter((item): item is AmountVoucher => item !== null);
}

export function settingsToExperienceVouchers(
  settings: AdminVoucherSettings,
): ExperienceVoucher[] {
  return settings.experiences.map((experience) => ({
    id: experience.id,
    title: experience.title,
    subtitle: experience.subtitle || undefined,
    price: experience.price,
    description: experience.description,
    suitableFor: experience.suitableFor,
    infoLinks: experience.infoLinks.filter(
      (link) => link.label.trim() || link.href.trim(),
    ),
    gallery: experience.gallery,
    checkoutPreview: experience.checkoutPreview,
  }));
}
