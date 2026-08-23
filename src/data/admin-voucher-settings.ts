import {
  AMOUNT_VOUCHERS,
  EXPERIENCE_VOUCHERS,
  type ExperienceGalleryImage,
  type ExperienceInfoLink,
} from "./vouchers";

export const VOUCHER_CODE_PREFIX = "LSS";
export const MAX_AMOUNT_SLOTS = 4;
export const MAX_GALLERY_IMAGES = 4;

export type AdminExperienceForm = {
  id: string;
  title: string;
  subtitle: string;
  suitableFor: string;
  price: number;
  description: string;
  gallery: ExperienceGalleryImage[];
  infoLinks: ExperienceInfoLink[];
};

export type AdminVoucherSettings = {
  validityMonths: number;
  amountSlots: (number | null)[];
  experiences: AdminExperienceForm[];
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
    gallery: (experience.gallery ?? []).slice(0, MAX_GALLERY_IMAGES),
    infoLinks:
      experience.infoLinks && experience.infoLinks.length > 0
        ? experience.infoLinks.map((link) => ({ ...link }))
        : [{ label: "", href: "" }],
  }));

  return {
    validityMonths: 12,
    amountSlots,
    experiences,
  };
}
