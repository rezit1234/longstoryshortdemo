import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePdfDocument, type InvoicePdfData } from "./invoice-pdf";
import { getInvoiceLogoDataUrl } from "./invoice-logo";
import { registerPdfFonts } from "./register-pdf-fonts";
import { INVOICE_ISSUER } from "./issuers";

export type { InvoicePdfData };

type GenerateInvoicePdfInput = Omit<
  InvoicePdfData,
  "logoDataUrl" | "issuerName" | "issuerAddress"
> & {
  issuerName?: string;
  issuerAddress?: string;
};

/**
 * Serverové generování PDF faktury (Buffer).
 * PDF buffer se pak uloží kamkoli (storage / e-mail / disk).
 */
export async function generateInvoicePdfBuffer(
  data: GenerateInvoicePdfInput,
): Promise<Buffer> {
  registerPdfFonts();
  const logoDataUrl = await getInvoiceLogoDataUrl();

  const payload: InvoicePdfData = {
    ...data,
    issuerName: data.issuerName ?? INVOICE_ISSUER.name,
    issuerAddress: data.issuerAddress ?? INVOICE_ISSUER.address,
    logoDataUrl,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await renderToBuffer(
    <InvoicePdfDocument data={payload} /> as any,
  );
  return Buffer.from(result as unknown as ArrayBuffer);
}
