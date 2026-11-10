/**
 * Smoke-test checklist — přehledný, klidně 2 stránky, obsah vycentrovaný v řádcích.
 * Spuštění: npm run smoke:checklist
 */
import {
  PDFDocument,
  rgb,
  type PDFFont,
  type PDFPage,
  type PDFForm,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

type Item = { id: string; label: string; hint?: string };
type Section = { title: string; items: Item[] };

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 48;
const MARGIN_Y = 48;
const BOX = 14;
const LABEL_SIZE = 11;
const HINT_SIZE = 9;
const TITLE_SIZE = 18;
const SECTION_SIZE = 12;
const ROW_PAD_Y = 14;
const ROW_GAP = 12;
const LABEL_LINE = 15;
const HINT_LINE = 12;
const BOTTOM_LIMIT = 56;

const SECTIONS: Section[] = [
  {
    title: "A. Nákup ve widgetu",
    items: [
      {
        id: "a1",
        label: "Každý obchod: nákup na částku i zážitek (e-mail)",
        hint:
          "Aktivní obchody (ENABLED_SHOPS): LSS + Bistro Central. Culinary zatím vypnutá.",
      },
      {
        id: "a2",
        label: "Test doručení a příplatků",
        hint:
          "Pošta CZ / pošta SK / osobní vyzvednutí — správný příplatek dle nastavení + ops e-mail",
      },
      {
        id: "a3",
        label: "Množství > 1 a dárek jiné osobě",
        hint:
          "Správný počet kódů a PDF; jeden e-mail se všemi přílohami (ne 1 mail na kus)",
      },
      {
        id: "a4",
        label: "Faktura ano / ne / povinná od 10 000 Kč",
        hint:
          "S fakturou: poukaz + faktura v příloze. Jiný fakturační e-mail = druhý mail. Bez faktury: jen poukaz.",
      },
      {
        id: "a5",
        label: "A4 PDF: unikátní kód + správný obsah",
        hint:
          "LSS/BC: hardcoded A4. Kód, částka/služba, jména, platnost, QR. Culinary zatím vypnutá.",
      },
    ],
  },
  {
    title: "B. Po platbě",
    items: [
      {
        id: "b1",
        label: "Stránka výsledku platby + zákaznický e-mail",
        hint: "Správný text (paid / cancelled / pending), Brevo dorazí, PDF poukazu OK",
      },
      {
        id: "b2",
        label: "Objednávka a poukaz v adminu",
        hint: "Stav paid. Pošta -> awaiting_shipment. Vyzvednutí -> awaiting_pickup.",
      },
    ],
  },
  {
    title: "C. Admin — nastavení",
    items: [
      {
        id: "c1",
        label: "Úprava částek, variant a Culinary PDF šablon",
        hint:
          "Widget bere nové částky/zážítky. Culinary: šablona + pozice kódu/QR. LSS/BC A4 jen náhled.",
      },
      {
        id: "c2",
        label: "Doručení v nastavení obchodu",
        hint: "Zapnutí/vypnutí metod + správné příplatky CZ / SK / vyzvednutí",
      },
    ],
  },
  {
    title: "D. Admin — provoz",
    items: [
      {
        id: "d1",
        label: "Uplatnění, částečné uplatnění, zrušení, ruční přidání",
      },
      {
        id: "d2",
        label: "Export CSV + Přehled / Analytika",
      },
    ],
  },
  {
    title: "E. Před ostrým během",
    items: [
      { id: "e1", label: "VOP + GDPR odkazy ve widgetu" },
      {
        id: "e2",
        label: "OPS notifikace na provozní e-mail",
        hint:
          "Na Vercelu nastavit OPS_NOTIFY_EMAIL=reception@longstoryshort.cz (případně per-shop OPS_NOTIFY_EMAIL_*). Lokálně klidně testovací.",
      },
      {
        id: "e3",
        label: "Comgate live na Vercelu + jedna ostrá platba",
        hint:
          "Produkce: COMGATE_TEST=false (na Vercelu už). Lokálně může zůstat true.",
      },
      {
        id: "e4",
        label: "Reálné fakturační údaje + vizuál PDF faktury",
      },
      {
        id: "e5",
        label: "Mobil: widget i admin bez rozbití layoutu",
      },
    ],
  },
];

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) current = next;
    else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function layoutItem(item: Item, font: PDFFont, textWidth: number) {
  const labels = wrapText(item.label, font, LABEL_SIZE, textWidth);
  const hints = item.hint
    ? wrapText(item.hint, font, HINT_SIZE, textWidth)
    : [];

  // Posuny baseline od první řádky (0 = první label)
  const baselines: { text: string; size: number; muted: boolean; dy: number }[] =
    [];
  let dy = 0;
  for (const line of labels) {
    baselines.push({ text: line, size: LABEL_SIZE, muted: false, dy });
    dy += LABEL_LINE;
  }
  if (hints.length) {
    dy += 2; // malá mezera mezi labely a hintem
    for (const line of hints) {
      baselines.push({ text: line, size: HINT_SIZE, muted: true, dy });
      dy += HINT_LINE;
    }
  }

  const lastDy = baselines.length ? baselines[baselines.length - 1]!.dy : 0;
  // Výška od vrchu první řádky po baseline poslední (+ drobný descender)
  const ascentLocal = font.heightAtSize(LABEL_SIZE, { descender: false });
  const contentH = ascentLocal + lastDy + 3;

  return { baselines, contentH, ascentLocal };
}

async function main() {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const font = await pdfDoc.embedFont(
    readFileSync(path.join(process.cwd(), "public/fonts/Roboto-Regular.ttf")),
  );
  const fontBold = await pdfDoc.embedFont(
    readFileSync(path.join(process.cwd(), "public/fonts/Roboto-Bold.ttf")),
  );

  const form = pdfDoc.getForm();
  const contentLeft = MARGIN_X + BOX + 14;
  const textWidth = PAGE_W - contentLeft - MARGIN_X;
  const ascent = font.heightAtSize(LABEL_SIZE, { descender: false });

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN_Y;

  const ensureSpace = (needed: number) => {
    if (y - needed >= BOTTOM_LIMIT) return;
    page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN_Y;
    page.drawText("Long Story Short — Smoke test (pokračování)", {
      x: MARGIN_X,
      y,
      size: 12,
      font: fontBold,
      color: rgb(0.15, 0.15, 0.15),
    });
    y -= 28;
  };

  const drawCheckbox = (
    currentPage: PDFPage,
    name: string,
    boxBottom: number,
  ) => {
    currentPage.drawRectangle({
      x: MARGIN_X,
      y: boxBottom,
      width: BOX,
      height: BOX,
      borderWidth: 1.2,
      borderColor: rgb(0.2, 0.2, 0.2),
      color: rgb(1, 1, 1),
    });
    const checkbox = form.createCheckBox(name);
    checkbox.addToPage(currentPage, {
      x: MARGIN_X,
      y: boxBottom,
      width: BOX,
      height: BOX,
      borderWidth: 0,
      backgroundColor: rgb(1, 1, 1),
    });
  };

  page.drawText("Long Story Short — Smoke test", {
    x: MARGIN_X,
    y,
    size: TITLE_SIZE,
    font: fontBold,
    color: rgb(0.08, 0.08, 0.08),
  });
  y -= 22;

  for (const line of wrapText(
    "Odškrtávej přímo v PDF. U každého obchodu stačí reprezentativní nákupy — neřeš to jako 50 oddělených ticketů.",
    font,
    9.5,
    PAGE_W - MARGIN_X * 2,
  )) {
    page.drawText(line, {
      x: MARGIN_X,
      y,
      size: 9.5,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 13;
  }
  y -= 16;

  for (const section of SECTIONS) {
    ensureSpace(40);

    page.drawText(section.title, {
      x: MARGIN_X,
      y,
      size: SECTION_SIZE,
      font: fontBold,
      color: rgb(0.08, 0.08, 0.08),
    });
    y -= 8;
    page.drawLine({
      start: { x: MARGIN_X, y },
      end: { x: PAGE_W - MARGIN_X, y },
      thickness: 1.25,
      color: rgb(0.75, 0.75, 0.75),
    });
    y -= 18;

    for (const item of section.items) {
      const { baselines, contentH, ascentLocal } = layoutItem(
        item,
        font,
        textWidth,
      );
      const rowH = contentH + ROW_PAD_Y * 2;
      ensureSpace(rowH + ROW_GAP);

      const rowTop = y;
      const rowBottom = y - rowH;
      const midY = (rowTop + rowBottom) / 2;

      // Šedý kontejner
      page.drawRectangle({
        x: MARGIN_X - 8,
        y: rowBottom,
        width: PAGE_W - MARGIN_X * 2 + 16,
        height: rowH,
        color: rgb(0.965, 0.965, 0.965),
      });

      // Celý blok textu přesně na střed šedého boxu
      const contentTop = midY + contentH / 2;
      const firstBaseline = contentTop - ascentLocal;
      const boxBottom = firstBaseline + ascentLocal / 2 - BOX / 2;

      drawCheckbox(page, `check_${item.id}`, boxBottom);

      for (const line of baselines) {
        page.drawText(line.text, {
          x: contentLeft,
          y: firstBaseline - line.dy,
          size: line.size,
          font,
          color: line.muted ? rgb(0.42, 0.42, 0.42) : rgb(0.08, 0.08, 0.08),
        });
      }

      y = rowBottom - ROW_GAP;
    }

    y -= 6;
  }

  ensureSpace(100);
  page.drawLine({
    start: { x: MARGIN_X, y },
    end: { x: PAGE_W - MARGIN_X, y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });
  y -= 24;

  page.drawText(
    "Datum: _______________     Tester: _______________     Prostředí: _______________",
    {
      x: MARGIN_X,
      y,
      size: 10,
      font,
      color: rgb(0.35, 0.35, 0.35),
    },
  );
  y -= 30;

  {
    const rowH = 36;
    ensureSpace(rowH + 20);
    const rowTop = y;
    const rowBottom = y - rowH;
    page.drawRectangle({
      x: MARGIN_X - 8,
      y: rowBottom,
      width: PAGE_W - MARGIN_X * 2 + 16,
      height: rowH,
      color: rgb(0.965, 0.965, 0.965),
    });
    const firstBaseline = rowBottom + rowH / 2 - ascent / 2 + 2;
    const boxBottom = firstBaseline + ascent / 2 - BOX / 2;
    drawCheckbox(page, "check_ready", boxBottom);
    page.drawText("Ready k odevzdání", {
      x: contentLeft,
      y: firstBaseline,
      size: 11,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    y = rowBottom - ROW_GAP;
  }

  {
    const rowH = 36;
    ensureSpace(rowH + 10);
    const rowBottom = y - rowH;
    page.drawRectangle({
      x: MARGIN_X - 8,
      y: rowBottom,
      width: PAGE_W - MARGIN_X * 2 + 16,
      height: rowH,
      color: rgb(0.965, 0.965, 0.965),
    });
    const firstBaseline = rowBottom + rowH / 2 - ascent / 2 + 2;
    const boxBottom = firstBaseline + ascent / 2 - BOX / 2;
    drawCheckbox(page, "check_blocked", boxBottom);
    page.drawText("Jsou bločky (dopiš): ________________________________", {
      x: contentLeft,
      y: firstBaseline,
      size: 11,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
  }

  const bytes = await pdfDoc.save({ updateFieldAppearances: false });
  const out = path.join(process.cwd(), "docs", "smoke-test-checklist.pdf");
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, bytes);
  console.log(
    `OK → ${out} (${bytes.length} bytes, ${pdfDoc.getPageCount()} stránky)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
