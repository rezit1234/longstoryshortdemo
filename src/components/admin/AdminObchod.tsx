"use client";

import { useState } from "react";
import {
  createInitialVoucherSettings,
  MAX_AMOUNT_SLOTS,
  VOUCHER_CODE_PREFIX,
  type AdminExperienceForm,
  type AdminVoucherSettings,
} from "@/data/admin-voucher-settings";
import { formatCzk } from "@/data/vouchers";
import { AdminExperienceSettingsDrawer } from "./AdminExperienceSettingsDrawer";
import { AdminSelect } from "./AdminSelect";

const VALIDITY_OPTIONS = [
  { value: "6", label: "6 měsíců" },
  { value: "12", label: "12 měsíců" },
  { value: "24", label: "24 měsíců" },
];

function MaskIcon({ src }: { src: string }) {
  return (
    <span
      className="admin-mask-icon"
      style={{
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
      }}
      aria-hidden
    />
  );
}

export function AdminObchod() {
  const [settings, setSettings] = useState<AdminVoucherSettings>(() =>
    createInitialVoucherSettings(),
  );
  const [activeExperienceId, setActiveExperienceId] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const activeExperience =
    settings.experiences.find((experience) => experience.id === activeExperienceId) ??
    null;

  function handleSave() {
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1600);
  }

  function updateAmountSlot(index: number, value: string) {
    const parsed = value.trim() === "" ? null : Math.max(0, Number(value) || 0);

    setSettings((current) => ({
      ...current,
      amountSlots: current.amountSlots.map((slot, slotIndex) =>
        slotIndex === index ? parsed : slot,
      ),
    }));
  }

  function saveExperience(updated: AdminExperienceForm) {
    setSettings((current) => ({
      ...current,
      experiences: current.experiences.map((experience) =>
        experience.id === updated.id ? updated : experience,
      ),
    }));
  }

  return (
    <div className="admin-obchod">
      <div className="admin-page-head">
        <div>
          <h1>Nastavení poukazů</h1>
          <p>Spravujte zážitkové varianty, částky a společná pravidla pro všechny poukazy.</p>
        </div>
      </div>

      <section className="admin-panel admin-shop-panel">
        <h2>Obecné</h2>
        <p className="admin-section-lead">
          Platnost a prefix kódu platí pro všechny varianty poukazů.
        </p>

        <div className="admin-field-row">
          <label className="admin-field">
            <span>Prefix kódu</span>
            <input type="text" value={VOUCHER_CODE_PREFIX} readOnly disabled />
            <em>Prefix je nastavený systémem.</em>
          </label>

          <div className="admin-field">
            <span>Platnost poukazu</span>
            <AdminSelect
              ariaLabel="Platnost poukazu"
              value={String(settings.validityMonths)}
              options={VALIDITY_OPTIONS}
              onChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  validityMonths: Number(value),
                }))
              }
            />
          </div>
        </div>
      </section>

      <section className="admin-panel admin-shop-panel">
        <h2>Zážitkové varianty</h2>
        <p className="admin-section-lead">
          Kliknutím na variantu upravíte texty, galerii, odkazy a PDF šablonu daného poukazu.
        </p>

        <div className="admin-experience-list">
          {settings.experiences.map((experience) => (
            <button
              key={experience.id}
              type="button"
              className={
                activeExperienceId === experience.id
                  ? "admin-experience-row is-active"
                  : "admin-experience-row"
              }
              onClick={() => setActiveExperienceId(experience.id)}
            >
              <div className="admin-experience-row-copy">
                <strong>{experience.title}</strong>
                <span>
                  {experience.subtitle || "Bez krátkého popisu"}
                  {" · "}
                  {formatCzk(experience.price)}
                  {" · "}
                  {experience.suitableFor}
                </span>
              </div>
              <MaskIcon src="/icons/Edit.svg" />
            </button>
          ))}
        </div>
      </section>

      <section className="admin-panel admin-shop-panel">
        <h2>Varianty na částku</h2>
        <p className="admin-section-lead">
          Nastavte až {MAX_AMOUNT_SLOTS} pevné částky. Pátá varianta je vlastní částka.
        </p>

        <div className="admin-amount-grid">
          {settings.amountSlots.map((amount, index) => (
            <label key={`amount-slot-${index}`} className="admin-amount-slot">
              <span>Částka {index + 1}</span>
              <div className="admin-field-control">
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={amount ?? ""}
                  placeholder="—"
                  onChange={(event) => updateAmountSlot(index, event.target.value)}
                />
                <span className="admin-field-control-suffix">Kč</span>
              </div>
            </label>
          ))}

          <div className="admin-amount-slot">
            <span>Částka 5</span>
            <div className="admin-field-control is-locked" aria-label="Vlastní částka">
              <span className="admin-field-control-value">Vlastní</span>
            </div>
          </div>
        </div>
      </section>

      <button type="button" className="admin-primary-btn" onClick={handleSave}>
        {savedFlash ? "Uloženo" : "Uložit změny"}
      </button>

      {activeExperience ? (
        <AdminExperienceSettingsDrawer
          experience={activeExperience}
          onClose={() => setActiveExperienceId(null)}
          onSave={saveExperience}
        />
      ) : null}
    </div>
  );
}
