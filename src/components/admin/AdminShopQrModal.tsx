"use client";

import { useCallback, useEffect, useState } from "react";
import { IconDownload } from "./icons";

type AdminShopQrModalProps = {
  shopUrl: string;
  onClose: () => void;
};

export function AdminShopQrModal({ shopUrl, onClose }: AdminShopQrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;

    async function buildQr() {
      setLoading(true);
      try {
        const QRCode = (await import("qrcode")).default;
        const dataUrl = await QRCode.toDataURL(shopUrl, {
          width: 512,
          margin: 0,
          color: { dark: "#0a0a0a", light: "#ffffff" },
        });
        if (!cancelled) {
          setQrDataUrl(dataUrl);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setQrDataUrl(null);
          setLoading(false);
        }
      }
    }

    void buildQr();
    return () => {
      cancelled = true;
    };
  }, [shopUrl]);

  const downloadQr = useCallback(() => {
    if (!qrDataUrl) return;

    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = "qr-obchod.png";
    link.click();
  }, [qrDataUrl]);

  return (
    <div
      className="admin-confirm-root"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="admin-confirm-dialog admin-shop-qr-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-shop-qr-title"
      >
        <h2 id="admin-shop-qr-title">QR kód na váš obchod</h2>

        <div className="admin-shop-qr-preview" aria-busy={loading}>
          {loading ? (
            <p className="admin-shop-qr-status">Generuji QR kód…</p>
          ) : qrDataUrl ? (
            <img src={qrDataUrl} alt={`QR kód pro ${shopUrl}`} />
          ) : (
            <p className="admin-shop-qr-status">Nepodařilo se vygenerovat QR kód.</p>
          )}
        </div>

        <div className="admin-shop-qr-actions">
          <button type="button" className="admin-outline-btn" onClick={onClose}>
            Zavřít
          </button>
          <button
            type="button"
            className="admin-primary-btn"
            onClick={downloadQr}
            disabled={!qrDataUrl}
          >
            <IconDownload className="admin-icon" />
            Stáhnout
          </button>
        </div>
      </div>
    </div>
  );
}
