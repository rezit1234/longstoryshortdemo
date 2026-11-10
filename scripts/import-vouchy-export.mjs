/**
 * Import historických poukazů z Excelu Vouchy do sold_vouchers.
 *
 *   node --env-file=.env.local scripts/import-vouchy-export.mjs --dry-run
 *   node --env-file=.env.local scripts/import-vouchy-export.mjs --wipe-and-import
 *
 * Volitelně: --file "C:/path/to/export.xlsx"
 */
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";
import path from "node:path";
import process from "node:process";

const DEFAULT_FILE =
  "C:/Users/Tomáš/Downloads/EXPORT POUKAZŮ (VOUCHY).xlsx";

const VOUCHER_CODE_BODY_LENGTH = 7;
const VOUCHER_CODE_LEGACY_MAX_LENGTH = 32;
const VOUCHER_CODE_PREFIXES = ["LSS", "BC", "CA"];
const IMPORT_SOURCE = "vouchy_excel";
const BATCH_SIZE = 500;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const wipeAndImport = args.includes("--wipe-and-import");
const fileArgIdx = args.indexOf("--file");
const FILE =
  fileArgIdx >= 0 && args[fileArgIdx + 1]
    ? path.resolve(args[fileArgIdx + 1])
    : DEFAULT_FILE;

if (!dryRun && !wipeAndImport) {
  console.error(
    "Zadej --dry-run nebo --wipe-and-import (případně oboje: nejdřív report, pak import).",
  );
  process.exit(1);
}

function cellText(v) {
  if (v == null || v === "") return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if (v.result !== undefined) return cellText(v.result);
    if (v.richText) return v.richText.map((t) => t.text).join("");
    if (v.text != null) return String(v.text);
  }
  return String(v).trim();
}

function cellNum(v) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v && typeof v === "object" && v.result != null) return cellNum(v.result);
  const s = cellText(v)
    .replace(/\s/g, "")
    .replace(/Kč|CZK|,-/gi, "")
    .replace(",", ".");
  if (!s) return null;
  const m = s.match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function parseOrderDate(raw, yearHint) {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return {
      y: raw.getFullYear(),
      m: raw.getMonth() + 1,
      d: raw.getDate(),
      iso: raw.toISOString(),
    };
  }
  const s = cellText(raw);
  if (!s) return null;

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const y = +iso[1];
    const m = +iso[2];
    const d = +iso[3];
    return { y, m, d, iso: new Date(Date.UTC(y, m - 1, d, 12)).toISOString() };
  }

  const m1 = s.match(/^(\d{1,2})\.(\d{1,2})\.?(\d{2,4})?/);
  if (m1) {
    let y = m1[3] ? Number(m1[3]) : yearHint;
    if (y != null && y < 100) y += y >= 70 ? 1900 : 2000;
    if (y == null) return null;
    const m = +m1[2];
    const d = +m1[1];
    return { y, m, d, iso: new Date(Date.UTC(y, m - 1, d, 12)).toISOString() };
  }

  // např. "4.4./26 Central" / "20.3.26 EA" / "EA 8.3."
  const loose = s.match(/(\d{1,2})\.(\d{1,2})\.?\/?(\d{2,4})?/);
  if (loose) {
    let y = loose[3] ? Number(loose[3]) : yearHint;
    if (y != null && y < 100) y += y >= 70 ? 1900 : 2000;
    if (y == null) return null;
    const m = +loose[2];
    const d = +loose[1];
    return { y, m, d, iso: new Date(Date.UTC(y, m - 1, d, 12)).toISOString() };
  }

  return null;
}

function looksLikeCode(text) {
  const s = cellText(text);
  if (!s || s.length > 40) return false;
  if (
    /^(KÓD|KOD|JMÉNO|JMENO|ČÁSTKA|CASTKA|TYP|OBJEDNÁNO|PODNIK|VYUŽITO|POZNÁM|LEDEN|ÚNOR|UNOR|BŘEZEN|BREZEN|DUBEN|KVĚTEN|KVETEN|ČERVEN|CERVEN|ČERVENEC|CERVENEC|SRPEN|ZÁŘÍ|ZARÍ|ŘÍJEN|RIJEN|LISTOPAD|PROSINEC|KONEC|WEB|RECEPCE|CELKEM|PRODLOUŽENÉ|NEVYUŽITÉ|VOUCHER|DATUM|UPLATN)/i.test(
      s,
    )
  ) {
    return false;
  }
  if (/^\d{3,6}-\d{3,6}$/.test(s)) return false;
  if (/^\d{3,6}$/.test(s)) return true;
  if (/^[A-Z]{1,4}\d{3,8}$/i.test(s)) return true;
  return /^[A-Z0-9][A-Z0-9._-]{2,}$/i.test(s) && !/\s/.test(s);
}

function isMonthLabel(text) {
  return /^(LEDEN|ÚNOR|UNOR|BŘEZEN|BREZEN|DUBEN|KVĚTEN|KVETEN|ČERVEN|CERVEN|ČERVENEC|CERVENEC|SRPEN|ZÁŘÍ|ZARÍ|ŘÍJEN|RIJEN|LISTOPAD|PROSINEC)(\s+20\d{2})?$/i.test(
    cellText(text).trim(),
  );
}

function yearFromMonthLabel(text) {
  const m = cellText(text).match(
    /^(?:LEDEN|ÚNOR|UNOR|BŘEZEN|BREZEN|DUBEN|KVĚTEN|KVETEN|ČERVEN|CERVEN|ČERVENEC|CERVENEC|SRPEN|ZÁŘÍ|ZARÍ|ŘÍJEN|RIJEN|LISTOPAD|PROSINEC)\s+(20\d{2})$/i,
  );
  return m ? Number(m[1]) : null;
}

function isNoiseRow(texts) {
  const joined = texts.join(" ").toUpperCase();
  return /KONEC|NEZAPISUJ|OBJEDNÁNO Z |OBJEDNÁNO NA |PRODLOUŽENÉ|ČÍSLA POUKAZŮ|POUZE POŠTOU|STATISTICS|NEVYUŽITÉ|OBJEDNÁNO 20/.test(
    joined,
  );
}

function normalizeVoucherCode(raw) {
  const cleaned = String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (!cleaned) return "";

  let prefix = null;
  for (const p of VOUCHER_CODE_PREFIXES) {
    if (cleaned.startsWith(p)) {
      prefix = p;
      break;
    }
  }

  if (prefix) {
    const rest = cleaned.slice(prefix.length);
    if (rest.length <= VOUCHER_CODE_BODY_LENGTH) {
      return `${prefix}${rest}`;
    }
    return cleaned.slice(0, VOUCHER_CODE_LEGACY_MAX_LENGTH);
  }

  return cleaned.slice(0, VOUCHER_CODE_LEGACY_MAX_LENGTH);
}

function mapShop(raw) {
  const s = cellText(raw).toUpperCase();
  if (!s) return "lss";
  if (/CENTRAL|BISTRO|BC\b/.test(s)) return "bistrocentral";
  if (/CULINARY|ACADEMY|CA\b/.test(s)) return "culinaryacademy";
  return "lss";
}

function detectItemKind(typeRaw, amount) {
  const t = cellText(typeRaw).toLowerCase();
  if (!t || /^voucher$/i.test(t.trim())) return "amount";
  if (
    /chef|arc|nook|koutek|flat|big\s*one|výklenek|vyklenek|ubytov|table|hostel|room|zážit|zazit|noc/.test(
      t,
    )
  ) {
    return "experience";
  }
  // částka typicky 500/1000/1500… — experience často „podivná“ cena, ale default amount
  if (amount != null && amount % 50 === 0 && amount <= 50000 && !/[a-zá-ž]/i.test(t)) {
    return "amount";
  }
  if (/[a-zá-ž]/i.test(t) && !/voucher|email|mail|pošta|posta/i.test(t)) {
    return "experience";
  }
  return "amount";
}

function productNameFor(itemKind, typeRaw, amount) {
  const t = cellText(typeRaw).trim();
  if (itemKind === "experience" && t && !/^voucher$/i.test(t)) return t.slice(0, 120);
  if (t && !/^voucher$/i.test(t) && !/email|mail/i.test(t)) return t.slice(0, 120);
  return `Dárkový poukaz ${Math.round(amount)} Kč`;
}

function endOfYear(y) {
  return `${y}-12-31`;
}

function addMonthsIso(iso, months) {
  const d = new Date(iso);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

function parseRemainingFromNotes(notes) {
  const s = cellText(notes);
  const m = s.match(/zbývá\s*(\d+)/i) || s.match(/zbyva\s*(\d+)/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Sheet configs — priority: higher first (active validity sheets before expired).
 * Columns are 1-based.
 */
const SHEETS = [
  {
    name: "WEB PLATNOST 27",
    channel: "web",
    priority: 100,
    validityYear: 2027,
    expiredSheet: false,
    yearHint: 2026,
    codeCol: 2,
    nameCol: 3,
    amountCol: 4,
    typeCol: 5,
    dateCol: 6,
    shopCol: 7,
    redeemedCol: 8,
    notesCol: 10,
  },
  {
    name: "RECEPCE PLATNOST 27",
    channel: "recepce",
    priority: 100,
    validityYear: 2027,
    expiredSheet: false,
    yearHint: 2026,
    codeCol: 2,
    amountCol: 3,
    typeCol: 4,
    dateCol: 5,
    shopCol: 6,
    redeemedCol: 7,
    notesCol: 8,
  },
  {
    name: "WEB PLATNOST 26",
    channel: "web",
    priority: 90,
    validityYear: 2026,
    expiredSheet: false,
    yearHint: 2025,
    codeCol: 3,
    nameCol: 4,
    amountCol: 5,
    typeCol: 6,
    dateCol: 7,
    shopCol: 8,
    redeemedCol: 9,
    notesCol: 11,
  },
  {
    name: "RECEPCE PLATNOST 26",
    channel: "recepce",
    priority: 90,
    validityYear: 2026,
    expiredSheet: false,
    yearHint: 2025,
    codeCol: 3,
    amountCol: 4,
    typeCol: 5,
    dateCol: 6,
    shopCol: 7,
    redeemedCol: 8,
    notesCol: 9,
  },
  {
    name: "2425 - PO SPLATNOSTI (W)",
    channel: "web",
    priority: 40,
    validityYear: null,
    expiredSheet: true,
    yearHint: null,
    codeCol: 2,
    nameCol: 3,
    amountCol: 4,
    typeCol: 5,
    dateCol: 6,
    redeemedCol: 7,
    notesCol: 9,
    yearByRow: [
      { from: 8, to: 1649, year: 2023 },
      { from: 1653, to: 3104, year: 2024 },
    ],
  },
  {
    name: "2425 - PO SPLATNOSTI (R)",
    channel: "recepce",
    priority: 40,
    validityYear: null,
    expiredSheet: true,
    yearHint: null,
    codeCol: 2,
    amountCol: 3,
    dateCol: 4,
    redeemedCol: 5,
    notesCol: 7,
    yearByRow: [
      { from: 7, to: 954, year: 2023 },
      { from: 956, to: 1712, year: 2024 },
    ],
  },
  {
    name: "od 22 - PO SPLATNOSTI (W)",
    channel: "web",
    priority: 20,
    validityYear: null,
    expiredSheet: true,
    yearHint: null,
    codeCol: 1,
    nameCol: 3,
    amountCol: 5,
    typeCol: 7,
    dateCol: 9,
    yearByRow: [
      { from: 4, to: 746, year: 2022 },
      { from: 747, to: 965, year: 2023 },
    ],
  },
  {
    name: "od 22 - PO SPLATNOSTI (R)",
    channel: "recepce",
    priority: 10,
    validityYear: null,
    expiredSheet: true,
    yearHint: null,
    codeCol: 1,
    amountCol: 3,
    dateCol: 5,
    redeemedCol: 9,
    // Starý recepční list je nečitelný — bez loose fallbacků (žádné LEGACYR / dnešní datum).
    loose: false,
    yearByRow: [
      { from: 353, to: 1219, year: 2022 },
      { from: 1218, to: 1507, year: 2023 },
    ],
  },
];

function yearFromRow(cfg, r, date, sectionHint) {
  if (date?.y) return date.y;
  if (cfg.yearByRow) {
    for (const band of cfg.yearByRow) {
      if (r >= band.from && r <= band.to) return band.year;
    }
  }
  return sectionHint ?? cfg.yearHint ?? null;
}

function todayDateStr() {
  return new Date().toISOString().slice(0, 10);
}

function buildRow(cfg, parsed) {
  const {
    code,
    amount,
    date,
    purchaseYear,
    name,
    shopRaw,
    typeRaw,
    redeemedRaw,
    notes,
  } = parsed;

  const codeNormalized = normalizeVoucherCode(code);
  if (!codeNormalized) return { skip: "empty_code" };

  const amountCzk = Math.round(amount);
  if (!Number.isFinite(amountCzk) || amountCzk < 50) {
    return { skip: "bad_amount" };
  }

  // Nikdy neházej dnešní datum — bez data nákupu řádek přeskoč.
  if (!date?.iso && purchaseYear == null) {
    return { skip: "missing_purchase_date" };
  }

  const itemKind = detectItemKind(typeRaw, amountCzk);
  const shopId = mapShop(shopRaw);
  const purchasedAt =
    date?.iso ??
    new Date(Date.UTC(purchaseYear, 0, 1, 12)).toISOString();

  let validUntil;
  if (cfg.validityYear) {
    validUntil = endOfYear(cfg.validityYear);
  } else if (purchaseYear) {
    validUntil = endOfYear(purchaseYear);
  } else if (date?.y) {
    validUntil = endOfYear(date.y);
  } else {
    validUntil = addMonthsIso(purchasedAt, 12);
  }

  const redeemedText = cellText(redeemedRaw).trim();
  const redeemedDate = redeemedRaw
    ? parseOrderDate(redeemedRaw, purchaseYear ?? date?.y)
    : null;
  const redeemedFilled =
    Boolean(redeemedText) &&
    !/^(false|0|ne|no|-)$/i.test(redeemedText);

  let status;
  if (redeemedFilled) {
    status = "redeemed";
  } else if (cfg.expiredSheet || validUntil < todayDateStr()) {
    status = "expired";
  } else {
    status = "active";
  }

  const remainingFromNotes = parseRemainingFromNotes(notes);
  let remainingCzk = null;
  if (itemKind === "amount") {
    if (status === "redeemed") remainingCzk = 0;
    else if (remainingFromNotes != null) {
      remainingCzk = Math.min(Math.round(remainingFromNotes), amountCzk);
    } else remainingCzk = amountCzk;
  }

  const buyerName = cellText(name).slice(0, 200);
  const redeemedNote = redeemedFilled ? redeemedText.slice(0, 200) : null;

  return {
    skip: null,
    row: {
      order_id: null,
      shop_id: shopId,
      code: String(code).trim(),
      code_normalized: codeNormalized,
      product_name: productNameFor(itemKind, typeRaw, amountCzk),
      item_kind: itemKind,
      unit_price_czk: amountCzk,
      shipping_fee_share_czk: 0,
      status,
      purchased_at: purchasedAt,
      valid_until: validUntil,
      redeemed_at:
        status === "redeemed" ? redeemedDate?.iso ?? purchasedAt : null,
      redeemed_note: redeemedNote,
      buyer_name: buyerName,
      buyer_email: "",
      buyer_phone: "",
      recipient_name: buyerName,
      delivery_method: "email",
      delivery_email: null,
      shipping_address: null,
      message: cellText(notes).slice(0, 500) || null,
      vat_label: itemKind === "amount" ? "Cenina bez DPH" : null,
      tax_regime: "legacy",
      remaining_czk: remainingCzk,
      redeemable_parts: null,
      is_gift: false,
      import_source: IMPORT_SOURCE,
      _meta: {
        sheet: cfg.name,
        channel: cfg.channel,
        priority: cfg.priority,
      },
    },
  };
}

async function parseExcel() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);

  /** @type {Map<string, object>} */
  const byCode = new Map();
  const skips = [];
  const sheetCounts = new Map();
  let rawRows = 0;
  let dupSkipped = 0;

  // Higher priority sheets first → first write wins
  const ordered = [...SHEETS].sort((a, b) => b.priority - a.priority);

  for (const cfg of ordered) {
    const ws = wb.getWorksheet(cfg.name);
    if (!ws) {
      skips.push({ sheet: cfg.name, reason: "missing_sheet" });
      continue;
    }

    let sectionHint = cfg.yearHint;
    let accepted = 0;

    for (let r = 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const scan = [];
      for (let c = 1; c <= 12; c++) scan.push(cellText(row.getCell(c).value));

      const monthCell = scan.find((t) => isMonthLabel(t));
      if (monthCell) {
        sectionHint =
          yearFromMonthLabel(monthCell) ?? cfg.yearHint ?? sectionHint;
        continue;
      }

      if (isNoiseRow(scan)) {
        const joined = scan.join(" ");
        const m = joined.match(/ROCE\s+(20\d{2})/i);
        if (m) sectionHint = Number(m[1]);
        const m2 = joined.match(/PRODLOUŽENÉ Z ROKU\s+(20\d{2})/i);
        if (m2) sectionHint = Number(m2[1]);
        const m3 = joined.match(/OBJEDNÁNO\s+(20\d{2})/i);
        if (m3) sectionHint = Number(m3[1]);
        continue;
      }

      let code = cellText(row.getCell(cfg.codeCol).value);
      let amount = cellNum(row.getCell(cfg.amountCol).value);
      let dateRaw = row.getCell(cfg.dateCol).value;

      if (cfg.loose) {
        if (!looksLikeCode(code)) {
          const fromText = cellNum(row.getCell(3).value);
          if (fromText != null && fromText >= 50) {
            code = `LEGACYR${r}`;
            amount = fromText;
          }
        }
      }

      if (amount == null || amount < 50 || amount > 250000) continue;
      if (!looksLikeCode(code)) {
        skips.push({
          sheet: cfg.name,
          row: r,
          reason: "bad_code",
          code: code.slice(0, 40),
        });
        continue;
      }

      rawRows += 1;
      const date = parseOrderDate(dateRaw, sectionHint ?? cfg.yearHint);
      const purchaseYear = yearFromRow(cfg, r, date, sectionHint);

      const built = buildRow(cfg, {
        code,
        amount,
        date,
        purchaseYear,
        name: cfg.nameCol ? row.getCell(cfg.nameCol).value : "",
        shopRaw: cfg.shopCol ? row.getCell(cfg.shopCol).value : "",
        typeRaw: cfg.typeCol ? row.getCell(cfg.typeCol).value : "",
        redeemedRaw: cfg.redeemedCol ? row.getCell(cfg.redeemedCol).value : "",
        notes: cfg.notesCol ? row.getCell(cfg.notesCol).value : "",
      });

      if (built.skip) {
        skips.push({ sheet: cfg.name, row: r, reason: built.skip, code });
        continue;
      }

      const key = built.row.code_normalized;
      if (byCode.has(key)) {
        dupSkipped += 1;
        continue;
      }
      byCode.set(key, built.row);
      accepted += 1;
    }

    sheetCounts.set(cfg.name, accepted);
  }

  return { byCode, skips, sheetCounts, rawRows, dupSkipped };
}

function summarize(rows) {
  const status = {};
  const shop = {};
  const kind = {};
  let amountSum = 0;
  for (const r of rows) {
    status[r.status] = (status[r.status] || 0) + 1;
    shop[r.shop_id] = (shop[r.shop_id] || 0) + 1;
    kind[r.item_kind] = (kind[r.item_kind] || 0) + 1;
    amountSum += r.unit_price_czk;
  }
  return { status, shop, kind, amountSum, count: rows.length };
}

async function wipeTestData(admin) {
  console.log("Mažu voucher_redemptions…");
  {
    const { error } = await admin
      .from("voucher_redemptions")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) throw new Error(`wipe redemptions: ${error.message}`);
  }

  console.log("Mažu sold_vouchers…");
  {
    const { error } = await admin
      .from("sold_vouchers")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) throw new Error(`wipe sold_vouchers: ${error.message}`);
  }

  console.log("Mažu voucher_orders…");
  {
    const { error } = await admin
      .from("voucher_orders")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) throw new Error(`wipe voucher_orders: ${error.message}`);
  }
}

async function ensureImportSourceColumn(admin) {
  // Migrace může ještě nebýt nasazená — zkusíme probe insert není; select column.
  const { error } = await admin
    .from("sold_vouchers")
    .select("import_source")
    .limit(1);
  if (error && /import_source|column/i.test(error.message)) {
    console.warn(
      "Sloupec import_source zatím není v DB. Spusť migraci 020_sold_vouchers_import_source.sql, nebo import pokračuje bez něj.",
    );
    return false;
  }
  if (error) throw error;
  return true;
}

async function insertBatches(admin, rows, hasImportSource) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE).map((r) => {
      const { _meta, ...rest } = r;
      if (!hasImportSource) {
        const { import_source, ...without } = rest;
        return without;
      }
      return rest;
    });
    const { error } = await admin.from("sold_vouchers").insert(chunk);
    if (error) {
      throw new Error(
        `insert batch @${i}: ${error.message} (sample code=${chunk[0]?.code_normalized})`,
      );
    }
    inserted += chunk.length;
    console.log(`  insert ${inserted}/${rows.length}`);
  }
  return inserted;
}

async function main() {
  console.log("=== Import Vouchy Excel ===");
  console.log(`Soubor: ${FILE}`);
  console.log(`Režim: ${dryRun ? "dry-run" : ""}${dryRun && wipeAndImport ? " + " : ""}${wipeAndImport ? "wipe-and-import" : ""}`);
  console.log("");

  const { byCode, skips, sheetCounts, rawRows, dupSkipped } = await parseExcel();
  const rows = [...byCode.values()];
  const summary = summarize(rows);

  console.log("=== PARSE REPORT ===");
  console.log(`Surové řádky (po filtru částky/kódu): ${rawRows}`);
  console.log(`Unikátní kódy k importu: ${summary.count}`);
  console.log(`Duplicity přeskočené (nižší priorita listu): ${dupSkipped}`);
  console.log(`Skip log (ukázka max 30): ${Math.min(30, skips.length)} / ${skips.length}`);
  for (const s of skips.slice(0, 30)) {
    console.log(`  - ${s.sheet} r${s.row ?? "?"}: ${s.reason}${s.code ? ` (${s.code})` : ""}`);
  }
  console.log("");
  console.log("Podle listu (přijaté po dedupe priority):");
  for (const [name, n] of sheetCounts) console.log(`  ${name}: ${n}`);
  console.log("");
  console.log("Status:", summary.status);
  console.log("Shop:", summary.shop);
  console.log("Kind:", summary.kind);
  console.log(
    `Součet nominálů: ${Math.round(summary.amountSum).toLocaleString("cs-CZ")} Kč`,
  );
  console.log("");

  // Ukázky
  const samples = {
    active: rows.find((r) => r.status === "active"),
    redeemed: rows.find((r) => r.status === "redeemed"),
    expired: rows.find((r) => r.status === "expired"),
    experience: rows.find((r) => r.item_kind === "experience"),
  };
  console.log("Ukázky:");
  for (const [k, v] of Object.entries(samples)) {
    if (!v) continue;
    console.log(
      `  ${k}: ${v.code} → ${v.code_normalized} | ${v.shop_id} | ${v.status} | valid ${v.valid_until} | ${v.unit_price_czk} Kč | ${v._meta.sheet}`,
    );
  }

  if (!wipeAndImport) {
    console.log("\nDry-run hotov. Pro ostrý import: --wipe-and-import");
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Chybí NEXT_PUBLIC_SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const hasImportSource = await ensureImportSourceColumn(admin);

  await wipeTestData(admin);
  console.log("Vkládám legacy řádky…");
  const inserted = await insertBatches(admin, rows, hasImportSource);
  console.log(`\nHotovo. Vloženo ${inserted} poukazů (import_source=${hasImportSource ? IMPORT_SOURCE : "n/a"}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
