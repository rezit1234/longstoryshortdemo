"use client";

import { useState } from "react";

const SELLING_TIPS = [
  {
    id: "tip-1",
    question: "Jak nastavit nabídku poukazů?",
    answer:
      "V sekci Můj obchod → Poukaz nastavíte částky i zážitkové varianty. Změny se projeví na prodejní stránce a ve widgetu.",
  },
  {
    id: "tip-2",
    question: "Jak sdílet prodejní stránku?",
    answer:
      "Odkaz na obchod najdete v Přehledu. Můžete ho zkopírovat, nebo vložit stránku jako iframe na web Long Story Short.",
  },
  {
    id: "tip-3",
    question: "Jak pracovat s uplatněním?",
    answer:
      "V Uplatnění poukazu zadejte kód hosta, ověřte platnost a poukaz označte jako uplatněný. Všechny stavy uvidíte v Poukazech.",
  },
];

const FAQ = [
  {
    id: "faq-1",
    question: "Jak dlouho je poukaz platný?",
    answer: "Standardní platnost je 12 měsíců od nákupu, pokud není u konkrétní varianty uvedeno jinak.",
  },
  {
    id: "faq-2",
    question: "Mohu poukaz stornovat?",
    answer:
      "Ano. V seznamu poukazů můžete stav změnit na Stornovaný. U již uplatněných poukazů storno řešte individuálně.",
  },
  {
    id: "faq-3",
    question: "Kde najdu export pro účetnictví?",
    answer:
      "V sekci Poukazy použijte Exportovat CSV. Export obsahuje kódy, zákazníky, hodnoty, data nákupu a stavy.",
  },
  {
    id: "faq-4",
    question: "Jak upravit texty FAQ na prodejní stránce?",
    answer:
      "Jděte do Můj obchod → Časté dotazy. Tam spravujete otázky, které se zobrazují zákazníkům.",
  },
];

function HelpAccordion({
  title,
  items,
}: {
  title: string;
  items: { id: string; question: string; answer: string }[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section className="admin-panel admin-help-panel">
      <h2>{title}</h2>
      <div className="admin-accordion-list">
        {items.map((item) => {
          const open = openId === item.id;
          return (
            <div
              key={item.id}
              className={open ? "admin-accordion is-open" : "admin-accordion"}
            >
              <button
                type="button"
                className="admin-accordion-trigger"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : item.id)}
              >
                <span>{item.question}</span>
                <span aria-hidden>{open ? "–" : "+"}</span>
              </button>
              {open ? <p className="admin-accordion-body">{item.answer}</p> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function AdminNapoveda() {
  return (
    <div className="admin-napoveda">
      <div className="admin-page-head">
        <div>
          <h1>Nápověda</h1>
          <p>Najděte odpovědi na vaše otázky.</p>
        </div>
      </div>

      <div className="admin-help-stack">
        <HelpAccordion
          title="Jak úspěšně prodávat dárkové poukazy?"
          items={SELLING_TIPS}
        />
        <HelpAccordion title="Časté dotazy (FAQ)" items={FAQ} />
      </div>
    </div>
  );
}
