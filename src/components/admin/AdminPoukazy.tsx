"use client";

import { useMemo, useState } from "react";

type VoucherStatus = "active" | "redeemed" | "expired" | "cancelled";
type FilterKey = "all" | VoucherStatus;

type VoucherRow = {
  code: string;
  customer: string;
  value: string;
  purchasedAt: string;
  validUntil: string;
  status: VoucherStatus;
  statusLabel: string;
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Všechny" },
  { key: "active", label: "Aktivní" },
  { key: "redeemed", label: "Uplatněné" },
  { key: "expired", label: "Expirované" },
  { key: "cancelled", label: "Stornované" },
];

const VOUCHERS: VoucherRow[] = [
  {
    code: "BRX4K9",
    customer: "Jana Nováková",
    value: "1 290 Kč",
    purchasedAt: "22. 4. 2026",
    validUntil: "22. 4. 2027",
    status: "active",
    statusLabel: "Aktivní",
  },
  {
    code: "LQ8M2P",
    customer: "Petr Svoboda",
    value: "2 490 Kč",
    purchasedAt: "21. 4. 2026",
    validUntil: "21. 4. 2027",
    status: "redeemed",
    statusLabel: "Uplatněný",
  },
  {
    code: "ZT7N1C",
    customer: "Lucie Dvořáková",
    value: "1 800 Kč",
    purchasedAt: "20. 4. 2026",
    validUntil: "20. 4. 2027",
    status: "expired",
    statusLabel: "Expirovaný",
  },
  {
    code: "HK3V8D",
    customer: "Martin Černý",
    value: "500 Kč",
    purchasedAt: "19. 4. 2026",
    validUntil: "19. 4. 2027",
    status: "cancelled",
    statusLabel: "Stornovaný",
  },
  {
    code: "PW5J6A",
    customer: "Eva Horáková",
    value: "1 100 Kč",
    purchasedAt: "18. 4. 2026",
    validUntil: "18. 4. 2027",
    status: "active",
    statusLabel: "Aktivní",
  },
  {
    code: "MN2Q9E",
    customer: "Tomáš Krejčí",
    value: "3 200 Kč",
    purchasedAt: "17. 4. 2026",
    validUntil: "17. 4. 2027",
    status: "redeemed",
    statusLabel: "Uplatněný",
  },
  {
    code: "CX1R4B",
    customer: "Kateřina Malá",
    value: "750 Kč",
    purchasedAt: "16. 4. 2026",
    validUntil: "16. 4. 2027",
    status: "active",
    statusLabel: "Aktivní",
  },
  {
    code: "YF6T0S",
    customer: "Jakub Němec",
    value: "1 990 Kč",
    purchasedAt: "15. 4. 2026",
    validUntil: "15. 4. 2027",
    status: "expired",
    statusLabel: "Expirovaný",
  },
];

export function AdminPoukazy() {
  const [filter, setFilter] = useState<FilterKey>("all");

  const rows = useMemo(() => {
    if (filter === "all") return VOUCHERS;
    return VOUCHERS.filter((row) => row.status === filter);
  }, [filter]);

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
                  <tr key={row.code}>
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
