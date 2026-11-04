"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AdminRevenueChart,
  AdminSoldBarChart,
  buildAdminChartPoints,
} from "@/components/admin/AdminCharts";
import { formatCzk } from "@/data/vouchers";
import {
  reportShopLabel,
  shopLineLabel,
  type ReportShopFilter,
  type VoucherReport,
} from "@/lib/voucher-reports";

type PeriodKey = "7d" | "30d" | "3m" | "1y";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "7d", label: "7 dní" },
  { key: "30d", label: "30 dní" },
  { key: "3m", label: "3 měsíce" },
  { key: "1y", label: "Rok" },
];

type AnalyticsShopFilter = ReportShopFilter;

type LiveAnalytics = {
  sold: string;
  revenue: string;
  avg: string;
  redeemed: string;
  chartRevenue: number[];
  chartSold: number[];
  chartDates: Date[];
  variants: { name: string; sales: number; revenue: string }[];
  statuses: { label: string; count: number }[];
};

const EMPTY_ANALYTICS: LiveAnalytics = {
  sold: "0",
  revenue: formatCzk(0),
  avg: formatCzk(0),
  redeemed: "0",
  chartRevenue: [],
  chartSold: [],
  chartDates: [],
  variants: [],
  statuses: [],
};

const ANALYTICS_SHOPS: { key: AnalyticsShopFilter; label: string }[] = [
  { key: "all", label: "Celkový přehled" },
  { key: "lss", label: "Long Story Short" },
  { key: "bistrocentral", label: "Bistro Central" },
  { key: "culinaryacademy", label: "Culinary Academy" },
];

type ReportPreset = "30d" | "6m" | "1y";

function toInputDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function rangeForPreset(preset: ReportPreset) {
  const to = new Date();
  const from = new Date(to);
  if (preset === "30d") from.setDate(from.getDate() - 30);
  else if (preset === "6m") from.setMonth(from.getMonth() - 6);
  else from.setFullYear(from.getFullYear() - 1);
  return { from: toInputDate(from), to: toInputDate(to) };
}

function formatReportDateCs(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return `${d}. ${m}. ${y}`;
}

function downloadReportCsv(report: VoucherReport) {
  const header = [
    "Kód",
    "Varianta",
    "Obchod",
    "Prodej",
    "Stav",
    "Částka (Kč)",
    "DPH",
    "Režim",
    "Období od",
    "Období do",
  ];
  const lines = [
    header.join(";"),
    ...report.vouchers.map((row) =>
      [
        row.code,
        row.variantName,
        shopLineLabel(row.shopId),
        row.soldAt,
        row.status,
        String(row.amountCzk),
        row.vatLabel,
        row.taxRegime === "legacy" ? "Legacy" : "VOUCHY",
        report.from,
        report.to,
      ]
        .map((cell) => `"${cell.replace(/"/g, '""')}"`)
        .join(";"),
    ),
  ];

  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  triggerDownload(blob, `report-poukazy-${report.from}_${report.to}.csv`);
}

async function downloadReportExcel(report: VoucherReport) {
  const response = await fetch("/api/voucher-reports/xlsx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ report }),
  });

  if (!response.ok) {
    throw new Error("Excel export failed");
  }

  const blob = await response.blob();
  triggerDownload(
    blob,
    `report-poukazy-${report.from}_${report.to}.xlsx`,
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const REPORT_PRESETS: { key: ReportPreset; label: string }[] = [
  { key: "30d", label: "Posledních 30 dní" },
  { key: "6m", label: "Poslední půl rok" },
  { key: "1y", label: "Poslední rok" },
];

const REPORT_SHOPS: { key: ReportShopFilter; label: string }[] = [
  { key: "all", label: "Celkový přehled" },
  { key: "lss", label: "LSS" },
  { key: "bistrocentral", label: "Bistro Central" },
  { key: "culinaryacademy", label: "Culinary Academy" },
];

function ReportFilterModal({
  onClose,
  onGenerate,
}: {
  onClose: () => void;
  onGenerate: (report: VoucherReport) => void;
}) {
  const defaults = useMemo(() => rangeForPreset("30d"), []);
  const [shop, setShop] = useState<ReportShopFilter>("all");
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [activePreset, setActivePreset] = useState<ReportPreset | null>("30d");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function applyPreset(preset: ReportPreset) {
    const range = rangeForPreset(preset);
    setFrom(range.from);
    setTo(range.to);
    setActivePreset(preset);
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/voucher-reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&shop=${encodeURIComponent(shop)}`,
        { cache: "no-store" },
      );
      const data = (await response.json().catch(() => null)) as {
        report?: VoucherReport;
        error?: string;
      } | null;
      if (!response.ok || !data?.report) {
        throw new Error(data?.error || "fail");
      }
      onGenerate(data.report);
    } catch {
      setError("Report se nepodařilo vygenerovat. Zkuste to znovu.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div
      className="admin-confirm-root"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="admin-confirm-dialog admin-reports-modal admin-reports-modal-filters"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-reports-title"
      >
        <div className="admin-reports-modal-head">
          <div>
            <h2 id="admin-reports-title">Vygenerovat report</h2>
            <p>DPH a prodeje z evidence prodaných poukazů.</p>
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
            <span>Obchod</span>
            <div
              className="admin-filters admin-filters-inline"
              role="tablist"
              aria-label="Filtr obchodu"
            >
              {REPORT_SHOPS.map((item) => (
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

          <div className="admin-field">
            <span>Rychlé období</span>
            <div
              className="admin-filters admin-filters-inline"
              role="group"
              aria-label="Předvolby období"
            >
              {REPORT_PRESETS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={
                    activePreset === item.key
                      ? "admin-filter-chip is-active"
                      : "admin-filter-chip"
                  }
                  onClick={() => applyPreset(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="admin-reports-dates">
            <label className="admin-field">
              <span>Od</span>
              <input
                type="date"
                value={from}
                max={to}
                onChange={(event) => {
                  setFrom(event.target.value);
                  setActivePreset(null);
                }}
              />
            </label>
            <label className="admin-field">
              <span>Do</span>
              <input
                type="date"
                value={to}
                min={from}
                onChange={(event) => {
                  setTo(event.target.value);
                  setActivePreset(null);
                }}
              />
            </label>
          </div>
        </div>

        {error ? <p className="admin-field-hint">{error}</p> : null}

        <div className="admin-reports-download admin-reports-download-end">
          <button
            type="button"
            className="admin-primary-btn"
            disabled={generating}
            onClick={() => {
              void handleGenerate();
            }}
          >
            {generating ? "Generuji…" : "Generovat"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportResultModal({
  report,
  onClose,
  onBack,
}: {
  report: VoucherReport;
  onClose: () => void;
  onBack: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const dphRows = report.aggregateRows.filter(
    (row) => row.section !== "Souhrn",
  );

  return (
    <div
      className="admin-confirm-root"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="admin-confirm-dialog admin-reports-modal admin-reports-modal-result"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-reports-result-title"
      >
        <div className="admin-reports-modal-head">
          <div>
            <h2 id="admin-reports-result-title">Report poukazů</h2>
            <p>
              {formatReportDateCs(report.from)} –{" "}
              {formatReportDateCs(report.to)} · {reportShopLabel(report.shop)} ·
              DPH ze snapshotu při prodeji
            </p>
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

        <div className="admin-reports-summary">
          <article className="admin-stat-card">
            <h3>Prodané</h3>
            <p className="admin-stat-value">{report.summary.sold}</p>
          </article>
          <article className="admin-stat-card">
            <h3>Uplatněné</h3>
            <p className="admin-stat-value">{report.summary.redeemed}</p>
          </article>
          <article className="admin-stat-card">
            <h3>Obrat</h3>
            <p className="admin-stat-value">
              {formatCzk(report.summary.revenueCzk)}
            </p>
          </article>
        </div>

        <div className="admin-reports-aggregate">
          <div className="admin-reports-preview-head">
            <h3>Dělení dle DPH</h3>
            <p>Nové VOUCHY + legacy dočerpávání</p>
          </div>
          <div className="admin-reports-table-wrap">
            <table className="admin-reports-table">
              <thead>
                <tr>
                  <th>Sekce</th>
                  <th>Položka</th>
                  <th>Počet</th>
                  <th>Částka</th>
                </tr>
              </thead>
              <tbody>
                {dphRows.map((row) => (
                  <tr key={`${row.section}-${row.metric}`}>
                    <td>{row.section}</td>
                    <td>{row.metric}</td>
                    <td>{row.count}</td>
                    <td>{formatCzk(row.amountCzk)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-reports-preview">
          <div className="admin-reports-preview-head">
            <h3>Náhled poukazů</h3>
            <p>
              {report.vouchers.length} záznamů · kompletní seznam ve stahování
            </p>
          </div>
          <div className="admin-reports-table-wrap admin-reports-preview-scroll">
            <table className="admin-reports-table">
              <thead>
                <tr>
                  <th>Kód</th>
                  <th>Varianta</th>
                  <th>DPH</th>
                  <th>Stav</th>
                  <th>Částka</th>
                </tr>
              </thead>
              <tbody>
                {report.vouchers.map((row) => (
                  <tr key={`${row.code}-${row.soldAt}-${row.variantId}`}>
                    <td>{row.code}</td>
                    <td>{row.variantName}</td>
                    <td>{row.vatLabel}</td>
                    <td>{row.status}</td>
                    <td>{formatCzk(row.amountCzk)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-reports-download admin-reports-download-split">
          <button type="button" className="admin-outline-btn" onClick={onBack}>
            Zpět
          </button>
          <div className="admin-reports-download-right">
            <button
              type="button"
              className="admin-outline-btn"
              onClick={() => downloadReportCsv(report)}
            >
              Stáhnout CSV
            </button>
            <button
              type="button"
              className="admin-outline-btn"
              onClick={() => {
                void downloadReportExcel(report).catch(() => {
                  window.alert("Excel se nepodařilo stáhnout. Zkus to znovu.");
                });
              }}
            >
              Stáhnout Excel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


export function AdminAnalytika() {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [shop, setShop] = useState<AnalyticsShopFilter>("all");
  const [stats, setStats] = useState<LiveAnalytics>(EMPTY_ANALYTICS);
  const [loading, setLoading] = useState(true);
  const [reportStep, setReportStep] = useState<"closed" | "filters" | "result">(
    "closed",
  );
  const [report, setReport] = useState<VoucherReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const response = await fetch(
          `/api/admin/analytics?period=${encodeURIComponent(period)}&shop=${encodeURIComponent(shop)}`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error("fail");
        const data = (await response.json()) as {
          kpi: {
            sold: number;
            revenueCzk: number;
            avgCzk: number;
            redeemed: number;
          };
          series: { date: string; revenueCzk: number; sold: number }[];
          variants: { name: string; sales: number; revenueCzk: number }[];
          statuses: { label: string; count: number }[];
        };
        if (cancelled) return;
        setStats({
          sold: data.kpi.sold.toLocaleString("cs-CZ"),
          revenue: formatCzk(data.kpi.revenueCzk),
          avg: formatCzk(data.kpi.avgCzk),
          redeemed: data.kpi.redeemed.toLocaleString("cs-CZ"),
          chartRevenue: data.series.map((point) => point.revenueCzk),
          chartSold: data.series.map((point) => point.sold),
          chartDates: data.series.map(
            (point) => new Date(`${point.date}T12:00:00`),
          ),
          variants: data.variants.map((row) => ({
            name: row.name,
            sales: row.sales,
            revenue: formatCzk(row.revenueCzk),
          })),
          statuses: data.statuses.map((item) => ({
            label: item.label,
            count: item.count,
          })),
        });
      } catch {
        if (!cancelled) setStats(EMPTY_ANALYTICS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [period, shop]);

  const revenuePoints = useMemo(
    () =>
      buildAdminChartPoints(stats.chartRevenue, stats.chartDates, period),
    [stats.chartRevenue, stats.chartDates, period],
  );
  const soldPoints = useMemo(
    () => buildAdminChartPoints(stats.chartSold, stats.chartDates, period),
    [stats.chartSold, stats.chartDates, period],
  );

  return (
    <div className="admin-analytika">
      <div className="admin-page-head">
        <div>
          <h1>Analytika a reporty</h1>
          <p>
            {loading
              ? "Načítám analytiku…"
              : "Přehled výkonu a vystavení reportů za zvolené období."}
          </p>
        </div>
        <div className="admin-analytika-filters">
          <div
            className="admin-filters admin-filters-inline"
            role="tablist"
            aria-label="Období"
          >
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
          <div
            className="admin-filters admin-filters-inline"
            role="tablist"
            aria-label="Obchod"
          >
            {ANALYTICS_SHOPS.map((item) => (
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
              <p>Souhrn nominální hodnoty poukazů (Kč).</p>
            </div>
          </div>
          <div className="admin-panel-chart">
            <AdminRevenueChart points={revenuePoints} ariaLabel="Graf tržeb" />
          </div>
        </article>
        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <h2>Prodané poukazy za vybrané období</h2>
              <p>Počet prodaných poukazů v čase.</p>
            </div>
          </div>
          <div className="admin-panel-chart">
            <AdminSoldBarChart points={soldPoints} ariaLabel="Graf prodejů" />
          </div>
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

        <div className="admin-analytics-side">
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

          <article className="admin-panel admin-reports-card">
            <div className="admin-panel-head">
              <div>
                <h2>Reporty</h2>
                <p>Prodeje a uplatnění včetně dělení dle DPH.</p>
              </div>
            </div>
            <button
              type="button"
              className="admin-primary-btn admin-reports-open-btn"
              onClick={() => setReportStep("filters")}
            >
              Vygenerovat report
            </button>
          </article>
        </div>
      </section>

      {reportStep === "filters" ? (
        <ReportFilterModal
          onClose={() => setReportStep("closed")}
          onGenerate={(next) => {
            setReport(next);
            setReportStep("result");
          }}
        />
      ) : null}

      {reportStep === "result" && report ? (
        <ReportResultModal
          report={report}
          onClose={() => {
            setReport(null);
            setReportStep("closed");
          }}
          onBack={() => setReportStep("filters")}
        />
      ) : null}
    </div>
  );
}
