"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminSoldVoucher } from "@/data/admin-vouchers";
import { canViewRedemptionHistory } from "@/lib/auth";
import { AdminSkeletonTableRows } from "./AdminSkeleton";
import { useAdminUser } from "./AdminUserProvider";
import { useAdminVoucherDrawer } from "./AdminVoucherDrawer";

type HistoryItem = {
  id: string;
  createdAtLabel: string;
  detailLabel: string;
  isUndone: boolean;
  voucherCode: string;
  redeemedByName: string;
};

const PAGE_SIZE = 50;

export function AdminHistorieUplatneni() {
  const { user } = useAdminUser();
  const { openVoucher } = useAdminVoucherDrawer();
  const allowed = canViewRedemptionHistory(user.role);

  const [rows, setRows] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [openingCode, setOpeningCode] = useState<string | null>(null);

  const loadPage = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/redemption-history?page=${page}&pageSize=${PAGE_SIZE}`,
      );
      const data = (await response.json().catch(() => ({}))) as {
        items?: HistoryItem[];
        total?: number;
        totalPages?: number;
        error?: string;
      };
      if (!response.ok) {
        setRows([]);
        setTotal(0);
        setTotalPages(1);
        setError(data.error || "Historii se nepodařilo načíst.");
        return;
      }
      setRows(data.items ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      setRows([]);
      setTotal(0);
      setTotalPages(1);
      setError("Historii se nepodařilo načíst.");
    } finally {
      setLoading(false);
    }
  }, [allowed, page]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const openByCode = useCallback(
    async (code: string) => {
      if (!code || code === "—") return;
      setOpeningCode(code);
      try {
        const response = await fetch(
          `/api/admin/sold-vouchers?q=${encodeURIComponent(code)}&pageSize=5`,
        );
        const data = (await response.json().catch(() => ({}))) as {
          vouchers?: AdminSoldVoucher[];
          error?: string;
        };
        const match = (data.vouchers ?? []).find(
          (item) => item.code.toUpperCase() === code.toUpperCase(),
        );
        if (!response.ok || !match) {
          setError(data.error || "Poukaz se nepodařilo otevřít.");
          return;
        }
        openVoucher(match);
      } catch {
        setError("Poukaz se nepodařilo otevřít.");
      } finally {
        setOpeningCode(null);
      }
    },
    [openVoucher],
  );

  if (!allowed) {
    return (
      <div className="admin-poukazy">
        <div className="admin-page-head">
          <div>
            <h1>Historie uplatnění</h1>
            <p>Tuto sekci mohou zobrazit jen vlastník a recepce.</p>
          </div>
        </div>
      </div>
    );
  }

  const fromIdx = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const toIdx = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="admin-poukazy">
      <div className="admin-page-head">
        <div className="admin-poukazy-head-main">
          <div>
            <h1>Historie uplatnění</h1>
            <p className="admin-poukazy-lead-desktop">
              Všechna uplatnění poukazů · od nejnovějšího
            </p>
            <p className="admin-poukazy-lead-mobile">Historie uplatnění</p>
          </div>
        </div>
      </div>

      {error ? (
        <p className="admin-voucher-drawer-email-feedback is-error">{error}</p>
      ) : null}

      <section className="admin-panel admin-poukazy-panel">
        <div className="admin-table-wrap">
          <table className="admin-table admin-poukazy-table">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Kód</th>
                <th>Uplatnění</th>
                <th>Uplatnil</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminSkeletonTableRows rows={8} cols={4} />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="admin-table-empty">
                    Zatím žádná uplatnění.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className={row.isUndone ? "is-undone-redemption" : undefined}
                  >
                    <td>{row.createdAtLabel}</td>
                    <td>
                      <button
                        type="button"
                        className="admin-text-action"
                        disabled={openingCode === row.voucherCode}
                        onClick={() => void openByCode(row.voucherCode)}
                      >
                        {row.voucherCode}
                      </button>
                    </td>
                    <td>
                      <span
                        className={
                          row.isUndone ? "admin-redemption-undone" : undefined
                        }
                      >
                        {row.detailLabel}
                      </span>
                      {row.isUndone ? (
                        <span className="admin-status is-cancelled admin-redemption-badge">
                          Zrušeno
                        </span>
                      ) : null}
                    </td>
                    <td>{row.redeemedByName}</td>
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
                ? "0 záznamů"
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
    </div>
  );
}
