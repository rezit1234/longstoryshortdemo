"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ShopId } from "@/data/admin-voucher-settings";
import { getRecentAdminVouchers } from "@/data/admin-vouchers";
import { getEnabledShopBrands } from "@/data/shops";
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
import { AdminSelect } from "./AdminSelect";
import { useAdminVoucherDrawer } from "./AdminVoucherDrawer";
import { useAdminUser } from "./AdminUserProvider";

type OverviewShopFilter = "all" | ShopId;

const OVERVIEW_SHOPS: { key: OverviewShopFilter; label: string }[] = [
  { key: "all", label: "Všechny pobočky" },
  ...getEnabledShopBrands().map((brand) => ({
    key: brand.id as OverviewShopFilter,
    label: brand.brandName,
  })),
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

function OverviewShopFiltersModal({
  initialShop,
  onClose,
  onSave,
}: {
  initialShop: OverviewShopFilter;
  onClose: () => void;
  onSave: (shop: OverviewShopFilter) => void;
}) {
  const [draftShop, setDraftShop] = useState<OverviewShopFilter>(initialShop);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="admin-confirm-root"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="admin-confirm-dialog admin-reports-modal admin-reports-modal-filters admin-overview-filters-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-overview-filters-title"
      >
        <div className="admin-reports-modal-head">
          <div>
            <h2 id="admin-overview-filters-title">Filtry přehledu</h2>
            <p>Vyberte pobočku pro statistiky za posledních 30 dní.</p>
          </div>
          <button
            type="button"
            className="admin-outline-btn admin-reports-modal-close"
            onClick={onClose}
            aria-label="Zavřít"
          >
            <span>Zavřít</span>
          </button>
        </div>

        <div className="admin-reports-form">
          <div className="admin-field">
            <span>Pobočka</span>
            <AdminSelect
              ariaLabel="Vyberte pobočku"
              value={draftShop}
              options={OVERVIEW_SHOPS.map((item) => ({
                value: item.key,
                label: item.label,
              }))}
              onChange={(value) => setDraftShop(value as OverviewShopFilter)}
            />
          </div>
        </div>

        <div className="admin-reports-download admin-reports-download-end">
          <button
            type="button"
            className="admin-primary-btn"
            onClick={() => onSave(draftShop)}
          >
            Uložit filtry
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminOverview() {
  const { user } = useAdminUser();
  const { openVoucher, activeVoucherCode, vouchers, vouchersLoading } =
    useAdminVoucherDrawer();
  const [shop, setShop] = useState<OverviewShopFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const response = await fetch(
          `/api/admin/analytics?period=month&shop=${encodeURIComponent(shop)}`,
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
      "month",
    );
  }, [analytics]);

  const greetingName = getGreetingFirstName(user.name);
  const manageHref =
    shop === "all" ? "/admin/obchody" : MANAGE_HREF[shop];
  const shopLabel =
    OVERVIEW_SHOPS.find((item) => item.key === shop)?.label ??
    "Všechny pobočky";

  return (
    <div className="admin-overview">
      <div className="admin-overview-head">
        <div>
          <h1>{greetingName ? `Vítejte, ${greetingName}` : "Vítejte"}</h1>
          <p>
            {loading
              ? "Načítám přehled za posledních 30 dní…"
              : `Přehled dárkových poukazů za posledních 30 dní · ${shopLabel}`}
          </p>
        </div>
        <div className="admin-page-head-actions">
          <button
            type="button"
            className="admin-primary-btn admin-page-head-primary admin-analytika-filter-btn"
            onClick={() => setFiltersOpen(true)}
            aria-label="Otevřít filtry"
          >
            <svg
              className="admin-analytika-filter-icon"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <path
                d="M8.85746 12.5061C6.36901 10.6456 4.59564 8.59915 3.62734 7.44867C3.3276 7.09253 3.22938 6.8319 3.17033 6.3728C2.96811 4.8008 2.86701 4.0148 3.32795 3.5074C3.7889 3 4.60404 3 6.23433 3H17.7657C19.396 3 20.2111 3 20.672 3.5074C21.133 4.0148 21.0319 4.8008 20.8297 6.37281C20.7706 6.83191 20.6724 7.09254 20.3726 7.44867C19.403 8.60062 17.6261 10.6507 15.1326 12.5135C14.907 12.6821 14.7583 12.9567 14.7307 13.2614C14.4837 15.992 14.2559 17.4876 14.1141 18.2442C13.8853 19.4657 12.1532 20.2006 11.226 20.8563C10.6741 21.2466 10.0043 20.782 9.93278 20.1778C9.79643 19.0261 9.53961 16.6864 9.25927 13.2614C9.23409 12.9539 9.08486 12.6761 8.85746 12.5061Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="admin-page-head-btn-label">Filtry</span>
          </button>
        </div>
      </div>

      {filtersOpen ? (
        <OverviewShopFiltersModal
          initialShop={shop}
          onClose={() => setFiltersOpen(false)}
          onSave={(next) => {
            setShop(next);
            setFiltersOpen(false);
          }}
        />
      ) : null}

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
