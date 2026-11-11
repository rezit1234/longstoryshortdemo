"use client";

import { useEffect, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

type AdminActionModalProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  /** Výrazné (červené) potvrzení pro nevratné akce. */
  danger?: boolean;
  busy?: boolean;
  confirmDisabled?: boolean;
  error?: string | null;
  children?: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
};

/**
 * Jednotný středový modal pro akce v administraci (uplatnění, odečet,
 * storno, smazání). Zavírá se Escape, klikem mimo nebo tlačítkem Zrušit.
 */
export function AdminActionModal({
  open,
  title,
  description,
  confirmLabel,
  danger = false,
  busy = false,
  confirmDisabled = false,
  error,
  children,
  onConfirm,
  onClose,
}: AdminActionModalProps) {
  useEffect(() => {
    if (!open) return;
    // Capture fáze + stopPropagation: Escape zavře jen modal, ne celou drawer.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      if (!busy) onClose();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, busy, onClose]);

  if (!open || typeof document === "undefined") return null;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!busy && !confirmDisabled) onConfirm();
  };

  return createPortal(
    <div
      className="admin-modal-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <form
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        onSubmit={handleSubmit}
      >
        <h2 id="admin-modal-title" className="admin-modal-title">
          {title}
        </h2>
        {description ? (
          <div className="admin-modal-description">{description}</div>
        ) : null}
        {children ? <div className="admin-modal-body">{children}</div> : null}
        {error ? (
          <p className="admin-modal-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="admin-modal-actions">
          <button
            type="button"
            className="admin-modal-btn is-secondary"
            disabled={busy}
            onClick={onClose}
          >
            Zrušit
          </button>
          <button
            type="submit"
            className={`admin-modal-btn${danger ? " is-danger" : ""}`}
            disabled={busy || confirmDisabled}
          >
            {busy ? "Ukládám…" : confirmLabel}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
