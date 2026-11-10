"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminSoldVoucher } from "@/data/admin-vouchers";
import { canCreateVoucher } from "@/lib/auth";
import { AdminAddVoucherDrawer } from "./AdminAddVoucherDrawer";
import { AdminSelect } from "./AdminSelect";
import { AdminSkeletonTableRows } from "./AdminSkeleton";
import { useAdminUser } from "./AdminUserProvider";
import { useAdminVoucherDrawer } from "./AdminVoucherDrawer";
import { IconExportCsv, IconPlus } from "./icons";

type FilterKey = "all" | AdminSoldVoucher["status"];

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Všechny" },
  { key: "active", label: "Aktivní" },
  { key: "awaiting_shipment", label: "Čeká na odeslání" },
  { key: "awaiting_pickup", label: "Čeká na vyzvednutí" },
  { key: "redeemed", label: "Uplatněné" },
  { key: "expired", label: "Expirované" },
  { key: "cancelled", label: "Stornované" },
];

const PAGE_SIZE = 50;

const CSV_HEADERS = [
  "Kód",
  "Zákazník",
  "E-mail",
  "Telefon",
  "Produkt",
  "Hodnota",
  "Celková částka",
  "Datum nákupu",
  "Platí do",
  "Uplatnění",
  "Způsob doručení",
  "Stav",
] as const;

function escapeCsvCell(value: string) {
  if (/[",;\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function vouchersToCsv(vouchers: AdminSoldVoucher[]) {
  const lines = [
    CSV_HEADERS.join(";"),
    ...vouchers.map((voucher) =>
      [
        voucher.code,
        voucher.customer,
        voucher.email,
        voucher.phone,
        voucher.product,
        voucher.value,
        voucher.totalPaid,
        voucher.purchasedAt,
        voucher.validUntil,
        voucher.redeemedLabel ?? "",
        voucher.deliveryMethod,
        voucher.statusLabel,
      ]
        .map(escapeCsvCell)
        .join(";"),
    ),
  ];

  return `\uFEFF${lines.join("\r\n")}`;
}

function downloadVouchersCsv(vouchers: AdminSoldVoucher[], filter: FilterKey) {
  const csv = vouchersToCsv(vouchers);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  const suffix = filter === "all" ? "vse" : filter;

  link.href = url;
  link.download = `poukazy-${suffix}-${date}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Typ / služba v seznamu: u částky „Částka 1500 Kč“, u zážitku název. */
function voucherTypeLabel(row: AdminSoldVoucher) {
  if (row.itemKind === "amount") {
    const amount = row.unitPriceCzk ?? 0;
    if (!Number.isFinite(amount)) return row.value;
    return `Částka ${amount.toLocaleString("cs-CZ")} Kč`;
  }
  return row.product.replace(/\s*·\s*.*$/, "").trim() || row.product;
}

function FilterIcon() {
  return (
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
  );
}

function PoukazyStatusFiltersModal({
  initialFilter,
  onClose,
  onSave,
}: {
  initialFilter: FilterKey;
  onClose: () => void;
  onSave: (filter: FilterKey) => void;
}) {
  const [draft, setDraft] = useState<FilterKey>(initialFilter);

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
        className="admin-confirm-dialog admin-reports-modal admin-reports-modal-filters"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-poukazy-filters-title"
      >
        <div className="admin-reports-modal-head">
          <div>
            <h2 id="admin-poukazy-filters-title">Filtry poukazů</h2>
            <p>Vyberte stav poukazů, které chcete zobrazit.</p>
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
            <span>Stav</span>
            <AdminSelect
              ariaLabel="Vyberte stav poukazů"
              value={draft}
              options={FILTERS.map((item) => ({
                value: item.key,
                label: item.label,
              }))}
              onChange={(value) => setDraft(value as FilterKey)}
            />
          </div>
        </div>

        <div className="admin-reports-download admin-reports-download-end">
          <button
            type="button"
            className="admin-primary-btn"
            onClick={() => onSave(draft)}
          >
            Uložit filtry
          </button>
        </div>
      </div>
    </div>
  );
}

type ListResponse = {
  vouchers?: AdminSoldVoucher[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
};

export function AdminPoukazy() {
  const { user } = useAdminUser();
  const allowCreate = canCreateVoucher(user.role);
  const { openVoucher, activeVoucherCode, prependVoucher } =
    useAdminVoucherDrawer();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AdminSoldVoucher[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadPage = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        status: filter,
      });
      const response = await fetch(`/api/admin/sold-vouchers?${params}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        setRows([]);
        setTotal(0);
        setTotalPages(1);
        return;
      }
      const data = (await response.json()) as ListResponse;
      const vouchers = Array.isArray(data.vouchers) ? data.vouchers : [];
      setRows(vouchers);
      setTotal(data.total ?? vouchers.length);
      setTotalPages(Math.max(1, data.totalPages ?? 1));
    } catch {
      setRows([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  useEffect(() => {
    const onDeleted = (event: Event) => {
      const code = (event as CustomEvent<{ code?: string }>).detail?.code;
      if (!code) {
        void loadPage();
        return;
      }
      setRows((current) => current.filter((row) => row.code !== code));
      setTotal((current) => Math.max(0, current - 1));
    };
    window.addEventListener("admin-sold-voucher-deleted", onDeleted);
    return () => {
      window.removeEventListener("admin-sold-voucher-deleted", onDeleted);
    };
  }, [loadPage]);

  const filterLabel =
    FILTERS.find((item) => item.key === filter)?.label ?? "Všechny";
  const fromIdx = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const toIdx = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="admin-poukazy">
      <div className="admin-page-head">
        <div className="admin-poukazy-head-main">
          <div>
            <h1>Poukazy</h1>
            <p className="admin-poukazy-lead-desktop">
              Přehled prodaných poukazů · řazení od nejnovějšího nákupu
            </p>
            <p className="admin-poukazy-lead-mobile">
              Přehled poukazů · {filterLabel}
            </p>
          </div>
        </div>
        <div className="admin-page-head-actions">
          <button
            type="button"
            className="admin-outline-btn admin-page-head-secondary admin-export-btn"
            aria-label="Exportovat CSV"
            onClick={() => downloadVouchersCsv(rows, filter)}
          >
            <IconExportCsv className="admin-page-head-btn-icon" />
            <span className="admin-export-label-full admin-page-head-btn-label">
              Exportovat CSV
            </span>
            <span
              className="admin-export-label-short admin-page-head-btn-label"
              aria-hidden
            >
              CSV
            </span>
          </button>
          {allowCreate ? (
            <button
              type="button"
              className="admin-primary-btn admin-page-head-primary"
              onClick={() => setAddOpen(true)}
            >
              <IconPlus className="admin-page-head-btn-icon" />
              <span className="admin-page-head-btn-label">Přidat poukaz</span>
            </button>
          ) : null}
        </div>
        <div className="admin-page-head-actions admin-poukazy-mobile-filter-actions">
          <button
            type="button"
            className="admin-primary-btn admin-page-head-primary admin-analytika-filter-btn"
            onClick={() => setFiltersOpen(true)}
            aria-label="Otevřít filtry"
          >
            <FilterIcon />
            <span className="admin-page-head-btn-label">Filtry</span>
          </button>
        </div>
      </div>

      <div
        className="admin-filters admin-poukazy-status-filters"
        role="tablist"
        aria-label="Filtrovat poukazy"
      >
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={filter === item.key}
            className={
              filter === item.key
                ? "admin-filter-chip is-active"
                : "admin-filter-chip"
            }
            onClick={() => setFilter(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section className="admin-panel admin-poukazy-panel">
        <div className="admin-table-wrap">
          <table className="admin-table admin-poukazy-table">
            <thead>
              <tr>
                <th>Kód</th>
                <th>Zákazník</th>
                <th>Poukaz</th>
                <th>Uplatnění</th>
                <th>Zakoupeno</th>
                <th>Platí do</th>
                <th>Stav</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminSkeletonTableRows rows={8} cols={7} />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="admin-table-empty">
                    Žádné poukazy v tomto filtru.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.code}
                    className={
                      activeVoucherCode === row.code
                        ? "is-clickable is-selected"
                        : "is-clickable"
                    }
                    onClick={() => openVoucher(row)}
                  >
                    <td className="admin-table-code">{row.code}</td>
                    <td>{row.customer || "—"}</td>
                    <td className="admin-poukazy-type">
                      {voucherTypeLabel(row)}
                    </td>
                    <td className="admin-poukazy-redeemed">
                      {row.redeemedLabel || "—"}
                    </td>
                    <td>{row.purchasedAt}</td>
                    <td>{row.validUntil}</td>
                    <td>
                      <span className={`admin-status is-${row.status}`}>
                        {row.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-poukazy-pagination">
          <p className="admin-poukazy-pagination-meta">
            <span className="admin-page-head-btn-label">
              {total === 0
                ? "0 poukazů"
                : `${fromIdx}–${toIdx} z ${total.toLocaleString("cs-CZ")}`}
            </span>
          </p>
          <div className="admin-poukazy-pagination-controls">
            <button
              type="button"
              className="admin-outline-btn admin-page-head-secondary"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <span className="admin-page-head-btn-label">Předchozí</span>
            </button>
            <span className="admin-poukazy-page-indicator">
              <span className="admin-page-head-btn-label">
                {page} / {totalPages}
              </span>
            </span>
            <button
              type="button"
              className="admin-primary-btn admin-page-head-primary"
              disabled={page >= totalPages || loading}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
            >
              <span className="admin-page-head-btn-label">Další</span>
            </button>
          </div>
        </div>
      </section>

      {filtersOpen ? (
        <PoukazyStatusFiltersModal
          initialFilter={filter}
          onClose={() => setFiltersOpen(false)}
          onSave={(next) => {
            setFilter(next);
            setFiltersOpen(false);
          }}
        />
      ) : null}

      {addOpen && allowCreate ? (
        <AdminAddVoucherDrawer
          onClose={() => setAddOpen(false)}
          onCreated={(voucher) => {
            prependVoucher(voucher);
            openVoucher(voucher);
            void loadPage();
          }}
        />
      ) : null}
    </div>
  );
}
