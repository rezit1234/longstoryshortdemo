/**
 * Ukázkový Excel report pro klienta (fiktivní lidé, reálné obchody/varianty).
 *
 *   npx tsx scripts/generate-demo-voucher-report.ts
 */
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import {
  createInitialVoucherSettings,
  type ShopId,
} from "../src/data/admin-voucher-settings";
import { AMOUNT_VOUCHERS } from "../src/data/vouchers";
import { ADMIN_ROLE_LABELS, type AdminRole } from "../src/lib/auth";
import type { StaffActivityRow } from "../src/lib/admin-staff-activity";
import { buildVoucherReportWorkbook } from "../src/lib/voucher-report-xlsx";
import {
  aggregateVoucherReport,
  catalogFromSettings,
  type ReportCatalogVariant,
  type SoldVoucherRecord,
  type VoucherReport,
} from "../src/lib/voucher-reports";

const FROM = "2026-10-01";
const TO = "2026-10-31";

type DemoPerson = {
  id: string;
  name: string;
  username: string;
  role: AdminRole;
  canIssue: boolean;
  canRedeem: boolean;
};

const PEOPLE: DemoPerson[] = [
  {
    id: "u-jana",
    name: "Jana Nováková",
    username: "jana.novakova",
    role: "reception",
    canIssue: true,
    canRedeem: true,
  },
  {
    id: "u-petr",
    name: "Petr Svoboda",
    username: "petr.svoboda",
    role: "staff_plus",
    canIssue: true,
    canRedeem: true,
  },
  {
    id: "u-lucie",
    name: "Lucie Dvořáková",
    username: "lucie.dvorakova",
    role: "staff",
    canIssue: false,
    canRedeem: true,
  },
  {
    id: "u-martin",
    name: "Martin Horák",
    username: "martin.horak",
    role: "owner",
    canIssue: true,
    canRedeem: true,
  },
  {
    id: "u-eva",
    name: "Eva Černá",
    username: "eva.cerna",
    role: "reception",
    canIssue: true,
    canRedeem: true,
  },
];

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function toDateOnly(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildCatalog(): ReportCatalogVariant[] {
  const lss = catalogFromSettings("lss", createInitialVoucherSettings("lss"));

  // Bistro / Culinary Academy: částkové poukazy (stejné nominály jako ve widgetu).
  const amountVariants = (shop: ShopId): ReportCatalogVariant[] =>
    AMOUNT_VOUCHERS.map((item) => ({
      id: `amount-${shop}-${item.amount}`,
      name: `Poukaz ${item.amount.toLocaleString("cs-CZ")} Kč`,
      amountCzk: item.amount,
      vatLabel: "Cenina bez DPH",
      shop,
      kind: "amount" as const,
    }));

  return [...lss, ...amountVariants("bistrocentral"), ...amountVariants("culinaryacademy")];
}

function pickPerson(
  rand: () => number,
  predicate: (person: DemoPerson) => boolean,
) {
  const pool = PEOPLE.filter(predicate);
  return pool[Math.floor(rand() * pool.length)]!;
}

function buildDemoVouchers(catalog: ReportCatalogVariant[]): SoldVoucherRecord[] {
  const rand = mulberry32(20261031);
  const days = 31;
  const vouchers: SoldVoucherRecord[] = [];
  const issuers = PEOPLE.filter((person) => person.canIssue);
  const redeemers = PEOPLE.filter((person) => person.canRedeem);

  // Online nákupy (bez ručního vystavení) + ruční vystavení personálem.
  for (let i = 0; i < 42; i += 1) {
    const variant = catalog[Math.floor(rand() * catalog.length)]!;
    const dayOffset = Math.floor(rand() * days);
    const soldDate = new Date(`${FROM}T12:00:00`);
    soldDate.setDate(soldDate.getDate() + dayOffset);

    const isManual = rand() < 0.38;
    const issuer = isManual
      ? pickPerson(rand, (person) => person.canIssue)
      : null;

    // Preference: recepce LSS u LSS variant, obsluha+ u Bistra.
    let chosenIssuer = issuer;
    if (isManual && variant.shop === "bistrocentral") {
      chosenIssuer = PEOPLE.find((person) => person.id === "u-petr") ?? issuer;
      if (rand() < 0.35) {
        chosenIssuer = pickPerson(rand, (person) => person.canIssue);
      }
    }
    if (isManual && variant.shop === "lss" && rand() < 0.55) {
      chosenIssuer = PEOPLE.find((person) => person.id === "u-jana") ?? issuer;
    }
    if (isManual && variant.shop === "culinaryacademy" && rand() < 0.5) {
      chosenIssuer = PEOPLE.find((person) => person.id === "u-eva") ?? issuer;
    }

    const redeemed = rand() < (isManual ? 0.55 : 0.32);
    const redeemer = redeemed
      ? pickPerson(rand, (person) => person.canRedeem)
      : null;

    let preferredRedeemer = redeemer;
    if (redeemed && variant.shop === "lss" && rand() < 0.45) {
      preferredRedeemer =
        PEOPLE.find((person) => person.id === "u-jana") ?? redeemer;
    }
    if (redeemed && variant.shop === "bistrocentral" && rand() < 0.5) {
      preferredRedeemer =
        PEOPLE.find((person) => person.id === "u-lucie") ?? redeemer;
    }

    const prefix =
      variant.shop === "lss"
        ? "LSS"
        : variant.shop === "bistrocentral"
          ? "BC"
          : "CA";
    const body = Math.floor(10000000 + rand() * 89999999)
      .toString(36)
      .toUpperCase()
      .slice(0, 8)
      .padEnd(8, "X");

    vouchers.push({
      code: `${prefix}${body}`,
      variantId: variant.id,
      variantName: variant.name,
      shopId: variant.shop,
      soldAt: toDateOnly(soldDate),
      status: redeemed ? "Uplatněný" : rand() < 0.08 ? "Expirovaný" : "Aktivní",
      amountCzk: variant.amountCzk,
      vatLabel: variant.vatLabel,
      taxRegime: rand() < 0.08 ? "legacy" : "vouchy",
      issuedByName: chosenIssuer?.name ?? null,
      redeemedByName:
        redeemed && preferredRedeemer ? preferredRedeemer.name : null,
    });
  }

  // Doplň jistých pár řádků, ať každá role v ukázce hezky vynikne.
  const guaranteed: Array<{
    person: DemoPerson;
    shop: ShopId;
    kind: "issue" | "redeem";
  }> = [
    { person: PEOPLE[0]!, shop: "lss", kind: "issue" },
    { person: PEOPLE[0]!, shop: "lss", kind: "redeem" },
    { person: PEOPLE[1]!, shop: "bistrocentral", kind: "issue" },
    { person: PEOPLE[1]!, shop: "bistrocentral", kind: "redeem" },
    { person: PEOPLE[2]!, shop: "bistrocentral", kind: "redeem" },
    { person: PEOPLE[3]!, shop: "lss", kind: "issue" },
    { person: PEOPLE[3]!, shop: "lss", kind: "redeem" },
    { person: PEOPLE[4]!, shop: "culinaryacademy", kind: "issue" },
    { person: PEOPLE[4]!, shop: "culinaryacademy", kind: "redeem" },
  ];

  for (const item of guaranteed) {
    const pool = catalog.filter((variant) => variant.shop === item.shop);
    const variant = pool[Math.floor(rand() * pool.length)] ?? catalog[0]!;
    const soldDate = new Date(`${FROM}T12:00:00`);
    soldDate.setDate(soldDate.getDate() + Math.floor(rand() * days));
    const prefix =
      variant.shop === "lss"
        ? "LSS"
        : variant.shop === "bistrocentral"
          ? "BC"
          : "CA";
    const body = Math.floor(10000000 + rand() * 89999999)
      .toString(36)
      .toUpperCase()
      .slice(0, 8)
      .padEnd(8, "X");

    vouchers.push({
      code: `${prefix}${body}`,
      variantId: variant.id,
      variantName: variant.name,
      shopId: variant.shop,
      soldAt: toDateOnly(soldDate),
      status: item.kind === "redeem" ? "Uplatněný" : "Aktivní",
      amountCzk: variant.amountCzk,
      vatLabel: variant.vatLabel,
      taxRegime: "vouchy",
      issuedByName:
        item.kind === "issue" || item.person.canIssue
          ? item.kind === "issue"
            ? item.person.name
            : pickPerson(rand, (person) => person.canIssue).name
          : null,
      redeemedByName: item.kind === "redeem" ? item.person.name : null,
    });
  }

  void issuers;
  void redeemers;
  return vouchers.sort((a, b) => a.soldAt.localeCompare(b.soldAt));
}

function buildStaffRows(vouchers: SoldVoucherRecord[]): StaffActivityRow[] {
  return PEOPLE.map((person) => {
    const issued = vouchers.filter(
      (row) => row.issuedByName === person.name,
    ).length;
    const redeemed = vouchers.filter(
      (row) => row.redeemedByName === person.name,
    ).length;
    return {
      id: person.id,
      name: person.name,
      username: person.username,
      role: person.role,
      roleLabel: ADMIN_ROLE_LABELS[person.role],
      avatarUrl: null,
      issued,
      redeemed,
    };
  }).sort(
    (a, b) =>
      b.issued + b.redeemed - (a.issued + a.redeemed) ||
      b.redeemed - a.redeemed ||
      a.name.localeCompare(b.name, "cs"),
  );
}

async function main() {
  const catalog = buildCatalog();
  const vouchers = buildDemoVouchers(catalog);
  const staffRows = buildStaffRows(vouchers);

  const base = aggregateVoucherReport(
    { from: FROM, to: TO, shop: "all", activity: "all" },
    vouchers,
  );

  const report: VoucherReport = {
    ...base,
    userId: null,
    userLabel: null,
    activity: "all",
    isDemo: true,
    staffRows,
    aggregateRows: [
      ...base.aggregateRows,
      ...staffRows.map((row) => ({
        section: "Podle uživatele",
        metric: `${row.name} (${row.roleLabel}) · vystaveno ${row.issued} / uplatněno ${row.redeemed}`,
        count: row.issued + row.redeemed,
        amountCzk: 0,
      })),
    ],
  };

  const buffer = await buildVoucherReportWorkbook(report, {
    demoNote:
      "Toto je ukázkový report s fiktivními uživateli (např. Jana Nováková) a ukázkovými prodeji. Obchody (Long Story Short, Bistro Central, Culinary Academy) a varianty poukazů odpovídají reálnému katalogu. V ostrém provozu budou ve sloupcích Vystavil / Uplatnil skuteční členové týmu podle rolí (vlastník, recepce, obsluha, obsluha+).",
  });

  const outDir = path.join(process.cwd(), "docs");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(
    outDir,
    `ukazkovy-report-poukazy-${FROM}_${TO}.xlsx`,
  );
  writeFileSync(outPath, Buffer.from(buffer));

  console.log(`OK → ${outPath}`);
  console.log(
    `Poukazy: ${report.vouchers.length}, uživatelé: ${staffRows
      .map((row) => `${row.name} ${row.issued}/${row.redeemed}`)
      .join(", ")}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
