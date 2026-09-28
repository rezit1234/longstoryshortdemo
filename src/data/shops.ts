import type { ShopId } from "@/data/admin-voucher-settings";

export type ShopBrand = {
  id: ShopId;
  brandName: string;
  amountLabel: string;
  bannerSrc: string;
  bannerAlt: string;
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
  },
  bistrocentral: {
    id: "bistrocentral",
    brandName: "Bistro Central",
    amountLabel: "Voucher",
    bannerSrc: "/bistrocentraldefault.jpeg",
    bannerAlt: "Fyzické dárkové poukazy Bistro Central",
    amountMarkSrc: "/bistrokruh.webp",
    keepShopBannerInCheckout: true,
  },
  culinaryacademy: {
    id: "culinaryacademy",
    brandName: "Culinary Academy",
    amountLabel: "Voucher",
    bannerSrc: "/ca.webp",
    bannerAlt: "Fyzické dárkové poukazy Culinary Academy",
    amountMarkSrc: "/CACA.webp",
    amountMarkCompact: true,
  },
};

export function getShopBrand(shopId: string = "lss"): ShopBrand {
  return SHOP_BRANDS[shopId as ShopId] ?? SHOP_BRANDS.lss;
}
