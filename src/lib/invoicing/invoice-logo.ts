import path from "path";
import sharp from "sharp";

/**
 * Logo faktury z `public/…` → PNG data URL.
 * Přidá transparentní padding, aby React-PDF neořízl okraje.
 */
export async function getInvoiceLogoDataUrl(
  logoSrc = "/logo.png",
): Promise<string> {
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

  return `data:image/png;base64,${pngBuffer.toString("base64")}`;
}
