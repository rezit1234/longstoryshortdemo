"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ADMIN_SOLD_VOUCHERS,
  ADMIN_VOUCHER_STATUS_LABELS,
  type AdminSoldVoucher,
} from "@/data/admin-vouchers";
import { normalizeVoucherCode } from "@/data/admin-voucher-settings";
import { AdminDismissButton } from "./AdminDismissButton";

type AdminVoucherDrawerContextValue = {
  vouchers: AdminSoldVoucher[];
  openVoucher: (voucher: AdminSoldVoucher) => void;
  closeVoucher: () => void;
  redeemVoucher: (code: string) => void;
  activateVoucher: (code: string) => void;
  activeVoucherCode: string | null;
};

const AdminVoucherDrawerContext =
  createContext<AdminVoucherDrawerContextValue | null>(null);

const DRAWER_ANIMATION_MS = 220;

function AdminVoucherCtaIcon({
  kind,
}: {
  kind: "redeem" | "handover" | "shipped";
}) {
  if (kind === "shipped") {
    return (
      <svg
        className="admin-voucher-drawer-cta-icon"
        width="24"
        height="24"
        viewBox="0 0 256 256"
        fill="currentColor"
        aria-hidden
      >
        <path d="M227.32,28.68a16,16,0,0,0-15.66-4.08l-.15,0L19.57,82.84a16,16,0,0,0-2.49,29.8L102,154l41.3,84.87A15.86,15.86,0,0,0,157.74,248q.69,0,1.38-.06a15.88,15.88,0,0,0,14-11.51l58.2-191.94c0-.05,0-.1,0-.15A16,16,0,0,0,227.32,28.68ZM157.83,231.85l-.05.14,0-.07-40.06-82.3,48-48a8,8,0,0,0-11.31-11.31l-48,48L24.08,98.25l-.07,0,.14,0L216,40Z" />
      </svg>
    );
  }

  if (kind === "handover") {
    return (
      <svg
        className="admin-voucher-drawer-cta-icon"
        width="24"
        height="24"
        viewBox="0 0 256 256"
        fill="currentColor"
        aria-hidden
      >
        <path d="M230.33,141.06a24.43,24.43,0,0,0-21.24-4.23l-41.84,9.62A28,28,0,0,0,140,112H89.94a31.82,31.82,0,0,0-22.63,9.37L44.69,144H16A16,16,0,0,0,0,160v40a16,16,0,0,0,16,16H120a7.93,7.93,0,0,0,1.94-.24l64-16a7.35,7.35,0,0,0,1.2-.4L226,182.82l.44-.2a24.6,24.6,0,0,0,3.93-41.56ZM40,200H16V160H40Zm179.43-31.79-38,16.18L119,200H56V155.31l22.63-22.62A15.86,15.86,0,0,1,89.94,128H140a12,12,0,0,1,0,24H112a8,8,0,0,0,0,16h32a8.32,8.32,0,0,0,1.79-.2l67-15.41.31-.08a8.6,8.6,0,0,1,6.3,15.9ZM154.34,61.66a8,8,0,0,1,0-11.32l32-32a8,8,0,0,1,11.32,0l32,32a8,8,0,0,1-11.32,11.32L200,43.31V104a8,8,0,0,1-16,0V43.31L165.66,61.66A8,8,0,0,1,154.34,61.66Z" />
      </svg>
    );
  }

  return (
    <svg
      className="admin-voucher-drawer-cta-icon"
      width="24"
      height="24"
      viewBox="0 0 175 175"
      fill="none"
      aria-hidden
    >
      <path
        d="m160.42 64.74c-0.49-11.24-1.86-18.56-5.69-24.35-2.2-3.33-4.94-6.23-8.09-8.56-8.5-6.31-20.5-6.31-44.5-6.31h-29.27c-24 0-36 0-44.51 6.31-3.15 2.33-5.88 5.23-8.09 8.56-3.83 5.79-5.19 13.11-5.68 24.35-0.08 1.92 1.57 3.39 3.39 3.39 10.1 0 18.29 8.67 18.29 19.37 0 10.7-8.19 19.37-18.29 19.37-1.82 0-3.47 1.47-3.39 3.39 0.49 11.24 1.85 18.56 5.68 24.35 2.21 3.33 4.94 6.23 8.09 8.56 8.51 6.31 20.51 6.31 44.51 6.31h29.27c24 0 36 0 44.5-6.31 3.15-2.33 5.89-5.23 8.09-8.56 3.83-5.79 5.2-13.11 5.69-24.35z"
        stroke="currentColor"
        strokeWidth="14"
        strokeLinejoin="round"
      />
      <path
        d="m65.63 94.79l21.87 21.88"
        stroke="currentColor"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m87.5 116.67l36.46-51.05"
        stroke="currentColor"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function useAdminVoucherDrawer() {
  const context = useContext(AdminVoucherDrawerContext);
  if (!context) {
    throw new Error("useAdminVoucherDrawer must be used within AdminVoucherDrawerProvider");
  }
  return context;
}

function AdminVoucherDrawerPanel({
  voucher,
  onClose,
  onRedeem,
  onActivate,
}: {
  voucher: AdminSoldVoucher;
  onClose: () => void;
  onRedeem: (code: string) => void;
  onActivate: (code: string) => void;
}) {
  const [isClosing, setIsClosing] = useState(false);

  const requestClose = useCallback(() => {
    setIsClosing(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [requestClose]);

  useEffect(() => {
    if (!isClosing) return;

    const timer = window.setTimeout(onClose, DRAWER_ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, [isClosing, onClose]);

  const handleActivate = useCallback(() => {
    onActivate(voucher.code);
    requestClose();
  }, [onActivate, requestClose, voucher.code]);

  const footerCta =
    voucher.status === "active"
      ? {
          label: "Uplatnit poukaz",
          onClick: () => onRedeem(voucher.code),
          icon: "redeem" as const,
        }
      : voucher.status === "awaiting_pickup"
        ? {
            label: "Poukaz předán",
            onClick: handleActivate,
            icon: "handover" as const,
          }
        : voucher.status === "awaiting_shipment"
          ? {
              label: "Odesláno",
              onClick: handleActivate,
              icon: "shipped" as const,
            }
          : null;

  return (
    <>
      <button
        type="button"
        className={
          isClosing
            ? "admin-voucher-drawer-backdrop is-closing"
            : "admin-voucher-drawer-backdrop"
        }
        aria-label="Zavřít detail poukazu"
        onClick={requestClose}
      />

      <aside
        className={isClosing ? "admin-voucher-drawer is-closing" : "admin-voucher-drawer"}
        role="dialog"
        aria-modal="true"
        aria-label={`Detail poukazu ${voucher.code}`}
      >
        <div className="admin-voucher-drawer-head">
          <p className="admin-voucher-drawer-kicker">Detail poukazu</p>
          <AdminDismissButton label="Zavřít detail poukazu" onClick={requestClose} />
        </div>

        <div className="admin-voucher-drawer-body">
          <div className="admin-voucher-drawer-title-row">
            <h2>{voucher.code}</h2>
            <span className={`admin-status is-${voucher.status}`}>
              {voucher.statusLabel}
            </span>
          </div>

          <dl className="admin-voucher-drawer-fields">
            <div>
              <dt>Zákazník</dt>
              <dd>{voucher.customer}</dd>
            </div>
            <div>
              <dt>E-mail zákazníka</dt>
              <dd>{voucher.email}</dd>
            </div>
            <div>
              <dt>Telefon</dt>
              <dd>{voucher.phone}</dd>
            </div>
            <div>
              <dt>Hodnota poukazu</dt>
              <dd>{voucher.value}</dd>
            </div>
            {voucher.packagingFee ? (
              <div>
                <dt>Dárkové balení</dt>
                <dd>{voucher.packagingFee}</dd>
              </div>
            ) : null}
            <div>
              <dt>Celková částka</dt>
              <dd>{voucher.totalPaid}</dd>
            </div>
            <div>
              <dt>Produkt</dt>
              <dd>{voucher.product}</dd>
            </div>
            <div>
              <dt>Datum nákupu</dt>
              <dd>{voucher.purchasedAt}</dd>
            </div>
            <div>
              <dt>Platnost do</dt>
              <dd>{voucher.validUntil}</dd>
            </div>
            <div>
              <dt>Způsob doručení</dt>
              <dd>{voucher.deliveryMethod}</dd>
            </div>
            {voucher.shippingAddress ? (
              <div className="admin-voucher-drawer-address">
                <dt>Doručovací adresa</dt>
                <dd>
                  <span>{voucher.shippingAddress.name}</span>
                  <span>{voucher.shippingAddress.address}</span>
                  <span>
                    {voucher.shippingAddress.postalCode} {voucher.shippingAddress.city}
                  </span>
                  <span>{voucher.shippingAddress.country}</span>
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        {footerCta ? (
          <div className="admin-voucher-drawer-footer">
            <button
              type="button"
              className="admin-voucher-drawer-cta"
              onClick={footerCta.onClick}
            >
              <AdminVoucherCtaIcon kind={footerCta.icon} />
              {footerCta.label}
            </button>
          </div>
        ) : null}
      </aside>
    </>
  );
}

export function AdminVoucherDrawerProvider({ children }: { children: ReactNode }) {
  const [vouchers, setVouchers] = useState(ADMIN_SOLD_VOUCHERS);
  const [activeVoucherCode, setActiveVoucherCode] = useState<string | null>(null);

  const activeVoucher = useMemo(
    () => vouchers.find((voucher) => voucher.code === activeVoucherCode) ?? null,
    [activeVoucherCode, vouchers],
  );

  const redeemVoucher = useCallback((code: string) => {
    const normalized = normalizeVoucherCode(code);
    setVouchers((current) =>
      current.map((voucher) =>
        voucher.code === normalized
          ? {
              ...voucher,
              status: "redeemed",
              statusLabel: ADMIN_VOUCHER_STATUS_LABELS.redeemed,
            }
          : voucher,
      ),
    );
  }, []);

  const activateVoucher = useCallback((code: string) => {
    const normalized = normalizeVoucherCode(code);
    setVouchers((current) =>
      current.map((voucher) =>
        voucher.code === normalized
          ? {
              ...voucher,
              status: "active",
              statusLabel: ADMIN_VOUCHER_STATUS_LABELS.active,
            }
          : voucher,
      ),
    );
  }, []);

  useEffect(() => {
    if (!activeVoucherCode) return;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [activeVoucherCode]);

  return (
    <AdminVoucherDrawerContext.Provider
      value={{
        vouchers,
        openVoucher: (voucher) => setActiveVoucherCode(voucher.code),
        closeVoucher: () => setActiveVoucherCode(null),
        redeemVoucher,
        activateVoucher,
        activeVoucherCode,
      }}
    >
      {children}
      {activeVoucher ? (
        <AdminVoucherDrawerPanel
          voucher={activeVoucher}
          onClose={() => setActiveVoucherCode(null)}
          onRedeem={(code) => redeemVoucher(code)}
          onActivate={(code) => activateVoucher(code)}
        />
      ) : null}
    </AdminVoucherDrawerContext.Provider>
  );
}
