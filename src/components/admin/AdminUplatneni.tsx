"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { getAdminVoucherByCode } from "@/data/admin-vouchers";
import { useAdminVoucherDrawer } from "./AdminVoucherDrawer";

type ResultState =
  | { kind: "idle" }
  | { kind: "missing"; code: string }
  | { kind: "invalid"; code: string; statusLabel: string };

export function AdminUplatneni() {
  const searchParams = useSearchParams();
  const { openVoucher, vouchers } = useAdminVoucherDrawer();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<ResultState>({ kind: "idle" });

  useEffect(() => {
    const initialCode = searchParams.get("code");
    if (!initialCode) return;

    const normalized = initialCode.trim().toUpperCase();
    setCode(normalized);
    openByCode(normalized);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to URL prefill
  }, [searchParams]);

  function openByCode(normalized: string) {
    if (!normalized) {
      setResult({ kind: "idle" });
      return;
    }

    const match = getAdminVoucherByCode(normalized, vouchers);

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

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    openByCode(code.trim().toUpperCase());
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
        <form className="admin-redeem-form" onSubmit={handleSubmit}>
          <label className="admin-redeem-field">
            <span className="admin-redeem-label">Kód poukazu</span>
            <input
              type="text"
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                if (result.kind !== "idle") setResult({ kind: "idle" });
              }}
              placeholder="např. TOA1B2C"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <button type="submit" className="admin-primary-btn admin-redeem-submit">
            <span
              className="admin-redeem-submit-icon"
              style={{
                WebkitMaskImage: "url(/icons/detail.svg)",
                maskImage: "url(/icons/detail.svg)",
              }}
              aria-hidden
            />
            Zobrazit detail
          </button>
        </form>

        {result.kind === "missing" ? (
          <div className="admin-redeem-result is-missing">
            <p>
              Poukaz <strong>{result.code}</strong> jsme nenašli. Zkontrolujte kód a
              zkuste to znovu.
            </p>
          </div>
        ) : null}

        {result.kind === "invalid" ? (
          <div className="admin-redeem-result is-missing">
            <p>
              Poukaz <strong>{result.code}</strong> nelze uplatnit. Aktuální stav:{" "}
              <strong>{result.statusLabel.toLowerCase()}</strong>.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
