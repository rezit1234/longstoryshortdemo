import type { ShopId } from "@/data/admin-voucher-settings";

export type ShopBrand = {
  id: ShopId;
  brandName: string;
  amountLabel: string;
  bannerSrc: string;
  bannerAlt: string;
  /** Logo na výsledkové stránce platby apod. */
  logoSrc: string;
  /** Oficiální web podniku (návrat po platbě u widgetu). */
  websiteUrl: string;
  amountMarkSrc?: string;
  /** Menší středová značka v náhledu částkového poukazu. */
  amountMarkCompact?: boolean;
  keepShopBannerInCheckout?: boolean;
};

export const ALL_SHOP_IDS: ShopId[] = [
  "lss",
  "bistrocentral",
  "culinaryacademy",
];

export const SHOP_BRANDS: Record<ShopId, ShopBrand> = {
  lss: {
    id: "lss",
    brandName: "Long Story Short",
    amountLabel: "LSS Voucher",
    bannerSrc: "/LSSbanner.webp",
    bannerAlt: "Fyzické dárkové poukazy Long Story Short",
    logoSrc: "/logo.png",
    websiteUrl: "https://www.longstoryshort.cz",
  },
  bistrocentral: {
    id: "bistrocentral",
    brandName: "Bistro Central",
    amountLabel: "Voucher",
    bannerSrc: "/bistrocentraldefault.jpeg",
    bannerAlt: "Fyzické dárkové poukazy Bistro Central",
    logoSrc: "/bistrokruh.webp",
    websiteUrl: "https://www.bistrocentral.cz",
    amountMarkSrc: "/bistrokruh.webp",
    keepShopBannerInCheckout: true,
  },
  culinaryacademy: {
    id: "culinaryacademy",
    brandName: "Culinary Academy",
    amountLabel: "Voucher",
    bannerSrc: "/ca.webp",
    bannerAlt: "Fyzické dárkové poukazy Culinary Academy",
    logoSrc: "/CACA.webp",
    websiteUrl: "https://www.culinaryacademy.cz",
    amountMarkSrc: "/CACA.webp",
    amountMarkCompact: true,
  },
};

/**
 * Aktivní obchody (storefront + admin výběr).
 * Env: NEXT_PUBLIC_ENABLED_SHOPS=lss,bistrocentral
 * Culinary Academy se vrátí přidáním culinaryacademy do seznamu.
 * Bez env defaultně jen LSS + Bistro Central.
 */
const DEFAULT_ENABLED_SHOPS: ShopId[] = ["lss", "bistrocentral"];

function parseEnabledShopIds(): ShopId[] {
  const raw = process.env.NEXT_PUBLIC_ENABLED_SHOPS?.trim();
  if (!raw) return [...DEFAULT_ENABLED_SHOPS];

  const parsed = raw
    .split(/[,;\s]+/)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .filter((value): value is ShopId =>
      ALL_SHOP_IDS.includes(value as ShopId),
    );

  const unique = [...new Set(parsed)];
  return unique.length > 0 ? unique : [...DEFAULT_ENABLED_SHOPS];
}

let cachedEnabledShopIds: ShopId[] | null = null;

export function getEnabledShopIds(): ShopId[] {
  if (!cachedEnabledShopIds) {
    cachedEnabledShopIds = parseEnabledShopIds();
  }
  return cachedEnabledShopIds;
}

export function isShopEnabled(shopId: string | null | undefined): boolean {
  if (!shopId) return false;
  return getEnabledShopIds().includes(shopId as ShopId);
}

export function getEnabledShopBrands(): ShopBrand[] {
  return getEnabledShopIds().map((id) => SHOP_BRANDS[id]);
}

export function getShopBrand(shopId: string = "lss"): ShopBrand {
  return SHOP_BRANDS[shopId as ShopId] ?? SHOP_BRANDS.lss;
}

/** Odvození obchodu z čísla objednávky (LSS-… / BC-… / CA-…). */
export function shopIdFromOrderNumber(orderNumber: string): ShopId {
  const value = orderNumber.trim().toUpperCase();
  if (value.startsWith("BC-")) return "bistrocentral";
  if (value.startsWith("CA-")) return "culinaryacademy";
  return "lss";
}
