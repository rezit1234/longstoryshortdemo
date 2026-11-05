"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ShopId } from "@/data/admin-voucher-settings";
import { getRecentAdminVouchers } from "@/data/admin-vouchers";
import { formatCzk } from "@/data/vouchers";
import {
  AdminRevenueChart,
  buildAdminChartPoints,
} from "./AdminCharts";
import {
  AdminSkeletonChart,
  AdminSkeletonPopularList,
  AdminSkeletonStatCards,
  AdminSkeletonTableRows,
} from "./AdminSkeleton";
import { useAdminVoucherDrawer } from "./AdminVoucherDrawer";
import { useAdminUser } from "./AdminUserProvider";

type OverviewShopFilter = "all" | ShopId;

const OVERVIEW_SHOPS: { key: OverviewShopFilter; label: string }[] = [
  { key: "all", label: "Celkový přehled" },
  { key: "lss", label: "Long Story Short" },
  { key: "bistrocentral", label: "Bistro Central" },
  { key: "culinaryacademy", label: "Culinary Academy" },
];

const MANAGE_HREF: Record<ShopId, string> = {
  lss: "/admin/obchody/lss",
  bistrocentral: "/admin/obchody/bistrocentral",
  culinaryacademy: "/admin/obchody/culinaryacademy",
};

type AnalyticsResponse = {
  kpi: {
    sold: number;
    revenueCzk: number;
    avgCzk: number;
    redeemed: number;
    soldTrendPct: number | null;
    revenueTrendPct: number | null;
    avgTrendPct: number | null;
  };
  series: { date: string; revenueCzk: number; sold: number }[];
  variants: { name: string; sales: number; revenueCzk: number }[];
};

function trendMeta(pct: number | null) {
  if (pct == null) {
    return {
      direction: "up" as const,
      label: "Bez srovnání s minulým obdobím",
    };
  }
  if (pct >= 0) {
    return {
      direction: "up" as const,
      label: `↑ ${pct.toLocaleString("cs-CZ")} % oproti minulému období`,
    };
  }
  return {
    direction: "down" as const,
    label: `↓ ${Math.abs(pct).toLocaleString("cs-CZ")} % oproti minulému období`,
  };
}

function getGreetingFirstName(fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed || trimmed === "…") return null;
  return trimmed.split(/\s+/)[0] ?? null;
}

export function AdminOverview() {
  const { user } = useAdminUser();
  const { openVoucher, activeVoucherCode, vouchers, vouchersLoading } =
    useAdminVoucherDrawer();
  const [shop, setShop] = useState<OverviewShopFilter>("all");
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const response = await fetch(
          `/api/admin/analytics?period=30d&shop=${encodeURIComponent(shop)}`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error("fail");
        const data = (await response.json()) as AnalyticsResponse;
        if (!cancelled) setAnalytics(data);
      } catch {
        if (!cancelled) setAnalytics(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shop]);

  const stats = useMemo(() => {
    const kpi = analytics?.kpi;
    return [
      {
        title: "Prodané poukazy",
        value: (kpi?.sold ?? 0).toLocaleString("cs-CZ"),
        trend: trendMeta(kpi?.soldTrendPct ?? null),
      },
      {
        title: "Celkové tržby",
        value: formatCzk(kpi?.revenueCzk ?? 0),
        trend: trendMeta(kpi?.revenueTrendPct ?? null),
      },
      {
        title: "Průměrná hodnota poukazu",
        value: formatCzk(kpi?.avgCzk ?? 0),
        trend: trendMeta(kpi?.avgTrendPct ?? null),
      },
    ];
  }, [analytics]);

  const popularVariants = useMemo(() => {
    const variants = analytics?.variants ?? [];
    const max = variants[0]?.sales ?? 1;
    return variants.map((variant) => ({
      name: variant.name,
      count: variant.sales,
      share: Math.max(8, Math.round((variant.sales / Math.max(max, 1)) * 100)),
    }));
  }, [analytics]);

  const recentSales = useMemo(() => {
    const filtered =
      shop === "all"
        ? vouchers
        : vouchers.filter((voucher) => voucher.shopId === shop);
    return getRecentAdminVouchers(5, filtered);
  }, [vouchers, shop]);

  const revenuePoints = useMemo(() => {
    const series = analytics?.series ?? [];
    return buildAdminChartPoints(
      series.map((point) => point.revenueCzk),
      series.map((point) => new Date(`${point.date}T12:00:00`)),
      "30d",
    );
  }, [analytics]);

  const greetingName = getGreetingFirstName(user.name);
  const manageHref =
    shop === "all" ? "/admin/obchody" : MANAGE_HREF[shop];

  return (
    <div className="admin-overview">
      <div className="admin-overview-head">
        <div>
          <h1>{greetingName ? `Vítejte, ${greetingName}` : "Vítejte"}</h1>
          <p>
            {loading
              ? "Načítám přehled za posledních 30 dní…"
              : "Přehled dárkových poukazů za posledních 30 dní."}
          </p>
        </div>
        <div
          className="admin-filters admin-filters-inline admin-overview-shop-filters"
          role="tablist"
          aria-label="Obchod"
        >
          {OVERVIEW_SHOPS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={shop === item.key}
              className={
                shop === item.key
                  ? "admin-filter-chip is-active"
                  : "admin-filter-chip"
              }
              onClick={() => setShop(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <AdminSkeletonStatCards count={3} />
      ) : (
        <section className="admin-stats" aria-label="Statistiky">
          {stats.map((stat) => (
            <article key={stat.title} className="admin-stat-card">
              <h2>{stat.title}</h2>
              <p className="admin-stat-value">{stat.value}</p>
              <p
                className={
                  stat.trend.direction === "up"
                    ? "admin-stat-trend is-up"
                    : "admin-stat-trend is-down"
                }
              >
                {stat.trend.label}
              </p>
            </article>
          ))}
        </section>
      )}

      <div className="admin-overview-mid">
        <section className="admin-panel admin-overview-chart-panel">
          <div className="admin-panel-head">
            <div>
              <h2>Tržby za posledních 30 dní</h2>
              <p>Souhrn nominální hodnoty poukazů (Kč) za posledních 30 dní.</p>
            </div>
          </div>
          <div className="admin-panel-chart">
            {loading ? (
              <AdminSkeletonChart ariaLabel="Načítám graf tržeb" />
            ) : (
              <AdminRevenueChart
                points={revenuePoints}
                ariaLabel="Graf tržeb za posledních 30 dní"
              />
            )}
          </div>
        </section>

        <section className="admin-panel admin-popular-panel">
          <div className="admin-panel-head">
            <div>
              <h2>Nejoblíbenější varianty</h2>
              <p>Podle počtu prodejů.</p>
            </div>
            <Link href={manageHref} className="admin-text-link">
              Spravovat
            </Link>
          </div>
          {loading ? (
            <AdminSkeletonPopularList rows={4} />
          ) : popularVariants.length === 0 ? (
            <div className="admin-panel-empty">
              <p className="admin-table-empty">Zatím žádné varianty.</p>
            </div>
          ) : (
            <ul className="admin-popular-list">
              {popularVariants.map((variant) => (
                <li key={variant.name}>
                  <div className="admin-popular-row">
                    <div className="admin-popular-copy">
                      <strong>{variant.name}</strong>
                    </div>
                    <span className="admin-popular-count">{variant.count}×</span>
                  </div>
                  <div className="admin-popular-bar" aria-hidden>
                    <span style={{ width: `${variant.share}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <h2>Poslední prodané poukazy</h2>
            <p>Přehled pěti naposledy prodaných poukazů.</p>
          </div>
          <Link href="/admin/poukazy" className="admin-text-link">
            Zobrazit vše
          </Link>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Poukaz</th>
                <th>Zákazník</th>
                <th>Hodnota</th>
                <th>Datum nákupu</th>
                <th>Stav</th>
              </tr>
            </thead>
            <tbody>
              {vouchersLoading ? (
                <AdminSkeletonTableRows rows={5} cols={5} />
              ) : recentSales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="admin-table-empty">
                    Zatím žádné prodané poukazy.
                  </td>
                </tr>
              ) : (
                recentSales.map((sale) => (
                  <tr
                    key={sale.code}
                    className={
                      activeVoucherCode === sale.code
                        ? "is-clickable is-selected"
                        : "is-clickable"
                    }
                    onClick={() => openVoucher(sale)}
                  >
                    <td>{sale.product}</td>
                    <td>{sale.customer}</td>
                    <td>{sale.value}</td>
                    <td>{sale.purchasedAt}</td>
                    <td>
                      <span className={`admin-status is-${sale.status}`}>
                        {sale.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
