"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyShopCodePrefix,
  createInitialVoucherSettings,
  type AdminVoucherSettings,
  type ShopId,
  VOUCHER_CODE_LENGTH,
  generateVoucherCode,
  isValidNewVoucherCode,
  sanitizeVoucherCodeInput,
} from "@/data/admin-voucher-settings";
import type { AdminSoldVoucher } from "@/data/admin-vouchers";
import { AresCompanyLookup } from "@/components/AresCompanyLookup";
import { getEnabledShopBrands } from "@/data/shops";
import { formatCzk } from "@/data/vouchers";
import { defaultShopIdForRole } from "@/lib/auth";
import {
  experienceSupportsSeatQuantity,
  formatPersonsCs,
  MANUAL_VOUCHER_QUANTITY_MAX,
  MANUAL_VOUCHER_QUANTITY_MIN,
  SEAT_QUANTITY_MAX,
  SEAT_QUANTITY_MIN,
} from "@/lib/voucher-redemption";
import {
  MANUAL_PAYMENT_METHOD_LABELS,
  MANUAL_PAYMENT_METHODS,
  type ManualPaymentMethod,
} from "@/lib/voucher-payment-method";
import { AdminDismissButton } from "./AdminDismissButton";
import { AdminSelect } from "./AdminSelect";
import { useAdminUser } from "./AdminUserProvider";
import { IconCancel } from "./icons";

const DRAWER_ANIMATION_MS = 220;

type VoucherKind = "experience" | "amount";

const SHOP_OPTIONS = getEnabledShopBrands().map((brand) => ({
  value: brand.id,
  label: brand.brandName,
}));

const PAYMENT_METHOD_OPTIONS = [
  { value: "", label: "Vyberte…" },
  ...MANUAL_PAYMENT_METHODS.map((method) => ({
    value: method,
    label: MANUAL_PAYMENT_METHOD_LABELS[method],
  })),
];

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

type InvoiceRecipientType = "person" | "company";

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0] ?? "", lastName: "" };
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

export function AdminAddVoucherDrawer({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated?: (vouchers: AdminSoldVoucher[]) => void;
}) {
  const { user } = useAdminUser();
  const initialShopId = defaultShopIdForRole(user.role);
  const fallbackSettings = useRef(
    createInitialVoucherSettings(initialShopId),
  ).current;
  const [shopId, setShopId] = useState<ShopId>(initialShopId);
  const [settings, setSettings] = useState<AdminVoucherSettings>(fallbackSettings);
  const [settingsHydrated, setSettingsHydrated] = useState(false);

  const amountOptions = useMemo(
    () => settings.amountSlots.filter((amount): amount is number => amount !== null),
    [settings.amountSlots],
  );

  const experienceOptions = useMemo(
    () =>
      settings.experiences.map((experience) => ({
        value: experience.id,
        label: `${experience.title} · ${formatCzk(experience.price)}`,
      })),
    [settings.experiences],
  );

  const hasExperiences = experienceOptions.length > 0;
  const showTypeTabs = hasExperiences;

  const [isClosing, setIsClosing] = useState(false);
  const amountSelectOptions = useMemo(
    () => [
      ...amountOptions.map((amount) => ({
        value: String(amount),
        label: formatCzk(amount),
      })),
      { value: "custom", label: "Vlastní" },
    ],
    [amountOptions],
  );

  const [kind, setKind] = useState<VoucherKind>("experience");
  const [experienceId, setExperienceId] = useState(experienceOptions[0]?.value ?? "");
  const [seats, setSeats] = useState("1");
  const supportsSeats = kind === "experience" && experienceSupportsSeatQuantity(experienceId);
  const [amountValue, setAmountValue] = useState(
    amountSelectOptions[0]?.value ?? "custom",
  );
  const [customAmount, setCustomAmount] = useState("");
  const [quantity, setQuantity] = useState("1");
  // Počet kusů: u částek a u zážitků kromě Chef's Table (tam je počet osob).
  const supportsQuantity =
    kind === "amount" || (kind === "experience" && !supportsSeats);
  const isMultiple = supportsQuantity && Number(quantity) > 1;
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState(() => generateVoucherCode(initialShopId));
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentMethodNote, setPaymentMethodNote] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [wantInvoice, setWantInvoice] = useState(false);
  const [invoiceRecipientType, setInvoiceRecipientType] =
    useState<InvoiceRecipientType | null>(null);
  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [vatId, setVatId] = useState("");
  const [invoiceEmail, setInvoiceEmail] = useState("");
  const [invoiceFirstName, setInvoiceFirstName] = useState("");
  const [invoiceLastName, setInvoiceLastName] = useState("");
  const [invoiceAddressLine1, setInvoiceAddressLine1] = useState("");
  const [invoiceCity, setInvoiceCity] = useState("");
  const [invoicePostalCode, setInvoicePostalCode] = useState("");
  const [invoiceNote, setInvoiceNote] = useState("");
  const [linkedFirstName, setLinkedFirstName] = useState(true);
  const [linkedLastName, setLinkedLastName] = useState(true);
  const [linkedInvoiceEmail, setLinkedInvoiceEmail] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!wantInvoice || invoiceRecipientType !== "person") return;
    const parts = splitFullName(fullName);
    if (linkedFirstName) setInvoiceFirstName(parts.firstName);
    if (linkedLastName) setInvoiceLastName(parts.lastName);
  }, [
    fullName,
    wantInvoice,
    invoiceRecipientType,
    linkedFirstName,
    linkedLastName,
  ]);

  useEffect(() => {
    if (!wantInvoice || !linkedInvoiceEmail) return;
    setInvoiceEmail(email);
  }, [email, wantInvoice, linkedInvoiceEmail]);

  const requestClose = useCallback(() => {
    if (saving) return;
    setIsClosing(true);
  }, [saving]);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      setSettingsHydrated(false);
      try {
        const response = await fetch(
          `/api/voucher-settings?shop=${encodeURIComponent(shopId)}`,
        );
        const data = (await response.json().catch(() => null)) as {
          settings?: AdminVoucherSettings;
          error?: string;
        } | null;

        if (!response.ok || !data?.settings) {
          throw new Error(data?.error || "Nepodařilo se načíst nastavení.");
        }

        if (cancelled) return;
        setSettings(data.settings);
      } catch {
        if (!cancelled) {
          setSettings(createInitialVoucherSettings(shopId));
        }
      } finally {
        if (!cancelled) setSettingsHydrated(true);
      }
    }

    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, [shopId]);

  useEffect(() => {
    setCode(generateVoucherCode(shopId));
  }, [shopId]);

  useEffect(() => {
    if (!settingsHydrated) return;

    setExperienceId((current) => {
      const ids = settings.experiences.map((experience) => experience.id);
      return ids.includes(current) ? current : (ids[0] ?? "");
    });

    setAmountValue((current) => {
      if (current === "custom") return current;
      const amounts = settings.amountSlots.filter(
        (amount): amount is number => amount !== null,
      );
      return amounts.some((amount) => String(amount) === current)
        ? current
        : amounts[0]
          ? String(amounts[0])
          : "custom";
    });

    // Obchod bez zážitků → jen částka (skrytý přepínač typu).
    if (settings.experiences.length === 0) {
      setKind("amount");
    }
  }, [settings, settingsHydrated]);

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

  useEffect(() => {
    if (!isClosing) return;

    const timer = window.setTimeout(onClose, DRAWER_ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, [isClosing, onClose]);

  async function handleSave() {
    setError(null);

    if (!fullName.trim()) {
      setError("Vyplňte jméno a příjmení.");
      return;
    }
    if (email.trim() && !isValidEmail(email)) {
      setError("Zadejte platný e-mail.");
      return;
    }
    if (kind === "experience" && !experienceId) {
      setError("Vyberte zážitek.");
      return;
    }
    if (kind === "amount") {
      const amount =
        amountValue === "custom" ? Number(customAmount) : Number(amountValue);
      if (!Number.isFinite(amount) || amount <= 0) {
        setError("Zadejte platnou částku.");
        return;
      }
    }
    if (!paymentMethod) {
      setError("Vyberte způsob platby.");
      return;
    }
    if (paymentMethod === "jine" && !paymentMethodNote.trim()) {
      setError("Uveďte způsob platby.");
      return;
    }
    const normalized = applyShopCodePrefix(code, shopId);
    // U více kusů se kódy generují automaticky (ruční kód se nepoužije).
    if (!isMultiple && !isValidNewVoucherCode(normalized)) {
      setError(
        "Kód musí mít celkem 7 znaků včetně prefixu (např. LSSK7M2 nebo BCR6FE6).",
      );
      return;
    }
    if (wantInvoice) {
      if (!invoiceRecipientType) {
        setError("Zvolte typ daňového dokladu.");
        return;
      }
      if (!isValidEmail(invoiceEmail)) {
        setError("Zadejte platný e-mail pro daňový doklad.");
        return;
      }
      if (invoiceRecipientType === "company") {
        if (companyId.replace(/\D/g, "").length !== 8) {
          setError("Vyplňte platné 8místné IČO.");
          return;
        }
        if (!companyName.trim()) {
          setError("Doplňte název firmy z ARES (IČO nebo našeptávání).");
          return;
        }
      }
      if (
        invoiceRecipientType === "person" &&
        (!invoiceFirstName.trim() ||
          !invoiceLastName.trim() ||
          !invoiceAddressLine1.trim() ||
          !invoiceCity.trim() ||
          !invoicePostalCode.trim())
      ) {
        setError("Vyplňte údaje daňového dokladu na jméno.");
        return;
      }
    }

    setSaving(true);
    try {
      const amountCzk =
        kind === "amount"
          ? amountValue === "custom"
            ? Number(customAmount)
            : Number(amountValue)
          : undefined;

      const response = await fetch("/api/admin/sold-vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId,
          kind,
          experienceId: kind === "experience" ? experienceId : undefined,
          seats: supportsSeats ? Number(seats) : undefined,
          quantity: supportsQuantity ? Number(quantity) : undefined,
          amountCzk,
          buyerName: fullName.trim(),
          buyerEmail: email.trim(),
          buyerPhone: phone.trim(),
          code: normalized,
          sendEmail: Boolean(email.trim()) && sendEmail,
          paymentMethod: paymentMethod as ManualPaymentMethod,
          paymentMethodNote:
            paymentMethod === "jine" ? paymentMethodNote.trim() : null,
          invoice: wantInvoice
            ? {
                wantInvoice: true,
                recipientType: invoiceRecipientType,
                companyId,
                companyName,
                vatId,
                email: invoiceEmail.trim(),
                firstName: invoiceFirstName.trim(),
                lastName: invoiceLastName.trim(),
                addressLine1: invoiceAddressLine1.trim(),
                city: invoiceCity.trim(),
                postalCode: invoicePostalCode.trim(),
                note: invoiceNote.trim(),
              }
            : { wantInvoice: false },
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
        voucher?: AdminSoldVoucher;
        vouchers?: AdminSoldVoucher[];
      } | null;

      if (!response.ok || !data?.voucher) {
        throw new Error(data?.error || "Poukaz se nepodařilo uložit.");
      }

      onCreated?.(data.vouchers?.length ? data.vouchers : [data.voucher]);
      setIsClosing(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Uložení selhalo.");
    } finally {
      setSaving(false);
    }
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
        aria-label="Zavřít přidání poukazu"
        onClick={requestClose}
      />

      <aside
        className={
          isClosing
            ? "admin-voucher-drawer admin-add-voucher-drawer is-closing"
            : "admin-voucher-drawer admin-add-voucher-drawer"
        }
        role="dialog"
        aria-modal="true"
        aria-label="Přidat poukaz"
      >
        <div className="admin-voucher-drawer-head">
          <p className="admin-voucher-drawer-kicker">Ruční evidence</p>
          <AdminDismissButton label="Zavřít přidání poukazu" onClick={requestClose} />
        </div>

        <div className="admin-voucher-drawer-body admin-add-voucher-body">
          <div className="admin-settings-drawer-intro">
            <h2>Přidat poukaz</h2>
            <p>Ruční zápis do evidence (např. fyzický poukaz).</p>
          </div>

          <div className="admin-field">
            <span>Obchod</span>
            <AdminSelect
              ariaLabel="Vyberte obchod"
              value={shopId}
              options={SHOP_OPTIONS}
              onChange={(value) => setShopId(value as ShopId)}
            />
          </div>

          {showTypeTabs ? (
            <div className="admin-field">
              <span>Typ poukazu</span>
              <div
                className={
                  kind === "amount"
                    ? "admin-add-voucher-tabs is-amount"
                    : "admin-add-voucher-tabs"
                }
                role="tablist"
                aria-label="Typ poukazu"
              >
                <span className="admin-add-voucher-tabs-indicator" aria-hidden />
                <button
                  type="button"
                  role="tab"
                  aria-selected={kind === "experience"}
                  className={kind === "experience" ? "is-active" : undefined}
                  onClick={() => setKind("experience")}
                >
                  Zážitek
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={kind === "amount"}
                  className={kind === "amount" ? "is-active" : undefined}
                  onClick={() => setKind("amount")}
                >
                  Na částku
                </button>
              </div>
            </div>
          ) : null}

          {kind === "experience" && hasExperiences ? (
            <div className="admin-field">
              <span>Zážitek</span>
              <AdminSelect
                ariaLabel="Vyberte zážitek"
                value={experienceId}
                options={
                  !settingsHydrated
                    ? [{ value: "", label: "Načítám zážitky…" }]
                    : experienceOptions
                }
                onChange={setExperienceId}
              />
            </div>
          ) : null}
          {supportsSeats ? (
            <div className="admin-field">
              <span>Počet osob</span>
              <AdminSelect
                ariaLabel="Vyberte počet osob"
                value={seats}
                options={Array.from({ length: SEAT_QUANTITY_MAX - SEAT_QUANTITY_MIN + 1 }, (_, i) => {
                  const n = SEAT_QUANTITY_MIN + i;
                  return { value: String(n), label: formatPersonsCs(n) };
                })}
                onChange={setSeats}
              />
            </div>
          ) : null}
          {kind === "experience" && hasExperiences ? null : (
            <div className="admin-field">
              <span>Částka</span>
              <AdminSelect
                ariaLabel="Vyberte částku"
                value={amountValue}
                options={
                  !settingsHydrated
                    ? [{ value: amountValue, label: "Načítám částky…" }]
                    : amountSelectOptions
                }
                onChange={setAmountValue}
              />
              {amountValue === "custom" ? (
                <div className="admin-field-control has-suffix">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={customAmount}
                    placeholder="0"
                    onChange={(event) => {
                      setCustomAmount(event.target.value.replace(/\D/g, ""));
                    }}
                  />
                  <span className="admin-field-control-suffix" aria-hidden>
                    Kč
                  </span>
                </div>
              ) : null}
            </div>
          )}

          {supportsQuantity ? (
            <div className="admin-field">
              <span>Počet kusů</span>
              <AdminSelect
                ariaLabel="Vyberte počet kusů"
                value={quantity}
                options={Array.from(
                  {
                    length:
                      MANUAL_VOUCHER_QUANTITY_MAX - MANUAL_VOUCHER_QUANTITY_MIN + 1,
                  },
                  (_, i) => {
                    const n = MANUAL_VOUCHER_QUANTITY_MIN + i;
                    return { value: String(n), label: `${n}×` };
                  },
                )}
                onChange={setQuantity}
              />
              {isMultiple ? (
                <em>
                  Vystaví se {quantity} samostatných poukazů, každý s vlastním kódem
                  a PDF. Všechny přijdou v jednom e-mailu.
                </em>
              ) : null}
            </div>
          ) : null}

          <label className="admin-field">
            <span>Jméno a příjmení</span>
            <input
              type="text"
              value={fullName}
              placeholder="Jan Novák"
              onChange={(event) => setFullName(event.target.value)}
            />
          </label>

          <label className="admin-field">
            <span>E-mail (volitelný)</span>
            <input
              type="email"
              value={email}
              placeholder="jan@email.cz"
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="admin-field">
            <span>Telefon (volitelný)</span>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              placeholder="777000000"
              onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))}
            />
          </label>

          <div className="admin-field">
            <span>Způsob platby</span>
            <AdminSelect
              ariaLabel="Vyberte způsob platby"
              value={paymentMethod}
              options={PAYMENT_METHOD_OPTIONS}
              onChange={(value) => {
                setPaymentMethod(value);
                if (value !== "jine") setPaymentMethodNote("");
              }}
            />
          </div>

          {paymentMethod === "jine" ? (
            <label className="admin-field">
              <span>Uveďte způsob platby</span>
              <input
                type="text"
                value={paymentMethodNote}
                placeholder="Např. bankovní převod"
                onChange={(event) => setPaymentMethodNote(event.target.value)}
              />
            </label>
          ) : null}

          {isMultiple ? (
            <div className="admin-field">
              <span>Kódy poukazů</span>
              <em>Vygenerují se automaticky (u více kusů nelze zadat ruční kód).</em>
            </div>
          ) : (
          <div className="admin-field">
            <span>Kód poukazu</span>
            <div className="admin-redeem-code-control is-full">
              <input
                type="text"
                value={code}
                onChange={(event) =>
                  setCode(
                    sanitizeVoucherCodeInput(
                      event.target.value,
                      VOUCHER_CODE_LENGTH,
                    ),
                  )
                }
                placeholder="LSSK7M2"
                autoComplete="off"
                spellCheck={false}
                maxLength={VOUCHER_CODE_LENGTH}
                aria-label="Kód poukazu"
              />
            </div>
            <em>
              Celkem 7 znaků včetně prefixu (LSS + 4 / BC + 5). Uloží se jako{" "}
              {applyShopCodePrefix(code, shopId) || "LSSK7M2"}.
            </em>
          </div>
          )}

          <div className="checkout-invoice admin-add-voucher-invoice">
            <label
              className={
                sendEmail
                  ? "checkout-invoice-toggle is-checked"
                  : "checkout-invoice-toggle"
              }
            >
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(event) => setSendEmail(event.target.checked)}
              />
              <span className="checkout-invoice-toggle-mark" aria-hidden>
                <svg viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3.5 8.2 6.6 11.2 12.5 4.8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="checkout-invoice-toggle-label">
                Odeslat poukaz e-mailem po uložení
              </span>
            </label>
            <label
              className={
                wantInvoice
                  ? "checkout-invoice-toggle is-checked"
                  : "checkout-invoice-toggle"
              }
            >
              <input
                type="checkbox"
                checked={wantInvoice}
                onChange={(event) => {
                  const next = event.target.checked;
                  setWantInvoice(next);
                  if (!next) {
                    setInvoiceRecipientType(null);
                    return;
                  }
                  if (!invoiceRecipientType) {
                    setInvoiceRecipientType("person");
                  }
                  const parts = splitFullName(fullName);
                  if (linkedFirstName) setInvoiceFirstName(parts.firstName);
                  if (linkedLastName) setInvoiceLastName(parts.lastName);
                  if (linkedInvoiceEmail) setInvoiceEmail(email);
                }}
              />
              <span className="checkout-invoice-toggle-mark" aria-hidden>
                <svg viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3.5 8.2 6.6 11.2 12.5 4.8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="checkout-invoice-toggle-label">
                Vystavit daňový doklad
              </span>
            </label>

            {wantInvoice ? (
              <div className="checkout-invoice-fields">
                <div className="checkout-section">
                  <p className="checkout-section-label">Doklad vystavit</p>
                  <div
                    className={
                      invoiceRecipientType === "person"
                        ? "checkout-choice-tabs checkout-invoice-type-tabs is-person"
                        : invoiceRecipientType === "company"
                          ? "checkout-choice-tabs checkout-invoice-type-tabs is-company"
                          : "checkout-choice-tabs checkout-invoice-type-tabs is-unset"
                    }
                    role="tablist"
                    aria-label="Typ daňového dokladu"
                  >
                    <span
                      className="checkout-choice-tabs-indicator"
                      aria-hidden
                    />
                    <button
                      type="button"
                      role="tab"
                      aria-selected={invoiceRecipientType === "company"}
                      className={
                        invoiceRecipientType === "company"
                          ? "is-active"
                          : undefined
                      }
                      onClick={() => setInvoiceRecipientType("company")}
                    >
                      Na firmu
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={invoiceRecipientType === "person"}
                      className={
                        invoiceRecipientType === "person"
                          ? "is-active"
                          : undefined
                      }
                      onClick={() => {
                        setInvoiceRecipientType("person");
                        const parts = splitFullName(fullName);
                        if (linkedFirstName) {
                          setInvoiceFirstName(parts.firstName);
                        }
                        if (linkedLastName) {
                          setInvoiceLastName(parts.lastName);
                        }
                        if (linkedInvoiceEmail) setInvoiceEmail(email);
                      }}
                    >
                      Na jméno
                    </button>
                  </div>
                </div>

                {invoiceRecipientType === "company" ? (
                  <>
                    <AresCompanyLookup
                      value={{
                        companyId,
                        companyName,
                        vatId,
                        addressLine1: invoiceAddressLine1,
                        city: invoiceCity,
                        postalCode: invoicePostalCode,
                      }}
                      onChange={(next) => {
                        if (next.companyId !== undefined) {
                          setCompanyId(next.companyId);
                        }
                        if (next.companyName !== undefined) {
                          setCompanyName(next.companyName);
                        }
                        if (next.vatId !== undefined) setVatId(next.vatId);
                        if (next.addressLine1 !== undefined) {
                          setInvoiceAddressLine1(next.addressLine1);
                        }
                        if (next.city !== undefined) setInvoiceCity(next.city);
                        if (next.postalCode !== undefined) {
                          setInvoicePostalCode(next.postalCode);
                        }
                      }}
                    />

                    <label className="checkout-field">
                      <span>E-mail pro daňový doklad</span>
                      <input
                        type="email"
                        autoComplete="email"
                        value={invoiceEmail}
                        placeholder="jan@email.cz"
                        onChange={(event) => {
                          setLinkedInvoiceEmail(false);
                          setInvoiceEmail(event.target.value);
                        }}
                      />
                    </label>

                    <label className="checkout-field">
                      <span>
                        Poznámka <em>(volitelné)</em>
                      </span>
                      <input
                        type="text"
                        value={invoiceNote}
                        placeholder="Např. číslo objednávky u vás"
                        onChange={(event) => setInvoiceNote(event.target.value)}
                      />
                    </label>
                  </>
                ) : null}

                {invoiceRecipientType === "person" ? (
                  <>
                    <div className="checkout-field-row">
                      <label className="checkout-field">
                        <span>Jméno</span>
                        <input
                          type="text"
                          autoComplete="given-name"
                          value={invoiceFirstName}
                          placeholder="Jan"
                          onChange={(event) => {
                            setLinkedFirstName(false);
                            setInvoiceFirstName(event.target.value);
                          }}
                        />
                      </label>
                      <label className="checkout-field">
                        <span>Příjmení</span>
                        <input
                          type="text"
                          autoComplete="family-name"
                          value={invoiceLastName}
                          placeholder="Novák"
                          onChange={(event) => {
                            setLinkedLastName(false);
                            setInvoiceLastName(event.target.value);
                          }}
                        />
                      </label>
                    </div>

                    <label className="checkout-field">
                      <span>Adresa</span>
                      <input
                        type="text"
                        autoComplete="street-address"
                        value={invoiceAddressLine1}
                        placeholder="Ulice a číslo popisné"
                        onChange={(event) =>
                          setInvoiceAddressLine1(event.target.value)
                        }
                      />
                    </label>

                    <div className="checkout-field-row">
                      <label className="checkout-field">
                        <span>Město</span>
                        <input
                          type="text"
                          autoComplete="address-level2"
                          value={invoiceCity}
                          placeholder="Olomouc"
                          onChange={(event) =>
                            setInvoiceCity(event.target.value)
                          }
                        />
                      </label>
                      <label className="checkout-field">
                        <span>PSČ</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="postal-code"
                          value={invoicePostalCode}
                          placeholder="779 00"
                          onChange={(event) =>
                            setInvoicePostalCode(
                              event.target.value.replace(/[^\d\s]/g, ""),
                            )
                          }
                        />
                      </label>
                    </div>

                    <label className="checkout-field">
                      <span>E-mail pro daňový doklad</span>
                      <input
                        type="email"
                        autoComplete="email"
                        value={invoiceEmail}
                        placeholder="jan@email.cz"
                        onChange={(event) => {
                          setLinkedInvoiceEmail(false);
                          setInvoiceEmail(event.target.value);
                        }}
                      />
                    </label>

                    <label className="checkout-field">
                      <span>
                        Poznámka <em>(volitelné)</em>
                      </span>
                      <input
                        type="text"
                        value={invoiceNote}
                        placeholder="Např. číslo objednávky u vás"
                        onChange={(event) => setInvoiceNote(event.target.value)}
                      />
                    </label>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>

          {error ? <p className="admin-add-voucher-error">{error}</p> : null}
        </div>

        <div className="admin-voucher-drawer-footer admin-add-voucher-footer">
          <button
            type="button"
            className="admin-outline-btn"
            onClick={requestClose}
            disabled={saving}
          >
            <IconCancel className="admin-page-head-btn-icon" />
            <span className="admin-page-head-btn-label">Zrušit</span>
          </button>
          <button
            type="button"
            className="admin-voucher-drawer-cta"
            onClick={() => void handleSave()}
            disabled={saving}
          >
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
            {saving
              ? "Ukládám…"
              : isMultiple
                ? `Uložit ${quantity} poukazů`
                : "Uložit poukaz"}
          </button>
        </div>
      </aside>
    </>
  );
}
