import QRCode from "qrcode";
import type { ShopId } from "@/data/admin-voucher-settings";
import { getInvoiceIssuer } from "./issuers";
import { invoiceNumberToVariableSymbol } from "./invoice-number";

export function buildSpaydString(params: {
  amount: number;
  invoiceNumber: string;
  message?: string;
  iban?: string;
  shopId?: ShopId | string;
}): string {
  const issuer = getInvoiceIssuer(params.shopId ?? "lss");
  const amount = params.amount.toFixed(2);
  const vs = invoiceNumberToVariableSymbol(params.invoiceNumber);
  const msg = (params.message || `Faktura ${params.invoiceNumber}`).slice(0, 60);
  const iban = params.iban ?? issuer.iban;

  return [
    "SPD*1.0",
    `ACC:${iban}`,
    `AM:${amount}`,
    `CC:${issuer.currency}`,
    `X-VS:${vs}`,
    `MSG:${msg}`,
  ].join("*");
}

/** SPAYD → PNG data URL pro `<Image>` v React-PDF. */
export async function buildInvoiceQrDataUrl(params: {
  amount: number;
  invoiceNumber: string;
  message?: string;
  shopId?: ShopId | string;
}): Promise<string> {
  const spayd = buildSpaydString(params);
  return QRCode.toDataURL(spayd, {
    type: "image/png",
    margin: 1,
    width: 256,
    errorCorrectionLevel: "M",
  });
}
