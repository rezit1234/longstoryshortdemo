"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState, type DragEvent } from "react";
import {
  MAX_CHECKOUT_PREVIEW_IMAGES,
  MAX_GALLERY_IMAGES,
  formatCodePositionLabel,
  type AdminExperienceForm,
  type ExperiencePdfTemplate,
  type VoucherCodePosition,
} from "@/data/admin-voucher-settings";
import type { ExperienceGalleryImage } from "@/data/vouchers";
import { formatCzk } from "@/data/vouchers";
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

function GalleryLightbox({
  image,
  onClose,
}: {
  image: ExperienceGalleryImage;
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
      className="admin-gallery-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={image.alt}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="admin-gallery-lightbox-toolbar">
        <AdminDismissButton label="Zavřít náhled" onClick={onClose} />
      </div>
      <button
        type="button"
        className="admin-gallery-lightbox-frame"
        aria-label={image.alt}
        onClick={onClose}
      >
        <Image
          src={image.src}
          alt={image.alt}
          width={1600}
          height={1200}
          className="admin-gallery-lightbox-image"
        />
      </button>
    </div>
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

export function AdminExperienceSettingsDrawer({
  experience,
  isNew = false,
  onClose,
  onSave,
}: {
  experience: AdminExperienceForm;
  isNew?: boolean;
  onClose: () => void;
  onSave: (experience: AdminExperienceForm) => void;
}) {
  const [isClosing, setIsClosing] = useState(false);
  const [draft, setDraft] = useState(experience);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [previewDraggingIndex, setPreviewDraggingIndex] = useState<number | null>(
    null,
  );
  const [previewDragOverIndex, setPreviewDragOverIndex] = useState<number | null>(
    null,
  );
  const [lightboxImage, setLightboxImage] = useState<ExperienceGalleryImage | null>(null);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [codeEditorOpen, setCodeEditorOpen] = useState(false);
  const [qrEditorOpen, setQrEditorOpen] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingPreview, setUploadingPreview] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [galleryDropActive, setGalleryDropActive] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const previewInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const galleryInputId = useId();
  const previewInputId = useId();
  const pdfInputId = useId();
  const draggingIndexRef = useRef<number | null>(null);
  const previewDraggingIndexRef = useRef<number | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  // Jen při přepnutí varianty — ne při každém novém settings objektu z rodiče
  // (autosave / load by jinak tiše přepsaly lokální galerii).
  useEffect(() => {
    setDraft({
      ...experience,
      checkoutPreview: experience.checkoutPreview ?? [],
    });
    setGalleryError(null);
    setPreviewError(null);
    setPdfError(null);
    setUploadingGallery(false);
    setUploadingPreview(false);
    setUploadingPdf(false);
    setPdfPreviewOpen(false);
    setCodeEditorOpen(false);
    setQrEditorOpen(false);
  }, [experience.id]);

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
      if (
        event.key === "Escape" &&
        !lightboxImage &&
        !pdfPreviewOpen &&
        !codeEditorOpen &&
        !qrEditorOpen
      ) {
        requestClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [lightboxImage, pdfPreviewOpen, codeEditorOpen, qrEditorOpen, requestClose]);

  function updateDraft(patch: Partial<AdminExperienceForm>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function updateLink(index: number, patch: Partial<AdminExperienceForm["infoLinks"][number]>) {
    setDraft((current) => ({
      ...current,
      infoLinks: current.infoLinks.map((link, linkIndex) =>
        linkIndex === index ? { ...link, ...patch } : link,
      ),
    }));
  }

  function addLink() {
    setDraft((current) => ({
      ...current,
      infoLinks: [...current.infoLinks, { label: "", href: "" }],
    }));
  }

  function removeLink(index: number) {
    setDraft((current) => ({
      ...current,
      infoLinks: current.infoLinks.filter((_, linkIndex) => linkIndex !== index),
    }));
  }

  function removeGalleryImage(index: number) {
    setDraft((current) => ({
      ...current,
      gallery: current.gallery.filter((_, imageIndex) => imageIndex !== index),
    }));
  }

  function removeCheckoutPreviewImage(index: number) {
    setDraft((current) => ({
      ...current,
      checkoutPreview: (current.checkoutPreview ?? []).filter(
        (_, imageIndex) => imageIndex !== index,
      ),
    }));
  }

  async function uploadCheckoutPreviewFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).map(
      (file) =>
        new File([file], file.name, {
          type: file.type,
          lastModified: file.lastModified,
        }),
    );

    if (files.length === 0) {
      setPreviewError("Soubor se nepodařilo načíst. Zkuste jiný obrázek.");
      return;
    }

    const current = draftRef.current;
    const preview = current.checkoutPreview ?? [];
    const remaining = MAX_CHECKOUT_PREVIEW_IMAGES - preview.length;
    if (remaining <= 0) {
      setPreviewError(
        `Náhled může mít maximálně ${MAX_CHECKOUT_PREVIEW_IMAGES} obrázky.`,
      );
      return;
    }

    const selected = files.slice(0, remaining);
    setPreviewError(null);
    setUploadingPreview(true);

    try {
      const uploaded: ExperienceGalleryImage[] = [];

      for (const file of selected) {
        const form = new FormData();
        form.append("file", file);
        form.append("experienceId", current.id);

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

        uploaded.push(data.image);
      }

      setDraft((latest) => ({
        ...latest,
        checkoutPreview: [...(latest.checkoutPreview ?? []), ...uploaded].slice(
          0,
          MAX_CHECKOUT_PREVIEW_IMAGES,
        ),
      }));
    } catch (err) {
      setPreviewError(
        err instanceof Error ? err.message : "Obrázek se nepodařilo nahrát.",
      );
    } finally {
      setUploadingPreview(false);
    }
  }

  async function uploadGalleryFiles(fileList: FileList | File[]) {
    // FileList je „live“ — zkopírujeme File objekty hned, než se input vyresetuje.
    const files = Array.from(fileList).map(
      (file) =>
        new File([file], file.name, {
          type: file.type,
          lastModified: file.lastModified,
        }),
    );

    if (files.length === 0) {
      setGalleryError("Soubor se nepodařilo načíst. Zkuste jiný obrázek.");
      return;
    }

    const current = draftRef.current;
    const remaining = MAX_GALLERY_IMAGES - current.gallery.length;
    if (remaining <= 0) {
      setGalleryError(
        `Galerie může mít maximálně ${MAX_GALLERY_IMAGES} obrázky.`,
      );
      return;
    }

    const selected = files.slice(0, remaining);
    setGalleryError(null);
    setUploadingGallery(true);

    try {
      const uploaded: ExperienceGalleryImage[] = [];

      for (const file of selected) {
        const form = new FormData();
        form.append("file", file);
        form.append("experienceId", current.id);

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

        uploaded.push(data.image);
      }

      setDraft((latest) => ({
        ...latest,
        gallery: [...latest.gallery, ...uploaded].slice(0, MAX_GALLERY_IMAGES),
      }));

      if (files.length > remaining) {
        setGalleryError(
          `Přidány jen ${remaining} obrázky — maximum je ${MAX_GALLERY_IMAGES}.`,
        );
      }
    } catch (err) {
      setGalleryError(
        err instanceof Error ? err.message : "Obrázek se nepodařilo nahrát.",
      );
    } finally {
      setUploadingGallery(false);
    }
  }

  async function uploadPdfFile(file: File | undefined) {
    if (!file) {
      setPdfError("Soubor se nepodařilo načíst. Zkuste jiné PDF.");
      return;
    }

    const type = file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "");
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
      form.append("experienceId", draftRef.current.id);

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

      setDraft((current) => ({
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
    setDraft((current) => ({
      ...current,
      pdfTemplate: null,
      codePosition: null,
      qrPosition: null,
    }));
  }

  function removeCodePosition() {
    setCodeEditorOpen(false);
    setQrEditorOpen(false);
    setDraft((current) => ({
      ...current,
      codePosition: null,
      qrPosition: null,
    }));
  }

  function removeQrPosition() {
    setQrEditorOpen(false);
    setDraft((current) => ({
      ...current,
      qrPosition: null,
    }));
  }

  function saveCodePosition(position: VoucherCodePosition) {
    setDraft((current) => ({
      ...current,
      codePosition: position,
    }));
    setCodeEditorOpen(false);
  }

  function saveQrPosition(position: VoucherCodePosition) {
    setDraft((current) => ({
      ...current,
      qrPosition: position,
    }));
    setQrEditorOpen(false);
  }

  function handleGalleryDragStart(index: number, event: DragEvent<HTMLButtonElement>) {
    draggingIndexRef.current = index;
    setDraggingIndex(index);
    setDragOverIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));

    const item = event.currentTarget.closest(".admin-gallery-item");
    if (item instanceof HTMLElement) {
      const rect = item.getBoundingClientRect();
      const ghost = item.cloneNode(true) as HTMLElement;
      ghost.classList.add("admin-gallery-drag-ghost");
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

  function handleGalleryDragOver(targetIndex: number, event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    const sourceIndex = draggingIndexRef.current;
    if (sourceIndex === null) return;

    setDragOverIndex(targetIndex);
    if (sourceIndex === targetIndex) return;

    setDraft((current) => {
      const gallery = [...current.gallery];
      const [moved] = gallery.splice(sourceIndex, 1);
      gallery.splice(targetIndex, 0, moved);
      return { ...current, gallery };
    });
    draggingIndexRef.current = targetIndex;
    setDraggingIndex(targetIndex);
  }

  function clearGalleryDragState() {
    draggingIndexRef.current = null;
    setDraggingIndex(null);
    setDragOverIndex(null);
  }

  function handleGalleryDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    clearGalleryDragState();
  }

  function handlePreviewDragStart(index: number, event: DragEvent<HTMLButtonElement>) {
    previewDraggingIndexRef.current = index;
    setPreviewDraggingIndex(index);
    setPreviewDragOverIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `preview-${index}`);

    const item = event.currentTarget.closest(".admin-gallery-item");
    if (item instanceof HTMLElement) {
      const rect = item.getBoundingClientRect();
      const ghost = item.cloneNode(true) as HTMLElement;
      ghost.classList.add("admin-gallery-drag-ghost");
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

  function handlePreviewDragOver(targetIndex: number, event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    const sourceIndex = previewDraggingIndexRef.current;
    if (sourceIndex === null) return;

    setPreviewDragOverIndex(targetIndex);
    if (sourceIndex === targetIndex) return;

    setDraft((current) => {
      const checkoutPreview = [...(current.checkoutPreview ?? [])];
      const [moved] = checkoutPreview.splice(sourceIndex, 1);
      checkoutPreview.splice(targetIndex, 0, moved);
      return { ...current, checkoutPreview };
    });
    previewDraggingIndexRef.current = targetIndex;
    setPreviewDraggingIndex(targetIndex);
  }

  function clearPreviewDragState() {
    previewDraggingIndexRef.current = null;
    setPreviewDraggingIndex(null);
    setPreviewDragOverIndex(null);
  }

  function handlePreviewDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    clearPreviewDragState();
  }

  function handleSave() {
    onSave({
      ...draft,
      title: draft.title.trim() || "Nová varianta",
      price: Math.max(0, draft.price),
      checkoutPreview: (draft.checkoutPreview ?? []).slice(
        0,
        MAX_CHECKOUT_PREVIEW_IMAGES,
      ),
      gallery: draft.gallery.slice(0, MAX_GALLERY_IMAGES),
      infoLinks: draft.infoLinks.filter((link) => link.label.trim() || link.href.trim()),
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
        aria-label="Zavřít nastavení zážitku"
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
        aria-label={`Nastavení zážitku ${draft.title}`}
      >
        <div className="admin-voucher-drawer-head">
          <p className="admin-voucher-drawer-kicker">
            {isNew ? "Nová varianta" : "Zážitková varianta"}
          </p>
          <AdminDismissButton label="Zavřít nastavení" onClick={requestClose} />
        </div>

        <div className="admin-voucher-drawer-body admin-settings-drawer-body">
          <div className="admin-settings-drawer-intro">
            <h2>{draft.title.trim() || (isNew ? "Nová varianta" : draft.title)}</h2>
            <p>{formatCzk(draft.price)}</p>
          </div>

          <label className="admin-field">
            <span>Název služby</span>
            <input
              type="text"
              value={draft.title}
              onChange={(event) => updateDraft({ title: event.target.value })}
            />
          </label>

          <label className="admin-field">
            <span>Krátký popis</span>
            <input
              type="text"
              value={draft.subtitle}
              placeholder="Např. Dárkový poukaz, Noc v privátním pokoji"
              onChange={(event) => updateDraft({ subtitle: event.target.value })}
            />
          </label>

          <label className="admin-field">
            <span>Vhodné pro</span>
            <input
              type="text"
              value={draft.suitableFor}
              placeholder="Např. 1 osobu, 2 osoby nebo rodinu až se 3 dětmi"
              onChange={(event) => updateDraft({ suitableFor: event.target.value })}
            />
          </label>

          <label className="admin-field">
            <span>Cena varianty</span>
            <div className="admin-field-control has-suffix">
              <input
                type="text"
                inputMode="numeric"
                value={draft.price > 0 ? String(draft.price) : ""}
                placeholder="0"
                onChange={(event) => {
                  const digits = event.target.value.replace(/\D/g, "");
                  updateDraft({ price: digits === "" ? 0 : Number(digits) });
                }}
              />
              <span className="admin-field-control-suffix" aria-hidden>
                Kč
              </span>
            </div>
          </label>

          <label className="admin-field">
            <span className="admin-field-label">
              Podrobný popis
              <FieldTooltip text="Text zobrazovaný v sekci Více informací na prodejní stránce." />
            </span>
            <textarea
              rows={6}
              value={draft.description}
              onChange={(event) => updateDraft({ description: event.target.value })}
            />
          </label>

          <div className="admin-field">
            <span className="admin-field-label">
              Náhled objednávky
              <FieldTooltip text="Obrázek nahoře v checkoutu. 1 obrázek = celá šířka, 2 obrázky = rozdělení 50/50. Pořadí změníte přetažením." />
            </span>
            <div className="admin-gallery-grid admin-checkout-preview-grid">
              {(draft.checkoutPreview ?? []).map((image, index) => {
                const previewCount = (draft.checkoutPreview ?? []).length;

                return (
                  <div
                    key={`${image.src}-${index}`}
                    className={[
                      "admin-gallery-item",
                      previewDraggingIndex === index ? "is-dragging" : "",
                      previewDragOverIndex === index && previewDraggingIndex !== null
                        ? "is-drop-target"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onDragOver={(event) => handlePreviewDragOver(index, event)}
                    onDrop={handlePreviewDrop}
                  >
                    <button
                      type="button"
                      className="admin-gallery-open"
                      onClick={() => setLightboxImage(image)}
                      aria-label={`Zvětšit náhled ${index + 1}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.src}
                        alt={image.alt || `Náhled ${index + 1}`}
                        className="admin-gallery-image"
                        draggable={false}
                      />
                    </button>
                    {previewCount > 1 ? (
                      <button
                        type="button"
                        className="admin-gallery-drag-handle"
                        draggable
                        aria-label="Přetáhnout náhled"
                        onClick={(event) => event.stopPropagation()}
                        onDragStart={(event) => handlePreviewDragStart(index, event)}
                        onDragEnd={clearPreviewDragState}
                      >
                        <MaskIcon src="/icons/drag.svg" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="admin-gallery-remove"
                      onClick={() => removeCheckoutPreviewImage(index)}
                      aria-label={`Odebrat náhled ${index + 1}`}
                    >
                      <MaskIcon src="/icons/kos.svg" />
                    </button>
                  </div>
                );
              })}

              {(draft.checkoutPreview ?? []).length < MAX_CHECKOUT_PREVIEW_IMAGES ? (
                <label
                  className={
                    uploadingPreview
                      ? "admin-gallery-add is-uploading"
                      : "admin-gallery-add"
                  }
                  htmlFor={previewInputId}
                >
                  <input
                    id={previewInputId}
                    ref={previewInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    hidden
                    disabled={uploadingPreview}
                    onChange={(event) => {
                      const files = event.target.files;
                      if (files?.length) {
                        void uploadCheckoutPreviewFiles(files);
                      }
                      event.target.value = "";
                    }}
                  />
                  {uploadingPreview ? (
                    <span className="admin-gallery-add-label">Nahrávám…</span>
                  ) : (
                    <span className="admin-gallery-add-label">Přidat</span>
                  )}
                </label>
              ) : null}
            </div>
            {previewError ? <p className="admin-drawer-error">{previewError}</p> : null}
          </div>

          <div className="admin-field">
            <span className="admin-field-label">
              Galerie
                  <FieldTooltip
                    text={`Maximálně ${MAX_GALLERY_IMAGES} obrázky. Další přidáte přes „+“, nebo přetažením souborů. Pořadí změníte přetažením náhledů.`}
                  />
            </span>
            <div
              className={
                galleryDropActive
                  ? "admin-gallery-grid is-file-drop"
                  : "admin-gallery-grid"
              }
              onDragEnter={(event) => {
                if (!event.dataTransfer.types.includes("Files")) return;
                event.preventDefault();
                setGalleryDropActive(true);
              }}
              onDragOver={(event) => {
                if (!event.dataTransfer.types.includes("Files")) return;
                event.preventDefault();
                setGalleryDropActive(true);
              }}
              onDragLeave={(event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node)) {
                  return;
                }
                setGalleryDropActive(false);
              }}
              onDrop={(event) => {
                if (!event.dataTransfer.files?.length) {
                  handleGalleryDrop(event);
                  return;
                }
                event.preventDefault();
                setGalleryDropActive(false);
                if (uploadingGallery || draft.gallery.length >= MAX_GALLERY_IMAGES) {
                  return;
                }
                void uploadGalleryFiles(Array.from(event.dataTransfer.files));
              }}
            >
              {draft.gallery.map((image, index) => (
                <div
                  key={`${image.src}-${index}`}
                  className={[
                    "admin-gallery-item",
                    draggingIndex === index ? "is-dragging" : "",
                    dragOverIndex === index && draggingIndex !== null ? "is-drop-target" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onDragOver={(event) => {
                    if (event.dataTransfer.types.includes("Files")) {
                      event.preventDefault();
                      setGalleryDropActive(true);
                      return;
                    }
                    handleGalleryDragOver(index, event);
                  }}
                  onDrop={(event) => {
                    if (event.dataTransfer.files?.length) {
                      event.preventDefault();
                      setGalleryDropActive(false);
                      if (
                        !uploadingGallery &&
                        draft.gallery.length < MAX_GALLERY_IMAGES
                      ) {
                        void uploadGalleryFiles(Array.from(event.dataTransfer.files));
                      }
                      return;
                    }
                    handleGalleryDrop(event);
                  }}
                >
                  <button
                    type="button"
                    className="admin-gallery-open"
                    aria-label={`Zobrazit ${image.alt}`}
                    onClick={() => setLightboxImage(image)}
                  >
                    <Image
                      src={image.src}
                      alt={image.alt}
                      width={240}
                      height={240}
                      className="admin-gallery-image"
                      draggable={false}
                    />
                  </button>
                  <button
                    type="button"
                    className="admin-gallery-drag-handle"
                    draggable
                    aria-label="Přetáhnout obrázek"
                    onClick={(event) => event.stopPropagation()}
                    onDragStart={(event) => handleGalleryDragStart(index, event)}
                    onDragEnd={clearGalleryDragState}
                  >
                    <MaskIcon src="/icons/drag.svg" />
                  </button>
                  <button
                    type="button"
                    className="admin-gallery-remove"
                    aria-label="Odebrat obrázek"
                    onClick={() => removeGalleryImage(index)}
                  >
                    <MaskIcon src="/icons/kos.svg" />
                  </button>
                </div>
              ))}

              {draft.gallery.length < MAX_GALLERY_IMAGES ? (
                <label
                  className={
                    uploadingGallery
                      ? "admin-gallery-add is-uploading"
                      : "admin-gallery-add"
                  }
                  aria-label={
                    uploadingGallery ? "Nahrávám obrázek" : "Přidat obrázek"
                  }
                  aria-busy={uploadingGallery}
                >
                  <input
                    id={galleryInputId}
                    ref={galleryInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                    multiple
                    disabled={uploadingGallery}
                    tabIndex={-1}
                    className="admin-file-input-hidden"
                    onChange={(event) => {
                      const input = event.currentTarget;
                      const files = input.files ? Array.from(input.files) : [];
                      input.value = "";
                      void uploadGalleryFiles(files);
                    }}
                  />
                  {uploadingGallery ? (
                    <span className="admin-gallery-add-label">Nahrávám…</span>
                  ) : (
                    <>
                      <svg
                        width="18"
                        height="18"
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
                      <span className="admin-gallery-add-label">Přidat</span>
                    </>
                  )}
                </label>
              ) : null}
            </div>
            {galleryError ? <p className="admin-drawer-error">{galleryError}</p> : null}
          </div>

          <div className="admin-field">
            <span className="admin-field-label">
              Odkazy
              <FieldTooltip text="Text odkazu se zobrazí zákazníkovi místo celé URL." />
            </span>
            <div className="admin-link-fields">
              {draft.infoLinks.map((link, index) => (
                <div key={`link-${index}`} className="admin-link-field-row">
                  <label className="admin-field">
                    <span>Text odkazu</span>
                    <input
                      type="text"
                      value={link.label}
                      placeholder="Eatery Bakery"
                      onChange={(event) => updateLink(index, { label: event.target.value })}
                    />
                  </label>
                  <label className="admin-field">
                    <span>URL</span>
                    <input
                      type="url"
                      value={link.href}
                      placeholder="https://www.longstoryshort.cz/..."
                      onChange={(event) => updateLink(index, { href: event.target.value })}
                    />
                  </label>
                  {draft.infoLinks.length > 1 ? (
                    <button
                      type="button"
                      className="admin-text-action is-danger admin-link-remove"
                      onClick={() => removeLink(index)}
                    >
                      Odebrat odkaz
                    </button>
                  ) : null}
                </div>
              ))}
              <button type="button" className="admin-outline-btn" onClick={addLink}>
                + Přidat odkaz
              </button>
            </div>
          </div>

          <div className="admin-field">
            <span>PDF šablona poukazu</span>
            <div className="admin-pdf-steps">
              <div className="admin-upload-zone is-compact">
                <strong>1. Nahrajte poukaz ve formátu PDF</strong>

                {draft.pdfTemplate ? (
                  <div className="admin-pdf-file">
                    <button
                      type="button"
                      className="admin-pdf-file-preview"
                      onClick={() => setPdfPreviewOpen(true)}
                      aria-label={`Zobrazit náhled ${draft.pdfTemplate.fileName}`}
                    >
                      <span className="admin-pdf-file-badge" aria-hidden>
                        PDF
                      </span>
                      <span className="admin-pdf-file-name">
                        {draft.pdfTemplate.fileName}
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
                  draft.pdfTemplate
                    ? "admin-upload-zone is-compact"
                    : "admin-upload-zone is-compact is-disabled"
                }
              >
                <strong>2. Zvolte pozici kódu na poukazu</strong>

                {draft.codePosition ? (
                  <div className="admin-pdf-file">
                    <div className="admin-pdf-file-preview is-static">
                      <span className="admin-pdf-file-badge" aria-hidden>
                        POZICE
                      </span>
                      <span className="admin-pdf-file-name">
                        {formatCodePositionLabel(draft.codePosition)}
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
                    disabled={!draft.pdfTemplate}
                    onClick={() => setCodeEditorOpen(true)}
                  >
                    <TargetIcon />
                    Nastavit pozici
                  </button>
                )}
              </div>
              <div
                className={
                  draft.codePosition
                    ? "admin-upload-zone is-compact"
                    : "admin-upload-zone is-compact is-disabled"
                }
              >
                <strong>3. Zvolte pozici QR kódu (volitelné)</strong>

                {draft.qrPosition ? (
                  <div className="admin-pdf-file">
                    <div className="admin-pdf-file-preview is-static">
                      <span className="admin-pdf-file-badge" aria-hidden>
                        QR
                      </span>
                      <span className="admin-pdf-file-name">
                        {formatCodePositionLabel(draft.qrPosition)}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="admin-pdf-file-edit"
                      aria-label="Upravit pozici QR kódu"
                      disabled={!draft.codePosition}
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
                    disabled={!draft.codePosition}
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
                d="M12.6206 2.76232C12.4868 2.75064 12.3532 2.75 12 2.75C9.62178 2.75 7.91356 2.7516 6.61358 2.92637C5.33517 3.09825 4.56445 3.42514 3.9948 3.9948C3.42514 4.56445 3.09825 5.33518 2.92637 6.61358C2.75159 7.91356 2.75 9.62178 2.75 12C2.75 14.3782 2.75159 16.0864 2.92637 17.3864C3.09825 18.6648 3.42514 19.4355 3.9948 20.0052C4.50829 20.5187 5.18517 20.8349 6.25 21.0182L6.25 20.948C6.24997 20.0495 6.24995 19.3003 6.32991 18.7055C6.41432 18.0777 6.59999 17.5109 7.05546 17.0555C7.51093 16.6 8.07773 16.4143 8.70552 16.3299C9.3003 16.2499 10.0495 16.25 10.948 16.25H13.052C13.9505 16.25 14.6997 16.2499 15.2945 16.3299C15.9223 16.4143 16.4891 16.6 16.9445 17.0555C17.4 17.5109 17.5857 18.0777 17.6701 18.7055C17.7501 19.3003 17.75 20.0495 17.75 20.948L17.75 21.0182C18.8148 20.8349 19.4917 20.5187 20.0052 20.0052C20.5749 19.4355 20.9018 18.6648 21.0736 17.3864C21.2484 16.0864 21.25 14.3782 21.25 12C21.25 11.6468 21.2494 11.5132 21.2377 11.3794C21.1804 10.7235 20.9125 10.0768 20.4892 9.57254C20.403 9.46978 20.3063 9.37221 20.0502 9.11611L14.8839 3.94977C14.6278 3.69368 14.5302 3.59701 14.4275 3.51076C13.9232 3.08746 13.2765 2.81957 12.6206 2.76232ZM16.25 21.18V21C16.25 20.036 16.2484 19.3884 16.1835 18.9054C16.1214 18.4439 16.0142 18.2464 15.8839 18.1161C15.7536 17.9858 15.5561 17.8786 15.0946 17.8165C14.6116 17.7516 13.964 17.75 13 17.75H11C10.036 17.75 9.38843 17.7516 8.90539 17.8165C8.44393 17.8786 8.24643 17.9858 8.11612 18.1161C7.9858 18.2464 7.87858 18.4439 7.81654 18.9054C7.75159 19.3884 7.75 20.036 7.75 21V21.18C8.87584 21.2491 10.2582 21.25 12 21.25C13.7418 21.25 15.1242 21.2491 16.25 21.18ZM12.0315 1.25C12.3431 1.24998 12.5445 1.24997 12.751 1.268C13.7138 1.35204 14.6517 1.74054 15.3919 2.36187C15.5507 2.49517 15.696 2.64055 15.9213 2.86587L15.9446 2.88911L21.1341 8.07862C21.3594 8.30396 21.5048 8.44933 21.6381 8.60814C22.2595 9.34833 22.648 10.2862 22.732 11.249C22.75 11.4555 22.75 11.6569 22.75 11.9684V12.0574C22.75 14.3658 22.75 16.1748 22.5603 17.5863C22.366 19.031 21.9607 20.1711 21.0659 21.0659C20.1711 21.9607 19.031 22.366 17.5863 22.5603C16.1748 22.75 14.3658 22.75 12.0574 22.75H11.9426C9.63423 22.75 7.82519 22.75 6.41371 22.5603C4.96897 22.366 3.82895 21.9607 2.93414 21.0659C2.03933 20.1711 1.63399 19.031 1.43975 17.5863C1.24998 16.1748 1.24999 14.3658 1.25 12.0574V11.9426C1.24999 9.63423 1.24998 7.82519 1.43975 6.41371C1.63399 4.96897 2.03933 3.82895 2.93414 2.93414C3.82895 2.03933 4.96897 1.63399 6.41371 1.43975C7.82519 1.24998 9.63423 1.24999 11.9426 1.25L12.0315 1.25ZM6.25 8C6.25 7.58579 6.58579 7.25 7 7.25H13C13.4142 7.25 13.75 7.58579 13.75 8C13.75 8.41422 13.4142 8.75 13 8.75H7C6.58579 8.75 6.25 8.41422 6.25 8Z"
                fill="currentColor"
              />
            </svg>
            Uložit
          </button>
        </div>
      </aside>

      {lightboxImage ? (
        <GalleryLightbox image={lightboxImage} onClose={() => setLightboxImage(null)} />
      ) : null}

      {pdfPreviewOpen && draft.pdfTemplate ? (
        <PdfPreviewLightbox
          pdf={draft.pdfTemplate}
          onClose={() => setPdfPreviewOpen(false)}
        />
      ) : null}

      {codeEditorOpen && draft.pdfTemplate ? (
        <AdminPdfCodePositionEditor
          pdfUrl={draft.pdfTemplate.url}
          initialPosition={draft.codePosition}
          onClose={() => setCodeEditorOpen(false)}
          onSave={saveCodePosition}
        />
      ) : null}

      {qrEditorOpen && draft.pdfTemplate ? (
        <AdminPdfQrPositionEditor
          pdfUrl={draft.pdfTemplate.url}
          initialPosition={draft.qrPosition}
          onClose={() => setQrEditorOpen(false)}
          onSave={saveQrPosition}
        />
      ) : null}
    </>
  );
}
