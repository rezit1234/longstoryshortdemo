"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import {
  MAX_GALLERY_IMAGES,
  type AdminExperienceForm,
} from "@/data/admin-voucher-settings";
import type { ExperienceGalleryImage } from "@/data/vouchers";
import { formatCzk } from "@/data/vouchers";
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

export function AdminExperienceSettingsDrawer({
  experience,
  onClose,
  onSave,
}: {
  experience: AdminExperienceForm;
  onClose: () => void;
  onSave: (experience: AdminExperienceForm) => void;
}) {
  const [isClosing, setIsClosing] = useState(false);
  const [draft, setDraft] = useState(experience);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [lightboxImage, setLightboxImage] = useState<ExperienceGalleryImage | null>(null);
  const draggingIndexRef = useRef<number | null>(null);

  useEffect(() => {
    setDraft(experience);
  }, [experience]);

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
      if (event.key === "Escape" && !lightboxImage) requestClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [lightboxImage, requestClose]);

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

  function handleSave() {
    onSave({
      ...draft,
      price: Math.max(0, draft.price),
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
          <p className="admin-voucher-drawer-kicker">Zážitková varianta</p>
          <AdminDismissButton label="Zavřít nastavení" onClick={requestClose} />
        </div>

        <div className="admin-voucher-drawer-body admin-settings-drawer-body">
          <div className="admin-settings-drawer-intro">
            <h2>{draft.title}</h2>
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
            <span>Podrobný popis</span>
            <textarea
              rows={6}
              value={draft.description}
              onChange={(event) => updateDraft({ description: event.target.value })}
            />
            <em>Text zobrazovaný v sekci Více informací na prodejní stránce.</em>
          </label>

          <div className="admin-field">
            <span>Galerie</span>
            <em>
              Maximálně {MAX_GALLERY_IMAGES} obrázky. Přetáhněte pro změnu pořadí, klikněte pro
              náhled.
            </em>
            <div className="admin-gallery-grid">
              {draft.gallery.map((image, index) => (
                <div
                  key={image.src}
                  className={[
                    "admin-gallery-item",
                    draggingIndex === index ? "is-dragging" : "",
                    dragOverIndex === index && draggingIndex !== null ? "is-drop-target" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onDragOver={(event) => handleGalleryDragOver(index, event)}
                  onDrop={handleGalleryDrop}
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
            </div>
            {draft.gallery.length < MAX_GALLERY_IMAGES ? (
              <button type="button" className="admin-outline-btn">
                + Přidat obrázek
              </button>
            ) : null}
          </div>

          <div className="admin-field">
            <span>Odkazy</span>
            <em>Text odkazu se zobrazí zákazníkovi místo celé URL.</em>
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
                <strong>3. Zvolte pozici QR kódu (volitelné)</strong>
                <button type="button" className="admin-outline-btn" disabled>
                  + Nastavit pozici
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-voucher-drawer-footer">
          <button type="button" className="admin-voucher-drawer-cta" onClick={handleSave}>
            Uložit variantu
          </button>
        </div>
      </aside>

      {lightboxImage ? (
        <GalleryLightbox image={lightboxImage} onClose={() => setLightboxImage(null)} />
      ) : null}
    </>
  );
}
