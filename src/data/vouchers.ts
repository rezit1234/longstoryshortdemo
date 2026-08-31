export type AmountVoucher = {
  id: string;
  amount: number;
};

export type AmountPreviewSettings = {
  slotPreviews: (ExperienceGalleryImage | null)[];
  customPreview: ExperienceGalleryImage | null;
};

export const AMOUNT_PREVIEW_DIR = "/poukazycastkanahled";
export const AMOUNT_PREVIEW_FALLBACK = "/poukazimg.jpeg";

export function amountPreviewSrcForValue(amount: number) {
  return `${AMOUNT_PREVIEW_DIR}/${amount}kc.webp`;
}

export function amountCustomPreviewSrc() {
  return `${AMOUNT_PREVIEW_DIR}/custom.webp`;
}

export function defaultAmountPreviewForValue(amount: number): ExperienceGalleryImage {
  return {
    src: amountPreviewSrcForValue(amount),
    alt: `Dárkový poukaz ${formatCzk(amount)}`,
  };
}

export function defaultAmountCustomPreview(): ExperienceGalleryImage {
  return {
    src: amountCustomPreviewSrc(),
    alt: "Dárkový poukaz na vlastní částku",
  };
}

export function createDefaultAmountPreviews(
  amountSlots: (number | null)[],
): AmountPreviewSettings {
  void amountSlots;
  return {
    slotPreviews: [null, null, null, null],
    customPreview: null,
  };
}

export function resolveAmountCheckoutPreview(
  amount: number,
  amountVouchers: AmountVoucher[],
  previews?: AmountPreviewSettings | null,
): ExperienceGalleryImage {
  const slotIndex = amountVouchers.findIndex((voucher) => voucher.amount === amount);
  const isPreset = slotIndex >= 0;

  if (isPreset) {
    const override = previews?.slotPreviews?.[slotIndex];
    if (override?.src) return override;
    return defaultAmountPreviewForValue(amount);
  }

  if (previews?.customPreview?.src) {
    return previews.customPreview;
  }

  return defaultAmountCustomPreview();
}

export type ExperienceInfoLink = {
  label: string;
  href: string;
};

export type ExperienceGalleryImage = {
  src: string;
  alt: string;
};

export type ExperienceVoucher = {
  id: string;
  title: string;
  subtitle?: string;
  price: number;
  description: string;
  suitableFor: string;
  infoLinks?: ExperienceInfoLink[];
  gallery?: ExperienceGalleryImage[];
  checkoutPreview?: ExperienceGalleryImage[];
};

export const AMOUNT_VOUCHERS: AmountVoucher[] = [
  { id: "amount-1000", amount: 1000 },
  { id: "amount-1500", amount: 1500 },
  { id: "amount-2000", amount: 2000 },
  { id: "amount-3000", amount: 3000 },
];

const LINK_EATERY: ExperienceInfoLink = {
  label: "Eatery Bakery",
  href: "https://www.longstoryshort.cz/cs-eatery-bakery",
};

const LINK_ROOMS: ExperienceInfoLink = {
  label: "Privátní pokoje",
  href: "https://www.longstoryshort.cz/privatni-pokoje",
};

const CHEFS_TABLE_RESERVATION =
  "Rezervaci na Chef's table si, prosím, vytvořte včas na telefonním čísle Eatery restaurace 727 800 900 nebo e-mailové adrese eatery@longstoryshort.cz.";

const CHEFS_TABLE_GALLERY: ExperienceGalleryImage[] = [
  { src: "/chefstable.webp", alt: "Chef's Table — fotografie 1" },
  { src: "/chefstable2.webp", alt: "Chef's Table — fotografie 2" },
  { src: "/chefstable3.webp", alt: "Chef's Table — fotografie 3" },
];

const THE_ARC_GALLERY: ExperienceGalleryImage[] = [
  { src: "/thearc.webp", alt: "The Arc — fotografie 1" },
  { src: "/thearc2.webp", alt: "The Arc — fotografie 2" },
  { src: "/thearc3.webp", alt: "The Arc — fotografie 3" },
];

const THE_NOOK_GALLERY: ExperienceGalleryImage[] = [
  { src: "/thenook.webp", alt: "The Nook — fotografie 1" },
  { src: "/thenook2.webp", alt: "The Nook — fotografie 2" },
  { src: "/thenook3.webp", alt: "The Nook — fotografie 3" },
];

const THE_BIG_ONE_GALLERY: ExperienceGalleryImage[] = [
  { src: "/thebigone.webp", alt: "The Big One — fotografie 1" },
  { src: "/thebigone2.webp", alt: "The Big One — fotografie 2" },
  { src: "/thebigone3.webp", alt: "The Big One — fotografie 3" },
];

const THE_FLAT_GALLERY: ExperienceGalleryImage[] = [
  { src: "/theflat.webp", alt: "The Flat — fotografie 1" },
  { src: "/theflat2.webp", alt: "The Flat — fotografie 2" },
  { src: "/theflat3.webp", alt: "The Flat — fotografie 3" },
];

const THE_BIG_ONE_CHEFS_TABLE_GALLERY: ExperienceGalleryImage[] = [
  ...THE_BIG_ONE_GALLERY,
  CHEFS_TABLE_GALLERY[0],
];

const THE_NOOK_CHEFS_TABLE_GALLERY: ExperienceGalleryImage[] = [
  ...THE_NOOK_GALLERY,
  CHEFS_TABLE_GALLERY[0],
];

const THE_ARC_CHEFS_TABLE_GALLERY: ExperienceGalleryImage[] = [
  ...THE_ARC_GALLERY,
  CHEFS_TABLE_GALLERY[0],
];

export const EXPERIENCE_VOUCHERS: ExperienceVoucher[] = [
  {
    id: "chefs-table",
    title: "Chef's Table",
    subtitle: "Dárkový poukaz",
    price: 1876,
    description: `Pětichodová večeře dle výběru šéfkuchaře bez vinného párování. Tento poukaz je vhodný pro 1 osobu. ${CHEFS_TABLE_RESERVATION}`,
    suitableFor: "1 osobu",
    infoLinks: [LINK_EATERY],
    gallery: CHEFS_TABLE_GALLERY,
  },
  {
    id: "chefs-table-wine",
    title: "Chef's Table s vinným párováním",
    subtitle: "Dárkový poukaz",
    price: 2543,
    description: `Pětichodová večeře dle výběru šéfkuchaře s vinným párováním. Tento poukaz je vhodný pro 1 osobu. ${CHEFS_TABLE_RESERVATION}`,
    suitableFor: "1 osobu",
    infoLinks: [LINK_EATERY],
    gallery: CHEFS_TABLE_GALLERY,
  },
  {
    id: "the-arc",
    title: "The Arc | „Výklenek“",
    subtitle: "Noc v privátním pokoji",
    price: 3600,
    description:
      "1 noc v privátním pokoji The Arc | „Výklenek“ s koupelnou. Snídaně je součástí dárkového poukazu. Tento poukaz je vhodný pro 1 nebo 2 osoby.",
    suitableFor: "1 nebo 2 osoby",
    infoLinks: [LINK_ROOMS],
    gallery: THE_ARC_GALLERY,
  },
  {
    id: "the-nook",
    title: "The Nook | „Koutek“",
    subtitle: "Noc v privátním pokoji",
    price: 4400,
    description:
      "1 noc v privátním pokoji The Nook | „Koutek“ s koupelnou. Snídaně je součástí dárkového poukazu. Tento poukaz je vhodný pro 1 nebo 2 osoby.",
    suitableFor: "1 nebo 2 osoby",
    infoLinks: [LINK_ROOMS],
    gallery: THE_NOOK_GALLERY,
  },
  {
    id: "the-big-one",
    title: "The Big One | „Ten Božský“",
    subtitle: "Noc v privátním pokoji",
    price: 5800,
    description:
      "1 noc v privátním pokoji The Big One | „Ten Božský“. Luxusní a prostorný pokoj s vanou v prostoru a privátní koupelnou. Snídaně je součástí dárkového poukazu. Tento poukaz je vhodný pro 1 nebo 2 osoby.",
    suitableFor: "1 nebo 2 osoby",
    infoLinks: [LINK_ROOMS],
    gallery: THE_BIG_ONE_GALLERY,
  },
  {
    id: "the-flat",
    title: "The Flat | „Byt“",
    subtitle: "Noc v apartmánu",
    price: 5700,
    description:
      "1 noc v „Bytě“ | The Flat. Luxusní, prostorný 2kk apartmán s oddělenou koupelnou a prostornou otevřenou kuchyní. Váš domov na cestách, ve kterém najdete vše, co budete potřebovat. Snídaně je součástí dárkového poukazu. Tento poukaz je vhodný pro 2 osoby nebo rodinu až se třemi dětmi.",
    suitableFor: "2 osoby nebo rodinu až se 3 dětmi",
    infoLinks: [LINK_ROOMS],
    gallery: THE_FLAT_GALLERY,
  },
  {
    id: "the-big-one-chefs-table",
    title: "The Big One & Chef's Table",
    subtitle: "S vinným párováním pro 2",
    price: 9500,
    description: `1 noc v privátním pokoji The Big One | „Ten Božský“ s koupelnou a s vanou v prostoru. Snídaně je součástí dárkového poukazu. Chef's table pro 2 — pětichodová večeře dle výběru šéfkuchaře s vinným párováním. Tento poukaz je vhodný pro 2 osoby. ${CHEFS_TABLE_RESERVATION}`,
    suitableFor: "2 osoby",
    infoLinks: [LINK_ROOMS, LINK_EATERY],
    gallery: THE_BIG_ONE_CHEFS_TABLE_GALLERY,
  },
  {
    id: "the-nook-chefs-table",
    title: "The Nook & Chef's Table",
    subtitle: "S vinným párováním pro 2",
    price: 8200,
    description: `1 noc v privátním pokoji The Nook | „Koutek“ s koupelnou. Snídaně je součástí dárkového poukazu. Chef's table pro 2 — pětichodová večeře dle výběru šéfkuchaře s vinným párováním. Tento poukaz je vhodný pro 2 osoby.`,
    suitableFor: "2 osoby",
    infoLinks: [LINK_ROOMS, LINK_EATERY],
    gallery: THE_NOOK_CHEFS_TABLE_GALLERY,
  },
  {
    id: "the-arc-chefs-table",
    title: "The Arc & Chef's Table",
    subtitle: "S vinným párováním pro 2",
    price: 7500,
    description: `1 noc v privátním pokoji The Arc | „Výklenek“ s koupelnou. Snídaně je součástí dárkového poukazu. Chef's table pro 2 — pětichodová večeře dle výběru šéfkuchaře s vinným párováním. Tento poukaz je vhodný pro 2 osoby.`,
    suitableFor: "2 osoby",
    infoLinks: [LINK_ROOMS, LINK_EATERY],
    gallery: THE_ARC_CHEFS_TABLE_GALLERY,
  },
];

export function formatCzk(amount: number): string {
  // cs-CZ uses narrow NBSP (U+202F) as thousands separator — too tight in UI fonts
  const formatted = amount
    .toLocaleString("cs-CZ")
    .replace(/[\u00A0\u202F\u2009]/g, " ");
  return `${formatted} Kč`;
}
