"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { EmailPreviewSample } from "@/lib/email/preview-samples";

export function EmailPreviewClient({
  samples,
}: {
  samples: EmailPreviewSample[];
}) {
  const searchParams = useSearchParams();
  const requestedId = searchParams.get("id");
  const initialId =
    (requestedId && samples.some((sample) => sample.id === requestedId)
      ? requestedId
      : null) ||
    samples.find((sample) => sample.group === "ops")?.id ||
    samples[0]?.id ||
    "";
  const [activeId, setActiveId] = useState(initialId);

  const active = useMemo(
    () => samples.find((sample) => sample.id === activeId) ?? samples[0] ?? null,
    [activeId, samples],
  );

  return (
    <div className="email-preview">
      <header className="email-preview-header">
        <div>
          <p className="email-preview-kicker">Dev</p>
          <h1>Náhled e-mailů</h1>
          <p className="email-preview-lead">
            Zákaznické i provozní šablony po platbě. Provozní maily (pošta /
            vyzvednutí) jdou na tomas@rezit.cz.
          </p>
        </div>
      </header>

      <div className="email-preview-layout">
        <aside className="email-preview-list" aria-label="Seznam šablon">
          {samples.map((sample) => (
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
