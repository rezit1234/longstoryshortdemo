/**
 * Fixní dodavatel pro faktury.
 * Údaje zatím placeholder — doplní projekt (název, IČO, účet, IBAN).
 */
export interface InvoiceIssuerConfig {
  name: string;
  address: string;
  ico: string;
  bankAccount: string;
  iban: string;
  currency: "CZK";
  /** Poznámka pod IČO (např. Neplátce DPH). */
  note: string;
}

export const INVOICE_ISSUER: InvoiceIssuerConfig = {
  name: "Long Story Short",
  address: "Adresa dodavatele, 779 00 Olomouc",
  ico: "00000000",
  bankAccount: "0000000000/0000",
  iban: "CZ0000000000000000000000",
  currency: "CZK",
  note: "Neplátce DPH",
};
