import type { VoucherCodePosition } from "@/data/admin-voucher-settings";

export const CODE_BOX_FONT_FAMILY =
  '"Helvetica Neue", Helvetica, Arial, sans-serif';
export const CODE_BOX_FONT_WEIGHT = 700;
/** Musí sedět s CSS `.admin-code-editor-box-label`. */
export const CODE_BOX_LETTER_SPACING_EM = 0.08;
export const CODE_BOX_MIN_WIDTH_PERCENT = 12;
/** Horizontální padding rámečku jako podíl šířky boxu. */
export const CODE_BOX_PADDING_X_RATIO = 0.08;
/** Vertikální padding rámečku jako podíl výšky boxu. */
export const CODE_BOX_PADDING_Y_RATIO = 0.12;

function measureTextWidthPx(text: string, fontSizePx: number): number {
  if (typeof document === "undefined") {
    return fontSizePx * text.length * 0.62;
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return fontSizePx * text.length * 0.62;

  context.font = `${CODE_BOX_FONT_WEIGHT} ${fontSizePx}px ${CODE_BOX_FONT_FAMILY}`;
  const baseWidth = context.measureText(text).width;
  const spacing =
    text.length > 1
      ? (text.length - 1) * fontSizePx * CODE_BOX_LETTER_SPACING_EM
      : 0;

  return baseWidth + spacing;
}

/** Poměr šířky a výšky rámečce v pixelech (w / h) pro daný mock kód. */
export function measureCodeBoxAspectRatio(text: string): number {
  const fontSize = 100;
  const textWidth = measureTextWidthPx(text, fontSize);
  const boxWidth = textWidth / (1 - CODE_BOX_PADDING_X_RATIO * 2);
  const boxHeight = fontSize / (1 - CODE_BOX_PADDING_Y_RATIO * 2);

  return boxWidth / boxHeight;
}

export function codeBoxHeightPercent(
  widthPercent: number,
  stageWidthPx: number,
  stageHeightPx: number,
  aspectRatio: number,
): number {
  if (stageWidthPx <= 0 || stageHeightPx <= 0 || aspectRatio <= 0) {
    return widthPercent / aspectRatio;
  }

  return (widthPercent * stageWidthPx) / (aspectRatio * stageHeightPx);
}

export function normalizeCodeBoxPosition(
  position: VoucherCodePosition,
  stageWidthPx: number,
  stageHeightPx: number,
  aspectRatio: number,
): VoucherCodePosition {
  const width = Math.max(
    CODE_BOX_MIN_WIDTH_PERCENT,
    Math.min(100, position.width),
  );
  const height = codeBoxHeightPercent(
    width,
    stageWidthPx,
    stageHeightPx,
    aspectRatio,
  );

  const x = Math.max(0, Math.min(100 - width, position.x));
  const y = Math.max(0, Math.min(100 - height, position.y));

  return { x, y, width, height };
}

/** Font-size tak, aby text přesně seděl do šířky rámečku (včetně paddingu). */
export function fitCodeFontSizePx(
  text: string,
  boxWidthPx: number,
  boxHeightPx: number,
): number {
  // odečti dashed border (1.5px z každé strany)
  const border = 3;
  const usableWidth = Math.max(0, boxWidthPx - border);
  const usableHeight = Math.max(0, boxHeightPx - border);
  const innerWidth = usableWidth * (1 - CODE_BOX_PADDING_X_RATIO * 2);
  const innerHeight = usableHeight * (1 - CODE_BOX_PADDING_Y_RATIO * 2);
  if (innerWidth <= 0 || innerHeight <= 0) return 8;

  // textWidth(fontSize) je lineární → fontSize = innerWidth / widthAt1px
  const widthAt1Px = measureTextWidthPx(text, 1);
  if (widthAt1Px <= 0) return 8;

  // malá rezerva, ať poslední písmeno nevyjede
  const byWidth = (innerWidth * 0.98) / widthAt1Px;
  const byHeight = innerHeight;

  return Math.max(8, Math.min(byWidth, byHeight));
}
