"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AdminRevenueChart,
  AdminSoldBarChart,
  buildAdminChartPoints,
  type AdminChartPeriod,
} from "@/components/admin/AdminCharts";
import { rangeForPeriod } from "@/lib/admin-analytics";
import {
  AdminSkeletonChart,
  AdminSkeletonStatCards,
  AdminSkeletonStatusList,
  AdminSkeletonVariantList,
} from "@/components/admin/AdminSkeleton";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { IconGenerateReport } from "@/components/admin/icons";
import { getEnabledShopBrands } from "@/data/shops";
import { formatCzk } from "@/data/vouchers";
import type { StaffActivityRow } from "@/lib/admin-staff-activity";
import {
  reportShopLabel,
  shopLineLabel,
  type ReportActivityFilter,
  type ReportShopFilter,
  type VoucherReport,
} from "@/lib/voucher-reports";

type PeriodKey = "week" | "month" | "year" | "all" | "custom";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "week", label: "Tento týden" },
  { key: "month", label: "Tento měsíc" },
  { key: "year", label: "Tento rok" },
  { key: "all", label: "Za celou dobu" },
  { key: "custom", label: "Vlastní" },
];

type AnalyticsShopFilter = ReportShopFilter;

type AnalyticsFilterState = {
  period: PeriodKey;
  from: string;
  to: string;
  shop: AnalyticsShopFilter;
  userId: string;
};

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
  staff: StaffActivityRow[];
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
  staff: [],
};

type ReportUserOption = {
  id: string;
  name: string;
  roleLabel: string;
};

const REPORT_ACTIVITIES: { key: ReportActivityFilter; label: string }[] = [
  { key: "all", label: "Vystavení i uplatnění" },
  { key: "issued", label: "Jen vystavení" },
  { key: "redeemed", label: "Jen uplatnění" },
];

const ANALYTICS_SHOPS: { key: AnalyticsShopFilter; label: string }[] = [
  { key: "all", label: "Všechny pobočky" },
  ...getEnabledShopBrands().map((brand) => ({
    key: brand.id as AnalyticsShopFilter,
    label: brand.brandName,
  })),
];

function defaultAnalyticsFilters(): AnalyticsFilterState {
  const range = rangeForPeriod("month");
  return {
    period: "month",
    from: range.from,
    to: range.to,
    shop: "all",
    userId: "",
  };
}

function chartPeriodForFilters(filters: AnalyticsFilterState): AdminChartPeriod {
  if (filters.period !== "custom") return filters.period;
  const days =
    Math.round(
      (new Date(`${filters.to}T12:00:00`).getTime() -
        new Date(`${filters.from}T12:00:00`).getTime()) /
        86_400_000,
    ) + 1;
  return days > 60 ? "year" : "month";
}

function analyticsFiltersSummary(
  filters: AnalyticsFilterState,
  users: ReportUserOption[],
) {
  const periodLabel =
    filters.period === "custom"
      ? `${formatReportDateCs(filters.from)} – ${formatReportDateCs(filters.to)}`
      : (PERIODS.find((item) => item.key === filters.period)?.label ??
        filters.period);
  const shopLabel =
    ANALYTICS_SHOPS.find((item) => item.key === filters.shop)?.label ??
    "Všechny pobočky";
  const userLabel = filters.userId
    ? (users.find((user) => user.id === filters.userId)?.name ?? "Uživatel")
    : "Všichni uživatelé";
  return `${periodLabel} · ${shopLabel} · ${userLabel}`;
}

type ReportPreset = "week" | "month" | "year" | "all";

function rangeForPreset(preset: ReportPreset) {
  return rangeForPeriod(preset);
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
    "Vystavil",
    "Uplatnil",
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
        row.issuedByName ?? "",
        row.redeemedByName ?? "",
        report.from,
        report.to,
      ]
        .map((cell) => `"${cell.replace(/"/g, '""')}"`)
        .join(";"),
    ),
  ];

  if ((report.staffRows?.length ?? 0) > 0) {
    lines.push("");
    lines.push(["Uživatel", "Role", "Vystaveno", "Uplatněno"].join(";"));
    for (const row of report.staffRows ?? []) {
      lines.push(
        [row.name, row.roleLabel, String(row.issued), String(row.redeemed)]
          .map((cell) => `"${cell.replace(/"/g, '""')}"`)
          .join(";"),
      );
    }
  }

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
  { key: "week", label: "Tento týden" },
  { key: "month", label: "Tento měsíc" },
  { key: "year", label: "Tento rok" },
  { key: "all", label: "Za celou dobu" },
];

const REPORT_SHOPS: { key: ReportShopFilter; label: string }[] = [
  { key: "all", label: "Celkový přehled" },
  ...getEnabledShopBrands().map((brand) => ({
    key: brand.id as ReportShopFilter,
    label: brand.id === "lss" ? "LSS" : brand.brandName,
  })),
];

function ReportFilterModal({
  onClose,
  onGenerate,
  users,
}: {
  onClose: () => void;
  onGenerate: (report: VoucherReport) => void;
  users: ReportUserOption[];
}) {
  const defaults = useMemo(() => rangeForPreset("month"), []);
  const [shop, setShop] = useState<ReportShopFilter>("all");
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [userId, setUserId] = useState("");
  const [activity, setActivity] = useState<ReportActivityFilter>("all");
  const [activePreset, setActivePreset] = useState<ReportPreset | null>("month");
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
      const params = new URLSearchParams({
        from,
        to,
        shop,
        activity,
      });
      if (userId) params.set("user", userId);
      const response = await fetch(
        `/api/admin/voucher-reports?${params.toString()}`,
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
            <p>DPH, prodeje a aktivita uživatelů (vystavení / uplatnění).</p>
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
            <AdminSelect
              ariaLabel="Vyberte obchod"
              value={shop}
              options={REPORT_SHOPS.map((item) => ({
                value: item.key,
                label: item.label,
              }))}
              onChange={(value) => setShop(value as ReportShopFilter)}
            />
          </div>

          <div className="admin-field">
            <span>Aktivita</span>
            <AdminSelect
              ariaLabel="Vyberte aktivitu"
              value={activity}
              options={REPORT_ACTIVITIES.map((item) => ({
                value: item.key,
                label: item.label,
              }))}
              onChange={(value) =>
                setActivity(value as ReportActivityFilter)
              }
            />
          </div>

          <div className="admin-field">
            <span>Uživatel</span>
            <AdminSelect
              ariaLabel="Vyberte uživatele"
              value={userId}
              options={[
                { value: "", label: "Všichni uživatelé" },
                ...users.map((user) => ({
                  value: user.id,
                  label: `${user.name} · ${user.roleLabel}`,
                })),
              ]}
              onChange={setUserId}
            />
          </div>

          <div className="admin-field">
            <span>Období</span>
            <AdminSelect
              ariaLabel="Vyberte období"
              value={activePreset ?? "custom"}
              options={[
                ...REPORT_PRESETS.map((item) => ({
                  value: item.key,
                  label: item.label,
                })),
                { value: "custom", label: "Vlastní" },
              ]}
              onChange={(value) => {
                if (value === "custom") {
                  setActivePreset(null);
                  return;
                }
                applyPreset(value as ReportPreset);
              }}
            />
          </div>

          {activePreset === null ? (
            <div className="admin-reports-dates">
              <label className="admin-field">
                <span>Od</span>
                <input
                  type="date"
                  value={from}
                  max={to || undefined}
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
                  min={from || undefined}
                  onChange={(event) => {
                    setTo(event.target.value);
                    setActivePreset(null);
                  }}
                />
              </label>
            </div>
          ) : null}
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
            {generating ? (
              "Generuji…"
            ) : (
              <>
                <IconGenerateReport className="admin-page-head-btn-icon" />
                <span className="admin-page-head-btn-label">Vygenerovat</span>
              </>
            )}
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
    (row) => row.section !== "Souhrn" && row.section !== "Podle uživatele",
  );
  const activityLabel =
    REPORT_ACTIVITIES.find((item) => item.key === report.activity)?.label ??
    "Vystavení i uplatnění";

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
              {formatReportDateCs(report.to)} · {reportShopLabel(report.shop)} ·{" "}
              {activityLabel}
              {report.userLabel ? ` · ${report.userLabel}` : ""} · DPH ze
              snapshotu při prodeji
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

        {(report.staffRows?.length ?? 0) > 0 ? (
          <div className="admin-reports-aggregate">
            <div className="admin-reports-preview-head">
              <h3>Podle uživatele</h3>
              <p>Ruční vystavení a uplatnění ve zvoleném období</p>
            </div>
            <div className="admin-reports-table-wrap">
              <table className="admin-reports-table">
                <thead>
                  <tr>
                    <th>Uživatel</th>
                    <th>Role</th>
                    <th>Vystaveno</th>
                    <th>Uplatněno</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.staffRows ?? []).map((row) => (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      <td>{row.roleLabel}</td>
                      <td>{row.issued}</td>
                      <td>{row.redeemed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

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
                  <th>Vystavil</th>
                  <th>Uplatnil</th>
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
                    <td>{row.issuedByName || "—"}</td>
                    <td>{row.redeemedByName || "—"}</td>
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


function AnalyticsFiltersModal({
  initial,
  users,
  onClose,
  onSave,
}: {
  initial: AnalyticsFilterState;
  users: ReportUserOption[];
  onClose: () => void;
  onSave: (next: AnalyticsFilterState) => void;
}) {
  const [draft, setDraft] = useState<AnalyticsFilterState>(initial);
  const [error, setError] = useState<string | null>(null);

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

  function applyPeriod(period: PeriodKey) {
    if (period === "custom") {
      setDraft((prev) => ({ ...prev, period }));
      return;
    }
    const range = rangeForPeriod(period);
    setDraft((prev) => ({
      ...prev,
      period,
      from: range.from,
      to: range.to,
    }));
  }

  function handleSave() {
    if (draft.period === "custom") {
      if (!draft.from || !draft.to) {
        setError("Vyberte období od–do.");
        return;
      }
      if (draft.from > draft.to) {
        setError("Datum Od nesmí být po datu Do.");
        return;
      }
    }
    setError(null);
    onSave(draft);
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
        className="admin-confirm-dialog admin-reports-modal admin-reports-modal-filters admin-analytika-filters-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-analytika-filters-title"
      >
        <div className="admin-reports-modal-head">
          <div>
            <h2 id="admin-analytika-filters-title">Filtry analytiky</h2>
            <p>Období, pobočka a uživatel pro přehled statistik.</p>
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
            <span>Období</span>
            <AdminSelect
              ariaLabel="Vyberte období"
              value={draft.period}
              options={PERIODS.map((item) => ({
                value: item.key,
                label: item.label,
              }))}
              onChange={(value) => applyPeriod(value as PeriodKey)}
            />
          </div>

          {draft.period === "custom" ? (
            <div className="admin-reports-dates">
              <label className="admin-field">
                <span>Od</span>
                <input
                  type="date"
                  value={draft.from}
                  max={draft.to || undefined}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, from: event.target.value }))
                  }
                />
              </label>
              <label className="admin-field">
                <span>Do</span>
                <input
                  type="date"
                  value={draft.to}
                  min={draft.from || undefined}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, to: event.target.value }))
                  }
                />
              </label>
            </div>
          ) : null}

          <div className="admin-field">
            <span>Pobočka</span>
            <AdminSelect
              ariaLabel="Vyberte pobočku"
              value={draft.shop}
              options={ANALYTICS_SHOPS.map((item) => ({
                value: item.key,
                label: item.label,
              }))}
              onChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  shop: value as AnalyticsShopFilter,
                }))
              }
            />
          </div>

          <div className="admin-field">
            <span>Uživatel</span>
            <AdminSelect
              ariaLabel="Vyberte uživatele"
              value={draft.userId}
              options={[
                { value: "", label: "Všichni uživatelé" },
                ...users.map((user) => ({
                  value: user.id,
                  label: `${user.name} · ${user.roleLabel}`,
                })),
              ]}
              onChange={(value) =>
                setDraft((prev) => ({ ...prev, userId: value }))
              }
            />
          </div>
        </div>

        {error ? <p className="admin-field-hint">{error}</p> : null}

        <div className="admin-reports-download admin-reports-download-end">
          <button
            type="button"
            className="admin-primary-btn"
            onClick={handleSave}
          >
            Uložit filtry
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminAnalytika() {
  const [filters, setFilters] = useState<AnalyticsFilterState>(
    defaultAnalyticsFilters,
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [stats, setStats] = useState<LiveAnalytics>(EMPTY_ANALYTICS);
  const [userOptions, setUserOptions] = useState<ReportUserOption[]>([]);
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
        const params = new URLSearchParams({
          shop: filters.shop,
        });
        if (filters.period === "custom") {
          params.set("from", filters.from);
          params.set("to", filters.to);
        } else {
          params.set("period", filters.period);
        }
        if (filters.userId) params.set("user", filters.userId);
        const response = await fetch(
          `/api/admin/analytics?${params.toString()}`,
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
          staff?: StaffActivityRow[];
        };
        if (cancelled) return;
        const staff = Array.isArray(data.staff) ? data.staff : [];
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
          staff,
        });
        if (!filters.userId) {
          setUserOptions(
            staff.map((row) => ({
              id: row.id,
              name: row.name,
              roleLabel: row.roleLabel,
            })),
          );
        }
      } catch {
        if (!cancelled) setStats(EMPTY_ANALYTICS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  const chartPeriod = useMemo(
    () => chartPeriodForFilters(filters),
    [filters],
  );
  const revenuePoints = useMemo(
    () =>
      buildAdminChartPoints(
        stats.chartRevenue,
        stats.chartDates,
        chartPeriod,
      ),
    [stats.chartRevenue, stats.chartDates, chartPeriod],
  );
  const soldPoints = useMemo(
    () =>
      buildAdminChartPoints(stats.chartSold, stats.chartDates, chartPeriod),
    [stats.chartSold, stats.chartDates, chartPeriod],
  );

  return (
    <div className="admin-analytika">
      <div className="admin-page-head">
        <div>
          <h1>Analytika a reporty</h1>
          <p>
            {loading
              ? "Načítám analytiku…"
              : analyticsFiltersSummary(filters, userOptions)}
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
        <AnalyticsFiltersModal
          initial={filters}
          users={userOptions}
          onClose={() => setFiltersOpen(false)}
          onSave={(next) => {
            setFilters(next);
            setFiltersOpen(false);
          }}
        />
      ) : null}

      {loading ? (
        <AdminSkeletonStatCards count={4} className="admin-analytics-stats" />
      ) : (
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
      )}

      <section className="admin-analytics-charts">
        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <h2>Tržby za vybrané období</h2>
              <p>Souhrn nominální hodnoty poukazů (Kč).</p>
            </div>
          </div>
          <div className="admin-panel-chart">
            {loading ? (
              <AdminSkeletonChart ariaLabel="Načítám graf tržeb" />
            ) : (
              <AdminRevenueChart points={revenuePoints} ariaLabel="Graf tržeb" />
            )}
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
            {loading ? (
              <AdminSkeletonChart ariaLabel="Načítám graf prodejů" />
            ) : (
              <AdminSoldBarChart points={soldPoints} ariaLabel="Graf prodejů" />
            )}
          </div>
        </article>
      </section>

      <section className="admin-panel admin-staff-activity-panel">
        <div className="admin-panel-head">
          <div>
            <h2>Vystavení a uplatnění podle uživatele</h2>
            <p>
              Ruční vystavení (vlastník, recepce, obsluha+) a uplatnění
              (vlastník, recepce, obsluha, obsluha+) za zvolené období.
            </p>
          </div>
        </div>
        {loading ? (
          <AdminSkeletonStatusList rows={4} />
        ) : stats.staff.length === 0 ? (
          <div className="admin-panel-empty">
            <p className="admin-table-empty">
              Žádní uživatelé s oprávněním vystavit nebo uplatnit poukaz.
            </p>
          </div>
        ) : (
          <div className="admin-reports-table-wrap">
            <table className="admin-reports-table admin-staff-activity-table">
              <thead>
                <tr>
                  <th>Uživatel</th>
                  <th>Role</th>
                  <th>Vystaveno</th>
                  <th>Uplatněno</th>
                </tr>
              </thead>
              <tbody>
                {stats.staff.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="admin-staff-activity-user">
                        <AdminAvatar
                          src={row.avatarUrl}
                          name={row.name}
                          className="admin-member-avatar"
                        />
                        <div className="admin-staff-activity-user-copy">
                          <strong>{row.name}</strong>
                          <span className="admin-staff-activity-username">
                            @{row.username}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>{row.roleLabel}</td>
                    <td>{row.issued}</td>
                    <td>{row.redeemed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-analytics-bottom">
        <article className="admin-panel">
          <div className="admin-panel-head">
            <h2>Přehled variant</h2>
          </div>
          {loading ? (
            <AdminSkeletonVariantList rows={4} />
          ) : stats.variants.length === 0 ? (
            <div className="admin-panel-empty">
              <p className="admin-table-empty">Zatím žádné varianty.</p>
            </div>
          ) : (
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
          )}
        </article>

        <div className="admin-analytics-side">
          <article className="admin-panel">
            <div className="admin-panel-head">
              <h2>Stav poukazů</h2>
            </div>
            {loading ? (
              <AdminSkeletonStatusList rows={4} />
            ) : (
              <ul className="admin-status-list">
                {stats.statuses.map((item) => (
                  <li key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.count}</strong>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="admin-panel admin-reports-card">
            <div className="admin-panel-head">
              <div>
                <h2>Reporty</h2>
                <p>
                  Prodeje, uplatnění, DPH a filtrování podle uživatelů.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="admin-primary-btn admin-reports-open-btn"
              onClick={() => setReportStep("filters")}
            >
              <IconGenerateReport className="admin-page-head-btn-icon" />
              <span className="admin-page-head-btn-label">Vygenerovat report</span>
            </button>
          </article>
        </div>
      </section>

      {reportStep === "filters" ? (
        <ReportFilterModal
          users={userOptions}
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
