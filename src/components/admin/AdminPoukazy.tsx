"use client";

import { useMemo, useState } from "react";
import type { AdminSoldVoucher } from "@/data/admin-vouchers";
import { useAdminVoucherDrawer } from "./AdminVoucherDrawer";

type FilterKey = "all" | AdminSoldVoucher["status"];

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Všechny" },
  { key: "active", label: "Aktivní" },
  { key: "redeemed", label: "Uplatněné" },
  { key: "expired", label: "Expirované" },
  { key: "cancelled", label: "Stornované" },
];

export function AdminPoukazy() {
  const { openVoucher, activeVoucherCode, vouchers } = useAdminVoucherDrawer();
  const [filter, setFilter] = useState<FilterKey>("all");

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
        <button type="button" className="admin-outline-btn">
          Exportovat CSV
        </button>
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
          <table className="admin-table">
            <thead>
              <tr>
                <th>Kód</th>
                <th>Zákazník</th>
                <th>Hodnota</th>
                <th>Datum nákupu</th>
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
                    <td>{row.value}</td>
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
    </div>
  );
}
