import type { ShopId } from "@/data/admin-voucher-settings";
import {
  buildStaffActivityRows,
  type StaffActivityRow,
} from "@/lib/admin-staff-activity";
import { createAdminClient } from "@/lib/supabase/admin";
import { chunkIds, fetchAllRows } from "@/lib/supabase/fetch-all";

export type AnalyticsShopFilter = "all" | ShopId;
/** Kalendářní období: tento týden (Po–dnes), měsíc, rok, nebo celá historie. */
export type AnalyticsPeriodKey = "week" | "month" | "year" | "all";

export type AnalyticsSeriesPoint = {
  /** YYYY-MM-DD (den) nebo YYYY-MM-01 (měsíc). */
  date: string;
  revenueCzk: number;
  sold: number;
};

export type AnalyticsVariantRow = {
  name: string;
  sales: number;
  revenueCzk: number;
};

export type AnalyticsStatusRow = {
  key: string;
  label: string;
  count: number;
};

export type AnalyticsPayload = {
  shop: AnalyticsShopFilter;
  from: string;
  to: string;
  period?: AnalyticsPeriodKey;
  userId: string | null;
  kpi: {
    sold: number;
    revenueCzk: number;
    avgCzk: number;
    redeemed: number;
    soldTrendPct: number | null;
    revenueTrendPct: number | null;
    avgTrendPct: number | null;
  };
  series: AnalyticsSeriesPoint[];
  variants: AnalyticsVariantRow[];
  statuses: AnalyticsStatusRow[];
  staff: StaffActivityRow[];
};

type SoldRow = {
  id?: string;
  shop_id: string;
  product_name: string;
  item_kind?: string;
  unit_price_czk: number;
  remaining_czk?: number | null;
  status: string;
  purchased_at: string;
  redeemed_at: string | null;
  issued_by?: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  active: "Aktivní (platné v oběhu)",
  awaiting_shipment: "Čeká na odeslání",
  awaiting_pickup: "Čeká na vyzvednutí",
  redeemed: "Uplatněné",
  expired: "Expirované",
  cancelled: "Stornované",
};

function toDateOnly(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function parseShop(value: string | null): AnalyticsShopFilter {
  if (
    value === "lss" ||
    value === "bistrocentral" ||
    value === "culinaryacademy"
  ) {
    return value;
  }
  return "all";
}

/** Pondělí jako začátek týdne (cs). */
function startOfIsoWeek(date: Date) {
  const from = startOfDay(date);
  const day = from.getDay(); // 0 = ne, 1 = po, …
  const daysFromMonday = day === 0 ? 6 : day - 1;
  from.setDate(from.getDate() - daysFromMonday);
  return from;
}

export function rangeForPeriod(period: AnalyticsPeriodKey, end = new Date()) {
  const to = startOfDay(end);
  let from = startOfDay(end);

  if (period === "week") {
    from = startOfIsoWeek(end);
  } else if (period === "month") {
    from = startOfDay(new Date(end.getFullYear(), end.getMonth(), 1));
  } else if (period === "year") {
    from = startOfDay(new Date(end.getFullYear(), 0, 1));
  } else {
    // all — celá dostupná historie (Vouchy od ~2019)
    from = startOfDay(new Date(2019, 0, 1));
  }

  return { from: toDateOnly(from), to: toDateOnly(to) };
}

function previousRange(from: string, to: string) {
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (days - 1));
  return { from: toDateOnly(prevStart), to: toDateOnly(prevEnd) };
}

function trendPct(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function inRange(iso: string, from: string, to: string) {
  const day = iso.slice(0, 10);
  return day >= from && day <= to;
}

function bucketKey(day: string, granularity: "day" | "month") {
  return granularity === "month" ? `${day.slice(0, 7)}-01` : day;
}

function buildEmptySeries(from: string, to: string, granularity: "day" | "month") {
  const points: AnalyticsSeriesPoint[] = [];
  if (granularity === "month") {
    const cursor = new Date(`${from.slice(0, 7)}-01T12:00:00`);
    const end = new Date(`${to.slice(0, 7)}-01T12:00:00`);
    while (cursor <= end) {
      points.push({
        date: toDateOnly(cursor),
        revenueCzk: 0,
        sold: 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return points;
  }

  const cursor = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  while (cursor <= end) {
    points.push({
      date: toDateOnly(cursor),
      revenueCzk: 0,
      sold: 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return points;
}

function summarizeSales(rows: SoldRow[], from: string, to: string) {
  let sold = 0;
  let revenueCzk = 0;
  let redeemed = 0;

  for (const row of rows) {
    if (row.status === "cancelled") continue;
    if (inRange(row.purchased_at, from, to)) {
      sold += 1;
      revenueCzk += row.unit_price_czk || 0;
    }
    if (row.redeemed_at && inRange(row.redeemed_at, from, to)) {
      redeemed += 1;
    }
  }

  return {
    sold,
    revenueCzk,
    avgCzk: sold > 0 ? Math.round(revenueCzk / sold) : 0,
    redeemed,
  };
}

async function countRedemptionsInRange(params: {
  admin: ReturnType<typeof createAdminClient>;
  from: string;
  to: string;
  shop: AnalyticsShopFilter;
  userId: string | null;
}) {
  const rows = await fetchAllRows<{
    id: string;
    sold_voucher_id: string;
    created_by: string | null;
  }>((from, to) => {
    let query = params.admin
      .from("voucher_redemptions")
      .select("id, sold_voucher_id, created_by")
      .is("undone_at", null)
      .gte("created_at", `${params.from}T00:00:00.000Z`)
      .lte("created_at", `${params.to}T23:59:59.999Z`)
      .order("created_at", { ascending: true })
      .range(from, to);
    if (params.userId) {
      query = query.eq("created_by", params.userId);
    }
    return query;
  });

  if (params.shop === "all" || rows.length === 0) return rows.length;

  const voucherIds = [
    ...new Set(
      rows
        .map((row) =>
          typeof row.sold_voucher_id === "string" ? row.sold_voucher_id : "",
        )
        .filter(Boolean),
    ),
  ];
  if (voucherIds.length === 0) return 0;

  const allowed = new Set<string>();
  for (const ids of chunkIds(voucherIds)) {
    const { data: vouchers, error: vouchersError } = await params.admin
      .from("sold_vouchers")
      .select("id")
      .in("id", ids)
      .eq("shop_id", params.shop);
    if (vouchersError) throw vouchersError;
    for (const row of vouchers ?? []) allowed.add(String(row.id));
  }

  return rows.filter((row) => allowed.has(String(row.sold_voucher_id))).length;
}

export async function buildAnalyticsPayload(params: {
  shop?: string | null;
  from?: string | null;
  to?: string | null;
  period?: string | null;
  userId?: string | null;
}): Promise<AnalyticsPayload> {
  const shop = parseShop(params.shop ?? null);
  const userId = params.userId?.trim() || null;
  const period =
    params.period === "week" ||
    params.period === "month" ||
    params.period === "year" ||
    params.period === "all"
      ? params.period
      : undefined;

  const range = period
    ? rangeForPeriod(period)
    : {
        from: params.from || rangeForPeriod("month").from,
        to: params.to || rangeForPeriod("month").to,
      };

  const admin = createAdminClient();

  try {
    const data = await fetchAllRows<SoldRow>((from, to) => {
      let query = admin
        .from("sold_vouchers")
        .select(
          "shop_id, product_name, unit_price_czk, status, purchased_at, redeemed_at, issued_by",
        )
        .order("purchased_at", { ascending: true })
        .range(from, to);
      if (shop !== "all") {
        query = query.eq("shop_id", shop);
      }
      return query;
    });

    return buildAnalyticsPayloadFromRows({
      rows: data,
      shop,
      range,
      period,
      userId,
      admin,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Starší DB bez issued_by — zkusit bez sloupce.
    if (!/issued_by/i.test(message)) throw error;

    const data = await fetchAllRows<SoldRow>((from, to) => {
      let query = admin
        .from("sold_vouchers")
        .select(
          "shop_id, product_name, unit_price_czk, status, purchased_at, redeemed_at",
        )
        .order("purchased_at", { ascending: true })
        .range(from, to);
      if (shop !== "all") {
        query = query.eq("shop_id", shop);
      }
      return query;
    });

    return buildAnalyticsPayloadFromRows({
      rows: data,
      shop,
      range,
      period,
      userId,
      admin,
    });
  }
}

async function buildAnalyticsPayloadFromRows(params: {
  rows: SoldRow[];
  shop: AnalyticsShopFilter;
  range: { from: string; to: string };
  period?: AnalyticsPeriodKey;
  userId: string | null;
  admin: ReturnType<typeof createAdminClient>;
}): Promise<AnalyticsPayload> {
  const { rows, shop, range, period, userId, admin } = params;
  // Hlavní KPI zůstávají celkový obchod (online + ruční). Filtr uživatele
  // ovlivní jen tabulku vystavení / uplatnění podle zaměstnanců.
  const current = summarizeSales(rows, range.from, range.to);
  const prev = previousRange(range.from, range.to);
  const previous = summarizeSales(rows, prev.from, prev.to);

  // Počet uplatnění = záznamy historie (částečná i plná), ne jen finální status.
  try {
    current.redeemed = await countRedemptionsInRange({
      admin,
      from: range.from,
      to: range.to,
      shop,
      userId: null,
    });
    previous.redeemed = await countRedemptionsInRange({
      admin,
      from: prev.from,
      to: prev.to,
      shop,
      userId: null,
    });
  } catch {
    // Migrace 015 ještě nemusí být nasazená — necháme redeemed_at fallback.
  }

  const daySpan =
    Math.round(
      (new Date(`${range.to}T12:00:00`).getTime() -
        new Date(`${range.from}T12:00:00`).getTime()) /
        86_400_000,
    ) + 1;
  const granularity: "day" | "month" = daySpan > 100 ? "month" : "day";
  const seriesMap = new Map(
    buildEmptySeries(range.from, range.to, granularity).map((point) => [
      point.date,
      point,
    ]),
  );

  const variantMap = new Map<string, AnalyticsVariantRow>();

  for (const row of rows) {
    if (row.status === "cancelled") continue;
    if (!inRange(row.purchased_at, range.from, range.to)) continue;

    const key = bucketKey(row.purchased_at.slice(0, 10), granularity);
    const bucket = seriesMap.get(key);
    if (bucket) {
      bucket.sold += 1;
      bucket.revenueCzk += row.unit_price_czk || 0;
    }

    const name = row.product_name?.trim() || "Poukaz";
    const variant = variantMap.get(name) ?? {
      name,
      sales: 0,
      revenueCzk: 0,
    };
    variant.sales += 1;
    variant.revenueCzk += row.unit_price_czk || 0;
    variantMap.set(name, variant);
  }

  const statusCounts = new Map<string, number>();
  for (const row of rows) {
    const key = row.status || "active";
    statusCounts.set(key, (statusCounts.get(key) ?? 0) + 1);
  }

  const statuses: AnalyticsStatusRow[] = [
    "active",
    "awaiting_shipment",
    "awaiting_pickup",
    "redeemed",
    "expired",
    "cancelled",
  ].map((key) => ({
    key,
    label: STATUS_LABELS[key] ?? key,
    count: statusCounts.get(key) ?? 0,
  }));

  let staff: StaffActivityRow[] = [];
  try {
    staff = await buildStaffActivityRows({
      from: range.from,
      to: range.to,
      shop,
      userId,
    });
  } catch (error) {
    console.error("admin analytics staff", error);
  }

  return {
    shop,
    from: range.from,
    to: range.to,
    period,
    userId,
    kpi: {
      ...current,
      soldTrendPct: trendPct(current.sold, previous.sold),
      revenueTrendPct: trendPct(current.revenueCzk, previous.revenueCzk),
      avgTrendPct: trendPct(current.avgCzk, previous.avgCzk),
    },
    series: [...seriesMap.values()],
    variants: [...variantMap.values()]
      .sort((a, b) => b.sales - a.sales || b.revenueCzk - a.revenueCzk)
      .slice(0, 8),
    statuses,
    staff,
  };
}

export function analyticsQueryWindowIso(from: string, to: string) {
  return {
    fromIso: startOfDay(new Date(`${from}T00:00:00`)).toISOString(),
    toIso: endOfDay(new Date(`${to}T00:00:00`)).toISOString(),
  };
}
