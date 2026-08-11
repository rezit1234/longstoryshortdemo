"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AMOUNT_VOUCHERS, EXPERIENCE_VOUCHERS, formatCzk } from "@/data/vouchers";

type ShopTab = "general" | "voucher" | "faq" | "legal";

const TABS: { key: ShopTab; label: string }[] = [
  { key: "general", label: "Obecné" },
  { key: "voucher", label: "Poukaz" },
  { key: "faq", label: "Časté dotazy" },
  { key: "legal", label: "Právní dokumenty" },
];

const INITIAL_FAQ = [
  {
    id: "faq-1",
    question: "Jak poukaz uplatním?",
    answer:
      "Při rezervaci nebo návštěvě uveďte kód poukazu. Rádi vám pomůžeme i na e-mailu eatery@longstoryshort.cz.",
  },
  {
    id: "faq-2",
    question: "Jak dlouho je poukaz platný?",
    answer: "Standardní platnost dárkového poukazu je 12 měsíců od data nákupu.",
  },
  {
    id: "faq-3",
    question: "Mohu poukaz předat někomu jinému?",
    answer:
      "Ano. Poukaz můžete darovat — stačí předat kód nebo vytištěný voucher obdarované osobě.",
  },
];

const INITIAL_LEGAL = [
  {
    id: "legal-1",
    title: "Obchodní podmínky",
    body: "Obchodní podmínky Long Story Short pro nákup a uplatnění dárkových poukazů.",
  },
  {
    id: "legal-2",
    title: "Zásady ochrany osobních údajů",
    body: "Informace o zpracování osobních údajů v souvislosti s nákupem poukazů.",
  },
  {
    id: "legal-3",
    title: "Reklamační řád",
    body: "Pravidla reklamací dárkových poukazů a souvisejících služeb.",
  },
];

function MaskIcon({ src, className = "admin-mask-icon" }: { src: string; className?: string }) {
  return (
    <span
      className={className}
      style={{
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
      }}
      aria-hidden
    />
  );
}

export function AdminObchod() {
  const [tab, setTab] = useState<ShopTab>("general");
  const [shopName, setShopName] = useState("Long Story Short");
  const [subdomain, setSubdomain] = useState("longstoryshort");
  const [voucherName, setVoucherName] = useState("Dárkový poukaz");
  const [voucherDescription, setVoucherDescription] = useState(
    "Vyberte poukaz na částku, nebo na konkrétní zážitek.",
  );
  const [codePrefix, setCodePrefix] = useState("LSS");
  const [validity, setValidity] = useState("12");
  const [amountEnabled, setAmountEnabled] = useState(true);
  const [customAmountEnabled, setCustomAmountEnabled] = useState(false);
  const [serviceEnabled, setServiceEnabled] = useState(true);
  const [amounts, setAmounts] = useState(AMOUNT_VOUCHERS.map((item) => item.amount));
  const [openFaqId, setOpenFaqId] = useState<string | null>(INITIAL_FAQ[0]?.id ?? null);
  const [openLegalId, setOpenLegalId] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [originSuffix, setOriginSuffix] = useState("/");

  useEffect(() => {
    setOriginSuffix(`${window.location.host}/`);
  }, []);

  const services = useMemo(
    () =>
      EXPERIENCE_VOUCHERS.map((item) => ({
        id: item.id,
        title: item.title,
        price: formatCzk(item.price),
      })),
    [],
  );

  function handleSave() {
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1600);
  }

  return (
    <div className="admin-obchod">
      <div className="admin-page-head">
        <div>
          <h1>Nastavení obchodu</h1>
          <p>Upravte informace o vašem obchodě a jeho vzhled.</p>
        </div>
      </div>

      <div className="admin-filters" role="tablist" aria-label="Nastavení obchodu">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            className={
              tab === item.key ? "admin-filter-chip is-active" : "admin-filter-chip"
            }
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "general" ? (
        <section className="admin-panel admin-shop-panel">
          <h2>Základní informace</h2>

          <label className="admin-field">
            <span>Název obchodu</span>
            <input
              type="text"
              value={shopName}
              maxLength={64}
              onChange={(event) => setShopName(event.target.value)}
            />
            <em>{shopName.length}/64 znaků</em>
          </label>

          <label className="admin-field">
            <span>Subdoména</span>
            <div className="admin-input-suffix">
              <input
                type="text"
                value={subdomain}
                onChange={(event) =>
                  setSubdomain(
                    event.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, ""),
                  )
                }
              />
              <span className="admin-input-suffix-label">{originSuffix}</span>
            </div>
          </label>

          <div className="admin-field">
            <span>Logo obchodu</span>
            <p className="admin-field-hint">PNG, JPG nebo WebP, max. 12 MB.</p>
            <div className="admin-logo-row">
              <div className="admin-logo-preview">
                <Image src="/logo.png" alt="Logo obchodu" width={120} height={40} />
              </div>
              <div className="admin-logo-actions">
                <button type="button" className="admin-text-action">
                  <MaskIcon src="/icons/Edit.svg" />
                  Změnit logo
                </button>
                <button type="button" className="admin-text-action is-danger">
                  Odebrat logo
                </button>
              </div>
            </div>
          </div>

          <button type="button" className="admin-primary-btn" onClick={handleSave}>
            {savedFlash ? "Uloženo" : "Uložit změny"}
          </button>
        </section>
      ) : null}

      {tab === "voucher" ? (
        <section className="admin-panel admin-shop-panel">
          <h2>Nastavení poukazu</h2>

          <label className="admin-field">
            <span>Název poukazu</span>
            <input
              type="text"
              value={voucherName}
              onChange={(event) => setVoucherName(event.target.value)}
            />
          </label>

          <label className="admin-field">
            <span>Popis poukazu</span>
            <textarea
              rows={3}
              value={voucherDescription}
              onChange={(event) => setVoucherDescription(event.target.value)}
            />
          </label>

          <div className="admin-field">
            <span>Obrázky poukazu</span>
            <div className="admin-upload-zone">
              <Image
                src="/poukazimg.jpeg"
                alt="Obrázek poukazu"
                width={220}
                height={140}
                className="admin-upload-preview"
              />
              <button type="button" className="admin-outline-btn">
                + Přidat obrázek
              </button>
            </div>
          </div>

          <div className="admin-field">
            <span>PDF šablona poukazu</span>
            <div className="admin-pdf-steps">
              <div className="admin-upload-zone is-compact">
                <strong>1. Nahrajte poukaz ve formátu PDF</strong>
                <button type="button" className="admin-outline-btn">
                  + Nahrát PDF
                </button>
              </div>
              <div className="admin-upload-zone is-compact is-disabled">
                <strong>2. Zvolte pozici kódu na poukazu</strong>
                <button type="button" className="admin-outline-btn" disabled>
                  + Nastavit pozici
                </button>
              </div>
              <div className="admin-upload-zone is-compact is-disabled">
                <strong>3. Zvolte pozici QR kódu na poukazu (volitelné)</strong>
                <button type="button" className="admin-outline-btn" disabled>
                  + Nastavit pozici
                </button>
              </div>
            </div>
          </div>

          <div className="admin-field-row">
            <label className="admin-field">
              <span>Prefix kódu</span>
              <input
                type="text"
                value={codePrefix}
                maxLength={6}
                onChange={(event) =>
                  setCodePrefix(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                }
              />
            </label>
            <label className="admin-field">
              <span>Platnost poukazu</span>
              <select
                value={validity}
                onChange={(event) => setValidity(event.target.value)}
              >
                <option value="6">6 měsíců</option>
                <option value="12">12 měsíců</option>
                <option value="24">24 měsíců</option>
              </select>
            </label>
          </div>

          <div className="admin-toggle-block">
            <div className="admin-toggle-head">
              <div>
                <strong>Varianty na hodnotu</strong>
                <p>Částky z aktuální prodejní stránky.</p>
              </div>
              <button
                type="button"
                className={amountEnabled ? "admin-switch is-on" : "admin-switch"}
                aria-pressed={amountEnabled}
                onClick={() => setAmountEnabled((value) => !value)}
              >
                <span />
              </button>
            </div>
            {amountEnabled ? (
              <div className="admin-amount-list">
                {amounts.map((amount, index) => (
                  <div key={`${amount}-${index}`} className="admin-amount-row">
                    <input
                      type="text"
                      value={`${amount} Kč`}
                      readOnly
                    />
                    <button
                      type="button"
                      className="admin-icon-btn"
                      aria-label="Odebrat částku"
                      onClick={() =>
                        setAmounts((prev) => prev.filter((_, i) => i !== index))
                      }
                    >
                      <MaskIcon src="/icons/kos.svg" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="admin-outline-btn"
                  onClick={() =>
                    setAmounts((prev) => [
                      ...prev,
                      (prev[prev.length - 1] ?? 0) + 500,
                    ])
                  }
                >
                  + Přidat částku
                </button>
              </div>
            ) : null}
          </div>

          <div className="admin-toggle-block is-simple">
            <div className="admin-toggle-head">
              <div>
                <strong>Povolit vlastní částku</strong>
                <p>Zákazník si zvolí libovolnou hodnotu.</p>
              </div>
              <button
                type="button"
                className={
                  customAmountEnabled ? "admin-switch is-on" : "admin-switch"
                }
                aria-pressed={customAmountEnabled}
                onClick={() => setCustomAmountEnabled((value) => !value)}
              >
                <span />
              </button>
            </div>
          </div>

          <div className="admin-toggle-block">
            <div className="admin-toggle-head">
              <div>
                <strong>Varianty na službu</strong>
                <p>Zážitkové poukazy z homepage.</p>
              </div>
              <button
                type="button"
                className={serviceEnabled ? "admin-switch is-on" : "admin-switch"}
                aria-pressed={serviceEnabled}
                onClick={() => setServiceEnabled((value) => !value)}
              >
                <span />
              </button>
            </div>
            {serviceEnabled ? (
              <div className="admin-service-list">
                {services.map((service) => (
                  <div key={service.id} className="admin-service-row">
                    <div>
                      <strong>{service.title}</strong>
                      <span>{service.price}</span>
                    </div>
                  </div>
                ))}
                <button type="button" className="admin-outline-btn">
                  + Přidat službu
                </button>
              </div>
            ) : null}
          </div>

          <button type="button" className="admin-primary-btn" onClick={handleSave}>
            {savedFlash ? "Uloženo" : "Uložit změny"}
          </button>
        </section>
      ) : null}

      {tab === "faq" ? (
        <section className="admin-panel admin-shop-panel">
          <h2>Časté dotazy</h2>
          <p className="admin-section-lead">
            Otázky a odpovědi na stránce vašeho obchodu.
          </p>
          <div className="admin-accordion-list">
            {INITIAL_FAQ.map((item) => {
              const open = openFaqId === item.id;
              return (
                <div
                  key={item.id}
                  className={open ? "admin-accordion is-open" : "admin-accordion"}
                >
                  <button
                    type="button"
                    className="admin-accordion-trigger"
                    aria-expanded={open}
                    onClick={() => setOpenFaqId(open ? null : item.id)}
                  >
                    <span>{item.question}</span>
                    <span aria-hidden>{open ? "–" : "+"}</span>
                  </button>
                  {open ? <p className="admin-accordion-body">{item.answer}</p> : null}
                </div>
              );
            })}
          </div>
          <button type="button" className="admin-outline-btn">
            + Přidat otázku
          </button>
          <button type="button" className="admin-primary-btn" onClick={handleSave}>
            {savedFlash ? "Uloženo" : "Uložit změny"}
          </button>
        </section>
      ) : null}

      {tab === "legal" ? (
        <section className="admin-panel admin-shop-panel">
          <h2>Právní dokumenty</h2>
          <p className="admin-section-lead">
            Šablony dokumentů zobrazené u nákupu poukazu.
          </p>
          <div className="admin-accordion-list">
            {INITIAL_LEGAL.map((item) => {
              const open = openLegalId === item.id;
              return (
                <div
                  key={item.id}
                  className={open ? "admin-accordion is-open" : "admin-accordion"}
                >
                  <button
                    type="button"
                    className="admin-accordion-trigger"
                    aria-expanded={open}
                    onClick={() => setOpenLegalId(open ? null : item.id)}
                  >
                    <span>{item.title}</span>
                    <span aria-hidden>{open ? "–" : "+"}</span>
                  </button>
                  {open ? <p className="admin-accordion-body">{item.body}</p> : null}
                </div>
              );
            })}
          </div>
          <button type="button" className="admin-primary-btn" onClick={handleSave}>
            {savedFlash ? "Uloženo" : "Uložit změny"}
          </button>
        </section>
      ) : null}
    </div>
  );
}
