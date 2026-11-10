import { renderToBuffer } from "@react-pdf/renderer";
import type { ShopId } from "@/data/admin-voucher-settings";
import { InvoicePdfDocument, type InvoicePdfData } from "./invoice-pdf";
import { getInvoiceLogoDataUrl } from "./invoice-logo";
import { registerPdfFonts } from "./register-pdf-fonts";
import { getInvoiceIssuer } from "./issuers";

export type { InvoicePdfData };

type GenerateInvoicePdfInput = Omit<
  InvoicePdfData,
  | "logoDataUrl"
  | "issuerName"
  | "issuerAddress"
  | "issuerIco"
  | "issuerDic"
  | "issuerNote"
  | "issuerBankAccount"
  | "issuerIban"
  | "issuerSwift"
  | "issuerPhone"
  | "issuerEmail"
> & {
  shopId?: ShopId | string;
  issuerName?: string;
  issuerAddress?: string;
  issuerIco?: string;
  issuerDic?: string;
  issuerNote?: string;
  issuerBankAccount?: string;
  issuerIban?: string;
  issuerSwift?: string;
  issuerPhone?: string;
  issuerEmail?: string;
};

/**
 * Serverové generování PDF faktury (Buffer).
 */
export async function generateInvoicePdfBuffer(
  data: GenerateInvoicePdfInput,
): Promise<Buffer> {
  registerPdfFonts();
  const issuer = getInvoiceIssuer(data.shopId ?? "lss");
  const logoDataUrl = await getInvoiceLogoDataUrl(issuer.logoSrc);

  const payload: InvoicePdfData = {
    ...data,
    issuerName: data.issuerName ?? issuer.name,
    issuerAddress: data.issuerAddress ?? issuer.address,
    issuerIco: data.issuerIco ?? issuer.ico,
    issuerDic: data.issuerDic ?? issuer.dic,
    issuerNote: data.issuerNote ?? issuer.note,
    issuerBankAccount: data.issuerBankAccount ?? issuer.bankAccount,
    issuerIban: data.issuerIban ?? issuer.iban,
    issuerSwift: data.issuerSwift ?? issuer.swift,
    issuerPhone: data.issuerPhone ?? issuer.phone,
    issuerEmail: data.issuerEmail ?? issuer.email,
    logoDataUrl,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await renderToBuffer(
    <InvoicePdfDocument data={payload} /> as any,
  );
  return Buffer.from(result as unknown as ArrayBuffer);
}
