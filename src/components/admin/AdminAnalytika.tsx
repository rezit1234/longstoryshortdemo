"use client";

import { useMemo, useState } from "react";
import { formatCzk } from "@/data/vouchers";

type PeriodKey = "7d" | "30d" | "3m" | "1y";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "7d", label: "7 dní" },
  { key: "30d", label: "30 dní" },
  { key: "3m", label: "3 měsíce" },
  { key: "1y", label: "Rok" },
];

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

const PERIOD_STATS: Record<
  PeriodKey,
  {
    sold: string;
    revenue: string;
    avg: string;
    redeemed: string;
    chartRevenue: number[];
    chartSold: number[];
    variants: { name: string; sales: number; revenue: string }[];
    statuses: { label: string; count: number }[];
  }
> = {
  "7d": {
    sold: "4",
    revenue: "6 840 Kč",
    avg: "1 710 Kč",
    redeemed: "2",
    chartRevenue: [980, 640, 1520, 1180, 860, 1740, 920],
    chartSold: [0, 2, 0, 1, 0, 0, 1],
    variants: [
      { name: "Chef's Table", sales: 2, revenue: "3 752 Kč" },
      { name: "Poukaz 1 500 Kč", sales: 1, revenue: "1 500 Kč" },
      { name: "Poukaz 1 000 Kč", sales: 1, revenue: "1 000 Kč" },
    ],
    statuses: [
      { label: "Aktivní (platné v oběhu)", count: 38 },
      { label: "Uplatněné", count: 2 },
      { label: "Expirované", count: 1 },
      { label: "Stornované", count: 0 },
    ],
  },
  "30d": {
    sold: "43",
    revenue: "12 720 Kč",
    avg: "1 272 Kč",
    redeemed: "3",
    chartRevenue: [
      820, 640, 1180, 1540, 1320, 760, 690, 1480, 1760, 2010, 1840, 920, 780,
      2280, 2640, 2910, 2550, 2140, 980, 860, 1890, 1680, 2060, 1780, 940, 810,
      1620, 1390, 1840, 1510,
    ],
    chartSold: [
      0, 1, 0, 3, 1, 0, 2, 0, 4, 1, 0, 2, 0, 1, 5, 2, 0, 3, 1, 0, 2, 0, 4, 1, 0,
      2, 0, 3, 1, 4,
    ],
    variants: [
      { name: "Poukaz 1 500 Kč", sales: 8, revenue: "12 000 Kč" },
      { name: "Chef's Table", sales: 7, revenue: "13 132 Kč" },
      { name: "The Arc | „Výklenek“", sales: 5, revenue: "18 000 Kč" },
      { name: "Poukaz 1 000 Kč", sales: 6, revenue: "6 000 Kč" },
      { name: "The Nook | „Koutek“", sales: 4, revenue: "17 600 Kč" },
      { name: "Chef's Table s vinným párováním", sales: 3, revenue: "7 629 Kč" },
    ],
    statuses: [
      { label: "Aktivní (platné v oběhu)", count: 42 },
      { label: "Uplatněné", count: 3 },
      { label: "Expirované", count: 4 },
      { label: "Stornované", count: 2 },
    ],
  },
  "3m": {
    sold: "51",
    revenue: "54 200 Kč",
    avg: "1 426 Kč",
    redeemed: "14",
    chartRevenue: [4200, 3680, 5120, 5890, 4760, 3410, 3980, 6540, 7120, 5830, 4690, 6210],
    chartSold: [2, 6, 1, 8, 3, 0, 5, 9, 2, 7, 1, 7],
    variants: [
      { name: "Chef's Table", sales: 12, revenue: "22 512 Kč" },
      { name: "Poukaz 1 500 Kč", sales: 11, revenue: "16 500 Kč" },
      { name: "The Arc | „Výklenek“", sales: 8, revenue: "28 800 Kč" },
      { name: "Poukaz 1 000 Kč", sales: 9, revenue: "9 000 Kč" },
      { name: "The Nook | „Koutek“", sales: 6, revenue: "26 400 Kč" },
      { name: "Chef's Table s vinným párováním", sales: 5, revenue: "12 715 Kč" },
    ],
    statuses: [
      { label: "Aktivní (platné v oběhu)", count: 47 },
      { label: "Uplatněné", count: 14 },
      { label: "Expirované", count: 9 },
      { label: "Stornované", count: 5 },
    ],
  },
  "1y": {
    sold: "149",
    revenue: "186 400 Kč",
    avg: "1 456 Kč",
    redeemed: "61",
    chartRevenue: [
      9800, 11200, 10400, 14100, 12800, 15600, 13900, 17200, 15100, 18400, 16800,
      19600,
    ],
    chartSold: [4, 15, 7, 19, 8, 22, 6, 18, 5, 21, 10, 14],
    variants: [
      { name: "Poukaz 1 500 Kč", sales: 28, revenue: "42 000 Kč" },
      { name: "Chef's Table", sales: 24, revenue: "45 024 Kč" },
      { name: "The Arc | „Výklenek“", sales: 18, revenue: "64 800 Kč" },
      { name: "Poukaz 1 000 Kč", sales: 22, revenue: "22 000 Kč" },
      { name: "The Nook | „Koutek“", sales: 15, revenue: "66 000 Kč" },
      { name: "Chef's Table s vinným párováním", sales: 14, revenue: "35 602 Kč" },
    ],
    statuses: [
      { label: "Aktivní (platné v oběhu)", count: 42 },
      { label: "Uplatněné", count: 61 },
      { label: "Expirované", count: 17 },
      { label: "Stornované", count: 8 },
    ],
  },
};

type ChartPoint = {
  label: string;
  tooltipLabel: string;
  value: number;
  x: number;
  y: number;
};

function formatDayLabel(date: Date) {
  return `${date.getDate()}. ${date.getMonth() + 1}.`;
}

function formatTooltipDate(date: Date) {
  return `${date.getDate()}. ${MONTH_GENITIVE[date.getMonth()]}`;
}

function buildSeriesDates(count: number, period: PeriodKey) {
  const end = new Date(2026, 7, 24);
  end.setHours(12, 0, 0, 0);

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(end);
    if (period === "1y") {
      date.setMonth(end.getMonth() - (count - 1 - index));
      date.setDate(1);
    } else if (period === "3m") {
      date.setDate(end.getDate() - (count - 1 - index) * 7);
    } else {
      date.setDate(end.getDate() - (count - 1 - index));
    }
    return date;
  });
}

function buildChartPoints(
  values: number[],
  dates: Date[],
  width: number,
  height: number,
  padX: number,
  padY: number,
  maxValue: number,
  period: PeriodKey,
): ChartPoint[] {
  const usableW = width - padX * 2;
  const usableH = height - padY * 2;

  return values.map((value, index) => {
    const date = dates[index];
    const x =
      values.length === 1
        ? padX + usableW / 2
        : padX + (index / (values.length - 1)) * usableW;
    const y = padY + usableH - (value / maxValue) * usableH;

    return {
      value,
      x,
      y,
      label:
        period === "1y"
          ? date.toLocaleDateString("cs-CZ", { month: "short" })
          : formatDayLabel(date),
      tooltipLabel:
        period === "1y"
          ? date.toLocaleDateString("cs-CZ", { month: "long", year: "numeric" })
          : formatTooltipDate(date),
    };
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

function SoldBarChart({
  values,
  period,
  ariaLabel,
}: {
  values: number[];
  period: PeriodKey;
  ariaLabel: string;
}) {
  const width = 560;
  const height = 220;
  const padX = 12;
  const padTop = 12;
  const padBottom = 8;
  const plotH = height - padTop - padBottom;
  const maxValue = Math.max(...values, 1);

  const dates = useMemo(
    () => buildSeriesDates(values.length, period),
    [values.length, period],
  );

  const bars = useMemo(() => {
    const gap = values.length > 20 ? 1.5 : 2.5;
    const usableW = width - padX * 2;
    const slot = usableW / values.length;
    const barW = Math.max(slot - gap, 2);

    return values.map((value, index) => {
      const date = dates[index];
      const barH = (value / maxValue) * plotH;
      const x = padX + index * slot + (slot - barW) / 2;
      const y = padTop + plotH - barH;

      return {
        value,
        x,
        y,
        width: barW,
        height: Math.max(barH, value > 0 ? 2 : 0),
        cx: x + barW / 2,
        label:
          period === "1y"
            ? date.toLocaleDateString("cs-CZ", { month: "short" })
            : formatDayLabel(date),
        tooltipLabel:
          period === "1y"
            ? date.toLocaleDateString("cs-CZ", { month: "long", year: "numeric" })
            : formatTooltipDate(date),
      };
    });
  }, [values, dates, maxValue, period, plotH]);

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const active = activeIndex === null ? null : bars[activeIndex];

  const labelStep = values.length > 14 ? 2 : 1;
  const xLabels = bars.filter(
    (_, index) => index % labelStep === 0 || index === bars.length - 1,
  );

  return (
    <div
      className="admin-chart admin-analytics-chart admin-bar-chart"
      onMouseLeave={() => setActiveIndex(null)}
    >
      <div className="admin-chart-plot">
        <div className="admin-chart-svg-wrap">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="admin-chart-svg"
            preserveAspectRatio="none"
            role="img"
            aria-label={ariaLabel}
          >
            {[0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padTop + plotH * (1 - ratio);
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

            {bars.map((bar, index) => {
              const baselineY = padTop + plotH;
              const isZero = bar.value === 0;

              return (
                <g key={`${bar.label}-${index}`}>
                  {isZero ? (
                    <line
                      x1={bar.x}
                      x2={bar.x + bar.width}
                      y1={baselineY}
                      y2={baselineY}
                      className={
                        activeIndex === index
                          ? "admin-bar-chart-zero is-active"
                          : "admin-bar-chart-zero"
                      }
                    />
                  ) : (
                    <rect
                      x={bar.x}
                      y={bar.y}
                      width={bar.width}
                      height={bar.height}
                      rx={Math.min(2, bar.width / 2)}
                      className={
                        activeIndex === index
                          ? "admin-bar-chart-bar is-active"
                          : "admin-bar-chart-bar"
                      }
                    />
                  )}
                  <rect
                    x={bar.x - 1}
                    y={padTop}
                    width={bar.width + 2}
                    height={plotH}
                    fill="transparent"
                    onMouseEnter={() => setActiveIndex(index)}
                  />
                </g>
              );
            })}
          </svg>

          {active ? (
            <div
              className="admin-chart-tooltip"
              style={{
                left: `${(active.cx / width) * 100}%`,
                top: `${(Math.max(active.y, 18) / height) * 100}%`,
              }}
            >
              <strong>Den: {active.tooltipLabel}</strong>
              <span>Prodeje: {active.value}</span>
            </div>
          ) : null}
        </div>

        <div className="admin-chart-labels is-dense">
          {xLabels.map((bar) => (
            <span
              key={`${bar.label}-${bar.cx}`}
              style={{ left: `${(bar.cx / width) * 100}%` }}
            >
              {bar.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function RevenueLineChart({
  values,
  period,
  ariaLabel,
}: {
  values: number[];
  period: PeriodKey;
  ariaLabel: string;
}) {
  const width = 560;
  const height = 220;
  const padX = 12;
  const padY = 12;
  const baselineY = height - padY;
  const maxValue = Math.max(...values, 1) * 1.08;

  const dates = useMemo(
    () => buildSeriesDates(values.length, period),
    [values.length, period],
  );

  const points = useMemo(
    () =>
      buildChartPoints(values, dates, width, height, padX, padY, maxValue, period),
    [values, dates, maxValue, period],
  );

  const linePath = useMemo(() => smoothLinePath(points), [points]);
  const areaPath = useMemo(() => smoothAreaPath(points, baselineY), [points]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const active = activeIndex === null ? null : points[activeIndex];

  const labelStep = values.length > 14 ? 2 : 1;
  const xLabels = points.filter(
    (_, index) => index % labelStep === 0 || index === points.length - 1,
  );

  return (
    <div
      className="admin-chart admin-analytics-chart admin-line-chart"
      onMouseLeave={() => setActiveIndex(null)}
    >
      <div className="admin-chart-plot">
        <div className="admin-chart-svg-wrap">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="admin-chart-svg"
            preserveAspectRatio="none"
            role="img"
            aria-label={ariaLabel}
          >
            <defs>
              <linearGradient id="analytics-revenue-fill" x1="0" y1="0" x2="0" y2="1">
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

            <path d={areaPath} fill="url(#analytics-revenue-fill)" />
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
                key={`${point.label}-${index}`}
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
              <strong>Den: {active.tooltipLabel}</strong>
              <span>Tržby: {formatCzk(active.value)}</span>
            </div>
          ) : null}
        </div>

        <div className="admin-chart-labels is-dense">
          {xLabels.map((point) => (
            <span
              key={`${point.label}-${point.x}`}
              style={{ left: `${(point.x / width) * 100}%` }}
            >
              {point.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminAnalytika() {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const stats = PERIOD_STATS[period];

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
          <RevenueLineChart
            values={stats.chartRevenue}
            period={period}
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
          <SoldBarChart
            values={stats.chartSold}
            period={period}
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
            {stats.variants.map((row) => (
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
            {stats.statuses.map((item) => (
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
