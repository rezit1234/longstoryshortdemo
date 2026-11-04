"use client";

import { useMemo, useState } from "react";
import type { AdminSoldVoucher } from "@/data/admin-vouchers";
import { canCreateVoucher } from "@/lib/auth";
import { AdminAddVoucherDrawer } from "./AdminAddVoucherDrawer";
import { useAdminUser } from "./AdminUserProvider";
import { useAdminVoucherDrawer } from "./AdminVoucherDrawer";

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

export function AdminPoukazy() {
  const { user } = useAdminUser();
  const allowCreate = canCreateVoucher(user.role);
  const { openVoucher, activeVoucherCode, vouchers, prependVoucher } =
    useAdminVoucherDrawer();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [addOpen, setAddOpen] = useState(false);

  const rows = useMemo(() => {
    if (filter === "all") return vouchers;
    return vouchers.filter((row) => row.status === filter);
  }, [filter, vouchers]);

  return (
    <div className="admin-poukazy">
      <div className="admin-page-head">
        <div>
          <h1>Poukazy</h1>
          <p>Přehled všech prodaných poukazů vašeho obchodu.</p>
        </div>
        <div className="admin-page-head-actions">
          <button
            type="button"
            className="admin-outline-btn admin-page-head-secondary admin-export-btn"
            aria-label="Exportovat CSV"
            onClick={() => downloadVouchersCsv(rows, filter)}
          >
            <span className="admin-export-label-full">Exportovat CSV</span>
            <span className="admin-export-label-short" aria-hidden>
              CSV
            </span>
          </button>
          {allowCreate ? (
            <button
              type="button"
              className="admin-primary-btn admin-page-head-primary"
              onClick={() => setAddOpen(true)}
            >
              Přidat poukaz
            </button>
          ) : null}
        </div>
      </div>

      <div className="admin-filters" role="tablist" aria-label="Filtrovat poukazy">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={filter === item.key}
            className={
              filter === item.key ? "admin-filter-chip is-active" : "admin-filter-chip"
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
                <th>Zakoupeno</th>
                <th>Platí do</th>
                <th>Stav</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-table-empty">
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
                    <td>{row.customer}</td>
                    <td className="admin-poukazy-type">{voucherTypeLabel(row)}</td>
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
      </section>

      {addOpen && allowCreate ? (
        <AdminAddVoucherDrawer
          onClose={() => setAddOpen(false)}
          onCreated={(voucher) => {
            prependVoucher(voucher);
            openVoucher(voucher);
          }}
        />
      ) : null}
    </div>
  );
}
