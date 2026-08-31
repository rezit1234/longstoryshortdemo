"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  MOCK_QR_URL,
  type VoucherCodePosition,
  createCenteredQrPosition,
  createDefaultQrPosition,
} from "@/data/admin-voucher-settings";
import {
  QR_BOX_MIN_WIDTH_PERCENT,
  normalizeQrBoxPosition,
} from "@/lib/voucher-qr-box";
import { usePdfEditorStage } from "@/hooks/usePdfEditorStage";
import { AdminDismissButton } from "./AdminDismissButton";

type Interaction =
  | {
      kind: "move";
      pointerId: number;
      startX: number;
      startY: number;
      startRect: VoucherCodePosition;
    }
  | {
      kind: "resize";
      pointerId: number;
      startX: number;
      startY: number;
      startRect: VoucherCodePosition;
    };

function SaveIcon() {
  return (
    <svg
      className="admin-code-editor-save-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.6206 2.76232C12.4868 2.75064 12.3532 2.75 12 2.75C9.62178 2.75 7.91356 2.7516 6.61358 2.92637C5.33517 3.09825 4.56445 3.42514 3.9948 3.9948C3.42514 4.56445 3.09825 5.33518 2.92637 6.61358C2.75159 7.91356 2.75 9.62178 2.75 12C2.75 14.3782 2.75159 16.0864 2.92637 17.3864C3.09825 18.6648 3.42514 19.4355 3.9948 20.0052C4.50829 20.5187 5.18517 20.8349 6.25 21.0182L6.25 20.948C6.24997 20.0495 6.24995 19.3003 6.32991 18.7055C6.41432 18.0777 6.59999 17.5109 7.05546 17.0555C7.51093 16.6 8.07773 16.4143 8.70552 16.3299C9.3003 16.2499 10.0495 16.25 10.948 16.25H13.052C13.9505 16.25 14.6997 16.2499 15.2945 16.3299C15.9223 16.4143 16.4891 16.6 16.9445 17.0555C17.4 17.5109 17.5857 18.0777 17.6701 18.7055C17.7501 19.3003 17.75 20.0495 17.75 20.948L17.75 21.0182C18.8148 20.8349 19.4917 20.5187 20.0052 20.0052C20.5749 19.4355 20.9018 18.6648 21.0736 17.3864C21.2484 16.0864 21.25 14.3782 21.25 12C21.25 11.6468 21.2494 11.5132 21.2377 11.3794C21.1804 10.7235 20.9125 10.0768 20.4892 9.57254C20.403 9.46978 20.3063 9.37221 20.0502 9.11611L14.8839 3.94977C14.6278 3.69368 14.5302 3.59701 14.4275 3.51076C13.9232 3.08746 13.2765 2.81957 12.6206 2.76232ZM16.25 21.18V21C16.25 20.036 16.2484 19.3884 16.1835 18.9054C16.1214 18.4439 16.0142 18.2464 15.8839 18.1161C15.7536 17.9858 15.5561 17.8786 15.0946 17.8165C14.6116 17.7516 13.964 17.75 13 17.75H11C10.036 17.75 9.38843 17.7516 8.90539 17.8165C8.44393 17.8786 8.24643 17.9858 8.11612 18.1161C7.9858 18.2464 7.87858 18.4439 7.81654 18.9054C7.75159 19.3884 7.75 20.036 7.75 21V21.18C8.87584 21.2491 10.2582 21.25 12 21.25C13.7418 21.25 15.1242 21.2491 16.25 21.18ZM12.0315 1.25C12.3431 1.24998 12.5445 1.24997 12.751 1.268C13.7138 1.35204 14.6517 1.74054 15.3919 2.36187C15.5507 2.49517 15.696 2.64055 15.9213 2.86587L15.9446 2.88911L21.1341 8.07862C21.3594 8.30396 21.5048 8.44933 21.6381 8.60814C22.2595 9.34833 22.648 10.2862 22.732 11.249C22.75 11.4555 22.75 11.6569 22.75 11.9684V12.0574C22.75 14.3658 22.75 16.1748 22.5603 17.5863C22.366 19.031 21.9607 20.1711 21.0659 21.0659C20.1711 21.9607 19.031 22.366 17.5863 22.5603C16.1748 22.75 14.3658 22.75 12.0574 22.75H11.9426C9.63423 22.75 7.82519 22.75 6.41371 22.5603C4.96897 22.366 3.82895 21.9607 2.93414 21.0659C2.03933 20.1711 1.63399 19.031 1.43975 17.5863C1.24998 16.1748 1.24999 14.3658 1.25 12.0574V11.9426C1.24999 9.63423 1.24998 7.82519 1.43975 6.41371C1.63399 4.96897 2.03933 3.82895 2.93414 2.93414C3.82895 2.03933 4.96897 1.63399 6.41371 1.43975C7.82519 1.24998 9.63423 1.24999 11.9426 1.25L12.0315 1.25ZM6.25 8C6.25 7.58579 6.58579 7.25 7 7.25H13C13.4142 7.25 13.75 7.58579 13.75 8C13.75 8.41422 13.4142 8.75 13 8.75H7C6.58579 8.75 6.25 8.41422 6.25 8Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function AdminPdfQrPositionEditor({
  pdfUrl,
  initialPosition,
  onClose,
  onSave,
}: {
  pdfUrl: string;
  initialPosition: VoucherCodePosition | null;
  onClose: () => void;
  onSave: (position: VoucherCodePosition) => void;
}) {
  const [rect, setRect] = useState<VoucherCodePosition>(
    initialPosition ?? createDefaultQrPosition(),
  );
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const interactionRef = useRef<Interaction | null>(null);
  const hasCenteredRef = useRef(Boolean(initialPosition));

  const {
    canvasRef,
    stageRef,
    viewportRef,
    stageSize,
    loading,
    loadError,
  } = usePdfEditorStage(pdfUrl);

  const normalizeRect = useCallback(
    (position: VoucherCodePosition) => {
      if (stageSize.width <= 0 || stageSize.height <= 0) return position;
      return normalizeQrBoxPosition(position, stageSize.width, stageSize.height);
    },
    [stageSize.height, stageSize.width],
  );

  useEffect(() => {
    if (stageSize.width <= 0 || stageSize.height <= 0) return;

    if (!hasCenteredRef.current) {
      hasCenteredRef.current = true;
      setRect(
        createCenteredQrPosition(stageSize.width, stageSize.height, 12),
      );
      return;
    }

    setRect((current) => normalizeRect(current));
  }, [normalizeRect, stageSize.height, stageSize.width]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;

    async function buildQr() {
      try {
        const QRCode = (await import("qrcode")).default;
        const dataUrl = await QRCode.toDataURL(MOCK_QR_URL, {
          width: 512,
          margin: 0,
          color: { dark: "#0a0a0a", light: "#ffffff" },
        });
        if (!cancelled) setQrDataUrl(dataUrl);
      } catch {
        if (!cancelled) setQrDataUrl(null);
      }
    }

    void buildQr();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const interaction = interactionRef.current;
      const stage = stageRef.current;
      if (!interaction || !stage) return;

      const bounds = stage.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;

      const deltaX = ((clientX - interaction.startX) / bounds.width) * 100;
      const deltaY = ((clientY - interaction.startY) / bounds.height) * 100;
      const start = interaction.startRect;

      if (interaction.kind === "move") {
        setRect(
          normalizeRect({
            ...start,
            x: start.x + deltaX,
            y: start.y + deltaY,
          }),
        );
        return;
      }

      const nextWidth = Math.max(
        QR_BOX_MIN_WIDTH_PERCENT,
        start.width + deltaX,
      );

      setRect(
        normalizeRect({
          ...start,
          width: nextWidth,
        }),
      );
    },
    [normalizeRect],
  );

  useEffect(() => {
    function onPointerMove(event: PointerEvent) {
      const interaction = interactionRef.current;
      if (!interaction || event.pointerId !== interaction.pointerId) return;
      updateFromPointer(event.clientX, event.clientY);
    }

    function endInteraction(event: PointerEvent) {
      const interaction = interactionRef.current;
      if (!interaction || event.pointerId !== interaction.pointerId) return;
      interactionRef.current = null;
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endInteraction);
    window.addEventListener("pointercancel", endInteraction);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endInteraction);
      window.removeEventListener("pointercancel", endInteraction);
    };
  }, [updateFromPointer]);

  function startMove(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    interactionRef.current = {
      kind: "move",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startRect: rect,
    };
  }

  function startResize(event: ReactPointerEvent<HTMLSpanElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    interactionRef.current = {
      kind: "resize",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startRect: rect,
    };
  }

  return (
    <div
      className="admin-code-editor-root"
      role="dialog"
      aria-modal="true"
      aria-label="Nastavení pozice QR kódu na poukazu"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="admin-code-editor-panel">
        <div className="admin-code-editor-head">
          <div>
            <p className="admin-code-editor-kicker">Pozice QR kódu</p>
            <p className="admin-code-editor-lead">
              Přetáhněte QR na poukaz a upravte velikost. Ukázka vede na{" "}
              <strong className="admin-code-editor-lead-url">
                {MOCK_QR_URL.replace(/^https?:\/\//, "")}
              </strong>
            </p>
          </div>
          <AdminDismissButton label="Zavřít editor QR" onClick={onClose} />
        </div>

        <div className="admin-code-editor-body">
          {loading ? (
            <p className="admin-code-editor-status">Načítám PDF…</p>
          ) : null}
          {loadError ? (
            <p className="admin-drawer-error admin-code-editor-status">{loadError}</p>
          ) : null}

          <div ref={viewportRef} className="admin-code-editor-viewport">
            {!loading && !loadError ? (
              <div
                ref={stageRef}
                className="admin-code-editor-stage"
                style={
                  stageSize.width > 0
                    ? {
                        width: `${stageSize.width}px`,
                        height: `${stageSize.height}px`,
                      }
                    : undefined
                }
              >
                <canvas
                  ref={canvasRef}
                  className="admin-code-editor-canvas"
                  style={
                    stageSize.width > 0
                      ? {
                          width: `${stageSize.width}px`,
                          height: `${stageSize.height}px`,
                        }
                      : undefined
                  }
                />
                {stageSize.width > 0 ? (
                  <div className="admin-code-editor-overlay">
                    <div
                      className="admin-code-editor-qr"
                      style={{
                        left: `${rect.x}%`,
                        top: `${rect.y}%`,
                        width: `${rect.width}%`,
                        height: `${rect.height}%`,
                      }}
                      onPointerDown={startMove}
                    >
                      {qrDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={qrDataUrl}
                          alt="Ukázkový QR kód"
                          className="admin-code-editor-qr-image"
                          draggable={false}
                        />
                      ) : (
                        <span className="admin-code-editor-qr-fallback">QR</span>
                      )}
                      <span
                        className="admin-code-editor-resize-handle"
                        aria-hidden
                        onPointerDown={startResize}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="admin-code-editor-footer">
          <button type="button" className="admin-outline-btn" onClick={onClose}>
            Zrušit
          </button>
          <button
            type="button"
            className="admin-primary-btn admin-code-editor-save"
            disabled={loading || Boolean(loadError)}
            onClick={() => onSave(normalizeRect(rect))}
          >
            <SaveIcon />
            Uložit pozici
          </button>
        </div>
      </div>
    </div>
  );
}
