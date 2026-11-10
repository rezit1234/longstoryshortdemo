export const MANUAL_PAYMENT_METHODS = [
  "kasa",
  "dar",
  "faktura",
  "jine",
] as const;

export type ManualPaymentMethod = (typeof MANUAL_PAYMENT_METHODS)[number];

export const MANUAL_PAYMENT_METHOD_LABELS: Record<ManualPaymentMethod, string> =
  {
    kasa: "Kasa",
    dar: "Dar",
    faktura: "Faktura",
    jine: "Jiné",
  };

export function isManualPaymentMethod(
  value: unknown,
): value is ManualPaymentMethod {
  return (
    typeof value === "string" &&
    (MANUAL_PAYMENT_METHODS as readonly string[]).includes(value)
  );
}

export function formatPaymentMethodLabel(
  method: ManualPaymentMethod | null | undefined,
  note?: string | null,
): string | null {
  if (!method) return null;
  if (method === "jine") {
    const trimmed = note?.trim() || "";
    return trimmed
      ? `${MANUAL_PAYMENT_METHOD_LABELS.jine} – ${trimmed}`
      : MANUAL_PAYMENT_METHOD_LABELS.jine;
  }
  return MANUAL_PAYMENT_METHOD_LABELS[method];
}

export function normalizeManualPaymentMethodInput(input: {
  paymentMethod?: unknown;
  paymentMethodNote?: unknown;
}): { paymentMethod: ManualPaymentMethod; paymentMethodNote: string | null } {
  if (!isManualPaymentMethod(input.paymentMethod)) {
    throw new Error("Vyberte způsob platby.");
  }

  if (input.paymentMethod === "jine") {
    const note =
      typeof input.paymentMethodNote === "string"
        ? input.paymentMethodNote.trim()
        : "";
    if (!note) {
      throw new Error("Uveďte způsob platby.");
    }
    return { paymentMethod: "jine", paymentMethodNote: note };
  }

  return { paymentMethod: input.paymentMethod, paymentMethodNote: null };
}
