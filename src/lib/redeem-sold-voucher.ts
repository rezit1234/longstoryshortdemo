import type { ShopId } from "@/data/admin-voucher-settings";
import { normalizeVoucherCode } from "@/data/admin-voucher-settings";
import {
  ADMIN_VOUCHER_STATUS_LABELS,
  type AdminSoldVoucher,
} from "@/data/admin-vouchers";
import { sendRedemptionStatusEmail } from "@/lib/email/send-redemption-email";
import { mapSoldVoucherRow, type SoldVoucherRow } from "@/lib/sold-vouchers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  allPartsRedeemed,
  canEmailRedemptionStatus,
  formatValidUntilLabel,
  markPartRedeemed,
  parseRedeemableParts,
  type RedeemablePart,
  type VoucherRedemptionStateBefore,
} from "@/lib/voucher-redemption";

const VOUCHER_SELECT =
  "id, code, shop_id, product_name, item_kind, unit_price_czk, shipping_fee_share_czk, status, purchased_at, valid_until, redeemed_at, buyer_name, buyer_email, buyer_phone, recipient_name, delivery_method, delivery_email, shipping_address, pdf_url, remaining_czk, redeemable_parts, is_gift";

type DbVoucher = SoldVoucherRow & {
  id: string;
  item_kind: string;
  remaining_czk: number | null;
  redeemable_parts: unknown;
  is_gift: boolean;
  redeemed_at: string | null;
  recipient_name: string;
  delivery_email: string | null;
};

export type RedeemAction = "full" | "amount" | "part" | "undo";

export type RedeemResult = {
  voucher: AdminSoldVoucher;
  emailSent: boolean;
  emailTo: string | null;
  emailSkippedReason: string | null;
};

function asShopId(value: string): ShopId {
  if (
    value === "lss" ||
    value === "bistrocentral" ||
    value === "culinaryacademy"
  ) {
    return value;
  }
  return "lss";
}

function stateBefore(row: DbVoucher): VoucherRedemptionStateBefore {
  return {
    status: row.status,
    remaining_czk: row.remaining_czk,
    redeemable_parts: parseRedeemableParts(row.redeemable_parts),
    redeemed_at: row.redeemed_at,
  };
}

function mapVoucher(
  row: DbVoucher,
  canUndo: boolean,
): AdminSoldVoucher {
  const voucher = mapSoldVoucherRow(row);
  voucher.statusLabel = ADMIN_VOUCHER_STATUS_LABELS[voucher.status];
  voucher.canUndo = canUndo;
  return voucher;
}

async function hasUndoableRedemption(
  admin: ReturnType<typeof createAdminClient>,
  soldVoucherId: string,
) {
  const { data } = await admin
    .from("voucher_redemptions")
    .select("id")
    .eq("sold_voucher_id", soldVoucherId)
    .is("undone_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return Boolean(data?.id);
}

async function maybeSendEmail(params: {
  row: DbVoucher;
  kind: "full" | "amount" | "part";
  amountCzk?: number | null;
  remainingCzk?: number | null;
  partLabel?: string | null;
  remainingPartLabels?: string[];
}): Promise<{ sent: boolean; to: string | null; skippedReason: string | null }> {
  const to = params.row.delivery_email?.trim() || "";
  if (
    !canEmailRedemptionStatus({
      isGift: Boolean(params.row.is_gift),
      deliveryEmail: to,
    })
  ) {
    return {
      sent: false,
      to: null,
      skippedReason: "Bez e-mailu — není kontakt na obdarovaného.",
    };
  }

  try {
    const result = await sendRedemptionStatusEmail({
      shopId: asShopId(params.row.shop_id),
      to,
      recipientName: params.row.recipient_name || undefined,
      productName: params.row.product_name,
      code: params.row.code,
      validUntil: formatValidUntilLabel(params.row.valid_until),
      kind: params.kind,
      amountCzk: params.amountCzk ?? null,
      remainingCzk: params.remainingCzk ?? null,
      partLabel: params.partLabel ?? null,
      remainingPartLabels: params.remainingPartLabels ?? [],
      fullyRedeemed: params.row.status === "redeemed",
    });
    if (!result.ok) {
      console.error("redemption email failed", result.error);
      return {
        sent: false,
        to,
        skippedReason: "E-mail se nepodařilo odeslat.",
      };
    }
    return { sent: true, to, skippedReason: null };
  } catch (error) {
    console.error("redemption email fatal", error);
    return {
      sent: false,
      to,
      skippedReason: "E-mail se nepodařilo odeslat.",
    };
  }
}

async function insertRedemption(params: {
  admin: ReturnType<typeof createAdminClient>;
  soldVoucherId: string;
  kind: "full" | "amount" | "part";
  amountCzk?: number | null;
  partId?: string | null;
  partLabel?: string | null;
  remainingCzkAfter?: number | null;
  before: VoucherRedemptionStateBefore;
  createdBy?: string | null;
}) {
  const { error } = await params.admin.from("voucher_redemptions").insert({
    sold_voucher_id: params.soldVoucherId,
    kind: params.kind,
    amount_czk: params.amountCzk ?? null,
    part_id: params.partId ?? null,
    part_label: params.partLabel ?? null,
    remaining_czk_after: params.remainingCzkAfter ?? null,
    state_before: params.before,
    created_by: params.createdBy ?? null,
  });
  if (error) throw new Error(error.message);
}

async function loadVoucher(
  admin: ReturnType<typeof createAdminClient>,
  codeNormalized: string,
) {
  const { data, error } = await admin
    .from("sold_vouchers")
    .select(VOUCHER_SELECT)
    .eq("code_normalized", codeNormalized)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as DbVoucher | null;
}

export async function redeemSoldVoucher(params: {
  code: string;
  action: RedeemAction;
  amountCzk?: number;
  partId?: string;
  createdBy?: string | null;
}): Promise<RedeemResult> {
  const code = normalizeVoucherCode(params.code);
  if (!code) throw new Error("Neplatný kód.");

  const admin = createAdminClient();
  const row = await loadVoucher(admin, code);
  if (!row) throw new Error("Poukaz nenalezen.");

  if (params.action === "undo") {
    return undoLastRedemption(admin, row, params.createdBy);
  }

  if (row.status !== "active") {
    throw new Error("Poukaz nelze uplatnit v aktuálním stavu.");
  }

  const before = stateBefore(row);
  const now = new Date().toISOString();
  const parts = parseRedeemableParts(row.redeemable_parts);

  if (params.action === "full") {
    const patch: Record<string, unknown> = {
      status: "redeemed",
      redeemed_at: now,
      updated_at: now,
    };
    if (row.item_kind === "amount") {
      patch.remaining_czk = 0;
    }
    if (parts) {
      patch.redeemable_parts = parts.map((part) => ({
        ...part,
        redeemed: true,
      }));
    }

    const { data, error } = await admin
      .from("sold_vouchers")
      .update(patch)
      .eq("id", row.id)
      .select(VOUCHER_SELECT)
      .single();
    if (error || !data) throw new Error(error?.message || "Uložení selhalo.");

    const updated = data as DbVoucher;
    await insertRedemption({
      admin,
      soldVoucherId: row.id,
      kind: "full",
      amountCzk:
        row.item_kind === "amount"
          ? Math.max(0, Number(row.remaining_czk ?? row.unit_price_czk) || 0) ||
            null
          : null,
      remainingCzkAfter: row.item_kind === "amount" ? 0 : null,
      before,
      createdBy: params.createdBy,
    });

    const mail = await maybeSendEmail({
      row: updated,
      kind: "full",
      amountCzk:
        row.item_kind === "amount"
          ? Number(row.remaining_czk ?? row.unit_price_czk) || null
          : null,
      remainingCzk: row.item_kind === "amount" ? 0 : null,
      remainingPartLabels: [],
    });

    return {
      voucher: mapVoucher(updated, true),
      emailSent: mail.sent,
      emailTo: mail.to,
      emailSkippedReason: mail.skippedReason,
    };
  }

  if (params.action === "amount") {
    if (row.item_kind !== "amount") {
      throw new Error("Částku lze odečíst jen u hodnotového poukazu.");
    }
    const remaining = Number(row.remaining_czk ?? row.unit_price_czk);
    if (!Number.isFinite(remaining) || remaining <= 0) {
      throw new Error("Na poukazu už není žádný zůstatek.");
    }
    const amount = Math.round(Number(params.amountCzk));
    if (!Number.isInteger(amount) || amount < 1) {
      throw new Error("Zadejte kladnou celou částku.");
    }
    if (amount > remaining) {
      throw new Error(`Nelze odečíst víc než zůstatek (${remaining} Kč).`);
    }
    const nextRemaining = remaining - amount;
    const fully = nextRemaining === 0;
    const patch: Record<string, unknown> = {
      remaining_czk: nextRemaining,
      updated_at: now,
      status: fully ? "redeemed" : "active",
      redeemed_at: fully ? now : null,
    };

    const { data, error } = await admin
      .from("sold_vouchers")
      .update(patch)
      .eq("id", row.id)
      .select(VOUCHER_SELECT)
      .single();
    if (error || !data) throw new Error(error?.message || "Uložení selhalo.");

    const updated = data as DbVoucher;
    await insertRedemption({
      admin,
      soldVoucherId: row.id,
      kind: "amount",
      amountCzk: amount,
      remainingCzkAfter: nextRemaining,
      before,
      createdBy: params.createdBy,
    });

    const mail = await maybeSendEmail({
      row: updated,
      kind: "amount",
      amountCzk: amount,
      remainingCzk: nextRemaining,
    });

    return {
      voucher: mapVoucher(updated, true),
      emailSent: mail.sent,
      emailTo: mail.to,
      emailSkippedReason: mail.skippedReason,
    };
  }

  if (params.action === "part") {
    if (!parts) {
      throw new Error("Tento poukaz nemá uplatnitelné části.");
    }
    const partId = (params.partId || "").trim();
    if (!partId) throw new Error("Vyberte část k uplatnění.");
    const nextParts = markPartRedeemed(parts, partId);
    if (!nextParts) {
      throw new Error("Část už je uplatněná nebo neexistuje.");
    }
    const part = nextParts.find((item) => item.id === partId)!;
    const fully = allPartsRedeemed(nextParts);
    const patch: Record<string, unknown> = {
      redeemable_parts: nextParts,
      updated_at: now,
      status: fully ? "redeemed" : "active",
      redeemed_at: fully ? now : null,
    };

    const { data, error } = await admin
      .from("sold_vouchers")
      .update(patch)
      .eq("id", row.id)
      .select(VOUCHER_SELECT)
      .single();
    if (error || !data) throw new Error(error?.message || "Uložení selhalo.");

    const updated = data as DbVoucher;
    await insertRedemption({
      admin,
      soldVoucherId: row.id,
      kind: "part",
      partId: part.id,
      partLabel: part.label,
      before,
      createdBy: params.createdBy,
    });

    const remainingLabels = nextParts
      .filter((item) => !item.redeemed)
      .map((item) => item.label);

    const mail = await maybeSendEmail({
      row: updated,
      kind: "part",
      partLabel: part.label,
      remainingPartLabels: remainingLabels,
    });

    return {
      voucher: mapVoucher(updated, true),
      emailSent: mail.sent,
      emailTo: mail.to,
      emailSkippedReason: mail.skippedReason,
    };
  }

  throw new Error("Neplatná akce.");
}

function hasRedemptionProgress(row: DbVoucher) {
  if (row.status === "redeemed") return true;
  if (
    row.item_kind === "amount" &&
    row.remaining_czk != null &&
    row.remaining_czk < row.unit_price_czk
  ) {
    return true;
  }
  const parts = parseRedeemableParts(row.redeemable_parts);
  return Boolean(parts?.some((part) => part.redeemed));
}

function legacyUndoPatch(row: DbVoucher) {
  const parts = parseRedeemableParts(row.redeemable_parts);
  const patch: Record<string, unknown> = {
    status: "active",
    redeemed_at: null,
    updated_at: new Date().toISOString(),
  };
  if (row.item_kind === "amount") {
    patch.remaining_czk = row.unit_price_czk;
  }
  if (parts) {
    patch.redeemable_parts = parts.map((part) => ({
      ...part,
      redeemed: false,
    }));
  }
  return patch;
}

async function undoLastRedemption(
  admin: ReturnType<typeof createAdminClient>,
  row: DbVoucher,
  _createdBy?: string | null,
): Promise<RedeemResult> {
  const { data: last, error: lastError } = await admin
    .from("voucher_redemptions")
    .select("id, state_before")
    .eq("sold_voucher_id", row.id)
    .is("undone_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastError) throw new Error(lastError.message);

  const now = new Date().toISOString();
  let patch: Record<string, unknown>;

  if (last?.id) {
    const before = (last.state_before ||
      {}) as Partial<VoucherRedemptionStateBefore>;
    patch = {
      status: typeof before.status === "string" ? before.status : "active",
      remaining_czk:
        before.remaining_czk === undefined
          ? row.remaining_czk
          : before.remaining_czk,
      redeemable_parts:
        before.redeemable_parts === undefined
          ? row.redeemable_parts
          : before.redeemable_parts,
      redeemed_at:
        before.redeemed_at === undefined ? null : before.redeemed_at,
      updated_at: now,
    };
  } else if (hasRedemptionProgress(row)) {
    // Starší uplatnění bez historie — vrať celý poukaz do aktivního stavu.
    patch = legacyUndoPatch(row);
  } else {
    throw new Error("Není co vracet zpět.");
  }

  const { data, error } = await admin
    .from("sold_vouchers")
    .update(patch)
    .eq("id", row.id)
    .select(VOUCHER_SELECT)
    .single();
  if (error || !data) throw new Error(error?.message || "Undo selhalo.");

  if (last?.id) {
    const { error: undoError } = await admin
      .from("voucher_redemptions")
      .update({ undone_at: now })
      .eq("id", last.id);
    if (undoError) throw new Error(undoError.message);
  }

  const updated = data as DbVoucher;
  const canUndo = await hasUndoableRedemption(admin, row.id);

  return {
    voucher: mapVoucher(updated, canUndo || hasRedemptionProgress(updated)),
    emailSent: false,
    emailTo: null,
    emailSkippedReason: null,
  };
}

export async function enrichVouchersCanUndo(
  admin: ReturnType<typeof createAdminClient>,
  vouchers: AdminSoldVoucher[],
  idsByCode: Map<string, string>,
) {
  const ids = [...idsByCode.values()];
  if (ids.length === 0) return vouchers;

  const { data } = await admin
    .from("voucher_redemptions")
    .select("sold_voucher_id")
    .in("sold_voucher_id", ids)
    .is("undone_at", null);

  const withHistory = new Set(
    (data ?? []).map((row) => String((row as { sold_voucher_id: string }).sold_voucher_id)),
  );

  return vouchers.map((voucher) => {
    const id = idsByCode.get(voucher.code);
    const fromHistory = Boolean(id && withHistory.has(id));
    const fromState =
      voucher.status === "redeemed" ||
      (voucher.itemKind === "amount" &&
        voucher.remainingCzk != null &&
        voucher.unitPriceCzk != null &&
        voucher.remainingCzk < voucher.unitPriceCzk) ||
      (voucher.redeemableParts ?? []).some((part) => part.redeemed);
    return {
      ...voucher,
      canUndo: fromHistory || fromState,
    };
  });
}

export type { RedeemablePart };
