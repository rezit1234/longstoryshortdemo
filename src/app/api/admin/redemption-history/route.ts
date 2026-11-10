import { getSessionProfile } from "@/lib/admin-session";
import { canViewRedemptionHistory } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

export type RedemptionHistoryItem = {
  id: string;
  createdAt: string;
  createdAtLabel: string;
  kind: "full" | "amount" | "part";
  kindLabel: string;
  amountCzk: number | null;
  partLabel: string | null;
  detailLabel: string;
  undoneAt: string | null;
  isUndone: boolean;
  voucherCode: string;
  voucherId: string;
  shopId: string | null;
  redeemedByName: string;
  redeemedById: string | null;
};

function formatDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function kindLabel(
  kind: string,
  amountCzk: number | null,
  partLabel: string | null,
) {
  if (kind === "full") return "Celý poukaz";
  if (kind === "amount") {
    if (amountCzk != null) {
      return `Částka ${amountCzk.toLocaleString("cs-CZ")} Kč`;
    }
    return "Částka";
  }
  if (kind === "part") return partLabel?.trim() || "Část poukazu";
  return kind;
}

function detailLabel(
  kind: string,
  amountCzk: number | null,
  partLabel: string | null,
) {
  return kindLabel(kind, amountCzk, partLabel);
}

export async function GET(request: Request) {
  const session = await getSessionProfile();
  if (!session) {
    return NextResponse.json({ error: "Nejste přihlášeni." }, { status: 401 });
  }
  if (!canViewRedemptionHistory(session.profile.role)) {
    return NextResponse.json({ error: "Nemáte oprávnění." }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1) || 1);
    const rawSize = Number(url.searchParams.get("pageSize") || DEFAULT_PAGE_SIZE);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number.isFinite(rawSize) ? rawSize : DEFAULT_PAGE_SIZE),
    );
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const admin = createAdminClient();
    const { data, error, count } = await admin
      .from("voucher_redemptions")
      .select(
        "id, kind, amount_czk, part_label, undone_at, created_at, created_by, sold_voucher_id, sold_vouchers!inner(id, code, shop_id)",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("redemption-history list", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = data ?? [];
    const userIds = Array.from(
      new Set(
        rows
          .map((row) =>
            typeof row.created_by === "string" ? row.created_by : null,
          )
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const nameById = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await admin
        .from("admin_profiles")
        .select("id, full_name, username")
        .in("id", userIds);
      if (profilesError) {
        console.error("redemption-history profiles", profilesError);
      } else {
        for (const profile of profiles ?? []) {
          const name =
            (typeof profile.full_name === "string" &&
              profile.full_name.trim()) ||
            (typeof profile.username === "string" && profile.username.trim()) ||
            "Neznámý";
          nameById.set(String(profile.id), name);
        }
      }
    }

    const items: RedemptionHistoryItem[] = rows.map((row) => {
      const voucherRaw = row.sold_vouchers as
        | { id?: string; code?: string; shop_id?: string }
        | { id?: string; code?: string; shop_id?: string }[]
        | null;
      const voucher = Array.isArray(voucherRaw) ? voucherRaw[0] : voucherRaw;
      const kind = String(row.kind) as "full" | "amount" | "part";
      const amountCzk =
        typeof row.amount_czk === "number" ? row.amount_czk : null;
      const partLabel =
        typeof row.part_label === "string" ? row.part_label : null;
      const createdAt =
        typeof row.created_at === "string" ? row.created_at : "";
      const createdBy =
        typeof row.created_by === "string" ? row.created_by : null;
      const undoneAt =
        typeof row.undone_at === "string" ? row.undone_at : null;

      return {
        id: String(row.id),
        createdAt,
        createdAtLabel: createdAt ? formatDateTime(createdAt) : "—",
        kind,
        kindLabel: kindLabel(kind, amountCzk, partLabel),
        amountCzk,
        partLabel,
        detailLabel: detailLabel(kind, amountCzk, partLabel),
        undoneAt,
        isUndone: Boolean(undoneAt),
        voucherCode: voucher?.code ? String(voucher.code) : "—",
        voucherId: voucher?.id ? String(voucher.id) : String(row.sold_voucher_id),
        shopId: voucher?.shop_id ? String(voucher.shop_id) : null,
        redeemedByName: createdBy
          ? (nameById.get(createdBy) ?? "Neznámý uživatel")
          : "—",
        redeemedById: createdBy,
      };
    });

    const total = count ?? items.length;
    return NextResponse.json({
      items,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (error) {
    console.error("redemption-history fatal", error);
    return NextResponse.json(
      { error: "Nepodařilo se načíst historii uplatnění." },
      { status: 500 },
    );
  }
}
