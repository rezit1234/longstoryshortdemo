"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  VOUCHER_CODE_INPUT_MAX_LENGTH,
  normalizeVoucherCode,
  sanitizeVoucherCodeInput,
} from "@/data/admin-voucher-settings";
import {
  getAdminVoucherByCode,
  type AdminSoldVoucher,
} from "@/data/admin-vouchers";
import { AdminSkeletonRedeemPanel } from "./AdminSkeleton";
import { useAdminVoucherDrawer } from "./AdminVoucherDrawer";

type ResultState =
  | { kind: "idle" }
  | { kind: "missing"; code: string }
  | { kind: "invalid"; code: string; statusLabel: string }
  | { kind: "loading" };

async function fetchVoucherByCode(
  normalized: string,
): Promise<AdminSoldVoucher | undefined> {
  const params = new URLSearchParams({
    q: normalized,
    page: "1",
    pageSize: "10",
    status: "all",
  });
  const response = await fetch(`/api/admin/sold-vouchers?${params}`, {
    cache: "no-store",
  });
  if (!response.ok) return undefined;
  const data = (await response.json()) as { vouchers?: AdminSoldVoucher[] };
  const list = Array.isArray(data.vouchers) ? data.vouchers : [];
  return list.find((row) => normalizeVoucherCode(row.code) === normalized);
}

export function AdminUplatneni() {
  const searchParams = useSearchParams();
  const { openVoucher, vouchers, vouchersLoading } = useAdminVoucherDrawer();
  const [codeInput, setCodeInput] = useState("");
  const [result, setResult] = useState<ResultState>({ kind: "idle" });

  useEffect(() => {
    const initialCode = searchParams.get("code");
    if (!initialCode || vouchersLoading) return;

    const next = sanitizeVoucherCodeInput(initialCode);
    setCodeInput(next);
    void openByCode(normalizeVoucherCode(next));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- wait for vouchers, then URL prefill
  }, [searchParams, vouchersLoading]);

  async function openByCode(normalized: string) {
    if (!normalized) {
      setResult({ kind: "idle" });
      return;
    }

    setResult({ kind: "loading" });
    let match = getAdminVoucherByCode(normalized, vouchers);
    if (!match) {
      match = await fetchVoucherByCode(normalized);
    }

    if (!match) {
      setResult({ kind: "missing", code: normalized });
      return;
    }

    if (match.status !== "active") {
      setResult({
        kind: "invalid",
        code: normalized,
        statusLabel: match.statusLabel,
      });
      return;
    }

    setResult({ kind: "idle" });
    openVoucher(match);
  }

  function handleCodeChange(raw: string) {
    setCodeInput(sanitizeVoucherCodeInput(raw));
    if (result.kind !== "idle") setResult({ kind: "idle" });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void openByCode(normalizeVoucherCode(codeInput));
  }

  return (
    <div className="admin-uplatneni">
      <div className="admin-page-head">
        <div>
          <h1>Uplatnění poukazu</h1>
          <p>Zadejte kód poukazu a otevřete jeho detail.</p>
        </div>
      </div>

      <section className="admin-panel admin-redeem-panel">
        {vouchersLoading ? (
          <AdminSkeletonRedeemPanel />
        ) : (
          <>
            <form className="admin-redeem-form" onSubmit={handleSubmit}>
              <label className="admin-redeem-field">
                <span className="admin-redeem-label">Kód poukazu</span>
                <div className="admin-redeem-code-control is-full">
                  <input
                    type="text"
                    value={codeInput}
                    onChange={(event) => handleCodeChange(event.target.value)}
                    placeholder="LSSK7M2P9A"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={VOUCHER_CODE_INPUT_MAX_LENGTH}
                    aria-label="Kód poukazu"
                  />
                </div>
              </label>
              <button
                type="submit"
                className="admin-primary-btn"
                disabled={result.kind === "loading"}
              >
                {result.kind === "loading" ? "Hledám…" : "Otevřít poukaz"}
              </button>
            </form>

            {result.kind === "missing" ? (
              <p className="admin-redeem-feedback is-error" role="status">
                Poukaz <strong>{result.code}</strong> nebyl nalezen.
              </p>
            ) : null}
            {result.kind === "invalid" ? (
              <p className="admin-redeem-feedback is-error" role="status">
                Poukaz <strong>{result.code}</strong> nejde uplatnit (
                {result.statusLabel.toLowerCase()}).
              </p>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
