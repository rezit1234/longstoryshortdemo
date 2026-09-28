import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import QRCode from "qrcode";
import type { VoucherCodePosition } from "@/data/admin-voucher-settings";
import { normalizePositionPage } from "@/data/admin-voucher-settings";
import {
  CODE_BOX_LETTER_SPACING_EM,
  CODE_BOX_PADDING_X_RATIO,
  CODE_BOX_PADDING_Y_RATIO,
} from "@/lib/voucher-code-box";

export type StampVoucherPdfInput = {
  templateBytes: Uint8Array;
  code: string;
  /** Text/URL kódovaný do QR (výchozí = kód poukazu). */
  qrPayload?: string;
  codePosition: VoucherCodePosition | null;
  qrPosition: VoucherCodePosition | null;
};

type PdfRect = { x: number; y: number; width: number; height: number };

/** CSS % (origin top-left) → PDF body (origin bottom-left). */
function percentToPdfRect(
  position: VoucherCodePosition,
  pageWidth: number,
  pageHeight: number,
): PdfRect {
  const width = (position.width / 100) * pageWidth;
  const height = (position.height / 100) * pageHeight;
  const x = (position.x / 100) * pageWidth;
  const y = pageHeight - (position.y / 100) * pageHeight - height;
  return { x, y, width, height };
}

function resolvePage(pages: PDFPage[], position: VoucherCodePosition | null) {
  if (pages.length === 0) return null;
  const page = normalizePositionPage(position?.page);
  const index = Math.min(pages.length, Math.max(1, page)) - 1;
  return pages[index] ?? pages[0];
}

function spacedTextWidth(font: PDFFont, text: string, size: number) {
  const base = font.widthOfTextAtSize(text, size);
  const spacing =
    text.length > 1
      ? (text.length - 1) * size * CODE_BOX_LETTER_SPACING_EM
      : 0;
  return base + spacing;
}

function fitCodeFontSize(
  font: PDFFont,
  text: string,
  boxWidth: number,
  boxHeight: number,
) {
  const innerWidth = boxWidth * (1 - CODE_BOX_PADDING_X_RATIO * 2);
  const innerHeight = boxHeight * (1 - CODE_BOX_PADDING_Y_RATIO * 2);
  if (innerWidth <= 0 || innerHeight <= 0) return 8;

  const widthAt1 = spacedTextWidth(font, text, 1);
  if (widthAt1 <= 0) return 8;

  const byWidth = (innerWidth * 0.98) / widthAt1;
  const byHeight = innerHeight;
  return Math.max(8, Math.min(byWidth, byHeight));
}

function drawSpacedCenteredText(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  box: PdfRect,
) {
  const textWidth = spacedTextWidth(font, text, size);
  let x = box.x + (box.width - textWidth) / 2;
  const y = box.y + (box.height - size) / 2 + size * 0.12;

  for (const char of text) {
    page.drawText(char, {
      x,
      y,
      size,
      font,
      color: rgb(0, 0, 0),
    });
    x +=
      font.widthOfTextAtSize(char, size) + size * CODE_BOX_LETTER_SPACING_EM;
  }
}

async function buildQrPng(payload: string, pixelSize: number) {
  return QRCode.toBuffer(payload, {
    type: "png",
    margin: 1,
    width: Math.max(128, Math.round(pixelSize)),
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#FFFFFF" },
  });
}

/**
 * Natiskne kód + QR do PDF šablony podle % pozic z admin editoru.
 * Kód a QR můžou být na různých stránkách (`position.page`).
 */
export async function stampVoucherPdf(
  input: StampVoucherPdfInput,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(input.templateBytes, {
    ignoreEncryption: true,
  });
  const pages = pdf.getPages();
  if (pages.length === 0) {
    throw new Error("PDF šablona nemá žádnou stránku.");
  }

  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const code = input.code.trim().toUpperCase();
  const qrPayload = (input.qrPayload ?? code).trim() || code;

  if (input.codePosition && code) {
    const page = resolvePage(pages, input.codePosition);
    if (page) {
      const { width: pageWidth, height: pageHeight } = page.getSize();
      const box = percentToPdfRect(input.codePosition, pageWidth, pageHeight);
      const size = fitCodeFontSize(font, code, box.width, box.height);
      drawSpacedCenteredText(page, code, font, size, box);
    }
  }

  if (input.qrPosition && qrPayload) {
    const page = resolvePage(pages, input.qrPosition);
    if (page) {
      const { width: pageWidth, height: pageHeight } = page.getSize();
      const box = percentToPdfRect(input.qrPosition, pageWidth, pageHeight);
      const side = Math.min(box.width, box.height);
      const inset = side * 0.04;
      const drawSize = Math.max(8, side - inset * 2);
      const png = await buildQrPng(qrPayload, drawSize * 2);
      const image = await pdf.embedPng(png);
      const x = box.x + (box.width - drawSize) / 2;
      const y = box.y + (box.height - drawSize) / 2;
      page.drawImage(image, {
        x,
        y,
        width: drawSize,
        height: drawSize,
      });
    }
  }

  return pdf.save({ useObjectStreams: false });
}

export async function fetchPdfTemplateBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Nepodařilo se stáhnout PDF šablonu (${response.status}).`);
  }
  return new Uint8Array(await response.arrayBuffer());
}
