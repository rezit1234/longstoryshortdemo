"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { getAdminVoucherByCode } from "@/data/admin-vouchers";

type VerifyState =
  | { kind: "idle" }
  | { kind: "found"; code: string; customer: string; value: string; validUntil: string }
  | { kind: "missing"; code: string };

export function AdminUplatneni() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<VerifyState>({ kind: "idle" });

  useEffect(() => {
    const initialCode = searchParams.get("code");
    if (!initialCode) return;

    const match = getAdminVoucherByCode(initialCode);
    setCode(initialCode.toUpperCase());

    if (match) {
      setResult({
        kind: "found",
        code: match.code,
        customer: match.customer,
        value: match.value,
        validUntil: match.validUntil,
      });
    }
  }, [searchParams]);

  function handleVerify(event: FormEvent) {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setResult({ kind: "idle" });
      return;
    }

    const match = getAdminVoucherByCode(normalized);
    if (match) {
      setResult({
        kind: "found",
        code: match.code,
        customer: match.customer,
        value: match.value,
        validUntil: match.validUntil,
      });
    } else {
      setResult({ kind: "missing", code: normalized });
    }
  }

  function handleRedeem() {
    if (result.kind !== "found") return;
    setResult({ kind: "idle" });
    setCode("");
  }

  return (
    <div className="admin-uplatneni">
      <div className="admin-page-head">
        <div>
          <h1>Uplatnění poukazu</h1>
          <p>Zadejte kód poukazu a ověřte ho před uplatněním.</p>
        </div>
      </div>

      <section className="admin-panel admin-redeem-panel">
        <form className="admin-redeem-form" onSubmit={handleVerify}>
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
          <button type="submit" className="admin-primary-btn">
            Ověřit
          </button>
        </form>

        {result.kind === "found" ? (
          <div className="admin-redeem-result is-found">
            <div className="admin-redeem-result-grid">
              <div>
                <span>Kód</span>
                <strong>{result.code}</strong>
              </div>
              <div>
                <span>Zákazník</span>
                <strong>{result.customer}</strong>
              </div>
              <div>
                <span>Hodnota</span>
                <strong>{result.value}</strong>
              </div>
              <div>
                <span>Platí do</span>
                <strong>{result.validUntil}</strong>
              </div>
            </div>
            <div className="admin-redeem-result-actions">
              <span className="admin-status is-active">Aktivní</span>
              <button type="button" className="admin-primary-btn" onClick={handleRedeem}>
                Uplatnit poukaz
              </button>
            </div>
          </div>
        ) : null}

        {result.kind === "missing" ? (
          <div className="admin-redeem-result is-missing">
            <p>
              Poukaz <strong>{result.code}</strong> jsme nenašli. Zkontrolujte kód a
              zkuste to znovu.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
