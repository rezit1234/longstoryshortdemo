"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ShopId } from "@/data/admin-voucher-settings";
import { getRecentAdminVouchers } from "@/data/admin-vouchers";
import { formatCzk } from "@/data/vouchers";
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

const MONTH_GENITIVE = [
  "ledna",
  "února",
  "března",
  "dubna",
  "května",
  "června",
  "července",
  "srpna",
  "září",
  "října",
  "listopadu",
  "prosince",
];

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

type ChartPoint = {
  date: Date;
  value: number;
  x: number;
  y: number;
};

function getGreetingFirstName(fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed || trimmed === "…") return null;
  return trimmed.split(/\s+/)[0] ?? null;
}

function formatDayLabel(date: Date) {
  return `${date.getDate()}. ${date.getMonth() + 1}.`;
}

function formatTooltipDate(date: Date) {
  return `${date.getDate()}. ${MONTH_GENITIVE[date.getMonth()]}`;
}

function buildChartPoints(
  series: { date: Date; value: number }[],
  width: number,
  height: number,
  padX: number,
  padY: number,
  maxValue: number,
): ChartPoint[] {
  const usableW = width - padX * 2;
  const usableH = height - padY * 2;

  return series.map((item, index) => {
    const x =
      series.length === 1
        ? padX + usableW / 2
        : padX + (index / (series.length - 1)) * usableW;
    const y = padY + usableH - (item.value / maxValue) * usableH;
    return { ...item, x, y };
  });
}

function smoothLinePath(points: ChartPoint[]) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[index + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return path;
}

function smoothAreaPath(points: ChartPoint[], baselineY: number) {
  if (points.length === 0) return "";
  const line = smoothLinePath(points);
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}

function pickChartLabels(points: ChartPoint[], labelStep: number) {
  return points.filter(
    (_, index) => index % labelStep === 0 || index === points.length - 1,
  );
}

function RevenueChart({ series }: { series: { date: Date; value: number }[] }) {
  const width = 720;
  const height = 220;
  const padX = 12;
  const padY = 12;
  const baselineY = height - padY;
  const maxValue = Math.max(...series.map((item) => item.value), 1) * 1.08;
  const [labelStep, setLabelStep] = useState(2);

  const points = useMemo(
    () => buildChartPoints(series, width, height, padX, padY, maxValue),
    [series, maxValue],
  );

  const linePath = useMemo(() => smoothLinePath(points), [points]);
  const areaPath = useMemo(() => smoothAreaPath(points, baselineY), [points]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const active = activeIndex === null ? null : points[activeIndex];

  useEffect(() => {
    const mqCompact = window.matchMedia("(max-width: 960px)");
    const mqTiny = window.matchMedia("(max-width: 560px)");

    function updateLabelStep() {
      if (mqTiny.matches) {
        setLabelStep(10);
        return;
      }

      if (mqCompact.matches) {
        setLabelStep(6);
        return;
      }

      setLabelStep(2);
    }

    updateLabelStep();
    mqCompact.addEventListener("change", updateLabelStep);
    mqTiny.addEventListener("change", updateLabelStep);

    return () => {
      mqCompact.removeEventListener("change", updateLabelStep);
      mqTiny.removeEventListener("change", updateLabelStep);
    };
  }, []);

  const xLabels = useMemo(
    () => pickChartLabels(points, labelStep),
    [points, labelStep],
  );

  return (
    <div
      className="admin-chart admin-line-chart"
      onMouseLeave={() => setActiveIndex(null)}
    >
      <div className="admin-chart-plot">
        <div className="admin-chart-svg-wrap">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="admin-chart-svg"
            preserveAspectRatio="none"
            role="img"
            aria-label="Graf tržeb za posledních 30 dní"
          >
            <defs>
              <linearGradient id="overview-revenue-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.16" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>

            {[0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padY + (baselineY - padY) * (1 - ratio);
              return (
                <line
                  key={ratio}
                  x1={padX}
                  x2={width - padX}
                  y1={y}
                  y2={y}
                  className="admin-chart-grid"
                />
              );
            })}

            <path d={areaPath} fill="url(#overview-revenue-fill)" />
            <path d={linePath} className="admin-line-chart-path" />

            {active ? (
              <>
                <line
                  x1={active.x}
                  x2={active.x}
                  y1={padY}
                  y2={baselineY}
                  className="admin-chart-guide"
                />
                <circle
                  cx={active.x}
                  cy={active.y}
                  r="4"
                  className="admin-line-chart-dot"
                />
              </>
            ) : null}

            {points.map((point, index) => (
              <rect
                key={point.date.toISOString()}
                x={index === 0 ? 0 : (points[index - 1].x + point.x) / 2}
                y={0}
                width={
                  index === 0
                    ? (points[1]?.x ?? point.x) / 2
                    : index === points.length - 1
                      ? width - (points[index - 1].x + point.x) / 2
                      : (points[index + 1].x - points[index - 1].x) / 2
                }
                height={height}
                fill="transparent"
                onMouseEnter={() => setActiveIndex(index)}
              />
            ))}
          </svg>

          {active ? (
            <div
              className="admin-chart-tooltip"
              style={{
                left: `${(active.x / width) * 100}%`,
                top: `${(active.y / height) * 100}%`,
              }}
            >
              <strong>Den: {formatTooltipDate(active.date)}</strong>
              <span>Tržby: {formatCzk(active.value)}</span>
            </div>
          ) : null}
        </div>

        <div className="admin-chart-labels is-dense">
          {xLabels.map((point) => (
            <span
              key={point.date.toISOString()}
              style={{
                left: `${(point.x / width) * 100}%`,
              }}
            >
              {formatDayLabel(point.date)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminOverview() {
  const { user } = useAdminUser();
  const { openVoucher, activeVoucherCode, vouchers } = useAdminVoucherDrawer();
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

  const chartSeries = useMemo(
    () =>
      (analytics?.series ?? []).map((point) => ({
        date: new Date(`${point.date}T12:00:00`),
        value: point.revenueCzk,
      })),
    [analytics],
  );

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

      <div className="admin-overview-mid">
        <section className="admin-panel admin-overview-chart-panel">
          <div className="admin-panel-head">
            <div>
              <h2>Tržby za posledních 30 dní</h2>
              <p>Souhrn nominální hodnoty poukazů (Kč) za posledních 30 dní.</p>
            </div>
          </div>
          {chartSeries.length > 0 ? (
            <RevenueChart series={chartSeries} />
          ) : (
            <p className="admin-table-empty">Zatím žádné prodeje v tomto období.</p>
          )}
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
          {popularVariants.length === 0 ? (
            <p className="admin-table-empty">Zatím žádné varianty.</p>
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
              {recentSales.map((sale) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
