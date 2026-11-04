export type RedeemablePart = {
  id: string;
  label: string;
  redeemed: boolean;
};

export type VoucherRedemptionKind = "full" | "amount" | "part";

export type VoucherRedemptionStateBefore = {
  status: string;
  remaining_czk: number | null;
  redeemable_parts: RedeemablePart[] | null;
  redeemed_at: string | null;
};

const ROOM_MARKERS = ["the-arc", "the-nook", "the-big-one", "the-flat"] as const;

export function experienceIdHasRoom(experienceId: string) {
  const id = experienceId.trim().toLowerCase();
  return ROOM_MARKERS.some((marker) => id.includes(marker));
}

export function experienceIdHasChefsTable(experienceId: string) {
  const id = experienceId.trim().toLowerCase();
  return id.includes("chefs-table");
}

/** Kombinace pokoj + Chef's Table → dvě uplatnitelné části. */
export function isCombinedExperienceId(experienceId: string) {
  return (
    experienceIdHasRoom(experienceId) && experienceIdHasChefsTable(experienceId)
  );
}

export function buildCombinedRedeemableParts(
  allRedeemed = false,
): RedeemablePart[] {
  return [
    { id: "room", label: "Ubytování", redeemed: allRedeemed },
    { id: "chefs-table", label: "Chef's Table", redeemed: allRedeemed },
  ];
}

export function redeemablePartsForExperienceId(
  experienceId: string | null | undefined,
  allRedeemed = false,
): RedeemablePart[] | null {
  if (!experienceId || !isCombinedExperienceId(experienceId)) return null;
  return buildCombinedRedeemableParts(allRedeemed);
}

export function parseRedeemableParts(value: unknown): RedeemablePart[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const parts: RedeemablePart[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id.trim() : "";
    const label = typeof row.label === "string" ? row.label.trim() : "";
    if (!id || !label) continue;
    parts.push({ id, label, redeemed: Boolean(row.redeemed) });
  }
  return parts.length > 0 ? parts : null;
}

export function allPartsRedeemed(parts: RedeemablePart[] | null | undefined) {
  if (!parts || parts.length === 0) return false;
  return parts.every((part) => part.redeemed);
}

export function openParts(parts: RedeemablePart[] | null | undefined) {
  return (parts ?? []).filter((part) => !part.redeemed);
}

export function markPartRedeemed(
  parts: RedeemablePart[],
  partId: string,
): RedeemablePart[] | null {
  const index = parts.findIndex((part) => part.id === partId);
  if (index < 0) return null;
  if (parts[index].redeemed) return null;
  return parts.map((part, i) =>
    i === index ? { ...part, redeemed: true } : part,
  );
}

export function canEmailRedemptionStatus(params: {
  isGift: boolean;
  deliveryEmail?: string | null;
}) {
  return Boolean(params.isGift && params.deliveryEmail?.trim());
}

export function formatValidUntilLabel(isoOrDate: string) {
  const date = new Date(isoOrDate);
  if (!Number.isNaN(date.getTime())) {
    return `${date.getDate()}. ${date.getMonth() + 1}. ${date.getFullYear()}`;
  }
  const [y, m, d] = isoOrDate.split("-").map(Number);
  if (y && m && d) return `${d}. ${m}. ${y}`;
  return isoOrDate;
}
