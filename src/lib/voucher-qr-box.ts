import type { VoucherCodePosition } from "@/data/admin-voucher-settings";

export const QR_BOX_MIN_WIDTH_PERCENT = 8;

/** Čtverec v pixelech → height % z width % a rozměrů stránky. */
export function normalizeQrBoxPosition(
  position: VoucherCodePosition,
  stageWidthPx: number,
  stageHeightPx: number,
): VoucherCodePosition {
  const maxWidthByHeight =
    stageWidthPx > 0 && stageHeightPx > 0
      ? (100 * stageHeightPx) / stageWidthPx
      : 100;

  const width = Math.max(
    QR_BOX_MIN_WIDTH_PERCENT,
    Math.min(100, maxWidthByHeight, position.width),
  );

  const height =
    stageWidthPx > 0 && stageHeightPx > 0
      ? (width * stageWidthPx) / stageHeightPx
      : width;

  const x = Math.max(0, Math.min(100 - width, position.x));
  const y = Math.max(0, Math.min(100 - height, position.y));

  return { x, y, width, height };
}
