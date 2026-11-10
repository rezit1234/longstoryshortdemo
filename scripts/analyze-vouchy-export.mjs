import ExcelJS from "exceljs";

const FILE = "C:/Users/Tomáš/Downloads/EXPORT POUKAZŮ (VOUCHY).xlsx";

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
    return { y: raw.getFullYear(), m: raw.getMonth() + 1, d: raw.getDate() };
  }
  const s = cellText(raw);
  if (!s) return null;

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return { y: +iso[1], m: +iso[2], d: +iso[3] };

  const m1 = s.match(/^(\d{1,2})\.(\d{1,2})\.?(\d{2,4})?/);
  if (m1) {
    let y = m1[3] ? Number(m1[3]) : yearHint;
    if (y != null && y < 100) y += y >= 70 ? 1900 : 2000;
    if (y == null) return null;
    return { y, m: +m1[2], d: +m1[1] };
  }

  return null;
}

function looksLikeCode(text) {
  const s = cellText(text);
  if (!s || s.length > 40) return false;
  if (
    /^(KÓD|KOD|JMÉNO|JMENO|ČÁSTKA|CASTKA|TYP|OBJEDNÁNO|PODNIK|VYUŽITO|POZNÁM|LEDEN|ÚNOR|UNOR|BŘEZEN|BREZEN|DUBEN|KVĚTEN|KVETEN|ČERVEN|CERVEN|ČERVENEC|CERVENEC|SRPEN|ZÁŘÍ|ZARÍ|ŘÍJEN|RIJEN|LISTOPAD|PROSINEC|KONEC|WEB|RECEPCE|CELKEM|PRODLOUŽENÉ|NEVYUŽITÉ|VOUCHER)/i.test(
      s,
    )
  ) {
    return false;
  }
  if (/^\d{3,6}-\d{3,6}$/.test(s)) return false; // range headers like 3800-3899
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
  return /KONEC|NEZAPISUJ|OBJEDNÁNO Z |OBJEDNÁNO NA |PRODLOUŽENÉ|ČÍSLA POUKAZŮ|POUZE POŠTOU|STATISTICS|NEVYUŽITÉ/.test(
    joined,
  );
}

/**
 * Column indexes are 1-based Excel columns.
 * Many sheets have 1–2 empty leading columns.
 */
const SHEETS = [
  {
    name: "WEB PLATNOST 27",
    channel: "web",
    yearHint: 2026,
    codeCol: 2,
    amountCol: 4,
    dateCol: 6,
  },
  {
    name: "RECEPCE PLATNOST 27",
    channel: "recepce",
    yearHint: 2026,
    codeCol: 2,
    amountCol: 3,
    dateCol: 5,
  },
  {
    name: "WEB PLATNOST 26",
    channel: "web",
    yearHint: 2025,
    codeCol: 3,
    amountCol: 5,
    dateCol: 7,
  },
  {
    name: "RECEPCE PLATNOST 26",
    channel: "recepce",
    yearHint: 2025,
    codeCol: 3,
    amountCol: 4,
    dateCol: 6,
  },
  {
    name: "2425 - PO SPLATNOSTI (W)",
    channel: "web",
    yearHint: null,
    codeCol: 2,
    amountCol: 4,
    dateCol: 6,
    // STATISTICS: 2023 = rows ~8-1649, 2024 = ~1653-3104
    yearByRow: [
      { from: 8, to: 1649, year: 2023 },
      { from: 1653, to: 3104, year: 2024 },
    ],
  },
  {
    name: "2425 - PO SPLATNOSTI (R)",
    channel: "recepce",
    yearHint: null,
    codeCol: 2,
    amountCol: 3,
    dateCol: 4,
    yearByRow: [
      { from: 7, to: 954, year: 2023 },
      { from: 956, to: 1712, year: 2024 },
    ],
  },
  {
    name: "od 22 - PO SPLATNOSTI (W)",
    channel: "web",
    yearHint: null,
    codeCol: 1,
    amountCol: 5,
    dateCol: 9,
    yearByRow: [
      { from: 4, to: 746, year: 2022 },
      { from: 747, to: 965, year: 2023 },
    ],
  },
  {
    name: "od 22 - PO SPLATNOSTI (R)",
    channel: "recepce",
    yearHint: null,
    codeCol: 1,
    amountCol: 3,
    dateCol: 5,
    yearByRow: [
      { from: 353, to: 1219, year: 2022 },
      { from: 1218, to: 1507, year: 2023 },
    ],
    loose: true,
  },
];

function emptyBucket() {
  return { count: 0, amount: 0 };
}

function add(bucket, amount) {
  bucket.count += 1;
  bucket.amount += amount;
}

function yearFromRow(cfg, r, date, sectionHint) {
  if (date?.y) return date.y;
  if (cfg.yearByRow) {
    for (const band of cfg.yearByRow) {
      if (r >= band.from && r <= band.to) return band.year;
    }
  }
  return sectionHint ?? cfg.yearHint ?? null;
}

function fmt(n) {
  return `${Math.round(n).toLocaleString("cs-CZ")} Kč`;
}

function fmtBucket(b) {
  return `${fmt(b.amount)} · ${b.count.toLocaleString("cs-CZ")} ks`;
}

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(FILE);

const byYear = new Map();
const byYearChannel = new Map();
const bySheet = new Map();
const seenCodes = new Map();
let total = emptyBucket();
let dupAmount = 0;
let dupCount = 0;

function ensureYear(y) {
  const k = y == null ? "unknown" : String(y);
  if (!byYear.has(k)) byYear.set(k, emptyBucket());
  return byYear.get(k);
}

function ensureYC(y, channel) {
  const k = `${y == null ? "unknown" : y}|${channel}`;
  if (!byYearChannel.has(k)) byYearChannel.set(k, emptyBucket());
  return byYearChannel.get(k);
}

for (const cfg of SHEETS) {
  const ws = wb.getWorksheet(cfg.name);
  if (!ws) continue;
  const sheetStats = emptyBucket();
  let sectionHint = cfg.yearHint;

  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const scan = [];
    for (let c = 1; c <= 10; c++) scan.push(cellText(row.getCell(c).value));
    // Měsíční oddělovač → rok z „LEDEN 2025“ nebo default listu
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
      continue;
    }

    let code = cellText(row.getCell(cfg.codeCol).value);
    let amount = cellNum(row.getCell(cfg.amountCol).value);
    let dateRaw = row.getCell(cfg.dateCol).value;

    // Loose fallback for messy legacy reception sheet
    if (cfg.loose) {
      if (!looksLikeCode(code)) {
        // "  001," / "jméno: ..." — zkus vytáhnout částku z textu ve sloupci C
        const fromText = cellNum(row.getCell(3).value);
        if (fromText != null && fromText >= 50) {
          code = `LEGACY-${cfg.name}-${r}`;
          amount = fromText;
        }
      }
    }

    if (amount == null || amount < 50 || amount > 250000) continue;
    if (!looksLikeCode(code)) continue;

    const date = parseOrderDate(dateRaw, sectionHint ?? cfg.yearHint);
    const y = yearFromRow(cfg, r, date, sectionHint);

    add(sheetStats, amount);
    add(total, amount);
    add(ensureYear(y), amount);
    add(ensureYC(y, cfg.channel), amount);

    const key = code.toUpperCase();
    if (seenCodes.has(key)) {
      dupCount += 1;
      dupAmount += amount;
    } else {
      seenCodes.set(key, { amount, sheet: cfg.name, y });
    }
  }

  bySheet.set(cfg.name, sheetStats);
}

console.log("=== SOUBOR ===");
console.log(FILE);
console.log("");

console.log("=== CELKEM (tržby = součet ČÁSTKA všech zapsaných poukazů) ===");
console.log(fmtBucket(total));
console.log(`Unikátní kódy: ${seenCodes.size.toLocaleString("cs-CZ")}`);
if (dupCount) {
  console.log(
    `Duplicitní výskyty kódů napříč listy: ${dupCount} ks / ${fmt(dupAmount)} (v součém souču započteny víckrát)`,
  );
}
console.log("");

console.log("=== PODLE ROKU (odhad z data objednání / sekce listu) ===");
const years = [...byYear.keys()].sort((a, b) => {
  if (a === "unknown") return 1;
  if (b === "unknown") return -1;
  return Number(a) - Number(b);
});
for (const y of years) console.log(`${y}: ${fmtBucket(byYear.get(y))}`);
console.log("");

for (const focus of ["2025", "2026"]) {
  console.log(`=== ROK ${focus} ===`);
  const all = byYear.get(focus) || emptyBucket();
  const web = byYearChannel.get(`${focus}|web`) || emptyBucket();
  const rec = byYearChannel.get(`${focus}|recepce`) || emptyBucket();
  console.log(`Celkem:  ${fmtBucket(all)}`);
  console.log(`Web:     ${fmtBucket(web)}`);
  console.log(`Recepce: ${fmtBucket(rec)}`);
  console.log("");
}

console.log("=== PODLE LISTU ===");
for (const [name, b] of bySheet) console.log(`${name}: ${fmtBucket(b)}`);

console.log("");
console.log(
  "=== STATISTICS (NEVYUŽITÉ poukazy — klientova tabulka, NE tržby) ===",
);
const st = wb.getWorksheet("STATISTICS");
for (let r = 4; r <= 9; r++) {
  const y = cellText(st.getRow(r).getCell(2).value);
  const web = cellNum(st.getRow(r).getCell(3).value) || 0;
  const rec = cellNum(st.getRow(r).getCell(4).value) || 0;
  const tot = cellNum(st.getRow(r).getCell(5).value) || 0;
  console.log(`${y}: web ${fmt(web)} + recepce ${fmt(rec)} = ${fmt(tot)}`);
}
