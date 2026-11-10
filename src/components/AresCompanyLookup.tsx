"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { AresCompany } from "@/lib/ares";

export type AresCompanyFormValue = {
  companyId: string;
  companyName: string;
  vatId: string;
  addressLine1: string;
  city: string;
  postalCode: string;
};

type Props = {
  value: AresCompanyFormValue;
  onChange: (next: Partial<AresCompanyFormValue>) => void;
  touched?: boolean;
  /** Extra class prefix for styling (checkout vs admin). */
  fieldClassName?: string;
};

type SearchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; items: AresCompany[] };

function applyCompany(
  company: AresCompany,
): Partial<AresCompanyFormValue> {
  return {
    companyId: company.ico,
    companyName: company.name,
    vatId: company.dic || "",
    addressLine1: company.addressLine1 || company.addressText,
    city: company.city,
    postalCode: company.postalCode,
  };
}

export function AresCompanyLookup({
  value,
  onChange,
  touched = false,
  fieldClassName = "checkout-field",
}: Props) {
  const listId = useId();
  const [nameQuery, setNameQuery] = useState(value.companyName);
  const [search, setSearch] = useState<SearchState>({ kind: "idle" });
  const [open, setOpen] = useState(false);
  const [icoStatus, setIcoStatus] = useState<
    "idle" | "loading" | "ok" | "missing" | "error"
  >("idle");
  const blurTimer = useRef<number | null>(null);
  const icoRequest = useRef(0);
  const searchRequest = useRef(0);

  useEffect(() => {
    setNameQuery(value.companyName);
  }, [value.companyName]);

  useEffect(() => {
    const ico = value.companyId.replace(/\D/g, "");
    if (ico.length !== 8) {
      setIcoStatus("idle");
      return;
    }
    // Už máme jméno z výběru — nevolej znovu.
    if (value.companyName.trim() && value.companyId === ico) {
      setIcoStatus("ok");
      return;
    }

    const requestId = ++icoRequest.current;
    setIcoStatus("loading");
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch(
            `/api/ares?ico=${encodeURIComponent(ico)}`,
            { cache: "no-store" },
          );
          if (requestId !== icoRequest.current) return;
          if (response.status === 404) {
            setIcoStatus("missing");
            return;
          }
          if (!response.ok) {
            setIcoStatus("error");
            return;
          }
          const data = (await response.json()) as { company?: AresCompany };
          if (!data.company) {
            setIcoStatus("missing");
            return;
          }
          onChange(applyCompany(data.company));
          setNameQuery(data.company.name);
          setIcoStatus("ok");
        } catch {
          if (requestId === icoRequest.current) setIcoStatus("error");
        }
      })();
    }, 350);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onChange je nestabilní z rodiče
  }, [value.companyId]);

  useEffect(() => {
    const q = nameQuery.trim();
    if (q.length < 2) {
      setSearch({ kind: "idle" });
      return;
    }
    // Po výběru firmy nechceme hned znovu otevírat stejný seznam.
    if (q === value.companyName.trim() && value.companyId.length === 8) {
      setSearch({ kind: "idle" });
      return;
    }

    const requestId = ++searchRequest.current;
    setSearch({ kind: "loading" });
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch(
            `/api/ares?q=${encodeURIComponent(q)}`,
            { cache: "no-store" },
          );
          if (requestId !== searchRequest.current) return;
          if (!response.ok) {
            setSearch({
              kind: "error",
              message: "Vyhledávání ARES selhalo.",
            });
            return;
          }
          const data = (await response.json()) as {
            companies?: AresCompany[];
          };
          setSearch({
            kind: "ready",
            items: Array.isArray(data.companies) ? data.companies : [],
          });
          setOpen(true);
        } catch {
          if (requestId === searchRequest.current) {
            setSearch({
              kind: "error",
              message: "ARES je dočasně nedostupný.",
            });
          }
        }
      })();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [nameQuery, value.companyId, value.companyName]);

  function pickCompany(company: AresCompany) {
    onChange(applyCompany(company));
    setNameQuery(company.name);
    setSearch({ kind: "idle" });
    setOpen(false);
    setIcoStatus("ok");
  }

  const showSuggestions =
    open &&
    (search.kind === "loading" ||
      search.kind === "error" ||
      (search.kind === "ready" && search.items.length > 0));

  return (
    <div className="ares-company-lookup">
      <div className="checkout-field-row">
        <label className={fieldClassName}>
          <span>IČO</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={value.companyId}
            placeholder="12345678"
            aria-invalid={touched && value.companyId.replace(/\D/g, "").length !== 8}
            onChange={(event) => {
              const next = event.target.value.replace(/[^\d]/g, "").slice(0, 8);
              onChange({
                companyId: next,
                // Při změně IČO zruš staré ARES údaje, dokud nenačteme nové.
                ...(next !== value.companyId
                  ? {
                      companyName: "",
                      vatId: "",
                      addressLine1: "",
                      city: "",
                      postalCode: "",
                    }
                  : null),
              });
              if (next !== value.companyId) setNameQuery("");
            }}
          />
          {icoStatus === "loading" ? (
            <span className="ares-hint">Hledám v ARES…</span>
          ) : null}
          {icoStatus === "missing" ? (
            <span className="ares-hint is-error">IČO v ARES nenalezeno.</span>
          ) : null}
          {icoStatus === "error" ? (
            <span className="ares-hint is-error">ARES neodpověděl.</span>
          ) : null}
        </label>
        <label className={fieldClassName}>
          <span>
            DIČ <em>(z ARES / volitelné)</em>
          </span>
          <input
            type="text"
            autoComplete="off"
            value={value.vatId}
            placeholder="CZ12345678"
            onChange={(event) =>
              onChange({
                vatId: event.target.value.replace(/\s/g, "").toUpperCase(),
              })
            }
          />
        </label>
      </div>

      <label className={`${fieldClassName} ares-name-field`}>
        <span>Název firmy</span>
        <input
          type="text"
          role="combobox"
          aria-expanded={showSuggestions}
          aria-controls={listId}
          autoComplete="off"
          value={nameQuery}
          placeholder="Začněte psát název nebo doplňte IČO"
          aria-invalid={touched && !value.companyName.trim()}
          onChange={(event) => {
            setNameQuery(event.target.value);
            onChange({ companyName: event.target.value });
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimer.current = window.setTimeout(() => setOpen(false), 150);
          }}
        />
        {showSuggestions ? (
          <ul
            id={listId}
            className="ares-suggest"
            role="listbox"
            onMouseDown={(event) => event.preventDefault()}
          >
            {search.kind === "loading" ? (
              <li className="ares-suggest-status">Hledám…</li>
            ) : null}
            {search.kind === "error" ? (
              <li className="ares-suggest-status is-error">{search.message}</li>
            ) : null}
            {search.kind === "ready"
              ? search.items.map((company) => (
                  <li key={company.ico}>
                    <button
                      type="button"
                      role="option"
                      className="ares-suggest-item"
                      onClick={() => {
                        if (blurTimer.current) {
                          window.clearTimeout(blurTimer.current);
                        }
                        pickCompany(company);
                      }}
                    >
                      <strong>{company.name}</strong>
                      <span>
                        IČO {company.ico}
                        {company.dic ? ` · ${company.dic}` : ""}
                      </span>
                      {company.addressText ? (
                        <span>{company.addressText}</span>
                      ) : null}
                    </button>
                  </li>
                ))
              : null}
          </ul>
        ) : null}
      </label>

      {value.companyName.trim() &&
      (value.addressLine1.trim() || value.city.trim()) ? (
        <p className="ares-resolved">
          <strong>{value.companyName}</strong>
          <span>
            {[
              value.addressLine1,
              [value.postalCode, value.city].filter(Boolean).join(" "),
            ]
              .filter(Boolean)
              .join(", ")}
          </span>
        </p>
      ) : null}
    </div>
  );
}
