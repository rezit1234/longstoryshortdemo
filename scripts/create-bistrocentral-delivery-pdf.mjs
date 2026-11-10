/**
 * Vytvoří doručenku Bistro Central podle LSS šablony.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const { PDFDocument, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "Long-Story-Short-zprava-40-znaku.pdf");
const OUT = path.join(ROOT, "Bistro-Central-zprava-40-znaku.pdf");
const LOGO = path.join(ROOT, "public/bistrokruh.webp");
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

const SERVICE_TITLE = "Dárkový poukaz";
const SAMPLE_CODE = "BCK7M2P9A";
const TITLE_SIZE = 19;
const TITLE_Y = 555.9;

/** Přesně stejné hodnoty jako v LSS šabloně (změřeno z PDF). */
const HEADER_LEFT = "V O U C H E R";
const HEADER_RIGHT = "B I S T R O C E N T R A L . C Z";
const HEADER_LEFT_SIZE = 7.7;
const HEADER_RIGHT_SIZE = 6.4;
const HEADER_LEFT_X = 113.14;
const HEADER_LEFT_Y = 715.19;
const HEADER_RIGHT_Y = 716.49;
/** Pravý okraj LSS URL textu — BC zarovnáme na stejný konec. */
const HEADER_RIGHT_END_X = 488.61;
/** Cílová vizuální výška = LSS pilulka (~147 pt). */
const LOGO_TARGET_SIZE = 147;
const LOGO_CENTER_Y = 719.14;

const TERMS_HEADER = "PODMÍNKY UPLATNĚNÍ";
const TERMS_PARAS = [
  "Dárkové poukazy Bistro Central s konkrétní peněžní hodnotou je možné využít jako způsob platby v Bistro Central nebo v našem dalším podniku Long Story Short, konkrétně v restauraci Eatery & Bakery, kavárně Café Bar nebo na ubytování v hostelu.",
  "Dárkové poukazy jsou nevratné a nemají žádnou peněžní hodnotu. Poukazy mají platnost 12 měsíců od zakoupení.",
];

const FOOTER_LEFT = "Bistro Central";
const FOOTER_RIGHT = "Denisova 9/61, Olomouc 779 00";
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

const bytes = fs.readFileSync(SOURCE);
const doc = await PDFDocument.load(bytes);
doc.registerFontkit(fontkit);
const page = doc.getPages()[0];
const fontBold = await doc.embedFont(fs.readFileSync(FONT_BOLD));
const fontRegular = await doc.embedFont(fs.readFileSync(FONT_REGULAR));

// --- Celý horní pás vybělit (smaže LSS logo / artefakty / staré texty) ---
page.drawRectangle({
  x: 0,
  y: HEADER_LINE_Y + 1,
  width: PAGE_WIDTH,
  height: PAGE_HEIGHT - HEADER_LINE_Y - 1,
  color: rgb(1, 1, 1),
});

// Logo oříznuté na obsah, stejná výška jako LSS pilulka
const { data: logoPixels, info: logoInfo } = await sharp(LOGO)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
let minX = logoInfo.width;
let minY = logoInfo.height;
let maxX = 0;
let maxY = 0;
for (let y = 0; y < logoInfo.height; y++) {
  for (let x = 0; x < logoInfo.width; x++) {
    const i = (y * logoInfo.width + x) * 4;
    const a = logoPixels[i + 3];
    const sum = logoPixels[i] + logoPixels[i + 1] + logoPixels[i + 2];
    if (a > 20 && sum < 720) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
const pad = 2;
const cropLeft = Math.max(0, minX - pad);
const cropTop = Math.max(0, minY - pad);
const cropWidth = Math.min(logoInfo.width - cropLeft, maxX - minX + 1 + pad * 2);
const cropHeight = Math.min(logoInfo.height - cropTop, maxY - minY + 1 + pad * 2);

const logoPng = await sharp(LOGO)
  .ensureAlpha()
  .extract({
    left: cropLeft,
    top: cropTop,
    width: cropWidth,
    height: cropHeight,
  })
  .resize({
    width: 900,
    height: 900,
    fit: "fill",
  })
  .png()
  .toBuffer();
const logoImage = await doc.embedPng(logoPng);

const logoSize = LOGO_TARGET_SIZE;
const logoX = (PAGE_WIDTH - logoSize) / 2;
const logoY = LOGO_CENTER_Y - logoSize / 2;
page.drawImage(logoImage, {
  x: logoX,
  y: logoY,
  width: logoSize,
  height: logoSize,
});

// Texty hlavičky — stejné X/Y/size jako LSS
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

// --- Název + kód ---
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

// --- Podmínky ---
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
fs.writeFileSync(OUT, out);
console.log(`OK → ${OUT}`);
console.log(
  `  logoSize=${logoSize} logoY=${logoY.toFixed(2)} left=(${HEADER_LEFT_X},${HEADER_LEFT_Y}) rightY=${HEADER_RIGHT_Y}`,
);
