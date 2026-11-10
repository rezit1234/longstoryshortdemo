"use client";

import { useId, useMemo, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCzk } from "@/data/vouchers";

export type AdminChartPeriod = "week" | "month" | "year" | "all";

export type AdminChartPoint = {
  label: string;
  tooltipLabel: string;
  value: number;
};

const MONTH_SHORT = [
  "led",
  "úno",
  "bře",
  "dub",
  "kvě",
  "čvn",
  "čvc",
  "srp",
  "zář",
  "říj",
  "lis",
  "pro",
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

function capitalizeMonthLabel(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatChartDayLabel(date: Date) {
  return `${date.getDate()}. ${date.getMonth() + 1}.`;
}

export function formatChartTooltipDate(date: Date) {
  return `${date.getDate()}. ${MONTH_GENITIVE[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatChartMonthShort(date: Date) {
  return capitalizeMonthLabel(MONTH_SHORT[date.getMonth()] ?? "");
}

export function formatChartMonthLong(date: Date) {
  return capitalizeMonthLabel(
    date.toLocaleDateString("cs-CZ", { month: "long", year: "numeric" }),
  );
}

export function buildAdminChartPoints(
  values: number[],
  dates: Date[],
  period: AdminChartPeriod,
): AdminChartPoint[] {
  return values.map((value, index) => {
    const date = dates[index] ?? new Date();
    return {
      value,
      label:
        period === "year" || period === "all"
          ? formatChartMonthShort(date)
          : formatChartDayLabel(date),
      tooltipLabel:
        period === "year" || period === "all"
          ? formatChartMonthLong(date)
          : formatChartTooltipDate(date),
    };
  });
}

const revenueConfig = {
  value: {
    label: "Tržby",
    color: "var(--admin-fg, var(--fg, #0a0a0a))",
  },
} satisfies ChartConfig;

const soldConfig = {
  value: {
    label: "Prodeje",
    color: "var(--admin-fg, var(--fg, #0a0a0a))",
  },
} satisfies ChartConfig;

function AdminChartShell({
  children,
  config,
  ariaLabel,
}: {
  children: ReactNode;
  config: ChartConfig;
  ariaLabel: string;
}) {
  return (
    <ChartContainer
      config={config}
      className="admin-shadcn-chart aspect-auto h-[220px] w-full"
      aria-label={ariaLabel}
    >
      {children}
    </ChartContainer>
  );
}

export function AdminRevenueChart({
  points,
  ariaLabel = "Graf tržeb",
}: {
  points: AdminChartPoint[];
  ariaLabel?: string;
}) {
  const fillId = `admin-revenue-fill-${useId().replace(/:/g, "")}`;
  const data = useMemo(
    () =>
      points.map((point) => ({
        label: point.label,
        tooltipLabel: point.tooltipLabel,
        value: point.value,
      })),
    [points],
  );

  if (data.length === 0) {
    return (
      <div className="admin-panel-empty">
        <p className="admin-table-empty">Zatím žádná data v tomto období.</p>
      </div>
    );
  }

  return (
    <AdminChartShell config={revenueConfig} ariaLabel={ariaLabel}>
      <AreaChart
        accessibilityLayer
        data={data}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          minTickGap={28}
          interval="preserveStartEnd"
        />
        <ChartTooltip
          cursor={{ stroke: "var(--admin-line, var(--line))", strokeWidth: 1 }}
          content={
            <ChartTooltipContent
              indicator="line"
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as
                  | { tooltipLabel?: string }
                  | undefined;
                return row?.tooltipLabel ?? "";
              }}
              formatter={(value) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="text-[var(--muted)]">Tržby</span>
                  <span className="font-medium tabular-nums text-[var(--fg)]">
                    {formatCzk(Number(value) || 0)}
                  </span>
                </div>
              )}
            />
          }
        />
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-value)"
              stopOpacity={0.18}
            />
            <stop
              offset="100%"
              stopColor="var(--color-value)"
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--color-value)"
          strokeWidth={1.5}
          fill={`url(#${fillId})`}
          dot={false}
          activeDot={{
            r: 5,
            strokeWidth: 2,
            stroke: "var(--bg, #fff)",
            fill: "var(--color-value)",
          }}
        />
      </AreaChart>
    </AdminChartShell>
  );
}

export function AdminSoldBarChart({
  points,
  ariaLabel = "Graf prodejů",
}: {
  points: AdminChartPoint[];
  ariaLabel?: string;
}) {
  const data = useMemo(
    () =>
      points.map((point) => ({
        label: point.label,
        tooltipLabel: point.tooltipLabel,
        value: point.value,
      })),
    [points],
  );

  if (data.length === 0) {
    return (
      <div className="admin-panel-empty">
        <p className="admin-table-empty">Zatím žádná data v tomto období.</p>
      </div>
    );
  }

  return (
    <AdminChartShell config={soldConfig} ariaLabel={ariaLabel}>
      <BarChart
        accessibilityLayer
        data={data}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          minTickGap={28}
          interval="preserveStartEnd"
        />
        <ChartTooltip
          cursor={{ fill: "color-mix(in srgb, var(--admin-fg, #0a0a0a) 6%, transparent)" }}
          content={
            <ChartTooltipContent
              indicator="dot"
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as
                  | { tooltipLabel?: string }
                  | undefined;
                return row?.tooltipLabel ?? "";
              }}
              formatter={(value) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="text-[var(--muted)]">Prodeje</span>
                  <span className="font-medium tabular-nums text-[var(--fg)]">
                    {Number(value) || 0}
                  </span>
                </div>
              )}
            />
          }
        />
        <Bar
          dataKey="value"
          fill="var(--color-value)"
          radius={[3, 3, 0, 0]}
          maxBarSize={28}
        />
      </BarChart>
    </AdminChartShell>
  );
}
