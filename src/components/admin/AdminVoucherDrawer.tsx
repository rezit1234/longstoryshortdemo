"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ADMIN_VOUCHER_STATUS_LABELS,
  type AdminSoldVoucher,
} from "@/data/admin-vouchers";
import { normalizeVoucherCode } from "@/data/admin-voucher-settings";
import { formatCzk } from "@/data/vouchers";
import { getShopBrand } from "@/data/shops";
import {
  canCancelVoucher,
  canEditVoucherValidity,
  canRedeemVoucher,
  canUndoLockedRedemption,
} from "@/lib/auth";
import { AdminActionModal } from "./AdminActionModal";
import { AdminDismissButton } from "./AdminDismissButton";
import { useAdminUser } from "./AdminUserProvider";
import { IconCancel } from "./icons";

type RedeemResponse = {
  voucher?: AdminSoldVoucher;
  emailSent?: boolean;
  emailTo?: string | null;
  emailSkippedReason?: string | null;
  error?: string;
};

type AdminVoucherDrawerContextValue = {
  vouchers: AdminSoldVoucher[];
  vouchersLoading: boolean;
  openVoucher: (voucher: AdminSoldVoucher) => void;
  closeVoucher: () => void;
  redeemVoucher: (code: string) => void;
  activateVoucher: (code: string) => void;
  activeVoucherCode: string | null;
  prependVoucher: (voucher: AdminSoldVoucher) => void;
  reloadVouchers: () => Promise<void>;
  upsertVoucher: (voucher: AdminSoldVoucher) => void;
  removeVoucher: (code: string) => void;
};

const AdminVoucherDrawerContext =
  createContext<AdminVoucherDrawerContextValue | null>(null);

const DRAWER_ANIMATION_MS = 220;

function AdminVoucherCtaIcon({
  kind,
}: {
  kind:
    | "redeem"
    | "handover"
    | "shipped"
    | "partial"
    | "undo"
    | "cancel"
    | "restore"
    | "delete";
}) {
  if (kind === "cancel") {
    return (
      <svg
        className="admin-voucher-drawer-cta-icon"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    );
  }

  if (kind === "restore") {
    return (
      <svg
        className="admin-voucher-drawer-cta-icon"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </svg>
    );
  }

  if (kind === "delete") {
    return (
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
          d="M19.5 5.5L18.8803 15.5251C18.7219 18.0864 18.6428 19.3671 18.0008 20.2879C17.6833 20.7431 17.2747 21.1273 16.8007 21.416C15.8421 22 14.559 22 11.9927 22C9.42312 22 8.1383 22 7.17905 21.4149C6.7048 21.1257 6.296 20.7408 5.97868 20.2848C5.33688 19.3626 5.25945 18.0801 5.10461 15.5152L4.5 5.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M3 5.5H21M16.0557 5.5L15.3731 4.09173C14.9196 3.15626 14.6928 2.68852 14.3017 2.39681C14.215 2.3321 14.1231 2.27454 14.027 2.2247C13.5939 2 13.0741 2 12.0345 2C10.9688 2 10.436 2 9.99568 2.23412C9.8981 2.28601 9.80498 2.3459 9.71729 2.41317C9.32164 2.7167 9.10063 3.20155 8.65861 4.17126L8.05292 5.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M9.5 16.5L9.5 10.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M14.5 16.5L14.5 10.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (kind === "undo") {
    return (
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
          d="M3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C8.79275 3 5.97733 4.67765 4.38341 7.20327M3.29339 3.00076L3.46556 5.05452C3.58958 6.53384 3.65159 7.27349 4.13359 7.68914C4.61559 8.10479 5.32673 8.03185 6.74899 7.88595L8.79339 7.67625"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (kind === "partial") {
    return (
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
          d="M20.5 15.8278C17.9985 21.756 9.86407 23.4835 5.20143 18.8641C0.629484 14.3347 2.04493 6.12883 8.05653 3.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M17.6831 12.5C19.5708 12.5 20.5146 12.5 21.1241 11.655C21.1469 11.6234 21.1848 11.5667 21.2052 11.5336C21.7527 10.6471 21.4705 9.966 20.9063 8.60378C20.3946 7.36853 19.6447 6.24615 18.6993 5.30073C17.7538 4.35531 16.6315 3.60536 15.3962 3.0937C14.034 2.52946 13.3529 2.24733 12.4664 2.79477C12.4333 2.81523 12.3766 2.85309 12.345 2.87587C11.5 3.4854 11.5 4.42922 11.5 6.31686V8.42748C11.5 10.3473 11.5 11.3072 12.0964 11.9036C12.6928 12.5 13.6527 12.5 15.5725 12.5H17.6831Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    );
  }

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
        <path d="M230.33,141.06a24.43,24.43,0,0,0-21.24-4.23l-41.84,9.62A28,28,0,0,0,140,112H89.94a31.82,31.82,0,0,0-22.63,9.37L44.69,144H16A16,16,0,0,0,0,160v40a16,16,0,0,0,16,16H120a7.93,7.93,0,0,0,1.94-.24l64-16a7.35,7.35,0,0,0,1.2-.4L226,182.82l.44-.2a24.6,24.6,0,0,0,3.93-41.56ZM40,200H16V160H40Zm179.43-31.79-38,16.18L119,200H56V155.31l22.63-22.62A15.86,15.86,0,0,1,89.94,128H140a12,12,0,0,1,0,24H112a8,8,0,0,0,0,16h32a8.32,8.32,0,0,0,1.79-.20l67-15.41.31-.08a8.6,8.6,0,0,1,6.3,15.9ZM154.34,61.66a8,8,0,0,1,0-11.32l32-32a8,8,0,0,1,11.32,0l32,32a8,8,0,0,1-11.32,11.32L200,43.31V104a8,8,0,0,1-16,0V43.31L165.66,61.66A8,8,0,0,1,154.34,61.66Z" />
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
    throw new Error(
      "useAdminVoucherDrawer must be used within AdminVoucherDrawerProvider",
    );
  }
  return context;
}

function emailResultMessage(data: RedeemResponse) {
  if (data.emailSent && data.emailTo) {
    return `E-mail o zůstatku odeslán na ${data.emailTo}.`;
  }
  if (data.emailSkippedReason) return data.emailSkippedReason;
  return null;
}

function AdminVoucherDrawerPanel({
  voucher,
  onClose,
  onActivate,
  onUpsert,
  onRemove,
}: {
  voucher: AdminSoldVoucher;
  onClose: () => void;
  onActivate: (code: string) => void;
  onUpsert: (voucher: AdminSoldVoucher) => void;
  onRemove: (code: string) => void;
}) {
  const { user } = useAdminUser();
  const allowRedeem = canRedeemVoucher(user.role);
  const allowCancel = canCancelVoucher(user.role);
  const [isClosing, setIsClosing] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<
    null | "full" | "partial" | "cancel" | "delete"
  >(null);
  const [partialAmount, setPartialAmount] = useState("");
  const [redeemNote, setRedeemNote] = useState("");
  const [selectedPartId, setSelectedPartId] = useState("");
  const [editingValidUntil, setEditingValidUntil] = useState(false);
  const [validUntilDraft, setValidUntilDraft] = useState(
    voucher.validUntilIso ?? "",
  );
  const [validUntilBusy, setValidUntilBusy] = useState(false);

  const openParts = useMemo(
    () => (voucher.redeemableParts ?? []).filter((part) => !part.redeemed),
    [voucher.redeemableParts],
  );
  const canPartialAmount =
    allowRedeem &&
    voucher.status === "active" &&
    voucher.itemKind === "amount" &&
    (voucher.remainingCzk ?? 0) > 0;
  const canPartialPart =
    allowRedeem && voucher.status === "active" && openParts.length > 0;
  const canPartial = canPartialAmount || canPartialPart;
  const remainingCzk = voucher.remainingCzk ?? voucher.unitPriceCzk ?? 0;
  const undoLockedForUser =
    Boolean(voucher.undoLocked) && !canUndoLockedRedemption(user.role);
  const canUndo =
    allowRedeem &&
    (Boolean(voucher.canUndo) ||
      voucher.status === "redeemed" ||
      (voucher.itemKind === "amount" &&
        voucher.remainingCzk != null &&
        voucher.unitPriceCzk != null &&
        voucher.remainingCzk < voucher.unitPriceCzk) ||
      (voucher.redeemableParts ?? []).some((part) => part.redeemed));

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

  useEffect(() => {
    setActionModal(null);
    setPartialAmount("");
    setSelectedPartId(openParts[0]?.id ?? "");
    setActionError(null);
    setEmailFeedback(null);
    setEditingValidUntil(false);
    setValidUntilDraft(voucher.validUntilIso ?? "");
  }, [voucher.code, voucher.validUntilIso, openParts]);

  const canEditValidUntil =
    canEditVoucherValidity(user.role) &&
    voucher.status !== "redeemed" &&
    voucher.status !== "cancelled";

  const handleActivate = useCallback(() => {
    onActivate(voucher.code);
    requestClose();
  }, [onActivate, requestClose, voucher.code]);

  const postRedeem = useCallback(
    async (body: Record<string, unknown>) => {
      setActionBusy(true);
      setActionError(null);
      try {
        const response = await fetch(
          `/api/admin/sold-vouchers/${encodeURIComponent(voucher.code)}/redeem`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              body.action === "undo"
                ? body
                : { ...body, note: redeemNote.trim() || undefined },
            ),
          },
        );
        const data = (await response.json().catch(() => ({}))) as RedeemResponse;
        if (!response.ok || !data.voucher) {
          setActionError(data.error || "Akci se nepodařilo dokončit.");
          return;
        }
        onUpsert(data.voucher);
        const mailNote = emailResultMessage(data);
        if (mailNote) setEmailFeedback(mailNote);
        setActionModal(null);
        setPartialAmount("");
        if (body.action !== "undo") setRedeemNote("");
        return true;
      } catch {
        setActionError("Akci se nepodařilo dokončit.");
        return false;
      } finally {
        setActionBusy(false);
      }
    },
    [onUpsert, redeemNote, voucher.code],
  );

  const closeActionModal = useCallback(() => {
    setActionModal(null);
    setActionError(null);
  }, []);

  const openActionModal = useCallback(
    (kind: "full" | "partial" | "cancel" | "delete") => {
      setActionError(null);
      setRedeemNote("");
      setSelectedPartId(openParts[0]?.id ?? "");
      setActionModal(kind);
    },
    [openParts],
  );

  const handlePartialSubmit = useCallback(() => {
    if (canPartialAmount) {
      const amount = Math.round(Number(partialAmount.replace(",", ".")));
      void postRedeem({ action: "amount", amountCzk: amount });
      return;
    }
    if (canPartialPart && selectedPartId) {
      void postRedeem({ action: "part", partId: selectedPartId });
    }
  }, [
    canPartialAmount,
    canPartialPart,
    partialAmount,
    postRedeem,
    selectedPartId,
  ]);

  const handleValidUntilSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      if (!validUntilDraft.trim()) return;
      setValidUntilBusy(true);
      setActionError(null);
      try {
        const response = await fetch(
          `/api/admin/sold-vouchers/${encodeURIComponent(voucher.code)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ validUntil: validUntilDraft.trim() }),
          },
        );
        const data = (await response.json().catch(() => ({}))) as {
          voucher?: AdminSoldVoucher;
          error?: string;
        };
        if (!response.ok || !data.voucher) {
          setActionError(data.error || "Platnost se nepodařilo uložit.");
          return;
        }
        onUpsert(data.voucher);
        setEditingValidUntil(false);
      } catch {
        setActionError("Platnost se nepodařilo uložit.");
      } finally {
        setValidUntilBusy(false);
      }
    },
    [onUpsert, validUntilDraft, voucher.code],
  );

  const patchStatus = useCallback(
    async (status: AdminSoldVoucher["status"]) => {
      setActionBusy(true);
      setActionError(null);
      try {
        const response = await fetch(
          `/api/admin/sold-vouchers/${encodeURIComponent(voucher.code)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          },
        );
        const data = (await response.json().catch(() => ({}))) as {
          voucher?: AdminSoldVoucher;
          error?: string;
        };
        if (!response.ok || !data.voucher) {
          setActionError(data.error || "Stav se nepodařilo změnit.");
          return false;
        }
        onUpsert(data.voucher);
        setActionModal(null);
        return true;
      } catch {
        setActionError("Stav se nepodařilo změnit.");
        return false;
      } finally {
        setActionBusy(false);
      }
    },
    [onUpsert, voucher.code],
  );

  const canShowCancel =
    allowCancel &&
    (voucher.status === "active" ||
      voucher.status === "awaiting_shipment" ||
      voucher.status === "awaiting_pickup" ||
      voucher.status === "expired");
  const canShowRestore = allowCancel && voucher.status === "cancelled";
  const canShowHardDelete = allowCancel && voucher.status === "cancelled";

  const hardDelete = useCallback(async () => {
    setActionBusy(true);
    setActionError(null);
    try {
      const response = await fetch(
        `/api/admin/sold-vouchers/${encodeURIComponent(voucher.code)}`,
        { method: "DELETE" },
      );
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || !data.ok) {
        setActionError(data.error || "Poukaz se nepodařilo smazat.");
        return;
      }
      onRemove(voucher.code);
      window.dispatchEvent(
        new CustomEvent("admin-sold-voucher-deleted", {
          detail: { code: voucher.code },
        }),
      );
      requestClose();
    } catch {
      setActionError("Poukaz se nepodařilo smazat.");
    } finally {
      setActionBusy(false);
    }
  }, [onRemove, requestClose, voucher.code]);

  const footerCta =
    voucher.status === "awaiting_pickup"
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
        className={
          isClosing ? "admin-voucher-drawer is-closing" : "admin-voucher-drawer"
        }
        role="dialog"
        aria-modal="true"
        aria-label={`Detail poukazu ${voucher.code}`}
      >
        <div className="admin-voucher-drawer-head">
          <p className="admin-voucher-drawer-kicker">Detail poukazu</p>
          <AdminDismissButton
            label="Zavřít detail poukazu"
            onClick={requestClose}
          />
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
              <dt>Obchod</dt>
              <dd>{getShopBrand(voucher.shopId).brandName}</dd>
            </div>
            <div>
              <dt>Zákazník</dt>
              <dd>{voucher.customer}</dd>
            </div>
            <div>
              <dt>E-mail zákazníka</dt>
              <dd>{voucher.email}</dd>
            </div>
            {voucher.isGift && voucher.recipientName ? (
              <div>
                <dt>Příjemce</dt>
                <dd>{voucher.recipientName}</dd>
              </div>
            ) : null}
            {voucher.phone?.trim() ? (
              <div>
                <dt>Telefon</dt>
                <dd>{voucher.phone}</dd>
              </div>
            ) : null}
            {voucher.itemKind === "experience" ||
            !/^Poukaz\b/i.test(voucher.product.trim()) ? (
              <div>
                <dt>Produkt</dt>
                <dd>{voucher.product}</dd>
              </div>
            ) : null}
            <div>
              <dt>Hodnota</dt>
              <dd>{formatCzk(voucher.unitPriceCzk ?? 0)}</dd>
            </div>
            {voucher.itemKind === "amount" &&
            voucher.remainingCzk != null &&
            voucher.unitPriceCzk != null &&
            voucher.remainingCzk < voucher.unitPriceCzk ? (
              <div>
                <dt>Zůstatek</dt>
                <dd>{formatCzk(voucher.remainingCzk)}</dd>
              </div>
            ) : null}
            {voucher.redeemableParts && voucher.redeemableParts.length > 0 ? (
              <div>
                <dt>Části poukazu</dt>
                <dd>
                  <ul className="admin-voucher-parts-list">
                    {voucher.redeemableParts.map((part) => (
                      <li key={part.id}>
                        {part.label} - {part.redeemed ? "Uplatněno" : "Aktivní"}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            ) : null}
            {voucher.packagingFee ? (
              <div>
                <dt>Dárkové balení</dt>
                <dd>{voucher.packagingFee}</dd>
              </div>
            ) : null}
            <div>
              <dt>Datum nákupu</dt>
              <dd>{voucher.purchasedAt}</dd>
            </div>
            <div>
              <dt>Platnost do</dt>
              <dd>
                {editingValidUntil ? (
                  <form
                    className="admin-voucher-valid-until-edit"
                    onSubmit={(event) => void handleValidUntilSubmit(event)}
                  >
                    <input
                      type="date"
                      value={validUntilDraft}
                      onChange={(event) =>
                        setValidUntilDraft(event.target.value)
                      }
                      required
                      disabled={validUntilBusy}
                      aria-label="Platnost do"
                    />
                    <button
                      type="submit"
                      className="admin-voucher-valid-until-save"
                      disabled={validUntilBusy || !validUntilDraft}
                    >
                      {validUntilBusy ? "…" : "Uložit"}
                    </button>
                    <button
                      type="button"
                      className="admin-voucher-valid-until-cancel"
                      disabled={validUntilBusy}
                      onClick={() => {
                        setEditingValidUntil(false);
                        setValidUntilDraft(voucher.validUntilIso ?? "");
                      }}
                    >
                      <IconCancel className="admin-page-head-btn-icon" />
                      <span className="admin-page-head-btn-label">Zrušit</span>
                    </button>
                  </form>
                ) : (
                  <span className="admin-voucher-valid-until-value">
                    {voucher.validUntil}
                    {canEditValidUntil ? (
                      <button
                        type="button"
                        className="admin-voucher-edit-valid-btn"
                        aria-label="Upravit platnost"
                        title="Upravit platnost"
                        onClick={() => {
                          setValidUntilDraft(voucher.validUntilIso ?? "");
                          setEditingValidUntil(true);
                        }}
                      >
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                    ) : null}
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt>Způsob doručení</dt>
              <dd>{voucher.deliveryMethod}</dd>
            </div>
            {voucher.paymentMethodLabel ? (
              <div>
                <dt>Způsob platby</dt>
                <dd>{voucher.paymentMethodLabel}</dd>
              </div>
            ) : null}
            <div>
              <dt>PDF poukazu</dt>
              <dd>
                {voucher.pdfUrl ? (
                  <a
                    className="admin-voucher-drawer-pdf-link"
                    href={`/api/admin/sold-vouchers/${encodeURIComponent(voucher.code)}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Stáhnout PDF
                  </a>
                ) : (
                  "Zatím nevygenerováno"
                )}
              </dd>
            </div>
            {voucher.shippingAddress ? (
              <div className="admin-voucher-drawer-address">
                <dt>Doručovací adresa</dt>
                <dd>
                  <span>{voucher.shippingAddress.name}</span>
                  <span>{voucher.shippingAddress.address}</span>
                  <span>
                    {voucher.shippingAddress.postalCode}{" "}
                    {voucher.shippingAddress.city}
                  </span>
                  <span>{voucher.shippingAddress.country}</span>
                </dd>
              </div>
            ) : null}
          </dl>
          {emailFeedback ? (
            <p className="admin-voucher-drawer-email-feedback">{emailFeedback}</p>
          ) : null}
          {actionError ? (
            <p className="admin-voucher-drawer-email-feedback is-error">
              {actionError}
            </p>
          ) : null}
        </div>

        <div className="admin-voucher-drawer-footer">
          {canShowCancel ? (
            <button
              type="button"
              className="admin-voucher-drawer-cta is-secondary is-danger"
              disabled={actionBusy}
              onClick={() => openActionModal("cancel")}
            >
              <AdminVoucherCtaIcon kind="cancel" />
              <span className="admin-voucher-drawer-cta-label">
                {actionBusy ? "Ukládám…" : "Stornovat poukaz"}
              </span>
            </button>
          ) : null}

          {canShowRestore ? (
            <button
              type="button"
              className="admin-voucher-drawer-cta is-secondary"
              disabled={actionBusy}
              onClick={() => void patchStatus("active")}
            >
              <AdminVoucherCtaIcon kind="restore" />
              <span className="admin-voucher-drawer-cta-label">
                {actionBusy ? "Ukládám…" : "Obnovit poukaz"}
              </span>
            </button>
          ) : null}

          {canShowHardDelete ? (
            <button
              type="button"
              className="admin-voucher-drawer-cta is-secondary is-danger"
              disabled={actionBusy}
              onClick={() => openActionModal("delete")}
            >
              <AdminVoucherCtaIcon kind="delete" />
              <span className="admin-voucher-drawer-cta-label">
                {actionBusy ? "Mažu…" : "Definitivně smazat"}
              </span>
            </button>
          ) : null}

          {canUndo ? (
            <button
              type="button"
              className="admin-voucher-drawer-cta is-secondary"
              disabled={actionBusy || undoLockedForUser}
              title={
                undoLockedForUser
                  ? "Uplatnění je zamčené (starší než hodina). Vrátit může jen vlastník."
                  : undefined
              }
              onClick={() => void postRedeem({ action: "undo" })}
            >
              <AdminVoucherCtaIcon kind="undo" />
              <span className="admin-voucher-drawer-cta-label">
                Zrušit uplatnění
              </span>
            </button>
          ) : null}

          {allowRedeem && voucher.status === "active" ? (
            <>
              {canPartial ? (
                <button
                  type="button"
                  className="admin-voucher-drawer-cta is-secondary"
                  disabled={actionBusy}
                  onClick={() => openActionModal("partial")}
                >
                  <AdminVoucherCtaIcon kind="partial" />
                  <span className="admin-voucher-drawer-cta-label">
                    Částečně uplatnit
                  </span>
                </button>
              ) : null}
              <button
                type="button"
                className="admin-voucher-drawer-cta"
                disabled={actionBusy}
                onClick={() => openActionModal("full")}
              >
                <AdminVoucherCtaIcon kind="redeem" />
                <span className="admin-voucher-drawer-cta-label">
                  Uplatnit celý poukaz
                </span>
              </button>
            </>
          ) : null}

          <AdminActionModal
            open={actionModal === "full"}
            title="Uplatnit celý poukaz?"
            description={
              <>
                Poukaz <strong>{voucher.code}</strong> bude označen jako plně
                uplatněný.
              </>
            }
            confirmLabel="Potvrdit uplatnění"
            busy={actionBusy}
            error={actionError}
            onConfirm={() => void postRedeem({ action: "full" })}
            onClose={closeActionModal}
          >
            <label>
              <span>Poznámka (volitelné)</span>
              <textarea
                value={redeemNote}
                maxLength={500}
                placeholder="např. přenos ze střediska, číslo účtenky…"
                onChange={(event) => setRedeemNote(event.target.value)}
              />
            </label>
          </AdminActionModal>

          <AdminActionModal
            open={actionModal === "partial"}
            title="Částečné uplatnění"
            description={
              <>
                Poukaz <strong>{voucher.code}</strong>. Zadejte částku nebo
                část, která se má odečíst.
              </>
            }
            confirmLabel="Potvrdit odečet"
            confirmDisabled={
              (canPartialAmount && !partialAmount) ||
              (canPartialPart && !selectedPartId)
            }
            busy={actionBusy}
            error={actionError}
            onConfirm={handlePartialSubmit}
            onClose={closeActionModal}
          >
            {canPartialAmount ? (
              <label>
                <span>Částka k uplatnění (max. {formatCzk(remainingCzk)})</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={remainingCzk}
                  step={1}
                  value={partialAmount}
                  onChange={(event) => setPartialAmount(event.target.value)}
                  required
                />
              </label>
            ) : null}
            {canPartialPart ? (
              <label>
                <span>Část k uplatnění</span>
                <select
                  value={selectedPartId}
                  onChange={(event) => setSelectedPartId(event.target.value)}
                  required
                >
                  {openParts.map((part) => (
                    <option key={part.id} value={part.id}>
                      {part.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label>
              <span>Poznámka (volitelné)</span>
              <textarea
                value={redeemNote}
                maxLength={500}
                placeholder="např. přenos ze střediska, číslo účtenky…"
                onChange={(event) => setRedeemNote(event.target.value)}
              />
            </label>
          </AdminActionModal>

          <AdminActionModal
            open={actionModal === "cancel"}
            title="Stornovat poukaz?"
            description={
              <>
                Poukaz <strong>{voucher.code}</strong> půjde znovu obnovit.
              </>
            }
            confirmLabel="Stornovat poukaz"
            busy={actionBusy}
            error={actionError}
            onConfirm={() => void patchStatus("cancelled")}
            onClose={closeActionModal}
          />

          <AdminActionModal
            open={actionModal === "delete"}
            title="Definitivně smazat poukaz?"
            description={
              <>
                Poukaz <strong>{voucher.code}</strong> bude trvale odstraněn.
                Tuto akci nelze vrátit.
              </>
            }
            confirmLabel="Definitivně smazat"
            busy={actionBusy}
            error={actionError}
            onConfirm={() => void hardDelete()}
            onClose={closeActionModal}
          />

          {footerCta ? (
            <button
              type="button"
              className="admin-voucher-drawer-cta"
              onClick={footerCta.onClick}
              disabled={actionBusy}
            >
              <AdminVoucherCtaIcon kind={footerCta.icon} />
              <span className="admin-voucher-drawer-cta-label">
                {footerCta.label}
              </span>
            </button>
          ) : null}
        </div>
      </aside>
    </>
  );
}

export function AdminVoucherDrawerProvider({ children }: { children: ReactNode }) {
  const [vouchers, setVouchers] = useState<AdminSoldVoucher[]>([]);
  const [vouchersLoading, setVouchersLoading] = useState(true);
  const [activeVoucherCode, setActiveVoucherCode] = useState<string | null>(null);

  const reloadVouchers = useCallback(async () => {
    setVouchersLoading(true);
    try {
      // Pro přehled / palette stačí nejnovějších 50 (řazeno od nákupu).
      const response = await fetch(
        "/api/admin/sold-vouchers?page=1&pageSize=50&status=all",
        { cache: "no-store" },
      );
      if (!response.ok) {
        setVouchers([]);
        return;
      }
      const data = (await response.json()) as { vouchers?: AdminSoldVoucher[] };
      setVouchers(Array.isArray(data.vouchers) ? data.vouchers : []);
    } catch {
      setVouchers([]);
    } finally {
      setVouchersLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadVouchers();
  }, [reloadVouchers]);

  const upsertVoucher = useCallback((voucher: AdminSoldVoucher) => {
    setVouchers((current) => {
      const without = current.filter((row) => row.code !== voucher.code);
      return [voucher, ...without];
    });
    window.dispatchEvent(
      new CustomEvent("admin-sold-voucher-upserted", {
        detail: { voucher },
      }),
    );
  }, []);

  const removeVoucher = useCallback((code: string) => {
    const normalized = normalizeVoucherCode(code);
    setVouchers((current) =>
      current.filter((row) => row.code !== normalized && row.code !== code),
    );
    setActiveVoucherCode((current) =>
      current === code || current === normalized ? null : current,
    );
  }, []);

  const prependVoucher = upsertVoucher;

  const activeVoucher = useMemo(
    () => vouchers.find((voucher) => voucher.code === activeVoucherCode) ?? null,
    [activeVoucherCode, vouchers],
  );

  const redeemVoucher = useCallback(
    (code: string) => {
      const normalized = normalizeVoucherCode(code);
      void (async () => {
        try {
          const response = await fetch(
            `/api/admin/sold-vouchers/${encodeURIComponent(normalized)}/redeem`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "full" }),
            },
          );
          const data = (await response.json().catch(() => ({}))) as RedeemResponse;
          if (response.ok && data.voucher) {
            upsertVoucher(data.voucher);
          }
        } catch {
          /* ignore */
        }
      })();
    },
    [upsertVoucher],
  );

  const activateVoucher = useCallback(
    (code: string) => {
      const normalized = normalizeVoucherCode(code);
      setVouchers((current) => {
        const existing = current.find((voucher) => voucher.code === normalized);
        if (!existing) return current;
        const next: AdminSoldVoucher = {
          ...existing,
          status: "active",
          statusLabel: ADMIN_VOUCHER_STATUS_LABELS.active,
        };
        queueMicrotask(() => {
          window.dispatchEvent(
            new CustomEvent("admin-sold-voucher-upserted", {
              detail: { voucher: next },
            }),
          );
        });
        const without = current.filter((voucher) => voucher.code !== normalized);
        return [next, ...without];
      });
      void (async () => {
        try {
          const response = await fetch(
            `/api/admin/sold-vouchers/${encodeURIComponent(normalized)}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "active" }),
            },
          );
          const data = (await response.json().catch(() => ({}))) as {
            voucher?: AdminSoldVoucher;
          };
          if (response.ok && data.voucher) {
            upsertVoucher(data.voucher);
          }
        } catch {
          /* ignore — optimistic update už proběhl */
        }
      })();
    },
    [upsertVoucher],
  );

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
        vouchersLoading,
        openVoucher: (voucher) => {
          upsertVoucher(voucher);
          setActiveVoucherCode(voucher.code);
        },
        closeVoucher: () => setActiveVoucherCode(null),
        redeemVoucher,
        activateVoucher,
        activeVoucherCode,
        prependVoucher,
        reloadVouchers,
        upsertVoucher,
        removeVoucher,
      }}
    >
      {children}
      {activeVoucher ? (
        <AdminVoucherDrawerPanel
          voucher={activeVoucher}
          onClose={() => setActiveVoucherCode(null)}
          onActivate={(code) => activateVoucher(code)}
          onUpsert={upsertVoucher}
          onRemove={removeVoucher}
        />
      ) : null}
    </AdminVoucherDrawerContext.Provider>
  );
}
