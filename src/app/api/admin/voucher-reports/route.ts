import type { ShopId } from "@/data/admin-voucher-settings";
import { getSessionProfile } from "@/lib/admin-session";
import {
  ADMIN_ROLE_LABELS,
  type AdminRole,
} from "@/lib/auth";
import {
  buildStaffActivityRows,
  listStaffActivityProfiles,
  parseStaffActivityFilter,
} from "@/lib/admin-staff-activity";
import {
  aggregateVoucherReport,
  type ReportActivityFilter,
  type ReportShopFilter,
  type ReportTaxRegime,
  type ReportVoucherStatus,
  type SoldVoucherRecord,
  type SoldVoucherSource,
} from "@/lib/voucher-reports";
import { createAdminClient } from "@/lib/supabase/admin";
import { chunkIds, fetchAllRows } from "@/lib/supabase/fetch-all";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function parseShop(value: string | null): ReportShopFilter {
  if (
    value === "lss" ||
    value === "bistrocentral" ||
    value === "culinaryacademy"
  ) {
    return value;
  }
  return "all";
}

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

function mapStatus(status: string): ReportVoucherStatus | null {
  if (status === "cancelled") return null;
  if (status === "redeemed") return "Uplatněný";
  if (status === "expired") return "Expirovaný";
  return "Aktivní";
}

function mapTaxRegime(value: unknown): ReportTaxRegime {
  return value === "legacy" ? "legacy" : "vouchy";
}

function profileLabel(fullName: string, username: string) {
  const name = fullName.trim();
  return name || username;
}

class DbSoldVoucherSource implements SoldVoucherSource {
  constructor(
    private readonly activity: ReportActivityFilter,
    private readonly userId: string | null,
    private readonly nameById: Map<string, string>,
  ) {}

  async listSold(query: {
    from: string;
    to: string;
    shop: ReportShopFilter;
  }): Promise<SoldVoucherRecord[]> {
    const admin = createAdminClient();

    // Uplatnění podle data uplatnění (historie), ne nákupu.
    if (this.activity === "redeemed") {
      return this.listRedeemed(admin, query);
    }

    if (this.activity === "all" && this.userId) {
      const [issued, redeemed] = await Promise.all([
        this.listIssued(admin, query),
        this.listRedeemed(admin, query),
      ]);
      const byCode = new Map<string, SoldVoucherRecord>();
      for (const row of [...issued, ...redeemed]) {
        byCode.set(row.code, row);
      }
      return [...byCode.values()].sort((a, b) =>
        a.soldAt.localeCompare(b.soldAt),
      );
    }

    return this.listIssued(admin, query);
  }

  private async listIssued(
    admin: ReturnType<typeof createAdminClient>,
    query: { from: string; to: string; shop: ReportShopFilter },
  ): Promise<SoldVoucherRecord[]> {
    try {
      const data = await fetchAllRows<Record<string, unknown>>((from, to) => {
        let dbQuery = admin
          .from("sold_vouchers")
          .select(
            "id, code, product_name, shop_id, purchased_at, status, item_kind, unit_price_czk, remaining_czk, vat_label, tax_regime, redeemed_at, issued_by",
          )
          .gte("purchased_at", `${query.from}T00:00:00.000Z`)
          .lte("purchased_at", `${query.to}T23:59:59.999Z`)
          .order("purchased_at", { ascending: true })
          .range(from, to);

        if (query.shop !== "all") {
          dbQuery = dbQuery.eq("shop_id", query.shop);
        }
        if (this.activity === "issued") {
          dbQuery = dbQuery.not("issued_by", "is", null);
        }
        if (this.userId) {
          dbQuery = dbQuery.eq("issued_by", this.userId);
        }
        return dbQuery;
      });

      return this.mapRows(admin, data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/issued_by/i.test(message) && (this.activity === "issued" || this.userId)) {
        return [];
      }
      if (/issued_by/i.test(message)) {
        return this.listSoldWithoutIssuedBy(admin, query);
      }
      throw error;
    }
  }

  private async listSoldWithoutIssuedBy(
    admin: ReturnType<typeof createAdminClient>,
    query: { from: string; to: string; shop: ReportShopFilter },
  ): Promise<SoldVoucherRecord[]> {
    if (this.activity === "issued" || this.userId) return [];

    const data = await fetchAllRows<Record<string, unknown>>((from, to) => {
      let dbQuery = admin
        .from("sold_vouchers")
        .select(
          "id, code, product_name, shop_id, purchased_at, status, item_kind, unit_price_czk, remaining_czk, vat_label, tax_regime, redeemed_at",
        )
        .gte("purchased_at", `${query.from}T00:00:00.000Z`)
        .lte("purchased_at", `${query.to}T23:59:59.999Z`)
        .order("purchased_at", { ascending: true })
        .range(from, to);

      if (query.shop !== "all") {
        dbQuery = dbQuery.eq("shop_id", query.shop);
      }
      return dbQuery;
    });

    return this.mapRows(admin, data);
  }

  private async listRedeemed(
    admin: ReturnType<typeof createAdminClient>,
    query: { from: string; to: string; shop: ReportShopFilter },
  ): Promise<SoldVoucherRecord[]> {
    let redemptions: Array<Record<string, unknown>>;
    try {
      redemptions = await fetchAllRows<Record<string, unknown>>((from, to) => {
        let redemptionQuery = admin
          .from("voucher_redemptions")
          .select("sold_voucher_id, created_by, created_at")
          .is("undone_at", null)
          .gte("created_at", `${query.from}T00:00:00.000Z`)
          .lte("created_at", `${query.to}T23:59:59.999Z`)
          .order("created_at", { ascending: true })
          .range(from, to);

        if (this.userId) {
          redemptionQuery = redemptionQuery.eq("created_by", this.userId);
        }
        return redemptionQuery;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/voucher_redemptions/i.test(message)) return [];
      throw error;
    }
    if (!redemptions.length) return [];

    const voucherIds = [
      ...new Set(
        redemptions
          .map((row) =>
            typeof row.sold_voucher_id === "string" ? row.sold_voucher_id : "",
          )
          .filter(Boolean),
      ),
    ];

    const selectWithIssuedBy =
      "id, code, product_name, shop_id, purchased_at, status, item_kind, unit_price_czk, remaining_czk, vat_label, tax_regime, redeemed_at, issued_by";
    const selectWithoutIssuedBy =
      "id, code, product_name, shop_id, purchased_at, status, item_kind, unit_price_czk, remaining_czk, vat_label, tax_regime, redeemed_at";

    const loadVouchers = async (select: string) => {
      const vouchers: Array<Record<string, unknown>> = [];
      for (const ids of chunkIds(voucherIds)) {
        let vouchersQuery = admin
          .from("sold_vouchers")
          .select(select)
          .in("id", ids);
        if (query.shop !== "all") {
          vouchersQuery = vouchersQuery.eq("shop_id", query.shop);
        }
        const { data, error } = await vouchersQuery;
        if (error) throw new Error(error.message);
        vouchers.push(...((data ?? []) as Array<Record<string, unknown>>));
      }
      return vouchers;
    };

    try {
      const vouchers = await loadVouchers(selectWithIssuedBy);
      return this.mapRedeemedRows(vouchers, redemptions);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/issued_by/i.test(message)) throw error;
      const vouchers = await loadVouchers(selectWithoutIssuedBy);
      return this.mapRedeemedRows(vouchers, redemptions);
    }
  }

  private mapRedeemedRows(
    vouchers: Array<Record<string, unknown>>,
    redemptions: Array<Record<string, unknown>>,
  ): SoldVoucherRecord[] {
    const byId = new Map(
      vouchers.map((row) => [String(row.id), row] as const),
    );
    const mapped: SoldVoucherRecord[] = [];

    for (const redemption of redemptions) {
      const voucherId = String(redemption.sold_voucher_id ?? "");
      const row = byId.get(voucherId);
      if (!row) continue;
      const base = this.mapOne(row);
      if (!base) continue;
      const createdBy =
        typeof redemption.created_by === "string" ? redemption.created_by : "";
      mapped.push({
        ...base,
        soldAt: String(redemption.created_at ?? base.soldAt).slice(0, 10),
        status: "Uplatněný",
        redeemedByName: createdBy
          ? (this.nameById.get(createdBy) ?? null)
          : null,
      });
    }

    return mapped;
  }

  private async mapRows(
    admin: ReturnType<typeof createAdminClient>,
    rows: Array<Record<string, unknown>>,
  ): Promise<SoldVoucherRecord[]> {
    const voucherIds = rows
      .map((row) => (typeof row.id === "string" ? row.id : ""))
      .filter(Boolean);

    const latestRedeemerByVoucher = new Map<string, string>();
    if (voucherIds.length > 0) {
      for (const ids of chunkIds(voucherIds)) {
        const { data: redemptions } = await admin
          .from("voucher_redemptions")
          .select("sold_voucher_id, created_by, created_at")
          .in("sold_voucher_id", ids)
          .is("undone_at", null)
          .order("created_at", { ascending: false });

        for (const redemption of redemptions ?? []) {
          const voucherId = String(redemption.sold_voucher_id ?? "");
          if (!voucherId || latestRedeemerByVoucher.has(voucherId)) continue;
          if (typeof redemption.created_by === "string") {
            latestRedeemerByVoucher.set(voucherId, redemption.created_by);
          }
        }
      }
    }

    const mapped: SoldVoucherRecord[] = [];
    for (const row of rows) {
      const item = this.mapOne(row);
      if (!item) continue;
      const voucherId = typeof row.id === "string" ? row.id : "";
      const redeemerId = latestRedeemerByVoucher.get(voucherId);
      mapped.push({
        ...item,
        redeemedByName: redeemerId
          ? (this.nameById.get(redeemerId) ?? null)
          : null,
      });
    }
    return mapped;
  }

  private mapOne(row: Record<string, unknown>): SoldVoucherRecord | null {
    const reportStatus = mapStatus(String(row.status ?? "active"));
    if (!reportStatus) return null;

    const productName =
      String(row.product_name || "Poukaz").trim() || "Poukaz";
    const vatLabel =
      typeof row.vat_label === "string" && row.vat_label.trim()
        ? row.vat_label.trim()
        : "-";

    const unit = Number(row.unit_price_czk) || 0;
    const remaining =
      row.remaining_czk == null ? null : Number(row.remaining_czk);
    let amountCzk = unit;
    if (
      row.item_kind === "amount" &&
      reportStatus === "Uplatněný" &&
      remaining != null &&
      Number.isFinite(remaining)
    ) {
      amountCzk = Math.max(0, unit - remaining);
    } else if (
      row.item_kind === "amount" &&
      reportStatus === "Uplatněný" &&
      (remaining === 0 || row.status === "redeemed")
    ) {
      amountCzk = unit;
    }

    const issuedBy =
      typeof row.issued_by === "string" ? row.issued_by : null;

    return {
      code: String(row.code),
      variantId: productName,
      variantName: productName,
      shopId: asShopId(String(row.shop_id)),
      soldAt: String(row.purchased_at).slice(0, 10),
      status: reportStatus,
      amountCzk,
      vatLabel,
      taxRegime: mapTaxRegime(row.tax_regime),
      issuedByName: issuedBy ? (this.nameById.get(issuedBy) ?? null) : null,
      redeemedByName: null,
    };
  }
}

export async function GET(request: Request) {
  const session = await getSessionProfile();
  if (!session) {
    return NextResponse.json({ error: "Nejste přihlášeni." }, { status: 401 });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const shop = parseShop(url.searchParams.get("shop"));
  const userId = url.searchParams.get("user")?.trim() || null;
  const activity = parseStaffActivityFilter(
    url.searchParams.get("activity"),
  ) as ReportActivityFilter;

  if (!from || !to) {
    return NextResponse.json(
      { error: "Parametry from a to jsou povinné." },
      { status: 400 },
    );
  }

  try {
    const profiles = await listStaffActivityProfiles();
    const nameById = new Map(
      profiles.map((profile) => [
        profile.id,
        profileLabel(profile.full_name, profile.username),
      ]),
    );

    const source = new DbSoldVoucherSource(activity, userId, nameById);
    const vouchers = await source.listSold({ from, to, shop });
    const staffRows = await buildStaffActivityRows({
      from,
      to,
      shop,
      userId,
      activity,
    });

    const userLabel = userId ? (nameById.get(userId) ?? userId) : null;
    const report = {
      ...aggregateVoucherReport(
        { from, to, shop, userId, activity },
        vouchers,
      ),
      userId,
      userLabel,
      activity,
      staffRows,
      isDemo: false as const,
    };

    // Doplň sekci podle uživatelů do agregace.
    if (staffRows.length > 0) {
      report.aggregateRows = [
        ...report.aggregateRows,
        ...staffRows.map((row) => ({
          section: "Podle uživatele",
          metric: `${row.name} (${row.roleLabel}) · vystaveno ${row.issued} / uplatněno ${row.redeemed}`,
          count: row.issued + row.redeemed,
          amountCzk: 0,
        })),
      ];
    }

    return NextResponse.json({
      report,
      users: profiles.map((profile) => ({
        id: profile.id,
        name: profileLabel(profile.full_name, profile.username),
        role: profile.role as AdminRole,
        roleLabel: ADMIN_ROLE_LABELS[profile.role as AdminRole] ?? profile.role,
      })),
    });
  } catch (error) {
    console.error("admin voucher-reports", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Report se nepodařilo sestavit.",
      },
      { status: 500 },
    );
  }
}
