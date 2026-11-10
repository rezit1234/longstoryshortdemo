import type { ShopId } from "@/data/admin-voucher-settings";
import {
  ADMIN_ROLE_LABELS,
  canCreateVoucher,
  canRedeemVoucher,
  isHiddenTeamRole,
  type AdminRole,
} from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { chunkIds, fetchAllRows } from "@/lib/supabase/fetch-all";

export type StaffActivityShopFilter = "all" | ShopId;
export type StaffActivityFilter = "all" | "issued" | "redeemed";

export type StaffActivityRow = {
  id: string;
  name: string;
  username: string;
  role: AdminRole;
  roleLabel: string;
  avatarUrl: string | null;
  issued: number;
  redeemed: number;
};

type ProfileRow = {
  id: string;
  username: string;
  full_name: string;
  role: AdminRole;
  avatar_url: string | null;
};

function parseShop(value: string | null | undefined): StaffActivityShopFilter {
  if (
    value === "lss" ||
    value === "bistrocentral" ||
    value === "culinaryacademy"
  ) {
    return value;
  }
  return "all";
}

export function parseStaffActivityFilter(
  value: string | null | undefined,
): StaffActivityFilter {
  if (value === "issued" || value === "redeemed") return value;
  return "all";
}

function emptyRow(profile: ProfileRow): StaffActivityRow {
  return {
    id: profile.id,
    name: profile.full_name.trim() || profile.username,
    username: profile.username,
    role: profile.role,
    roleLabel: ADMIN_ROLE_LABELS[profile.role] ?? profile.role,
    avatarUrl: profile.avatar_url,
    issued: 0,
    redeemed: 0,
  };
}

/** Profily relevantní pro vystavení / uplatnění (bez skrytého developera). */
export async function listStaffActivityProfiles(
  admin: ReturnType<typeof createAdminClient> = createAdminClient(),
): Promise<ProfileRow[]> {
  const { data, error } = await admin
    .from("admin_profiles")
    .select("id, username, full_name, role, avatar_url")
    .order("full_name", { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as ProfileRow[]).map((row) => ({
    ...row,
    avatar_url: row.avatar_url ?? null,
  })).filter((row) => {
    if (isHiddenTeamRole(row.role, row.username)) return false;
    return canCreateVoucher(row.role) || canRedeemVoucher(row.role);
  });
}

export async function buildStaffActivityRows(params: {
  from: string;
  to: string;
  shop?: string | null;
  userId?: string | null;
  activity?: string | null;
}): Promise<StaffActivityRow[]> {
  const shop = parseShop(params.shop);
  const activity = parseStaffActivityFilter(params.activity);
  const userId = params.userId?.trim() || null;
  const admin = createAdminClient();
  const profiles = await listStaffActivityProfiles(admin);
  const byId = new Map(profiles.map((profile) => [profile.id, emptyRow(profile)]));

  if (activity !== "redeemed") {
    try {
      const issuedRows = await fetchAllRows<{ issued_by: string | null }>(
        (from, to) => {
          let issuedQuery = admin
            .from("sold_vouchers")
            .select("issued_by")
            .not("issued_by", "is", null)
            .gte("purchased_at", `${params.from}T00:00:00.000Z`)
            .lte("purchased_at", `${params.to}T23:59:59.999Z`)
            .order("purchased_at", { ascending: true })
            .range(from, to);

          if (shop !== "all") {
            issuedQuery = issuedQuery.eq("shop_id", shop);
          }
          if (userId) {
            issuedQuery = issuedQuery.eq("issued_by", userId);
          }
          return issuedQuery;
        },
      );

      for (const row of issuedRows) {
        const id = typeof row.issued_by === "string" ? row.issued_by : "";
        const target = byId.get(id);
        if (target) target.issued += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/issued_by/i.test(message)) throw error;
      // Migrace 018 ještě nemusí být nasazená.
    }
  }

  if (activity !== "issued") {
    try {
      const redemptions = await fetchAllRows<{
        created_by: string | null;
        sold_voucher_id: string;
      }>((from, to) => {
        let redemptionQuery = admin
          .from("voucher_redemptions")
          .select("created_by, sold_voucher_id")
          .is("undone_at", null)
          .not("created_by", "is", null)
          .gte("created_at", `${params.from}T00:00:00.000Z`)
          .lte("created_at", `${params.to}T23:59:59.999Z`)
          .order("created_at", { ascending: true })
          .range(from, to);

        if (userId) {
          redemptionQuery = redemptionQuery.eq("created_by", userId);
        }
        return redemptionQuery;
      });

      if (redemptions.length > 0) {
        const voucherIds = [
          ...new Set(
            redemptions
              .map((row) =>
                typeof row.sold_voucher_id === "string"
                  ? row.sold_voucher_id
                  : "",
              )
              .filter(Boolean),
          ),
        ];

        const shopByVoucherId = new Map<string, string>();
        for (const ids of chunkIds(voucherIds)) {
          let vouchersQuery = admin
            .from("sold_vouchers")
            .select("id, shop_id")
            .in("id", ids);
          if (shop !== "all") {
            vouchersQuery = vouchersQuery.eq("shop_id", shop);
          }
          const { data: vouchers, error: vouchersError } = await vouchersQuery;
          if (vouchersError) throw new Error(vouchersError.message);
          for (const voucher of vouchers ?? []) {
            shopByVoucherId.set(String(voucher.id), String(voucher.shop_id));
          }
        }

        for (const row of redemptions) {
          const voucherId =
            typeof row.sold_voucher_id === "string" ? row.sold_voucher_id : "";
          if (shop !== "all" && !shopByVoucherId.has(voucherId)) continue;
          const id = typeof row.created_by === "string" ? row.created_by : "";
          const target = byId.get(id);
          if (target) target.redeemed += 1;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/voucher_redemptions|created_by/i.test(message)) throw error;
      // Migrace 015 ještě nemusí být nasazená.
    }
  }

  let rows = [...byId.values()];
  if (userId) {
    rows = rows.filter((row) => row.id === userId);
  }

  return rows
    .filter((row) => {
      if (activity === "issued") return canCreateVoucher(row.role);
      if (activity === "redeemed") return canRedeemVoucher(row.role);
      return true;
    })
    .sort(
      (a, b) =>
        b.issued + b.redeemed - (a.issued + a.redeemed) ||
        b.redeemed - a.redeemed ||
        b.issued - a.issued ||
        a.name.localeCompare(b.name, "cs"),
    );
}
