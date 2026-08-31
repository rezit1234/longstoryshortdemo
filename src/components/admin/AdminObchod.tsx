"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import {
  createEmptyExperience,
  createInitialVoucherSettings,
  MAX_AMOUNT_SLOTS,
  VOUCHER_CODE_PREFIX_DISPLAY,
  type AdminExperienceForm,
  type AdminVoucherSettings,
} from "@/data/admin-voucher-settings";
import {
  formatCzk,
  type ExperienceGalleryImage,
} from "@/data/vouchers";
import { AdminAmountSettingsDrawer } from "./AdminAmountSettingsDrawer";
import { AdminExperienceSettingsDrawer } from "./AdminExperienceSettingsDrawer";
import { AdminSelect } from "./AdminSelect";

const VALIDITY_OPTIONS = [
  { value: "6", label: "6 měsíců" },
  { value: "12", label: "12 měsíců" },
  { value: "24", label: "24 měsíců" },
];

const AUTOSAVE_DELAY_MS = 900;
const TOAST_MS = 3400;

type SaveStatus = "saved" | "dirty" | "saving";

function serializeSettings(settings: AdminVoucherSettings) {
  return JSON.stringify(settings);
}

function formatAmountDisplay(amount: number | null) {
  if (amount === null) return "—";
  return amount
    .toLocaleString("cs-CZ")
    .replace(/[\u00A0\u202F\u2009]/g, " ");
}

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

function UnsavedChangesDialog({
  onDiscard,
  onSave,
  onCancel,
}: {
  onDiscard: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div
      className="admin-confirm-root"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        className="admin-confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-unsaved-title"
        aria-describedby="admin-unsaved-desc"
      >
        <h2 id="admin-unsaved-title">Neuložené změny</h2>
        <p id="admin-unsaved-desc">
          Máte neuložené změny. Chcete je před odchodem uložit, nebo zahodit?
        </p>
        <div className="admin-confirm-actions">
          <button type="button" className="admin-outline-btn" onClick={onDiscard}>
            Zahodit
          </button>
          <button type="button" className="admin-primary-btn" onClick={onSave}>
            Uložit
          </button>
        </div>
      </div>
    </div>
  );
}

function SaveStatusBadge({ status }: { status: SaveStatus }) {
  const label =
    status === "saving"
      ? "Ukládání…"
      : status === "dirty"
        ? "Neuložené změny"
        : "Uloženo";

  return (
    <p className={`admin-save-status is-${status}`} aria-live="polite">
      {status === "saved" ? (
        <svg
          className="admin-save-status-icon"
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden
        >
          <path
            d="M2.5 7.2 5.4 10.1 11.5 3.9"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
      <span>{label}</span>
    </p>
  );
}

export function AdminObchod() {
  const router = useRouter();
  const pathname = usePathname();
  const fallbackSettings = useRef(createInitialVoucherSettings()).current;

  const [settings, setSettings] = useState<AdminVoucherSettings>(fallbackSettings);
  const [savedSettings, setSavedSettings] =
    useState<AdminVoucherSettings>(fallbackSettings);
  const [hydrated, setHydrated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [activeExperienceId, setActiveExperienceId] = useState<string | null>(null);
  const [pendingExperience, setPendingExperience] = useState<AdminExperienceForm | null>(
    null,
  );
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastLeaving, setToastLeaving] = useState(false);
  const [activeAmountSlot, setActiveAmountSlot] = useState<number | "custom" | null>(
    null,
  );

  const draggingIndexRef = useRef<number | null>(null);
  const settingsRef = useRef(settings);
  const savedSettingsRef = useRef(savedSettings);
  const saveStatusRef = useRef(saveStatus);
  const autosaveTimerRef = useRef<number | null>(null);
  const savingTimerRef = useRef<number | null>(null);
  const skipAutosaveRef = useRef(false);

  settingsRef.current = settings;
  savedSettingsRef.current = savedSettings;
  saveStatusRef.current = saveStatus;

  const activeExperience =
    pendingExperience ??
    settings.experiences.find((experience) => experience.id === activeExperienceId) ??
    null;

  const hasUnsavedChanges = useCallback(() => {
    return (
      serializeSettings(settingsRef.current) !==
      serializeSettings(savedSettingsRef.current)
    );
  }, []);

  const showSavedToast = useCallback(() => {
    setToastLeaving(false);
    setToastVisible(true);
  }, []);

  useEffect(() => {
    if (!toastVisible) return;

    const leaveTimer = window.setTimeout(() => setToastLeaving(true), TOAST_MS - 280);
    const hideTimer = window.setTimeout(() => {
      setToastVisible(false);
      setToastLeaving(false);
    }, TOAST_MS);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(hideTimer);
    };
  }, [toastVisible]);

  const clearAutosaveTimers = useCallback(() => {
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    if (savingTimerRef.current !== null) {
      window.clearTimeout(savingTimerRef.current);
      savingTimerRef.current = null;
    }
  }, []);

  const saveToServer = useCallback(
    async (snapshot: AdminVoucherSettings) => {
      const response = await fetch("/api/voucher-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: snapshot }),
      });

      const data = (await response.json().catch(() => null)) as {
        settings?: AdminVoucherSettings;
        error?: string;
      } | null;

      if (!response.ok || !data?.settings) {
        throw new Error(data?.error || "Nastavení se nepodařilo uložit.");
      }

      setSavedSettings(data.settings);
      if (
        serializeSettings(settingsRef.current) === serializeSettings(data.settings)
      ) {
        setSaveStatus("saved");
      } else {
        setSaveStatus("dirty");
      }
      showSavedToast();
    },
    [showSavedToast],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const response = await fetch("/api/voucher-settings");
        const data = (await response.json().catch(() => null)) as {
          settings?: AdminVoucherSettings;
          error?: string;
        } | null;

        if (!response.ok || !data?.settings) {
          throw new Error(data?.error || "Nepodařilo se načíst nastavení.");
        }

        if (cancelled) return;
        setSettings(data.settings);
        setSavedSettings(data.settings);
        setLoadError(null);
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err instanceof Error
            ? err.message
            : "Nepodařilo se načíst nastavení z databáze.",
        );
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }

    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const flushSave = useCallback(async () => {
    clearAutosaveTimers();
    const snapshot = settingsRef.current;
    setSaveStatus("saving");
    try {
      await saveToServer(snapshot);
    } catch (err) {
      setSaveStatus("dirty");
      setLoadError(
        err instanceof Error ? err.message : "Nastavení se nepodařilo uložit.",
      );
      throw err;
    }
  }, [clearAutosaveTimers, saveToServer]);

  useEffect(() => {
    if (!hydrated) return;
    if (skipAutosaveRef.current) return;

    if (serializeSettings(settings) === serializeSettings(savedSettings)) {
      setSaveStatus("saved");
      return;
    }

    setSaveStatus("dirty");
    clearAutosaveTimers();

    autosaveTimerRef.current = window.setTimeout(() => {
      const snapshot = settingsRef.current;
      setSaveStatus("saving");
      void saveToServer(snapshot).catch((err) => {
        setSaveStatus("dirty");
        setLoadError(
          err instanceof Error ? err.message : "Nastavení se nepodařilo uložit.",
        );
      });
      autosaveTimerRef.current = null;
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [settings, savedSettings, hydrated, clearAutosaveTimers, saveToServer]);

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasUnsavedChanges() && saveStatusRef.current !== "saving") return;
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (!hasUnsavedChanges() && saveStatusRef.current !== "saving") return;
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;

      let nextPath = href;
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        nextPath = `${url.pathname}${url.search}${url.hash}`;
      } catch {
        return;
      }

      if (nextPath === pathname) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingHref(nextPath);
      setLeaveConfirmOpen(true);
    }

    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, [hasUnsavedChanges, pathname]);

  function navigateAway(href: string) {
    setLeaveConfirmOpen(false);
    setPendingHref(null);
    router.push(href);
  }

  async function handleLeaveSave() {
    if (!pendingHref) return;
    const href = pendingHref;
    try {
      await flushSave();
      navigateAway(href);
    } catch {
      setLeaveConfirmOpen(false);
      setPendingHref(null);
    }
  }

  function handleLeaveDiscard() {
    if (!pendingHref) return;
    const href = pendingHref;
    clearAutosaveTimers();
    setSettings(savedSettingsRef.current);
    setSaveStatus("saved");
    navigateAway(href);
  }

  function updateAmountCustomPreview(preview: ExperienceGalleryImage | null) {
    setSettings((current) => ({
      ...current,
      amountPreviews: {
        ...current.amountPreviews,
        customPreview: preview,
      },
    }));
  }

  async function saveExperience(updated: AdminExperienceForm) {
    const snapshot: AdminVoucherSettings = {
      ...settingsRef.current,
      experiences: pendingExperience
        ? [...settingsRef.current.experiences, updated]
        : settingsRef.current.experiences.map((experience) =>
            experience.id === updated.id ? updated : experience,
          ),
    };

    skipAutosaveRef.current = true;
    setSettings(snapshot);
    setPendingExperience(null);
    setActiveExperienceId(null);
    clearAutosaveTimers();
    setSaveStatus("saving");

    try {
      await saveToServer(snapshot);
      setLoadError(null);
    } catch (err) {
      setSaveStatus("dirty");
      setLoadError(
        err instanceof Error ? err.message : "Nastavení se nepodařilo uložit.",
      );
    } finally {
      skipAutosaveRef.current = false;
    }
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
          <p>
            Spravujte zážitkové varianty, částky a společná pravidla. Změny se
            ukládají automaticky.
          </p>
          {loadError ? <p className="admin-inline-error">{loadError}</p> : null}
          {!hydrated ? <p className="admin-section-lead">Načítám nastavení…</p> : null}
        </div>
        <SaveStatusBadge status={saveStatus} />
      </div>

      <section className="admin-panel admin-shop-panel">
        <h2>Obecné</h2>
        <p className="admin-section-lead">
          Platnost a prefix kódu platí pro všechny varianty poukazů.
        </p>

        <div className="admin-field-row">
          <label className="admin-field">
            <span>Prefix kódu</span>
            <input type="text" value={VOUCHER_CODE_PREFIX_DISPLAY} readOnly disabled />
            <em>Prefix je nastavený systémem. Kód má formát LSS-XXXXXX.</em>
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
          Až {MAX_AMOUNT_SLOTS} pevné částky a varianta Vlastní. Cenu a náhled upravíte
          v detailu varianty.
        </p>

        <div className="admin-amount-grid">
          {settings.amountSlots.map((amount, index) => (
            <div key={`amount-slot-${index}`} className="admin-amount-slot">
              <span>Částka {index + 1}</span>
              <div className="admin-amount-slot-controls">
                <div
                  className="admin-field-control is-locked has-suffix admin-amount-slot-input"
                  aria-label={`Částka ${index + 1}`}
                >
                  <span className="admin-field-control-value">
                    {formatAmountDisplay(amount)}
                  </span>
                  <span className="admin-field-control-suffix">Kč</span>
                </div>
                <button
                  type="button"
                  className="admin-amount-slot-edit"
                  aria-label={`Upravit částku ${index + 1}`}
                  onClick={() => setActiveAmountSlot(index)}
                >
                  <MaskIcon src="/icons/Edit.svg" />
                </button>
              </div>
            </div>
          ))}

          <div className="admin-amount-slot admin-amount-slot-custom">
            <span>Částka 5</span>
            <div className="admin-amount-slot-controls">
              <div
                className="admin-field-control is-locked admin-amount-slot-input"
                aria-label="Vlastní částka"
              >
                <span className="admin-field-control-value">Vlastní</span>
              </div>
              <button
                type="button"
                className="admin-amount-slot-edit"
                aria-label="Upravit vlastní částku"
                onClick={() => setActiveAmountSlot("custom")}
              >
                <MaskIcon src="/icons/Edit.svg" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {activeExperience ? (
        <AdminExperienceSettingsDrawer
          experience={activeExperience}
          isNew={pendingExperience !== null}
          onClose={closeExperienceDrawer}
          onSave={(experience) => {
            void saveExperience(experience);
          }}
        />
      ) : null}

      {activeAmountSlot !== null ? (
        <AdminAmountSettingsDrawer
          slotKey={activeAmountSlot}
          slotLabel={
            activeAmountSlot === "custom"
              ? "Vlastní částka"
              : `Částka ${activeAmountSlot + 1}`
          }
          amount={
            activeAmountSlot === "custom"
              ? null
              : settings.amountSlots[activeAmountSlot]
          }
          preview={
            activeAmountSlot === "custom"
              ? settings.amountPreviews.customPreview
              : settings.amountPreviews.slotPreviews[activeAmountSlot]
          }
          onClose={() => setActiveAmountSlot(null)}
          onSave={({ amount, preview }) => {
            if (activeAmountSlot === "custom") {
              updateAmountCustomPreview(preview);
              return;
            }

            setSettings((current) => ({
              ...current,
              amountSlots: current.amountSlots.map((slot, slotIndex) =>
                slotIndex === activeAmountSlot ? amount : slot,
              ),
              amountPreviews: {
                ...current.amountPreviews,
                slotPreviews: current.amountPreviews.slotPreviews.map(
                  (slotPreview, slotIndex) =>
                    slotIndex === activeAmountSlot ? preview : slotPreview,
                ),
              },
            }));
          }}
        />
      ) : null}

      {leaveConfirmOpen ? (
        <UnsavedChangesDialog
          onCancel={() => {
            setLeaveConfirmOpen(false);
            setPendingHref(null);
          }}
          onDiscard={handleLeaveDiscard}
          onSave={() => {
            void handleLeaveSave();
          }}
        />
      ) : null}

      {toastVisible ? (
        <div
          className={toastLeaving ? "admin-toast is-leaving" : "admin-toast"}
          role="status"
          aria-live="polite"
        >
          <span className="admin-toast-check" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3.2 8.2 6.4 11.4 12.8 4.6"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="admin-toast-copy">
            <strong>Změny byly uloženy</strong>
            <span>Nastavení poukazů bylo uloženo.</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
