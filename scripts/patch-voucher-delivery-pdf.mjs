/**
 * Iterační úprava designového PDF doručenky LSS.
 * Hlavička stejný systém jako Bistro Central (wipe + logo + Roboto texty).
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { PDFDocument, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE = path.join(ROOT, "Long-Story-Short-zprava-40-znaku.pdf");
const FONT_REGULAR = path.join(ROOT, "public/fonts/Roboto-Regular.ttf");
const FONT_BOLD = path.join(ROOT, "public/fonts/Roboto-Bold.ttf");

const PAGE_WIDTH = 595.2756;
const PAGE_HEIGHT = 841.8898;
const LEFT_X = 42;
const RIGHT_COL_X = 330.3;
const CONTENT_RIGHT = PAGE_WIDTH - 42;
const CONTENT_WIDTH = CONTENT_RIGHT - LEFT_X;

/** Horní oddělovací linka v šabloně. */
const HEADER_LINE_Y = 595.89;

const SERVICE_TITLE = "Chef's Table";
const SAMPLE_CODE = "LSSK7M2P9A";
const TITLE_SIZE = 19;
const TITLE_Y = 555.9;

/** Stejné hodnoty hlavičky jako u BC. */
const HEADER_LEFT = "V O U C H E R";
const HEADER_RIGHT = "L O N G S T O R Y S H O R T . C Z";
const HEADER_LEFT_SIZE = 7.7;
const HEADER_RIGHT_SIZE = 6.4;
const HEADER_LEFT_X = 113.14;
const HEADER_LEFT_Y = 715.19;
const HEADER_RIGHT_Y = 716.49;
const HEADER_RIGHT_END_X = 488.61;
/** Stojatý ovál — vektor, stejná výška/střed jako BC logo. */
const LOGO_TARGET_HEIGHT = 147;
const LOGO_TARGET_WIDTH = 32.5;
const LOGO_STROKE = 3.1;
const LOGO_CENTER_Y = 719.14;

/** SVG path stojatého oválu (stadium) v souřadnicích od levého horního rohu. */
function pillSvgPath(width, height, stroke) {
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


const TERMS_HEADER = "PODMÍNKY UPLATNĚNÍ";
const TERMS_PARAS = [
  "Dárkové poukazy Long Story Short s konkrétní peněžní hodnotou je možné využít buď k nákupu ubytování nebo jako způsob platby v restauraci Eatery & Bakery, kavárně Café Bar nebo v našem dalším podniku Bistro Central.",
  "Poukazy s určenými službami, které jsou specifikované na dárkovém poukazu mohou být použity pouze pro tyto služby. Rezervace na Chef's Table v restauraci Eatery & Bakery je nutná alespoň 48 hodin předem.",
  "Dárkové poukazy jsou nevratné a nemají žádnou peněžní hodnotu. Poukazy mají platnost 12 měsíců od zakoupení.",
  "Pro rezervace ubytování na konkrétní pokoj nebo ubytování s tarifem NON-REFUNDABLE pomocí poukazů s konkrétní peněžní hodnotou nás, prosím, kontaktujte přímo na recepci hostelu.",
];

const FOOTER_LEFT = "Long Story Short Hostel | Café | Eatery | Bakery";
const FOOTER_RIGHT = "Koželužská 945/31, Olomouc 779 00";
const FOOTER_Y = 41.2;

function spaceHeader(text) {
  return text.split("").join(" ");
}

function wrapText(font, text, size, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
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

const bytes = fs.readFileSync(FILE);
const doc = await PDFDocument.load(bytes);
doc.registerFontkit(fontkit);
const page = doc.getPages()[0];
const fontBold = await doc.embedFont(fs.readFileSync(FONT_BOLD));
const fontRegular = await doc.embedFont(fs.readFileSync(FONT_REGULAR));

// --- Celý horní pás vybělit (smaže původní logo / texty / artefakty) ---
page.drawRectangle({
  x: 0,
  y: HEADER_LINE_Y + 1,
  width: PAGE_WIDTH,
  height: PAGE_HEIGHT - HEADER_LINE_Y - 1,
  color: rgb(1, 1, 1),
});

const logoWidth = LOGO_TARGET_WIDTH;
const logoHeight = LOGO_TARGET_HEIGHT;
const logoX = (PAGE_WIDTH - logoWidth) / 2;
const logoTopY = LOGO_CENTER_Y + logoHeight / 2;
page.drawSvgPath(pillSvgPath(logoWidth, logoHeight, LOGO_STROKE), {
  x: logoX,
  y: logoTopY,
  borderColor: rgb(0, 0, 0),
  borderWidth: LOGO_STROKE,
});

page.drawText(HEADER_LEFT, {
  x: HEADER_LEFT_X,
  y: HEADER_LEFT_Y,
  size: HEADER_LEFT_SIZE,
  font: fontBold,
  color: rgb(0, 0, 0),
});

const headerRightWidth = fontBold.widthOfTextAtSize(
  HEADER_RIGHT,
  HEADER_RIGHT_SIZE,
);
page.drawText(HEADER_RIGHT, {
  x: HEADER_RIGHT_END_X - headerRightWidth,
  y: HEADER_RIGHT_Y,
  size: HEADER_RIGHT_SIZE,
  font: fontBold,
  color: rgb(0, 0, 0),
});

// --- Název služby + kód ---
page.drawRectangle({
  x: 38,
  y: 518,
  width: 280,
  height: 52,
  color: rgb(1, 1, 1),
});
page.drawRectangle({
  x: 318,
  y: 518,
  width: 250,
  height: 58,
  color: rgb(1, 1, 1),
});

page.drawText(SERVICE_TITLE, {
  x: LEFT_X,
  y: TITLE_Y - 1,
  size: TITLE_SIZE,
  font: fontBold,
  color: rgb(0, 0, 0),
});
page.drawText(SAMPLE_CODE, {
  x: RIGHT_COL_X,
  y: TITLE_Y - 1,
  size: TITLE_SIZE,
  font: fontBold,
  color: rgb(0, 0, 0),
});

// --- Podmínky: smaž CZ + EN blok ---
page.drawRectangle({
  x: 36,
  y: 110,
  width: PAGE_WIDTH - 72,
  height: 260,
  color: rgb(1, 1, 1),
});

const headerSize = 8.3;
const bodySize = 9.7;
const lineHeight = 12.8;
const paraGap = 10;
let y = 353.6;

page.drawText(spaceHeader(TERMS_HEADER), {
  x: LEFT_X,
  y,
  size: headerSize,
  font: fontBold,
  color: rgb(0, 0, 0),
});

y -= 21.4;

for (const para of TERMS_PARAS) {
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

// --- Zápatí ---
page.drawRectangle({
  x: 36,
  y: 28,
  width: PAGE_WIDTH - 72,
  height: 24,
  color: rgb(1, 1, 1),
});

const footerSize = 7.7;
page.drawText(FOOTER_LEFT, {
  x: LEFT_X,
  y: FOOTER_Y,
  size: footerSize,
  font: fontBold,
  color: rgb(0, 0, 0),
});

const rightWidth = fontRegular.widthOfTextAtSize(FOOTER_RIGHT, footerSize);
page.drawText(FOOTER_RIGHT, {
  x: CONTENT_RIGHT - rightWidth,
  y: FOOTER_Y,
  size: footerSize,
  font: fontRegular,
  color: rgb(0, 0, 0),
});

const out = await doc.save();
fs.writeFileSync(FILE, out);
console.log(`OK → ${FILE}`);
console.log(
  `  logo=${logoWidth.toFixed(1)}x${logoHeight} vector @ topY=${logoTopY.toFixed(1)}`,
);
console.log(`  služba: ${SERVICE_TITLE}`);
console.log(`  kód: ${SAMPLE_CODE}`);
