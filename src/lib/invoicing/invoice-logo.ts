import path from "path";
import sharp from "sharp";

const LOGO_MAX_WIDTH = 66;
const LOGO_MAX_HEIGHT = 48;

export type InvoiceLogo = {
  dataUrl: string;
  /** Šířka v PDF (pt), zachovaný aspect ratio. */
  width: number;
  /** Výška v PDF (pt), zachovaný aspect ratio. */
  height: number;
};

/**
 * Logo faktury z `public/…` → PNG data URL + rozměry do PDF.
 * Přidá transparentní padding, aby React-PDF neořízl okraje.
 * Rozměry drží poměr stran (kruhové logo BC zůstane kruhem).
 */
export async function getInvoiceLogoDataUrl(
  logoSrc = "/logo.png",
): Promise<InvoiceLogo> {
  const relative = logoSrc.replace(/^\//, "");
  const logoPath = path.join(process.cwd(), "public", relative);
  const pngBuffer = await sharp(logoPath)
    .ensureAlpha()
    .extend({
      top: 10,
      bottom: 10,
      left: 10,
      right: 10,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const meta = await sharp(pngBuffer).metadata();
  const srcW = Math.max(1, meta.width ?? LOGO_MAX_WIDTH);
  const srcH = Math.max(1, meta.height ?? LOGO_MAX_HEIGHT);
  const scale = Math.min(LOGO_MAX_WIDTH / srcW, LOGO_MAX_HEIGHT / srcH);

  return {
    dataUrl: `data:image/png;base64,${pngBuffer.toString("base64")}`,
    width: Math.max(1, Math.round(srcW * scale)),
    height: Math.max(1, Math.round(srcH * scale)),
  };
}
