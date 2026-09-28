"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  formatCodePositionLabel,
  type ExperiencePdfTemplate,
  type VoucherCodePosition,
} from "@/data/admin-voucher-settings";
import {
  createEmptyPdfPlacement,
  defaultAmountCustomPreview,
  defaultAmountPreviewForValue,
  formatCzk,
  type ExperienceGalleryImage,
  type VoucherPdfPlacement,
} from "@/data/vouchers";
import { AdminDismissButton } from "./AdminDismissButton";
import { AdminPdfCodePositionEditor } from "./AdminPdfCodePositionEditor";
import { AdminPdfQrPositionEditor } from "./AdminPdfQrPositionEditor";

const DRAWER_ANIMATION_MS = 220;
const MAX_PDF_BYTES = 10 * 1024 * 1024;

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

function PlusIcon() {
  return (
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
  );
}

function TargetIcon() {
  return (
    <svg
      className="admin-page-head-btn-icon"
      width="14"
      height="14"
      viewBox="0 0 256 256"
      fill="currentColor"
      aria-hidden
    >
      <path d="M221.87,83.16A104.1,104.1,0,1,1,195.67,49l22.67-22.68a8,8,0,0,1,11.32,11.32l-96,96a8,8,0,0,1-11.32-11.32l27.72-27.72a40,40,0,1,0,17.87,31.09,8,8,0,1,1,16-.9,56,56,0,1,1-22.38-41.65L184.3,60.39a87.88,87.88,0,1,0,23.13,29.67,8,8,0,0,1,14.44-6.9Z" />
    </svg>
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

function PdfPreviewLightbox({
  pdf,
  onClose,
}: {
  pdf: ExperiencePdfTemplate;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="admin-pdf-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Náhled ${pdf.fileName}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="admin-pdf-lightbox-panel">
        <div className="admin-pdf-lightbox-toolbar">
          <p className="admin-pdf-lightbox-title">{pdf.fileName}</p>
          <div className="admin-pdf-lightbox-actions">
            <a
              href={pdf.url}
              target="_blank"
              rel="noreferrer"
              className="admin-outline-btn"
            >
              Otevřít v novém okně
            </a>
            <AdminDismissButton label="Zavřít náhled PDF" onClick={onClose} />
          </div>
        </div>
        <iframe
          src={pdf.url}
          title={pdf.fileName}
          className="admin-pdf-lightbox-frame"
        />
      </div>
    </div>
  );
}

function normalizeIncomingPdf(
  value: VoucherPdfPlacement | null | undefined,
): VoucherPdfPlacement {
  return value ?? createEmptyPdfPlacement();
}

export function AdminAmountSettingsDrawer({
  slotKey,
  slotLabel,
  amount,
  preview,
  pdf,
  onClose,
  onSave,
}: {
  slotKey: number | "custom";
  slotLabel: string;
  amount: number | null;
  preview: ExperienceGalleryImage | null;
  pdf: VoucherPdfPlacement | null;
  onClose: () => void;
  onSave: (data: {
    amount: number | null;
    preview: ExperienceGalleryImage | null;
    pdf: VoucherPdfPlacement | null;
  }) => void;
}) {
  const [isClosing, setIsClosing] = useState(false);
  const [draftAmount, setDraftAmount] = useState(
    amount === null ? "" : String(amount),
  );
  const [draftPreview, setDraftPreview] = useState(preview);
  const [draftPdf, setDraftPdf] = useState(() => normalizeIncomingPdf(pdf));
  const [uploadingPreview, setUploadingPreview] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [codeEditorOpen, setCodeEditorOpen] = useState(false);
  const [qrEditorOpen, setQrEditorOpen] = useState(false);
  const previewInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const previewInputId = useId();
  const pdfInputId = useId();

  const templateKey =
    slotKey === "custom" ? "amount-custom" : `amount-slot-${slotKey}`;

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
    setDraftPdf(normalizeIncomingPdf(pdf));
    setPreviewError(null);
    setPdfError(null);
    setUploadingPreview(false);
    setUploadingPdf(false);
    setPdfPreviewOpen(false);
    setCodeEditorOpen(false);
    setQrEditorOpen(false);
  }, [slotKey, amount, preview, pdf]);

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
      if (event.key === "Escape") {
        if (pdfPreviewOpen || codeEditorOpen || qrEditorOpen) return;
        requestClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [requestClose, pdfPreviewOpen, codeEditorOpen, qrEditorOpen]);

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
      form.append("experienceId", templateKey);

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

  async function uploadPdfFile(file: File | undefined) {
    if (!file) {
      setPdfError("Soubor se nepodařilo načíst. Zkuste jiné PDF.");
      return;
    }

    const type =
      file.type ||
      (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "");
    if (type !== "application/pdf") {
      setPdfError("Povolený formát je pouze PDF.");
      return;
    }

    if (file.size > MAX_PDF_BYTES) {
      setPdfError("PDF může mít maximálně 10 MB.");
      return;
    }

    const copied = new File([file], file.name, {
      type: "application/pdf",
      lastModified: file.lastModified,
    });

    setPdfError(null);
    setUploadingPdf(true);

    try {
      const form = new FormData();
      form.append("file", copied);
      form.append("templateKey", templateKey);

      const response = await fetch("/api/voucher-pdfs", {
        method: "POST",
        body: form,
      });

      const data = (await response.json().catch(() => null)) as {
        pdf?: ExperiencePdfTemplate;
        error?: string;
      } | null;

      if (!response.ok || !data?.pdf) {
        throw new Error(data?.error || "PDF se nepodařilo nahrát.");
      }

      setDraftPdf((current) => ({
        ...current,
        pdfTemplate: data.pdf!,
      }));
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "PDF se nepodařilo nahrát.");
    } finally {
      setUploadingPdf(false);
    }
  }

  function removePdfTemplate() {
    setPdfPreviewOpen(false);
    setCodeEditorOpen(false);
    setQrEditorOpen(false);
    setPdfError(null);
    setDraftPdf(createEmptyPdfPlacement());
  }

  function removeCodePosition() {
    setCodeEditorOpen(false);
    setQrEditorOpen(false);
    setDraftPdf((current) => ({
      ...current,
      codePosition: null,
      qrPosition: null,
    }));
  }

  function removeQrPosition() {
    setQrEditorOpen(false);
    setDraftPdf((current) => ({
      ...current,
      qrPosition: null,
    }));
  }

  function saveCodePosition(position: VoucherCodePosition) {
    setDraftPdf((current) => ({
      ...current,
      codePosition: position,
    }));
    setCodeEditorOpen(false);
  }

  function saveQrPosition(position: VoucherCodePosition) {
    setDraftPdf((current) => ({
      ...current,
      qrPosition: position,
    }));
    setQrEditorOpen(false);
  }

  function handleSave() {
    const hasPdf =
      draftPdf.pdfTemplate !== null ||
      draftPdf.codePosition !== null ||
      draftPdf.qrPosition !== null;

    onSave({
      amount: isCustom ? null : parsedDraftAmount,
      preview: draftPreview,
      pdf: hasPdf ? draftPdf : null,
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
            <>
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
              <p className="admin-field-hint admin-amount-vat-hint">
                Hodnotový poukaz (cenina) — bez DPH.
              </p>
            </>
          ) : (
            <p className="admin-field-hint admin-amount-vat-hint">
              Vlastní částka je hodnotový poukaz (cenina) — bez DPH.
            </p>
          )}

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
                  {uploadingPreview
                    ? "Nahrávám…"
                    : hasOverride
                      ? "Změnit fotku"
                      : "Nahrát fotku"}
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

          <div className="admin-field">
            <span>PDF šablona poukazu</span>
            <div className="admin-pdf-steps">
              <div className="admin-upload-zone is-compact">
                <strong>1. Nahrajte poukaz ve formátu PDF</strong>

                {draftPdf.pdfTemplate ? (
                  <div className="admin-pdf-file">
                    <button
                      type="button"
                      className="admin-pdf-file-preview"
                      onClick={() => setPdfPreviewOpen(true)}
                      aria-label={`Zobrazit náhled ${draftPdf.pdfTemplate.fileName}`}
                    >
                      <span className="admin-pdf-file-badge" aria-hidden>
                        PDF
                      </span>
                      <span className="admin-pdf-file-name">
                        {draftPdf.pdfTemplate.fileName}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="admin-pdf-file-remove"
                      aria-label="Odebrat PDF"
                      onClick={removePdfTemplate}
                    >
                      <MaskIcon src="/icons/kos.svg" />
                    </button>
                  </div>
                ) : (
                  <label
                    className={
                      uploadingPdf
                        ? "admin-outline-btn is-uploading"
                        : "admin-outline-btn"
                    }
                    aria-busy={uploadingPdf}
                  >
                    <input
                      id={pdfInputId}
                      ref={pdfInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      disabled={uploadingPdf}
                      tabIndex={-1}
                      className="admin-file-input-hidden"
                      onChange={(event) => {
                        const input = event.currentTarget;
                        const file = input.files?.[0];
                        input.value = "";
                        void uploadPdfFile(file);
                      }}
                    />
                    {uploadingPdf ? (
                      "Nahrávám…"
                    ) : (
                      <>
                        <PlusIcon />
                        Nahrát PDF
                      </>
                    )}
                  </label>
                )}

                {pdfError ? <p className="admin-drawer-error">{pdfError}</p> : null}
              </div>

              <div
                className={
                  draftPdf.pdfTemplate
                    ? "admin-upload-zone is-compact"
                    : "admin-upload-zone is-compact is-disabled"
                }
              >
                <strong>2. Zvolte pozici kódu na poukazu</strong>

                {draftPdf.codePosition ? (
                  <div className="admin-pdf-file">
                    <div className="admin-pdf-file-preview is-static">
                      <span className="admin-pdf-file-badge" aria-hidden>
                        POZICE
                      </span>
                      <span className="admin-pdf-file-name">
                        {formatCodePositionLabel(draftPdf.codePosition)}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="admin-pdf-file-edit"
                      aria-label="Upravit pozici kódu"
                      onClick={() => setCodeEditorOpen(true)}
                    >
                      <MaskIcon src="/icons/Edit.svg" />
                    </button>
                    <button
                      type="button"
                      className="admin-pdf-file-remove"
                      aria-label="Odebrat pozici kódu"
                      onClick={removeCodePosition}
                    >
                      <MaskIcon src="/icons/kos.svg" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="admin-outline-btn"
                    disabled={!draftPdf.pdfTemplate}
                    onClick={() => setCodeEditorOpen(true)}
                  >
                    <TargetIcon />
                    Nastavit pozici
                  </button>
                )}
              </div>

              <div
                className={
                  draftPdf.codePosition
                    ? "admin-upload-zone is-compact"
                    : "admin-upload-zone is-compact is-disabled"
                }
              >
                <strong>3. Zvolte pozici QR kódu (volitelné)</strong>

                {draftPdf.qrPosition ? (
                  <div className="admin-pdf-file">
                    <div className="admin-pdf-file-preview is-static">
                      <span className="admin-pdf-file-badge" aria-hidden>
                        QR
                      </span>
                      <span className="admin-pdf-file-name">
                        {formatCodePositionLabel(draftPdf.qrPosition)}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="admin-pdf-file-edit"
                      aria-label="Upravit pozici QR kódu"
                      disabled={!draftPdf.codePosition}
                      onClick={() => setQrEditorOpen(true)}
                    >
                      <MaskIcon src="/icons/Edit.svg" />
                    </button>
                    <button
                      type="button"
                      className="admin-pdf-file-remove"
                      aria-label="Odebrat pozici QR kódu"
                      onClick={removeQrPosition}
                    >
                      <MaskIcon src="/icons/kos.svg" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="admin-outline-btn"
                    disabled={!draftPdf.codePosition}
                    onClick={() => setQrEditorOpen(true)}
                  >
                    <TargetIcon />
                    Nastavit pozici
                  </button>
                )}
              </div>
            </div>
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

      {pdfPreviewOpen && draftPdf.pdfTemplate ? (
        <PdfPreviewLightbox
          pdf={draftPdf.pdfTemplate}
          onClose={() => setPdfPreviewOpen(false)}
        />
      ) : null}

      {codeEditorOpen && draftPdf.pdfTemplate ? (
        <AdminPdfCodePositionEditor
          pdfUrl={draftPdf.pdfTemplate.url}
          initialPosition={draftPdf.codePosition}
          onClose={() => setCodeEditorOpen(false)}
          onSave={saveCodePosition}
        />
      ) : null}

      {qrEditorOpen && draftPdf.pdfTemplate ? (
        <AdminPdfQrPositionEditor
          pdfUrl={draftPdf.pdfTemplate.url}
          initialPosition={draftPdf.qrPosition}
          onClose={() => setQrEditorOpen(false)}
          onSave={saveQrPosition}
        />
      ) : null}
    </>
  );
}
