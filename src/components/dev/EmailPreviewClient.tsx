"use client";

import { useMemo, useState } from "react";
import type { EmailPreviewSample } from "@/lib/email/preview-samples";

type Filter = "all" | "customer" | "ops";

export function EmailPreviewClient({
  samples,
}: {
  samples: EmailPreviewSample[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [activeId, setActiveId] = useState(samples[0]?.id ?? "");

  const filtered = useMemo(() => {
    if (filter === "all") return samples;
    return samples.filter((sample) => sample.group === filter);
  }, [filter, samples]);

  const active =
    filtered.find((sample) => sample.id === activeId) ?? filtered[0] ?? null;

  return (
    <div className="email-preview">
      <header className="email-preview-header">
        <div>
          <p className="email-preview-kicker">Dev</p>
          <h1>Náhled e-mailů</h1>
          <p className="email-preview-lead">
            Všechny šablony, které systém posílá (nebo bude posílat). Logo se
            bere z veřejné URL aplikace.
          </p>
        </div>
        <div className="email-preview-filters" role="tablist" aria-label="Typ mailu">
          {(
            [
              ["all", "Vše"],
              ["customer", "Zákazník"],
              ["ops", "Interní"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              className={
                filter === key
                  ? "email-preview-filter is-active"
                  : "email-preview-filter"
              }
              onClick={() => {
                setFilter(key);
                const next = samples.find((sample) =>
                  key === "all" ? true : sample.group === key,
                );
                if (next) setActiveId(next.id);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="email-preview-layout">
        <aside className="email-preview-list" aria-label="Seznam šablon">
          {filtered.map((sample) => (
            <button
              key={sample.id}
              type="button"
              className={
                active?.id === sample.id
                  ? "email-preview-item is-active"
                  : "email-preview-item"
              }
              onClick={() => setActiveId(sample.id)}
            >
              <span className="email-preview-item-title">{sample.title}</span>
              <span className="email-preview-item-desc">{sample.description}</span>
            </button>
          ))}
        </aside>

        <section className="email-preview-stage" aria-live="polite">
          {active ? (
            <>
              <div className="email-preview-meta">
                <p className="email-preview-meta-label">Předmět</p>
                <p className="email-preview-meta-subject">{active.subject}</p>
                <p className="email-preview-meta-note">{active.description}</p>
              </div>
              <iframe
                title={active.title}
                className="email-preview-frame"
                srcDoc={active.html}
              />
            </>
          ) : (
            <p className="email-preview-empty">Žádný náhled.</p>
          )}
        </section>
      </div>
    </div>
  );
}
