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
  type AdminSoldVoucher,
} from "@/data/admin-vouchers";
import { AdminDismissButton } from "./AdminDismissButton";

type AdminVoucherDrawerContextValue = {
  vouchers: AdminSoldVoucher[];
  openVoucher: (voucher: AdminSoldVoucher) => void;
  closeVoucher: () => void;
  redeemVoucher: (code: string) => void;
  activeVoucherCode: string | null;
};

const AdminVoucherDrawerContext =
  createContext<AdminVoucherDrawerContextValue | null>(null);

const DRAWER_ANIMATION_MS = 220;

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
}: {
  voucher: AdminSoldVoucher;
  onClose: () => void;
  onRedeem: (code: string) => void;
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
          </dl>
        </div>

        {voucher.status === "active" ? (
          <div className="admin-voucher-drawer-footer">
            <button
              type="button"
              className="admin-voucher-drawer-cta"
              onClick={() => onRedeem(voucher.code)}
            >
              <span
                className="admin-voucher-drawer-cta-icon is-redeem"
                style={{
                  WebkitMaskImage: "url(/icons/uplatneni.svg)",
                  maskImage: "url(/icons/uplatneni.svg)",
                }}
                aria-hidden
              />
              Uplatnit poukaz
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
    setVouchers((current) =>
      current.map((voucher) =>
        voucher.code === code.trim().toUpperCase()
          ? { ...voucher, status: "redeemed", statusLabel: "Uplatněný" }
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
        activeVoucherCode,
      }}
    >
      {children}
      {activeVoucher ? (
        <AdminVoucherDrawerPanel
          voucher={activeVoucher}
          onClose={() => setActiveVoucherCode(null)}
          onRedeem={(code) => redeemVoucher(code)}
        />
      ) : null}
    </AdminVoucherDrawerContext.Provider>
  );
}
