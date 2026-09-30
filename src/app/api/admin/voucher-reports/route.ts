import type { ShopId } from "@/data/admin-voucher-settings";
import { getSessionProfile } from "@/lib/admin-session";
import {
  aggregateVoucherReport,
  type ReportShopFilter,
  type ReportTaxRegime,
  type ReportVoucherStatus,
  type SoldVoucherRecord,
  type SoldVoucherSource,
} from "@/lib/voucher-reports";
import { createAdminClient } from "@/lib/supabase/admin";
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

class DbSoldVoucherSource implements SoldVoucherSource {
  async listSold(query: {
    from: string;
    to: string;
    shop: ReportShopFilter;
  }): Promise<SoldVoucherRecord[]> {
    const admin = createAdminClient();
    let dbQuery = admin
      .from("sold_vouchers")
      .select(
        "code, product_name, shop_id, purchased_at, status, unit_price_czk, vat_label, tax_regime, redeemed_at",
      )
      .gte("purchased_at", `${query.from}T00:00:00.000Z`)
      .lte("purchased_at", `${query.to}T23:59:59.999Z`)
      .order("purchased_at", { ascending: true })
      .limit(5000);

    if (query.shop !== "all") {
      dbQuery = dbQuery.eq("shop_id", query.shop);
    }

    const { data, error } = await dbQuery;
    if (error) throw new Error(error.message);

    const vouchers: SoldVoucherRecord[] = [];
    for (const row of data ?? []) {
      const reportStatus = mapStatus(String(row.status ?? "active"));
      if (!reportStatus) continue;

      const productName = String(row.product_name || "Poukaz").trim() || "Poukaz";
      const vatLabel =
        typeof row.vat_label === "string" && row.vat_label.trim()
          ? row.vat_label.trim()
          : "—";

      vouchers.push({
        code: String(row.code),
        variantId: productName,
        variantName: productName,
        shopId: asShopId(String(row.shop_id)),
        soldAt: String(row.purchased_at).slice(0, 10),
        status: reportStatus,
        amountCzk: Number(row.unit_price_czk) || 0,
        vatLabel,
        taxRegime: mapTaxRegime(row.tax_regime),
      });
    }

    return vouchers;
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

  if (!from || !to) {
    return NextResponse.json(
      { error: "Parametry from a to jsou povinné." },
      { status: 400 },
    );
  }

  try {
    const source = new DbSoldVoucherSource();
    const vouchers = await source.listSold({ from, to, shop });
    const report = {
      ...aggregateVoucherReport({ from, to, shop }, vouchers),
      isDemo: false as const,
    };
    return NextResponse.json({ report });
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
