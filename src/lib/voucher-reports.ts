import {
  createInitialVoucherSettings,
  formatExperienceVatLabel,
  type AdminVoucherSettings,
  type ShopId,
} from "@/data/admin-voucher-settings";
import { normalizeVoucherSettings } from "@/lib/voucher-settings";

export type ReportShopFilter = "all" | ShopId;
export type ReportTaxRegime = "vouchy" | "legacy";
export type ReportVoucherStatus = "Aktivní" | "Uplatněný" | "Expirovaný";

export type ReportCatalogVariant = {
  id: string;
  name: string;
  amountCzk: number;
  vatLabel: string;
  shop: ShopId;
  kind: "experience" | "amount";
};

/** Budoucí DB řádek prodaného poukazu — teď plní mock. */
export type SoldVoucherRecord = {
  code: string;
  variantId: string;
  variantName: string;
  shopId: ShopId;
  soldAt: string;
  status: ReportVoucherStatus;
  amountCzk: number;
  vatLabel: string;
  taxRegime: ReportTaxRegime;
};

export type ReportAggregateRow = {
  section: string;
  metric: string;
  count: number;
  amountCzk: number;
};

export type VoucherReport = {
  generatedAt: string;
  from: string;
  to: string;
  shop: ReportShopFilter;
  isDemo: true;
  summary: { sold: number; redeemed: number; revenueCzk: number };
  aggregateRows: ReportAggregateRow[];
  vouchers: SoldVoucherRecord[];
};

export type ReportQuery = {
  from: string;
  to: string;
  shop: ReportShopFilter;
};

/**
 * Zdroj prodaných poukazů. Fáze 4 nahradí mock implementací z DB.
 */
export interface SoldVoucherSource {
  listSold(query: ReportQuery): Promise<SoldVoucherRecord[]>;
}

const AMOUNT_VAT_LABEL = "bez DPH";
const LEGACY_VAT_LABEL = "Legacy (jiný režim)";

function toInputDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function daysBetween(from: string, to: string) {
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return Math.max(1, diff + 1);
}

const ALL_SHOP_IDS: ShopId[] = ["lss", "bistrocentral", "culinaryacademy"];

const SHOP_LABELS: Record<ShopId, string> = {
  lss: "Long Story Short",
  bistrocentral: "Bistro Central",
  culinaryacademy: "Culinary Academy",
};

export function reportShopLabel(shop: ReportShopFilter) {
  if (shop === "all") return "Všechny obchody";
  return SHOP_LABELS[shop];
}

export function shopLineLabel(shop: ShopId) {
  return SHOP_LABELS[shop];
}

export function catalogFromSettings(
  shopId: ShopId,
  settings: AdminVoucherSettings,
): ReportCatalogVariant[] {
  const experiences = settings.experiences
    .filter((experience) => experience.price > 0)
    .map((experience) => ({
      id: experience.id,
      name: experience.title.trim() || "Zážitek",
      amountCzk: experience.price,
      vatLabel: formatExperienceVatLabel(
        experience.vat,
        experience.price,
      ),
      shop: shopId,
      kind: "experience" as const,
    }));

  const amounts: ReportCatalogVariant[] = [];
  settings.amountSlots.forEach((amount, index) => {
    if (!amount || amount <= 0) return;
    amounts.push({
      id: `amount-${shopId}-${index}-${amount}`,
      name: `Poukaz ${amount.toLocaleString("cs-CZ")} Kč`,
      amountCzk: amount,
      vatLabel: AMOUNT_VAT_LABEL,
      shop: shopId,
      kind: "amount",
    });
  });

  return [...experiences, ...amounts];
}

async function fetchShopSettings(shopId: ShopId): Promise<AdminVoucherSettings> {
  try {
    const response = await fetch(
      `/api/voucher-settings?shop=${encodeURIComponent(shopId)}`,
      { cache: "no-store" },
    );
    if (!response.ok) {
      return createInitialVoucherSettings(shopId);
    }
    const data = (await response.json()) as {
      settings?: Partial<AdminVoucherSettings>;
    };
    return normalizeVoucherSettings(data.settings, shopId);
  } catch {
    return createInitialVoucherSettings(shopId);
  }
}

export async function loadReportCatalog(
  shop: ReportShopFilter,
): Promise<ReportCatalogVariant[]> {
  const shopIds: ShopId[] = shop === "all" ? ALL_SHOP_IDS : [shop];

  const catalogs = await Promise.all(
    shopIds.map(async (shopId) => {
      const settings = await fetchShopSettings(shopId);
      const catalog = catalogFromSettings(shopId, settings);
      if (catalog.length > 0) return catalog;
      return catalogFromSettings(
        shopId,
        createInitialVoucherSettings(shopId),
      );
    }),
  );

  return catalogs.flat();
}

function hashSeed(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash || 1;
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Mock prodeje ~250k Kč / měsíc, DPH label z katalogu variant (reálné settings).
 * ~10 % řádků je legacy pro strukturu reportu z mailu.
 */
export function buildMockSoldVouchers(
  query: ReportQuery,
  catalog: ReportCatalogVariant[],
): SoldVoucherRecord[] {
  if (catalog.length === 0) return [];

  const days = daysBetween(query.from, query.to);
  const monthFactor = days / 30;
  const shopFactor =
    query.shop === "all"
      ? 1
      : query.shop === "lss"
        ? 0.55
        : query.shop === "bistrocentral"
          ? 0.25
          : 0.2;
  const targetSold = Math.max(8, Math.round(160 * monthFactor * shopFactor));

  const rand = mulberry32(
    hashSeed(`${query.from}:${query.to}:${query.shop}:${catalog.length}`),
  );

  const vouchers: SoldVoucherRecord[] = [];
  for (let i = 0; i < targetSold; i += 1) {
    const variant = catalog[Math.floor(rand() * catalog.length)]!;
    const dayOffset = Math.floor(rand() * days);
    const soldDate = new Date(`${query.from}T12:00:00`);
    soldDate.setDate(soldDate.getDate() + dayOffset);

    const isLegacy = rand() < 0.1;
    const redeemedRoll = rand();
    const status: ReportVoucherStatus = isLegacy
      ? redeemedRoll < 0.55
        ? "Uplatněný"
        : redeemedRoll < 0.75
          ? "Expirovaný"
          : "Aktivní"
      : redeemedRoll < 0.28
        ? "Uplatněný"
        : redeemedRoll < 0.34
          ? "Expirovaný"
          : "Aktivní";

    vouchers.push({
      code: `VX${String(100000 + ((i * 37 + Math.floor(rand() * 97)) % 900000)).padStart(6, "0")}`,
      variantId: variant.id,
      variantName: variant.name,
      shopId: variant.shop,
      soldAt: toInputDate(soldDate),
      status,
      amountCzk: variant.amountCzk,
      vatLabel: isLegacy ? LEGACY_VAT_LABEL : variant.vatLabel,
      taxRegime: isLegacy ? "legacy" : "vouchy",
    });
  }

  return vouchers.sort((a, b) => a.soldAt.localeCompare(b.soldAt));
}

export function aggregateVoucherReport(
  query: ReportQuery,
  vouchers: SoldVoucherRecord[],
): VoucherReport {
  const sold = vouchers.length;
  const redeemed = vouchers.filter((row) => row.status === "Uplatněný").length;
  const revenueCzk = vouchers.reduce((sum, row) => sum + row.amountCzk, 0);

  const vouchyBuckets = new Map<string, { count: number; amountCzk: number }>();
  let legacyCount = 0;
  let legacyAmount = 0;

  for (const row of vouchers) {
    if (row.taxRegime === "legacy") {
      legacyCount += 1;
      legacyAmount += row.amountCzk;
      continue;
    }
    const bucket = vouchyBuckets.get(row.vatLabel) ?? {
      count: 0,
      amountCzk: 0,
    };
    bucket.count += 1;
    bucket.amountCzk += row.amountCzk;
    vouchyBuckets.set(row.vatLabel, bucket);
  }

  const vatOrder = (label: string) => {
    if (label === AMOUNT_VAT_LABEL) return 40;
    if (label.includes("+")) return 30;
    const match = label.match(/(\d+)/);
    return match ? Number(match[1]) : 50;
  };

  const aggregateRows: ReportAggregateRow[] = [
    {
      section: "Souhrn",
      metric: "Prodané poukazy",
      count: sold,
      amountCzk: revenueCzk,
    },
    {
      section: "Souhrn",
      metric: "Uplatněné (vyčerpané) poukazy",
      count: redeemed,
      amountCzk: vouchers
        .filter((row) => row.status === "Uplatněný")
        .reduce((sum, row) => sum + row.amountCzk, 0),
    },
    ...[...vouchyBuckets.entries()]
      .sort((a, b) => vatOrder(a[0]) - vatOrder(b[0]) || a[0].localeCompare(b[0]))
      .map(([metric, bucket]) => ({
        section: "DPH — nové VOUCHY",
        metric,
        count: bucket.count,
        amountCzk: bucket.amountCzk,
      })),
    {
      section: "Legacy (dočerpávání)",
      metric: LEGACY_VAT_LABEL,
      count: legacyCount,
      amountCzk: legacyAmount,
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    from: query.from,
    to: query.to,
    shop: query.shop,
    isDemo: true,
    summary: { sold, redeemed, revenueCzk },
    aggregateRows,
    vouchers,
  };
}

export class MockSoldVoucherSource implements SoldVoucherSource {
  constructor(private readonly catalog: ReportCatalogVariant[]) {}

  async listSold(query: ReportQuery): Promise<SoldVoucherRecord[]> {
    return buildMockSoldVouchers(query, this.catalog);
  }
}

/** Generuje demo report: katalog z DB settings + mock prodeje. */
export async function generateVoucherReport(
  query: ReportQuery,
  source?: SoldVoucherSource,
): Promise<VoucherReport> {
  const catalog = await loadReportCatalog(query.shop);
  const soldSource = source ?? new MockSoldVoucherSource(catalog);
  const vouchers = await soldSource.listSold(query);
  return aggregateVoucherReport(query, vouchers);
}
