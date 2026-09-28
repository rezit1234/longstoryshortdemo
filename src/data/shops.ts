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
