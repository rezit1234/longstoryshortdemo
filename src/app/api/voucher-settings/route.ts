import { NextResponse } from "next/server";
import {
  createInitialVoucherSettings,
  type ShopId,
} from "@/data/admin-voucher-settings";
import { canManageTeam } from "@/lib/auth";
import { getSessionProfile } from "@/lib/admin-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeVoucherSettings,
  type VoucherSettingsPayload,
} from "@/lib/voucher-settings";

type SettingsRow = {
  id?: number;
  shop_id?: string | null;
  validity_months: number;
  amount_slots: unknown;
  amount_previews?: unknown;
  experiences: unknown;
  pickup_fee?: number | null;
  post_shipping_fee?: number | null;
  post_shipping_fee_sk?: number | null;
  hero_image?: unknown;
};

const KNOWN_SHOPS: ShopId[] = ["lss", "bistrocentral", "culinaryacademy"];
const SHOPS_BAG_KEY = "__shops";

const SETTINGS_SELECT =
  "shop_id, validity_months, amount_slots, amount_previews, experiences, pickup_fee, post_shipping_fee, post_shipping_fee_sk, hero_image";

const SETTINGS_SELECT_LEGACY =
  "id, validity_months, amount_slots, amount_previews, experiences";

function parseShopId(value: string | null): ShopId {
  if (value && KNOWN_SHOPS.includes(value as ShopId)) {
    return value as ShopId;
  }
  return "lss";
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function feesFromAmountPreviews(value: unknown): {
  pickupFee?: number;
  postShippingFee?: number;
  postShippingFeeSk?: number;
  heroImage?: unknown;
} {
  const record = asRecord(value);
  return {
    pickupFee:
      typeof record.pickupFee === "number" ? record.pickupFee : undefined,
    postShippingFee:
      typeof record.postShippingFee === "number"
        ? record.postShippingFee
        : undefined,
    postShippingFeeSk:
      typeof record.postShippingFeeSk === "number"
        ? record.postShippingFeeSk
        : undefined,
    heroImage: record.heroImage,
  };
}

function stripInternalPreviewKeys(
  value: unknown,
): Record<string, unknown> {
  const record = asRecord(value);
  const next = { ...record };
  delete next[SHOPS_BAG_KEY];
  delete next.heroImage;
  delete next.pickupFee;
  delete next.postShippingFee;
  delete next.postShippingFeeSk;
  return next;
}

function getEmbeddedShopSettings(
  amountPreviews: unknown,
  shopId: ShopId,
): Partial<VoucherSettingsPayload> | null {
  const bag = asRecord(asRecord(amountPreviews)[SHOPS_BAG_KEY]);
  const embedded = bag[shopId];
  if (!embedded || typeof embedded !== "object") return null;
  return embedded as Partial<VoucherSettingsPayload>;
}

function amountPreviewsForStorage(
  settings: VoucherSettingsPayload,
  existingAmountPreviews: unknown,
  shopId: ShopId,
  mode: "native" | "legacy",
) {
  if (mode === "native") {
    return {
      ...settings.amountPreviews,
      pickupFee: settings.pickupFee,
      postShippingFee: settings.postShippingFee,
      postShippingFeeSk: settings.postShippingFeeSk,
    };
  }

  // Legacy singleton: LSS žije v hlavních sloupcích, ostatní obchody v __shops.
  const existing = asRecord(existingAmountPreviews);
  const bag = { ...asRecord(existing[SHOPS_BAG_KEY]) };

  if (shopId === "lss") {
    return {
      ...stripInternalPreviewKeys(existing),
      ...settings.amountPreviews,
      pickupFee: settings.pickupFee,
      postShippingFee: settings.postShippingFee,
      postShippingFeeSk: settings.postShippingFeeSk,
      heroImage: settings.heroImage,
      [SHOPS_BAG_KEY]: bag,
    };
  }

  bag[shopId] = settings;
  return {
    ...existing,
    [SHOPS_BAG_KEY]: bag,
  };
}

function rowToPayload(
  row: SettingsRow,
  shopId: ShopId,
  mode: "native" | "legacy",
): VoucherSettingsPayload {
  if (mode === "legacy" && shopId !== "lss") {
    const embedded = getEmbeddedShopSettings(row.amount_previews, shopId);
    return normalizeVoucherSettings(
      embedded ?? createInitialVoucherSettings(shopId),
      shopId,
    );
  }

  const embedded = feesFromAmountPreviews(row.amount_previews);
  return normalizeVoucherSettings(
    {
      validityMonths: row.validity_months,
      amountSlots: row.amount_slots as VoucherSettingsPayload["amountSlots"],
      amountPreviews: stripInternalPreviewKeys(
        row.amount_previews,
      ) as VoucherSettingsPayload["amountPreviews"],
      experiences: row.experiences as VoucherSettingsPayload["experiences"],
      pickupFee: row.pickup_fee ?? embedded.pickupFee,
      postShippingFee: row.post_shipping_fee ?? embedded.postShippingFee,
      postShippingFeeSk:
        row.post_shipping_fee_sk ?? embedded.postShippingFeeSk,
      heroImage:
        (row.hero_image as VoucherSettingsPayload["heroImage"]) ??
        embedded.heroImage,
    },
    shopId,
  );
}

async function fetchNativeSettingsRow(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  shopId: ShopId,
) {
  return client
    .from("voucher_settings")
    .select(SETTINGS_SELECT)
    .eq("shop_id", shopId)
    .maybeSingle();
}

async function fetchLegacySingleton(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
) {
  return client
    .from("voucher_settings")
    .select(SETTINGS_SELECT_LEGACY)
    .eq("id", 1)
    .maybeSingle();
}

export async function GET(request: Request) {
  const shopId = parseShopId(new URL(request.url).searchParams.get("shop"));

  try {
    const supabase = await createClient();

    const native = await fetchNativeSettingsRow(supabase, shopId);
    if (!native.error && native.data) {
      return NextResponse.json({
        settings: rowToPayload(native.data as SettingsRow, shopId, "native"),
        shopId,
        source: "database",
      });
    }

    const legacy = await fetchLegacySingleton(supabase);
    if (legacy.error) {
      return NextResponse.json({ error: legacy.error.message }, { status: 500 });
    }

    if (!legacy.data) {
      return NextResponse.json({
        settings: createInitialVoucherSettings(shopId),
        shopId,
        source: "fallback",
      });
    }

    return NextResponse.json({
      settings: rowToPayload(legacy.data as SettingsRow, shopId, "legacy"),
      shopId,
      source: "database-legacy",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Nepodařilo se načíst nastavení.",
        settings: createInitialVoucherSettings(shopId),
        shopId,
        source: "fallback",
      },
      { status: 200 },
    );
  }
}

export async function PUT(request: Request) {
  const session = await getSessionProfile();
  if (!session) {
    return NextResponse.json({ error: "Nejste přihlášeni." }, { status: 401 });
  }

  if (!canManageTeam(session.profile.role)) {
    return NextResponse.json(
      { error: "Nemáte oprávnění upravovat nastavení poukazů." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    settings?: VoucherSettingsPayload;
    shopId?: string;
  } | null;

  if (!body?.settings) {
    return NextResponse.json({ error: "Chybí settings." }, { status: 400 });
  }

  const shopId = parseShopId(body.shopId ?? null);
  const settings = normalizeVoucherSettings(body.settings, shopId);

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Chybí SUPABASE_SERVICE_ROLE_KEY v .env.local." },
      { status: 500 },
    );
  }

  // 1) Preferovaná cesta: native per-shop schema (migrace 008)
  const nativeRow = {
    shop_id: shopId,
    validity_months: settings.validityMonths,
    amount_slots: settings.amountSlots,
    amount_previews: amountPreviewsForStorage(settings, null, shopId, "native"),
    experiences: settings.experiences,
    pickup_fee: settings.pickupFee,
    post_shipping_fee: settings.postShippingFee,
    post_shipping_fee_sk: settings.postShippingFeeSk,
    hero_image: settings.heroImage,
    updated_at: new Date().toISOString(),
  };

  const nativeUpsert = await admin
    .from("voucher_settings")
    .upsert(nativeRow, { onConflict: "shop_id" })
    .select(SETTINGS_SELECT)
    .single();

  if (!nativeUpsert.error && nativeUpsert.data) {
    return NextResponse.json({
      settings: rowToPayload(nativeUpsert.data as SettingsRow, shopId, "native"),
      shopId,
      source: "database",
    });
  }

  // 2) Legacy singleton: oddělení obchodů přes amount_previews.__shops
  const legacy = await fetchLegacySingleton(admin);
  if (legacy.error) {
    return NextResponse.json(
      {
        error:
          legacy.error.message ||
          "Nastavení se nepodařilo uložit. Spusť migraci 008_voucher_settings_per_shop.sql.",
      },
      { status: 500 },
    );
  }

  const existing = (legacy.data as SettingsRow | null) ?? null;
  const amountPreviews = amountPreviewsForStorage(
    settings,
    existing?.amount_previews,
    shopId,
    "legacy",
  );

  const legacyPayload =
    shopId === "lss"
      ? {
          id: 1,
          validity_months: settings.validityMonths,
          amount_slots: settings.amountSlots,
          amount_previews: amountPreviews,
          experiences: settings.experiences,
          updated_at: new Date().toISOString(),
        }
      : {
          id: 1,
          amount_previews: amountPreviews,
          updated_at: new Date().toISOString(),
        };

  const legacyUpsert = await admin
    .from("voucher_settings")
    .upsert(legacyPayload, { onConflict: "id" })
    .select(SETTINGS_SELECT_LEGACY)
    .single();

  if (legacyUpsert.error || !legacyUpsert.data) {
    return NextResponse.json(
      {
        error:
          legacyUpsert.error?.message ??
          "Nastavení se nepodařilo uložit. Spusť migraci 008_voucher_settings_per_shop.sql.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    settings: rowToPayload(legacyUpsert.data as SettingsRow, shopId, "legacy"),
    shopId,
    source: "database-legacy",
  });
}
