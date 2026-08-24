"use client";

import { useRef, useState, type DragEvent } from "react";
import {
  createEmptyExperience,
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
  const [pendingExperience, setPendingExperience] = useState<AdminExperienceForm | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const draggingIndexRef = useRef<number | null>(null);

  const activeExperience =
    pendingExperience ??
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
      experiences: pendingExperience
        ? [...current.experiences, updated]
        : current.experiences.map((experience) =>
            experience.id === updated.id ? updated : experience,
          ),
    }));
    setPendingExperience(null);
    setActiveExperienceId(null);
  }

  function openAddExperience() {
    const created = createEmptyExperience();
    setPendingExperience(created);
    setActiveExperienceId(created.id);
  }

  function closeExperienceDrawer() {
    setPendingExperience(null);
    setActiveExperienceId(null);
  }

  function handleExperienceDragStart(index: number, event: DragEvent<HTMLButtonElement>) {
    draggingIndexRef.current = index;
    setDraggingIndex(index);
    setDragOverIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));

    const row = event.currentTarget.closest(".admin-experience-row");
    if (row instanceof HTMLElement) {
      const rect = row.getBoundingClientRect();
      const ghost = row.cloneNode(true) as HTMLElement;
      ghost.classList.add("admin-experience-drag-ghost");
      ghost.style.position = "fixed";
      ghost.style.top = "-1000px";
      ghost.style.left = "0";
      ghost.style.width = `${rect.width}px`;
      ghost.style.pointerEvents = "none";
      document.body.appendChild(ghost);
      event.dataTransfer.setDragImage(
        ghost,
        event.clientX - rect.left,
        event.clientY - rect.top,
      );
      window.setTimeout(() => ghost.remove(), 0);
    }
  }

  function handleExperienceDragOver(targetIndex: number, event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    const sourceIndex = draggingIndexRef.current;
    if (sourceIndex === null) return;

    setDragOverIndex(targetIndex);
    if (sourceIndex === targetIndex) return;

    setSettings((current) => {
      const experiences = [...current.experiences];
      const [moved] = experiences.splice(sourceIndex, 1);
      experiences.splice(targetIndex, 0, moved);
      return { ...current, experiences };
    });
    draggingIndexRef.current = targetIndex;
    setDraggingIndex(targetIndex);
  }

  function clearExperienceDragState() {
    draggingIndexRef.current = null;
    setDraggingIndex(null);
    setDragOverIndex(null);
  }

  function handleExperienceDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    clearExperienceDragState();
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
          Přetáhněte varianty pro změnu pořadí. Kliknutím upravíte texty, galerii, odkazy a PDF
          šablonu.
        </p>

        <div className="admin-experience-list">
          {settings.experiences.map((experience, index) => (
            <div
              key={experience.id}
              className={[
                "admin-experience-row",
                activeExperienceId === experience.id ? "is-active" : "",
                draggingIndex === index ? "is-dragging" : "",
                dragOverIndex === index && draggingIndex !== null ? "is-drop-target" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onDragOver={(event) => handleExperienceDragOver(index, event)}
              onDrop={handleExperienceDrop}
            >
              <button
                type="button"
                className="admin-experience-drag-handle"
                draggable
                aria-label={`Přetáhnout variantu ${experience.title}`}
                onClick={(event) => event.stopPropagation()}
                onDragStart={(event) => handleExperienceDragStart(index, event)}
                onDragEnd={clearExperienceDragState}
              >
                <MaskIcon src="/icons/drag.svg" />
              </button>

              <button
                type="button"
                className="admin-experience-row-open"
                onClick={() => {
                  setPendingExperience(null);
                  setActiveExperienceId(experience.id);
                }}
              >
                <div className="admin-experience-row-copy">
                  <strong>{experience.title}</strong>
                  <span>
                    {experience.subtitle || "Bez krátkého popisu"}
                    {" · "}
                    {formatCzk(experience.price)}
                    {" · "}
                    {experience.suitableFor || "—"}
                  </span>
                </div>
                <MaskIcon src="/icons/Edit.svg" />
              </button>
            </div>
          ))}

          <button
            type="button"
            className="admin-experience-row admin-experience-row-add"
            onClick={openAddExperience}
          >
            <span className="admin-experience-row-add-label">
              <svg
                className="admin-page-head-btn-icon"
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden
              >
                <path
                  d="M7 2v10M2 7h10"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
              Přidat variantu
            </span>
          </button>
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
          isNew={pendingExperience !== null}
          onClose={closeExperienceDrawer}
          onSave={saveExperience}
        />
      ) : null}
    </div>
  );
}
