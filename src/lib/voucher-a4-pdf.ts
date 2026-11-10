import fs from "node:fs";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import type { ShopId } from "@/data/admin-voucher-settings";

const PAGE_WIDTH = 595.2756;
const PAGE_HEIGHT = 841.8898;
const LEFT_X = 42;
const CONTENT_RIGHT = PAGE_WIDTH - 42;
const CONTENT_WIDTH = CONTENT_RIGHT - LEFT_X;
const HEADER_LINE_Y = 595.89;

const TITLE_SIZE = 19;
const LABEL_SIZE = 8.2;
const VALUE_SIZE = 11;
const LABEL_VALUE_GAP = 16.8;
const FOOTER_Y = 41.2;
/** Jemné oddělovací linky (ne plná čerň). */
const RULE_COLOR = rgb(0.72, 0.72, 0.72);
const RULE_THICKNESS = 0.25;
const COLUMN_GUTTER = 16;
/** Výška horního designu = výška souhrnu pod přehybem (přeložitelná karta). */
const FOLD_HEIGHT = PAGE_HEIGHT - HEADER_LINE_Y;
const CUT_LINE_Y = HEADER_LINE_Y - FOLD_HEIGHT;

const HEADER_LEFT = "V O U C H E R";
const HEADER_LEFT_SIZE = 7.7;
const HEADER_RIGHT_SIZE = 6.4;
const HEADER_LEFT_X = 113.14;
const HEADER_LEFT_Y = 715.19;
const HEADER_RIGHT_Y = 716.49;
const HEADER_RIGHT_END_X = 488.61;
const LOGO_CENTER_Y = 719.14;

type ShopA4Config = {
  headerRight: string;
  footerLeft: string;
  footerRight: string;
  terms: string[];
  logo: "pill" | "bistro";
};

const SHOP_A4: Record<"lss" | "bistrocentral", ShopA4Config> = {
  lss: {
    headerRight: "L O N G S T O R Y S H O R T . C Z",
    footerLeft: "Long Story Short Hostel | Café | Eatery | Bakery",
    footerRight: "Koželužská 945/31, Olomouc 779 00",
    logo: "pill",
    terms: [
      "Dárkové poukazy Long Story Short s konkrétní peněžní hodnotou je možné využít buď k nákupu ubytování nebo jako způsob platby v restauraci Eatery & Bakery, kavárně Café Bar nebo v našem dalším podniku Bistro Central.",
      "Poukazy s určenými službami, které jsou specifikované na dárkovém poukazu mohou být použity pouze pro tyto služby. Rezervace na Chef's Table v restauraci Eatery & Bakery je nutná alespoň 48 hodin předem.",
      "Dárkové poukazy jsou nevratné a nemají žádnou peněžní hodnotu. Poukazy mají platnost 12 měsíců od zakoupení.",
      "Pro rezervace ubytování na konkrétní pokoj nebo ubytování s tarifem NON-REFUNDABLE pomocí poukazů s konkrétní peněžní hodnotou nás, prosím, kontaktujte přímo na recepci hostelu.",
    ],
  },
  bistrocentral: {
    headerRight: "B I S T R O C E N T R A L . C Z",
    footerLeft: "Bistro Central",
    footerRight: "Denisova 9/61, Olomouc 779 00",
    logo: "bistro",
    terms: [
      "Dárkové poukazy Bistro Central s konkrétní peněžní hodnotou je možné využít jako způsob platby v Bistro Central nebo v našem dalším podniku Long Story Short, konkrétně v restauraci Eatery & Bakery, kavárně Café Bar nebo na ubytování v hostelu.",
      "Dárkové poukazy jsou nevratné a nemají žádnou peněžní hodnotu. Poukazy mají platnost 12 měsíců od zakoupení.",
    ],
  },
};

export type A4VoucherKind = "experience" | "amount";

export type A4VoucherPdfInput = {
  shopId: ShopId;
  code: string;
  /** Zážitek = „Služba“, částka = „Částka“. */
  kind?: A4VoucherKind;
  serviceTitle: string;
  amountCzk: number;
  recipientName?: string | null;
  fromName?: string | null;
  issuedAt: Date | string;
  validUntil: Date | string;
  message?: string | null;
};

export function shopUsesHardcodedA4Pdf(shopId: ShopId | string) {
  return shopId === "lss" || shopId === "bistrocentral";
}

function loadAsset(...parts: string[]) {
  const candidate = path.join(/*turbopackIgnore: true*/ process.cwd(), ...parts);
  if (!fs.existsSync(candidate)) {
    throw new Error(`Chybí soubor ${parts.join("/")}.`);
  }
  return fs.readFileSync(candidate);
}

function spaceHeader(text: string) {
  return text.split("").join(" ");
}

function wrapText(font: PDFFont, text: string, size: number, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines;
}

function fitSize(
  font: PDFFont,
  text: string,
  maxWidth: number,
  preferred: number,
  min = 10,
) {
  let size = preferred;
  while (size > min && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 0.5;
  }
  return size;
}

function formatAmount(amountCzk: number) {
  return `${Math.round(amountCzk).toLocaleString("cs-CZ")} Kč`;
}

function formatCzechDate(date: Date | string) {
  let value: Date;
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    const [y, m, d] = date.trim().split("-").map(Number);
    value = new Date(y, m - 1, d);
  } else {
    value = typeof date === "string" ? new Date(date) : date;
  }
  if (Number.isNaN(value.getTime())) return "";
  return value.toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function pillSvgPath(width: number, height: number, stroke: number) {
  const inset = stroke / 2;
  const iw = width - stroke;
  const ih = height - stroke;
  const r = iw / 2;
  const x = inset;
  const y = inset;
  return [
    `M ${x + r} ${y}`,
    `L ${x + iw - r} ${y}`,
    `A ${r} ${r} 0 0 1 ${x + iw} ${y + r}`,
    `L ${x + iw} ${y + ih - r}`,
    `A ${r} ${r} 0 0 1 ${x + iw - r} ${y + ih}`,
    `L ${x + r} ${y + ih}`,
    `A ${r} ${r} 0 0 1 ${x} ${y + ih - r}`,
    `L ${x} ${y + r}`,
    `A ${r} ${r} 0 0 1 ${x + r} ${y}`,
    "Z",
  ].join(" ");
}

function drawLssPill(page: PDFPage) {
  const logoWidth = 32.5;
  const logoHeight = 147;
  const stroke = 3.1;
  const logoX = (PAGE_WIDTH - logoWidth) / 2;
  const logoTopY = LOGO_CENTER_Y + logoHeight / 2;
  page.drawSvgPath(pillSvgPath(logoWidth, logoHeight, stroke), {
    x: logoX,
    y: logoTopY,
    borderColor: rgb(0, 0, 0),
    borderWidth: stroke,
  });
}

async function drawBistroLogo(doc: PDFDocument, page: PDFPage) {
  const sharp = (await import("sharp")).default;
  const logoPath = path.join(process.cwd(), "public", "bistrocentral-logo.png");
  const logoPng = await sharp(logoPath)
    .ensureAlpha()
    .resize({ width: 900, height: 900, fit: "inside" })
    .png()
    .toBuffer();

  const image = await doc.embedPng(logoPng);
  const logoSize = 147;
  page.drawImage(image, {
    x: (PAGE_WIDTH - logoSize) / 2,
    y: LOGO_CENTER_Y - logoSize / 2,
    width: logoSize,
    height: logoSize,
  });
}

function drawLabelValue(
  page: PDFPage,
  fontRegular: PDFFont,
  label: string,
  value: string | null | undefined,
  x: number,
  labelY: number,
  valueY: number,
  maxWidth: number,
) {
  page.drawText(label, {
    x,
    y: labelY,
    size: LABEL_SIZE,
    font: fontRegular,
    color: rgb(0, 0, 0),
  });
  const text = value?.replace(/\s+/g, " ").trim();
  if (!text) return;
  const size = fitSize(fontRegular, text, maxWidth, VALUE_SIZE, 9);
  page.drawText(text, {
    x,
    y: valueY,
    size,
    font: fontRegular,
    color: rgb(0, 0, 0),
  });
}

function drawHorizontalRule(
  page: PDFPage,
  y: number,
  x1 = 0,
  x2 = PAGE_WIDTH,
) {
  page.drawRectangle({
    x: x1,
    y: y - RULE_THICKNESS / 2,
    width: x2 - x1,
    height: RULE_THICKNESS,
    color: RULE_COLOR,
  });
}

/**
 * Kompletní A4 doručenka LSS / Bistro Central — layout hardcoded v kódu.
 */
export async function generateA4VoucherPdf(
  input: A4VoucherPdfInput,
): Promise<Uint8Array> {
  if (!shopUsesHardcodedA4Pdf(input.shopId)) {
    throw new Error(`A4 generátor nepodporuje obchod ${input.shopId}.`);
  }

  const config = SHOP_A4[input.shopId];
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const fontBold = await doc.embedFont(
    loadAsset("public", "fonts", "Roboto-Bold.ttf"),
  );
  const fontRegular = await doc.embedFont(
    loadAsset("public", "fonts", "Roboto-Regular.ttf"),
  );

  if (config.logo === "pill") {
    drawLssPill(page);
  } else {
    await drawBistroLogo(doc, page);
  }

  page.drawText(HEADER_LEFT, {
    x: HEADER_LEFT_X,
    y: HEADER_LEFT_Y,
    size: HEADER_LEFT_SIZE,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  const headerRightWidth = fontBold.widthOfTextAtSize(
    config.headerRight,
    HEADER_RIGHT_SIZE,
  );
  page.drawText(config.headerRight, {
    x: HEADER_RIGHT_END_X - headerRightWidth,
    y: HEADER_RIGHT_Y,
    size: HEADER_RIGHT_SIZE,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // Přehyb: vodorovná linka pod designem (stejná výška jako souhrn pod ní)
  drawHorizontalRule(page, HEADER_LINE_Y);

  const columnDividerX = (LEFT_X + CONTENT_RIGHT) / 2;
  const rightColX = columnDividerX + COLUMN_GUTTER;
  const leftMaxWidth = columnDividerX - COLUMN_GUTTER - LEFT_X;
  const rightMaxWidth = CONTENT_RIGHT - rightColX;

  // Svislý oddělovač napojený na přehyb a střižnou linku
  page.drawRectangle({
    x: columnDividerX - RULE_THICKNESS / 2,
    y: CUT_LINE_Y,
    width: RULE_THICKNESS,
    height: HEADER_LINE_Y - CUT_LINE_Y,
    color: RULE_COLOR,
  });

  // Souhrn rozložený přes celou výšku mezi linkami (vzduch mezi řádky)
  const rowCount = 4;
  const padTop = 30;
  const padBottom = 30;
  const firstLabelY = HEADER_LINE_Y - padTop;
  const lastValueY = CUT_LINE_Y + padBottom;
  const rowGap = Math.max(
    14,
    (firstLabelY - lastValueY - rowCount * LABEL_VALUE_GAP) / (rowCount - 1),
  );
  const rowLabelY = (index: number) =>
    firstLabelY - index * (LABEL_VALUE_GAP + rowGap);
  const rowValueY = (index: number) => rowLabelY(index) - LABEL_VALUE_GAP;

  const titleLabel = input.kind === "amount" ? "Částka" : "Služba";
  page.drawText(titleLabel, {
    x: LEFT_X,
    y: rowLabelY(0),
    size: LABEL_SIZE,
    font: fontRegular,
    color: rgb(0, 0, 0),
  });
  page.drawText("Kód poukazu", {
    x: rightColX,
    y: rowLabelY(0),
    size: LABEL_SIZE,
    font: fontRegular,
    color: rgb(0, 0, 0),
  });

  const title =
    input.serviceTitle.replace(/\s+/g, " ").trim() || "Dárkový poukaz";
  const titleLines = wrapText(fontBold, title, TITLE_SIZE, leftMaxWidth).slice(
    0,
    2,
  );
  let titleY = rowValueY(0);
  for (const line of titleLines) {
    const size = fitSize(fontBold, line, leftMaxWidth, TITLE_SIZE, 12);
    page.drawText(line, {
      x: LEFT_X,
      y: titleY,
      size,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    titleY -= TITLE_SIZE + 4;
  }

  const code = input.code.trim().toUpperCase();
  const codeSize = fitSize(fontBold, code, rightMaxWidth, TITLE_SIZE, 12);
  page.drawText(code, {
    x: rightColX,
    y: rowValueY(0),
    size: codeSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  drawLabelValue(
    page,
    fontRegular,
    "Pozornost pro",
    input.recipientName,
    LEFT_X,
    rowLabelY(1),
    rowValueY(1),
    leftMaxWidth,
  );
  drawLabelValue(
    page,
    fontRegular,
    "Hodnota poukazu",
    formatAmount(input.amountCzk),
    rightColX,
    rowLabelY(1),
    rowValueY(1),
    rightMaxWidth,
  );
  drawLabelValue(
    page,
    fontRegular,
    "Od",
    input.fromName,
    LEFT_X,
    rowLabelY(2),
    rowValueY(2),
    leftMaxWidth,
  );
  drawLabelValue(
    page,
    fontRegular,
    "Vydáno",
    formatCzechDate(input.issuedAt),
    rightColX,
    rowLabelY(2),
    rowValueY(2),
    rightMaxWidth,
  );
  drawLabelValue(
    page,
    fontRegular,
    "Zpráva",
    input.message,
    LEFT_X,
    rowLabelY(3),
    rowValueY(3),
    leftMaxWidth,
  );
  drawLabelValue(
    page,
    fontRegular,
    "Platné do",
    formatCzechDate(input.validUntil),
    rightColX,
    rowLabelY(3),
    rowValueY(3),
    rightMaxWidth,
  );

  // Oddělovací linka pod souhrnem (celá šířka)
  drawHorizontalRule(page, CUT_LINE_Y);

  const termsHeaderSize = 8.3;
  const bodySize = 9.7;
  const lineHeight = 12.8;
  const paraGap = 10;
  let y = CUT_LINE_Y - 22;

  page.drawText(spaceHeader("PODMÍNKY UPLATNĚNÍ"), {
    x: LEFT_X,
    y,
    size: termsHeaderSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  y -= 21.4;

  for (const para of config.terms) {
    const lines = wrapText(fontRegular, para, bodySize, CONTENT_WIDTH);
    for (const line of lines) {
      page.drawText(line, {
        x: LEFT_X,
        y,
        size: bodySize,
        font: fontRegular,
        color: rgb(0, 0, 0),
      });
      y -= lineHeight;
    }
    y -= paraGap;
  }

  // QR nad patičkou vpravo, mimo text podmínek i adresy
  const qrSize = 70;
  const qrX = CONTENT_RIGHT - qrSize;
  const qrY = 58;
  const qrPng = await QRCode.toBuffer(code, {
    type: "png",
    margin: 1,
    width: 256,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#FFFFFF" },
  });
  const qrImage = await doc.embedPng(qrPng);
  page.drawImage(qrImage, {
    x: qrX,
    y: qrY,
    width: qrSize,
    height: qrSize,
  });

  const footerSize = 7.7;
  page.drawText(config.footerLeft, {
    x: LEFT_X,
    y: FOOTER_Y,
    size: footerSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  const footerRightWidth = fontRegular.widthOfTextAtSize(
    config.footerRight,
    footerSize,
  );
  page.drawText(config.footerRight, {
    x: CONTENT_RIGHT - footerRightWidth,
    y: FOOTER_Y,
    size: footerSize,
    font: fontRegular,
    color: rgb(0, 0, 0),
  });

  return doc.save({ useObjectStreams: false });
}
