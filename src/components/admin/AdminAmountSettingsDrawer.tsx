"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  defaultAmountCustomPreview,
  defaultAmountPreviewForValue,
  formatCzk,
  type ExperienceGalleryImage,
} from "@/data/vouchers";
import { AdminDismissButton } from "./AdminDismissButton";

const DRAWER_ANIMATION_MS = 220;

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

function FieldTooltip({ text }: { text: string }) {
  return (
    <span className="admin-field-tooltip">
      <button
        type="button"
        className="admin-field-tooltip-trigger"
        aria-label="Zobrazit nápovědu"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 2.75C6.89137 2.75 2.75 6.89137 2.75 12C2.75 17.1086 6.89137 21.25 12 21.25C17.1086 21.25 21.25 17.1086 21.25 12C21.25 6.89137 17.1086 2.75 12 2.75ZM1.25 12C1.25 6.06294 6.06294 1.25 12 1.25C17.9371 1.25 22.75 6.06294 22.75 12C22.75 17.9371 17.9371 22.75 12 22.75C6.06294 22.75 1.25 17.9371 1.25 12ZM12 7.75C11.3787 7.75 10.875 8.25368 10.875 8.875C10.875 9.28921 10.5392 9.625 10.125 9.625C9.71079 9.625 9.375 9.28921 9.375 8.875C9.375 7.42525 10.5503 6.25 12 6.25C13.4497 6.25 14.625 7.42525 14.625 8.875C14.625 9.83834 14.1056 10.6796 13.3353 11.1354C13.1385 11.2518 12.9761 11.3789 12.8703 11.5036C12.7675 11.6246 12.75 11.7036 12.75 11.75V13C12.75 13.4142 12.4142 13.75 12 13.75C11.5858 13.75 11.25 13.4142 11.25 13V11.75C11.25 11.2441 11.4715 10.8336 11.7266 10.533C11.9786 10.236 12.2929 10.0092 12.5715 9.84439C12.9044 9.64739 13.125 9.28655 13.125 8.875C13.125 8.25368 12.6213 7.75 12 7.75ZM12 17C12.5523 17 13 16.5523 13 16C13 15.4477 12.5523 15 12 15C11.4477 15 11 15.4477 11 16C11 16.5523 11.4477 17 12 17Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <span className="admin-field-tooltip-bubble" role="tooltip">
        {text}
      </span>
    </span>
  );
}

export function AdminAmountSettingsDrawer({
  slotKey,
  slotLabel,
  amount,
  preview,
  onClose,
  onSave,
}: {
  slotKey: number | "custom";
  slotLabel: string;
  amount: number | null;
  preview: ExperienceGalleryImage | null;
  onClose: () => void;
  onSave: (data: {
    amount: number | null;
    preview: ExperienceGalleryImage | null;
  }) => void;
}) {
  const [isClosing, setIsClosing] = useState(false);
  const [draftAmount, setDraftAmount] = useState(
    amount === null ? "" : String(amount),
  );
  const [draftPreview, setDraftPreview] = useState(preview);
  const [uploadingPreview, setUploadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewInputRef = useRef<HTMLInputElement>(null);
  const previewInputId = useId();

  const parsedDraftAmount =
    draftAmount.trim() === "" ? null : Math.max(0, Number(draftAmount) || 0);

  const fallbackPreview =
    slotKey === "custom"
      ? defaultAmountCustomPreview()
      : parsedDraftAmount === null
        ? defaultAmountPreviewForValue(1000)
        : defaultAmountPreviewForValue(parsedDraftAmount);

  const displayPreview = draftPreview ?? fallbackPreview;
  const hasOverride = draftPreview !== null;
  const isCustom = slotKey === "custom";

  useEffect(() => {
    setDraftAmount(amount === null ? "" : String(amount));
    setDraftPreview(preview);
    setPreviewError(null);
    setUploadingPreview(false);
  }, [slotKey, amount, preview]);

  const requestClose = useCallback(() => {
    setIsClosing(true);
  }, []);

  useEffect(() => {
    if (!isClosing) return;

    const timer = window.setTimeout(onClose, DRAWER_ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, [isClosing, onClose]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [requestClose]);

  async function uploadPreviewFile(fileList: FileList | File[]) {
    const file = Array.from(fileList)[0];
    if (!file) {
      setPreviewError("Soubor se nepodařilo načíst. Zkuste jiný obrázek.");
      return;
    }

    setPreviewError(null);
    setUploadingPreview(true);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append(
        "experienceId",
        slotKey === "custom" ? "amount-custom" : `amount-slot-${slotKey}`,
      );

      const response = await fetch("/api/voucher-images", {
        method: "POST",
        body: form,
      });

      const data = (await response.json().catch(() => null)) as {
        image?: ExperienceGalleryImage;
        error?: string;
      } | null;

      if (!response.ok || !data?.image) {
        throw new Error(data?.error || "Obrázek se nepodařilo nahrát.");
      }

      setDraftPreview(data.image);
    } catch (err) {
      setPreviewError(
        err instanceof Error ? err.message : "Obrázek se nepodařilo nahrát.",
      );
    } finally {
      setUploadingPreview(false);
    }
  }

  function handleSave() {
    onSave({
      amount: isCustom ? null : parsedDraftAmount,
      preview: draftPreview,
    });
    requestClose();
  }

  return (
    <>
      <button
        type="button"
        className={
          isClosing
            ? "admin-voucher-drawer-backdrop is-closing"
            : "admin-voucher-drawer-backdrop"
        }
        aria-label="Zavřít nastavení částky"
        onClick={requestClose}
      />

      <aside
        className={
          isClosing
            ? "admin-voucher-drawer admin-settings-drawer is-closing"
            : "admin-voucher-drawer admin-settings-drawer"
        }
        role="dialog"
        aria-modal="true"
        aria-label={`Nastavení ${slotLabel}`}
      >
        <div className="admin-voucher-drawer-head">
          <p className="admin-voucher-drawer-kicker">Varianta na částku</p>
          <AdminDismissButton label="Zavřít nastavení" onClick={requestClose} />
        </div>

        <div className="admin-voucher-drawer-body admin-settings-drawer-body">
          <div className="admin-settings-drawer-intro">
            <h2>{slotLabel}</h2>
            <p>
              {isCustom
                ? "Vlastní částka zadaná zákazníkem"
                : parsedDraftAmount === null
                  ? "Částka není vyplněná"
                  : formatCzk(parsedDraftAmount)}
            </p>
          </div>

          {!isCustom ? (
            <label className="admin-field">
              <span>Cena varianty</span>
              <div className="admin-field-control has-suffix">
                <input
                  type="text"
                  inputMode="numeric"
                  value={draftAmount}
                  placeholder="—"
                  onChange={(event) => {
                    setDraftAmount(event.target.value.replace(/\D/g, ""));
                  }}
                />
                <span className="admin-field-control-suffix" aria-hidden>
                  Kč
                </span>
              </div>
            </label>
          ) : null}

          <div className="admin-field">
            <span className="admin-field-label">
              Náhled objednávky
              <FieldTooltip text="Jeden obrázek nahoře v checkoutu pro tuto variantu na částku." />
            </span>
            <div className="admin-amount-preview-single">
              <div className="admin-amount-preview-frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displayPreview.src}
                  alt={displayPreview.alt || slotLabel}
                  className="admin-amount-preview-image"
                  draggable={false}
                />
                {hasOverride ? (
                  <button
                    type="button"
                    className="admin-gallery-remove"
                    onClick={() => setDraftPreview(null)}
                    aria-label="Vrátit výchozí náhled"
                  >
                    <MaskIcon src="/icons/kos.svg" />
                  </button>
                ) : null}
              </div>

              <div className="admin-amount-preview-actions">
                <label
                  className={
                    uploadingPreview
                      ? "admin-outline-btn is-uploading"
                      : "admin-outline-btn"
                  }
                  htmlFor={previewInputId}
                >
                  <input
                    id={previewInputId}
                    ref={previewInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    hidden
                    disabled={uploadingPreview}
                    onChange={(event) => {
                      const files = event.target.files;
                      if (files?.length) {
                        void uploadPreviewFile(files);
                      }
                      event.target.value = "";
                    }}
                  />
                  <MaskIcon src="/icons/Edit.svg" />
                  {uploadingPreview ? "Nahrávám…" : hasOverride ? "Změnit fotku" : "Nahrát fotku"}
                </label>
              </div>
            </div>
            {!hasOverride ? (
              <p className="admin-field-hint">
                Výchozí soubor: <code>{fallbackPreview.src}</code>
              </p>
            ) : null}
            {previewError ? <p className="admin-drawer-error">{previewError}</p> : null}
          </div>
        </div>

        <div className="admin-voucher-drawer-footer">
          <button type="button" className="admin-voucher-drawer-cta" onClick={handleSave}>
            <svg
              className="admin-voucher-drawer-cta-icon"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z"
                fill="currentColor"
              />
            </svg>
            Uložit
          </button>
        </div>
      </aside>
    </>
  );
}
