"use client";

import { useMemo, useState } from "react";

type PeriodKey = "7d" | "30d" | "3m" | "1y";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "7d", label: "7 dní" },
  { key: "30d", label: "30 dní" },
  { key: "3m", label: "3 měsíce" },
  { key: "1y", label: "Rok" },
];

const PERIOD_STATS: Record<
  PeriodKey,
  {
    sold: string;
    revenue: string;
    avg: string;
    redeemed: string;
    chartRevenue: number[];
    chartSold: number[];
  }
> = {
  "7d": {
    sold: "4",
    revenue: "6 840 Kč",
    avg: "1 710 Kč",
    redeemed: "2",
    chartRevenue: [420, 880, 640, 1200, 960, 1500, 1320],
    chartSold: [0, 1, 0, 1, 0, 1, 1],
  },
  "30d": {
    sold: "10",
    revenue: "12 720 Kč",
    avg: "1 272 Kč",
    redeemed: "3",
    chartRevenue: [
      650, 900, 700, 1400, 1100, 1800, 1500, 2200, 1900, 2600, 2300, 3000, 2700,
      2500,
    ],
    chartSold: [1, 0, 1, 2, 1, 0, 2, 1, 3, 1, 2, 1, 4, 2],
  },
  "3m": {
    sold: "38",
    revenue: "54 200 Kč",
    avg: "1 426 Kč",
    redeemed: "14",
    chartRevenue: [1800, 2200, 1900, 2800, 2500, 3200, 2900, 3600, 3300, 4100],
    chartSold: [2, 3, 2, 4, 3, 5, 4, 6, 5, 7],
  },
  "1y": {
    sold: "128",
    revenue: "186 400 Kč",
    avg: "1 456 Kč",
    redeemed: "61",
    chartRevenue: [
      8000, 9200, 8800, 11000, 10400, 12600, 11800, 14200, 13500, 15800, 14900,
      17200,
    ],
    chartSold: [6, 8, 7, 10, 9, 12, 11, 14, 13, 15, 14, 16],
  },
};

const VARIANTS = [
  { name: "Poukaz 1 500 Kč", sales: 18, revenue: "27 000 Kč" },
  { name: "Chef's Table", sales: 14, revenue: "26 264 Kč" },
  { name: "The Arc | „Výklenek“", sales: 9, revenue: "32 400 Kč" },
  { name: "Poukaz 1 000 Kč", sales: 12, revenue: "12 000 Kč" },
  { name: "The Nook | „Koutek“", sales: 7, revenue: "30 800 Kč" },
  { name: "Chef's Table s vinným párováním", sales: 8, revenue: "20 344 Kč" },
];

const STATUSES = [
  { label: "Aktivní (platné v oběhu)", count: 42 },
  { label: "Uplatněné", count: 61 },
  { label: "Expirované", count: 17 },
  { label: "Stornované", count: 8 },
];

const CHART_LABELS_30 = ["13.7.", "18.7.", "23.7.", "28.7.", "2.8.", "7.8."];

function buildPoints(
  values: number[],
  width: number,
  height: number,
  maxOverride?: number,
) {
  const max = maxOverride ?? Math.max(...values, 1);
  const padX = 8;
  const padY = 18;
  const usableW = width - padX * 2;
  const usableH = height - padY * 2;

  const pts = values.map((value, index) => {
    const x = padX + (index / Math.max(values.length - 1, 1)) * usableW;
    const y = padY + usableH - (value / max) * usableH;
    return { x, y };
  });

  return {
    line: pts.map((p) => `${p.x},${p.y}`).join(" "),
    area: `${pts[0].x},${height - 8} ${pts
      .map((p) => `${p.x},${p.y}`)
      .join(" ")} ${pts[pts.length - 1].x},${height - 8}`,
  };
}

function MiniChart({
  values,
  yLabels,
  gradientId,
  ariaLabel,
}: {
  values: number[];
  yLabels: string[];
  gradientId: string;
  ariaLabel: string;
}) {
  const points = useMemo(
    () => buildPoints(values, 560, 220, Math.max(...values, 1) * 1.08),
    [values],
  );

  return (
    <div className="admin-chart admin-analytics-chart" role="img" aria-label={ariaLabel}>
      <div className="admin-chart-y">
        {yLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="admin-chart-plot">
        <svg viewBox="0 0 560 220" className="admin-chart-svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.14" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[44, 88, 132, 176].map((y) => (
            <line
              key={y}
              x1="0"
              x2="560"
              y1={y}
              y2={y}
              className="admin-chart-grid"
            />
          ))}
          <polygon points={points.area} fill={`url(#${gradientId})`} />
          <polyline points={points.line} className="admin-chart-line" />
        </svg>
        <div className="admin-chart-labels">
          {CHART_LABELS_30.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminAnalytika() {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const stats = PERIOD_STATS[period];

  const revenueY = useMemo(() => {
    const max = Math.max(...stats.chartRevenue, 1);
    const step = max / 4;
    return [
      formatShort(max),
      formatShort(step * 3),
      formatShort(step * 2),
      formatShort(step),
      "0",
    ];
  }, [stats.chartRevenue]);

  const soldY = useMemo(() => {
    const max = Math.max(...stats.chartSold, 1);
    return [String(max), String(Math.round(max * 0.75)), String(Math.round(max * 0.5)), String(Math.round(max * 0.25)), "0"];
  }, [stats.chartSold]);

  return (
    <div className="admin-analytika">
      <div className="admin-page-head">
        <div>
          <h1>Analytika</h1>
          <p>Přehled výkonu vašeho obchodu.</p>
        </div>
        <div className="admin-filters admin-filters-inline" role="tablist" aria-label="Období">
          {PERIODS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={period === item.key}
              className={
                period === item.key
                  ? "admin-filter-chip is-active"
                  : "admin-filter-chip"
              }
              onClick={() => setPeriod(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <section className="admin-analytics-stats" aria-label="Souhrn">
        <article className="admin-stat-card">
          <h2>Prodané poukazy</h2>
          <p className="admin-stat-value">{stats.sold}</p>
          <p className="admin-stat-note">Za vybrané období výše.</p>
        </article>
        <article className="admin-stat-card">
          <h2>Tržby</h2>
          <p className="admin-stat-value">{stats.revenue}</p>
          <p className="admin-stat-note">Za vybrané období výše.</p>
        </article>
        <article className="admin-stat-card">
          <h2>Průměrná hodnota</h2>
          <p className="admin-stat-value">{stats.avg}</p>
          <p className="admin-stat-note">Za vybrané období výše.</p>
        </article>
        <article className="admin-stat-card">
          <h2>Uplatněné poukazy</h2>
          <p className="admin-stat-value">{stats.redeemed}</p>
          <p className="admin-stat-note">Za vybrané období výše.</p>
        </article>
      </section>

      <section className="admin-analytics-charts">
        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <h2>Tržby za vybrané období</h2>
              <p>Souhrn v Kč bez DPH.</p>
            </div>
          </div>
          <MiniChart
            values={stats.chartRevenue}
            yLabels={revenueY}
            gradientId="analytics-revenue-fill"
            ariaLabel="Graf tržeb"
          />
        </article>
        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <h2>Prodané poukazy za vybrané období</h2>
              <p>Počet prodaných poukazů v čase.</p>
            </div>
          </div>
          <MiniChart
            values={stats.chartSold}
            yLabels={soldY}
            gradientId="analytics-sold-fill"
            ariaLabel="Graf prodejů"
          />
        </article>
      </section>

      <section className="admin-analytics-bottom">
        <article className="admin-panel">
          <div className="admin-panel-head">
            <h2>Přehled variant</h2>
          </div>
          <ul className="admin-variant-list">
            {VARIANTS.map((row) => (
              <li key={row.name}>
                <div className="admin-variant-main">
                  <strong>{row.name}</strong>
                  <span>{row.sales} prodejů</span>
                </div>
                <strong className="admin-variant-revenue">{row.revenue}</strong>
              </li>
            ))}
          </ul>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-head">
            <h2>Stav poukazů</h2>
          </div>
          <ul className="admin-status-list">
            {STATUSES.map((item) => (
              <li key={item.label}>
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}

function formatShort(value: number) {
  if (value >= 1000) {
    const k = value / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1).replace(".0", "")}k`;
  }
  return String(Math.round(value));
}
