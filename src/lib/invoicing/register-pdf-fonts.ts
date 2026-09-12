import path from "path";
import { Font } from "@react-pdf/renderer";

let fontsRegistered = false;

export function registerPdfFonts(): void {
  if (fontsRegistered) return;

  const regular = path.join(process.cwd(), "public/fonts/Roboto-Regular.ttf");
  const bold = path.join(process.cwd(), "public/fonts/Roboto-Bold.ttf");

  Font.register({
    family: "Roboto",
    fonts: [
      { src: regular, fontWeight: "normal" },
      { src: bold, fontWeight: "bold" },
    ],
  });

  fontsRegistered = true;
}

export const PDF_FONT_FAMILY = "Roboto";
